import './style.css';
import { createWorld } from './world.js';
import { createAmbience } from './audio.js';
import { chapters, profile, projects } from './content.js';
const arrow='<svg viewBox="0 0 28 20" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 10h24m-7-7 7 7-7 7"/></svg>';
const pause='<svg viewBox="0 0 18 18" fill="currentColor"><path d="M4 2h3v14H4zm7 0h3v14h-3z"/></svg>';
const play='<svg viewBox="0 0 18 18" fill="currentColor"><path d="m5 2 10 7-10 7z"/></svg>';
const speaker=(enabled=false)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${enabled?'<path d="M16 8q4 4 0 8m3-11q7 7 0 14"/>':'<path d="m17 9 5 6m0-6-5 6"/>'}</svg>`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduced)document.body.classList.add('reduced');
if(new URLSearchParams(location.search).has('capture'))document.body.classList.add('capture');
document.querySelector('#app').innerHTML=`
 <main id="world" aria-label="紫境三维森林，可拖动环顾或滚动沿小径探索"></main><div class="shade"></div>
 <header class="header"><button class="brand" aria-label="返回森林入口">ZIYU <span>/ 紫境</span></button><nav class="nav" aria-label="主导航"><button data-panel="world">世界</button><button data-panel="about">关于</button><button data-panel="works">作品</button><button class="sound" aria-label="开启环境音" aria-pressed="false">${speaker()}</button></nav></header>
 <section class="hero" aria-live="polite"><h1>在想象的<br>深处，相遇。</h1><p>欢迎来到我的一隅宇宙。</p><button class="cta" disabled>开启漫游 ${arrow}</button></section>
 <footer class="footer"><div class="hint"><svg viewBox="0 0 18 28" fill="none" stroke="currentColor"><rect x="2" y="2" width="14" height="24" rx="7"/><path d="M9 2v11M2 13h14"/></svg><span>拖动环顾 · 滚动探索</span></div><nav class="chapters" aria-label="场景章节">${chapters.map((c,i)=>`<button class="chapter ${i===0?'active':''}" data-chapter="${i}" aria-current="${i===0?'step':'false'}" disabled><strong>0${i+1}</strong><span>${c.name}</span></button>`).join('')}</nav><button class="play" disabled aria-label="${reduced?'播放动画':'暂停动画'}">${reduced?play:pause}<span>${reduced?'播放':'暂停'}</span></button></footer>
 <div class="loading" role="status"><svg class="gate" viewBox="0 0 48 70"><path d="M5 66V29Q5 14 24 3Q43 14 43 29V66M12 66V30Q12 20 24 12Q36 20 36 30V66"/></svg><p>正在走进紫境</p><div class="load-track"><i></i></div><span class="load-caption">正在载入森林</span></div><div class="toast" role="status"></div>
 <dialog id="panel" aria-labelledby="panel-title"><button class="close" aria-label="关闭面板"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 5 14 14M19 5 5 19"/></svg></button><div class="panel-body"></div></dialog>`;
const $=s=>document.querySelector(s),ambience=createAmbience();let world,active=0,playing=!reduced,touring=false,timer,heroTimer,previousFocus;
function toast(msg){$('.toast').textContent=msg;$('.toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('.toast').classList.remove('visible'),2500);}
function updatePlay(){const btn=$('.play');btn.innerHTML=(playing?pause:play)+`<span>${playing?'暂停':'播放'}</span>`;btn.setAttribute('aria-label',playing?'暂停动画':'播放动画');}
function updateChapter(index,immediate=false){if(index===active&&!immediate)return;active=index;document.querySelectorAll('.chapter').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});const apply=()=>{$('.hero h1').innerHTML=chapters[index].title.join('<br>');$('.hero h1').classList.toggle('long',index===3);$('.hero p').textContent=chapters[index].description;$('.hero').classList.remove('changing');};clearTimeout(heroTimer);if(immediate||reduced)apply();else{$('.hero').classList.add('changing');heroTimer=setTimeout(apply,240);}}
function go(index){if(!world)return;world.go(index);touring=false;$('.cta').innerHTML='开启漫游 '+arrow;updateChapter(index);}
function showPanel(type){const panel=$('#panel');if(type==='world'){if(panel.open)panel.close();go(0);return;}previousFocus=document.activeElement;
 if(type==='about')$('.panel-body').innerHTML=`<p class="panel-label">${profile.name} / 关于</p><h2 id="panel-title">${profile.title}</h2><p class="description">${profile.description}</p><p class="note">${profile.note}</p><button class="cta return-world">回到森林 ${arrow}</button>`;
 else $('.panel-body').innerHTML=`<p class="panel-label">ZIYU / 作品</p><h2 id="panel-title">一些正在生长的想法。</h2>${projects.map(p=>`<button class="project" data-visit="${p.chapter}"><small>${p.type}</small><h3>${p.title}</h3><p>${p.detail}</p></button>`).join('')}<p class="note">以上为当前森林中的场景实验。可在内容文件中替换为个人作品。</p>`;
 panel.showModal();world?.setPlaying(false);$('.return-world')?.addEventListener('click',()=>panel.close());panel.querySelectorAll('[data-visit]').forEach(b=>b.addEventListener('click',()=>{panel.close();go(Number(b.dataset.visit));}));
}
$('.brand').addEventListener('click',()=>go(0));document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.panel)));
$('.close').addEventListener('click',()=>$('#panel').close());$('#panel').addEventListener('close',()=>{world?.setPlaying(playing);previousFocus?.focus();});$('#panel').addEventListener('click',e=>{if(e.target===$('#panel')&&e.clientX<$('#panel').getBoundingClientRect().left)$('#panel').close();});
$('.sound').addEventListener('click',async()=>{try{const enabled=await ambience.toggle();$('.sound').innerHTML=speaker(enabled);$('.sound').setAttribute('aria-pressed',String(enabled));$('.sound').setAttribute('aria-label',enabled?'关闭环境音':'开启环境音');}catch{toast('当前浏览器暂时无法开启声音');}});
$('.play').addEventListener('click',()=>{playing=!playing;world?.setPlaying(playing);updatePlay();});
$('.cta').addEventListener('click',()=>{touring=!touring;world.setTouring(touring);if(touring){playing=true;updatePlay();}$('.cta').innerHTML=(touring?'停止漫游':'开启漫游')+' '+arrow;});
document.querySelectorAll('[data-chapter]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.chapter))));
window.addEventListener('journeychange',e=>{touring=false;$('.cta').innerHTML='开启漫游 '+arrow;updateChapter(Math.round(e.detail*3));});window.addEventListener('tourend',()=>{touring=false;$('.cta').innerHTML='再次漫游 '+arrow;updateChapter(3);});
window.addEventListener('keydown',e=>{if($('#panel').open||['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();$('.play').click();}else if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();go(Math.min(3,active+1));}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(Math.max(0,active-1));}else if(e.key==='Home'){go(0);}});
document.addEventListener('visibilitychange',()=>{document.hidden?ambience.suspend():ambience.resume();});
try{world=await createWorld($('#world'),p=>{$('.load-track i').style.width=Math.round(p*100)+'%';$('.load-caption').textContent='森林载入 '+Math.round(p*100)+'%';},reduced);$('.loading').classList.add('done');document.querySelectorAll('button:disabled').forEach(b=>b.disabled=false);setTimeout(()=>$('.loading').remove(),1000);window.__forest={world,go,stats:()=>world.stats(),ready:true};setInterval(()=>{if(touring)updateChapter(Math.round(world.getProgress()*3));},500);world.portal.ready();if(new URLSearchParams(location.search).get('walk')==='1')world.explorer.enter();rendererContextRecovery();}
catch(error){console.error(error);$('.loading').remove();$('#world').replaceChildren();$('#world').style.background='center / cover url(/forest/reference.png)';const box=document.createElement('div');box.className='error';box.setAttribute('role','alert');box.innerHTML='三维场景暂时无法加载，当前展示参考图。请使用支持 WebGL 的浏览器。<button>重新加载</button>';box.querySelector('button').onclick=()=>location.reload();$('#app').appendChild(box);}
function rendererContextRecovery(){$('#world canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形连接中断，正在恢复…');});$('#world canvas').addEventListener('webglcontextrestored',()=>location.reload());}

window.addEventListener('pagehide',()=>{world?.dispose();ambience.dispose();});

window.addEventListener('explorermode',()=>{touring=false;$('.cta').innerHTML='开启漫游 '+arrow;});
