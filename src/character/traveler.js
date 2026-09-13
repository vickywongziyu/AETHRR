import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {createLocomotion} from './locomotion.js';
import {createFlightAttitude} from './flight-attitude.js';
import {createFlightWardrobe} from './flight-wardrobe.js';

// One character instance follows the atlas position across every region.
export async function loadTraveler(scene){
 const decoder=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'forest/draco/');
 let gltf;
 try{gltf=await new GLTFLoader().setDRACOLoader(decoder).loadAsync(import.meta.env.BASE_URL+'character/mira-cloth-v7.glb');}
 finally{decoder.dispose();}
 const avatar=new T.Group();avatar.name='Mira_Atlas_Traveler';avatar.visible=false;
 const pivot=new T.Group();pivot.name='Mira_Flight_Attitude';pivot.position.y=.96;gltf.scene.position.y=-.96;pivot.add(gltf.scene);avatar.add(pivot);
 const attitude=createFlightAttitude(pivot);
 avatar.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 scene.add(avatar);
 const locomotion=createLocomotion(gltf.scene,gltf.animations);
 locomotion.update(0,{});
 const wardrobe=createFlightWardrobe(avatar);let flyingOutfit=false;
 const fill=new T.PointLight('#f0e6ff',2.5,5,2);fill.visible=false;scene.add(fill);
 const q=new T.Quaternion(),up=new T.Vector3(0,1,0);
 return {avatar,clearance:wardrobe.clearance,get animation(){return locomotion.animation;},get playbackRate(){return locomotion.playbackRate;},get outfit(){return flyingOutfit?'flight-cloak':'travel-cloak';},get cloakOpacity(){return wardrobe.amount;},setVisible(value){avatar.visible=fill.visible=value;},
  update(dt,position,direction,{moving=false,running=false,flying=false,snap=false,speed=0,verticalSpeed=0,reset=false}={}){
   avatar.position.copy(position);
   if(direction.lengthSq()>1e-8){q.setFromAxisAngle(up,Math.atan2(direction.x,direction.z));if(snap)avatar.quaternion.copy(q);else avatar.quaternion.slerp(q,1-Math.exp(-dt*12));}
   locomotion.update(dt,{moving,running,flying,speed});attitude.update(dt,{flying,verticalSpeed,reset});avatar.userData.flight=attitude.state;
   flyingOutfit=flying;wardrobe.update(dt,{flying,speed,verticalSpeed,reset});avatar.userData.cloth=wardrobe.state;
   fill.position.copy(position);fill.position.y+=2.4;
  },dispose(){wardrobe.dispose();locomotion.dispose();scene.remove(avatar,fill);const textures=new Set();avatar.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}});textures.forEach(t=>t.dispose());fill.dispose();}
 };
}
