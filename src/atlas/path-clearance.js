import * as T from 'three';

// Some small understory trees in the Watercourt source scene were scattered without
// avoiding the paved walkways, so they stand in the middle of paths (and block walking).
// Before the region's meshes are built, move each such small tree sideways onto nearby
// dry bank, keeping its trunk and leaves together. Large trees, all geometry, materials
// and the original GLB stay unchanged; a tree with no dry spot nearby is left in place.
const PATH=/paving|walkway|moulding|bridge|stair|step/i;
export function clearPathTrees(source,groups,{terrain=/Moss_islands_and_forest_banks/i,maxShift=3.4,maxTree=8}={}){
 const tris=[],index=new Map(),cell=2,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let ground=null,waterY=-Infinity;
 source.traverse(o=>{
  if(!o.isMesh)return;const label=o.name+' '+(o.material?.name||'');
  if(terrain.test(o.name))ground=o;
  // Lake level: flat water surfaces only (waterfalls and fountains are tall).
  if(/water/i.test(label)){o.geometry.computeBoundingBox();const w=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);if(w.max.y-w.min.y<.6&&(w.max.x-w.min.x)*(w.max.z-w.min.z)>100)waterY=Math.max(waterY,w.max.y);}
  if(!PATH.test(label)||o.isInstancedMesh)return;
  const p=o.geometry.attributes.position,idx=o.geometry.index,n=idx?idx.count:p.count;
  for(let i=0;i<n;i+=3){
   a.fromBufferAttribute(p,idx?idx.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
   const t=[a.x,a.z,b.x,b.z,c.x,c.z],k=tris.length;tris.push(t);
   for(let x=Math.floor(Math.min(a.x,b.x,c.x)/cell);x<=Math.floor(Math.max(a.x,b.x,c.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/cell);z<=Math.floor(Math.max(a.z,b.z,c.z)/cell);z++){const key=x+','+z;if(!index.has(key))index.set(key,[]);index.get(key).push(k);}
  }
 });
 if(!tris.length||!ground)return{moved:0,kept:0};
 const inside=(x,z)=>{for(const k of index.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const [x0,z0,x1,z1,x2,z2]=tris[k],d=(z1-z2)*(x0-x2)+(x2-x1)*(z0-z2);if(Math.abs(d)<1e-12)continue;const u=((z1-z2)*(x-x2)+(x2-x1)*(z-z2))/d,v=((z2-z0)*(x-x2)+(x0-x2)*(z-z2))/d;if(u>=0&&v>=0&&u+v<=1)return true;}return false;};
 const touches=(x,z,r)=>{if(inside(x,z))return true;for(let i=0;i<12;i++){const t=i/12*Math.PI*2;if(inside(x+Math.cos(t)*r,z+Math.sin(t)*r))return true;}return false;};
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
 const bank=(x,z,top)=>{ray.set(new T.Vector3(x,top+30,z),down);const hit=ray.intersectObject(ground,false)[0];return hit&&hit.point.y>waterY+.05?hit.point.y:null;};
 // Trunk and leaves of one tree share the same transform.
 const keyOf=m=>m.elements.map(v=>v.toFixed(4)).join(','),byKey=new Map();
 for(const g of groups.values())g.items.forEach((m,i)=>{const k=keyOf(m);if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(m);});
 let moved=0,kept=0;const debug=[];const done=new Set(),box=new T.Box3(),shift=new T.Matrix4();
 for(const g of groups.values()){
  if(!/bark/i.test(g.material.name))continue;g.geometry.computeBoundingBox();
  for(const m of g.items){
   const k=keyOf(m);if(done.has(k))continue;box.copy(g.geometry.boundingBox).applyMatrix4(m);
   const size=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);if(size>maxTree)continue;
   const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2,r=Math.min(size*.32,1.3);
   if(!touches(cx,cz,r*.5))continue;done.add(k);
   let best=null;const why={path:0,water:0,height:0};
   for(let d=.5;d<=maxShift&&!best;d+=.25)for(let i=0;i<16&&!best;i++){const t=i/16*Math.PI*2,x=cx+Math.cos(t)*d,z=cz+Math.sin(t)*d;if(touches(x,z,r)){why.path++;continue;}const y=bank(x,z,box.max.y);if(y===null){why.water++;continue;}if(Math.abs(y-box.min.y)<1.2)best=[x-cx,y-box.min.y,z-cz];else why.height++;}
   if(!best){kept++;debug.push({at:[cx,box.min.y,cz].map(v=>+v.toFixed(2)),size:+size.toFixed(2),r:+r.toFixed(2),...why});continue;}
   shift.makeTranslation(...best);for(const same of byKey.get(k))same.premultiply(shift);moved++;
  }
 }
 return{moved,kept,waterY:+waterY.toFixed(2),paths:tris.length,debug};
}
