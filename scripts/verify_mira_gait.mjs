import * as T from 'three';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createLocomotion,TRAVEL_SPEED,GAIT_SPEED} from '../src/character/locomotion.js';
import fs from 'node:fs';
const b=fs.readFileSync(fileURLToPath(new URL('../public/character/mira-grounded-run-v5.glb',import.meta.url))),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len);
const objects=j.nodes.map(n=>{const o=new T.Object3D();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);return o;});
j.nodes.forEach((n,i)=>n.children?.forEach(c=>objects[i].add(objects[c])));const root=new T.Group();j.scenes[j.scene||0].nodes.forEach(i=>root.add(objects[i]));
function read(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type],array=[];for(let k=0;k<a.count*size;k++)array.push(bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+k*4));return array;}
const clips=j.animations.map(an=>{const tracks=an.channels.map(ch=>{const sampler=an.samplers[ch.sampler],times=read(sampler.input),values=read(sampler.output);assert.equal(times[0],0,'No held first frame');const width=ch.target.path==='rotation'?4:3;for(let axis=0;axis<width;axis++)assert(Math.abs(values[axis]-values[values.length-width+axis])<.002,an.name+' loop seam');const target=objects[ch.target.node].uuid+'.'+{translation:'position',rotation:'quaternion',scale:'scale'}[ch.target.path];return new (ch.target.path==='rotation'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(target,times,values);});return new T.AnimationClip(an.name,-1,tracks);});
assert.deepEqual(j.nodes.filter(n=>n.mesh!==undefined).map(n=>n.name),['char1']);
const motion=createLocomotion(root,clips);
motion.update(.25,{moving:true,speed:TRAVEL_SPEED.walk});assert.equal(motion.animation,'Walk');assert(Math.abs(motion.playbackRate*GAIT_SPEED.Walk-TRAVEL_SPEED.walk)<1e-8);
const fullRate=motion.playbackRate;motion.update(.1,{moving:true,speed:TRAVEL_SPEED.walk*.5});assert(Math.abs(motion.playbackRate-fullRate*.5)<1e-8,'Slow against obstacles without foot skating');
motion.update(.25,{moving:true,running:true,speed:TRAVEL_SPEED.run});assert.equal(motion.animation,'Run');assert(Math.abs(motion.playbackRate*GAIT_SPEED.Run-TRAVEL_SPEED.run)<1e-8);
motion.update(.25,{moving:false,speed:0});assert.equal(motion.animation,'Idle');root.updateMatrixWorld(true);assert(objects.every(o=>o.position.toArray().every(Number.isFinite)&&o.quaternion.toArray().every(Number.isFinite)));
motion.update(.25,{moving:true,flying:true,speed:18});assert.equal(motion.animation,'Idle');motion.dispose();
console.log('PASS: seamless loops, no cloak, walk/run speed synchronization, collision slowdown, stop and flight transitions.');

const sampler=new T.AnimationMixer(root);sampler.clipAction(clips.find(c=>c.name==='Walk')).play();let width=0,stride=0,arms=0;const get=name=>objects.find(o=>o.name===name).getWorldPosition(new T.Vector3());
for(let i=0;i<128;i++){sampler.setTime(i/128*clips.find(c=>c.name==='Walk').duration);root.updateMatrixWorld(true);const l=get('LeftFoot'),r=get('RightFoot');width=Math.max(width,Math.abs(l.x-r.x));stride=Math.max(stride,Math.abs(l.z-r.z));arms=Math.max(arms,Math.abs(get('LeftHand').z-get('RightHand').z));}
assert(width<.17,`Walking stance too wide: ${width}`);assert(stride<.43,`Walking stride too long: ${stride}`);assert(arms<.25,`Arm swing too large: ${arms}`);sampler.stopAllAction();console.log('SOFT_GAIT_PASS',{width,stride,arms});

const symmetryMixer=new T.AnimationMixer(root),walkClip=clips.find(c=>c.name==='Walk');symmetryMixer.clipAction(walkClip).play();const rows=[];
for(let i=0;i<128;i++){symmetryMixer.setTime(i/128*walkClip.duration);root.updateMatrixWorld(true);const row={};for(const side of ['Left','Right']){const h=get(side+'UpLeg'),k=get(side+'Leg'),f=get(side+'Foot');row[side]={foot:f.toArray(),flex:T.MathUtils.radToDeg(Math.PI-h.sub(k).angleTo(f.clone().sub(k)))};}rows.push(row);}
const kneeError=Math.max(...rows.map((r,i)=>Math.abs(r.Left.flex-rows[(i+64)%128].Right.flex))),forwardError=Math.max(...rows.map((r,i)=>Math.abs(r.Left.foot[2]-rows[(i+64)%128].Right.foot[2]))),minimumFlex=Math.min(...rows.flatMap(r=>[r.Left.flex,r.Right.flex]));
assert(kneeError<1,`Unequal knee timing: ${kneeError}`);assert(forwardError<.001,`Unequal stride: ${forwardError}`);assert(minimumFlex>10,`Knee reaches straight-leg limit: ${minimumFlex}`);symmetryMixer.stopAllAction();console.log('BALANCED_GAIT_PASS',{kneeError,forwardError,minimumFlex});

// Running must remain centered even as the heels lift behind the body.
const runMixer=new T.AnimationMixer(root),runClip=clips.find(c=>c.name==='Run'),runRows=[];
runMixer.clipAction(runClip).play();
for(let i=0;i<128;i++){
 runMixer.setTime(i/128*runClip.duration);root.updateMatrixWorld(true);const row={};
 for(const side of ['Left','Right']){const hip=get(side+'UpLeg'),knee=get(side+'Leg'),foot=get(side+'Foot');row[side]={foot:foot.toArray(),flex:T.MathUtils.radToDeg(Math.PI-hip.sub(knee).angleTo(foot.clone().sub(knee)))};}
 runRows.push(row);
}
const lateralTravel=Math.max(...['Left','Right'].map(side=>Math.max(...runRows.map(r=>r[side].foot[0]))-Math.min(...runRows.map(r=>r[side].foot[0]))));
const runWidth=Math.max(...runRows.map(r=>Math.abs(r.Left.foot[0]-r.Right.foot[0])));
const runKneeError=Math.max(...runRows.map((r,i)=>Math.abs(r.Left.flex-runRows[(i+64)%128].Right.flex)));
const runForwardError=Math.max(...runRows.map((r,i)=>Math.abs(r.Left.foot[2]-runRows[(i+64)%128].Right.foot[2])));
assert(lateralTravel<.002,`Running foot drifts sideways: ${lateralTravel}`);
assert(runWidth<.17,`Running stance too wide: ${runWidth}`);
assert(runKneeError<1,`Unequal running knees: ${runKneeError}`);
assert(runForwardError<.001,`Unequal running stride: ${runForwardError}`);
assert(Math.min(...runRows.flatMap(r=>[r.Left.flex,r.Right.flex]))>10,'Running knee locks');
runMixer.stopAllAction();
const previous=fs.readFileSync(fileURLToPath(new URL('../public/character/mira-balanced-walk-v4.glb',import.meta.url)));
const previousLength=previous.readUInt32LE(12),previousDoc=JSON.parse(previous.subarray(20,20+previousLength)),previousBin=previous.subarray(28+previousLength);
assert(bin.subarray(0,previousBin.length).equals(previousBin),'Preserve source geometry and animation data');
for(const name of ['Walk','Idle'])assert.deepEqual(j.animations.find(a=>a.name===name),previousDoc.animations.find(a=>a.name===name),`${name} must remain unchanged`);
console.log('CENTERED_RUN_PASS',{lateralTravel,runWidth,runKneeError,runForwardError,preservedWalkAndIdle:true});
