import * as T from 'three';
import {makePaperArt,drawEmblem,REGIONAL_ART} from './discovery-art.js';
import {DISCOVERIES} from './discovery-content.js';
import {drawWishPaper} from './wish-paper.js';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

function workshop(name){
 const root=new T.Group();root.name=name;const owned=[],textures=[];
 const material=options=>{const m=new T.MeshStandardMaterial(options);owned.push(m);return m;};
 const texture=canvas=>{const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;};
 const mesh=(g,m,p=[0,0,0],r=[0,0,0],parent=root)=>{const o=new T.Mesh(g,m);o.position.fromArray(p);o.rotation.fromArray(r);o.castShadow=true;o.receiveShadow=true;o.userData.noCollision=true;parent.add(o);return o;};
 root.userData.noCollision=true;
 return {root,material,texture,mesh,dispose(){root.traverse(o=>o.geometry?.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}};
}
export function makeScroll(region='highland'){
 const w=workshop('可拾取的旅行卷轴'),{root,material,texture,mesh}=w,art=makePaperArt(region),map=texture(art);
 const paper=material({map,roughness:.98,side:T.DoubleSide,bumpMap:map,bumpScale:.0007}),wood=material({color:'#493424',roughness:.85}),brass=material({color:'#9d7c43',metalness:.55,roughness:.55}),wax=material({color:REGIONAL_ART[region].wax,roughness:.72,emissive:REGIONAL_ART[region].wax,emissiveIntensity:.10}),thread=material({color:'#65513d',roughness:1});
 const g=new T.PlaneGeometry(.64,.48,40,20),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i),curl=Math.pow(Math.abs(x)/.32,7)*.055;p.setXYZ(i,x,.021+curl+Math.sin(z*33+x*5)*.0016,z+(Math.abs(z)>.23?Math.sin(x*174)*.002:0));}g.computeVertexNormals();mesh(g,paper);
 // Rolled sleeves surround wooden spindles; the writing remains exposed.
 for(const s of [-1,1]){
  mesh(new T.CylinderGeometry(.032,.032,.55,14),wood,[s*.345,.058,0],[Math.PI/2,0,0]);
  mesh(new T.CylinderGeometry(.044,.044,.48,24),paper,[s*.323,.059,0],[Math.PI/2,0,0]);
  for(const z of [-.283,.283]){mesh(new T.SphereGeometry(.043,12,8),wood,[s*.345,.058,z]);mesh(new T.TorusGeometry(.034,.007,6,16),brass,[s*.345,.058,z]);}
 }
 const cord=new T.CatmullRomCurve3([new T.Vector3(.1,.029,-.2),new T.Vector3(.12,.027,-.02),new T.Vector3(.15,.028,.19)]);mesh(new T.TubeGeometry(cord,12,.003,5,false),thread);
 mesh(new T.CylinderGeometry(.071,.063,.018,32),wax,[.13,.04,.07]);mesh(new T.TorusGeometry(.051,.0028,6,32),brass,[.13,.051,.07],[Math.PI/2,0,0]);
 const seal=document.createElement('canvas');seal.width=seal.height=128;const c=seal.getContext('2d');c.strokeStyle='#cfb080';drawEmblem(c,region,64,64,43);
 mesh(new T.PlaneGeometry(.083,.083),material({map:texture(seal),transparent:true,depthWrite:false,roughness:.68}),[.13,.052,.07],[-Math.PI/2,0,0]);
 return {...w,art:art.toDataURL(),mark(collected){wax.emissiveIntensity=collected?0:.10;}};
}
export function makeWishingBasin(){
 const w=workshop('听风许愿台'),{root,material,texture,mesh}=w,tags=[],motes=[],stones=[],ripples=[],coins=[];
 const stone=material({color:'#8a9789',roughness:.92}),dark=material({color:'#526a60',roughness:.95}),gold=material({color:'#a78951',metalness:.62,roughness:.47});
 const mineral=document.createElement('canvas');mineral.width=mineral.height=256;const mc=mineral.getContext('2d');mc.fillStyle='#dbded2';mc.fillRect(0,0,256,256);
 for(let i=0;i<5400;i++){const x=(i*73.37)%256,y=(i*37.19)%256;mc.fillStyle=i%3?'#76836a16':'#f0eddf35';mc.fillRect(x,y,1+(i%3),1);}
 for(let i=0;i<12;i++){mc.strokeStyle='#596e5730';mc.lineWidth=.6;mc.beginPath();for(let j=0;j<24;j++){const x=i*24+Math.sin(j*.8+i)*4,y=j*12;j?mc.lineTo(x,y):mc.moveTo(x,y);}mc.stroke();}
 stone.map=texture(mineral);stone.bumpMap=stone.map;stone.bumpScale=.0012;
 const glow=new T.MeshBasicMaterial({color:'#e6cc87',transparent:true,opacity:0,depthWrite:false});
 const water=material({color:'#6bb8aa',roughness:.2,metalness:.14,transparent:true,opacity:.44,depthWrite:false});const time={value:0};
 water.onBeforeCompile=shader=>{
  shader.uniforms.basinTime=time;
  shader.vertexShader='varying vec3 basinLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbasinLocal = position;');
  shader.fragmentShader='uniform float basinTime;\nvarying vec3 basinLocal;\n'+shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal = normalize(normal + vec3(sin(basinLocal.x * 32.0 + basinTime * .6), cos(basinLocal.y * 29.0 - basinTime * .5), 0.0) * .045);').replace('#include <color_fragment>','#include <color_fragment>\nfloat ripple = sin(length(basinLocal.xy) * 85.0 - basinTime * 1.4 + sin(basinLocal.x * 14.0));\ndiffuseColor.rgb *= 1.0 + pow(max(ripple, 0.0), 12.0) * .19;');
 };
 water.customProgramCacheKey=()=> 'wishing-water-v10';
 mesh(new T.CylinderGeometry(.40,.52,.18,48),stone,[0,.09,0]);
 mesh(new T.LatheGeometry([[.22,.16],[.26,.24],[.45,.32],[.60,.43],[.59,.49],[.53,.48],[.44,.35],[.25,.26],[0,.25]].map(([x,y])=>new T.Vector2(x,y)),64),stone);
 mesh(new T.TorusGeometry(.568,.014,8,64),gold,[0,.482,0],[Math.PI/2,0,0]);
 mesh(new T.TorusGeometry(.495,.006,6,64),dark,[0,.163,0],[Math.PI/2,0,0]);
 mesh(new T.CircleGeometry(.23,48),dark,[0,.256,0],[-Math.PI/2,0,0]);
 const pool=mesh(new T.CircleGeometry(.48,64),water,[0,.38,0],[-Math.PI/2,0,0]);pool.castShadow=false;pool.renderOrder=2;
 for(let i=0;i<20;i++){
  const a=i*Math.PI*2/20,leaf=mesh(new T.SphereGeometry(1,8,6),i%2?dark:gold,[Math.cos(a)*.49,.358,Math.sin(a)*.49],[0,-a,Math.PI*.2]);leaf.scale.set(.018,.051,.009);
 }
 const flowerRegions=['aether','highland','forest','watercourt','valley'];
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,at=[Math.cos(a)*.55,.476,Math.sin(a)*.55],m=material({color:'#768579',metalness:.32,roughness:.48});stones.push(m);
  mesh(new T.CylinderGeometry(.064,.075,.018,16),gold,at);mesh(new T.SphereGeometry(.044,12,8),m,[at[0],at[1]+.008,at[2]]);
  const d=DISCOVERIES.find(d=>d.region===flowerRegions[i]),coin=new T.Group();root.add(coin);coin.position.set(Math.cos(a)*.20,.277,Math.sin(a)*.20);coin.rotation.y=-a;coin.userData.noCollision=true;
  mesh(new T.CylinderGeometry(.075,.075,.009,32),gold,[0,0,0],[0,0,0],coin);mesh(new T.TorusGeometry(.062,.0025,5,32),gold,[0,.007,0],[Math.PI/2,0,0],coin);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#b49a63';c.fillRect(0,0,128,128);c.strokeStyle='#4c503b';drawEmblem(c,d.region,64,64,44);
  mesh(new T.CircleGeometry(.055,32),material({map:texture(canvas),metalness:.45,roughness:.52}),[0,.008,0],[-Math.PI/2,0,0],coin);
  coin.traverse(o=>o.userData.discoveryId=d.id);coin.visible=false;coins.push(coin);
 }
 for(const s of [-1,1]){mesh(new T.CylinderGeometry(.018,.028,1.34,12),gold,[s*.78,.67,-.46]);mesh(new T.SphereGeometry(.035,12,8),gold,[s*.78,1.35,-.46]);mesh(new T.CylinderGeometry(.07,.09,.07,12),stone,[s*.78,.035,-.46]);}
 const curve=new T.CatmullRomCurve3([new T.Vector3(-.78,1.3,-.46),new T.Vector3(0,1.18,-.46),new T.Vector3(.78,1.3,-.46)]);mesh(new T.TubeGeometry(curve,24,.005,6,false),dark);
 for(let i=0;i<6;i++){
  const q=curve.getPoint((i+.5)/6),tag=new T.Group();tag.position.copy(q);root.add(tag);mesh(new T.TorusGeometry(.025,.0025,6,20),gold,[0,-.024,0],[0,0,0],tag);
  const canvas=drawWishPaper(document.createElement('canvas'),{text:'',name:''}),map=texture(canvas),paper=material({map,side:T.DoubleSide,roughness:.97});
  const shape=new T.Shape();shape.moveTo(-.07,0);shape.lineTo(.07,0);shape.lineTo(.085,-.015);shape.lineTo(.085,-.288);shape.lineTo(.07,-.3);shape.lineTo(-.07,-.3);shape.lineTo(-.085,-.288);shape.lineTo(-.085,-.015);shape.closePath();
  const hole=new T.Path();hole.absarc(0,-.018,.0075,0,Math.PI*2,true);shape.holes.push(hole);
  // Subdivide the actual perforated outline, preserving the punched hole.
  const outline=new T.ShapeGeometry(shape,12),tessellated=new TessellateModifier(.024,8).modify(outline),g=mergeVertices(tessellated);outline.dispose();tessellated.dispose();const positions=g.attributes.position,uv=g.attributes.uv;
  for(let j=0;j<positions.count;j++)uv.setXY(j,positions.getX(j)/.17+.5,1+positions.getY(j)/.3);
  const sheet=mesh(g,paper,[0,-.031,0],[0,0,0],tag);sheet.userData.base=Float32Array.from(positions.array);
  const eyelet=mesh(new T.TorusGeometry(.0085,.0015,5,16),gold,[0,-.049,.001],[0,0,0],tag);
  tag.userData.sheet=sheet;tag.userData.eyelet=eyelet;tag.userData.canvas=canvas;tag.userData.signature='';tag.visible=false;tags.push(tag);
 }
 for(let i=0;i<16;i++){const m=mesh(new T.SphereGeometry(.012,6,4),glow);m.castShadow=false;motes.push(m);}
 for(let i=0;i<3;i++){const r=mesh(new T.TorusGeometry(.46,.003,4,48),glow,[0,.388+i*.001,0],[Math.PI/2,0,0]);r.castShadow=false;ripples.push(r);}
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let start=-Infinity,lastCloth=0,selectedWish=null;
 return {...w,coins,tags,setArchives(ids){coins.forEach(c=>c.visible=ids.includes(c.userData.discoveryId));},setWishes(wishes){tags.forEach((tag,i)=>{const wish=wishes[i];tag.visible=Boolean(wish);tag.traverse(o=>{o.userData.wishId=wish?.id;});if(!wish)return;const signature=JSON.stringify([wish.id,wish.text,wish.name]);if(signature!==tag.userData.signature){drawWishPaper(tag.userData.canvas,wish);tag.userData.sheet.material.map.needsUpdate=true;tag.userData.signature=signature;}});},setHovered(id){selectedWish=id;},setFlowers(flags){stones.forEach((m,i)=>{const color=['#dfbf7f','#c7d3ed','#d29ee7','#ead3a4','#bacfe8'][i];m.color.set(flags[i]?color:'#768579');m.emissive.set(flags[i]?color:'#000000');m.emissiveIntensity=flags[i]?.18:0;});},celebrate(){start=performance.now()/1000;},get celebrating(){return performance.now()/1000-start<5;},update(){
  const now=performance.now()/1000,t=Math.min(5,Math.max(0,now-start));time.value=now;glow.opacity=t<5?Math.sin(Math.min(1,t/5)*Math.PI)*.8:0;
  motes.forEach((m,i)=>{m.visible=t<5;const a=i*2.399+t*.5;m.position.set(Math.cos(a)*(.2+t*.08),.4+t*.45+(i%4)*.12,Math.sin(a)*(.2+t*.08));});ripples.forEach((r,i)=>{r.visible=t<5;r.scale.setScalar(.15+((t*.4+i/3)%1)*.85);});
  if(now-lastCloth>1/24){lastCloth=now;tags.forEach((tag,i)=>{if(!tag.visible)return;const motion=reducedMotion.matches?0:1;tag.rotation.x=Math.sin(now*.7+i)*.06*motion;tag.rotation.z=Math.sin(now*.43+i)*.018*motion;const sheet=tag.userData.sheet,p=sheet.geometry.attributes.position,base=sheet.userData.base;sheet.material.emissive.set('#c9ab73');sheet.material.emissiveIntensity=tag.userData.wishId===selectedWish?.14:0;for(let j=0;j<p.count;j++){const u=Math.max(0,(-base[j*3+1]-.025)/.275);p.setZ(j,(Math.sin(u*3.4-now*1.1+i)*.018*motion+.008)*u*u);}p.needsUpdate=true;sheet.geometry.computeVertexNormals();});}
 },dispose(){w.dispose();glow.dispose();}};
}
