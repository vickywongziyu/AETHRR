import * as T from 'three';

// Each exported shrine batches several separate crystals into one mesh. Its
// combined bounds would incorrectly classify the entire roof as a close gem.
export function crystalBounds(geometry){
 const p=geometry.attributes.position,index=geometry.index,parents=Int32Array.from({length:p.count},(_,i)=>i),find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;},weld=new Map(),point=new T.Vector3();
 for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i);const key=point.toArray().map(v=>Math.round(v*10000)).join(',');if(weld.has(key))parents[find(i)]=find(weld.get(key));else weld.set(key,i);}
 for(let i=0;i<(index?.count||p.count);i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k),a=find(ids[0]);parents[find(ids[1])]=a;parents[find(ids[2])]=a;}
 const boxes=new Map();for(let i=0;i<p.count;i++){const root=find(i);if(!boxes.has(root))boxes.set(root,new T.Box3());boxes.get(root).expandByPoint(point.fromBufferAttribute(p,i));}
 return [...boxes.values()].map(b=>b.getBoundingSphere(new T.Sphere()));
}

// Transmission remains physical and fully transparent. Only its offscreen
// background buffer changes resolution, with full detail for close inspection.
export function createCrystalRefraction(world,roots){
 const {renderer,camera}=world,original=renderer.transmissionResolutionScale,meshes=[],seen=new Set(),sphere=new T.Sphere(),matrix=new T.Matrix4(),instance=new T.Matrix4(),view=new T.Matrix4(),frustum=new T.Frustum();
 let last=-Infinity,coverage=0,changes=0,focus=null;
 function add(root){root.traverse(o=>{if(!seen.has(o)&&o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.transmission>0)){seen.add(o);meshes.push({mesh:o,bounds:crystalBounds(o.geometry)});}});}
 roots.forEach(add);
 function update(){
  const now=performance.now()/1000;if(now-last<.25)return;last=now;camera.updateMatrixWorld();view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(view);coverage=0;
  focus=null;
  for(const {mesh,bounds} of meshes){let visible=true;for(let p=mesh;p;p=p.parent)if(!p.visible){visible=false;break;}if(!visible)continue;mesh.updateWorldMatrix(true,false);
   for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){matrix.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(i,instance);matrix.multiply(instance);}
    for(const local of bounds){sphere.copy(local).applyMatrix4(matrix);if(!frustum.intersectsSphere(sphere))continue;
     const center=sphere.center.toArray();sphere.center.applyMatrix4(camera.matrixWorldInverse);const depth=-sphere.center.z,projected=sphere.radius/(Math.max(camera.near,depth-sphere.radius)*Math.tan(T.MathUtils.degToRad(camera.fov*.5)));
     if(projected>coverage){coverage=projected;focus={center,radius:sphere.radius};}
    }
   }
  }
  const current=renderer.transmissionResolutionScale,full=current===1?.30:.36,medium=current===.75?.15:.19,next=coverage>full?1:coverage>medium?.75:.5;
  if(next!==current){renderer.transmissionResolutionScale=next;changes++;}
 }
 return {add,update,stats:()=>({scale:renderer.transmissionResolutionScale,coverage,changes,meshes:meshes.length,crystals:meshes.reduce((n,m)=>n+m.bounds.length,0),focus}),dispose(){renderer.transmissionResolutionScale=original;}};
}
