import './style.css';
import {createValley,STOPS,DURATION} from './scene.js';

const icons={
  arrow:'<path d="M5 19 19 5M5 5h14v14"/>',
  play:'<path d="m8 5 11 7-11 7Z"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  sound:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  mute:'<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6M22 9l-6 6"/>',
  full:'<path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  mountain:'<path d="m2 19 7-13 6 10 3-6 5 9ZM6 12l3 2 2-3"/>',
  settings:'<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
  chevron:'<path d="m8 4 8 8-8 8"/>',
};
const svg=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app').innerHTML=`
  <main id="world" aria-label="北境河谷互动三维场景"></main>
  <div class="vignette" aria-hidden="true"></div>
  <div class="loading" role="status"><div class="loading-symbol">${svg('mountain')}</div><div class="loading-name">NORTH VALLEY</div><p>让世界慢慢展开</p><div class="load-track"><i></i></div><span class="load-number">00%</span></div>
  <header class="header hud">
    <button class="brand" aria-label="返回河谷全景"><span>ZIYU</span><small>personal world</small></button>
    <div class="header-right"><span class="region">北境河谷<span> / </span>NORTH VALLEY</span><button class="guide-button" aria-label="打开场景指南">场景指南 ${svg('arrow')}</button></div>
  </header>
  <section class="intro hud" aria-label="欢迎来到北境河谷"><h1>山野之间，<br/>灵感生长。</h1><p>一个关于创造、探索与我的小小世界。</p><button class="enter">进入山谷 ${svg('arrow')}</button></section>
  <div class="coordinates hud" aria-hidden="true"><span>01 — NORTH VALLEY</span><i></i><span>暮光 · 雪松 · 流水</span></div>
  <div class="landmark-labels hud"><button class="landmark" data-stop="1" data-key="cabin"><i></i><span>森林小屋</span></button><button class="landmark" data-stop="3" data-key="tower"><i></i><span>山间瞭望台</span></button><button class="landmark" data-stop="2" data-key="bridge"><i></i><span>河上木桥</span></button></div>
  <section class="location hud" hidden><div class="location-en">THE VALLEY</div><h2>河谷全景</h2><p>${STOPS[0].description}</p><button class="location-close" aria-label="收起地点说明">${svg('close')}</button></section>
  <div class="hint hud"><span class="drag-icon">⌘</span><span>拖动环视 <b>·</b> 滚轮缩放</span></div>
  <footer class="controls hud">
    <div class="timeline"><input type="range" min="0" max="1000" step="1" value="0" aria-label="镜头漫游进度"/><i></i></div>
    <nav class="destinations" aria-label="河谷地点">${STOPS.map((s,i)=>`<button data-stop="${i}" class="destination ${i===0?'active':''}"><small>0${i+1}</small><span>${s.name}</span></button>`).join('')}</nav>
    <div class="playback"><span class="time">00:00 <em>/ 00:48</em></span><button class="icon-button play" aria-label="播放镜头漫游">${svg('play')}</button><button class="icon-button sound" aria-label="开启自然环境声" aria-pressed="false">${svg('mute')}</button><button class="icon-button settings" aria-label="打开画面设置">${svg('settings')}</button><button class="icon-button cinema" aria-label="进入纯净观景模式">${svg('full')}</button></div>
  </footer>
  <aside class="settings-panel" aria-label="画面设置" hidden><div><h2>画面与氛围</h2><button class="icon-button close-settings" aria-label="关闭画面设置">${svg('close')}</button></div><label><span>轻雪</span><input id="snow-toggle" type="checkbox" checked role="switch"/></label><label><span>高画质</span><input id="quality-toggle" type="checkbox" checked role="switch"/></label><button class="capture-button">保存此刻 ${svg('arrow')}</button></aside>
  <button class="exit-cinema" hidden>退出观景 ${svg('close')}</button>
  <dialog class="guide"><button class="close-guide icon-button" aria-label="关闭场景指南">${svg('close')}</button><span class="guide-index">01 / THE NATURAL WORLD</span><h2>北境河谷</h2><p class="guide-lead">不必急着抵达，<br/>也可以在这里停留。</p><p>雪山、松林与一条缓缓流动的河。沿着五处地标探索这个小小世界，或让镜头带你走完一段 48 秒的山间旅程。</p><div class="guide-stops">${STOPS.map((s,i)=>`<button data-stop="${i}"><small>0${i+1}</small><span>${s.name}</span>${svg('chevron')}</button>`).join('')}</div><div class="guide-instructions"><span>拖动 / 触控 · 环视</span><span>滚轮 / 双指 · 缩放</span><span>空格 · 播放暂停</span><span>Esc · 返回</span></div><small class="credit">A little world by ZIYU<br/>岩石材质：Poly Haven · CC0</small></dialog>
  <div class="toast" role="status"></div>
`;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let valley,playing=false,cinema=false,soundOn=false,audio=null,entered=false,activeStop=0,toastTimer;
const labelEls=$$('.landmark');
function toast(text){$('.toast').textContent=text;$('.toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').classList.remove('show'),2600);}
function reveal(){if(!entered)valley?.renderer.domElement.focus({preventScroll:true});entered=true;document.body.classList.add('entered');}
function showStop(i){activeStop=i;reveal();valley.goTo(i);const s=STOPS[i];$('.location').hidden=false;$('.location-en').textContent=s.en;$('.location h2').textContent=s.name;$('.location p').textContent=s.description;$$('.destination').forEach((el,j)=>{el.classList.toggle('active',i===j);el.setAttribute('aria-current',i===j?'location':'false');});$('.guide').close();}
function setCinema(value){cinema=value;document.body.classList.toggle('cinema-mode',value);$('.exit-cinema').hidden=!value;$('.settings-panel').hidden=true;}
function formatTime(t){return '00:'+String(Math.floor(t)).padStart(2,'0');}
function startSound(){
  audio=new AudioContext();const master=audio.createGain();master.gain.value=.25;master.connect(audio.destination);
  const buffer=audio.createBuffer(2,audio.sampleRate*8,audio.sampleRate);
  for(let c=0;c<2;c++){const data=buffer.getChannelData(c);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.015;data[i]=last*3.5;}}
  const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;
  const low=audio.createBiquadFilter();low.type='lowpass';low.frequency.value=1050;
  const high=audio.createBiquadFilter();high.type='highpass';high.frequency.value=100;
  source.connect(low);low.connect(high);high.connect(master);source.start();
  const wind=audio.createOscillator();wind.frequency.value=.14;const gain=audio.createGain();gain.gain.value=.09;wind.connect(gain);gain.connect(master.gain);wind.start();
}

try{
  valley=await createValley($('#world'),{
    onProgress(p){$('.load-track i').style.width=p*100+'%';$('.load-number').textContent=String(Math.round(p*100)).padStart(2,'0')+'%';},
    onManual(){reveal();$('.location').hidden=true;},
    onFrame(state){
      playing=state.playing;$('.play').innerHTML=svg(playing?'pause':'play');$('.play').setAttribute('aria-label',playing?'暂停镜头漫游':'播放镜头漫游');
      $('.time').innerHTML=`${formatTime(state.progress*DURATION)} <em>/ 00:48</em>`;
      if(document.activeElement!==$('.timeline input'))$('.timeline input').value=Math.round(state.progress*1000);
      $('.timeline i').style.width=state.progress*100+'%';
      for(const el of labelEls){const data=state.labels[el.dataset.key];el.style.transform=`translate(${data.x}px,${data.y}px)`;el.style.visibility=data.visible?'visible':'hidden';}
      {let idx=0;STOPS.forEach((s,i)=>{if(state.progress>=s.at)idx=i;});$$('.destination').forEach((el,i)=>el.classList.toggle('active',i===idx));}
    },
  });
  window.__valley=valley;valley.portal.ready();
  document.body.classList.add('ready');$('.loading').setAttribute('aria-hidden','true');
  $('.enter').addEventListener('click',()=>{reveal();valley.enter();});
  $('.brand').addEventListener('click',()=>{valley.seek(0);valley.play(false);document.body.classList.remove('entered');$('.location').hidden=true;entered=false;});
  $$('[data-stop]').forEach(el=>el.addEventListener('click',()=>showStop(Number(el.dataset.stop))));
  $('.play').addEventListener('click',()=>{reveal();$('.location').hidden=true;valley.play(!playing);});
  $('.timeline input').addEventListener('input',e=>{reveal();$('.location').hidden=true;valley.seek(Number(e.target.value)/1000);});
  $('.sound').addEventListener('click',async()=>{try{if(!audio)startSound();soundOn=!soundOn;await(soundOn?audio.resume():audio.suspend());$('.sound').innerHTML=svg(soundOn?'sound':'mute');$('.sound').setAttribute('aria-label',soundOn?'关闭自然环境声':'开启自然环境声');$('.sound').setAttribute('aria-pressed',String(soundOn));toast(soundOn?'溪流与微风，已开启':'环境声已关闭');}catch{toast('浏览器暂时无法播放环境声');}});
  $('.cinema').addEventListener('click',()=>setCinema(true));$('.exit-cinema').addEventListener('click',()=>setCinema(false));
  $('.guide-button').addEventListener('click',()=>$('.guide').showModal());$('.close-guide').addEventListener('click',()=>$('.guide').close());$('.guide').addEventListener('click',e=>{if(e.target===$('.guide')){const r=$('.guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('.guide').close();}});
  $('.settings').addEventListener('click',()=>$('.settings-panel').hidden=!$('.settings-panel').hidden);$('.close-settings').addEventListener('click',()=>$('.settings-panel').hidden=true);
  $('#snow-toggle').addEventListener('change',e=>valley.setSnow(e.target.checked));$('#quality-toggle').addEventListener('change',e=>valley.setQuality(e.target.checked));
  $('.location-close').addEventListener('click',()=>$('.location').hidden=true);
  $('.capture-button').addEventListener('click',()=>{const a=document.createElement('a');a.href=valley.capture();a.download='north-valley.png';a.click();toast('已保存这片山谷');});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){setCinema(false);$('.settings-panel').hidden=true;$('.location').hidden=true;return;}
    if(/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)||$('.guide').open)return;
    if(e.code==='Space'){e.preventDefault();reveal();valley.play(!playing);}
    if(e.code==='ArrowRight'){e.preventDefault();showStop((activeStop+1)%STOPS.length);}
    if(e.code==='ArrowLeft'){e.preventDefault();showStop((activeStop+STOPS.length-1)%STOPS.length);}
  });
  window.addEventListener('pagehide',()=>{valley.dispose();audio?.close();});
}catch(error){console.error(error);$('.loading').innerHTML=`${svg('mountain')}<h1>山谷还未展开</h1><p>请使用支持 WebGL 2 的浏览器，并开启硬件加速。</p><button onclick="location.reload()">重新载入</button>`;}
