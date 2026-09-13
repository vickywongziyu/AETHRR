import * as T from 'three';

// Real solid spandrels turn a bounded wall aperture into a pointed arch.
// Work in XY, then rotate the complete frame onto either side wall.
export function lancetWindow(c,{position,width,height,bottom,yaw=0}){
 const half=width*.5,top=bottom+height,spring=top-height*.43;
 const curve=new T.CubicBezierCurve(new T.Vector2(half,spring),new T.Vector2(half,spring+height*.24),new T.Vector2(half*.38,top-height*.06),new T.Vector2(0,top));
 const transform=p=>new T.Vector3(p[0],p[1],p[2]||0).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(...position)).toArray();
 const arc=curve.getPoints(20);
 for(const sign of [-1,1]){
  const s=new T.Shape();s.moveTo(sign*half,spring);s.lineTo(sign*half,top);s.lineTo(0,top);for(const p of [...arc].reverse())s.lineTo(sign*p.x,p.y);s.closePath();
  c.add(new T.ExtrudeGeometry(s,{depth:.35,bevelEnabled:false}),'plaster',transform([0,0,-.175]),[0,yaw,0]);
  const outline=[[sign*half,bottom,0],[sign*half,spring,0],...arc.slice(1).map(p=>[sign*p.x,p.y,0])];
  for(const depth of [-.24,.24])c.line(outline.map(p=>transform([p[0],p[1],depth])),.105,'pale');
  c.line(arc.map(p=>transform([sign*p.x,p.y,.355])),.026,'trim');
 }
 const glass=new T.Shape();glass.moveTo(-half,bottom);glass.lineTo(half,bottom);glass.lineTo(half,spring);for(const p of arc.slice(1))glass.lineTo(p.x,p.y);for(const p of [...arc].reverse().slice(1))glass.lineTo(-p.x,p.y);glass.closePath();
 c.add(new T.ExtrudeGeometry(glass,{depth:.026,bevelEnabled:false}),'windowglass',transform([0,0,-.013]),[0,yaw,0]);
 c.tube(transform([0,bottom,0]),transform([0,top-.10,0]),.038,'trim');
 c.tube(transform([-half,bottom,0]),transform([half,bottom,0]),.10,'pale');
 // A restrained leaf tracery connects the new windows to the original domes.
 for(const sign of [-1,1])c.line([[0,spring-.34,0],[sign*half*.48,spring-.07,0],[sign*half*.50,spring+.22,0],[0,top-.16,0]].map(transform),.025,'trim');
}

export function roofFinials(c,w,d,h,rise,profile){
 const W=w/2+.9,D=d+.95;
 for(const z of [-D/2-.14,D/2+.14]){
  for(const side of [-1,1]){
   const ps=[];for(let i=0;i<=24;i++){const t=i/24;ps.push([side*W*t,profile(t)+.23,z]);}c.line(ps,.068,'pale');
   c.line([[side*(W-.55),profile(1)+.1,z],[side*W,profile(1)+.24,z],[side*(W+.26),profile(1)+.6,z],[side*(W+.16),profile(1)+.84,z]],.055,'trim');
  }
  const s=Math.sign(z);c.line([[0,h+rise-.1,z-s*.55],[0,h+rise+.28,z],[0,h+rise+.78,z+s*.22],[0,h+rise+1.13,z+s*.10]],.09,'pale');
  c.crystal([0,h+rise+.83,z+s*.12],.40,.09,'azure');
 }
}
