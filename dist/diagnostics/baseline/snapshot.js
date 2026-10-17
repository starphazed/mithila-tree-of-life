import {motif,ribbon,frame,ground,getPalette,branchOutline} from './grammar.js';
import {buildMotionRig,sampleMotion} from './motion.js';
import {fmt} from './random.js';
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function completeSVG(model,{size=1000,motionTime=0}={}){
  const style=model.settings,pal=getPalette(style),pose=sampleMotion(buildMotionRig(model),motionTime),nodes=new Map(model.nodes.map(n=>[n.id,n]));
  let wood='',botanical='',environment='';
  const layer=n=>n.kind==='branch'?0:n.kind==='leaf'?1:['bud','fruit','flower','lotus'].includes(n.kind)?2:3;
  for(const n of [...model.nodes].sort((a,b)=>layer(a)-layer(b))){
    if(n.kind==='branch'){
      const p=pose.branches.get(n.id),parent=pose.branches.get(n.parent),pn=nodes.get(n.parent);
      wood+=ribbon(p.points,n.width,n.id,style,style.complexity,1,1,n.endWidth,parent?branchOutline(parent.points,pn.width,pn.endWidth):'');
    }else{
      const p=pose.motifs.get(n.id);let shape=motif(n.kind,n.id,n.variant,style);
      shape=shape.replace(/<g([^>]*data-part="(\w+)"[^>]*)>/g,(match,attrs,part)=>{
        const pivot=attrs.match(/data-pivot="([^"]+)"/)?.[1];if(!pivot)return match;
        const [x,y]=pivot.split(' ').map(Number),base=attrs.match(/transform="([^"]+)"/)?.[1]||'';
        const motion=part==='blink'?`translate(${x} ${y}) scale(1 ${fmt(p.blink)}) translate(${-x} ${-y})`:`rotate(${fmt(p[part]||0)} ${x} ${y})`;
        return '<g'+attrs.replace(/ transform="[^"]+"/,'')+` transform="${base} ${motion}">`;
      });
      const markup=`<g transform="translate(${fmt(p.x)} ${fmt(p.y)}) rotate(${fmt(p.angle)}) scale(${(n.scale*(n.facing||1)*p.twist).toFixed(4)} ${n.scale.toFixed(4)})">${shape}</g>`;
      if(n.habitat==='canopy')botanical+=markup;else environment+=markup;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${size}" height="${size}"><title>${xml(model.seed)} · ${xml(pal.name)}</title><metadata>${xml(JSON.stringify({generator:4,seed:model.seed,motionTime}))}</metadata><rect width="1000" height="1000" fill="${pal.paper}"/>${frame(style,model.seed)}${ground(style)}${wood}${botanical}${environment}</svg>`;
}
