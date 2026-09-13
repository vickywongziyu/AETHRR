import * as T from 'three';
import { noiseGLSL } from './atmosphere.js';
export async function loadSurfaceMaps(){
 const loader=new T.TextureLoader(),base=import.meta.env.BASE_URL+'aether/textures/';
 const [color,normal,rough]=await Promise.all(['rock-color.jpg','rock-normal.jpg','rock-rough.jpg'].map(p=>loader.loadAsync(base+p)));
 color.colorSpace=T.SRGBColorSpace;
 for(const map of [color,normal,rough]){map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;}
 return {color,normal,rough,dispose(){color.dispose();normal.dispose();rough.dispose();}};
}
const triGLSL=`
vec4 triplanar(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.yz)*w.x+texture2D(tex,p.xz)*w.y+texture2D(tex,p.xy)*w.z;}
`;
const palette={rock:[.72,.65,.49],stone:[.36,.31,.24],bark:[.16,.11,.065],moss:[.22,.24,.075],mountain:[.20,.25,.28],gold:[.39,.23,.087]};
export function applySurface(m,kind,maps,time){
 m.roughness=.91;m.metalness=0;m.emissive.set(0);m.emissiveIntensity=0;
 m.onBeforeCompile=s=>{
  s.uniforms.aetherTime=time;
  s.vertexShader='varying vec3 aePos;varying vec3 aeNormal;varying mat3 aeNormalMatrix;uniform float aetherTime;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\naePos=position;aeNormal=normal;aeNormalMatrix=normalMatrix;${kind==='leaves'?'transformed.x+=sin(aetherTime*.85+position.x*1.4+position.z*.6)*.038;transformed.z+=sin(aetherTime*1.2+position.y*1.3)*.018;':''}`);
  if(kind==='leaves'){
   s.fragmentShader='varying vec3 aePos;\n'+noiseGLSL+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.rgb*=mix(.72,1.24,fbm(aePos*.45));`);
   // Thin leaves scatter a small amount of warm light without glowing in the dark.
   s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>`);
   return;
  }
  const tint=palette[kind]||palette.stone,scale=kind==='rock'?.22:kind==='mountain'?.065:kind==='moss'?.65:.48;
  s.uniforms.aeColor={value:maps.color};s.uniforms.aeBump={value:maps.normal};s.uniforms.aeRough={value:maps.rough};
  s.fragmentShader=`varying vec3 aePos;varying vec3 aeNormal;varying mat3 aeNormalMatrix;uniform sampler2D aeColor;uniform sampler2D aeBump;uniform sampler2D aeRough;\n${noiseGLSL}${triGLSL}`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 aeP=aePos*${scale.toFixed(3)};vec3 aeW=pow(abs(normalize(aeNormal)),vec3(4.));aeW/=max(dot(aeW,vec3(1.)),.001);
   vec3 aePhoto=triplanar(aeColor,aeP,aeW).rgb;
   float aeStain=fbm(aePos*vec3(.12,.12,.32));
   diffuseColor.rgb=aePhoto*vec3(${tint.join(',')})*(.66+aeStain*.55);
   ${kind==='rock'?`float aeMoss=smoothstep(.53,.71,fbm(aePos*.37))*smoothstep(.18,.85,normalize(aeNormal).z);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.45,.62,.20),aeMoss*.65);float aeWet=smoothstep(.65,.77,fbm(aePos*vec3(.1,.1,.04)));diffuseColor.rgb*=1.-aeWet*.25;`:''}
   ${kind==='stone'?`float course=abs(fract(aePos.z*2.8)-.5);float seams=smoothstep(.46,.50,course);diffuseColor.rgb*=1.-seams*.38;`:''}
   ${kind==='moss'?`float dirt=smoothstep(.53,.72,fbm(aePos*.25));diffuseColor.rgb=mix(diffuseColor.rgb,aePhoto*vec3(.30,.20,.088),dirt*.85);`:''}
   ${kind==='mountain'?'float gray=dot(aePhoto,vec3(.2126,.7152,.0722));diffuseColor.rgb=gray*vec3(.17,.215,.245)*(.7+aeStain*.45);':''}
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(triplanar(aeRough,aeP,aeW).g,.54,.97);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 aeX=texture2D(aeBump,aeP.yz).xyz*2.-1.;vec3 aeY=texture2D(aeBump,aeP.xz).xyz*2.-1.;vec3 aeZ=texture2D(aeBump,aeP.xy).xyz*2.-1.;
   aeX.xy*=.55;aeY.xy*=.55;aeZ.xy*=.55;vec3 aeS=sign(aeNormal);
   vec3 aeN=normalize(vec3(aeX.z*aeS.x,aeX.x,aeX.y)*aeW.x+vec3(aeY.x,aeY.z*aeS.y,aeY.y)*aeW.y+vec3(aeZ.x,aeZ.y,aeZ.z*aeS.z)*aeW.z);
   normal=normalize(mix(normal,aeNormalMatrix*aeN,.64));
  `);
 };
 m.customProgramCacheKey=()=>`aether-pbr-v2-${kind}`;m.needsUpdate=true;
}
export function crystalMaterial(env){return new T.MeshPhysicalMaterial({
 color:'#b1e5ff',roughness:.025,metalness:0,transmission:1,thickness:1.5,
 ior:1.55,attenuationColor:'#258de0',attenuationDistance:3.8,
 clearcoat:1,clearcoatRoughness:.025,envMap:env,envMapIntensity:1.7,
 specularIntensity:1,dispersion:.035,
});}
