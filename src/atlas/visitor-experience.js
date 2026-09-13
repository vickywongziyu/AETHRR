import './visitor-experience.css';

export function createVisitorExperience(world){
 const body=document.body,header=document.querySelector('header nav'),footer=document.querySelector('footer'),intro=document.querySelector('.intro');
 const menu=document.createElement('button');menu.className='visitor-menu';menu.textContent='更多';menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','展开网站导航');header.append(menu);
 const tools=document.createElement('div');tools.className='visitor-tools';tools.innerHTML='<button class="visitor-routes" aria-expanded="false" aria-controls="visitor-route-panel">游览路线</button><button class="visitor-hide" aria-label="隐藏界面，H 键恢复" title="H · 隐藏或显示界面">净览 <kbd>H</kbd></button>';
 if(world.atlas?.discoveries)tools.append(world.atlas.discoveries.button);
 body.append(tools);footer.id='visitor-route-panel';
 function enter(){body.dataset.visitor='exploring';intro.inert=true;world.renderer.domElement.focus({preventScroll:true});}
 function routes(open){body.dataset.visitorRoutes=String(open);footer.inert=!open;tools.firstElementChild.setAttribute('aria-expanded',String(open));}
 function hide(hidden){body.dataset.visitorHidden=String(hidden);tools.querySelector('.visitor-hide').textContent=hidden?'显示界面':'净览 H';tools.querySelector('.visitor-hide').setAttribute('aria-label',hidden?'显示界面':'隐藏界面，H 键恢复');}
 function onKey(e){if(e.code!=='KeyH'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;e.preventDefault();hide(body.dataset.visitorHidden!=='true');}
 menu.onclick=()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'收起网站导航':'展开网站导航');body.dataset.visitorMenu=String(open);};
 tools.firstElementChild.onclick=()=>routes(body.dataset.visitorRoutes!=='true');tools.querySelector('.visitor-hide').onclick=()=>hide(body.dataset.visitorHidden!=='true');
 document.querySelector('#explore').onclick=enter;
 footer.addEventListener('click',e=>{if(e.target.closest('[data-chapter]')){enter();routes(false);}});
 body.dataset.visitor='welcome';routes(false);window.addEventListener('keydown',onKey);
 if(new URLSearchParams(location.search).has('region'))enter();
 return{enter,dispose(){window.removeEventListener('keydown',onKey);menu.remove();tools.remove();}};
}
