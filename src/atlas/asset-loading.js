// Transfer compression is lossless: parsing receives the original GLB bytes.
// The .bin suffix avoids servers treating .gz as an HTTP Content-Encoding.
export async function fetchBytes(url,{onProgress=()=>{},signal,timeout=45000,compressed=false,validateGLB=false}={}){
 const controller=new AbortController();let timer,timedOut=false,loaded=0;
 const abort=()=>controller.abort(signal?.reason),touch=()=>{clearTimeout(timer);timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);};
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 try{
  touch();onProgress({loaded:0,total:0,phase:'download'});
  const response=await fetch(url+(compressed?'.bin':''),{signal:controller.signal});
  if(!response.ok)throw new Error(`资源下载失败（${response.status}），请重试`);
  const total=Number(response.headers.get('content-length'))||0,reader=response.body?.getReader(),chunks=[];
  if(reader){while(true){const {value,done}=await reader.read();if(done)break;touch();loaded+=value.byteLength;chunks.push(value);onProgress({loaded,total,phase:'download'});}}
  else{const value=new Uint8Array(await response.arrayBuffer());chunks.push(value);loaded=value.length;}
  clearTimeout(timer);const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}chunks.length=0;
  onProgress({loaded,total:loaded,phase:'decode'});
  let buffer=bytes.buffer;
  if(compressed){
   if(typeof DecompressionStream!=='undefined')buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   else{const {gunzipSync}=await import('three/addons/libs/fflate.module.js');const plain=gunzipSync(bytes);buffer=plain.buffer.slice(plain.byteOffset,plain.byteOffset+plain.byteLength);}
  }
  if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
  if(validateGLB&&(buffer.byteLength<4||new DataView(buffer).getUint32(0,true)!==0x46546c67))throw new Error('模型文件不完整，请重新载入');
  return buffer;
 }catch(error){if(timedOut)throw new Error('资源下载长时间没有响应，请检查网络后重试');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function fetchModel(url,options={}){
 const compressed=options.compressed??(!!import.meta.env?.PROD&&/atlas\/(miniatures\/[^/]+|north-valley)\.glb$/.test(url));
 return fetchBytes(url,{...options,compressed,validateGLB:true});
}
// Apply the same stalled-transfer timeout to HDR and surface images.
export async function loadBinaryResource(loader,url,options={}){
 const buffer=await fetchBytes(url,options),objectURL=URL.createObjectURL(new Blob([buffer]));
 try{return await loader.loadAsync(objectURL);}finally{URL.revokeObjectURL(objectURL);}
}
export async function loadModel(loader,url,options={}){
 const buffer=await (options.buffer||fetchModel(url,options));
 options.onProgress?.({phase:'parse'});
 const base=new URL('.',new URL(url,location.href)).href;
 return loader.parseAsync(buffer,base);
}
// Yield a paint opportunity before the next construction stage, not a fake delay.
export const paintLoading=()=>new Promise(resolve=>{const timer=setTimeout(resolve,100);requestAnimationFrame(()=>{clearTimeout(timer);setTimeout(resolve,0);});});
export const transferText=p=>p?.phase==='download'?`${(p.loaded/1e6).toFixed(1)}${p.total?' / '+(p.total/1e6).toFixed(1):''} MB`:'正在整理模型';
