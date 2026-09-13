import * as T from 'three';

// A closed curved volume, rooted at y=0. Both the web animation and native
// export retain its shape; no billboard can turn edge-on inside a room.
export function hearthFlameGeometry(){
 const rows=28,segments=20,p=[],colors=[],uv=[],indices=[];
 const low=new T.Color('#ffe19a'),mid=new T.Color('#ffac40'),tip=new T.Color('#d44a17');
 for(let j=0;j<=rows;j++){const t=j/rows,r=j===rows?0:.18*Math.pow(Math.sin(Math.PI*t),.8)*(1-.58*t)+.045*Math.pow(1-t,5),bend=.12*t*t,shade=t<.48?low.clone().lerp(mid,t/.48):mid.clone().lerp(tip,(t-.48)/.52);
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;p.push(bend+Math.cos(a)*r,t,Math.sin(a)*r*.7);colors.push(shade.r,shade.g,shade.b);uv.push(i/segments,t);}}
 for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const base=p.length/3;p.push(0,0,0);colors.push(low.r,low.g,low.b);uv.push(.5,0);for(let i=0;i<segments;i++)indices.push(base,i,i+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createHearthFire(parent,p=[0,.2,0],{light:existing=null,power=4,range=8}={}){
 const root=new T.Group();root.name='炉膛 · 火舌与余烬';root.position.fromArray(p);root.userData.hearthFire='v31';parent.add(root);
 const geometry=hearthFlameGeometry(),outer=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.88,depthWrite:false,toneMapped:false}),inner=new T.MeshBasicMaterial({color:'#ffe6ad',transparent:true,opacity:.92,depthWrite:false,toneMapped:false}),emberMat=new T.MeshBasicMaterial({color:'#d66021',toneMapped:false});
 outer.name='Hearth · amber flame';inner.name='Hearth · warm core';emberMat.name='Hearth · embers';
 const tongues=[];
 for(let i=0;i<7;i++){const node=new T.Group();node.name='炉火 · 火舌 '+(i+1);node.position.set((i-3)*.125,0,(i%2)*.13-.07);node.rotation.y=i*1.9;const height=.43+(i%3)*.11;node.userData.baseHeight=height;node.scale.set(.70,height,.80);root.add(node);
  const shell=new T.Mesh(geometry,outer),core=new T.Mesh(geometry,inner);core.scale.set(.49,.69,.51);core.position.z=.008;node.add(shell,core);tongues.push(node);}
 const coalGeo=new T.IcosahedronGeometry(1,1),embers=new T.InstancedMesh(coalGeo,emberMat,13),matrix=new T.Matrix4();embers.name='炉火 · 柴底余烬';
 for(let i=0;i<13;i++){matrix.compose(new T.Vector3(Math.sin(i*2.4)*.43,.012,Math.cos(i*2.4)*.19),new T.Quaternion(),new T.Vector3(.045,.015,.032));embers.setMatrixAt(i,matrix);}root.add(embers);
 root.traverse(o=>{o.userData.noCollision=true;if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 const light=existing||new T.PointLight('#ffb866',0,range,2);if(!existing){light.position.set(p[0],p[1]+.48,p[2]+.42);parent.add(light);}light.userData.hearthLight='v31';
 let lit=true,lastReduced=false;const anchor=new T.Vector3(),scaleVector=new T.Vector3();
 function setLit(v){lit=!!v;root.visible=lit;root.traverse(o=>{if(o.isMesh)o.visible=lit;});if(!lit)light.intensity=0;}
 function update(now,reduced,camera){lastReduced=!!reduced;root.updateWorldMatrix(true,false);const scale=root.getWorldScale(scaleVector).x,distance=light.getWorldPosition(anchor).distanceTo(camera.position),flicker=reduced?1:.96+Math.sin(now*.0031)*.025+Math.sin(now*.0067)*.015;light.distance=range*scale;light.intensity=lit&&distance<Math.max(18,range*3)*scale?power*scale*scale*flicker:0;
  for(const [i,node]of tongues.entries()){node.scale.y=node.userData.baseHeight*(reduced?1:1+Math.sin(now*.0039+i*1.7)*.07);node.rotation.z=reduced?0:Math.sin(now*.0028+i*2.1)*.09;}
 }
 return{root,light,setLit,update,stats:()=>({lit,visible:root.visible,intensity:light.intensity,reduced:lastReduced,flames:tongues.length,roots:tongues.map(t=>t.position.toArray()),poses:tongues.map(t=>[t.scale.y,t.rotation.z])}),dispose(){root.removeFromParent();geometry.dispose();coalGeo.dispose();outer.dispose();inner.dispose();emberMat.dispose();if(!existing){light.removeFromParent();light.dispose();}}};
}
