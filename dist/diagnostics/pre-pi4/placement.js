import {distance} from './random.js';
import {segmentDistance} from './branching.js';

// Envelopes measure occupied visual mass; they are not absolute exclusion zones.
const envelopes={
  leaf:[[0,3],[22,-21],[20,-48],[0,-74],[-20,-48],[-22,-21]],
  bird:[[-70,15],[43,15],[43,-64],[-57,-64],[-72,-11]],
  peacock:[[-162,18],[48,18],[48,-83],[-58,-115],[-162,-89]],
  fish:[[-57,17],[67,17],[67,-37],[-57,-37]],
  flower:[[-36,-15],[-15,-36],[15,-36],[36,-15],[36,15],[15,36],[-15,36],[-36,15]],
  lotus:[[-37,17],[37,17],[34,-30],[0,-58],[-34,-30]],
  bud:[[0,3],[18,-9],[20,-31],[12,-54],[-17,-34],[-17,-11]],
  fruit:[[-26,5],[26,5],[28,-29],[12,-59],[-27,-32]],
  botanical:[[-44,40],[44,40],[44,-53],[0,-77],[-44,-53]]
};
export function footprint(kind,x,y,angle,scale,facing=1,margin=5,tune={width:1,curve:1}){
  const bounds=tune.family?.bounds;
  const source=bounds&&kind==='lotus'?[[bounds[0],bounds[3]],[bounds[2],bounds[3]],[bounds[2],bounds[1]*.45],[0,bounds[1]],[bounds[0],bounds[1]*.45]]:envelopes[kind]||envelopes.botanical,a=angle*Math.PI/180;
  const cx=source.reduce((a,p)=>a+p[0],0)/source.length,cy=source.reduce((a,p)=>a+p[1],0)/source.length;
  return source.map(p=>{const dx=p[0]-cx,dy=p[1]-cy,len=Math.hypot(dx,dy)||1;const width=(tune.width||1)*(.8+(tune.curve||1)*.2),px=(p[0]*width+dx/len*margin)*scale*facing,py=(p[1]+dy/len*margin)*scale;return {x:x+px*Math.cos(a)-py*Math.sin(a),y:y+px*Math.sin(a)+py*Math.cos(a)};});
}
export function polygonsOverlap(a,b){
  for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
    const p=polygon[i],q=polygon[(i+1)%polygon.length],axis={x:-(q.y-p.y),y:q.x-p.x};
    const pa=a.map(p=>p.x*axis.x+p.y*axis.y),pb=b.map(p=>p.x*axis.x+p.y*axis.y);
    if(Math.max(...pa)<Math.min(...pb)||Math.max(...pb)<Math.min(...pa))return false;
  }
  return true;
}
export function polygonArea(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2;}
export function overlapFraction(a,b){
  if(!polygonsOverlap(a,b))return 0;
  const signed=b.reduce((s,p,i)=>{const q=b[(i+1)%b.length];return s+p.x*q.y-q.x*p.y;},0),orientation=Math.sign(signed);
  let result=a;
  for(let i=0;i<b.length&&result.length;i++){
    const u=b[i],v=b[(i+1)%b.length],cross=p=>orientation*((v.x-u.x)*(p.y-u.y)-(v.y-u.y)*(p.x-u.x)),input=result;result=[];
    for(let j=0;j<input.length;j++){
      const p=input[j],q=input[(j+1)%input.length],cp=cross(p),cq=cross(q);
      if(cp>=0)result.push(p);
      if((cp>=0)!==(cq>=0)){const t=cp/(cp-cq);result.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
    }
  }
  return result.length<3?0:polygonArea(result)/Math.max(1,Math.min(polygonArea(a),polygonArea(b)));
}
export function insetFootprint(polygon,ratio){const c={x:polygon.reduce((s,p)=>s+p.x,0)/polygon.length,y:polygon.reduce((s,p)=>s+p.y,0)/polygon.length};return polygon.map(p=>({x:c.x+(p.x-c.x)*ratio,y:c.y+(p.y-c.y)*ratio}));}
export function layeringLimit(a,b,spacing=.7){
  if(['bird','peacock'].includes(a)||['bird','peacock'].includes(b))return .12;
  return (a==='leaf'&&b==='leaf'?.43:.32)-spacing*.1;
}
function inside(p,polygon){let sign=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(Math.abs(cross)<.0001)continue;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);}return true;}
export function clearOfBranches(polygon,branches,parentId){
  const core=insetFootprint(polygon,.48);
  for(const b of branches){
    // Fine shoots remain legible beneath foliage. Only substantial unrelated
    // wood is kept out of the motif core, allowing edges to layer naturally.
    if(b.id===parentId||b.role==='root'||b.order>1)continue;
    for(let j=1;j<=16;j++){
      const a=b.samples[j-1],c=b.samples[j];
      if(inside(a,core)||inside(c,core))return false;
      const width=b.width+(b.endWidth-b.width)*(j/16);
      for(let i=0;i<core.length;i++)if(segmentDistance(a,c,core[i],core[(i+1)%core.length])<width*.45)return false;
    }
  }
  return true;
}
export function inFrame(polygon){return polygon.every(p=>p.x>94&&p.x<906&&p.y>96&&p.y<927);}
