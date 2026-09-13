import * as T from 'three';

// Metres/second measured from the planted toe's backward travel in each clip.
// Translation and animation must agree, including when collision slows a step.
export const GAIT_SPEED={Walk:.8642,Run:3.7392};
export const TRAVEL_SPEED={walk:.85,run:3.6};
export function createLocomotion(avatar,clips){
 const mixer=new T.AnimationMixer(avatar),actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));
 let animation='Idle',rate=1;actions.get(animation)?.play();
 return {get animation(){return animation;},get playbackRate(){return rate;},get clips(){return [...actions.keys()];},
  update(dt,{moving=false,running=false,flying=false,speed=0}={}){
   const flight=flying&&actions.has('Hover');
   const name=flight?(moving&&speed>.2&&actions.has('Glide')?'Glide':'Hover'):moving&&!flying?(running?'Run':'Walk'):'Idle';
   if(name!==animation){const previous=actions.get(animation),next=actions.get(name);if(next){
    const airborne=flight||animation==='Hover'||animation==='Glide';
    const phase=previous?previous.time/previous.getClip().duration:0;
    next.reset().setEffectiveWeight(1).play();
    if(flight&&(animation==='Hover'||animation==='Glide'))next.time=phase*next.getClip().duration;
    if(previous)next.crossFadeFrom(previous,airborne?.55:.2,false);
   }animation=name;}
   rate=name==='Glide'?1+T.MathUtils.clamp(speed/50,0,1)*.2:name==='Idle'||name==='Hover'?1:T.MathUtils.clamp(speed/GAIT_SPEED[name],.12,1.8);
   actions.get(animation)?.setEffectiveTimeScale(rate);mixer.update(dt);
  },dispose(){mixer.stopAllAction();mixer.uncacheRoot(avatar);}
 };
}
