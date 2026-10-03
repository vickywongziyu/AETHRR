import * as T from 'three';

// Short-lived terrain snapshot. Call synchronously during a static builder,
// then dispose in finally. Silent typed-array writes require a new snapshot;
// standard attribute/version, geometry and matrix changes fall back to Three.
// This is only a broad-phase filter: all hits are computed by Mesh.raycast.
export function createGroundQuery(objects, {cellSize=2,maxTriangleCells=256,epsilon=1e-8}={}) {
 if(!(cellSize>0&&Number.isFinite(cellSize))||!Number.isSafeInteger(maxTriangleCells)||maxTriangleCells<1||!(epsilon>=0&&Number.isFinite(epsilon)))throw new TypeError('Invalid ground-query options');
 const sources=Array.from(objects),plans=new Map(),stats={builtMeshes:0,unsupportedMeshes:0,triangles:0,cells:0,globalTriangles:0,queries:0,acceleratedCalls:0,fallbackCalls:0,candidateTriangles:0,temporaryCreated:0,temporaryDisposed:0,disposed:false};
 const vertex=new T.Vector3();
 const attributes=g=>Object.entries(g.attributes).map(([name,a])=>[name,a,a.array,a.version,a.itemSize,a.count,a.normalized]);
 const sameAttributes=(g,s)=>{const current=attributes(g);return current.length===s.length&&current.every((row,i)=>row.every((value,j)=>value===s[i][j]));};
 const sphereSnapshot=b=>b?[b.center.x,b.center.y,b.center.z,b.radius]:null;
 const boxSnapshot=b=>b?[b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z]:null;
 const sameSphere=(b,s)=>s?!!b&&b.center.x===s[0]&&b.center.y===s[1]&&b.center.z===s[2]&&b.radius===s[3]:b===null;
 const sameBox=(b,s)=>s?!!b&&b.min.x===s[0]&&b.min.y===s[1]&&b.min.z===s[2]&&b.max.x===s[3]&&b.max.y===s[4]&&b.max.z===s[5]:b===null;
 const sameGroups=(g,s)=>g.length===s.length&&g.every((r,i)=>r.start===s[i].start&&r.count===s[i].count&&r.materialIndex===s[i].materialIndex);
 const plain=o=>o?.constructor===T.Mesh&&o.raycast===T.Mesh.prototype.raycast&&o.getVertexPosition===T.Mesh.prototype.getVertexPosition&&o.geometry?.isBufferGeometry&&o.material&&!Array.isArray(o.material)&&!Object.keys(o.geometry.morphAttributes).length&&!o.morphTargetInfluences&&Object.values(o.geometry.attributes).every(a=>a.isBufferAttribute&&!a.isInterleavedBufferAttribute)&&o.geometry.attributes.position?.itemSize===3;
 const full=g=>g.drawRange.start===0&&(g.drawRange.count===Infinity||g.drawRange.count>=(g.index?.count??g.attributes.position.count));
 function build(o){
  if(!plain(o)||!full(o.geometry)||!o.matrixWorld.elements.every(Number.isFinite)||o.matrixWorld.determinant()===0)return null;
  const g=o.geometry,p=g.attributes.position,index=g.index,count=index?.count??p.count;
  if(count%3||!Number.isSafeInteger(count)||p.count<3||index&&(index.itemSize!==1||index.normalized||!index.isBufferAttribute))return null;
  const cells=new Map(),global=[],corners=[],world=new Float64Array(p.count*3);
  for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(!vertex.toArray().every(Number.isFinite))return null;vertex.toArray(world,i*3);}
  for(let i=0;i<count;i+=3){
   const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);if(ids.some(n=>!Number.isInteger(n)||n<0||n>=p.count))return null;corners.push(ids);
   const x=ids.map(n=>world[n*3]),z=ids.map(n=>world[n*3+2]),pad=epsilon+Math.max(...x.map(Math.abs),...z.map(Math.abs),1)*Number.EPSILON*64;
   const x0=Math.floor((Math.min(...x)-pad)/cellSize),x1=Math.floor((Math.max(...x)+pad)/cellSize),z0=Math.floor((Math.min(...z)-pad)/cellSize),z1=Math.floor((Math.max(...z)+pad)/cellSize),face=i/3;
   if(![x0,x1,z0,z1].every(Number.isSafeInteger)||(x1-x0+1)*(z1-z0+1)>maxTriangleCells){global.push(face);continue;}
   for(let xx=x0;xx<=x1;xx++)for(let zz=z0;zz<=z1;zz++){const key=xx+','+zz;let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(face);}
  }
  // Three's original Mesh.raycast also initializes this lazy bound. Do it
  // once before snapshotting guards; never compute a bounding box.
  if(g.boundingSphere===null)g.computeBoundingSphere();
  return {geometry:g,material:o.material,matrix:o.matrixWorld.clone(),attributes:attributes(g),index,indexArray:index?.array,indexVersion:index?.version,indexCount:index?.count,indexItemSize:index?.itemSize,indexNormalized:index?.normalized,groups:g.groups.map(r=>({...r})),drawStart:g.drawRange.start,drawCount:g.drawRange.count,sphere:sphereSnapshot(g.boundingSphere),box:boxSnapshot(g.boundingBox),cells,global,corners,candidates:new Map()};
 }
 for(const o of sources){const plan=build(o);plans.set(o,plan);if(plan){stats.builtMeshes++;stats.triangles+=plan.corners.length;stats.cells+=plan.cells.size;stats.globalTriangles+=plan.global.length;}else stats.unsupportedMeshes++;}
 function current(o,p){const g=o.geometry;return plain(o)&&g===p.geometry&&o.material===p.material&&o.matrixWorld.equals(p.matrix)&&sameAttributes(g,p.attributes)&&g.index===p.index&&g.index?.array===p.indexArray&&g.index?.version===p.indexVersion&&g.index?.count===p.indexCount&&g.index?.itemSize===p.indexItemSize&&g.index?.normalized===p.indexNormalized&&sameGroups(g.groups,p.groups)&&g.drawRange.start===p.drawStart&&g.drawRange.count===p.drawCount&&sameSphere(g.boundingSphere,p.sphere)&&sameBox(g.boundingBox,p.box);}
 function intersect(raycaster){
  stats.queries++;const d=raycaster.ray.direction,origin=raycaster.ray.origin,hits=[],vertical=d.x===0&&d.y===-1&&d.z===0&&origin.toArray().every(Number.isFinite);
  for(const o of sources){if(!o.layers.test(raycaster.layers))continue;const plan=plans.get(o);
   if(stats.disposed||!vertical||!plan||!current(o,plan)){stats.fallbackCalls++;o.raycast(raycaster,hits);continue;}
   stats.acceleratedCalls++;const key=Math.floor(origin.x/cellSize)+','+Math.floor(origin.z/cellSize);let candidate=plan.candidates.get(key);
   if(!candidate){
    const faces=[...new Set([...plan.global,...plan.cells.get(key)||[]])].sort((a,b)=>a-b);candidate={faces,filtered:null};
    if(faces.length){const temporary=new T.BufferGeometry();stats.temporaryCreated++;try{
     // Attributes/material are borrowed; only this cell index/geometry is owned.
     for(const [name,a]of Object.entries(plan.geometry.attributes))temporary.setAttribute(name,a);
     temporary.setIndex(faces.flatMap(face=>plan.corners[face]));temporary.boundingBox=plan.geometry.boundingBox?.clone()??null;temporary.boundingSphere=plan.geometry.boundingSphere.clone();
     candidate.filtered=new T.Mesh(temporary,o.material);candidate.filtered.matrixWorld.copy(o.matrixWorld);
    }catch(error){temporary.dispose();stats.temporaryDisposed++;throw error;}}
    plan.candidates.set(key,candidate);
   }
   stats.candidateTriangles+=candidate.faces.length;if(!candidate.filtered)continue;
   const localHits=[];T.Mesh.prototype.raycast.call(candidate.filtered,raycaster,localHits);
   for(const hit of localHits){hit.object=o;hit.faceIndex=candidate.faces[hit.faceIndex];hits.push(hit);}
  }
  return hits.sort((a,b)=>a.distance-b.distance);
 }
 return {intersect,stats:()=>({...stats}),dispose(){if(stats.disposed)return;stats.disposed=true;for(const plan of plans.values())if(plan)for(const candidate of plan.candidates.values())if(candidate.filtered){candidate.filtered.geometry.dispose();stats.temporaryDisposed++;}plans.clear();}};
}
