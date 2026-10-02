import * as T from 'three';
import {Craft} from './architecture-kit.js';

// The original foreground pavilions end in water before the northern garden.
// Add visible solid stone causeways to the real banks, in region-local Y-up units.
// Their rendered deck is also the collision surface; no invisible navigation ramp.
export function connectWatercourtPaths(root,materials){
 root.updateWorldMatrix(true,true);let terrain;root.traverse(o=>{if(o.isMesh&&/Moss_islands_and_forest_banks/i.test(o.name))terrain=o;});
 if(!terrain)return;
 const paving=materials.pale.clone();paving.onBeforeCompile=s=>{materials.pale.onBeforeCompile(s);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 stoneCell=fract(vec2(craftUv.x*4.,craftUv.y/.52));
 float stoneJoint=min(min(stoneCell.x,1.-stoneCell.x),min(stoneCell.y,1.-stoneCell.y));
 diffuseColor.rgb*=mix(.62,1.,smoothstep(.012,.03,stoneJoint));`);};paving.customProgramCacheKey=()=> 'watercourt-paving-v51';
 const pathMaterials={...materials,pale:paving};
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
 const ground=(x,z)=>{ray.set(root.localToWorld(new T.Vector3(x,30,z)),down);const hit=ray.intersectObject(terrain,false)[0];return hit?root.worldToLocal(hit.point.clone()).y:null;};
 const definitions=[
  {name:'西岸花园石径',points:[[-12.82,.7445,13.14],[-14.8,.78,10.2],[-12.3,.84,4.6],[-11.4,.9,.3],[-11,.96,-3]]},
  {name:'东岸花园石径',points:[[6.417,1.3571,7.585],[9,1.45,4],[14,1.72,1],[17.1207,1.8802,-5.1794]]},
  {name:'高台环亭步道',points:[[18.37,2.6711,-13.82],[14,2.95,-14],[12.8,3.05,-19],[13,3.05,-22],[13.402,3.0996,-24.466]]},
 ];
 // Join the existing roads outside furnished pavilions. Open only the
 // rendered parapets/posts at these junctions; the old paving stays solid.
 const openings=[
  {prefix:'Central_arched_bridge',routes:[definitions[0].points.slice(-2),definitions[1].points.slice(-2),[[-12,.8,-3],[-9.55,.94,-6.9]]],floor:x=>{const t=(x+12)/31;return .8+.9*t+1.25*Math.sin(t*Math.PI);}},
  {prefix:'Entrance_walkway',routes:[definitions[0].points.slice(0,2)],floor:x=>{const t=(x+24)/14;return .5+.15*t+.2*Math.sin(t*Math.PI);}},
  {prefix:'Foreground_crescent',routes:[definitions[1].points.slice(0,2)],floor:x=>.65+Math.sin((x+10)/22*Math.PI)},
  {prefix:'Terrace_ascent',routes:[definitions[2].points.slice(0,2)],floor:x=>{const t=19-x;return 1.7+1.25*t+.2*Math.sin(t*Math.PI);}},
  {prefix:'Rear_garden_way',routes:[definitions[2].points.slice(-2)],floor:x=>{const t=(18-x)/11;return 2.95-1.1*t+.6*Math.sin(t*Math.PI);}},
 ];
 const inJunction=(p,j)=>j.routes.some(route=>route.slice(1).some((b,i)=>{const a=route[i],dx=b[0]-a[0],dz=b[2]-a[2],t=T.MathUtils.clamp(((p.x-a[0])*dx+(p.z-a[2])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(p.x-a[0]-t*dx,p.z-a[2]-t*dz)<1.29;}));
 root.traverse(o=>{if(!o.isMesh)return;const opening=openings.find(j=>o.name===j.prefix+'_moulding'||o.name===j.prefix+'_paving');if(!opening)return;const g=o.geometry,idx=g.index,p=g.attributes.position,keep=[];
  for(let i=0;i<(idx?.count||p.count);i+=3){const ids=[0,1,2].map(j=>idx?idx.getX(i+j):i+j),pts=ids.map(k=>new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(o.matrix)),mid=pts[0].clone().add(pts[1]).add(pts[2]).multiplyScalar(1/3),deck=opening.floor(mid.x);
   if(inJunction(mid,opening)&&(o.name.endsWith('moulding')?Math.max(...pts.map(q=>q.y))>deck-.28:Math.max(...pts.map(q=>q.y))>deck+.07))continue;keep.push(...ids);}
  o.geometry=g.clone();o.geometry.setIndex(keep);o.geometry.computeBoundingSphere();
 });
 root.userData.watercourtPaths=[];
 for(const {name,points} of definitions){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),count=Math.ceil(curve.getLength()/.22),rows=[],half=1.05;
  for(let i=0;i<=count;i++){
   const t=i/count,p=curve.getPointAt(t),dir=curve.getTangentAt(t),side=new T.Vector3(-dir.z,0,dir.x).normalize();
   // Across-bank samples keep the deck above the actual hillside, including its edges.
   let y=p.y;for(const s of [-half,0,half]){const h=ground(p.x+side.x*s,p.z+side.z*s);if(h!==null)y=Math.max(y,h+.045);}p.y=y;rows.push({p,side});
  }
  // Ease abrupt bank boundaries into a traversable, visible deck grade.
  for(let pass=0;pass<2;pass++)for(const order of [rows,[...rows].reverse()])for(let i=1;i<order.length;i++){const d=Math.hypot(order[i].p.x-order[i-1].p.x,order[i].p.z-order[i-1].p.z);order[i].p.y=Math.max(order[i].p.y,order[i-1].p.y-d*.45);}
  const positions=[],uv=[],indices=[];
  for(let i=0;i<rows.length;i++){const {p,side}=rows[i];for(const dy of [0,-.24])for(const s of [-half,half]){positions.push(p.x+side.x*s,p.y+dy,p.z+side.z*s);uv.push((s+half)/(half*2),i*curve.getLength()/count);}}
  for(let i=0;i<count;i++){const k=i*4,n=k+4;indices.push(k,k+1,n,k+1,n+1,n,k+2,n+2,k+3,k+3,n+2,n+3,k,n,k+2,k+2,n,n+2,k+1,k+3,n+1,k+3,n+3,n+1);}
  indices.push(0,2,1,1,2,3,count*4,count*4+1,count*4+2,count*4+1,count*4+3,count*4+2);
  const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const c=new Craft(pathMaterials,name);c.add(geometry,'pale');
  for(let i=4;i<count-3;i+=7){const {p,side}=rows[i];for(const s of [-half,half]){const x=p.x+side.x*s,z=p.z+side.z*s;c.cylinder([x,p.y+.25,z],.07,.5,'stone',.06,8);}}
  for(const sign of [-1,1]){const pts=rows.slice(4,-4).filter((_,i)=>i%3===0).map(({p,side})=>[p.x+side.x*half*sign,p.y+.5,p.z+side.z*half*sign]);c.line(pts,.045,'stone');}
  for(let i=6;i<count-5;i+=12){const {p}=rows[i],base=ground(p.x,p.z)??-.65;if(p.y-base>.4)c.cylinder([p.x,(p.y+base)/2,p.z],.22,p.y-base,'stone',.28,10);}
  c.finish(root);root.userData.watercourtPaths.push({name,points:rows.map(({p})=>p.toArray()),width:half*2});
 }
}
