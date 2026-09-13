import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {paintedNoiseGLSL} from '../atlas/painted-surface.js';

export function stoneArch(){
 const arch=new T.CurvePath();
 arch.add(new T.LineCurve3(new T.Vector3(-2.25,.3,0),new T.Vector3(-2.25,3.5,0)));
 arch.add(new T.CubicBezierCurve3(new T.Vector3(-2.25,3.5,0),new T.Vector3(-2.25,5.5,0),new T.Vector3(-.6,6.2,0),new T.Vector3(0,6.6,0)));
 arch.add(new T.CubicBezierCurve3(new T.Vector3(0,6.6,0),new T.Vector3(.6,6.2,0),new T.Vector3(2.25,5.5,0),new T.Vector3(2.25,3.5,0)));
 arch.add(new T.LineCurve3(new T.Vector3(2.25,3.5,0),new T.Vector3(2.25,.3,0)));
 return arch;
}
const inward=(arch,t)=>{const v=arch.getTangentAt(t);return new T.Vector3(v.y,-v.x,0).normalize();};

// Closed, beveled voussoirs follow the original pointed arch centerline.
export function archBlock(arch,start,end,width=.29,depth=.27){
 const b=.042,profile=[[-width,-depth+b],[-width+b,-depth],[width-b,-depth],[width,-depth+b],[width,depth-b],[width-b,depth],[-width+b,depth],[-width,depth-b]],pos=[],ids=[];
 const rows=Math.max(5,Math.ceil((end-start)*256)+1);for(let j=0;j<rows;j++){const t=start+(end-start)*j/(rows-1),center=arch.getPointAt(t),n=inward(arch,t);for(const[x,z]of profile){const p=center.clone().addScaledVector(n,x);pos.push(p.x,p.y,z);}}
 for(let j=0;j<rows-1;j++)for(let k=0;k<8;k++){const a=j*8+k,b=j*8+(k+1)%8,c=a+8,d=b+8;ids.push(a,b,c,b,d,c);}
 for(const endCap of[false,true]){const offset=endCap?(rows-1)*8:0;for(let k=1;k<7;k++)ids.push(...(endCap?[offset,offset+k,offset+k+1]:[offset,offset+k+1,offset+k]));}
 for(let i=0;i<ids.length;i+=3){const b=ids[i+1];ids[i+1]=ids[i+2];ids[i+2]=b;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ids);g.computeVertexNormals();return g;
}

// A convex, geometry-bounded aperture. Its narrow feather ring follows the
// same inner stone edge; discarded rectangular pixels cannot receive clicks.
export function stoneAperture(arch=stoneArch()){
 const left=[];for(let i=0;i<=96;i++){const t=i/192,p=arch.getPointAt(t).addScaledVector(inward(arch,t),.275);if(p.x>=0&&left.length){const last=left.at(-1);left.push(last.clone().lerp(p,-last.x/(p.x-last.x)));break;}left.push(p);}
 const boundary=[...left,...left.slice(0,-1).reverse().map(p=>new T.Vector3(-p.x,p.y,p.z))];
 const box=new T.Box3().setFromPoints(boundary),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),positions=[],uv=[],edges=[],ids=[];
 for(const inner of[false,true])for(const p of boundary){const q=p.clone();if(inner)q.lerp(center,.018);positions.push(q.x,q.y-3.43,0);uv.push((q.x-box.min.x)/size.x,(q.y-box.min.y)/size.y);edges.push(inner?1:0);}
 const n=boundary.length,k=positions.length/3;positions.push(center.x,center.y-3.43,0);uv.push(.5,.5);edges.push(1);
 for(let i=0;i<n;i++){const j=(i+1)%n;ids.push(i,n+i,j,j,n+i,n+j,n+i,k,n+j);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('gateEdge',new T.Float32BufferAttribute(edges,1));g.setIndex(ids);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.parameters={width:size.x,height:size.y};g.userData.aperture='stone-arch-v36';return g;
}

export const STONE_VEIL_VERTEX='attribute float gateEdge;varying float stoneEdge;varying vec2 vUv;void main(){vUv=uv;stoneEdge=gateEdge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';

export function addStonePortalFrame(group,theme,{plinth=true}={}){
 const arch=stoneArch(),stone=new T.MeshStandardMaterial({color:theme.stone,roughness:.94,metalness:0,vertexColors:true});stone.name='Portal · carved limestone';
 stone.onBeforeCompile=s=>{s.vertexShader='varying vec3 portalStonePos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nportalStonePos=position;');s.fragmentShader='varying vec3 portalStonePos;\n'+paintedNoiseGLSL+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.94+.10*paintNoise(portalStonePos*2.6);');};stone.customProgramCacheKey=()=> 'carved-portal-stone-v36';
 const seam=new T.MeshStandardMaterial({color:theme.stone,roughness:1});seam.color.multiplyScalar(.55);seam.name='Portal · recessed stone joints';
 const trim=new T.MeshStandardMaterial({color:theme.color,emissive:theme.color,emissiveIntensity:.75,roughness:.6});trim.name='Portal · inset luminous carving';
 const stoneParts=[],count=31,length=arch.getLength();
 for(let i=0;i<count;i++){const gap=.012/length,a=i/count+gap,b=(i+1)/count-gap,g=archBlock(arch,a,b),raw=g.toNonIndexed();g.dispose();raw.computeVertexNormals();const color=new Float32Array(raw.attributes.position.count*3),shade=.94+.08*(.5+.5*Math.sin(i*7.13));color.fill(shade);raw.setAttribute('color',new T.BufferAttribute(color,3));stoneParts.push(raw);}
 if(plinth){const step=new T.CylinderGeometry(3.5,3.8,.4,64);step.translate(0,.05,0);const raw=step.toNonIndexed();step.dispose();const colors=new Float32Array(raw.attributes.position.count*3);colors.fill(.97);raw.setAttribute('color',new T.BufferAttribute(colors,3));stoneParts.push(raw);}
 // Geometry attributes match without depending on the tessellation's UVs.
 for(const g of stoneParts)g.deleteAttribute('uv');const frame=new T.Mesh(mergeGeometries(stoneParts),stone);stoneParts.forEach(g=>g.dispose());frame.name='Carved portal · 31 closed stones';frame.castShadow=frame.receiveShadow=true;frame.userData.stoneBlocks=count;group.add(frame);
 const backing=archBlock(arch,0,1,.255,.23),mortar=new T.Mesh(backing,seam);mortar.name='Portal · continuous recessed backing';group.add(mortar);
 // Thin carved channels, visible from both sides, sit within the stone faces.
 const marks=[];for(const side of[-1,1]){
  const path=new T.TubeGeometry(arch,120,.014,6,false);path.translate(0,0,side*.269);marks.push(path);
  for(let i=0;i<9;i++){const t=(i+1)/10,p=arch.getPointAt(t),normal=inward(arch,t),tangent=arch.getTangentAt(t);const center=p.clone().addScaledVector(normal,-.13);center.z=side*.271;const points=[center.clone().addScaledVector(tangent,-.09),center.clone().addScaledVector(normal,.05),center.clone().addScaledVector(tangent,.09),center.clone().addScaledVector(normal,-.05),center.clone().addScaledVector(tangent,-.09)];for(let j=0;j<4;j++)marks.push(new T.TubeGeometry(new T.LineCurve3(points[j],points[j+1]),1,.009,5,false));}
 }
 const raw=marks.map(g=>g.toNonIndexed());raw.forEach(g=>g.deleteAttribute('uv'));const inscription=new T.Mesh(mergeGeometries(raw),trim);new Set([...marks,...raw]).forEach(g=>g.dispose());inscription.name='Portal · two-sided carved runes';group.add(inscription);
 group.userData.stonePortalRevision='v36';return {arch,frame,inscription,aperture:stoneAperture(arch)};
}
