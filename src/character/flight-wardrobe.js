import {createGarmentClearance} from './garment-clearance.js';
import {createClothDynamics} from './cloth-dynamics.js';

// The travel cloak remains worn on the ground. Gravity and airflow change its
// shape continuously, without hiding it or exchanging the character model.
export function createFlightWardrobe(avatar){
 const garments=new Set();
 avatar.traverse(object=>{
  if(!object.userData.travelCloth&&!object.userData.flightOnly&&!/^Mira_Flight_(Cape|Collar|Clasp)/.test(object.name))return;
  garments.add(object);object.visible=true;
  object.traverse(child=>{for(const material of child.material?(Array.isArray(child.material)?child.material:[child.material]):[]){material.transparent=false;material.opacity=1;material.depthWrite=true;}});
 });
 const cloth=createClothDynamics(avatar),clearance=createGarmentClearance(avatar);
 return {get amount(){return 1;},get count(){return garments.size;},get state(){return cloth.state;},clearance,dispose(){clearance.dispose();},
  update(dt,options){cloth.update(dt,typeof options==='boolean'?{flying:options}:options);clearance.update();}
 };
}
