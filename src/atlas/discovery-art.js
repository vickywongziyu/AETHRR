// Original pen drawings. Shared by the physical parchment and its reading view.
export const REGIONAL_ART={
 aether:{ink:'#466c6b',wax:'#416c72',caption:'风向与浮岛 · 航行手记'},
 highland:{ink:'#794a38',wax:'#873f38',caption:'屋檐与炉火 · 山城来信'},
 forest:{ink:'#64516e',wax:'#654b78',caption:'月相与枝叶 · 林间残页'},
 watercourt:{ink:'#42665b',wax:'#456b60',caption:'百合与涟漪 · 旧月花谱'},
 valley:{ink:'#506877',wax:'#526979',caption:'山脊与雪线 · 北境札记'},
};
export function drawEmblem(ctx,region,x,y,size){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.lineWidth=.025;ctx.lineCap='round';ctx.lineJoin='round';
 const line=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 const arc=(x,y,r,a=0,b=Math.PI*2)=>{ctx.beginPath();ctx.arc(x,y,r,a,b);ctx.stroke();};
 if(region==='aether'){
  arc(0,0,.65);line([[-.88,0],[.88,0]]);line([[0,-.88],[0,.88]]);
  for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);line([[0,-.66],[.15,-.14],[0,0],[-.15,-.14],[0,-.66]]);ctx.restore();}
  arc(0,0,.12);
 }else if(region==='highland'){
  line([[-.7,.25],[-.7,-.3],[0,-.75],[.7,-.3],[.7,.25],[-.7,.25]]);line([[-.88,-.2],[0,-.88],[.88,-.2]]);
  line([[-.17,.25],[-.17,-.18],[.17,-.18],[.17,.25]]);line([[-.9,.5],[-.45,.65],[0,.53],[.45,.65],[.9,.5]]);
  line([[.46,-.53],[.46,-.9],[.62,-.9],[.62,-.4]]);
 }else if(region==='forest'){
  arc(0,-.4,.42,.3,5.9);arc(.21,-.45,.33,1.4,4.9);line([[0,.9],[0,.12]]);
  for(let i=0;i<3;i++){const y=.22+i*.21;line([[0,y],[-.36,y-.14],[-.18,y+.1],[0,y+.14]]);line([[0,y],[.36,y-.14],[.18,y+.1],[0,y+.14]]);}
 }else if(region==='watercourt'){
  for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*Math.PI*2/5);ctx.beginPath();ctx.ellipse(0,-.32,.15,.36,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  arc(0,0,.11);ctx.beginPath();ctx.ellipse(0,.73,.85,.15,0,0,Math.PI*2);ctx.stroke();
 }else{
  line([[-.92,.6],[-.34,-.65],[.03,.01],[.4,-.9],[.94,.6],[-.92,.6]]);
  line([[-.51,-.27],[-.32,-.17],[-.22,-.4]]);line([[.17,-.35],[.35,-.24],[.46,-.48],[.61,-.29]]);
  line([[-.75,.8],[-.3,.69],[.1,.8],[.5,.67],[.8,.79]]);
 }
 ctx.restore();
}
export function makePaperArt(region='highland',tag=false){
 const canvas=document.createElement('canvas');canvas.width=tag?128:768;canvas.height=tag?256:576;
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,art=REGIONAL_ART[region];let seed=173;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle='#d4c29a';c.fillRect(0,0,w,h);
 const wash=c.createRadialGradient(w*.46,h*.4,0,w*.5,h*.5,w*.68);wash.addColorStop(0,'#eadbb8');wash.addColorStop(.7,'#d7c59f');wash.addColorStop(1,'#a88b60');c.fillStyle=wash;c.fillRect(0,0,w,h);
 for(let i=0;i<(tag?900:12500);i++){c.strokeStyle=`rgba(91,64,32,${.015+random()*.065})`;c.lineWidth=.3+random()*.7;const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*7,y+random()*2);c.stroke();}
 c.strokeStyle=art.ink;c.globalAlpha=.65;c.lineWidth=1;c.strokeRect(w*.075,h*.08,w*.85,h*.84);c.strokeRect(w*.09,h*.1,w*.82,h*.8);
 if(tag){drawEmblem(c,region,w*.5,h*.26,w*.27);for(let i=0;i<5;i++){c.beginPath();c.moveTo(w*.25,h*(.49+i*.065));c.lineTo(w*(.65+random()*.13),h*(.49+i*.065));c.stroke();}}
 else{
  drawEmblem(c,region,w*.37,h*.43,h*.24);
  c.globalAlpha=.35;c.setLineDash([4,7]);c.beginPath();c.ellipse(w*.37,h*.43,h*.30,h*.30,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
  c.globalAlpha=.63;c.font='18px "Songti SC",serif';c.textAlign='center';c.fillStyle=art.ink;c.fillText(art.caption,w*.5,h*.80);
  for(let i=0;i<8;i++){c.beginPath();const y=h*(.25+i*.05);for(let j=0;j<18;j++){const x=w*(.67+j*.009);j?c.lineTo(x,y+(random()-.5)*5):c.moveTo(x,y);}c.stroke();}
  for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*.16,h*(.85+i*.01));c.lineTo(w*(.36+random()*.32),h*(.85+i*.01));c.globalAlpha=.16;c.stroke();}
 }
 c.globalAlpha=1;return canvas;
}
