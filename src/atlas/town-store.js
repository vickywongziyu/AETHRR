import {TRADES,TOWN_KEY,FISH} from './town-content.js';
const ids=TRADES.map(t=>t.id),fishIds=FISH.map(f=>f.id);
export function createTownStore(storage){
 if(!storage)try{storage=globalThis.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('unavailable');}};}
 let state;const blank=()=>({version:1,visited:[],crafted:[],display:{},fish:{},hearth:true,rested:false,commission:false});
 function reload(){state=blank();try{const r=JSON.parse(storage.getItem(TOWN_KEY));if(r?.version!==1)return;for(const k of ['visited','crafted'])state[k]=ids.filter(id=>Array.isArray(r[k])&&r[k].includes(id));for(const id of ids)if(state.crafted.includes(id))state.display[id]=r.display?.[id]!==false;for(const id of fishIds)if(Number.isSafeInteger(r.fish?.[id])&&r.fish[id]>0)state.fish[id]=Math.min(9999,r.fish[id]);state.hearth=r.hearth!==false;state.rested=r.rested===true;state.commission=r.commission===true&&state.crafted.length===5;}catch{/* Keep exploration available with a damaged or blocked local store. */}}
 function save(){try{storage.setItem(TOWN_KEY,JSON.stringify(state));return true;}catch{return false;}}
 reload();return{reload,snapshot:()=>structuredClone(state),visit(id){if(!ids.includes(id))return false;if(!state.visited.includes(id))state.visited.push(id);return save();},
 craft(id,items){if(!ids.includes(id)||!(items[id+'-flower']>0))return{ok:false,error:'先采集一朵当地的花，学习它的纹样。'};const fresh=!state.crafted.includes(id);if(fresh)state.crafted.push(id);state.display[id]=true;return{ok:true,fresh,saved:save()};},
 display(id,visible){if(!state.crafted.includes(id))return false;state.display[id]=!!visible;return save();},
 catchFish(id){if(!fishIds.includes(id))return false;state.fish[id]=Math.min(9999,(state.fish[id]||0)+1);return save();},
 hearth(on){state.hearth=!!on;return save();},rest(){state.rested=true;return save();},
 claim(){if(state.crafted.length!==5||state.commission)return false;state.commission=true;return save();}};
}
