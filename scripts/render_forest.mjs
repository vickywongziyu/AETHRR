// Offline deterministic WebGL animation export. UI QA is performed in Codex IAB.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {once} from 'node:events';
const root=process.cwd(),output=root+'/outputs/forest';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:832},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto('http://127.0.0.1:5174/?capture=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__forest?.ready,{timeout:60000});
 const stats=await page.evaluate(()=>window.__forest.stats());console.log('SCENE_STATS',JSON.stringify(stats));
 if(errors.length)throw new Error(errors.join('\n'));
 const ffmpeg=execFileSync(root+'/.venv/bin/python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
 const fps=24,seconds=24,frames=fps*seconds;
 const proc=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','png','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',output+'/violet-journey.mp4'],{stdio:['pipe','ignore','pipe']});
 let stderr='';proc.stderr.on('data',d=>stderr+=d);const completion=once(proc,'close');
 for(let frame=0;frame<frames;frame++){
  const t=frame/fps,u=frame/(frames-1),p=u*u*(3-2*u);
  const data=await page.evaluate(({t,p})=>window.__forest.world.capture(t,p),{t,p});
  const bytes=Buffer.from(data.split(',')[1],'base64');
  if([0,192,384,575].includes(frame))await writeFile(output+`/scene-${frame===0?'entrance':frame===192?'path':frame===384?'ruins':'portal'}.png`,bytes);
  if(!proc.stdin.write(bytes))await once(proc.stdin,'drain');
  if(frame%48===0)console.log('FRAME',frame,'/',frames);
 }
 proc.stdin.end();const [code]=await completion;if(code!==0)throw new Error(stderr);
 await writeFile(output+'/render-report.json',JSON.stringify({stats,errors,video:{width:1280,height:832,fps,frames,seconds},renderer:'Three.js WebGL, deterministic original scene frame export'},null,2));
 console.log('VIDEO_READY');
}finally{await browser.close();}
