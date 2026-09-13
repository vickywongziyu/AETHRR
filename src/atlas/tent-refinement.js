import * as T from 'three';
import {tentRadius,tentSurfaceRadius} from './highland-sculpture.js';

const rawRadius=(b,t)=>t<.42?b.r*(1-t*.2857):b.r*.88*(1-(t-.42)/.58)+.18*((t-.42)/.58);
// Source facets are selected from their authored rings, not a broad tent volume.
export function removeLegacyTentParts(root,buildings){
 const tents=buildings.filter(b=>b.kind==='tent'),items=tents.map((b,i)=>({name:'tent-'+(i+1),skin:0,band:0,platform:0})),edits=[];
 const inverse=root.matrixWorld.clone().invert(),points=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
 root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;const kind=/^HC (ivory|wood|red)(\.|$)/.exec(mesh.material?.name||'')?.[1];if(!kind)return;
  const g=mesh.geometry,p=g.attributes.position,index=g.index,m=inverse.clone().multiply(mesh.matrixWorld),remove=new Set();
  for(let i=0;i<(index?.count||p.count);i+=3){
   for(let j=0;j<3;j++)points[j].fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(m);
   for(const [k,b] of tents.entries()){
    if(!points.every(p=>Math.abs(p.x-b.x)<b.r+.3&&Math.abs(p.z+b.y)<b.r+.3&&p.y>b.z-.02&&p.y<b.z+b.h+.02))continue;
    const local=points.map(p=>[p.x-b.x,p.y-b.z,p.z+b.y]);let part;
    if(kind==='ivory'){
     const levels=[0,Math.min(2.7,b.h*.39),b.h*.6,b.h];
     if(local.every(([x,y,z])=>levels.some(level=>Math.abs(y-level)<.014&&[rawRadius(b,level/b.h),Math.max(.07,rawRadius(b,level/b.h)-.1)].some(r=>{const a=Math.round(Math.atan2(z,x)/(Math.PI/24))*Math.PI/24;return Math.hypot(x-Math.cos(a)*r,z-Math.sin(a)*r)<.014;}))))part='skin';
    }else if(kind==='wood'){
     const center=[-b.r*.32,.22,-b.r*.15],size=[b.r*.6,.35,b.r*.8];
     if(local.every(p=>p.every((v,a)=>Math.abs(v-center[a])<size[a]/2+.014))&&[0,1,2].some(a=>[-1,1].some(s=>local.every(p=>Math.abs(p[a]-center[a]-s*size[a]/2)<.014))))part='platform';
    }else if([.14,.55].some(t=>local.every(([x,y,z])=>Math.abs(y-b.h*t)<.11&&Math.abs(Math.hypot(x,z)-rawRadius(b,t)-.035)<.115)))part='band';
    if(part){items[k][part]++;remove.add(i);break;}
   }
  }
  if(remove.size)edits.push({mesh,remove});
 });
 const report={status:'unmatched',items,removedTriangles:0};
 if(items.some(r=>r.skin!==856||r.band!==1840||r.platform!==12)){root.userData.tentRefinement=report;return report;}
 for(const {mesh,remove}of edits){const g=mesh.geometry,index=g.index,keep=[];for(let i=0;i<(index?.count||g.attributes.position.count);i+=3)if(!remove.has(i))for(let k=0;k<3;k++)keep.push(index?index.getX(i+k):i+k);mesh.geometry=g.clone();mesh.geometry.setIndex(keep);mesh.geometry.computeBoundingSphere();report.removedTriangles+=remove.size;}
 report.status='refined';root.userData.tentRefinement=report;return report;
}

function geometry(p,uv,indices,colors){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;}
export function tailoredTent(c,b){
 if(!c.materials.tentHide){const source=c.materials.cloth,m=source.clone();m.name='Craft · tailored hide';m.color.set('#b9ad8f');m.onBeforeCompile=source.onBeforeCompile;m.customProgramCacheKey=()=>source.customProgramCacheKey()+'-tent-v28';c.materials.tentHide=m;}
 const n=96,levels=[0,Math.min(2.7,b.h*.39)/b.h,.6,1],ts=[];
 for(let j=0;j<3;j++)for(let k=0;k<10;k++)ts.push(T.MathUtils.lerp(levels[j],levels[j+1],k/10));ts.push(1);
 const positions=[],uv=[],idx=[],rows=ts.length,layerSize=rows*(n+1),front=k=>k>=20&&k<28;
 for(let layer=0;layer<2;layer++)for(const t of ts)for(let k=0;k<=n;k++){const a=k/n*Math.PI*2,r=tentSurfaceRadius(b,t,a)-layer*.1;positions.push(Math.cos(a)*r,t*b.h,Math.sin(a)*r);uv.push(k/n*6,t*2);}
 const quad=(a,b,c,d,reverse=false)=>idx.push(...(reverse?[a,c,b,a,d,c]:[a,b,c,a,c,d]));
 for(let layer=0;layer<2;layer++)for(let j=0;j<rows-1;j++)for(let k=0;k<n;k++){
  if(j<10&&front(k))continue;const a=layer*layerSize+j*(n+1)+k;quad(a,a+n+1,a+n+2,a+1,!!layer);
 }
 // Continuous bottom/top thickness, two jambs and lintel around the real opening.
 for(const j of [0,rows-1])for(let k=0;k<n;k++){if(j===0&&front(k))continue;const a=j*(n+1)+k;quad(a,a+1,a+1+layerSize,a+layerSize,j===rows-1);}
 for(const k of [20,28])for(let j=0;j<10;j++){const a=j*(n+1)+k;quad(a,a+layerSize,a+n+1+layerSize,a+n+1,k===28);}
 for(let k=20;k<28;k++){const a=10*(n+1)+k;quad(a,a+layerSize,a+1+layerSize,a+1);}
 // Close the tiny top aperture with outward upper and inward lower discs.
 for(let k=1;k<n-1;k++){const a=(rows-1)*(n+1);idx.push(a,a+k+1,a+k,a+layerSize,a+layerSize+k,a+layerSize+k+1);}
 c.add(geometry(positions,uv,idx),'tentHide');
 for(const fraction of [.14,.55]){
  const p=[],u=[],ii=[];for(let side=0;side<2;side++)for(let row=0;row<2;row++)for(let k=0;k<=n;k++){const a=k/n*Math.PI*2,t=fraction+(row-.5)*.14/b.h,r=tentSurfaceRadius(b,t,a)+.030+side*.016;p.push(Math.cos(a)*r,t*b.h,Math.sin(a)*r);u.push(k/n,row);}
  const step=n+1,layer=step*2,q=(a,b,c,d)=>ii.push(a,b,c,a,c,d);
  for(let k=0;k<n;k++){if(fraction===.14&&front(k))continue;q(k,k+1,k+step+1,k+step);q(k+layer,k+layer+step,k+layer+step+1,k+layer+1);q(k,k+layer,k+layer+1,k+1);q(k+step,k+step+1,k+layer+step+1,k+layer+step);}
  if(fraction===.14)for(const k of [20,28])q(k,k+layer,k+layer+step,k+step);
  c.add(geometry(p,u,ii),'red');
 }
}

export function tentEntry(c,root,b,floor){
 const ground=[];root.traverse(o=>{if(o.isMesh&&/^HC ground(\.|$)/.test(o.material?.name||''))ground.push(o);});
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),width=Math.min(1.35,2*b.r*Math.sin(Math.PI/12)-.20),start=b.r+1.6,end=b.r-.24,top=floor+.002;
 const positions=[],uv=[],idx=[],rows=12;
 for(let j=0;j<=rows;j++)for(const side of [-1,1]){
  const z=T.MathUtils.lerp(start,end,j/rows),x=side*width*.5,origin=root.localToWorld(new T.Vector3(b.x+x,b.z+.3,-b.y+z));ray.set(origin,down);ray.far=1.7;
  const hit=ray.intersectObjects(ground,false)[0];if(!hit)throw Error('Missing ground under tent threshold');
  const low=root.worldToLocal(hit.point.clone()).y-b.z,blend=T.MathUtils.clamp((start-z)/(start-(b.r+.42)),0,1),height=T.MathUtils.lerp(low+.003,top,blend);
  positions.push(x,height,z,x,Math.min(low-.035,height-.065),z);uv.push(side,1-j/rows,side,1-j/rows);
 }
 const q=(a,b,c,d)=>idx.push(a,b,c,a,c,d);
 for(let j=0;j<rows;j++){const a=j*4;q(a,a+2,a+6,a+4);q(a+1,a+5,a+7,a+3);q(a,a+4,a+5,a+1);q(a+2,a+3,a+7,a+6);}
 q(0,1,3,2);const e=rows*4;q(e,e+2,e+3,e+1);
 c.add(geometry(positions,uv,idx),'pathstone');
 c.tentEntry={width,start,end,floor:top};
}
