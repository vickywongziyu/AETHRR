import * as T from 'three';
import {Craft} from './architecture-kit.js';
import {plaque} from './building-fixtures.js';
import {walkway} from './waterfront-architecture.js';
export function createFerryArchitecture(art,nav){
 const {root,boat,mats}=art,removers=[],c=new Craft(mats,'晨露 · 闭合船壳与船具');
 // Closed curved hull beneath the preserved plank deck; both ends can lead.
 const hull=new T.SphereGeometry(1,32,20);hull.scale(1.21,.52,3.72);c.add(hull,'wood',[0,-.12,0]);
 for(const z of [-2.1,2.1]){c.box([0,.97,z],[1.78,.055,.31],'cloth');for(const x of [-.72,.72])c.box([x,.65,z],[.1,.4,.25]);}
 for(const end of [-1,1]){for(const side of [-1,1])c.line([[side*1,.85,end*2],[side*.55,.85,end*3.45],[0,1.08,end*3.9]],.06,'trim');c.lamp([0,1.09,end*3.25],.28);c.ring([0,.57,end*3],.2,.035,'leather');}
 c.crystal([0,3.92,-2.6],.28,.1);const detail=c.finish(boat);
 boat.userData.ferryAction='board';boat.traverse(o=>{if(o.isMesh){o.userData.noCollision=true;removers.push(nav.addDynamic(o,{walkable:true}));}});
 const d=new Craft(mats,'西岸林堤 · 桩基栈桥');
 walkway(d,[-35,.66,35],[-30,1.2,41],2.2);walkway(d,[-30,1.2,41],[-30,1.2,48],2.3,{openings:[{side:1,start:3.2/7,end:4.8/7}]});
 d.box([-28.9,1.235,45],[.8,.11,1.15]);for(const z of [42,47]){d.lamp([-30.8,2.3,z],.45);d.tube([-30.8,1.3,z],[-30.8,2.3,z],.065);}
 const dock=d.finish(root);dock.userData.ferryAction='west';
 // Short top triangles let the walking capsule step off the ramp onto the deck.
 art.gangProxy.geometry.dispose();art.gangProxy.geometry=new T.BoxGeometry(2.4,.11,1.15,12,1,4);
 const westGang=art.gangplank.clone();westGang.name='西岸 · 可升降舷梯';westGang.position.set(-28.52,1.24,45);root.add(westGang);westGang.traverse(o=>{if(o.isMesh)o.userData.noCollision=true;});const proxy=westGang.children.find(o=>o.isMesh&&!o.visible);if(proxy)removers.push(nav.addDynamic(proxy,{walkable:true}));
 const signs=[plaque(root,'西岸林堤',[-30.75,2.4,44],.8),plaque(root,'晨露渡舟',[23,2.5,47],.8)];for(const [i,sign]of signs.entries()){sign.userData.ferryAction=i?'front':'west';sign.traverse(o=>{if(o.isMesh)o.userData.noCollision=true;});}
 const foamMaterial=new T.MeshBasicMaterial({color:'#d7ece1',transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide});foamMaterial.onBeforeCompile=s=>{s.vertexShader='varying vec2 ferryUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nferryUv=uv;');s.fragmentShader='varying vec2 ferryUv;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= (1.-smoothstep(.18,.5,abs(ferryUv.x-.5)))*(1.-smoothstep(.22,.5,abs(ferryUv.y-.5)));');};
 const foam=new T.InstancedMesh(new T.PlaneGeometry(.14,.48),foamMaterial,100);foam.name='晨露 · 漂散尾流';foam.userData.noCollision=true;foam.frustumCulled=false;root.add(foam);const dummy=new T.Object3D();dummy.scale.setScalar(0);dummy.updateMatrix();for(let i=0;i<100;i++)foam.setMatrixAt(i,dummy.matrix);
 return{detail,dock,westGang,proxy,signs,foam,dummy,dispose(){removers.forEach(fn=>fn());foam.geometry.dispose();foamMaterial.dispose();foam.removeFromParent();for(const s of signs){s.material.map?.dispose();s.material.dispose();}/* Shared gang geometry belongs to art. */}};
}
