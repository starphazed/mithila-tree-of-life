// FNV-1a-style string hash: Fowler, Noll and Vo. See THIRD_PARTY_NOTICES.md.
export function hash(value) {
  let h=2166136261;
  for(const c of String(value)) h=Math.imul(h^c.charCodeAt(0),16777619);
  return h>>>0;
}
// Mulberry32: Tommy Ettinger (2017); JavaScript formulation by bryc.
// Upstream CC0/public-domain notices: see THIRD_PARTY_NOTICES.md.
export function random(seed) {
  let a=hash(seed);
  return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const fmt=n=>Number(n.toFixed(2));
export function cubic(p,t){const u=1-t;return {x:u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,y:u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y};}
export function tangent(p,t){const a=cubic(p,clamp(t-.002,0,1)),b=cubic(p,clamp(t+.002,0,1));const len=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/len,y:(b.y-a.y)/len};}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
