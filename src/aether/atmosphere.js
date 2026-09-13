import * as T from 'three';
export const noiseGLSL = `
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.23,.31));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return n3(p)*.54+n3(p*2.03)*.27+n3(p*4.09)*.13+n3(p*8.21)*.06;}
`;
export function createAtmosphere(scene,time){
 const mistG=new T.BufferGeometry(),pts=[];for(let i=0;i<210;i++){const a=i*2.399;pts.push(Math.cos(a)*(25+i*.34),-15+Math.sin(i*1.31)*4,-25+Math.sin(a)*(25+i*.34));}mistG.setAttribute('position',new T.Float32BufferAttribute(pts,3));
 const mist=new T.Points(mistG,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:time},vertexShader:`uniform float uTime;void main(){vec3 p=position;p.x+=sin(uTime*.025+p.z)*1.5;vec4 v=modelViewMatrix*vec4(p,1.);gl_PointSize=min(500.,14000./-v.z);gl_Position=projectionMatrix*v;}`,fragmentShader:`void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.68,.77,.78,pow(max(0.,1.-d),3.)*.025);}`}));scene.add(mist);
 return {mist};
}
export function waterfallMaterial(time){return new T.ShaderMaterial({
 uniforms:{uTime:time},side:T.DoubleSide,transparent:true,depthWrite:false,
 vertexShader:`varying vec2 vUv;varying float vDepth;uniform float uTime;
 void main(){vUv=uv;vec3 p=position;p.x+=sin(uv.y*24.-uTime*6.133333+uv.x*5.)*.045;
 vec4 v=modelViewMatrix*vec4(p,1.);vDepth=-v.z;gl_Position=projectionMatrix*v;}`,
 fragmentShader:`varying vec2 vUv;varying float vDepth;uniform float uTime;${noiseGLSL}
 void main(){
  vec2 uv=vUv;
  // glTF UV.y is 0 at the source and 1 at the base (flipped from Blender).
  // Subtract time so a fixed foam feature travels toward increasing UV.y.
  float falling=uv.y*18.-uTime*4.6;
  float stream=fbm(vec3(uv.x*19.,falling,0.));
  float ribbons=smoothstep(.36,.66,n3(vec3(uv.x*34.,falling*.42,2.)));
  float foam=smoothstep(.54,.74,fbm(vec3(uv.x*14.,falling*1.7,8.)));
  float streak=pow(.5+.5*sin(uv.x*165.+sin(falling*1.8)),6.);
  float edge=smoothstep(0.,.09,uv.x)*(1.-smoothstep(.91,1.,uv.x));
  float alpha=edge*(.23+ribbons*.22+foam*.48+streak*.15)*smoothstep(0.,.035,uv.y);
  vec3 c=mix(vec3(.08,.21,.23),vec3(.52,.68,.69),stream*.7+ribbons*.25);
  c=mix(c,vec3(.92,.97,.96),foam*.9+streak*.2);
  float fog=1.-exp(-.0028*.0028*vDepth*vDepth);
  gl_FragColor=vec4(mix(c,vec3(.64,.74,.76),fog),alpha);
 }`});}
