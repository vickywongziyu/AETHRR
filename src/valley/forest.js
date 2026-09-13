import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { random, heightAt, riverX, riverWidth, noise } from './math.js';
import {branchSnowGeometry,branchSnowMaterial,attachBranchSnow} from './branch-snow.js';
import {winterVegetation} from './winter-vegetation.js';

function pineGeometry(seed){
  const rand=random(seed),vertices=[],colors=[];
  const a=new T.Color('#25372b'),b=new T.Color('#46503a'),snow=new T.Color('#c2d1d0'),col=new T.Color();
  function tri(p,q,r,c){vertices.push(...p,...q,...r); for(let j=0;j<3;j++) colors.push(c.r,c.g,c.b);}
  // Needle-bearing lateral shoots, not stacked cones: each tier has open, irregular branches.
  for(let layer=0;layer<9;layer++){
    const y=1.25+layer*.7,rad=(1-layer/13)*2.1;
    const phase=rand()*6.28;
    for(let branch=0;branch<6;branch++){
      if(rand()<.055)continue;
      const ang=branch/6*6.28+phase, len=rad*(.65+rand()*.4);
      const dx=Math.cos(ang),dz=Math.sin(ang),sx=-dz,sz=dx;
      const end=[dx*len,y-.14,dz*len];
      col.copy(a).lerp(b,rand()*.7);
      tri([-.04,y,0],end,[.04,y,0],col);
      for(let n=0;n<5;n++){
        const t=.12+n*.18,spread=(1-t)*len*.39+.05;
        const cx=dx*len*t,cz=dz*len*t,cy=y-Math.sin(t*Math.PI)*.34;
        const snowy=seed%3===0 && layer>5 && branch%3===0;
        col.copy(snowy?snow:a).lerp(b,snowy?.08:rand()*.6);
        for(const side of [-1,1]){
          const tip=[cx+sx*spread*side+dx*.17,cy-.06,cz+sz*spread*side+dz*.17];
          tri([cx-dx*.22,cy,cz-dz*.22],tip,[cx+dx*.28,cy+.13,cz+dz*.28],col);
          tri([cx,cy+.12,cz],tip,[cx,cy-.16,cz],col);
          const tip2=[tip[0]+dx*.11,tip[1]+.16,tip[2]+dz*.11];
          tri([cx,cy+.07,cz],tip2,[tip[0]-dx*.16,tip[1],tip[2]-dz*.16],col);
        }
      }
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function texturedPine(seed){
  const rand=random(seed),vertices=[],uvs=[],colors=[];
  const rects=[[.17,.68,.46,.985],[.30,.21,.62,.6],[.65,.625,.96,.99]];
  for(let layer=0;layer<14;layer++){
    const y=.95+layer*.46,rad=(1-layer/15)*2.15,phase=rand()*Math.PI*2;
    for(let branch=0;branch<9;branch++){
      if(rand()<.15)continue;
      const a=phase+branch/9*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a),len=rad*(.55+rand()*.5);
      for(let twig=0;twig<4;twig++){
        const t=.22+twig*.21, l=(.6+rand()*.3)*(1-layer/18),w=l*.63;
        const x=dx*len*t,z=dz*len*t,cy=y-.35*Math.sin(t*Math.PI)+rand()*.14;
        const side=twig%2===0?1:-1, angle=a+side*.5;
        const vx=Math.cos(angle)*l,vz=Math.sin(angle)*l,sx=-Math.sin(angle)*w,sz=Math.cos(angle)*w;
        const base=[x,cy,z],tip=[x+vx,cy+.22+rand()*.18,z+vz];
        const q=[[base[0]-sx,base[1],base[2]-sz],[base[0]+sx,base[1],base[2]+sz],[tip[0]+sx,tip[1],tip[2]+sz],[tip[0]-sx,tip[1],tip[2]-sz]];
        const [u0,v0,u1,v1]=rects[Math.floor(rand()*rects.length)],uv=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],color=.65+rand()*.35;
        for(const idx of [0,1,2,0,2,3]){vertices.push(...q[idx]);uvs.push(...uv[idx]);colors.push(color,color,color);}
      }
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function makeForest(root,time,branchMap){
  const rand=random(962),treeMat=new T.MeshStandardMaterial({vertexColors:true,map:branchMap,alphaTest:.18,roughness:.94,side:T.DoubleSide,color:'#b8c0a0'});treeMat.name='Evergreen_needles';
  treeMat.onBeforeCompile=shader=>{shader.uniforms.uTime=time;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float phase=0.;
    #ifdef USE_INSTANCING
    phase = instanceMatrix[3].x*.16 + instanceMatrix[3].z*.11;
    #endif
    transformed.x += sin(uTime*.63+phase+position.y*.7)*pow(position.y/8.,2.)*.075;
    transformed.z += cos(uTime*.5+phase)*pow(position.y/8.,2.)*.04;
  `);};
  winterVegetation(treeMat);
  const snowMaterial=branchSnowMaterial(time,{legacy:true});
  const trunkG=new T.CylinderGeometry(.035,.17,7.4,6);trunkG.translate(0,3.7,0);
  const trunkMat=new T.MeshStandardMaterial({color:'#504337',roughness:1});trunkMat.name='Pine_bark';
  const positions=[];
  for(let i=0;i<2100;i++){
    const x=(rand()-.5)*188,z=110-rand()*250,y=heightAt(x,z),d=Math.abs(x-riverX(z));
    if(d<riverWidth(z)+3 || y>22 || noise(x*.08,z*.08)<.30)continue;
    if((x-26)**2+(z-16)**2<90 || (x-29)**2+(z+44)**2<50 || Math.abs(z+4)<4&&Math.abs(x-riverX(z))<17)continue;
    if(x>6&&x<35&&z>48&&z<82)continue;
    positions.push([x,y-.1,z,.65+rand()*.75,rand()*6.28]);if(positions.length>=590)break;
  }
  positions.push([-21,heightAt(-21,49),49,1.7,1],[-38,heightAt(-38,50),50,1.9,2],[42,heightAt(42,52),52,1.35,1]);
  const dummy=new T.Object3D();
  for(let kind=0;kind<4;kind++){
    const list=positions.filter((_,i)=>i%4===kind),g=texturedPine(10+kind),leaves=new T.InstancedMesh(g,treeMat,list.length),trunks=new T.InstancedMesh(trunkG,trunkMat,list.length);
    list.forEach(([x,y,z,s,r],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,r,0);dummy.scale.set(s*(.78+rand()*.3),s,s*(.78+rand()*.3));dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);trunks.setMatrixAt(i,dummy.matrix);});
    const coreMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});coreMat.name='Pine_inner_needles';winterVegetation(coreMat);const coreG=pineGeometry(20+kind);coreG.scale(.65,1,.65);const cores=new T.InstancedMesh(coreG,coreMat,list.length);for(let i=0;i<list.length;i++){leaves.getMatrixAt(i,dummy.matrix);cores.setMatrixAt(i,dummy.matrix);}cores.name='Pine_dense_inner_crown_'+kind;cores.castShadow=true;cores.receiveShadow=true;root.add(cores);
    leaves.name='Alpine_fir_needles_'+kind;attachBranchSnow(leaves,branchSnowGeometry(g),snowMaterial);trunks.name='Alpine_fir_trunks_'+kind;leaves.castShadow=true;leaves.receiveShadow=true;trunks.castShadow=true;root.add(leaves,trunks);
  }
  // Dry grass along the lower slopes, individual tapered blades batched into one draw call.
  const verts=[],cols=[];const c=new T.Color();
  for(let i=0;i<18500;i++){
    const x=rand()*170-85,z=rand()*235-130,y=heightAt(x,z),d=Math.abs(x-riverX(z));
    if(y<2.1||y>13||d<riverWidth(z)+1||noise(x*.18,z*.18)>.64)continue;
    const h=.16+rand()*.43,a=rand()*6.28,w=.035,dx=Math.cos(a)*w,dz=Math.sin(a)*w;
    verts.push(x-dx,y,z-dz,x+dx,y,z+dz,x+.12,y+h,z+.07);c.setHSL(.1+rand()*.05,.2,.12+rand()*.12);for(let k=0;k<3;k++)c.toArray(cols,cols.length);
  }
  const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(verts,3));gg.setAttribute('color',new T.Float32BufferAttribute(cols,3));gg.computeVertexNormals();
  const gm=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1});gm.name='Winter_grass';const grass=new T.Mesh(gg,gm);grass.name='Dry_alpine_grass';grass.receiveShadow=true;root.add(grass);
  // Sparse, bare trees for the reference's weathered silhouette.
  const dead=[];
  for(const [x,z,h] of [[-24,32,16],[-16,-35,11],[19,-58,9],[45,-15,13]]){
    const y=heightAt(x,z);const t=new T.CylinderGeometry(.07,.26,h,7);t.translate(x,y+h/2,z);dead.push(t);
    for(let i=0;i<12;i++){
      const a=rand()*6.28,by=y+2+rand()*(h-3),len=1+rand()*2;
      const start=new T.Vector3(x,by,z),end=new T.Vector3(x+Math.cos(a)*len,by-.4,z+Math.sin(a)*len),dir=end.clone().sub(start);
      const g=new T.CylinderGeometry(.015,.06,dir.length(),4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());dead.push(g);
    }
  }
  const deadTree=new T.Mesh(mergeGeometries(dead),trunkMat);deadTree.name='Weathered_trees';deadTree.castShadow=true;root.add(deadTree);dead.forEach(g=>g.dispose());return positions.length;
}
