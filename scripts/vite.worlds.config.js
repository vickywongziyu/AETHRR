import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const copied = ['forest', 'watercourt', 'aether', 'highland', 'character', 'atlas'];
const packed = ['aether','highland','forest','watercourt','valley'].map(id=>'atlas/miniatures/'+id+'.glb').concat('atlas/north-valley.glb');
// Lossless transport copies; .bin avoids automatic server-side gzip decoding.
// Keep original GLBs for legacy pages and native QA.
const packedBytes = new Map(packed.map(file => [file, gzipSync(readFileSync(root+'public/'+file),{level:6})]));
// Decoded byte counts for loading progress: Vercel's br responses carry no Content-Length.
const assetBytes = {};
const walk = dir => { for (const name of readdirSync(root+'public/'+dir)) { const rel = dir+'/'+name, s = statSync(root+'public/'+rel); if (s.isDirectory()) walk(rel); else if (/\.(glb|hdr|jpe?g|png|webp)$/i.test(name)) assetBytes[rel] = s.size; } };
copied.forEach(walk);
// Fingerprints identify the requested GLB bytes, never decoded geometry or visitor saves.
const modelHashes=Object.fromEntries(['aether/aether-runtime-v55.glb','atlas/north-valley.glb'].map(file=>[file,createHash('sha256').update(readFileSync(root+'public/'+file)).digest('hex')]));
for (const [file, bytes] of packedBytes) assetBytes[file+'.bin'] = bytes.length;
export default defineConfig({
  base: './', publicDir: false,
  define: { __ASSET_BYTES__: JSON.stringify(assetBytes), __MODEL_HASHES__: JSON.stringify(modelHashes) },
  plugins: [{ name: 'three-world-assets', closeBundle() {
    for (const directory of copied) cpSync(root + 'public/' + directory, root + 'dist-worlds/' + directory, { recursive: true });
    for (const [file, bytes] of packedBytes) writeFileSync(root+'dist-worlds/'+file+'.bin', bytes);
    mkdirSync(root + 'dist-worlds/assets/valley', { recursive: true });
    cpSync(root + 'public/assets/granite.jpg', root + 'dist-worlds/assets/granite.jpg');
    for (const file of ['fir-branch.jpg', 'fir-alpha.png', 'fir-branch-web.webp', 'fir-alpha-web.webp', 'granite-scan.glb', 'water-normal.jpg']) cpSync(root + 'public/assets/valley/' + file, root + 'dist-worlds/assets/valley/' + file);
  } }],
  build: { outDir: 'dist-worlds', rollupOptions: {
    input: { home: root + 'home.html', aether: root + 'aether.html', forest: root + 'index.html', watercourt: root + 'lake.html', valley: root + 'valley.html' },
    output: { manualChunks: { 'three-core': ['three'] } },
  } },
});
