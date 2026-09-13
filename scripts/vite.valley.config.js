import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync } from 'node:fs';
export default defineConfig({
  base:'./',
  publicDir:false,
  plugins:[{name:'valley-assets-only',closeBundle(){
    mkdirSync('dist-valley/assets/valley',{recursive:true});
    cpSync('public/assets/granite.jpg','dist-valley/assets/granite.jpg');
    for(const file of ['fir-branch.jpg','fir-alpha.png','granite-scan.glb','water-normal.jpg'])cpSync('public/assets/valley/'+file,'dist-valley/assets/valley/'+file);
  }}],
  build:{outDir:'dist-valley',rollupOptions:{input:fileURLToPath(new URL('../valley.html',import.meta.url))}},
});
