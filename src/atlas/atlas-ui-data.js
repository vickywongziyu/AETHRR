export const CITIES=[
{id:'aether',name:'浮空群岛',en:'AETHER',color:'#82d9dc',text:'循着瀑布与悬桥，走向云上的星辉神殿。',season:'云海 · 星辉与浮石'},
{id:'highland',name:'牛角山城',en:'HORNCREST',color:'#dab884',text:'山风穿过图腾与木屋，灯火照亮归途。',season:'高地 · 松林与炉火'},
{id:'forest',name:'紫境森林',en:'VIOLET SANCTUARY',color:'#c0a0ed',text:'紫雾环绕的古老林地，光在树梢间低语。',season:'林地 · 花园与微光'},
{id:'watercourt',name:'精灵水庭',en:'ELVEN WATERCOURT',color:'#8ed8c6',text:'穿过白石拱廊，在水与光之间停留。',season:'湖岸 · 白石与穹顶'},
{id:'valley',name:'北境河谷',en:'NORTH VALLEY',color:'#bdd9e5',text:'雪覆松枝，河水绕过温暖的北境驿站。',season:'冬境 · 积雪与河流'}];
export const WORLD_BOUNDS={x:390,z:-165,size:1150};
export const CITY_CENTERS={aether:[0,0],highland:[0,153],forest:[430,94],watercourt:[100,-511],valley:[790,110]};
export const DISPLAY_DEFAULTS={quality:'high',motion:true,reduced:false,labels:true,minimap:true};
export function readDisplay(){const defaults={...DISPLAY_DEFAULTS,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};try{const s=JSON.parse(localStorage.getItem('aether-display-v1')||'{}');return{quality:['low','balanced','high'].includes(s.quality)?s.quality:defaults.quality,...Object.fromEntries(['motion','reduced','labels','minimap'].map(k=>[k,typeof s[k]==='boolean'?s[k]:defaults[k]]))};}catch{return defaults;}}
export function saveDisplay(settings){try{localStorage.setItem('aether-display-v1',JSON.stringify(settings));return true;}catch{return false;}}
export const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${({home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',gear:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',map:'<path d="m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2ZM9 3v16M15 6v16"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',close:'<path d="m5 5 14 14M5 19 19 5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>'})[name]||''}</svg>`;
