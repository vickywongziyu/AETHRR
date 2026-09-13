import * as T from 'three';
import { Water } from 'three/addons/objects/Water.js';
export function addAtmosphere(scene,rand,mobile){
 // Periodic analytic normal field, kept local and deterministic.
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
  const nx=.24*Math.cos(u*4+v*3)+.13*Math.cos(u*9-v*7)+.08*Math.cos(u*17+v*11);
  const ny=.24*Math.sin(u*3-v*5)+.13*Math.sin(u*8+v*9)+.08*Math.sin(u*13-v*19);
  const n=new T.Vector3(nx,ny,1).normalize(),i=(y*size+x)*4;data[i]=(n.x*.5+.5)*255;data[i+1]=(n.y*.5+.5)*255;data[i+2]=(n.z*.5+.5)*255;data[i+3]=255;
 }
 const normals=new T.DataTexture(data,size,size);normals.wrapS=normals.wrapT=T.RepeatWrapping;normals.magFilter=T.LinearFilter;normals.minFilter=T.LinearMipmapLinearFilter;normals.generateMipmaps=true;normals.needsUpdate=true;
 const water=new Water(new T.PlaneGeometry(180,180),{textureWidth:mobile?512:1024,textureHeight:mobile?512:1024,waterNormals:normals,sunDirection:new T.Vector3(-.6,.72,-.35),sunColor:'#fce2ba',waterColor:'#292439',distortionScale:.85,fog:true});water.rotation.x=-Math.PI/2;water.position.set(0,.015,-15);water.material.uniforms.size.value=3.2;water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.20;').replace('vec3 outgoingLight = albedo;', 'vec3 outgoingLight = albedo * vec3(.75,.72,.98) + vec3(.004,.002,.012);');scene.add(water);
 const glow=(()=>{const size=64,d=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){let a=Math.max(0,1-Math.hypot(x-31.5,y-31.5)/31.5);const i=(y*size+x)*4;d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.pow(a,4)*255;}const t=new T.DataTexture(d,size,size);t.needsUpdate=true;return t;})();
 const seeds=Array.from({length:mobile?100:250},()=>[rand()*52-26,.2+rand()*7,rand()*64-43,rand()*6.28]);
 const geo=new T.BufferGeometry(),arr=new Float32Array(seeds.length*3);geo.setAttribute('position',new T.BufferAttribute(arr,3));const fire=new T.Points(geo,new T.PointsMaterial({map:glow,color:'#fbd998',size:.21,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));scene.add(fire);
 const leaves=new T.InstancedMesh(new T.PlaneGeometry(.07,.15),new T.MeshStandardMaterial({color:'#ad6546',side:T.DoubleSide,roughness:.9}),mobile?45:100);const ls=Array.from({length:leaves.count},()=>[rand()*53-25,rand()*17,rand()*64-45,rand()*6.28]);const dummy=new T.Object3D();leaves.frustumCulled=false;scene.add(leaves);
 return {glow,update(t){water.material.uniforms.time.value=t*.35;seeds.forEach(([x,y,z,p],i)=>{arr[i*3]=x+Math.sin(t*.25+p)*.4;arr[i*3+1]=y+Math.sin(t*.5+p)*.25;arr[i*3+2]=z+Math.cos(t*.25+p)*.4;});geo.attributes.position.needsUpdate=true;
 ls.forEach(([x,y,z,p],i)=>{dummy.position.set(x+Math.sin(t*.24+p),((y-t*.24)%17+17)%17,z+Math.cos(t*.13+p));dummy.rotation.set(p+t*.4,p,t*.3+p);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);});leaves.instanceMatrix.needsUpdate=true;},water};
}
