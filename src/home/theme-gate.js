import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {addStonePortalFrame,stoneArch,archBlock,STONE_VEIL_VERTEX} from '../portals/stone-frame.js';
import {VEIL_FLOW_FRAGMENT} from './veil-flow.js';
import {CITIES} from '../atlas/atlas-ui-data.js';
import {createThresholdMaterials,stoneUV} from './theme-materials.js';

export function createThemeGate(){
 const group=new T.Group();group.name='Aether · engraved five-city threshold';
 const m=createThresholdMaterials(),clock={value:0},crystals=[],cloth=[];
 const carved=addStonePortalFrame(group,{stone:'#8b9193',color:'#c7b17e'},{plinth:false});
 carved.frame.material.dispose();carved.frame.material=m.stone;stoneUV(carved.frame.geometry);
 carved.inscription.material.emissiveIntensity=.13;
 const arch=stoneArch();
 function add(g,mat,p=[0,0,0]){const mesh=new T.Mesh(g,mat);mesh.position.fromArray(p);mesh.castShadow=mesh.receiveShadow=true;if(mat===m.stone)stoneUV(g);group.add(mesh);return mesh;}
 function box(w,h,d,p,mat=m.stone,r=.045){return add(new RoundedBoxGeometry(w,h,d,2,r),mat,p);}
 function line(points,r=.014,mat=m.brass){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*5),r,6,false),mat);}
 function circle(r,p,mat=m.brass,tube=.013){return add(new T.TorusGeometry(r,tube,6,96),mat,p);}
 // Two extra concentric courses and a continuous dark recessed arch.
 for(let course=0;course<2;course++)for(let i=0;i<27;i++){
  const g=archBlock(arch,i/27+.0007,(i+1)/27-.0007,.18,.23);g.scale(1.13+course*.12,1.025+course*.035,1);g.translate(0,0,-.15-course*.22);add(g,m.stone);
 }
 for(const offset of[0,.36]){const trim=new T.TubeGeometry(arch,160,.037,8,false);trim.scale(1.085,1.018,1);trim.translate(0,0,.29-offset);add(trim,m.aged);}
 // Radial block courses include real vertical seams and a top paving surface.
 for(let level=0;level<3;level++){
  const radius=4.4-level*.18,y=-.47+level*.2,count=32;
  for(let i=0;i<count;i++){const angle=(i+.5)*Math.PI*2/count+(level%2)*Math.PI/count;const block=box(2*radius*Math.sin(Math.PI/count)-.018,.195,.46,[Math.sin(angle)*radius,y,Math.cos(angle)*radius],m.stone,.025);block.rotation.y=angle;}
  add(new T.CylinderGeometry(radius-.16,radius-.16,.19,64),m.stone,[0,y,0]);
 }
 // Wedge paving with separated joints, instead of a smooth pedestal.
 for(let ring=0;ring<4;ring++)for(let i=0;i<24;i++){const a=i*Math.PI/12+.006,shape=new T.Shape(),r0=.32+ring*1.02,r1=r0+1.005;
  shape.absarc(0,0,r1,a,a+Math.PI/12-.012,false);shape.absarc(0,0,r0,a+Math.PI/12-.012,a,true);shape.closePath();const slab=add(new T.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelThickness:.014,bevelSize:.014,bevelSegments:1,steps:1,curveSegments:3}),m.stone,[0,.045,0]);slab.rotation.x=-Math.PI/2;
 }
 for(const r of[1.05,2.12,3.16,4.15]){const c=circle(r,[0,.16,0],m.brass,.012);c.rotation.x=-Math.PI/2;}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[Math.sin(a)*.16,.165,Math.cos(a)*.16],[Math.sin(a)*3.3,.165,Math.cos(a)*3.3]],.013,m.brass);}
 // Buttresses, fluted columns, metal collars and hanging standards.
 for(const side of[-1,1]){
  for(let i=0;i<8;i++)box(.62,.42,.78,[side*2.63,.33+i*.44,-.08],m.stone,.035);
  for(const [y,w,h]of[[.25,.92,.23],[.57,.78,.16],[3.54,.83,.19],[3.8,.91,.19]])box(w,h,.98,[side*2.63,y,0]);
  for(const dx of[-.19,.19]){
   add(new T.CylinderGeometry(.095,.12,2.8,12),m.stone,[side*2.63+dx,1.97,.46]);
   for(const y of[.72,1.2,2.65,3.36])add(new T.CylinderGeometry(.126,.126,.07,12),m.brass,[side*2.63+dx,y,.46]);
  }
  const fabric=new T.PlaneGeometry(.56,2.24,8,24),v=fabric.attributes.position;
  for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i);v.setZ(i,Math.sin(x*18)*.034);if(y<-.86)v.setY(i,y+.23*Math.abs(x)/.28);}fabric.computeVertexNormals();
  const banner=add(fabric,m.cloth,[side*2.91,2.06,.63]);cloth.push(banner);
  line([[side*2.91-.255,3.15,.68],[side*2.91-.255,1.11,.68],[side*2.91,.92,.68],[side*2.91+.255,1.11,.68],[side*2.91+.255,3.15,.68]],.01);
  // Real wire compass embroidery atop the dark cloth.
  circle(.16,[side*2.91,2.05,.68],m.brass,.008);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;line([[side*2.91+Math.sin(a)*.28,2.05+Math.cos(a)*.28,.68],[side*2.91,2.05,.69]],.008);}
  line([[side*2.91-.34,3.2,.64],[side*2.91+.34,3.2,.64]],.025);
  // Hexagonal lantern, framed panes, filigree crown and actual warm light.
  const x=side*2.31,y=.84,z=.94;
  add(new T.CylinderGeometry(.15,.15,.42,6),m.warm,[x,y,z]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[x+Math.sin(a)*.185,y-.23,z+Math.cos(a)*.185],[x+Math.sin(a)*.185,y+.23,z+Math.cos(a)*.185]],.018,m.aged);}
  for(const dy of[-.26,.26])add(new T.CylinderGeometry(.235,.235,.08,6),m.brass,[x,y+dy,z]);
  add(new T.ConeGeometry(.24,.27,6),m.brass,[x,y+.43,z]);circle(.07,[x,y+.64,z],m.brass,.015);
  box(.48,.15,.48,[x,.42,z],m.stone,.035);
  const light=new T.PointLight('#ffd397',1.8,5,2);light.position.set(x,y,z+.25);group.add(light);
 }
 // Brass keystones, rivets and a suspended astrolabe.
 for(let i=1;i<11;i++){const p=arch.getPointAt(i/12);const n=arch.getTangentAt(i/12);const collar=box(.4,.065,.07,[p.x*1.12,p.y*1.025,.37],m.brass,.018);collar.rotation.z=-Math.atan2(n.x,n.y);for(const d of[-.15,.15])add(new T.SphereGeometry(.026,6,4),m.brass,[p.x*1.12+d,p.y*1.025,.43]);}
 for(const r of[.25,.39])circle(r,[0,5.22,.56],m.brass,.018);
 line([[0,6.8,.52],[0,4.65,.56]],.021);line([[-.52,5.22,.56],[.52,5.22,.56]],.021);
 for(const side of[-1,1])line([[0,5.75,.56],[side*.15,5.22,.6],[0,4.69,.56]],.026);
 const crown=new T.OctahedronGeometry(.24,0);const jewel=add(crown,m.brass,[0,6.64,.41]);jewel.scale.set(.65,1.5,.5);
 const positions=[[0,7.35,.05],[-2.12,6.28,.05],[2.12,6.28,.05],[-3.17,4.7,.05],[3.17,4.7,.05]];
 CITIES.forEach((city,i)=>{
  const mat=new T.MeshPhysicalMaterial({color:city.color,roughness:.08,metalness:0,transmission:.76,thickness:.75,ior:1.46,attenuationColor:new T.Color(city.color),attenuationDistance:1.5,envMapIntensity:1.6,clearcoat:1});
  const crystalGeo=new T.LatheGeometry([new T.Vector2(0,-.65),new T.Vector2(.24,-.22),new T.Vector2(.25,.27),new T.Vector2(0,.7)],6);crystalGeo.computeVertexNormals();const crystal=add(crystalGeo,mat,positions[i]);crystal.name='City crystal · '+city.id;crystals.push(crystal);
  const edges=new T.LineSegments(new T.EdgesGeometry(crystalGeo,12),new T.LineBasicMaterial({color:city.color,transparent:true,opacity:.75}));crystal.add(edges);
  const core=new T.Mesh(new T.OctahedronGeometry(.16,0),new T.MeshBasicMaterial({color:city.color}));core.scale.set(.4,2.3,.4);crystal.add(core);
  for(const side of[-1,1])line([[positions[i][0]+side*.18,positions[i][1]-.38,.05],[positions[i][0]+side*.09,positions[i][1]-.66,.05],[positions[i][0],positions[i][1]-.73,.05]],.022,m.brass);
 });
 // Restrained orbit lines follow the crest instead of crossing the entire facade.
 const orbital=new T.MeshBasicMaterial({color:'#c8b383',transparent:true,opacity:.24,depthWrite:false});
 for(let i=0;i<2;i++){const ring=circle(4.05+i*.31,[0,3.63,-.65],orbital,.006);ring.scale.set(1,.88,1);ring.rotation.z=.12;}
 const equator=circle(3.8,[0,3.8,.0],orbital,.007);equator.rotation.x=1.29;equator.scale.y=.5;
 const points=[];for(let i=0;i<180;i++){const a=i*2.399,r=3.9+Math.sin(i*11)*.4;points.push(Math.cos(a)*r,3.6+Math.sin(a)*r*.85,Math.cos(i*13)*.4);}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:'#e9d8b5',size:.028,transparent:true,opacity:.85,depthWrite:false}));group.add(dust);
 // A volumetric impression from translucent fluid layers and real distant architecture.
 const veilReady={value:0},veilTexture=new T.TextureLoader().load(import.meta.env.BASE_URL+'atlas/home/portal-veil-v42.jpg',()=>veilReady.value=1);veilTexture.colorSpace=T.SRGBColorSpace;
 const portalMaterial=new T.ShaderMaterial({uniforms:{uTime:clock,veilTexture:{value:veilTexture},veilReady},vertexShader:STONE_VEIL_VERTEX,fragmentShader:VEIL_FLOW_FRAGMENT,transparent:true,side:T.DoubleSide,depthWrite:false});
 const surface=add(carved.aperture,portalMaterial,[0,3.43,.065]);surface.name='Interactive_portal_surface';surface.castShadow=false;surface.renderOrder=3;
 const inner=new T.Group();inner.name='Beyond the veil · floating citadel';group.add(inner);
 const silhouette=new T.MeshStandardMaterial({color:'#528080',roughness:.8,emissive:'#254e52',emissiveIntensity:.6});
 for(const [x,y,scale]of[[-.62,3.8,.64],[.55,2.4,.47],[.3,4.9,.27]]){
  const island=new T.Mesh(new T.DodecahedronGeometry(.65,1),silhouette);island.position.set(x,y,-.8);island.scale.set(scale,scale*.4,scale*.7);inner.add(island);
  for(let i=0;i<4;i++){const h=.3+(i%3)*.18,tower=new T.Mesh(new T.CylinderGeometry(.05,.075,h,8),silhouette);tower.position.set(x+(i-1.5)*.18*scale,y+h/2+.13,-.8);inner.add(tower);const roof=new T.Mesh(new T.ConeGeometry(.095,.22,6),silhouette);roof.position.copy(tower.position);roof.position.y+=h/2+.1;inner.add(roof);}
 }
 const glow=new T.PointLight('#b2ece3',7,9,2);glow.position.set(0,2.8,1.1);group.add(glow);
 // Static opaque architecture shares material batches; crystals/cloth/shaders remain independent.
 group.updateMatrixWorld(true);const batches=new Map();for(const child of [...group.children]){if(!child.isMesh||![m.stone,m.brass,m.aged].includes(child.material))continue;const raw=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();raw.applyMatrix4(child.matrix);for(const attr of Object.keys(raw.attributes))if(!['position','normal','uv'].includes(attr))raw.deleteAttribute(attr);if(!raw.attributes.uv)raw.setAttribute('uv',new T.BufferAttribute(new Float32Array(raw.attributes.position.count*2),2));if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(raw);child.removeFromParent();child.geometry.dispose();}
 for(const[mat,parts]of batches){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,mat);mesh.name='Threshold · batched '+(mat===m.stone?'stone':'metal');mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
 return{group,materials:m,surface,animate(time){clock.value=time;dust.rotation.z=time*.009;crystals.forEach((c,i)=>{c.rotation.y=time*.13+i;c.position.y=positions[i][1]+Math.sin(time*.7+i)*.035;});for(const banner of cloth)banner.rotation.y=Math.sin(time*.8+banner.position.x)*.016;inner.position.y=Math.sin(time*.25)*.04;}};
}
