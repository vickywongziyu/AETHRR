import * as T from 'three';
import {cushionGeometry} from './soft-furnishing.js';

export function snowCap(c,p,w,d,height=.10,rotation=[0,0,0]){
 c.add(cushionGeometry(w,d,height,{fold:.003,seed:w+d}),'snow',p,rotation);
}
function icicle(c,p,length,radius,seed){
 if(!c.materials.ice){const m=new T.MeshPhysicalMaterial({color:'#bdd2d6',roughness:.23,transmission:.5,thickness:.07,ior:1.35,metalness:0});m.name='Craft · roof ice';c.materials.ice=m;}
 const positions=[],uv=[],indices=[],rows=8,n=9;
 for(let j=0;j<=rows;j++)for(let k=0;k<=n;k++){const t=j/rows,a=k/n*Math.PI*2,r=radius*Math.pow(1-t,1.3)*(1+.045*Math.sin(t*28+seed));positions.push(Math.cos(a)*r+Math.sin(t*1.8)*length*.045,-t*length,Math.sin(a)*r);uv.push(k/n,t);}
 for(let j=0;j<rows;j++)for(let k=0;k<n;k++){const a=j*(n+1)+k,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}
 for(let k=1;k<n-1;k++)indices.push(0,k+1,k);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();c.add(g,'ice',p);
}
export function sculptedRoofSnow(c,W,D,profile,side){
 const nu=36,nv=42,N=(nu+1)*(nv+1),positions=[],uv=[],indices=[];
 const edge=v=>.981+.016*(.5+.5*Math.sin(v*19+side*.7))*Math.sin(Math.PI*v)**.15;
 const end=u=>D+.035-.043*Math.sin(u*8+side)**2;
 const surface=(u,v)=>{const t=u*edge(v),z=(v-.5)*end(u),ridge=.16*Math.exp(-u*u*13),drift=.07*Math.sin(u*5+v*7+side)**2*Math.sin(Math.PI*u),cornice=.05*Math.exp(-(((u-.93)/.14)**2))*(.55+.45*Math.sin(v*13)**2);return[side*W*t,profile(t)+.205+ridge+drift+cornice,z];};
 for(let layer=0;layer<2;layer++)for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=i/nu,v=j/nv,p=surface(u,v);if(layer)p[1]=profile(u*edge(v))+.115;positions.push(...p);uv.push(u,v);}
 const face=(a,b,d)=>{if(side>0)indices.push(a,b,d);else indices.push(a,d,b);};
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1,d=a+1;face(a,d,b);face(d,b+1,b);face(a+N,b+N,d+N);face(d+N,b+N,b+1+N);}
 const perimeter=[];for(let j=0;j<=nv;j++)perimeter.push(j);for(let i=1;i<=nu;i++)perimeter.push(i*(nv+1)+nv);for(let j=nv-1;j>=0;j--)perimeter.push(nu*(nv+1)+j);for(let i=nu-1;i>0;i--)perimeter.push(i*(nv+1));
 for(let k=0;k<perimeter.length;k++){const a=perimeter[k],b=perimeter[(k+1)%perimeter.length];face(a,a+N,b);face(b,a+N,b+N);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();c.add(g,'snow');
 // Short irregular clusters originate in the real snowy eave, not a flat row
 // at wall height across the gable. Leave an exposed tile margin near the ends.
 const count=Math.floor(D/.42);for(let i=1;i<count;i++){const v=(i+.18*Math.sin(i*8.7))/count;if(Math.sin(i*3.4+side)>.73)continue;const p=surface(1,v);p[1]=profile(edge(v))+.14;icicle(c,p,.16+.31*(.5+.5*Math.sin(i*12.3+side)),.026+.018*(.5+.5*Math.cos(i*5)),i+side);}
 for(const v of [0,1])for(let k=2;k<10;k++){const u=k/11;if(Math.sin(k*4.1+v+side)>.2)continue;const p=surface(u,v);p[1]=profile(u*edge(v))+.14;icicle(c,p,.13+.2*Math.sin(k*2.3)**2,.022+.012*Math.cos(k)**2,k);}
 c.snowRoofs=(c.snowRoofs||0)+1;
}

export function logCabinRoofUnderlay(c,w,d,eave,rise,profile){
 const W=w/2+.9;
 for(const side of [-1,1])for(let i=0;i<20;i++){const a=i/20,b=(i+1)/20,dx=W*(b-a),dy=profile(b)-profile(a);c.box([side*W*(a+b)/2,(profile(a)+profile(b))/2-.105,0],[Math.hypot(dx,dy)+.025,.18,d+1.1],'wood',[0,0,side*Math.atan2(dy,dx)]);}
 for(const z of [-d/2,d/2]){
  const pts=[[-w/2,eave],[w/2,eave]];for(let i=20;i>=0;i--){const x=-w/2+w*i/20;pts.push([x,profile(Math.abs(x)/W)-.12]);}
  c.add(new T.ExtrudeGeometry(new T.Shape(pts.map(p=>new T.Vector2(...p))),{depth:.24,bevelEnabled:false}),'wood',[0,0,z-.12]);
  c.box([0,eave,z],[w+.2,.2,.3],'endgrain');
 }
}

export function roofChimney(c,x,z,w,d,top,roofWidth,profile){
 const points=[[x-w/2,top],[x+w/2,top]];
 for(let i=4;i>=0;i--){const xx=x-w/2+w*i/4;points.push([xx,profile(Math.abs(xx)/roofWidth)-.06]);}
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));
 c.add(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),'stone',[0,0,z-d/2]);
}
