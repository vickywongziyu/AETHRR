import * as T from 'three';
import {weatheredRelief} from './weathered-relief.js';
import {timberGrain} from './timber-grain.js';
const noise=`
float rfHash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float rfNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rfHash(i),rfHash(i+vec3(1,0,0)),f.x),mix(rfHash(i+vec3(0,1,0)),rfHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(rfHash(i+vec3(0,0,1)),rfHash(i+vec3(1,0,1)),f.x),mix(rfHash(i+vec3(0,1,1)),rfHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float rfFbm(vec3 p){return rfNoise(p)*.57+rfNoise(p*2.04)*.28+rfNoise(p*4.09)*.15;}
float courses(vec2 p){float row=floor(p.y);vec2 cell=fract(vec2(p.x+mod(row,2.)*.5,p.y));vec2 edge=min(cell,1.-cell);return 1.-smoothstep(.012,.035,min(edge.x,edge.y));}
vec3 rfTri(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
`;
function classify(n){
 if(/Granite_Snow_Ground/.test(n))return 'alpine';
 if(/HC mountain|AE mountain/.test(n))return 'mountain';
 if(/AE rock|HC rock|River_stone/.test(n))return 'rock';
 if(/limestone|AE stone|Stone ·|Foundation_stone/.test(n))return 'stone';
 if(/HC wood|Aged_timber|Timber_edges/.test(n))return 'wood';
 if(/HC roof|WC dome|Slate_roof/.test(n))return 'roof';
 if(/WC ornament|AE gold/.test(n))return 'bronze';
 if(/HC ivory/.test(n))return 'ivory';
 return null;
}
function finish(m,kind,region,maps){
 m.roughness=kind==='bronze'?.48:kind==='roof'?.75:.92;m.metalness=kind==='bronze'?.5:kind==='roof'?.12:0;m.envMapIntensity=kind==='bronze'?.7:.45;
 m.onBeforeCompile=s=>{
  s.uniforms.refineColor={value:maps.color};s.uniforms.refineRough={value:maps.rough};
  s.vertexShader='varying vec3 refinePosition;varying vec3 refineNormal;\n'+(kind==='wood'?'attribute vec3 timberCoord;varying vec3 woodCoord;\n':'')+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`${kind==='wood'?'woodCoord=timberCoord;':''}vec4 rp=vec4(transformed,1.);vec3 rn=normal;
#ifdef USE_INSTANCING
rp=instanceMatrix*rp;rn=mat3(instanceMatrix)*rn;
#endif
refinePosition=mat3(modelMatrix)*rp.xyz;refineNormal=normalize(mat3(modelMatrix)*rn);
#include <project_vertex>`);
  s.fragmentShader='varying vec3 refinePosition;varying vec3 refineNormal;uniform sampler2D refineColor;uniform sampler2D refineRough;\n'+(kind==='wood'?'varying vec3 woodCoord;\n':'')+noise+s.fragmentShader;
  const stone=kind==='stone',rock=kind==='rock'||kind==='alpine'||kind==='mountain';
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 rp=refinePosition,rn=normalize(refineNormal);vec3 rw=pow(abs(rn),vec3(4.));rw/=max(.001,rw.x+rw.y+rw.z);
   float weather=rfFbm(rp*.26),fine=rfNoise(rp*9.);float surfaceHeight=0.;
   ${rock||stone?`
    vec3 sampleP=rp*${stone?'.82':kind==='alpine'?'.075':'.32'};vec3 photo=rfTri(refineColor,sampleP,rw);
    float grain=${stone?'rfFbm(rp*1.15)*.42+.26':'dot(photo,vec3(.3,.5,.2))'};float snow=${kind==='alpine'?'smoothstep(.48,.80,rn.y+(weather-.5)*.25)*(.52+smoothstep(.34,.67,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)))*.45)':'0.'};
    float layer=pow(.5+.5*sin(rp.y*${stone?'2.5':'1.4'}+rfFbm(rp*.15)*${stone?'1.1':'7.'}),12.);
    vec3 base=mix(diffuseColor.rgb,dot(diffuseColor.rgb,vec3(.3,.5,.2))*vec3(${kind==='mountain'?'0.79,0.94,1.10':region==='aether'?'1.19,1.02,.73':region==='forest'?'1.06,.8,1.13':'1.01,1.045,1.06'}),.6);
    ${kind==='alpine'?'base=mix(vec3(.145,.131,.111),vec3(.205,.205,.194),weather);':''}
    base*=clamp(.79+grain*.85,.82,1.18)*(.82+weather*.34)*${kind==='rock'?(region==='aether'?'1.4':'1.18'):'1.'};
    base*=1.-layer*${stone?'.065':'.15'};
    ${stone?`float mortar=courses(vec2(rp.z*.55,rp.y*1.4))*rw.x+courses(vec2(rp.x*.55,rp.y*1.4))*rw.z+courses(rp.xz*.6)*rw.y;base*=1.-mortar*.20;surfaceHeight-=mortar*.017;`:''}
    float moss=smoothstep(.54,.74,weather)*smoothstep(.25,.8,rn.y)*(1.-snow);base=mix(base,base*vec3(.6,.8,.4),moss*.45);
    diffuseColor.rgb=mix(base,vec3(.74,.80,.82)*(1.+fine*.035),snow*.94);
    surfaceHeight+=(grain*${stone?'.006':'.026'}-layer*.010)*(1.-snow*.94);roughnessFactor=1.;
   `:kind==='wood'?`
    vec3 grainP=woodCoord.yxz*vec3(4.7,.15,4.7);float wood=rfFbm(grainP),grainPhase=(woodCoord.y+woodCoord.z)*38.+wood*8.;float threads=pow(.5+.5*sin(grainPhase),8.)*(1.-smoothstep(.25,1.25,fwidth(grainPhase)));float knot=rfNoise(rp*.85);
    diffuseColor.rgb*=.77+wood*.42;diffuseColor.rgb=mix(diffuseColor.rgb,dot(diffuseColor.rgb,vec3(.3,.5,.2))*vec3(1.15,1.04,.85),smoothstep(.55,.75,knot)*.33);diffuseColor.rgb*=1.-threads*.12;
    surfaceHeight=wood*.004-threads*.0007;
   `:kind==='roof'?`
    float row=rp.y*2.8;float lap=1.-smoothstep(.015,.065,min(fract(row),1.-fract(row)));float shingles=courses(vec2((rp.x+rp.z)*1.7,row));float roofVariation=rfFbm(rp*1.9);
    diffuseColor.rgb=mix(diffuseColor.rgb,dot(diffuseColor.rgb,vec3(.3,.5,.2))*vec3(.64,.83,.95),.52);diffuseColor.rgb*=.8+roofVariation*.35;diffuseColor.rgb*=1.-shingles*.13-lap*.10;surfaceHeight=roofVariation*.006-lap*.012;
   `:kind==='bronze'?`
    float patina=smoothstep(.48,.72,weather);diffuseColor.rgb=mix(diffuseColor.rgb*vec3(1.09,.89,.54),vec3(.055,.14,.13),patina*.42);surfaceHeight=fine*.0015;
   `:`
    float grain=rfNoise(rp*75.);diffuseColor.rgb*=.93+grain*.055+weather*.09;surfaceHeight=grain*.0008;
   `}
  `.replace('roughnessFactor=1.;',''));
  if(rock||stone)s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(rfTri(refineRough,rp*.32,rw).g,.76,.98);');
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 sx=dFdx(vViewPosition),sy=dFdy(vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);
   vec3 reliefNormal=abs(det)*normal-sign(det)*(dFdx(surfaceHeight)*r1+dFdy(surfaceHeight)*r2);
   if(dot(reliefNormal,reliefNormal)>1e-20)normal=normalize(reliefNormal);
  `);
 };
 m.customProgramCacheKey=()=>`architecture-painted-v24-${kind}-${region}`;m.needsUpdate=true;
}
export function createArchitecturalSurfaces(){
 const loader=new T.TextureLoader(),base=import.meta.env.BASE_URL+'aether/textures/',maps={color:loader.load(base+'rock-color.jpg'),rough:loader.load(base+'rock-rough.jpg')};maps.color.colorSpace=T.SRGBColorSpace;for(const t of Object.values(maps)){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;}
 const seen=new Set(),geometryCache=new Map(),records=[];
 return {add(region,root){const counts={};root.traverse(o=>{if(!o.isMesh||!o.material?.name||o.userData.replacedByGeology)return;const kind=classify(o.material.name);if(!kind)return;if(/Distant_mountain_range|Horncrest_mountain|_cliffs$/.test(o.name)&&!o.geometry.userData.islandSculpture){const original=o.geometry;if(!geometryCache.has(original))geometryCache.set(original,weatheredRelief(original,/_cliffs$/.test(o.name)));o.geometry=geometryCache.get(original);}if(kind==='wood'){const original=o.geometry;if(!geometryCache.has(original))geometryCache.set(original,timberGrain(original));o.geometry=geometryCache.get(original);}if(seen.has(o.material))return;seen.add(o.material);finish(o.material,kind,region.id,maps);counts[kind]=(counts[kind]||0)+1;});records.push({region:region.id,...counts});},stats:()=>records,dispose(){geometryCache.forEach(g=>g.dispose());Object.values(maps).forEach(t=>t.dispose());}};
}
