import {RECIPES} from './profession-content.js';
import {deriveObjectives} from './objective-content.js';
import {createObjectiveState,OBJECTIVE_KEY} from './objective-state.js';
import {cameraInputEnabled,restoreCameraInput} from './camera-input.js';
import './objectives.css';

const INTRO={
 'watercourt-intro':'先认识一朵晨露百合，再到陶作台学习它的纹样。花朵保留在行囊中，工坊提供制作材料。',
 'valley-orders':'沿用驿务厅的三份冬季委托。采收、加工、取回寄存物品，再到货栈交付；奖励由原委托发放。',
 'five-scrolls':'循着线索，寻找五城各自的一页故事。已发现的文书可在拾遗手记中重读。',
};
export function createObjectives(world,{gathering,town,market,discoveries,resources,valleyTown,getRegion,isBlocked,say}){
 const state=createObjectiveState(),canvas=world.renderer.domElement;
 let disposed=false,request=0,pending=false,handoff=false,opener=null,enabled=true,last=0,signature='',previous=null;
 const button=document.createElement('button');button.className='objective-button';button.textContent='目标';button.setAttribute('aria-label','打开探索目标');
 const card=document.createElement('button');card.className='objective-card';card.hidden=true;card.type='button';card.innerHTML='<small>当前目标</small><strong></strong><span></span><em></em>';card.setAttribute('aria-label','查看当前目标');
 const dialog=document.createElement('dialog');dialog.className='objective-dialog';dialog.setAttribute('aria-labelledby','objective-title');
 dialog.innerHTML='<header><div><small>沿着一件小事，认识一座城</small><h2 id="objective-title">探索目标</h2></div><button data-objective-close aria-label="关闭探索目标">×</button></header><p class="objective-intro">选一个目标开始。进度沿用已有收藏与委托；可随时停止跟踪，已完成的事情会保留。</p><div class="objective-list"></div><p class="objective-feedback" role="status" aria-live="polite"></p><footer>地点指引会切换到近观视点；户外可自由步行，室内固定视点环顾。</footer>';
 document.body.append(card,dialog);const list=dialog.querySelector('.objective-list'),feedback=dialog.querySelector('.objective-feedback');
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const action=(text,fn,key,value)=>{const n=node('button',text);n.type='button';n.onclick=fn;if(key)n.dataset[key]=value;return n;};
 function snapshot(){return deriveObjectives({market:market.store.snapshot(),town:town.store.snapshot(),gathering:gathering.store.snapshot(),discovery:discoveries.store.snapshot()},{region:getRegion()});}
 const tracked=goals=>goals.find(g=>g.id===state.snapshot().trackedId);
 function invalidate(){request++;pending=false;}
 function render(goals=snapshot()){
  const active=tracked(goals);card.hidden=!active;document.body.dataset.objectiveTracked=String(!!active);
  if(active){const count=active.steps.filter(s=>s.status==='complete').length;card.dataset.objective=active.id;card.querySelector('strong').textContent=active.title;card.querySelector('span').textContent=active.status==='complete'?'已完成 · 查看旅途记录':active.nextAction?.label||'查看目标详情';card.querySelector('em').textContent=`${count} / ${active.steps.length} · 点此查看`;card.setAttribute('aria-label','当前目标：'+active.title+'，打开详情');}
  if(!dialog.open)return;
  const focus=document.activeElement,key=focus?.dataset.objectiveTrack?'objectiveTrack':focus?.dataset.objectiveGo?'objectiveGo':null,value=key?focus.dataset[key]:null,scroll=list.scrollTop;
  list.replaceChildren();
  for(const g of goals){const section=node('section',undefined,'objective-goal');section.dataset.objective=g.id;section.dataset.status=g.status;section.dataset.tracked=String(active?.id===g.id);section.append(node('h3',g.title),node('p',INTRO[g.id]));
   const steps=node('ol');for(const s of g.steps){const li=node('li',(s.status==='complete'?'✓ ':'○ ')+s.title);li.dataset.step=s.id;li.dataset.complete=String(s.status==='complete');steps.append(li);}section.append(steps);
   function materials(rows,title){if(!rows?.length)return;section.append(node('h4',title));const ul=node('ul',undefined,'objective-materials');for(const m of rows){const li=node('li');li.dataset.material=m.id;li.append(node('strong',`${m.name} × ${m.required}`),node('span',`随身 ${m.bag} · 保管库 ${m.vault} · 随身还差 ${m.missing}`));ul.append(li);}section.append(ul);}
   if(g.status!=='complete'){materials(g.materials,'交付物资');if(g.processing)materials(g.processing.materials,`下一次加工 · ${RECIPES.find(r=>r.id===g.processing.recipeId)?.name||'配方'} × ${g.processing.batches}`);}
   const controls=node('div',undefined,'objective-actions');controls.append(action(active?.id===g.id?'停止跟踪':g.status==='complete'?'查看完成记录':'跟踪这个目标',()=>track(active?.id===g.id?null:g.id),'objectiveTrack',g.id));
   if(g.nextAction){const go=action(g.nextAction.label,()=>navigate(g.id),'objectiveGo',g.id);go.disabled=pending;controls.append(go);}else controls.append(node('small','已完成 · 原有收藏与纪念保留'));section.append(controls);list.append(section);
  }
  list.scrollTop=scroll;if(key){const target=[...list.querySelectorAll('button')].find(n=>n.dataset[key]===value);target?.focus({preventScroll:true});}
 }
 function track(id){invalidate();previous=null;const result=state.track(id);signature='';render();feedback.textContent=result.message;if(!result.saved)say(result.message);return result;}
 function open(){if(disposed||(!dialog.open&&isBlocked()))return false;handoff=false;invalidate();opener=document.activeElement;enabled=cameraInputEnabled(world);world.cancelCameraMotion({preserveExploration:true});resources.cancel();town.clear();gathering.cancel({clearSelection:true});if(!dialog.open){world.controls.enabled=false;dialog.showModal();world.atlas?.update(0);}feedback.textContent='';signature='';render();dialog.querySelector('[data-objective-close]').focus();return true;}
 function close(){invalidate();if(dialog.open)dialog.close();}
 dialog.querySelector('[data-objective-close]').onclick=close;dialog.addEventListener('cancel',invalidate);
 dialog.addEventListener('close',()=>{if(dialog.open||disposed)return;if(handoff){handoff=false;return;}invalidate();if(!document.querySelector('dialog[open]'))restoreCameraInput(world,enabled&&!world.atlas.active);(opener?.isConnected?opener:button).focus({preventScroll:true});});
 async function navigate(id){
  if(disposed||pending||!dialog.open)return false;const goal=snapshot().find(g=>g.id===id),target=goal?.nextAction;if(!target)return false;
  if(state.snapshot().trackedId!==id)track(id);
  const token=++request,origin={mode:world.atlas.mode,region:getRegion()};pending=true;feedback.textContent='正在准备地点；关闭此窗口可取消前往。';render();
  try{await world.atlas.readyFor(target.region);}catch{/* Retry the same objective in place. */}
  if(disposed||token!==request||!dialog.open)return false;
  pending=false;if(world.atlas.mode!==origin.mode||getRegion()!==origin.region){invalidate();feedback.textContent='位置已改变，已取消这次指引。';render();return false;}
  if(world.atlas.regions.find(r=>r.id===target.region)?.status!=='ready'){feedback.textContent='地点暂未能展开。你仍在原处，可点击同一指引重试。';render();return false;}
  handoff=true;dialog.close();let ok=false;
  try{switch(target.kind){
   case 'flower':ok=world.atlas.travel(target.region)&&gathering.focusNearby({type:target.id,region:target.region});break;
   case 'town-craft':case 'recipe':ok=await town.focus(target.kind==='recipe'?target.site:target.id);break;
   case 'discovery':ok=await discoveries.focus(target.id);break;
   case 'resource':ok=resources.focus(target.id);break;
   case 'valley-accept':case 'valley-deliver':case 'vault':ok=valleyTown.focus(target.kind==='valley-accept'?'hall':'storehouse',0);if(ok){if(target.kind==='vault')valleyTown.vault();else valleyTown.orders(target.kind==='valley-deliver');}break;
   case 'market':ok=world.atlas.travel(target.region);if(ok)market.showDirectory();break;
  }}catch{ok=false;}
  if(!ok)say('这处地点暂时没有可用视点，请在目标中重试或从地图查看。');return !!ok;
 }
 function update(now=performance.now()){
  if(disposed||now-last<500)return;last=now;if(!state.snapshot().trackedId&&!dialog.open)return;
  const goals=snapshot(),active=tracked(goals);
  if(previous&&active&&previous.id===active.id){if(previous.status!=='complete'&&active.status==='complete')say('目标完成 · '+active.title+'。收藏与纪念可在原有手册中查看。');else if(active.id==='valley-orders'&&active.completedCount>previous.completedCount)say('物资已交付。下一份北境委托已开放，可在目标中查看。');}
  previous=active;const next=JSON.stringify(goals);if(next!==signature){signature=next;render(goals);}
 }
 const storage=e=>{if(e.key===OBJECTIVE_KEY||e.key===null){state.reload();previous=null;signature='';render();}};
 button.onclick=open;card.onclick=open;window.addEventListener('storage',storage);
 const observer=new ResizeObserver(()=>document.body.style.setProperty('--objective-card-height',card.offsetHeight+'px'));observer.observe(card);
 return{button,open,close,track,navigate,update,stats:()=>({trackedId:state.snapshot().trackedId,pending,persistent:state.persistent,goals:snapshot()}),dispose(){disposed=true;invalidate();observer.disconnect();if(dialog.open)dialog.close();[button,card,dialog].forEach(n=>n.remove());window.removeEventListener('storage',storage);delete document.body.dataset.objectiveTracked;document.body.style.removeProperty('--objective-card-height');}};
}
