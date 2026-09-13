import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, noise, smooth, heightAt, riverX, riverWidth, random, peaks } from './math.js';

const rockColor=new T.Color('#858a88'), grassColor=new T.Color('#58513a'), snowColor=new T.Color('#d4dfe0');
export function paintTerrain(geo, snow=true) {
  geo.computeVertexNormals();
  const pos=geo.attributes.position,norm=geo.attributes.normal,colors=new Float32Array(pos.count*3),c=new T.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ny=norm.getY(i);
    const n=fbm(x*.18,z*.18), fine=noise(x*2.2,z*2.2);
    c.copy(rockColor).lerp(grassColor,smooth(.62,.96,ny)* (1-smooth(5,18,y)));
    c.multiplyScalar(.65+n*.65+fine*.1);
    const snowline=(n-.4)*1.8 + ny*.9 + smooth(6,25,y)*.22;
    const cover=snow?smooth(.92,1.18,snowline)*smooth(.35,.75,ny):0;
    c.lerp(snowColor,cover*.98);
    c.toArray(colors,i*3);
  }
  geo.setAttribute('color',new T.BufferAttribute(colors,3)); return geo;
}
export function landscapeMaterial(texture) {
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.95}); mat.name='Granite_Snow_Ground';
  mat.onBeforeCompile=shader=>{
    shader.uniforms.rockMap={value:texture};
    shader.vertexShader='varying vec3 vTerrainPos; varying vec3 vTerrainNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainPos = position; vTerrainNormal = normal;');
    shader.fragmentShader='uniform sampler2D rockMap; varying vec3 vTerrainPos; varying vec3 vTerrainNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 blend = pow(abs(vTerrainNormal), vec3(4.)); blend /= max(.001, blend.x+blend.y+blend.z);
      vec3 tx=texture2D(rockMap,vTerrainPos.zy*.15).rgb;
      vec3 ty=texture2D(rockMap,vTerrainPos.xz*.15).rgb;
      vec3 tz=texture2D(rockMap,vTerrainPos.xy*.15).rgb;
      vec3 stone=tx*blend.x+ty*blend.y+tz*blend.z; stone=vec3(dot(stone,vec3(.299,.587,.114)));
      float white=smoothstep(.36,.67,max(vColor.r,max(vColor.g,vColor.b)));
      diffuseColor.rgb *= mix(stone*1.45+vec3(.14), vec3(.94)+stone*.1, white);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 bw=pow(abs(vTerrainNormal),vec3(4.));bw/=max(.001,bw.x+bw.y+bw.z);
      float bump=dot(texture2D(rockMap,vTerrainPos.zy*.15).rgb,vec3(.333))*bw.x+dot(texture2D(rockMap,vTerrainPos.xz*.15).rgb,vec3(.333))*bw.y+dot(texture2D(rockMap,vTerrainPos.xy*.15).rgb,vec3(.333))*bw.z;
      vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);
      float det=dot(sx,r1); vec3 grad=sign(det)*(dFdx(bump)*r1+dFdy(bump)*r2);
      float whiteN=smoothstep(.36,.67,max(vColor.r,max(vColor.g,vColor.b)));
      normal=normalize(abs(det)*normal-grad*mix(.5,.05,whiteN));
    `);
  };
  return mat;
}
export function makeTerrain(root,texture) {
  const mat=landscapeMaterial(texture);
  const horizonGeo=new T.PlaneGeometry(1800,1800);horizonGeo.rotateX(-Math.PI/2);horizonGeo.translate(0,-8,-200);const horizon=new T.Mesh(horizonGeo,new T.MeshBasicMaterial({color:'#809492'}));horizon.name='Distant_atmospheric_ground';root.add(horizon);
  const geo=new T.PlaneGeometry(270,340,350,440);geo.rotateX(-Math.PI/2);geo.translate(0,0,-50);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++) p.setY(i,heightAt(p.getX(i),p.getZ(i)));
  paintTerrain(geo);const mesh=new T.Mesh(geo,mat);mesh.name='Alpine_valley_terrain';mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);

  // Overlapping, vertically fissured granite buttresses break the heightfield silhouette.
  const rand=random(720),crags=[];
  for(const [px,pz,h,rx,rz] of peaks.slice(0,8)){
    for(let k=0;k<8;k++){
      const a=rand()*6.28,r=Math.sqrt(rand())*.82;
      const x=px+Math.cos(a)*rx*r,z=pz+Math.sin(a)*rz*r;
      const base=heightAt(x,z), w=3.0+rand()*4.5, tall=5+rand()*8;
      const g=new T.SphereGeometry(1,40,32),p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i);
        const ridge=.78+noise(vx*8.1+k*3,vz*8.1+px)*.42;
        p.setXYZ(i,x+vx*w*ridge+(vy*vy)*.6,base-4+Math.sign(vy)*Math.pow(Math.abs(vy),.7)*tall+(noise(vx*15+k,vy*12+vz*9)-.5)*.65,z+vz*w*.85*ridge);
      }
      paintTerrain(g);crags.push(g);
    }
  }
  const c=new T.Mesh(mergeGeometries(crags),mat);c.name='Granite_crags';c.castShadow=true;c.receiveShadow=true;root.add(c);crags.forEach(g=>g.dispose());

  const stoneG=new T.IcosahedronGeometry(1,1);const sp=stoneG.attributes.position;
  for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i),z=sp.getZ(i);const n=.8+noise(x*2+2,z*3)*.4;sp.setXYZ(i,x*n,y*n,z*n);}
  stoneG.computeVertexNormals();const stoneM=new T.MeshStandardMaterial({color:'#b6b5a9',roughness:1,map:texture});stoneM.name='River_stone';
  const rocks=new T.InstancedMesh(stoneG,stoneM,1050),dummy=new T.Object3D(),rc=new T.Color();let count=0;
  for(let k=0;k<1050;k++){
    const z=-140+rand()*242,side=rand()<.5?-1:1;
    const x=k<790?riverX(z)+side*(riverWidth(z)+rand()*4):rand()*160-80;
    const y=heightAt(x,z);if(y>9)continue;
    const s=.35+rand()**2*1.65;dummy.position.set(x,y-.3*s,z);dummy.rotation.set(rand(),rand()*6.28,rand()*.4);dummy.scale.set(s,s*(.5+rand()*.7),s*(.7+rand()*.6));dummy.updateMatrix();rocks.setMatrixAt(count,dummy.matrix);rc.setHSL(.13,.08,.42+rand()*.17);rocks.setColorAt(count,rc);count++;
  }
  rocks.count=count;rocks.name='Riverbank_boulders';rocks.castShadow=true;rocks.receiveShadow=true;root.add(rocks);

  // Distant physical mountain ranges, softened by atmospheric perspective.
  for(let l=0;l<3;l++){
    const g=new T.PlaneGeometry(750,110,180,35);g.rotateX(-Math.PI/2);g.translate(0,0,-250-l*80);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i);const edge=Math.sin(Math.max(0,Math.min(1,(z+305+l*80)/110))*Math.PI); p.setY(i,-8+Math.pow(fbm(x*.017+l*7,z*.025),2)*145*Math.pow(edge,.8));
    }
    g.computeVertexNormals();const m=new T.MeshBasicMaterial({color:new T.Color().setHSL(.53,.11,.49+l*.055)});m.name='Distant_mountain_haze';
    const r=new T.Mesh(g,m);r.name='Distant_range_'+l;root.add(r);
  }
  return {terrain:mesh,material:mat};
}
