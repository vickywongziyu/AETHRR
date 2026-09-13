import {DISCOVERIES,FLOWER_REQUIREMENTS} from './discovery-content.js';
export const DISCOVERY_KEY='aether.discovery.v1';
const known=new Set(DISCOVERIES.map(d=>d.id));
export function createDiscoveryStore(storage,clock=()=>Date.now()){
 if(!storage)try{storage=globalThis.localStorage;}catch{storage=null;}
 let state={version:1,scrolls:[],wishes:[]},persistent=true;
 function reload(){
  try{const data=JSON.parse(storage?.getItem(DISCOVERY_KEY)||'null');if(data?.version!==1)return;
   state={version:1,scrolls:[...new Set((Array.isArray(data.scrolls)?data.scrolls:[]).filter(id=>known.has(id)))],wishes:(Array.isArray(data.wishes)?data.wishes:[]).filter(w=>typeof w.id==='string'&&w.id.length<100&&typeof w.text==='string'&&w.text.trim().length>0&&w.text.length<=240&&typeof w.name==='string'&&w.name.length<=20&&Number.isFinite(w.at)&&w.at>0).slice(0,30).map(w=>({id:w.id,text:w.text,name:w.name,at:w.at}))};
  }catch{persistent=false;}
 }
 function save(){try{if(!storage)throw Error('Unavailable');storage.setItem(DISCOVERY_KEY,JSON.stringify(state));persistent=true;}catch{persistent=false;}return persistent;}
 reload();
 return {reload,snapshot:()=>structuredClone(state),has:id=>state.scrolls.includes(id),get persistent(){return persistent;},
  discover(id){if(!known.has(id))return null;const fresh=!state.scrolls.includes(id);if(fresh)state.scrolls.push(id);const saved=save();return {fresh,saved};},
  progress:items=>FLOWER_REQUIREMENTS.map(f=>({...f,collected:Number.isSafeInteger(items[f.id])&&items[f.id]>0})),
  wish({text,name},items){
   if(!FLOWER_REQUIREMENTS.every(f=>Number.isSafeInteger(items[f.id])&&items[f.id]>0))return {ok:false,error:'请先集齐五境各一种花。'};
   text=String(text||'').trim();name=String(name||'').trim()||'无名旅人';
   if(!text||text.length>240||name.length>20)return {ok:false,error:'请写下 1–240 字的心愿，署名不超过 20 字。'};
   const wish={id:globalThis.crypto.randomUUID(),text,name,at:clock()};state.wishes.unshift(wish);state.wishes=state.wishes.slice(0,30);return {ok:true,wish,saved:save()};
  },
  remove(id){const count=state.wishes.length;state.wishes=state.wishes.filter(w=>w.id!==id);if(count===state.wishes.length)return false;save();return true;},
 };
}
