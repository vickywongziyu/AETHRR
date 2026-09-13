import * as T from 'three';

// Recover the original tube centre-lines, then join consecutive sections into
// continuous bark surfaces. Tree locations, forks and canopy anchors stay put.
export function rebuildBranches(source,detail=1){
 const p=source.attributes.position,idx=source.index;if(!idx)return source;const parent=Int32Array.from({length:p.count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<idx.count;i+=3){const a=find(idx.getX(i));parent[find(idx.getX(i+1))]=a;parent[find(idx.getX(i+2))]=a;}
 const groups=new Map();for(let i=0;i<p.count;i++){const k=find(i);if(!groups.has(k))groups.set(k,{vertices:[],faces:[]});groups.get(k).vertices.push(i);}for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];groups.get(find(ids[0])).faces.push(ids);}
 const segments=[],fallback=[],v=i=>new T.Vector3().fromBufferAttribute(p,i);
 for(const group of groups.values()){
  if(group.vertices.length<8||group.vertices.length>80){fallback.push(group);continue;}
  const axes=[];for(const ids of group.faces){const [a,b,c]=ids.map(v),normal=b.sub(a).cross(c.sub(a));if(normal.lengthSq()<1e-10)continue;normal.normalize();let axis=axes.find(n=>Math.abs(n.direction.dot(normal))>.9998);if(!axis)axes.push(axis={direction:normal,count:0});axis.count++;}
  axes.sort((a,b)=>b.count-a.count);if(!axes.length){fallback.push(group);continue;}const axis=axes[0].direction,points=group.vertices.map(v),projections=points.map(p=>p.dot(axis)),lo=Math.min(...projections),hi=Math.max(...projections),tolerance=Math.max(.008,(hi-lo)*.013),ends=[[],[]];
  points.forEach((p,i)=>{if(Math.abs(projections[i]-lo)<tolerance)ends[0].push(p);else if(Math.abs(projections[i]-hi)<tolerance)ends[1].push(p);});
  if(ends.some(a=>a.length<4)||ends[0].length+ends[1].length!==points.length){fallback.push(group);continue;}
  const e=ends.map(points=>{const c=points.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(points.length);return {position:c,radius:points.reduce((s,p)=>s+p.distanceTo(c),0)/points.length};});if(e[0].position.distanceTo(e[1].position)<.02){fallback.push(group);continue;}segments.push({ends:e});
 }
 if(segments.length<3)return source;
 const nodes=[],buckets=new Map(),step=.035;
 function node(endpoint){const q=endpoint.position,key=q.toArray().map(n=>Math.floor(n/step)),near=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)near.push(...(buckets.get([key[0]+x,key[1]+y,key[2]+z].join(','))||[]));let n=near.find(n=>n.position.distanceTo(q)<.014);
  if(!n){n={position:q.clone(),radius:endpoint.radius,edges:[],id:nodes.length};nodes.push(n);const k=key.join(',');if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(n);}else n.radius=Math.max(n.radius,endpoint.radius);return n;
 }
 segments.forEach((s,i)=>{s.nodes=s.ends.map(node);s.nodes.forEach(n=>n.edges.push(i));});const visited=new Set(),chains=[];
 function follow(start,edge){const chain=[start];let current=start,e=edge;while(!visited.has(e)){visited.add(e);const next=segments[e].nodes.find(n=>n!==current);if(!next)break;chain.push(next);if(next.edges.length!==2)break;e=next.edges.find(i=>i!==e);current=next;}if(chain.length>1)chains.push(chain);}
 nodes.filter(n=>n.edges.length!==2).forEach(n=>n.edges.forEach(e=>follow(n,e)));segments.forEach((s,i)=>{if(!visited.has(i))follow(s.nodes[0],i);});
 const positions=[],uv=[],indices=[];let joined=0;
 for(const chain of chains){
  const endpointRadius=n=>n.edges.length===1&&n.position.y<.55&&Math.hypot(n.position.x,n.position.z)>.8?n.radius*.12:n.radius;
  const pts=chain.map(n=>n.position),curve=new T.CatmullRomCurve3(pts,false,'centripetal'),length=curve.getLength(),steps=Math.max(3,Math.min(Math.ceil(48*detail),Math.ceil(length/(.22/detail)))),thick=chain.some(n=>n.radius>.20),sides=detail===1?(thick?12:8):detail>=.65?(thick?8:6):(thick?6:4),frames=curve.computeFrenetFrames(steps,false),offset=positions.length/3;
  const distances=[0];for(let i=1;i<chain.length;i++)distances.push(distances[i-1]+pts[i].distanceTo(pts[i-1]));const total=distances.at(-1);joined+=Math.max(0,chain.length-2);
  for(let j=0;j<=steps;j++){const t=j/steps,center=curve.getPointAt(t),d=t*total;let k=0;while(k<distances.length-2&&distances[k+1]<d)k++;const f=T.MathUtils.clamp((d-distances[k])/Math.max(.001,distances[k+1]-distances[k]),0,1),radius=T.MathUtils.lerp(endpointRadius(chain[k]),endpointRadius(chain[k+1]),f);
   for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,corrugation=1+.026*Math.sin(a*5+t*2),point=center.clone().addScaledVector(frames.normals[j],Math.cos(a)*radius*corrugation).addScaledVector(frames.binormals[j],Math.sin(a)*radius*corrugation);positions.push(...point.toArray());uv.push(i/sides,t*length);}
  }
  for(let j=0;j<steps;j++)for(let i=0;i<sides;i++){const a=offset+j*(sides+1)+i,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
  // Caps exist only at branch ends; hidden internal disk stacks are eliminated.
  for(const [row,reverse]of [[0,true],[steps,false]]){const c=positions.length/3;positions.push(...pts[reverse?0:pts.length-1].toArray());uv.push(.5,reverse?0:length);for(let i=0;i<sides;i++){const a=offset+row*(sides+1)+i;indices.push(...(reverse?[c,a+1,a]:[c,a,a+1]));}}
 }
 for(const g of fallback){const offset=positions.length/3,map=new Map();g.vertices.forEach((i,j)=>{const q=v(i);map.set(i,offset+j);positions.push(...q.toArray());uv.push(Math.atan2(q.z,q.x)/(Math.PI*2)+.5,q.y);});g.faces.forEach(f=>indices.push(...f.map(i=>map.get(i))));}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.organicBranches={segments:segments.length,chains:chains.length,joinedSeams:joined,fallback: fallback.length};return geometry;
}
