import * as T from 'three';
import {CITIES,WORLD_BOUNDS,CITY_CENTERS,DISPLAY_DEFAULTS,readDisplay,saveDisplay,icon} from './atlas-ui-data.js';
import {MAP_BOUNDS,mapPoint,nearestMap} from './cartography.js';
import './world-shell.css';
export function createWorldShell({world=null,home=null}){
 const settings=readDisplay(),root=document.createElement('section');root.className='world-shell';root.setAttribute('aria-label','世界导航');document.body.append(root);document.body.dataset.worldShell='true';
 root.innerHTML=`<nav class="world-toolbar" aria-label="世界主导航"><a href="./home.html" title="返回主页" aria-label="返回主页">${icon('home')}<span>主页</span></a>${[['gear','设置'],['map','地图'],['compass','导览'],['help','帮助']].map(([id,label])=>`<button data-tool="${id}" aria-label="${label}">${icon(id)}<span>${label}</span></button>`).join('')}</nav><aside class="world-minimap" aria-label="实时地图"><div class="map-caption"><strong></strong><button class="map-expand" aria-label="展开地图">${icon('expand')}</button></div><div class="map-surface"></div><div class="map-readout"></div></aside><dialog class="world-settings" aria-labelledby="world-settings-title"><div class="settings-heading"><div><small>AETHER</small><h2 id="world-settings-title">世界设置</h2></div><button class="settings-close" aria-label="关闭设置">${icon('close')}</button></div><nav class="settings-tabs" role="tablist" aria-label="设置分类">${[['display','画面'],['guide','导览'],['maps','地图'],['about','关于']].map(([id,n])=>`<button data-tab="${id}" role="tab">${n}</button>`).join('')}</nav><div class="settings-content"></div></dialog><p class="shell-notice" role="status"></p>`;
 const dialog=root.querySelector('dialog'),content=root.querySelector('.settings-content'),mini=root.querySelector('.world-minimap'),surface=mini.querySelector('.map-surface'),readout=mini.querySelector('.map-readout');let region=home?.selected||new URLSearchParams(location.search).get('region')||'aether',tab='display',mapMode=home?'world':'local',metadata={},frame=0,last=0,disposed=false,opener=null,controlsEnabled=true,timer,mapSignature='',travelRequest=0,metadataState='loading',metadataRequest=0,metadataController;
 let navigationPending=null,navigationMessage='',cityTransition=null;
 const base=import.meta.env.BASE_URL+'atlas/maps/';loadMetadata();
 async function loadMetadata(){
  const request=++metadataRequest;metadataController?.abort();metadataController=new AbortController();metadataState='loading';
  function refresh(){if(disposed)return;renderMap(surface,home?'world':'local');if(dialog.open&&tab==='maps')renderContent();}
  refresh();
  try{const response=await fetch(base+'metadata.json',{signal:metadataController.signal});if(!response.ok)throw Error('Map locations unavailable');const data=await response.json();
   if(!data||!CITIES.every(c=>Array.isArray(data[c.id]?.pois)))throw Error('Invalid map locations');
   if(disposed||request!==metadataRequest)return;metadata=data;metadataState='ready';
  }catch{if(disposed||request!==metadataRequest)return;metadataState='error';notice('地点资料暂不可用，可在地图中重试。');}
  refresh();
 }
 function notice(text){const n=root.querySelector('.shell-notice');n.textContent=text;clearTimeout(timer);timer=setTimeout(()=>n.textContent='',4500);}
 function apply(){world?.setQuality?.(settings.quality);world?.setPlaying(settings.motion);const motion=document.querySelector('#motion');if(motion){motion.setAttribute('aria-pressed',String(settings.motion));motion.textContent=settings.motion?'暂停动画':'播放动画';}home?.applySettings(settings);mini.hidden=!settings.minimap;root.dataset.labels=String(settings.labels);document.body.dataset.reducedTransition=String(settings.reduced);}
 function persist(){apply();if(!saveDisplay(settings))notice('浏览器无法保存设置，本次调整仍然生效。');}
 function currentCity(){return CITIES.find(c=>c.id===region)||CITIES[0];}
 function navigationFeedback(text){navigationMessage=text;const feedback=content.querySelector('[data-map-feedback]');if(feedback)feedback.textContent=text;else if(text)notice(text);}
 function invalidateNavigation(){travelRequest++;navigationPending=null;delete dialog.dataset.destination;navigationFeedback('');}
 function viewPoint(point,anchor){return anchor?anchor.worldToLocal(point.clone()):point.clone();}
 function originUnchanged(origin){const a=world.atlas;return a.mode===origin.mode&&a.stats().region===origin.region&&a.buildings.selected===origin.selected&&viewPoint(world.camera.position,origin.anchor).distanceToSquared(origin.camera)<1e-8&&viewPoint(world.controls.target,origin.anchor).distanceToSquared(origin.target)<1e-8;}
 async function navigate(id,resolve,label){
  if(disposed||!world)return false;const a=world.atlas,r=a.regions.find(r=>r.id===id);if(!r)return false;
  invalidateNavigation();
  const waiting=r.status!=='ready';if(waiting&&!dialog.open)open('maps');
  const selected=a.buildings.selected,anchor=a.settlements.records.find(r=>r.id===selected)?.root;
  const request=++travelRequest,origin={mode:a.mode,region:a.stats().region,selected,anchor,camera:viewPoint(world.camera.position,anchor),target:viewPoint(world.controls.target,anchor)};
  if(waiting){
   navigationPending={request,origin};dialog.dataset.destination=id;navigationFeedback('正在准备'+label+'；关闭地图可取消前往。');
   try{await a.readyFor(id);}catch{/* The same location button retries in place. */}
   if(disposed||request!==travelRequest||!dialog.open)return false;
   navigationPending=null;delete dialog.dataset.destination;
   if(!originUnchanged(origin)){invalidateNavigation();navigationFeedback('位置已改变，已取消这次前往。');return false;}
   if(r.status!=='ready'){navigationFeedback('地点暂未能展开。你仍在原处，可点击同一地点重试。');return false;}
  }
  if(disposed||request!==travelRequest)return false;
  const run=resolve(request,origin);if(typeof run!=='function'){navigationFeedback('这处地点暂时没有可用视点，请重试或选择其他地点。');return false;}
  closeForNavigation({preserveRequest:true});let ok=false;
  try{ok=await run();}catch{ok=false;}
  if(disposed||request!==travelRequest)return false;
  if(ok===false){notice('这处地点暂时没有可用视点，请从地图重试。');return false;}
  setRegion(id);return true;
 }
 async function transitionTo(r,action,current){
  if(cityTransition)await cityTransition.catch(()=>{});
  if(!current())return false;
  const pending=world.atlas.transition.run(r,action);cityTransition=pending;
  try{return await pending;}finally{if(cityTransition===pending)cityTransition=null;}
 }
 function choose(id){if(home){invalidateNavigation();dialog.close();home.select(id);setRegion(id);return;}const r=world?.atlas.regions.find(r=>r.id===id);return navigate(id,(request,origin)=>()=>{
  const current=()=>!disposed&&request===travelRequest&&originUnchanged(origin),travel=()=>current()&&world.atlas.travel(id);
  return settings.reduced?travel():transitionTo(r,travel,current);
 },r?.name||'城镇');}
 function poiFocus(id){
  if(!world||disposed)return false;
  const owner=CITIES.find(c=>metadata[c.id]?.pois.some(p=>p.id===id));if(!owner){notice('地点资料尚未准备好，请在地图中重试。');return false;}
  const place=metadata[owner.id].pois.find(p=>p.id===id);
  return navigate(owner.id,()=>{const record=world.atlas.settlements.records.find(r=>r.id===id&&r.region===owner.id);if(!record)return null;
   return ()=>{if(!world.atlas.travel(record.region))return false;const api={forest:world.atlas.forestGarden,watercourt:world.atlas.quarter,valley:world.atlas.valleyTown,aether:world.atlas.starHall}[record.region];if(record.region==='aether'&&record.district)return api.focus(false);if(record.district&&api?.focus)return api.focus(record.type,-1);return world.atlas.buildings.focus(record,false);};
  },place.name);
 }
 function renderMap(el,mode){
 const thumbnail=home&&region==='theme'&&!el.classList.contains('map-large');const isWorld=mode==='world',bounds=isWorld?WORLD_BOUNDS:MAP_BOUNDS[region],items=isWorld?CITIES.map(c=>({id:c.id,name:c.name,point:{x:CITY_CENTERS[c.id][0],z:CITY_CENTERS[c.id][1]}})):(metadata[region]?.pois||[]);
 el.dataset.mapMode=mode;el.dataset.region=region;el.innerHTML=`<div class="map-layer"><img class="map-terrain" src="${base+(thumbnail?'world-outline.svg':(isWorld?'world.jpg':region+'.webp'))}" alt="${thumbnail?'五城实际地形轮廓':(isWorld?'五城世界':'当前城镇')+'的实际场景俯视地图'}"><span class="map-north">N ↑</span><div class="map-pois">${items.map(p=>{const xy=mapPoint(p.point,bounds);return `<button class="map-poi ${p.id===region?'selected':''}" data-poi="${p.id}" style="left:${xy.x}%;top:${xy.y}%" aria-label="${p.name}" title="${p.name}"><i></i><span>${p.name}</span></button>`;}).join('')}</div>${world?'<span class="map-viewpoint" aria-label="实时位置与朝向"><i></i></span>':''}</div>${el.classList.contains('map-large')?'<div class="map-zoom"><button data-zoom="in" aria-label="放大地图">＋</button><button data-zoom="out" aria-label="缩小地图">−</button><button data-zoom="reset" aria-label="重置地图视野">⌖</button></div>':''}`;
 const recovery=document.createElement('div');recovery.className='map-recovery';
 const imageError=document.createElement('div');imageError.hidden=true;imageError.setAttribute('role','status');imageError.innerHTML='<span>底图暂不可用</span><button data-map-retry="image">重试底图</button>';
 const locationsError=document.createElement('div');locationsError.hidden=isWorld||metadataState==='ready';locationsError.setAttribute('role','status');locationsError.innerHTML=metadataState==='error'?'<span>地点暂不可用</span><button data-map-retry="locations">重试地点</button>':'<span>正在准备地点…</span>';
 recovery.append(imageError,locationsError);el.append(recovery);delete el.dataset.unavailable;
 const image=el.querySelector('img'),imageSource=image.getAttribute('src');
 image.onerror=()=>{if(disposed||!image.isConnected)return;image.style.opacity='.12';el.dataset.unavailable='true';imageError.hidden=false;imageError.querySelector('button').disabled=false;};
 image.onload=()=>{image.style.opacity='';delete el.dataset.unavailable;imageError.hidden=true;};
 imageError.querySelector('button').onclick=e=>{e.stopPropagation();e.currentTarget.disabled=true;image.src=imageSource+'?retry='+Date.now();};
 locationsError.querySelector('button')?.addEventListener('click',e=>{e.stopPropagation();loadMetadata();});
 let zoom=1,panX=0,panY=0,drag=null;const layer=el.querySelector('.map-layer');function paintZoom(){layer.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;el.dataset.zoom=String(zoom);}el.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(b.dataset.zoom==='reset'){zoom=1;panX=panY=0;}else zoom=T.MathUtils.clamp(zoom*(b.dataset.zoom==='in'?1.5:1/1.5),1,5);if(zoom===1)panX=panY=0;paintZoom();});if(el.classList.contains('map-large')){el.onpointerdown=e=>{if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,px:panX,py:panY};el.setPointerCapture(e.pointerId);};el.onpointermove=e=>{if(!drag||zoom===1)return;const limit=el.clientWidth*(zoom-1)/2;panX=T.MathUtils.clamp(drag.px+e.clientX-drag.x,-limit,limit);panY=T.MathUtils.clamp(drag.py+e.clientY-drag.y,-limit,limit);paintZoom();};el.onpointerup=el.onpointercancel=()=>drag=null;}
 el.querySelectorAll('[data-poi]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(isWorld)choose(b.dataset.poi);else poiFocus(b.dataset.poi);});
 }
 function setRegion(id){if(!CITIES.some(c=>c.id===id)&&!(home&&['overview','theme'].includes(id)))return;region=id;if(!home){const city=CITIES.find(c=>c.id===id);if(city)document.title='AETHER · '+city.name;}mini.querySelector('strong').textContent=home?'五城总览':currentCity().name;renderMap(surface,home?'world':'local');if(dialog.open&&tab==='maps')renderContent();}
 function row(label,control,note=''){return `<label class="setting-row"><span>${label}${note?`<small>${note}</small>`:''}</span>${control}</label>`;}
 function toggle(key,label){return row(label,`<input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}>`);}
 function renderContent(){
 dialog.dataset.page=tab;
 root.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
 const title={display:'画面与声音',guide:'导览与操作',maps:'地图与地点',about:'关于这片世界'}[tab];dialog.querySelector('h2').textContent=title;
 if(tab==='display')content.innerHTML=`${row('画质',`<select data-setting="quality" aria-label="画质"><option value="high">高清</option><option value="balanced">均衡</option><option value="low">流畅</option></select>`,'调整渲染精度与光晕')}${toggle('motion','场景动画')}${toggle('reduced','减弱转场')}<div class="setting-row"><span>环境声音<small>${world?'风声与流水环境音':'进入城镇后可开启'}</small></span><button data-action="sound" ${world?'':'disabled'}>${world?document.querySelector('[data-environment=sound]')?.getAttribute('aria-pressed')==='true'?'关闭':'开启':'城内可用'}</button></div><p class="settings-footnote">渲染器 · WebGL 2<br>显示设置保存在这台设备；不会清除采集、交易或城镇进度。</p><button class="wide-action" data-action="reset">恢复显示设置</button>`;
 if(tab==='guide')content.innerHTML=`<div class="guide-copy"><h3>选择适合你的游览方式</h3><p>拖动鼠标或单指环顾；滚轮或双指缩放。进入房间后固定视点环顾，缩放只改变视野。</p><p>点选地图上的菱形地点，近观建筑。自由探索无需人物模型：户外按 WASD 或方向键即可开始移动；右键点选地面步行前往，左键拖动环顾，Shift 快行。遇到障碍会停下，左键或方向键可接管，Esc 停止前往。手机使用左侧方向按钮。地图箭头显示实时位置和朝向。</p></div><button class="wide-action" data-action="walk" ${world?'':'disabled'}>从本城入口自由探索</button><button class="wide-action" data-action="city-guide" ${world?'':'disabled'}>城镇建筑导览</button><button class="wide-action" data-action="safe" ${world?'':'disabled'}>返回本城安全视点</button><button class="wide-action" data-action="night" ${world?'':'disabled'}>${world?.atlas.environment.night?'切换晨光':'切换月夜'}</button><button class="wide-action" data-action="tour" ${world?'':'disabled'}>${world?.stats().touring?'停止自动漫游':'自动漫游'}</button><button class="wide-action" data-action="routes" ${world?'':'disabled'}>展开游览路线</button><a class="wide-action" href="./home.html">返回五城主页</a>`;
 if(tab==='maps')content.innerHTML=`<div class="map-switch"><button data-map-view="world" aria-pressed="${mapMode==='world'}">五城总览</button><button data-map-view="local" aria-pressed="${mapMode==='local'}" ${home?'disabled':''}>${currentCity().name}</button></div><div class="map-surface map-large"></div><p class="map-legend">◇ ${mapMode==='world'?'城镇入口':'重要建筑，点击近观'} ${world?' · ▲ 实时位置与朝向':''}<br>＋ − 缩放 · 放大后拖动平移</p>${mapMode==='local'?`<div class="poi-directory">${(metadata[region]?.pois||[]).map(p=>`<button data-place="${p.id}">◇ ${p.name}</button>`).join('')}</div>`:''}${toggle('minimap','显示右上角地图')}${toggle('labels','地图地点标注')}<div class="city-directory">${CITIES.map(c=>`<button data-city="${c.id}"><span>${c.name}</span><small>${c.season}</small>${icon('arrow')}</button>`).join('')}</div>`;
 if(tab==='about')content.innerHTML='<div class="guide-copy"><h3>五座城镇，一片世界。</h3><p>浮空群岛、牛角山城、紫境森林、精灵水庭与北境河谷，延续各自的建筑、气候与景观。</p><p>主页的建筑来自现有城镇模型。地图底图由实际三维场景俯视生成，方向与位置共用世界坐标。</p><p>这片世界仍在持续建设，画面、光门与交互会继续精修。</p><h3>快捷操作</h3><p>M · 世界地图<br>H · 隐藏或显示界面<br>Esc · 关闭当前面板</p></div>'+ (world?'<button class="wide-action" data-action="profile">个人简介</button><button class="wide-action" data-action="works">作品内容</button>':'');
 const quality=content.querySelector('[data-setting=quality]');if(quality)quality.value=settings.quality;
 if(tab==='maps'){const feedback=document.createElement('p');feedback.dataset.mapFeedback='';feedback.className='settings-footnote';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.textContent=navigationMessage;content.append(feedback);}
 content.querySelectorAll('[data-setting]').forEach(el=>el.onchange=()=>{settings[el.dataset.setting]=el.type==='checkbox'?el.checked:el.value;persist();});
 content.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>poiFocus(b.dataset.place));
 content.querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>choose(b.dataset.city));
 content.querySelectorAll('[data-map-view]').forEach(b=>b.onclick=()=>{mapMode=b.dataset.mapView;renderContent();});
 const big=content.querySelector('.map-large');if(big)renderMap(big,mapMode);
 content.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{switch(b.dataset.action){case'reset':Object.assign(settings,DISPLAY_DEFAULTS);persist();renderContent();notice('显示设置已恢复。城镇进度已保留。');break;case'sound':world.atlas.environment.setSound(!world.atlas.environment.soundOn).then(ok=>{if(!ok)notice('环境声未能开启，请检查浏览器声音权限。');renderContent();});break;case'night':world.atlas.environment.setNight(!world.atlas.environment.night);renderContent();break;case'walk':closeForNavigation();world.atlas.setMode('walk');break;case'city-guide':closeForNavigation();document.querySelector('.atlas-guide').click();break;case'safe':closeForNavigation();world.atlas.travel(region);break;case'tour':closeForNavigation();world.setTour(!world.stats().touring);break;case'profile':dialog.close();document.querySelector('[data-panel=about]').click();break;case'works':dialog.close();document.querySelector('[data-panel=works]').click();break;case'routes':dialog.close();document.querySelector('.visitor-routes')?.click();break;}});
 }
 function closeForNavigation({preserveRequest=false}={}){if(!preserveRequest)invalidateNavigation();controlsEnabled=null;dialog.close();if(world)world.controls.enabled=!world.atlas.active&&!world.atlas.buildings.inside;}
 function stopOrbitInertia(){
  if(!world||!world.controls.enabled||!world.controls.enableDamping)return;
  const position=world.camera.position.clone(),target=world.controls.target.clone(),damping=world.controls.enableDamping;
  try{world.controls.enableDamping=false;world.controls.update();world.camera.position.copy(position);world.controls.target.copy(target);world.controls.update();}finally{world.controls.enableDamping=damping;}
 }
 function open(next='display'){invalidateNavigation();tab=next;opener=document.activeElement;if(!dialog.open){world?.cancelCameraMotion({preserveExploration:true});if(world){stopOrbitInertia();controlsEnabled=world.controls.enabled;world.controls.enabled=false;}dialog.showModal();}renderContent();dialog.querySelector(`[data-tab="${tab}"]`).focus();}
 dialog.querySelector('.settings-close').onclick=()=>{invalidateNavigation();dialog.close();};dialog.addEventListener('cancel',invalidateNavigation);dialog.addEventListener('close',()=>{if(dialog.open||disposed)return;if(navigationPending)invalidateNavigation();if(world&&controlsEnabled!==null)world.controls.enabled=controlsEnabled&&!world.atlas.active&&!world.atlas.buildings.inside;opener?.focus({preventScroll:true});});
 dialog.querySelectorAll('[data-tab]').forEach(b=>{b.onclick=()=>{tab=b.dataset.tab;renderContent();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...dialog.querySelectorAll('[data-tab]')],i=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;tabs[next].click();tabs[next].focus();};});
 root.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>open({gear:'display',map:'maps',compass:'guide',help:'about'}[b.dataset.tool]));
 mini.querySelector('.map-expand').onclick=()=>{mapMode=home?'world':'local';open('maps');};surface.onclick=e=>{if(!e.target.closest('button')){mapMode=home?'world':'local';open('maps');}};
 function tick(now){if(disposed)return;frame=requestAnimationFrame(tick);if(now-last<80)return;last=now;
 if(world){const a=world.atlas,id=a.mode==='observe'?nearestMap(world.controls.target):a.stats().region;if(id!==region)setRegion(id);const point=a.mode==='observe'?world.camera.position:a.position,direction=world.camera.getWorldDirection(new T.Vector3()),angle=Math.atan2(direction.x,-direction.z)*180/Math.PI;
 for(const el of root.querySelectorAll('.map-surface')){const b=el.dataset.mapMode==='world'?WORLD_BOUNDS:MAP_BOUNDS[region],xy=mapPoint(point,b),marker=el.querySelector('.map-viewpoint');if(marker){marker.setAttribute('aria-label',a.mode==='observe'?'实时观景视点':'实时步行位置');marker.style.left=T.MathUtils.clamp(xy.x,2,98)+'%';marker.style.top=T.MathUtils.clamp(xy.y,2,98)+'%';marker.style.setProperty('--bearing',angle+'deg');marker.dataset.x=String(xy.x);marker.dataset.y=String(xy.y);marker.dataset.outside=String(xy.x<0||xy.x>100||xy.y<0||xy.y>100);}}
 const xy=mapPoint(point,MAP_BOUNDS[region]);readout.textContent=`${a.mode==='observe'?'观景视点':'当前位置'} · ${Math.round(point.x)}, ${Math.round(point.z)}${xy.x<0||xy.x>100||xy.y<0||xy.y>100?' · 图外':''}`;readout.dataset.position=point.toArray().join(',');
 }else readout.textContent='点击城镇 · 选择光门';
 }
 function homeKey(e){if(!home||e.repeat||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;if(e.code==='KeyM'){e.preventDefault();open('maps');}if(e.code==='KeyH'){e.preventDefault();document.body.dataset.visitorHidden=String(document.body.dataset.visitorHidden!=='true');document.body.dataset.homeHidden=document.body.dataset.visitorHidden;}}window.addEventListener('keydown',homeKey);
 setRegion(region);apply();if(world)frame=requestAnimationFrame(tick);else readout.textContent='点击城镇 · 选择光门';
 return{settings,setRegion,open,choose,setMotion(value){settings.motion=!!value;persist();},dispose(){disposed=true;invalidateNavigation();metadataRequest++;metadataController?.abort();window.removeEventListener('keydown',homeKey);cancelAnimationFrame(frame);clearTimeout(timer);if(dialog.open)dialog.close();root.remove();delete document.body.dataset.worldShell;}};
}
