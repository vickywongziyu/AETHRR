import {createHearthFire} from './hearth-fire.js';
import * as T from 'three';
import {Craft} from './architecture-kit.js';
import {drawEmblem} from './discovery-art.js';

// All props are attached in building coordinates, including moving islands.
// Shared architectural materials are borrowed and never disposed here.
function shop(mats,name){const root=new T.Group();root.name=name;const textures=[],materials=[];
 const craft=label=>new Craft(mats,label||name),finish=(c,p=[0,0,0],yaw=0,parent=root)=>{const r=c.finish(parent,p,yaw);r.traverse(o=>o.userData.noCollision=true);return r;};
 const mesh=(g,m,p=[0,0,0],parent=root)=>{const o=new T.Mesh(g,m);o.position.fromArray(p);o.castShadow=true;o.receiveShadow=true;o.userData.noCollision=true;parent.add(o);return o;};
 function plaque(text,region,w=1.05,h=.24,p=[0,1.63,-.4]){const can=document.createElement('canvas');can.width=1024;can.height=256;const ctx=can.getContext('2d');ctx.fillStyle='#322b21';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#a18a55';ctx.lineWidth=4;ctx.strokeRect(14,14,996,228);drawEmblem(ctx,region,102,128,70);ctx.fillStyle='#d9c596';ctx.font='56px "Songti SC", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,590,132,760);const tex=new T.CanvasTexture(can);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;textures.push(tex);const mat=new T.MeshStandardMaterial({map:tex,roughness:.89});materials.push(mat);mesh(new T.BoxGeometry(w+.05,h+.05,.055),mats.wood,p);return mesh(new T.PlaneGeometry(w,h),mat,[p[0],p[1],p[2]+.03]);}
 return{root,craft,finish,mesh,plaque,dispose(){root.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}};
}
function vessel(c,p,r=.12,h=.35,kind='pale'){
 const profile=[[0,0],[r*.6,0],[r,.07*h],[r,h*.45],[r*.75,h*.72],[r*.40,h*.8],[r*.40,h],[r*.29,h],[r*.29,h*.82],[r*.65,h*.70],[r*.84,h*.45],[r*.84,h*.14],[0,h*.14]];
 c.add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),32),kind,p);c.ring([p[0],p[1]+h,p[2]],r*.35,.009,'trim');
}
function souvenir(c,kind){
 if(kind==='astral'){c.cylinder([0,.035,0],.21,.07,'wood',.23);c.cylinder([0,.08,0],.19,.035,'trim');c.ring([0,.105,0],.16,.008,'iron');for(let k=0;k<8;k++){const a=k*Math.PI/4;c.tube([Math.sin(a)*.12,.113,Math.cos(a)*.12],[Math.sin(a)*.15,.113,Math.cos(a)*.15],.008,'trim');}c.tube([-.12,.126,.1],[.12,.126,-.1],.012,'azure');c.crystal([0,.12,0],.11,.035);}
 if(kind==='smith'){c.lamp([0,0,0],.63);const pts=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;pts.push([Math.cos(a)*.16,.51+Math.sin(a)*.16,0]);}c.line(pts,.014,'iron');}
 if(kind==='herbal'){vessel(c,[0,0,0],.15,.43,'amethyst');c.cylinder([0,.435,0],.064,.06,'wood');c.line([[-.10,.28,.13],[.09,.30,.13],[.09,.18,.135]],.008,'trim');}
 if(kind==='ceramic'){vessel(c,[0,0,0],.19,.48);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;c.line([[0,.48,0],[Math.sin(a)*.07,.64,Math.cos(a)*.07],[Math.sin(a)*.16,.69,Math.cos(a)*.16]],.009,'trim');c.sphere([Math.sin(a)*.16,.7,Math.cos(a)*.16],[.035,.10,.03],'paper');}}
 if(kind==='carving'){c.cylinder([0,.04,0],.25,.08,'wood',.23);for(const [x,y,z,h]of [[-.12,.09,.02,.3],[.03,.08,-.035,.47],[.16,.07,.04,.23]]){c.add(new T.ConeGeometry(h*.45,h,5),'endgrain',[x,y+h*.5,z]);c.add(new T.ConeGeometry(h*.21,h*.40,5),'paper',[x,y+h*.8+.002,z]);}}
}
export function makeTrade(mats,trade){
 const s=shop(mats,trade.name),c=s.craft();
 for(const x of [-.72,.72])for(const z of [-.29,.29]){c.box([x,.45,z],[.105,.9,.105]);for(const y of [.13,.69])c.box([x,y,z],[.12,.06,.12],'iron');}
 for(let j=0;j<5;j++)c.box([0,.92,(j-2)*.145],[1.72,.12,.135]);c.box([0,.30,-.25],[1.48,.08,.07]);c.box([0,.77,.315],[1.56,.14,.05]);
 for(const x of [-.69,.69]){c.box([x,1.27,-.39],[.075,.73,.07]);c.box([x,1.58,-.37],[.105,.10,.105],'iron');}c.box([0,1.43,-.37],[1.46,.08,.32]);
 for(let j=0;j<3;j++){c.box([-.42+j*.39,.81,.366],[.34,.13,.04]);c.ring([-.42+j*.39,.81,.398],.035,.008,'iron');}
 c.lamp([.61,1.47,-.38],.25);s.finish(c);s.plaque(trade.name,trade.id,1.06,.25,[0,1.72,-.4]);
 const tools=s.craft(trade.name+' · 工具');
 if(trade.kind==='astral'){
  tools.cylinder([-.28,1.06,0],.22,.13,'darkstone',.25);for(let k=0;k<3;k++)tools.add(new T.TorusGeometry(.29-k*.035,.013,8,48),'trim',[-.28,1.39,0],[k*Math.PI/3,.3,k*.75]);tools.sphere([-.28,1.39,0],[.085,.085,.085],'azure');tools.box([.39,1.0,.04],[.39,.04,.39],'paper');for(let k=0;k<9;k++)tools.sphere([.27+(k%3)*.1,1.029,-.05+Math.floor(k/3)*.09],[.009,.003,.009],'trim');
 }else if(trade.kind==='smith'){
  tools.cylinder([-.35,1.04,0],.20,.12,'wood');tools.box([-.35,1.16,0],[.25,.17,.2],'iron');tools.box([-.35,1.27,0],[.52,.10,.23],'iron');tools.add(new T.ConeGeometry(.09,.25,8),'iron',[-.70,1.27,0],[0,0,Math.PI/2]);tools.tube([.22,.994,-.1],[.44,.994,.21],.026,'wood');tools.box([.19,1.04,-.13],[.20,.09,.10],'iron',[0,-.6,0]);for(let j=0;j<5;j++)tools.box([.10+j*.085,1.49,-.38],[.06,.08,.12],'trim');
 }else if(trade.kind==='herbal'){
  tools.add(new T.LatheGeometry([[.05,0],[.18,.03],[.23,.17],[.21,.22],[.17,.21],[.13,.09],[0,.08]].map(p=>new T.Vector2(...p)),32),'stone',[-.29,.986,.05]);tools.tube([-.29,1.05,.05],[-.14,1.36,-.06],.035,'endgrain',.05);for(let j=0;j<4;j++)vessel(tools,[-.43+j*.24,1.49,-.36],.07,.15+(j%2)*.08,j%2?'amethyst':'azure');for(let j=0;j<6;j++){const x=.18+j*.045;tools.tube([x,1,.1],[x+.05,1.01,-.14],.005,'wood');tools.sphere([x+.045,1.015,-.08],[.025,.007,.06],'cloth');}
 }else if(trade.kind==='ceramic'){
  tools.cylinder([-.30,1.01,.05],.29,.07,'iron');tools.cylinder([-.30,1.06,.05],.26,.04,'wood');vessel(tools,[-.30,1.08,.05],.18,.30,'leather');for(let j=0;j<3;j++)vessel(tools,[-.37+j*.26,1.49,-.35],.085,.14+(j%2)*.08);tools.tube([.30,1,-.14],[.45,1,.20],.015,'wood');
 }else{
  tools.box([-.31,1.03,0],[.50,.09,.36],'endgrain');tools.add(new T.ConeGeometry(.15,.30,5),'wood',[-.32,1.22,0]);tools.box([.22,1.03,.0],[.17,.07,.33],'wood',[0,.35,0]);tools.box([.22,1.09,.0],[.12,.09,.055],'iron',[.3,.35,0]);for(let j=0;j<4;j++){tools.tube([-.4+j*.18,1.49,-.36],[-.4+j*.18,1.7,-.36],.016,'wood');tools.box([-.4+j*.18,1.49,-.35],[.022,.07,.014],'iron');}for(let j=0;j<6;j++)tools.line([[.1+j*.075,1.01,.2],[.12+j*.075,1.04,.15],[.15+j*.075,1.01,.16]],.008,'endgrain');
 }
 s.finish(tools);const tray=s.craft();tray.cylinder([0,.025,0],.27,.05,'darkstone',.28);tray.ring([0,.057,0],.255,.009,'trim');s.finish(tray,[.39,.99,.07]);const gift=s.craft(trade.craft);souvenir(gift,trade.kind);const display=s.finish(gift,[.39,1.055,.07]);display.scale.setScalar(.65);display.visible=false;
 let start=-Infinity;return{...s,display,anchor:new T.Vector3(-.22,1.10,.1),setDisplay(on){display.visible=on;},pulse(){start=performance.now();},update(now,reduced){if(display.visible)display.rotation.y=reduced?0:Math.max(0,1-(now-start)/1800)*Math.sin((now-start)*.008)*.18;}};
}
export function makeHearth(mats){
 const s=shop(mats,'山风旅舍 · 拱炉'),c=s.craft();c.box([0,.10,0],[2.25,.20,1.04],'darkstone');c.box([0,1.02,-.43],[1.94,1.86,.22],'darkstone');
 for(const side of [-1,1])for(let row=0;row<5;row++)c.box([side*.79,.26+row*.23,-.08],[.38,.21,.70],row%2?'stone':'darkstone');
 for(let k=0;k<11;k++){const a=k/10*Math.PI;c.box([Math.cos(a)*.64,1.22+Math.sin(a)*.58,-.05],[.24,.27,.68],k%2?'stone':'pale',[0,0,a-Math.PI/2]);}
 c.box([0,1.99,-.1],[2.13,.15,.94],'wood');c.box([0,2.24,-.20],[1.48,.35,.65],'stone');c.box([0,2.75,-.25],[.98,.75,.55],'darkstone');
 for(let k=0;k<4;k++)c.tube([-.38,.30+k*.035,-.22+k*.13],[.40,.32+k*.025,.10-k*.09],.09,'wood');
 for(const x of [-.5,.5]){c.tube([x,.23,.25],[x,.56,.25],.024,'iron');c.sphere([x,.57,.25],[.04,.04,.04],'iron');}c.tube([-.55,.30,.25],[.55,.30,.25],.025,'iron');
 vessel(c,[-.65,2.08,-.13],.13,.22,'trim');c.lamp([.65,2.08,-.13],.38);s.finish(c);s.plaque('山风旅舍','highland',1.15,.29,[0,2.55,.045]);
 const hearth=createHearthFire(s.root,[0,.26,-.04],{power:4,range:12});
 return{...s,hearth,anchor:new T.Vector3(0,.87,.1),setLit:hearth.setLit,update:hearth.update,dispose(){hearth.dispose();s.dispose();}};
}
export function makeInnInterior(mats){
 const s=shop(mats,'山风旅舍 · 梁架与生活陈设'),c=s.craft();
 // Posts and braces sit against the actual cabin shell; the doorway stays open.
 for(const x of [-4.15,4.15])for(const z of [-5.9,-1.8,2.5,5.9]){c.box([x,2.4,z],[.24,4.8,.25]);c.tube([x,3.75,z],[x-Math.sign(x)*.65,4.74,z],.09);for(const y of [.38,3.5])c.box([x,y,z],[.265,.10,.28],'iron');}
 for(const z of [-5.9,-1.8,2.5,5.9])c.box([0,4.78,z],[8.5,.26,.28]);for(const x of [-4.15,4.15])c.box([x,3.85,0],[.12,.19,12.2]);
 // A chandelier hangs from a real central chain, with individual wax candles.
 for(let j=0;j<13;j++)c.add(new T.TorusGeometry(.043,.009,5,12),'iron',[0,4.72-j*.065,-.6],[0,j%2*Math.PI/2,0]);
 c.ring([0,3.86,-.6],.68,.035,'iron');for(let j=0;j<8;j++){const a=j*Math.PI/4,x=Math.cos(a)*.68,z=-.6+Math.sin(a)*.68;c.tube([0,4.20,-.6],[x,3.86,z],.018,'iron');c.cylinder([x,3.89,z],.10,.035,'trim');c.cylinder([x,4.0,z],.048,.18,'paper');c.sphere([x,4.12,z],[.018,.044,.018],'glass');}
 // Small items are aligned with the original dining table and shelf surfaces.
 for(const [x,z]of [[1.91,-2.38],[2.4,-2.78]]){c.cylinder([x,.91,z],.13,.025,'pale');vessel(c,[x,.93,z],.063,.095,'trim');}
 c.box([2.16,.915,-2.56],[.28,.025,.19],'wood',[0,.15,0]);c.sphere([2.13,.966,-2.56],[.12,.055,.076],'leather');for(let j=0;j<3;j++)c.line([[2.07+j*.045,1.01,-2.59],[2.10+j*.045,1.014,-2.54]],.005,'paper');
 for(const x of [-1.35,1.35]){c.box([x,.26,-5.3],[.64,.49,.5]);for(const z of [-5.53,-5.07])for(const y of [.08,.43])c.box([x,y,z],[.69,.075,.035],'iron');c.box([x,.51,-5.3],[.7,.055,.54]);c.ring([x,.30,-5.03],.075,.012,'iron');}
 // Woven hangings use a curved surface with a fixed wooden suspension rod.
 for(const side of [-1,1]){const x=side*4.03,z=-3.7;c.tube([x,3.34,z-.61],[x,3.34,z+.61],.042);const g=new T.PlaneGeometry(1.12,1.68,24,32),p=g.attributes.position;for(let j=0;j<p.count;j++){const u=p.getX(j),v=p.getY(j),d=(.84-v)/1.68;p.setXYZ(j,x-side*(.03+Math.sin(u*20)*.035*d),2.42+v,z+u);}
  if(side<0){const idx=g.index;for(let j=0;j<idx.count;j+=3){const a=idx.getX(j+1);idx.setX(j+1,idx.getX(j+2));idx.setX(j+2,a);}}g.computeVertexNormals();c.add(g,'red');for(let j=0;j<11;j++){const zz=z+(j-5)*.1;c.tube([x-side*.05,1.58,zz],[x-side*.05,1.43+(j%2)*.03,zz],.009,'trim');}
 }
 c.tube([1.35,.54,-5.34],[1.35,1.76,-5.34],.02,'iron');s.finish(c);const award=s.craft('五境匠心 · 纪念纹章');award.cylinder([0,0,0],.25,.045,'trim');for(let j=0;j<5;j++){const a=j*Math.PI*2/5;award.crystal([Math.sin(a)*.17,.023,Math.cos(a)*.17],.11,.035,j%2?'azure':'amethyst');}const medal=s.finish(award,[1.35,1.76,-5.34]);medal.rotation.x=Math.PI/2;medal.visible=false;
 return{...s,setAward(on){medal.visible=on;}};
}
export function makeFishing(mats){
 const s=shop(mats,'晨露水岸 · 钓具'),c=s.craft();
 // Small two-post tackle rack; the line ends over the existing lake surface.
 for(const x of [-.55,.55]){c.tube([x,0,0],[x,1.12,0],.045);c.cylinder([x,.055,0],.12,.11,'stone');}c.tube([-.62,.88,0],[.62,.88,0],.04);
 c.bench([0,.0,.48],.95,'wood',false);c.barrel([-.70,0,.48],.23,.45);s.finish(c);s.plaque('晨露垂钓','watercourt',.65,.20,[0,1.13,.01]);
 const rod=s.craft();rod.line([[.40,.35,.1],[.42,1.05,-.15],[.43,1.8,-.80],[.45,2.15,-1.55]],.018,'wood');rod.ring([.40,.68,.02],.06,.016,'iron');const pole=s.finish(rod);const float=s.craft();float.sphere([0,0,0],[.045,.082,.045],'red');float.tube([0,-.07,0],[0,.13,0],.009,'paper');const bob=s.finish(float,[.45,-.3,-3.2]);
 const lineGeom=new T.BufferGeometry().setFromPoints([new T.Vector3(.45,2.15,-1.55),new T.Vector3(.45,-.3,-3.2)]),lineMat=new T.LineBasicMaterial({color:'#c6cfb7',transparent:true,opacity:.6});const line=new T.Line(lineGeom,lineMat);line.userData.noCollision=true;s.root.add(line);
 const rippleMat=new T.MeshBasicMaterial({color:'#e2e7bd',transparent:true,opacity:.0,depthWrite:false});const ripple=s.mesh(new T.TorusGeometry(.2,.008,4,40),rippleMat,[.45,-.3,-3.2]);ripple.rotation.x=Math.PI/2;ripple.castShadow=false;let active=false,waterY=-.3;
 return{...s,anchor:new T.Vector3(0,1.13,.04),bob,setWaterLevel(y){waterY=y;},setActive(v){active=v;bob.visible=line.visible=ripple.visible=v;},update(now,reduced,bite){pole.rotation.x=active&&!reduced?Math.sin(now*.002)*.006:0;bob.position.y=waterY+(bite?-.045:0)+(reduced?0:Math.sin(now*(bite?.025:.003))*(bite?.08:.025));const p=lineGeom.attributes.position;p.setY(1,bob.position.y);p.needsUpdate=true;ripple.position.y=waterY+.012;const t=(now%1500)/1500;ripple.scale.setScalar(bite?(1+t*2):1);rippleMat.opacity=active?(bite?.8*(1-t):.15):0;},dispose(){lineMat.dispose();rippleMat.dispose();s.dispose();}};
}
