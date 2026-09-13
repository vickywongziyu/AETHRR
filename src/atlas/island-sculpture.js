import * as T from 'three';

// Sculpt only the hanging/exposed body. The inhabited upper three metres keep
// their original coordinates, including every bridge and shrine approach.
export function sculptIslandCliffs(source,{floating=false}={}){
 const p=source.attributes.position,color=source.attributes.color,index=source.index,points=[],colors=[],map=[],keys=new Map(),faces=[],parent=[];
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),key=v.toArray().map(n=>Math.round(n*10000)).join(',');if(!keys.has(key)){keys.set(key,points.length);parent.push(points.length);points.push(v);colors.push(color?[color.getX(i),color.getY(i),color.getZ(i)]:[.42,.29,.15]);}map.push(keys.get(key));}
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<(index?.count||p.count);i+=3){const f=[0,1,2].map(k=>map[index?index.getX(i+k):i+k]);if(new Set(f).size!==3)continue;faces.push(f);parent[find(f[1])]=find(f[0]);parent[find(f[2])]=find(f[0]);}
 const groups=new Map();points.forEach((v,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});const body=[...groups.values()].sort((a,b)=>b.length-a.length)[0];if(!body||body.length<300)return source;
 const bodySet=new Set(body),box=new T.Box3().setFromPoints(body.map(i=>points[i])),top=box.max.y,depth=box.max.y-box.min.y,rim=body.map(i=>points[i]).filter(v=>v.y>top-.07),center=new T.Vector3();rim.forEach(v=>center.add(v));center.divideScalar(rim.length);
 const radius=rim.reduce((r,v)=>r+Math.hypot(v.x-center.x,v.z-center.z),0)/rim.length,phase=center.x*.17+center.z*.11;
 const stats={kind:'sculpted-island',floating,protected:0,maxProtectedShift:0,correctedWinding:0,shortenedShards:0,radius,depth};
 // The original cylindrical body has inward-facing triangles. Correct the
 // winding once, before subdivision, instead of masking it with double sides.
 for(const f of faces){if(!f.every(i=>bodySet.has(i)))continue;const [a,b,c]=f.map(i=>points[i]),n=b.clone().sub(a).cross(c.clone().sub(a)),radial=a.clone().add(b).add(c).multiplyScalar(1/3).sub(center).setY(0);if(n.dot(radial)<0){[f[1],f[2]]=[f[2],f[1]];stats.correctedWinding++;}}
 const originalCount=points.length,mids=new Map(),triangles=[];
 const mid=(a,b)=>{const k=a<b?a+','+b:b+','+a;if(!mids.has(k)){mids.set(k,points.length);points.push(points[a].clone().add(points[b]).multiplyScalar(.5));colors.push(colors[a].map((v,i)=>(v+colors[b][i])*.5));if(bodySet.has(a)&&bodySet.has(b))bodySet.add(points.length-1);}return mids.get(k);};
 for(const [a,b,c]of faces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
 for(let i=0;i<points.length;i++){
  const v=points[i],d=top-v.y,weight=T.MathUtils.smoothstep(d,3,Math.min(7,Math.max(3.5,depth*.44)));if(d<=3){stats.protected++;continue;}
  const x=v.x-center.x,z=v.z-center.z,a=Math.atan2(z,x),r=Math.hypot(x,z),t=T.MathUtils.clamp(d/depth,0,1),angular=1+.095*Math.sin(a*3+phase)+.046*Math.sin(a*7-phase);
  const terrace=Math.sin(d/Math.max(1.8,radius*.27)+a*.65+phase),shelf=Math.pow(.5+.5*terrace,3)*radius*.065;
  const broad=radius*angular*(floating?Math.pow(1-t,.55):1+.035*Math.sin(t*8+phase));
  const target=broad+shelf*(floating?1-t:1)+Math.sin(a*11+Math.floor(d/2.6)*.4+phase)*radius*.023;
  if(bodySet.has(i)){const change=T.MathUtils.clamp(target-r,-radius*.16,radius*.18)*weight;v.x+=x/Math.max(r,.001)*change;v.z+=z/Math.max(r,.001)*change;}
  else if(floating){
   // Retain attached fractures, but draw lower needles into the solid mass.
   const pull=T.MathUtils.smoothstep(t,.48,.95)*weight;
   const nr=T.MathUtils.lerp(r,Math.min(r,Math.max(0,broad)*.93),pull*.8);v.x=center.x+x/Math.max(r,.001)*nr;v.z=center.z+z/Math.max(r,.001)*nr;
   if(t>.84){v.y=T.MathUtils.lerp(v.y,top-depth*.87,pull*.82);if(i<originalCount)stats.shortenedShards++;}
  }
  const shade=.91+.06*Math.sin(v.y*.6+a*.7)+.045*Math.sin(a*5+phase);colors[i]=colors[i].map(c=>c*shade);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('color',new T.Float32BufferAttribute(colors.flat(),3));g.setIndex(triangles);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.islandSculpture=stats;return g;
}
