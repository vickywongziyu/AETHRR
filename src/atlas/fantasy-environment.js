import * as T from 'three';
import {createCanopyRefinement} from './canopy-refinement.js';
import {createArchitecturalSurfaces} from './architectural-surfaces.js';
import {BIOMES} from './biome-vegetation.js';
import {smoothBranchNormals} from './branch-normals.js';
import {createMeadowLife} from './meadow-life.js';
const noise=`
float lwHash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float lwNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lwHash(i),lwHash(i+vec3(1,0,0)),f.x),mix(lwHash(i+vec3(0,1,0)),lwHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(lwHash(i+vec3(0,0,1)),lwHash(i+vec3(1,0,1)),f.x),mix(lwHash(i+vec3(0,1,1)),lwHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float lwFbm(vec3 p){return lwNoise(p)*.58+lwNoise(p*2.07)*.28+lwNoise(p*4.13)*.14;}
`;
function surface(material,kind,region,time,groundMap){
 material.roughness=kind==='water'?.18:kind==='bark'?.94:.88;material.metalness=kind==='water'?.04:0;
 if(kind==='water'){material.color.set(region==='forest'?'#2b414d':region==='valley'?'#3b626c':'#366c66');material.opacity=.85;material.transparent=true;material.envMapIntensity=.85;}
 if(kind==='bark'){material.vertexColors=false;material.color.set(region==='forest'?'#826677':'#817055');material.envMapIntensity=.45;}
 material.onBeforeCompile=s=>{
  s.uniforms.livingTime=time;s.uniforms.livingGround={value:groundMap};
  s.vertexShader='varying vec3 livingPos;varying vec2 barkUv;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`barkUv=uv;vec4 livingPoint=vec4(transformed,1.);
#ifdef USE_INSTANCING
livingPoint=instanceMatrix*livingPoint;
#endif
livingPos=(modelMatrix*livingPoint).xyz;
#include <project_vertex>`);
  s.fragmentShader='varying vec3 livingPos;varying vec2 barkUv;uniform float livingTime;uniform sampler2D livingGround;\n'+noise+s.fragmentShader;
  const adjustment=kind==='water'?`
   float ripples=sin(livingPos.x*.33+livingPos.z*.61-livingTime*.56)*.5+sin(livingPos.x*.74-livingPos.z*.24+livingTime*.39)*.25;
   float depthVariation=lwFbm(livingPos*vec3(.075,0.,.075));
   diffuseColor.rgb*=.86+depthVariation*.20+ripples*.025;
   float caustic=pow(max(0.,sin(livingPos.x*.9+sin(livingPos.z*.55+livingTime*.25))*sin(livingPos.z*.78-livingTime*.36)),14.);
   diffuseColor.rgb+=vec3(.055,.12,.105)*caustic*.12;
  `:kind==='bark'?`
   float bark=lwFbm(vec3(barkUv.x*15.,barkUv.y*.21,0.));float fissure=smoothstep(.44,.66,bark);
   diffuseColor.rgb*=.65+fissure*.55;
   float moss=lwFbm(livingPos*.27);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.63,.85,.48),smoothstep(.57,.74,moss)*.43);
  `:`
   float soil=lwFbm(livingPos*.6),grain=lwNoise(livingPos*8.);
   vec3 painted=texture2D(livingGround,livingPos.xz*.38).rgb;
   ${region==='forest'?'painted=dot(painted,vec3(.3,.5,.2))*vec3(1.05,.65,1.4);':region==='watercourt'?'painted*=vec3(.88,1.1,.76);':region==='valley'?'painted=mix(painted,vec3(dot(painted,vec3(.3,.5,.2))*.65+.55),smoothstep(.36,.67,dot(diffuseColor.rgb,vec3(.3,.5,.2))));':'painted*=vec3(1.08,1.02,.83);'}
   diffuseColor.rgb=mix(diffuseColor.rgb,painted,${region==='valley'?'.32':'.68'});
   diffuseColor.rgb*=.78+soil*.46+grain*.055;
   ${region==='watercourt'?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.14,.225,.09),.23);':region==='forest'?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.095,.082,.10),.31);':''}
  `;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+adjustment);
  if(kind==='water')s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 waterNormal=normalize(vec3(sin(livingPos.x*.52+livingPos.z*.3-livingTime*.55)*.038,1.,cos(livingPos.z*.65-livingTime*.62)*.031));normal=normalize(mat3(viewMatrix)*waterNormal);`);
  else s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float bump=lwFbm(livingPos*${kind==='bark'?'vec3(2.6,.17,2.6)':'vec3(4.)'})*.009+${kind==='soil'||kind==='snow'?'dot(texture2D(livingGround,livingPos.xz*.38).rgb,vec3(.3,.5,.2))*.008':'0.'};
   vec3 dx=dFdx(vViewPosition),dy=dFdy(vViewPosition),r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
   vec3 reliefNormal=abs(det)*normal-sign(det)*(dFdx(bump)*r1+dFdy(bump)*r2);
   if(dot(reliefNormal,reliefNormal)>1e-20)normal=normalize(reliefNormal);`);
 };
 material.customProgramCacheKey=()=>`living-surface-v6-${kind}-${region}`;material.needsUpdate=true;
}
export function createFantasyEnvironment({world,time,sun,hillSun,hemisphere,regionalLight,gathering}){
 const groundMap=new T.TextureLoader().load(import.meta.env.BASE_URL+'atlas/textures/painted-meadow-v1.png');groundMap.colorSpace=T.SRGBColorSpace;groundMap.wrapS=groundMap.wrapT=T.RepeatWrapping;groundMap.anisotropy=8;
 const {scene,camera,controls}=world,seen=new Set(),smoothTrees=new Map(),records=[];let night=false,blend=0,last=performance.now(),sound=null;
 const meadowLife=createMeadowLife(scene,gathering.flora),canopy=createCanopyRefinement(time),architecture=createArchitecturalSurfaces();
 regionalLight.castShadow=true;regionalLight.shadow.mapSize.set(innerWidth<700?1024:2048,innerWidth<700?1024:2048);Object.assign(regionalLight.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:190});regionalLight.shadow.normalBias=.045;regionalLight.shadow.bias=-.00008;
 controls.minDistance=1.8;controls.enablePan=true;controls.panSpeed=.65;controls.zoomSpeed=.75;
 const buttons=document.createElement('span');buttons.className='atlas-environment';buttons.innerHTML='<button data-environment="night" aria-label="切换月夜" title="晨光 / 月夜" aria-pressed="false">☾</button><button data-environment="sound" aria-label="开启环境声" title="环境声" aria-pressed="false">♪</button>';document.querySelector('.atlas-location').append(buttons);
 function setNight(value){night=!!value;const b=buttons.querySelector('[data-environment="night"]');b.setAttribute('aria-pressed',String(night));b.setAttribute('aria-label',night?'切换晨光':'切换月夜');}
 buttons.querySelector('[data-environment="night"]').onclick=()=>setNight(!night);
 function makeSound(){
  const ctx=new AudioContext(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.018)/1.02;data[i]=brown*3;}const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=800;gain.gain.value=0;source.connect(filter).connect(gain).connect(ctx.destination);source.start();return {ctx,gain,filter,source,on:false};
 }
 const soundButton=buttons.querySelector('[data-environment="sound"]');
 async function setSound(value){try{sound??=makeSound();await sound.ctx.resume();sound.on=!!value;soundButton.setAttribute('aria-pressed',String(sound.on));soundButton.setAttribute('aria-label',sound.on?'关闭环境声':'开启环境声');sound.gain.gain.setTargetAtTime(sound.on?.2:0,sound.ctx.currentTime,.5);return true;}catch{return false;}}
 soundButton.onclick=()=>setSound(!sound?.on);
 const starsGeometry=new T.BufferGeometry(),starPositions=[];for(let i=0;i<650;i++){const az=i*2.399,y=.12+(Math.sin(i*81.73)*.5+.5)*.87,r=Math.sqrt(1-y*y);starPositions.push(Math.cos(az)*r*900,y*900,Math.sin(az)*r*900);}starsGeometry.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));const stars=new T.Points(starsGeometry,new T.PointsMaterial({color:'#cee0f6',size:1.3,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));stars.frustumCulled=false;scene.add(stars);const moon=new T.Mesh(new T.SphereGeometry(11,24,16),new T.MeshBasicMaterial({color:'#d3dfed',transparent:true,opacity:0,depthWrite:false,fog:false}));scene.add(moon);
 function add(region,root){
  meadowLife.add(region);
  root.traverse(o=>{if(!o.isMesh||!o.material||Array.isArray(o.material))return;const m=o.material,n=m.name||'',name=o.name;
   if(['forest','watercourt'].includes(region.id)&&/bark/i.test(n)&&!o.geometry.userData.organicBranches){const original=o.geometry;if(!smoothTrees.has(original))smoothTrees.set(original,smoothBranchNormals(original));o.geometry=smoothTrees.get(original);}
   if(seen.has(m))return;
   if((region.id==='watercourt'&&/^WC moss/.test(n))||(region.id==='aether'&&/^AE moss/.test(n))||(region.id==='highland'&&/^HC ground/.test(n))){seen.add(m);surface(m,'soil',region.id,time,groundMap);}
   else if(region.id==='forest'&&/^Earth/.test(n)){seen.add(m);surface(m,'soil',region.id,time,groundMap);}
   else if(region.id==='valley'&&/^Granite_Snow_Ground/.test(n)){seen.add(m);surface(m,'snow',region.id,time,groundMap);}
   else if(['forest','watercourt'].includes(region.id)&&/bark/i.test(n)){seen.add(m);surface(m,'bark',region.id,time,groundMap);}
   else if(/^(WC water|Flowing_river)/.test(n)){seen.add(m);surface(m,'water',region.id,time,groundMap);}
  });
  canopy.add(region,root);architecture.add(region,root);
  const count=region.id==='valley'?180:95,positions=new Float32Array(count*3),seeds=[];for(let i=0;i<count;i++){const x=region.center[0]+Math.sin(i*12.73)*52,y=region.spawn[1]+1+(i%13)*.7,z=region.center[2]+Math.sin(i*71.9)*52;positions.set([x,y,z],i*3);seeds.push([x,y,z]);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));
  const mat=new T.ShaderMaterial({uniforms:{t:time,color:{value:new T.Color(BIOMES[region.id].pollen)},night:{value:0}},transparent:true,depthWrite:false,blending:region.id==='forest'?T.AdditiveBlending:T.NormalBlending,vertexShader:`uniform float t;varying float alpha;void main(){vec3 p=position;p.x+=sin(t*.28+position.z)*.6;p.y+=sin(t*.4+position.x)*.5;${region.id==='valley'?'p.y-=mod(t*.8+position.y,12.)-6.;':''}vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(16./max(1.,-mv.z),1.,3.);gl_Position=projectionMatrix*mv;alpha=.3+.3*sin(t+position.x);}`,fragmentShader:'uniform vec3 color;uniform float night;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(color,alpha*(1.-smoothstep(.1,1.,r))*(.5+night*.5));}'});
  const particles=new T.Points(g,mat);particles.name='Living atmosphere · '+region.id;particles.frustumCulled=false;scene.add(particles);records.push({region,particles});
 }
 function update(){
  canopy.update(camera,time.value);
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;blend=T.MathUtils.damp(blend,night?1:0,1.25,dt);
  meadowLife.update(time.value,camera);stars.position.copy(camera.position);stars.material.opacity=blend*.8;stars.visible=blend>.02;moon.position.copy(camera.position).add(new T.Vector3(420,330,-740));moon.material.opacity=blend*.72;moon.visible=blend>.02;
  // The extension light has its own moving shadow frustum, keeping the distant
  // forest, lakeshore and snow valley grounded with real local shadows.
  const target=controls.target.clone();regionalLight.position.set(target.x-38,target.y+62,target.z+30);regionalLight.target.position.copy(target);regionalLight.intensity*=1.7;
  sun.intensity*=1-blend*.86;hillSun.intensity*=1-blend*.86;regionalLight.intensity*=1-blend*.76;
  scene.backgroundIntensity*=1-blend*.93;scene.environmentIntensity*=1-blend*.46;hemisphere.intensity*=1-blend*.36;
  scene.fog.color.lerp(new T.Color('#202f4d'),blend*.78);sun.color.set('#ffdbad').lerp(new T.Color('#a9c7ff'),blend);hillSun.color.copy(sun.color);regionalLight.color.lerp(new T.Color('#b6ccf5'),blend);
  for(const r of records){r.particles.visible=Math.hypot(camera.position.x-r.region.center[0],camera.position.z-r.region.center[2])<r.region.radius+40;r.particles.material.uniforms.night.value=blend;}
  if(sound?.on)sound.filter.frequency.setTargetAtTime(650+Math.sin(time.value*.16)*220,sound.ctx.currentTime,.5);
 }
 return {add,update,setNight,setSound,get soundOn(){return !!sound?.on;},refinements:()=>({canopy:canopy.stats(),lod:canopy.lod(),architecture:architecture.stats()}),get night(){return night;},get nightBlend(){return blend;},dispose(){canopy.dispose();architecture.dispose();meadowLife.dispose();groundMap.dispose();stars.removeFromParent();moon.removeFromParent();starsGeometry.dispose();stars.material.dispose();moon.geometry.dispose();moon.material.dispose();buttons.remove();records.forEach(r=>{r.particles.removeFromParent();r.particles.geometry.dispose();r.particles.material.dispose();});if(sound){sound.source.stop();sound.ctx.close();}}};
}
