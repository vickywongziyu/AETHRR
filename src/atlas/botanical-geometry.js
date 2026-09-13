import * as T from 'three';

// Solid curved leaves and petals: no rectangular alpha cards in the ground cover.
export class BotanicalMesh {
 constructor(detail=1){this.detail=detail;this.p=[];this.c=[];this.uv=[];this.indices=[];}
 vertex(p,color,uv=[0,0]){const i=this.p.length/3;this.p.push(...p);this.c.push(color.r,color.g,color.b);this.uv.push(...uv);return i;}
 triangle(a,b,c){this.indices.push(a,b,c);}
 leaf(origin,angle,length,width,rise,color,bend=.3,rows=4){
  rows=Math.min(rows,this.detail===1?rows:2);
  const start=this.p.length/3,d=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),side=new T.Vector3(d.z,0,-d.x),base=new T.Vector3(...origin);
  for(let j=0;j<=rows;j++){
   const t=j/rows,shape=Math.pow(Math.sin(Math.PI*t),.7)*width+.001;
   const mid=base.clone().addScaledVector(d,length*t).add(new T.Vector3(0,rise*t-bend*t*t,0));
   const shade=color.clone().multiplyScalar(.58+.54*t);
   for(const k of [-1,0,1]){const v=mid.clone().addScaledVector(side,shape*k);v.y+=(1-Math.abs(k))*.024*Math.sin(Math.PI*t);this.vertex(v.toArray(),shade,[k*.5+.5,t]);}
  }
  for(let j=0;j<rows;j++)for(let k=0;k<2;k++){const a=start+j*3+k;this.triangle(a,a+3,a+1);this.triangle(a+1,a+3,a+4);}
 }
 stem(a,b,r,color){
  const start=this.p.length/3,up=new T.Vector3(...b).sub(new T.Vector3(...a)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),up.clone().normalize());
  for(let row=0;row<2;row++)for(let k=0;k<5;k++){const t=k/5*Math.PI*2,v=new T.Vector3(Math.cos(t)*r,row*up.length(),Math.sin(t)*r).applyQuaternion(q).add(new T.Vector3(...a));this.vertex(v.toArray(),color);}
  for(let k=0;k<5;k++){this.triangle(start+k,start+(k+1)%5,start+5+k);this.triangle(start+(k+1)%5,start+5+(k+1)%5,start+5+k);}
 }
 sphere(center,r,color){
  const start=this.p.length/3,nr=this.detail===1?4:3,nc=this.detail===1?8:6;
  for(let row=0;row<=nr;row++)for(let k=0;k<=nc;k++){const p=row/nr*Math.PI,a=k/nc*Math.PI*2;this.vertex([center[0]+r*Math.sin(p)*Math.cos(a),center[1]+r*Math.cos(p),center[2]+r*Math.sin(p)*Math.sin(a)],color);}
  for(let row=0;row<nr;row++)for(let k=0;k<nc;k++){let a=start+row*(nc+1)+k;this.triangle(a,a+nc+1,a+1);this.triangle(a+1,a+nc+1,a+nc+2);}
 }
 finish(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.uv,2));g.setIndex(this.indices);g.computeVertexNormals();g.computeBoundingSphere();return g;}
}
export function grassGeometry(tint,detail=1){
 const g=new BotanicalMesh(detail),c=new T.Color(tint);
 for(let i=0;i<9;i++){const a=i*2.399,h=.28+(Math.sin(i*31.7)*.5+.5)*.38;g.leaf([Math.sin(i*7.1)*.35,0,Math.cos(i*11.3)*.35],a,.17+.07*(i%3),.018+(i%3)*.009,h,c,.18,3);}
 return g.finish();
}
export function flowerGeometry(tint,leafTint,variant='forest',detail=1){
 const g=new BotanicalMesh(detail),green=new T.Color(leafTint),petal=new T.Color(tint),center=new T.Color('#edbd58');
 for(let bloom=0;bloom<3;bloom++){
  const a=bloom*2.4,x=Math.sin(a)*.19,z=Math.cos(a)*.19,h=(variant==='valley'?.24:.46)+bloom*(variant==='valley'?.10:.16);
  g.stem([x,0,z],[x+.04,h,z],.012,green);
  for(let k=0;k<3;k++)g.leaf([x,k*.12+.08,z],a+k*2.3,.19,.07,.09,green,.1);
  const petals=variant==='watercourt'?6:variant==='forest'?7:8;
  for(let k=0;k<petals;k++)g.leaf([x+.04,h,z],k/petals*Math.PI*2,.18,variant==='forest'?.042:.072,variant==='watercourt'?.13:variant==='highland'?-.08:.055,petal,variant==='watercourt'?.04:.1);
  g.sphere([x+.04,h+.024,z],.045,center);
  if(variant==='aether')for(let j=0;j<4;j++){g.sphere([x+.04,h+.07+j*.065,z],.035*(1-j*.12),petal);g.leaf([x+.04,h+.065+j*.065,z],a+j*2.4,.08,.023,.04,petal,.02,3);}
 }
 return g.finish();
}
export function fernGeometry(tint,detail=1){
 const g=new BotanicalMesh(detail),c=new T.Color(tint);
 for(let frond=0;frond<5;frond++){
  const a=frond*2.4,d=new T.Vector3(Math.sin(a),0,Math.cos(a));
  g.stem([0,0,0],[d.x*.62,.5,d.z*.62],.009,c);
  for(let j=1;j<=6;j++)for(const s of [-1,1])g.leaf([d.x*j*.085,j*.083,d.z*j*.085],a+s*1.1,.22*(1-j*.095),.035,.045,c,.02);
 }
 return g.finish();
}
// Dormant flower stalks and folded, dry fronds retain their gatherable identity
// through winter. They use the same ground footprint as the summer plants.
export function winterPlantGeometry(kind,detail=1){
 const g=new BotanicalMesh(detail),stem=new T.Color('#77766a'),husk=new T.Color('#b4b5a6');
 if(kind==='fern'){
  for(let i=0;i<5;i++)for(let j=1;j<=4;j++)for(const side of [-1,1]){
   const a=i*2.4,d=[Math.sin(a),Math.cos(a)];
   g.leaf([d[0]*j*.065,j*.024,d[1]*j*.065],a+side*.65,.12,.019,.025,stem,.045);
  }
 }else{
  for(let i=0;i<3;i++){
   const a=i*2.4,x=Math.sin(a)*.19,z=Math.cos(a)*.19,h=.24+i*.10;
   g.stem([x,0,z],[x+.035,h,z],.010,stem);
   for(let j=0;j<2;j++)g.leaf([x,j*.10+.06,z],a+j*2.3,.12,.025,.025,stem,.05);
   g.sphere([x+.035,h,z],.032,husk);
   for(let j=0;j<5;j++)g.leaf([x+.035,h,z],j*Math.PI*2/5,.063,.016,.026,husk,.045);
  }
 }
 return g.finish();
}
export function botanicalMaterial(time,emissive=0){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0,side:T.DoubleSide,emissive:'#9b7cc8',emissiveIntensity:emissive});
 m.onBeforeCompile=s=>{
  s.uniforms.botanicalTime=time;
  s.vertexShader='uniform float botanicalTime;varying float plantHeight;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal=normalize(objectNormal+vec3(0.,.68,0.));');
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   plantHeight=clamp(position.y,0.,1.);
   vec3 seed=vec3(0.);
   #ifdef USE_INSTANCING
   seed=instanceMatrix[3].xyz;
   #endif
   float breeze=sin(botanicalTime*1.6+seed.x*.32+seed.z*.19)+.35*sin(botanicalTime*2.5+seed.z*.66);
   transformed.x+=breeze*plantHeight*plantHeight*.095;
   transformed.z+=sin(botanicalTime*1.15+seed.x*.28)*plantHeight*.045;`);
  s.fragmentShader='varying float plantHeight;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n normal=normalize(mix(normal,mat3(viewMatrix)*vec3(0.,1.,0.),.64));');
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb*=mix(.68,1.13,plantHeight);');
 };
 m.customProgramCacheKey=()=> 'atlas-solid-botanical-v2';return m;
}
