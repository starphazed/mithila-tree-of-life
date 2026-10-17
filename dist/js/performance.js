// Display policy is deliberately separate from the seed's artistic identity.
export function renderingPolicy({mode='auto',cores=8,memory=8,dpr=1,arm=false}={}){
  const constrained=mode==='pi4'||(mode!=='quality'&&(arm||cores<=4||memory<=4));
  return Object.freeze({name:constrained?'pi4':'quality',growthInterval:constrained?50:40,windInterval:constrained?50:33,
    geometryInterval:constrained?.1:.066,pixelRatio:Math.min(dpr,2),maxSurface:4096,maxPixels:constrained?4194304:8388608,
    cacheOversample:2,minSpriteDensity:1.25,maxSpriteDensity:4,cacheBatch:4});
}
// Respect native display density, including when Pi mode is previewed on a
// laptop. A pixel budget bounds large surfaces without softening every screen.
export function surfaceRatio(policy,width,height){
  return Math.min(policy.pixelRatio,policy.maxSurface/Math.max(1,width,height),Math.sqrt(policy.maxPixels/Math.max(1,width*height)));
}
export function browserPolicy(){
  const mode=new URLSearchParams(location.search).get('performance')||'auto';
  return renderingPolicy({mode,cores:navigator.hardwareConcurrency||4,memory:navigator.deviceMemory||4,
    dpr:window.devicePixelRatio||1,arm:/arm|aarch64/i.test(navigator.userAgent+' '+navigator.platform)});
}
