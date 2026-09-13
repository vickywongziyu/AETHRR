import * as T from 'three';
import {paintedNoiseGLSL} from '../atlas/painted-surface.js';

export function createThresholdMaterials(){
 const loader=new T.TextureLoader(),base=import.meta.env.BASE_URL+'aether/textures/';
 const textures=['rock-color.jpg','rock-normal.jpg','rock-rough.jpg'].map(name=>loader.load(base+name));
 for(const t of textures){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;}
 textures[0].colorSpace=T.SRGBColorSpace;
 const stone=new T.MeshStandardMaterial({color:'#566d80',map:textures[0],normalMap:textures[1],roughnessMap:textures[2],roughness:.94,normalScale:new T.Vector2(.48,.48)});
 const brass=new T.MeshStandardMaterial({color:'#bba16b',metalness:.82,roughness:.32});
 const aged=new T.MeshStandardMaterial({color:'#5d543b',metalness:.72,roughness:.48});
 const cloth=new T.MeshStandardMaterial({color:'#162b40',roughness:1,side:T.DoubleSide});
 brass.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 agedMetalPos;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nagedMetalPos=position;');shader.fragmentShader='varying vec3 agedMetalPos;\n'+paintedNoiseGLSL+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.72+.36*paintNoise(agedMetalPos*9.);');};brass.customProgramCacheKey=()=> 'threshold-aged-metal-v42';
 const warm=new T.MeshStandardMaterial({color:'#fff1cc',emissive:'#ffd48c',emissiveIntensity:.85,roughness:.6});
 return{stone,brass,aged,cloth,warm,textures};
}

// Object-space planar UVs for the carved arch, which originally has no UVs.
export function stoneUV(geometry){
 const pos=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(pos.count*2);
 for(let i=0;i<pos.count;i++){const axis=Math.abs(n.getY(i))>.65?'y':Math.abs(n.getX(i))>.7?'x':'z';uv[i*2]=(axis==='x'?pos.getZ(i):pos.getX(i))*.55;uv[i*2+1]=(axis==='y'?pos.getZ(i):pos.getY(i))*.55;}
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));return geometry;
}
