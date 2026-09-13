import {Matrix4, Quaternion, Vector3, MathUtils} from 'three';

// Position-based cloth on a small control lattice. The high-resolution fabric
// and its rolled seams share these bones; the body animation is never modified.
export function createClothDynamics(avatar){
 const bones=[];let cols=0,rows=0;
 avatar.traverse(o=>{const m=/^Drape_(\d+)_(\d+)$/.exec(o.name);if(m){const c=+m[1],r=+m[2];bones.push({bone:o,c,r});cols=Math.max(cols,c+1);rows=Math.max(rows,r+1);}});
 if(!bones.length)return {update(){},get state(){return null;}};
 bones.sort((a,b)=>a.r*cols+a.c-b.r*cols-b.c);
 avatar.updateMatrixWorld(true);
 const parent=bones[0].bone.parent, inverse=new Matrix4().copy(avatar.matrixWorld).invert();
 const parentRest=new Matrix4().multiplyMatrices(inverse,parent.matrixWorld);
 const parentRestRotation=new Quaternion();parentRest.decompose(new Vector3(),parentRestRotation,new Vector3());
 const particles=bones.map(({bone,c,r})=>{
  const rest=new Vector3().setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inverse);
  return {bone,c,r,rest,anchor:rest.clone().applyMatrix4(parentRest.clone().invert()),p:rest.clone(),previous:rest.clone(),target:rest.clone(),normal:new Vector3(),restQ:bone.quaternion.clone(),mass:r===0?0:r<=3?.22:1};
 });
 // The gathered neck follows the neck; shoulder corners follow each upper
 // arm just enough to prevent the yoke slipping beneath the animated sleeve.
 for(const p of particles){
  if(p.r>3)continue;
  const attachment=avatar.getObjectByName(p.r===0?'neck':p.c<(cols-1)/2?'LeftArm':'RightArm');
  if(!attachment)continue;
  p.attachment=attachment;p.attachWeight=p.r===0?.85:Math.pow(Math.abs(p.c/(cols-1)*2-1),2)*.85;
  p.attachPoint=p.rest.clone().applyMatrix4(avatar.matrixWorld).applyMatrix4(attachment.matrixWorld.clone().invert());
 }
 // Pin shoulder corners to actual skinned shirt vertices. A joint-centred
 // sphere cannot describe this model's asymmetric sleeve/shoulder silhouette.
 const bodyMesh=avatar.getObjectByName('char1');
 if(bodyMesh?.isSkinnedMesh){
  bodyMesh.skeleton.update();
  const geometry=bodyMesh.geometry,indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
  const shoulderNames=new Set(['Spine','LeftShoulder','RightShoulder','LeftArm','RightArm']);
  const candidates=[],point=new Vector3(),normal=new Vector3(),blend=new Matrix4(),transform=new Matrix4();
  const boneMatrices=bodyMesh.skeleton.boneMatrices;
  for(let i=0;i<geometry.attributes.position.count;i++){
   let amount=0;for(let k=0;k<4;k++)if(shoulderNames.has(bodyMesh.skeleton.bones[indices.array[i*4+k]]?.name))amount+=weights.array[i*4+k];
   if(amount<.6)continue;
   bodyMesh.getVertexPosition(i,point).applyMatrix4(bodyMesh.matrixWorld).applyMatrix4(inverse);
   if(point.y<1.33||point.y>1.52||Math.abs(point.x)<.055||Math.abs(point.x)>.24)continue;
   blend.elements.fill(0);
   for(let k=0;k<4;k++){const joint=indices.array[i*4+k],w=weights.array[i*4+k];for(let j=0;j<16;j++)blend.elements[j]+=boneMatrices[joint*16+j]*w;}
   transform.copy(bodyMesh.bindMatrixInverse).multiply(blend).multiply(bodyMesh.bindMatrix);
   normal.fromBufferAttribute(geometry.attributes.normal,i).transformDirection(transform).transformDirection(bodyMesh.matrixWorld).transformDirection(inverse);
   if(normal.y<.3)continue;
   candidates.push({index:i,p:point.clone()});
  }
  const usedSurfaceVertices=new Set();
  for(const p of particles){
   if(p.r===0||p.r>3||Math.abs(p.c/(cols-1)*2-1)<.58)continue;
   let nearest=null,best=Infinity;
   for(const candidate of candidates){if(usedSurfaceVertices.has(candidate.index))continue;const d=candidate.p,score=3*(d.x-p.rest.x)**2+3*(d.z-p.rest.z)**2+(d.y-p.rest.y)**2;if(score<best){best=score;nearest=candidate;}}
   if(nearest&&best<.035){p.surfaceIndex=nearest.index;usedSurfaceVertices.add(nearest.index);p.mass=0;p.constraintRest=nearest.p.clone();p.constraintRest.y+=.018;}
  }
 }
 const constraints=[];
 const edge=(a,b,stiffness)=>constraints.push({a,b,length:Math.max(.002,(particles[a].constraintRest||particles[a].rest).distanceTo(particles[b].constraintRest||particles[b].rest)),stiffness});
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const i=r*cols+c;
  if(c+1<cols)edge(i,i+1,.96);
  if(r+1<rows)edge(i,i+cols,.98);
  if(c+1<cols&&r+1<rows){edge(i,i+cols+1,.62);edge(i+1,i+cols,.62);}
  if(c+2<cols)edge(i,i+2,.13);
  if(r+2<rows)edge(i,i+cols*2,.12);
 }
 const v1=new Vector3(),v2=new Vector3(),v3=new Vector3(),normal=new Vector3();
 function frame(pointAt,c,r,matrix){
  const across=v1.subVectors(pointAt(Math.min(c+1,cols-1),r),pointAt(Math.max(c-1,0),r)).normalize();
  const down=v2.subVectors(pointAt(c,Math.min(r+1,rows-1)),pointAt(c,Math.max(r-1,0))).normalize();
  normal.crossVectors(across,down).normalize();down.crossVectors(normal,across).normalize();
  return matrix.makeBasis(across,down,normal);
 }
 const restAt=(c,r)=>particles[r*cols+c].rest,liveAt=(c,r)=>particles[r*cols+c].p;
 for(const p of particles)p.restFrame=new Quaternion().setFromRotationMatrix(frame(restAt,p.c,p.r,new Matrix4())).invert();
 const bodyNames=['Hips','Spine02','Spine01','Spine','neck','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'];
 const body=Object.fromEntries(bodyNames.map(name=>[name,{bone:avatar.getObjectByName(name),p:new Vector3()}]));
 const capsules=[['Spine02','Spine',.132],['Spine','neck',.077],['LeftArm','RightArm',.085],['Hips','Spine02',.128],['LeftUpLeg','LeftLeg',.082],['RightUpLeg','RightLeg',.082],['LeftLeg','LeftFoot',.065],['RightLeg','RightFoot',.065],['LeftArm','LeftForeArm',.106],['RightArm','RightForeArm',.106],['LeftForeArm','LeftHand',.083],['RightForeArm','RightHand',.083]];
 const oldWorld=avatar.matrixWorld.clone(),transport=new Matrix4(),parentNow=new Matrix4(),parentInv=new Matrix4(),parentRotation=new Quaternion(),parentInverseRotation=new Quaternion(),oldOrigin=new Vector3(),origin=new Vector3(),delta=new Vector3(),air=new Vector3(),dv=new Vector3(),nearest=new Vector3(),segment=new Vector3(),f=new Matrix4(),rotation=new Quaternion(),local=new Vector3(),scale=new Vector3();
 let initialized=false,accumulator=0,time=0,flightBlend=0,maxStretch=1,resets=0;
 const state={mode:'ground',particles:particles.length,shoulderPins:particles.filter(p=>p.surfaceIndex!==undefined).length,maxStretch:1,finite:true,resets:0};
 function collide(p){
  if(!p.mass||p.r<=3)return;
  for(const [a,b,radius] of capsules){
   if(!body[a].bone||!body[b].bone)continue;
   const start=body[a].p,end=body[b].p;
   segment.subVectors(end,start);
   const t=MathUtils.clamp(v3.subVectors(p.p,start).dot(segment)/Math.max(segment.lengthSq(),1e-8),0,1);
   nearest.copy(start).addScaledVector(segment,t);v3.subVectors(p.p,nearest);
   const distance=v3.length();if(distance<radius&&distance>1e-7)p.p.copy(nearest).addScaledVector(v3,radius/distance);
  }
  if(flightBlend<.05)p.p.y=Math.max(.025,p.p.y);
 }
 return {
  get state(){return state;},
  update(dt,{flying=false,speed=0,verticalSpeed=0,reset=false}={}){
   dt=Math.min(.05,Math.max(0,dt));time+=dt;flightBlend=MathUtils.damp(flightBlend,flying?1:0,3,dt);
   avatar.updateMatrixWorld(true);inverse.copy(avatar.matrixWorld).invert();bodyMesh?.skeleton?.update();
   parentNow.multiplyMatrices(inverse,parent.matrixWorld);parentInv.copy(parentNow).invert();parentNow.decompose(local,parentRotation,scale);parentInverseRotation.copy(parentRotation).invert();
   origin.setFromMatrixPosition(avatar.matrixWorld);oldOrigin.setFromMatrixPosition(oldWorld);
   const jump=reset||origin.distanceTo(oldOrigin)>4;
   transport.multiplyMatrices(inverse,oldWorld);
   // Most root translation is inherited, avoiding numerical shock at boosted
   // game speeds. Relative airflow supplies the persistent aerodynamic force.
   delta.setFromMatrixPosition(transport).multiplyScalar(.92);
   for(const p of particles){
    p.target.copy(p.anchor).applyMatrix4(parentNow);
    if(p.attachment)p.target.lerp(v3.copy(p.attachPoint).applyMatrix4(p.attachment.matrixWorld).applyMatrix4(inverse),p.attachWeight);
    if(p.surfaceIndex!==undefined){bodyMesh.getVertexPosition(p.surfaceIndex,p.target).applyMatrix4(bodyMesh.matrixWorld).applyMatrix4(inverse);p.target.y+=.018;}
    if(!initialized||jump){p.p.copy(p.target);p.previous.copy(p.target);}
    else {v3.copy(p.p).applyMatrix4(transport).sub(delta);p.p.lerp(v3,.5);v3.copy(p.previous).applyMatrix4(transport).sub(delta);p.previous.lerp(v3,.5);}
   }
   if(jump)resets++;
   oldWorld.copy(avatar.matrixWorld);initialized=true;
   for(const {bone,p} of Object.values(body))if(bone)p.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inverse);
   // The avatar faces +Z. Forward travel creates a wake toward -Z; changing
   // speed, ascent and turns are reflected in the transported fabric as well.
   const windSpeed=Math.min(26,speed)*(flying?.8:.65);
   air.set(Math.sin(time*.83)*(.45+flightBlend*.8), .15+flightBlend*(1.0-MathUtils.clamp(verticalSpeed*.45,-9,9)), -windSpeed-1.5*flightBlend);
   accumulator=Math.min(accumulator+dt,.05);
   const h=1/60;
   while(accumulator>=h){
    accumulator-=h;
    for(const p of particles){
     if(!p.mass){p.p.copy(p.target);p.previous.copy(p.target);continue;}
     frame(liveAt,p.c,p.r,f);p.normal.setFromMatrixColumn(f,2);
     dv.subVectors(p.p,p.previous).multiplyScalar(.975);
     p.previous.copy(p.p);
     const turbulence=1+flightBlend*(.22*Math.sin(time*4.2-p.r*.65+p.c*.55)+.12*Math.sin(time*7.1+p.r*.52+p.c*.75));
     const pressure=MathUtils.clamp(p.normal.dot(air)*turbulence,-28,28);
     p.p.add(dv).addScaledVector(p.normal,pressure*Math.abs(pressure)*.065*h*h);
     p.p.y-=9.81*h*h;
     // Tangential drag lets a near-vertical cloth catch the wake before billowing.
     p.p.addScaledVector(air,.09*h*h);
    }
    for(let iteration=0;iteration<16;iteration++){
     for(const con of constraints){
      const a=particles[con.a],b=particles[con.b],w=a.mass+b.mass;if(!w)continue;
      v3.subVectors(b.p,a.p);const length=v3.length();if(length<1e-8)continue;
      const amount=(length-con.length)/length*con.stiffness/w;
      a.p.addScaledVector(v3,amount*a.mass);b.p.addScaledVector(v3,-amount*b.mass);
     }
     for(const p of particles){if(p.r>0&&p.r<=3)p.p.lerp(p.target,.035);collide(p);}
    }
   }
   maxStretch=1;
   for(const con of constraints)if(con.stiffness>.9)maxStretch=Math.max(maxStretch,particles[con.a].p.distanceTo(particles[con.b].p)/con.length);
   for(const p of particles){
    // Rotate local surface frames as well as translating controls, so the
    // woven normal map and rolled hem follow the bending fabric.
    rotation.setFromRotationMatrix(frame(liveAt,p.c,p.r,f)).multiply(p.restFrame);
    rotation.multiply(parentRestRotation).premultiply(parentInverseRotation).multiply(p.restQ);
    p.bone.position.copy(p.p).applyMatrix4(parentInv);
    p.bone.quaternion.copy(rotation);
   }
   avatar.updateMatrixWorld(true);
   const hem=particles.slice(-cols);state.hemHeight=+(hem.reduce((s,p)=>s+p.p.y,0)/cols).toFixed(3);state.hemTrail=+(-hem.reduce((s,p)=>s+p.p.z,0)/cols).toFixed(3);
   state.mode=flying?'wind':'gravity';state.maxStretch=+maxStretch.toFixed(3);state.resets=resets;

   state.finite=particles.every(p=>Number.isFinite(p.p.x+p.p.y+p.p.z));
  }
 };
}
