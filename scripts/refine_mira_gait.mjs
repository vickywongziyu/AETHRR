import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function load(name){const b=fs.readFileSync(path.join(root,name)),n=b.readUInt32LE(12);return {j:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};}
const original=load('outputs/character/meshy-mira/mira-meshy-body-rigged-v3.glb');
const final=load('outputs/character/meshy-mira/mira-no-cloak.glb');
let chunks=[final.bin],bytes=final.bin.length;const staged=new Map();
function read(asset,id){if(staged.has(id)&&asset===final)return staged.get(id);const a=asset.j.accessors[id],v=asset.j.bufferViews[a.bufferView],c={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*c},(_,i)=>asset.bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4));}
function append(values,type){const c={SCALAR:1,VEC3:3,VEC4:4}[type],pad=(4-bytes%4)%4;if(pad){chunks.push(Buffer.alloc(pad));bytes+=pad;}const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));const view=final.j.bufferViews.length;final.j.bufferViews.push({buffer:0,byteOffset:bytes,byteLength:b.length});chunks.push(b);bytes+=b.length;const id=final.j.accessors.length;const a={bufferView:view,componentType:5126,count:values.length/c,type};if(type==='SCALAR'){a.min=[Math.min(...values)];a.max=[Math.max(...values)];}final.j.accessors.push(a);staged.set(id,values);return id;}
const names={Walk:'Walking',Run:'Running'},changes=[];
for(const clip of final.j.animations){
 const source=original.j.animations.find(a=>a.name===names[clip.name]);
 for(const channel of clip.channels){
  const bone=final.j.nodes[channel.target.node].name,sampler=clip.samplers[channel.sampler];
  // Remove the old cape-avoidance blend from shoulders, elbows and hands.
  if(source&&/Arm|Hand|Shoulder/.test(bone)&&channel.target.path==='rotation'){
   const ch=source.channels.find(c=>original.j.nodes[c.target.node].name===bone&&c.target.path==='rotation');
   if(ch){const sp=source.samplers[ch.sampler];sampler.input=append(read(original,sp.input),'SCALAR');sampler.output=append(read(original,sp.output),'VEC4');changes.push(clip.name+':'+bone);}
  }
 }
 // Shift frame-one keys to zero; keep the source's full cyclic motion.
 const min=Math.min(...clip.samplers.map(s=>read(final,s.input)[0]));
 const normalized=new Map();
 for(const sampler of clip.samplers){if(!normalized.has(sampler.input))normalized.set(sampler.input,append(read(final,sampler.input).map(t=>Math.max(0,t-min)),'SCALAR'));sampler.input=normalized.get(sampler.input);}
}
// The rig was retargeted to heeled boots. Correct the measured sole offset
// on flat ground while preserving the airborne phase of the run.
const contact=JSON.parse(fs.readFileSync(path.join(root,'scripts/data/mira-foot-contact.json'),'utf8'));
for(const clip of final.j.animations){
 const rows=contact[clip.name];if(!rows)continue;
 const ch=clip.channels.find(c=>final.j.nodes[c.target.node].name==='Hips'&&c.target.path==='translation');
 const sampler=clip.samplers[ch.sampler],times=read(final,sampler.input),values=read(final,sampler.output),duration=times.at(-1);
 const corrected=[];
 for(const row of rows){const time=row.phase*duration;let k=0;while(k<times.length-2&&times[k+1]<time)k++;const u=(time-times[k])/Math.max(1e-8,times[k+1]-times[k]);for(let axis=0;axis<3;axis++)corrected.push(values[k*3+axis]*(1-u)+values[(k+1)*3+axis]*u+(axis===1?row.lift*100:0));}
 sampler.input=append(rows.map(r=>r.phase*duration),'SCALAR');sampler.output=append(corrected,'VEC3');
}
final.j.buffers[0].byteLength=bytes;
final.j.asset.extras={...final.j.asset.extras,gaitRevision:'Restored unconstrained upper-body motion; normalized loop timing.'};
let json=Buffer.from(JSON.stringify(final.j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,bh,bin]);
for(const out of ['public/character/mira-no-cloak-walk-v2.glb','outputs/character/meshy-mira/mira-no-cloak-walk-v2.glb'])fs.writeFileSync(path.join(root,out),result);
console.log(JSON.stringify({bytes:result.length,restoredTracks:changes},null,2));
