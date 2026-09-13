import * as T from 'three';
import {createInteriorCamera} from './interior-camera.js';
import './building-inspection.css';

export function createBuildingInspection(world,architecture,{gathering,isBlocked,getRegion,nav}){
 const {camera,controls}=world,button=document.createElement('button'),panel=document.createElement('div');let selected=null,inside=false,index=-1;const lastAnchor=new T.Vector3();
 const interiorCamera=createInteriorCamera(world,{nav,isBlocked});
 const defaultFov=camera.fov,defaultMin=controls.minDistance;
 const lights=[new T.PointLight('#ffd49e',0,18,2),new T.PointLight('#a8c2ce',0,15,2)];world.scene.add(...lights);
 button.className='architecture-nearby';button.textContent='建筑近观';button.setAttribute('aria-label','查看本区域建筑');document.querySelector('.herb-nearby').before(button);
 panel.className='architecture-inspection';panel.hidden=true;panel.innerHTML='<div><small>建筑近观</small><strong></strong></div><nav aria-label="建筑观察视角"><button data-view="outside">外观</button><button data-view="inside">室内</button><button data-view="next">下一处 ›</button><button data-view="close" aria-label="退出建筑近观">×</button></nav>';document.body.append(panel);
 function focus(record,interior=false,{lightScale}={}){if(!record||isBlocked())return false;lightScale??=record.district?({watercourt:0,valley:.22,forest:.25,aether:.3}[record.region]??1):(record.region==='aether'&&record.type==='shrine'?.2:1);interiorCamera.end();gathering.cancel({clearSelection:true});world.cancelCameraMotion();selected=record;index=architecture.records.filter(r=>r.region===getRegion()&&r.inspect!==false).indexOf(record);inside=interior;if(interior)record.onEnter?.();record.root.updateWorldMatrix(true,false);nav.sync();record.root.getWorldPosition(lastAnchor);const eye=new T.Vector3(...(interior?record.interior:record.exterior)),target=new T.Vector3(...(interior?record.target:record.look));record.root.localToWorld(eye);record.root.localToWorld(target);
  if(!interior){const offset=eye.clone().sub(target),angleStep=Math.PI/6,scale=record.root.getWorldScale(new T.Vector3()).x;let best=Infinity;
   for(const n of (record.exteriorAngles||[0,1,-1,2,-2,3,-3,4,-4,5,-5,6])){const candidate=offset.clone().applyAxisAngle(new T.Vector3(0,1,0),n*angleStep).add(target),direction=target.clone().sub(candidate).normalize(),side=direction.clone().cross(new T.Vector3(0,1,0)).normalize();let score=nav.obstructed(candidate,candidate,1.2*scale)?30:0;
    for(const lateral of [-1,0,1])for(const vertical of [-.5,.5]){const start=candidate.clone().addScaledVector(side,lateral*.7*scale).add(new T.Vector3(0,vertical*scale,0)),end=start.clone().lerp(target.clone().addScaledVector(side,lateral*record.radius*.6*scale),.66);if(nav.obstructed(start,end,.18))score+=3;}
    score+=Math.abs(n)*.02;if(score<best){best=score;eye.copy(candidate);}
   }
  }
  const scale=record.root.getWorldScale(new T.Vector3()).x;lights.forEach((l,i)=>{l.intensity=interior?([22,8][i]*scale*scale*lightScale):0;l.distance=(i?12:16)*scale;l.position.copy(record.root.localToWorld(new T.Vector3(i?-1:1,2.3,i?1:-.6)));});
  camera.fov=interior?74:(record.exteriorFov||defaultFov);camera.updateProjectionMatrix();controls.minDistance=interior?.4:defaultMin;camera.position.copy(eye);controls.target.copy(target);camera.lookAt(target);controls.update();if(interior)interiorCamera.begin(record);document.body.dataset.atlasInspecting='true';panel.hidden=false;panel.querySelector('strong').textContent=record.name;panel.querySelector('[data-view=inside]').setAttribute('aria-pressed',String(interior));panel.querySelector('[data-view=outside]').setAttribute('aria-pressed',String(!interior));return true;
 }
 function close(){interiorCamera.end();delete document.body.dataset.atlasInspecting;panel.hidden=true;selected=null;inside=false;lights.forEach(l=>l.intensity=0);camera.fov=defaultFov;camera.updateProjectionMatrix();controls.minDistance=defaultMin;}
 function next(){const options=architecture.records.filter(r=>r.region===getRegion()&&r.inspect!==false);if(!options.length)return;index=(index+1)%options.length;focus(options[index]);}
 button.onclick=()=>{index=-1;next();};panel.querySelector('[data-view=next]').onclick=next;panel.querySelector('[data-view=inside]').onclick=()=>focus(selected,true);panel.querySelector('[data-view=outside]').onclick=()=>focus(selected,false);panel.querySelector('[data-view=close]').onclick=close;
 const escape=e=>{if(e.code==='Escape'&&!document.querySelector('dialog[open]'))close();};window.addEventListener('keydown',escape);document.querySelector('.herb-nearby').addEventListener('click',close);
 function update(){if(!selected)return;const anchor=selected.root.getWorldPosition(new T.Vector3()),delta=anchor.clone().sub(lastAnchor);if(delta.lengthSq()>0){camera.position.add(delta);controls.target.add(delta);lights.forEach(l=>l.position.add(delta));}lastAnchor.copy(anchor);interiorCamera.update();}
 return{focus,close,update,interiorCamera,validInteriorEye:interiorCamera.validEye,get selected(){return selected?.id||null;},get inside(){return inside;},get fov(){return inside?interiorCamera.fov:selected?.exteriorFov;},dispose(){interiorCamera.dispose();button.remove();panel.remove();lights.forEach(l=>{l.removeFromParent();l.dispose();});window.removeEventListener('keydown',escape);document.querySelector('.herb-nearby')?.removeEventListener('click',close);}};
}
