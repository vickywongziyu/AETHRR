import * as T from 'three';

// Keep the original particle positions and animation, with a soft round
// silhouette instead of the default square point raster.
export function portalMoteMaterial(options){
 const material=new T.PointsMaterial(options);
 material.name='Portal · soft light motes';material.userData.softPortalMotes=true;
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_particle_fragment>',`#include <map_particle_fragment>
   float moteRadius=length(gl_PointCoord-.5)*2.;
   diffuseColor.a*=1.-smoothstep(.12,1.,moteRadius);
   if(diffuseColor.a<.01)discard;
  `);
 };
 material.customProgramCacheKey=()=> 'soft-portal-motes-v36';return material;
}
