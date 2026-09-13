import { makeSummitFooting } from './summit.js';
import { createPortal } from '../portals/portal.js';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeTerrain } from './terrain.js';
import { makeForest } from './forest.js';
import { makeLandmarks } from './landmarks.js';
import { makeSky, makeRiver, makeParticles } from './atmosphere.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { random, peaks, heightAt } from './math.js';

export const DURATION=48;
export const STOPS=[
  {id:'overview',name:'河谷全景',en:'THE VALLEY',at:0,position:[32,27,77],target:[-8,21,-45],description:'循着河流向远山走去。把日常放在身后，让目光在山野间停留。'},
  {id:'cabin',name:'林间小屋',en:'THE CABIN',at:.24,position:[43,13,40],target:[24,8,11],description:'一扇亮着的窗，一处安静的角落。留给关于我、日常与新的灵感。'},
  {id:'bridge',name:'河上木桥',en:'THE CROSSING',at:.46,position:[-8,10,25],target:[12,4,-12],description:'让想法跨过河流。这里收藏作品，也连接下一次探索。'},
  {id:'tower',name:'山间瞭望台',en:'THE LOOKOUT',at:.68,position:[49,24,-14],target:[23,15,-55],description:'换一个高度看世界。实验、观察与尚未命名的可能，在这里相遇。'},
  {id:'summit',name:'雪山之巅',en:'THE SUMMIT',at:.84,position:[-32,70,-48],target:[-43,65,-63],description:'在积雪覆盖的山巅停留。轻触岩顶的蓝色光门，继续去往下一片风景。'},
];

export async function createValley(container,{onProgress=()=>{},onFrame=()=>{},onManual=()=>{},assetBase=new URL('assets/',document.baseURI).href}={}){
  const asset=name=>new URL(name,assetBase).href;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene=new T.Scene();scene.fog=new T.FogExp2('#8faaa9',.0023);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(container.clientWidth,container.clientHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','可拖动环视的北境河谷三维场景');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;
  const camera=new T.PerspectiveCamera(49,container.clientWidth/container.clientHeight,.15,1500);camera.name='Valley_Camera';
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=8;controls.maxDistance=180;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.18;controls.rotateSpeed=.4;controls.zoomSpeed=.55;
  const ambient=new T.HemisphereLight('#c5d9e3','#554e3b',.8);ambient.name='Sky_fill';scene.add(ambient);
  const sun=new T.DirectionalLight('#ffe1b4',2.7);sun.position.set(-85,80,20);sun.target.position.set(0,0,-35);sun.name='Late_afternoon_sun';sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-105,right:105,top:120,bottom:-115,near:1,far:290});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
  const sky=makeSky(scene);onProgress(.13);
  const tex=await new T.TextureLoader().loadAsync(asset('granite.jpg'));tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  const world=new T.Group();world.name='North_Valley';scene.add(world);const time={value:0};
  makeTerrain(world,tex);onProgress(.35);await new Promise(r=>setTimeout(r,20));
  const imageLoader=new T.ImageLoader();
  const [branchImage,alphaImage]=await Promise.all([imageLoader.loadAsync(asset('valley/fir-branch.jpg')),imageLoader.loadAsync(asset('valley/fir-alpha.png'))]);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(branchImage,0,0,1024,1024);const rgba=context.getImageData(0,0,1024,1024);context.clearRect(0,0,1024,1024);context.drawImage(alphaImage,0,0,1024,1024);const mask=context.getImageData(0,0,1024,1024);
  for(let i=0;i<rgba.data.length;i+=4)rgba.data[i+3]=mask.data[i];context.putImageData(rgba,0,0);
  const branchMap=new T.CanvasTexture(canvas);branchMap.colorSpace=T.SRGBColorSpace;branchMap.anisotropy=8;
  const treeCount=makeForest(world,time,branchMap);onProgress(.64);await new Promise(r=>setTimeout(r,20));
  const rockAsset=await new GLTFLoader().loadAsync(asset('valley/granite-scan.glb'));
  let sourceRock;rockAsset.scene.traverse(o=>{if(o.isMesh)sourceRock=o;});
  sourceRock.updateWorldMatrix(true,false);const scannedGeometry=sourceRock.geometry.clone().applyMatrix4(sourceRock.matrixWorld);scannedGeometry.computeBoundingBox();const center=scannedGeometry.boundingBox.getCenter(new T.Vector3());scannedGeometry.translate(-center.x,-scannedGeometry.boundingBox.min.y,-center.z);
  const scanMaterial=sourceRock.material.clone();scanMaterial.color.set('#bec5c2');scanMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114))),diffuseColor.rgb,.05);');};scanMaterial.roughness=.9;scanMaterial.name='Scanned_granite';
  const scannedRocks=new T.InstancedMesh(scannedGeometry,scanMaterial,32),dummy=new T.Object3D(),rand=random(700);
  let scanIndex=0;
  for(const [px,pz] of peaks.slice(0,8))for(let k=0;k<4;k++){
    const x=px+(rand()-.5)*19,z=pz+(rand()-.5)*18;dummy.position.set(x,heightAt(x,z)-11,z);dummy.rotation.set((rand()-.5)*.16,rand()*6.28,(rand()-.5)*.22);dummy.scale.set(4+rand()*4,10+rand()*9,6+rand()*5);dummy.updateMatrix();scannedRocks.setMatrixAt(scanIndex++,dummy.matrix);
  }
  scannedRocks.name='Photogrammetry_granite_outcrops';scannedRocks.castShadow=true;scannedRocks.receiveShadow=true;world.add(scannedRocks);
  const landmarks=makeLandmarks(world);makeRiver(world,time,asset('valley/water-normal.jpg'));const particles=makeParticles(scene,time,landmarks.chimney);onProgress(.80);
  // Physically based image lighting captured from the same sky as the visible world.
  const envScene=new T.Scene();envScene.add(sky.clone());const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(envScene,0,.1,1800);scene.environment=environment.texture;scene.environmentIntensity=.3;pmrem.dispose();
  let progress=0,playing=false,entered=false,elapsed=0,manual=false,transition=null,frame=0,disposed=false;
  const route=[...STOPS.map(s=>new T.Vector3(...s.position)),new T.Vector3(...STOPS[0].position)];
  const looks=[...STOPS.map(s=>new T.Vector3(...s.target)),new T.Vector3(...STOPS[0].target)];
  const curve=new T.CatmullRomCurve3(route,false,'catmullrom',.35),lookCurve=new T.CatmullRomCurve3(looks,false,'catmullrom',.35);
  const stops=[...STOPS.map(s=>s.at),1];
  function routeT(p){let i=0;while(i<stops.length-2&&p>stops[i+1])i++;return(i+(p-stops[i])/(stops[i+1]-stops[i]))/(stops.length-1);}
  function setCamera(p,offset=0){const t=routeT(p),pos=curve.getPoint(t),target=lookCurve.getPoint(t);pos.x+=offset;camera.position.copy(pos);controls.target.copy(target);camera.lookAt(target);}
  setCamera(0);controls.update();
  controls.addEventListener('start',()=>{manual=true;playing=false;transition=null;entered=true;onManual();});
  const clock=new T.Clock(),point=new T.Vector3();
  function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w/h<.8?65:49;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  function goTo(index){const stop=STOPS[index];entered=true;manual=false;playing=false;transition={start:clock.elapsedTime,duration:2.8,from:camera.position.clone(),fromLook:controls.target.clone(),to:new T.Vector3(...stop.position),toLook:new T.Vector3(...stop.target)};progress=stop.at;}
  function tick(){if(disposed)return;frame=requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.055);elapsed=clock.elapsedTime;
    if(!document.hidden){
      if(!reduced)time.value+=dt;
      if(!portalLink.active){
      if(transition){let t=Math.min(1,(elapsed-transition.start)/transition.duration);t=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.fromLook,transition.toLook,t);if(t===1)transition=null;}
      else if(playing){progress=(progress+dt/DURATION)%1;setCamera(progress);}
      else if(!entered&&!manual&&!reduced)setCamera(0,Math.sin(elapsed*.13)*.45);
      controls.update();}
      portalLink.update(time.value);renderer.render(scene,camera);
      const labels={};for(const key of ['cabin','tower','bridge']){point.copy(landmarks[key]).project(camera);labels[key]={x:(point.x*.5+.5)*container.clientWidth,y:(-point.y*.5+.5)*container.clientHeight,visible:point.z<1&&point.z>0&&(point.x*.5+.5)*container.clientWidth<container.clientWidth-145&&(point.x*.5+.5)*container.clientWidth>15&&Math.abs(point.y)<.80};}
      onFrame({progress,playing,labels,elapsed,manual});
    }
  }
  const summitSite=makeSummitFooting(world);
  const portalLink=createPortal({scene,camera,renderer,id:'valley',position:summitSite.position,scale:.55,yaw:.6,plinth:false,onFocus:()=>{entered=true;playing=false;transition=null;onManual();}});
  await renderer.compileAsync(scene,camera);onProgress(1);tick();
  const api={
    scene,camera,renderer,world,landmarks,treeCount,portal:portalLink,summitSite,
    enter(){entered=true;manual=false;playing=!reduced;transition=null;},
    play(value){entered=true;manual=false;transition=null;playing=value;},
    goTo,
    seek(p){entered=true;manual=false;transition=null;progress=Math.max(0,Math.min(.999999,p));setCamera(progress);},
    setSnow(value){particles.snow.visible=value;},
    setQuality(high){renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));renderer.shadowMap.enabled=high;resize();},
    capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
    setTime(value){time.value=value;renderer.render(scene,camera);},
    async exportGLB(){
      const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
      const exportScene=new T.Scene();exportScene.name='North_Valley';const copy=world.clone(true);copy.traverse(o=>{if(o.name==='River_animated_surface'){o.material=new T.MeshStandardMaterial({color:'#31545a',roughness:.22,metalness:.45});o.material.name='Flowing_river';}});exportScene.add(copy);
      const cam=camera.clone();exportScene.add(cam);
      const times=[],positions=[],quaternions=[];const tempCam=new T.PerspectiveCamera();
      for(let i=0;i<=240;i++){const p=i/240,t=routeT(p);tempCam.position.copy(curve.getPoint(t));tempCam.lookAt(lookCurve.getPoint(t));times.push(p*DURATION);positions.push(...tempCam.position.toArray());quaternions.push(...tempCam.quaternion.toArray());}
      const animation=new T.AnimationClip('North_Valley_48s_Camera_Tour',DURATION,[new T.VectorKeyframeTrack(cam.name+'.position',times,positions),new T.QuaternionKeyframeTrack(cam.name+'.quaternion',times,quaternions)]);
      return new GLTFExporter().parseAsync(exportScene,{binary:true,animations:[animation],onlyVisible:true});
    },
    dispose(){portalLink.dispose();disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});const textures=new Set([tex,branchMap]);scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m)){if(value?.isTexture)textures.add(value);}for(const value of Object.values(m.uniforms||{})){if(value.value?.isTexture)textures.add(value.value);}}});textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
  };
  return api;
}
