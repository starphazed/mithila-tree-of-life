import {random,fmt,hash} from './random.js';
import {detailColor} from './palette.js';

export const BORDER_FAMILIES=['Climbing vine','Lotus garland','Fish procession','Feather eyes','Petal scallops','Woven braid','Paisley pods','Diamond lattice','Sun wheels','Fern fronds','River waves','Petal knots'];
const path=(d,a='')=>`<path d="${d}" ${a}/>`;
const dot=(x,y,r=1,a='')=>`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" ${a}/>`;
export function borderIdentity(seed){
  const r=random(String(seed)+':border:families');
  return {family:BORDER_FAMILIES[Math.floor(r()*BORDER_FAMILIES.length)],width:25+r()*12,
    count:26+Math.floor(r()*15),curve:.78+r()*.38,petals:5+Math.floor(r()*4),
    corner:Math.floor(r()*4),accent:r()<.55,alternating:r()<.7,rail:Math.floor(r()*3),phase:r()*Math.PI*2};
}
function rosette(petals,radius,fill,ink){
  let petalsD='',veins='';
  for(let i=0;i<petals;i++){
    const a=i*Math.PI*2/petals,v=(r,offset=0)=>`${fmt(Math.sin(a+offset)*r)} ${fmt(Math.cos(a+offset)*r)}`;
    petalsD+=`M${v(2)}Q${v(radius*.66,-.32)} ${v(radius)}Q${v(radius*.66,.32)} ${v(2)}Z `;
    veins+=`M${v(3)}L${v(radius*.8)} `;
  }
  return path(petalsD,`fill="${fill}" stroke-width=".72"`)+path(veins,`stroke="${ink}" stroke-width=".4"`)+dot(0,0,2.2,`fill="${ink}" stroke="none"`);
}
function unit(family,t,p,variant){
  const pigment=t.accent&&p.mode!=='monochrome'?p.colors[variant%3]:p.paper,detail=detailColor(pigment,p.ink,p.paper),curve=t.curve;
  const painted=d=>path(d,`fill="${pigment}" stroke-width=".72"`),fine=d=>path(d,`stroke="${detail}" stroke-width=".4"`);
  if(family==='Climbing vine'){
    const flip=variant%2?-1:1;
    return `<g transform="scale(1 ${flip})">${path(`M-12 0C-5 ${-3*curve} 4 ${3*curve} 12 0`)}${painted('M-3 0Q-11 -10 -5 -10Q3 -9 -3 0ZM4 0Q3 10 10 8Q13 3 4 0Z')}${fine('M-3 0L-6 -7M4 0L9 6M-5 -3L-8 -4M-5 -5L-9 -6M6 3L10 3M7 5L10 5')}${dot(0,0,.85,`fill="${p.ink}"`)}</g>`;
  }
  if(family==='Lotus garland'){
    let petals='',veins='';
    for(let i=-2;i<=2;i++){
      const x=i*3.6,y=-10+Math.abs(i)*2;
      petals+=`M-3 4Q${fmt(x-7)} ${y+1} ${fmt(x)} ${y}Q${fmt(x+7)} ${y+1} 3 4Z `;
      veins+=`M0 3Q${fmt(x*.8)} -1 ${fmt(x)} ${y+2} `;
    }
    return painted(petals)+fine(veins)+path('M-10 5Q0 10 10 5M-7 7Q0 12 7 7')+dot(0,6,.8,`fill="${p.ink}"`);
  }
  if(family==='Fish procession'){
    let scales='';for(let x=-6;x<6;x+=3)for(let y=-3;y<=3;y+=3)scales+=`M${x} ${y}q2 -2 3 0 `;
    return `<g transform="scale(${variant%2?-1:1} 1)">${painted('M-10 0Q-1 -10 9 0Q-1 10 -10 0ZM9 0L14 -5L12 0L14 5Z')}${fine(scales)}${path('M-2 -5L2 -10L4 -5M-2 5L2 9L4 5')}${dot(-6,-1,1.1,`fill="${detail}" stroke="none"`)}</g>`;
  }
  if(family==='Feather eyes')return painted('M0 11Q-13 1 0 -11Q13 1 0 11Z')+fine('M0 8Q-9 1 0 -8Q9 1 0 8ZM0 8V-5M-4 4L0 1L4 4M-5 0L0 -3L5 0')+dot(0,-3,2.8,`fill="${p.paper}"`)+dot(0,-3,1.2,`fill="${detail}" stroke="none"`);
  if(family==='Petal scallops')return painted('M-12 8Q-12 -8 0 -10Q12 -8 12 8Z')+fine('M-8 7Q-8 -4 0 -6Q8 -4 8 7M0 7V-7M-4 7Q-5 1 -3 -2M4 7Q5 1 3 -2')+dot(0,7,1.2,`fill="${detail}" stroke="none"`);
  if(family==='Woven braid')return path('M-13 -6C-7 -6 -6 6 0 6S7 -6 13 -6M-13 6C-7 6 -6 -6 0 -6S7 6 13 6','stroke-width="1.2"')+path('M-13 -3C-7 -3 -6 9 0 9S7 -3 13 -3M-13 3C-7 3 -6 -9 0 -9S7 3 13 3','stroke-width=".4"')+dot(0,0,1.1,`fill="${pigment}"`);
  if(family==='Paisley pods')return painted('M-4 8C-16 2 -5 -13 6 -7C10 -4 8 0 3 -2C9 4 4 12 -4 8Z')+fine('M-3 5C-10 1 -3 -7 3 -5M-3 5Q3 7 3 2M-5 3L-2 0M-6 0L-3 -3M0 6L1 3')+dot(-1,-2,1.35,`fill="${detail}" stroke="none"`)+path('M6 -6Q12 -9 12 -3');
  if(family==='Diamond lattice')return painted('M-12 0L0 -10L12 0L0 10Z')+fine('M-7 0L0 -6L7 0L0 6ZM-7 -4L7 4M-7 4L7 -4M-4 -7L4 7M-4 7L4 -7')+dot(0,0,1.15,`fill="${detail}" stroke="none"`);
  if(family==='Sun wheels')return rosette(t.petals+variant%2,10,pigment,detail)+path('M-13 -2L-11 -2M11 2L13 2','stroke-width=".5"');
  if(family==='Fern fronds'){
    let fronds='',veins='';for(let i=0;i<4;i++){
      const x=-8+i*4;
      fronds+=`M${x} 0Q${x-5} -8 ${x+1} -9Q${x+5} -4 ${x} 0ZM${x+2} 0Q${x-1} 8 ${x+5} 9Q${x+8} 4 ${x+2} 0Z `;
      veins+=`M${x} 0L${x+1} -6M${x+2} 0L${x+5} 6 `;
    }return path('M-12 0Q0 2 12 0')+painted(fronds)+fine(veins);
  }
  if(family==='River waves')return path('M-13 2C-7 -11 1 -11 1 -1C1 6 -6 6 -6 0C-6 -4 -2 -4 -2 -1M1 2Q7 -8 13 2M-13 8Q0 4 13 8','stroke-width=".9"')+path('M-12 4Q-2 10 6 4M-10 -6L-8 -4M-8 -8L-6 -6M7 -2L9 0','stroke-width=".4"')+dot(10,3,1,`fill="${pigment}"`);
  return painted('M0 0Q-14 -11 -10 1Q-5 11 0 0Q14 -11 10 1Q5 11 0 0Z')+fine('M0 0Q-8 -6 -6 1Q-3 6 0 0Q8 -6 6 1Q3 6 0 0')+path('M0 -11L0 -4M0 4L0 11')+dot(0,-8,1.1,`fill="${p.ink}"`);
}
export function renderBorder(p,seed){
  const t=borderIdentity(seed),outer=44,inner=outer+t.width,center=(outer+inner)/2,start=inner+15,end=1000-start,step=(end-start)/t.count;
  const uid='border-'+hash(seed).toString(36),scale=Math.min((t.width-5)/23,step/29),ink=p.border||p.ink;
  let defs='',edges='',rails='';
  for(let v=0;v<3;v++)defs+=`<g id="${uid}-${v}">${unit(t.family,t,p,v)}</g>`;
  for(let side=0;side<4;side++)for(let i=0;i<t.count;i++){
    const along=start+(i+.5)*step,v=t.alternating?i%3:0;
    const transform=side===0?`translate(${fmt(along)} ${fmt(center)})`:side===1?`translate(${fmt(1000-center)} ${fmt(along)}) rotate(90)`:side===2?`translate(${fmt(1000-along)} ${fmt(1000-center)}) rotate(180)`:`translate(${fmt(center)} ${fmt(1000-along)}) rotate(270)`;
    edges+=`<use href="#${uid}-${v}" transform="${transform} scale(${fmt(scale)})"/>`;
  }
  const rect=(inset,width)=>`<rect x="${fmt(inset)}" y="${fmt(inset)}" width="${fmt(1000-inset*2)}" height="${fmt(1000-inset*2)}" stroke-width="${width}"/>`;
  if(t.rail===0)rails=rect(outer+3,.45)+rect(inner-3,.45);
  else if(t.rail===1){let dots='';for(let x=outer+10;x<990-outer;x+=8)for(const y of [outer+3,1000-outer-3])dots+=`M${fmt(x)} ${fmt(y)}h.1 `;for(let y=outer+10;y<990-outer;y+=8)for(const x of [outer+3,1000-outer-3])dots+=`M${fmt(x)} ${fmt(y)}v.1 `;rails=path(dots,'stroke-width="1.15"');}
  else rails=rect(outer+3,.4)+rect(outer+5,.3);
  let corners='';
  const corner=t.corner===0?rosette(t.petals+3,10,p.colors[0],detailColor(p.colors[0],p.ink,p.paper)):t.corner===1?unit('Lotus garland',t,p,1):t.corner===2?unit('Diamond lattice',t,p,2):unit('Paisley pods',t,p,0);
  for(let side=0;side<4;side++){
    const x=side===1||side===2?1000-center:center,y=side>=2?1000-center:center;
    corners+=`<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${45+90*side}) scale(${fmt(Math.min(1.45,(t.width-5)/20))})">${corner}</g>`;
  }
  return `<g data-border-family="${t.family}" stroke="${ink}" stroke-width=".65" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs>${defs}</defs>${rect(outer,1.2)}${rect(inner,.85)}${rails}${edges}${corners}</g>`;
}
