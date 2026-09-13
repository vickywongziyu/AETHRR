import * as T from 'three';
import trees from './pine-sites.json';

// Reconstruct branch sprays at the 99 original trunk coordinates extracted
// from the native scene. Full cutout sprigs replace the half-triangle UVs.
export function buildPineCrowns(layout=trees){
 const positions=[],uvs=[],indices=[];let sprays=0;
 function spray(origin,axis,width,length,roll,seed){
  const lateral=new T.Vector3(-axis.z,0,axis.x).normalize(),up=new T.Vector3().crossVectors(axis,lateral).normalize();
  lateral.multiplyScalar(Math.cos(roll)).addScaledVector(up,Math.sin(roll));
  const n=positions.length/3,segments=4;
  // Alternating full atlas branches, excluding the bark and neighboring sprites.
  const crop=seed%2?[.635,.99,.64,.996]:[.188,.422,.685,.993];
  for(let row=0;row<=segments;row++)for(const side of [-1,1]){
   const t=row/segments,bend=-Math.sin(t*Math.PI)*length*.10,point=origin.clone().addScaledVector(axis,t*length).addScaledVector(lateral,side*width*.5).add(new T.Vector3(0,bend,0));positions.push(point.x,point.y,point.z);uvs.push(side<0?crop[0]:crop[1],crop[2]+t*(crop[3]-crop[2]));
  }
  for(let row=0;row<segments;row++){const i=n+row*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}sprays++;
 }
 for(const [id,b]of layout.entries()){
  const h=b.h;
  for(let j=0;j<9;j++){
   const t=.19+j*.085,length=h*.26*Math.pow(1-t,.6),base=new T.Vector3(b.x,b.z+h*t,-b.y);
   for(let k=0;k<6;k++){
    const a=k*Math.PI/3+j*.76,direction=new T.Vector3(Math.cos(a),-.14,-Math.sin(a));
    for(let q=0;q<4;q++){
     const fraction=.28+q*.21,origin=base.clone().addScaledVector(direction,length*fraction),angle=a+(q%2?1:-1)*(.22+q*.055),axis=new T.Vector3(Math.cos(angle),-.15+(j/9)*.10,-Math.sin(angle)).normalize();
     spray(origin,axis,h*(.083-j*.0032)*(1-q*.07),h*(.117-j*.004)*(1-q*.025),(q%2?1:-1)*(.23+(id%4)*.075),id+k+q);
     if(q===2)spray(origin,axis,h*.073,h*.108,Math.PI*.43,id+k+1);
    }
   }
  }
  // The leader remains narrow and ragged, without the old solid cone cap.
  for(let j=0;j<7;j++){const a=j*2.399;const origin=new T.Vector3(b.x,b.z+h*(.78+j*.026),-b.y);spray(origin,new T.Vector3(Math.cos(a)*.28,.94,Math.sin(a)*.28).normalize(),h*(.087-j*.009),h*.18,a*.13,j);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.pineCrowns={trees:layout.length,sprays,triangles:indices.length/3};return g;
}
