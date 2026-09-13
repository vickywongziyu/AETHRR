import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync } from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
export default defineConfig({
  base: './', publicDir: false,
  plugins: [{ name: 'three-world-assets', closeBundle() {
    for (const directory of ['forest', 'watercourt', 'aether', 'highland', 'character', 'atlas']) cpSync(root + 'public/' + directory, root + 'dist-worlds/' + directory, { recursive: true });
    mkdirSync(root + 'dist-worlds/assets/valley', { recursive: true });
    cpSync(root + 'public/assets/granite.jpg', root + 'dist-worlds/assets/granite.jpg');
    for (const file of ['fir-branch.jpg', 'fir-alpha.png', 'granite-scan.glb', 'water-normal.jpg']) cpSync(root + 'public/assets/valley/' + file, root + 'dist-worlds/assets/valley/' + file);
  } }],
  build: { outDir: 'dist-worlds', rollupOptions: {
    input: { home: root + 'home.html', aether: root + 'aether.html', forest: root + 'index.html', watercourt: root + 'lake.html', valley: root + 'valley.html' },
    output: { manualChunks: { 'three-core': ['three'] } },
  } },
});
