import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const root = fileURLToPath(new URL('../', import.meta.url));
export default defineConfig({
  base: './', publicDir: false,
  plugins: [{ name: 'three-world-assets', closeBundle() {
    for (const directory of ['forest', 'watercourt', 'aether', 'highland', 'character', 'atlas']) cpSync(root + 'public/' + directory, root + 'dist-worlds/' + directory, { recursive: true });
    // Lossless transport copies; .bin avoids automatic server-side gzip decoding.
    // Keep original GLBs for legacy pages and native QA.
    for (const file of ['aether','highland','forest','watercourt','valley'].map(id=>'atlas/miniatures/'+id+'.glb').concat('atlas/north-valley.glb')) writeFileSync(root+'dist-worlds/'+file+'.bin',gzipSync(readFileSync(root+'public/'+file),{level:6}));
    mkdirSync(root + 'dist-worlds/assets/valley', { recursive: true });
    cpSync(root + 'public/assets/granite.jpg', root + 'dist-worlds/assets/granite.jpg');
    for (const file of ['fir-branch.jpg', 'fir-alpha.png', 'granite-scan.glb', 'water-normal.jpg']) cpSync(root + 'public/assets/valley/' + file, root + 'dist-worlds/assets/valley/' + file);
  } }],
  build: { outDir: 'dist-worlds', rollupOptions: {
    input: { home: root + 'home.html', aether: root + 'aether.html', forest: root + 'index.html', watercourt: root + 'lake.html', valley: root + 'valley.html' },
    output: { manualChunks: { 'three-core': ['three'] } },
  } },
});
