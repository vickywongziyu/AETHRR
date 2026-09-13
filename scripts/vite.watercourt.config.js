import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import {cpSync,copyFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({base:'./',publicDir:false,plugins:[{name:'watercourt-assets',closeBundle(){cpSync(root+'public/watercourt',root+'dist-watercourt/watercourt',{recursive:true});copyFileSync(root+'dist-watercourt/lake.html',root+'dist-watercourt/index.html');}}],build:{outDir:'dist-watercourt',rollupOptions:{input:root+'lake.html',output:{manualChunks:{three:['three']}}}}});
