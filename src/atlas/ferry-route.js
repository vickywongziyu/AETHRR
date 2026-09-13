import * as T from 'three';
// Double-ended launch: travel reverses along this same checked water corridor.
export const FERRY_STOPS=[{id:'front',name:'前湾舟会',position:[26,0,45]},{id:'west',name:'西岸林堤',position:[-27,0,45]}];
export const ferryCurve=new T.CatmullRomCurve3([[26,0,45],[26,0,52],[22,0,57],[12,0,58],[-12,0,58],[-23,0,59],[-27,0,55],[-27,0,51],[-27,0,45]].map(p=>new T.Vector3(...p)),false,'centripetal');
ferryCurve.arcLengthDivisions=1000;export const FERRY_LENGTH=ferryCurve.getLength();
export function ferryPose(t){t=T.MathUtils.clamp(t,0,1);const position=ferryCurve.getPointAt(t),tangent=ferryCurve.getTangentAt(t);let yaw=Math.atan2(tangent.x,tangent.z);if(yaw>0)yaw-=Math.PI*2;return{position,yaw};}
export const FERRY_HULL=new T.Box3(new T.Vector3(-1.34,-.65,-3.96),new T.Vector3(1.34,1.4,3.96));
export const FERRY_MAST=new T.Box3(new T.Vector3(-.23,1.4,-2.85),new T.Vector3(.23,4.3,-2.35));
