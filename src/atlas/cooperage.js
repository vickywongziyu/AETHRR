import * as T from 'three';

export const barrelRadius=(r,t)=>r*(.82+.18*Math.sin(Math.PI*t));

export function barrelShell(r,h){
 const profile=[];for(let j=0;j<=14;j++)profile.push(new T.Vector2(barrelRadius(r,j/14),h*j/14));
 for(let j=14;j>=0;j--)profile.push(new T.Vector2(barrelRadius(r,j/14)-r*.13,h*j/14));profile.push(profile[0].clone());
 const g=new T.LatheGeometry(profile,72),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const ring=i%profile.length,around=Math.floor(i/profile.length),x=p.getX(i),z=p.getZ(i),length=Math.hypot(x,z);
  // Shallow cut joints on a continuous wall, not gaps between round rods.
  if(ring<=14||ring===profile.length-1){const scale=1-(around%4===0?r*.008/length:0);p.setX(i,x*scale);p.setZ(i,z*scale);}
  uv.setXY(i,.42+(around%4)/4*.12,p.getY(i)/Math.max(h,1.8)+.3);
 }
 g.computeVertexNormals();return g;
}

function lidBoard(radius,a,b,depth){
 const points=[];for(let j=0;j<=12;j++){const x=a+(b-a)*j/12;points.push(new T.Vector2(x,Math.sqrt(Math.max(0,radius*radius-x*x))));}for(let j=12;j>=0;j--){const x=a+(b-a)*j/12;points.push(new T.Vector2(x,-Math.sqrt(Math.max(0,radius*radius-x*x))));}
 const g=new T.ExtrudeGeometry(new T.Shape(points),{depth,steps:1,bevelEnabled:false});g.rotateX(Math.PI/2);return g;
}

export function cooperedBarrel(c,p,r=.43,h=.95){
 (c.storageFixtures??=[]).push({kind:'barrel',position:[...p],radius:r,height:h});
 const [x,y,z]=p;c.add(barrelShell(r,h),'wood',p);
 // The lower head and inset upper head close the real hollow wall.
 c.cylinder([x,y+h*.025,z],r*.795,h*.05,'wood',r*.795,72);
 const rad=r*.797,thick=Math.min(.018,h*.033),top=h-.008;
 c.cylinder([x,y+top-thick-.008,z],rad,.016,'wood',rad,72);
 for(let i=0;i<6;i++){const a=-rad+i*rad/3+.001,b=-rad+(i+1)*rad/3-.001;c.add(lidBoard(rad,a,b,thick),'wood',[x,y+top,z]);}
 c.cylinder([x+r*.24,y+top+.003,z],r*.10,.006,'endgrain',r*.10,24);
 for(const t of [.12,.30,.76,.90]){
  const half=Math.min(.028,h*.032),lo=t*h-half,hi=t*h+half,metal=Math.max(.005,r*.024),A=barrelRadius(r,lo/h)+.001,B=barrelRadius(r,hi/h)+.001;
  const profile=[[A,lo],[A+metal,lo],[B+metal,hi],[B,hi],[A,lo]].map(v=>new T.Vector2(...v));c.add(new T.LatheGeometry(profile,72),'iron',p);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,rr=barrelRadius(r,t)+metal+.002,g=new T.SphereGeometry(1,8,6);g.scale(r*.022,r*.022,r*.010);c.add(g,'iron',[x+Math.cos(a)*rr,y+h*t,z+Math.sin(a)*rr],[0,Math.PI/2-a,0]);}
 }
 return c;
}

export function joinedCrate(c,p,size=[.85,.78,.85]){
 (c.storageFixtures??=[]).push({kind:'crate',position:[...p],size:[...size]});
 const [x,y,z]=p,[w,h,d]=size,core=.026;
 c.box(p,[w-core,h-core,d-core],'wood',[0,0,0],.004);
 // All six faces retain a solid backing behind their shallow board joints.
 for(let i=0;i<4;i++)for(const side of [-1,1]){
  c.box([x,y+(i-1.5)*h/4,z+side*(d/2-.018)],[w-.02,h/4-.004,.020],'wood',[0,0,0],.003);
  c.box([x+side*(w/2-.018),y+(i-1.5)*h/4,z],[.020,h/4-.004,d-.02],'wood',[0,0,0],.003);
  c.box([x+(i-1.5)*w/4,y+side*(h/2-.018),z],[w/4-.004,.020,d-.02],'wood',[0,0,0],.003);
 }
 for(const sx of [-1,1])for(const sz of [-1,1])c.box([x+sx*(w/2-.04),y,z+sz*(d/2-.04)],[.08,h-.08,.08],'wood',[0,0,0],.008);
 for(const side of [-1,1]){
  for(const sy of [-1,1]){c.box([x,y+sy*(h/2-.02),z+side*(d/2-.04)],[w,.04,.08],'wood',[0,0,0],.004);c.box([x+side*(w/2-.04),y+sy*(h/2-.02),z],[.08,.04,d-.16],'wood',[0,0,0],.004);}
  for(const yy of [-h*.36,h*.36]){c.box([x,y+yy,z+side*(d/2-.003)],[w,.055,.012],'iron',[0,0,0],.003);c.box([x+side*(w/2-.003),y+yy,z],[.012,.055,d],'iron',[0,0,0],.003);}
  const dx=w*.66,dy=h*.55;c.box([x,y,z+side*(d/2+.002)],[.062,Math.hypot(dx,dy),.016],'wood',[0,0,-side*Math.atan2(dx,dy)],.005);
  for(const xx of [-w*.40,w*.40])for(const yy of [-h*.36,h*.36])c.sphere([x+xx,y+yy,z+side*(d/2+.005)],[.007,.007,.003],'iron');
 }
 c.box([x,y,z+d/2+.014],[w*.30,h*.23,.006],'paper',[0,0,.045],.002);
 for(let i=0;i<3;i++)c.box([x-w*.06+(i%2)*w*.015,y+h*(.055-i*.046),z+d/2+.018],[w*(.13-i*.02),.006,.001],'wood',[0,0,.045],.0002);
 return c;
}
