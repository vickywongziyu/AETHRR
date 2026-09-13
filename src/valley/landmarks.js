import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt, riverX } from './math.js';

export function makeLandmarks(root){
  const bins=new Map();
  const wood=new T.MeshStandardMaterial({color:'#53402c',roughness:.95});wood.name='Aged_timber';
  const edges=new T.MeshStandardMaterial({color:'#84664a',roughness:1});edges.name='Timber_edges';
  const roof=new T.MeshStandardMaterial({color:'#414e4e',roughness:.95});roof.name='Slate_roof';
  const snow=new T.MeshStandardMaterial({color:'#d8e2df',roughness:.95});snow.name='Roof_snow';
  const glass=new T.MeshStandardMaterial({color:'#d9983c',emissive:'#f9ad45',emissiveIntensity:2,roughness:.3});glass.name='Warm_window';
  const stone=new T.MeshStandardMaterial({color:'#6f7167',roughness:1});stone.name='Foundation_stone';
  function add(g,mat,pos=[0,0,0],rot=[0,0,0]){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);}
  function box(size,pos,mat=wood,rot){add(new T.BoxGeometry(...size),mat,pos,rot);}
  function beam(a,b,r=.12,mat=wood){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const g=new T.CylinderGeometry(r*.83,r,d.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));add(g,mat,av.add(bv).multiplyScalar(.5).toArray());}
  const cx=26,cz=16,cy=heightAt(cx,cz);
  box([7.5,.8,5.8],[cx,cy+.05,cz],stone);
  for(let i=0;i<15;i++){
    const y=cy+.55+i*.23;
    beam([cx-3.3,y,cz-2.4],[cx+3.3,y,cz-2.4],.17);
    beam([cx-3.3,y,cz+2.4],[cx+3.3,y,cz+2.4],.17);
    beam([cx-3.2,y,cz-2.6],[cx-3.2,y,cz+2.6],.17);
    beam([cx+3.2,y,cz-2.6],[cx+3.2,y,cz+2.6],.17);
  }
  // Gabled roof: slope along x, ridge along z.
  const angle=.56;
  for(const side of [-1,1]){
    box([4.3,.23,6.4],[cx+side*1.8,cy+4.52,cz],roof,[0,0,-side*angle]);
    box([4.3,.1,6.4],[cx+side*1.8,cy+4.69,cz],snow,[0,0,-side*angle]);
    for(let j=0;j<12;j++)box([4.3,.09,.1],[cx+side*1.8,cy+4.63,cz-3.1+j*.56],edges,[0,0,-side*angle]);
  }
  const faceG=new T.BufferGeometry();faceG.setAttribute('position',new T.Float32BufferAttribute([cx-3.25,cy+3.8,cz+2.42,cx+3.25,cy+3.8,cz+2.42,cx,cy+5.75,cz+2.42],3));faceG.setIndex([0,1,2]);faceG.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,.5,1],2));faceG.computeVertexNormals();add(faceG,wood);
  box([1.2,2.2,.13],[cx+.4,cy+1.5,cz+2.6],edges);
  for(const wx of [-1.9,2.15]){
    box([1.05,1.05,.12],[cx+wx,cy+2.25,cz+2.64],glass);
    box([.07,1.12,.17],[cx+wx,cy+2.25,cz+2.72],wood);box([1.12,.07,.17],[cx+wx,cy+2.25,cz+2.72],wood);
  }
  box([.12,1.05,1.25],[cx+3.38,cy+2.25,cz+.4],glass);
  box([8,.25,2.6],[cx,cy+.43,cz+3.65],edges);
  for(let i=0;i<3;i++)box([2.2,.22,1],[cx+.4,cy+.05+i*.14,cz+5.4-i*.6],wood);
  for(const dx of [-3.6,3.6])beam([cx+dx,cy+.5,cz+4.5],[cx+dx,cy+3.2,cz+4.5],.12,edges);
  box([.7,2,.7],[cx-1.8,cy+5.4,cz-1.3],stone);
  const lamp=new T.PointLight('#ffaf50',16,12,2);lamp.position.set(cx,cy+2.2,cz+3);root.add(lamp);

  const tx=29,tz=-44,ty=heightAt(tx,tz),th=9;
  for(const dx of [-1.7,1.7])for(const dz of [-1.7,1.7])beam([tx+dx*1.35,ty,tz+dz*1.35],[tx+dx,ty+th,tz+dz],.17,edges);
  for(const side of [-1,1]){
    for(let level=0;level<2;level++){
      beam([tx-2,ty+level*3.7,tz+side*2],[tx+2,ty+(level+1)*3.7,tz+side*2],.105);
      beam([tx+2,ty+level*3.7,tz+side*2],[tx-2,ty+(level+1)*3.7,tz+side*2],.105);
      beam([tx+side*2,ty+level*3.7,tz-2],[tx+side*2,ty+(level+1)*3.7,tz+2],.105);
    }
  }
  box([4.8,.28,4.8],[tx,ty+th,tz],edges);
  for(const dx of [-1.9,1.9])for(const dz of [-1.9,1.9])beam([tx+dx,ty+th,tz+dz],[tx+dx,ty+th+2.6,tz+dz],.11,edges);
  for(const side of [-1,1]){
    beam([tx-2.1,ty+th+1,tz+side*2.1],[tx+2.1,ty+th+1,tz+side*2.1],.07,edges);
    beam([tx+side*2.1,ty+th+1,tz-2.1],[tx+side*2.1,ty+th+1,tz+2.1],.07,edges);
  }
  const towerRoof=new T.ConeGeometry(3.6,1.5,4);add(towerRoof,roof,[tx,ty+th+3.05,tz],[0,Math.PI/4,0]);
  add(new T.ConeGeometry(3.64,1.5,4),snow,[tx,ty+th+3.16,tz],[0,Math.PI/4,0]);
  for(let i=0;i<24;i++)beam([tx-.5,ty+i*.34,tz+2.3],[tx+.5,ty+i*.34,tz+2.3],.06,edges);
  beam([tx-.56,ty,tz+2.3],[tx-.56,ty+th,tz+2.3],.075);beam([tx+.56,ty,tz+2.3],[tx+.56,ty+th,tz+2.3],.075);

  const bz=-4,bx=riverX(bz),by=3.6;
  for(let i=0;i<47;i++){const x=bx-10.5+i*.46,y=by+Math.sin(i/46*Math.PI)*.75;box([.43,.16,2.6],[x,y,bz],edges);}
  for(const side of [-1,1]){
    for(let i=0;i<7;i++){const x=bx-10+i*3.33,y=by+Math.sin(i/6*Math.PI)*.75;beam([x,y,bz+side*1.25],[x,y+1.1,bz+side*1.25],.08);if(i<6){const nx=x+3.33,ny=by+Math.sin((i+1)/6*Math.PI)*.75;beam([x,y+1,bz+side*1.25],[nx,ny+1,bz+side*1.25],.07);}}
    beam([bx-10.5,by-.2,bz+side],[bx+10.5,by-.2,bz+side],.22);
  }
  for(const [m,gs] of bins){const g=mergeGeometries(gs);const mesh=new T.Mesh(g,m);mesh.name=m.name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);gs.forEach(g=>g.dispose());}
  return {cabin:new T.Vector3(cx,cy+5,cz),tower:new T.Vector3(tx,ty+th+3,tz),bridge:new T.Vector3(bx,by+1,bz),chimney:new T.Vector3(cx-1.8,cy+6.5,cz-1.3)};
}
