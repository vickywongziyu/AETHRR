import * as T from 'three';
export function createMeadowLife(scene,flora){
 const records=[],dummy=new T.Object3D(),point=new T.Vector3(),shape=new T.Shape();
 shape.moveTo(0,0);shape.bezierCurveTo(.12,-.03,.3,-.12,.32,-.02);shape.bezierCurveTo(.34,.08,.20,.10,.17,.11);shape.bezierCurveTo(.44,.12,.46,.37,.31,.35);shape.bezierCurveTo(.15,.34,.04,.13,0,0);
 const geometry=new T.ShapeGeometry(shape,5);geometry.rotateX(-Math.PI/2);const material=new T.MeshStandardMaterial({color:'#e9cf92',roughness:.9,side:T.DoubleSide,emissive:'#785c31',emissiveIntensity:.14});
 function add(region){
  if(region.id==='valley')return;
  const flowers=[...flora.nodes.values()].filter(n=>n.region===region.id&&(n.kind==='flower'||n.kind==='blossom'));
  if(!flowers.length)return;const count=Math.min(14,flowers.length),wings=new T.InstancedMesh(geometry,material,count*2);wings.name='Meadow butterflies · '+region.id;wings.frustumCulled=false;wings.userData.noCollision=true;scene.add(wings);
  const anchors=[];for(let i=0;i<count;i++){anchors.push(flowers[(i*19)%flowers.length]);const color=new T.Color(region.id==='forest'?'#c9b9ef':i%2?'#e9c783':'#f0e3bc');wings.setColorAt(i*2,color);wings.setColorAt(i*2+1,color);}records.push({region,wings,anchors});
 }
 function update(time,camera){
  for(const r of records){r.wings.visible=Math.hypot(camera.position.x-r.region.center[0],camera.position.z-r.region.center[2])<r.region.radius+35;if(!r.wings.visible)continue;
   r.anchors.forEach((node,i)=>{flora.worldPosition(node,point);const t=time*.28+i*2.399,x=Math.cos(t)*2.4,z=Math.sin(t*.79)*2.1,y=1.2+Math.sin(time*.8+i)*.3,flap=Math.sin(time*16+i)*1.05;
    for(const side of [-1,1]){dummy.position.set(point.x+x,point.y+y,point.z+z);dummy.rotation.set(.1,t+.6,side*flap,'YXZ');dummy.scale.set(side*.74,.74,.74);dummy.updateMatrix();r.wings.setMatrixAt(i*2+(side===1?1:0),dummy.matrix);}
   });r.wings.instanceMatrix.needsUpdate=true;
  }
 }
 return {add,update,count:()=>records.reduce((n,r)=>n+r.anchors.length,0),dispose(){records.forEach(r=>r.wings.removeFromParent());geometry.dispose();material.dispose();}};
}
