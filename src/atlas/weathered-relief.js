import * as T from 'three';

// Add a shared midpoint relief to exposed cliffs and distant ranges. Terrain
// terraces, portal summits and navigable building floors are intentionally exact.
export function weatheredRelief(source,cliff=false){
 const p=source.attributes.position,c=source.attributes.color,idx=source.index,points=[],colors=[],lookup=new Map(),faces=[],map=new Uint32Array(p.count);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=Math.round(x*10000)+','+Math.round(y*10000)+','+Math.round(z*10000);let n=lookup.get(key);if(n===undefined){n=points.length;lookup.set(key,n);points.push(new T.Vector3(x,y,z));colors.push(c?[c.getX(i),c.getY(i),c.getZ(i)]:[1,1,1]);}map[i]=n;}
 for(let i=0;i<(idx?idx.count:p.count);i+=3)faces.push([map[idx?idx.getX(i):i],map[idx?idx.getX(i+1):i+1],map[idx?idx.getX(i+2):i+2]]);
 const originalCount=points.length,edges=new Map(),normalSums=points.map(()=>new T.Vector3()),v=new T.Vector3(),w=new T.Vector3();
 for(const [a,b,c] of faces){v.subVectors(points[b],points[a]);w.subVectors(points[c],points[a]);v.cross(w);normalSums[a].add(v);normalSums[b].add(v);normalSums[c].add(v);}
 normalSums.forEach(n=>n.normalize());
 const middle=(a,b)=>{const key=a<b?a+','+b:b+','+a;if(edges.has(key))return edges.get(key);const i=points.length;points.push(points[a].clone().add(points[b]).multiplyScalar(.5));colors.push(colors[a].map((x,k)=>(x+colors[b][k])*.5));normalSums.push(normalSums[a].clone().add(normalSums[b]).normalize());edges.set(key,i);return i;};
 const indices=[];for(const [a,b,c] of faces){const ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
 source.computeBoundingBox();const top=source.boundingBox.max.y;
 for(let i=0;i<points.length;i++){const p=points[i],protect=cliff?T.MathUtils.smoothstep(top-p.y,1.2,4):1;const n=Math.sin(p.x*.7+Math.sin(p.y*.31))*Math.cos(p.z*.58+p.y*.21)+.35*Math.sin(p.y*1.4+p.z*.8);p.addScaledVector(normalSums[i],n*(cliff?.22:.62)*protect*(i<originalCount?.25:1));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('color',new T.Float32BufferAttribute(colors.flat(),3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.reliefTriangles=indices.length/3;return g;
}
