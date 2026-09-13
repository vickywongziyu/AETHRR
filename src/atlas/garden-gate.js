import * as T from 'three';
import {portalMoteMaterial} from '../portals/light-motes.js';
import {PORTAL_DEPTH_GLSL,portalMotion,updatePortalMotion} from './portal-depth.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {detailSurface} from '../forest/surfaces.js';

// A rooted, three-dimensional doorway; its interaction is independent of Mira.
function doorway(time,violet=false){
 const group=new T.Group();group.name=violet?'Violet return woodland gate':'Cloud garden woodland gate';
 const wood=[],stone=[],moss=[],leaf=[];
 const color=violet?'#bc9fdb':'#79cdd0';
 const bark=new T.MeshStandardMaterial({color:'#634526',roughness:.94});detailSurface(bark,'bark');
 const rock=new T.MeshStandardMaterial({color:'#99805a',roughness:.95});detailSurface(rock,'stone');
 const green=new T.MeshStandardMaterial({color:violet?'#66604b':'#596437',roughness:1});
 const foliage=new T.MeshStandardMaterial({color:violet?'#877292':'#67783f',roughness:.9,side:T.DoubleSide});
 function tube(points,r,parts=wood){parts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,7,false));}
 for(const side of [-1,1]){
  tube([[side*1.95,.1,.4],[side*1.55,.65,.06],[side*1.57,1.7,0],[side*1.5,3.2,.04],[side*.95,4.35,0],[side*.12,4.65,.03]],.22);
  tube([[side*2.0,.1,-.4],[side*1.25,.42,-.12],[side*1.45,1.6,-.08],[side*1.3,3.2,-.06],[side*.55,4.45,.06]],.11);
  for(let i=0;i<3;i++)tube([[side*(1.4+i*.12),.5,.06],[side*(1.8+i*.19),.12,.25-i*.27],[side*(2.0+i*.16),.06,.5-i*.4]],.08);
  tube([[side*1.5,2.5,0],[side*2,3.12,.07],[side*2.25,3.48,.12]],.065);
  // Vines wind around the trunks, not a perfect manufactured torus.
  const vine=[];for(let i=0;i<55;i++){const y=.45+i/54*3.7;vine.push([side*(1.48-.53*Math.pow(y/4.2,4))+.23*Math.cos(i*.55),y,.23*Math.sin(i*.55)]);}tube(vine,.035,moss);
 }
 for(let i=0;i<3;i++){
  const g=new T.CylinderGeometry(2.18-i*.15,2.27-i*.15,.14,14);g.scale(1,1,.61);g.translate(0,.07+i*.14,0);stone.push(g);
 }
 for(let i=0;i<45;i++){
  const a=i*2.399,side=i%2?1:-1,y=.65+(i%19)/19*3.9;
  const g=new T.IcosahedronGeometry(.13,1);g.scale(1.8,.6,1);g.translate(side*(1.52-.72*Math.pow(y/4.8,4)),y,.12+Math.sin(a)*.12);moss.push(g);
 }
 for(let i=0;i<160;i++){
  const angle=i*2.399,side=i%2?1:-1,y=2.65+(Math.sin(i*7.31)*.5+.5)*2;
  const g=new T.SphereGeometry(1,5,3);g.scale(.085,.22,.028);g.rotateZ(angle);g.rotateY(angle*.6);
  g.translate(side*(1.28-.9*Math.pow((y-2.5)/2.3,2))+.3*Math.sin(i*8.3),y,.15+Math.cos(i*3.8)*.25);leaf.push(g);
 }
 for(const [parts,mat] of [[wood,bark],[stone,rock],[moss,green],[leaf,foliage]]){
  const normalized=parts.map(p=>p.index?p.toNonIndexed():p);
  const g=mergeGeometries(normalized);new Set([...parts,...normalized]).forEach(p=>p.dispose());const m=new T.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);
 }
 const crystalMat=new T.MeshPhysicalMaterial({color,roughness:.13,metalness:.05,transmission:.55,thickness:.6,ior:1.45,attenuationColor:new T.Color(color),attenuationDistance:1.2,emissive:color,emissiveIntensity:.22});
 for(const [x,y,s] of [[0,4.8,.5],[-1.8,.65,.38],[1.8,.65,.38],[-1.33,3.7,.18],[1.33,3.7,.18]]){
  const c=new T.Mesh(new T.OctahedronGeometry(1,0),crystalMat);c.position.set(x,y,.12);c.scale.set(s*.42,s,s*.42);group.add(c);
 }
 const surface=new T.Mesh(new T.CircleGeometry(1,64),new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{gateTime:time,portalMotion,tint:{value:new T.Color(color)},gateActive:{value:1}},vertexShader:'varying vec2 gateUv;void main(){gateUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
  uniform float gateTime;uniform vec3 tint;uniform float gateActive;varying vec2 gateUv;
  ${PORTAL_DEPTH_GLSL}
  void main(){vec2 p=gateUv*2.-1.;float r=length(p),a=atan(p.y,p.x);
   float rim=pow(smoothstep(.68,1.,r),3.);
   float veil=.5+.5*sin(p.y*11.+sin(p.x*7.+gateTime*.4)*1.5-gateTime*.55);
   float filigree=pow(max(0.,sin(a*7.+r*19.-gateTime*.5)),18.)*smoothstep(.35,.95,r);
   vec3 c=mix(tint*.35,tint,veil*.4+rim*.6)+filigree*tint*.25;
   float alpha=(.19+veil*.1+rim*.48+filigree*.16)*(1.-smoothstep(.97,1.,r))*(.65+.35*gateActive);
   c=mix(c,portalDepth(gateUv,gateTime,tint),.78);
   gl_FragColor=vec4(c,max(alpha,.61*(1.-smoothstep(.93,1.,r))));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`}));
 surface.position.set(0,2.43,.09);surface.scale.set(1.28,1.96,1);group.add(surface);
 const dots=[];for(let i=0;i<50;i++){const a=i*2.399;dots.push(Math.cos(a)*(1.2+(i%5)*.13),.8+(i%17)*.24,Math.sin(a)*.6);}
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(dots,3));
 const motes=new T.Points(pg,portalMoteMaterial({color,size:.04,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));group.add(motes);
 const light=new T.PointLight(color,2.5,5,2);light.position.set(0,2,.5);group.add(light);group.userData.noCollision=true;
 return {group,surface,motes,dots,crystalMat};
}

function originalForestGate(root,time){
 let rim;root.traverse(o=>{if(o.isMesh&&/Portal[ _]luminous[ _]rim/i.test(o.name))rim=o;});
 if(!rim)throw new Error('Original Violet portal rim unavailable');
 rim.geometry.computeBoundingBox();const bounds=rim.geometry.boundingBox.clone().applyMatrix4(rim.matrix);
 const half=(bounds.max.x-bounds.min.x)/2-.035,height=bounds.max.y-bounds.min.y-.07,shoulder=height-2.5;
 const group=new T.Group();group.name='Original Violet portal interaction';group.userData.noCollision=true;
 group.position.set((bounds.min.x+bounds.max.x)/2,bounds.min.y+.035,bounds.max.z+.025);
 const shape=new T.Shape();shape.moveTo(-half,0);shape.lineTo(-half,shoulder);
 for(let i=1;i<=24;i++){const t=i/24;shape.lineTo(-half*(1-t**1.55),shoulder+t*2.5);}
 for(let i=1;i<=24;i++){const t=1-i/24;shape.lineTo(half*(1-t**1.55),shoulder+t*2.5);}shape.lineTo(half,0);shape.closePath();
 const geometry=new T.ShapeGeometry(shape),pos=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/(half*2)+.5,pos.getY(i)/height);
 const material=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{gateTime:time,portalMotion},vertexShader:'varying vec2 gateUv;void main(){gateUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
  uniform float gateTime;varying vec2 gateUv;
  ${PORTAL_DEPTH_GLSL}
  void main(){float x=abs(gateUv.x-.5)*2.;float wave=sin(gateUv.y*18.+sin(gateUv.x*16.+gateTime*.6)*3.-gateTime*1.5);
   float ribbon=pow(max(0.,sin(gateUv.x*31.+sin(gateUv.y*8.-gateTime*.7)*2.2)),14.);
   float edge=(1.-smoothstep(.78,1.,x))*smoothstep(0.,.08,gateUv.y);
   vec3 depth=portalDepth(gateUv,gateTime,vec3(.68,.37,.92));
   gl_FragColor=vec4(depth+vec3(.18,.08,.28)*ribbon,.17+edge*(.51+ribbon*.12));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const surface=new T.Mesh(geometry,material);surface.name='Original Violet pointed portal veil';group.add(surface);root.add(group);root.updateMatrixWorld(true);
 // Reuse the original portal chapter's viewing distance: visitors arrive in
 // front of the actual arch, instead of at a second gate near the forest entry.
 const arrival={position:group.localToWorld(new T.Vector3(0,1.2,9.4)),target:group.localToWorld(new T.Vector3(0,3,0))};
 return {group,surface,labelHeight:height+.1,labelDistance:110,arrival,rim};
}

export function createGardenGate({world,source,nav,time,regions,atlasGates,activate,isBlocked}){
 const {scene,camera,renderer}=world,canvas=renderer.domElement,forest=regions.find(r=>r.id==='forest');
 let floating;source.traverse(o=>{if(o.userData.floating&&/^Sky[ _]garden$/i.test(o.name))floating=o;});
 if(!floating)throw new Error('Cloud garden floating anchor unavailable');
 const floatPos=new T.Vector3();floating.getWorldPosition(floatPos);const baseFloat=floatPos.y;
 const ground=nav.height(-25.6,-22.8,32.7,31.5)??32.12;
 const first=doorway(time);first.group.position.set(-25.6,ground,-22.8);first.group.rotation.y=-.66;scene.add(first.group);
 first.sourceRegion='aether';first.label='前往紫境';first.destination='forest';first.run=()=>activate('forest',first);first.anchor=first.group.position.clone();
 const gates=[first],ray=new T.Raycaster(),ndc=new T.Vector2(),point=new T.Vector3();let down,lastUI=-1,returnGate,disposed=false;
 function addButton(g){const button=document.createElement('button');button.className='woodland-gate-label';button.textContent=g.label+' · 点击传送';button.setAttribute('aria-label',g.label+'，通过传送门');button.dataset.gateDestination=g.destination;button.hidden=true;button.onclick=()=>g.run();document.body.append(button);g.button=button;}
 addButton(first);
 function hit(e){const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects(gates.map(g=>g.surface),false);if(!hits.length)return;
  const h=hits[0],gate=gates.find(g=>g.surface===h.object);if(gate.containsUv&&!gate.containsUv(h.uv))return;nav.sync();if(nav.obstructed(camera.position,h.point,.001))return;
  return gate;
 }
 const start=e=>{if(e.button===0)down=[e.clientX,e.clientY];};
 const end=e=>{if(!down)return;const delta=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(delta>6||isBlocked())return;hit(e)?.run();};
 const cancel=()=>down=null;
 canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',cancel);
 function update(seconds){
  if(disposed)return;updatePortalMotion();floating.getWorldPosition(floatPos);first.group.position.y=ground+floatPos.y-baseFloat;
  if(forest.status==='ready'&&!returnGate){
   returnGate=originalForestGate(forest.root,time);returnGate.sourceRegion='forest';returnGate.label='前往精灵水庭';returnGate.destination='watercourt';returnGate.run=()=>activate('watercourt',returnGate);gates.push(returnGate);addButton(returnGate);
  }
  for(const g of atlasGates){
   if(!['watercourt','valley'].includes(g.region.id)||g.button)continue;
   g.sourceRegion=g.region.id;g.destination=g.region.id==='watercourt'?'valley':'aether';
   g.label=g.destination==='valley'?'前往北境河谷':'返回云上花园';g.run=()=>activate(g.destination,g);
   g.labelHeight??=3.25;g.labelDistance=65;g.external=true;
   const target=g.group.position.clone().add(new T.Vector3(0,(g.centerHeight??1.6)*g.group.scale.y,0));
   // Reuse each landscape's established lakeshore/summit portal viewpoint.
   const position=new T.Vector3(...g.region.portalSite.view).multiplyScalar(g.region.scale).add(new T.Vector3(...g.region.offset));
   g.group.rotation.y=Math.atan2(position.x-target.x,position.z-target.z);g.arrival={position,target};
   gates.push(g);addButton(g);
  }
  first.surface.material.uniforms.gateActive.value=forest.status==='ready'?1:0;
  for(const g of gates){if(g.motes){const p=g.motes.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,g.dots[i*3+1]+Math.sin(seconds*.7+i)*.12);p.needsUpdate=true;g.crystalMat.emissiveIntensity=.2+Math.sin(seconds*.9)*.06;}}
  // Labels still follow camera movement when the scene animation is paused.
  const uiTime=performance.now()/1000;if(uiTime-lastUI<.1&&lastUI>=0)return;lastUI=uiTime;
  for(const g of gates){
   g.group.updateMatrixWorld(true);point.set(0,g.labelHeight??5.65,0);g.group.localToWorld(point);const distance=point.distanceTo(camera.position);point.project(camera);
   g.button.hidden=isBlocked()||distance>(g.labelDistance??65)||point.z< -1||point.z>1||Math.abs(point.x)>.94||Math.abs(point.y)>.84;
   if(!g.button.hidden){
    let x=(point.x*.5+.5)*innerWidth,y=(-point.y*.5+.5)*innerHeight;
    if(innerWidth<=700){
     // Keep the label attached to its projected gate, but move it around the
     // mobile HUD so its complete text and touch target remain accessible.
     const width=g.button.offsetWidth,height=g.button.offsetHeight;
     x=T.MathUtils.clamp(x,width/2+8,innerWidth-width/2-8);y=Math.max(height+8,y);
     for(const selector of ['.world-toolbar','.world-minimap','.atlas-message','.atlas-controls']){
      const el=document.querySelector(selector);if(!el||!el.getClientRects().length)continue;const r=el.getBoundingClientRect();
      if(x+width/2<=r.left||x-width/2>=r.right||y<=r.top||y-height>=r.bottom)continue;
      if(r.left-width-16>=0)x=r.left-width/2-8;
      else if(r.bottom+height+8<innerHeight-8)y=r.bottom+height+8;
      else y=r.top-8;
     }
    }
    g.button.style.left=x+'px';g.button.style.top=y+'px';
   }
  }
  for(const g of gates){const r=regions.find(r=>r.id===g.destination);g.button.textContent=r.status==='loading'?g.label+' · 正在连接…':r.status==='error'?g.label+' · 重新连接':g.label+' · 点击传送';}
  document.body.dataset.routeGateVisible=String(gates.some(g=>!g.button.hidden));
  document.body.dataset.gardenGateVisible=String(!first.button.hidden);
 }
 return {gates,anchor:floating,get arrival(){return returnGate?.arrival;},arrivalFor(id){return id==='forest'?returnGate?.arrival:gates.find(g=>g.region?.id===id)?.arrival;},update,dispose(){disposed=true;canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointerup',end);canvas.removeEventListener('pointercancel',cancel);gates.forEach(g=>{g.button.remove();if(g.external)return;g.group.removeFromParent();g.group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});});}};
}
