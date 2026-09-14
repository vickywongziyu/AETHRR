import {loadModel} from '../atlas/asset-loading.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// The patch contains the same 24 trees and leaves, translated as complete
// trees in Blender. Swap geometry before navigation or materials are indexed.
export async function applyRefinedGroves(source,decoder,buffer){
 const patch=await loadModel(new GLTFLoader().setDRACOLoader(decoder),import.meta.env.BASE_URL+'aether/refined-groves-v24.glb',{buffer});
 const names=['Sky garden trees','Sky garden canopy','Observatory trees','Observatory canopy'];
 const key=name=>name.replaceAll('_',' '),originals=new Map(),replacements=new Map();
 source.traverse(o=>{if(o.isMesh&&names.includes(key(o.name)))originals.set(key(o.name),o);});
 patch.scene.traverse(o=>{if(o.isMesh&&names.includes(key(o.name)))replacements.set(key(o.name),o);});
 if(originals.size!==4||replacements.size!==4)throw new Error('Refined grove geometry is incomplete');
 for(const name of names){
  const old=originals.get(name),next=replacements.get(name);
  if(!next.geometry.attributes.color)throw new Error('Refined grove vertex colours are missing');
  old.geometry=next.geometry;old.geometry.computeBoundingBox();old.geometry.computeBoundingSphere();
  old.userData.refinedGrove='v24';
 }
 const discarded=new Set();patch.scene.traverse(o=>{if(o.material)discarded.add(o.material);});discarded.forEach(m=>m.dispose());
 source.userData.refinedGroves={version:24,trees:24,meshes:4};
}
