import * as T from 'three';
import {frameCorners} from 'three/addons/utils/CameraUtils.js';

// A perspective window into another actual location in this same scene.
// The exit rectangle determines an off-axis frustum; no screenshot or second
// world is used. The near plane coincides with the exit aperture.
export function createPortalWindows(world,{gardenGate,regions,sources,sun,hillSun,regionalLight,hemisphere,environment}){
 const {scene,camera,renderer}=world,records=new Map(),virtual=new T.PerspectiveCamera(),center=new T.Vector3(),size=new T.Vector3(),inverse=new T.Matrix4(),mapping=new T.Matrix4(),frustum=new T.Frustum(),pv=new T.Matrix4();
 const light=new T.DirectionalLight('#ffe0bc',0);light.name='Portal preview key light';light.castShadow=true;light.shadow.mapSize.set(512,512);Object.assign(light.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:260});light.shadow.autoUpdate=false;light.shadow.normalBias=.06;light.shadow.bias=-.0001;scene.add(light,light.target);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),baseFog=scene.fog.color.clone(),trackedLights=[sun,hillSun,regionalLight],mobile=()=>innerWidth<700;
 const fogStart={value:0},fogMaterials=new Map();
 // Fog inside a portal starts at its threshold, not at the distant virtual eye.
 // The shared uniform remains zero for the main camera and is restored per pass.
 function prepareFog(){scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material])){
  if(!m||m.fog===false||fogMaterials.has(m))continue;
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey;
  m.onBeforeCompile=function(shader,r){compile.call(this,shader,r);if(!shader.fragmentShader.includes('#include <fog_fragment>'))return;shader.uniforms.portalFogStart=fogStart;shader.fragmentShader='uniform float portalFogStart;\n'+shader.fragmentShader.replace('#include <fog_fragment>',T.ShaderChunk.fog_fragment.replaceAll('vFogDepth','max(0.,vFogDepth-portalFogStart)'));};
  m.customProgramCacheKey=function(){return key.call(this)+'|portal-fog-v1';};m.needsUpdate=true;
  const release=()=>{m.removeEventListener('dispose',release);m.onBeforeCompile=compile;m.customProgramCacheKey=key;fogMaterials.delete(m);};
  m.addEventListener('dispose',release);fogMaterials.set(m,{compile,key,release});
 }});}
 let active=null,last=-Infinity,frames=0,elapsed=0,disposed=false,errors=0;
 function frame(g){g.surface.updateWorldMatrix(true,false);g.surface.geometry.computeBoundingBox();const box=g.surface.geometry.boundingBox;box.getCenter(center);box.getSize(size);return new T.Matrix4().copy(g.surface.matrixWorld).multiply(new T.Matrix4().makeTranslation(center.x,center.y,center.z)).multiply(new T.Matrix4().makeScale(size.x*.5,size.y*.5,size.y*.5));}
 function attach(g){if(records.has(g))return records.get(g);const m=g.surface.material,old=m.fragmentShader,uv=old.includes('varying vec2 gateUv')?'gateUv':'vUv',uniforms={portalImage:{value:null},portalReady:{value:0}};Object.assign(m.uniforms,uniforms);m.fragmentShader='uniform sampler2D portalImage;uniform float portalReady;\n'+old.replace('#include <tonemapping_fragment>',`vec2 portalUv=${uv};
 float portalEdge=min(min(portalUv.x,1.-portalUv.x),min(portalUv.y,1.-portalUv.y));
 float liveMix=portalReady*smoothstep(0.,.035,portalEdge)${old.includes('varying float stoneEdge')?'*smoothstep(0.,1.,stoneEdge)':''};
 vec3 destination=texture2D(portalImage,portalUv).rgb;
 gl_FragColor.rgb=mix(gl_FragColor.rgb,destination,liveMix*.965);
 gl_FragColor.a=mix(gl_FragColor.a,1.,liveMix);
 #include <tonemapping_fragment>`);m.needsUpdate=true;const r={gate:g,material:m,original:old,uniforms,target:null,frames:0,ms:0,camera:[],projection:[],near:0,destination:g.destination};records.set(g,r);return r;}
 function visible(g){for(let p=g.surface;p;p=p.parent)if(!p.visible)return false;const f=frame(g),eye=camera.position.clone().applyMatrix4(inverse.copy(f).invert());if(eye.z<.08||eye.length()>65)return false;const bound=new T.Sphere();g.surface.geometry.computeBoundingSphere();bound.copy(g.surface.geometry.boundingSphere).applyMatrix4(g.surface.matrixWorld);if(!frustum.intersectsSphere(bound))return false;return true;}
 function render(r,destination){const start=performance.now(),g=r.gate,source=frame(g),exit=frame(destination);if(['forest','valley'].includes(destination.sourceRegion))exit.multiply(new T.Matrix4().makeRotationY(Math.PI));mapping.copy(exit).multiply(inverse.copy(source).invert());virtual.position.copy(camera.position).applyMatrix4(mapping);
  const corners=[[-1,-1,0],[1,-1,0],[-1,1,0]].map(p=>new T.Vector3(...p).applyMatrix4(exit));const normal=corners[1].clone().sub(corners[0]).cross(corners[2].clone().sub(corners[0])).normalize(),distance=virtual.position.clone().sub(corners[0]).dot(normal);if(distance<=.02)return;
  virtual.near=distance+.025;virtual.far=Math.max(1500,virtual.near+1200);frameCorners(virtual,...corners);virtual.updateMatrixWorld(true);
  const width=mobile()?288:448,ratio=corners[0].distanceTo(corners[2])/corners[0].distanceTo(corners[1]),height=Math.min(mobile()?512:768,Math.round(width*ratio));if(!r.target||r.target.width!==width||r.target.height!==height){r.target?.dispose();r.target=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:true});r.target.texture.name='Portal to '+g.destination;r.target.texture.colorSpace=T.LinearSRGBColorSpace;r.uniforms.portalImage.value=r.target.texture;}
  const saved={fogStart:fogStart.value,target:renderer.getRenderTarget(),auto:renderer.autoClear,shadow:renderer.shadowMap.needsUpdate,transmission:renderer.transmissionResolutionScale,background:scene.backgroundIntensity,env:scene.environmentIntensity,fog:scene.fog.color.clone(),density:scene.fog.density,hemi:hemisphere.intensity,light:trackedLights.map(l=>({intensity:l.intensity,needs:l.shadow.needsUpdate})),visibility:[],materials:[]};
  const visibility=(o,v)=>{if(o.visible!==v){saved.visibility.push([o,o.visible]);o.visible=v;}};
  const region=regions.find(x=>x.id===g.destination),night=environment.nightBlend,purple=g.destination==='forest'?1:0;
  try{
   for(const gate of gardenGate.gates)visibility(gate.surface,false);
   visibility(destination.group,false);if(destination.rim)visibility(destination.rim,false);
   for(const root of [...sources,...regions.map(r=>r.root).filter(Boolean)])visibility(root,true);
   scene.traverse(o=>{if(o.userData.botanicalNodes?.[0]?.region===g.destination&&o.parent)visibility(o.parent,true);if(o.name==='Living atmosphere · '+g.destination)visibility(o,true);});
   if(region?.root&&purple)region.root.traverse(o=>{if(o.isMesh&&/leaves|heather/i.test(o.material?.name||'')){if(!saved.materials.some(([m])=>m===o.material)){saved.materials.push([o.material,o.material.emissiveIntensity]);o.material.emissiveIntensity=.2;}}});
   for(const l of trackedLights){l.intensity=0;l.shadow.needsUpdate=false;}
   const target=virtual.position.clone().add(virtual.getWorldDirection(new T.Vector3()).multiplyScalar(virtual.near+25));light.target.position.copy(target);light.position.copy(target).add(new T.Vector3(-38,62,30));light.color.set(purple?'#e1c2f5':g.destination==='valley'?'#e4edf1':'#ffe0bd').lerp(new T.Color('#b6ccf5'),night);light.intensity=(g.destination==='aether'?4:purple?3.06:1.7)*(1-night*.76);light.shadow.needsUpdate=true;
   hemisphere.intensity=(g.destination==='aether'?.52:1.02)*(1-night*.36);scene.fog.color.copy(baseFog).lerp(new T.Color('#4d355c'),purple).lerp(new T.Color('#202f4d'),night*.78);scene.fog.density=.0028+purple*.0106;scene.backgroundIntensity=(1.65-purple*1.25)*(1-night*.93);scene.environmentIntensity=(.38-purple*.17)*(1-night*.46);
   fogStart.value=virtual.near;renderer.transmissionResolutionScale=.5;renderer.shadowMap.needsUpdate=true;renderer.autoClear=true;renderer.setRenderTarget(r.target);renderer.clear();renderer.render(scene,virtual);r.uniforms.portalReady.value=1;r.frames++;frames++;r.camera=virtual.position.toArray();r.projection=virtual.projectionMatrix.toArray();r.near=virtual.near;r.ms=performance.now()-start;elapsed+=r.ms;
  }catch(e){r.uniforms.portalReady.value=0;errors++;if(errors===1)console.warn('Portal preview unavailable; normal portal travel remains available.',e);}
  finally{fogStart.value=saved.fogStart;renderer.setRenderTarget(saved.target);renderer.autoClear=saved.auto;renderer.shadowMap.needsUpdate=saved.shadow;renderer.transmissionResolutionScale=saved.transmission;light.intensity=0;light.shadow.needsUpdate=false;trackedLights.forEach((l,i)=>{l.intensity=saved.light[i].intensity;l.shadow.needsUpdate=saved.light[i].needs;});hemisphere.intensity=saved.hemi;scene.backgroundIntensity=saved.background;scene.environmentIntensity=saved.env;scene.fog.color.copy(saved.fog);scene.fog.density=saved.density;for(const[o,v]of saved.visibility)o.visible=v;for(const[m,v]of saved.materials)m.emissiveIntensity=v;}
 }
 function update(){if(disposed)return;prepareFog();for(const g of gardenGate.gates)attach(g);camera.updateMatrixWorld();frustum.setFromProjectionMatrix(pv.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));const candidates=[];for(const[g,r]of records){const destination=gardenGate.gates.find(x=>x.sourceRegion===g.destination),region=regions.find(x=>x.id===g.destination);if(!destination||region?.status!=='ready'){r.uniforms.portalReady.value=0;continue;}if(visible(g))candidates.push({r,destination,distance:g.surface.getWorldPosition(new T.Vector3()).distanceToSquared(camera.position)});else r.uniforms.portalReady.value=0;}
  candidates.sort((a,b)=>a.distance-b.distance);const choice=candidates[0];active=choice?.r||null;const now=performance.now();if(!choice)return;const changed=choice.r.gate!==update.previous,interval=mobile()?125:83;if(!changed&&now-last<interval)return;
  // Reduced motion freezes ambient re-renders but still responds to viewpoint changes.
  const pose=camera.matrixWorld.elements.join(',')+'|'+environment.nightBlend.toFixed(2)+'|'+mobile();if(reduced.matches&&!changed&&choice.r.pose===pose&&choice.r.frames&&choice.r.uniforms.portalReady.value)return;last=now;update.previous=choice.r.gate;choice.r.pose=pose;render(choice.r,choice.destination);
 }
 return{update,records,frame,stats:()=>({active:active?.gate.sourceRegion||null,destination:active?.destination||null,frames,meanMs:frames?elapsed/frames:0,errors,portals:[...records.values()].map(r=>({source:r.gate.sourceRegion,destination:r.destination,ready:r.uniforms.portalReady.value,frames:r.frames,ms:r.ms,near:r.near,camera:r.camera,projection:r.projection,resolution:r.target?[r.target.width,r.target.height]:null}))}),dispose(){disposed=true;for(const [m,old]of fogMaterials){m.removeEventListener('dispose',old.release);m.onBeforeCompile=old.compile;m.customProgramCacheKey=old.key;m.needsUpdate=true;}fogMaterials.clear();for(const r of records.values()){r.material.fragmentShader=r.original;delete r.material.uniforms.portalImage;delete r.material.uniforms.portalReady;r.material.needsUpdate=true;r.target?.dispose();}light.removeFromParent();light.target.removeFromParent();light.dispose();}};
}
