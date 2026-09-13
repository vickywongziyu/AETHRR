import {refinedLantern} from './lantern-craft.js';
import {cooperedBarrel,joinedCrate} from './cooperage.js';
import {refinedTable} from './furniture-craft.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {carvedBed} from './soft-furnishing.js';
import {sculptedRoofSnow} from './winter-roof.js';
import {paintedNoiseGLSL} from './painted-surface.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';

function bevelBox(size,r){
 const half=size.map(v=>v*.5),points=[];
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])for(let axis=0;axis<3;axis++)points.push(new T.Vector3(...[x,y,z].map((s,i)=>s*(half[i]-(axis===i?0:r)))));
 const g=new ConvexGeometry(points),p=g.attributes.position,n=g.attributes.normal,uv=[],major=size.indexOf(Math.max(...size));
 for(let i=0;i<p.count;i++){const q=[p.getX(i),p.getY(i),p.getZ(i)],normal=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))],face=normal.indexOf(Math.max(...normal)),lengthAxis=face===major?(face+1)%3:major,widthAxis=[0,1,2].find(j=>j!==face&&j!==lengthAxis);uv.push((q[widthAxis]/size[widthAxis]+.5)*.12+.42,q[lengthAxis]/Math.max(1.8,size[lengthAxis])+.5);}
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
}

// Solid, bevelled components, grouped by material per building. Coordinates are
// local Y-up metres; keeping buildings separate permits inspection and culling.
export function createArchitectureMaterials(){
 const palette={pathstone:'#626253',pathlight:'#797663',stone:'#9a9e95',pale:'#c1bba3',darkstone:'#535e62',vault:'#a9a28b',wood:'#73513a',endgrain:'#ac8860',roof:'#486575',trim:'#a49468',iron:'#404744',leather:'#9d8863',red:'#874c3d',cloth:'#536b78',paper:'#c3b388',glass:'#f6c780',azure:'#77cecd',amethyst:'#ae83d1',snow:'#d3dedc'};
 const suffix=innerWidth<700?'-mobile':'',mats={},loader=new T.TextureLoader(),woodMap=loader.load(import.meta.env.BASE_URL+'atlas/textures/timber-color'+suffix+'.jpg'),woodNormal=loader.load(import.meta.env.BASE_URL+'atlas/textures/timber-normal'+suffix+'.jpg');woodMap.colorSpace=T.SRGBColorSpace;for(const map of [woodMap,woodNormal]){map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;}
 for(const [kind,color] of Object.entries(palette)){
  const m=new T.MeshStandardMaterial({color,roughness:kind==='iron'?.62:kind==='glass'?.3:.86,metalness:['iron','trim'].includes(kind)?.45:0});m.name='Craft · '+kind;
  if(['glass','azure','amethyst'].includes(kind)){m.emissive.set(color);m.emissiveIntensity=kind==='glass'?.65:.35;}
  if(kind==='wood'||kind==='endgrain'){m.map=woodMap;m.normalMap=woodNormal;m.normalScale.set(.22,.22);m.color.set(kind==='wood'?'#dfc09c':'#dfc8a8');}
  if(!['glass','azure','amethyst'].includes(kind)){
   m.onBeforeCompile=s=>{
    // Near edge-on, tiny UV derivatives must not yield an infinite tangent
    // frame that contaminates the floating-point bloom buffers.
    if(kind==='wood'||kind==='endgrain')s.fragmentShader=s.fragmentShader.replace('#include <normalmap_pars_fragment>',T.ShaderChunk.normalmap_pars_fragment.replace('( det == 0.0 )','( det < 1e-16 )'));
    s.vertexShader='varying vec3 craftPos;varying vec2 craftUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncraftPos=position;craftUv=uv;');s.fragmentShader='varying vec3 craftPos;varying vec2 craftUv;\n'+paintedNoiseGLSL+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float craftNoise=paintNoise(craftPos*vec3(.75,.4,.75));
    float craftGrain=${kind==='wood'||kind==='endgrain'?'.6':kind==='leather'||kind==='cloth'?'mix(.5,(.5+.5*sin(craftUv.x*680.))*(.5+.5*sin(craftUv.y*680.)),1.-smoothstep(.35,1.5,max(fwidth(craftUv.x*680.),fwidth(craftUv.y*680.))))':'paintNoise(craftPos*2.1)'};
    diffuseColor.rgb*=.88+craftNoise*.13+craftGrain*.09;
   `);
    if(kind==='wood'||kind==='endgrain')s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vMapUv, .6 )').replace('diffuseColor *= sampledDiffuseColor;','sampledDiffuseColor.rgb=max(vec3(.035),vec3(.30)+(sampledDiffuseColor.rgb-vec3(.30))*.82); diffuseColor *= sampledDiffuseColor;'));
   };m.customProgramCacheKey=()=>`craft-painted-v23-${kind}`;
  }mats[kind]=m;
 }return mats;
}

export class Craft {
 constructor(materials,name){this.materials=materials;this.name=name;this.bins=new Map();this.parts=0;}
 add(g,kind='stone',pos=[0,0,0],rot=[0,0,0]){
  if(g.index){const raw=g;g=g.toNonIndexed();raw.dispose();}
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));
  if(!this.bins.has(kind))this.bins.set(kind,[]);this.bins.get(kind).push(g);this.parts++;return this;
 }
 box(p,size,kind='wood',rot=[0,0,0],bevel=.025){return this.add(bevelBox(size,Math.min(bevel,...size.map(v=>v*.2))),kind,p,rot);}
 tube(a,b,r=.08,kind='wood',end=r,n=10){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(end,r,d.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return this.add(g,kind,av.add(bv).multiplyScalar(.5).toArray());}
 line(points,r=.07,kind='trim',closed=false){const pts=points.map(p=>new T.Vector3(...p));return this.add(new T.TubeGeometry(new T.CatmullRomCurve3(pts,closed,'centripetal'),Math.min(64,Math.max(12,Math.ceil(points.length*1.3))),r,6,closed),kind);}
 ring(p,r,t=.05,kind='trim'){return this.add(new T.TorusGeometry(r,t,6,32),kind,p,[Math.PI/2,0,0]);}
 cylinder(p,r,h,kind='stone',top=r,n=32){return this.add(new T.CylinderGeometry(top,r,h,n),kind,p);}
 sphere(p,size,kind='stone'){const g=new T.SphereGeometry(1,12,8);g.scale(...size);return this.add(g,kind,p);}
 prism(points,depth,kind='wood'){
  // Polygon in XY, extruded along Z, with a closed back and bevels.
  const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],p[1])));const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.018,bevelThickness:.018});return this.add(g,kind);
 }
 crystal(p,h=.45,r=.13,kind='azure'){this.cylinder([p[0],p[1]+h*.30,p[2]],r,h*.6,kind,r*.7,6);this.add(new T.ConeGeometry(r*.72,h*.55,6),kind,[p[0],p[1]+h*.86,p[2]]);}
 lamp(p,scale=1,kind='glass',options={}){return refinedLantern(this,p,scale,kind,options);}
 barrel(p,r=.43,h=.95){return cooperedBarrel(this,p,r,h);}
 crate(p,size=[.85,.78,.85]){return joinedCrate(this,p,size);}
 bench(p,w=1.7,kind='wood',back=true){const[x,y,z]=p;this.box([x,y+.53,z],[w,.14,.52],kind);for(const s of [-1,1]){this.box([x+s*w*.35,y+.24,z],[.13,.48,.39],kind);if(back)this.tube([x+s*w*.4,y+.3,z-.2],[x+s*w*.4,y+1.15,z-.29],.055,kind);}if(back)this.box([x,y+.98,z-.27],[w,.26,.10],kind,[-.1,0,0]);}
 table(p,w=1.4,d=.85,options={}){return refinedTable(this,p,w,d,options);}
 rug(p,w=1.5,d=2.8,kind='red'){const[x,y,z]=p;this.box([x,y+.027,z],[w,.035,d],kind,[0,0,0],.01);for(const s of [-1,1])this.box([x+s*(w*.5-.09),y+.05,z],[.055,.006,d-.1],'paper',[0,0,0],.001);for(let i=0;i<8;i++){this.box([x+(i-3.5)*w/8,y+.043,z-d*.5-.05],[.015,.014,.15],'paper');this.box([x+(i-3.5)*w/8,y+.043,z+d*.5+.05],[.015,.014,.15],'paper');}}
 bed(p,w=1.15,d=2.1){carvedBed(this,p,w,d);}
 finish(parent,pos=[0,0,0],yaw=0){const root=new T.Group();root.name=this.name;root.position.fromArray(pos);root.rotation.y=yaw;root.userData.crafted=true;root.userData.components=this.parts;if(this.storageFixtures)root.userData.storageFixtures=this.storageFixtures;if(this.lampFixtures)root.userData.lampFixtures=this.lampFixtures;
  for(const[k,geos]of this.bins){const g=mergeGeometries(geos);geos.forEach(g=>g.dispose());g.computeBoundingSphere();const mesh=new T.Mesh(g,this.materials[k]);mesh.name=this.name+' · '+k;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.crafted=true;if(['glass','azure','amethyst','trim'].includes(k))mesh.userData.noCollision=true;root.add(mesh);}parent.add(root);return root;
 }
}

export function flutedColumn(c,x,z,base,h,r=.28){
 for(const [dy,rad,ht] of [[.10,r*1.65,.20],[.26,r*1.43,.12],[.42,r*1.14,.2],[h-.39,r*1.13,.18],[h-.18,r*1.56,.24],[h+.02,r*1.65,.16]])c.cylinder([x,base+dy,z],rad,ht,'stone',rad,24);
 const profile=[];for(let j=0;j<=20;j++){const t=j/20;profile.push(new T.Vector2(r*(1-.12*t)+Math.sin(t*Math.PI)*r*.06,.5+t*(h-.95)));}
 const g=new T.LatheGeometry(profile,48),p=g.attributes.position;for(let i=0;i<p.count;i++){const xx=p.getX(i),zz=p.getZ(i),a=Math.atan2(zz,xx),s=1-.07*Math.pow(.5+.5*Math.cos(a*12),4);p.setXYZ(i,xx*s,p.getY(i),zz*s);}g.computeVertexNormals();c.add(g,'pale',[x,base,z]);
 for(let k=0;k<8;k++){const a=k*Math.PI/4,pts=[];for(let j=0;j<=12;j++){const t=j/12,rr=r*(1.02+.45*Math.sin(t*Math.PI));pts.push([x+Math.cos(a)*rr,base+h-.5+t*.55,z+Math.sin(a)*rr]);}c.line(pts,.028,'trim');}
}

export function dome(c,r,y,rise){
 const profile=[];for(let i=0;i<=40;i++){const t=i/40;profile.push(new T.Vector2(Math.max(.015,r*Math.cos(t*Math.PI/2)),y+Math.sin(t*Math.PI/2)*rise));}
 // Double shell plus closed eave ring. The underside has its own surface.
 c.add(new T.LatheGeometry(profile,96),'roof');
 const lining=new T.LatheGeometry(profile.map(p=>new T.Vector2(Math.max(.008,p.x-.10),p.y-.13)),96);
 for(let i=0;i<lining.index.count;i+=3){const b=lining.index.getX(i+1);lining.index.setX(i+1,lining.index.getX(i+2));lining.index.setX(i+2,b);}
 for(let i=0;i<lining.attributes.normal.array.length;i++)lining.attributes.normal.array[i]*=-1;
 c.add(lining,'vault');
 // Raised ribs sit partly inside the vault surface, with no floating ends.
 for(let k=0;k<8;k++){
  const a=k*Math.PI/4,points=[];
  for(let i=0;i<=24;i++){const t=i/24,rr=Math.max(.008,r*Math.cos(t*Math.PI/2)-.10);points.push([Math.cos(a)*rr,y+Math.sin(t*Math.PI/2)*rise-.155,Math.sin(a)*rr]);}
  c.line(points,.035,'trim');
 }
 c.sphere([0,y+rise-.145,0],[.12,.045,.12],'trim');
 for(const[dy,rr,t]of [[-.10,1.01,.17],[.06,1.015,.065],[.25,.995,.055]])c.ring([0,y+dy,0],r*rr,t,'pale');
 for(let k=0;k<8;k++){
  const a=k*Math.PI/4,pts=[];
  for(let i=0;i<=24;i++){const t=i/24,ang=a+Math.sin(t*Math.PI*2)*.15,rr=r*Math.cos(t*Math.PI/2)+.04;pts.push([Math.cos(ang)*rr,y+Math.sin(t*Math.PI/2)*rise+.04,Math.sin(ang)*rr]);}c.line(pts,.055,'trim');
  const leaf=[];for(let i=0;i<49;i++){const t=i/48*Math.PI*2,u=.2+.48*(.5-.5*Math.cos(t)),ang=a+Math.sin(t)*.17,rr=r*Math.cos(u*Math.PI/2)+.075;leaf.push([Math.cos(ang)*rr,y+Math.sin(u*Math.PI/2)*rise+.04,Math.sin(ang)*rr]);}c.line(leaf,.038,'pale',true);
 }
 c.cylinder([0,y+rise+.1,0],.17,.23,'trim',.12);c.crystal([0,y+rise+.20,0],.65,.12);
}

export function pavilion(c,r,h,base=.65,{gold=false}={}){
 for(let k=0;k<4;k++)c.cylinder([0,k*.16+.06,0],r+.64-k*.12,.16,'stone',r+.64-k*.12,64);
 c.cylinder([0,base-.07,0],r+.17,.18,'darkstone',r+.17,64);
 for(let row=0;row<3;row++){const outer=(r+.10)*(row+1)/3,inner=(r+.10)*row/3;for(let k=0;k<32;k++){const a=(k+.02)*Math.PI/16,b=(k+.98)*Math.PI/16;const shape=new T.Shape();shape.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);shape.absarc(0,0,outer,a,b,false);shape.lineTo(Math.cos(b)*inner,Math.sin(b)*inner);if(inner>.001)shape.absarc(0,0,inner,b,a,true);const g=new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:false,curveSegments:3});c.add(g,(k+row)%5?'pale':'stone',[0,base+.05,0],[Math.PI/2,0,0]);}}
 for(let k=0;k<8;k++){
  const a=(k+.5)*Math.PI/4,x=r*Math.cos(a),z=r*Math.sin(a);flutedColumn(c,x,z,base,h,.25+r*.025);
  const b=a+Math.PI/4,pts=[];for(let j=0;j<=16;j++){const t=j/16,ang=a+(b-a)*t;pts.push([Math.cos(ang)*r,base+h-.25+Math.sin(t*Math.PI)*.50,Math.sin(ang)*r]);}c.line(pts,.13,'pale');c.line(pts.map(p=>[p[0]*1.016,p[1]+.19,p[2]*1.016]),.04,'trim');
  // Thick scalloped tympanum with a carved central diamond.
  const mid=a+Math.PI/8,rr=r*1.01;for(let j=0;j<10;j++){const ang=a+(j+.5)/10*Math.PI/4;c.box([Math.cos(ang)*rr,base+h+.26,Math.sin(ang)*rr],[r*.10,.46,.20],'stone',[0,-ang,0]);}
  c.crystal([Math.cos(mid)*r*1.055,base+h+.18,Math.sin(mid)*r*1.055],.37,.12,gold?'glass':'azure');
 }
 dome(c,r*1.13,base+h+.62,r*.73);
 c.ring([0,base+.04,0],r*.42,.025,'trim');c.ring([0,base+.04,0],r*.46,.013,'trim');
 c.bench([-r*.53,base,-r*.42],r*.66,'stone');c.bench([r*.53,base,-r*.42],r*.66,'stone');
 c.table([0,base,-r*.40],Math.min(1.4,r*.7),.65);
 for(const s of [-1,1])c.lamp([s*r*.73,base+.12,r*.22],.6,gold?'glass':'azure');
}

export function roofProfile(t,eave,rise,sweep=false){return sweep?eave+rise*Math.pow(1-t,1.55)+.38*Math.pow(t,8):eave+rise*(1-t)+.27*Math.sin(t*Math.PI);}

export function shingleRoof(c,w,d,eave,rise,{snow=false,sweep=false}={}){
 const W=w/2+.9,D=d+.95,rows=11,cols=Math.ceil(D/.6);
 for(const side of [-1,1]){
  const profile=t=>roofProfile(t,eave,rise,sweep),pts=[];
  // Real shingle thickness, staggered rows, and a smooth beam under each gable.
  for(let row=0;row<rows;row++){
   const t=(row+.54)/rows,x=side*W*t,y=profile(t),slope=(profile(Math.min(1,t+.001))-profile(Math.max(0,t-.001)))/(.002*W),angle=side*Math.atan(slope);
   for(let j=0;j<cols;j++){const z=-D/2+(j+.5)*D/cols+(row%2?.11:0);c.box([x,y+.075,z],[W/rows*Math.sqrt(1+slope*slope)+.085,.12,D/cols+.025],'roof',[0,0,angle],.025);}
  }
  if(snow)sculptedRoofSnow(c,W,D,profile,side);
  for(let k=0;k<=20;k++){const t=k/20;pts.push([side*W*t,profile(t)-.08,0]);}
  for(const z of [-D/2-.06,D/2+.06])c.line(pts.map(p=>[p[0],p[1],z]),.18,'wood');
  for(const z of [-D/2-.11,D/2+.11])c.line(pts.map(p=>[p[0],p[1]+.11,z]),.045,'trim');
  c.tube([side*W,eave, -D/2],[side*W,eave,D/2],.16,'wood');
 }
 c.tube([0,eave+rise+.17,-D/2-.22],[0,eave+rise+.17,D/2+.22],.17,'wood');
}
