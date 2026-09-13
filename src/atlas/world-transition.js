import './living-world.css';
export function createWorldTransition(){
 const screen=document.createElement('div');screen.className='world-crossing';screen.setAttribute('role','status');screen.setAttribute('aria-live','polite');screen.setAttribute('aria-hidden','true');screen.innerHTML='<svg viewBox="0 0 50 70" fill="none" aria-hidden="true"><path d="M6 65V28Q6 14 25 4Q44 14 44 28V65M12 64V30Q12 20 25 12Q38 20 38 30V64" stroke="currentColor" stroke-width="1.5"/><path d="M25 29l5 10-5 10-5-10z" stroke="currentColor"/></svg><small>BEYOND THE THRESHOLD</small><strong></strong><p>正在穿越传送门</p>';document.body.append(screen);
 let busy=false,disposed=false,controller=null;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const isReduced=()=>reduced.matches||document.body.dataset.reducedTransition==='true';
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const phase=value=>screen.dataset.phase=value;
 const key=e=>{if(!busy)return;if(e.code==='Escape'){controller?.abort();}if(e.code!=='Tab'){e.preventDefault();e.stopImmediatePropagation();}};
 window.addEventListener('keydown',key,true);
 return {get busy(){return busy;},get phase(){return screen.dataset.phase||'idle';},async run(region,action,passage){
  if(busy||disposed)return false;busy=true;controller=new AbortController();const signal=controller.signal;let committed=false;
  screen.style.setProperty('--gate-color',region.color);screen.querySelector('strong').textContent=region.name;
  screen.querySelector('p').textContent='正在穿越传送门 · Esc 取消';screen.setAttribute('aria-hidden','false');
  try{
   phase('approach');if(passage&&!isReduced())await passage.approach(signal);
   if(signal.aborted||disposed)return false;
   phase('cover');screen.classList.add('show');await wait(isReduced()?80:430);
   if(signal.aborted||disposed)return false;
   phase('transfer');const result=await action();committed=result!==false;
   if(!committed)return false;
   screen.querySelector('p').textContent='已抵达';await wait(isReduced()?50:140);
   phase('arrival');screen.classList.remove('show');if(passage&&!isReduced())await passage.arrive(signal);
   return result;
  }finally{
   passage?.finish(committed);screen.classList.remove('show');screen.setAttribute('aria-hidden','true');
   await wait(isReduced()?80:360);phase('idle');controller=null;busy=false;
  }
 },dispose(){disposed=true;controller?.abort();window.removeEventListener('keydown',key,true);screen.remove();}};
}
