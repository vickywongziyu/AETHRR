// Inspection renders from the shipped WebGL geometry; no camera navigation changes in the app.
import {chromium} from 'playwright';import {readFile,writeFile} from 'node:fs/promises';
const records=JSON.parse(await readFile('outputs/highland/model-report.json','utf8')).buildings;
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=metal']});
try{const p=await b.newPage({viewport:{width:960,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5177/aether.html?capture=1');await p.waitForFunction(()=>window.__aether?.ready,{timeout:60000});
 for(let i=0;i<records.length;i++){
  const r={...records[i],inspectionDistance:records[i].kind==='tent'?3:i===3?7:10,inspectionFov:records[i].kind==='tent'?90:i===3?72:60};const uri=await p.evaluate(({r})=>{
   const w=window.__aether.world;w.capture(0,.7);const c=w.camera,h=r.h;
   c.position.set(-r.x,r.z+h*.65,150+r.y-r.d*.5-r.inspectionDistance);w.controls.target.set(-r.x,r.z+h*.50,150+r.y);c.fov=r.inspectionFov;c.updateProjectionMatrix();c.lookAt(w.controls.target);w.renderer.render(w.scene,c);return w.renderer.domElement.toDataURL();
  },{r});await writeFile(`outputs/highland/structure-${String(i+1).padStart(2,'0')}.png`,Buffer.from(uri.split(',')[1],'base64'));
 }
 for(const [index,label] of [[0,'house'],[8,'tent']]){
  const uri=await p.evaluate(({r})=>{const w=window.__aether.world;w.capture(0,.7);const c=w.camera;c.position.set(-r.x,r.z+1.65,150+r.y-(r.d/2)*.65);w.controls.target.set(-r.x+.7,r.z+1.5,150+r.y+2);c.fov=76;c.updateProjectionMatrix();c.lookAt(w.controls.target);w.renderer.render(w.scene,c);return w.renderer.domElement.toDataURL()},{r:records[index]});await writeFile(`outputs/highland/interior-${label}.png`,Buffer.from(uri.split(',')[1],'base64'));
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('INSPECTION RENDERS: 11 exteriors, 2 interiors, no runtime errors');
}finally{await b.close()}
