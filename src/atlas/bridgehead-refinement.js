import * as T from 'three';
import {Craft} from './architecture-kit.js';

function bridgeCoordinates(p,r){const a=new T.Vector3(r.a[0],r.a[2],-r.a[1]),b=new T.Vector3(r.b[0],r.b[2],-r.b[1]),axis=b.clone().sub(a);axis.y=0;const length=axis.length();axis.normalize();const side=new T.Vector3(-axis.z,0,axis.x),d=p.clone().sub(a),t=d.dot(axis)/length;return{t,v:d.dot(side),y:r.a[2]+(r.b[2]-r.a[2])*t-Math.sin(Math.PI*t)*1.7,a,b,side,length};}
function belongs(p,r,rope){const q=bridgeCoordinates(p,r);if(rope)return q.t>=-.025&&q.t<=1.025&&Math.abs(Math.abs(q.v)-r.width*.58)<.10&&p.y>=q.y-.16&&p.y<=q.y+1.68;
 for(const end of [q.a,q.b])for(const sign of [-1,1]){const center=end.clone().addScaledVector(q.side,r.width*.58*sign);if(Math.hypot(p.x-center.x,p.z-center.z)<=.225&&p.y>=end.y-.025&&p.y<=end.y+2.325)return true;}
 return q.t>=-.025&&q.t<=1.025&&Math.abs(q.v)<=r.width*.5+.025&&Math.abs(p.y-q.y)<.22;}

// Whole connected components prevent a bridge repair clipping an unrelated tree
// or house that happens to intersect the bridge's bounding box.
export function geometryComponents(g){const p=g.attributes.position,idx=g.index,n=p.count,parent=Int32Array.from({length:n},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;},weld=new Map();
 for(let i=0;i<n;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e4)).join(',');if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);}
 for(let i=0;i<(idx?.count??n);i+=3){const a=idx?idx.getX(i):i;join(a,idx?idx.getX(i+1):i+1);join(a,idx?idx.getX(i+2):i+2);}
 const groups=new Map();for(let i=0;i<n;i++){const root=find(i);if(!groups.has(root))groups.set(root,{vertices:[],triangles:[]});groups.get(root).vertices.push(i);}for(let i=0;i<(idx?.count??n);i+=3)groups.get(find(idx?idx.getX(i):i)).triangles.push(i);return[...groups.values()];}

function removeVillageSpans(source,routes){const report=[];source.updateWorldMatrix(true,true);const inverse=source.matrixWorld.clone().invert();source.traverse(mesh=>{if(!mesh.isMesh||!/^HC (wood|rope)(\.|$)/.test(mesh.material?.name||''))return;const rope=/^HC rope/.test(mesh.material.name),g=mesh.geometry,p=g.attributes.position,idx=g.index,toRoot=inverse.clone().multiply(mesh.matrixWorld),removed=new Set(),counts=routes.map(()=>({components:0,triangles:0}));
 for(const group of geometryComponents(g)){const points=group.vertices.map(i=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(toRoot));const route=routes.findIndex(r=>points.every(v=>belongs(v,r,rope)));if(route<0)continue;counts[route].components++;counts[route].triangles+=group.triangles.length;group.triangles.forEach(i=>removed.add(i));}
 for(const [i,r]of routes.entries()){const n=Math.max(12,Math.floor(Math.hypot(...r.a.map((v,j)=>r.b[j]-v))/.55)),expected=rope?(2*n+2*(Math.floor(n/4)+1))*20:(n+1)*16+112;if(counts[i].triangles!==expected)throw Error('Incomplete village span replacement: '+mesh.name+' route '+i+' '+counts[i].triangles+'/'+expected);}
 const keep=[];for(let i=0;i<(idx?.count??p.count);i+=3)if(!removed.has(i))for(let j=0;j<3;j++)keep.push(idx?idx.getX(i+j):i+j);
 if(removed.size){mesh.geometry=g.clone();mesh.geometry.setIndex(keep);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();}report.push({mesh:mesh.name,rope,counts,removedTriangles:removed.size});});return report;}

export function highlandTerrainSampler(source,{rock=false}={}){
 // Index only the actual upward ground triangles. The same terrain query is
 // used for decks, post foundations and nearby tree roots.
 const cells=new Map(),size=4;source.updateWorldMatrix(true,true);const inverse=source.matrixWorld.clone().invert();
 source.traverse(o=>{if(!o.isMesh||!(/^HC ground/.test(o.material?.name||'')||(rock&&o.name==='Horncrest_rock')))return;const p=o.geometry.attributes.position,idx=o.geometry.index,matrix=inverse.clone().multiply(o.matrixWorld);
  for(let i=0;i<(idx?.count??p.count);i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(matrix));if(b.clone().sub(a).cross(c.clone().sub(a)).y<=1e-8)continue;
   const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z),triangle={a,b,c,den};for(let x=Math.floor(Math.min(a.x,b.x,c.x)/size);x<=Math.floor(Math.max(a.x,b.x,c.x)/size);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/size);z<=Math.floor(Math.max(a.z,b.z,c.z)/size);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(triangle);}
  }
 });
 return(x,z,max=100,min=-30)=>{let height=null;for(const {a,b,c,den}of cells.get(Math.floor(x/size)+','+Math.floor(z/size))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u<-.00001||v<-.00001||u+v>1.00001)continue;const y=u*a.y+v*b.y+(1-u-v)*c.y;if(y<=max&&y>=min&&(height===null||y>height))height=y;}return height;};
}
function slab(c,a,b,side,width,topOffset,thickness){const points=[a.clone().addScaledVector(side,-width/2),a.clone().addScaledVector(side,width/2),b.clone().addScaledVector(side,-width/2),b.clone().addScaledVector(side,width/2)];points.forEach(p=>p.y+=topOffset);points.push(...points.map(p=>p.clone().add(new T.Vector3(0,-thickness,0))));const faces=[[0,2,1],[1,2,3],[4,5,6],[5,7,6],[0,4,2],[2,4,6],[1,3,5],[3,7,5],[0,1,4],[1,5,4],[2,6,3],[3,6,7]],pos=[],uv=[];if(points[2].clone().sub(points[0]).cross(points[1].clone().sub(points[0])).y<0)faces.forEach(f=>f.reverse());for(const f of faces)for(const i of f){pos.push(...points[i].toArray());uv.push((i%2)*width/2,points[i].distanceTo(a)/2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();c.add(g,'wood');}

export function refineBridgeheads(c,source,routes){const terrain=highlandTerrainSampler(source,{rock:true}),village=routes.slice(0,5),removed=removeVillageSpans(source,village),records=[];
 for(const [id,original]of village.entries()){
  // The eastern rim begins before the old landing: approach it from the clear
  // northern terrace, outside the existing tent, with enough run to gain height.
  const r=id===3?{...original,a:[10,31,17]}:original;const deck=new Craft(c.materials,'山城桥面 '+(id+1));const {a,b,side,length}=bridgeCoordinates(new T.Vector3(),r),n=Math.max(16,Math.ceil(length/.34)),points=[];
  for(let i=0;i<=n;i++){const t=i/n,p=a.clone().lerp(b,t);p.y-=Math.sin(t*Math.PI)*1.7;for(let offset=-r.width/2;offset<=r.width/2+.001;offset+=r.width/10){for(const advance of [-.36,0,.36]){const q=p.clone().addScaledVector(side,offset).addScaledVector(b.clone().sub(a).setY(0).normalize(),advance),h=terrain(q.x,q.z,Math.max(r.a[2],r.b[2])+5);if(h!==null)p.y=Math.max(p.y,h+.15);}}points.push(p);}
  // Keep a single rising or falling span, rather than copying every terrain
  // dip into a wavy deck. The envelope only raises wood clear of the ground.
  if(Math.abs(points[0].y-points[n].y)<.12){const level=Math.max(...points.map(p=>p.y));points.forEach(p=>p.y=level);}
  else if(points[0].y>points[n].y){for(let i=n-1;i>=0;i--)points[i].y=Math.max(points[i].y,points[i+1].y);}
  else for(let i=1;i<=n;i++)points[i].y=Math.max(points[i].y,points[i-1].y);
  for(let pass=0;pass<3;pass++){const heights=points.map(p=>p.y);for(let i=1;i<n;i++)points[i].y=Math.max(heights[i],(heights[i-1]+heights[i]*2+heights[i+1])/4);}
  // An upward-only grade envelope retains terrain clearance across cliff rims.
  for(let pass=0;pass<2;pass++){for(let i=1;i<points.length;i++)points[i].y=Math.max(points[i].y,points[i-1].y-length/n*.70);for(let i=n-1;i>=0;i--)points[i].y=Math.max(points[i].y,points[i+1].y-length/n*.70);}
  for(let i=1;i<points.length;i++){const A=points[i-1],B=points[i];slab(deck,A,B,side,r.width,-.03,.11);slab(deck,A.clone().lerp(B,.012),B.clone().lerp(A,.012),side,r.width,0,.085);}
  for(const sign of [-1,1]){
   deck.line(points.map(p=>p.clone().addScaledVector(side,sign*r.width*.43).add(new T.Vector3(0,-.20,0)).toArray()),.09,'wood');
   const bearings=[0,...points.map((_,i)=>i).filter(i=>i>0&&i<n&&i%8===0),n];
   for(const i of bearings){const top=points[i].clone().addScaledVector(side,sign*r.width*.58),ground=terrain(top.x,top.z,top.y-.12);if(ground===null||top.y-ground<.28)continue;const footingTop=ground+.16;
    c.cylinder([top.x,ground+.065,top.z],.23,.19,'darkstone',.20,10);c.tube([top.x,footingTop,top.z],[top.x,top.y-.12,top.z],.14,'wood',.11,10);
    if(top.y-footingTop>.8){const inward=top.clone().addScaledVector(side,-sign*r.width*.32);c.tube([top.x,Math.max(footingTop+.08,top.y-1.3),top.z],[inward.x,top.y-.18,inward.z],.065,'wood',.065,8);}
   }
   const rail=points.map(p=>p.clone().addScaledVector(side,sign*r.width*.58).add(new T.Vector3(0,1.5,0)));c.line(rail.map(p=>p.toArray()),.045,'leather');for(let i=4;i<n;i+=4){const base=points[i].clone().addScaledVector(side,sign*r.width*.58);c.tube(base.toArray(),base.clone().add(new T.Vector3(0,1.5,0)).toArray(),.048,'wood',.038,8);c.tube(base.clone().add(new T.Vector3(0,.10,0)).toArray(),points[i].clone().addScaledVector(side,sign*r.width*.40).add(new T.Vector3(0,-.12,0)).toArray(),.035,'iron');}
   for(const [end,p]of [points[0],points.at(-1)].entries()){const base=p.clone().addScaledVector(side,sign*r.width*.58);c.tube(base.clone().add(new T.Vector3(0,-.20,0)).toArray(),base.clone().add(new T.Vector3(0,2.0662,0)).toArray(),.145,'wood',.12,12);for(const y of [.12,1.40,2.02])c.cylinder([base.x,base.y+y,base.z],y>2?.16:.15,.055,'iron',y>2?.16:.15,12);c.lamp([base.x,base.y+2.10,base.z],.52);}
  }
  for(const p of [points[0],points.at(-1)]){const from=p.clone().addScaledVector(side,-r.width*.7).add(new T.Vector3(0,-.15,0)),to=p.clone().addScaledVector(side,r.width*.7).add(new T.Vector3(0,-.15,0));deck.tube(from.toArray(),to.toArray(),.15,'wood',.15,8);}
  const deckRoot=deck.finish(source);(c.bridgeDecks??=[]).push(deckRoot);c.parts+=deck.parts;deckRoot.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();o.userData.navStepRange=[o.geometry.boundingBox.min.y,o.geometry.boundingBox.max.y];}});
  records.push({id,width:r.width,original,points:points.map(p=>p.toArray()),headHeights:[points[0].y,points.at(-1).y]});
 }
 // The three original Aether crossing spans and their timber/rope are intact.
 // Their existing post caps carry the lamps; do not add floating stone bases.
 const wood=[];source.traverse(o=>{if(o.isMesh&&/^HC wood(\.|$)/.test(o.material?.name||''))wood.push(o);});const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),crossings=[];
 for(const [offset,r]of routes.slice(5).entries()){const {side}=bridgeCoordinates(new T.Vector3(),r);for(const [end,p]of [r.a,r.b].entries())for(const sign of [-1,1]){const pos=new T.Vector3(p[0],p[2]+2.3,-p[1]).addScaledVector(side,sign*r.width*.58);ray.set(source.localToWorld(pos.clone().add(new T.Vector3(0,.12,0))),down);ray.far=.24;const hit=ray.intersectObjects(wood,false)[0];if(!hit)throw Error('Original crossing post cap missing');pos.y=source.worldToLocal(hit.point.clone()).y;c.cylinder([pos.x,pos.y+.025,pos.z],.18,.05,'iron',.18,12);c.lamp([pos.x,pos.y+.05+.065*.52,pos.z],.52);crossings.push({route:offset+5,end,sign,cap:pos.toArray()});}}
 source.userData.bridgeRefinement={removed,records,crossings};return source.userData.bridgeRefinement;
}
