import {paintedNoiseGLSL} from '../atlas/painted-surface.js';

// Two offset flow phases fade to zero before their UV advection resets.
// Only the annulus travels: the central citadel remains a stable destination.
export const VEIL_FLOW_FRAGMENT=`
varying vec2 vUv;
varying float stoneEdge;
uniform float uTime;
uniform sampler2D veilTexture;
uniform float veilReady;
${paintedNoiseGLSL}
const float FLOW_PERIOD=4.6;
vec2 flowUV(vec2 uv,float phase,float mask){
 vec2 p=(uv-vec2(.5,.51))*vec2(2.,1.6);
 float r=length(p),a=atan(p.y,p.x);
 float curl=paintNoise(vec3(p*5.,uTime*.12))-.5;
 // Positive sampling angle makes the visible light move clockwise.
 a+=(phase-.5)*1.05*mask+curl*.065*mask;
 r+=sin(a*4.-uTime*.72+r*13.)*.012*mask;
 vec2 advected=vec2(cos(a),sin(a))*r/vec2(2.,1.6)+vec2(.5,.51);
 return clamp(advected,vec2(.002),vec2(.998));
}
void main(){
 vec2 p=(vUv-vec2(.5,.51))*vec2(2.,1.6);
 float r=length(p),a=atan(p.y,p.x);
 float border=smoothstep(.01,.09,vUv.x)*smoothstep(.01,.09,1.-vUv.x)*smoothstep(.01,.08,vUv.y)*smoothstep(.01,.08,1.-vUv.y);
 float flowMask=smoothstep(.28,.64,r)*border;
 float phaseA=fract(uTime/FLOW_PERIOD),phaseB=fract(phaseA+.5);
 float weightA=1.-abs(phaseA*2.-1.);
 vec3 layerA=texture2D(veilTexture,flowUV(vUv,phaseA,flowMask)).rgb;
 vec3 layerB=texture2D(veilTexture,flowUV(vUv,phaseB,flowMask)).rgb;
 vec3 base=texture2D(veilTexture,vUv).rgb;
 vec3 fluid=mix(layerB,layerA,weightA);
 vec3 painted=mix(base,fluid,smoothstep(.28,.48,r));
 // Narrow secondary light streams move independently along the outer vortex.
 float turbulence=paintNoise(vec3(p*9.,uTime*.18));
 float ribbon=pow(max(0.,sin(a*3.+r*18.+turbulence*2.6+uTime*.92)),28.);
 painted+=vec3(.45,.66,.58)*ribbon*flowMask*.13;
 painted*=1.05;
 vec3 fallback=mix(vec3(.045,.16,.19),vec3(.36,.64,.59),turbulence)+vec3(.35,.52,.44)*ribbon*flowMask;
 gl_FragColor=vec4(mix(fallback,painted,veilReady),.97*smoothstep(0.,1.,stoneEdge));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
