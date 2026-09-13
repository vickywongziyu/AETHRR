import {Matrix4, Vector3, Vector4, MeshDepthMaterial, RGBADepthPacking} from 'three';

// Resolve dense rendered cloth vertices after skinning. Particle-only collision
// misses narrow wrists and hands between the much coarser simulation controls.
export function createGarmentClearance(avatar){
 const inverse=new Matrix4(),p=new Vector3(),q=new Vector3(),d=new Vector3();
 const specs=[['LeftArm','LeftForeArm',.106],['RightArm','RightForeArm',.106],['LeftForeArm','LeftHand',.083],['RightForeArm','RightHand',.083],['LeftHand','LeftForeArm',.073,true],['RightHand','RightForeArm',.073,true]];
 const capsules=specs.map(([a,b,r,hand])=>({a:avatar.getObjectByName(a),b:avatar.getObjectByName(b),radius:r,hand,start:new Vector3(),end:new Vector3()}));
 const starts=capsules.map(()=>new Vector4()),ends=capsules.map(()=>new Vector3());
 const meshes=[];
 const declarations=`
 uniform float garmentLayer;
 uniform mat4 garmentToAvatar;
 uniform mat4 avatarToGarment;
 uniform vec4 garmentCapsuleStart[6];
 uniform vec3 garmentCapsuleEnd[6];
 `;
 const deformation=`
 vec3 garmentPoint=(garmentToAvatar*vec4(transformed,1.0)).xyz;
 for(int pass=0;pass<3;pass++){
  for(int cap=0;cap<6;cap++){
   vec3 start=garmentCapsuleStart[cap].xyz;
   vec3 axis=garmentCapsuleEnd[cap]-start;
   float along=clamp(dot(garmentPoint-start,axis)/max(dot(axis,axis),0.000001),0.0,1.0);
   vec3 center=start+axis*along;
   vec3 delta=garmentPoint-center;
   float distance=length(delta);
   float radius=garmentCapsuleStart[cap].w+garmentLayer;
   if(distance<radius){
    vec3 outward=distance>0.00001?delta/distance:vec3(0.0,0.0,-1.0);
    garmentPoint=center+outward*radius;
   }
  }
 }
 transformed=(avatarToGarment*vec4(garmentPoint,1.0)).xyz;
 `;
 avatar.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!/cape|fabric|hem|seam/i.test(mesh.name))return;
  const lining=/reverse|lining/i.test((Array.isArray(mesh.material)?mesh.material[0]:mesh.material).name);
  const uniforms={garmentLayer:{value:lining?0:.0025},garmentToAvatar:{value:new Matrix4()},avatarToGarment:{value:new Matrix4()},garmentCapsuleStart:{value:starts},garmentCapsuleEnd:{value:ends}};
  function patch(material){const original=material.onBeforeCompile;material.onBeforeCompile=function(shader,renderer){original?.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);shader.vertexShader=declarations+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\n'+deformation);};material.customProgramCacheKey=()=> 'mira-garment-clearance-v8';material.needsUpdate=true;}
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])patch(material);
  mesh.customDepthMaterial=new MeshDepthMaterial({depthPacking:RGBADepthPacking});patch(mesh.customDepthMaterial);
  meshes.push({mesh,uniforms});
 });
 const pointToCapsule=(point,c)=>{d.subVectors(c.end,c.start);q.copy(c.start).addScaledVector(d,Math.max(0,Math.min(1,p.subVectors(point,c.start).dot(d)/Math.max(d.lengthSq(),1e-8))));return q;};
 return {capsules,
  update(){
   avatar.updateMatrixWorld(true);inverse.copy(avatar.matrixWorld).invert();
   capsules.forEach((c,i)=>{if(!c.a||!c.b){starts[i].w=0;return;}c.start.setFromMatrixPosition(c.a.matrixWorld).applyMatrix4(inverse);c.end.setFromMatrixPosition(c.b.matrixWorld).applyMatrix4(inverse);if(c.hand){d.subVectors(c.start,c.end).normalize();c.end.copy(c.start).addScaledVector(d,.09);}starts[i].set(c.start.x,c.start.y,c.start.z,c.radius);ends[i].copy(c.end);});
   for(const {mesh,uniforms} of meshes){uniforms.garmentToAvatar.value.multiplyMatrices(inverse,mesh.matrixWorld);uniforms.avatarToGarment.value.copy(uniforms.garmentToAvatar.value).invert();}
  },
  // CPU equivalent used by the rendered-model regression test.
  project(point){for(let pass=0;pass<3;pass++)for(const c of capsules){const center=pointToCapsule(point,c);p.subVectors(point,center);const distance=p.length();if(distance<c.radius)point.copy(center).addScaledVector(distance>1e-6?p.setLength(1):p.set(0,0,-1),c.radius);}return point;},
  penetration(point){let depth=0;for(const c of capsules)depth=Math.max(depth,c.radius-point.distanceTo(pointToCapsule(point,c)));return Math.max(0,depth);},
  dispose(){for(const {mesh} of meshes)mesh.customDepthMaterial.dispose();}
 };
}
