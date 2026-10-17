import {ribbonGeometry,branchOutline,getPalette} from './grammar.js';

const OUTSIDE='M-1000 -1000H2000V2000H-1000Z ';
const KNOT=new Path2D('M-4 0C-3 -5 5 -5 5 0C5 5 -3 5 -4 0M-2 0Q1 -3 3 0');
export async function rasterSVG(source,width,height){
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'})),image=new Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
  }finally{URL.revokeObjectURL(url);}
}
// The same vector grammar supplies drawing, export and close inspection.
// Completed motion uses one composited surface to avoid SVG repainting every
// clipped hatch mark. Animated animal parts remain in the vector overlay.
export class CanvasScene{
  constructor(svg,model,groups){
    this.svg=svg;this.model=model;this.groups=groups;this.palette=getPalette(model.settings);this.rest=new Map();this.sprites=new Map();
    this.canvas=document.createElement('canvas');this.canvas.className='living-surface';this.canvas.setAttribute('aria-hidden','true');
    if(getComputedStyle(svg.parentElement).position==='static')svg.parentElement.style.position='relative';
    Object.assign(this.canvas.style,{position:'absolute',pointerEvents:'none',display:'none'});svg.before(this.canvas);
    svg.style.position='relative';svg.style.zIndex='1';this.canvas.style.zIndex='0';
    this.sources=[...svg.querySelectorAll('.paper,#art-frame,#art-ground,#branches')];
    this.order=[...model.nodes].filter(n=>n.kind!=='branch').sort((a,b)=>this.layer(a)-this.layer(b));
    this.observer=new ResizeObserver(()=>{this.resize();if(this.active&&this.pose)this.draw(this.pose,this.view);});this.observer.observe(svg);this.resize();
    const markup=['.paper','#art-frame','#art-ground'].map(s=>svg.querySelector(s).outerHTML).join('');
    rasterSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1600" height="1600">${markup}</svg>`,1600,1600).then(image=>{if(!this.disposed)this.background=image;}).catch(error=>console.warn('Mithila background cache unavailable',error));
  }
  layer(n){return n.kind==='leaf'?1:['bud','fruit','flower','lotus'].includes(n.kind)?2:3;}
  resize(){
    const rect=this.svg.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    this.width=rect.width;this.height=rect.height;this.dpr=dpr;
    this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));
    const parent=this.svg.parentElement,box=parent.getBoundingClientRect();
    Object.assign(this.canvas.style,{left:(rect.left-box.left-parent.clientLeft)+'px',top:(rect.top-box.top-parent.clientTop)+'px',width:rect.width+'px',height:rect.height+'px'});
  }
  ready(){return !!this.background;}
  show(active){
    if(this.active!==active){this.active=active;this.canvas.style.display=active?'':'none';for(const el of this.sources){el.dataset.canvasSource='true';el.style.display=active?'none':'';}}
    for(const n of this.order){const g=this.groups.get(n.id);if(g.parts?.length)continue;const hidden=active&&!!g.sprite;if(g.canvasHidden!==hidden){g.el.dataset.canvasSource='true';g.el.style.display=hidden?'none':'';g.canvasHidden=hidden;}}
  }
  geometry(n,points,rigid){
    if(rigid&&this.rest.has(n.id))return this.rest.get(n.id);
    const raw=ribbonGeometry(points,n.width,n.id,this.model.settings.complexity,1,1,n.endWidth);
    const paths=Object.fromEntries(Object.entries(raw.paths).map(([key,d])=>[key,new Path2D(d)]));
    const data={paths,knots:Object.values(raw.knots).map(k=>k.transform.match(/-?\d+(?:\.\d+)?/g).map(Number))};
    if(rigid)this.rest.set(n.id,data);return data;
  }
  screenSprite(g,n,scale){
    const density=Math.max(.25,this.dpr*scale*n.scale*1.15),key=density.toFixed(3),cached=this.sprites.get(n.id);
    if(cached?.key===key&&cached.source===g.sprite)return cached.canvas;
    const canvas=document.createElement('canvas'),b=g.spriteBounds;canvas.width=Math.max(1,Math.ceil(b.width*density));canvas.height=Math.max(1,Math.ceil(b.height*density));
    const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(g.sprite,0,0,canvas.width,canvas.height);
    this.sprites.set(n.id,{key,source:g.sprite,canvas});return canvas;
  }
  backdrop(view,size,scale){
    const key=[view.x,view.y,view.size,this.canvas.width,this.canvas.height].join(':');
    if(this.backdropKey!==key){
      const canvas=document.createElement('canvas');canvas.width=this.canvas.width;canvas.height=this.canvas.height;const ctx=canvas.getContext('2d');
      ctx.imageSmoothingQuality='high';ctx.setTransform(this.dpr*scale,0,0,this.dpr*scale,this.dpr*((this.width-size)/2-view.x*scale),this.dpr*((this.height-size)/2-view.y*scale));
      ctx.drawImage(this.background,0,0,1000,1000);this.staticSurface=canvas;this.backdropKey=key;
    }return this.staticSurface;
  }
  draw(pose,view){
    this.pose=pose;this.view=view;if(!this.active||!this.width||!this.height)return;
    const ctx=this.canvas.getContext('2d'),size=Math.min(this.width,this.height),scale=size/view.size;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    ctx.drawImage(this.backdrop(view,size,scale),0,0);
    ctx.setTransform(this.dpr*scale,0,0,this.dpr*scale,this.dpr*((this.width-size)/2-view.x*scale),this.dpr*((this.height-size)/2-view.y*scale));
    ctx.lineCap='round';ctx.lineJoin='round';
    const cuts=new Map();
    for(const n of this.model.nodes){
      if(n.kind!=='branch')continue;
      const p=pose.branches.get(n.id),parent=pose.branches.get(n.parent),parentNode=this.groups.get(n.parent)?.node;
      ctx.save();
      if(parent){
        if(!cuts.has(n.parent))cuts.set(n.parent,new Path2D(OUTSIDE+branchOutline(parent.points,parentNode.width,parentNode.endWidth)));
        ctx.clip(cuts.get(n.parent),'evenodd');
      }
      if(p.rigid)ctx.transform(...p.matrix);
      const {paths,knots}=this.geometry(n,p.rigid?n.points:p.points,p.rigid);
      ctx.fillStyle=this.palette.branch||this.palette.paper;ctx.fill(paths.contour);ctx.strokeStyle=this.palette.ink;
      ctx.lineWidth=1.55;ctx.stroke(paths.outline);ctx.clip(paths.contour);
      if(paths.inner){ctx.lineWidth=.6;ctx.stroke(paths.inner);}
      ctx.lineWidth=.45;for(const key of ['ribs','flow--1','flow-1'])if(paths[key])ctx.stroke(paths[key]);
      ctx.lineWidth=.65;for(const [x,y,angle] of knots){ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.stroke(KNOT);ctx.restore();}
      ctx.restore();
    }
    for(const n of this.order){
      const g=this.groups.get(n.id);if(!g.sprite)continue;const p=pose.motifs.get(n.id),b=g.spriteBounds;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*Math.PI/180);ctx.scale(n.scale*(n.facing||1)*p.twist,n.scale);ctx.drawImage(this.screenSprite(g,n,scale),b.x,b.y,b.width,b.height);ctx.restore();
    }
  }
  dispose(){this.disposed=true;this.observer.disconnect();this.canvas.remove();this.rest.clear();this.sprites.clear();this.background=null;this.staticSurface=null;}
}
