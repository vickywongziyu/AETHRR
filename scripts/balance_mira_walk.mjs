import * as T from 'three';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=fs.readFileSync(path.join(root,'outputs/character/meshy-mira/mira-no-cloak-walk-v2.glb'));
const jsonLength=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jsonLength)),binary=input.subarray(28+jsonLength);
let bytes=binary.length;const chunks=[binary];
function read(id){const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*n},(_,i)=>binary.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4));}
function append(values,type){const n={SCALAR:1,VEC3:3,VEC4:4}[type],pad=(-bytes&3);if(pad){chunks.push(Buffer.alloc(pad));bytes+=pad;}const data=Buffer.alloc(values.length*4);values.forEach((v,i)=>data.writeFloatLE(v,i*4));const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:bytes,byteLength:data.length});chunks.push(data);bytes+=data.length;const a={bufferView:view,componentType:5126,count:values.length/n,type};if(n===1){a.min=[Math.min(...values)];a.max=[Math.max(...values)];}doc.accessors.push(a);return doc.accessors.length-1;}
const nodes=doc.nodes.map(n=>{const o=new T.Object3D();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
doc.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new T.Group();doc.scenes[doc.scene||0].nodes.forEach(i=>scene.add(nodes[i]));const bones=Object.fromEntries(nodes.map(o=>[o.name,o]));
const clips=doc.animations.map(an=>new T.AnimationClip(an.name,-1,an.channels.map(ch=>{const sp=an.samplers[ch.sampler];return new (ch.target.path==='rotation'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(nodes[ch.target.node].uuid+'.'+{translation:'position',rotation:'quaternion',scale:'scale'}[ch.target.path],read(sp.input),read(sp.output));})));
const mixer=new T.AnimationMixer(scene),worldQ=o=>o.getWorldQuaternion(new T.Quaternion()),worldP=o=>o.getWorldPosition(new T.Vector3());
mixer.clipAction(clips.find(c=>c.name==='Idle')).play();mixer.setTime(0);scene.updateMatrixWorld(true);
const neutral={hip:worldP(bones.Hips),feet:{},footRotations:{},hipRotation:worldQ(bones.Hips)};
for(const side of ['Left','Right']){neutral.feet[side]=worldP(bones[side+'Foot']);neutral.footRotations[side]=worldQ(bones[side+'Foot']);}
function setWorldRotation(o,q){o.quaternion.copy(worldQ(o.parent).invert().multiply(q));scene.updateMatrixWorld(true);}
function aimBone(o,child,target){const current=worldP(child).sub(worldP(o)).normalize(),desired=target.clone().sub(worldP(o)).normalize();setWorldRotation(o,new T.Quaternion().setFromUnitVectors(current,desired).multiply(worldQ(o)));}
function solveLeg(side,target,footQ){
 const thigh=bones[side+'UpLeg'],shin=bones[side+'Leg'],foot=bones[side+'Foot'];
 const hip=worldP(thigh),knee=worldP(shin),ankle=worldP(foot),a=hip.distanceTo(knee),b=knee.distanceTo(ankle);
 const direction=target.clone().sub(hip),distance=T.MathUtils.clamp(direction.length(),Math.abs(a-b)+.0001,(a+b)*.998);direction.normalize();
 const ankleGoal=hip.clone().addScaledVector(direction,distance),along=(a*a-b*b+distance*distance)/(2*distance),bend=Math.sqrt(Math.max(0,a*a-along*along));
 const pole=new T.Vector3(0,0,1).addScaledVector(direction,-direction.z).normalize();
 const kneeGoal=hip.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
 aimBone(thigh,shin,kneeGoal);aimBone(shin,foot,ankleGoal);setWorldRotation(foot,footQ);
}
const report={source:'mira-no-cloak-walk-v2.glb',strideScale:.58,ankleTrackHalfWidth:.075,armSwingScale:.30,pairedLegCycle:true,clips:{}};
for(const name of ['Walk','Idle']){
 const original=clips.find(c=>c.name===name),out=doc.animations.find(c=>c.name===name);mixer.stopAllAction();mixer.clipAction(original).reset().play();
 const samples=[];
 for(let i=0;i<64;i++){mixer.setTime(i/64*original.duration);scene.updateMatrixWorld(true);samples.push({q:nodes.map(o=>o.quaternion.clone()),p:nodes.map(o=>o.position.clone()),scale:nodes.map(o=>o.scale.clone()),hip:worldP(bones.Hips),hipQ:worldQ(bones.Hips),feet:Object.fromEntries(['Left','Right'].map(side=>[side,{p:worldP(bones[side+'Foot']),q:worldQ(bones[side+'Foot'])}]))});}
 const mean=nodes.map((o,k)=>{const sum=new T.Vector4();const first=samples[0].q[k];for(const s of samples){const q=s.q[k],sign=first.dot(q)<0?-1:1;sum.x+=q.x*sign;sum.y+=q.y*sign;sum.z+=q.z*sign;sum.w+=q.w*sign;}return new T.Quaternion(sum.x,sum.y,sum.z,sum.w).normalize();});
 const output=[],metrics=[];
 const mirror=q=>new T.Quaternion(q.x,-q.y,-q.z,q.w);
 const shared=samples.map((s,i)=>{
  const a=s.feet.Left,b=samples[(i+32)%64].feet.Right;
  const da=a.q.clone().multiply(neutral.footRotations.Left.clone().invert());
  const db=mirror(b.q.clone().multiply(neutral.footRotations.Right.clone().invert()));
  return {z:((a.p.z-neutral.feet.Left.z)+(b.p.z-neutral.feet.Right.z))*.5,
   y:((a.p.y-neutral.feet.Left.y)+(b.p.y-neutral.feet.Right.y))*.5,
   q:new T.Quaternion().slerp(da.slerp(db,.5),.58)};
 });
 function lowerPelvisForReach(targets){
  let drop=0;
  for(const side of ['Left','Right']){
   const hip=worldP(bones[side+'UpLeg']),knee=worldP(bones[side+'Leg']),ankle=worldP(bones[side+'Foot']);
   const a=hip.distanceTo(knee),b=knee.distanceTo(ankle),target=targets[side];
   // Keep a small, soft knee bend. Move the shared pelvis instead of
   // independently clipping one foot's trajectory at its reach limit.
   const reach2=a*a+b*b+2*a*b*Math.cos(T.MathUtils.degToRad(12));
   const horizontal=(hip.x-target.x)**2+(hip.z-target.z)**2;
   const allowedY=target.y+Math.sqrt(Math.max(0,reach2-horizontal));
   drop=Math.max(drop,hip.y-allowedY);
  }
  if(drop>0){const hip=worldP(bones.Hips);hip.y-=drop;bones.Hips.position.copy(bones.Hips.parent.worldToLocal(hip));scene.updateMatrixWorld(true);}
 }
 for(let i=0;i<=64;i++){
  const sample=samples[i%64];nodes.forEach((o,k)=>{o.position.copy(sample.p[k]);o.quaternion.copy(sample.q[k]);o.scale.copy(sample.scale[k]);});scene.updateMatrixWorld(true);
  if(name==='Walk'){
   nodes.forEach((o,k)=>{let amplitude;if(/Shoulder|Arm|Hand/.test(o.name))amplitude=/ForeArm/.test(o.name)?.44:.30;else if(/Spine|Head|Neck/.test(o.name))amplitude=.55;if(amplitude!==undefined)o.quaternion.copy(mean[k]).slerp(sample.q[k],amplitude);});
   const half=samples[(i+32)%64];
   const hp=neutral.hip.clone();hp.y+=((sample.hip.y+half.hip.y)*.5-neutral.hip.y)*.3;
   const delta=sample.hipQ.clone().multiply(neutral.hipRotation.clone().invert());
   const paired=mirror(half.hipQ.clone().multiply(neutral.hipRotation.clone().invert()));
   setWorldRotation(bones.Hips,new T.Quaternion().slerp(delta.slerp(paired,.5),.3).multiply(neutral.hipRotation));
   bones.Hips.position.copy(bones.Hips.parent.worldToLocal(hp));
   scene.updateMatrixWorld(true);
  }
  const targets={},rotations={};
  for(const side of ['Left','Right']){
   const src=sample.feet[side],rest=neutral.feet[side],target=src.p.clone(),sign=side==='Left'?1:-1;
   if(name==='Walk'){
    const cycle=shared[(i+(side==='Left'?0:32))%64];
    target.x=neutral.hip.x+sign*.075;
    target.z=(neutral.feet.Left.z+neutral.feet.Right.z)*.5+cycle.z*.58;
    target.y=rest.y+cycle.y*.42;
    rotations[side]=(side==='Left'?cycle.q.clone():mirror(cycle.q)).multiply(neutral.footRotations[side]);
   }else {target.x=neutral.hip.x+sign*.09;rotations[side]=src.q;}
   targets[side]=target;
  }
  if(name==='Walk')lowerPelvisForReach(targets);
  for(const side of ['Left','Right'])solveLeg(side,targets[side],rotations[side]);
  output.push(out.channels.map(ch=>{const o=nodes[ch.target.node];return ({rotation:o.quaternion,translation:o.position,scale:o.scale}[ch.target.path]).toArray();}));
  const l=worldP(bones.LeftFoot),r=worldP(bones.RightFoot),lh=worldP(bones.LeftHand),rh=worldP(bones.RightHand);metrics.push({width:Math.abs(l.x-r.x),stride:Math.abs(l.z-r.z),hands:Math.abs(lh.z-rh.z)});
 }
 const times=append(Array.from({length:65},(_,i)=>i/64*original.duration),'SCALAR');
 out.channels.forEach((ch,k)=>{const sampler=out.samplers[ch.sampler];sampler.input=times;sampler.output=append(output.flatMap(p=>p[k]),ch.target.path==='rotation'?'VEC4':'VEC3');sampler.interpolation='LINEAR';});
 report.clips[name]={duration:original.duration,maxAnkleSeparation:Math.max(...metrics.map(m=>m.width)),maxStride:Math.max(...metrics.map(m=>m.stride)),maxHandSeparation:Math.max(...metrics.map(m=>m.hands))};
}
// Add a fresh contact correction sampled from this shortened gait, never V2's.
const contactPath=path.join(root,'scripts/data/mira-balanced-contact.json');
if(process.argv.includes('--contact')){
 const contact=JSON.parse(fs.readFileSync(contactPath));
 // Read newly staged accessors after pose generation.
 const all=Buffer.concat(chunks);function stagedRead(id){const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*n},(_,i)=>all.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4));}
 for(const name of ['Walk','Idle']){const clip=doc.animations.find(c=>c.name===name),ch=clip.channels.find(c=>doc.nodes[c.target.node].name==='Hips'&&c.target.path==='translation'),sp=clip.samplers[ch.sampler],times=stagedRead(sp.input),values=stagedRead(sp.output);contact[name].forEach((sample,i)=>values[i*3+1]+=sample.lift*100);sp.output=append(values,'VEC3');}
 report.contactCorrected=true;
}
doc.buffers[0].byteLength=bytes;doc.asset.extras={...doc.asset.extras,gaitRevision:'Paired half-cycle foot trajectories and a shared reachable pelvis; restrained steps and arms.'};let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc(-json.length&3,32)]);let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc(-bin.length&3)]);const head=Buffer.alloc(20);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+bin.length,8);head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const result=Buffer.concat([head,json,bh,bin]);
for(const name of ['public/character/mira-balanced-walk-v4.glb','outputs/character/meshy-mira/mira-balanced-walk-v4.glb'])fs.writeFileSync(path.join(root,name),result);
fs.mkdirSync(path.join(root,'work/meshy-mira/gait-balanced'),{recursive:true});fs.writeFileSync(path.join(root,'work/meshy-mira/gait-balanced/metrics.json'),JSON.stringify(report,null,2));console.log(report);
