// Shared by the original valley and its atlas export. Snow stays on the existing
// alpha-cut needles; tree footprints, navigation and branch silhouettes stay intact.
export function winterVegetation(material,{ground=false}={}) {
 if(material.userData.winterVegetation)return material;
 const compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
 material.userData.winterVegetation=ground?'frost-v25':'snow-v25';
 material.roughness=1;
 material.onBeforeCompile=shader=>{
  compile.call(material,shader);
  const varyings='varying vec3 winterPosition; varying vec3 winterNormal;\n';
  shader.vertexShader=varyings+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   winterPosition=position;
   winterNormal=normal;
  `);
  shader.fragmentShader=varyings+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float winterLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   diffuseColor.rgb=mix(vec3(winterLuma)*vec3(.76,.91,.89),diffuseColor.rgb,${ground?'.18':'.24'});
   vec3 winterN=normalize(winterNormal)*(gl_FrontFacing?1.:-1.);
   float winterUp=smoothstep(.06,.62,winterN.y);
   float winterPatch=.5+.25*sin(winterPosition.x*3.7+winterPosition.z*2.3)
                         +.25*sin(winterPosition.z*5.1-winterPosition.y*3.9);
   float winterCover=winterUp*${ground?'.48':'.96'}*smoothstep(.02,.65,winterPatch);
   vec3 winterSnow=mix(vec3(.48,.57,.61),vec3(.78,.84,.85),winterPatch);
   diffuseColor.rgb=mix(diffuseColor.rgb,winterSnow,winterCover);
  `);
 };
 material.customProgramCacheKey=()=>cacheKey+'-winter-'+(ground?'frost':'snow')+'-v25';
 material.needsUpdate=true;
 return material;
}

// Three.Material.clone deliberately omits shader hooks. Resource trees need the
// same snow and wind as the trees from which their geometry was copied.
export function cloneVegetationMaterial(source) {
 const material=source.clone();
 material.onBeforeCompile=source.onBeforeCompile;
 material.customProgramCacheKey=source.customProgramCacheKey;
 return material;
}
