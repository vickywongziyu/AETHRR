import * as T from 'three';

// Separate hinges make the silhouette change even when the camera stands still.
export function createFlock(scene){
 const flock=new T.Group();flock.name='Aether animated flock';scene.add(flock);
 const material=new T.MeshStandardMaterial({color:'#303b3b',roughness:.95,side:T.DoubleSide});
 const wing=new T.BufferGeometry();
 wing.setAttribute('position',new T.Float32BufferAttribute([
  0,0,-.08, .45,.04,.03, .94,-.03,.30,
  0,0,-.08, .94,-.03,.30, .27,0,.21,
 ],3));wing.computeVertexNormals();
 const bodyGeo=new T.SphereGeometry(.095,7,5),birds=[];
 for(let i=0;i<9;i++){
  const bird=new T.Group();bird.name=`Flying bird ${i+1}`;
  const body=new T.Mesh(bodyGeo,material);body.scale.set(.7,.8,2.5);bird.add(body);
  const wings=[];
  for(const sign of [-1,1]){const hinge=new T.Group();hinge.position.x=sign*.035;const mesh=new T.Mesh(wing,material);mesh.scale.x=sign;hinge.add(mesh);bird.add(hinge);wings.push(hinge);}
  flock.add(bird);birds.push({bird,wings,phase:i*.83});
 }
 function update(t){
  birds.forEach(({bird,wings,phase},i)=>{
   const angle=t*.14+phase*.16;
   bird.position.set(-8+(i-4)*2.8+Math.sin(angle)*24,27+(i%3)*1.3+Math.sin(t*.8+phase)*.42,-26-(i%4)*3.2+Math.cos(angle)*8);
   bird.rotation.y=Math.atan2(-Math.cos(angle)*24,Math.sin(angle)*8);
   bird.rotation.z=Math.sin(angle)*.12;
   const glide=.5+.5*Math.sin(t*.6+phase);
   const flap=Math.sin(t*(5.8+(i%3)*.35)+phase)*(.22+.48*glide)+.13;
   wings[0].rotation.z=-flap;wings[1].rotation.z=flap;
  });
 }
 update(0);return {update,birds};
}
