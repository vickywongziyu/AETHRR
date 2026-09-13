/** Deterministic 30-second 1280x720 H.264 camera film from the actual WebGL scene. */
import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs';import {once} from 'node:events';
const chrome=process.env.CHROME_PATH||'/Users/ziyu/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ffmpeg=process.env.FFMPEG_PATH||'/Users/ziyu/.cache/uv/archive-v0/dy4jp6cB-IDX4u1X/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5175/dist-watercourt/lake.html?capture');await page.waitForFunction(()=>window.__watercourt?.ready,null,{timeout:120000});
const film=spawn(ffmpeg,['-y','-f','image2pipe','-framerate','24','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','outputs/watercourt/watercourt-tour.mp4'],{stdio:['pipe','ignore','pipe']});let stderr='';film.stderr.on('data',d=>stderr+=d);film.stdin.on('error',()=>{});
for(let i=0;i<720;i++){
 const t=i/24,p=.5-.5*Math.cos(t/30*Math.PI*2);const data=await page.evaluate(([t,p])=>window.__watercourt.world.capture(t,p),[t,p]);const buf=Buffer.from(data.split(',')[1],'base64');if(!film.stdin.write(buf))await once(film.stdin,'drain');
 if(i===0)fs.writeFileSync('outputs/watercourt/scene-preview.png',buf);
 if(i%120===0)console.log(`Rendered ${i}/720 frames`);
}
film.stdin.end();const [code]=await once(film,'close');await browser.close();if(code!==0)throw Error(stderr.slice(-1500));if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync('outputs/watercourt/video-manifest.json',JSON.stringify({width:1280,height:720,fps:24,frames:720,durationSeconds:30,format:'H.264 MP4',source:'Real WebGL render of watercourt.glb',errors},null,2));console.log('VIDEO_READY');
