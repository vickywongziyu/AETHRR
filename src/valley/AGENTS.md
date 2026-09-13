# North Valley module
This directory owns the realistic alpine valley only. Entry is `/valley.html`.
Other scenes under `src/forest/` and the root `index.html` belong to separate concurrent work; do not overwrite them.
Build this scene with `npx vite build --config scripts/vite.valley.config.js`.
The reusable API is `createValley(container, callbacks)` from `scene.js`.
Keep animation 48 seconds; preserve camera route, real mesh geometry, reduced-motion handling and disposal.
