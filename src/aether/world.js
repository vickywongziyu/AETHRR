import * as T from 'three';
import {omitInactiveLights} from './active-lights.js';
import {createAtlas} from '../atlas/exploration.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { loadSurfaceMaps,applySurface,crystalMaterial } from './materials.js';
import {applyRefinedGroves} from './refined-groves.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {loadHighland,createCrossings} from './highland.js';
import { createFlock } from './birds.js';
import { chapters } from './content.js';
import { createAtmosphere, waterfallMaterial } from './atmosphere.js';
const vec=a=>new T.Vector3(...a);
export async function createWorld(container,onProgress,reduced){
 const mobile=innerWidth<700,captureMode=new URLSearchParams(location.search).has('capture');
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 const restoreLightRendering=omitInactiveLights(renderer);
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.appendChild(renderer.domElement);
 const scene=new T.Scene();
 const [hdr,maps]=await Promise.all([new HDRLoader().loadAsync(import.meta.env.BASE_URL+'aether/textures/sky.hdr'),loadSurfaceMaps()]);
 hdr.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(hdr);pmrem.dispose();
 scene.environment=env.texture;scene.environmentIntensity=.38;scene.background=hdr;scene.backgroundIntensity=1.65;scene.backgroundRotation.y=-.85;scene.environmentRotation.y=-.85;
 scene.fog=new T.FogExp2('#819baa',.0034);
 const camera=new T.PerspectiveCamera(mobile?64:54,innerWidth/innerHeight,.2,1400);camera.position.fromArray(chapters[0].position);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(chapters[0].target);controls.enableDamping=true;controls.dampingFactor=.06;controls.enablePan=false;controls.minDistance=6;controls.maxDistance=230;controls.maxPolarAngle=Math.PI*.68;controls.update();
 const hemisphere=new T.HemisphereLight('#9dbacb','#3d2817',.52);scene.add(hemisphere);
 const sun=new T.DirectionalLight('#ffdbad',4.0);sun.position.set(-65,43,32);sun.target.position.set(0,10,-15);sun.castShadow=true;sun.shadow.mapSize.set(mobile?2048:4096,mobile?2048:4096);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:230});sun.shadow.normalBias=.12;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const fill=new T.DirectionalLight('#8cabbd',.18);fill.position.set(40,30,-70);scene.add(fill);
 const hillSun=new T.DirectionalLight('#ffdfb2',3.5);hillSun.position.set(-65,66,95);hillSun.target.position.set(0,12,150);hillSun.castShadow=true;hillSun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(hillSun.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:1,far:230});hillSun.shadow.normalBias=.15;hillSun.intensity=0;scene.add(hillSun,hillSun.target);
 const time={value:0};createAtmosphere(scene,time);
 const decoder=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'forest/draco/');
 let gltf;
 try{gltf=await new GLTFLoader().setDRACOLoader(decoder).loadAsync(import.meta.env.BASE_URL+'aether/aether.glb',e=>onProgress(e.total?e.loaded/e.total:Math.min(.95,e.loaded/5000000)));await applyRefinedGroves(gltf.scene,decoder);}
 catch(error){restoreLightRendering();renderer.dispose();renderer.domElement.remove();throw error;}finally{decoder.dispose();}
 const floats=[],waters=[],materials=new Set(),crystal=crystalMaterial(env.texture);let meshes=0,vertices=0;
 gltf.scene.traverse(o=>{
  if(o.userData.floating)floats.push({object:o,y:o.position.y,phase:floats.length*.83});
  if(!o.isMesh)return;meshes++;vertices+=o.geometry.attributes.position.count;o.castShadow=true;o.receiveShadow=true;
  if(o.name.startsWith('Waterfall')){o.material=waterfallMaterial(time);o.castShadow=false;waters.push(o);return;}
  if(/^Wind[ _]birds/.test(o.name)){o.visible=false;return;}
  if(o.material.name.replace(/\.\d+$/, '')==='AE crystal'){o.material=crystal;o.castShadow=false;return;}
  if(materials.has(o.material))return;materials.add(o.material);
  o.material.envMapIntensity=.26;
  const name=o.material.name.replace('AE ','').replace(/\.\d+$/, '');
  if(['rock','stone','moss','bark','leaves','mountain','gold'].includes(name))applySurface(o.material,name,maps,time);
  if(name==='leaves'){o.material.side=T.DoubleSide;o.material.emissive.set(0);o.material.emissiveIntensity=0;}


 });scene.add(gltf.scene);
 const highland=await loadHighland(scene,maps,time);
 const crossings=createCrossings(scene,renderer.domElement,camera,i=>api.go(i));
 const flock=createFlock(scene);
 // Waterfall spray follows each base. Points move down then diffuse in the wind.
 const count=mobile?350:900,geometry=new T.BufferGeometry(),positions=new Float32Array(count*3),seeds=[];
 const sources=[[18,47,-32,68,3],[14,8,16,36,2.6],[-19,32,-20,48,1.1]];
 for(let i=0;i<count;i++)seeds.push([i%3,Math.sin(i*127.1)*.5+.5,Math.sin(i*311.7)*.5+.5,Math.sin(i*73.3)*.5+.5]);geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const spray=new T.Points(geometry,new T.PointsMaterial({color:'#d7eeee',size:.12,transparent:true,opacity:.42,depthWrite:false}));scene.add(spray);
 const composer=new EffectComposer(renderer);composer.renderTarget1.samples=mobile?2:4;composer.renderTarget2.samples=mobile?2:4;composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.14,.35,1.25));composer.addPass(new OutputPass());
 const path=new T.CatmullRomCurve3([...chapters.map(c=>vec(c.position)),vec(chapters[0].position)],false,'catmullrom',.16);
 const aims=new T.CatmullRomCurve3([...chapters.map(c=>vec(c.target)),vec(chapters[0].target)],false,'catmullrom',.16);
 let t=0,last=performance.now(),playing=!reduced,touring=false,tourProgress=0,moving=null,disposed=false,raf,chapter=0,atlas;
 function report(){window.dispatchEvent(new CustomEvent('aetherstate',{detail:{playing,touring,chapter}}));}
 controls.addEventListener('start',()=>{touring=false;moving=null;report();});
 function cameraAt(p){camera.position.copy(path.getPoint(T.MathUtils.clamp(p,0,1)));controls.target.copy(aims.getPoint(T.MathUtils.clamp(p,0,1)));camera.lookAt(controls.target);}
 function draw(seconds){
  // Keep the same horizontal panorama in narrow windows: the riverside forest
  // sits beside Horncrest and must not be cropped out of its overview.
  const baseFov=innerWidth<700?64:54;
  const overviewFov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(54/2))*(1280/832)/camera.aspect));
  const fov=atlas?.starHall?.active?atlas.starHall.fov:atlas?.housing?.editing?atlas.housing.fov:atlas?.buildings.selected?(atlas.buildings.fov||baseFov):(chapter===7||chapter===4)&&!atlas?.active&&!captureMode?Math.max(baseFov,overviewFov):baseFov;
  if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  const shoreLight=T.MathUtils.smoothstep(camera.position.z,65,120);sun.intensity=4*(1-shoreLight);hillSun.intensity=3.5*shoreLight;
  time.value=seconds;scene.backgroundRotation.y=-.85+seconds*.0006;floats.forEach(({object,y,phase})=>object.position.y=y+Math.sin(seconds*.21+phase)*.48);atlas?.beforeRender(seconds);
  flock.update(seconds);
  seeds.forEach(([k,a,b,c],i)=>{const [x,y,z,h,w]=sources[k],u=(b+seconds*.16)%1;positions.set([x+(a-.5)*(w+u*3)+Math.sin(seconds*.7+c*8)*u,y-u*h,z+(c-.5)*1.7+u*.6],i*3);});geometry.attributes.position.needsUpdate=true;renderer.info.reset();composer.render();
 }
 function animate(now){if(disposed)return;const dt=Math.max(0,(now-last)/1000);last=now;if(!document.hidden){if(playing)t+=dt;
  if(atlas?.active)atlas.update(dt);
  else if(touring&&playing){tourProgress=(tourProgress+dt/(chapters.length*10))%1;cameraAt(tourProgress);const next=Math.min(chapters.length-1,Math.floor(tourProgress*chapters.length));if(next!==chapter){chapter=next;report();}}
  else if(moving){moving.elapsed+=dt;let a=Math.min(1,moving.elapsed/moving.duration);a=a*a*(3-2*a);camera.position.lerpVectors(moving.from,moving.to,a);camera.position.y+=Math.sin(a*Math.PI)*Math.min(24,moving.from.distanceTo(moving.to)*.15);controls.target.lerpVectors(moving.aimFrom,moving.aimTo,a);if(a===1)moving=null;}
  if(!atlas?.active)controls.update();draw(t);}raf=requestAnimationFrame(animate);}
 function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?64:54;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}
 function visibility(){last=performance.now();}
 document.addEventListener('visibilitychange',visibility);
 // The viewport can change while the GLBs are loading (especially in the
 // desktop side panel). Sync it before the first rendered frame and labels.
 window.addEventListener('resize',resize);resize();draw(0);if(!captureMode)raf=requestAnimationFrame(animate);
 const api={scene,camera,renderer,controls,
 cancelCameraMotion({preserveExploration=false}={}){if(!preserveExploration&&atlas?.active)atlas.setMode('observe');atlas?.quarter?.ferry?.unfollow();atlas?.starHall?.stop();touring=false;moving=null;report();},
 go(i,{immediate=false}={}){atlas?.quarter?.ferry?.unfollow();atlas?.starHall?.clear();atlas?.buildings.close();delete document.body.dataset.atlasInspecting;if(atlas?.active)atlas.setMode('observe');chapter=i;touring=false;const c=chapters[i];moving={elapsed:0,duration:reduced?.001:Math.max(2.8,Math.min(8,camera.position.distanceTo(vec(c.position))*.055)),from:camera.position.clone(),to:vec(c.position),aimFrom:controls.target.clone(),aimTo:vec(c.target)};if(captureMode||immediate){camera.position.copy(moving.to);controls.target.copy(moving.aimTo);controls.update();draw(t);moving=null;}report();},
 setTour(v){if(v)atlas?.quarter?.ferry?.unfollow();if(v)atlas?.starHall?.clear();if(v)atlas?.buildings.close();if(v&&atlas?.active)atlas.setMode('observe');touring=v;moving=null;if(v){playing=true;tourProgress=chapter/chapters.length;}report();},
 setPlaying(v){playing=v;report();},
 capture(seconds,progress){touring=false;moving=null;t=seconds;cameraAt(progress);controls.update();draw(seconds);return renderer.domElement.toDataURL('image/png');},
 stats(){return{meshes,vertices,highlandLoaded:!!highland,chapters:chapters.length,floatingIslands:floats.length,waterfalls:waters.length,birds:flock.birds.length,playing,touring,chapter,time:t,camera:camera.position.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
 setQuality(level){const ratio={low:.75,balanced:1,high:mobile?1.25:1.5}[level]??1.5;renderer.setPixelRatio(Math.min(devicePixelRatio,ratio));composer.setPixelRatio(renderer.getPixelRatio());composer.passes[1].enabled=level!=='low';renderer.shadowMap.enabled=level!=='low';const samples=level==='low'?0:level==='balanced'?2:mobile?2:4;for(const target of [composer.renderTarget1,composer.renderTarget2])if(target.samples!==samples){target.samples=samples;target.dispose();}return {pixelRatio:renderer.getPixelRatio(),samples,bloom:composer.passes[1].enabled,shadows:renderer.shadowMap.enabled};},
 dispose(){disposed=true;api.shell?.dispose();api.visitor?.dispose();atlas?.dispose();cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);controls.dispose();crossings.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});composer.dispose();maps.dispose();hdr.dispose();env.dispose();restoreLightRendering();renderer.dispose();},
 };if(!captureMode){atlas=createAtlas(api,{sources:[gltf.scene,highland],time,sun,hillSun,hemisphere,maps});api.atlas=atlas;}return api;
}
