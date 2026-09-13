import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'outputs/valley');await fs.mkdir(out,{recursive:true});
const mode=process.argv[2]??'model';
const executablePath=process.env.CHROMIUM_PATH||'/Users/ziyu/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
page.on('pageerror',e=>console.error(e));
await page.goto(process.env.VALLEY_URL||'http://127.0.0.1:5173/valley.html');
await page.waitForFunction(()=>window.__valley,{timeout:90000});await page.waitForTimeout(1200);
if(mode==='model'){
  const base64=await page.evaluate(async()=>{
    window.__valley.seek(0);window.__valley.play(false);
    const data=await window.__valley.exportGLB();
    return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob([data]));});
  });
  await fs.writeFile(path.join(out,'north-valley.glb'),Buffer.from(base64,'base64'));
  console.log('MODEL_SAVED',Math.round(Buffer.byteLength(base64,'base64')/1024/1024)+' MB');
}else if(mode==='video'){
  const ffmpeg=process.env.FFMPEG_PATH;if(!ffmpeg)throw new Error('Set FFMPEG_PATH to the local ffmpeg executable');
  const encoder=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','mjpeg','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-crf','19','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'north-valley-48s.mp4')],{stdio:['pipe','ignore','pipe']});
  let error='';encoder.stderr.on('data',d=>{error+=d.toString();if(error.length>6000)error=error.slice(-6000);});
  const ended=new Promise((resolve,reject)=>{encoder.on('close',code=>code===0?resolve():reject(new Error(error)));encoder.on('error',reject);});
  await page.evaluate(()=>{document.body.classList.add('cinema-mode');window.__valley.play(false);});
  for(let f=0;f<48*24;f++){
    const data=await page.evaluate(({p,t})=>{window.__valley.seek(p);window.__valley.setTime(t);return window.__valley.renderer.domElement.toDataURL('image/jpeg',.94).split(',')[1];},{p:f/(48*24),t:f/24});
    const buffer=Buffer.from(data,'base64');if(!encoder.stdin.write(buffer))await new Promise(r=>encoder.stdin.once('drain',r));
    if(f%120===0)console.log('VIDEO_FRAME',f,'/ 1152');
  }
  encoder.stdin.end();await ended;console.log('VIDEO_SAVED');
}else if(mode==='stills'){
  await page.setViewportSize({width:1536,height:1024});await page.waitForTimeout(600);
  await page.screenshot({path:path.join(out,'north-valley-website.png')});
  await page.evaluate(()=>{document.body.classList.add('cinema-mode');window.__valley.seek(0);});await page.waitForTimeout(700);
  await page.screenshot({path:path.join(out,'north-valley-scene.png')});
}
await browser.close();
