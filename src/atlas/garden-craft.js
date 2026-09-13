import * as T from 'three';
import {paintedNoiseGLSL} from './painted-surface.js';

export function gardenSoil(material){
 material.name='Moon garden · cultivated earth';
 material.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 gardenEarth;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngardenEarth=position;');
  s.fragmentShader='varying vec3 gardenEarth;\n'+paintedNoiseGLSL+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float loam=paintNoise(gardenEarth*vec3(5.,2.,4.));
   float clod=paintNoise(gardenEarth*22.);
   float resolved=1.-smoothstep(.05,.18,max(length(dFdx(gardenEarth)),length(dFdy(gardenEarth))));
   diffuseColor.rgb*=.72+loam*.42+mix(.1,clod*.20,resolved);
  `);
 };
 material.customProgramCacheKey=()=> 'garden-cultivated-earth-v26';
}

// The 15 crop stems keep their original positions and .71 m planting height.
// Soft furrows pass between their five rows; the earth never covers the stems.
export function nurserySoil(){
 const g=new T.PlaneGeometry(1.82,2.32,24,32);g.rotateX(-Math.PI/2);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),edge=Math.min(1,(.91-Math.abs(x))*10,(1.16-Math.abs(z))*10);
  const furrow=.5+.5*Math.cos(z/ .43*Math.PI*2);
  p.setY(i,.681+Math.max(0,edge)*(.016*furrow+.0025*Math.sin(x*18+z*11)));
 }
 g.computeVertexNormals();return g;
}

export function carvedNurseryBed(c,index){
 // Closed earth mass and stone feet replace the monolithic gray box.
 c.box([0,.335,0],[1.84,.67,2.33],'soil',[0,0,0],.012);
 for(const x of [-.91,.91])for(const z of [-1.15,1.15]){
  c.box([x,.12,z],[.30,.24,.32],'gardenstone',[0,0,0],.055);
  c.box([x,.40,z],[.18,.54,.20],'wood',[0,0,0],.025);
  c.box([x,.78,z],[.25,.16,.28],'gardencap',[0,0,0],.038);
  for(const y of [.25,.61])c.box([x,y,z],[.205,.045,.23],'iron',[0,0,0],.01);
 }
 for(const x of [-.98,.98]){
  for(let j=0;j<7;j++)c.box([x,.44,(j-3)*.346],[.115,.52+(j%3-1)*.008,.337],'wood',[0,0,0],.018);
  for(const y of [.21,.68])c.box([x,y,0],[.17,.11,2.49],'endgrain',[0,0,0],.022);
  c.box([x,.79,0],[.15,.12,2.59],'gardencap',[0,0,0],.026);
 }
 for(const z of [-1.23,1.23]){
  for(let j=0;j<5;j++)c.box([(j-2)*.376,.44,z],[.366,.54,.12],'wood',[0,0,0],.018);
  c.box([0,.20,z],[2.03,.13,.17],'gardenstone',[0,0,0],.029);
  c.box([0,.77,z],[2.09,.17,.17],'gardencap',[0,0,0],.035);
  const face=z+Math.sign(z)*.075;
  // Mirrored carved leaf medallion, fixed to the end panel, below its label.
  for(const side of [-1,1])c.line([[0,.27,face],[side*.20,.39,face],[side*.14,.51,face],[0,.61,face]],.018,'trim');
  c.line([[0,.28,face],[0,.43,face],[0,.60,face]],.014,'trim');
  for(const x of [-.80,.80])for(const y of [.32,.59])c.sphere([x,y,face],[.025,.025,.012],'iron');
 }
 c.add(nurserySoil(),'soil');
 // Scattered mineral pieces, kept low and away from the plant stem grid.
 for(let j=0;j<14;j++){
  const x=Math.sin(j*31.7+index*4)*.79,z=Math.cos(j*12.3+index)*1.03;
  if(Math.abs(x/.52-Math.round(x/.52))<.11&&Math.abs(z/.43-Math.round(z/.43))<.13)continue;
  c.sphere([x,.693,z],[.018+(j%3)*.006,.009,.019],'gardenstone');
 }
}

export function conservatoryFloor(c,w,d){
 const nx=Math.ceil(w/.75),nz=Math.ceil(d/.82),dx=w/nx,dz=d/nz;
 for(let z=0;z<nz;z++)for(let x=-1;x<nx;x++){
  const offset=z%2*.5,left=Math.max(-w/2,-w/2+(x+offset)*dx),right=Math.min(w/2,-w/2+(x+offset+1)*dx);
  if(right-left<.02)continue;
  c.box([(left+right)/2,-.013,-d/2+(z+.5)*dz],
   [right-left-.011,.026,dz-.011],(x*5+z*7)%11<2?'gardenfloorShade':'gardenfloor',[0,0,0],.0025);
 }
 // A restrained botanical inlay marks the centre aisle without a raised curb.
 for(const z of [-4.1,0,4.1]){
  for(const side of [-1,1])c.line([[0,.001,z-.47],[side*.22,.001,z-.06],[side*.14,.001,z+.22],[0,.001,z+.47]],.007,'trim');
 }
}

export function conservatoryJoinery(c,{w,d,h}){
 const roof=x=>h+2.65*(1-Math.pow(Math.abs(x)/(w/2),1.55));
 for(const side of [-1,1])for(let bay=0;bay<4;bay++){
  const z=-d/2+(bay+.5)*d/4,x=side*(w/2-.045);
  // Curved wood tracery follows the existing side pane, with an inset leaf.
  for(const s of [-1,1]){
   c.line([[x,.86,z+s*(d/8-.12)],[x,1.27,z+s*.7],[x,2.0,z+s*.43],[x,2.50,z]],.037,'wood');
   c.line([[x,1.18,z],[x,1.63,z+s*.18],[x,2.13,z]],.015,'trim');
  }
  c.sphere([x,2.5,z],[.055,.07,.065],'trim');
 }
 for(const side of [-1,1])for(let bay=0;bay<=4;bay++){
  const z=-d/2+bay*d/4;
  c.line([[side*(w/2-.03),2.71,z],[side*(w/2-.16),3.06,z],[side*(w/2-.58),roof(w/2-.58)-.02,z]],.085,'wood');
  c.box([side*(w/2-.08),2.85,z],[.28,.12,.32],'trim',[0,0,0],.015);
 }
}
