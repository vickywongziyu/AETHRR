import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { createForestNavigation } from './navigation.js';
import './explorer.css';
import {createLocomotion,TRAVEL_SPEED} from './locomotion.js';
export async function createExplorer({scene,camera,renderer,source,portal,onMode=()=>{}}){
  const draco=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'forest/draco/');
  const loader=new GLTFLoader().setDRACOLoader(draco);
  let gltf;
  try{gltf=await loader.loadAsync(import.meta.env.BASE_URL+'character/mira-grounded-run-v5.glb');}
  finally{draco.dispose();}
  const avatar=gltf.scene;avatar.name='Mira_Meshy_Traveler';avatar.visible=false;avatar.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});scene.add(avatar);
  const locomotion=createLocomotion(avatar,gltf.animations);let animation='Idle';
  const nav=createForestNavigation(source),position=new T.Vector3(0,0,5);position.y=nav.height(position.x,position.z)??0;
  avatar.position.copy(position);avatar.rotation.y=Math.PI;
  // Gentle fill keeps black hair and dark wool readable under the forest canopy.
  const fill=new T.PointLight('#dddcf8',3.4,6,2);scene.add(fill);fill.visible=false;
  const start=document.createElement('button');start.className='explorer-start';start.textContent='跟随旅人探索';document.querySelector('.hero').append(start);
  const hud=document.createElement('div');hud.className='explorer-hud';hud.innerHTML='<div><strong>米拉 · 林间旅人 <span class="walk-status">驻足</span></strong><small>方向键 / WASD 行走　·　Shift 跑步　·　拖动环顾　·　E 触碰光门</small></div><button class="explorer-exit">返回观景</button>';
  hud.dataset.model='mira-no-cloak';
  const prompt=document.createElement('button');prompt.className='explorer-prompt';prompt.textContent='E · 触碰光门';prompt.dataset.near='false';
  const pad=document.createElement('div');pad.className='explorer-pad';pad.setAttribute('aria-label','角色移动');pad.innerHTML=[['ArrowUp','↑','向前走'],['ArrowLeft','←','向左走'],['ArrowDown','↓','向后走'],['ArrowRight','→','向右走'],['ShiftLeft','跑','按住跑步']].map(([key,text,label])=>`<button data-key="${key}" aria-label="${label}">${text}</button>`).join('');document.body.append(hud,prompt,pad);
  let active=false,orbitYaw=0,pitch=.35,distance=4.8,drag=null,disposed=false,near=false,lastCollision=false;
  const keys=new Set(),desired=new T.Vector3(),target=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),velocity=new T.Vector3(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),ray=new T.Raycaster();
  const cameraSolids=[];scene.traverse(o=>{if(o.isMesh&&/Sanctuary.architecture|Fallen.ruins|Forest.floor|Mossy.stone/i.test(o.name))cameraSolids.push(o);});
  function setAnimation(name){animation=name;hud.querySelector('.walk-status').textContent={Idle:'驻足',Walk:'行走',Run:'奔跑'}[name];}
  function enter(){if(disposed)return;active=true;avatar.visible=fill.visible=true;keys.clear();document.body.classList.add('exploring');onMode(true);renderer.domElement.focus({preventScroll:true});update(0,true);}
  function exit(){if(!active)return;active=false;avatar.visible=fill.visible=false;keys.clear();setAnimation('Idle');document.body.classList.remove('exploring');prompt.dataset.near='false';onMode(false);}
  start.onclick=enter;hud.querySelector('button').onclick=exit;
  function interact(){if(active&&near&&!portal.active){keys.clear();portal.open();}}
  prompt.onclick=interact;
  const movement=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight']);
  function keyDown(e){if(!active||document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(movement.has(e.code)){e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();interact();}else if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();}}
  function keyUp(e){keys.delete(e.code);if(active&&movement.has(e.code)){e.preventDefault();e.stopImmediatePropagation();}}
  function resetInput(){keys.clear();drag=null;}
  window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',resetInput);
  function down(e){if(!active||e.button!==0)return;drag=[e.clientX,e.clientY,orbitYaw,pitch];renderer.domElement.setPointerCapture(e.pointerId);}
  function move(e){if(!active||!drag)return;orbitYaw=drag[2]-(e.clientX-drag[0])*.004;pitch=T.MathUtils.clamp(drag[3]+(e.clientY-drag[1])*.003,-.05,.9);}
  function release(){drag=null;}
  function wheel(e){if(!active)return;e.preventDefault();e.stopImmediatePropagation();distance=T.MathUtils.clamp(distance+e.deltaY*.004,2.5,7);}
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);renderer.domElement.addEventListener('wheel',wheel,{capture:true,passive:false});
  pad.querySelectorAll('button').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);};button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);});
  function update(dt,snap=false){if(!active||disposed)return;if(document.hidden){resetInput();return;}
    const blocked=!!document.querySelector('dialog[open]');if(blocked)keys.clear();
    const f=Number(keys.has('ArrowUp')||keys.has('KeyW'))-Number(keys.has('ArrowDown')||keys.has('KeyS')),r=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
    forward.set(-Math.sin(orbitYaw),0,-Math.cos(orbitYaw));right.set(Math.cos(orbitYaw),0,-Math.sin(orbitYaw));velocity.copy(forward).multiplyScalar(f).addScaledVector(right,r);
    const running=keys.has('ShiftLeft')||keys.has('ShiftRight');let moving=false,actualSpeed=0;
    if(velocity.lengthSq()&&!blocked){velocity.normalize();const before=position.clone(),step=(running?TRAVEL_SPEED.run:TRAVEL_SPEED.walk)*Math.min(dt,.05);const success=nav.move(position,velocity.x*step,velocity.z*step);lastCollision=!success;actualSpeed=Math.hypot(position.x-before.x,position.z-before.z)/Math.max(dt,.0001);moving=actualSpeed>.001;
      if(moving){q.setFromAxisAngle(up,Math.atan2(velocity.x,velocity.z));avatar.quaternion.slerp(q,1-Math.exp(-dt*13));}}
    setAnimation(moving?(running?'Run':'Walk'):'Idle');locomotion.update(blocked?0:dt,{moving,running,speed:actualSpeed});avatar.position.copy(position);fill.position.copy(position).add(new T.Vector3(0,2.4,1.4));
    // Expose the rendered travel state for browser diagnostics without extra HUD text.
    hud.dataset.position=position.toArray().map(n=>n.toFixed(3)).join(',');hud.dataset.animation=animation;
    if(moving)hud.dataset.lastLocomotion=animation;
    const gate=portal.group.position;near=Math.hypot(position.x-gate.x,position.z-gate.z)<3.2;prompt.dataset.near=String(near&&!blocked);
    if(portal.active)return;
    target.copy(position).add(new T.Vector3(0,1.25,0));desired.copy(target).add(new T.Vector3(Math.sin(orbitYaw)*distance,1.1+Math.sin(pitch)*2.4,Math.cos(orbitYaw)*distance));
    const dir=desired.clone().sub(target),length=dir.length();ray.set(target,dir.normalize());ray.far=length;
    let safe=length;const hit=ray.intersectObjects(cameraSolids,false)[0];if(hit)safe=Math.max(.9,hit.distance-.25);
    // Tree trunks use lightweight analytical camera collisions.
    for(const o of nav.circles){if(o.kind!=='tree')continue;const rel=new T.Vector3(o.x-target.x,0,o.z-target.z),along=rel.x*dir.x+rel.z*dir.z;if(along<0||along>safe)continue;const d2=(rel.x-dir.x*along)**2+(rel.z-dir.z*along)**2;if(d2<(o.r+.2)**2)safe=Math.max(.9,along-o.r-.3);}
    desired.copy(target).addScaledVector(dir,safe);const floor=nav.height(desired.x,desired.z);if(floor!==null)desired.y=Math.max(desired.y,floor+.35);
    if(snap)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*8));camera.lookAt(target);
  }
  return {get active(){return active;},avatar,enter,exit,update,position,nav,stats:()=>({active,animation,position:position.toArray(),nearPortal:near,colliders:nav.circles.length,lastCollision,clips:locomotion.clips}),dispose(){disposed=true;exit();locomotion.dispose();start.remove();hud.remove();prompt.remove();pad.remove();window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);window.removeEventListener('blur',resetInput);document.removeEventListener('visibilitychange',resetInput);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',release);renderer.domElement.removeEventListener('pointercancel',release);renderer.domElement.removeEventListener('wheel',wheel,true);}};
}
