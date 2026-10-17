import {ribbonGeometry,branchOutline,getPalette} from './grammar.js';
import {surfaceRatio} from './performance.js';

const OUTSIDE='M-1000 -1000H2000V2000H-1000Z ';
const KNOT=new Path2D('M-4 0C-3 -5 5 -5 5 0C5 5 -3 5 -4 0M-2 0Q1 -3 3 0');
export async function rasterSVG(source,width,height,retainSource=false){
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'})),image=new Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);if(retainSource)canvas.sourceURL=url;return canvas;
  }catch(error){URL.revokeObjectURL(url);throw error;}finally{if(!retainSource)URL.revokeObjectURL(url);}
}
// The same vector grammar supplies drawing, export and close inspection.
// Completed motion uses one composited surface to avoid SVG repainting every
// clipped hatch mark. The stationary paper, border and ground stay vector sharp.
export class CanvasScene{
  constructor(svg,model,groups,policy){
    this.svg=svg;this.model=model;this.groups=groups;this.palette=getPalette(model.settings);this.rest=new Map();
    this.policy=policy;this.flex=new Map();this.cuts=new Map();this.restCuts=new Map();this.geometryTime=-1;this.stats={frames:0,geometryBuilds:0};
    this.canvas=document.createElement('canvas');this.canvas.className='living-surface';this.canvas.setAttribute('aria-hidden','true');
    if(getComputedStyle(svg.parentElement).position==='static')svg.parentElement.style.position='relative';
    Object.assign(this.canvas.style,{position:'absolute',pointerEvents:'none',display:'none',transform:'translateZ(0)'});svg.before(this.canvas);
    svg.style.position='relative';svg.style.zIndex='1';this.canvas.style.zIndex='0';
    this.sources=[...svg.querySelectorAll('.paper,#art-frame,#art-ground,#branches')];
    this.background=document.createElementNS('http://www.w3.org/2000/svg','svg');this.background.setAttribute('aria-hidden','true');
    let backgroundMarkup=['.paper','#art-frame','#art-ground'].map(s=>svg.querySelector(s).outerHTML).join('');
    const ids=[...backgroundMarkup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    for(const id of ids)backgroundMarkup=backgroundMarkup.replaceAll(`id="${id}"`,`id="still-${id}"`).replaceAll(`url(#${id})`,`url(#still-${id})`).replaceAll(`href="#${id}"`,`href="#still-${id}"`);
    this.background.innerHTML=backgroundMarkup;
    Object.assign(this.background.style,{position:'absolute',pointerEvents:'none',display:'none',zIndex:'0',transform:'translateZ(0)',contain:'strict'});this.canvas.before(this.background);
    this.canvas.style.zIndex='1';svg.style.zIndex='2';
    this.order=[...model.nodes].filter(n=>n.kind!=='branch').sort((a,b)=>this.layer(a)-this.layer(b));
    this.observer=new ResizeObserver(()=>{this.resize();this.onResize?.();if(this.active&&this.pose)this.draw(this.pose,this.view);});this.observer.observe(svg);this.resize();
  }
  layer(n){return n.kind==='leaf'?1:['bud','fruit','flower','lotus'].includes(n.kind)?2:3;}
  resize(){
    const rect=this.svg.getBoundingClientRect(),dpr=surfaceRatio(this.policy,rect.width,rect.height);
    this.width=rect.width;this.height=rect.height;this.dpr=dpr;
    this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));
    const parent=this.svg.parentElement,box=parent.getBoundingClientRect();
    const position={left:(rect.left-box.left-parent.clientLeft)+'px',top:(rect.top-box.top-parent.clientTop)+'px',width:rect.width+'px',height:rect.height+'px'};
    Object.assign(this.canvas.style,position);Object.assign(this.background.style,position);
  }
  ready(){return !!this.background;}
  show(active,revision=0){
    if(this.active===active&&this.cacheRevision===revision)return;this.cacheRevision=revision;
    if(this.active!==active){this.active=active;this.canvas.style.display=this.background.style.display=active?'':'none';for(const el of this.sources){el.dataset.canvasSource='true';el.style.display=active?'none':'';}}
    this.complete=true;
    for(const n of this.order){const g=this.groups.get(n.id),cached=!!(g.sprite||g.spriteLayers);if(!cached)this.complete=false;const hidden=active&&cached;if(g.canvasHidden!==hidden){g.el.dataset.canvasSource='true';g.el.style.display=hidden?'none':'';g.canvasHidden=hidden;}}
  }
  geometry(n,points,rigid){
    if(rigid&&this.rest.has(n.id))return this.rest.get(n.id);
    this.stats.geometryBuilds++;
    const raw=ribbonGeometry(points,n.width,n.id,this.model.settings.complexity,1,1,n.endWidth);
    const paths=Object.fromEntries(Object.entries(raw.paths).map(([key,d])=>[key,new Path2D(d)]));
    const data={paths,knots:Object.values(raw.knots).map(k=>k.transform.match(/-?\d+(?:\.\d+)?/g).map(Number))};
    if(rigid)this.rest.set(n.id,data);return data;
  }
  draw(pose,view,seconds=this.seconds||0){
    this.seconds=seconds;
    this.pose=pose;this.view=view;if(!this.active||!this.width||!this.height)return;
    this.stats.frames++;
    if(this.geometryTime<0||seconds<this.geometryTime||seconds-this.geometryTime>=this.policy.geometryInterval){
      this.geometryTime=seconds;this.cuts.clear();
      for(const n of this.model.nodes)if(n.kind==='branch'){
        const p=pose.branches.get(n.id);if(!p.rigid)this.flex.set(n.id,this.geometry(n,p.points,false));
        if(!p.rigid)this.cuts.set(n.id,new Path2D(OUTSIDE+branchOutline(p.points,n.width,n.endWidth)));
      }
    }
    const ctx=this.canvas.getContext('2d'),size=Math.min(this.width,this.height),scale=size/view.size;
    const viewBox=`${view.x} ${view.y} ${view.size} ${view.size}`;
    if(this.background.getAttribute('viewBox')!==viewBox)this.background.setAttribute('viewBox',viewBox);
    // Source textures already carry two samples per display pixel. Keep this
    // final moving pass cheap; repeated high-quality shrinking stalls Chromium.
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    ctx.setTransform(this.dpr*scale,0,0,this.dpr*scale,this.dpr*((this.width-size)/2-view.x*scale),this.dpr*((this.height-size)/2-view.y*scale));
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const n of this.model.nodes){
      if(n.kind!=='branch')continue;
      const p=pose.branches.get(n.id),parent=pose.branches.get(n.parent),parentNode=this.groups.get(n.parent)?.node;
      ctx.save();
      if(parent){
        if(parent.rigid){
          if(!this.restCuts.has(n.parent))this.restCuts.set(n.parent,new Path2D(OUTSIDE+branchOutline(parentNode.points,parentNode.width,parentNode.endWidth)));
          const [a,b,c,d,e,f]=parent.matrix,det=a*d-b*c;ctx.transform(...parent.matrix);ctx.clip(this.restCuts.get(n.parent),'evenodd');ctx.transform(d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det);
        }else ctx.clip(this.cuts.get(n.parent),'evenodd');
      }
      if(p.rigid)ctx.transform(...p.matrix);
      const g=this.groups.get(n.id);
      if(p.rigid&&g.sprite){const b=g.spriteBounds;ctx.drawImage(g.sprite,b.x,b.y,b.width,b.height);ctx.restore();continue;}
      const {paths,knots}=p.rigid?this.geometry(n,n.points,true):this.flex.get(n.id);
      ctx.fillStyle=this.palette.branch||this.palette.paper;ctx.fill(paths.contour);ctx.strokeStyle=this.palette.ink;
      ctx.lineWidth=1.55;ctx.stroke(paths.outline);ctx.clip(paths.contour);
      if(paths.inner){ctx.lineWidth=.6;ctx.stroke(paths.inner);}
      ctx.lineWidth=.45;for(const key of ['ribs','flow--1','flow-1'])if(paths[key])ctx.stroke(paths[key]);
      ctx.lineWidth=.65;for(const [x,y,angle] of knots){ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.stroke(KNOT);ctx.restore();}
      ctx.restore();
    }
    for(const n of this.order){
      const g=this.groups.get(n.id);if(!g.sprite&&!g.spriteLayers)continue;const p=pose.motifs.get(n.id),b=g.spriteBounds;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*Math.PI/180);ctx.scale(n.scale*(n.facing||1)*p.twist,n.scale);
      const layers=g.spriteLayers||[{canvas:g.sprite,chain:[]}];
      layers.forEach((layer,i)=>{
        ctx.save();for(const part of layer.chain){
          ctx.transform(...part.base);const [x,y]=part.pivot;ctx.translate(x,y);
          if(part.part==='blink')ctx.scale(1,p.blink);else ctx.rotate((p[part.part]||0)*Math.PI/180);ctx.translate(-x,-y);
        }
        ctx.drawImage(layer.canvas,b.x,b.y,b.width,b.height);ctx.restore();
      });ctx.restore();
    }
  }
  dispose(){this.disposed=true;this.observer.disconnect();this.canvas.remove();this.background.remove();this.rest.clear();this.restCuts.clear();this.flex.clear();this.cuts.clear();}
}
