export function createLoadingView(element){
 const bar=element.querySelector('.progress'),fill=bar.querySelector('i'),label=element.querySelector('p'),detail=element.querySelector('small');
 const elapsed=document.createElement('span');elapsed.className='loading-elapsed';element.append(elapsed);
 const actions=document.createElement('div');actions.className='loading-actions';actions.innerHTML='<button type="button" hidden>重新载入</button><a href="./home.html">返回五城首页</a>';element.append(actions);actions.querySelector('button').onclick=()=>location.reload();
 bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','世界准备进度');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
 const started=performance.now();let changed=started,progress=0,previous='',finished=false;
 const timer=setInterval(()=>{const seconds=Math.floor((performance.now()-started)/1000),slow=performance.now()-changed>15000;elapsed.textContent=`已等待 ${seconds} 秒${slow?' · 当前阶段耗时较长，可继续等待或重试':''}`;actions.querySelector('button').hidden=!slow;},1000);
 function update(value,text,extra=''){
  if(finished)return;const key=text+extra;if(key!==previous){changed=performance.now();previous=key;}
  progress=Math.max(progress,Math.min(99,Math.round(value*100)));fill.style.width=progress+'%';bar.setAttribute('aria-valuenow',String(progress));label.textContent=text;detail.textContent=progress+'%'+(extra?' · '+extra:'');element.dataset.stage=text;
 }
 return{update,done(){finished=true;clearInterval(timer);fill.style.width='100%';bar.setAttribute('aria-valuenow','100');detail.textContent='准备完成';element.classList.add('done');setTimeout(()=>element.remove(),300);},fail(error){finished=true;clearInterval(timer);element.dataset.failed='true';element.querySelector('h2').textContent='这次载入没有完成';label.textContent=error?.message||'请稍后重新载入';detail.textContent='已下载的资源可由浏览器缓存复用';elapsed.textContent='';actions.querySelector('button').hidden=false;}};
}
