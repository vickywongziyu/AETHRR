import * as T from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { random, riverX, riverWidth } from './math.js';

export function makeSky(scene){
  const sky=new T.Mesh(new T.SphereGeometry(900,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sun:{value:new T.Vector3(-.7,.22,-.45).normalize()}},vertexShader:'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    varying vec3 vP; uniform vec3 sun;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+12.;a*=.5;}return v;}
    void main(){vec3 d=normalize(vP);float h=max(d.y,0.);float s=max(dot(d,sun),0.);
      vec3 col=mix(vec3(.50,.52,.46),vec3(.075,.19,.245),pow(h,.46));
      col+=vec3(.5,.29,.1)*pow(s,9.);col+=vec3(1.,.74,.4)*pow(s,600.);
      vec2 uv=d.xz/(max(.12,d.y)+.3)*2.;float cloud=smoothstep(.5,.73,fbm(uv*2.+vec2(2,4)));
      col=mix(col,vec3(.43,.48,.48),cloud*.35*smoothstep(0.,.16,h));
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}));sky.name='Atmospheric_sky';scene.add(sky);return sky;
}

export function makeRiver(root,time,normalURL){
  const verts=[],uv=[],indices=[],segments=550,cross=16;
  for(let i=0;i<=segments;i++){
    const z=116-i*.55,x=riverX(z),w=riverWidth(z)+.9;
    for(let j=0;j<=cross;j++){verts.push(x+(j/cross*2-1)*w,.18,z);uv.push(j/cross,i/segments);}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<cross;j++){const a=i*(cross+1)+j,b=a+cross+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const normalMap=new T.TextureLoader().load(normalURL);normalMap.wrapS=normalMap.wrapT=T.RepeatWrapping;
  g.rotateX(Math.PI/2);g.translate(0,0,-.18);
  const river=new Water(g,{textureWidth:512,textureHeight:512,waterNormals:normalMap,sunDirection:new T.Vector3(-85,80,55).normalize(),sunColor:0xffdfb0,waterColor:0x163035,distortionScale:2.5,fog:true});
  river.rotation.x=-Math.PI/2;river.position.y=.18;river.material.uniforms.time=time;river.material.uniforms.size.value=8;
  river.material.name='Flowing_river';river.name='River_animated_surface';river.receiveShadow=true;root.add(river);return river;
}
export function makeParticles(scene,time,chimney){
  const rand=random(510),count=750,p=new Float32Array(count*3),seeds=new Float32Array(count);
  for(let i=0;i<count;i++){p.set([(rand()-.5)*145,rand()*52,80-rand()*200],i*3);seeds[i]=rand();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('seed',new T.BufferAttribute(seeds,1));
  const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:time,uOpacity:{value:.4}},vertexShader:`uniform float uTime;attribute float seed;varying float alpha;void main(){vec3 p=position;p.y=mod(position.y-uTime*(.36+seed*.5)+520.,52.);p.x+=sin(uTime*.17+seed*40.)*1.1;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((1.1+seed)*110./-mv.z,.5,3.);alpha=smoothstep(140.,12.,-mv.z);gl_Position=projectionMatrix*mv;}`,fragmentShader:'uniform float uOpacity;varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.92,.95,.93,(1.-smoothstep(.12,.5,d))*alpha*uOpacity);}'});
  const snow=new T.Points(g,mat);snow.name='Gentle_snowfall';scene.add(snow);
  const sg=new T.BufferGeometry(),sp=new Float32Array(36*3),sr=new Float32Array(36);for(let i=0;i<36;i++){sp.set(chimney.toArray(),i*3);sr[i]=i/36;}
  sg.setAttribute('position',new T.BufferAttribute(sp,3));sg.setAttribute('seed',new T.BufferAttribute(sr,1));
  const sm=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:time},vertexShader:'uniform float uTime;attribute float seed;varying float a;void main(){float t=fract(seed+uTime*.038);vec3 p=position+vec3(t*t*3.,t*9.,sin(t*8.)*.4);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(.25+t*1.4)*420./-mv.z;a=sin(t*3.14159)*.095;gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float a;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.63,.65,.62,a*(1.-smoothstep(0.,.5,d)));}'});
  const smoke=new T.Points(sg,sm);smoke.name='Chimney_smoke';scene.add(smoke);
  return {snow,smoke};
}
