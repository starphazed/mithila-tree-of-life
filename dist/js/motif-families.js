import {random,fmt,mix} from './random.js';
import {detailColor,blendColor} from './palette.js';
const path=(d,a='')=>`<path d="${d}" ${a}/>`;
const circle=(x,y,r,a='')=>`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" ${a}/>`;

export function motifTraits(seed,kind,variant=0){
  const r=random(seed+':motifs:'+kind+':'+variant),between=(a,b)=>mix(a,b,r());
  if(kind==='lotus'){
    const openness=between(.28,1),height=between(43,64),spread=35+openness*49;
    return {kind,openness,height,spread,petals:5+Math.floor(r()*4)*2,layers:r()<.38?3:2,
      petalWidth:between(8,15),tilt:between(-11,11),pointed:r()<.55,pattern:Math.floor(r()*3),
      bounds:[-Math.sin(spread*Math.PI/180)*height-8,-height-8,Math.sin(spread*Math.PI/180)*height+8,21]};
  }
  if(kind==='peacock'){
    const posture=Math.floor(r()*3),train=r()<.27,spread=train?between(18,37):between(65,142),height=train?between(88,121):between(65,106);
    return {kind,posture,train,spread,height,feathers:train?5+Math.floor(r()*4):9+Math.floor(r()*8),
      bodyWidth:between(.83,1.18),neckHeight:posture===0?between(38,47):posture===1?between(53,67):between(43,57),
      headX:posture===2?between(30,41):between(17,29),neckCurl:between(.7,1.4),plumeWidth:between(4.1,7.4),
      featherStyle:Math.floor(r()*3),pattern:Math.floor(r()*3),crest:3+Math.floor(r()*3),
      bounds:[-150,-126,65,20]};
  }
  const body=between(64,96),depth=between(13,25);
  return {kind:'fish',body,depth,tailLength:between(18,31),tailType:Math.floor(r()*3),finType:Math.floor(r()*3),
    pattern:Math.floor(r()*4),eye:between(2.3,3.5),barbels:r()<.33,finHeight:between(9,18),
    bounds:[-body*.55-7,-depth-34,body*.43+36,16]};
}

export function familyMotif(kind,id,variant,opt,pal,tune){
  const p=motifTraits(opt.seed||'MITHILA-014',kind,variant),clip=id.replace(/[^a-zA-Z0-9_-]/g,'')+'-clip';
  const fill=pal.roles?.[kind]||pal.colors[kind==='fish'?1:kind==='peacock'?2:0],ink=pal.ink;
  const detail=detailColor(fill,ink,pal.paper),spacing=tune.spacing||1,complexity=opt.complexity??.85;
  const attrs=`stroke="${ink}" fill="${fill}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"`;
  if(kind==='lotus'){
    let petals='';
    for(let layer=0;layer<p.layers;layer++){
      const count=Math.max(3,p.petals-layer*2),height=p.height*(1-layer*.19),spread=p.spread*(1-layer*.13),w=p.petalWidth*tune.width*(1-layer*.12);
      for(let i=0;i<count;i++){
        const angle=mix(-spread,spread,i/(count-1))+(layer%2?3:-2),h=height*(.83+.17*Math.sin(i/(count-1)*Math.PI));
        const d=p.pointed?`M0 0C${-w} -9 ${-w*tune.curve} ${-h*.6} 0 ${-h}C${w*tune.curve} ${-h*.6} ${w} -9 0 0Z`:
          `M0 0C${-w*1.2} -10 ${-w} ${-h} 0 ${-h}C${w} ${-h} ${w*1.2} -10 0 0Z`;
        const pid=clip+'-petal-'+layer+'-'+i,paint=pal.mode==='monochrome'?pal.paper:layer%2?pal.colors[1]:fill,di=detailColor(paint,ink,pal.paper);
        let marks=path(d,'transform="translate(0 -2) scale(.68 .89)" fill="none" stroke-width=".58"')+path(`M0 -4Q${p.pattern===1?4:-2} ${-h*.5} 0 ${-h+5}`,'fill="none" stroke-width=".6"');
        for(let y=10;y<h-6;y+=(complexity>.8?3.5:4.8)*spacing){
          marks+=path(`M-12 ${-y}Q0 ${-y-7} 12 ${-y}`,'fill="none" stroke-width=".32"');
          if(p.pattern===2&&Math.round(y)%2===0)marks+=circle(0,-y,.55,`fill="${di}" stroke="none"`);
        }
        petals+=`<g transform="rotate(${fmt(angle)})"><defs><clipPath id="${pid}">${path(d)}</clipPath></defs>${path(d,`fill="${paint}"`)}<g class="detail" stroke="${di}" clip-path="url(#${pid})">${marks}</g></g>`;
      }
    }
    const bowl='M-25 -4Q0 7 25 -4Q19 15 0 15Q-19 15 -25 -4Z';
    let seeds='';for(let x=-16;x<=16;x+=5*spacing)seeds+=circle(x,3,.8,`fill="${detail}" stroke="none"`);
    return `<g ${attrs} data-family="lotus"><g data-part="corolla" data-pivot="0 0" transform="rotate(${fmt(p.tilt)})">${petals}<defs><clipPath id="${clip}">${path(bowl)}</clipPath></defs>${path(bowl)}<g class="detail" stroke="${detail}" clip-path="url(#${clip})">${path('M-19 1Q0 10 19 1M-13 8Q0 14 13 8','fill="none" stroke-width=".6"')}${seeds}</g></g>${path('M0 15Q2 18 0 21','fill="none" stroke-width=".8"')}</g>`;
  }
  if(kind==='fish'){
    const nose=-p.body*.53,tail=p.body*.4,w=p.depth*tune.width,cy=-12;
    const body=`M${nose} ${cy}C${nose+p.body*.2} ${cy-w*1.3} ${tail-p.body*.2} ${cy-w} ${tail} ${cy-3}L${tail} ${cy+3}C${tail-p.body*.2} ${cy+w} ${nose+p.body*.2} ${cy+w*.9} ${nose} ${cy}Z`;
    const tip=tail+p.tailLength;
    const td=p.tailType===0?`M${tail-2} ${cy-4}Q${tip-10} ${cy-14} ${tip} ${cy-18}L${tip-7} ${cy}L${tip} ${cy+17}Q${tip-12} ${cy+12} ${tail-2} ${cy+4}Z`:
      p.tailType===1?`M${tail-2} ${cy-3}Q${tip-8} ${cy-22} ${tip} ${cy-14}Q${tip-6} ${cy} ${tip} ${cy+14}Q${tip-8} ${cy+22} ${tail-2} ${cy+3}Z`:
      `M${tail-2} ${cy-4}L${tip} ${cy-14}L${tip-3} ${cy-5}L${tip+2} ${cy}L${tip-3} ${cy+5}L${tip} ${cy+14}L${tail-2} ${cy+4}Z`;
    let scales='';const step=(complexity>.8?5.5:7)*spacing;
    for(let y=cy-w;y<cy+w;y+=step)for(let x=nose+p.body*.29;x<tail-4;x+=step){
      scales+=p.pattern===0?path(`M${x-3} ${y}q3 -5 6 0q-3 5 -6 0Z`,'fill="none" stroke-width=".42"'):
        p.pattern===1?path(`M${x} ${y-3}q5 0 5 3q-2 5 -5 3q-2 -2 0 -6Z`,'fill="none" stroke-width=".4"'):
        p.pattern===2?path(`M${x-3} ${y}l3 -3l3 3l-3 3Z`,'fill="none" stroke-width=".4"'):
        path(`M${x-3} ${y}q3 -2 6 0m-5 2l3 -3`,'fill="none" stroke-width=".4"');
    }
    let rays='';for(let i=0;i<5;i++)rays+=path(`M${tail} ${cy}Q${tip-12} ${cy+(i-2)*3} ${tip-3} ${cy+(i-2)*6}`,'fill="none" stroke-width=".45"');
    const fin=p.finType===0?`M-8 ${cy-w*.87}Q1 ${cy-w-p.finHeight} 12 ${cy-w*.8}Z`:
      p.finType===1?`M-13 ${cy-w*.8}L-9 ${cy-w-p.finHeight}L-2 ${cy-w-4}L5 ${cy-w-p.finHeight*.9}L15 ${cy-w*.75}Z`:
      `M-13 ${cy-w*.8}Q-3 ${cy-w-p.finHeight*1.3} 15 ${cy-w*.74}Q3 ${cy-w-3} -13 ${cy-w*.8}Z`;
    const eyeX=nose+p.body*.17,eyeY=cy-w*.13,finInk=detailColor(pal.colors[0],ink,pal.paper);
    return `<g ${attrs} data-family="fish"><g data-part="tail" data-pivot="${tail} ${cy}"><defs><clipPath id="${clip}-tail">${path(td)}</clipPath></defs>${path(td,`fill="${pal.colors[0]}"`)}<g class="detail" stroke="${finInk}" clip-path="url(#${clip}-tail)">${rays}${path(td,'transform="scale(.92 .83)" fill="none" stroke-width=".5"')}</g></g><g data-part="fin" data-pivot="0 ${cy-w}">${path(fin,`fill="${pal.colors[0]}"`)}${path(`M-8 ${cy-w}L0 ${cy-w-p.finHeight+3}M0 ${cy-w}L6 ${cy-w-p.finHeight+4}`,'fill="none" stroke-width=".45"')}</g>${path(`M-2 ${cy+w*.8}Q4 ${cy+w+9} 12 ${cy+w*.65}Z`, `fill="${pal.colors[0]}"`)}<defs><clipPath id="${clip}">${path(body)}</clipPath></defs>${path(body)}<g class="detail" stroke="${detail}" clip-path="url(#${clip})">${path(body,'transform="translate(0 -2) scale(.85 .79)" fill="none" stroke-width=".65"')}${scales}${path(`M${nose+p.body*.29} ${cy-w*.85}Q${nose+p.body*.42} ${cy} ${nose+p.body*.29} ${cy+w*.8}M${nose+p.body*.26} ${cy-w*.7}Q${nose+p.body*.36} ${cy} ${nose+p.body*.26} ${cy+w*.66}`,'fill="none" stroke-width=".65"')}${circle(eyeX,eyeY,p.eye,`fill="${pal.paper}" stroke-width=".8"`)}${circle(eyeX,eyeY,p.eye*.36,`fill="${detail}" stroke="none"`)}${path(`M${nose+1} ${cy+1}q4 1 6 -1`,'fill="none" stroke-width=".6"')}</g>${p.barbels?path(`M${nose+2} ${cy+2}q-6 5 -8 1M${nose+4} ${cy+4}q-4 7 -8 3`,'fill="none" stroke-width=".7"'):''}</g>`;
  }
  const w=p.bodyWidth*tune.width,h=p.neckHeight,hx=p.headX,hy=-h;
  const body=`M-14 -4C${-39*w} -3 ${-43*w} -27 ${-20*w} -33C${-8*w} -38 8 -28 11 -16Q15 -3 -3 -2Z`;
  const wing=`M${-15*w} -8C${-36*w} -10 ${-32*w} -31 ${-16*w} -29C2 -26 4 -12 ${-15*w} -8Z`;
  const neck=`M3 -5C14 -16 3 -23 8 -31C${14*p.neckCurl} ${hy+14} ${hx-13} ${hy-3} ${hx} ${hy-7}C${hx+12} ${hy-10} ${hx+15} ${hy+5} ${hx+4} ${hy+8}C${hx-5} ${hy+10} 16 ${hy+17} 18 -27Q30 -9 10 -4Z`;
  let feathers='';
  for(let i=0;i<p.feathers;i++){
    const pos=i/(p.feathers-1),angle=p.train?mix(-95,-95+p.spread,pos):mix(-38-p.spread/2,-38+p.spread/2,pos);
    const length=p.height*(.8+.2*Math.sin(pos*Math.PI))*(1+.035*Math.sin(i*2.3+variant)),fw=p.plumeWidth*(p.train?.72:1)*tune.width,pid=clip+'-plume-'+i;
    const d=p.featherStyle===1?`M0 0C${-fw} -23 ${-fw*1.2} ${-length} 0 ${-length}C${fw*1.2} ${-length} ${fw} -23 0 0Z`:
      `M0 0C${-fw} -20 ${-fw*1.4} ${-length*.74} 0 ${-length}C${fw*1.4} ${-length*.74} ${fw} -20 0 0Z`;
    const paint=pal.mode==='monochrome'?pal.paper:i%3===1?pal.colors[1]:pal.colors[2],di=detailColor(paint,ink,pal.paper);
    let marks=path(d,'transform="translate(0 -2) scale(.66 .92)" fill="none" stroke-width=".48"')+path(`M0 -4Q2 ${-length*.4} 0 ${-length+5}`,'fill="none" stroke-width=".5"');
    for(let y=12;y<length-9;y+=5*spacing)marks+=path(`M-7 ${-y}Q0 ${-y-6} 7 ${-y}`,'fill="none" stroke-width=".3"');
    const ey=-length*.77;
    marks+=p.featherStyle===2?path(`M0 ${ey-7}Q7 ${ey} 0 ${ey+5}Q-7 ${ey} 0 ${ey-7}Z`,`fill="${pal.colors[0]}" stroke-width=".7"`):circle(0,ey,4.8,`fill="${pal.colors[0]}" stroke-width=".7"`);
    marks+=circle(0,ey,2.5,'fill="none" stroke-width=".55"')+circle(0,ey,.8,`fill="${di}" stroke="none"`);
    feathers+=`<g transform="translate(-20 -8) rotate(${fmt(angle)})"><defs><clipPath id="${pid}">${path(d)}</clipPath></defs>${path(d,`fill="${paint}"`)}<g class="detail" stroke="${di}" clip-path="url(#${pid})">${marks}</g></g>`;
  }
  let ornament='';const step=(complexity>.85?4.7:6)*spacing;
  for(let y=-31;y<-6;y+=step)for(let x=-37*w;x<4;x+=step)ornament+=p.pattern===0?
    path(`M${x-2} ${y}q3 -5 5 -1q2 4 -2 5q-4 -1 -3 -4Z`,'fill="none" stroke-width=".42"'):
    p.pattern===1?path(`M${x-3} ${y}q3 -4 6 0q-3 4 -6 0M${x} ${y}v1`,'fill="none" stroke-width=".4"'):
    path(`M${x-2} ${y}l2 -2l2 2l-2 2Z`,'fill="none" stroke-width=".4"');
  let crest='';for(let i=0;i<p.crest;i++){const x=hx-5+i*3,y=hy-12-(i%2)*3;crest+=path(`M${hx-3+i*2} ${hy-6}Q${x-2} ${y+3} ${x} ${y}`,'fill="none" stroke-width=".7"')+circle(x,y,1.25,`fill="${ink}" stroke="none"`);}
  const neckDetail=detailColor(fill,ink,pal.paper);let neckMarks='';for(let y=hy+11;y<-13;y+=4*spacing)neckMarks+=path(`M7 ${y}q8 -4 16 0`,'fill="none" stroke-width=".34"');
  const wingPaint=pal.mode==='monochrome'?pal.paper:pal.colors[1],wingDetail=detailColor(wingPaint,ink,pal.paper);
  return `<g ${attrs} data-family="peacock"><g data-part="tail" data-pivot="-20 -8">${feathers}</g><defs><clipPath id="${clip}">${path(body)}</clipPath><clipPath id="${clip}-wing">${path(wing)}</clipPath><clipPath id="${clip}-neck">${path(neck)}</clipPath></defs>${path(body)}<g class="detail" stroke="${detail}" clip-path="url(#${clip})">${path(body,'transform="translate(0 -2) scale(.83 .86)" fill="none" stroke-width=".65"')}</g>${path(wing,`fill="${wingPaint}" stroke-width=".9"`)}<g class="detail" stroke="${wingDetail}" clip-path="url(#${clip}-wing)">${ornament}${path(wing,'transform="translate(1 -3) scale(.8 .79)" fill="none" stroke-width=".6"')}</g><g data-part="head" data-pivot="7 -17">${path(neck)}<g class="detail" stroke="${neckDetail}" clip-path="url(#${clip}-neck)">${path(neck,'transform="translate(1 -3) scale(.83 .88)" fill="none" stroke-width=".55"')}${neckMarks}</g>${path(`M${hx+9} ${hy}L${hx+19} ${hy+3}L${hx+9} ${hy+5}Z`,`fill="${pal.colors[0]}" stroke-width=".8"`)}${crest}<g class="detail" data-part="blink" data-pivot="${hx+2} ${hy}">${circle(hx+2,hy,2.3,`fill="${pal.paper}" stroke="${ink}" stroke-width=".7"`)}${circle(hx+2,hy,.85,`fill="${ink}" stroke="none"`)}</g></g>${path('M-8 -3L-10 9L-18 11M2 -2L3 9L10 10','fill="none" stroke-width=".95"')}</g>`;
}
