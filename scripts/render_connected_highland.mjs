// Deterministic media render. Interactive QA uses Codex IAB.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {once} from 'node:events';
const root=process.cwd(),out=root+'/outputs/highland',port=process.env.AETHER_PORT||'5176';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:832},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${port}/aether.html?capture=1`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__aether?.ready,{timeout:60000});
 const stats=await page.evaluate(()=>window.__aether.stats());console.log('STATS',JSON.stringify(stats));
 if(!stats.highlandLoaded||stats.chapters!==10||!stats.floatingIslands||stats.waterfalls!==5||errors.length)throw Error(JSON.stringify({stats,errors}));
 const ffmpeg=execFileSync(root+'/.venv/bin/python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
 const fps=24,seconds=40,frames=fps*seconds;
 const encoder=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','png','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',out+'/connected-journey.mp4'],{stdio:['pipe','ignore','pipe']});
 let log='';encoder.stderr.on('data',d=>log+=d);const done=once(encoder,'close');
 for(let frame=0;frame<frames;frame++){
  const t=frame/fps,p=frame/(frames-1);
  const uri=await page.evaluate(({t,p})=>window.__aether.world.capture(t,p),{t,p});const bytes=Buffer.from(uri.split(',')[1],'base64');
  if(frame%96===0)await writeFile(out+`/scene-${String(frame/96+1).padStart(2,'0')}.png`,bytes);
  if(!encoder.stdin.write(bytes))await once(encoder.stdin,'drain');
  if(frame%48===0)console.log('FRAME',frame,'/',frames);
 }
 encoder.stdin.end();const [code]=await done;if(code)throw Error(log);
 await writeFile(out+'/video-report.json',JSON.stringify({stats,errors,video:{width:1280,height:832,fps,frames,seconds,audio:false},renderer:'Three.js WebGL, Blender-exported geometry, deterministic camera and environment animation'},null,2));
 console.log('VIDEO_READY');
}finally{await browser.close();}
