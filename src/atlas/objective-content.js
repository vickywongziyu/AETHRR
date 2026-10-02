import {VALLEY_ORDERS} from './valley-town-content.js';
import {RECIPES} from './profession-content.js';
import {GOODS} from './market-content.js';
import {RESOURCE_SITES,RESOURCE_TYPES} from './resource-content.js';
import {DISCOVERIES} from './discovery-content.js';

export const OBJECTIVE_IDS=['watercourt-intro','valley-orders','five-scrolls'];
const qty=value=>Number.isSafeInteger(value)&&value>0?value:0;
const has=(values,id)=>Array.isArray(values)&&values.includes(id);
const recipeSite=id=>{const recipe=RECIPES.find(r=>r.id===id);return id==='charcoal'?'charcoal-kiln':id==='flour'?'mill':recipe?.site||null;};
const action=(kind,id,region,label)=>({kind,id,region,label,...(kind==='recipe'?{site:recipeSite(id)}:{})});
const step=(id,title,complete)=>({id,title,status:complete?'complete':'pending'});
const name=id=>GOODS.find(g=>g.id===id)?.name||id;
function sourceFor(id){const site=RESOURCE_SITES.find(s=>RESOURCE_TYPES[s.kind].item===id);return site?{id:site.id,region:site.region,label:site.place}:null;}
function materialsFor(input,market){return Object.entries(input).map(([id,required])=>{const bag=qty(market.bag?.[id]),vault=qty(market.vault?.[id]),recipe=RECIPES.find(r=>r.output[id]);return {id,name:name(id),required,bag,vault,missing:Math.max(0,required-bag),missingTotal:Math.max(0,required-bag-vault),source:sourceFor(id),recipe:recipe?{id:recipe.id,site:recipeSite(recipe.id),region:recipe.site==='kitchen'?'highland':recipe.site,label:recipe.name,made:qty(market.professions?.made?.[recipe.id])}:null};});}
// Read snapshots only. Inventory never proves delivery or a past craft.
// nextAction points to an existing activity/view, not automatic walking.
export function deriveObjectives({market={},town={},gathering={},discovery={}}={}, {region=null}={}){
 const flower=qty(gathering.items?.['watercourt-flower'])>0,crafted=has(town.crafted,'watercourt');
 const watercourt={id:'watercourt-intro',title:'水庭陶艺初识',region:'watercourt',status:crafted?'complete':flower?'active':'available',steps:[step('flower','采集一朵晨露百合',flower||crafted),step('craft','在晨露陶作台制作百合花器',crafted)],materials:[],nextAction:crafted?null:flower?action('town-craft','watercourt','watercourt','查看晨露陶作台'):action('flower','watercourt-flower','watercourt','寻找晨露百合')};
 // Store itself accepts only a completed prefix; mirror that contract for raw snapshots.
 let completedCount=0;for(const order of VALLEY_ORDERS){if(!has(market.valleyOrders?.completed,order.id))break;completedCount++;}
 const order=VALLEY_ORDERS[completedCount],accepted=!!order&&market.valleyOrders?.active===order.id;
 const materials=order?materialsFor(order.input,market):[],ready=materials.every(m=>m.missing===0);
 let nextAction=null,processing=null;
 if(order){if(!accepted)nextAction=action('valley-accept',order.id,'valley','查看北境驿务厅委托');else if(ready)nextAction=action('valley-deliver',order.id,'valley','到雪松货栈交付');else{
 const missing=materials.find(m=>m.missing>0);
 if(missing.vault>0)nextAction=action('vault',missing.id,'valley','到公共保管库取回'+missing.name);
 else if(missing.recipe){const recipe=RECIPES.find(r=>r.id===missing.recipe.id);const batches=Math.ceil(missing.missingTotal/recipe.output[missing.id]);processing={recipeId:recipe.id,batches,materials:materialsFor(Object.fromEntries(Object.entries(recipe.input).map(([id,n])=>[id,n*batches])),market)};
 const raw=processing.materials.find(m=>m.missing>0);
 if(raw?.vault>0)nextAction=action('vault',raw.id,'valley','到公共保管库取回'+raw.name);
 else if(raw?.source)nextAction=action('resource',raw.source.id,raw.source.region,'查看'+raw.source.label);
 else if(raw?.recipe)nextAction=action('recipe',raw.recipe.id,raw.recipe.region,'查看'+raw.recipe.label);
 else if(raw)nextAction=action('market',raw.id,'highland','查看'+raw.name+'补给');
 else nextAction=action('recipe',recipe.id,missing.recipe.region,'查看'+recipe.name);
 }else if(missing.source)nextAction=action('resource',missing.source.id,missing.source.region,'查看'+missing.source.label);
 else nextAction=action('market',missing.id,'highland','查看'+missing.name+'补给');
 }}
 const valley={id:'valley-orders',title:order?'北境委托 · '+order.name:'北境委托已完成',region:'valley',orderId:order?.id||null,completedCount,status:!order?'complete':accepted?'active':'available',steps:order?[step('accept','在驿务厅接取委托',accepted),step('materials','备齐随身交付物资',ready),step('deliver','在雪松货栈交付',false)]:[step('deliver','三份冬季委托全部交付',true)],materials,processing,nextAction};
 const scrollSteps=DISCOVERIES.map(d=>({...step(d.id,d.title,has(discovery.scrolls,d.id)),region:d.region,clue:d.clue}));const complete=scrollSteps.every(s=>s.status==='complete');const pending=scrollSteps.filter(s=>s.status!=='complete'),next=pending.find(s=>s.region===region)||pending[0];
 const scrolls={id:'five-scrolls',title:'五境文书收藏',region:null,status:complete?'complete':pending.length<DISCOVERIES.length?'active':'available',steps:scrollSteps,materials:[],nextAction:next?action('discovery',next.id,next.region,'寻找'+next.title):null};
 return [watercourt,valley,scrolls];
}
