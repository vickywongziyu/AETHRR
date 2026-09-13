import * as T from 'three';

// XY is the printed page, +Z its upward depth before the caller's existing
// -PI/2 rotation. Both sides and the complete rim are real, closed surfaces.
export function paperVolume(w,h,top,bottom=()=>0,nx=64,ny=24){
 const positions=[],uv=[],indices=[],row=nx+1,layer=row*(ny+1);
 for(const height of [top,bottom])for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/ny;positions.push((u-.5)*w,(v-.5)*h,height(u,v));uv.push(u,v);
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const a=j*row+i,b=a+row;indices.push(a,a+1,b,a+1,b+1,b);
  indices.push(a+layer,b+layer,a+1+layer,a+1+layer,b+layer,b+1+layer);
 }
 const edge=[];for(let i=0;i<nx;i++)edge.push(i);for(let j=0;j<ny;j++)edge.push(j*row+nx);for(let i=nx;i>0;i--)edge.push(ny*row+i);for(let j=ny;j>0;j--)edge.push(j*row);
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+layer,b,a+layer,b+layer,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export const folioHeight=(u,v)=>.017+.021*Math.sin(Math.PI*Math.abs(2*u-1)*.86)+.0025*Math.sin(v*Math.PI)*Math.sin(u*Math.PI*6)**2;
export function parchmentHeight(u,v){const x=Math.abs(u*2-1),y=Math.abs(v*2-1);return .002+.021*T.MathUtils.smoothstep(x,.84,1)**2*T.MathUtils.smoothstep(y,.35,.9)*(.75+.25*Math.cos(v*5))+.006*T.MathUtils.smoothstep(y,.85,1)**2+.0012*Math.exp(-(((u-.52)/.022)**2));}

function roundedCover(w,h,depth){const r=Math.min(.018,h*.04),s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:false,curveSegments:6});}

export function bindManuscript(parent,title,p,w,h,chart,map){
 const inset=chart?0:Math.min(.032,h*.06),pw=w-inset*2,ph=h-inset*2;
 const geometry=chart?paperVolume(w,h,parchmentHeight,(u,v)=>parchmentHeight(u,v)-.002):paperVolume(pw,ph,folioHeight,()=>.0155);
 const printed=new T.MeshStandardMaterial({map,roughness:.94});
 const root=new T.Mesh(geometry,printed);root.name=title;root.position.fromArray(p);root.rotation.x=-Math.PI/2;root.userData.manuscriptConstruction=chart?'curled-parchment-v33':'bound-folio-v33';root.userData.dimensions=[w,h];root.userData.noCollision=true;
 if(!chart){
  const leather=new T.MeshStandardMaterial({color:'#68483d',roughness:.91}),edge=new T.MeshStandardMaterial({color:'#bda574',roughness:.93}),thread=new T.MeshStandardMaterial({color:'#7c6648',roughness:1}),ribbon=new T.MeshStandardMaterial({color:'#536b78',roughness:.95});
  const add=(g,m,name)=>{const mesh=new T.Mesh(g,m);mesh.name=title+' · '+name;mesh.userData.noCollision=true;root.add(mesh);return mesh;};
  add(roundedCover(w,h,.008),leather,'皮革书封');
  // Three signatures under the printed leaf expose layered fore-edges.
  for(let i=0;i<3;i++){
   const z=.009+i*.0021,g=paperVolume(pw-.004*i,ph-.003*i,()=>z+.0017,()=>z,8,4);
   add(g,i===1?thread:edge,'书页分帖 '+(i+1));
  }
  // Shallow binding cords are underneath the paper block, not crossing print.
  for(const y of [-.32,0,.32]){const cord=add(new T.CylinderGeometry(.004,.004,h*.045,8),thread,'书脊缝线');cord.position.set(0,h*y,.0085);}
  for(const sx of [-1,1])for(const sy of [-1,1]){
   const corner=add(new T.BoxGeometry(w*.055,.007,.003),edge,'书角包边');corner.position.set(sx*(w*.5-w*.038),sy*(h*.5-.008),.0095);
  }
  const rw=Math.min(.022,w*.035),x=pw*.032,top=(u,v)=>folioHeight((x+(u-.5)*rw)/pw+.5,.01+v*.93)+.0016;
  const bookmark=add(paperVolume(rw,ph*.93,top,(u,v)=>top(u,v)-.0007,4,28),ribbon,'织带书签');bookmark.position.set(x,-.025*ph,0);

 }
 parent.add(root);return root;
}

// Printed-object parents keep their public material.map API (the star journal
// repaints that same canvas after observation). All added materials are owned.
export function disposePrintedMaterials(root){const mats=new Set(),maps=new Set();root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m);});for(const m of mats){if(m.map)maps.add(m.map);m.dispose();}for(const map of maps)map.dispose();}

export function paintFolioBase(ctx){
 ctx.fillStyle='#ccb889';ctx.fillRect(0,0,1200,768);
 for(const left of [30,620]){ctx.strokeStyle='#927e58';ctx.lineWidth=2;ctx.strokeRect(left,32,550,702);ctx.strokeRect(left+9,41,532,684);}
}

export function paintBookPage(ctx,title){
 paintFolioBase(ctx);
 ctx.fillStyle='#493f32';ctx.textAlign='center';ctx.font='38px serif';ctx.fillText(title,305,118,485);
 ctx.font='25px serif';ctx.fillStyle='#796447';ctx.fillText('馆藏手稿 · 卷一',305,170);
 ctx.strokeStyle='#9c774d';ctx.lineWidth=2;
 for(let i=0;i<10;i++){const y=235+i*39;ctx.beginPath();ctx.moveTo(85,y);ctx.lineTo(525-(i%3)*45,y);ctx.stroke();}
 ctx.font='30px serif';ctx.fillStyle='#493f32';ctx.fillText(title.includes('标本')?'叶脉与采集记录':title.includes('交货')?'交付记录':'旅途札记',895,120);
 // Illustrations follow the existing room's purpose; ledger fields stay blank.
 if(title.includes('标本')){
  ctx.strokeStyle='#65705a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(890,490);ctx.bezierCurveTo(865,390,930,260,882,220);ctx.stroke();
  for(let j=0;j<4;j++)for(const side of [-1,1]){const y=460-j*56,x=894+Math.sin(j)*5,tx=x+side*(112-j*7),ty=y-66;ctx.fillStyle='rgba(111,125,88,.15)';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+side*20,y-67,tx,ty);ctx.quadraticCurveTo(x+side*92,y+10,x,y);ctx.fill();ctx.stroke();ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();for(let k=1;k<4;k++){const t=k/4,px=x+(tx-x)*t,py=y+(ty-y)*t;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-side*14,py-16);ctx.stroke();}ctx.lineWidth=4;}

 }else if(title.includes('交货')){
  ctx.strokeStyle='#8b7754';ctx.lineWidth=2;for(const x of [680,865,1000,1120]){ctx.beginPath();ctx.moveTo(x,210);ctx.lineTo(x,494);ctx.stroke();}for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(680,210+i*47);ctx.lineTo(1120,210+i*47);ctx.stroke();}ctx.font='25px serif';for(const [x,t]of [[770,'原料'],[930,'交付'],[1060,'签记']])ctx.fillText(t,x,194);
 }else{
  ctx.strokeStyle='#637b76';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(710,426);ctx.bezierCurveTo(810,500,1000,500,1090,415);ctx.bezierCurveTo(980,437,820,430,710,426);ctx.stroke();ctx.beginPath();ctx.moveTo(890,443);ctx.lineTo(890,220);ctx.lineTo(740,398);ctx.quadraticCurveTo(800,370,876,404);ctx.stroke();ctx.beginPath();ctx.moveTo(900,243);ctx.quadraticCurveTo(1010,300,1040,402);ctx.quadraticCurveTo(960,378,905,398);ctx.stroke();
 }
 ctx.strokeStyle='#8b7754';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(690,550+i*35);ctx.lineTo(1110-(i%2)*70,550+i*35);ctx.stroke();}
 ctx.font='24px serif';ctx.fillStyle='#806b4a';ctx.fillText('I',305,701);ctx.fillText('II',895,701);
}
