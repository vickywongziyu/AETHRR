// Repack a web-only sidecar without re-encoding any retained Draco bytes.
// Its four legal point-degenerate Mesh placeholders MUST be replaced by the
// existing refined-groves patch before material/navigation indexing or drawing.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=root+'public/aether/aether.glb',output=root+'public/aether/aether-runtime-v55.glb';
const diagnostics=root+'work/atlas/performance-v55/assets';
const replacements=new Set(['Sky garden trees','Sky garden canopy','Observatory trees','Observatory canopy']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const clone=value=>structuredClone(value),align4=value=>(value+3)&~3;
function readGLB(bytes){
 assert(bytes.length>=20);assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 let offset=12,json,binary,jsonBytes=0;
 while(offset<bytes.length){assert(offset+8<=bytes.length);const length=bytes.readUInt32LE(offset),kind=bytes.readUInt32LE(offset+4);assert(offset+8+length<=bytes.length);assert.equal(length%4,0);const data=bytes.subarray(offset+8,offset+8+length);
  if(kind===0x4e4f534a){assert.equal(json,undefined);json=JSON.parse(data.toString('utf8').trim());jsonBytes=length;}
  else if(kind===0x004e4942){assert.equal(binary,undefined);binary=data;}else assert.fail('Unexpected GLB chunk');offset+=8+length;
 }
 assert.equal(offset,bytes.length);assert(json&&binary);return{json,binary,jsonBytes};
}
function encodeGLB(json,binary){
 const content=Buffer.from(JSON.stringify(json)),jsonBytes=align4(content.length),binBytes=align4(binary.length),out=Buffer.alloc(12+8+jsonBytes+8+binBytes);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jsonBytes,12);out.writeUInt32LE(0x4e4f534a,16);out.fill(32,20,20+jsonBytes);content.copy(out,20);
 const offset=20+jsonBytes;out.writeUInt32LE(binBytes,offset);out.writeUInt32LE(0x004e4942,offset+4);binary.copy(out,offset+8);return out;
}
const raw=await readFile(input),sourceHash=sha(raw),source=readGLB(raw),src=source.json;
assert.deepEqual(src.extensionsUsed,['KHR_draco_mesh_compression']);assert.deepEqual(src.extensionsRequired,['KHR_draco_mesh_compression']);
assert.equal(src.buffers.length,1);assert.equal(src.buffers[0].uri,undefined);assert.equal(src.images?.length||0,0);assert.equal(src.skins?.length||0,0);
const selected=src.nodes.map((node,index)=>({node,index})).filter(({node})=>replacements.has(node.name));assert.equal(selected.length,4);assert.equal(new Set(selected.map(s=>s.node.name)).size,4);
const selectedMeshes=new Set(selected.map(s=>s.node.mesh));assert.equal(selectedMeshes.size,4);
const removedViews=new Set(),removedAccessors=new Set();
for(const {node,index}of selected){
 assert.equal(src.nodes.filter(n=>n.mesh===node.mesh).length,1,'Replacement mesh must not be shared');const mesh=src.meshes[node.mesh];assert.equal(mesh.primitives.length,1);const p=mesh.primitives[0];
 assert.deepEqual(Object.keys(p.attributes).sort(),['COLOR_0','NORMAL','POSITION']);assert.equal(p.mode,4);assert(p.extensions?.KHR_draco_mesh_compression);assert.equal(Object.keys(p.extensions).length,1);assert.equal(p.targets,undefined);
 removedViews.add(p.extensions.KHR_draco_mesh_compression.bufferView);Object.values(p.attributes).forEach(id=>removedAccessors.add(id));removedAccessors.add(p.indices);
 assert(src.animations.every(a=>a.channels.every(c=>c.target.node!==index)),'Replacement nodes must not have direct animation');
}
assert.equal(removedViews.size,4);assert.equal(removedAccessors.size,16);
// Refuse any source evolution that shares the discarded bytes/metadata elsewhere.
for(const[meshIndex,mesh]of src.meshes.entries())if(!selectedMeshes.has(meshIndex))for(const p of mesh.primitives){
 assert(!removedViews.has(p.extensions?.KHR_draco_mesh_compression?.bufferView));for(const id of [...Object.values(p.attributes),p.indices,...(p.targets||[]).flatMap(Object.values)].filter(id=>id!==undefined))assert(!removedAccessors.has(id));
}
for(const a of src.animations)for(const s of a.samplers){assert(!removedAccessors.has(s.input));assert(!removedAccessors.has(s.output));}
for(const[id,a]of src.accessors.entries()){assert.equal(a.sparse,undefined,'Sparse source requires an explicit remap implementation');if(!removedAccessors.has(id))assert(!removedViews.has(a.bufferView));}
const json=clone(src),viewMap=new Map(),accessorMap=new Map(),chunks=[],viewChecks=[];let binLength=0;
function append(data,definition){const offset=align4(binLength);if(offset>binLength)chunks.push(Buffer.alloc(offset-binLength));chunks.push(data);binLength=offset+data.length;json.bufferViews.push({...definition,buffer:0,byteOffset:offset,byteLength:data.length});return json.bufferViews.length-1;}
json.bufferViews=[];
for(const[id,view]of src.bufferViews.entries()){
 assert.equal(view.buffer,0);assert((view.byteOffset||0)+view.byteLength<=source.binary.length);if(removedViews.has(id))continue;
 const data=source.binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),next=append(data,clone(view));viewMap.set(id,next);viewChecks.push({oldIndex:id,newIndex:next,bytes:data.length,sha256:sha(data)});
}
json.accessors=[];
for(const[id,accessor]of src.accessors.entries())if(!removedAccessors.has(id)){const next=clone(accessor);if(next.bufferView!==undefined){assert(viewMap.has(next.bufferView));next.bufferView=viewMap.get(next.bufferView);}accessorMap.set(id,json.accessors.length);json.accessors.push(next);}
const remapAccessor=id=>{assert(accessorMap.has(id),'Missing retained accessor');return accessorMap.get(id);};
// Shared 1-vertex/3-index placeholder. This is valid TRIANGLES data with zero
// area, retains Mesh/material identity, and adds only 42 raw bytes plus padding.
const float3=values=>{const b=Buffer.alloc(12);values.forEach((v,i)=>b.writeFloatLE(v,i*4));return b;};
const stubViews={position:append(float3([0,0,0]),{target:34962}),normal:append(float3([0,0,1]),{target:34962}),color:append(float3([1,1,1]),{target:34962}),index:append(Buffer.alloc(6),{target:34963})};
function stubAccessor(definition){json.accessors.push(definition);return json.accessors.length-1;}
const stub={POSITION:stubAccessor({bufferView:stubViews.position,componentType:5126,count:1,type:'VEC3',min:[0,0,0],max:[0,0,0]}),NORMAL:stubAccessor({bufferView:stubViews.normal,componentType:5126,count:1,type:'VEC3'}),COLOR_0:stubAccessor({bufferView:stubViews.color,componentType:5126,count:1,type:'VEC3'}),indices:stubAccessor({bufferView:stubViews.index,componentType:5123,count:3,type:'SCALAR'})};
for(const[index,mesh]of json.meshes.entries())for(const p of mesh.primitives){
 if(selectedMeshes.has(index)){p.attributes={POSITION:stub.POSITION,NORMAL:stub.NORMAL,COLOR_0:stub.COLOR_0};p.indices=stub.indices;delete p.extensions;}
 else{p.attributes=Object.fromEntries(Object.entries(p.attributes).map(([semantic,id])=>[semantic,remapAccessor(id)]));if(p.indices!==undefined)p.indices=remapAccessor(p.indices);for(const target of p.targets||[])for(const semantic of Object.keys(target))target[semantic]=remapAccessor(target[semantic]);const draco=p.extensions?.KHR_draco_mesh_compression;if(draco)draco.bufferView=viewMap.get(draco.bufferView);}
}
for(const animation of json.animations)for(const sampler of animation.samplers){sampler.input=remapAccessor(sampler.input);sampler.output=remapAccessor(sampler.output);}
json.buffers[0].byteLength=align4(binLength);const packedBin=Buffer.concat([...chunks,Buffer.alloc(align4(binLength)-binLength)]),optimized=encodeGLB(json,packedBin),verified=readGLB(optimized),out=verified.json;
// Static reference and byte-preservation checks happen before writing any asset.
for(const check of viewChecks){const view=out.bufferViews[check.newIndex],data=verified.binary.subarray(view.byteOffset,view.byteOffset+view.byteLength);assert.equal(sha(data),check.sha256);assert.equal(view.byteLength,check.bytes);}
for(const key of Object.keys(src).filter(k=>!['meshes','accessors','bufferViews','buffers','animations'].includes(k)))assert.deepEqual(out[key],src[key],`Unchanged ${key}`);
for(const[oldId,newId]of accessorMap){const original=clone(src.accessors[oldId]);if(original.bufferView!==undefined)original.bufferView=viewMap.get(original.bufferView);assert.deepEqual(out.accessors[newId],original);}
for(const[index,mesh]of src.meshes.entries())if(!selectedMeshes.has(index)){const expected=clone(mesh);for(const p of expected.primitives){p.attributes=Object.fromEntries(Object.entries(p.attributes).map(([s,id])=>[s,remapAccessor(id)]));if(p.indices!==undefined)p.indices=remapAccessor(p.indices);for(const target of p.targets||[])for(const s of Object.keys(target))target[s]=remapAccessor(target[s]);if(p.extensions?.KHR_draco_mesh_compression)p.extensions.KHR_draco_mesh_compression.bufferView=viewMap.get(p.extensions.KHR_draco_mesh_compression.bufferView);}assert.deepEqual(out.meshes[index],expected);}
const expectedAnimations=clone(src.animations);for(const a of expectedAnimations)for(const s of a.samplers){s.input=remapAccessor(s.input);s.output=remapAccessor(s.output);}assert.deepEqual(out.animations,expectedAnimations);
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},componentBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
for(const a of out.accessors){assert(Number.isInteger(a.count)&&a.count>0);assert(components[a.type]&&componentBytes[a.componentType]);if(a.bufferView!==undefined){const view=out.bufferViews[a.bufferView];assert(view);const elementBytes=components[a.type]*componentBytes[a.componentType],required=(a.byteOffset||0)+(a.count-1)*(view.byteStride||elementBytes)+elementBytes;assert(required<=view.byteLength);}}
for(const mesh of out.meshes)for(const p of mesh.primitives){for(const id of [...Object.values(p.attributes),p.indices].filter(id=>id!==undefined))assert(out.accessors[id]);if(p.extensions?.KHR_draco_mesh_compression)assert(out.bufferViews[p.extensions.KHR_draco_mesh_compression.bufferView]);}
for(const a of out.animations){for(const s of a.samplers){assert(out.accessors[s.input]&&out.accessors[s.output]);}for(const c of a.channels){assert(a.samplers[c.sampler]);assert(out.nodes[c.target.node]);}}
for(const view of out.bufferViews){assert.equal(view.buffer,0);assert.equal(view.byteOffset%4,0);assert(view.byteOffset+view.byteLength<=out.buffers[0].byteLength);}assert.equal(out.buffers[0].byteLength,verified.binary.length);
assert.equal(sha(await readFile(input)),sourceHash,'Source changed during repack');await mkdir(diagnostics,{recursive:true});
const temp=output+`.tmp-${process.pid}`;try{await writeFile(temp,optimized);assert.equal(sha(await readFile(temp)),sha(optimized));await rename(temp,output);}finally{await unlink(temp).catch(()=>{});}
assert.equal(sha(await readFile(input)),sourceHash,'Original asset changed');
const record={input:'public/aether/aether.glb',output:'public/aether/aether-runtime-v55.glb',sourceBytes:raw.length,outputBytes:optimized.length,savedBytes:raw.length-optimized.length,savedPercent:(1-optimized.length/raw.length)*100,sourceSHA256:sourceHash,outputSHA256:sha(optimized),sourceUnchanged:true,replacedNodes:selected.map(({node,index})=>({index,name:node.name,mesh:node.mesh})),removedBufferViews:[...removedViews],removedAccessors:[...removedAccessors],retainedBufferViews:viewChecks.length,retainedDracoViews:out.meshes.flatMap(m=>m.primitives).filter(p=>p.extensions?.KHR_draco_mesh_compression).length,stub:{vertices:1,indexCount:3,rawBytes:42,sharedByMeshes:4},nodes:out.nodes.length,materials:out.materials.length,animations:out.animations.length,accessors:out.accessors.length,bufferViews:out.bufferViews.length,checks:{allRetainedViewBytesIdentical:true,allRetainedAccessorMetadataIdenticalAfterRemap:true,allUnchangedMeshesIdenticalAfterRemap:true,allNodesMaterialsExtrasTransformsAndSceneMetadataIdentical:true,allAnimationChannelsAndSamplerMetadataIdenticalAfterRemap:true,allReferencesInRange:true,allBinaryViewsAligned:true},retainedViewChecks:viewChecks,note:'Static validated sidecar only; runtime integration requires exact comparison after the unchanged refined-groves patch. Do not load this alone as a finished scene.'};
await writeFile(diagnostics+'/runtime-sidecar-static.json',JSON.stringify(record,null,2));console.log(JSON.stringify({...record,retainedViewChecks:undefined},null,2));
