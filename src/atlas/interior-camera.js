import * as T from 'three';
import sites from './building-sites.json';
import {tentRadius} from './highland-sculpture.js';

// Authored architectural dimensions, in each building's own Y-up coordinates.
// Views stay inside even when an open door or window has no collision triangle.
export function interiorEnvelope(record){
 let w,d,h,floor=0,round=false,tent=null;
 if(record.def){({w,d,h}=record.def);}
 else if(record.type==='shop'){w=4.8;d=4.6;h=3.25;floor=.15;}
 else if(record.region==='highland'&&['house','tent'].includes(record.type)){
  const b=sites.buildings.find(b=>Math.abs(b.x-record.root.position.x)<.001&&Math.abs(b.z-record.root.position.y)<.001&&Math.abs(-b.y-record.root.position.z)<.001);if(b){({w,d,h}=b);if(record.type==='tent')tent=b;}
 }else if(record.region==='valley'&&record.type==='house'){w=6.5;d=5.2;h=3.3;}
 else if(record.type==='watchtower'){w=d=3.3;floor=9.18;h=12.1;}
 else if(record.type==='star-hall'){round=true;w=record.radius*2;h=4.3;}
 else if(['pavilion','shrine'].includes(record.type)){round=true;w=record.radius*2;floor=record.type==='shrine'?.9:.65;h=record.type==='shrine'?floor+record.height:record.height;}
 else return {kind:'open-site',contains:p=>Number.isFinite(p.x+p.y+p.z),description:'Open-air landmark; no enclosed room claimed'};
 const margin=.22,minY=floor+.18,maxY=Math.max(minY+.3,h-.22),kind=tent?'tapered-tent':round?'circular-room':'box-room';
 return{kind,width:w,depth:d||w,minY,maxY,contains(p){if(!Number.isFinite(p.x+p.y+p.z)||p.y<minY||p.y>maxY)return false;if(tent)return Math.hypot(p.x,p.z)<tentRadius(tent,p.y/tent.h)-margin;if(round)return Math.hypot(p.x,p.z)<w*.5*Math.cos(Math.PI/8)-margin;return Math.abs(p.x)<w*.5-margin&&Math.abs(p.z)<d*.5-margin;}};
}

export function createInteriorCamera(world,{nav,isBlocked}){
 const {camera,controls,renderer}=world,canvas=renderer.domElement,pointers=new Map(),keys=new Set();
 let record=null,envelope=null,saved=null,fov=74,yaw=0,pitch=0,distance=2,gesture=false,pinch=null,last=performance.now(),corrections=0,rotations=0,zooms=0;
 const safeLocal=new T.Vector3(),checkedLocal=new T.Vector3(),direction=new T.Vector3();
 const live=()=>!!record&&!isBlocked()&&!document.hidden&&document.body.dataset.visitorHidden!=='true';
 function syncLook(){direction.copy(controls.target).sub(camera.position);distance=Math.max(.1,direction.length());direction.normalize();yaw=Math.atan2(direction.x,-direction.z);pitch=Math.asin(T.MathUtils.clamp(direction.y,-1,1));}
 function aim(){pitch=T.MathUtils.clamp(pitch,-Math.PI*.455,Math.PI*.455);direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));controls.target.copy(camera.position).addScaledVector(direction,distance);camera.lookAt(controls.target);rotations++;}
 function lens(){const tangent=Math.tan(T.MathUtils.degToRad(fov*.5));camera.near=Math.min(.06,.10/Math.sqrt(1+tangent*tangent*(1+camera.aspect*camera.aspect)));camera.fov=fov;camera.updateProjectionMatrix();}
 function release(){for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();keys.clear();pinch=null;gesture=false;}
 function validEye(position){if(!record)return true;record.root.updateWorldMatrix(true,false);const p=record.root.worldToLocal(position.clone());return envelope.contains(p)&&!nav.obstructed(position,position,.12);}
 function begin(r){end();record=r;envelope=interiorEnvelope(r);saved={enabled:controls.enabled,rotate:controls.enableRotate,pan:controls.enablePan,zoom:controls.enableZoom,damping:controls.enableDamping,min:controls.minDistance,max:controls.maxDistance,minPolar:controls.minPolarAngle,maxPolar:controls.maxPolarAngle,near:camera.near,label:canvas.getAttribute('aria-label')};
  // OrbitControls.update also runs while disabled. Flush its previous inertia,
  // then keep its spherical limits from moving an indoor eye during look-around.
  controls.enableDamping=false;controls.update();controls.enabled=false;controls.enableRotate=controls.enablePan=controls.enableZoom=false;controls.minDistance=.01;controls.maxDistance=Infinity;controls.minPolarAngle=.001;controls.maxPolarAngle=Math.PI-.001;
  record.root.updateWorldMatrix(true,false);safeLocal.copy(record.root.worldToLocal(camera.position.clone()));checkedLocal.copy(safeLocal);fov=74;lens();syncLook();last=performance.now();document.body.dataset.interiorCamera='look';canvas.setAttribute('aria-label','建筑室内：拖动或方向键环顾，滚轮或双指调整视野，Escape 退出');
 }
 function end(){release();if(saved){Object.assign(controls,{enabled:saved.enabled,enableRotate:saved.rotate,enablePan:saved.pan,enableZoom:saved.zoom,enableDamping:saved.damping,minDistance:saved.min,maxDistance:saved.max,minPolarAngle:saved.minPolar,maxPolarAngle:saved.maxPolar});camera.near=saved.near;camera.updateProjectionMatrix();if(saved.label===null)canvas.removeAttribute('aria-label');else canvas.setAttribute('aria-label',saved.label);}record=null;envelope=null;saved=null;delete document.body.dataset.interiorCamera;}
 function update(){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(!record)return;if(document.body.dataset.homeEditing!=='true')lens();record.root.updateWorldMatrix(true,false);const local=record.root.worldToLocal(camera.position.clone());
  if(local.distanceToSquared(checkedLocal)>1e-10){if(validEye(camera.position)){safeLocal.copy(local);}else{const correction=record.root.localToWorld(safeLocal.clone()).sub(camera.position);camera.position.add(correction);controls.target.add(correction);camera.lookAt(controls.target);corrections++;}checkedLocal.copy(record.root.worldToLocal(camera.position.clone()));}
  if(!live()){release();return;}if(keys.size){syncLook();yaw+=((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*.85;pitch+=((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*.7;aim();}
 }
 function pointerDown(e){if(!live()||![0,2].includes(e.button))return;syncLook();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});if(pointers.size===1)gesture=false;else{gesture=true;const ps=[...pointers.values()];pinch={distance:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),fov};}canvas.setPointerCapture(e.pointerId);e.preventDefault();}
 function pointerMove(e){const old=pointers.get(e.pointerId);if(!old||!live())return;const dx=e.clientX-old.x,dy=e.clientY-old.y;old.x=e.clientX;old.y=e.clientY;if(Math.hypot(old.x-old.startX,old.y-old.startY)>6)gesture=true;
  if(pointers.size>1&&pinch){const ps=[...pointers.values()],gap=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);fov=T.MathUtils.clamp(pinch.fov*pinch.distance/Math.max(12,gap),48,84);zooms++;lens();}
  else{yaw-=dx*.0032;pitch-=dy*.0032;aim();}e.preventDefault();}
 function pointerUp(e){if(!pointers.has(e.pointerId))return;const moved=gesture;pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);pinch=null;if(pointers.size===0)gesture=false;if(moved){e.preventDefault();e.stopImmediatePropagation();}}
 function wheel(e){if(!live())return;e.preventDefault();e.stopImmediatePropagation();fov=T.MathUtils.clamp(fov+e.deltaY*.018,48,84);zooms++;lens();}
 const keyDown=e=>{if(!live()||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||!/^Arrow(Left|Right|Up|Down)$/.test(e.code))return;keys.add(e.code);e.preventDefault();e.stopImmediatePropagation();},keyUp=e=>keys.delete(e.code),context=e=>{if(record)e.preventDefault();};
 canvas.addEventListener('pointerdown',pointerDown,true);canvas.addEventListener('pointermove',pointerMove,true);canvas.addEventListener('pointerup',pointerUp,true);canvas.addEventListener('pointercancel',release,true);canvas.addEventListener('wheel',wheel,{capture:true,passive:false});canvas.addEventListener('contextmenu',context);window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 return{begin,end,update,validEye,get active(){return !!record;},get outdoorDamping(){return saved?.damping??controls.enableDamping;},get fov(){return fov;},stats:()=>({active:!!record,id:record?.id,kind:envelope?.kind,fov,pointers:pointers.size,keys:keys.size,corrections,rotations,zooms,localEye:record?record.root.worldToLocal(camera.position.clone()).toArray():null,contained:record?envelope.contains(record.root.worldToLocal(camera.position.clone())):true}),dispose(){end();canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointermove',pointerMove,true);canvas.removeEventListener('pointerup',pointerUp,true);canvas.removeEventListener('pointercancel',release,true);canvas.removeEventListener('wheel',wheel,true);canvas.removeEventListener('contextmenu',context);window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);}};
}
