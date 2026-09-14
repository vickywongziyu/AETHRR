import {paintLoading,transferText} from './asset-loading.js';
import {createStarHall} from './star-hall.js';
import {createForestGarden} from './forest-garden.js';
import * as T from 'three';
import {loadTraveler} from '../character/traveler.js';
import {TRAVEL_SPEED} from '../character/locomotion.js';
import {createVegetationClearance} from './vegetation-clearance.js';
import {createNavigation} from './navigation.js';
import {REGIONS,loadRegion} from './regions.js';
import {createGardenGate} from './garden-gate.js';
import {createHeritageGate} from './heritage-gate.js';
import {createGathering} from './gathering.js';
import {createFantasyEnvironment} from './fantasy-environment.js';
import {createWorldTransition} from './world-transition.js';
import {createSettlementArchitecture} from './settlement-architecture.js';
import {createBuildingInspection} from './building-inspection.js';
import {createGeology} from './geology.js';
import {createRegionalDetails} from './regional-details.js';
import {createCrystalRefraction} from './crystal-refraction.js';
import {createDiscoveries} from './discoveries.js';
import {createTownLife} from './town-life.js';
import {createMarket} from './market.js';
import {createHousing} from './housing.js';
import {createPortalWindows} from './portal-window.js';
import {createPortalPassage} from './portal-passage.js';
import {createWaterfrontQuarter} from './waterfront-quarter.js';
import {createValleyTownLife} from './valley-town.js';
import {createResources} from './resources.js';
import './style.css';

// Avatar production remains paused. Visitor navigation is independent of model loading.
const CHARACTER_ENABLED=false;
const FIRST_PERSON=!CHARACTER_ENABLED, EYE_HEIGHT=1.65;

export async function createAtlas(world,{sources,time,sun,hillSun,hemisphere,maps,onProgress=()=>{}}){
 const {scene,camera,controls,renderer}=world,nav=createNavigation(),regions=REGIONS.map(r=>({...r,status:r.asset?'idle':'ready'}));
 // Keep the original Aether–Horncrest stair bridges. New links to Violet remain absent.
 const removedBridgeTriangles=0;
 // Highland paths must sample the finished cliff mesh, including its ledges.
 onProgress(.53,'正在构建山城地形');await paintLoading();
 const geology=createGeology(maps);geology.add(regions[1],sources[1]);
 onProgress(.56,'正在布置建筑与室内空间');await paintLoading();
 const settlements=createSettlementArchitecture();sources.forEach((root,i)=>settlements.add(regions[i],root));
 await paintLoading();
 const refraction=createCrystalRefraction(world,sources);
 const details=createRegionalDetails(world,settlements,time);sources.forEach((root,i)=>details.add(regions[i],root));
 geology.add(regions[0],sources[0]);
 const vegetation=createVegetationClearance();for(const [i,root] of sources.entries()){onProgress(.60+i*.04,'正在准备'+regions[i].name+'的道路与碰撞');await paintLoading();nav.add(root);if(CHARACTER_ENABLED)vegetation.add(root);}
 onProgress(.69,'正在准备地图与城镇互动');await paintLoading();
 const canvas=renderer.domElement,keys=new Set(),position=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),velocity=new T.Vector3(),next=new T.Vector3(),euler=new T.Euler(0,0,0,'YXZ');
 const originalFog=scene.fog.color.clone(),purple=new T.Color('#4d355c');let walkTarget=null;let mode='observe',yaw=0,pitch=0,drag=null,autopilot=null,current='aether',blocked=false,disposed=false,mapFocus=null;
 let traveler=null,characterPromise=null,verticalSpeed=0,flightCameraBias=0,manualCameraUntil=0;
 const outdoorNear=camera.near;
 const eye=new T.Vector3(),aim=new T.Vector3(),desiredCamera=new T.Vector3(),cameraDirection=new T.Vector3(),beforeMove=new T.Vector3(),facing=new T.Vector3(),cameraDistance=4.6;
 const paths=[],gates=[],light=new T.DirectionalLight('#ffe0bc',0);light.position.set(0,80,0);scene.add(light,light.target);
 const ui=document.createElement('section');ui.className='atlas-controls';ui.setAttribute('aria-label','世界探索方式');
 ui.innerHTML=`<div class="atlas-location"><i></i><span>浮空群岛</span><small>${CHARACTER_ENABLED?'米拉 · 旅人':'风景漫游'}</small></div><div class="atlas-entry-actions"><button data-mode="walk">自由探索</button>${CHARACTER_ENABLED?'<button data-mode="fly">自由飞行</button>':''}<button data-mode="observe" aria-pressed="true">观景</button><button class="atlas-guide">城镇导览</button><button class="atlas-safe">安全返回</button></div><div class="atlas-modes"><button class="atlas-map-open">地图 <span>M</span></button></div><p class="atlas-help">${CHARACTER_ENABLED?'选择步行或飞行，走进这片世界。':'拖动环顾 · 滚轮缩放 · 点击传送门前往下一片风景'}</p>`;
 ui.dataset.character=CHARACTER_ENABLED?'loading':'disabled';document.body.dataset.visitorCamera=FIRST_PERSON?'first-person':'third-person';ui.dataset.mode='observe';document.body.dataset.atlasMode='observe';
 const reticle=document.createElement('div');reticle.className='atlas-reticle';reticle.setAttribute('aria-hidden','true');
 const message=document.createElement('div');message.className='atlas-message';message.setAttribute('role','status');
 const map=document.createElement('dialog');map.className='atlas-map';map.setAttribute('aria-labelledby','atlas-title');
 map.innerHTML=`<button class="atlas-map-close" aria-label="关闭世界地图">×</button><small>AN ATLAS OF IMAGINATION</small><h2 id="atlas-title">所有远方，都在这里。</h2><p>传送环线：云上花园 → 紫境 → 精灵水庭 → 北境河谷 → 云上花园。也可以在地图中自由选择目的地。</p><div class="atlas-chart"><svg viewBox="0 0 640 360" aria-label="五个区域的位置"><defs><pattern id="atlas-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#f4e9cd" stroke-opacity=".07"/></pattern></defs><rect width="640" height="360" fill="url(#atlas-grid)"/><text x="25" y="32">N ↑</text>${regions.map((r,i)=>{const [x,y]=[[95,170],[105,65],[315,90],[170,290],[550,100]][i];return `<g data-map-region="${r.id}" tabindex="0" role="button" aria-label="在地图中选择${r.name}" transform="translate(${x} ${y})"><circle r="25" fill="${r.color}" fill-opacity=".1"/><circle r="5" fill="${r.color}"/><text y="45" text-anchor="middle">${r.name}</text></g>`;}).join('')}</svg><span class="atlas-map-caption">${CHARACTER_ENABLED?'飞行与传送 · 自由抵达':'选择风景 · 传送抵达'}</span></div><div class="atlas-destinations">${regions.map(r=>`<article data-region-card="${r.id}"><div><small>${r.en}</small><h3>${r.name}</h3><p class="region-status">${r.status==='ready'?'可以抵达':'选择后展开这片风景'}</p></div><div><button data-teleport="${r.id}" ${r.status==='loading'?'disabled':''}>传送抵达</button>${CHARACTER_ENABLED?`<button data-flight="${r.id}" ${r.status==='ready'?'':'disabled'}>飞往此地</button>`:''}<button data-retry="${r.id}" hidden>重新加载</button></div></article>`).join('')}</div>`;
 const pad=document.createElement('div');pad.className='atlas-pad';pad.setAttribute('aria-label','触屏移动');pad.innerHTML=[['KeyW','↑','向前移动'],['KeyA','←','向左移动'],['KeyS','↓','向后移动'],['KeyD','→','向右移动'],['ShiftLeft','跑','按住跑步'],['Space','升','向上飞行'],['KeyC','降','向下飞行']].map(([key,text,label])=>`<button data-key="${key}" aria-label="${label}">${text}</button>`).join('');
 const gateButton=document.createElement('button');gateButton.className='atlas-gate';gateButton.textContent='E · 打开光门地图';gateButton.hidden=true;
 document.body.append(ui,message,map,reticle,pad,gateButton);
 const transition=createWorldTransition(),portalPassage=createPortalPassage(world,nav);
 const gathering=createGathering({world,nav,time,isBlocked,say});
 const environment=createFantasyEnvironment({world,time,sun,hillSun,hemisphere,regionalLight:light,gathering});
 const buildings=createBuildingInspection(world,settlements,{gathering,isBlocked,getRegion:()=>current,nav});
 const discoveries=createDiscoveries(world,{settlements,gathering,buildings,nav,isBlocked,say});regions.slice(0,2).forEach(r=>discoveries.add(r));
 const town=createTownLife(world,{settlements,gathering,buildings,nav,isBlocked,say});regions.slice(0,2).forEach(r=>town.add(r));
 const market=createMarket(world,{settlements,source:sources[1],nav,buildings,gathering,isBlocked,say});
 const housing=createHousing(world,{settlements,market,nav,buildings,gathering,isBlocked,say});
 const quarter=createWaterfrontQuarter(world,{settlements,nav,buildings,gathering,isBlocked,say,environment});
 const valleyTown=createValleyTownLife(world,{settlements,nav,buildings,gathering,market,environment,isBlocked,say});
 const forestGarden=createForestGarden(world,{settlements,nav,buildings,gathering,market,town,isBlocked,say});
 const starHall=createStarHall(world,{source:sources[0],settlements,nav,buildings,market,gathering,environment,isBlocked,say});
 const resources=createResources(world,{settlements,nav,market,gathering,town,isBlocked,say});
 const services=document.createElement('div');services.className='atlas-services';services.id='atlas-services';services.hidden=true;
 const serviceToggle=document.createElement('button');serviceToggle.className='atlas-services-toggle';serviceToggle.textContent='城镇功能';serviceToggle.setAttribute('aria-expanded','false');serviceToggle.setAttribute('aria-controls',services.id);
 for(const b of [...ui.querySelector('.atlas-modes').children])if(!b.matches('.atlas-map-open,.herb-bag-button'))services.append(b);
 ui.querySelector('.atlas-modes').append(serviceToggle);ui.append(services);
 for(const [label,action] of [['市集商店',()=>market.showDirectory()],['采集产地',()=>resources.showDirectory()],['工坊与任务',()=>town.showLedger()],['我的客房',()=>housing.open()]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(isBlocked())return;services.hidden=true;serviceToggle.setAttribute('aria-expanded','false');world.visitor?.enter();action();};services.append(b);}
 serviceToggle.onclick=()=>{services.hidden=!services.hidden;serviceToggle.setAttribute('aria-expanded',String(!services.hidden));};
 const panelSize=new ResizeObserver(()=>document.body.style.setProperty('--visitor-panel-height',ui.offsetHeight+'px'));panelSize.observe(ui);
 ui.querySelector('.atlas-help').textContent='方向键 / WASD 开始步行 · 右键点地面前往 · 左键拖动环顾';
 const walkMarker=new T.Mesh(new T.RingGeometry(.19,.28,40),new T.MeshBasicMaterial({color:'#f3d99c',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false}));
 walkMarker.rotation.x=-Math.PI/2;walkMarker.visible=false;walkMarker.userData.noCollision=true;scene.add(walkMarker);
 const walkRay=new T.Raycaster(),walkPointer=new T.Vector2();
 function fixedView(){return !!buildings.selected||quarter.ferry?.following||document.body.dataset.atlasInspecting==='true';}
 function startWalking(){return setMode('walk',{preserve:Math.hypot(camera.position.x-position.x,camera.position.z-position.z)<3&&Math.abs(camera.position.y-position.y-EYE_HEIGHT)<1});}
 function readyToWalk(){return !disposed&&!isBlocked()&&!fixedView()&&!document.querySelector('.loading:not(.done)');}
 function rightWalk(e){
  if(e.button!==2||e.ctrlKey||e.metaKey||!readyToWalk())return;
  e.preventDefault();e.stopImmediatePropagation();
  const rect=canvas.getBoundingClientRect();walkPointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);walkRay.setFromCamera(walkPointer,camera);nav.sync();
  const target=nav.pickGround(walkRay.ray,60);
  if(!target||!nav.clearBody(target)){stopWalking();say('请右键点选附近可站立的地面。');return;}
  if(mode!=='walk'&&!startWalking())return;
  clearInput();autopilot=null;
  if(Math.hypot(target.x-position.x,target.z-position.z)>40){say('目的地较远，请先选择近处地面。');return;}
  walkTarget=target;walkMarker.position.copy(target).y+=.035;walkMarker.visible=true;
  canvas.focus({preventScroll:true});say('正在步行前往 · 左键或方向键可接管');
 }
 const walkContext=e=>{if(readyToWalk())e.preventDefault();};
 canvas.addEventListener('pointerdown',rightWalk,true);canvas.addEventListener('contextmenu',walkContext);
 let messageTimer;function say(text){message.textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>message.textContent='',4000);}
 function stopWalking(){walkTarget=null;walkMarker.visible=false;}
 function clearInput(){stopWalking();keys.clear();if(drag&&canvas.hasPointerCapture(drag[4]))canvas.releasePointerCapture(drag[4]);drag=null;}
 function isBlocked(){return transition.busy||document.body.dataset.starObserving==='true'||document.body.dataset.resourceBusy==='true'||document.body.dataset.townBusy==='true'||document.body.dataset.homeEditing==='true'||!!document.querySelector('dialog[open]');}
 function nearest(p){return regions.reduce((a,r)=>Math.hypot(p.x-r.center[0],p.z-r.center[2])<Math.hypot(p.x-a.center[0],p.z-a.center[2])?r:a,regions[0]);}
 function orient(target){camera.lookAt(new T.Vector3(...target));euler.setFromQuaternion(camera.quaternion);yaw=euler.y;pitch=euler.x;}
 function followCamera(dt=0,snap=false){
  if(FIRST_PERSON){
   camera.position.copy(position).y+=EYE_HEIGHT;
   camera.quaternion.setFromEuler(euler.set(pitch,yaw,0,'YXZ'));
   camera.getWorldDirection(forward);controls.target.copy(camera.position).addScaledVector(forward,18);
   return;
  }
  const automatic=mode==='fly'&&!drag&&performance.now()>manualCameraUntil;
  const bias=automatic?(verticalSpeed< -1?-.44*T.MathUtils.clamp(-verticalSpeed/12,0,1):verticalSpeed>1?.17*T.MathUtils.clamp(verticalSpeed/12,0,1):0):0;
  flightCameraBias=snap?0:T.MathUtils.damp(flightCameraBias,bias,3.5,dt);
  const cameraPitch=T.MathUtils.clamp(pitch+flightCameraBias,-1.2,1.1);
  aim.copy(position).y+=1.25;
  if(mode==='fly'&&verticalSpeed< -1){aim.x-=Math.sin(yaw)*.45;aim.z-=Math.cos(yaw)*.45;}
  ui.dataset.flightCamera=flightCameraBias.toFixed(3);
  cameraDirection.set(Math.sin(yaw)*Math.cos(cameraPitch),-Math.sin(cameraPitch),Math.cos(yaw)*Math.cos(cameraPitch));
  desiredCamera.copy(aim).addScaledVector(cameraDirection,cameraDistance);
  // Shorten the boom against real terrain/walls, including inside buildings.
  if(nav.obstructed(aim,desiredCamera,.16)){
   let lo=0,hi=cameraDistance;
   for(let i=0;i<7;i++){const d=(lo+hi)/2;next.copy(aim).addScaledVector(cameraDirection,d);if(nav.obstructed(aim,next,.16))hi=d;else lo=d;}
   desiredCamera.copy(aim).addScaledVector(cameraDirection,Math.max(.12,lo-.12));
  }
  camera.position.copy(desiredCamera);camera.lookAt(aim);vegetation.update(mode!=='observe',position,camera.position,aim);
 }
 function syncTraveler(dt,moving=false,running=false,snap=false,reset=false){
  facing.set(-Math.sin(yaw),0,-Math.cos(yaw));
  if(moving)facing.subVectors(position,beforeMove).setY(0);
  traveler?.setVisible(mode!=='observe');
  traveler?.update(dt,position,moving||snap?facing:new T.Vector3(),{moving,running,flying:mode==='fly',snap,reset,verticalSpeed,speed:dt>0?Math.hypot(position.x-beforeMove.x,position.z-beforeMove.z)/dt:0});
  ui.dataset.mode=mode;ui.dataset.position=position.toArray().map(n=>n.toFixed(3)).join(',');ui.dataset.animation=traveler?.animation||(FIRST_PERSON?'none':'loading');ui.dataset.gaitRate=(traveler?.playbackRate||1).toFixed(3);
  ui.dataset.flightMotion=traveler?.avatar.userData.flight?.motion||'ground';ui.dataset.flightPitch=(traveler?.avatar.userData.flight?.pitch||0).toFixed(3);ui.dataset.verticalSpeed=verticalSpeed.toFixed(3);
  ui.dataset.outfit=traveler?.outfit||'loading';ui.dataset.cloakOpacity=(traveler?.cloakOpacity||0).toFixed(3);
  if(moving)ui.dataset.lastLocomotion=traveler?.animation||'loading';
 }
 function loadCharacter(){
  if(!CHARACTER_ENABLED)return Promise.resolve();
  if(characterPromise)return characterPromise;
  ui.dataset.character='loading';
  characterPromise=loadTraveler(scene).then(value=>{if(disposed){value.dispose();return;}traveler=value;ui.dataset.character='mira-no-cloak';syncTraveler(0,false,false,true);}).catch(error=>{ui.dataset.character='error';say('旅人暂未加载，点击步行探索可重试。');console.warn('Atlas traveler unavailable:',error);}).finally(()=>characterPromise=null);
  return characterPromise;
 }
 function setMode(value,{preserve=false}={}){
  if(disposed||!['observe','walk','fly'].includes(value)||(FIRST_PERSON&&value==='fly'))return false;if(CHARACTER_ENABLED&&!traveler&&!characterPromise)loadCharacter();clearInput();autopilot=null;
  if(value===mode)return true;
  if(value==='walk'&&isBlocked())return false;
  if(value==='walk'){
   buildings.close();delete document.body.dataset.atlasInspecting;world.visitor?.enter();
   const r=nearest(mode==='observe'?camera.position:position);if(r.status!=='ready'){say('这片区域还在展开，请稍候。');return false;}
   let ground;
   if(mode==='fly'||preserve)ground=nav.landing(position.x,position.z,position.y,2);
   else ground=nav.landing(r.landing?.x??r.spawn[0],r.landing?.z??r.spawn[2],r.landing?.y??r.spawn[1],8);
   if(!ground||(mode==='fly'&&position.y-ground.y>2.35)){say('请先飞近地面，再切换步行；也可以通过地图安全抵达。');return false;}
   position.copy(ground);
   if(!preserve&&mode!=='fly'){camera.position.copy(position).y+=1.65;orient(r.look);}
   pitch=FIRST_PERSON?-.06:-.22;
  }
  if(value==='fly'&&mode==='observe'){position.copy(camera.position).y-=1.65;euler.setFromQuaternion(camera.quaternion);yaw=euler.y;pitch=euler.x;}
  if(value==='observe'){
   camera.getWorldDirection(forward);controls.target.copy(camera.position).addScaledVector(forward,18);controls.enabled=true;controls.update();
  }else {world.cancelCameraMotion({preserveExploration:true});const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;controls.enabled=false;}
  mode=value;camera.near=(mode==='walk'&&FIRST_PERSON) ? .08 : outdoorNear;camera.updateProjectionMatrix();gateButton.hidden=true;verticalSpeed=0;if(mode!=='fly')flightCameraBias=0;document.body.dataset.atlasMode=mode;
  ui.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  ui.querySelector('.atlas-help').textContent=mode==='walk'&&matchMedia('(pointer: coarse)').matches?'左侧方向按钮移动 · 单指拖动环顾 · 地图选择目的地':mode==='observe'?'方向键 / WASD 开始步行 · 右键点地面前往 · 左键拖动环顾':mode==='walk'?'WASD / 方向键移动 · 右键点地面行走 · 左键拖动环顾 · Shift 快行 · Esc 停止/观景':'WASD 飞行 · 空格上升 / C 下降 · Shift 加速 · 拖动环顾 · M 地图';
  canvas.setAttribute('aria-label',mode==='walk'?'第一人称探索：WASD 或方向键移动，右键点击地面行走，左键拖动环顾，Escape 停止或返回观景':'三维城镇：拖动环顾，滚轮缩放，点击建筑和草木');
  syncTraveler(0,false,false,true);
  vegetation.update(mode!=='observe',position,camera.position,aim);
  if(value!=='observe'){followCamera(0,true);canvas.focus({preventScroll:true});}return true;
 }
 function openMap({legacy=false}={}){if(world.shell&&!legacy){world.shell.open('maps');return;}if(map.open)return;clearInput();autopilot=null;mapFocus=document.activeElement;map.showModal();map.querySelector('.atlas-map-close').focus();}
 function closeMap(){map.close();}
 map.querySelector('.atlas-map-close').onclick=closeMap;map.addEventListener('close',()=>{clearInput();mapFocus?.focus({preventScroll:true});});
 map.addEventListener('click',e=>{if(e.target===map){const r=map.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeMap();}});
 function gate(region){
  // Cloud garden and Violet already have their own doors. Only instantiate
  // the two restored stone arches here; never add placeholder landing rings.
  if(!region.landing||!region.portalSite)return;
  const p=region.landing.clone();p.x=region.offset[0]+region.portalSite.xz[0]*region.scale;p.z=region.offset[2]+region.portalSite.xz[1]*region.scale;
  const ground=nav.height(p.x,p.z,150);if(ground!==null)p.y=ground+.12;
  const restored=createHeritageGate(region.id,time);restored.group.position.copy(p);restored.group.scale.setScalar(region.portalSite.scale);scene.add(restored.group);gates.push({...restored,region});
 }
 function prepareLanding(region){
  region.landing=nav.landing(region.spawn[0],region.spawn[2],region.spawn[1],10);
  if(!region.landing)throw Error(region.name+'暂时找不到安全落脚点');gate(region);
 }
 function updateCard(r){const card=map.querySelector(`[data-region-card="${r.id}"]`);card.querySelector('.region-status').textContent=r.status==='ready'?(CHARACTER_ENABLED?'区域内步行 · 飞行或传送抵达':'观景与传送门游览'):r.status==='error'?'这片风景未能加载，请重试。':r.status==='idle'?'选择后展开这片风景':'正在展开这片风景…';card.querySelectorAll('[data-teleport],[data-flight]').forEach(b=>b.disabled=r.status==='loading'||r.status==='error');card.querySelector('[data-retry]').hidden=r.status!=='error';}
 let regionLoadQueue=Promise.resolve();
 async function load(r){if(r.promise)return r.promise;r.status='loading';updateCard(r);
  // Don't overlap Draco decoding and multi-million-triangle construction for
  // rapid map selections or all-world callers: their transient heaps add up.
  r.promise=regionLoadQueue.then(async()=>{try{if(disposed)return;const root=await loadRegion(r,time,p=>{r.progress=p;onProgress(.75+.12*(p.total?p.loaded/p.total:0),'正在载入'+r.name,transferText(p));});if(disposed)return;onProgress(.88,'正在布置'+r.name+'的建筑');await paintLoading();settlements.add(r,root);quarter.add(r,root);valleyTown.add(r,root);forestGarden.add(r,root);details.add(r,root);r.root=root;scene.add(root);onProgress(.91,'正在准备'+r.name+'的道路与碰撞');await paintLoading();nav.add(root);if(CHARACTER_ENABLED)vegetation.add(root);prepareLanding(r);onProgress(.94,'正在准备'+r.name+'的城镇互动');await paintLoading();gathering.add(r,root);valleyTown.reserveFlora(r);forestGarden.reserveFlora(r);environment.add(r,root);details.enableLOD(r);discoveries.add(r);town.add(r);resources.add(r,root);refraction.add(scene);r.status='ready';}
   catch(error){r.status='error';r.error=error;console.warn('Atlas region unavailable:',r.id,error);say(r.name+'暂未加载，地图中可重试。');}finally{r.promise=null;updateCard(r);}});regionLoadQueue=r.promise;return r.promise;
 }
 function travel(id,method='teleport'){
  starHall.clear();resources.clear();valleyTown.clear();forestGarden.clear();quarter.clear();housing.close();market.clear();town.clear();discoveries.clear();buildings.close();gathering.cancel({clearSelection:true});delete document.body.dataset.atlasInspecting;
  const r=regions.find(r=>r.id===id);if(!r||r.status!=='ready'||!r.landing){say('目的地尚未准备好。');return false;}
  world.visitor?.enter();
  if(method==='portal'||!CHARACTER_ENABLED){
   closeMap();setMode('observe');world.cancelCameraMotion();position.copy(r.landing);camera.position.copy(position).y+=1.65;orient(r.look);controls.target.fromArray(r.look);controls.update();
   gardenGate.update(time.value);const arrival=gardenGate.arrivalFor(id);if(arrival){camera.position.copy(arrival.position);controls.target.copy(arrival.target);camera.lookAt(arrival.target);controls.update();}else if(!CHARACTER_ENABLED){camera.position.fromArray(r.view);controls.target.fromArray(r.look);camera.lookAt(controls.target);controls.update();}
   current=r.id;ui.querySelector('.atlas-location span').textContent=r.name;ui.style.setProperty('--region-color',r.color);say('已抵达 '+r.name);history.replaceState(null,'',location.pathname+'?region='+id+'&arrival=portal');return true;
  }
  nav.sync();const destination=nav.landing(r.landing.x,r.landing.z,r.landing.y,4);if(!destination){say('落脚点暂时受阻，请稍后重试。');return false;}r.landing.copy(destination);closeMap();setMode('fly');world.cancelCameraMotion();
  if(method==='teleport'){
   camera.position.copy(destination).y+=1.65;position.copy(destination);orient(r.look);setMode('walk',{preserve:true});current=r.id;ui.querySelector('.atlas-location span').textContent=r.name;ui.style.setProperty('--region-color',r.color);say('已抵达 '+r.name);history.replaceState(null,'',location.pathname+'?region='+id);syncTraveler(0,false,false,true,true);followCamera(0,true);
  }else{
   const start=position.clone().add(new T.Vector3(0,1.65,0)),end=destination.clone().add(new T.Vector3(0,3.5,0)),height=Math.max(145,start.y+30,end.y+50);
   autopilot={points:[start,new T.Vector3(start.x,height,start.z),new T.Vector3(end.x,height,end.z),end],index:1,region:r};say('飞往'+r.name+' · 按任意方向键可接管');
  }return true;
 }
 async function scenicTravel(id,method='teleport',passage){const r=regions.find(r=>r.id===id);if(!r)return false;if(r.status!=='ready'){say('正在准备'+r.name+'…');await readyFor(id);}if(r.status!=='ready')return false;closeMap();gathering.cancel({clearSelection:true});return transition.run(r,()=>travel(id,method),passage);}
 ui.querySelector('.atlas-safe').onclick=()=>{if(!isBlocked())travel(current,'portal');};
 ui.querySelector('.atlas-guide').onclick=()=>{if(isBlocked())return;setMode('observe');world.visitor?.enter();const options=settlements.records.filter(r=>r.region===current&&r.inspect!==false),record=options.find(r=>r.district)||options[0];if(record){buildings.focus(record,false);say('点选房间进入；地图可选择其他建筑，自由探索可返回入口步行。');}else openMap();};
 ui.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{delete document.body.dataset.atlasInspecting;setMode(b.dataset.mode);});ui.querySelector('.atlas-map-open').onclick=openMap;
 map.querySelectorAll('[data-teleport]').forEach(b=>b.onclick=()=>scenicTravel(b.dataset.teleport));map.querySelectorAll('[data-flight]').forEach(b=>b.onclick=()=>scenicTravel(b.dataset.flight,'fly'));map.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>load(regions.find(r=>r.id===b.dataset.retry)));
 map.querySelectorAll('[data-map-region]').forEach(b=>{const select=()=>{map.querySelectorAll('[data-region-card]').forEach(c=>c.classList.toggle('selected',c.dataset.regionCard===b.dataset.mapRegion));map.querySelector(`[data-region-card="${b.dataset.mapRegion}"]`).scrollIntoView({block:'nearest',behavior:'smooth'});};b.onclick=select;b.onkeydown=e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();select();}};});
 document.querySelector('[data-panel="worlds"]').onclick=openMap;function useNearbyGate(){const g=gates.find(g=>g.group.position.distanceTo(position)<4);if(g?.run)g.run();else openMap();}gateButton.onclick=useNearbyGate;
 const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space','KeyC','ShiftLeft','ShiftRight']);
 function keyDown(e){if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable||isBlocked())return;
  if(e.code==='KeyM'){e.preventDefault();e.stopImmediatePropagation();openMap();return;}
  if(mode==='observe'){if(!/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)||!readyToWalk())return;e.preventDefault();e.stopImmediatePropagation();if(!startWalking())return;}
  if(movement.has(e.code)){e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);autopilot=null;if(!e.code.startsWith('Shift'))stopWalking();}
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(walkTarget)stopWalking();else setMode('observe');}
  if(e.code==='KeyF'&&CHARACTER_ENABLED&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();setMode(mode==='fly'?'walk':'fly');}
  if(e.code==='KeyE'&&!gateButton.hidden){e.preventDefault();e.stopImmediatePropagation();useNearbyGate();}
 }
 const keyUp=e=>keys.delete(e.code);window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
 function down(e){if(e.button===0)stopWalking();if(mode==='observe'||isBlocked()||e.button!==0||drag)return;drag=[e.clientX,e.clientY,yaw,pitch,e.pointerId];canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}
 function move(e){if(!drag||drag[4]!==e.pointerId||mode==='observe'||isBlocked())return;yaw=drag[2]-(e.clientX-drag[0])*.003;pitch=T.MathUtils.clamp(drag[3]-(e.clientY-drag[1])*.003,-1.35,1.35);manualCameraUntil=performance.now()+1600;}
 const release=e=>{if(!drag||drag[4]!==e.pointerId)return;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 pad.querySelectorAll('button').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();if(mode==='observe'||isBlocked())return;stopWalking();keys.add(b.dataset.key);autopilot=null;b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key);});
 for(const r of regions.filter(r=>!r.asset)){prepareLanding(r);const root=sources[r.id==='aether'?0:1];gathering.add(r,root);environment.add(r,root);resources.add(r,root);updateCard(r);}
 // Public ready retains full-world QA compatibility; normal visits load only their destination.
 const readyFor=id=>{const r=regions.find(r=>r.id===id);return r?.asset&&r.status!=='ready'?load(r):Promise.resolve();};
 let allReady;
 let gateBusy=false;
 async function followPortal(id,sourceGate){
  if(gateBusy||disposed)return;gateBusy=true;
  try{
   const passage=sourceGate?portalPassage.prepare(sourceGate):null;
   if(id==='aether'){gathering.cancel({clearSelection:true});await transition.run(regions[0],()=>{starHall.clear();resources.clear();valleyTown.clear();forestGarden.clear();quarter.clear();buildings.close();closeMap();setMode('observe');world.go(3,{immediate:true});history.replaceState(null,'',location.pathname+'?region=aether&chapter=garden');say('已抵达云上花园');return true;},passage);return;}
   const r=regions.find(r=>r.id===id);
   if(r.status!=='ready'){say('正在连接'+r.name+'…');await load(r);}
   if(disposed)return;if(r.status==='ready')await scenicTravel(id,'portal',passage);else say(r.name+'暂未连接成功，请再次点击传送门重试。');
  }finally{gateBusy=false;}
 }
 const gardenGate=createGardenGate({world,source:sources[0],nav,time,regions,atlasGates:gates,isBlocked,activate:followPortal});
 const portalWindows=createPortalWindows(world,{gardenGate,regions,sources,sun,hillSun,regionalLight:light,hemisphere,environment});
 let stateTick=0,shadowTime=-1;renderer.shadowMap.autoUpdate=false;
 for(const lamp of [sun,hillSun,light])lamp.shadow.autoUpdate=false;
 function update(dt){
  if(disposed||mode==='observe')return;dt=Math.min(dt,.05);nav.sync();beforeMove.copy(position);
  if(isBlocked()||document.hidden){clearInput();syncTraveler(0);return;}
  const running=keys.has('ShiftLeft')||keys.has('ShiftRight');
  if(walkTarget&&mode==='walk'){
   const dx=walkTarget.x-position.x,dz=walkTarget.z-position.z,distance=Math.hypot(dx,dz),step=Math.min(distance,(running?3.6:2.2)*dt);
   if(distance<.13)stopWalking();
   else if(!nav.walk(position,dx/distance*step,dz/distance*step)){blocked=true;stopWalking();say('前方有障碍或落差，已停下。请点选另一处地面绕行。');}
   else{blocked=false;walkMarker.position.y=(nav.height(walkTarget.x,walkTarget.z,walkTarget.y+.8,walkTarget.y-.8)??walkTarget.y)+.035;}
  }else if(autopilot){
   eye.copy(position).y+=1.65;
   const target=autopilot.points[autopilot.index],step=40*dt,d=target.distanceTo(eye);
   next.copy(eye).lerp(target,Math.min(1,step/Math.max(d,.0001)));
   if(!nav.canFly(position,new T.Vector3(next.x,next.y-1.65,next.z))){autopilot=null;say('前方有障碍，已停下。可手动绕行或打开地图传送。');}
   else{position.copy(next).y-=1.65;const dx=target.x-eye.x,dz=target.z-eye.z;if(Math.hypot(dx,dz)>.01)yaw=Math.atan2(-dx,-dz);pitch=-.22;
    if(d<=step){autopilot.index++;if(autopilot.index===autopilot.points.length){const r=autopilot.region;autopilot=null;camera.position.copy(position).y+=1.65;orient(r.look);pitch=-.22;say('已飞抵 '+r.name+'，可切换步行。');}}
   }
  }else{
   const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),r=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
   forward.set(-Math.sin(yaw),mode==='fly'?Math.sin(pitch):0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));velocity.copy(forward).multiplyScalar(f).addScaledVector(right,r);
   if(mode==='fly')velocity.y+=Number(keys.has('Space'))-Number(keys.has('KeyC'));
   const speed=mode==='fly'?(running?50.4:18):(running?3.6:FIRST_PERSON?2.2:TRAVEL_SPEED.walk);blocked=false;
   if(velocity.lengthSq()){
    velocity.normalize().multiplyScalar(speed*dt);const steps=Math.max(1,Math.ceil(velocity.length()/.18));velocity.divideScalar(steps);
    for(let i=0;i<steps;i++){
     if(mode==='walk'){if(!nav.walk(position,velocity.x,velocity.z)){blocked=true;if(!nav.walk(position,velocity.x,0))nav.walk(position,0,velocity.z);}}
     else{eye.copy(position).y+=1.65;next.copy(eye).add(velocity);next.y=T.MathUtils.clamp(next.y,-20,220);if(next.x< -155||next.x>980||next.z< -700||next.z>420){blocked=true;break;}if(!nav.canFly(position,new T.Vector3(next.x,next.y-1.65,next.z))){blocked=true;break;}position.copy(next).y-=1.65;}
    }
   }
   if(mode==='walk'){const h=nav.height(position.x,position.z,position.y+.5,position.y-.7);if(h!==null)position.y=h;}
  }
  const moving=Math.hypot(position.x-beforeMove.x,position.z-beforeMove.z)>1e-5;
  verticalSpeed=mode==='fly'&&dt>0?(position.y-beforeMove.y)/dt:0;
  syncTraveler(dt,moving,running);followCamera(dt);
  stateTick+=dt;if(stateTick>.15){stateTick=0;ui.dataset.blocked=String(blocked);ui.dataset.obstacle=nav.lastObstacle;const r=nearest(position);current=r.id;ui.querySelector('.atlas-location span').textContent=r.name;ui.style.setProperty('--region-color',r.color);const nearbyGate=gates.find(g=>g.group.position.distanceTo(position)<4);gateButton.hidden=!nearbyGate;gateButton.textContent=nearbyGate?.run?'E · '+nearbyGate.label:'E · 打开光门地图';}
 }
 function beforeRender(seconds){
  if(mode==='observe'){const hint=buildings.inside?'室内：方向键或拖动环顾 · 点击自由探索返回城镇步行':fixedView()?'当前为近观视角 · 拖动环顾 · 点击自由探索开始步行':'方向键 / WASD 开始步行 · 右键点地面前往 · 左键拖动环顾';const help=ui.querySelector('.atlas-help');if(help.textContent!==hint)help.textContent=hint;}
  nav.sync();buildings.update();portalPassage.update();gardenGate.update(seconds);
  const r=nearest(camera.position),forest=regions[2],fd=Math.hypot(camera.position.x-forest.center[0],camera.position.z-forest.center[2]),purpleWeight=1-T.MathUtils.smoothstep(fd,41,132);
  if(document.body.dataset.atlasRegion!==r.id)document.body.dataset.atlasRegion=r.id;
  if(current!==r.id){current=r.id;ui.querySelector('.atlas-location span').textContent=r.name;ui.style.setProperty('--region-color',r.color);}
  const extension=r.asset?1-T.MathUtils.smoothstep(Math.hypot(camera.position.x-r.center[0],camera.position.z-r.center[2]),r.radius,r.radius+65):0;
  sun.intensity*=1-extension;hillSun.intensity*=1-extension;light.intensity=extension*(1+purpleWeight*.8);light.color.set(purpleWeight>.3?'#e1c2f5':r.id==='valley'?'#e4edf1':'#ffe0bd');light.position.set(camera.position.x-40,90,camera.position.z+30);light.target.position.copy(camera.position);
  hemisphere.intensity=.52+extension*.5;scene.fog.color.copy(originalFog).lerp(purple,purpleWeight);scene.fog.density=.0028+purpleWeight*.0106;scene.backgroundIntensity=1.65-purpleWeight*1.25;scene.environmentIntensity=.38-purpleWeight*.17;
  sources[0].visible=camera.position.distanceTo(new T.Vector3(0,15,0))<camera.far+115;sources[1].visible=camera.position.distanceTo(new T.Vector3(0,18,150))<camera.far+100;
  // The forest is a visible landmark from the mountains. Let Three.js cull
  // its individual meshes against the camera instead of hiding the whole region.
  for(const r of regions){if(r.root){r.root.visible=r.id==='forest'||Math.hypot(camera.position.x-r.center[0],camera.position.z-r.center[2])<r.radius+190;if(r.root.visible)r.animate?.(seconds);if(r.id==='forest')r.root.traverse(o=>{if(o.isMesh&&/leaves|heather/i.test(o.material?.name||''))o.material.emissiveIntensity=.035+purpleWeight*.165;});}}
  for(const g of gates)g.animate(seconds);
  gathering.update();environment.update();details.update(environment.nightBlend);refraction.update();discoveries.update();town.update();market.update();housing.update();quarter.update();valleyTown.update();forestGarden.update();resources.update();starHall.update();portalWindows.update();
  const shadowNow=performance.now()/1000;
  if(shadowNow-shadowTime>.4){for(const lamp of [sun,hillSun,light])lamp.shadow.needsUpdate=lamp.intensity>.04;renderer.shadowMap.needsUpdate=true;shadowTime=shadowNow;}
 }
 return {get ready(){return allReady??=Promise.all([...regions.filter(r=>r.asset).map(r=>readyFor(r.id)),...(CHARACTER_ENABLED?[loadCharacter()]:[])]);},readyFor,nav,regions,paths,gates,gathering,environment,settlements,geology,details,refraction,buildings,discoveries,town,market,housing,quarter,valleyTown,forestGarden,starHall,resources,transition,gardenGate,portalWindows,removedBridgeTriangles,position,setMode,travel,openMap,update,beforeRender,get mode(){return mode;},get active(){return mode!=='observe';},stats:()=>({mode,character:ui.dataset.character,animation:traveler?.animation,region:current,position:position.toArray(),blocked,walkTarget:walkTarget?.toArray()||null,autopilot:!!autopilot,regions:regions.map(r=>({id:r.id,status:r.status,landing:r.landing?.toArray()})),paths:paths.length,removedBridgeTriangles,navigation:nav.stats()}),dispose(){disposed=true;canvas.removeEventListener('pointerdown',rightWalk,true);canvas.removeEventListener('contextmenu',walkContext);walkMarker.removeFromParent();walkMarker.geometry.dispose();walkMarker.material.dispose();panelSize.disconnect();starHall.dispose();resources.dispose();valleyTown.dispose();forestGarden.dispose();quarter.dispose();portalPassage.dispose();portalWindows.dispose();housing.dispose();market.dispose();town.dispose();discoveries.dispose();refraction.dispose();buildings.dispose();details.dispose();settlements.dispose();geology.dispose();gathering.dispose();environment.dispose();transition.dispose();gardenGate.dispose();traveler?.dispose();clearInput();clearTimeout(messageTimer);[ui,reticle,message,map,pad,gateButton].forEach(el=>el.remove());window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',clearInput);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',release);canvas.removeEventListener('pointercancel',release);}};
}
