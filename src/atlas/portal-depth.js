// Shared original fluid-light treatment. Existing arch geometry, silhouette,
// raycasts, destination loading and retry behavior remain the source of truth.
export const portalMotion={value:1};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export function updatePortalMotion(){portalMotion.value=reduced.matches?0:1;}
export const PORTAL_DEPTH_GLSL=`
uniform float portalMotion;
float gateHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float gateNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gateHash(i),gateHash(i+vec2(1.,0.)),f.x),mix(gateHash(i+vec2(0.,1.)),gateHash(i+1.),f.x),f.y);}
vec3 portalDepth(vec2 uv,float seconds,vec3 tint){
 float time=seconds*portalMotion;vec2 p=(uv-.5)*2.;p.y*=.85;
 float radius=length(p),angle=atan(p.y,p.x);float spin=angle+radius*3.1-time*.21;
 vec2 q=vec2(cos(spin),sin(spin))*radius;
 float mist=gateNoise(q*3.+vec2(time*.07,-time*.1))*.58+gateNoise(q*7.-time*.08)*.28+gateNoise(q*15.+time*.06)*.14;
 float curl=sin(angle*3.+radius*15.-time*.7+mist*6.);
 float ribbon=pow(max(0.,curl),9.)*smoothstep(.12,.65,radius);
 float inner=exp(-radius*radius*5.5);
 vec3 dark=tint*vec3(.06,.085,.13);
 vec3 cloud=tint*(.26+mist*.62)+vec3(.03,.045,.065)*inner;
 vec3 col=mix(dark,cloud,smoothstep(.18,.88,mist)) + tint*ribbon*.55;
 col+=mix(tint,vec3(.84,.94,1.),.45)*pow(max(0.,1.-abs(radius-.68+sin(angle*4.+time*.2)*.035)*18.),3.)*.15;
 return col;
}`;
