import * as T from 'three';
import {portalMoteMaterial} from '../portals/light-motes.js';
import {addStonePortalFrame,STONE_VEIL_VERTEX} from '../portals/stone-frame.js';
import {PORTAL_DEPTH_GLSL,portalMotion} from './portal-depth.js';
import {WORLDS} from '../portals/worlds.js';

// Original standalone watercourt/valley architecture and materials from
// portals/portal.js, without its separate-page chooser or navigation handlers.
export function createHeritageGate(id, uniform){
 const theme=WORLDS[id],group=new T.Group(),color=new T.Color(theme.color),plinth=id!=='valley';
 group.name='Original '+id+' stone portal';group.userData.noCollision=true;
 let surface;
    const carved=addStonePortalFrame(group,theme,{plinth});
    const material = new T.ShaderMaterial({
      uniforms: { uTime: uniform, portalMotion, uColor: { value: color } }, side: T.DoubleSide, transparent: true, depthWrite: false,
      vertexShader: STONE_VEIL_VERTEX,
      fragmentShader: `varying vec2 vUv; varying float stoneEdge; uniform float uTime; uniform vec3 uColor;
        ${PORTAL_DEPTH_GLSL}
        void main(){vec2 p=vUv;float edge=smoothstep(0.,1.,stoneEdge);
        float wave=sin(p.y*29.-uTime*1.8+sin(p.x*17.+uTime*.4)*2.);
        float stream=pow(.5+.5*sin(p.x*40.+sin(p.y*10.-uTime*.7)*2.8),15.);
        vec3 c=mix(vec3(.018,.045,.068),uColor,.2+stream*.65+wave*.045);
        c=mix(c,portalDepth(vUv,uTime,uColor),.78);
        gl_FragColor=vec4(c,edge*(.78+stream*.15));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>}`,
    });
    surface = new T.Mesh(carved.aperture, material);
    surface.position.set(0, 3.43, .04); surface.name = 'Interactive_portal_surface'; group.add(surface);
    const glow = new T.PointLight(color, 30, 13, 2); glow.position.set(0, 3, 1); group.add(glow);
  const particles = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; particles.set([Math.cos(a) * 2.55, 3.5 + Math.sin(a) * 3.35, .35], i * 3); }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(particles, 3));
  const sparks = new T.Points(geometry, portalMoteMaterial({ color, size: .055, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); group.add(sparks);
 return {group,surface,labelHeight:7.5,centerHeight:3.4,
  animate(seconds){sparks.material.opacity=.6+Math.sin(seconds*1.4)*.2;}};
}
