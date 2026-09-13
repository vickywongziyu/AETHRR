import * as T from 'three';
import {refineBridgeheads} from './bridgehead-refinement.js';
import {relocateBridgeTrees} from './bridge-tree-clearance.js';
import {Craft,createArchitectureMaterials,pavilion,shingleRoof,flutedColumn,roofProfile} from './architecture-kit.js';
import sites from './building-sites.json';
import {carvedMask,tentPanels,tentRadius,entrancePaving,continuousHorns,shortPorch} from './highland-sculpture.js';
import {shrinePaving} from './shrine-paving.js';
import {removeLegacyCabinFurniture,cabinFloorLevel} from './cabin-furniture.js';
import {shelvedBook} from './building-fixtures.js';
import {groundedRoomRug} from './soft-furnishing.js';
import {snowCap,logCabinRoofUnderlay,roofChimney} from './winter-roof.js';
import {removeLegacyTentParts,tailoredTent,tentEntry} from './tent-refinement.js';

const PAVILIONS=[
 ['West_foreground_rotunda','西岸会客亭',-10,-10,2.35,3.4,.1],
 ['East_foreground_rotunda','晨露议事亭',12,-8,3.25,4.2,.1],
 ['Old_moon_rotunda','旧月藏书亭',-5,16,2.8,4.1,.1],
 ['Little_water_shrine','临水小祠',5,16,1.6,2.8,.1],
 ['Terrace_rotunda','高台观星厅',18,19,4.1,4.6,2.3],
 ['Distant_shrine','远庭祈愿亭',7,36,2.1,3.7,1.2],
];
function hide(o){o.visible=false;o.userData.noCollision=true;o.userData.replacedByCraft=true;}
function pruneTriangles(o,remove){const g=o.geometry,idx=g.index,p=g.attributes.position,keep=[];for(let i=0;i<(idx?.count||p.count);i+=3){const tri=[0,1,2].map(j=>idx?idx.getX(i+j):i+j);const points=tri.map(j=>new T.Vector3().fromBufferAttribute(p,j));if(!remove(points))keep.push(...tri);}if(keep.length!==(idx?.count||p.count)){o.geometry=g.clone();o.geometry.setIndex(keep);o.geometry.computeBoundingSphere();}}
function horn(c,p,side=1,scale=1){const[x,y,z]=p,points=[];for(let i=0;i<=20;i++){const t=i/20;points.push(new T.Vector3(x+side*(.2+t*1.8)*scale,y+(.1+t*t*1.1)*scale,z+Math.sin(t*Math.PI)*.13*scale));}
 const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,24,.22*scale,9,false),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const row=Math.floor(i/10),t=Math.min(1,row/24),center=curve.getPointAt(t),v=new T.Vector3().fromBufferAttribute(a,i).sub(center).multiplyScalar(Math.max(.018,1-t*.98)).add(center);a.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();c.add(g,'paper');}
function band(c,p,r=.23){for(let k=0;k<4;k++)c.ring([p[0],p[1]+k*.06,p[2]],r,.035,'red');}
function tentLampFooting(c,source,b,x,z){
 const terrain=[];source.traverse(o=>{if(o.isMesh&&/^HC ground/.test(o.material?.name||''))terrain.push(o);});
 source.updateWorldMatrix(true,true);const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),heights=[];
 for(const [dx,dz]of [[0,0],[-.29,0],[.29,0],[0,-.29],[0,.29]]){
  ray.set(source.localToWorld(new T.Vector3(b.x+x+dx,b.z+1,-b.y+z+dz)),down);ray.far=4;
  const hit=ray.intersectObjects(terrain,false)[0];if(hit)heights.push(source.worldToLocal(hit.point.clone()).y-b.z);
 }
 if(heights.length!==5)throw Error('Tent lantern footing is outside the source terrain');
 const bottom=Math.min(...heights)-.02,top=.25-.065*.75;
 c.cylinder([x,(bottom+top)/2,z],.29,top-bottom,'darkstone',.25,8);
}
function room(c,w,d,{tent=false,h=3.3,rugFloor=null,wallInset=.145}={}){
 const barrelOffset=tent?.64:-.64;
 c.roomObstacles=[[w*.24,-d*.20,1.4,.9],[w*.24,-d*.20+.83,1.25,.62],[-w*.27,-d*.16,Math.min(1.18,w*.25)+.12,Math.min(2.3,d*.48)+.12],[w*.30,d*.25,.78,.78],[w*.30+barrelOffset,d*.32,.56,.56]];
 const scale=Math.min(1,w/5);if(rugFloor===null)c.rug([0,.05,0],Math.min(2,w*.4),Math.min(3.2,d*.5));else groundedRoomRug(c,[0,rugFloor+.001,0],Math.min(2,w*.4),Math.min(3.2,d*.5));c.table([w*.24,.03,-d*.20],1.25*scale,.82);c.bench([w*.24,.03,-d*.20+.83],1.1*scale,'wood',false);c.bed([-w*.27,.02,-d*.16],Math.min(1.18,w*.25),Math.min(2.3,d*.48));
 c.barrel([w*.30,(rugFloor??.055)+.001,d*.25],.37,.78);c.barrel([w*.30+barrelOffset,(rugFloor??.055)+.001,d*.32],.26,.56);
 if(!tent){
  // Interior posts, caps and curved braces follow the existing wall cores.
  for(const side of [-1,1])for(const zz of [-d/2+.24,0,d/2-.24]){
   const xx=side*(w/2-.20);c.box([xx,h*.5,zz],[.22,h-.12,.25],'wood',[0,0,0],.045);
   for(const yy of [.24,h-.30])c.box([xx,yy,zz],[.30,.20,.33],'endgrain',[0,0,0],.035);
   if(Math.abs(zz)<.1){c.line([[xx,h-1.08,zz],[xx-side*.16,h-.58,zz],[xx-side*.65,h-.25,zz]],.095,'wood');}
  }
  for(const side of [-1,1])c.box([side*(w/2-.17),.28,0],[.12,.21,d-.30],'endgrain');
  for(let j=0;j<3;j++)c.box([0,1.1+j*.57,-d/2+.28],[w*.48,.09,.4]);for(const x of [-w*.23,w*.23])c.box([x,1.64,-d/2+.28],[.1,1.6,.45]);
  for(let k=0;k<14;k++)shelvedBook(c,[-w*.2+k*w*.028,1.145+(k%3===0?.57:0),-d/2+.25],k%3?'cloth':'red',(k%4)*.035,[.11,.4+(k%3)*.045,.25]);
  for(const [side,z]of[[-1,d*.18],[1,-d*.24]])c.lamp([side*(w/2-wallInset-.305),2.05,z],.65,'glass',{wall:[side*(w/2-wallInset),2.05+.52*.65,z]});
 }else{c.lamp([0,(rugFloor??.055)+.065*.7+.001,-d*.32],.7);}
}

export function createSettlementArchitecture(){
 const mats=createArchitectureMaterials(),records=[],roots=[],seen=new Set();
 function register(region,parent,c,position,yaw=0,info={}){const root=c.finish(parent,position,yaw);roots.push(root);records.push({id:region.id+'-'+records.filter(r=>!r.market&&!r.district).length,region:region.id,name:c.name,root,components:c.parts,roomObstacles:c.roomObstacles,...info});return root;}
 function add(region,root){if(seen.has(region.id))return;seen.add(region.id);
  if(region.id==='watercourt'){
   root.traverse(o=>{if(o.isMesh&&PAVILIONS.some(([n])=>o.name.startsWith(n+'_')))hide(o);});
   root.traverse(o=>{if(!o.isMesh||!/_moulding$|_paving$/.test(o.name))return;pruneTriangles(o,ps=>{const mid=ps[0].clone().add(ps[1]).add(ps[2]).multiplyScalar(1/3);return PAVILIONS.some(([,name,x,y,r,h,z])=>Math.hypot(mid.x-x,mid.z+y)<r+.12&&mid.y>z+.3);});});
   for(const[,name,x,y,r,h,z]of PAVILIONS){const c=new Craft(mats,name);pavilion(c,r,h,.65,{gold:true});register(region,root,c,[x,z,-y],0,{type:'pavilion',interior:[0,2.18,r*.61],target:[0,2.05,-r*.42],exterior:[r*3.25,h*1.72,r*3.2],look:[0,h*.80,0],radius:r,height:h+.65});}
  }
  if(region.id==='highland'){
   root.traverse(o=>{if(o.isMesh&&/^HC roof/.test(o.material?.name||''))hide(o);});
   // Remove only the old flat facial emblem, retaining the horns, timber
   // cylinder, spiral stair, bands and every other structure in these batches.
   root.traverse(o=>{if(!o.isMesh||!/^HC (red|ivory|dark)(\.|$)/.test(o.material?.name||''))return;pruneTriangles(o,ps=>ps.every(p=>Math.abs(p.x)<3.6&&p.y>38.5&&p.y<45.8&&p.z> -21.40&&p.z< -20.45));});
   root.traverse(o=>{
    if(!o.isMesh)return;const n=o.material?.name||'';
    if(/^HC (wood|rope)(\.|$)/.test(n))pruneTriangles(o,ps=>sites.buildings.filter(b=>b.kind==='house').some(b=>ps.every(p=>Math.abs(p.x-b.x)<b.w*.39&&p.z> -b.y+b.d/2+1.30&&p.z< -b.y+b.d/2+6.6&&p.y>b.z-1.2&&p.y<b.z+b.h+.1)));
    if(/^HC (ivory|dark)(\.|$)/.test(n))pruneTriangles(o,ps=>{const center=ps[0].clone().add(ps[1]).add(ps[2]).multiplyScalar(1/3);return (Math.abs(center.x)>2.4&&center.y>43.1&&center.y<51.6&&center.z> -26.7&&center.z< -23.1)||(n.startsWith('HC ivory')&&ps.every(p=>p.y>46.30&&p.y<46.76&&Math.hypot(p.x,p.z+25)<4.1));});
   });
   removeLegacyCabinFurniture(root,sites.buildings);
   const tentRevision=removeLegacyTentParts(root,sites.buildings);
   for(const [i,b]of sites.buildings.entries()){ 
    const c=new Craft(mats,(b.kind==='house'?'山城木屋 ':'山城帐居 ')+String(i+1).padStart(2,'0')),w=b.w,d=b.d;
    if(b.kind==='house'){
     shingleRoof(c,w,d,b.h-.5,4.5);shortPorch(c,b);
     // Deep entrance frame and knee braces anchored to the existing solid cabin.
     for(const s of [-1,1]){c.tube([s*(w*.5-.2),.18,d*.5+.28],[s*(w*.5-.2),b.h+.03,d*.5+.28],.24,'wood',.20);c.tube([s*(w*.5-.2),b.h-1.0,d*.5+.28],[s*(w*.5-1.3),b.h-.15,d*.5+.28],.17,'wood');band(c,[s*(w*.5-.2),.45,d*.5+.28]);c.lamp([s*1.45,1.15,d*.5+.56],.72,'glass',{wall:[s*1.45,1.15+.52*.72,d*.5+.29]});horn(c,[s*.34,b.h+.47,d*.5+.35],s,.65);}
     c.box([0,b.h+.28,d*.5+.34],[1.4,.67,.24],'red');c.crystal([0,b.h+.21,d*.5+.52],.56,.19,'paper');
     for(let k=0;k<9;k++){const x=(k-4)*w*.10;c.cylinder([x,b.h- .30,d*.5+.35],.06,.17,'iron',.06,8);}
     const rugFloor=cabinFloorLevel(root,b);room(c,w,d,{h:b.h,rugFloor,wallInset:.275});register(region,root,c,[b.x,b.z,-b.y],0,{type:'house',rugFloor,interior:[0,1.85,d*.29],target:[.6,1.45,-d*.25],exterior:[-w*1.15,b.h*1.38,d*.5+12],look:[0,b.h*.8,0],radius:Math.max(w,d)*.5,height:b.h});
    }else{
     if(tentRevision.status==='refined')tailoredTent(c,b);
     tentPanels(c,b);
     const radius=t=>tentRadius(b,t);
     for(let k=0;k<12;k++){const a=k*Math.PI/6;if(k===3)continue;const seam=[];for(let j=0;j<=25;j++){const t=j/25,rr=radius(t)+.05;seam.push([Math.cos(a)*rr,t*b.h,Math.sin(a)*rr]);}c.line(seam,.031,'wood');for(let j=2;j<22;j++){const t=j/25,rr=radius(t)+.078,aa=a+.021;c.tube([Math.cos(aa)*rr,t*b.h-.07,Math.sin(aa)*rr],[Math.cos(a-.021)*rr,t*b.h+.07,Math.sin(a-.021)*rr],.017,'paper');}}
     for(const s of [-1,1]){c.tube([s*.91,.04,b.r-.14],[s*.60,Math.min(2.7,b.h*.39)+.2,radius(.36)],.14,'wood',.12);tentLampFooting(c,root,b,s*1.24,b.r+.05);c.lamp([s*1.24,.25,b.r+.05],.75);}
     const rugFloor=cabinFloorLevel(root,b);room(c,w*.66,d*.66,{tent:true,rugFloor});tentEntry(c,root,b,rugFloor);register(region,root,c,[b.x,b.z,-b.y],0,{type:'tent',rugFloor,entry:c.tentEntry,interior:[0,1.62,b.r*.46],target:[.3,1.16,-b.r*.25],exterior:[-b.r*1.1,b.h*.47,b.r+5],look:[0,b.h*.44,0],radius:b.r,height:b.h});
    }
   }
   // Refine the five village approaches; retain the three original cross-valley spans.
   const c=new Craft(mats,'山城桥头与图腾工艺');refineBridgeheads(c,root,sites.bridges);relocateBridgeTrees(root,sites.buildings);
   for(let k=0;k<16;k++){const a=k*Math.PI/8,x=Math.cos(a)*3.83,z=-25+Math.sin(a)*3.83;c.tube([x,35.5,z],[x,34.7,z],.025,'leather');c.add(new T.ConeGeometry(.13,.7,6),'paper',[x,34.5,z],[Math.PI,0,0]);}
   continuousHorns(c);c.ring([0,46.52,-25],3.78,.13,'paper');const paving=entrancePaving(c,root,sites);
   const infrastructure=register(region,root,c,[0,0,0],0,{type:'infrastructure',inspect:false});infrastructure.userData.paving=paving;for(const deck of c.bridgeDecks||[])infrastructure.add(deck);
   // Only the shallow, individual entrance pavers permit stepping over edges.
   // Structural stone, tent skins and house walls keep ordinary solid collision.
   infrastructure.traverse(o=>{if(o.isMesh&&[mats.pathstone,mats.pathlight].includes(o.material)){o.geometry.computeBoundingBox();o.userData.navStepRange=[o.geometry.boundingBox.min.y,o.geometry.boundingBox.max.y];}});
   const mask=new Craft(mats,'牛角山城 · 守望木雕');carvedMask(mask);const maskRoot=mask.finish(root,[0,42.20,-21.2]);maskRoot.userData.sculpture='horncrest-guardian';roots.push(maskRoot);
   // Smaller carved wayposts echo the same craft language at bridge approaches.
   for(const [x,y,z]of [[-34,-24,8],[38,-15,9],[-27,7,18],[20,31,21],[17,-94,6],[8,-65,7]]){
    const carving=new Craft(mats,'山城 · 桥头守望雕刻');carvedMask(carving);const post=carving.finish(root,[x+.25,z+6.35,-y+.52]);post.scale.setScalar(.22);post.userData.sculpture='waypost';roots.push(post);
   }
  }
  if(region.id==='aether'){
   for(const [name,label,x,y,z,r]of [['Crystal_sanctuary','晶石圣所',14,-10,8,3.7],['Sky_garden_shrine','云上藏书亭',-22,26,32,1.5],['Observatory_shrine','星辰观测所',0,62,47,1.5]]){
    let original;root.traverse(o=>{if(o.name===name+'_masonry')original=o;});if(!original)continue;
    const c=new Craft(mats,label+' · 内外装饰'),base=.9,h=r*1.18;
    original.userData.navStepRange=[z,z+.94];
    root.traverse(o=>{if(o.isMesh&&o.name===name+'_paving')hide(o);});
    shrinePaving(c,r);
    // Original outer crystal posts started at .65 over a .36-high tread.
    // Lower each complete post and its crystal onto the new .37 stone top.
    const posts=Array.from({length:10},(_,k)=>[Math.cos(k*Math.PI/5)*(r+1.3),Math.sin(k*Math.PI/5)*(r+1.3)]),postTops=[];
    for(const suffix of ['_masonry','_crystals']){
     const part=root.getObjectByName(name+suffix);if(!part)continue;
     part.updateWorldMatrix(true,false);const toParent=new T.Matrix4().copy(original.parent.matrixWorld).invert().multiply(part.matrixWorld),fromParent=toParent.clone().invert(),offset=new T.Vector3(x,z,-y);
     part.geometry=part.geometry.clone();const p=part.geometry.attributes.position,q=new T.Vector3(),groups=posts.map(()=>[]);
     for(let i=0;i<p.count;i++){
      q.fromBufferAttribute(p,i).applyMatrix4(toParent).sub(offset);
      if(q.y<.64||q.y>1.85)continue;
      const site=posts.findIndex(([px,pz])=>Math.hypot(q.x-px,q.z-pz)<.245);
      if(site>=0)groups[site].push({i,p:q.clone()});
     }
     groups.forEach((points,site)=>{
      if(!points.length)return;
      const low=Math.min(...points.map(v=>v.p.y)),high=Math.max(...points.map(v=>v.p.y));
      const shift=(suffix==='_masonry'?.37:postTops[site])-low;
      if(suffix==='_masonry')postTops[site]=high+shift;
      for(const v of points){v.p.y+=shift;v.p.add(offset).applyMatrix4(fromParent);p.setXYZ(v.i,v.p.x,v.p.y,v.p.z);}
     });
     part.geometry.computeBoundingBox();part.geometry.computeBoundingSphere();
    }
    if(r<2){
     // Replace the covered legacy column solids, so narrower fluting cannot
     // intersect the old straight shafts. Retain the original dome and arches.
     original.updateWorldMatrix(true,false);
     const toParent=new T.Matrix4().copy(original.parent.matrixWorld).invert().multiply(original.matrixWorld);
     pruneTriangles(original,points=>{
      const ps=points.map(p=>p.applyMatrix4(toParent).sub(new T.Vector3(x,z,-y)));
      if(!ps.every(p=>p.y>=base-.01&&p.y<=base+h+.15))return false;
      return Array.from({length:8},(_,k)=>k*Math.PI/4).some(a=>ps.every(p=>Math.hypot(p.x-Math.cos(a)*r,p.z-Math.sin(a)*r)<.425));
     });
    }
    for(let k=0;k<8;k++){const a=k*Math.PI/4;flutedColumn(c,Math.cos(a)*r,Math.sin(a)*r,base,h,r<2?.25:.34);}
    for(const s of [-1,1]){c.bench([s*r*.52,base,-r*.36],r*.75,'stone',r>=2);c.lamp([s*r*.62,base,r*.27],.6,'azure');}
    for(let k=0;k<16;k++){const a=k*Math.PI/8;c.box([Math.cos(a)*(r+.48),.918,Math.sin(a)*(r+.48)],[.24,.025,.08],'trim',[0,-a,0],.005);}
    const shrine=register(region,original.parent,c,[x,z,-y],0,{type:'shrine',interior:r<2?[r*.5,base+1.05,r*.15]:[r*.42,base+1.4,r*.44],target:[0,base+1,-r*.45],exterior:r<2?[4.5,2.15,0]:[r*3.3,h*1.7,r*3.4],look:r<2?[0,2,0]:[0,h*.9,0],...(r<2?{exteriorFov:65,exteriorAngles:[0]}:{}),radius:r,height:h});
    shrine.traverse(o=>{if(o.isMesh&&o.material===mats.stone)o.userData.navStepRange=[0,.94];});
   }
  }
  if(region.id==='valley'){
   root.traverse(o=>{if(!o.isInstancedMesh||o.material?.name!=='River_stone')return;const m=new T.Matrix4(),p=new T.Vector3(),keep=[];for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);p.setFromMatrixPosition(m);if(p.x>21&&p.x<31&&p.z>11.6&&p.z<23.7)continue;keep.push(m.clone());}o.count=keep.length;keep.forEach((m,i)=>o.setMatrixAt(i,m));o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();});
   // The valley export batches the lodge, watchtower and bridge by material.
   // Remove only triangles belonging to the lodge's bounded footprint.
   root.traverse(o=>{if(!o.isMesh||!['Aged_timber','Timber_edges','Foundation_stone','Slate_roof','Roof_snow','Warm_window'].includes(o.material?.name))return;const g=o.geometry,idx=g.index,p=g.attributes.position,keep=[];for(let i=0;i<(idx?.count||p.count);i+=3){const tri=[0,1,2].map(j=>idx?idx.getX(i+j):i+j);const inside=tri.every(j=>p.getX(j)>21&&p.getX(j)<31&&p.getZ(j)>12&&p.getZ(j)<23);if(!inside)keep.push(...tri);}if(keep.length!==(idx?.count||p.count)){o.geometry=g.clone();o.geometry.setIndex(keep);o.geometry.computeBoundingSphere();}});
   const c=new Craft(mats,'北境旅人木屋'),w=6.5,d=5.2,h=3.3,base=3.150815111755228;
   c.box([0,-.20,0],[w+.8,.5,d+.7],'stone');for(let i=0;i<13;i++)c.box([(i-6)*w/13,-.015,0],[w/13-.014,.14,d],'wood');
   // Rear and side walls include real openings, with bounded sills/lintels.
   for(let j=0;j<14;j++){const y=.16+j*h/14;c.tube([-w/2,y,-d/2],[w/2,y,-d/2],.15,'wood');for(const s of [-1,1]){if(y>1.15&&y<2.35){c.tube([s*w/2,y,-d/2],[s*w/2,y,-.62],.15,'wood');c.tube([s*w/2,y,.62],[s*w/2,y,d/2],.15,'wood');}else c.tube([s*w/2,y,-d/2],[s*w/2,y,d/2],.15,'wood');if(y>2.6)c.tube([0,y,d/2],[s*w/2,y,d/2],.15,'wood');else c.tube([s*.63,y,d/2],[s*w/2,y,d/2],.15,'wood');}}
   for(const s of [-1,1]){c.box([s*.66,1.33,d/2],[.18,2.75,.38],'endgrain');for(const z of [-.66,.66])c.box([s*(w/2+.02),1.76,z],[.35,1.4,.15],'endgrain');for(const y of [1.12,2.38])c.box([s*(w/2+.02),y,0],[.38,.16,1.5],'endgrain');c.box([s*(w/2+.05),1.75,0],[.05,1.09,1.12],'glass');c.box([s*(w/2+.10),1.75,0],[.07,1.10,.06],'iron');}
   c.box([0,2.71,d/2],[1.5,.23,.42],'endgrain');const door=new Craft(mats,'北境旅人木屋 · 门');door.box([.56,1.24,0],[1.12,2.48,.13],'wood');for(const yy of [.4,2.1])door.box([.55,yy,.078],[1.05,.09,.025],'iron');door.sphere([.99,1.15,.1],[.055,.055,.07],'trim');const doorRoot=door.finish(root,[26-.58,base,16+d/2+.16],-1.15);roots.push(doorRoot);
   logCabinRoofUnderlay(c,w,d,h,2.1,t=>roofProfile(t,h,2.1));
   shingleRoof(c,w,d,h,2.1,{snow:true});room(c,w,d);c.box([0,-.06,d/2+.75],[w+.5,.17,1.6],'wood');for(let k=0;k<3;k++)c.box([0,-.26-k*.13,d/2+1.55+k*.38],[1.9,.15,.42],'wood');
   roofChimney(c,-2,-1.15,.68,.72,h+2.32,w/2+.9,t=>roofProfile(t,h,2.1));c.box([-2,h+2.4,-1.15],[.85,.16,.86],'darkstone');snowCap(c,[-2,h+2.49,-1.15],.80,.81,.11);for(const side of [-1,1])snowCap(c,[side*(w/2+.03),1.205,0],.34,1.4,.05);for(const s of [-1,1])c.lamp([s*1.4,1.36,d/2+.38],.68,'glass',{wall:[s*1.4,1.36+.52*.68,d/2+.14]});
   register(region,root,c,[26,base,16],0,{type:'house',interior:[0,1.75,1.4],target:[.5,1.3,-1.5],exterior:[-8,4.4,10],look:[0,2.4,0],radius:4,height:h});
   const t=new Craft(mats,'北境瞭望台 · 加固');for(const s of [-1,1]){t.lamp([s*1.8,10.2,1.8],.62);for(const z of [-1.7,1.7]){band(t,[s*1.7,9.5,z],.16);t.box([s*1.7,9.03,z],[.38,.22,.38],'iron');}}t.barrel([.9,9.141,-.8],.35,.75);t.bench([-.4,9.18,-1.5],1.8);register(region,root,t,[29,3.0637664234255375,-44],0,{type:'watchtower',interior:[0,10.9,.9],target:[0,10.3,-2],exterior:[-8,12,10],look:[0,8.5,0],radius:3,height:12});
  }
  if(region.id==='forest'){
   const path=y=>Math.sin(y*.096)*2.4+Math.sin(y*.2)*.75;
   const c=new Craft(mats,'紫境遗迹 · 石作与供灯'),x=path(49);
   // Keep the original pointed portal opening completely clear.
   for(const s of [-1,1]){for(const y of [1.15,4.82,5.42]){c.box([x+s*2.65,y,-49],[1.04,.10,1.40],'pale');c.box([x+s*2.65,y+.10,-49],[.87,.10,1.24],'darkstone');}for(let k=0;k<6;k++)c.box([x+s*2.65,2.1+k*.41,-48.405],[.22,.18,.026],k%2?'trim':'amethyst',[0,0,Math.PI/4],.005);c.lamp([x+s*3.2,1.51,-47.5],.8,'amethyst');}
   for(const s of [-1,1]){c.cylinder([x+s*3.2,1.44,-47.5],.40,.15,'stone',.38,16);}
   register(region,root,c,[0,0,0],0,{type:'ruin',interior:[x,3.2,-45],target:[x,4,-49],exterior:[x,5,-35],look:[x,4,-48],radius:5,height:7});
  }
  root.updateMatrixWorld(true);
 }
 return {add,records,materials:mats,stats:()=>records.map(({root,door,proxy,text,onEnter,filament,papers,doors,shutters,lights,daylight,sign,fire,bell,lamps,bench,book,...r})=>({...r,position:root.getWorldPosition(new T.Vector3()).toArray()})),dispose(){for(const r of roots){r.traverse(o=>o.geometry?.dispose());r.removeFromParent();}mats.wood.map.dispose();mats.wood.normalMap.dispose();Object.values(mats).forEach(m=>m.dispose());}};
}
