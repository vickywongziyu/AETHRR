import * as T from 'three';
import {grassGeometry,flowerGeometry,fernGeometry,winterPlantGeometry,botanicalMaterial} from './botanical-geometry.js';
import {winterVegetation} from '../valley/winter-vegetation.js';
import buildingSites from './building-sites.json';
export const BIOMES={
 aether:{grass:'#718b50',flower:'#dfbf7f',fern:'#486e52',names:['风绒草','晴穗花'],lore:['迎着高空长风生长的柔韧草叶。','金色花瓣在群岛的晨光里展开。'],pollen:'#e6d1a3',density:7600,water:-30},
 highland:{grass:'#94ab77',flower:'#c7d3ed',fern:'#466956',names:['松岭草','银铃花'],lore:['带着松针气息的山地草叶。','村落石墙旁常见的银蓝色小花。'],pollen:'#e7ce9d',density:7800,water:-6},
 forest:{grass:'#a292b5',flower:'#d29ee7',fern:'#546b72',names:['月影草','星露花'],lore:['在紫境树荫中泛着银光。','花心凝着微光，像一滴尚未落下的露水。'],pollen:'#c4adf6',density:16000,water:.15},
 watercourt:{grass:'#95b965',flower:'#ead3a4',fern:'#397a65',names:['碧汀草','晨露百合'],lore:['生长在水边、叶缘细长的青草。','花瓣洁白，藏着温暖的金色花心。'],pollen:'#f3dba8',density:9400,water:8.28},
 valley:{grass:'#a7a79a',flower:'#b4b5a6',fern:'#77766a',names:['霜脊草','雪绒花'],lore:['覆着薄霜的枯草，根部仍藏在雪下。','花期已过，积雪间留下干燥的花穗。'],pollen:'#dceaf0',density:6800,water:1.5},
};
export const HERBS=Object.entries(BIOMES).flatMap(([region,b])=>b.names.map((name,index)=>({id:region+(index?'-flower':'-grass'),region,name,kind:index?'花卉':'草叶',color:index?b.flower:b.grass,description:b.lore[index]})));
function random(seed){let v=seed>>>0;return()=>{v+=0x6D2B79F5;let t=v;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function hash(s){let v=2166136261;for(const c of s)v=Math.imul(v^c.charCodeAt(0),16777619);return v>>>0;}
const groundPattern=/^Forest_floor|^Violet riverside ground|^Moss_islands_and_forest_banks|^Alpine_valley_terrain|^Horncrest_ground|_terrace$/i;
const legacyPattern=/^Heather_|^Dry_alpine_grass|_grass$|^Violet.*flower|^Flower_/i;

function groundSampler(root){
 const triangles=[];const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),cross=new T.Vector3(),matrix=new T.Matrix4(),instance=new T.Matrix4();
 root.updateWorldMatrix(true,true);
 root.traverse(mesh=>{
  if(!mesh.isMesh||!groundPattern.test(mesh.name))return;
  let anchor=mesh;while(anchor&&!anchor.userData.floating)anchor=anchor.parent;
  const anchorY=anchor?.getWorldPosition(new T.Vector3()).y||0;
  const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let n=0;n<(mesh.isInstancedMesh?mesh.count:1);n++){
   matrix.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(n,instance);matrix.multiply(instance);}
   for(let i=0;i<(index?index.count:p.count);i+=3){
    a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(matrix);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(matrix);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(matrix);
    cross.subVectors(b,a).cross(new T.Vector3().subVectors(c,a));const length=cross.length();if(length<1e-5||cross.y/length<.72)continue;
    triangles.push({a:a.clone(),b:b.clone(),c:c.clone(),anchor,anchorY});
   }
  }
 });
 function makeSampler(choices){let sum=0;const cdf=choices.map(t=>{sum+=t.b.clone().sub(t.a).cross(t.c.clone().sub(t.a)).length()*.5;return sum;});return {count:choices.length,total:sum,sample(rng){let target=rng()*sum,lo=0,hi=cdf.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cdf[m]<target)lo=m+1;else hi=m;}const t=choices[lo];if(!t)return null;const u=Math.sqrt(rng()),v=rng();return {position:t.a.clone().multiplyScalar(1-u).addScaledVector(t.b,u*(1-v)).addScaledVector(t.c,u*v),anchor:t.anchor,anchorY:t.anchorY};}};}
 return {...makeSampler(triangles),near(centers,radius=19){return makeSampler(triangles.filter(t=>{const p=t.a.clone().add(t.b).add(t.c).multiplyScalar(1/3);return centers.some(c=>Math.hypot(p.x-c[0],p.z-c[2])<radius);}));}};
}
export function createBiomeVegetation({scene,camera,time,nav,onNode,available}){
 const biomes=[],meshes=[],geometries=new Set(),nodes=new Map(),dummy=new T.Object3D(),zero=new T.Matrix4().makeScale(0,0,0),mobile=matchMedia('(max-width:700px)').matches;
 function add(region,root){
  const theme=BIOMES[region.id],sampler=groundSampler(root);if(!sampler.count)return;
  const record={region,groups:new Map(),count:0,flowers:0,ferns:0,hiddenLegacy:0,area:sampler.total};biomes.push(record);
  const centers=[region.spawn,region.center];if(region.portalSite)centers.push([region.offset[0]+region.portalSite.xz[0]*region.scale,0,region.offset[2]+region.portalSite.xz[1]*region.scale]);if(region.id==='forest')centers.push([430,0,28]);if(region.id==='aether')centers.push([-24,32,-24]);const nearSampler=sampler.near(centers);
  const exclusions=[];if(region.portalSite)exclusions.push({x:centers[2][0],z:centers[2][2],radius:region.id==='watercourt'?4.35:1.4});if(region.id==='aether')exclusions.push({x:-25.6,z:-22.8,radius:2.2});if(region.id==='forest'){root.traverse(o=>{if(o.isMesh&&/Portal.luminous.rim/i.test(o.name)){const p=new T.Box3().setFromObject(o).getCenter(new T.Vector3());exclusions.push({x:p.x,z:p.z,radius:3.7});}});}
  const material=botanicalMaterial(time,region.id==='forest'?.09:0),flowerMaterial=botanicalMaterial(time,region.id==='forest'?.14:.015);
  if(region.id==='valley'){winterVegetation(material,{ground:true});winterVegetation(flowerMaterial,{ground:true});flowerMaterial.emissiveIntensity=0;}
  for(const kind of ['grass','flower','fern','meadow','blossom']){
   const isFlower=kind==='flower'||kind==='blossom',isGrass=kind==='grass'||kind==='meadow',nearby=kind==='meadow'||kind==='blossom';
   const makeGeometry=detail=>isGrass?grassGeometry(theme.grass,detail):region.id==='valley'?winterPlantGeometry(isFlower?'flower':'fern',detail):isFlower?flowerGeometry(theme.flower,theme.fern,region.id,detail):fernGeometry(theme.fern,detail);
   const rng=random(hash(region.id+'-'+kind)),geometry=makeGeometry(1),distant=makeGeometry(.5);geometries.add(geometry);geometries.add(distant);
   const wanted=kind==='meadow'?3600:kind==='blossom'?380:kind==='grass'?theme.density:kind==='flower'?Math.round(theme.density*.042):Math.round(theme.density*.013),byAnchor=new Map();
   for(let index=0;index<wanted;index++){
    const point=(nearby?nearSampler:sampler).sample(rng);if(!point)continue;const p=point.position;
    // Sparse patches preserve open ground, snow fields and established paths.
    const patch=.5+.3*Math.sin(p.x*.21+Math.sin(p.z*.13)*2)+.2*Math.cos(p.z*.27);
    const skip=rng(),scale=.7+rng()*.72,angle=rng()*Math.PI*2,tint=.8+rng()*.38;
    if(p.y<theme.water||patch<(isGrass?.12:.30)||exclusions.some(e=>Math.hypot(p.x-e.x,p.z-e.z)<e.radius))continue;
    if(region.id==='valley'&&p.y>30&&skip>.14)continue;
    if(root.userData.marketVegetationExclusions?.some(b=>p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ&&p.y>b.minY&&p.y<b.maxY))continue;
    if(mobile&&index%2)continue;
    // Floor/steps above the sampled terrain reserve the architecture footprint.
    const above=nav.height(p.x,p.z,p.y+2.1,p.y+.035);if(above!==null)continue;if(!isGrass&&!nav.clearBody(p))continue;
    const cell=(point.anchor?.uuid||'ground')+'/'+Math.floor(p.x/40)+'/'+Math.floor(p.z/40);
    let group=byAnchor.get(cell);if(!group)byAnchor.set(cell,group={...point,plants:[]});
    group.plants.push({id:`flora-v1/${region.id}/${kind}/${index}`,type:region.id+(isFlower?'-flower':'-grass'),position:p,scale:scale*(isGrass?(nearby?.84:1):1.08),angle,tint,kind,region:region.id});
   }
   for(const entry of byAnchor.values()){const anchor=entry.anchor;
    let group=record.groups.get(anchor);if(!group){group=new T.Group();group.name='Living biome · '+region.id+' · '+(anchor?.name||'ground');group.userData={noCollision:true,anchor,anchorY:entry.anchorY};scene.add(group);record.groups.set(anchor,group);}
    const mesh=new T.InstancedMesh(geometry,isFlower?flowerMaterial:material,entry.plants.length);mesh.name=`Gatherable ${region.id} ${kind}`;mesh.userData.noCollision=true;mesh.userData.botanicalNodes=entry.plants;mesh.userData.botanicalLevels=[geometry,distant];mesh.castShadow=!isGrass;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);meshes.push(mesh);
    entry.plants.forEach((plant,index)=>{plant.mesh=mesh;plant.index=index;dummy.position.copy(plant.position);dummy.rotation.set(0,plant.angle,0);dummy.scale.setScalar(plant.scale);dummy.updateMatrix();plant.matrix=dummy.matrix.clone();plant.color=new T.Color().setScalar(plant.tint);plant.active=available(plant.id);mesh.setMatrixAt(index,plant.active?plant.matrix:zero);mesh.setColorAt(index,plant.color);nodes.set(plant.id,plant);onNode?.(plant);record.count++;if(isFlower)record.flowers++;if(kind==='fern')record.ferns++;});
    for(const plant of entry.plants)if(!plant.active)mesh.setMatrixAt(plant.index,plant.matrix);mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.2;for(const plant of entry.plants)if(!plant.active)mesh.setMatrixAt(plant.index,zero);
   }
  }
  // Raised tent floors can sit below the old terrain-only clearance probe.
  // Reserve indoor plants without deleting IDs or changing saved harvest state.
  if(region.id==='highland'){
   const inverse=root.matrixWorld.clone().invert(),local=new T.Vector3(),tents=buildingSites.buildings.filter(b=>b.kind==='tent');
   for(const plant of nodes.values())if(plant.region==='highland'){
    local.copy(plant.position).applyMatrix4(inverse);
    if(tents.some(b=>Math.abs(local.y-b.z)<.8&&Math.hypot(local.x-b.x,local.z+b.y)<b.r+.35)){plant.reservations=(plant.reservations||0)+1;plant.reservedByTent=true;setAvailable(plant,false);}
    const bridge=(root.userData.bridgeRefinement?.records||[]).some(r=>r.points.slice(1).some((b,i)=>{const a=r.points[i],dx=b[0]-a[0],dz=b[2]-a[2],t=T.MathUtils.clamp(((local.x-a[0])*dx+(local.z-a[2])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(local.x-a[0]-dx*t,local.z-a[2]-dz*t)<r.width/2+.65&&Math.abs(local.y-a[1]-(b[1]-a[1])*t)<1.3;}));if(bridge){plant.reservations=(plant.reservations||0)+1;plant.reservedByBridge=true;setAvailable(plant,false);}
   }
  }
  root.traverse(o=>{if(o.isMesh&&legacyPattern.test(o.name)){o.visible=false;o.userData.replacedByLivingFlora=true;record.hiddenLegacy++;}});
  return record;
 }
 function setAvailable(plant,value){value=value&&!plant.reservations;plant.active=value;plant.mesh.setMatrixAt(plant.index,value?plant.matrix:zero);plant.mesh.instanceMatrix.needsUpdate=true;}
 function worldPosition(plant,target=new T.Vector3()){return target.copy(plant.position).add(plant.mesh.parent.position);}
 function reserveWhere(test){const affected=[];for(const plant of nodes.values()){const p=worldPosition(plant);if(test(p)){plant.reservations=(plant.reservations||0)+1;affected.push(plant);setAvailable(plant,false);}}return()=>{for(const plant of affected){plant.reservations=Math.max(0,(plant.reservations||0)-1);setAvailable(plant,available(plant.id));}};}
 const reserveArea=(center,radius)=>reserveWhere(p=>Math.hypot(p.x-center.x,p.z-center.z)<radius&&Math.abs(p.y-center.y)<2.5);
 const lodPoint=new T.Vector3();
 function update(){for(const mesh of meshes){lodPoint.copy(mesh.boundingSphere.center).add(mesh.parent.position);const distance=camera.position.distanceTo(lodPoint)-mesh.boundingSphere.radius,levels=mesh.userData.botanicalLevels;mesh.geometry=distance<(mesh.geometry===levels[0]?34:28)?levels[0]:levels[1];}
  for(const record of biomes){const near=Math.hypot(camera.position.x-record.region.center[0],camera.position.z-record.region.center[2])<record.region.radius+90;for(const [anchor,group] of record.groups){group.visible=near;if(anchor)group.position.y=anchor.getWorldPosition(dummy.position).y-group.userData.anchorY;}}}
 return {add,update,meshes,nodes,setAvailable,reserveArea,reserveWhere,worldPosition,stats:()=>biomes.map(b=>({region:b.region.id,plants:b.count,flowers:b.flowers,ferns:b.ferns,replaced:b.hiddenLegacy,area:Math.round(b.area)})),dispose(){for(const b of biomes)for(const g of b.groups.values())g.removeFromParent();const gs=geometries,ms=new Set(meshes.map(m=>m.material));gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
