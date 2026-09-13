import * as T from 'three';

export function cabinFloorLevel(root,building){
 root.updateWorldMatrix(true,true);
 const meshes=[];root.traverse(o=>{if(o.isMesh&&/^HC wood(\.|$)/.test(o.material?.name||''))meshes.push(o);});
 const start=root.localToWorld(new T.Vector3(building.x,building.z+.3,-building.y));
 const ray=new T.Raycaster(start,new T.Vector3(0,-1,0),0,.6),hit=ray.intersectObjects(meshes,false)[0];
 if(!hit)throw new Error('Cabin floor not found at '+building.x+','+building.y);
 return root.worldToLocal(hit.point.clone()).y-building.z;
}

// Exact source boxes from build_highland.py, in the highland root's Y-up frame.
// They were superseded by room() beds and desks but survived inside the wood batch.
export function legacyCabinFurniture(buildings){
 return buildings.filter(b=>b.kind==='house').flatMap((b,i)=>{
  const box=(part,x,y,z,size)=>({id:`cabin-${i+1}-${part}`,center:[b.x+x,b.z+y,-b.y+z],size});
  return [box('bench',-b.w*.28,.65,-b.d*.22,[.85,.16,b.d*.40]),
   box('leg-front',-b.w*.28,.30,-b.d*.04,[.14,.60,.14]),
   box('leg-back',-b.w*.28,.30,-b.d*.38,[.14,.60,.14]),
   box('chest',b.w*.25,.50,-b.d*.25,[1.1,.95,1.1])];
 });
}

function onBoxFace(points,box,tolerance){
 const {center:c,size:s}=box;
 for(const p of points)for(let axis=0;axis<3;axis++)if(Math.abs(p.getComponent(axis)-c[axis])>s[axis]/2+tolerance)return false;
 // Mere spatial containment would also remove the overlapping bench-leg caps.
 // Require the whole triangle to lie on one of the authored box's six planes.
 for(let axis=0;axis<3;axis++)for(const side of [-1,1])if(points.every(p=>Math.abs(p.getComponent(axis)-c[axis]-side*s[axis]/2)<tolerance))return true;
 return false;
}

export function removeLegacyCabinFurniture(root,buildings){
 const boxes=legacyCabinFurniture(buildings),report={status:'unmatched',removedTriangles:0,items:boxes.map(b=>({...b,triangles:0})),meshes:[]};
 const edits=[],points=[new T.Vector3(),new T.Vector3(),new T.Vector3()];root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert();
 root.traverse(mesh=>{
  if(!mesh.isMesh||!/^HC wood(\.|$)/.test(mesh.material?.name||''))return;
  const g=mesh.geometry,p=g.attributes.position,index=g.index,matrix=inverse.clone().multiply(mesh.matrixWorld),remove=new Set();
  for(let offset=0;offset<(index?.count||p.count);offset+=3){
   for(let k=0;k<3;k++)points[k].fromBufferAttribute(p,index?index.getX(offset+k):offset+k).applyMatrix4(matrix);
   const matches=boxes.map((box,i)=>onBoxFace(points,box,.012)?i:-1).filter(i=>i>=0);
   if(matches.length!==1)continue;
   report.items[matches[0]].triangles++;remove.add(offset);
  }
  if(remove.size)edits.push({mesh,remove});
 });
 // All-or-nothing: never carve a broad furniture volume out of structural wood.
 if(report.items.some(item=>item.triangles!==12)){root.userData.cabinFurnitureRefinement=report;return report;}
 for(const {mesh,remove} of edits){
  const g=mesh.geometry,index=g.index,keep=[];
  for(let i=0;i<(index?.count||g.attributes.position.count);i+=3)if(!remove.has(i))for(let k=0;k<3;k++)keep.push(index?index.getX(i+k):i+k);
  mesh.geometry=g.clone();mesh.geometry.setIndex(keep);mesh.geometry.computeBoundingSphere();
  mesh.userData.cabinFurnitureRemoval=remove.size;
  report.meshes.push({name:mesh.name,removed:remove.size,before:(index?.count||g.attributes.position.count)/3,after:keep.length/3});
  report.removedTriangles+=remove.size;
 }
 report.status='refined';root.userData.cabinFurnitureRefinement=report;return report;
}
