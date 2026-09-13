// Shared object-space brush variation. These values are this project's art
// direction, inferred from the references, not official Blizzard material data.
export const paintedNoiseGLSL=`
float paintHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float paintNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(paintHash(i),paintHash(i+vec3(1,0,0)),f.x),mix(paintHash(i+vec3(0,1,0)),paintHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(paintHash(i+vec3(0,0,1)),paintHash(i+vec3(1,0,1)),f.x),mix(paintHash(i+vec3(0,1,1)),paintHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

export function paintedPlaster(material){
 material.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 wallPos;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwallPos=position;');
  s.fragmentShader='varying vec3 wallPos;\n'+paintedNoiseGLSL+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float brush=paintNoise(wallPos*vec3(1.3,.65,1.3));
   float wash=paintNoise(wallPos*.22);
   diffuseColor.rgb*=.91+brush*.105+wash*.08;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.80,.86,.83),.17*(1.-smoothstep(.2,1.3,wallPos.y)));
  `);
 };
 material.customProgramCacheKey=()=> 'painted-plaster-v23';
}
