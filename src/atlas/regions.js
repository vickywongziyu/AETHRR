import {loadModel} from './asset-loading.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {detailSurface as forestSurface} from '../forest/surfaces.js';
import {detailSurface as gardenSurface} from '../watercourt/surfaces.js';
import {addRiverside} from './riverside.js';
import {winterVegetation} from '../valley/winter-vegetation.js';

export const REGIONS=[
 {id:'aether',name:'浮空群岛',en:'AETHER',color:'#7cd3df',center:[0,15,0],spawn:[-17,8,20],look:[-17,12,-15],view:[18,22,36],radius:115},
 {id:'highland',name:'牛角山城',en:'HORNCREST',color:'#d9be88',center:[0,18,150],spawn:[0,12,137],look:[0,17,172],view:[-55,47,100],radius:100},
 {id:'forest',name:'紫境森林',en:'VIOLET SANCTUARY',color:'#cd94df',center:[430,0,94],offset:[430,0,150],scale:2.5,spawn:[430,3,165],look:[430,10,70],view:[370,48,205],radius:125,asset:'forest/violet-sanctuary.glb'},
 {id:'watercourt',portalSite:{xz:[-23,-27],view:[-31,5.2,-35],scale:.62*1.6},name:'精灵水庭',en:'ELVEN WATERCOURT',color:'#e9d2a4',center:[100,8,-511],offset:[100,8,-490],scale:1.6,spawn:[100,13,-459],look:[95,19,-511],view:[127,47,-445],radius:115,asset:'watercourt/watercourt.glb'},
 {id:'valley',portalSite:{xz:[-43,-63],view:[-32,70,-48],scale:.55*.65},name:'北境河谷',en:'NORTH VALLEY',color:'#abc5c9',center:[790,0,110],offset:[790,0,140],scale:.65,spawn:[810,8,175],look:[790,17,102],view:[820,32,191],radius:150,asset:'atlas/north-valley.glb'},
];

export async function loadRegion(region,time,onProgress){
 const decoder=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'forest/draco/');let gltf;
 try{gltf=await loadModel(new GLTFLoader().setDRACOLoader(decoder),import.meta.env.BASE_URL+region.asset,{onProgress});}finally{decoder.dispose();}
 const source=gltf.scene;source.updateMatrixWorld(true);const root=new T.Group();root.name='Atlas · '+region.name;root.position.fromArray(region.offset);root.scale.setScalar(region.scale);
 const groups=new Map();
 source.traverse(o=>{if(!o.isMesh||/Distant_atmospheric_ground|Distant_range/i.test(o.name))return;
  const key=o.geometry.uuid+o.material.uuid;let g=groups.get(key);if(!g)groups.set(key,g={geometry:o.geometry,material:o.material,items:[],name:o.name});
  if(o.isInstancedMesh){const m=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);g.items.push(o.matrixWorld.clone().multiply(m));}}else g.items.push(o.matrixWorld.clone());
 });
 // Spatial batches keep off-screen trees out of every main/transmission pass.
 // Geometry, materials and all instance transforms remain unchanged.
 const batches=[];
 for(const group of groups.values()){
  if(!['forest','watercourt'].includes(region.id)||group.items.length<5||!/bark|leaves/i.test(group.material.name)){batches.push(group);continue;}
  const tiles=new Map(),center=new T.Vector3();group.geometry.computeBoundingSphere();
  for(const matrix of group.items){center.copy(group.geometry.boundingSphere.center).applyMatrix4(matrix);const key=Math.floor(center.x*region.scale/32)+','+Math.floor(center.z*region.scale/32);if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(matrix);}
  for(const items of tiles.values())batches.push({...group,items});
 }
 for(const {geometry,material:m,items,name} of batches){
  const matName=m.name.toLowerCase();
  if(region.id==='forest'){
   if(/bark|stone|earth/.test(matName))forestSurface(m,matName.includes('bark')?'bark':'stone');
   if(/leaves|heather/.test(matName)){m.side=T.DoubleSide;m.emissive.set('#aa4188');m.emissiveIntensity=.20;}
  }
  if(region.id==='watercourt'&&/limestone|ornament|dome|bark/.test(matName))gardenSurface(m,matName.includes('bark')?'bark':'stone');
  if(/leaves|flowers|heather|needles/.test(matName)&&!m.userData.winterVegetation){
   m.side=T.DoubleSide;m.onBeforeCompile=s=>{s.uniforms.atlasTime=time;s.vertexShader='uniform float atlasTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(atlasTime*.65+position.y*.7+position.z)*.035;');};
  }
  if(/water|river/i.test(matName)){
   m.color.set(region.id==='valley'?'#496e7b':'#645778');m.roughness=.24;m.metalness=.25;m.transparent=true;m.opacity=.86;
   m.onBeforeCompile=s=>{s.uniforms.atlasTime=time;s.vertexShader='uniform float atlasTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=sin(position.x*2.+atlasTime)*.045+cos(position.z*1.6-atlasTime*1.3)*.025;');};
  }
  if(region.id==='valley'&&matName==='pine_inner_needles')winterVegetation(m);
  const mesh=items.length>1?new T.InstancedMesh(geometry,m,items.length):new T.Mesh(geometry,m);mesh.name=name;
  if(mesh.isInstancedMesh){items.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();}else{mesh.matrix.copy(items[0]);mesh.matrixAutoUpdate=false;}
  mesh.castShadow=!/heather|flowers|needles/.test(matName);mesh.receiveShadow=true;if(/water|river/i.test(matName))mesh.userData.noCollision=true;root.add(mesh);
 }
 // Keep the original purple grove recognizable across the valley, and alive at close range.
 if(region.id==='forest'){
  const points=[],seeds=[];for(let i=0;i<180;i++){const x=Math.sin(i*83.17)*18,z=-27+Math.sin(i*43.1)*36,y=1+Math.abs(Math.sin(i*91))*6;points.push(x,y,z);seeds.push(x,y,z);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));const fire=new T.Points(g,new T.PointsMaterial({color:'#e7b9ff',size:.12,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));root.add(fire);
  region.animate=t=>{const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,seeds[i*3+1]+Math.sin(t*.6+i)*.4);p.needsUpdate=true;};
  for(const y of [2,17,33,47]){const lamp=new T.PointLight('#c882ff',12,12,1.8);lamp.position.set(2,2,-y);root.add(lamp);}
 }
 if(region.id==='forest')addRiverside(root,time);
 root.updateMatrixWorld(true);return root;
}
