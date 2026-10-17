import {motif,ribbon,ribbonGeometry,frame,ground,getPalette,branchOutline} from './grammar.js';
import {nodeState} from './growth.js';
import {fmt,clamp} from './random.js';
import {buildMotionRig,sampleMotion,inversePosePoint} from './motion.js';
const NS='http://www.w3.org/2000/svg';
export class Renderer {
  constructor(svg){this.svg=svg;this.groups=new Map();this.view={x:0,y:0,size:1000};}
  mount(model,settings){
    this.model=model;this.settings=settings;this.groups.clear();
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
      this.groups.set(n.id,{el,body,key:'',lastProgress:-1,lastDetail:-1,strokes:null});
    }
    this.update(this.time||0,true);this.setView(this.view);
  }
  update(time,force=false){
    if(this.lastCount&&time===this.time&&!force&&this.lastOrnaments===this.settings.ornaments)return this.lastCount;
    this.time=time;let visible=0,flowers=0;
    for(const n of this.model.nodes){
      const state=nodeState(n,time),g=this.groups.get(n.id);
      if(!state.visible){g.el.style.display='none';continue;}
      g.el.style.display='';if(n.kind!=='branch'){visible++;if(state.kind==='flower')flowers++;}
      const key=state.kind+':'+state.epoch;
      const changed=g.key!==key||force;
      if(n.kind!=='branch'&&changed){g.key=key;g.body.innerHTML=motif(state.kind,n.id,state.variant??n.variant,{...this.settings,seed:this.model.seed});g.strokes=this.prepareStrokes(g.body);g.parts=[...g.body.querySelectorAll('[data-part]')].map(el=>({el,part:el.dataset.part,pivot:el.dataset.pivot,base:el.getAttribute('transform')||''}));}
      if(Math.abs(g.lastProgress-state.progress)>.0008||Math.abs(g.lastDetail-state.detail)>.0008||changed){
        g.lastProgress=state.progress;g.lastDetail=state.detail;g.key=key;
        if(n.kind==='branch')g.body.innerHTML=state.progress>.001?ribbon(n.points,n.width,n.id,{...this.settings,seed:this.model.seed},this.settings.complexity,state.progress,state.detail,n.endWidth,this.branchOutlines.get(n.parent)||''):'';
        else {this.drawStrokes(g.strokes.outline,state.progress);this.drawStrokes(g.strokes.detail,state.detail);}
      }
    }
    this.lastOrnaments=this.settings.ornaments;this.lastCount={visible:this.settings.ornaments===false?0:visible,flowers,total:this.model.capacity};return this.lastCount;
  }
  setWind(seconds){
    if(this.time<this.model.maturity)return;
    this.motionSeconds=seconds;
    const pose=sampleMotion(this.motionRig,seconds),geometry=seconds-this.lastWindGeometry>=.12||this.lastWindGeometry<0;
    if(geometry)this.lastWindGeometry=seconds;
    for(const n of this.model.nodes){
      const g=this.groups.get(n.id);
      if(n.kind==='branch'){
        if(n.role==='root')continue;const p=pose.branches.get(n.id),parent=pose.branches.get(n.parent),parentNode=this.model.nodes.find(b=>b.id===n.parent);
        if(p.rigid){
          g.el.setAttribute('transform','matrix('+p.matrix.map(v=>+v.toFixed(6)).join(' ')+')');
          if(geometry&&parent){const mask=g.body.querySelector('mask path');if(mask)mask.setAttribute('d',branchOutline(parent.points.map(point=>inversePosePoint(point,p)),parentNode.width,parentNode.endWidth));}
        }else if(geometry){
          const next=ribbonGeometry(p.points,n.width,n.id,this.settings.complexity,1,1,n.endWidth);
          if(!g.geometryPaths){g.geometryPaths=[...g.body.querySelectorAll('[data-geometry]')];g.geometryKnots=[...g.body.querySelectorAll('[data-knot]')];g.parentMask=g.body.querySelector('[data-parent-mask]');}
          for(const el of g.geometryPaths){const d=next.paths[el.dataset.geometry];if(d&&el.getAttribute('d')!==d)el.setAttribute('d',d);}
          for(const el of g.geometryKnots){const transform=next.knots[el.dataset.knot]?.transform;if(transform&&el.getAttribute('transform')!==transform)el.setAttribute('transform',transform);}
          if(parent&&g.parentMask)g.parentMask.setAttribute('d',branchOutline(parent.points,parentNode.width,parentNode.endWidth));
        }
      }else{
        const p=pose.motifs.get(n.id);g.el.setAttribute('transform',`translate(${fmt(p.x)} ${fmt(p.y)}) rotate(${fmt(p.angle)}) scale(${(n.scale*(n.facing||1)*p.twist).toFixed(4)} ${n.scale.toFixed(4)})`);
        for(const part of g.parts||[]){
          const [x,y]=part.pivot.split(' ').map(Number),motion=part.part==='blink'?`translate(${x} ${y}) scale(1 ${fmt(p.blink)}) translate(${-x} ${-y})`:`rotate(${fmt(p[part.part]||0)} ${x} ${y})`;
          part.el.setAttribute('transform',part.base+' '+motion);
        }
      }
    }
  }
  prepareStrokes(body){
    const groups={outline:[],detail:[]};
    for(const el of body.querySelectorAll('path,circle,line,ellipse,polyline,polygon')){
      if(el.closest('defs'))continue;
      const style=getComputedStyle(el),group=el.closest('.detail')?'detail':'outline';
      let length;try{length=el.getTotalLength();}catch{length=1;}
      groups[group].push({el,length:Math.max(1,length),fill:style.fill});
    }
    for(const strokes of Object.values(groups)){let total=0;for(const s of strokes){s.start=total;total+=s.length;}for(const s of strokes){s.start/=total;s.span=s.length/total;}}
    return groups;
  }
  drawStrokes(strokes,progress){
    for(const s of strokes){
      const local=clamp((progress-s.start)/s.span,0,1);
      s.el.style.display=local<=0?'none':'';
      s.el.setAttribute('stroke-dasharray',`${fmt(s.length)} ${fmt(s.length+.1)}`);
      s.el.setAttribute('stroke-dashoffset',fmt(s.length*(1-local)));
      // Flat paint follows the finished contour. Stippling arrives dot by dot.
      s.el.setAttribute('fill',local>=.999?s.fill:'none');
    }
  }
  redraw(settings){this.settings=settings;this.mount(this.model,settings);}
  setView(view){this.view={...view};this.svg.setAttribute('viewBox',`${fmt(view.x)} ${fmt(view.y)} ${fmt(view.size)} ${fmt(view.size)}`);}
  exportSVG({transparent=false}={}){
    const clone=this.svg.cloneNode(true);clone.setAttribute('xmlns',NS);clone.setAttribute('viewBox','0 0 1000 1000');clone.setAttribute('width','4000');clone.setAttribute('height','4000');clone.removeAttribute('id');clone.removeAttribute('class');clone.querySelectorAll('[style*="display: none"]').forEach(e=>e.remove());if(transparent)clone.querySelector('.paper')?.remove();
    const meta=document.createElementNS(NS,'metadata');meta.textContent=JSON.stringify({application:'Mithila — A Living Tree',grammar:4,seed:this.model.seed,time:Math.round(this.time*100)/100,motionTime:Math.round((this.motionSeconds||0)*1000)/1000,identity:this.model.identity});clone.prepend(meta);return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
  }
}
