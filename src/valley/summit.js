import * as T from 'three';
import { heightAt, noise } from './math.js';

// A small snow shelf follows the actual crags and scanned rocks, not just the heightfield.
export function makeSummitFooting(world) {
  world.updateMatrixWorld(true);
  const ground = world.children.filter(o => ['Alpine_valley_terrain', 'Granite_crags', 'Photogrammetry_granite_outcrops'].includes(o.name));
  const ray = new T.Raycaster(new T.Vector3(), new T.Vector3(0, -1, 0));
  const groundAt = (x, z) => { ray.ray.origin.set(x, 300, z); return ray.intersectObjects(ground)[0]?.point.y ?? heightAt(x, z); };
  const x = -43, z = -63;
  const heights = [];
  for (const dx of [-1.8, 0, 1.8]) for (const dz of [-1.8, 0, 1.8]) heights.push(groundAt(x + dx, z + dz));
  const y = Math.max(...heights) + .13;
  const positions = [], colors = [], indices = [], n = 32, rings = [0, 2.15, 3.15, 4.2];
  rings.forEach((radius, j) => {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, r = radius * (j < 2 ? 1 : 1 + .05 * Math.sin(a * 5));
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const h = j < 2 ? y : groundAt(px, pz) + .045;
      positions.push(px, j === 2 ? Math.max(h, T.MathUtils.lerp(y, h, .52)) : h, pz);
      const c = new T.Color('#d5e0e2').multiplyScalar(.96 + noise(px * 2, pz * 2) * .05); colors.push(c.r, c.g, c.b);
      if (j) { const a0 = (j - 1) * n + i, b = (j - 1) * n + (i + 1) % n, c0 = j * n + i, d = j * n + (i + 1) % n; indices.push(a0, b, c0, b, d, c0); }
    }
  });
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const footing = new T.Mesh(geometry, world.getObjectByName('Alpine_valley_terrain').material);
  footing.name = 'Summit_snow_footing'; footing.receiveShadow = true; footing.castShadow = true; world.add(footing);
  return { position: [x, y, z], groundAt, height: y, footprintVariation: Math.max(...heights) - Math.min(...heights) };
}
