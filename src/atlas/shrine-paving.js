import * as T from 'three';

// Each tread is a closed, bevelled stone sector resting on its original step.
// The old straight radial rods incorrectly continued above the lower stairs.
export function shrinePaving(c,r){
 const count=r<2?32:48;
 for(let step=0;step<5;step++){
  const outer=r+1.6-step*.22-.012;
  const inner=step===4?r-.08:r+1.6-(step+1)*.22+.010;
  for(let k=0;k<count;k++){
   const gap=.006/inner,a0=k*Math.PI*2/count+gap,a1=(k+1)*Math.PI*2/count-gap;
   const shape=new T.Shape();shape.moveTo(Math.cos(a0)*inner,Math.sin(a0)*inner);
   for(let j=1;j<=4;j++){const a=a0+(a1-a0)*j/4;shape.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);}
   for(let j=4;j>=0;j--){const a=a0+(a1-a0)*j/4;shape.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);}
   shape.closePath();
   const geometry=new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:4});
   c.add(geometry,'stone',[0,(step+1)*.18+.007,0],[Math.PI/2,0,0]);
  }
 }
}
