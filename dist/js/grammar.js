import {random,fmt,clamp,hash,smooth,cubic,tangent} from './random.js';
import {seedPalette,detailColor} from './palette.js';
import {familyMotif} from './motif-families.js';
import {renderBorder} from './borders.js';
export const PALETTES={
  kachni:{name:'Kachni · ink',paper:'#f7f2e8',ink:'#332d33',colors:['#f7f2e8','#f7f2e8','#f7f2e8']},
  vermilion:{name:'Vermilion',paper:'#f7f0e4',ink:'#963b2d',colors:['#f7f0e4','#f7f0e4','#f7f0e4']},
  bharni:{name:'Bharni · earth',paper:'#f7f1df',ink:'#302e2a',colors:['#bd583e','#c6a044','#59786a']},
  indigo:{name:'Indigo garden',paper:'#f2f0e7',ink:'#303e5b',colors:['#d5a455','#7b8f94','#e4d2ac']},
  custom:{name:'Your palette',paper:'#f7f2e8',ink:'#332d33',colors:['#b6563d','#bf9744','#587365']}
};
PALETTES.seed={name:'Seed colors',paper:'#f7f1df',ink:'#302e2a',colors:['#bd583e','#c6a044','#59786a']};
export const DEFAULT_MOTIFS=Object.fromEntries(['leaf','flower','bud','fruit','bird','lotus','fish','peacock'].map(kind=>[kind,{width:1,curve:1,spacing:1}]));
export function getPalette(value='kachni'){
  const options=typeof value==='string'?{palette:value}:value;
  if(options.artPalette)return options.artPalette;
  const base=PALETTES[options.palette]||PALETTES.kachni;
  if(options.palette==='seed'){
    return seedPalette(options.seed||'MITHILA-014');
  }
  if(options.palette!=='custom')return base;
  const valid=(c,fallback)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:fallback;
  const custom=options.customPalette||{};
  return {name:base.name,paper:valid(custom.paper,base.paper),ink:valid(custom.ink,base.ink),colors:base.colors.map((c,i)=>valid(custom.colors?.[i],c))};
}
const path=(d,attrs='')=>`<path d="${d}" ${attrs}/>`;
const circle=(x,y,r,attrs='')=>`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" ${attrs}/>`;
const line=(x1,y1,x2,y2,attrs='')=>path(`M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}`,attrs);
export function motif(kind,id,variant=0,settings={}) {
  const opt={complexity:.72,palette:'kachni',...settings};
  const pal=getPalette(opt);
  const tune={...DEFAULT_MOTIFS[kind],...opt.motifs?.[kind]};
  if(['lotus','peacock','fish'].includes(kind))return familyMotif(kind,id,variant,opt,pal,tune);
  const colorRole={leaf:2,flower:0,lotus:0,fruit:0,bud:1,bird:2,peacock:2,fish:1};
  const c=kind==='leaf'&&variant%5===0?pal.paper:pal.colors[colorRole[kind]??0];
  const detailInk=detailColor(c,pal.ink,pal.paper);
  const detail=clamp(opt.complexity,0,1), space=tune.spacing;
  const clip=id.replace(/[^a-zA-Z0-9_-]/g,'')+'-clip';
  const attrs=`fill="${pal.paper}" stroke="${pal.ink}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"`;
  let shape='',inner='',patterns='',outside='';
  if(kind==='leaf'){
    const h=62+variant%3*4,w=(15+variant%2*3)*tune.width,curve=tune.curve;
    // Alternate pointed foliage with a heart-shaped, peepal-inspired contour.
    shape=variant%4===2?`M0 0C${-w*.3} ${-h*.22} ${-w*1.4*curve} ${-h*.08} ${-w*1.16} ${-h*.42}C${-w} ${-h*.65} ${-w*.25} ${-h*.52} 0 ${-h}C${w*.25} ${-h*.52} ${w} ${-h*.65} ${w*1.16} ${-h*.42}C${w*1.4*curve} ${-h*.08} ${w*.3} ${-h*.22} 0 0Z`:`M0 0C${-w} ${-h*.23} ${-w*curve} ${-h*.72} 0 ${-h}C${w*curve} ${-h*.76} ${w} ${-h*.2} 0 0Z`;
    inner=path(shape,`transform="translate(0 -3) scale(.79 .88)" fill="none" stroke-width=".72"`);
    patterns+=path(`M0 -4C3 ${-h*.3} -3 ${-h*.67} 0 ${-h+6}`,`fill="none" stroke-width="1"`);
    const step=(11-detail*6.5)*space;
    let vein=0;
    for(let y=9;y<h-7;y+=step*(.9+Math.sin(vein++*.8+variant)*.12)){
      const half=w*Math.sin(y/h*Math.PI)*.97,flow=Math.sin(y/h*Math.PI*2)*1.1;
      patterns+=path(`M${flow} ${-y}C${-half*.22} ${-y-1} ${-half*.44} ${-y-8} ${-half} ${-y-8}M${flow} ${-y}C${half*.22} ${-y-1} ${half*.44} ${-y-8} ${half} ${-y-8}`,`fill="none" stroke-width=".65"`);
      if(detail>.5)patterns+=path(`M${-half*.3} ${-y-3}Q${-half*.44} ${-y-8} ${-half*.72} ${-y-10}M${half*.3} ${-y-3}Q${half*.44} ${-y-8} ${half*.72} ${-y-10}`,`fill="none" stroke-width=".38"`);
      if(detail>.35)for(const side of [-1,1])for(let k=1;k<=3;k++){
        const x=side*half*k/4,yy=-y-4*k/4;
        patterns+=path(`M${x} ${yy}q${side*2.1} -2.5 ${side*3.5} -3.2M${x+.6*side} ${yy+1.5}q${side*2.1} -2.5 ${side*3.5} -3.2`,`fill="none" stroke-width=".3"`);
      }
      if(variant%3===2&&detail>.45&&y>16&&y<h-15)for(const side of [-1,1]){
        const x=side*half*.52;
        patterns+=path(`M${x} ${-y-1}q${side*3} -6 ${side*5} -5q${side*1} 4 ${-side*5} 5Z`,`fill="none" stroke-width=".45"`)+circle(x+side*2,-y-3,.45,`fill="${pal.ink}" stroke="none"`);
      }
    }
    if(variant%3===1)for(let y=11;y<h-8;y+=7*space)patterns+=circle(0,-y,.8,`fill="${pal.ink}" stroke="none"`);
    if(variant%3===2)for(let y=14;y<h-12;y+=8*space){const x=w*Math.sin(y/h*Math.PI)*.7;patterns+=circle(-x,-y,.6,`fill="${pal.ink}" stroke="none"`)+circle(x,-y,.6,`fill="${pal.ink}" stroke="none"`);}
  }else if(kind==='flower'){
    const petals=variant%2?10:8,rad=24*tune.width;
    for(let i=0;i<petals;i++){
      const deg=i*360/petals, d=variant%3===2?`M-3 -7Q${-rad*.52*tune.curve} ${-rad*.78} 0 ${-rad-10}Q${rad*.52*tune.curve} ${-rad*.78} 3 -7Z`:`M-3 -7C${-rad*.53} -14 ${-rad*.42*tune.curve} ${-rad*.9} 0 ${-rad-9}C${rad*.42*tune.curve} ${-rad*.9} ${rad*.53} -14 3 -7Z`;
      if(i===0)outside+=`<defs><clipPath id="${clip}-petal">${path(d)}</clipPath></defs>`;
      outside+=`<g transform="rotate(${deg})">${path(d,`fill="${c}"`)}<g clip-path="url(#${clip}-petal)">${path(d,`transform="translate(0 -2) scale(.62 .86)" fill="none" stroke-width=".65"`)}<g class="detail">${path(`M0 -12Q2 -21 0 ${-rad-4}`,`fill="none" stroke-width=".55"`)}${detail>.45?path(`M-4 -17Q0 -23 4 -17M-5 -22Q0 -29 5 -22`,`fill="none" stroke-width=".5"`):''}</g></g></g>`;
      let hatching='';for(let y=14;y<rad+5;y+=3.5*space)hatching+=path(`M-8 ${-y}Q0 ${-y-5} 8 ${-y}`,`fill="none" stroke-width=".32"`);
      outside+=`<g class="detail" transform="rotate(${deg})" clip-path="url(#${clip}-petal)">${hatching}</g>`;
    }
    for(let i=0;i<petals;i++)outside+=`<g transform="rotate(${(i+.5)*360/petals})">${path('M-2 -7C-8 -12 -6 -19 0 -21C6 -19 8 -12 2 -7Z',`fill="${pal.colors[1]}" stroke-width=".8"`)}<g class="detail">${path('M0 -10Q-2 -15 0 -18M-3 -12Q0 -16 3 -12',`fill="none" stroke-width=".42"`)}</g></g>`;
    shape=`M-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0`;
    patterns=circle(0,0,6,`fill="none" stroke-width=".7"`)+circle(0,0,2.5,`fill="${pal.ink}" stroke="none"`);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;patterns+=circle(Math.cos(a)*7.5,Math.sin(a)*7.5,.5,`fill="${pal.ink}" stroke="none"`);}
    patterns+=circle(0,0,4.2,`fill="none" stroke-width=".38"`);
  }else if(kind==='bud'){
    const w=(13+variant%3)*tune.width,h=41+(variant%3)*3;
    shape=`M0 0C${-w*1.4} -12 ${-w} -30 ${8*tune.curve} -${h}C6 -28 ${w*1.3} -24 ${w} -12C${w*.6} -4 4 -1 0 0Z`;
    inner=path(shape,`transform="translate(1 -3) scale(.73 .82)" fill="none" stroke-width=".65"`);
    patterns=path('M1 -8C-10 -13 -4 -29 5 -24C12 -19 1 -14 0 -20',`fill="none" stroke-width=".8"`);
    for(let y=6;y<36;y+=(9-detail*4)*space)patterns+=line(-20,-y,20,-y-13,`stroke-width=".4"`);
    outside=path('M-10 -3Q0 -12 10 -3Q0 4 -10 -3',`fill="${pal.paper}" stroke-width=".8"`);
  }else if(kind==='bird'){
    // A perched bird, drawn as a continuous body/neck contour with a patterned wing.
    const w=tune.width,curl=tune.curve;
    shape=`M-14 -4C${-38*w} -5 ${-38*w} -31 -17 -33C-1 -34 2 -21 11 -25C${19*curl} -29 10 -40 15 -47C21 -55 33 -49 30 -40C28 -35 19 -35 23 -28C32 -13 21 -4 9 -2Q-4 1 -14 -4Z`;
    const wing='M-15 -8C-36 -11 -29 -31 -15 -29C3 -26 4 -11 -15 -8Z';
    inner=path(shape,`transform="translate(0 -2) scale(.84 .9)" fill="none" stroke-width=".6"`);
    patterns=`<defs><clipPath id="${clip}-wing">${path(wing)}</clipPath></defs>${path(wing,`fill="${pal.colors[2]}" stroke-width=".85"`)}<g clip-path="url(#${clip}-wing)">`;
    const step=(8-detail*3)*space;
    for(let y=-29;y<-7;y+=step)for(let x=-30;x<5;x+=step){
      if(variant%2===0)patterns+=path(`M${x-3} ${y}Q${x-2} ${y-5} ${x} ${y-4}Q${x+3} ${y-2} ${x+3} ${y}Q${x} ${y+4} ${x-3} ${y}Z`,`fill="none" stroke-width=".45"`)+circle(x,y,.65,`fill="${pal.ink}" stroke="none"`);
      else patterns+=path(`M${x-3} ${y+3}L${x+3} ${y-3}M${x-3} ${y-3}L${x+3} ${y+3}`,`fill="none" stroke-width=".4"`);
    }
    patterns+='</g>'+path('M-15 -12C-27 -13 -23 -25 -14 -25Q-2 -22 -4 -14Z',`fill="none" stroke-width=".65"`);
    patterns+=path('M11 -22Q19 -15 7 -6M14 -25Q24 -13 11 -6',`fill="none" stroke-width=".65"`)+circle(23,-44,2.2,`fill="none" stroke-width=".8"`)+circle(23,-44,.8,`fill="${pal.ink}" stroke="none"`);
    for(let y=-34;y<-12;y+=3.6*space)patterns+=path(`M10 ${y}q6 -3 12 0`,`fill="none" stroke-width=".32"`);
    const tail=kind==='peacock'?'M-25 -8Q-45 -12 -52 -3Q-37 0 -29 -21Z':`M-25 -8Q${-43*w} -3 ${-62*w} 12L${-54*w} -9Q${-43*w} -20 -29 -21Z`;
    let tailDetails=path(`M-29 -12L${-59*w} 9M-31 -15L${-56*w} 2M-32 -18L${-54*w} -5`,`fill="none" stroke-width=".65"`);
    for(let i=0;i<6;i++){const x=(-34-i*3)*w,y=-12+i*2;tailDetails+=path(`M${x-2} ${y}q2 -3 4 -1q1 3 -2 4q-3 0 -2 -3Z`,`fill="none" stroke-width=".4"`);}
    outside=`<defs><clipPath id="${clip}-tail">${path(tail)}</clipPath></defs>${path(tail,`fill="${pal.colors[1]}"`)}<g class="detail" clip-path="url(#${clip}-tail)">${tailDetails}</g>${path('M29 -42L38 -39L29 -37Z',`fill="${pal.colors[0]}" stroke-width=".9"`)}${path('M20 -51L17 -58M24 -51L26 -58M27 -50L32 -55',`fill="none" stroke-width=".8"`)}${circle(17,-59,1.4,`fill="${pal.ink}" stroke="none"`)}${circle(26,-59,1.4,`fill="${pal.ink}" stroke="none"`)}${path('M-6 -3L-8 5L-16 7M2 -2L1 5L8 6',`fill="none" stroke-width="1"`)}`;
  }else{
    const w=(20+variant%3)*tune.width;
    shape=`M0 -45C${-w*.9} -46 ${-w*1.25*tune.curve} -30 ${-w} -15C${-w*.65} 5 ${w*.65} 5 ${w} -15C${w*1.25*tune.curve} -30 ${w*.9} -46 0 -45Z`;
    inner=path(shape,`transform="translate(0 -3) scale(.82 .85)" fill="none" stroke-width=".7"`);
    for(let y=-37;y<-5;y+=(9-detail*3)*space)for(let x=-w+3;x<w-2;x+=(9-detail*3)*space)patterns+=path(`M${x} ${y-2}q3 -2 3 1q-1 4 -3 2q-2 -1 0 -3Z`,`fill="none" stroke-width=".55"`);
    outside=path('M-7 -44L-9 -52L-3 -49L0 -55L3 -49L9 -52L7 -44Z',`fill="${c}" stroke-width="1"`);
  }
  return `<g ${attrs}>${['flower','bird'].includes(kind)?outside:''}<defs><clipPath id="${clip}">${path(shape)}</clipPath></defs>${path(shape,`fill="${kind==='flower'?pal.paper:c}"`)}<g class="detail" clip-path="url(#${clip})">${inner}${patterns.replaceAll(`fill="${pal.ink}"`,`fill="${detailInk}"`)}</g>${!['flower','bird'].includes(kind)?outside:''}</g>`.replaceAll('class="detail"',`class="detail" stroke="${detailInk}"`).replace(`stroke="${detailInk}" clip-path="url(#${clip})"`,`stroke="${kind==='flower'?detailColor(pal.paper,pal.ink,pal.paper):detailInk}" clip-path="url(#${clip})"`);
}
export function branchOutline(points,width,endWidth=width*.09,growth=1,inset=0){
  const samples=Array.from({length:45},(_,i)=>cubic(points,i/44*growth)),left=[],right=[];
  for(let i=0;i<samples.length;i++){
    const p=samples[i],v=tangent(points,i/44*growth),nx=-v.y,ny=v.x;
    const tip=growth<.999?smooth((44-i)/4):1;
    const w=Math.max(.05,(width+(endWidth-width)*i/44*growth-inset)*tip);
    left.push(fmt(p.x+nx*w)+','+fmt(p.y+ny*w));right.unshift(fmt(p.x-nx*w)+','+fmt(p.y-ny*w));
  }
  return 'M'+left.join('L')+'L'+right.join('L')+'Z';
}
export function ribbonGeometry(points,width,id,complexity=.7,growth=1,detail=1,endWidth=width*.09){
  const woodWidth=t=>width+(endWidth-width)*t,contour=branchOutline(points,width,endWidth,growth);
  const paths={contour,outline:contour.slice(0,-1)},knots={};
  if(growth>.06)paths.inner=branchOutline(points,width,endWidth,growth,2.15).slice(0,-1);
  for(let i=1;i<44;i+=complexity>.5?1:2){
    const t=i/44,draw=smooth((detail-t)/.06);if(t>growth||draw<=0)continue;
    const p=cubic(points,t),v=tangent(points,t),nx=-v.y,ny=v.x,w=woodWidth(t),sx=p.x+nx*w,sy=p.y+ny*w,ex=p.x-nx*w+v.x*4,ey=p.y-ny*w+v.y*4,tx=sx+(ex-sx)*draw,ty=sy+(ey-sy)*draw;
    paths['rib-'+i]='M'+fmt(sx)+' '+fmt(sy)+'Q'+fmt((sx+tx)/2+v.x*3*draw)+' '+fmt((sy+ty)/2+v.y*3*draw)+' '+fmt(tx)+' '+fmt(ty);
    if(width>15&&complexity>.55&&i%7===0)knots[i]={transform:'translate('+fmt(p.x)+' '+fmt(p.y)+') rotate('+fmt(Math.atan2(v.y,v.x)*180/Math.PI)+')',draw};
  }
  if(width>6&&detail>.02)for(const side of [-1,1]){
    const flow=[];for(let i=0;i<=32;i++){
      const t=i/32*Math.min(growth,detail),p=cubic(points,t),v=tangent(points,t),offset=(side*.24+Math.sin(t*17+hash(id)%7)*.045)*woodWidth(t);
      flow.push(fmt(p.x-v.y*offset)+','+fmt(p.y+v.x*offset));
    }
    paths['flow-'+side]='M'+flow.join('L');
  }
  paths.ribs=Object.entries(paths).filter(([key])=>key.startsWith('rib-')).map(([,d])=>d).join(' ');
  for(const key of Object.keys(paths))if(key.startsWith('rib-'))delete paths[key];
  return {paths,knots};
}
export function ribbon(points,width,id,palette='kachni',complexity=.7,growth=1,detail=1,endWidth=width*.09,parentOutline=''){
  const pal=getPalette(palette),geometry=ribbonGeometry(points,width,id,complexity,growth,detail,endWidth),d=geometry.paths.contour,cid=id+'-wood',join=id+'-junction';let marks='';
  for(const [key,value] of Object.entries(geometry.paths))if(key==='ribs'||key.startsWith('flow-'))marks+=path(value,'data-geometry="'+key+'" stroke-width=".45"');
  for(const [key,knot] of Object.entries(geometry.knots))marks+='<g data-knot="'+key+'" transform="'+knot.transform+'">'+path('M-4 0C-3 -5 5 -5 5 0C5 5 -3 5 -4 0M-2 0Q1 -3 3 0','pathLength="1" stroke-dasharray="1" stroke-dashoffset="'+fmt(1-knot.draw)+'" stroke-width=".65"')+'</g>';
  const cut=parentOutline?'<clipPath id="'+join+'" clipPathUnits="userSpaceOnUse">'+path('M-1000 -1000H2000V2000H-1000Z '+parentOutline,'data-parent-cut="true" clip-rule="evenodd" fill-rule="evenodd"')+'</clipPath>':'';
  return '<g stroke="'+pal.ink+'" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs><clipPath id="'+cid+'">'+path(d,'data-geometry="contour"')+'</clipPath>'+cut+'</defs>'+path(d,'data-geometry="contour" fill="'+(pal.branch||pal.paper)+'" stroke="none"')+'<g '+(parentOutline?'clip-path="url(#'+join+')"':'')+'>'+path(geometry.paths.outline,'data-geometry="outline" stroke-width="1.55"')+'<g clip-path="url(#'+cid+')">'+(geometry.paths.inner?path(geometry.paths.inner,'data-geometry="inner" stroke-width=".6"'):'')+marks+'</g></g></g>';
}
export function frame(palette='kachni',seed='MITHILA-014'){
  return renderBorder(getPalette(palette),seed);
}
export function ground(palette='kachni'){
  const p=getPalette(palette);let lines='';
  for(let x=340;x<=660;x+=16)lines+=path(`M${x-8} 866Q${x} 855 ${x+8} 866Q${x} 877 ${x-8} 866Z`)+circle(x,866,2,`fill="${p.ink}" stroke="none"`);
  for(let x=320;x<=680;x+=12)lines+=path(`M${x} 880l6 8l6 -8`);
  let water='';
  for(let y=902;y<=924;y+=7)water+=path(`M280 ${y}Q340 ${y-5} 394 ${y}T500 ${y}T607 ${y}T720 ${y}`,`fill="none" stroke-width=".5"`);
  const bank=path('M208 884Q249 874 290 882Q315 889 338 883M668 884Q725 873 797 884M251 882Q245 874 251 863',`fill="none" stroke-width="1"`);
  return `<g stroke="${p.ink}" fill="${p.paper}" stroke-width=".8">${water}${path('M300 880Q350 852 407 850L593 850Q650 852 700 880L680 891L320 891Z',`stroke-width="1.3"`)}${lines}${bank}${path('M320 891H680',`fill="none"`)}</g>`;
}
