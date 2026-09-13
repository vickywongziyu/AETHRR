import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {sculptIslandCliffs} from './island-sculpture.js';

const clamp=T.MathUtils.clamp,smooth=T.MathUtils.smoothstep;
function hash(x,z){const v=Math.sin(x*127.1+z*311.7)*43758.5453123;return v-Math.floor(v);}
function noise(x,z){const a=Math.floor(x),b=Math.floor(z),u=x-a,v=z-b,fx=u*u*(3-2*u),fz=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),fx),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),fx),fz);}
function fbm(x,z){return noise(x,z)*.56+noise(x*2.03+17,z*2.03-11)*.28+noise(x*4.13-5,z*4.13+7)*.16;}

// A range is one connected surface. The ridge controls describe major peaks
// and saddles, rather than a row of unrelated radial cones.
const RANGES={
 highland:{width:420,front:78,back:345,nx:260,nz:168,snowline:37,seed:27,nodes:[[-210,134,0],[-174,148,35],[-140,173,84],[-107,155,61],[-67,178,106],[-27,166,63],[12,185,48],[43,178,70],[85,159,92],[118,191,59],[157,181,101],[184,152,42],[210,141,0]]},
 aether:{width:520,front:115,back:399,nx:280,nz:156,snowline:42,seed:81,nodes:[[-260,150,0],[-221,170,26],[-172,211,84],[-139,231,54],[-104,240,102],[-65,248,71],[-12,242,57],[33,232,81],[81,208,112],[123,213,66],[168,188,84],[211,154,32],[260,137,0]]},
};
function profile(nodes,x){let i=0;while(i<nodes.length-2&&x>nodes[i+1][0])i++;const a=nodes[i],b=nodes[i+1],t=clamp((x-a[0])/(b[0]-a[0]),0,1),blend=t*t*(3-2*t);return [T.MathUtils.lerp(a[1],b[1],blend),T.MathUtils.lerp(a[2],b[2],blend)];}
export function buildMountainRange(region,{mobile=false}={}){
 const config=RANGES[region],nx=mobile?Math.round(config.nx*.72):config.nx,nz=mobile?Math.round(config.nz*.72):config.nz,positions=[],index=[],shelter=[],top=[],elevations=new Float32Array((nx+1)*(nz+1));
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=(i/nx-.5)*config.width,depth=T.MathUtils.lerp(config.front,config.back,j/nz),warp=(fbm(x*.021+config.seed,depth*.021)-.5)*19,[ridgeProfile,peak]=profile(config.nodes,x+warp),ridge=ridgeProfile+24,d=depth-ridge,frontWidth=44+noise(x*.014,config.seed)*18,backWidth=61;
  const body=Math.exp(-Math.pow((Math.hypot(d,4)-4)/(d<0?frontWidth:backWidth),1.26));
  // Broad flanking buttresses branch off the main divide. Fine ribs diminish
  // near the lowland, and wind-cut saddles remain distinct between summits.
  const fan=x*.046+(ridge-depth)*.055+fbm(x*.025,depth*.028)*2.8;
  const ribs=Math.pow(1-Math.abs(noise(fan,depth*.011)*2-1),2),detail=(fbm(x*.052+7,depth*.048)-.48)*5;
  const apron=16*Math.exp(-Math.pow((depth-ridge+43)/74,2))*(.55+fbm(x*.03,depth*.04));
  const edge=smooth(i/nx,0,.065)*(1-smooth(i/nx,.94,1))*smooth(j/nz,0,.07)*(1-smooth(j/nz,.83,1));
  const height=-33+edge*((peak*.59+28)*body+apron*.72+(ribs-.6)*11*body+detail*clamp(body*1.8,0,1));
  elevations[j*(nx+1)+i]=height;
 }
 // Short thermal relaxation spreads broken rock into the lower slopes while
 // retaining the authored ridge. It removes isolated single-cell spikes.
 for(let pass=0;pass<3;pass++){
  const old=elevations.slice();for(let j=1;j<nz;j++)for(let i=1;i<nx;i++){
   const k=j*(nx+1)+i,h=old[k],neighbors=[old[k-1],old[k+1],old[k-nx-1],old[k+nx+1]],average=neighbors.reduce((a,b)=>a+b,0)*.25;
   elevations[k]=h+(average-h)*(h>35?.25:.32);
  }
 }
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const k=j*(nx+1)+i,h=elevations[k],x=(i/nx-.5)*config.width,z=-T.MathUtils.lerp(config.front,config.back,j/nz);positions.push(x,h,z);
  const left=elevations[j*(nx+1)+Math.max(0,i-1)],right=elevations[j*(nx+1)+Math.min(nx,i+1)],front=elevations[Math.max(0,j-1)*(nx+1)+i],back=elevations[Math.min(nz,j+1)*(nx+1)+i];
  shelter.push(clamp(.5+(left+right+front+back-h*4)*.5,0,1));top.push(200);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;index.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('geoShelter',new T.Float32BufferAttribute(shelter,1));g.setAttribute('geoTop',new T.Float32BufferAttribute(top,1));g.setIndex(index);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.geology={kind:'connected-range',region,triangles:index.length/3,vertices:positions.length/3,majorPeaks:config.nodes.filter((p,i,a)=>i&&i<a.length-1&&p[2]>a[i-1][2]&&p[2]>a[i+1][2]).length,bounds:[g.boundingBox.min.toArray(),g.boundingBox.max.toArray()]};return g;
}

function componentMesh(source){
 const p=source.attributes.position,idx=source.index,points=[],map=new Uint32Array(p.count),keys=new Map(),faces=[],parent=[];
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),key=v.toArray().map(n=>Math.round(n*10000)).join(',');if(!keys.has(key)){keys.set(key,points.length);parent.push(points.length);points.push(v);}map[i]=keys.get(key);}
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<(idx?.count||p.count);i+=3){const tri=[0,1,2].map(k=>map[idx?idx.getX(i+k):i+k]);if(new Set(tri).size<3)continue;faces.push(tri);parent[find(tri[1])]=find(tri[0]);parent[find(tri[2])]=find(tri[0]);}
 const groups=new Map();for(let i=0;i<points.length;i++){const key=find(i);if(!groups.has(key))groups.set(key,{ids:[],faces:[]});groups.get(key).ids.push(i);}for(const tri of faces)groups.get(find(tri[0])).faces.push(tri);return {points,groups};
}
export function sculptHighlandCliffs(source){
 const {points,groups}=componentMesh(source),output=[],faces=[],tops=[],shelter=[],protectedVertices=[],cliffSites=[],stats={kind:'jointed-cliffs',cliffs:0,removedBoxLedges:0,protected:0,adjacentTerraceProtected:0,maxProtectedShift:0,correctedWinding:0};
 const terraceZones=[...groups.values()].filter(g=>g.ids.length>800).map(component=>{const b=new T.Box3().setFromPoints(component.ids.map(i=>points[i])),rim=component.ids.map(i=>points[i]).filter(p=>p.y>b.max.y-.75),center=new T.Vector3();rim.forEach(p=>center.add(p));center.divideScalar(rim.length);return {component,center,radius:Math.max(...rim.map(p=>Math.hypot(p.x-center.x,p.z-center.z)))};});
 for(const component of groups.values()){
  const box=new T.Box3().setFromPoints(component.ids.map(i=>points[i])),size=box.getSize(new T.Vector3());
  if(component.ids.length<=12&&size.x<3.4&&size.z<3.4&&size.y<.85){stats.removedBoxLedges++;continue;}
  const cliff=component.ids.length>800,local=new Map(),surface=[],surfaceFaces=[];
  for(const i of component.ids){local.set(i,surface.length);surface.push(points[i].clone());}for(const tri of component.faces)surfaceFaces.push(tri.map(i=>local.get(i)));
  let crest=box.max.y,center=box.getCenter(new T.Vector3()),rim=[],rimProfile=[];
  if(cliff){stats.cliffs++;rim=surface.filter(p=>p.y>crest-.75);center.set(rim.reduce((n,p)=>n+p.x,0)/rim.length,crest,rim.reduce((n,p)=>n+p.z,0)/rim.length);rimProfile=rim.map(p=>({angle:Math.atan2(p.z-center.z,p.x-center.x),radius:Math.hypot(p.x-center.x,p.z-center.z)})).sort((a,b)=>a.angle-b.angle);
   const mids=new Map(),sub=[];const mid=(a,b)=>{const key=a<b?a+','+b:b+','+a;if(!mids.has(key)){mids.set(key,surface.length);surface.push(surface[a].clone().add(surface[b]).multiplyScalar(.5));}return mids.get(key);};
   for(const [a,b,c]of surfaceFaces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);sub.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}surfaceFaces.splice(0,surfaceFaces.length,...sub);
  }
  const offset=output.length/3;
  for(const p of surface){
   const depth=crest-p.y;let protection=smooth(depth,1.15,3.8),cavity=.35;
   if(cliff){
    // A tall cliff can stand beside a lower inhabited terrace. Protect that
    // neighbour's elevation too, so a new ledge cannot grow through its path.
    for(const zone of terraceZones)if(zone.component!==component&&Math.hypot(p.x-zone.center.x,p.z-zone.center.z)<zone.radius+5)protection*=smooth(Math.abs(p.y-zone.center.y),2.6,4.6);
    if(protection===0&&depth>=1.15)stats.adjacentTerraceProtected++;
    const x=p.x-center.x,z=p.z-center.z,angle=Math.atan2(z,x),radius=Math.hypot(x,z),t=clamp(depth/Math.max(1,size.y),0,1);
    // Use the exact top rim as the boundary. Dense, narrow original corrugation
    // is replaced below it by broader fractured blocks and oblique ledges.
    let ri=0;while(ri<rimProfile.length&&rimProfile[ri].angle<angle)ri++;
    const ra=rimProfile[(ri+rimProfile.length-1)%rimProfile.length],rb=rimProfile[ri%rimProfile.length],aa=ri===0?ra.angle-Math.PI*2:ra.angle,ab=ri===rimProfile.length?rb.angle+Math.PI*2:rb.angle;
    const rimRadius=T.MathUtils.lerp(ra.radius,rb.radius,clamp((angle-aa)/(ab-aa),0,1)),vertical=noise((angle+Math.PI)*4.6,Math.floor(depth/4.3)*.34+center.x*.02),fault=fbm((angle+Math.PI)*3.3,depth*.065+center.z*.1),layer=depth*.19+noise(angle*3,center.x)*.75;
    const ledge=(smooth(layer%1,.03,.13)-smooth(layer%1,.67,.84))*1.05;
    const target=rimRadius*(1+.13*t)+(vertical-.45)*3.5+(fault-.48)*3.8+ledge+(noise(p.x*.8,p.z*.8+p.y*.17)-.5)*.22;
    const beforeX=p.x,beforeZ=p.z,shift=clamp(target-radius,-2.7,3.5)*protection;p.x+=x/Math.max(radius,.001)*shift;p.z+=z/Math.max(radius,.001)*shift;cavity=clamp(.85-fault,0,1);
    if(depth<1.15){protectedVertices.push(p.toArray());stats.protected++;stats.maxProtectedShift=Math.max(stats.maxProtectedShift,Math.hypot(p.x-beforeX,p.z-beforeZ));}
   }
   output.push(p.x,p.y,p.z);tops.push(cliff?depth:30);shelter.push(cavity);
  }
  for(const tri of surfaceFaces){
   if(cliff){const [a,b,c]=tri.map(i=>surface[i]),normal=b.clone().sub(a).cross(c.clone().sub(a)),radial=a.clone().add(b).add(c).multiplyScalar(1/3).sub(center);radial.y=0;
    if(normal.dot(radial)<0){[tri[1],tri[2]]=[tri[2],tri[1]];stats.correctedWinding++;}
   }
   faces.push(...tri.map(i=>i+offset));
  }
  if(cliff)cliffSites.push({center:center.toArray(),radius:Math.max(...surface.map(p=>Math.hypot(p.x-center.x,p.z-center.z))),crest});
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(output,3));g.setAttribute('geoTop',new T.Float32BufferAttribute(tops,1));g.setAttribute('geoShelter',new T.Float32BufferAttribute(shelter,1));g.setIndex(faces);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();stats.triangles=faces.length/3;g.userData.geology=stats;g.userData.protectedVertices=protectedVertices;g.userData.cliffSites=cliffSites;return g;
}

function buildTalus(root,cliff){
 root.updateWorldMatrix(true,true);const ground=[],pieces=[],placements=[];root.traverse(o=>{if(o.isMesh&&/^HC ground/.test(o.material?.name||''))ground.push(o);});
 const sites=cliff.geometry.userData.cliffSites,ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
 for(const [si,site]of sites.entries()){
  if(site.crest<-12)continue;
  for(let i=0;i<38;i++){
   const seed=si*59+i*7.1,angle=i/38*Math.PI*2+noise(seed,5)*.10,r=site.radius+noise(seed,17)*4.3+.5,x=site.center[0]+Math.cos(angle)*r,z=site.center[2]+Math.sin(angle)*r;
   if(sites.some(s=>s!==site&&s.crest>-12&&Math.hypot(x-s.center[0],z-s.center[2])<s.radius+.7))continue;
   const origin=root.localToWorld(new T.Vector3(x,-12,z));ray.set(origin,down);ray.far=17;
   const hit=ray.intersectObjects(ground,false)[0];if(!hit)continue;const floor=root.worldToLocal(hit.point.clone()).y;
   // Only the lower, non-building apron receives scree. All terrace approaches,
   // bridges and portal landings are several metres above this band.
   if(floor>-15||floor<-28)continue;
   const width=.75+noise(seed,11)*2.4,height=width*(.52+noise(seed,29)*.60),depth=width*(.70+noise(seed,37)*.50),points=[];
   if(placements.some(p=>Math.hypot(p.x-x,p.z-z)<(p.width+width)*.42))continue;
   for(let row=0;row<3;row++)for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2+(row===1?.21:0),radial=(row===1?1:.70)*(.84+noise(seed+k,row+9)*.26),y=floor+(row/2-.26)*height;
    points.push(new T.Vector3(x+Math.cos(a)*width*.58*radial,y,z+Math.sin(a)*depth*.58*radial));
   }
   const g=new ConvexGeometry(points),n=g.attributes.position.count;g.setAttribute('geoTop',new T.Float32BufferAttribute(new Float32Array(n).fill(20),1));g.setAttribute('geoShelter',new T.Float32BufferAttribute(new Float32Array(n).fill(.25+noise(seed,99)*.4),1));pieces.push(g);placements.push({x,z,floor,width,height});
  }
 }
 if(!pieces.length)return null;const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());geometry.computeBoundingSphere();geometry.userData.geology={kind:'grounded-talus',rocks:pieces.length,triangles:geometry.attributes.position.count/3,placements};return geometry;
}

const noiseShader=`
float geoHash(vec3 p){p=fract(p*.3183099+vec3(.11,.23,.31));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float geoNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(geoHash(i),geoHash(i+vec3(1,0,0)),f.x),mix(geoHash(i+vec3(0,1,0)),geoHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(geoHash(i+vec3(0,0,1)),geoHash(i+vec3(1,0,1)),f.x),mix(geoHash(i+vec3(0,1,1)),geoHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float geoFbm(vec3 p){return geoNoise(p)*.57+geoNoise(p*2.06+7.)*.28+geoNoise(p*4.11-3.)*.15;}
vec3 geoTri(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
`;
function rockMaterial(maps,{mountain=false,region='highland'}={}){
 const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:.93,metalness:0});m.name='Geology · '+region+(mountain?' range':' bedrock');m.envMapIntensity=.28;
 m.onBeforeCompile=s=>{
  s.uniforms.geologyColor={value:maps.color};s.uniforms.geologyRough={value:maps.rough};
  s.vertexShader='attribute float geoShelter;attribute float geoTop;varying float rockShelter;varying float rockTop;varying vec3 rockPosition;varying vec3 rockNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrockPosition=position;rockNormal=normal;rockShelter=geoShelter;rockTop=geoTop;');
  s.fragmentShader='varying float rockShelter;varying float rockTop;varying vec3 rockPosition;varying vec3 rockNormal;uniform sampler2D geologyColor;uniform sampler2D geologyRough;\n'+noiseShader+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 gp=rockPosition,gn=normalize(rockNormal),gw=pow(abs(gn),vec3(4.));gw/=max(.001,gw.x+gw.y+gw.z);
   vec3 photo=geoTri(geologyColor,gp*${mountain?'.035':'.068'},gw);float grain=dot(photo,vec3(.3,.5,.2)),weather=geoFbm(gp*vec3(.07,.12,.07));
   float strata=gp.y*${mountain?'.16':'.39'}+gp.x*.043+geoFbm(gp*.075)*1.3;float seam=pow(1.-abs(fract(strata)*2.-1.),16.);
   vec3 base=mix(vec3(${mountain?'.045,.061,.072':'.102,.088,.066'}),vec3(${mountain?'.105,.12,.13':'.31,.244,.16'}),weather);
   base*=clamp(pow(grain*3.1,1.5),.30,1.48)*(1.-seam*.14)*(1.-rockShelter*.29);
   float snow=${mountain?`smoothstep(${RANGES[region].snowline.toFixed(1)},${(RANGES[region].snowline+24).toFixed(1)},gp.y+(weather-.5)*20.)*clamp(smoothstep(.3,.72,gn.y)*.96+rockShelter*.35-.13,0.,1.)`:'0.'};
   float moss=${mountain?'(1.-smoothstep(8.,35.,gp.y))*smoothstep(.36,.8,gn.y)*smoothstep(.42,.63,weather)':'(1.-smoothstep(1.5,6.,rockTop))*smoothstep(.2,.7,weather)'};
   base=mix(base,base*vec3(.58,.77,.43),moss*.45);
   diffuseColor.rgb=mix(base,vec3(.48,.54,.57)*(1.+weather*.13),snow);
   float geoBump=(grain*${mountain?'.045':'.065'}-seam*.024)*(1.-snow*.85);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(geoTri(geologyRough,gp*.3,gw).g,.83,.98);');
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 sx=dFdx(vViewPosition),sy=dFdy(vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);vec3 n=abs(det)*normal-sign(det)*(dFdx(geoBump)*r1+dFdy(geoBump)*r2);if(dot(n,n)>1e-20)normal=normalize(n);
  `);
 };m.customProgramCacheKey=()=>`geology-v5-${mountain}-${region}`;return m;
}

export function createGeology(maps){
 const records=[],owned=[],materials=[],replaced=[],hidden=[];
 function add(region,root){
  if(!RANGES[region.id])return;
  if(region.id==='aether')root.traverse(mesh=>{if(!mesh.isMesh||!/_cliffs$/.test(mesh.name))return;let p=mesh;while(p&&!p.userData.floating)p=p.parent;replaced.push({mesh,geometry:mesh.geometry,material:mesh.material});mesh.geometry=sculptIslandCliffs(mesh.geometry,{floating:!!p});if(mesh.geometry.userData.islandSculpture)records.push({name:mesh.name,...mesh.geometry.userData.islandSculpture});});
  const oldRange=root.getObjectByName(region.id==='highland'?'Horncrest_mountain':'Distant_mountain_range');
  if(oldRange){hidden.push({mesh:oldRange,visible:oldRange.visible,noCollision:oldRange.userData.noCollision});oldRange.visible=false;oldRange.userData.noCollision=true;oldRange.userData.replacedByGeology=true;const geometry=buildMountainRange(region.id,{mobile:innerWidth<700}),material=rockMaterial(maps,{mountain:true,region:region.id});materials.push(material);const mesh=new T.Mesh(geometry,material);mesh.name='Geology · '+region.id+' connected mountain range';mesh.userData.noCollision=true;mesh.userData.geology=true;mesh.receiveShadow=true;root.add(mesh);owned.push(mesh);records.push(geometry.userData.geology);}
  if(region.id==='highland'){
   const cliff=root.getObjectByName('Horncrest_rock');if(cliff){replaced.push({mesh:cliff,geometry:cliff.geometry,material:cliff.material});cliff.geometry=sculptHighlandCliffs(cliff.geometry);cliff.material=rockMaterial(maps);cliff.userData.geology=true;materials.push(cliff.material);records.push(cliff.geometry.userData.geology);
    const talus=buildTalus(root,cliff);if(talus){const mesh=new T.Mesh(talus,cliff.material);mesh.name='Geology · Highland grounded scree';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.geology=true;root.add(mesh);owned.push(mesh);records.push(talus.userData.geology);}
   }
  }
 }
 return {add,stats:()=>records,dispose(){owned.forEach(m=>{m.removeFromParent();m.geometry.dispose();});replaced.forEach(({mesh,geometry,material})=>{mesh.geometry.dispose();mesh.geometry=geometry;mesh.material=material;delete mesh.userData.geology;});hidden.forEach(({mesh,visible,noCollision})=>{mesh.visible=visible;mesh.userData.noCollision=noCollision;delete mesh.userData.replacedByGeology;});materials.forEach(m=>m.dispose());}};
}
