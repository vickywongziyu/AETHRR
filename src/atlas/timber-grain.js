import * as T from 'three';

// Solve a longitudinal grain axis per connected timber, including normal-split
// box faces. Positions stay exact so stairs, cabin walls and bridges still fit.
export function timberGrain(source){
 const g=source.clone(),p=g.attributes.position,n=p.count,parent=new Int32Array(n),weld=new Map();for(let i=0;i<n;i++)parent[i]=i;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<n;i++){const key=Math.round(p.getX(i)*10000)+','+Math.round(p.getY(i)*10000)+','+Math.round(p.getZ(i)*10000);if(weld.has(key))parent[i]=find(weld.get(key));else weld.set(key,i);}
 const index=g.index;for(let i=0;i<(index?index.count:n);i+=3){const a=index?index.getX(i):i,r=find(a);parent[find(index?index.getX(i+1):i+1)]=r;parent[find(index?index.getX(i+2):i+2)]=r;}
 const groups=new Map();for(let i=0;i<n;i++){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}
 const uv=new Float32Array(n*3),center=new T.Vector3(),a=new T.Vector3(),axis=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3(),next=new T.Vector3(),cov=new Float64Array(9);
 for(const ids of groups.values()){
  center.set(0,0,0);for(const i of ids)center.add(a.fromBufferAttribute(p,i));center.multiplyScalar(1/ids.length);cov.fill(0);
  for(const i of ids){a.fromBufferAttribute(p,i).sub(center);const c=[a.x,a.y,a.z];for(let x=0;x<3;x++)for(let y=0;y<3;y++)cov[x*3+y]+=c[x]*c[y];}
  const d=cov[0]>cov[4]?(cov[0]>cov[8]?0:2):(cov[4]>cov[8]?1:2);axis.set(d===0?1:.1,d===1?1:.1,d===2?1:.1);
  for(let j=0;j<12;j++){next.set(cov[0]*axis.x+cov[1]*axis.y+cov[2]*axis.z,cov[3]*axis.x+cov[4]*axis.y+cov[5]*axis.z,cov[6]*axis.x+cov[7]*axis.y+cov[8]*axis.z);if(next.lengthSq()<1e-12)break;axis.copy(next).normalize();}
  axis.normalize();side.crossVectors(axis,Math.abs(axis.y)<.85?up.set(0,1,0):up.set(0,0,1)).normalize();up.crossVectors(side,axis).normalize();
  for(const i of ids){a.fromBufferAttribute(p,i).sub(center);uv[i*3]=a.dot(axis);uv[i*3+1]=a.dot(side);uv[i*3+2]=a.dot(up);}
 }
 g.setAttribute('timberCoord',new T.BufferAttribute(uv,3));g.userData.timberGrainComponents=groups.size;return g;
}
