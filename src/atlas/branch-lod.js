import * as T from 'three';

// This only partitions rendering instances. Navigation has already copied the
// complete near triangles before add() is called. No branch or tree is removed.
export function createBranchLOD(){
 const records=[],world=new T.Matrix4(),point=new T.Vector3();let last=-Infinity;
 function add(mesh,geometries){
  mesh.geometry.computeBoundingSphere();const sphere=mesh.geometry.boundingSphere.clone(),matrices=[];
  if(mesh.isInstancedMesh)for(let i=0;i<mesh.count;i++){const m=new T.Matrix4();mesh.getMatrixAt(i,m);matrices.push(m);}else matrices.push(new T.Matrix4());
  const clones=geometries.slice(1).map((geometry,i)=>{
   const o=mesh.isInstancedMesh?new T.InstancedMesh(geometry,mesh.material,matrices.length):new T.Mesh(geometry,mesh.material);
   o.name=mesh.name+' · branch LOD '+(i+1);o.position.copy(mesh.position);o.quaternion.copy(mesh.quaternion);o.scale.copy(mesh.scale);o.matrix.copy(mesh.matrix);o.matrixAutoUpdate=mesh.matrixAutoUpdate;o.castShadow=mesh.castShadow;o.receiveShadow=mesh.receiveShadow;o.userData.noCollision=true;o.visible=false;mesh.parent.add(o);return o;
  });records.push({mesh,meshes:[mesh,...clones],sphere,matrices,levels:new Array(matrices.length).fill(-1),visible:mesh.visible,geometries});
 }
 function update(camera){
  const now=performance.now()/1000;if(now-last<.22)return;last=now;
  for(const r of records){const bins=[[],[],[]];let changed=false;r.mesh.updateWorldMatrix(true,false);
   r.matrices.forEach((m,i)=>{world.multiplyMatrices(r.mesh.matrixWorld,m);point.copy(r.sphere.center).applyMatrix4(world);const distance=Math.max(0,point.distanceTo(camera.position)-r.sphere.radius*world.getMaxScaleOnAxis()),previous=r.levels[i],near=previous===0?42:35,far=previous===1?115:100,level=distance<near?0:distance<far?1:2;if(level!==previous)changed=true;r.levels[i]=level;bins[level].push(m);});
   if(!changed)continue;
   r.meshes.forEach((mesh,i)=>{mesh.visible=r.visible&&bins[i].length>0;if(mesh.isInstancedMesh){mesh.count=bins[i].length;bins[i].forEach((m,j)=>mesh.setMatrixAt(j,m));mesh.instanceMatrix.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();}});
  }
 }
 return {add,update,stats:()=>records.map(r=>({name:r.mesh.name,levels:[0,1,2].map(k=>r.levels.filter(l=>l===k).length),instances:r.matrices.length,triangles:r.geometries.map(g=>(g.index?.count||g.attributes.position.count)/3)})),dispose(){for(const r of records){r.mesh.visible=r.visible;if(r.mesh.isInstancedMesh){r.mesh.count=r.matrices.length;r.matrices.forEach((m,i)=>r.mesh.setMatrixAt(i,m));r.mesh.instanceMatrix.needsUpdate=true;r.mesh.computeBoundingSphere();}r.meshes.slice(1).forEach(o=>o.removeFromParent());}}};
}
