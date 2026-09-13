import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {detailSurface} from '../forest/surfaces.js';

const WATER=-1.25,mix=T.MathUtils.lerp,smooth=T.MathUtils.smoothstep;
const noise=(x,z)=>Math.sin(x*.17+Math.sin(z*.13))*Math.cos(z*.19)+.42*Math.sin(x*.47-z*.33);
const riverAt=z=>{
 const cap=Math.sqrt(Math.max(0,1-Math.pow((z+29)/143,8)));
 const right=-50+4.5*Math.sin(z*.052)+1.5*Math.sin(z*.13);
 const width=(135+8*Math.sin(z*.032+1)+5*Math.cos(z*.07))*cap;
 return {right,left:right-width,width};
};

// Keep the original grove intact and weld the new lowland to its real boundary.
export function addRiverside(root,time){
 let seed=9182;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const edges=new Map(),a=new T.Vector3(),b=new T.Vector3();
 root.traverse(o=>{
  if(!o.isMesh||!/Forest.floor/i.test(o.name))return;
  const p=o.geometry.attributes.position,idx=o.geometry.index,count=idx?idx.count:p.count;
  const key=v=>[v.x,v.y,v.z].map(n=>n.toFixed(3)).join(',');
  for(let i=0;i<count;i+=3)for(let j=0;j<3;j++){
   a.fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(o.matrix);b.fromBufferAttribute(p,idx?idx.getX(i+(j+1)%3):i+(j+1)%3).applyMatrix4(o.matrix);
   const ka=key(a),kb=key(b),k=ka<kb?ka+'|'+kb:kb+'|'+ka,edge=edges.get(k);
   if(edge)edge.count++;
   else {
    const colorAt=n=>p&&o.geometry.attributes.color?new T.Color().fromBufferAttribute(o.geometry.attributes.color,idx?idx.getX(n):n).multiply(o.material.color):o.material.color.clone();
    edges.set(k,{a:a.clone(),b:b.clone(),ca:colorAt(i+j),cb:colorAt(i+(j+1)%3),count:1});
   }
  }
 });
 const boundary=[...edges.values()].filter(e=>e.count===1),flowerSites=[],rockSites=[],reedSites=[];
 const plum=new T.Color('#49334b'),earth=new T.Color('#69616a'),wet=new T.Color('#555761');
 function terrainColor(x,z,t){return plum.clone().lerp(earth,smooth(t,.12,.86)).lerp(wet,smooth(t,.72,1)).multiplyScalar(.92+noise(x,z)*.12);}
 function mesh(name,vertices,colors,indices,material){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));if(indices)g.setIndex(indices);g.computeVertexNormals();
  const m=material||new T.MeshStandardMaterial({vertexColors:true,roughness:.97,side:T.DoubleSide});
  if(!material)detailSurface(m,'stone');const o=new T.Mesh(g,m);o.name=name;o.receiveShadow=true;root.add(o);return o;
 }
 const slope=(p,t)=>{
  const direction=new T.Vector2(p.x,p.z+30).normalize();
  const west=smooth(-direction.x,.3,.85),width=20+noise(p.x,p.z)*6+4*Math.sin(p.z*.08);
  const q=new T.Vector3(p.x+direction.x*width*t,0,p.z+direction.y*width*t);
  const river=riverAt(q.z),outerX=mix(p.x+direction.x*width,river.right-1.4,west);
  q.x=mix(p.x,outerX,t);
  const end=mix(-4.8,WATER-.55,west),u=t*t*(3-2*t);
  q.y=mix(p.y,end,u)+Math.sin(Math.PI*t)*(noise(q.x,q.z)*.48+.5);return q;
 };
 let vertices=[],colors=[],indices=[];
 for(const e of boundary){
  const start=vertices.length/3,rows=20;
  for(let j=0;j<=rows;j++)for(const [p,edgeColor] of [[e.a,e.ca],[e.b,e.cb]]){
   const t=j/rows,q=slope(p,t);vertices.push(...q.toArray());
   // Match the GLB's actual vertex color × material at the seam, then fade
   // through soil to wet gravel. This also preserves its color-space conversion.
   colors.push(...edgeColor.clone().lerp(terrainColor(q.x,q.z,t),smooth(t,0,.52)).toArray());
  }
  for(let j=0;j<rows;j++){const k=start+j*2;indices.push(k,k+3,k+1,k,k+2,k+3);}
  // Area-weighted scatter avoids planted rows and concentration at mesh seams.
  const area=e.a.distanceTo(e.b)*slope(e.a,1).distanceTo(e.a);
  for(let j=0;j<Math.floor(area*1.9);j++){
   const t=rand(),p=e.a.clone().lerp(e.b,rand()),q=slope(p,t);
   if(t<.83&&rand()<(1-smooth(t,.25,.85))*(.65+.3*Math.sin(q.x*.4+q.z*.22)))flowerSites.push(q);
   else if(rand()<.15)rockSites.push({p:q,s:.18+rand()*.65});
  }
 }
 mesh('Violet riverside ground',vertices,colors,indices);

 // A rounded low valley floor supports the water and mountain feet. The outer
 // contours sink into the valley, instead of ending in a rectangular pedestal.
 vertices=[];colors=[];indices=[];const rings=42,segments=180;
 for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
  const angle=i/segments*Math.PI*2,r=j/rings,wobble=1+.045*Math.sin(angle*7)+.025*Math.cos(angle*13);
  const x=-28+Math.cos(angle)*123*r*wobble,z=-28+Math.sin(angle)*172*r*wobble;
  const y=-6.5+noise(x*.6,z*.6)*1.4-Math.pow(r,6)*17;
  vertices.push(x,y,z);colors.push(...new T.Color('#59525a').lerp(new T.Color('#77706a'),smooth(-x,42,100)).multiplyScalar(.85+.12*noise(x,z)).toArray());
  if(j<rings&&i<segments){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+2,k,k+segments+2,k+segments+1);}
 }
 mesh('Violet valley basin ground',vertices,colors,indices);

 // Real submerged cross-sections: pale shallows deepen into a darker channel.
 vertices=[];colors=[];indices=[];const waterV=[],waterC=[],waterI=[],waterUV=[],foamV=[],foamUV=[],foamI=[];
 const steps=300,cols=24;
 for(let i=0;i<=steps;i++){
  const z=114-i*286/steps,r=riverAt(z);
  for(let j=0;j<=cols;j++){
   const u=j/cols,x=mix(r.left,r.right,u),edge=Math.sin(Math.PI*u),depth=.12+edge*(8+2*Math.sin(z*.07));
   waterV.push(x,WATER,z);waterUV.push(u,i/steps);
   waterC.push(...new T.Color('#778b8b').lerp(new T.Color('#344f60'),smooth(edge,.08,.9)).multiplyScalar(.95+.035*noise(x,z)).toArray());
   vertices.push(x,WATER-depth,z);colors.push(...new T.Color('#8a7d79').lerp(new T.Color('#494952'),edge).toArray());
   if(i<steps&&j<cols){const k=i*(cols+1)+j;waterI.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
  }
  for(const side of [0,1]){
   const x=side?r.right:r.left,sign=side?-1:1,k=foamV.length/3;
   foamV.push(x,WATER+.015,z,x+sign*(.14+.11*Math.sin(z*.31)),WATER+.015,z);foamUV.push(0,z,1,z);
   if(i<steps)foamI.push(k,k+4,k+1,k+1,k+4,k+5);
  }
  if(i%2===0&&r.width>3){
   const side=rand()<.55?1:0,x=(side?r.right:r.left)+(side?1:-1)*(.2+rand()*2);
   rockSites.push({p:new T.Vector3(x,WATER+.02,z),s:.25+rand()*.85});
   if(rand()<.6)reedSites.push(new T.Vector3(x+(side?1:-1)*.7,WATER+.06,z));
  }
 }
 mesh('Violet submerged riverbed ground',vertices,colors,indices);
 vertices=[];colors=[];indices=[];const bankCols=28;
 for(let i=0;i<=steps;i++){
  const z=114-i*286/steps,r=riverAt(z);
  for(let j=0;j<=bankCols;j++){
   const t=j/bankCols,x=r.left+.5-33*t*(1+.12*Math.sin(z*.07));
   const y=WATER-.2+Math.sin(Math.PI*t)*(.9+1.6*Math.pow(Math.sin(z*.065),2))+noise(x,z)*Math.sin(Math.PI*t)*.4-4.8*Math.pow(t,4);
   vertices.push(x,y,z);colors.push(...new T.Color('#746a70').lerp(earth,smooth(t,.1,.7)).multiplyScalar(.88+noise(x,z)*.1).toArray());
   if(i<steps&&j<bankCols){const k=i*(bankCols+1)+j;indices.push(k,k+bankCols+1,k+1,k+1,k+bankCols+1,k+bankCols+2);}
   if(j>2&&j<16&&rand()<.2)rockSites.push({p:new T.Vector3(x,y,z),s:.18+rand()*.65});
  }
 }
 mesh('Violet opposite riverbank ground',vertices,colors,indices);
 // Continue the forest-side shore beyond the grove, down both river bends.
 // Under the original grove this low shelf is covered by the fitted slope.
 vertices=[];colors=[];indices=[];
 for(let i=0;i<=steps;i++){
  const z=114-i*286/steps,r=riverAt(z);
  for(let j=0;j<=bankCols;j++){
   const t=j/bankCols,x=r.right-.5+32*t;
   const y=WATER-.2+Math.sin(Math.PI*t)*(.65+noise(x,z)*.3)-5.5*Math.pow(t,3);
   vertices.push(x,y,z);colors.push(...terrainColor(x,z,.7+t*.3).toArray());
   if(i<steps&&j<bankCols){const k=i*(bankCols+1)+j;indices.push(k,k+1,k+bankCols+1,k+1,k+bankCols+2,k+bankCols+1);}
  }
 }
 mesh('Violet extended riverside ground',vertices,colors,indices);
 const waterMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.2,metalness:.18,transparent:true,opacity:.84,depthWrite:false,side:T.DoubleSide});
 waterMaterial.onBeforeCompile=s=>{
  s.uniforms.riverTime=time;
  s.vertexShader='uniform float riverTime; varying vec3 riverPosition; varying vec2 riverUv;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n riverPosition=position;riverUv=uv;transformed.y+=sin(uv.x*3.14159)*(.018*sin(position.z*1.4-riverTime*1.2)+.012*sin(position.x*2.1+position.z*.8-riverTime));');
  s.fragmentShader=`uniform float riverTime; varying vec3 riverPosition; varying vec2 riverUv;
   float riverHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float riverNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(riverHash(i),riverHash(i+vec2(1,0)),f.x),mix(riverHash(i+vec2(0,1)),riverHash(i+vec2(1,1)),f.x),f.y);}
  `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float flowZ=riverPosition.z-riverTime*1.65;
   float rip=riverNoise(vec2(riverPosition.x*3.,flowZ*.8))*2.-1.;
   diffuseColor.rgb*=.96+.04*rip;
   float glint=pow(max(0.,rip),18.); diffuseColor.rgb+=glint*.06;
   diffuseColor.a*=smoothstep(0.,.018,riverUv.x)*smoothstep(0.,.018,1.-riverUv.x);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n normal=normalize(normal+vec3((riverNoise(vec2(riverPosition.x*2.,riverPosition.z-riverTime*1.65))-.5)*.08,(riverNoise(vec2(riverPosition.x*4.+17.,riverPosition.z*.6-riverTime))-.5)*.06,0.));');
 };
 const river=mesh('Violet riverside water',waterV,waterC,waterI,waterMaterial);river.geometry.setAttribute('uv',new T.Float32BufferAttribute(waterUV,2));river.userData.noCollision=true;river.renderOrder=2;
 const foamMat=new T.MeshBasicMaterial({color:'#c1c6c2',transparent:true,opacity:.27,depthWrite:false,side:T.DoubleSide});
 foamMat.onBeforeCompile=s=>{s.uniforms.riverTime=time;s.vertexShader='varying vec2 foamUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n foamUv=uv;');s.fragmentShader='uniform float riverTime; varying vec2 foamUv;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=sin(foamUv.x*3.14159)*smoothstep(.2,.8,sin(foamUv.y*1.7-riverTime*.55)+sin(foamUv.y*4.3)*.4);');};
 const foam=mesh('Violet broken shoreline foam',foamV,null,foamI,foamMat);foam.geometry.setAttribute('uv',new T.Float32BufferAttribute(foamUV,2));foam.userData.noCollision=true;foam.renderOrder=3;

 // Instanced three-dimensional petals, stones and rushes keep draw calls low.
 const parts=[],petalV=[],petalC=[];
 function petal(points,color){for(const i of [0,1,2,0,2,3]){petalV.push(...points[i]);petalC.push(...color.toArray());}}
 for(let stem=0;stem<4;stem++){
  const x=(rand()-.5)*.65,z=(rand()-.5)*.65,h=.2+rand()*.35;
  const stemG=new T.CylinderGeometry(.009,.012,h,3,1);stemG.translate(x,h/2,z);const sg=stemG.toNonIndexed();
  sg.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:sg.attributes.position.count},()=>new T.Color('#625a63').toArray()).flat(),3));parts.push(sg);stemG.dispose();
  for(let k=0;k<5;k++){
   const angle=k*Math.PI*2/5,dx=Math.cos(angle),dz=Math.sin(angle),r=.105+rand()*.035;
   petal([[x+dx*.018,h-.015,z+dz*.018],[x+dx*r*.65-dz*.046,h+.014,z+dz*r*.65+dx*.046],[x+dx*r,h+.035,z+dz*r],[x+dx*r*.65+dz*.046,h+.014,z+dz*r*.65-dx*.046]],new T.Color('#c7a5d8').multiplyScalar(.75+rand()*.25));
  }
  for(let k=0;k<2;k++){const angle=stem+k*2.7,dx=Math.cos(angle),dz=Math.sin(angle),y=h*(.3+k*.24);petal([[x,y,z],[x+dx*.06-dz*.025,y+.02,z+dz*.06+dx*.025],[x+dx*.14,y+.045,z+dz*.14],[x+dx*.06+dz*.025,y+.02,z+dz*.06-dx*.025]],new T.Color('#746779'));}
 }
 const petals=new T.BufferGeometry();petals.setAttribute('position',new T.Float32BufferAttribute(petalV,3));petals.setAttribute('color',new T.Float32BufferAttribute(petalC,3));petals.computeVertexNormals();
 // UVs keep the merged geometry attributes compatible with the stem cylinders.
 petals.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(petalV.length/3*2),2));parts.push(petals);
 const flowerGeo=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 const flowerMat=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.95,side:T.DoubleSide});
 flowerMat.onBeforeCompile=s=>{s.uniforms.riverTime=time;s.vertexShader='uniform float riverTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(riverTime*.9+instanceMatrix[3].x*.7+instanceMatrix[3].z)*position.y*.06;');};
 const dummy=new T.Object3D();
 function instances(name,geometry,material,sites,place){
  if(!sites.length)return;
  const obj=new T.InstancedMesh(geometry,material,sites.length);obj.name=name;obj.receiveShadow=true;
  sites.forEach((site,i)=>{dummy.position.copy(site.p||site);dummy.rotation.set(0,rand()*Math.PI*2,0);dummy.scale.setScalar(1);place(dummy,site,i,obj);dummy.updateMatrix();obj.setMatrixAt(i,dummy.matrix);});
  obj.computeBoundingSphere();root.add(obj);return obj;
 }
 const flowers=instances('Violet bank heather flowers',flowerGeo,flowerMat,flowerSites,(d,p,i,o)=>{d.scale.setScalar(.65+rand()*1.5);o.setColorAt(i,new T.Color().setHSL(.76+rand()*.09,.22+rand()*.2,.36+rand()*.3));});if(flowers)flowers.userData.noCollision=true;
 const stoneMat=new T.MeshStandardMaterial({color:'#9a9099',roughness:.92});detailSurface(stoneMat,'stone');
 instances('Violet weathered river rocks',new T.IcosahedronGeometry(1,1),stoneMat,rockSites,(d,p,i,o)=>{d.position.y+=p.s*.1;d.scale.set(p.s*(1+rand()),p.s*(.3+rand()*.45),p.s*(.6+rand()));d.rotation.z=rand()*.5;o.setColorAt(i,new T.Color().setHSL(.74,.045+rand()*.09,.33+rand()*.22));});
 const reedParts=[];for(let i=0;i<6;i++){const g=new T.ConeGeometry(.025,.75+rand()*.6,3);g.translate((rand()-.5)*.5,.45,(rand()-.5)*.5);reedParts.push(g.toNonIndexed());g.dispose();}
 const reeds=instances('Violet shoreline rushes',mergeGeometries(reedParts),new T.MeshStandardMaterial({color:'#76726c',roughness:1}),reedSites,d=>d.scale.setScalar(.6+rand()));reedParts.forEach(g=>g.dispose());if(reeds)reeds.userData.noCollision=true;
 root.userData.riverside={boundaryEdges:boundary.length,flowers:flowerSites.length,rocks:rockSites.length,reeds:reedSites.length,waterLevel:WATER};
}
