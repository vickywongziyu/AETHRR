// Zero-intensity lights still consume Three.js light/shadow shader slots.
// Exclude them per pass, including portal views with their own lighting, and
// restore scene state even if a render fails. Dim but nonzero lights stay intact.
export function omitInactiveLights(renderer){
 const original=renderer.render;
 function render(scene,...args){
  const hidden=[];
  scene.traverseVisible(object=>{if(object.isLight&&object.intensity===0){hidden.push(object);object.visible=false;}});
  try{return original.call(this,scene,...args);}
  finally{for(const light of hidden)light.visible=true;}
 }
 renderer.render=render;
 return()=>{if(renderer.render===render)renderer.render=original;};
}
