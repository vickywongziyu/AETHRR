import {bindManuscript,paintBookPage} from './manuscript-craft.js';
export {disposePrintedMaterials} from './manuscript-craft.js';
import {refinedChair} from './furniture-craft.js';
import * as T from 'three';
import {Craft} from './architecture-kit.js';
export function plaque(parent,text,p,width=2.6,height=.58){const cn=document.createElement('canvas');cn.width=1024;cn.height=256;const ctx=cn.getContext('2d');ctx.fillStyle='#263d41';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#c6b482';ctx.lineWidth=8;ctx.strokeRect(15,15,994,226);ctx.fillStyle='#f0dfb9';ctx.font='600 92px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,134,920);const map=new T.CanvasTexture(cn);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map,roughness:.78}));mesh.position.fromArray(p);mesh.userData.noCollision=true;parent.add(mesh);return mesh;}
export function manuscript(parent,title,p,w,h,chart=false){const cn=document.createElement('canvas');cn.width=1200;cn.height=768;const ctx=cn.getContext('2d');ctx.fillStyle='#ccb889';ctx.fillRect(0,0,1200,768);ctx.strokeStyle='#806d4c';ctx.lineWidth=4;ctx.strokeRect(30,30,1140,708);ctx.fillStyle='#493f32';ctx.font='46px serif';ctx.textAlign='center';ctx.fillText(title,600,95);if(chart){ctx.strokeStyle='#587f79';ctx.lineWidth=5;ctx.setLineDash([4,13]);ctx.beginPath();ctx.moveTo(180,170);ctx.bezierCurveTo(270,320,410,270,430,460);ctx.bezierCurveTo(590,630,850,310,1010,230);ctx.stroke();ctx.setLineDash([]);for(const [x,y,label,color] of [[215,245,'云上花园','#657765'],[350,170,'角冠山城','#88765d'],[760,330,'紫境','#877386'],[235,520,'精灵水庭','#598583'],[1000,220,'北境河谷','#808e89']]){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-56,y-20);ctx.bezierCurveTo(x-75,y-85,x+46,y-60,x+58,y-12);ctx.bezierCurveTo(x+90,y+37,x-36,y+43,x-56,y-20);ctx.fill();ctx.fillStyle='#433d31';ctx.font='28px serif';ctx.fillText(label,x,y+75);}ctx.strokeStyle='#806d4c';ctx.lineWidth=2;for(let a=0;a<8;a++){const t=a*Math.PI/4;ctx.beginPath();ctx.moveTo(1020,615);ctx.lineTo(1020+Math.cos(t)*65,615+Math.sin(t)*65);ctx.stroke();}ctx.font='30px serif';ctx.fillText('N',1020,525);}else paintBookPage(ctx,title);const map=new T.CanvasTexture(cn);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return bindManuscript(parent,title,p,w,h,chart,map);}
export function shelvedBook(c,p,color='red',angle=0,size=[.19,.46,.32]){
 const sub=new Craft(c.materials,'shelved volume');book(sub,[0,0,0],color,angle,size);
 let bottom=Infinity;
 for(const geos of sub.bins.values())for(const g of geos){g.computeBoundingBox();bottom=Math.min(bottom,g.boundingBox.min.y);}
 // Ground the actual tilted cover, including bevels, on the shelf's top face.
 for(const [kind,geos]of sub.bins)for(const g of geos)c.add(g,kind,[p[0],p[1]-bottom,p[2]]);
}
export function book(c,p,color='red',angle=0,size=[.19,.46,.32]){
 const [w,h,d]=size,b=new Craft(c.materials,'bound volume'),cover=Math.min(.014,w*.11);
 // Separate covers, inset paper and a rounded spine retain the old envelope.
 for(const side of [-1,1])b.box([side*(w-cover)/2,0,0],[cover,h,d],color,[0,0,0],.004);
 b.box([0,0,-.008],[w-cover*2.2,h-.034,d-.025],'paper',[0,0,0],.004);
 b.box([0,0,d/2-.012],[w,.98*h,.024],color,[0,0,0],.008);
 for(const yy of [-h*.31,h*.31])b.box([0,yy,d/2+.002],[w*.88,.014,.007],'trim',[0,0,0],.002);
 // A few grouped signatures read as bound pages without subpixel stripe noise.
 for(const yy of [-.25,0,.25])b.box([0,yy*h,-d/2+.004],[w*.75,.003,.003],'leather',[0,0,0],.0005);
 for(const [kind,geos]of b.bins)for(const g of geos){g.rotateZ(angle);c.add(g,kind,p);}
}
export function shelf(c,x,z,w=2.4){for(const yy of [.2,1,1.8,2.6])c.box([x,yy,z],[w,.12,.5]);for(const xx of [-1,1])c.box([x+xx*(w/2-.06),1.45,z],[.12,2.75,.52]);c.box([x,1.4,z-.22],[w,2.8,.09]);for(let row=0;row<3;row++)for(let j=0;j<Math.floor(w/.24)-1;j++)book(c,[x-w/2+.22+j*.24,.49+row*.8,z+.04],['red','cloth','leather','paper'][(row+j)%4]);}
export function chair(c,x,z,side=1){return refinedChair(c,x,z,side);}
export function fireplace(c,x,z){
 for(const side of [-1,1])for(let row=0;row<5;row++)c.box([x+side*.77,.2+row*.34,z],[.45,.32,.8],row%2?'pale':'stone',[0,0,0],.035);
 c.box([x,1.78,z],[2.2,.18,1.03],'pale');c.box([x,1.91,z-.02],[2.08,.085,.96],'stone');
 c.box([x,2.12,z-.12],[1.7,.34,.55],'stone');c.box([x,2.8,z-.2],[1.25,1.15,.43],'stone');
 c.box([x,.07,z+.12],[2.15,.13,1.12],'darkstone');c.box([x,.79,z-.36],[1.2,1.45,.13],'darkstone');
 // Radial arch stones frame the firebox. Inset firebricks line the solid back.
 for(let i=0;i<11;i++){const a=i*Math.PI/11+.012,b=(i+1)*Math.PI/11-.012,points=[];for(let j=0;j<=4;j++){const t=a+(b-a)*j/4;points.push([Math.cos(t)*.77,1.0+Math.sin(t)*.70]);}for(let j=4;j>=0;j--){const t=a+(b-a)*j/4;points.push([Math.cos(t)*.53,1.0+Math.sin(t)*.46]);}const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));c.add(new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.007,bevelThickness:.007,bevelSegments:1,steps:1}),'pale',[x,0,z+.29]);}
 for(let row=0;row<5;row++)for(let j=0;j<4;j++){const xx=-.48+j*.30+(row%2)*.08;if(xx>.5)continue;c.box([x+xx,.31+row*.235,z-.278],[.28,.216,.038],'darkstone',[0,0,0],.009);}
 for(let i=0;i<13;i++)c.sphere([x+Math.sin(i*2.4)*.43,.183,z+Math.cos(i*2.4)*.19],[.071,.041,.05],'iron');
 for(const side of [-1,1]){const A=new T.Vector3(x-.45,.25,z+side*.17),B=new T.Vector3(x+.45,.25,z-side*.17),axis=B.clone().sub(A).normalize();c.tube(A.toArray(),B.toArray(),.098,'wood',.087,12);for(const end of [A,B]){const dir=end===A?-1:1;c.tube(end.clone().addScaledVector(axis,-.004*dir).toArray(),end.clone().addScaledVector(axis,.003*dir).toArray(),.08,'endgrain',.08,12);}}
 for(let i=0;i<9;i++){const xx=x+(i-4)*.13;c.tube([xx,.13,z+.48],[xx,.51,z+.48],.018,'iron');}c.tube([x-.65,.53,z+.48],[x+.65,.53,z+.48],.025,'iron');
 for(const side of [-1,1])c.line([[x+side*.64,.13,z+.48],[x+side*.69,.50,z+.48],[x+side*.61,.60,z+.48],[x+side*.56,.52,z+.48]],.021,'iron');
 c.add(new T.CylinderGeometry(.22,.22,.036,32),'stone',[x,2.65,z+.025],[Math.PI/2,0,0]);c.add(new T.TorusGeometry(.18,.012,6,32),'trim',[x,2.65,z+.052]);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;c.tube([x+Math.cos(a)*.035,2.65+Math.sin(a)*.035,z+.054],[x+Math.cos(a)*.13,2.65+Math.sin(a)*.13,z+.054],.010,'trim');}
}
export function door(parent,mats,name,p,width=1.8,height=2.65){
 const c=new Craft(mats,name),pitch=width/7;
 // A real timber core closes the joints. The two shallow plank faces retain
 // readable bevelled seams without exposing the room through a closed leaf.
 c.box([width/2,height/2,0],[width-.012,height-.012,.09],'wood',[0,0,0],.004);
 for(const side of [-1,1]){
  for(let i=0;i<7;i++)c.box([(i+.5)*pitch,height/2,side*.051],[pitch-.008,height,.038],'wood',[0,0,0],.005);
  for(const xx of [.075,width-.075])c.box([xx,height/2,side*.078],[.105,height-.055,.028],'wood',[0,0,0],.009);
  for(const yy of [.16,height-.16])c.box([width/2,yy,side*.078],[width-.17,.14,.028],'wood',[0,0,0],.012);
  // Broad forged straps taper at the latch end; rivets attach both faces.
  for(const yy of [.43,height-.43]){
   const strap=new T.Shape([[.02,-.075],[width-.26,-.05],[width-.14,0],[width-.26,.05],[.02,.075]].map(q=>new T.Vector2(...q)));
   const g=new T.ExtrudeGeometry(strap,{depth:.025,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.003,bevelThickness:.003});
   c.add(g,'iron',[0,yy,side>0?.09:-.115]);
   for(const xx of [.12,width*.36,width*.65,width-.29])c.sphere([xx,yy,side*.12],[.024,.024,.009],'trim');
  }
  const hx=width-.25,hy=Math.min(1.28,height*.49);
  c.box([hx,hy,side*.087],[.15,.30,.024],'iron',[0,0,0],.018);
  for(const yy of [hy-.105,hy+.105])c.sphere([hx,yy,side*.107],[.018,.018,.008],'trim');
  c.tube([hx,hy+.053,side*.099],[hx,hy+.053,side*.153],.028,'iron',.028,12);
  // The pull hangs through a closed eye on each side, within the old knob's
  // depth. It remains part of the existing clickable, hinged door group.
  c.add(new T.TorusGeometry(.029,.011,8,16),'iron',[hx,hy+.053,side*.149],[0,Math.PI/2,0]);
  c.add(new T.TorusGeometry(.087,.017,8,32),'iron',[hx,hy-.026,side*.164]);
 }
 // Rear diagonal timber brace seated against the planks, not a floating rod.
 const A=new T.Vector3(.17,.59,-.087),B=new T.Vector3(width-.17,height-.59,-.087),mid=A.clone().add(B).multiplyScalar(.5);
 c.box(mid.toArray(),[.10,A.distanceTo(B),.033],'wood',[0,0,-Math.atan2(B.x-A.x,B.y-A.y)],.008);
 // Coaxial knuckles and peened pin ends follow the existing Y hinge axis.
 for(const yy of [.43,height-.43]){
  c.cylinder([0,yy,0],.029,.28,'iron',.029,12);
  for(const dy of [-.10,0,.10])c.cylinder([0,yy+dy,0],.043,.086,'iron',.043,12);
  for(const dy of [-.16,.16])c.sphere([0,yy+dy,0],[.039,.026,.039],'trim');
 }
 // Recessed jamb liners meet the old masonry/curved frame. They sit behind
 // the hinge plane, leaving the forward swing clear and the threshold flat.
 const jamb=new Craft(mats,name+' · 框衬');
 for(const x of [-.055,width+.055])jamb.box([x,(height+.13)/2,-.185],[.105,height+.13,.20],'wood',[0,0,0],.005);
 jamb.box([width/2,height+.063,-.185],[width+.21,.12,.20],'wood',[0,0,0],.005);
 // A shallow rebate overlaps the edge from behind, closing oblique sight
 // lines through the mounting clearance while allowing the leaf to swing out.
 for(const x of [0,width])jamb.box([x,height/2,-.091],[.03,height+.03,.020],'wood',[0,0,0],.001);
 jamb.box([width/2,height,-.091],[width+.03,.03,.020],'wood',[0,0,0],.001);
 const frame=jamb.finish(parent,p);frame.userData.doorFrame='recessed-jamb-v30';
 const root=c.finish(parent,p);
 root.userData.doorConstruction='solid-timber-v30';
 root.traverse(o=>{if(o.isMesh)o.userData.noCollision=true;});
 const proxy=new T.Mesh(new T.BoxGeometry(width,height,.16));
 proxy.position.set(width/2,height/2,0);proxy.visible=false;proxy.userData.noCollision=true;root.add(proxy);
 return{root,frame,proxy,open:false,angle:0,target:-1.48};
}
