// Restore V5's exact ground keys after adding the flight geometry in Blender.
// Copy only the needed accessor data; no duplicate body textures or meshes.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
function load(path){const bytes=fs.readFileSync(new URL(path,root)),n=bytes.readUInt32LE(12);return {doc:JSON.parse(bytes.subarray(20,20+n)),bin:bytes.subarray(28+n)};}
const source=load('public/character/mira-grounded-run-v5.glb');
const path=process.argv[2]?new URL('file://'+process.argv[2]):new URL('outputs/character/mira-flight/mira-flight-v6.glb',root);
const target=load(path);
const chunks=[target.bin];let length=target.bin.length;
function append(bytes){const pad=-length&3;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const index=target.doc.bufferViews.length;target.doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});chunks.push(bytes);length+=bytes.length;return index;}
const accessorMap=new Map();
function copyAccessor(id){
 if(accessorMap.has(id))return accessorMap.get(id);
 const accessor=source.doc.accessors[id],view=source.doc.bufferViews[accessor.bufferView];
 const data=source.bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
 const index=target.doc.accessors.length;
 target.doc.accessors.push({...accessor,bufferView:append(data)});accessorMap.set(id,index);return index;
}
const nodes=new Map(target.doc.nodes.map((n,i)=>[n.name,i]));
for(const node of source.doc.nodes){const targetNode=target.doc.nodes[nodes.get(node.name)];if(!targetNode)continue;
 for(const key of ['translation','rotation','scale','matrix']){if(key in node)targetNode[key]=node[key];else delete targetNode[key];}
}
for(const name of ['Idle','Walk','Run']){
 const animation=structuredClone(source.doc.animations.find(a=>a.name===name));
 for(const channel of animation.channels)channel.target.node=nodes.get(source.doc.nodes[channel.target.node].name);
 for(const sampler of animation.samplers){sampler.input=copyAccessor(sampler.input);sampler.output=copyAccessor(sampler.output);}
 target.doc.animations[target.doc.animations.findIndex(a=>a.name===name)]=animation;
}
target.doc.asset.extras={...target.doc.asset.extras,groundMotionSource:'mira-grounded-run-v5.glb',groundMotion:'Exact source keys and node transforms; added Hover/Glide and travel cape.'};
target.doc.buffers[0].byteLength=length;
let json=Buffer.from(JSON.stringify(target.doc));json=Buffer.concat([json,Buffer.alloc(-json.length&3,32)]);
let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc(-bin.length&3)]);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binaryHeader=Buffer.alloc(8);binaryHeader.writeUInt32LE(bin.length);binaryHeader.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(path,Buffer.concat([header,json,binaryHeader,bin]));
console.log('PRESERVED_V5_GROUND_KEYS',fileURLToPath(path));
