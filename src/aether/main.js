import {createLoadingView} from '../atlas/loading-view.js';
import {paintLoading} from '../atlas/asset-loading.js';
import './style.css';
import {chapters,profile,works} from './content.js';
import {createWorld} from './world.js';
import {createVisitorExperience} from '../atlas/visitor-experience.js';
import {createWorldShell} from '../atlas/world-shell.js';
const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';
const compass='<svg class="compass" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="16"/><circle cx="28" cy="28" r="10"/><path d="M28 2l5 20 21 6-21 5-5 21-5-21-21-5 21-6Z M28 12v32M12 28h32M17 17l22 22M17 39l22-22"/></svg>';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelector('#app').innerHTML=`
 <main id="landscape" aria-label="浮空群岛三维场景，可拖动旋转、滚轮或双指缩放"></main>
 <div class="edge-shade" aria-hidden="true"></div>
 <header><a class="brand" href="./home.html" aria-label="Aether 首页">${compass}<span>AETHER</span></a><nav aria-label="主导航"><button data-panel="worlds">世界</button><button data-panel="about">关于</button><button data-panel="works">作品</button><button id="region" class="region-link">前往对岸</button><button id="tour" class="outline" aria-pressed="false">自动漫游</button></nav></header>
 <section class="intro" aria-live="polite"><h1>在云端，<br>构建我的世界。</h1><p id="description">${chapters[0].description}</p><button id="explore" class="explore">开始探索<span>${arrow}</span></button></section>
 <footer><nav class="chapters" aria-label="场景导航">${chapters.map((c,i)=>`<button data-chapter="${i}" ${i===0?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span>${c.name}</button>`).join('')}</nav><div class="tools"><button id="motion" aria-pressed="${!reduced}" aria-label="${reduced?'播放动画':'暂停动画'}">${reduced?'播放动画':'暂停动画'}</button><span class="hint">拖动旋转 · 滚轮缩放</span></div></footer>
 <dialog id="drawer" aria-labelledby="panel-title"><button id="close" aria-label="关闭面板"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div id="panel-content"></div></dialog>
 <div class="loading" role="status"><div class="loading-mark">${compass}</div><h2>世界正在展开</h2><p>正在唤醒群岛、山风与瀑布</p><div class="progress"><i></i></div><small>0%</small></div>
 <div id="notice" role="status"></div>`;
let world,active=0,playing=!reduced,touring=false,returnFocus;
const dialog=document.querySelector('#drawer'),panel=document.querySelector('#panel-content');
const worlds=[['浮空群岛','AETHER','./aether.html','你正身处云端'],['北境河谷','NORTH VALLEY','./valley.html','循着雪水，走向远山。'],['紫境森林','VIOLET SANCTUARY','./index.html','穿过微光，进入想象深处。'],['精灵水庭','ELVEN WATERCOURT','./lake.html','在水与光之间停留。']];
function showPanel(kind,trigger){
 returnFocus=trigger;world?.setTour(false);
 if(kind==='worlds')panel.innerHTML=`<h2 id="panel-title">世界，彼此相连。</h2><p class="panel-lead">选择一片风景，继续你的旅程。</p><div class="world-list">${worlds.map(([name,en,url,note],i)=>`<a href="${url}" ${i===0?'aria-current="page"':''}><small>${en}</small><strong>${name}${arrow}</strong><span>${note}</span></a>`).join('')}</div>`;
 if(kind==='about')panel.innerHTML=`<h2 id="panel-title">${profile.title}</h2>${profile.paragraphs.map(p=>`<p>${p}</p>`).join('')}<p class="fine">${profile.note}</p><button class="text-link" data-goto="3">去云上花园坐坐 ${arrow}</button>`;
 if(kind==='works')panel.innerHTML=`<h2 id="panel-title">创作，落在岛上。</h2><p class="panel-lead">先从这座世界的三个片段开始。</p><div class="work-list">${works.map((w,i)=>`<button data-goto="${w.chapter}"><small>0${i+1} / ${w.type}</small><strong>${w.title}${arrow}</strong><p>${w.text}</p></button>`).join('')}</div><p class="fine">当前展示本站场景。可替换为你的真实作品。</p>`;
 panel.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{dialog.close();go(Number(b.dataset.goto));});
 dialog.showModal();document.querySelector('#close').focus();
}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>showPanel(b.dataset.panel,b));
document.querySelector('#close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>returnFocus?.focus());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function updateChapter(i){active=i;document.querySelector('#region').textContent=i>=6?'返回浮岛':'前往对岸';const c=chapters[i];document.querySelector('h1').replaceChildren(...c.title.split('\n').flatMap((text,i)=>i?[document.createElement('br'),document.createTextNode(text)]:[document.createTextNode(text)]));document.querySelector('#description').textContent=c.description;document.querySelector('#explore').innerHTML=(i===chapters.length-1?'返回初见':i===0?'开始探索':'继续探索')+`<span>${arrow}</span>`;document.querySelectorAll('[data-chapter]').forEach((b,k)=>{if(k===i){b.setAttribute('aria-current','step');b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});}else b.removeAttribute('aria-current');});}
function go(i){if(!world)return;world.go(i);updateChapter(i);}
document.querySelector('#explore').onclick=()=>go((active+1)%chapters.length);
document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>go(Number(b.dataset.chapter)));
document.querySelector('#region').onclick=()=>go(active>=6?0:7);
document.querySelector('#tour').onclick=()=>world?.setTour(!touring);
document.querySelector('#motion').onclick=()=>world?.shell?world.shell.setMotion(!playing):world?.setPlaying(!playing);
window.addEventListener('aetherstate',({detail:s})=>{playing=s.playing;touring=s.touring;if(active!==s.chapter)updateChapter(s.chapter);const tour=document.querySelector('#tour'),motion=document.querySelector('#motion');tour.textContent=touring?'停止漫游':'自动漫游';tour.setAttribute('aria-pressed',String(touring));motion.textContent=playing?'暂停动画':'播放动画';motion.setAttribute('aria-label',motion.textContent);motion.setAttribute('aria-pressed',String(playing));});
window.addEventListener('keydown',e=>{if(world?.atlas)return;if(document.querySelector('dialog[open]')||e.target.matches('button,a,input,textarea,select'))return;if(e.key==='ArrowRight'){e.preventDefault();go((active+1)%chapters.length);}if(e.key==='ArrowLeft'){e.preventDefault();go((active+chapters.length-1)%chapters.length);}if(e.code==='Space'){e.preventDefault();world?.setPlaying(!playing);}});
const loadingView=createLoadingView(document.querySelector('.loading'));
try{
 world=await createWorld(document.querySelector('#landscape'),loadingView.update,reduced,{deferStart:true});
 const params=new URLSearchParams(location.search),destination=params.get('region');
 if(world.atlas){loadingView.update(.75,'正在准备所选城镇');await world.atlas.readyFor(destination);const region=world.atlas.regions.find(r=>r.id===destination);if(region?.status==='error')throw region.error||Error('目标城镇未能加载');}
 window.__aether={ready:false,world,stats:()=>world.stats()};if(destination==='highland')go(7);else if(params.get('chapter')==='garden')go(3);
 loadingView.update(.96,'正在连接地图与浏览控制');await paintLoading();
 const canvas=world.renderer.domElement;canvas.setAttribute('tabindex','0');canvas.setAttribute('aria-label',world.atlas?'三维城镇：方向键或 WASD 开始步行，右键点地面行走，左键拖动环顾':'3D 群岛，方向键切换区域，空格暂停动画');
 if(world.atlas){world.visitor=createVisitorExperience(world);world.shell=createWorldShell({world});}
 if(world.atlas){const params=new URLSearchParams(location.search),destination=params.get('region'),quarter=params.get('quarter'),valleyTown=params.get('town'),forestGarden=params.get('conservatory'),starHall=params.get('observatory');if(destination&&(params.get('from')==='home'||!['highland','aether'].includes(destination)||params.get('walk')==='1'))world.atlas.travel(destination,params.get('arrival')==='portal'?'portal':'teleport');if(params.get('ferry')==='board')world.atlas.quarter.ferry?.board();if(quarter==='overview')world.atlas.quarter.overview();else if(['archive','inn','harbor'].includes(quarter))world.atlas.quarter.focus(quarter,0);if(valleyTown==='overview')world.atlas.valleyTown.overview();else if(['hall','lodge','storehouse'].includes(valleyTown))world.atlas.valleyTown.focus(valleyTown,0);if(forestGarden==='overview')world.atlas.forestGarden.overview();else if(['glasshouse','herbarium'].includes(forestGarden))world.atlas.forestGarden.focus(forestGarden,0);if(starHall==='hall')world.atlas.starHall.focus(true);else if(starHall==='overview')world.atlas.starHall.focus(false);else if(starHall==='telescope')world.atlas.starHall.instrument();}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#notice').innerHTML='图形连接已中断。<button onclick="location.reload()">重新载入</button>';});
 loadingView.update(.99,'正在准备第一帧画面');await paintLoading();world.start();await paintLoading();window.__aether.ready=true;loadingView.done();
}catch(error){console.error(error);world?.dispose();loadingView.fail(error);}
