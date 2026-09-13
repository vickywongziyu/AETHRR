import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small, closed snow cushions follow the actual needle sprays. Reuse the tree
// instances rather than adding one scene object per branch. Original needles
// remain visible beneath them and retain their alpha silhouette.
export function branchSnowGeometry(source) {
 const p=source.attributes.position,index=source.index,parts=[];
 const at=(i)=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i):i);
 const total=index?.count??p.count;
 for(let i=0;i+5<total;i+=6){
  if((i/6)%5!==1)continue;
  const a=at(i),b=at(i+1),c=at(i+2),d=at(i+5);
  // Only accept the paired triangle topology of a needle card.
  if(a.distanceTo(at(i+3))>1e-5||c.distanceTo(at(i+4))>1e-5)continue;
  const across=b.clone().sub(a),along=d.clone().sub(a);
  const width=across.length(),length=along.length();
  if(width<.01||length<.01)continue;
  const center=a.clone().addScaledVector(across,.5).addScaledVector(along,.52);
  const thickness=Math.min(.09,length*.13),up=new T.Vector3(0,1,0);
  const g=new T.SphereGeometry(1,8,4),v=g.attributes.position;
  for(let j=0;j<v.count;j++){
   const x=v.getX(j),y=v.getY(j),z=v.getZ(j);
   const q=center.clone().addScaledVector(across,x*.28*(1+.09*Math.sin(i+x*4)))
    .addScaledVector(along,z*.39).addScaledVector(up,thickness*(y+.30));
   v.setXYZ(j,q.x,q.y,q.z);
  }
  // Needle cards may use a reflected local basis. Keep the closed snow shell
  // outward-facing after mapping its sphere into that basis.
  if(across.dot(up.clone().cross(along))<0){
   const ids=g.index;for(let j=0;j<ids.count;j+=3){const b=ids.getX(j+1);ids.setX(j+1,ids.getX(j+2));ids.setX(j+2,b);}
  }
  g.deleteAttribute('uv');g.computeVertexNormals();parts.push(g);
 }
 const result=parts.length?mergeGeometries(parts):new T.BufferGeometry();
 result.userData.winterSnowCaps=parts.length;parts.forEach(g=>g.dispose());
 result.computeBoundingBox();result.computeBoundingSphere();return result;
}

export function branchSnowMaterial(time,{legacy=false}={}) {
 const m=new T.MeshStandardMaterial({color:'#dce6e8',roughness:1,metalness:0});
 m.name='North Valley · branch snow';m.userData.winterBranchSnow=true;
 m.onBeforeCompile=s=>{
  s.uniforms.snowTime=time;
  s.vertexShader='uniform float snowTime;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   ${legacy?`float phase=0.;
    #ifdef USE_INSTANCING
    phase=instanceMatrix[3].x*.16+instanceMatrix[3].z*.11;
    #endif
    transformed.x+=sin(snowTime*.63+phase+position.y*.7)*pow(position.y/8.,2.)*.075;
    transformed.z+=cos(snowTime*.5+phase)*pow(position.y/8.,2.)*.04;`
    :`transformed.x+=sin(snowTime*.8+position.x*.73+position.z*.61)*.025;
    transformed.z+=sin(snowTime*1.05+position.y*.84)*.017;`}
  `);
 };
 m.customProgramCacheKey=()=>`winter-branch-snow-v35-${legacy}`;return m;
}

export function attachBranchSnow(tree,geometry,material) {
 const snow=tree.isInstancedMesh?new T.InstancedMesh(geometry,material,tree.count):new T.Mesh(geometry,material);
 if(tree.isInstancedMesh)snow.instanceMatrix=tree.instanceMatrix;
 snow.name='Winter_branch_snow_'+tree.name;
 snow.userData.noCollision=true;snow.userData.crafted=true;
 snow.castShadow=false;snow.receiveShadow=true;tree.add(snow);return snow;
}
