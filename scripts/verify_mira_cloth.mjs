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
const before=load('mira-grounded-run-v5.glb'),after=load('mira-cloth-v7.glb');
assert.deepEqual(after.clips.map(c=>c.name).sort(),['Glide','Hover','Idle','Run','Walk']);
for(const name of ['Idle','Walk','Run']){
 const a=before.doc.animations.find(c=>c.name===name),b=after.doc.animations.find(c=>c.name===name);
 assert.equal(a.channels.length,b.channels.length);
 for(let i=0;i<a.channels.length;i++){
  const ca=a.channels[i],cb=b.channels[i],sa=a.samplers[ca.sampler],sb=b.samplers[cb.sampler];
  assert.equal(before.doc.nodes[ca.target.node].name,after.doc.nodes[cb.target.node].name);assert.equal(ca.target.path,cb.target.path);
  assert.deepEqual(before.read(sa.input),after.read(sb.input));assert.deepEqual(before.read(sa.output),after.read(sb.output));
 }
}
assert.equal(after.objects.filter(o=>o.name.startsWith('Drape_')).length,165);
assert(after.doc.materials.some(m=>m.normalTexture&&m.pbrMetallicRoughness.baseColorTexture&&m.pbrMetallicRoughness.metallicRoughnessTexture),'Embedded fabric PBR maps');
const motion=createLocomotion(after.root,after.clips);motion.update(0,{});const wardrobe=createFlightWardrobe(after.root);
const report={groundKeysExact:true,scenarios:[]};
let time=0;
for(const [name,options] of [['Idle',{}],['Walk',{moving:true,speed:.85}],['Run',{moving:true,running:true,speed:3.6}],['Hover',{flying:true}],['Glide',{flying:true,moving:true,speed:18}],['Boost',{flying:true,moving:true,speed:50.4}],['Turn',{flying:true,moving:true,speed:18}],['Land',{}]]){
 let worst=1;const samples=[];
 for(let frame=0;frame<240;frame++){
  time+=1/60;
  if(options.moving){after.root.position.z+=(options.speed||0)/60;if(name==='Turn')after.root.rotation.y+=.015;}
  motion.update(1/60,options);wardrobe.update(1/60,options);
  assert.equal(wardrobe.amount,1);assert(wardrobe.state.finite,'Cloth has non-finite coordinates');
  worst=Math.max(worst,wardrobe.state.maxStretch);if(frame>180)samples.push({...wardrobe.state});
 }
 report.scenarios.push({name,worst,settled:{...wardrobe.state}});
 console.log('CLOTH_STATE',name,worst,JSON.stringify(wardrobe.state));
 assert(worst<1.65,'Cloth constraints diverged');
}
// A map transfer should reset its local simulation instead of dragging cloth
// hundreds of metres from the preceding region.
after.root.position.x+=450;motion.update(1/60,{});wardrobe.update(1/60,{});
assert.equal(wardrobe.state.resets,1);assert(wardrobe.state.finite);
report.teleportReset=true;
const scenario=name=>report.scenarios.find(s=>s.name===name).settled;
assert(scenario('Glide').hemTrail>scenario('Idle').hemTrail+.2,'Flight should stream behind the shoulders');
assert(scenario('Boost').hemHeight>scenario('Hover').hemHeight+.15,'Faster flight should lift the hem');
assert(Math.abs(scenario('Land').hemHeight-scenario('Idle').hemHeight)<.06,'Cloth should settle after landing');
fs.writeFileSync(new URL('../work/meshy-mira/cloth-v7/physics-check.json',import.meta.url),JSON.stringify(report,null,2));
console.log('CLOTH_PASS: exact V5 ground keys, PBR fabric, gravity/wind, sustained movement/turning, and map transfer reset.');
