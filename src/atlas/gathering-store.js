import {HERBS} from './biome-vegetation.js';
export const GATHERING_KEY='aether.gathering.v1';
export const REGROW_MS=180000;
const known=new Set(HERBS.map(h=>h.id));
export function createGatheringStore(storage,clock=()=>Date.now()){
 if(!storage){try{storage=globalThis.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}};}}
 let state={version:1,items:{},picked:{}};
 function reload(){
  try{const raw=storage.getItem(GATHERING_KEY);state={version:1,items:{},picked:{}};const parsed=JSON.parse(raw||'null');if(parsed?.version!==1)return;
   const items={},picked={};for(const [id,qty] of Object.entries(parsed.items||{}))if(known.has(id)&&Number.isSafeInteger(qty)&&qty>0)items[id]=Math.min(qty,99999);
   for(const [id,until] of Object.entries(parsed.picked||{}))if(id.startsWith('flora-v1/')&&Number.isFinite(until)&&until>clock()&&until<=clock()+REGROW_MS)picked[id]=until;
   state={version:1,items,picked};
  }catch{/* Private browsing or corrupt local data should not prevent exploring. */}
 }
 function save(){try{storage.setItem(GATHERING_KEY,JSON.stringify(state));return true;}catch{return false;}}
 reload();
 return {reload,available:id=>!(state.picked[id]>clock()),
  collect(node){if(!known.has(node.type)||state.picked[node.id]>clock())return null;state.items[node.type]=Math.min(99999,(state.items[node.type]||0)+1);state.picked[node.id]=clock()+REGROW_MS;for(const [id,until] of Object.entries(state.picked))if(until<=clock())delete state.picked[id];const saved=save();return {type:node.type,count:state.items[node.type],saved};},
  snapshot:()=>structuredClone(state),get total(){return Object.values(state.items).reduce((a,b)=>a+b,0);},
 };
}
