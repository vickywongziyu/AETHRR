import {OBJECTIVE_IDS} from './objective-content.js';
export const OBJECTIVE_KEY='aether.objective-tracking.v1';
// Tracking is a preference only; completion always comes from existing stores.
export function createObjectiveState(storage){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 let trackedId=null,persistent=true;
 function reload(){trackedId=null;try{const raw=JSON.parse(storage?.getItem(OBJECTIVE_KEY)||'null');if(raw?.version===1&&OBJECTIVE_IDS.includes(raw.trackedId))trackedId=raw.trackedId;}catch{persistent=false;}return snapshot();}
 function snapshot(){return {version:1,trackedId};}
 function track(id){if(id!==null&&!OBJECTIVE_IDS.includes(id))return {ok:false,saved:false,message:'未知目标。'};trackedId=id;try{if(!storage)throw Error('Unavailable');storage.setItem(OBJECTIVE_KEY,JSON.stringify(snapshot()));persistent=true;}catch{persistent=false;}return {ok:true,saved:persistent,trackedId,message:persistent?'已更新当前目标。':'目标仅在本次旅途跟踪，刷新后可能丢失。'};}
 reload();return {reload,snapshot,track,get persistent(){return persistent;}};
}
