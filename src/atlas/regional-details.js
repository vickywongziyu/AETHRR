import * as T from 'three';
import {Craft} from './architecture-kit.js';
import {rebuildBranches} from './organic-branches.js';
import {createBranchLOD} from './branch-lod.js';
import sites from './building-sites.json';

// Embellishments belong to their existing building, including floating parents.
// They never introduce a new floor, block a doorway, or register another room.
export function createRegionalDetails(world,settlements,time){
 const cache=new Map(),lowCache=new Map(),lod=createBranchLOD(),trees=[],roots=[],anchors=[],effects=[],seen=new Set(),reports=[];
 const lights=Array.from({length:2},()=>{const l=new T.PointLight('#ffbc78',0,17,2);l.visible=false;world.scene.add(l);return l;});
 function lamp(root,position,color='#ffbc78',power=1){anchors.push({root,position:new T.Vector3(...position),world:new T.Vector3(),color,power});}
 function add(region,root){
  if(seen.has(region.id))return;seen.add(region.id);let treeCount=0;
  if(['forest','watercourt'].includes(region.id))root.traverse(o=>{
   if(!o.isMesh||!/^(Bark · silver plum|WC bark)/.test(o.material?.name||''))return;
   const original=o.geometry;if(!cache.has(original))cache.set(original,rebuildBranches(original));o.geometry=cache.get(original);trees.push({mesh:o,original,region:region.id});treeCount++;
  });
  let parts=0;
  for(const record of settlements.records.filter(r=>r.region===region.id&&r.inspect!==false&&!r.district)){
   const c=new Craft(settlements.materials,record.name+' · 细部雕饰'),r=record.radius,h=record.height;
   if(region.id==='watercourt'){
    // Twin leaf reliefs sit above each arch; the lower openings stay clear.
    for(let k=0;k<8;k++){
     const a=(k+1)*Math.PI/4,rr=r*1.035,point=(u,y)=>[Math.cos(a)*rr-Math.sin(a)*u,y,Math.sin(a)*rr+Math.cos(a)*u];
     for(const s of [-1,1])c.line([point(s*.09,h+.26),point(s*r*.11,h+.49),point(s*r*.19,h+.39),point(s*r*.13,h+.28),point(s*.09,h+.26)],.035,'trim');
     c.sphere(point(0,h+.29),[.065,.09,.065],'azure');
    }
    for(const s of [-1,1])lamp(record.root,[s*r*.73,1.05,r*.22],'#ffd299',1.2);
   }else if(region.id==='aether'){
    // Inlaid compass and raised leaf bands on the existing sanctuary columns.
    const y=.912;for(let k=0;k<16;k++){const a=k*Math.PI/8,rr=r*.61,len=k%4===0?.30:.15;c.tube([Math.cos(a)*(rr-len),y,Math.sin(a)*(rr-len)],[Math.cos(a)*rr,y,Math.sin(a)*rr],.022,'trim',.006,6);}
    c.ring([0,y,0],r*.35,.018,'azure');
    for(let k=0;k<8;k++){const a=k*Math.PI/4;for(const yy of [1.08,.9+h-.13])c.ring([Math.cos(a)*r,yy,Math.sin(a)*r],r<2?.265:.355,.028,'trim');}
    for(const s of [-1,1])lamp(record.root,[s*r*.62,1.35,r*.27],'#82d4d6',1.5);
   }else if(region.id==='highland'){
    if(record.type==='house'){
     // Carved knot-work follows the entrance posts, above shoulder height.
     const site=sites.buildings.find(b=>Math.abs(b.x-record.root.position.x)<.001&&Math.abs(b.z-record.root.position.y)<.001);
     for(const s of [-1,1])for(let k=0;k<3;k++){
      const x=s*(site.w*.5-.20),y=h-.85+k*.20,z=site.d*.5+.28;
      c.ring([x,y,z],.23,.025,'red');
     }
    }else if(record.type==='tent'){
     // Neck bindings and a small hanging bead on the existing tent crown.
     for(let k=0;k<3;k++)c.ring([0,h*.87+k*.055,0],.18,.026,'red');
    }
    // Existing table lantern provides a warm pool on the floor and furnishings.
    lamp(record.root,record.type==='tent'?[0,.70,-r*.40]:[r*.48,1.25,-r*.38],'#ffc17c',1.5);
   }else if(region.id==='valley'){
    if(record.type==='house'){
     // Chisel-cut ornament on the front lintel; snow caps remain on the roof.
     for(let k=0;k<7;k++){const x=(k-3)*.15;c.line([[x-.05,2.73,2.825],[x,2.79,2.825],[x+.05,2.73,2.825]],.012,'iron');}
     for(const s of [-1,1])lamp(record.root,[s*1.4,1.75,2.98],'#ffc077',1.5);
     const geometry=new T.BufferGeometry(),p=[],seed=[];for(let i=0;i<34;i++){p.push((i%5)*.17,0,0);seed.push(i/34);}
     geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('phase',new T.Float32BufferAttribute(seed,1));
     const material=new T.ShaderMaterial({uniforms:{time,size:{value:world.renderer.getPixelRatio()*85}},transparent:true,depthWrite:false,vertexShader:'attribute float phase;uniform float time;uniform float size;varying float fade;void main(){float age=fract(phase+time*.057);vec3 p=vec3(-2.,5.82,-1.15)+vec3(age*1.4+sin(phase*49.+time*.4)*age*.32,age*4.,sin(phase*19.+time*.2)*age*.6);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(75.,size*(.35+age*1.1)/max(.5,-mv.z));fade=sin(age*3.14159)*.14;}',fragmentShader:'varying float fade;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.65,.68,.68,(1.-smoothstep(.0,1.,d))*fade);}'});
     const smoke=new T.Points(geometry,material);smoke.name='北境烟囱 · 随风炊烟';smoke.frustumCulled=false;smoke.userData.noCollision=true;record.root.add(smoke);effects.push(smoke);
    }else lamp(record.root,[0,10.8,1.3],'#ffc17c',1.6);
   }else if(region.id==='forest'){
    const x=Math.sin(49*.096)*2.4+Math.sin(49*.2)*.75;
    for(const s of [-1,1]){
     // Carved vine relief hugs the outer stone piers, away from the veil.
     const cx=x+s*2.65;for(let k=0;k<7;k++){const y=1.6+k*.43;
      c.line([[cx-.29,y,-48.38],[cx,y+.17,-48.34],[cx+.29,y+.30,-48.38]],.025,'trim');
      c.line([[cx,y+.17,-48.34],[cx+s*.20,y+.34,-48.34],[cx+s*.24,y+.18,-48.34],[cx,y+.17,-48.34]],.018,'darkstone');
     }lamp(record.root,[x+s*3.2,1.90,-47.5],'#bb8bd9',1.5);
    }
   }
   if(c.parts){const detail=c.finish(record.root);detail.traverse(o=>o.userData.noCollision=true);roots.push(detail);parts+=c.parts;}
  }
  root.updateMatrixWorld(true);reports.push({region:region.id,treeMeshes:treeCount,ornamentParts:parts,buildings:settlements.records.filter(r=>r.region===region.id&&r.inspect!==false&&!r.district).length});
 }
 function enableLOD(region){
  for(const r of trees.filter(r=>r.region===region.id&&!r.lod)){
   if(!lowCache.has(r.original))lowCache.set(r.original,[rebuildBranches(r.original,.67),rebuildBranches(r.original,.45)]);
   lod.add(r.mesh,[cache.get(r.original),...lowCache.get(r.original)]);r.lod=true;
  }
 }
 function update(nightBlend){
  lod.update(world.camera);
  const enabled=nightBlend>.035||world.atlas?.buildings.inside===true;
  if(!enabled){lights.forEach(l=>{l.visible=false;l.intensity=0;});return;}
  for(const a of anchors)a.world.copy(a.position).applyMatrix4(a.root.matrixWorld);
  const nearby=anchors.filter(a=>a.world.distanceToSquared(world.camera.position)<70*70).sort((a,b)=>a.world.distanceToSquared(world.camera.position)-b.world.distanceToSquared(world.camera.position));
  lights.forEach((light,i)=>{const a=nearby[i];light.visible=!!a;if(!a){light.intensity=0;return;}light.position.copy(a.world);light.color.set(a.color);light.intensity=(2.5+nightBlend*17)*a.power;});
 }
 return{add,enableLOD,update,stats:()=>({regions:reports,branches:[...cache.values()].map(g=>g.userData.organicBranches||{unchanged:true}),branchLOD:lod.stats(),lanternAnchors:anchors.length,activeLights:lights.filter(l=>l.intensity>0).length}),dispose(){lod.dispose();trees.forEach(({mesh,original})=>mesh.geometry=original);for(const [original,g]of cache)if(g!==original)g.dispose();for(const [original,geos]of lowCache)for(const g of geos)if(g!==original)g.dispose();roots.forEach(r=>{r.traverse(o=>o.geometry?.dispose());r.removeFromParent();});effects.forEach(o=>{o.geometry.dispose();o.material.dispose();o.removeFromParent();});lights.forEach(l=>{l.removeFromParent();l.dispose();});}};
}
