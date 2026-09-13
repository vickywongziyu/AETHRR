export function random(seed = 8127) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (x, y) => { const t = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return t - Math.floor(t); };
const lerp = (a,b,t) => a + (b-a)*t;
export const smooth = (a,b,x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
export function noise(x,y) { const i = Math.floor(x), j=Math.floor(y); const u=x-i,v=y-j; const a=u*u*(3-2*u),b=v*v*(3-2*v); return lerp(lerp(hash(i,j),hash(i+1,j),a),lerp(hash(i,j+1),hash(i+1,j+1),a),b); }
export function fbm(x,y,oct=5) { let a=.5,s=0; for(let k=0;k<oct;k++){s+=noise(x,y)*a;x=x*2.03+12.7;y=y*2.03-8.2;a*=.5;} return s; }
export const riverX = z => 7 + Math.sin(z*.031)*8 + Math.sin(z*.076+1.2)*3;
export const riverWidth = z => 5.0 + 1.8*noise(z*.025,10) + 1.6*smooth(-80,70,z);
export const peaks = [
  [-39,-62,59,20,24],[-60,-58,29,17,23],[-27,-83,44,17,22],[-34,-21,25,14,16],[-56,-21,18,14,20],
  [47,-87,52,25,23],[65,-76,29,17,26],[34,-109,31,22,18],[-82,-101,32,22,28],[-9,-133,23,26,25],
];
export function heightAt(x,z) {
  const d=Math.abs(x-riverX(z));
  const bank=smooth(riverWidth(z)*.66,riverWidth(z)+5,d);
  const hills=1.3+fbm(x*.043,z*.043)*5+fbm(x*.2,z*.2,3)*.7;
  let mount=0;
  for(const [px,pz,h,rx,rz] of peaks){
    const warp=(fbm(x*.075,z*.069)-.48)*4;
    const rr=((x-px+warp)/rx)**2+((z-pz+warp*.5)/rz)**2;
    const striation=.84+noise(x*.21+noise(z*.021,0)*3,z*.025)*.31;
    mount=Math.max(mount, h*Math.exp(-Math.pow(rr,1.4)*1.35)*striation);
  }
  const detail=(fbm(x*.22,z*.22,4)-.45)*Math.min(mount*.28,6.5);
  const floor=-1.1+noise(x*.1,z*.1)*.45;
  const ridges=(noise(x*.5+noise(z*.012,8)*4,z*.08)-.5)*Math.min(mount*.18,4.5);
  return lerp(floor,hills+mount+detail+ridges,bank);
}
