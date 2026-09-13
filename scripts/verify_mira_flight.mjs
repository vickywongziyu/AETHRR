import * as T from 'three';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createLocomotion} from '../src/character/locomotion.js';
import {createFlightWardrobe} from '../src/character/flight-wardrobe.js';

function load(file){
 const b=fs.readFileSync(new URL('../public/character/'+file,import.meta.url)),len=b.readUInt32LE(12),doc=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len);
 const read=id=>{const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*n},(_,i)=>bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+4*i));};
 const objects=doc.nodes.map(n=>{const o=new T.Object3D();o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);return o;});
 doc.nodes.forEach((n,i)=>n.children?.forEach(c=>objects[i].add(objects[c])));const root=new T.Group();doc.scenes[doc.scene||0].nodes.forEach(i=>root.add(objects[i]));
 const clips=doc.animations.map(a=>new T.AnimationClip(a.name,-1,a.channels.map(c=>{const s=a.samplers[c.sampler],K=c.target.path==='rotation'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack;return new K(objects[c.target.node].uuid+'.'+{translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path],read(s.input),read(s.output));})));
 return {doc,read,objects,root,clips};
}
const before=load('mira-grounded-run-v5.glb'),after=load('mira-flight-v6.glb');
assert.deepEqual(after.clips.map(c=>c.name).sort(),['Glide','Hover','Idle','Run','Walk']);
for(const name of ['Idle','Walk','Run']){
 const a=before.doc.animations.find(c=>c.name===name),b=after.doc.animations.find(c=>c.name===name);
 assert.equal(a.channels.length,b.channels.length);
 for(let i=0;i<a.channels.length;i++){
  const ca=a.channels[i],cb=b.channels[i],sa=a.samplers[ca.sampler],sb=b.samplers[cb.sampler];
  assert.equal(before.doc.nodes[ca.target.node].name,after.doc.nodes[cb.target.node].name);
  assert.equal(ca.target.path,cb.target.path);
  assert.deepEqual(before.read(sa.input),after.read(sb.input));assert.deepEqual(before.read(sa.output),after.read(sb.output));
 }
}
assert.equal(after.objects.filter(o=>o.name.startsWith('FlightCape_')).length,40);
for(const clip of after.clips.filter(c=>['Hover','Glide'].includes(c.name))){
 const mix=new T.AnimationMixer(after.root);mix.clipAction(clip).play();const rows=[];
 for(let i=0;i<90;i++){
  mix.setTime(i/90*clip.duration);after.root.updateMatrixWorld(true);
  const get=name=>after.objects.find(o=>o.name===name).getWorldPosition(new T.Vector3());
  const l=get('LeftFoot'),r=get('RightFoot'),hip=get('Hips'),hem=get('FlightCape_2_7');
  assert([...l,...r,...hem].every(Number.isFinite));assert(Math.abs(l.x-r.x)<.23,'Flight legs too wide');
  rows.push({left:l.clone().sub(hip),right:r.clone().sub(hip),hem});
 }
 const footTravel=Math.max(...rows.map(r=>r.left.distanceTo(rows[0].left)));
 assert(footTravel<.06,'Flight should suspend the legs, not keep stepping');
 const clothTravel=Math.max(...rows.map(r=>r.hem.distanceTo(rows[0].hem)));
 assert(clothTravel>.025,'Cape hem must move independently');
 for(const track of clip.tracks){const n=track.getValueSize();for(let k=0;k<n;k++)assert(Math.abs(track.values[k]-track.values[track.values.length-n+k])<.002,'Flight loop seam');}
 console.log('FLIGHT_POSE_PASS',{clip:clip.name,footTravel,clothTravel});mix.stopAllAction();
}
const motion=createLocomotion(after.root,after.clips);
motion.update(.1,{flying:true});assert.equal(motion.animation,'Hover');
motion.update(.1,{flying:true,moving:true,speed:18});assert.equal(motion.animation,'Glide');
motion.update(.1,{flying:true,moving:false,speed:0});assert.equal(motion.animation,'Hover');
motion.update(.1,{moving:true,running:true,speed:3.6});assert.equal(motion.animation,'Run');
motion.update(.1,{moving:false});assert.equal(motion.animation,'Idle');motion.dispose();
const fake=new T.Group(),cape=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial());cape.name='Mira_Flight_Cape';fake.add(cape);
const wardrobe=createFlightWardrobe(fake);assert.equal(cape.visible,true);
for(let i=0;i<90;i++)wardrobe.update(1/60,true);assert(wardrobe.amount>.99&&cape.visible);
for(let i=0;i<90;i++)wardrobe.update(1/60,false);assert.equal(wardrobe.amount,1);assert.equal(cape.visible,true);
cape.geometry.dispose();cape.material.dispose();
console.log('FLIGHT_PASS: exact V5 ground keys, 40 cape controls, hover/glide loops, mode transitions and persistent wardrobe.');
