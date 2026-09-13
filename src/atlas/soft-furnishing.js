import * as T from 'three';

export function groundedRoomRug(c,p,w,d,kind='red'){
 const sub=new c.constructor(c.materials,'woven floor rug');sub.rug([0,0,0],w,d,kind);
 // Existing rug proportions were centimetres thick. Flatten the whole weave,
 // including its border/tassels, and put its lowest face on the measured floor.
 for(const [material,geometries]of sub.bins)for(const g of geometries){
  g.scale(1,.14,1);g.translate(0,-.0095*.14,0);c.add(g,material,p);
 }
}

// Closed low cushions with rounded corners. Subtle textile folds belong to the
// geometry, so the same volume is visible under changing lights and viewpoints.
export function cushionGeometry(width,depth,height,{fold=.008,seed=0}={}){
 const rings=10,segments=48,positions=[],uv=[],indices=[];
 for(let j=0;j<=rings;j++){
  const lat=-Math.PI/2+j/rings*Math.PI,rad=Math.cos(lat),y=Math.sin(lat)*height*.5;
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),x=Math.sign(c)*Math.pow(Math.abs(c),.38)*width*.5*rad,z=Math.sign(s)*Math.pow(Math.abs(s),.38)*depth*.5*rad;
   const crease=Math.sin(x*19+seed+Math.sin(z*7))*Math.sin(z*23-seed)*fold*Math.pow(Math.max(0,Math.sin(lat)),2)*Math.pow(rad,.65);
   positions.push(x,y+crease,z);uv.push(x/width+.5,z/depth+.5);
  }
 }
 for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function carvedBed(c,p,w,d){
 const [x,y,z]=p;
 c.box([x,y+.25,z],[w,.42,d]);
 c.add(cushionGeometry(w-.06,d-.08,.22),'leather',[x,y+.49,z]);
 c.add(cushionGeometry(w-.12,d*.67,.105,{fold:.013,seed:w}),'cloth',[x,y+.62,z+d*.12]);
 c.add(cushionGeometry(w*.75,.43,.22,{fold:.006,seed:d}),'paper',[x,y+.66,z-d*.33],[0,-.04,0]);
 for(const s of [-1,1]){
  c.cylinder([x+s*w*.46,y+.49,z-d*.48],.065,.94,'wood',.08,10);
  c.sphere([x+s*w*.46,y+1.00,z-d*.48],[.095,.13,.095],'endgrain');
 }
 c.box([x,y+.67,z-d*.49],[w,.54,.12]);
 c.line([[-w*.47,.9],[-w*.26,.98],[0,1.02],[w*.26,.98],[w*.47,.9]].map(([xx,yy])=>[x+xx,y+yy,z-d*.49]),.065,'wood');
 for(const s of [-1,1])c.line([[x+s*w*.38,y+.78,z-d*.414],[x+s*w*.21,y+.71,z-d*.414],[x,y+.85,z-d*.414]],.015,'trim');
 // Sewn border sits on the textile surface rather than a floating flat decal.
 for(const s of [-1,1])c.line([[x+s*w*.38,y+.648,z-d*.15],[x+s*w*.41,y+.667,z+d*.12],[x+s*w*.38,y+.648,z+d*.37]],.006,'paper');
}
