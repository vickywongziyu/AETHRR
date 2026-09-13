import * as T from 'three';
const cellSize=2;
// Spatially index actual upward-facing triangles once, so footsteps do not raycast the entire forest.
export function createForestNavigation(source) {
  const cells=new Map(),circles=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),edge=new T.Vector3(),pos=new T.Vector3(),scale=new T.Vector3(),quat=new T.Quaternion();
  source.updateMatrixWorld(true);
  source.traverse(o=>{
    if(!o.isMesh)return;
    o.matrixWorld.decompose(pos,quat,scale);
    if(/bark/i.test(o.material.name))circles.push({x:pos.x,z:pos.z,r:.38*Math.max(scale.x,scale.z),kind:'tree'});
    if(/Mossy.stone/i.test(o.name))circles.push({x:pos.x,z:pos.z,r:.85*Math.max(scale.x,scale.z),kind:'rock'});
    if(!/Forest.floor|Winding.stone.path|Sanctuary.architecture|Fallen.ruins/i.test(o.name))return;
    const p=o.geometry.attributes.position,idx=o.geometry.index, count=idx?idx.count:p.count;
    for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,idx?idx.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2).applyMatrix4(o.matrixWorld);normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();if(normal.y<.58)continue;
      const tri={a:a.clone(),b:b.clone(),c:c.clone(),minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y)};
      for(let x=Math.floor(Math.min(a.x,b.x,c.x)/cellSize);x<=Math.floor(Math.max(a.x,b.x,c.x)/cellSize);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/cellSize);z<=Math.floor(Math.max(a.z,b.z,c.z)/cellSize);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(tri);}
    }
  });
  const pathX=y=>Math.sin(y*.096)*2.4+Math.sin(y*.2)*.75;
  for(const y of [17,25,33,40])for(const s of [-1,1])circles.push({x:pathX(y)+s*3.4,z:-y,r:.56,kind:'column'});
  for(const [i,y] of [2,11,21,31,40,47].entries())circles.push({x:pathX(y)+(i%2===0?-1:1)*2.7,z:-y,r:.3,kind:'lantern'});
  for(const s of [-1,1])circles.push({x:pathX(49)+s*2.65,z:-49,r:.65,kind:'gate-column'});
  function height(x,z,max=Infinity){let best=-Infinity;for(const t of cells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))||[]){if(t.minY>max)continue;const {a,b,c}=t,d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-10)continue;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d,w=1-u-v;if(u<-.001||v<-.001||w<-.001)continue;const y=u*a.y+v*b.y+w*c.y;if(y<=max&&y>best)best=y;}return Number.isFinite(best)?best:null;}
  function move(position,dx,dz){let x=T.MathUtils.clamp(position.x+dx,-32,32),z=T.MathUtils.clamp(position.z+dz,-72,12);const radius=.25;
    for(let pass=0;pass<2;pass++)for(const o of circles){const vx=x-o.x,vz=z-o.z,d=Math.hypot(vx,vz),min=o.r+radius;if(d<min){if(d<.001){x+=min;continue;}x=o.x+vx/d*min;z=o.z+vz/d*min;}}
    const y=height(x,z,position.y+1.65);if(y===null||y>position.y+.32||y<position.y-.65)return false;
    position.set(x,y,z);return true;
  }
  return {height,move,circles,cells:cells.size};
}
