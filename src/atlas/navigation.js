import * as T from 'three';

// One spatial index shared by every region. Heights and obstacles come from model triangles.
export function createNavigation(){
 const dynamic=[],cells=new Map(),sets=[],size=5,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),normal=new T.Vector3();
 const heightRay=new T.Raycaster(),heightNormal=new T.Vector3(),heightNormalMatrix=new T.Matrix3();
 const matrix=new T.Matrix4(),inst=new T.Matrix4(),indexCopies=new WeakMap();let triangles=0,lastObstacle='',lastGround='',diagnostics=null;
 // Keep indexed world vertices once, rather than expanding every triangle's
 // three corners. Collision geometry and Float32 world coordinates stay exact.
 function corners(s,k,v0=a,v1=b,v2=c){const i=k*3,p=s.positions,idx=s.index;v0.fromArray(p,(idx?idx[i]:i)*3);v1.fromArray(p,(idx?idx[i+1]:i+1)*3);v2.fromArray(p,(idx?idx[i+2]:i+2)*3);}
 function append(list,si,triangle){if(list.length+2>list.data.length){const next=new Uint32Array(Math.max(16,list.data.length*2));next.set(list.data);list.data=next;}list.data[list.length++]=si;list.data[list.length++]=triangle;}
 function add(root){
  diagnostics=null;
  root.updateWorldMatrix(true,true);
  root.traverse(o=>{
   if(!o.isMesh||o.userData.noCollision)return;
   const name=o.name+' '+(Array.isArray(o.material)?o.material.map(m=>m.name).join(' '):o.material?.name);
   if(/HC pine|leaves|canopy|heather|flowers|needles|crown|grass|Waterfall|water.surface|flowing.river|birds|Distant.range|Distant.atmospheric|glow|light.beam|tracery/i.test(name)&&!/Arrival[ _]grass|terrace|moss|ground/i.test(name))return;
   const p=o.geometry.attributes.position,idx=o.geometry.index;if(!p)return;
   const count=idx?idx.count:p.count;let indices=null;
   if(idx){let cached=indexCopies.get(idx);if(!cached||cached.version!==idx.version){cached={version:idx.version,array:idx.array.slice()};indexCopies.set(idx,cached);}indices=cached.array;}
   for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
    matrix.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(instance,inst);matrix.multiply(inst);}
    let floating=o;while(floating&&!floating.userData.floating)floating=floating.parent;
    const stepRange=o.userData.navStepRange?.map(y=>new T.Vector3(0,y,0).applyMatrix4(matrix).y);
    const precise=new Float64Array(p.count*3);for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i).applyMatrix4(matrix);a.toArray(precise,i*3);}
    const set={mesh:o,name:o.name,positions:new Float32Array(precise),index:indices,data:new Float32Array(count),visited:new Uint32Array(count/3),object:floating,baseY:floating?.getWorldPosition(new T.Vector3()).y||0,dy:0,stepRange};const si=sets.length;sets.push(set);
    for(let i=0;i<count;i+=3){
     a.fromArray(precise,(indices?indices[i]:i)*3);b.fromArray(precise,(indices?indices[i+1]:i+1)*3);c.fromArray(precise,(indices?indices[i+2]:i+2)*3);
     normal.subVectors(b,a).cross(ac.subVectors(c,a)).normalize();
     set.data.set([normal.y,Math.min(a.y,b.y,c.y),Math.max(a.y,b.y,c.y)],i);
     const x0=Math.floor(Math.min(a.x,b.x,c.x)/size),x1=Math.floor(Math.max(a.x,b.x,c.x)/size),z0=Math.floor(Math.min(a.z,b.z,c.z)/size),z1=Math.floor(Math.max(a.z,b.z,c.z)/size);
     // Background polygons spanning the entire world are scenery, not navigable ground.
     if((x1-x0+1)*(z1-z0+1)>1600)continue;
     for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z;let list=cells.get(key);if(!list)cells.set(key,list={data:new Uint32Array(16),length:0});append(list,si,i/3);}
     triangles++;
    }
   }
  });
 }
 function sync(){const heights=new Map();for(const s of sets)if(s.object){if(!heights.has(s.object))heights.set(s.object,s.object.getWorldPosition(a).y);s.dy=heights.get(s.object)-s.baseY;}}
 function height(x,z,max=Infinity,min=-Infinity,terrainOnly=false){let best=null;const list=cells.get(Math.floor(x/size)+','+Math.floor(z/size));
  for(let i=0;i<(list?.length||0);i+=2){const s=sets[list.data[i]],d=s.data,k=list.data[i+1],j=k*3,dy=s.dy;if(terrainOnly&&!/floor|ground|terrain|grass|moss|cliffs|rock/i.test(s.name))continue;if(d[j]<.57||d[j+1]+dy>max||d[j+2]+dy<min)continue;
   corners(s,k);const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-9)continue;
   const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;if(Math.min(u,v,w)<-.0001)continue;
   const y=u*a.y+v*b.y+w*c.y+dy;if(y<=max&&y>=min&&(best===null||y>best)){best=y;lastGround=s.name;}
  }
  // Opt-in moving ramps expose their current top surface, never the door leaves.
  for(const mesh of dynamic){if(!mesh.userData.navWalkable)continue;mesh.updateWorldMatrix(true,false);heightRay.set(new T.Vector3(x,Number.isFinite(max)?max:1e6,z),new T.Vector3(0,-1,0));heightRay.near=0;heightRay.far=Number.isFinite(min)?heightRay.ray.origin.y-min:2e6;heightNormalMatrix.getNormalMatrix(mesh.matrixWorld);
   for(const hit of heightRay.intersectObject(mesh,false)){if(!hit.face||heightNormal.copy(hit.face.normal).applyMatrix3(heightNormalMatrix).normalize().y<.57)continue;const y=hit.point.y;if(y<=max&&y>=min&&(best===null||y>best)){best=y;lastGround=mesh.parent.name;}}
  }return best;
 }
 const ray=new T.Ray(),hit=new T.Vector3(),direction=new T.Vector3(),triangle=new T.Triangle();
 const nearPoint=new T.Vector3(),lineU=new T.Vector3(),lineV=new T.Vector3(),lineW=new T.Vector3();
 let query=0;
 // Squared distance between bounded segments (including point degeneracies).
 function segmentDistanceSq(p0,p1,q0,q1){
  lineU.subVectors(p1,p0);lineV.subVectors(q1,q0);lineW.subVectors(p0,q0);
  const aa=lineU.lengthSq(),bb=lineU.dot(lineV),cc=lineV.lengthSq(),dd=lineU.dot(lineW),ee=lineV.dot(lineW);
  let s=0,t=0;
  if(aa<1e-12)t=T.MathUtils.clamp(ee/Math.max(cc,1e-12),0,1);
  else if(cc<1e-12)s=T.MathUtils.clamp(-dd/aa,0,1);
  else{const den=aa*cc-bb*bb;s=den>1e-12?T.MathUtils.clamp((bb*ee-cc*dd)/den,0,1):0;t=(bb*s+ee)/cc;if(t<0){t=0;s=T.MathUtils.clamp(-dd/aa,0,1);}else if(t>1){t=1;s=T.MathUtils.clamp((bb-dd)/aa,0,1);}}
  return lineW.addScaledVector(lineU,s).addScaledVector(lineV,-t).lengthSq();
 }
 function triangleDistanceSq(from,to,lenSq){
  if(lenSq>1e-12&&ray.intersectTriangle(a,b,c,false,hit)&&hit.distanceToSquared(from)<=lenSq)return 0;
  triangle.set(a,b,c);
  return Math.min(triangle.closestPointToPoint(from,nearPoint).distanceToSquared(from),triangle.closestPointToPoint(to,nearPoint).distanceToSquared(to),segmentDistanceSq(from,to,a,b),segmentDistanceSq(from,to,b,c),segmentDistanceSq(from,to,c,a));
 }
 // Pick the closest solid triangle, including walls that occlude the ground.
 // Reuse the spatial index and floating offsets instead of raycasting all scenery.
 function pickGround(inputRay,maxDistance=60){
  const end=inputRay.at(maxDistance,new T.Vector3()),stamp=++query;let best=maxDistance,result=null;
  const minY=Math.min(inputRay.origin.y,end.y),maxY=Math.max(inputRay.origin.y,end.y);
  for(let x=Math.floor(Math.min(inputRay.origin.x,end.x)/size);x<=Math.floor(Math.max(inputRay.origin.x,end.x)/size);x++)for(let z=Math.floor(Math.min(inputRay.origin.z,end.z)/size);z<=Math.floor(Math.max(inputRay.origin.z,end.z)/size);z++){
   const list=cells.get(x+','+z);
   for(let i=0;i<(list?.length||0);i+=2){const s=sets[list.data[i]],k=list.data[i+1],j=k*3;if(s.visited[k]===stamp)continue;s.visited[k]=stamp;if(s.data[j+1]+s.dy>maxY||s.data[j+2]+s.dy<minY)continue;
    corners(s,k);a.y+=s.dy;b.y+=s.dy;c.y+=s.dy;
    if(inputRay.intersectTriangle(a,b,c,false,hit)){const distance=hit.distanceTo(inputRay.origin);if(distance<best){best=distance;result={point:hit.clone(),walkable:s.data[j]>=.57};}}
   }
  }
  heightRay.ray.copy(inputRay);heightRay.near=0;heightRay.far=best;
  for(const mesh of dynamic){mesh.updateWorldMatrix(true,false);for(const h of heightRay.intersectObject(mesh,false)){if(h.distance>=best)continue;best=h.distance;heightNormalMatrix.getNormalMatrix(mesh.matrixWorld);result={point:h.point.clone(),walkable:!!mesh.userData.navWalkable&&!!h.face&&heightNormal.copy(h.face.normal).applyMatrix3(heightNormalMatrix).normalize().y>=.57};}}
  return result?.walkable?result.point:null;
 }
 function obstructed(from,to,radius=.22,groundY=null,ignoreDynamic=null){
  direction.subVectors(to,from);const lenSq=direction.lengthSq();if(lenSq>1e-12)direction.normalize();else direction.set(0,1,0);ray.set(from,direction);
  const xMin=Math.min(from.x,to.x)-radius,xMax=Math.max(from.x,to.x)+radius,zMin=Math.min(from.z,to.z)-radius,zMax=Math.max(from.z,to.z)+radius,yMin=Math.min(from.y,to.y)-radius,yMax=Math.max(from.y,to.y)+radius;
  const stamp=++query;
  for(let x=Math.floor(xMin/size);x<=Math.floor(xMax/size);x++)for(let z=Math.floor(zMin/size);z<=Math.floor(zMax/size);z++){
   const list=cells.get(x+','+z);
   for(let i=0;i<(list?.length||0);i+=2){
    const s=sets[list.data[i]],d=s.data,k=list.data[i+1],j=k*3;if(s.visited[k]===stamp)continue;s.visited[k]=stamp;
    if(d[j+1]+s.dy>yMax||d[j+2]+s.dy<yMin)continue;
    // Walkable steps under the feet may be climbed, not treated as chest walls.
    const lowRiser=s.stepRange&&d[j+1]>=s.stepRange[0]-.001&&d[j+2]<=s.stepRange[1]+.001;
    if(groundY!==null&&(d[j]>.57||lowRiser)&&d[j+2]+s.dy<=groundY+.43)continue;
    corners(s,k);if(Math.min(a.x,b.x,c.x)>xMax||Math.max(a.x,b.x,c.x)<xMin||Math.min(a.z,b.z,c.z)>zMax||Math.max(a.z,b.z,c.z)<zMin)continue;
    a.y+=s.dy;b.y+=s.dy;c.y+=s.dy;
    if(triangleDistanceSq(from,to,lenSq)<radius*radius){lastObstacle=s.name;return true;}
   }
  }
  for(const mesh of dynamic){if(ignoreDynamic===true||mesh===ignoreDynamic)continue;mesh.updateWorldMatrix(true,false);const box=new T.Box3().setFromObject(mesh);if(box.max.x<xMin||box.min.x>xMax||box.max.z<zMin||box.min.z>zMax||box.max.y<yMin||box.min.y>yMax)continue;const pos=mesh.geometry.attributes.position,idx=mesh.geometry.index;
   for(let i=0;i<(idx?.count||pos.count);i+=3){a.fromBufferAttribute(pos,idx?idx.getX(i):i).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);if(mesh.userData.navWalkable&&groundY!==null){if(Math.max(a.y,b.y,c.y)<=groundY+.43)continue;}if(triangleDistanceSq(from,to,lenSq)<radius*radius){lastObstacle=mesh.parent.name;return true;}}
  }return false;
 }
 // Test an oriented solid volume against the same real triangles as walking.
 // The ignored descendants are for the querying vehicle itself, never scenery.
 function clearVolume(transform,bounds,ignore=[]){
  const inverse=transform.clone().invert(),worldBox=bounds.clone().applyMatrix4(transform),localTriangle=new T.Triangle(),stamp=++query;
  const excluded=o=>{for(let p=o;p;p=p.parent)if(ignore.includes(p))return true;return false;};
  for(let x=Math.floor(worldBox.min.x/size);x<=Math.floor(worldBox.max.x/size);x++)for(let z=Math.floor(worldBox.min.z/size);z<=Math.floor(worldBox.max.z/size);z++){
   const list=cells.get(x+','+z);
   for(let i=0;i<(list?.length||0);i+=2){const s=sets[list.data[i]],d=s.data,k=list.data[i+1],j=k*3;if(s.visited[k]===stamp)continue;s.visited[k]=stamp;if(excluded(s.mesh)||d[j+1]+s.dy>worldBox.max.y||d[j+2]+s.dy<worldBox.min.y)continue;
    corners(s,k,localTriangle.a,localTriangle.b,localTriangle.c);localTriangle.a.y+=s.dy;localTriangle.b.y+=s.dy;localTriangle.c.y+=s.dy;localTriangle.a.applyMatrix4(inverse);localTriangle.b.applyMatrix4(inverse);localTriangle.c.applyMatrix4(inverse);
    if(bounds.intersectsTriangle(localTriangle)){lastObstacle=s.name;return false;}
   }
  }
  for(const mesh of dynamic){if(excluded(mesh))continue;mesh.updateWorldMatrix(true,false);const box=new T.Box3().setFromObject(mesh);if(!worldBox.intersectsBox(box))continue;const matrix=inverse.clone().multiply(mesh.matrixWorld),pos=mesh.geometry.attributes.position,idx=mesh.geometry.index;
   for(let i=0;i<(idx?.count||pos.count);i+=3){localTriangle.a.fromBufferAttribute(pos,idx?idx.getX(i):i).applyMatrix4(matrix);localTriangle.b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1).applyMatrix4(matrix);localTriangle.c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2).applyMatrix4(matrix);if(bounds.intersectsTriangle(localTriangle)){lastObstacle=mesh.name;return false;}}
  }return true;
 }
 const bodyBottom=new T.Vector3(),bodyTop=new T.Vector3(),probe=new T.Vector3(),walkCandidate=new T.Vector3();
 function clearBody(pos,flying=false){
  const radius=flying?.37:.28;
  bodyBottom.set(pos.x,pos.y+radius+.025,pos.z);bodyTop.set(pos.x,pos.y+(flying?1.56:1.47),pos.z);
  return !obstructed(bodyBottom,bodyTop,radius,flying?null:pos.y);
 }
 function walk(pos,dx,dz){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));walkCandidate.copy(pos);
  for(let step=0;step<steps;step++){
   const y=height(walkCandidate.x+dx/steps,walkCandidate.z+dz/steps,walkCandidate.y+.43,walkCandidate.y-.65);if(y===null)return false;
   probe.set(walkCandidate.x+dx/steps,y,walkCandidate.z+dz/steps);if(!clearBody(probe))return false;
   for(const [ox,oz] of [[.12,0],[-.12,0],[0,.12],[0,-.12]])if(height(probe.x+ox,probe.z+oz,y+.3,y-.5)===null)return false;
   walkCandidate.copy(probe);
  }
  pos.copy(walkCandidate);return true;
 }
 const flyProbe=new T.Vector3();
 function canFly(from,to){
  const steps=Math.max(1,Math.ceil(from.distanceTo(to)/.16));
  for(let i=1;i<=steps;i++)if(!clearBody(flyProbe.copy(from).lerp(to,i/steps),true))return false;
  return true;
 }
 function landing(x,z,nearY=40,radius=8){let best=null,score=Infinity;sync();
  for(let ring=0;ring<=radius;ring+=.7)for(let i=0;i<(ring?16:1);i++){
   const angle=i*Math.PI/8,xx=x+Math.cos(angle)*ring,zz=z+Math.sin(angle)*ring,y=height(xx,zz,nearY+1);if(y===null)continue;
   const candidate=new T.Vector3(xx,y,zz);if(!clearBody(candidate))continue;
   const val=ring+Math.abs(y-nearY)*.1;if(val>=score)continue;
   const exit=new T.Vector3();let exits=0;
   for(const [dx,dz] of [[.65,0],[-.65,0],[0,.65],[0,-.65]])if(walk(exit.copy(candidate),dx,dz))exits++;
   if(exits>=3){score=val;best=candidate;}
  }return best;
 }
 return {pickGround,clearVolume,add,addDynamic(mesh,{walkable=false}={}){mesh.userData.navWalkable=walkable;dynamic.push(mesh);return()=>{const i=dynamic.indexOf(mesh);if(i>=0)dynamic.splice(i,1);};},sync,height,walk,obstructed,clearBody,canFly,landing,get lastObstacle(){return lastObstacle;},stats:()=>({lastObstacle,lastGround,...(diagnostics??={triangles,cells:cells.size,bytes:sets.reduce((n,s)=>n+s.positions.byteLength+s.data.byteLength+s.visited.byteLength,0)+[...new Set(sets.map(s=>s.index).filter(Boolean))].reduce((n,a)=>n+a.byteLength,0)+[...cells.values()].reduce((n,c)=>n+c.data.byteLength,0),largest:sets.map(s=>[s.name,s.data.length/3]).sort((a,b)=>b[1]-a[1]).slice(0,5)})})};
}
