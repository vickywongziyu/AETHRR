import {cameraInputEnabled,restoreCameraInput} from './camera-input.js';
import * as T from 'three';

// Short, collision-checked camera dollies. The world transfer retains the
// existing arrival views; this never sends the observer through solid walls.
export function createPortalPassage(world,nav){
 const {camera,controls}=world;
 let motion=null,disposed=false;
 function animate(to,aim,ms,signal){
  if(disposed||signal.aborted)return Promise.resolve();
  const from=camera.position.clone(),look=controls.target.clone();
  return new Promise(resolve=>{motion={from,look,to,aim,ms,signal,start:performance.now(),resolve};});
 }
 function update(){
  if(!motion)return;
  const m=motion;
  if(disposed||m.signal.aborted){motion=null;m.resolve();return;}
  const t=Math.min(1,(performance.now()-m.start)/m.ms),u=t*t*(3-2*t);
  camera.position.lerpVectors(m.from,m.to,u);controls.target.lerpVectors(m.look,m.aim,u);camera.lookAt(controls.target);camera.updateMatrixWorld(true);
  if(t===1){motion=null;m.resolve();}
 }
 function prepare(gate){
  const original={position:camera.position.clone(),target:controls.target.clone(),enabled:cameraInputEnabled(world),damping:world.atlas?.buildings?.interiorCamera.outdoorDamping??controls.enableDamping};
  let locked=false,arrival=null;
  function lock(){world.cancelCameraMotion();controls.enableDamping=false;controls.update();controls.enabled=false;locked=true;}
  return {
   async approach(signal){
    lock();if(world.atlas?.buildings?.interiorCamera.active)return;gate.surface.updateWorldMatrix(true,false);gate.surface.geometry.computeBoundingBox();
    const aim=gate.surface.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(gate.surface.matrixWorld),distance=camera.position.distanceTo(aim);
    const amount=Math.min(7.5,Math.max(0,distance-6.2));
    const to=camera.position.clone().lerp(aim,amount/Math.max(.01,distance));
    nav.sync();if(amount<.1||nav.obstructed(camera.position,to,.18))return;
    await animate(to,aim,650,signal);
   },
   async arrive(signal){
    if(!locked)lock();arrival={position:camera.position.clone(),target:controls.target.clone()};
    const away=camera.position.clone().sub(controls.target).normalize(),from=camera.position.clone().addScaledVector(away,1.2);
    nav.sync();if(nav.obstructed(from,camera.position,.18))return;
    camera.position.copy(from);await animate(arrival.position,arrival.target,440,signal);
   },
   finish(committed){
    const restore=committed?arrival:original;
    if(restore){camera.position.copy(restore.position);controls.target.copy(restore.target);camera.lookAt(controls.target);}
    if(locked){restoreCameraInput(world,original.enabled);controls.enableDamping=world.atlas?.buildings?.interiorCamera.active?false:original.damping;controls.update();}
   }
  };
 }
 return{prepare,update,dispose(){disposed=true;if(motion){motion.resolve();motion=null;}}};
}
