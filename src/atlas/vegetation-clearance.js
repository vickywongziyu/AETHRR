import {Vector3} from 'three';

// Preserve dense foliage at landscape scale, but clear the traveler's silhouette
// and the camera's sightline locally. Solid trunks/buildings remain obstacles.
export function createVegetationClearance(){
 const uniforms={travelerCenter:{value:new Vector3()},travelerAim:{value:new Vector3()},travelerCamera:{value:new Vector3()},travelerActive:{value:0}};
 const seen=new Set();let materials=0;
 return {
  add(root){root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    if(!material||seen.has(material)||!/HC pine|leaves|flowers|heather|needles|petal|rush|reeds|canopy/i.test(mesh.name+' '+material.name))continue;
    seen.add(material);materials++;const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
    material.onBeforeCompile=function(shader,renderer){
     previous?.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
     shader.vertexShader='varying vec3 travelerFoliageWorld;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 foliagePosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
foliagePosition=instanceMatrix*foliagePosition;
#endif
travelerFoliageWorld=(modelMatrix*foliagePosition).xyz;
#include <project_vertex>`);
     shader.fragmentShader=`varying vec3 travelerFoliageWorld;uniform vec3 travelerCenter;uniform vec3 travelerAim;uniform vec3 travelerCamera;uniform float travelerActive;\n`+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
if(travelerActive>.5){
 float person=1.0-smoothstep(.6,1.05,distance(travelerFoliageWorld.xz,travelerCenter.xz));
 person*=1.0-smoothstep(1.6,2.4,abs(travelerFoliageWorld.y-travelerCenter.y-1.0));
 vec3 boom=travelerAim-travelerCamera;
 float along=clamp(dot(travelerFoliageWorld-travelerCamera,boom)/max(dot(boom,boom),.001),0.0,1.0);
 float sight=1.0-smoothstep(.26,.58,distance(travelerFoliageWorld,travelerCamera+boom*along));
 float fade=max(person,sight);
 float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
 if(grain<fade)discard;
}`);
    };
    material.customProgramCacheKey=()=>cacheKey+'-atlas-local-foliage-clearance-v8';material.needsUpdate=true;
   }
  });},
  update(active,position,camera,aim){uniforms.travelerActive.value=active?1:0;uniforms.travelerCenter.value.copy(position);uniforms.travelerCamera.value.copy(camera);uniforms.travelerAim.value.copy(aim);},
  get count(){return materials;}
 };
}
