import {compose} from './composition.js';
import {Renderer} from './renderer.js';
import {motif,getPalette} from './grammar.js';
import {motifTraits} from './motif-families.js';
import {restore,persist,sanitize,session,loadPresets,storePresets} from './state.js';
import {stage} from './growth.js';
import {clamp,fmt} from './random.js';
const $=id=>document.getElementById(id);
let state=restore(),model=compose(state.seed),renderer=new Renderer($('tree-canvas'));
state.settings=model.settings;state.time=Math.min(state.time,model.maturity);if(state.time>=model.maturity)state.paused=true;
let view='tree',specimen='leaf',presets=loadPresets(),lastFrame=performance.now(),lastPaint=0,lastSave=0,lastMotion=0,toastTimer,storageWarning=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion){state.paused=true;state.motionPlaying=false;}
const descriptions={leaf:['Leaf','Double contours, branching veins and hatched panels.'],flower:['Flower','Layered petals with stippled centers.'],bud:['Bud','Folded petals around a spiral.'],fruit:['Fruit','Pomegranate with a patterned seed lattice.'],bird:['Bird','Curved neck and patterned wing.'],lotus:['Lotus','Layered petals around a patterned base.'],fish:['Fish','Patterned scales, fins and a jointed tail.'],peacock:['Peacock','Curved neck and eye-patterned feathers.']};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
function save(){if(!persist(state)&&!storageWarning){storageWarning=true;toast('Browser storage is unavailable. Save a session file to keep your seed.');}}
function syncControls(){
  $('seed').value=state.seed;
  const p=getPalette(state.settings);$('identity-title').textContent=p.name;
  $('identity-description').textContent={monochrome:'Monochrome',limited:'Limited palette',rich:'Multicolor'}[p.mode];
  $('identity-pigments').innerHTML=[...new Set([p.paper,p.ink,...p.colors])].map(c=>`<span style="background:${c}" title="${c}"></span>`).join('');
  syncPause();if(view==='motifs')renderSpecimens();
}
function syncPause(){
  const done=state.time>=model.maturity;
  $('pause-button').innerHTML=`<svg class="icon"><use href="#i-${done?'reset':state.paused?'play':'pause'}"/></svg><span>${done?'Replay drawing':state.paused?'Resume drawing':'Pause drawing'}</span>`;
  $('motion-button').disabled=!done;$('motion-button').textContent=state.motionPlaying?'Pause motion':'Resume motion';
  $('live-dot').classList.toggle('paused',done?!state.motionPlaying:state.paused);
}
function syncStatus(count){
  const currentStage=stage(state.time,model.maturity),done=state.time>=model.maturity;$('stage-label').textContent=currentStage;$('motif-count').textContent=count.visible;
  $('growth-status').textContent=done?(state.motionPlaying?'Wind on':'Motion paused'):state.paused?'Drawing paused':'Drawing';
  const advance=$('advance-button');if(advance.dataset.complete!==String(done)){advance.dataset.complete=String(done);advance.innerHTML=`<svg class="icon"><use href="#i-${done?'reset':'forward'}"/></svg><span>${done?'Replay drawing':'Draw ahead'}</span>`;}
  $('growth-progress').style.width=Math.min(100,state.time/model.maturity*100)+'%';
  const seconds=Math.max(0,Math.floor(state.time/state.settings.speed));$('art-time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
function paint(){syncStatus(renderer.update(state.time));}
function plant(seed){state=sanitize({seed,paused:false,motionPlaying:!reducedMotion});model=compose(state.seed);state.settings=model.settings;renderer.time=0;renderer.mount(model,state.settings);fit();syncControls();paint();save();toast('Seed: '+state.seed);}
function replay(){state.time=0;state.motionTime=0;state.paused=false;renderer.time=0;renderer.mount(model,state.settings);syncPause();paint();save();}
function pause(){if(state.time>=model.maturity){state.motionPlaying=!state.motionPlaying;}else state.paused=!state.paused;syncPause();paint();save();}
function setView(next){view=next;const lab=next==='motifs';$('tree-view').hidden=lab;$('motifs-view').hidden=!lab;$('tree-controls').hidden=lab;$('motif-controls').hidden=!lab;$('view-title').textContent=lab?'Motifs':'Tree of Life';document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===next);b.setAttribute('aria-pressed',b.dataset.view===next);});if(lab)renderSpecimens();else paint();$('studio').scrollTop=0;}
function example(kind){return model.nodes.find(n=>n.kind===kind&&(kind!=='lotus'||n.habitat==='land'))||{variant:0};}
function renderSpecimens(){
  const p=getPalette(state.settings),n=example(specimen),style={...state.settings,seed:state.seed};
  const bounds={leaf:[-30,-80,30,10],flower:[-45,-45,45,45],bud:[-30,-62,30,10],fruit:[-36,-65,36,10],bird:[-78,-68,48,20]};
  const trait=['lotus','fish','peacock'].includes(specimen)?motifTraits(state.seed,specimen,n.variant):null,b=trait?.bounds||bounds[specimen];
  $('motif-canvas').setAttribute('viewBox',`${b[0]-22} ${b[1]-22} ${b[2]-b[0]+44} ${b[3]-b[1]+44}`);$('motif-canvas').innerHTML=motif(specimen,'specimen',n.variant,style);
  $('motif-canvas').parentElement.style.background=p.paper;$('motif-canvas').parentElement.style.color=p.ink;
  const [title,description]=descriptions[specimen];$('motif-title').textContent=title;$('motif-description').textContent=trait&&specimen==='lotus'?`${trait.petals} petals, ${trait.layers} layers.`:trait&&specimen==='peacock'?`${trait.train?'Trailing':'Spreading'} tail, ${trait.feathers} feathers.`:description;$('specimen-code').textContent=String(Object.keys(descriptions).indexOf(specimen)+1).padStart(2,'0')+' / '+title.toUpperCase();
  for(const card of document.querySelectorAll('[data-motif]')){card.querySelector('svg').innerHTML=motif(card.dataset.motif,'gallery-'+card.dataset.motif,example(card.dataset.motif).variant,style);card.style.background=p.paper;card.style.color=p.ink;const selected=card.dataset.motif===specimen;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',selected);}
}
function zoom(factor,anchor){
  const prev=renderer.view,newSize=clamp(prev.size/factor,125,1200),p=anchor||{x:prev.x+prev.size/2,y:prev.y+prev.size/2};
  const view={x:clamp(p.x-(p.x-prev.x)*newSize/prev.size,-900,1600),y:clamp(p.y-(p.y-prev.y)*newSize/prev.size,-900,1600),size:newSize};renderer.setView(view);$('zoom-label').textContent=Math.round(1000/view.size*100)+'%';
}
function fit(){renderer.setView({x:0,y:0,size:1000});$('zoom-label').textContent='100%';}
function canvasPoint(x,y){const matrix=$('tree-canvas').getScreenCTM();return new DOMPoint(x,y).matrixTransform(matrix.inverse());}
const mobileStudio=matchMedia('(max-width:850px)');
function syncStudio(){const open=$('studio').classList.contains('open'),mobile=mobileStudio.matches;$('studio').inert=mobile&&!open;$('studio').setAttribute('aria-hidden',mobile&&!open?'true':'false');document.querySelector('.workspace').inert=mobile&&open;document.querySelector('.app-header').inert=mobile&&open;if(!mobile){$('studio-backdrop').hidden=true;}}
function studio(open){$('studio').classList.toggle('open',open);$('studio-backdrop').hidden=!open;$('studio-toggle').setAttribute('aria-expanded',open);syncStudio();if(open)$('close-studio').focus();else $('studio-toggle').focus();}
mobileStudio.addEventListener('change',syncStudio);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function filename(){return 'mithila-'+state.seed.replace(/[^a-zA-Z0-9_-]/g,'-')+'-'+Math.floor(state.time);}
function presetOptions(){const select=$('preset-select');select.innerHTML='<option value="">Saved seeds</option>';presets.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.name;select.append(o);});}
$('pause-button').addEventListener('click',()=>state.time>=model.maturity?replay():pause());$('motion-button').addEventListener('click',pause);
$('advance-button').addEventListener('click',()=>{if(state.time>=model.maturity)return replay();state.time=Math.min(model.maturity,state.time+30);if(state.time>=model.maturity)state.paused=true;syncPause();paint();save();});
$('plant-button').addEventListener('click',()=>plant($('seed').value));$('seed').addEventListener('keydown',e=>{if(e.key==='Enter')plant(e.target.value);});
$('shuffle-seed').addEventListener('click',()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);plant('M-'+a[0].toString(36).toUpperCase());});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-motif]').forEach(b=>b.addEventListener('click',()=>{specimen=b.dataset.motif;renderSpecimens();}));
$('return-tree').addEventListener('click',()=>setView('tree'));
$('zoom-in').addEventListener('click',()=>zoom(1.3));$('zoom-out').addEventListener('click',()=>zoom(1/1.3));$('fit-view').addEventListener('click',fit);
$('tree-canvas').addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),canvasPoint(e.clientX,e.clientY));},{passive:false});
const pointers=new Map();let pan=null,pinch=null;
function beginGesture(){const a=[...pointers.values()];if(a.length===2){const point=canvasPoint((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2);pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),point};pan=null;}else if(a.length===1){pan={point:canvasPoint(a[0].x,a[0].y),view:{...renderer.view}};pinch=null;}}
$('tree-canvas').addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();$('tree-canvas').setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});beginGesture();$('tree-canvas').classList.add('dragging');});
$('tree-canvas').addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);zoom(d/Math.max(1,pinch.distance),pinch.point);pinch.distance=d;pinch.point=canvasPoint((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2);}else if(pan){const p=canvasPoint(e.clientX,e.clientY);renderer.setView({...renderer.view,x:clamp(renderer.view.x+pan.point.x-p.x,-900,1600),y:clamp(renderer.view.y+pan.point.y-p.y,-900,1600)});}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('tree-canvas').addEventListener(event,e=>{pointers.delete(e.pointerId);beginGesture();if(!pointers.size){pan=null;pinch=null;$('tree-canvas').classList.remove('dragging');}});
$('tree-canvas').addEventListener('keydown',e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[e.key]){e.preventDefault();const d=moves[e.key],v=renderer.view;renderer.setView({...v,x:clamp(v.x+d[0]*v.size*.06,-900,1600),y:clamp(v.y+d[1]*v.size*.06,-900,1600)});}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('studio').classList.contains('open')&&!document.querySelector('dialog[open]')){studio(false);return;}if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if(e.code==='Space'){e.preventDefault();pause();}if(e.key==='+'||e.key==='=')zoom(1.3);if(e.key==='-')zoom(1/1.3);if(e.key==='0')fit();});
$('studio-toggle').addEventListener('click',()=>studio(true));$('close-studio').addEventListener('click',()=>studio(false));$('studio-backdrop').addEventListener('click',()=>studio(false));
$('about-button').addEventListener('click',()=>$('about-dialog').showModal());
$('export-button').addEventListener('click',()=>$('export-dialog').showModal());
$('export-format').addEventListener('change',e=>$('png-options').hidden=e.target.value!=='png');
$('download-art').addEventListener('click',async()=>{
  const button=$('download-art');button.disabled=true;
  try{
    const svg=renderer.exportSVG({transparent:$('transparent-export').checked}),blob=new Blob([svg],{type:'image/svg+xml'});
    if($('export-format').value==='svg')download(blob,filename()+'.svg');
    else {
      const url=URL.createObjectURL(blob),img=new Image();
      try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Unable to render artwork'));img.src=url;});const size=+$('export-size').value,canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(img,0,0,size,size);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('Image export failed');download(png,filename()+'.png');}finally{URL.revokeObjectURL(url);}
    }
    $('export-dialog').close();toast('Artwork downloaded.');
  }catch(e){toast('Export could not finish. Try SVG or a smaller PNG.');console.error(e);}finally{button.disabled=false;}
});
$('save-preset').addEventListener('click',()=>{$('preset-name').value='';$('preset-dialog').showModal();$('preset-name').focus();});$('close-preset').addEventListener('click',()=>$('preset-dialog').close());
$('preset-form').addEventListener('submit',e=>{e.preventDefault();const name=$('preset-name').value.trim();if(!name)return;const p={name,seed:state.seed},old=presets.findIndex(p=>p.name===name);if(old>=0)presets[old]=p;else if(presets.length<30)presets.push(p);else return toast('30 seeds saved. Reuse a name to replace one.');if(storePresets(presets)){presetOptions();$('preset-dialog').close();toast('Seed saved.');}else toast('Storage unavailable. Save a session file instead.');});
$('preset-select').addEventListener('change',e=>{if(e.target.value==='')return;const p=presets[+e.target.value];if(p)plant(p.seed);});
$('save-session').addEventListener('click',()=>download(new Blob([JSON.stringify(session(state),null,2)],{type:'application/json'}),filename()+'.json'));
$('import-session').addEventListener('click',()=>$('session-file').click());
$('session-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1000000)throw new Error('File too large');const value=JSON.parse(await file.text());if(value.application!=='mithila'||![1,4].includes(value.version))throw new Error('Not a Mithila session');state=sanitize(value);model=compose(state.seed);state.settings=model.settings;state.time=Math.min(state.time,model.maturity);if(state.time>=model.maturity)state.paused=true;renderer.time=state.time;renderer.mount(model,state.settings);syncControls();fit();paint();if(state.time>=model.maturity)renderer.setWind(state.motionTime);save();toast('Session restored.');}catch{toast('Choose a valid Mithila session file.');}finally{e.target.value='';}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function tick(now){
  const elapsed=Math.max(0,(now-lastFrame)/1000),dt=Math.min(elapsed,.2);lastFrame=now;
  const active=!document.hidden&&view==='tree'&&!document.querySelector('dialog[open]');
  if(!state.paused&&active){state.time=Math.min(model.maturity,state.time+elapsed*state.settings.speed);if(state.time>=model.maturity){state.paused=true;syncPause();save();}}
  if(active&&state.time>=model.maturity&&state.motionPlaying){state.motionTime+=dt;if(now-lastMotion>32){renderer.setWind(state.motionTime);lastMotion=now;}}
  if(now-lastPaint>40){if(view==='tree')paint();lastPaint=now;}
  if(now-lastSave>5000){save();lastSave=now;}requestAnimationFrame(tick);
}
renderer.time=state.time;renderer.mount(model,state.settings);syncControls();presetOptions();syncStudio();paint();if(state.time>=model.maturity)renderer.setWind(state.motionTime);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden)save();});requestAnimationFrame(tick);
