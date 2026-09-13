import * as T from 'three';

// The older tree builders capped every short tube segment. Those cap normals
// made each section darken into a separate horizontal band. Reconstruct smooth
// radial normals for each connected branch section, without moving geometry.
export function smoothBranchNormals(source){
 if(!source.index)return source;
 const geometry=source.clone(),p=geometry.attributes.position,n=p.count,parent=new Int32Array(n),index=geometry.index.array;
 for(let i=0;i<n;i++)parent[i]=i;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<index.length;i+=3){const root=find(index[i]);parent[find(index[i+1])]=root;parent[find(index[i+2])]=root;}
 const groups=new Map();for(let i=0;i<n;i++){const key=find(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
 const normals=geometry.attributes.normal?.array.slice()||new Float32Array(n*3),center=new T.Vector3(),v=new T.Vector3(),axis=new T.Vector3(),next=new T.Vector3(),cov=new Float64Array(9),radial=new T.Vector3();
 for(const ids of groups.values()){
  if(ids.length<8||ids.length>180)continue;center.set(0,0,0);for(const i of ids)center.add(v.fromBufferAttribute(p,i));center.multiplyScalar(1/ids.length);cov.fill(0);
  for(const i of ids){v.fromBufferAttribute(p,i).sub(center);const a=v.toArray();for(let r=0;r<3;r++)for(let c=0;c<3;c++)cov[r*3+c]+=a[r]*a[c];}
  const largest=cov[0]>cov[4]?(cov[0]>cov[8]?0:2):(cov[4]>cov[8]?1:2);axis.set(largest===0?1:.2,largest===1?1:.2,largest===2?1:.2).normalize();
  for(let j=0;j<12;j++){next.set(cov[0]*axis.x+cov[1]*axis.y+cov[2]*axis.z,cov[3]*axis.x+cov[4]*axis.y+cov[5]*axis.z,cov[6]*axis.x+cov[7]*axis.y+cov[8]*axis.z);if(next.lengthSq()<1e-12)break;axis.copy(next).normalize();}
  for(const i of ids){v.fromBufferAttribute(p,i).sub(center);radial.copy(v).addScaledVector(axis,-v.dot(axis));if(radial.lengthSq()<1e-10)continue;radial.normalize();normals[i*3]=radial.x;normals[i*3+1]=radial.y;normals[i*3+2]=radial.z;}
 }
 geometry.setAttribute('normal',new T.BufferAttribute(normals,3));return geometry;
}
