import {cameraInputEnabled,restoreCameraInput} from './camera-input.js';
import * as T from 'three';
import {CONTACT,DISCOVERIES,DISCOVERY_HINTS} from './discovery-content.js';
import {REGIONAL_ART} from './discovery-art.js';
import {createDiscoveryStore,DISCOVERY_KEY} from './discovery-store.js';
import {makeScroll,makeWishingBasin} from './discovery-props.js';
import './discoveries.css';

export function createDiscoveries(world,{settlements,gathering,buildings,nav,isBlocked,say}){
 const {camera,controls,renderer}=world,canvas=renderer.domElement,store=createDiscoveryStore(),records=[],seen=new Set(),ray=new T.Raycaster(),ndc=new T.Vector2(),point=new T.Vector3();
 let wishSite=null,hovered=null,down=null,lastScan=0,view='journal',previousFocus=null,controlsEnabled=true,draft={text:'',name:''},pendingCelebration=false;
 const button=document.createElement('button');button.className='discovery-journal-button';button.textContent='拾遗手记 J';button.setAttribute('aria-label','打开拾遗手记');
 const hint=document.createElement('button');hint.className='discovery-hint';hint.hidden=true;
 const dialog=document.createElement('dialog');dialog.className='discovery-dialog';dialog.setAttribute('aria-labelledby','discovery-title');
 dialog.innerHTML='<header><div><small>旅途拾遗</small><h2 id="discovery-title"></h2></div><button data-close aria-label="关闭拾遗窗口">×</button></header><div class="discovery-body"></div><p class="discovery-feedback" role="status" aria-live="polite"></p><footer><button data-back>返回手记</button><span>收藏与心愿留在此浏览器</span></footer>';
 document.body.append(hint,dialog);const body=dialog.querySelector('.discovery-body'),feedback=dialog.querySelector('.discovery-feedback');
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const action=(text,fn,label)=>{const b=node('button',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.onclick=fn;return b;};
 const progress=()=>store.progress(gathering.store.snapshot().items);
 function show(title,kind){world.atlas?.resources?.cancel();
  world.cancelCameraMotion();gathering.cancel({clearSelection:true});view=kind;dialog.dataset.view=kind;dialog.querySelector('h2').textContent=title;body.replaceChildren();feedback.textContent='';dialog.querySelector('[data-back]').hidden=kind==='journal';
  if(!dialog.open){previousFocus=document.activeElement;controlsEnabled=cameraInputEnabled(world);controls.enabled=false;dialog.showModal();}dialog.querySelector('[data-close]').focus();
 }
 function close(){dialog.close();}
 dialog.querySelector('[data-close]').onclick=close;dialog.querySelector('[data-back]').onclick=showJournal;
 dialog.addEventListener('close',()=>{restoreCameraInput(world,controlsEnabled);if(pendingCelebration){pendingCelebration=false;wishSite?.prop.celebrate();}const target=previousFocus?.isConnected&&!previousFocus.hidden?previousFocus:button;target.focus({preventScroll:true});});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 function flowerList(){const list=node('ul',undefined,'discovery-flowers');for(const f of progress()){const li=node('li');li.dataset.collected=String(f.collected);li.append(node('span',f.collected?'✦':'◇'),node('strong',f.name),node('small',f.place));list.append(li);}return list;}
 function showJournal(){
  show('五境拾遗','journal');const count=store.snapshot().scrolls.length,flowers=progress().filter(f=>f.collected).length;
  body.append(node('p',count===5?'五枚印记已齐。你获得了「五境寻迹者」的旅途纪念。':'屋檐下、石座旁，总有一页故事等你发现。','discovery-intro'));
  body.append(node('p',`藏卷 ${count} / 5 · 花谱 ${flowers} / 5`,'discovery-count'));
  const list=node('ol',undefined,'discovery-clues');for(const d of DISCOVERIES){const li=node('li'),owned=store.has(d.id),clue=DISCOVERY_HINTS[d.id];li.dataset.found=String(owned);li.append(node('span',owned?d.seal:'◇','discovery-seal'));const text=node('div');text.append(node('h3',d.title),node('p',owned?d.clue:clue.riddle));if(!owned){const detail=node('details',undefined,'discovery-location'),more=node('details');detail.append(node('summary','查看地点线索'),node('p',d.clue));more.append(node('summary','再给一点提示'),node('p',clue.detail));detail.append(more);text.append(detail);}const row=node('div',undefined,'discovery-actions');row.append(action('循线索前往',()=>focus(d.id),'前往'+d.title));if(owned)row.append(action('重读',()=>read(d),'重读'+d.title));text.append(row);li.append(text);list.append(li);}body.append(list);
  if(count===5){const reward=node('section',undefined,'discovery-keepsake');reward.append(node('span','✧','keepsake-medal'),node('h3','五境寻迹者'),node('p','五段故事，五枚纪念币。它们已留在远庭的水底，等你重访。'),action('看看水中的纪念',()=>focus('wishing-basin')));body.append(reward);}
  const wish=node('section',undefined,'discovery-wish-summary');wish.append(node('h3','把心愿留给水与风'),node('p','各采集一朵五境之花，即可在远庭祈愿亭许愿。花朵会保留在行囊中。'),flowerList(),action('寻找许愿台',()=>focus('wishing-basin')));body.append(wish);
  const town=node('section',undefined,'discovery-wish-summary');town.append(node('h3','五境的日常'),node('p','到工坊学习手艺，在炉边歇脚，向湖水抛下鱼线。'),action('翻开城镇手册',()=>{dialog.addEventListener('close',()=>world.atlas.town.showLedger(),{once:true});close();}));body.append(town);
 }
 function read(d){
  if(!store.has(d.id))return;show(d.title,'scroll');dialog.style.setProperty('--seal-color',REGIONAL_ART[d.region].wax);const record=records.find(r=>r.id===d.id);if(record?.prop.art){const figure=node('figure',undefined,'scroll-illustration'),img=node('img');img.src=record.prop.art;img.alt=REGIONAL_ART[d.region].caption;figure.append(img);body.append(figure);}body.append(node('div',d.seal,'scroll-imprint'),node('p',d.body,'scroll-prose'));
  if(d.contact){const contact=node('section',undefined,'scroll-contact');contact.append(node('small','这片世界的主人'),node('h3',CONTACT.name),node('p',CONTACT.intro));for(const item of CONTACT.entries){const row=node('div',undefined,'contact-row');row.append(node('small',item.label),node('span',item.value||'待填写'));if(item.value){row.append(action('复制',async()=>{try{await navigator.clipboard.writeText(item.value);feedback.textContent='已复制'+item.label+'。';}catch{feedback.textContent='未能自动复制，请选中联系方式手动复制。';}}));if(item.kind==='url'){try{const url=new URL(item.value);if(['http:','https:'].includes(url.protocol)){const link=node('a','访问');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}}catch{}}}contact.append(row);}if(CONTACT.entries.every(i=>!i.value))contact.append(node('p','联系方式尚待主人填写。','contact-pending'));body.append(contact);}
  body.append(node('small','已收入拾遗手记，可随时重读。','scroll-note'));
 }
 function showWishes(compose=false,selectedId=null){
  if(!wishSite)return;show('听风许愿台','wish');const unlocked=progress().every(f=>f.collected),wishes=store.snapshot().wishes;
  body.append(node('p','在远庭的水面前，写下此刻想留住的事。','discovery-intro'),flowerList());
  const archive=node('details',undefined,'wish-archive');archive.append(node('summary',`水底的旅途纪念 · ${store.snapshot().scrolls.length} / 5`),node('p','每找到一份藏卷，水底便留下一枚纹章钱币。点击水中的钱币，或在这里重读。'));for(const d of DISCOVERIES)if(store.has(d.id))archive.append(action(d.title,()=>read(d),'从纪念币重读'+d.title));body.append(archive);
  if(!unlocked)body.append(node('p','还差几朵旅途中的花。集齐上面五种花后，就能解锁许愿。','wish-locked'));
  else if(!wishes.length||compose){
   const form=document.createElement('form'),label=node('label','你的心愿'),text=document.createElement('textarea');text.name='wish';text.required=true;text.maxLength=240;text.rows=3;text.placeholder='愿下一次出发……';text.value=draft.text;label.append(text);
   const counter=node('small',`${text.value.length} / 240`,'wish-counter');text.oninput=()=>{draft.text=text.value;counter.textContent=`${text.value.length} / 240`;};
   const nameLabel=node('label','署名（可留空）'),name=document.createElement('input');name.name='signature';name.maxLength=20;name.placeholder='无名旅人';name.value=draft.name;name.oninput=()=>draft.name=name.value;nameLabel.append(name);const submit=node('button','系上心愿笺');submit.type='submit';submit.className='wish-submit';form.append(label,counter,nameLabel,submit);
   form.onsubmit=e=>{e.preventDefault();submit.disabled=true;const result=store.wish({text:text.value,name:name.value},gathering.store.snapshot().items);if(!result.ok){feedback.textContent=result.error;submit.disabled=false;return;}draft={text:'',name:''};wishSite.prop.setWishes(store.snapshot().wishes);pendingCelebration=true;showWishes(false,result.wish.id);feedback.textContent=result.saved?'心愿已系在这里。关闭手记，看微光沿水面升起。':'心愿已留在本次旅途；浏览器无法保存，刷新后会丢失。';};body.append(form);
  }else body.append(action('再写一张',()=>showWishes(true),'再写一张心愿'));
  body.append(node('p','心愿仅保存在此浏览器，其他访客不可见。最近 30 条会留在这里。','wish-privacy'));
  const list=node('ol',undefined,'wish-messages');for(const w of wishes){const li=node('li');li.dataset.wishId=w.id;li.tabIndex=-1;if(w.id===selectedId)li.dataset.selected='true';li.append(node('p',w.text),node('small',`${w.name} · ${new Date(w.at).toLocaleDateString('zh-CN')}`),action('取下',()=>{store.remove(w.id);wishSite.prop.setWishes(store.snapshot().wishes);if(!store.snapshot().wishes.length)pendingCelebration=false;showWishes();},'取下这条心愿'));list.append(li);}if(!wishes.length)list.append(node('li','水面安静，等待第一张心愿笺。','wish-empty'));body.append(list);if(pendingCelebration)body.append(action('合上手记，看看心愿',close,'合上手记观看心愿'));if(selectedId){const selected=[...list.children].find(li=>li.dataset.wishId===selectedId);selected?.scrollIntoView({block:'nearest'});selected?.focus({preventScroll:true});}
 }
 function activate(record){
  if(isBlocked()||!reachable(record))return false;gathering.cancel({clearSelection:true});
  if(record.wishId&&store.snapshot().wishes.some(w=>w.id===record.wishId)){showWishes(false,record.wishId);return true;}
  if(record.coinId&&store.has(record.coinId)){read(DISCOVERIES.find(d=>d.id===record.coinId));return true;}
  if(record.kind==='wish')showWishes();else{const result=store.discover(record.data.id);record.prop.mark(true);wishSite?.prop.setArchives(store.snapshot().scrolls);read(record.data);if(!result.saved)feedback.textContent='浏览器无法保存；这封信暂留在本次旅途。';else if(result.fresh)feedback.textContent='发现藏卷 · 已收入手记，远庭水底留下一枚纪念币。';}return true;
 }
 function add(region){
  if(seen.has(region.id))return;seen.add(region.id);
  const d=DISCOVERIES.find(d=>d.region===region.id),building=settlements.records.find(r=>r.region===region.id&&r.name.startsWith(d.match));if(!building)return;
  let position;
  if(region.id==='highland')position=[1.92,.94,-2.4];
  if(region.id==='valley')position=[1.56,.94,-1.04];
  if(region.id==='watercourt')position=[0,1.56,-building.radius*.40];
  if(region.id==='aether')position=[building.radius*.52,1.525,-building.radius*.36];
  if(region.id==='forest'){
   const x=Math.sin(49*.096)*2.4+Math.sin(49*.2)*.75;
   const g=new T.CylinderGeometry(.47,.57,.66,12),pedestal=new T.Mesh(g,settlements.materials.stone);pedestal.position.set(x-3.2,.97,-45.8);pedestal.castShadow=true;pedestal.receiveShadow=true;pedestal.userData.noCollision=true;building.root.add(pedestal);position=[x-3.2,1.31,-45.8];
   records.push({kind:'pedestal',root:pedestal});
  }
  const prop=makeScroll(region.id);prop.root.position.fromArray(position);prop.root.rotation.y=-.13;building.root.add(prop.root);prop.mark(store.has(d.id));records.push({kind:'scroll',id:d.id,data:d,building,root:prop.root,prop,anchor:new T.Vector3(.13,.049,.07)});
  if(region.id==='watercourt'){
   const b=settlements.records.find(r=>r.region===region.id&&r.name==='远庭祈愿亭'),prop=makeWishingBasin();prop.root.position.set(0,.70,.28);b.root.add(prop.root);prop.setWishes(store.snapshot().wishes);prop.setArchives(store.snapshot().scrolls);wishSite={kind:'wish',id:'wishing-basin',building:b,root:prop.root,prop,anchor:new T.Vector3(0,.53,0)};records.push(wishSite);
  }
  building.root.updateWorldMatrix(true,true);
 }
 function anchor(record,out=point){return out.copy(record.anchor).applyMatrix4(record.root.matrixWorld);}
 function reachable(r){
  if(r.kind==='pedestal')return false;for(let p=r.root;p;p=p.parent)if(!p.visible)return false;
  r.root.updateWorldMatrix(true,false);anchor(r);if(camera.position.distanceTo(point)>13)return false;const screen=point.clone().project(camera);if(screen.z< -1||screen.z>1||Math.abs(screen.x)>.98||Math.abs(screen.y)>.95)return false;
  return !nav.obstructed(camera.position,point.clone().lerp(camera.position,.015),.004);
 }
 function focus(id){
  const r=records.find(r=>r.id===id);if(!r){feedback.textContent='目的地区域仍在加载，请稍后重试。';say('目的地区域仍在加载，请稍后重试。');return false;}
  if(dialog.open)close();if(!world.atlas.travel(r.building.region))return false;
  if(!buildings.focus(r.building,true,{lightScale:r.building.region==='aether'?.18:r.kind==='wish'?.35:.75}))return false;r.root.updateWorldMatrix(true,false);const target=anchor(r,new T.Vector3());
  if(['highland','watercourt','valley'].includes(r.building.region)){
   const local=r.root.position.clone().add(new T.Vector3(0,r.kind==='wish'?2.0:1.45,r.kind==='wish'?2.2:2.4)),eye=r.building.root.localToWorld(local);
   if(!nav.obstructed(eye,eye,.14)&&!nav.obstructed(eye,target.clone().lerp(eye,.015),.006))camera.position.copy(eye);
  }
  controls.target.copy(target);camera.lookAt(controls.target);controls.update();hovered=r;say(r.kind==='wish'?'这里是听风许愿台。点击水钵许愿，点击纸笺重读心愿。':'卷轴就在眼前。点击封印或按 E 拾取。');return true;
 }
 function hit(e){
  if(isBlocked())return null;const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(ndc,camera);ray.far=13;
  const hits=[];for(const r of records){if(r.kind==='pedestal'||!reachable(r))continue;const visible=ray.intersectObject(r.root,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return h.object.material?.opacity!==0;});const hit=visible[0];if(hit){if(hit.object.userData.wishId){const tag=r.prop.tags.find(t=>t.userData.wishId===hit.object.userData.wishId);tag.updateWorldMatrix(true,false);const tagAnchor=new T.Vector3(0,-.18,0).applyMatrix4(tag.matrixWorld);r.root.worldToLocal(tagAnchor);hits.push({record:{...r,wishId:hit.object.userData.wishId,anchor:tagAnchor},distance:hit.distance});continue;}const coin=visible.find(h=>h.object.userData.discoveryId);const throughWater=coin&&visible.filter(h=>h.distance<coin.distance-.0001).every(h=>h.object.material.transparent&&h.object.material.opacity<.6);hits.push({record:throughWater?{...r,coinId:coin.object.userData.discoveryId}:r,distance:hit.distance});}}return hits.sort((a,b)=>a.distance-b.distance)[0]?.record||null;
 }
 const pointerDown=e=>{if(e.button===0)down={x:e.clientX,y:e.clientY};};
 // OrbitControls attaches its pointerup listener during pointerdown. Let that
 // listener release capture even when the interaction opens a modal and disables controls.
 const pointerUp=e=>{const start=down;down=null;if(!start||e.button!==0||Math.hypot(start.x-e.clientX,start.y-e.clientY)>6)return;const r=hit(e);if(r)queueMicrotask(()=>activate(r));};
 const pointerMove=e=>{if(down)return;const r=hit(e);if(r){hovered=r;gathering.cancel({clearSelection:true});}else if(hovered?.coinId||hovered?.wishId)hovered=wishSite;};
 const clear=()=>{down=null;hovered=null;hint.hidden=true;wishSite?.prop.setHovered(null);};
 const key=e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='KeyJ'){if(dialog.open){e.preventDefault();e.stopImmediatePropagation();close();}else if(!isBlocked()){e.preventDefault();e.stopImmediatePropagation();showJournal();}}else if(e.code==='KeyE'&&!hint.hidden&&hovered&&!isBlocked()){e.preventDefault();e.stopImmediatePropagation();activate(hovered);}};
 const storage=e=>{if(e.key!==DISCOVERY_KEY)return;store.reload();for(const r of records)if(r.kind==='scroll')r.prop.mark(store.has(r.id));wishSite?.prop.setWishes(store.snapshot().wishes);wishSite?.prop.setArchives(store.snapshot().scrolls);if(dialog.open&&view==='journal')showJournal();};
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointercancel',clear);window.addEventListener('blur',clear);window.addEventListener('keydown',key,true);window.addEventListener('storage',storage);button.onclick=()=>{if(!isBlocked())showJournal();};hint.onclick=()=>hovered&&activate(hovered);
 function update(){
  wishSite?.prop.setHovered(!isBlocked()&&document.body.dataset.visitorHidden!=='true'?hovered?.wishId:null);wishSite?.prop.update();if(isBlocked()||document.body.dataset.visitorHidden==='true'){hint.hidden=true;return;}
  const now=performance.now();if(now-lastScan>220){lastScan=now;wishSite?.prop.setFlowers(progress().map(f=>f.collected));if(!hovered||!reachable(hovered))hovered=records.filter(r=>r.kind!=='pedestal'&&reachable(r)).sort((a,b)=>anchor(a,new T.Vector3()).distanceToSquared(camera.position)-anchor(b,new T.Vector3()).distanceToSquared(camera.position))[0]||null;}
  if(!hovered||gathering.stats().selected){hint.hidden=true;return;}const p=anchor(hovered,new T.Vector3()).project(camera);hint.hidden=false;hint.style.left=T.MathUtils.clamp((p.x*.5+.5)*innerWidth,110,innerWidth-110)+'px';hint.style.top=T.MathUtils.clamp((-p.y*.5+.5)*innerHeight-(hovered.wishId?85:48),112,innerHeight-225)+'px';hint.textContent=hovered.wishId?'重读这张心愿 · E':hovered.coinId?'重读纪念币 · E':hovered.kind==='wish'?'听风许愿台 · E':(store.has(hovered.id)?'重读卷轴':'拾取卷轴')+' · E';hint.setAttribute('aria-label',hovered.wishId?'重读这张心愿':hovered.coinId?'重读'+DISCOVERIES.find(d=>d.id===hovered.coinId).title:hovered.kind==='wish'?'打开听风许愿台':'拾取或重读'+hovered.data.title);
 }
 return {button,add,update,focus,showJournal,store,records,clear,stats:()=>({scrolls:store.snapshot().scrolls,wishes:store.snapshot().wishes.length,flowers:progress(),sites:records.filter(r=>r.id).map(r=>({id:r.id,region:r.building.region,position:anchor(r,new T.Vector3()).toArray(),reachable:reachable(r)}))}),dispose(){if(dialog.open)close();for(const r of records){if(r.prop)r.prop.dispose();else{r.root.geometry.dispose();r.root.removeFromParent();}}[button,hint,dialog].forEach(e=>e.remove());canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointercancel',clear);window.removeEventListener('blur',clear);window.removeEventListener('keydown',key,true);window.removeEventListener('storage',storage);}};
}
