// Only fingerprinted, same-origin models enter this disposable byte cache.
// It is independent of visitor saves and never requests persistent storage.
const HASHES=typeof __MODEL_HASHES__==='object'&&__MODEL_HASHES__?__MODEL_HASHES__:{};
const PATHS=new Set(['aether/aether.glb','atlas/north-valley.glb']);
const DATABASE='aether.model-bytes.v1',LIMIT=48*1024*1024;
const OPEN_MS=700,IO_MS=900,HASH_MS=1500,WRITE_MS=8000,WRITE_HASH_MS=8000;
let database=null,opening=null,disabledUntil=0,generation=0,running=false;
const jobs=[];
const counters={hits:0,misses:0,writes:0,evictions:0,invalid:0,errors:0,timeouts:0,skipped:0,lastError:null,lastOperation:null};
const abortError=()=>new DOMException('Aborted','AbortError');
function checkAbort(signal){if(signal?.aborted)throw abortError();}
function fingerprint(url){
 try{
  const address=new URL(url,location.href),path=address.pathname.replace(/^\//,'');
  if(address.origin!==location.origin||!PATHS.has(path))return null;
  const digest=HASHES[path];
  return typeof digest==='string'&&/^[a-f0-9]{64}$/i.test(digest)?{path,digest:digest.toLowerCase(),key:`${path}@${digest.toLowerCase()}`}:null;
 }catch{return null;}
}
function usable(){try{return !!globalThis.indexedDB&&!!globalThis.crypto?.subtle&&Date.now()>=disabledUntil;}catch{return false;}}
function closeDatabase(){try{database?.close();}catch{}database=null;}
function failed(error){
 counters.errors++;counters.lastError=error?.name||'CacheError';counters.lastOperation=error?.operation||'cache';
 if(error?.name==='TimeoutError')counters.timeouts++;
 // Avoid repeating a failed operation for every model in the same startup.
 disabledUntil=Date.now()+30000;closeDatabase();
}
function timeoutError(operation){return new DOMException(`Model cache ${operation} timed out`,'TimeoutError');}
// All IDB and crypto work is bounded. Aborting an operation aborts its transaction.
function bounded(start,ms,signal,operation='cache'){
 return new Promise((resolve,reject)=>{
  let finished=false,cancel=()=>{};
  const finish=(error,value)=>{
   if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   if(error){try{error.operation??=operation;}catch{}try{cancel();}catch{}reject(error);}else resolve(value);
  };
  const abort=()=>finish(abortError()),timer=setTimeout(()=>finish(timeoutError(operation)),ms);
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  try{cancel=start(value=>finish(null,value),error=>finish(error||new Error('Cache operation failed')),()=>finished)||cancel;}catch(error){finish(error);}
 });
}
function openDatabase(){
 if(database)return Promise.resolve(database);
 if(opening)return opening;
 opening=bounded((resolve,reject,finished)=>{
  const request=globalThis.indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>{
   if(finished()){try{request.transaction.abort();}catch{}return;}
   const db=request.result;
   try{
    if(!db.objectStoreNames.contains('models'))db.createObjectStore('models',{keyPath:'key'});
    if(!db.objectStoreNames.contains('entries'))db.createObjectStore('entries',{keyPath:'key'});
   }catch(error){try{request.transaction.abort();}catch{}reject(error);}
  };
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new DOMException('Model cache blocked','InvalidStateError'));
  request.onsuccess=()=>{
   const db=request.result;
   if(finished()){db.close();return;}
   database=db;
   db.onversionchange=()=>{if(database===db)database=null;db.close();};
   db.onclose=()=>{if(database===db)database=null;};
   resolve(db);
  };
 },OPEN_MS,undefined,'open').finally(()=>{opening=null;});
 return opening;
}
function databaseFor(signal){
 checkAbort(signal);
 return bounded((resolve,reject)=>{openDatabase().then(resolve,reject);},OPEN_MS+50,signal,'open-await');
}
function transaction(db,stores,mode,work,{signal,timeout=IO_MS,operation=mode==='readonly'?'read':'write'}={}){
 return bounded((resolve,reject,finished)=>{
  const tx=db.transaction(stores,mode);let result;
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||new DOMException('Cache transaction aborted','AbortError'));
  tx.onerror=()=>{}; // The abort event carries the failure; no unhandled request rejection.
  const guard=callback=>(...args)=>{if(finished()||signal?.aborted)return;try{callback(...args);}catch(error){try{tx.abort();}catch{}reject(error);}};
  try{work(tx,value=>{result=value;},guard);}catch(error){try{tx.abort();}catch{}reject(error);}
  return ()=>{try{tx.abort();}catch{}};
 },timeout,signal,operation);
}
function validGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>LIMIT)return false;
 const view=new DataView(buffer);
 return view.getUint32(0,true)===0x46546c67&&view.getUint32(4,true)===2&&view.getUint32(8,true)===buffer.byteLength;
}
async function matches(buffer,digest,signal,timeout=HASH_MS,operation='hash-read'){
 if(!validGLB(buffer))return false;
 const result=await bounded((resolve,reject)=>{Promise.resolve(crypto.subtle.digest('SHA-256',buffer)).then(resolve,reject);},timeout,signal,operation);
 checkAbort(signal);
 return Array.from(new Uint8Array(result),byte=>byte.toString(16).padStart(2,'0')).join('')===digest;
}
function validEntry(entry){
 return entry&&PATHS.has(entry.path)&&/^[a-f0-9]{64}$/.test(entry.digest)&&entry.key===`${entry.path}@${entry.digest}`&&
  Number.isSafeInteger(entry.bytes)&&entry.bytes>=20&&entry.bytes<=LIMIT&&Number.isFinite(entry.lastUsed);
}
function enqueue(job){
 // At most one running write and two pending jobs, with no duplicate pending key.
 if(jobs.some(item=>item.key===job.key)||jobs.length>=2){counters.skipped++;return;}
 jobs.push(job);void drain();
}
async function drain(){
 if(running)return;running=true;
 try{
  while(jobs.length){
   const job=jobs.shift();
   if(job.generation!==generation||job.signal?.aborted||!usable()){counters.skipped++;continue;}
   try{await job.run();}catch(error){if(error?.name!=='AbortError')failed(error);}
  }
 }finally{running=false;}
}
function scheduleMetadata(info,kind,signal){
 const epoch=generation;
 enqueue({key:info.key,generation:epoch,signal,run:async()=>{
  const db=await databaseFor(signal);checkAbort(signal);if(epoch!==generation)return;
  await transaction(db,['models','entries'],'readwrite',(tx,set,guard)=>{
   const entries=tx.objectStore('entries'),models=tx.objectStore('models');
   if(kind==='remove'){entries.delete(info.key);models.delete(info.key);return;}
   const request=entries.get(info.key);
   request.onsuccess=guard(()=>{if(validEntry(request.result))entries.put({...request.result,lastUsed:Date.now()});});
  },{signal,timeout:WRITE_MS,operation:'metadata'});
 }});
}
export function fingerprintModelURL(url){
 const info=fingerprint(url);if(!info)return url;
 const address=new URL(url,location.href);address.searchParams.set('v',info.digest);return address.href;
}
export async function readModelCache(url,{signal}={}){
 checkAbort(signal);const info=fingerprint(url);
 if(!info||!usable()){counters.skipped++;return null;}
 try{
  const epoch=generation,db=await databaseFor(signal);checkAbort(signal);
  const record=await transaction(db,['models'],'readonly',(tx,set)=>{
   const request=tx.objectStore('models').get(info.key);request.onsuccess=()=>set(request.result);
  },{signal});
  checkAbort(signal);
  if(epoch!==generation||!record){counters.misses++;return null;}
  if(record.key!==info.key||!await matches(record.buffer,info.digest,signal)){
   counters.invalid++;counters.misses++;scheduleMetadata(info,'remove',signal);return null;
  }
  checkAbort(signal);if(epoch!==generation)return null;
  counters.hits++;scheduleMetadata(info,'touch',signal);return record.buffer;
 }catch(error){checkAbort(signal);if(error?.name!=='AbortError')failed(error);counters.misses++;return null;}
}
export function queueModelCacheWrite(url,buffer,{signal}={}){
 const info=fingerprint(url);
 if(!info||!usable()||signal?.aborted||!validGLB(buffer)){counters.skipped++;return;}
 const epoch=generation;
 enqueue({key:info.key,generation:epoch,signal,run:async()=>{
  if(!await matches(buffer,info.digest,signal,WRITE_HASH_MS,'hash-write')){counters.invalid++;return;}
  const db=await databaseFor(signal);checkAbort(signal);if(epoch!==generation)return;
  let evicted=0;
  await transaction(db,['models','entries'],'readwrite',(tx,set,guard)=>{
   const entries=tx.objectStore('entries'),models=tx.objectStore('models'),request=entries.getAll();
   request.onsuccess=guard(()=>{
    // Read metadata only: eviction never materializes all the model buffers.
    const remaining=[];
    for(const entry of request.result){
     if(!validEntry(entry)||entry.path===info.path){entries.delete(entry.key);models.delete(entry.key);if(entry.key!==info.key)evicted++;}
     else if(entry.key!==info.key)remaining.push(entry);
    }
    remaining.sort((a,b)=>a.lastUsed-b.lastUsed);
    let bytes=remaining.reduce((sum,item)=>sum+item.bytes,0)+buffer.byteLength;
    for(const entry of remaining){
     if(bytes<=LIMIT)continue;
     entries.delete(entry.key);models.delete(entry.key);bytes-=entry.bytes;
     evicted++;
    }
    models.put({key:info.key,buffer});
    entries.put({...info,bytes:buffer.byteLength,lastUsed:Date.now()});
   });
  },{signal,timeout:WRITE_MS});
  checkAbort(signal);counters.writes++;counters.evictions+=evicted;
 }});
}
// Metadata only; no decoded geometry, player state or other databases are exposed.
export const modelCacheDiagnostics=Object.freeze({
 stats:()=>({...counters,database:DATABASE,maxBytes:LIMIT,pending:jobs.length,pendingWrites:jobs.length+(running?1:0),busy:running,enabled:usable()&&[...PATHS].some(path=>/^[a-f0-9]{64}$/i.test(HASHES[path]||'')),fingerprinted:[...PATHS].filter(path=>/^[a-f0-9]{64}$/i.test(HASHES[path]||''))}),
 async read(){
  if(!usable())return [];
  try{const db=await openDatabase();return await transaction(db,['entries'],'readonly',(tx,set)=>{const req=tx.objectStore('entries').getAll();req.onsuccess=()=>set(req.result.filter(validEntry));});}
  catch(error){failed(error);return [];}
 },
 async clear(){
  generation++;jobs.length=0;
  if(!usable())return false;
  try{const db=await openDatabase();await transaction(db,['models','entries'],'readwrite',tx=>{tx.objectStore('models').clear();tx.objectStore('entries').clear();},{timeout:WRITE_MS,operation:'clear'});return true;}
  catch(error){failed(error);return false;}
 }
});
