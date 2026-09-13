import * as T from 'three';
import {buildPineCrowns} from './pine-crowns.js';
import {createCanopyLOD} from './canopy-lod.js';
import {branchSnowGeometry,branchSnowMaterial,attachBranchSnow} from '../valley/branch-snow.js';
import {winterVegetation} from '../valley/winter-vegetation.js';

// Each old broadleaf is a disconnected six-vertex polygon. Give it a fold,
// its own vein coordinates and smooth normals without moving tree anchors.
function foldBroadleaves(source){
 const g=source.clone(),p=g.attributes.position,ids=new Int32Array(p.count),index=g.index;
 if(!index)return g;for(let i=0;i<ids.length;i++)ids[i]=i;
 const find=i=>{while(ids[i]!==i){ids[i]=ids[ids[i]];i=ids[i];}return i;};
 for(let i=0;i<index.count;i+=3){const r=find(index.getX(i));ids[find(index.getX(i+1))]=r;ids[find(index.getX(i+2))]=r;}
 const groups=new Map();for(let i=0;i<ids.length;i++){const r=find(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i);}
 const uv=new Float32Array(p.count*2),a=new T.Vector3(),b=new T.Vector3(),center=new T.Vector3(),axis=new T.Vector3(),side=new T.Vector3(),normal=new T.Vector3();let count=0;
 for(const group of groups.values()){
  if(group.length<3||group.length>12)continue;center.set(0,0,0);let longest=0,pair=[];
  for(const i of group){a.fromBufferAttribute(p,i);center.add(a);for(const j of group){b.fromBufferAttribute(p,j);const d=a.distanceToSquared(b);if(d>longest){longest=d;pair=[i,j];}}}
  if(longest<1e-8)continue;center.multiplyScalar(1/group.length);axis.fromBufferAttribute(p,pair[1]).sub(a.fromBufferAttribute(p,pair[0])).normalize();
  normal.set(0,0,0);for(const i of group)normal.add(b.fromBufferAttribute(g.attributes.normal,i));normal.normalize();if(normal.y<0)normal.negate();side.crossVectors(axis,normal).normalize();const length=Math.sqrt(longest);let width=.001;for(const i of group)width=Math.max(width,Math.abs(a.fromBufferAttribute(p,i).sub(center).dot(side)));
  for(const i of group){a.fromBufferAttribute(p,i).sub(center);const u=a.dot(axis)/length+.5,v=a.dot(side)/width;uv[i*2]=u;uv[i*2+1]=v*.5+.5;a.multiplyScalar(1.26).add(center).addScaledVector(normal,Math.sin(T.MathUtils.clamp(u,0,1)*Math.PI)*(1-Math.abs(v))*.10*length);p.setXYZ(i,a.x,a.y,a.z);}
  count++;
 }
 g.setAttribute('canopyUv',new T.BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();g.userData.foldedLeaves=count;return g;
}
function foliageMaterial(original,region,time,{veins=false,map=null,alpha=null}={}){
 const m=original.clone();m.name=original.name+' · refined canopy';m.side=T.DoubleSide;m.roughness=.83;m.metalness=0;m.emissive.set(0);m.envMapIntensity=.7;
 if(map){m.map=map;m.alphaMap=alpha;m.alphaTest=.12;m.alphaToCoverage=true;m.transparent=false;m.color.set('#bccba5');if(region==='highland')m.vertexColors=false;}
 m.onBeforeCompile=s=>{
  s.uniforms.refineTime=time;
  s.vertexShader=`uniform float refineTime;varying vec3 canopyWorld;${veins?'attribute vec2 canopyUv;varying vec2 leafVein;':''}\n`+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   ${veins?'leafVein=canopyUv;':''}
   float wind=sin(refineTime*.8+position.x*.73+position.z*.61);
   transformed.x+=wind*.025;transformed.z+=sin(refineTime*1.05+position.y*.84)*.017;
  `).replace('#include <project_vertex>',`vec4 cw=vec4(transformed,1.);
#ifdef USE_INSTANCING
cw=instanceMatrix*cw;
#endif
canopyWorld=(modelMatrix*cw).xyz;
#include <project_vertex>`);
  s.fragmentShader=`varying vec3 canopyWorld;${veins?'varying vec2 leafVein;':''}\n`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float mottled=.5+.5*sin(canopyWorld.x*.85+sin(canopyWorld.z*1.2)+canopyWorld.y*.7);
   ${region==='forest'?'diffuseColor.rgb=mix(diffuseColor.rgb,dot(diffuseColor.rgb,vec3(.3,.5,.2))*vec3(.88,.55,1.02),.35);':region==='aether'?'diffuseColor.rgb*=vec3(.92,1.19,1.18);':!map?'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.8,1.23,.84),.55);':''}
   diffuseColor.rgb*=.86+mottled*.29;
   ${veins?`float mid=1.-smoothstep(.006,.023,abs(leafVein.y-.5));float ribs=pow(.5+.5*cos((leafVein.x-abs(leafVein.y-.5)*.65)*48.),16.)*(1.-mid);diffuseColor.rgb*=1.-mid*.13-ribs*.065;`:''}
  `);
  if(map)s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`
   float needleThreshold=mix(.17,.018,smoothstep(12.,90.,length(vViewPosition)));
   diffuseColor.a=smoothstep(needleThreshold*.55,needleThreshold*1.6,diffuseColor.a);
   if(diffuseColor.a<.03)discard;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 up=normalize(mat3(viewMatrix)*vec3(0.,1.,0.));if(dot(normal,up)<0.)normal=-normal;
   normal=normalize(mix(normal,up,.36));
  `);
 };
 m.customProgramCacheKey=()=>`canopy-refined-v2-${region}-${veins}-${!!map}`;
 if(region==='valley')winterVegetation(m);
 return m;
}
export function createCanopyRefinement(time){
 const loader=new T.TextureLoader(),base=import.meta.env.BASE_URL+'assets/valley/';
 const branch=loader.load(base+'fir-branch.jpg'),alpha=loader.load(base+'fir-alpha.png');branch.colorSpace=T.SRGBColorSpace;branch.anisotropy=8;alpha.anisotropy=8;
 const geometryCache=new Map(),materialCache=new Map(),snowGeometry=new Map(),snowMaterial=branchSnowMaterial(time),records=[],lod=createCanopyLOD();
 function add(region,root){let foliage=0,folded=0,restored=0,pineCrowns=null;
  root.traverse(o=>{
   if(!o.isMesh||!o.material?.name)return;const n=o.material.name;
   // The GLB lost its original fir color/opacity textures. Restore them and
   // remove the obsolete solid inner triangles that filled every needle gap.
   if(region.id==='valley'&&/^Pine_dense_inner_crown/.test(o.name)){o.visible=false;o.userData.replacedByNeedleSprays=true;return;}
   const broad=['forest','watercourt'].includes(region.id)&&/leaves/i.test(n),needle=region.id==='valley'&&n==='Evergreen_needles',pine=region.id==='highland'&&/^HC pine/.test(n),aether=region.id==='aether'&&/_canopy$/.test(o.name);
   if(!broad&&!needle&&!pine&&!aether)return;
   if(broad||pine){const original=o.geometry;if(!geometryCache.has(original))geometryCache.set(original,broad?foldBroadleaves(original):buildPineCrowns(root.userData.pineSites));o.geometry=geometryCache.get(original);folded+=o.geometry.userData.foldedLeaves||0;pineCrowns=o.geometry.userData.pineCrowns||pineCrowns;if(o.isInstancedMesh){o.computeBoundingBox();o.computeBoundingSphere();}}
   const key=o.material.uuid+'-'+region.id;if(!materialCache.has(key))materialCache.set(key,foliageMaterial(o.material,region.id,time,{veins:broad,map:needle||pine?branch:null,alpha:needle||pine?alpha:null}));o.material=materialCache.get(key);o.castShadow=true;o.receiveShadow=true;
   if(needle){if(!snowGeometry.has(o.geometry))snowGeometry.set(o.geometry,branchSnowGeometry(o.geometry));attachBranchSnow(o,snowGeometry.get(o.geometry),snowMaterial);}
   if(needle||pine){o.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,alphaMap:alpha,alphaTest:.12,side:T.DoubleSide});restored++;}foliage++;
  });const candidates=[];root.traverse(o=>{if(o.isMesh&&((['forest','watercourt'].includes(region.id)&&/leaves/i.test(o.material?.name||''))||(region.id==='aether'&&/_canopy$/.test(o.name))))candidates.push(o);});candidates.forEach(o=>lod.add(o));records.push({region:region.id,foliageMeshes:foliage,foldedLeaves:folded,needleMeshes:restored,pineCrowns});
 }
 return {add,update:(camera,seconds)=>lod.update(camera,seconds),lod:()=>lod.stats(),stats:()=>records,dispose(){lod.dispose();snowGeometry.forEach(g=>g.dispose());snowMaterial.dispose();branch.dispose();alpha.dispose();geometryCache.forEach(g=>g.dispose());materialCache.forEach(m=>m.dispose());}};
}
