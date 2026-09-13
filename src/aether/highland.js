import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {noiseGLSL} from './atmosphere.js';
export async function loadHighland(scene,maps,time){
 const decoder=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'forest/draco/');
 let gltf;try{gltf=await new GLTFLoader().setDRACOLoader(decoder).loadAsync(import.meta.env.BASE_URL+'highland/horncrest.glb');}finally{decoder.dispose();}
 const root=gltf.scene;root.name='Horncrest opposite shore';root.position.z=150;root.rotation.y=Math.PI;
 root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const m=o.material,kind=m.name.replace(/^HC /,'').replace(/\.\d+$/,'');m.envMapIntensity=.30;m.roughness=.92;
  if(kind==='pine')m.side=T.DoubleSide;
  if(!['rock','ground','wood','roof','mountain','ivory','pine'].includes(kind))return;
  m.onBeforeCompile=s=>{
   s.uniforms.hcMap={value:maps.color};s.uniforms.hcBump={value:maps.normal};s.uniforms.hcTime=time;
   s.vertexShader='varying vec3 hcPos;varying vec3 hcNormal;varying mat3 hcNormalMatrix;uniform float hcTime;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nhcPos=position;hcNormal=normal;hcNormalMatrix=normalMatrix;${kind==='pine'?'transformed.x+=sin(hcTime*1.1+position.y*.6+position.z)*.045;':''}`);
   s.fragmentShader='varying vec3 hcPos;varying vec3 hcNormal;varying mat3 hcNormalMatrix;uniform sampler2D hcMap;uniform sampler2D hcBump;\n'+noiseGLSL+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 p=hcPos*${kind==='wood'?'vec3(.7,.07,.7)':kind==='mountain'?'vec3(.09)':'vec3(.32)'};
    vec3 w=pow(abs(normalize(hcNormal)),vec3(4.));w/=max(.001,w.x+w.y+w.z);
    vec3 photo=texture2D(hcMap,p.yz).rgb*w.x+texture2D(hcMap,p.xz).rgb*w.y+texture2D(hcMap,p.xy).rgb*w.z;
    float detail=dot(photo,vec3(.2126,.7152,.0722));
    diffuseColor.rgb*=clamp(.68+detail*2.5,.72,1.3)*(.86+fbm(hcPos*.8)*.28);
   `);
   if(['rock','roof','wood','mountain','ground'].includes(kind))s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 nx=texture2D(hcBump,p.yz).xyz*2.-1.;vec3 ny=texture2D(hcBump,p.xz).xyz*2.-1.;vec3 nz=texture2D(hcBump,p.xy).xyz*2.-1.;vec3 signs=sign(hcNormal);
    vec3 mapped=normalize(vec3(nx.z*signs.x,nx.x,nx.y)*w.x+vec3(ny.x,ny.z*signs.y,ny.y)*w.y+vec3(nz.x,nz.y,nz.z*signs.z)*w.z);
    normal=normalize(mix(normal,hcNormalMatrix*mapped,.65));
   `);
  };m.customProgramCacheKey=()=>`horncrest-v2-${kind}`;
 });scene.add(root);return root;
}
export function createCrossings(scene,canvas,camera,go){
 const boards=[],textures=[];
 function sign(position,label,destination,angle){
  const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');x.fillStyle='#382a1c';x.fillRect(0,0,512,160);x.strokeStyle='#b49b6d';x.lineWidth=6;x.strokeRect(8,8,496,144);x.fillStyle='#eee4cb';x.font='48px "Songti SC",serif';x.textAlign='center';x.textBaseline='middle';x.fillText(label,256,82);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;textures.push(map);
  const group=new T.Group();group.position.fromArray(position);group.rotation.y=angle;
  const board=new T.Mesh(new T.BoxGeometry(3.8,1.2,.17),new T.MeshStandardMaterial({map,roughness:.9}));board.userData.destination=destination;group.add(board);
  const post=new T.Mesh(new T.CylinderGeometry(.10,.15,2.7,8),new T.MeshStandardMaterial({color:'#493720',roughness:1}));post.position.y=-1.25;group.add(post);scene.add(group);boards.push(board);
 }
 sign([-15,10,27],'对岸山城 →',7,.7);sign([-4,12,120],'浮空群岛 →',0,Math.PI);
 const ray=new T.Raycaster(),ndc=new T.Vector2();let down;
 function hit(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera);return ray.intersectObjects(boards)[0]?.object;}
 function start(e){down=[e.clientX,e.clientY];}
 function end(e){if(!down)return;const d=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(d<6){const o=hit(e);if(o)go(o.userData.destination);}}
 canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointerup',end);
 return {boards,dispose(){canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointerup',end);textures.forEach(t=>t.dispose());}};
}
