import * as T from 'three';

export function lanternChamber(){
 const outer=[[.17,.16],[.225,.25],[.232,.48],[.19,.64]],profile=[...outer,...outer.slice().reverse().map(([r,y])=>[r-.018,y]),outer[0]];
 return new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),6);
}

function wallBracket(c,p,s,wall){
 const origin=new T.Vector3(...p),anchor=new T.Vector3(...wall),direction=origin.clone().sub(anchor);direction.y=0;direction.normalize();
 const yaw=Math.atan2(direction.x,direction.z),high=Math.max(p[1]+1.10*s,wall[1]+.25*s),top=origin.clone();top.y=high;
 c.box(wall,[.20*s,.43*s,.05*s],'iron',[0,yaw,0],.025*s);
 const a=anchor.clone();a.y+=.13*s;const bend=anchor.clone().lerp(top,.36);bend.y=high;
 c.line([a.toArray(),bend.toArray(),top.toArray(),[p[0],p[1]+.929*s,p[2]]],.024*s,'iron');
 const brace=anchor.clone();brace.y-=.13*s;const end=anchor.clone().lerp(top,.55);end.y=high-.01*s;c.tube(brace.toArray(),end.toArray(),.017*s,'iron');
 for(const dy of [-.15,.15]){const q=anchor.clone().addScaledVector(direction,.032*s);q.y+=dy*s;c.sphere(q.toArray(),[.024*s,.024*s,.024*s],'trim');}
}

// Shared lantern proportions retain the previous base footprint and support
// height. The upright handle now joins the hanging hardware above the cap.
export function refinedLantern(c,p,scale=1,kind='glass',{wall=null}={}){
 const [x,y,z]=p,s=scale;
 (c.lampFixtures??=[]).push({position:[...p],scale:s,kind,wall:wall?[...wall]:null});
 const point=(xx,yy,zz)=>[x+xx*s,y+yy*s,z+zz*s];
 c.cylinder(point(0,0,0),.30*s,.13*s,'iron',.25*s,8);
 c.cylinder(point(0,.10,0),.21*s,.12*s,'trim',.23*s,12);
 c.cylinder(point(0,.175,0),.224*s,.035*s,'iron',.224*s,6);
 const glass=lanternChamber();glass.scale(s,s,s);c.add(glass,kind,p);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,dx=Math.sin(a),dz=Math.cos(a);
  c.line([[dx*.18,.16,dz*.18],[dx*.237,.25,dz*.237],[dx*.244,.48,dz*.244],[dx*.203,.65,dz*.203]].map(q=>point(...q)),.016*s,'iron');
  for(const yy of [.26,.61])c.sphere(point(dx*(yy<.3?.235:.21),yy,dz*(yy<.3?.235:.21)),[.021*s,.021*s,.021*s],'trim');
 }
 c.cylinder(point(0,.655,0),.225*s,.035*s,'trim',.23*s,6);
 const cap=new T.LatheGeometry([[0,.65],[.20,.65],[.285,.687],[.285,.725],[.12,.80],[.045,.82],[0,.82]].map(([r,h])=>new T.Vector2(r*s,h*s)),6);
 // The lathe's two axis vertices otherwise create zero-area triangles.
 const ids=[],v=cap.attributes.position,a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();
 for(let i=0;i<cap.index.count;i+=3){const tri=[0,1,2].map(j=>cap.index.getX(i+j));a.fromBufferAttribute(v,tri[0]);b.fromBufferAttribute(v,tri[1]).sub(a);d.fromBufferAttribute(v,tri[2]).sub(a);if(b.cross(d).lengthSq()>1e-20)ids.push(...tri);}
 cap.setIndex(ids);c.add(cap,'iron',p);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;c.tube(point(Math.sin(a)*.275,.73,Math.cos(a)*.275),point(Math.sin(a)*.115,.802,Math.cos(a)*.115),.010*s,'trim');}
 const handle=new T.TorusGeometry(.064*s,.012*s,8,32);c.add(handle,'iron',point(0,.87,0));
 if(wall)wallBracket(c,p,s,wall);
 return c;
}
