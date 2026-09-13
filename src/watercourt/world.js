import { createPortal } from '../portals/portal.js';
import * as T from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { detailSurface } from './surfaces.js';
import { addAtmosphere } from './atmosphere.js';
import { chapters } from './content.js';
function seeded(seed=920){return()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return(seed>>>0)/4294967296;};}
export async function createWorld(container,onProgress,reduced){
 const mobile=innerWidth<700,rand=seeded();
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.2:1.4));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#8a817d');scene.fog=new T.FogExp2('#514c54',.007);
 const camera=new T.PerspectiveCamera(mobile?54:44,innerWidth/innerHeight,.2,300);
 scene.add(new T.HemisphereLight('#b8aacb','#222e16',.8));
 const sun=new T.DirectionalLight('#ffcf8c',3.2);sun.position.set(-28,45,-12);sun.target.position.set(0,0,-14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:150});sun.shadow.normalBias=.09;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
 const fill=new T.DirectionalLight('#b8a6d3',.4);fill.position.set(25,18,18);scene.add(fill);
 const sky=new Sky();sky.scale.setScalar(2000);sky.material.fragmentShader=sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );','gl_FragColor = vec4( retColor * vec3(.27,.23,.29), 1.0 );');sky.material.uniforms.turbidity.value=7;sky.material.uniforms.rayleigh.value=1.5;sky.material.uniforms.mieCoefficient.value=.006;sky.material.uniforms.mieDirectionalG.value=.78;sky.material.uniforms.sunPosition.value.set(-.65,.22,-.6);scene.add(sky);
 const decoder=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'watercourt/draco/');const gltf=await new GLTFLoader().setDRACOLoader(decoder).loadAsync(import.meta.env.BASE_URL+'watercourt/watercourt.glb',p=>onProgress(p.total?p.loaded/p.total:Math.min(.96,p.loaded/37000000)));
 decoder.dispose();gltf.scene.updateMatrixWorld(true);const groups=new Map(),time={value:0};let originalMeshes=0;
 gltf.scene.traverse(o=>{if(!o.isMesh||o.name.includes('Water_Surface'))return;originalMeshes++;const foliage=/leaves|flowers/i.test(o.material.name);const stride=foliage?(o.name.startsWith('Understory')?4:(mobile?2:1)):1;const key=o.geometry.uuid+o.material.uuid+stride;if(!groups.has(key)){let geometry=o.geometry;if(stride>1&&geometry.index){geometry=geometry.clone();const indices=geometry.index.array,thin=[];for(let i=0;i<indices.length;i+=12*stride)for(let j=0;j<12&&i+j<indices.length;j++)thin.push(indices[i+j]);geometry.setIndex(thin);}groups.set(key,{geometry,material:o.material,items:[]});}groups.get(key).items.push({matrix:o.matrixWorld.clone(),name:o.name});});
 for(const {geometry,material:m,items} of groups.values()){
  const name=m.name.toLowerCase();m.side=name.includes('leaves')||name.includes('flowers')?T.DoubleSide:T.FrontSide;
  if(/limestone|ornament|dome|bark/.test(name))detailSurface(m,name.includes('bark')?'bark':'stone');
  if(/leaves|flowers/.test(name)){
   m.roughness=.95;m.emissive.set('#8e955c');m.emissiveIntensity=.045;
   m.onBeforeCompile=s=>{s.uniforms.uGardenTime=time;s.vertexShader='uniform float uGardenTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.x += sin(uGardenTime*.55 + position.z*.9 + position.y*.5)*.045*smoothstep(0.,6.,abs(position.z));`);};
  }
  const mesh=items.length>1?new T.InstancedMesh(geometry,m,items.length):new T.Mesh(geometry,m);
  if(mesh.isInstancedMesh){items.forEach((it,i)=>mesh.setMatrixAt(i,it.matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}else{mesh.matrix.copy(items[0].matrix);mesh.matrixAutoUpdate=false;}
  mesh.name=items[0].name;mesh.castShadow=!name.includes('flowers');mesh.receiveShadow=true;scene.add(mesh);
 }
 const atmosphere=addAtmosphere(scene,rand,mobile),lanterns=[];
 const lanternPositions=[[-12,3.97,-2],[-8,4.57,-5],[0,5.12,-6],[9,5.27,-6],[18,4.67,-5],[-7,3.97,10],[-1,4.57,8],[7,4.37,8],[-6,3.67,-13],[6,3.67,-18],[15,5.97,-18],[21,5.97,-18],[-20,3.47,17],[11,5.67,-31]];
 // Blender lamp centers are z+1.47, independently shared in manifest; use those exact elevations.
 lanternPositions.forEach((p,i)=>{p[1]-=1.5;const sprite=new T.Sprite(new T.SpriteMaterial({map:atmosphere.glow,color:'#ffd087',transparent:true,opacity:.78,blending:T.AdditiveBlending,depthWrite:false}));sprite.position.fromArray(p);sprite.scale.set(.9,.9,.9);scene.add(sprite);if(i%2===0){const l=new T.PointLight('#ffbd6d',7,6,2);l.position.fromArray(p);scene.add(l);lanterns.push(l);}});
 scene.updateMatrixWorld(true);
 const shoreRay=new T.Raycaster(new T.Vector3(-23,50,-27),new T.Vector3(0,-1,0));
 const shoreGround=scene.children.filter(o=>/Moss.*islands/i.test(o.name));
 const shoreHeight=(shoreRay.intersectObjects(shoreGround)[0]?.point.y??.6)+.18;
 const portalLink=createPortal({scene,camera,renderer,id:'watercourt',position:[-23,shoreHeight,-27],scale:.62,yaw:-2.356,onFocus:()=>{touring=false;window.dispatchEvent(new CustomEvent('journeychange',{detail:progress}));}});
 const renderTarget=new T.WebGLRenderTarget(innerWidth,innerHeight,{samples:4,type:T.HalfFloatType});const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.22,.45,1.35));composer.addPass(new OutputPass());
 let progress=0,targetProgress=0,t=0,playing=!reduced,touring=false,disposed=false,last=performance.now(),yaw=0,pitch=0,targetYaw=0,targetPitch=0,drag=null,manual=false;
 const path=new T.CatmullRomCurve3(chapters.map(c=>new T.Vector3(...c.position)),false,'catmullrom',.1),targets=new T.CatmullRomCurve3(chapters.map(c=>new T.Vector3(...c.target)),false,'catmullrom',.1);const pos=new T.Vector3(),look=new T.Vector3(),dir=new T.Vector3(),up=new T.Vector3(0,1,0);
 function cameraAt(p){if(portalLink.active)return;path.getPoint(T.MathUtils.clamp(p,0,1),pos);if(p>.75)pos.y+=12*Math.sin((p-.75)*Math.PI/.25)**2;targets.getPoint(T.MathUtils.clamp(p,0,1),look);camera.position.copy(pos);dir.copy(look).sub(pos);dir.applyAxisAngle(up,yaw);dir.y+=pitch*dir.length();camera.lookAt(pos.clone().add(dir));}
 function draw(v){time.value=v;atmosphere.update(v);lanterns.forEach((l,i)=>l.intensity=7+Math.sin(v*1.7+i)*.7);portalLink.update(time.value);composer.render();renderer.shadowMap.autoUpdate=false;}
 function animate(now){if(disposed)return;const dt=Math.min((now-last)/1000,.1);last=now;if(!document.hidden&&!manual){if(playing){t+=dt;if(touring&&!portalLink.active){targetProgress=Math.min(1,targetProgress+dt/48);if(targetProgress===1){touring=false;window.dispatchEvent(new CustomEvent('tourend'));}}}const a=reduced?1:1-Math.exp(-dt*3);progress+=(targetProgress-progress)*a;yaw+=(targetYaw-yaw)*a;pitch+=(targetPitch-pitch)*a;cameraAt(progress);draw(t);}requestAnimationFrame(animate);}
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch};renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;targetYaw=T.MathUtils.clamp(drag.yaw-(e.clientX-drag.x)*.0025,-1.05,1.05);targetPitch=T.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.0014,-.4,.4);});
 renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();touring=false;targetProgress=T.MathUtils.clamp(targetProgress+e.deltaY*.00018,0,1);window.dispatchEvent(new CustomEvent('journeychange',{detail:targetProgress}));},{passive:false});
 function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?54:44;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}
 window.addEventListener('resize',resize);cameraAt(0);draw(0);requestAnimationFrame(animate);
 return {portal:portalLink,scene,camera,renderer,go(index){touring=false;manual=false;targetProgress=index/(chapters.length-1);targetYaw=targetPitch=0;},setPlaying(v){playing=v;manual=false;},setTouring(v){touring=v;manual=false;if(v){playing=true;if(targetProgress>.985)targetProgress=0;}},getProgress:()=>progress,
 stats:()=>({meshes:originalMeshes,batches:groups.size,geometryTriangles:[...groups.values()].reduce((sum,g)=>sum+(g.geometry.index?g.geometry.index.count:g.geometry.attributes.position.count)/3*g.items.length,0),playing,touring,progress,time:t,camera:camera.position.toArray(),yaw,pitch}),
 capture(seconds,p){manual=true;playing=false;touring=false;progress=targetProgress=p;yaw=targetYaw=pitch=targetPitch=0;cameraAt(p);t=seconds;draw(t);return renderer.domElement.toDataURL('image/png');},
 dispose(){portalLink.dispose();disposed=true;window.removeEventListener('resize',resize);scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});composer.dispose();renderer.dispose();}
 };
}
