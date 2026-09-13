import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {paintedNoiseGLSL} from '../atlas/painted-surface.js';

export function createThemeEnvironment(stone){
 const group=new T.Group();group.name='Threshold · sea and distant archipelago';
 const time={value:0};
 const sky=new T.Mesh(new T.SphereGeometry(100,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 v;uniform float time;${paintedNoiseGLSL}
 void main(){vec3 p=normalize(v);float n=paintNoise(p*7.)*.55+paintNoise(p*19.)*.3+paintNoise(p*45.)*.15;float band=exp(-pow((p.y-p.x*.26-.1)*4.,2.));vec3 c=mix(vec3(.008,.019,.035),vec3(.035,.065,.105),band*n);float horizon=exp(-abs(p.y)*16.);c+=vec3(.028,.048,.07)*horizon;vec2 cells=vec2(atan(p.z,p.x)/6.283185,asin(p.y)/3.14159)*vec2(1500.,750.);float h=paintHash(vec3(floor(cells),1.));float stars=smoothstep(.18,.0,length(fract(cells)-.5))*step(.983,h);c+=vec3(.60,.75,.88)*stars*(.6+h);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));sky.name='Threshold · layered night sky';sky.renderOrder=-10;group.add(sky);
 const waterShader={uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0}},vertexShader:`uniform mat4 textureMatrix;varying vec4 mirrorUv;varying vec2 sea;void main(){sea=position.xy;mirrorUv=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color;uniform float time;varying vec4 mirrorUv;varying vec2 sea;${paintedNoiseGLSL}
 void main(){vec2 uv=mirrorUv.xy/mirrorUv.w;float ripples=sin(sea.y*11.+sin(sea.x*2.+time*.31)*2.-time*.7);float fine=sin(sea.y*32.+sea.x*4.-time*.8);float n=paintNoise(vec3(sea*.52,time*.04));vec2 distortion=vec2(ripples*.0013+fine*.0004,sin(sea.x*8.+time*.2)*.00045);vec3 reflected=texture2D(tDiffuse,uv+distortion).rgb;vec3 blur=texture2D(tDiffuse,uv+distortion+vec2(.002,0)).rgb+texture2D(tDiffuse,uv+distortion-vec2(.002,0)).rgb;reflected=mix(reflected,blur*.5,.55);float glint=pow(max(0.,ripples*.45+fine*.2+n*.3),9.);vec3 c=mix(vec3(.014,.032,.047),reflected,.42)+vec3(.035,.054,.063)*(n*.2+glint);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`};
 const water=new Reflector(new T.PlaneGeometry(240,240),{textureWidth:768,textureHeight:768,clipBias:.002,multisample:0,shader:waterShader});water.rotation.x=-Math.PI/2;water.position.y=-.56;water.name='Threshold · real planar water reflection';group.add(water);
 const rockGeo=new T.IcosahedronGeometry(1,2),v=rockGeo.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),f=1+Math.sin(x*12+y*8+z*9)*.11+Math.sin(z*20)*.055;v.setXYZ(i,x*f,y*f,z*f);}rockGeo.computeVertexNormals();
 // Actual silhouettes at three depths; front rocks frame the water, not the title.
 const transform=new T.Object3D();
 for(let layer=0;layer<3;layer++){
  const mat=new T.MeshBasicMaterial({color:['#122231','#182a3a','#1c3142'][layer],map:stone.map,fog:false});
  const ridge=new T.InstancedMesh(rockGeo,mat,27);ridge.name='Threshold · distant ridge '+layer;
  for(let i=0;i<27;i++){const seed=i*3.61+layer*21,x=(i-13)*4.4,z=-48-layer*12-Math.sin(seed)*4,h=1.5+(Math.sin(seed*8)*.5+.5)*3.3;
   transform.position.set(x,h*.3-1.5,z);transform.scale.set(2.3+Math.sin(seed)*.8,h,2);transform.rotation.set(.12,seed,.08);transform.updateMatrix();ridge.setMatrixAt(i,transform.matrix);
  }group.add(ridge);
 }
 const foregroundStone=stone.clone();foregroundStone.color.set('#2c3c49');const foreground=new T.InstancedMesh(rockGeo,foregroundStone,20);foreground.name='Threshold · shoreline rocks';let rockCount=0;
 for(let i=0;i<20;i++){const a=i*2.399,r=4.2+(i%6)*1.8,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(x)<4.5)continue;
  transform.position.set(x,-.5,z);transform.scale.set(.4+(i%4)*.36,.18+(i%3)*.24,.45+(i%5)*.3);transform.rotation.set(.2*i,i,.3);transform.updateMatrix();foreground.setMatrixAt(rockCount++,transform.matrix);
 }foreground.count=rockCount;foreground.castShadow=foreground.receiveShadow=true;group.add(foreground);
 // Small suspended islands with actual roofs keep the distant skyline inhabited.
 const distantStone=new T.MeshBasicMaterial({color:'#334a5c',transparent:true,opacity:.38,depthWrite:false,fog:false});
 for(const [x,y,z,s]of[[20,5.3,-36,1.2],[34,8.2,-49,1.5],[-29,3.2,-48,.8]]){
  const island=new T.Group();island.name='Threshold · distant floating settlement';island.position.set(x,y,z);island.scale.setScalar(s*.62);
  const cap=new T.Mesh(rockGeo,distantStone);cap.scale.set(2.4,.65,1.4);island.add(cap);
  const hanging=new T.Mesh(rockGeo,distantStone);hanging.scale.set(1.2,1.75,.9);hanging.rotation.z=Math.PI;hanging.position.y=-1.3;island.add(hanging);
  for(let i=0;i<6;i++){const h=.45+(i%3)*.35,tower=new T.Mesh(new T.CylinderGeometry(.16,.19,h,7),distantStone);tower.position.set((i-2.5)*.48,.38+h*.5,Math.sin(i*3)*.35);island.add(tower);const roof=new T.Mesh(new T.ConeGeometry(.24,.5,7),distantStone);roof.position.copy(tower.position);roof.position.y+=h*.5+.23;island.add(roof);}
  group.add(island);
 }
 const mistMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v;uniform float time;${paintedNoiseGLSL}
 void main(){float n=paintNoise(vec3(v*vec2(20.,4.)+vec2(time*.006,0.),1.))*.6+paintNoise(vec3(v*vec2(53.,9.)-vec2(time*.012,0.),2.))*.4;float alpha=smoothstep(.28,.8,n)*pow(sin(v.y*3.14159),2.)*.15;gl_FragColor=vec4(.19,.27,.32,alpha);}`} );
 for(let i=0;i<5;i++){const mist=new T.Mesh(new T.PlaneGeometry(140,5+i*1.5),mistMaterial);mist.position.set(0,.5+i*.5,-5-i*9);mist.renderOrder=1;group.add(mist);}
 const ringMaterial=new T.MeshBasicMaterial({color:'#be9f64',transparent:true,opacity:.18,depthWrite:false});for(const r of[4.9,5.1,7.3,7.35]){const ring=new T.Mesh(new T.TorusGeometry(r,.008,4,160),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=-.545;group.add(ring);}
 return{group,water,animate(t){time.value=t;water.material.uniforms.time.value=t;},quality(value){const size={low:256,balanced:512,high:768}[value]||768;water.getRenderTarget().setSize(size,size);},dispose(){water.dispose();}};
}
