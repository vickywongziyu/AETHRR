import * as T from 'three';
import {createBiomeVegetation,HERBS} from './biome-vegetation.js';
import {createGatheringStore,GATHERING_KEY} from './gathering-store.js';
import './living-world.css';
import {GOODS} from './market-content.js';
import {EFFECTS} from './profession-content.js';
const itemIcon=item=>`<svg viewBox="0 0 64 64" aria-hidden="true" style="--herb:${item.color}"><path d="M29 54Q40 32 30 12" fill="none" stroke="#819767" stroke-width="3"/><path d="M31 43Q7 43 11 25Q30 23 31 43M33 32Q55 28 51 13Q32 16 33 32" fill="#597853" stroke="#b3c186"/>${item.kind==='花卉'?'<g fill="var(--herb)" stroke="#f7e8bf" stroke-width=".5"><ellipse cx="28" cy="18" rx="7" ry="13"/><ellipse cx="28" cy="18" rx="7" ry="13" transform="rotate(60 28 18)"/><ellipse cx="28" cy="18" rx="7" ry="13" transform="rotate(120 28 18)"/></g><circle cx="28" cy="18" r="4" fill="#d6a445"/>':'<path d="M28 47Q15 35 22 8Q36 26 28 47" fill="var(--herb)" stroke="#bfd194"/>'}</svg>`;
export function createGathering({world,nav,time,isBlocked,say}){
 const {scene,camera,controls,renderer}=world,canvas=renderer.domElement,store=createGatheringStore();
 let hovered=null,action=null,pointerDown=null,lastHover=0,lastGrowth=0,disposed=false,bagFocus=null,lastEffect=0;
 const pickMesh=new T.Mesh(),sphere=new T.Sphere(),hitPoint=new T.Vector3();
 const ray=new T.Raycaster(),ndc=new T.Vector2(),pos=new T.Vector3(),screen=new T.Vector3(),bright=new T.Color();
 const flora=createBiomeVegetation({scene,camera,time,nav,available:id=>store.available(id)});
 const bagButton=document.createElement('button');bagButton.className='herb-bag-button';bagButton.setAttribute('aria-label','打开采集行囊');bagButton.innerHTML='行囊 <kbd>B</kbd><b>0</b>';document.querySelector('.atlas-modes').append(bagButton);
 const nearButton=document.createElement('button');nearButton.className='herb-nearby';nearButton.textContent='草木近观';nearButton.setAttribute('aria-label','寻找附近可采集花草');bagButton.before(nearButton);
 const bag=document.createElement('dialog');bag.className='herb-bag';bag.setAttribute('aria-labelledby','herb-bag-title');bag.innerHTML=`<header><div><small>FIELD SATCHEL</small><h2 id="herb-bag-title">旅人行囊</h2></div><button class="herb-close" aria-label="关闭采集行囊">×</button></header><p class="herb-bag-summary"></p><section class="bag-active-effects" hidden><h3>生效中的补给</h3><ul></ul></section><div class="herb-slots"></div><section class="bag-purchases"><h3>随身物品</h3><p></p><div></div></section><div class="herb-details"><small>旅途中的小小收藏</small><p>点击草叶、花朵或蕨丛进行采集。采走的植物会在三分钟后重新生长。</p></div><p class="bag-use-feedback" role="status" tabindex="-1"></p><footer>收藏保存在这台设备 · <kbd>B</kbd> 收起</footer>`;
 const hint=document.createElement('button');hint.className='herb-hint';hint.hidden=true;hint.setAttribute('aria-label','采集当前植物');
 const progress=document.createElement('div');progress.className='herb-cast';progress.hidden=true;progress.setAttribute('role','status');progress.innerHTML='<span></span><div><i></i></div><small>Esc 取消</small>';
 const toast=document.createElement('div');toast.className='herb-loot';toast.setAttribute('role','status');
 document.body.append(bag,hint,progress,toast);let toastTimer;queueMicrotask(refreshBag);
 const items=new Map(HERBS.map(i=>[i.id,i]));
 function refreshBag(){
  const snapshot=store.snapshot(),owned=HERBS.filter(i=>snapshot.items[i.id]);const marketState=world.atlas?.market?.store.snapshot(),goodsTotal=marketState?Object.values(marketState.bag).reduce((a,b)=>a+b,0):0;bagButton.querySelector('b').textContent=store.total+goodsTotal;bag.querySelector('.herb-bag-summary').textContent=owned.length?`${owned.length} 种草木 · ${store.total} 份收藏`:'还没有采集草木，沿途的植物正等待被发现。';
  bag.querySelector('.herb-slots').innerHTML=HERBS.map(item=>{const count=snapshot.items[item.id]||0;return `<button class="herb-slot ${count?'':'undiscovered'}" data-herb="${item.id}" aria-label="${item.name}，${count} 份" style="--herb:${item.color}">${itemIcon(item)}<strong>${count?item.name:'未采集'}</strong><b>${count||'—'}</b></button>`;}).join('');
  const purchases=bag.querySelector('.bag-purchases');purchases.querySelector('p').textContent=marketState?`${marketState.coins} 枚铜币 · ${goodsTotal} 件随身物品 · ${marketState.home.objects.length} 件陈设已摆入客房`:'市集尚未展开';const content=purchases.querySelector('div');content.replaceChildren();for(const g of GOODS.filter(g=>marketState?.bag[g.id]>0)){const row=document.createElement('p');row.textContent=g.name+' × '+marketState.bag[g.id];if(EFFECTS[g.id]){const e=EFFECTS[g.id],detail=document.createElement('small');detail.textContent=e.text+' · 5 分钟';row.append(detail);const use=document.createElement('button');use.type='button';use.dataset.consume=g.id;use.textContent='使用'+g.name;use.disabled=world.atlas.market.store.effect(g.id)>0;use.onclick=()=>{const result=world.atlas.market.store.consume(g.id);refreshBag();const status=bag.querySelector('.bag-use-feedback');status.textContent=result.message;status.focus({preventScroll:true});};const countdown=document.createElement('small');countdown.dataset.effectCountdown=g.id;row.append(use,countdown);}content.append(row);}if(!goodsTotal){const empty=document.createElement('p');empty.textContent='采收、加工和购入的物品会出现在这里。';content.append(empty);}const home=document.createElement('button');home.textContent='前往客房布置陈设';home.type='button';home.onclick=()=>{bag.addEventListener('close',()=>world.atlas.housing.open(),{once:true});hideBag();};content.append(home);
  refreshEffects();
  bag.querySelectorAll('[data-herb]').forEach(b=>b.onclick=()=>{const item=items.get(b.dataset.herb),count=store.snapshot().items[item.id]||0;bag.querySelector('.herb-details').innerHTML=`<small>${item.kind} · ${count} 份</small><h3>${item.name}</h3><p>${item.description}</p>`;});
 }
 function refreshEffects(){const market=world.atlas?.market?.store,active=Object.keys(EFFECTS).filter(id=>market?.effect(id)>0);const section=bag.querySelector('.bag-active-effects');section.hidden=!active.length;const list=section.querySelector('ul');list.replaceChildren();for(const id of active){const row=document.createElement('li');row.dataset.activeEffect=id;row.textContent=EFFECTS[id].name+' · '+EFFECTS[id].text+' · 剩余 '+Math.ceil(market.effect(id)/1000)+' 秒';list.append(row);}supply.hidden=!active.length;supply.title=active.map(id=>EFFECTS[id].name+' · '+Math.ceil(market.effect(id)/1000)+' 秒').join('；');for(const n of bag.querySelectorAll('[data-effect-countdown]')){const remaining=market?.effect(n.dataset.effectCountdown)||0;n.textContent=remaining?'生效中 · 剩余 '+Math.ceil(remaining/1000)+' 秒':'';}for(const b of bag.querySelectorAll('[data-consume]'))b.disabled=market?.effect(b.dataset.consume)>0;}
 function focusNearby(){
  if(isBlocked())return false;cancel();world.cancelCameraMotion();
  const candidates=[...flora.nodes.values()].filter(n=>n.active&&(n.kind==='flower'||n.kind==='blossom')&&n.mesh.parent.visible).map(node=>({node,position:flora.worldPosition(node,new T.Vector3())}));
  for(const c of candidates){const neighbours=candidates.filter(other=>other!==c&&other.node.region===c.node.region&&other.position.distanceToSquared(c.position)<36).length;c.d=c.position.distanceToSquared(camera.position)/(1+Math.min(neighbours,6)*.45);if(c.node.region==='valley'&&c.position.y>20)c.d+=100000;}candidates.sort((a,b)=>a.d-b.d);
  const direction=new T.Vector3().subVectors(camera.position,controls.target).setY(0).normalize();if(direction.lengthSq()<.1)direction.set(0,0,1);
  for(const {node} of candidates.slice(0,100)){
   const target=flora.worldPosition(node,new T.Vector3()).add(new T.Vector3(0,.55,0)),view=target.clone().addScaledVector(direction,5.5);view.y+=2.2;
   const ground=nav.height(view.x,view.z,view.y+1);if(ground!==null)view.y=Math.max(view.y,ground+1.4);
   if(view.y-target.y>4.5||nav.obstructed(view,view,.8)||nav.obstructed(view,target,.28))continue;
   document.body.dataset.atlasInspecting='true';camera.position.copy(view);controls.target.copy(target);camera.lookAt(target);controls.update();setHover(node);say('点击花草采集 · B 打开行囊 · 右键平移继续探索');return true;
  }
  say('请在地图中选择一片区域，再靠近它的草地。');return false;
 }
 const supply=document.createElement('button');supply.className='supply-status';supply.hidden=true;supply.textContent='✦';supply.setAttribute('aria-label','查看生效中的补给');document.querySelector('.atlas-location').append(supply);supply.onclick=()=>{if(!isBlocked())showBag();};
 nearButton.onclick=focusNearby;
 function showBag(){if(bag.open)return;world.atlas?.resources?.cancel();cancel();bagFocus=document.activeElement;refreshBag();bag.showModal();bag.querySelector('.herb-close').focus();}
 function hideBag(){bag.close();}
 bagButton.onclick=showBag;bag.querySelector('.herb-close').onclick=hideBag;bag.addEventListener('close',()=>bagFocus?.focus({preventScroll:true}));bag.addEventListener('click',e=>{if(e.target===bag){const r=bag.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)hideBag();}});
 function setHover(node){
  if(hovered===node)return;
  if(hovered){hovered.mesh.setColorAt(hovered.index,hovered.color);hovered.mesh.instanceColor.needsUpdate=true;}
  hovered=node;if(node){node.mesh.setColorAt(node.index,bright.copy(node.color).multiplyScalar(1.5));node.mesh.instanceColor.needsUpdate=true;hint.innerHTML=`<span>✧</span> ${items.get(node.type).name} <small>采集 · E</small>`;}
  hint.hidden=!node||!!action;canvas.classList.toggle('herb-cursor',!!node);
 }
 function hit(event){
  if(isBlocked()||bag.open)return null;
  const r=canvas.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const candidates=[];ray.far=90;
  for(const node of flora.nodes.values()){
   if(!node.active||!node.mesh.parent.visible)continue;
   const bounds=node.mesh.geometry.boundingSphere;sphere.center.copy(bounds.center).applyMatrix4(node.matrix).add(node.mesh.parent.position);sphere.radius=bounds.radius*node.scale+.12;
   if(ray.ray.intersectSphere(sphere,hitPoint)){const distance=camera.position.distanceToSquared(hitPoint);if(distance<8100)candidates.push({node,distance});}
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  for(const {node} of candidates.slice(0,24)){
   pickMesh.geometry=node.mesh.geometry;pickMesh.material=node.mesh.material;pickMesh.matrixWorld.multiplyMatrices(node.mesh.matrixWorld,node.matrix);const hits=[];pickMesh.raycast(ray,hits);hits.sort((a,b)=>a.distance-b.distance);
   if(!hits.length)continue;const target=hits[0].point.clone().lerp(camera.position,.004);if(nav.obstructed(camera.position,target,.004))continue;return node;
  }
  return null;
 }
 function cancel({clearSelection=false}={}){action=null;progress.hidden=true;hint.hidden=true;if(clearSelection)setHover(null);}
 function collect(node){
  if(!node?.active||isBlocked()||bag.open||action)return;
  world.cancelCameraMotion();flora.worldPosition(node,pos);
  const center=node.mesh.geometry.boundingSphere.center.clone().applyMatrix4(node.matrix).add(node.mesh.parent.position);if(nav.obstructed(camera.position,center,.004)){say('这株植物被遮住了，请换个角度采集。');return;}
  if(camera.position.distanceTo(pos)>42){say('请滚轮靠近一些，再采集这株植物。');return;}
  action={node,duration:world.atlas?.market?.store.effect('tonic')?600:900,start:performance.now(),camera:camera.position.clone()};setHover(node);hint.hidden=true;progress.hidden=false;progress.querySelector('span').textContent='正在采集 · '+items.get(node.type).name;progress.querySelector('i').style.transform='scaleX(0)';
 }
 function complete(node){
  const result=store.collect(node);cancel();if(!result)return;flora.setAvailable(node,false);setHover(null);refreshBag();const item=items.get(node.type);toast.innerHTML=`${itemIcon(item)}<div><small>已收入行囊</small><strong>${item.name} <b>+1</b></strong></div>`;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2700);if(!result.saved)say('已收入本次行囊；浏览器未允许保存，刷新后可能丢失。');
 }
 const move=e=>{if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>6){cancel();setHover(null);return;}if(performance.now()-lastHover<100)return;lastHover=performance.now();if(!action)setHover(hit(e));};
 const down=e=>{if(e.button!==0)return;pointerDown={x:e.clientX,y:e.clientY};};
 const up=e=>{const start=pointerDown;pointerDown=null;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)return;const node=hit(e);if(node){setHover(node);collect(node);}};
 const leave=e=>{pointerDown=null;if(e.relatedTarget===hint||hint.contains(e.relatedTarget))return;if(!action)setHover(null);};
 const key=e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='KeyB'){if(!bag.open&&isBlocked())return;e.preventDefault();e.stopImmediatePropagation();bag.open?hideBag():showBag();}else if(e.code==='KeyE'&&hovered&&!isBlocked()){e.preventDefault();e.stopImmediatePropagation();collect(hovered);}else if(e.code==='Escape'&&action){e.preventDefault();e.stopImmediatePropagation();cancel();}};
 const blur=()=>{cancel();setHover(null);};
 const storage=e=>{if(e.key!==GATHERING_KEY)return;store.reload();for(const node of flora.nodes.values())if(node.active!==store.available(node.id))flora.setAvailable(node,store.available(node.id));refreshBag();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',leave);canvas.addEventListener('pointerleave',leave);window.addEventListener('keydown',key,true);window.addEventListener('blur',blur);window.addEventListener('storage',storage);hint.onclick=()=>collect(hovered);refreshBag();
 function update(){
  flora.update();const now=performance.now();
  if(action){if(isBlocked()||bag.open||camera.position.distanceTo(action.camera)>.6){cancel();}else{const amount=Math.min(1,(now-action.start)/action.duration);progress.querySelector('i').style.transform=`scaleX(${amount})`;if(amount>=1)complete(action.node);}}
  if(hovered&&(!hovered.active||!hovered.mesh.parent.visible||flora.worldPosition(hovered,pos).distanceToSquared(camera.position)>8100))setHover(null);
  if(hovered&&!action){flora.worldPosition(hovered,screen).add(new T.Vector3(0,.9,0)).project(camera);hint.hidden=screen.z>1||screen.z< -1||isBlocked()||bag.open;if(!hint.hidden){hint.style.left=T.MathUtils.clamp((screen.x*.5+.5)*innerWidth,110,innerWidth-110)+'px';hint.style.top=T.MathUtils.clamp((-.5*screen.y+.5)*innerHeight-32,115,innerHeight-190)+'px';}}
  if(now-lastEffect>1000){lastEffect=now;refreshEffects();}
  if(now-lastGrowth>1000){lastGrowth=now;for(const node of flora.nodes.values())if(!node.active&&store.available(node.id))flora.setAvailable(node,true);}
 }
 return {add:flora.add,refreshBag,update,cancel,flora,store,showBag,focusNearby,stats:()=>({biomes:flora.stats(),items:store.snapshot().items,total:store.total,collecting:action?.node.id||null,duration:action?.duration||null,selected:hovered?.id||null}),dispose(){disposed=true;flora.dispose();clearTimeout(toastTimer);[bagButton,nearButton,supply,bag,hint,progress,toast].forEach(e=>e.remove());canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',leave);canvas.removeEventListener('pointerleave',leave);window.removeEventListener('keydown',key,true);window.removeEventListener('blur',blur);window.removeEventListener('storage',storage);}};
}
