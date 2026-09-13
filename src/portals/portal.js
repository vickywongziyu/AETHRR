import * as T from 'three';
import {portalMoteMaterial} from './light-motes.js';
import {addStonePortalFrame,STONE_VEIL_VERTEX} from './stone-frame.js';
import './portal.css';
import { WORLDS } from './worlds.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const arrival = new URLSearchParams(location.search).get('arrival');
let veil, arrivalTimer;
function transitionScreen(name, caption) {
  if (!veil) {
    veil = document.createElement('div');
    veil.className = 'gate-transition';
    veil.setAttribute('role', 'status');
    veil.innerHTML = '<div class="gate-orbit"></div><strong></strong><span></span>';
    document.body.append(veil);
  }
  veil.setAttribute('aria-hidden', 'false');
  veil.querySelector('strong').textContent = name;
  veil.querySelector('span').textContent = caption;
  return veil;
}
if (WORLDS[arrival]) {
  transitionScreen('三境之间', '正在展开另一片世界').classList.add('visible');
  // Let the scene's own retry UI remain reachable if loading fails.
  arrivalTimer = setTimeout(() => veil?.remove(), 45000);
}
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

/** One real scene-space gate, with a shared, accessible destination chooser. */
export function createPortal({ scene, camera, renderer, id, position, scale = 1, yaw = 0, existingSurface, plinth = true, onFocus = () => {} }) {
  const theme = WORLDS[id], group = new T.Group();
  group.name = `World_Portal_${id}`;
  group.position.fromArray(position); group.rotation.y = yaw; group.scale.setScalar(scale);
  scene.add(group);
  const color = new T.Color(theme.color), uniform = { value: 0 };
  let surface = existingSurface;
  if (!surface) {
    const carved=addStonePortalFrame(group,theme,{plinth});
    const material = new T.ShaderMaterial({
      uniforms: { uTime: uniform, uColor: { value: color } }, side: T.DoubleSide, transparent: true, depthWrite: false,
      vertexShader: STONE_VEIL_VERTEX,
      fragmentShader: `varying vec2 vUv; varying float stoneEdge; uniform float uTime; uniform vec3 uColor;
        void main(){vec2 p=vUv;float edge=smoothstep(0.,1.,stoneEdge);
        float wave=sin(p.y*29.-uTime*1.8+sin(p.x*17.+uTime*.4)*2.);
        float stream=pow(.5+.5*sin(p.x*40.+sin(p.y*10.-uTime*.7)*2.8),15.);
        vec3 c=mix(vec3(.018,.045,.068),uColor,.2+stream*.65+wave*.045);
        gl_FragColor=vec4(c*(.7+stream),edge*(.68+stream*.25));}`,
    });
    surface = new T.Mesh(carved.aperture, material);
    surface.position.set(0, 3.43, .04); surface.name = 'Interactive_portal_surface'; group.add(surface);
    const glow = new T.PointLight(color, 30, 13, 2); glow.position.set(0, 3, 1); group.add(glow);
  }
  const particles = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; particles.set([Math.cos(a) * 2.55, 3.5 + Math.sin(a) * 3.35, .35], i * 3); }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(particles, 3));
  const sparks = new T.Points(geometry, portalMoteMaterial({ color, size: .055, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); group.add(sparks);
  // Keyboard access follows the gate in the scene; there is no permanent screen launcher.
  const launcher = document.createElement('button'); launcher.className = 'gate-keyboard-target';
  launcher.setAttribute('aria-label', `打开${theme.name}的传送门`);
  launcher.textContent = '开启光门'; launcher.hidden = true;
  const panel = document.createElement('dialog'); panel.className = 'world-gate-panel'; panel.dataset.scene = id;
  panel.setAttribute('aria-labelledby', 'gate-title'); panel.style.setProperty('--gate-color', theme.color);
  panel.innerHTML = `<button class="gate-close" aria-label="关闭传送门">×</button><h2 id="gate-title">门的彼端</h2>${Object.entries(WORLDS).filter(([key]) => key !== id).map(([key,w]) => `<button class="gate-destination" data-world="${key}"><span>${w.name}</span><svg viewBox="0 0 28 12" aria-hidden="true"><path d="M1 6h24m-5-4 5 4-5 4"/></svg></button>`).join('')}<p class="gate-footnote" role="status"></p>`;
  document.body.append(launcher, panel);
  let active = false, moving = null, saved, busy = false, disposed = false, down, backdropDown = false;
  const center = new T.Vector3(0, 3.4, 0).applyMatrix4(group.matrixWorld);
  group.updateMatrixWorld(true); center.set(0, 3.4, 0).applyMatrix4(group.matrixWorld);
  const front = new T.Vector3(0, 0, 1).applyAxisAngle(new T.Vector3(0, 1, 0), yaw);
  const projected = new T.Vector3();
  function placePanel() {
    projected.copy(center).project(camera);
    const x = (projected.x * .5 + .5) * innerWidth, y = (-projected.y * .5 + .5) * innerHeight;
    const width = Math.min(232, innerWidth - 32), height = 184;
    const edge = surface.localToWorld(new T.Vector3((surface.geometry.parameters.width || 4.5) / 2, 0, 0)).project(camera);
    const halfWidth = Math.abs((edge.x - projected.x) * .5 * innerWidth);
    const right = x + Math.max(64, halfWidth + 20);
    const preferredX = right + width < innerWidth - 16 ? right : x - halfWidth - width - 20;
    panel.style.left = Math.max(16, Math.min(innerWidth - width - 16, preferredX)) + 'px';
    panel.style.top = Math.max(22, Math.min(innerHeight - height - 24, y - height * .4)) + 'px';
    if (innerWidth < 700) { panel.style.left = (innerWidth - width) / 2 + 'px'; panel.style.top = Math.min(innerHeight - height - 112, y + 74) + 'px'; }
  }
  function open() {
    if (active || disposed || document.querySelector('dialog[open]')) return;
    document.querySelector('.gate-arrival-note')?.remove();
    onFocus(); saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
    active = true; backdropDown = false; document.body.classList.add('gate-focused');
    placePanel(); panel.showModal();
  }
  function close() {
    if (busy) return;
    active = false; backdropDown = false; moving = null; document.body.classList.remove('gate-focused');
    if (saved) { camera.position.copy(saved.position); camera.quaternion.copy(saved.quaternion); }
    renderer.domElement.focus({ preventScroll: true });
  }
  panel.querySelector('.gate-close').onclick = () => panel.close();
  panel.addEventListener('close', close);
  panel.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  panel.addEventListener('keydown', event => event.stopPropagation());
  launcher.onclick = open;
  renderer.domElement.tabIndex = 0;
  const onResize = () => { if (active) placePanel(); };
  window.addEventListener('resize', onResize);
  const outsidePanel = event => { const r = panel.getBoundingClientRect(); return event.target === panel && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom); };
  // A touch that opens the modal can dispatch its synthetic click onto the new
  // backdrop. Dismiss only gestures that actually began on that backdrop.
  panel.addEventListener('pointerdown', event => { backdropDown = outsidePanel(event); });
  panel.addEventListener('pointercancel', () => { backdropDown = false; });
  panel.addEventListener('click', event => { const dismiss = backdropDown; backdropDown = false; if (dismiss && !busy && outsidePanel(event)) panel.close(); });
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  function pointerDown(event) { down = event.button === 0 ? [event.clientX, event.clientY] : null; }
  function hitsGate(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(surface, false)[0];
    if (!hit) return false;
    const x = Math.abs(hit.uv.x - .5) * 2;
    return surface.geometry.userData.aperture==='stone-arch-v36'||hit.uv.y <= (existingSurface ? .66 + .34 * Math.pow(1 - x, .645) : .53 + .47 * Math.pow(1 - x, .64));
  }
  function pointerMove(event) { if (active || (event.buttons & 1)) return; renderer.domElement.style.cursor = hitsGate(event) ? 'pointer' : ''; }
  function pointerUp(event) {
    if (active || !down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 7) return;
    if (hitsGate(event)) open();
    down = null;
  }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  panel.querySelectorAll('[data-world]').forEach(button => button.addEventListener('click', async () => {
    if (busy) return;
    busy = true; const next = WORLDS[button.dataset.world];
    panel.querySelectorAll('button').forEach(b => b.disabled = true);
    const url = new URL(next.path, location.href); url.searchParams.set('arrival', id);
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Destination unavailable');
      moving = { start: performance.now(), duration: reduced ? 0 : 850, from: camera.position.clone(), to: center.clone().addScaledVector(front, .5), qFrom: camera.quaternion.clone(), qTo: camera.quaternion.clone() };
      panel.style.visibility = 'hidden';
      transitionScreen(next.name, '正在穿过三境之门');
      requestAnimationFrame(() => veil.classList.add('visible'));
      setTimeout(() => location.assign(url.href), reduced ? 20 : 850);
    } catch {
      busy = false; panel.querySelectorAll('button').forEach(b => b.disabled = false);
      panel.querySelector('.gate-footnote').textContent = '目的地暂时无法连接，请检查网络后重试。';
    }
  }));
  function update(time) {
    uniform.value = time;
    projected.copy(center).project(camera);
    const visible = projected.z > 0 && projected.z < 1 && Math.abs(projected.x) < .88 && Math.abs(projected.y) < .85 && camera.position.distanceTo(center) < 65;
    launcher.hidden = active || !visible;
    launcher.style.left = (projected.x * .5 + .5) * innerWidth + 'px';
    launcher.style.top = (-projected.y * .5 + .5) * innerHeight + 'px';
    sparks.material.opacity = reduced ? .7 : .6 + Math.sin(time * 1.4) * .2;
    if (moving) {
      let t = moving.duration ? Math.min(1, (performance.now() - moving.start) / moving.duration) : 1;
      t = t * t * (3 - 2 * t);
      camera.position.lerpVectors(moving.from, moving.to, t); camera.quaternion.slerpQuaternions(moving.qFrom, moving.qTo, t);
      if (t === 1) moving = null;
    }
  }
  function ready() {
    clearTimeout(arrivalTimer);
    if (WORLDS[arrival]) {
      transitionScreen(theme.name, '已抵达 · 新的风景已经展开');
      setTimeout(() => { veil.classList.remove('visible'); veil.setAttribute('aria-hidden', 'true'); }, reduced ? 0 : 350);
      const note = document.createElement('div'); note.className = 'gate-arrival-note'; note.setAttribute('role', 'status');
      note.textContent = `${WORLDS[arrival].name} → ${theme.name}`; document.body.append(note); setTimeout(() => note.remove(), 5000);
    }
  }
  const api = { get active() { return active; }, id, group, surface, open, update, ready,
    dispose() { disposed = true; launcher.remove(); panel.remove(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointermove', pointerMove); window.removeEventListener('resize', onResize); }
  };
  window.__portal = api;
  return api;
}
