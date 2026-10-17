import {motif,ribbon,ribbonGeometry,frame,ground,getPalette,branchOutline} from './grammar.js';
import {nodeState} from './growth.js';
import {fmt,clamp} from './random.js';
import {buildMotionRig,sampleMotion,inversePosePoint,MOTION_VERSION} from './motion.js';
import {CanvasScene,rasterSVG} from './canvas-scene.js';
import {browserPolicy} from './performance.js';
import {spriteLayers} from './sprite-layers.js';
const NS='http://www.w3.org/2000/svg';
const OUTSIDE='M-1000 -1000H2000V2000H-1000Z ';
const set=(el,key,value)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
// Join completed hatch strokes without changing their paths,
// clipping, inherited colors, or local motion groups.
function compactDetails(body){
  for(const parent of new Set([...body.querySelectorAll('.detail path')].filter(el=>!el.closest('defs')).map(el=>el.parentElement))){
    const buckets=new Map(),all=[],children=[];
    for(const el of [...parent.children]){
      const tag=el.tagName.toLowerCase(),circle=tag==='circle'&&el.getAttribute('stroke')==='none';
      if((tag!=='path'&&!circle)||(tag==='path'&&el.getAttribute('fill')!=='none')||el.hasAttribute('data-geometry')){buckets.clear();children.push(el);continue;}
      const attrs=[...el.attributes].filter(a=>!['d','cx','cy','r'].includes(a.name));
      const key=attrs.map(a=>a.name+'='+a.value).sort().join('|');
      const x=+el.getAttribute('cx'),y=+el.getAttribute('cy'),r=+el.getAttribute('r');
      const d=circle?`M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0Z`:el.getAttribute('d');
      const previous=buckets.get(key);
      if(previous)previous.paths.push(d);
      else{
        const target=circle?document.createElementNS(NS,'path'):el;
        if(circle)for(const a of attrs)target.setAttribute(a.name,a.value);
        const bucket={target,paths:[d]};buckets.set(key,bucket);all.push(bucket);children.push(target);
      }
    }
    for(const bucket of all)bucket.target.setAttribute('d',bucket.paths.join(' '));parent.replaceChildren(...children);
  }
}
export class Renderer {
  constructor(svg,policy=browserPolicy()){this.svg=svg;this.policy=policy;this.groups=new Map();this.view={x:0,y:0,size:1000};this.rasterQueue=[];this.rasterBusy=false;}
  mount(model,settings){
    this.clearGrowthProxies();
    this.cacheRevision=0;this.scene?.dispose();this.scene=null;this.model=model;this.settings=settings;this.groups.clear();this.rasterQueue=[];this.lastCount=null;this.motionSeconds=0;
    this.nodesById=new Map(model.nodes.map(n=>[n.id,n]));
    this.motionRig=buildMotionRig(model);this.lastWindGeometry=-1;
    this.branchOutlines=new Map(model.nodes.filter(n=>n.kind==='branch').map(n=>[n.id,branchOutline(n.points,n.width,n.endWidth)]));
    const style={...settings,seed:model.seed},pal=getPalette(style);
    this.svg.innerHTML=`<title>A living tree, inspired by Mithila painting</title><desc>Seed ${model.seed.replace(/[<>&]/g,'')}. A tree of curved branches, patterned leaves, lotus blooms, birds, a peacock and a river register.</desc><rect class="paper" x="0" y="0" width="1000" height="1000" fill="${pal.paper}"/><g id="art-frame" ${settings.border?'':'display="none"'}>${frame(style,model.seed)}</g><g id="art-ground">${ground(style)}</g><g id="tree-figure"><g id="branches"></g><g id="botanical" ${settings.ornaments===false?'display="none"':''}></g></g><g id="environment" ${settings.ornaments===false?'display="none"':''}></g>`;
    const branches=this.svg.querySelector('#branches'),leaves=this.svg.querySelector('#botanical'),environment=this.svg.querySelector('#environment');
    const layer=n=>n.kind==='branch'?0:n.kind==='leaf'?1:['bud','fruit','flower','lotus'].includes(n.kind)?2:3;
    for(const n of [...model.nodes].sort((a,b)=>layer(a)-layer(b))){
      const el=document.createElementNS(NS,'g'),body=document.createElementNS(NS,'g');el.dataset.node=n.id;
      if(n.kind!=='branch')el.setAttribute('transform',`translate(${fmt(n.x)} ${fmt(n.y)}) rotate(${fmt(n.angle)}) scale(${fmt(n.scale*(n.facing||1))} ${fmt(n.scale)})`);
      el.append(body);(n.kind==='branch'?branches:n.habitat==='land'||n.habitat==='water'?environment:leaves).append(el);
      this.groups.set(n.id,{node:n,el,body,key:'',lastProgress:-1,lastDetail:-1,strokes:null,visible:null,complete:false});
    }
    this.update(this.time||0,true);this.scene=new CanvasScene(this.svg,model,this.groups,this.policy);this.scene.onResize=()=>this.queueUncached(true);this.setView(this.view);
  }
  update(time,force=false){
    if(this.lastCount&&time===this.time&&!force&&this.lastOrnaments===this.settings.ornaments){this.queueUncached();return this.lastCount;}
    this.time=time;let visible=0,flowers=0;const pending=[];
    for(const n of this.model.nodes){
      const state=nodeState(n,time),g=this.groups.get(n.id);
      if(g.visible!==state.visible){g.el.style.display=state.visible?'':'none';g.visible=state.visible;}
      if(!state.visible)continue;
      if(n.kind!=='branch'){visible++;if(state.kind==='flower')flowers++;}
      if(g.complete&&!force&&state.progress===1&&state.detail===1)continue;
      const key=state.kind+':'+state.epoch;
      const changed=g.key!==key||force;
      if(changed){
        g.key=key;g.complete=false;
        if(n.kind==='branch'){
          g.body.innerHTML=ribbon(n.points,n.width,n.id,{...this.settings,seed:this.model.seed},this.settings.complexity,1,1,n.endWidth,this.branchOutlines.get(n.parent)||'');
          this.cacheGeometry(g);
        }else{
          g.body.innerHTML=motif(state.kind,n.id,state.variant??n.variant,{...this.settings,seed:this.model.seed});
          g.strokes=null;g.parts=[...g.body.querySelectorAll('[data-part]')].map(el=>({el,part:el.dataset.part,pivot:el.dataset.pivot,base:el.getAttribute('transform')||''}));
        }
      }
      if(Math.abs(g.lastProgress-state.progress)>.0008||Math.abs(g.lastDetail-state.detail)>.0008||changed||(state.progress===1&&g.lastProgress<1)||(state.detail===1&&g.lastDetail<1)){
        g.lastProgress=state.progress;g.lastDetail=state.detail;g.key=key;
        if(n.kind==='branch'){
          g.body.style.display=state.progress>.001?'':'none';
          if(!changed||state.progress!==1||state.detail!==1)this.applyGeometry(g,ribbonGeometry(n.points,n.width,n.id,this.settings.complexity,state.progress,state.detail,n.endWidth));
          g.complete=state.progress===1&&state.detail===1;
          if(g.complete&&n.order>1)this.queueRaster(g);
        }else pending.push({g,state});
      }
    }
    // Insert all arriving motifs before reading geometry. This avoids repeatedly
    // forcing SVG layout between each motif's insertion and length measurement.
    for(const {g,state} of pending)if(!g.strokes&&(state.progress!==1||state.detail!==1))g.strokes=this.prepareStrokes(g.body);
    for(const {g,state} of pending){
      if(g.strokes){this.drawStrokes(g.strokes.outline,state.progress);this.drawStrokes(g.strokes.detail,state.detail);}
      if(state.progress===1&&state.detail===1){compactDetails(g.body);g.complete=true;g.strokes=null;this.queueRaster(g);}
    }
    this.lastOrnaments=this.settings.ornaments;this.lastCount={visible:this.settings.ornaments===false?0:visible,flowers,total:this.model.capacity};return this.lastCount;
  }
  queueRaster(g,refresh=false){
    if(g.rasterPending||(!refresh&&(g.sprite||g.spriteLayers)))return;
    g.rasterPending=true;this.rasterQueue.push(g);this.drainRaster();
  }
  spriteDensity(g){const scene=this.scene,scale=scene?Math.min(scene.width,scene.height)/Math.max(600,this.view.size):1;return Math.max(this.policy.minSpriteDensity,Math.min(this.policy.maxSpriteDensity,scale*(g.node.scale||1)*(scene?.dpr||this.policy.pixelRatio)*this.policy.cacheOversample));}
  queueUncached(refresh=false){
    if(!this.scene?.width||!this.scene.height)return;
    for(const g of this.groups.values())if(g.complete&&(g.node.kind!=='branch'||g.node.order>1)){
      const missing=!g.sprite&&!g.spriteLayers,outgrown=refresh&&this.view.size>=600&&this.spriteDensity(g)>(g.spriteDensity||0)*1.2;
      if(missing||outgrown)this.queueRaster(g,outgrown);
    }
  }
  drainRaster(){
    if(this.rasterBusy||!this.rasterQueue.length)return;
    this.rasterBusy=true;
    const schedule=window.requestIdleCallback||((callback)=>setTimeout(callback,16));
    schedule(()=>{
      const batch=this.rasterQueue.splice(0,this.policy.cacheBatch);
      Promise.all(batch.map(g=>this.rasterize(g))).finally(()=>{this.rasterBusy=false;if(this.time>=this.model.maturity)this.setWind(this.motionSeconds||0);this.drainRaster();});
    },{timeout:80});
  }
  async rasterize(g){
    if(!g.body.isConnected)return;
    try{
      const b=g.spriteBounds||g.body.getBBox();if(b.width<=0||b.height<=0)return;
      const padding=g.spriteBounds?0:g.parts?.length?16:4,x=b.x-padding,y=b.y-padding,width=b.width+padding*2,height=b.height+padding*2;
      if(width<=0||height<=0)return;
      const resolution=this.spriteDensity(g);
      let sourceBody=g.body;
      if(g.node.kind==='branch'){
        sourceBody=g.body.cloneNode(true);const cut=sourceBody.querySelector('[data-parent-cut]')?.closest('clipPath');
        if(cut){for(const el of sourceBody.querySelectorAll('[clip-path]'))if(el.getAttribute('clip-path')===`url(#${cut.id})`)el.removeAttribute('clip-path');cut.remove();}
      }
      const layers=spriteLayers(sourceBody,g.parts),result=[];
      for(const layer of layers){
        const source=`<svg xmlns="${NS}" viewBox="${x} ${y} ${width} ${height}" width="${Math.ceil(width*resolution)}" height="${Math.ceil(height*resolution)}">${layer.markup}</svg>`;
        const canvas=await rasterSVG(source,width*resolution,height*resolution,g.node.kind!=='branch'&&!g.parts?.length&&this.time<this.model.maturity);
        if(!g.body.isConnected){if(canvas.sourceURL)URL.revokeObjectURL(canvas.sourceURL);return;}result.push({canvas,chain:layer.chain});
      }
      if(g.proxy)this.clearGrowthProxy(g);
      if(g.parts?.length)g.spriteLayers=result;else g.sprite=result[0].canvas;
      g.spriteBounds={x,y,width,height};g.spriteDensity=resolution;this.cacheRevision++;
      if(g.sprite?.sourceURL){
        const image=document.createElementNS(NS,'image');g.proxy=image;g.proxyURL=g.sprite.sourceURL;
        image.style.visibility='hidden';
        image.dataset.growthProxy='true';image.setAttribute('x',x);image.setAttribute('y',y);image.setAttribute('width',width);image.setAttribute('height',height);image.setAttribute('href',g.proxyURL);
        image.onload=()=>{if(g.body.isConnected&&this.time<this.model.maturity){g.body.dataset.growthSource='true';g.body.style.display='none';image.style.visibility='';}else this.clearGrowthProxy(g);};
        g.el.append(image);
      }
    }catch(error){g.body.style.display='';console.warn('Mithila motif cache unavailable',g.node.id,error);}finally{g.rasterPending=false;}
  }
  cacheGeometry(g){
    g.geometryPaths=[...g.body.querySelectorAll('[data-geometry]')];
    g.geometryKnots=[...g.body.querySelectorAll('[data-knot]')];
    g.parentCut=g.body.querySelector('[data-parent-cut]');
  }
  clearGrowthProxy(g){if(g.proxyURL)URL.revokeObjectURL(g.proxyURL);g.proxy?.remove();g.proxy=null;g.proxyURL=null;if(g.sprite)delete g.sprite.sourceURL;if(g.body?.dataset.growthSource){g.body.style.display='';delete g.body.dataset.growthSource;}}
  clearGrowthProxies(){for(const g of this.groups.values())if(g.proxy)this.clearGrowthProxy(g);}
  applyGeometry(g,next){
    for(const el of g.geometryPaths){const d=next.paths[el.dataset.geometry];if(d){set(el,'d',d);if(el.style.display)el.style.display='';}else if(el.style.display!=='none')el.style.display='none';}
    for(const el of g.geometryKnots){const knot=next.knots[el.dataset.knot];if(knot){if(el.style.display)el.style.display='';set(el,'transform',knot.transform);set(el.firstElementChild,'stroke-dashoffset',fmt(1-knot.draw));}else if(el.style.display!=='none')el.style.display='none';}
  }
  setWind(seconds){
    if(this.time<this.model.maturity)return;
    this.motionSeconds=seconds;
    const pose=sampleMotion(this.motionRig,seconds),geometry=seconds<this.lastWindGeometry||seconds-this.lastWindGeometry>=this.policy.geometryInterval||this.lastWindGeometry<0;
    const canvas=this.view.size>=600&&this.scene?.ready();
    this.scene?.show(!!canvas,this.cacheRevision);if(canvas)this.scene.draw(pose,this.view,seconds);
    this.clearGrowthProxies();
    if(canvas&&this.scene.complete)return;
    if(canvas&&!this.rasterBusy&&!this.rasterQueue.length)this.queueUncached();
    if(geometry)this.lastWindGeometry=seconds;
    for(const n of this.model.nodes){
      const g=this.groups.get(n.id);
      if(n.kind==='branch'){
        if(canvas)continue;
        if(n.role==='root')continue;const p=pose.branches.get(n.id),parent=pose.branches.get(n.parent),parentNode=this.nodesById.get(n.parent);
        if(p.rigid){
          set(g.el,'transform','matrix('+p.matrix.map(v=>+v.toFixed(6)).join(' ')+')');
          if(geometry&&parent&&g.parentCut)set(g.parentCut,'d',OUTSIDE+branchOutline(parent.points.map(point=>inversePosePoint(point,p)),parentNode.width,parentNode.endWidth));
        }else if(geometry){
          const next=ribbonGeometry(p.points,n.width,n.id,this.settings.complexity,1,1,n.endWidth);
          this.applyGeometry(g,next);
          if(parent&&g.parentCut)set(g.parentCut,'d',OUTSIDE+branchOutline(parent.points,parentNode.width,parentNode.endWidth));
        }
      }else{
        if(canvas&&(g.sprite||g.spriteLayers))continue;
        const p=pose.motifs.get(n.id);set(g.el,'transform',`translate(${fmt(p.x)} ${fmt(p.y)}) rotate(${fmt(p.angle)}) scale(${(n.scale*(n.facing||1)*p.twist).toFixed(4)} ${n.scale.toFixed(4)})`);
        for(const part of g.parts||[]){
          const [x,y]=part.pivot.split(' ').map(Number),motion=part.part==='blink'?`translate(${x} ${y}) scale(1 ${fmt(p.blink)}) translate(${-x} ${-y})`:`rotate(${fmt(p[part.part]||0)} ${x} ${y})`;
          set(part.el,'transform',part.base+' '+motion);
        }
      }
    }
  }
  prepareStrokes(body){
    const groups={outline:[],detail:[]};
    for(const el of body.querySelectorAll('path,circle,line,ellipse,polyline,polygon')){
      if(el.closest('defs'))continue;
      const group=el.closest('.detail')?'detail':'outline';
      let length;try{length=el.getTotalLength();}catch{length=1;}
      groups[group].push({el,length:Math.max(1,length),originalFill:el.getAttribute('fill'),local:-1});
    }
    for(const strokes of Object.values(groups)){let total=0;for(const s of strokes){s.start=total;total+=s.length;}for(const s of strokes){s.start/=total;s.span=s.length/total;}strokes.cursor=0;strokes.progress=-1;}
    return groups;
  }
  drawStrokes(strokes,progress){
    if(strokes.progress<0||progress<strokes.progress){for(const s of strokes){s.el.style.display='none';s.local=-1;}strokes.cursor=0;}
    strokes.progress=progress;
    for(let i=strokes.cursor;i<strokes.length;i++){
      const s=strokes[i];
      const local=clamp((progress-s.start)/s.span,0,1);
      if(local<=0)break;
      if(s.local===local)continue;s.local=local;s.el.style.display='';
      if(local>=.999){
        s.el.removeAttribute('stroke-dasharray');s.el.removeAttribute('stroke-dashoffset');
        if(s.originalFill===null)s.el.removeAttribute('fill');else set(s.el,'fill',s.originalFill);
        strokes.cursor=i+1;continue;
      }
      set(s.el,'stroke-dasharray',`${fmt(s.length)} ${fmt(s.length+.1)}`);
      set(s.el,'stroke-dashoffset',fmt(s.length*(1-local)));
      // Flat paint follows the finished contour. Stippling arrives dot by dot.
      set(s.el,'fill','none');break;
    }
  }
  redraw(settings){this.settings=settings;this.mount(this.model,settings);}
  setView(view){this.view={...view};this.svg.setAttribute('viewBox',`${fmt(view.x)} ${fmt(view.y)} ${fmt(view.size)} ${fmt(view.size)}`);if(this.time>=this.model.maturity){this.lastWindGeometry=-1;this.setWind(this.motionSeconds||0);this.queueUncached(true);}}
  exportSVG({transparent=false}={}){
    const scene=this.scene;this.scene=null;this.lastWindGeometry=-1;this.setWind(this.motionSeconds||0);this.scene=scene;
    const clone=this.svg.cloneNode(true);clone.setAttribute('xmlns',NS);clone.setAttribute('viewBox','0 0 1000 1000');clone.setAttribute('width','4000');clone.setAttribute('height','4000');clone.removeAttribute('id');clone.removeAttribute('class');
    clone.querySelectorAll('[data-canvas-source]').forEach(el=>{el.style.display='';el.removeAttribute('data-canvas-source');});
    clone.querySelectorAll('[data-growth-proxy]').forEach(el=>el.remove());clone.querySelectorAll('[data-growth-source]').forEach(el=>{el.style.display='';el.removeAttribute('data-growth-source');});
    clone.style.removeProperty('position');clone.style.removeProperty('z-index');
    clone.querySelectorAll('[style*="display: none"]').forEach(e=>e.remove());if(transparent)clone.querySelector('.paper')?.remove();
    const meta=document.createElementNS(NS,'metadata');meta.textContent=JSON.stringify({application:'Mithila — A Living Tree',grammar:4,motionVersion:MOTION_VERSION,seed:this.model.seed,time:Math.round(this.time*100)/100,motionTime:Math.round((this.motionSeconds||0)*1000)/1000,identity:this.model.identity});clone.prepend(meta);return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
  }
}
