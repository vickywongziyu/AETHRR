import * as T from 'three';
const glsl=`
float hash3(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float grain(vec3 p){return n3(p)*.56+n3(p*2.03)*.28+n3(p*4.1)*.16;}
`;
export function detailSurface(material,kind){
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vDetailPos;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvDetailPos=position;`);
  shader.fragmentShader='varying vec3 vDetailPos;\n'+glsl+shader.fragmentShader;
  const bark=kind==='bark';
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nvec3 dp=vDetailPos*${bark?'vec3(16.,16.,.65)':'vec3(4.5)'};float gran=grain(dp);float pores=n3(vDetailPos*85.);diffuseColor.rgb *= .58+gran*.75+pores*.12;${bark?'float ridges=smoothstep(.38,.5,gran);diffuseColor.rgb*=.62+ridges*.65;':''}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nfloat bumpH=grain(vDetailPos*${bark?'vec3(16.,16.,.65)':'vec3(7.)'})*${bark?'.018':'.016'};vec3 surfDx=dFdx(vViewPosition),surfDy=dFdy(vViewPosition);vec3 r1=cross(surfDy,normal),r2=cross(normal,surfDx);float det=dot(surfDx,r1);vec3 grad=sign(det)*(dFdx(bumpH)*r1+dFdy(bumpH)*r2);normal=normalize(abs(det)*normal-grad);`);
 };
 material.customProgramCacheKey=()=>kind;
}
