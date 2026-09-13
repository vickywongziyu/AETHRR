import * as T from 'three';

// Keep real folded leaves at every distance. Stable subsets and wider distant
// leaves preserve crowns; nearby trees always use their original full geometry.
function levels(source){
 const p=source.attributes.position,index=source.index;if(!index)return [source,source,source];
 const parents=Int32Array.from({length:p.count},(_,i)=>i),find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
 for(let i=0;i<index.count;i+=3){const a=find(index.getX(i));parents[find(index.getX(i+1))]=a;parents[find(index.getX(i+2))]=a;}
 const groups=new Map();for(let i=0;i<p.count;i++){const key=find(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
 const leafNumber=new Map();let number=0;for(const key of groups.keys())leafNumber.set(key,number++);
 return [source,...[2,4].map((stride,level)=>{
  const g=source.clone(),a=g.attributes.position,keep=[];
  for(const [key,group] of groups){if(leafNumber.get(key)%stride)continue;const center=new T.Vector3();group.forEach(i=>center.add(new T.Vector3().fromBufferAttribute(p,i)));center.divideScalar(group.length);
   if(group.length<=12)for(const i of group){const q=new T.Vector3().fromBufferAttribute(p,i).sub(center).multiplyScalar(level===0?1.35:1.8).add(center);a.setXYZ(i,q.x,q.y,q.z);}
  }
  for(let i=0;i<index.count;i+=3)if(leafNumber.get(find(index.getX(i)))%stride===0)keep.push(index.getX(i),index.getX(i+1),index.getX(i+2));
  g.setIndex(keep);g.computeBoundingSphere();return g;
 })];
}
export function createCanopyLOD(){
 const cache=new Map(),records=[],world=new T.Matrix4(),point=new T.Vector3();let last=-Infinity;
 function add(mesh){
  const original=mesh.geometry;if(!cache.has(original))cache.set(original,levels(original));const geos=cache.get(original),center=original.boundingSphere?.center.clone()||new T.Vector3(),matrices=[];
  if(mesh.isInstancedMesh)for(let i=0;i<mesh.count;i++){const m=new T.Matrix4();mesh.getMatrixAt(i,m);matrices.push(m);}else matrices.push(new T.Matrix4());
  const clones=geos.slice(1).map((g,i)=>{
   const o=mesh.isInstancedMesh?new T.InstancedMesh(g,mesh.material,matrices.length):new T.Mesh(g,mesh.material);o.name=mesh.name+' · canopy LOD '+(i+1);o.position.copy(mesh.position);o.quaternion.copy(mesh.quaternion);o.scale.copy(mesh.scale);o.matrix.copy(mesh.matrix);o.matrixAutoUpdate=mesh.matrixAutoUpdate;o.castShadow=mesh.castShadow;o.receiveShadow=mesh.receiveShadow;o.userData.noCollision=true;o.visible=false;mesh.parent.add(o);return o;
  });records.push({mesh,meshes:[mesh,...clones],matrices,center,levels:new Array(matrices.length).fill(-1)});
 }
 function update(camera){const seconds=performance.now()/1000;if(seconds-last<.22)return;last=seconds;
  for(const r of records){const bins=[[],[],[]];r.mesh.updateWorldMatrix(true,false);
   r.matrices.forEach((m,i)=>{world.multiplyMatrices(r.mesh.matrixWorld,m);point.copy(r.center).applyMatrix4(world);const distance=point.distanceTo(camera.position),previous=r.levels[i],near=previous===0?72:64,far=previous===1?150:135,lod=distance<near?0:distance<far?1:2;r.levels[i]=lod;bins[lod].push(m);});
   r.meshes.forEach((mesh,i)=>{mesh.visible=bins[i].length>0;if(mesh.isInstancedMesh){mesh.count=bins[i].length;bins[i].forEach((m,j)=>mesh.setMatrixAt(j,m));mesh.instanceMatrix.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();}});
  }
 }
 return{add,update,stats:()=>records.map(r=>({name:r.mesh.name,levels:[0,1,2].map(k=>r.levels.filter(l=>l===k).length),triangles:cache.get(r.mesh.geometry).map(g=>(g.index?.count||g.attributes.position.count)/3)})),dispose(){for(const r of records){r.mesh.visible=true;if(r.mesh.isInstancedMesh){r.mesh.count=r.matrices.length;r.matrices.forEach((m,i)=>r.mesh.setMatrixAt(i,m));r.mesh.instanceMatrix.needsUpdate=true;r.mesh.computeBoundingSphere();}r.meshes.slice(1).forEach(o=>o.removeFromParent());}for(const geos of cache.values())geos.slice(1).forEach(g=>{if(g!==geos[0])g.dispose();});}};
}
