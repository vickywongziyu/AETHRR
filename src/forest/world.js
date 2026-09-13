import { createExplorer } from '../character/explorer.js';
import { createPortal } from '../portals/portal.js';
import * as T from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { detailSurface } from './surfaces.js';
import { chapters } from './content.js';
const pathX=y=>Math.sin(y*.096)*2.4+Math.sin(y*.2)*.75;
const V=a=>new T.Vector3(...a);
function seeded(seed=736){return()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return(seed>>>0)/4294967296;};}
export async function createWorld(container,onProgress,reduced){
 const mobile=innerWidth<700,rand=seeded();
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#20122e');scene.fog=new T.FogExp2('#463054',.022);
 const camera=new T.PerspectiveCamera(mobile?66:58,innerWidth/innerHeight,.12,220);camera.position.copy(V(chapters[0].position));camera.lookAt(V(chapters[0].target));
 scene.add(new T.HemisphereLight('#b9a0d7','#463247',1.2));
 const moon=new T.DirectionalLight('#ffe0e4',4.6);moon.position.set(-16,24,2);moon.target.position.set(0,0,-20);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-36,right:36,top:38,bottom:-38,near:1,far:100});moon.shadow.normalBias=.09;moon.shadow.bias=-.0001;scene.add(moon,moon.target);
 const fill=new T.DirectionalLight('#b885f2',1.1);fill.position.set(14,12,-40);scene.add(fill);
 const glowTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.08,'rgba(255,255,255,.9)');g.addColorStop(.25,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(c);})();
 const starsG=new T.BufferGeometry(),stars=[];for(let i=0;i<300;i++)stars.push((rand()-.5)*180,30+rand()*55,-30-rand()*100);starsG.setAttribute('position',new T.Float32BufferAttribute(stars,3));scene.add(new T.Points(starsG,new T.PointsMaterial({size:.12,color:'#d2b5ed',transparent:true,opacity:.6,sizeAttenuation:true})));
 const draco=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'forest/draco/').setDecoderConfig({type:'wasm'});
 const gltf=await new GLTFLoader().setDRACOLoader(draco).loadAsync(import.meta.env.BASE_URL+'forest/violet-sanctuary.glb',p=>onProgress(p.total?p.loaded/p.total:Math.min(.9,p.loaded/16000000)));
 draco.dispose();gltf.scene.updateMatrixWorld(true);
 // Consolidate linked Blender geometry into GPU instance batches.
 const groups=new Map(),time={value:0};let originalMeshes=0;
 gltf.scene.traverse(o=>{if(!o.isMesh)return;originalMeshes++;const key=o.geometry.uuid+o.material.uuid;if(!groups.has(key))groups.set(key,{geometry:o.geometry,material:o.material,items:[]});groups.get(key).items.push({matrix:o.matrixWorld.clone(),name:o.name});});
 const windMaterials=[],objects=[];
 for(const {geometry,material,items} of groups.values()){
  const m=material;const name=m.name.toLowerCase();m.side=name.includes('leaves')||name.includes('heather')?T.DoubleSide:T.FrontSide;
  if(name.includes('bark')||name.includes('stone')||name.includes('earth'))detailSurface(m,name.includes('bark')?'bark':'stone');
  if(name.includes('leaves')||name.includes('heather')){
   m.emissive.set(name.includes('leaves')?'#aa4188':'#7b266b');m.emissiveIntensity=name.includes('leaves')?.19:.035;
   m.onBeforeCompile=shader=>{shader.uniforms.uForestTime=time;shader.vertexShader='uniform float uForestTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.x += sin(uForestTime * .7 + position.z * 1.2 + position.y * .4) * ${name.includes('leaves')?'.065 * smoothstep(2.,9.,position.z)':'.025 * position.z'};`);};windMaterials.push(m);
  }
  const mesh=items.length>1?new T.InstancedMesh(geometry,m,items.length):new T.Mesh(geometry,m);
  if(mesh.isInstancedMesh){items.forEach((it,i)=>mesh.setMatrixAt(i,it.matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  else{mesh.matrix.copy(items[0].matrix);mesh.matrixAutoUpdate=false;}
  mesh.name=items[0].name;mesh.castShadow=!name.includes('heather');mesh.receiveShadow=true;scene.add(mesh);objects.push(mesh);
 }
 const lanterns=[];
 for(const [i,y] of [2,11,21,31,40,47].entries()){
  const x=pathX(y)+(i%2===0?-1:1)*2.7;
  const light=new T.PointLight('#bb67ff',18,8,1.7);light.position.set(x,1.6,-y);scene.add(light);lanterns.push(light);
  const spr=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:'#b97aff',transparent:true,blending:T.AdditiveBlending,depthWrite:false}));spr.position.copy(light.position);spr.scale.set(1.6,1.6,1.6);scene.add(spr);
 }
 const moonOrb=new T.Mesh(new T.SphereGeometry(1.35,32,24),new T.MeshBasicMaterial({color:'#ffe0de',fog:false}));moonOrb.position.set(-15,27,-29);scene.add(moonOrb);
 const moonHalo=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:'#ebb9dc',transparent:true,opacity:.24,blending:T.AdditiveBlending,depthWrite:false,fog:false}));moonHalo.position.copy(moonOrb.position);moonHalo.scale.set(17,17,1);scene.add(moonHalo);
 const px=pathX(49);chapters[2].target=[px,4.2,-49];chapters[3].position=[px,2.7,-39];chapters[3].target=[px,4.5,-49];
 const portalMaterial=new T.ShaderMaterial({uniforms:{uTime:time},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;void main(){vec2 p=vUv;float x=abs(p.x-.5)*2.;float top=.66+.34*pow(1.-x,.645);if(p.y>top)discard;float edge=smoothstep(1.,.8,x)*smoothstep(top,top-.045,p.y)*smoothstep(0.,.08,p.y);float wave=sin(p.y*18.+sin(p.x*16.+uTime*.6)*3.-uTime*1.5);float ribbons=pow(max(0.,sin(p.x*31.+sin(p.y*8.-uTime*.7)*2.2)),14.);float core=pow(max(0.,1.-x),3.);vec3 col=vec3(.29,.06,.68)*(core*.5+.12)+vec3(.66,.23,1.)*ribbons*(.6+wave*.3);gl_FragColor=vec4(col*2.,edge*(.45+ribbons*.55));}`});
 const portal=new T.Mesh(new T.PlaneGeometry(4.7,7),portalMaterial);portal.position.set(px,5,-48.36);scene.add(portal);
 const pl=new T.PointLight('#a647ff',140,19,1.7);pl.position.set(px,4,-46);scene.add(pl);
 const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:'#9336ff',blending:T.AdditiveBlending,transparent:true,opacity:.3,depthWrite:false}));halo.position.set(px,4.4,-48);halo.scale.set(14,16,1);scene.add(halo);
 // Floating pollen and fireflies, deterministic at every frame for export.
 const fireCount=mobile?150:330,fg=new T.BufferGeometry(),fp=new Float32Array(fireCount*3),seeds=[];
 for(let i=0;i<fireCount;i++)seeds.push([rand()*35-17,rand()*6+.3,rand()*70-57,rand()*6.28]);fg.setAttribute('position',new T.BufferAttribute(fp,3));const fmat=new T.PointsMaterial({map:glowTexture,color:'#e7b6fc',size:.16,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.9});scene.add(new T.Points(fg,fmat));
 const petalCount=mobile?90:190,petalGeo=new T.PlaneGeometry(.075,.15),petalMat=new T.MeshStandardMaterial({color:'#db8bbc',side:T.DoubleSide,roughness:.8,transparent:true,opacity:.85});const petals=new T.InstancedMesh(petalGeo,petalMat,petalCount);petals.frustumCulled=false;scene.add(petals);const dummy=new T.Object3D(),petalSeeds=Array.from({length:petalCount},()=>[rand()*28-14,rand()*13,rand()*68-54,rand()*6.28]);
 const portalLink=createPortal({scene,camera,renderer,id:'forest',position:[px,1.5,-48.36],existingSurface:portal,onFocus:()=>{touring=false;window.dispatchEvent(new CustomEvent('journeychange',{detail:progress}));}});
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.48,.55,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
 let progress=0,targetProgress=0,t=0,playing=!reduced,touring=false,disposed=false,last=performance.now(),yaw=0,pitch=0,targetYaw=0,targetPitch=0,drag=null;
 let explorer;
 const pos=new T.Vector3(),look=new T.Vector3(),direction=new T.Vector3();
 const path=new T.CatmullRomCurve3(chapters.map(c=>V(c.position)),false,'catmullrom',.15),targets=new T.CatmullRomCurve3(chapters.map(c=>V(c.target)),false,'catmullrom',.15);
 function cameraAt(p){if(portalLink.active||explorer?.active)return;path.getPoint(T.MathUtils.clamp(p,0,1),pos);targets.getPoint(T.MathUtils.clamp(p,0,1),look);camera.position.copy(pos);direction.copy(look).sub(pos);direction.applyAxisAngle(new T.Vector3(0,1,0),yaw);direction.y+=pitch*direction.length();camera.lookAt(pos.clone().add(direction));}
 function draw(timeValue){
  time.value=timeValue;
  for(let i=0;i<fireCount;i++){const [x,y,z,s]=seeds[i];fp[i*3]=x+Math.sin(timeValue*.24+s)*.65;fp[i*3+1]=y+Math.sin(timeValue*.46+s)*.4;fp[i*3+2]=z+Math.cos(timeValue*.2+s)*.4;}fg.attributes.position.needsUpdate=true;
  petalSeeds.forEach(([x,y,z,s],i)=>{dummy.position.set(x+Math.sin(timeValue*.3+s)*1.3,((y-timeValue*.34)%13+13)%13,z+Math.sin(timeValue*.12+s)*.8);dummy.rotation.set(timeValue*.6+s,s,timeValue*.35+s);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);});petals.instanceMatrix.needsUpdate=true;
  lanterns.forEach((l,i)=>l.intensity=17+Math.sin(timeValue*1.5+i)*2);pl.intensity=130+Math.sin(timeValue*.7)*15;
  portalLink.update(time.value);composer.render();
 }
 function animate(now){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(playing&&!document.hidden){t+=dt;if(touring&&!portalLink.active){targetProgress=Math.min(1,targetProgress+dt/55);if(targetProgress===1){touring=false;window.dispatchEvent(new CustomEvent('tourend'));}}}const lerp=1-Math.exp(-dt*3.2);progress+=(targetProgress-progress)*lerp;yaw+=(targetYaw-yaw)*lerp;pitch+=(targetPitch-pitch)*lerp;cameraAt(progress);explorer?.update(dt);draw(t);requestAnimationFrame(animate);}
 const onDown=e=>{if(explorer?.active||e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch};renderer.domElement.setPointerCapture(e.pointerId);};
 const onMove=e=>{if(explorer?.active||!drag)return;targetYaw=T.MathUtils.clamp(drag.yaw-(e.clientX-drag.x)*.002,-.7,.7);targetPitch=T.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.0013,-.35,.4);};
 renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointermove',onMove);renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
 renderer.domElement.addEventListener('wheel',e=>{if(explorer?.active)return;e.preventDefault();touring=false;targetProgress=T.MathUtils.clamp(targetProgress+e.deltaY*.00019,0,1);window.dispatchEvent(new CustomEvent('journeychange',{detail:targetProgress}));},{passive:false});
 function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?66:58;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}
 explorer=await createExplorer({scene,camera,renderer,source:gltf.scene,portal:portalLink,onMode:active=>{touring=false;window.dispatchEvent(new CustomEvent('explorermode',{detail:active}));}});
 window.addEventListener('resize',resize);cameraAt(0);draw(0);requestAnimationFrame(animate);
 return {
  portal:portalLink,scene,camera,renderer,explorer,
  go(index){explorer.exit();touring=false;targetProgress=index/3;targetYaw=targetPitch=0;},
  setPlaying(v){playing=v;},setTouring(v){explorer.exit();touring=v;if(v){playing=true;if(targetProgress>.985)targetProgress=0;}},
  getProgress:()=>progress,
  stats:()=>({meshes:originalMeshes,drawBatches:groups.size,playing,touring,progress,time:t,camera:camera.position.toArray()}),
  capture(seconds,p){explorer.exit();playing=false;touring=false;progress=targetProgress=p;yaw=targetYaw=pitch=targetPitch=0;cameraAt(p);t=seconds;draw(t);return renderer.domElement.toDataURL('image/png');},
  dispose(){explorer.dispose();portalLink.dispose();disposed=true;window.removeEventListener('resize',resize);scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});composer.dispose();renderer.dispose();}
 };
}
