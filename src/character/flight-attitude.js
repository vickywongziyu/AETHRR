import {MathUtils} from 'three';

// The visual pivot is separate from the yaw-only explorer root, so cloth still
// receives world gravity while the traveler pitches into climbs and descents.
export function createFlightAttitude(pivot){
 let pitch=0,vertical=0;
 const state={motion:'ground',pitch:0,verticalSpeed:0};
 return {state,update(dt,{flying=false,verticalSpeed=0,reset=false}={}){
  if(!flying||reset){pitch=0;vertical=0;}else{
   vertical=MathUtils.damp(vertical,verticalSpeed,6,Math.min(.05,Math.max(0,dt)));
   const target=vertical<-.35?.52*MathUtils.clamp(-vertical/12,0,1):vertical>.35?-.17*MathUtils.clamp(vertical/12,0,1):0;
   pitch=MathUtils.damp(pitch,target,5,Math.min(.05,Math.max(0,dt)));
  }
  pivot.rotation.x=pitch;
  state.motion=!flying?'ground':vertical>1?'ascend':vertical< -1?'descend':'level';
  state.pitch=pitch;state.verticalSpeed=vertical;
 }};
}
