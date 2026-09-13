import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import pineSites from './pine-sites.json';

// All carving coordinates are in the same front-facing XY plane. Closed,
// bevelled reliefs give the mask a side profile as well as a readable silhouette.
function relief(c,points,depth,kind,z=0,bevel=.10){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));
 const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel,curveSegments:16});
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));uv.setXY(i,.44+(x>z&&x>y?p.getZ(i):p.getX(i))*.021,.5+(y>x&&y>z?p.getZ(i):p.getY(i))*.14);}
 c.add(g,kind,[0,0,z]);
}
function hull(c,points,kind){const g=new ConvexGeometry(points.map(p=>new T.Vector3(...p)));const p=g.attributes.position,n=g.attributes.normal,uv=[];for(let i=0;i<p.count;i++){const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));uv.push(.44+(x>z&&x>y?p.getZ(i):p.getX(i))*.022,.5+(y>x&&y>z?p.getZ(i):p.getY(i))*.14);}g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));c.add(g,kind);}
function mirror(points,s){return points.map(([x,y])=>[x*s,y]);}

export function carvedMask(c){
 const outline=[[-3.38,3.35],[-2.65,3.78],[-.85,3.57],[0,3.86],[.85,3.57],[2.65,3.78],[3.38,3.35],[3.57,1.0],[3.14,-1.45],[2.17,-3.14],[0,-3.85],[-2.17,-3.14],[-3.14,-1.45],[-3.57,1.0]];
 relief(c,outline,.58,'wood',-.50,.16);
 relief(c,outline.map(([x,y])=>[x*.91,y*.91]),.12,'red',.16,.06);
 relief(c,outline.map(([x,y])=>[x*.84,y*.84]),.27,'wood',.27,.10);
 // Deep recessed eyes, continuous overhanging brows and separate cheek planes.
 for(const s of [-1,1]){
  relief(c,mirror([[.39,1.58],[1.3,2.09],[2.78,2.31],[2.83,1.40],[1.98,.66],[.77,.91]],s),.08,'iron',.67,.075);
  hull(c,[[s*.28,1.74,.74],[s*.67,2.45,.79],[s*2.72,2.74,.64],[s*3.17,2.18,.66],[s*2.91,1.65,1.13],[s*1.44,1.98,1.32],[s*.48,1.27,1.08]],'wood');
  c.line([[s*.69,1.23,.98],[s*1.63,1.12,.93],[s*2.37,1.54,.96]],.085,'paper');
  // Incised red borders follow the brow, rather than floating rectangular eyes.
  c.line([[s*.65,2.54,.88],[s*1.64,2.70,.86],[s*2.6,2.88,.73]],.042,'red');
  hull(c,[[s*2.72,1.25,.81],[s*3.0,.30,.67],[s*2.44,-1.63,.91],[s*1.91,-1.42,1.18],[s*2.05,.22,1.02]],'wood');
  for(let j=0;j<3;j++){
   const x=2.80-j*.23;c.line([[s*x,.54-j*.21,1.02],[s*(x-.22),-.17-j*.24,1.12],[s*(x-.39),-.58-j*.28,1.14]],.038,'red');
  }
  c.line([[s*2.98,2.90,.65],[s*3.17,1.1,.66],[s*2.90,-.85,.68]],.068,'paper');
 }
 // Wide muzzle, nostrils and a real cavity behind individually carved teeth.
 relief(c,[[-2.32,-.67],[-1.48,-.91],[0,-1.06],[1.48,-.91],[2.32,-.67],[2.22,-1.81],[1.33,-2.75],[0,-2.94],[-1.33,-2.75],[-2.22,-1.81]],.08,'iron',.72,.16);
 hull(c,[[-.42,2.19,.91],[.42,2.19,.91],[-.83,.01,1.40],[.83,.01,1.40],[-.56,-.40,1.52],[.56,-.40,1.52],[0,.72,1.90]],'wood');
 relief(c,[[-1.23,.06],[-.66,.32],[0,.09],[.66,.32],[1.23,.06],[1.48,-.45],[.99,-.75],[0,-.95],[-.99,-.75],[-1.48,-.45]],.34,'wood',1.06,.15);
 for(const s of [-1,1]){c.sphere([s*.64,-.10,1.53],[.25,.17,.045],'iron');c.line([[s*.90,-.81,1.46],[s*1.54,-.60,1.23],[s*2.22,-.56,1.04]],.13,'wood');}
 for(let j=0;j<9;j++){
  const x=(j-4)*.45,y=-1.04-Math.cos(x*.67)*.18,tip=y-(Math.abs(j-4)===3?.89:.43);
  relief(c,[[x-.17,y],[x+.17,y+.015],[x+.125,tip+.10],[x,tip],[x-.13,tip+.1]],.15,'paper',.94+Math.cos(x*.6)*.06,.034);
 }
 for(let j=0;j<7;j++){
  const x=(j-3)*.48,y=-2.51+Math.pow(Math.abs(x)/2,2)*.49;
  relief(c,[[x-.16,y],[x-.12,y+.38],[x,y+.48],[x+.12,y+.38],[x+.16,y]],.11,'paper',.97,.032);
 }
 c.line([[-2.40,-1.03,.95],[-2.04,-2.19,1.08],[-1.24,-2.97,1.02],[0,-3.27,.90],[1.24,-2.97,1.02],[2.04,-2.19,1.08],[2.40,-1.03,.95]],.21,'wood');
 for(const s of [-1,1])for(let j=0;j<3;j++)c.line([[s*(.24+j*.39),-3.28+j*.12,1.07],[s*(.36+j*.43),-3.00+j*.11,1.17]],.035,'red');
 // A restrained painted crest and chip-like grooves in the shield edge.
 c.line([[-2.37,3.17,.68],[-1.26,3.35,.75],[0,2.78,.90],[1.26,3.35,.75],[2.37,3.17,.68]],.10,'cloth');
 for(const s of [-1,1])for(let i=0;i<4;i++)c.line([[s*(3.24-i*.06),2.37-i*.57,.40],[s*(3.37-i*.06),2.18-i*.57,.38]],.024,'iron');
}

// A painted hide panel follows the cone and leaves the actual door clear.
export function tentRadius(b,t){
 const raw=t=>t<.42?b.r*(1-t*.2857):b.r*.88*(1-(t-.42)/.58)+.18*((t-.42)/.58),levels=[0,Math.min(2.7,b.h*.39)/b.h,.6,1];
 const i=Math.max(0,levels.findIndex(v=>v>=t)-1),a=levels[i],z=levels[i+1];return T.MathUtils.lerp(raw(a),raw(z),T.MathUtils.clamp((t-a)/(z-a),0,1));
}
export function tentPanels(c,b){
 const radius=(t,a)=>tentSurfaceRadius(b,t,a);
 for(const a0 of [0,Math.PI,Math.PI*1.5]){
  const p=[],uv=[],idx=[],ts=[...new Set([...Array.from({length:27},(_,j)=>.10+j/26*.77),Math.min(2.7,b.h*.39)/b.h,.6])].sort((a,b)=>a-b),rows=ts.length-1,cols=12;
  for(const t of ts)for(let k=0;k<=cols;k++){const a=a0+(k/cols-.5)*.45,rr=radius(t,a)+.025;p.push(Math.cos(a)*rr,t*b.h,Math.sin(a)*rr);uv.push(k/cols,t);}
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const n=j*(cols+1)+k;idx.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();c.add(g,'cloth');
  for(let row=0;row<5;row++){
   const pts=[];for(let k=0;k<=20;k++){const u=k/20,a=a0+(u-.5)*.36,t=.23+row*.095+Math.abs(u-.5)*.085,rr=radius(t,a)+.043;pts.push([Math.cos(a)*rr,t*b.h,Math.sin(a)*rr]);}c.line(pts,.018,'paper');
  }
 }
}

export function tentSurfaceRadius(b,t,a){
 const sag=-.042*Math.sin(a*6)**2*Math.sin(Math.PI*t)**.6;
 const folds=.009*Math.sin(a*42+t*19)*Math.exp(-t*5)*Math.sin(Math.PI*t);
 return tentRadius(b,t)+sag+folds;
}

// Paths are sampled on the existing top surfaces; never span a void or jump
// to a different terrace. The paving top follows the terrain at every corner.
export function entrancePaving(c,root,sites){
 root.updateWorldMatrix(true,true);const ground=[];root.traverse(o=>{if(o.isMesh&&/^HC ground/.test(o.material?.name||''))ground.push(o);});
 const ray=new T.Raycaster(),p=new T.Vector3(),down=new T.Vector3(0,-1,0),samples=[],routes=[];
 function height(x,z,reference){p.set(x,reference+1.2,z);root.localToWorld(p);ray.set(p,down);ray.far=2.7;const hit=ray.intersectObjects(ground,false)[0];return hit?root.worldToLocal(hit.point.clone()).y:null;}
 const occupied=new Map();
 function pave(points,width,label){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[2],p[1]))),length=curve.getLength(),rows=Math.ceil(length/.71),record={label,stones:0,start:points[0],end:points.at(-1)};
  for(let row=0;row<rows;row++)for(let col=0;col<3;col++){
   const seed=row*23.47+col*61.33+points[0][0]*2.71,noise=Math.sin(seed*7.41)*.5+.5;if(col!==1&&noise<.11)continue;
   const t=T.MathUtils.clamp((row+.5+(col%2?.22:0))/rows,0,1),center=curve.getPointAt(t),dir=curve.getTangentAt(t),side=new T.Vector3(-dir.z,0,dir.x).normalize();center.addScaledVector(side,(col-1)*width/3+(noise-.5)*.13);
   const x=center.x,z=center.z,gx=Math.floor(x/.6),gz=Math.floor(z/.6);let crowded=false;for(let sx=-1;sx<=1;sx++)for(let sz=-1;sz<=1;sz++)for(const old of occupied.get((gx+sx)+','+(gz+sz))||[])if(Math.hypot(old[0]-x,old[1]-z)<.49)crowded=true;if(crowded)continue;
   const w=width/3*(.72+noise*.19),d=.54+Math.sin(seed*3.33)*.07,angle=Math.atan2(dir.x,dir.z)+Math.sin(seed)*.17,ca=Math.cos(angle),sa=Math.sin(angle);
   const corners=[];for(let k=0;k<6;k++){const a=(k+.5)*Math.PI/3,rough=.87+.1*Math.sin(seed+k*8.1),xx=Math.cos(a)*w*.62*rough,zz=Math.sin(a)*d*.64*rough;corners.push([x+ca*xx+sa*zz,z-sa*xx+ca*zz]);}
   if(corners.some(([xx,zz])=>sites.buildings.some(b=>b.kind==='house'&&((Math.abs(xx-b.x)<b.w*.38+.20&&zz> -b.y+b.d/2&&zz< -b.y+b.d/2+3.10)||(Math.abs(xx-b.x)<1.06&&zz> -b.y+b.d/2+2.5&&zz< -b.y+b.d/2+3.69)))||sites.bridges.some(r=>[r.a,r.b].some(p=>Math.abs(p[2]-center.y)<.8&&Math.hypot(xx-p[0],zz+p[1])<1.08))))continue;
   const heights=corners.map(([xx,zz])=>height(xx,zz,center.y));if(heights.some(h=>h===null)||Math.max(...heights)-Math.min(...heights)>.30)continue;
   const vertices=[];corners.forEach(([xx,zz],i)=>{vertices.push([xx,heights[i]-.065,zz],[xx,heights[i]+.055,zz]);samples.push({x:xx,z:zz,ground:heights[i],top:heights[i]+.055});});hull(c,vertices,noise>.27?'pathstone':'pathlight');record.stones++;
   const key=gx+','+gz;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push([x,z]);
  }routes.push(record);
 }
 function outsideBuildings(x,z){return !sites.buildings.some(b=>b.kind==='house'&&Math.abs(x-b.x)<b.w*.38+.18&&z> -b.y+b.d/2&&z< -b.y+b.d/2+3.05)&&!pineSites.some(p=>Math.hypot(p.x-x,-p.y-z)<p.h*.032+.22)&&!sites.buildings.some(b=>b.kind==='house'?Math.abs(x-b.x)<b.w/2+.8&&Math.abs(z+b.y)<b.d/2+.8:Math.hypot(x-b.x,z+b.y)<b.r+.65)&&Math.hypot(x,z+25)>4.8;}
 function route(start,goal){
  const step=.9,open=[{x:0,z:0,g:0,f:0,parent:null}],costs=new Map([['0,0',0]]),cache=new Map();let best=null;
  for(let tries=0;open.length&&tries<1600;tries++){
   open.sort((a,b)=>a.f-b.f);const n=open.shift(),px=start[0]+n.x*step,pz=start[1]+n.z*step;if(Math.hypot(px-goal[0],pz-goal[1])<1.3){best=n;break;}
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const x=n.x+dx,z=n.z+dz;if(Math.abs(x)>38||Math.abs(z)>38)continue;const key=x+','+z,wx=start[0]+x*step,wz=start[1]+z*step;
    if(!cache.has(key)){const h=height(wx,wz,start[2]);cache.set(key,h!==null&&Math.abs(h-start[2])<.65&&outsideBuildings(wx,wz)&&[[-.65,0],[.65,0],[0,-.65],[0,.65]].every(([sx,sz])=>height(wx+sx,wz+sz,start[2])!==null&&outsideBuildings(wx+sx,wz+sz))?h:null);}
    if(cache.get(key)===null)continue;const g=n.g+Math.hypot(dx,dz);if((costs.get(key)??Infinity)<=g)continue;costs.set(key,g);open.push({x,z,g,f:g+Math.hypot(wx-goal[0],wz-goal[1])/step,parent:n});
   }
  }
  if(!best)return null;const points=[];while(best){points.push([start[0]+best.x*step,start[1]+best.z*step,start[2]]);best=best.parent;}return points.reverse();
 }
 const centers=[[-23,25,8],[25,23,9],[0,-5,11],[35,-22,21],[-34,-17,18],[1,-27,17]];
 for(const [i,b]of sites.buildings.entries()){
  const front=b.kind==='house'?b.d/2+3.9:b.r+.95,start=[b.x,-b.y+front,b.z-.32];
  const goals=sites.bridges.flatMap(r=>[r.a,r.b]).map(p=>[p[0],-p[1],p[2]]).filter(p=>Math.abs(p[2]-b.z)<.8&&Math.hypot(p[0]-start[0],p[1]-start[1])<34).sort((a,b)=>Math.hypot(a[0]-start[0],a[1]-start[1])-Math.hypot(b[0]-start[0],b[1]-start[1]));
  const center=centers.filter(c=>Math.abs(c[2]-b.z)<.9).sort((a,c)=>Math.hypot(a[0]-b.x,a[1]+b.y)-Math.hypot(c[0]-b.x,c[1]+b.y))[0];
  if(center)for(const s of [-1,1])goals.push([b.x+s*(b.w/2+2.3),-b.y,b.z-.32]);
  let points;for(const goal of goals){points=route(start,goal);if(points?.length>2)break;}
  if(!points){routes.push({label:'entrance-'+i,stones:0,unreachable:true});continue;}
  pave(points,1.75,'entrance-'+i);
 }
 return {routes,samples};
}

export function continuousHorns(c){
 for(const sign of [-1,1]){
  const pts=[[2.68,45,-25],[5,44.7,-24.7],[7.7,45.3,-24.8],[10,47,-25],[11.7,49.7,-25.1]].map(([x,y,z])=>new T.Vector3(x*sign,y,z)),curve=new T.CatmullRomCurve3(pts),frames=curve.computeFrenetFrames(64,false),p=[],uv=[],idx=[];
  for(let j=0;j<=64;j++){const t=j/64,center=curve.getPointAt(t),radius=Math.max(.012,1.25*Math.pow(1-t,1.12));for(let k=0;k<=20;k++){const a=k/20*Math.PI*2,r=radius*(1+.024*Math.cos(t*180)*Math.pow(1-t,.5));const v=center.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r);p.push(v.x,v.y,v.z);uv.push(k/20,t);}}
  for(let j=0;j<64;j++)for(let k=0;k<20;k++){const n=j*21+k;idx.push(n,n+21,n+1,n+1,n+21,n+22);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  // Shared positions and normals give the ivory base and dark tip a sealed join.
  for(const [kind,start,end]of [['paper',0,41],['iron',41,64]]){const part=g.clone();part.setIndex(idx.slice(start*20*6,end*20*6));c.add(part,kind);}g.dispose();
 }
}
export function shortPorch(c,b){
 const w=b.w*.72,front=b.d/2;
 for(let j=0;j<7;j++)c.box([0,-.015,front+.40+j*.34],[w,.15,.325],'wood');
 for(const s of [-1,1]){
  c.tube([s*w*.43,-.58,front+.5],[s*w*.43,-.58,front+2.60],.16,'wood');
  for(const z of [front+.5,front+2.40]){c.cylinder([s*w*.43,-.47,z],.34,.38,'stone',.27,10);c.tube([s*w*.43,-.40,z],[s*w*.43,1.05,z],.12,'wood',.10);}
  c.line([[s*w*.43,.90,front+.5],[s*w*.43,.83,front+1.4],[s*w*.43,.91,front+2.4]],.045,'leather');
  c.tube([s*w*.43,-.43,front+.4],[s*w*.43,-.13,front+2.2],.11,'wood');
 }
 for(let j=0;j<3;j++)c.box([0,-.15-j*.11,front+2.73+j*.35],[1.98,.15,.38],'stone');
}
