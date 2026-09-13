import * as T from 'three';
import {cushionGeometry} from './soft-furnishing.js';

function taperedLeg(c,p,height,top=.12,foot=.10){
 c.add(new T.CylinderGeometry(top/Math.SQRT2,foot/Math.SQRT2,height,4),'wood',[p[0],p[1]+height/2,p[2]],[0,Math.PI/4,0]);
 for(const yy of [.09,height-.10])c.box([p[0],p[1]+yy,p[2]],[top,.035,top],'wood',[0,0,0],.009);
}

export function refinedTable(c,p,w=1.4,d=.85,{paper=true,accessories=true,accessoryLift=0}={}){
 const [x,y,z]=p,lx=w/2-.12,lz=d/2-.12;
 // A solid joined top closes the old through-slots. The upper bevels still
 // describe individual boards; the authored .86-metre working surface stays.
 c.box([x,y+.80,z],[w-.012,.08,d-.012],'wood',[0,0,0],.006);
 for(let k=0;k<4;k++)c.box([x,y+.84,z+(k-1.5)*d/4],[w-.116,.04,d/4-.005],'wood',[0,0,0],.004);
 for(const side of [-1,1])c.box([x+side*(w/2-.03),y+.81,z],[.06,.1,d],'wood',[0,0,0],.007);
 for(const sx of [-1,1])for(const sz of [-1,1])taperedLeg(c,[x+sx*lx,y,z+sz*lz],.77,.12,.098);
 for(const side of [-1,1]){
  c.box([x,y+.674,z+side*lz],[w-.22,.18,.075],'wood',[0,0,0],.012);
  c.box([x+side*lx,y+.674,z],[.075,.18,d-.22],'wood',[0,0,0],.012);
  c.box([x+side*lx,y+.23,z],[.055,.065,d-.24],'wood',[0,0,0],.008);
  for(const sx of [-1,1])c.sphere([x+sx*(lx-.055),y+.69,z+side*(lz+.04)],[.018,.018,.008],'endgrain');
 }
 c.box([x,y+.23,z],[w-.24,.065,.055],'wood',[0,0,0],.008);
 if(paper)c.box([x-w*.04,y+.865,z],[w*.40,.006,d*.48],'paper',[0,.055,0],.001);
 if(accessories){
  // An actual hollow vessel, closed under its base, with rim and loop handle.
  const profile=[[0,0],[.075,0],[.097,.012],[.11,.155],[.105,.166],[.092,.166],[.087,.145],[.076,.025],[0,.025]];
  c.add(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),32),'iron',[x+w*.28,y+.86+accessoryLift,z]);
  c.ring([x+w*.28,y+1.022+accessoryLift,z],.099,.006,'trim');
  c.add(new T.TorusGeometry(.06,.009,8,24),'iron',[x+w*.28,y+.946+accessoryLift,z+.105],[0,Math.PI/2,0]);
  c.lamp([x-w*.34,y+.8805+accessoryLift,z],.3);
 }
 return c;
}

export function refinedChair(c,x,z,side=1){
 const sub=new c.constructor(c.materials,'carved armchair'),back=new c.constructor(c.materials,'framed chair back');
 sub.box([0,.43,0],[.78,.16,.83],'wood',[0,0,0],.035);
 sub.add(cushionGeometry(.68,.74,.205,{fold:.006,seed:1.1}),'red',[0,.603,0]);
 back.box([0,0,0],[.65,.72,.085],'wood',[0,0,0],.016);
 for(const sx of [-1,1])back.box([sx*.345,0,0],[.07,.84,.15],'wood',[0,0,0],.018);
 for(const yy of [-.385,.385])back.box([0,yy,0],[.76,.07,.15],'wood',[0,0,0],.019);
 // Restrained incised leaf motif on the rear panel, seated on the timber face.
 back.line([[0,-.19,-.0475],[0,0,-.0475],[0,.19,-.0475]],.005,'endgrain');
 for(const sx of [-1,1])back.line([[0,-.10,-.0475],[sx*.12,.035,-.0475],[0,.14,-.0475]],.005,'endgrain');
 for(const [kind,geos]of back.bins)for(const g of geos){g.rotateX(-.12);sub.add(g,kind,[0,1.06,-.37]);}
 sub.add(cushionGeometry(.57,.66,.15,{fold:.004,seed:2.4}),'red',[0,1.10,-.25],[Math.PI/2-.12,0,0]);
 const seam=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a);seam.push([Math.sign(cs)*Math.pow(Math.abs(cs),.38)*.34*Math.cos(.30),.603+.1025*Math.sin(.30)+.001,Math.sign(sn)*Math.pow(Math.abs(sn),.38)*.37*Math.cos(.30)]);}sub.line(seam,.0035,'leather',true);
 for(const sx of [-1,1]){
  sub.line([[sx*.35,.2,-.35],[sx*.39,.77,-.31],[sx*.43,.91,.23],[sx*.35,.38,.36]],.055,'wood');
  sub.box([sx*.37,.89,.02],[.12,.1,.68],'wood',[0,0,0],.025);
  for(const zz of [-.3,.3])taperedLeg(sub,[sx*.28,0,zz],.38,.12,.105);
  sub.box([sx*.28,.24,0],[.045,.055,.60],'wood',[0,0,0],.007);
  sub.box([0,.24,sx*.30],[.56,.055,.045],'wood',[0,0,0],.007);
 }
 for(const [kind,geos]of sub.bins)for(const g of geos){g.rotateY(side*Math.PI/2);c.add(g,kind,[x,0,z]);}
 return c;
}
