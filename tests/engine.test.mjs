import test from 'node:test';
import assert from 'node:assert/strict';
import {compose,DEFAULT_SETTINGS,inspectComposition} from '../dist/js/composition.js';
import {nodeState} from '../dist/js/growth.js';
import {motif,ribbon,frame,getPalette,PALETTES,DEFAULT_MOTIFS} from '../dist/js/grammar.js';
import {sanitize,session} from '../dist/js/state.js';
import {deriveIdentity,seedStream} from '../dist/js/identity.js';
import {seedPalette,contrast} from '../dist/js/palette.js';
import {motifTraits} from '../dist/js/motif-families.js';
import {buildMotionRig,sampleMotion} from '../dist/js/motion.js';
import fs from 'node:fs';
const samples=Array.from({length:24},(_,i)=>compose('MITHILA-'+String(i+1).padStart(3,'0')));
import {ARCHITECTURES,createSkeleton,establishedAt,budGrammar} from '../dist/js/branching.js';
import {cubic,distance} from '../dist/js/random.js';
import {overlapFraction,layeringLimit} from '../dist/js/placement.js';
import {borderIdentity,BORDER_FAMILIES} from '../dist/js/borders.js';

test('A seed reproduces the complete composition and different seeds diverge',()=>{
  const a=compose('BANYAN-17'),b=compose('BANYAN-17'),c=compose('BANYAN-18');
  assert.deepEqual(a,b);assert.notDeepEqual(a.nodes,c.nodes);
});
test('Seed recipes produce bounded, richly populated, structurally distinct paintings',()=>{
  for(const model of samples){assert.ok(model.capacity>=140&&model.capacity<=400);assert.ok(inspectComposition(model).bounds);assert.ok(model.nodes.every(n=>n.birth>=0&&n.duration>0));assert.equal(new Set(model.nodes.map(n=>n.id)).size,model.nodes.length);}
  assert.equal(new Set(samples.map(m=>m.identity.recipe)).size,6);
  assert.equal(new Set(samples.map(m=>JSON.stringify(m.nodes.filter(n=>n.kind==='branch')))).size,24);
  assert.ok(Math.max(...samples.map(m=>m.capacity))-Math.min(...samples.map(m=>m.capacity))>85);
});
test('The tree finishes one drawing and remains complete after a day',()=>{
  for(const sample of samples){
    const seconds=sample.maturity/sample.settings.speed;
    assert.ok(seconds>=10&&seconds<=15);
    for(const node of sample.nodes){const full=nodeState(node,seconds*sample.settings.speed);assert.equal(full.progress,1);assert.equal(full.detail,1);}
  }
  const model=compose('EVERGREEN'),before=JSON.stringify(model.nodes);
  for(const time of [0,2,20,70,300,3600,86400]){
    let count=0;
    for(const node of model.nodes){const s=nodeState(node,time,.8);if(s.visible&&node.kind!=='branch')count++;assert.ok(s.progress>=0&&s.progress<=1);assert.ok(s.opacity>=0&&s.opacity<=1);assert.ok(['branch',...Object.keys(DEFAULT_MOTIFS)].includes(s.kind));}
    assert.ok(count<=model.capacity);
  }
  assert.equal(JSON.stringify(model.nodes),before);
  const branch=model.nodes.find(n=>n.kind==='branch');assert.equal(nodeState(branch,86400).progress,1);
  for(const n of model.nodes){const s=nodeState(n,86400);assert.equal(s.kind,n.kind);assert.equal(s.epoch,0);assert.equal(s.progress,1);assert.equal(s.detail,1);}
});
test('Every ornament uses local clipping and produces finite geometry at parameter extremes',()=>{
  for(const palette of Object.keys(PALETTES))for(const kind of Object.keys(DEFAULT_MOTIFS))for(const v of [0,1,5,121])for(const size of [.65,1.5]){
    const svg=motif(kind,'sample',v,{palette,complexity:1,motifs:{[kind]:{width:size,curve:size,spacing:size}}});
    assert.ok(svg.includes('<clipPath'));assert.ok(svg.includes('clip-path="url(#sample-clip)"'));assert.ok(!/NaN|undefined|Infinity/.test(svg));
  }
  const branch=compose('wood').nodes[0];assert.ok(ribbon(branch.points,branch.width,branch.id).includes('clip-path='));
});
test('Botanical grammars produce different skeletons and children emerge from established attachment points',()=>{
  const structures=[];
  for(const architecture of ARCHITECTURES){
    const opt={...DEFAULT_SETTINGS,architecture},s=createSkeleton('MORPHOLOGY',opt);structures.push(JSON.stringify(s.branches));
    assert.ok(s.branches.length>12&&s.branches.length<120);
    for(const b of s.branches){assert.ok(b.endWidth>0&&b.endWidth<=b.width);if(b.parent){const p=s.branches.find(p=>p.id===b.parent);assert.ok(p);assert.equal(b.order,p.order+1);assert.ok(distance(b.points[0],cubic(p.points,b.attachmentT))<.00001);assert.ok(b.birth>=establishedAt(p,b.attachmentT));assert.ok(b.width<p.width);}}
  }
  assert.equal(new Set(structures).size,ARCHITECTURES.length);
  const identity=deriveIdentity('SKELETON');assert.deepEqual(createSkeleton('SKELETON',{...identity.settings,density:0}),createSkeleton('SKELETON',{...identity.settings,density:1}));
});
test('Branch relationships are planned; seed borders reproduce and vary',()=>{
  const a=compose('MITHILA-014');assert.equal(a.nodes.filter(n=>n.kind==='peacock').length,1);
  for(const n of a.nodes)if(n.parent){const p=a.nodes.find(p=>p.id===n.parent);assert.ok(p);assert.ok(n.birth>=p.birth);}
  assert.equal(frame('kachni','A'),frame('kachni','A'));
  assert.ok(new Set(['A','B','C','D','E','F','G','H'].map(s=>frame('kachni',s))).size>1);
  const borders=Array.from({length:150},(_,i)=>borderIdentity('MITHILA-'+String(i+1).padStart(3,'0')));
  assert.equal(new Set(borders.map(b=>b.family)).size,BORDER_FAMILIES.length);
  assert.ok(new Set(borders.map(b=>b.count)).size>10);
  for(const b of borders){assert.ok(b.width>=25&&b.width<=37);assert.ok(b.count>=26&&b.count<=40);}
  for(const model of samples){const svg=frame(model.settings,model.seed);assert.ok(svg.includes(`data-border-family="${model.identity.border.family}"`));assert.ok(svg.includes('<use href="#border-'));assert.ok(!/NaN|undefined|Infinity/.test(svg));}
});
test('Fine sampled woody axes do not cross away from their shared junctions',()=>{
  const cross=(a,b)=>a.x*b.y-a.y*b.x;
  const intersection=(a,b,c,d)=>{
    const u={x:b.x-a.x,y:b.y-a.y},v={x:d.x-c.x,y:d.y-c.y},w={x:c.x-a.x,y:c.y-a.y},den=cross(u,v);
    if(Math.abs(den)<1e-8)return null;const t=cross(w,v)/den,s=cross(w,u)/den;
    return t>0&&t<1&&s>0&&s<1?{x:a.x+t*u.x,y:a.y+t*u.y}:null;
  };
  for(const model of samples){
    const seed=model.seed,branches=model.nodes.filter(b=>b.kind==='branch'&&b.role!=='root'),samples=branches.map(b=>Array.from({length:41},(_,i)=>cubic(b.points,i/40)));
    for(let i=0;i<branches.length;i++)for(let j=i+1;j<branches.length;j++)for(let k=0;k<40;k++)for(let l=0;l<40;l++){
      const point=intersection(samples[i][k],samples[i][k+1],samples[j][l],samples[j][l+1]);if(!point)continue;
      const a=branches[i],b=branches[j],joint=a.parent===b.id?{origin:a.points[0],radius:Math.max(48,b.width*3.5)}:b.parent===a.id?{origin:b.points[0],radius:Math.max(48,a.width*3.5)}:a.parent===b.parent&&distance(a.points[0],b.points[0])<4?{origin:a.points[0],radius:48}:null;
      assert.ok(joint&&distance(point,joint.origin)<=joint.radius,`${seed}: ${a.id} crosses ${b.id} outside its junction`);
    }
  }
});
test('Foliage layers within a visual budget, grows on shoots, and retains larger lower leaves',()=>{
  const a=compose('MITHILA-014'),motifs=a.nodes.filter(n=>n.habitat==='canopy');
  let layered=0;
  for(let i=0;i<motifs.length;i++)for(let j=i+1;j<motifs.length;j++){
    const amount=overlapFraction(motifs[i].footprint,motifs[j].footprint);
    assert.ok(amount<=layeringLimit(motifs[i].kind,motifs[j].kind,a.settings.motifSpacing)+.00001);if(amount>.02)layered++;
  }
  assert.ok(layered>15,'Deliberate layering must survive the spacing planner');
  const leaves=motifs.filter(n=>n.kind==='leaf'),lower=leaves.filter(n=>n.y>510),upper=leaves.filter(n=>n.y<380);
  assert.ok(leaves.length>100,'The mature canopy should retain visual mass');
  assert.ok(leaves.filter(n=>a.nodes.find(b=>b.id===n.parent).order>1).length>leaves.length*.6);
  const mean=ns=>ns.reduce((a,n)=>a+n.scale,0)/ns.length;assert.ok(lower.length&&upper.length);assert.ok(mean(lower)>mean(upper)+.1);
  assert.deepEqual(getPalette({palette:'seed',seed:'RIVER'}),getPalette({palette:'seed',seed:'RIVER'}));
  assert.notDeepEqual(getPalette({palette:'seed',seed:'RIVER'}),getPalette({palette:'seed',seed:'LOTUS'}));
});
test('Stored custom settings cannot override seed identity, and the UI has no artistic parameter inputs',()=>{
  const v=sanitize({seed:'A'.repeat(100),time:-5,settings:{speed:99,density:2,palette:'custom'},motionTime:-10});
  assert.equal(v.seed.length,64);assert.equal(v.time,0);assert.equal(v.motionTime,0);assert.deepEqual(v.settings,deriveIdentity(v.seed).settings);
  assert.equal(Object.hasOwn(session(v),'settings'),false);
  const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(!/type="(?:range|color)"/.test(html));assert.ok(!html.includes('data-palette='));assert.ok(html.includes('id="seed"')&&html.includes('id="motion-button"'));
});
test('Independent seed streams reproduce identities without consuming each other',()=>{
  const before=deriveIdentity('STREAMS'),c=seedStream('STREAMS','composition');for(let i=0;i<10000;i++)c();
  assert.deepEqual(before,deriveIdentity('STREAMS'));
  const vectors=['composition','palette','motifs','animation'].map(k=>{const r=seedStream('STREAMS',k);return Array.from({length:8},()=>r());});assert.equal(new Set(vectors.map(JSON.stringify)).size,4);
});
test('Palette systems include dark, pale, monochrome, limited and richly colored paintings with readable details',()=>{
  const palettes=samples.map(m=>m.identity.palette);assert.ok(palettes.filter(p=>p.dark).length>=6);assert.ok(palettes.filter(p=>!p.dark).length>=6);
  assert.equal(new Set(palettes.map(p=>p.mode)).size,3);assert.ok(new Set(palettes.map(p=>p.paper)).size>=18);
  for(const p of palettes){assert.ok(contrast(p.paper,p.ink)>=5);for(const k of Object.keys(p.roles))assert.ok(contrast(p.roles[k],p.details[k])>=4);}
  assert.deepEqual(seedPalette('PIGMENT'),seedPalette('PIGMENT'));
});
test('Lotus, peacock and fish construction genuinely varies across seeds',()=>{
  for(const kind of ['lotus','peacock','fish']){
    const geometry=samples.map(m=>{const n=m.nodes.find(n=>n.kind===kind&&(kind!=='lotus'||n.habitat==='land'));return [...motif(kind,'same-id',n.variant,m.settings).matchAll(/ d="([^"]+)"/g)].map(x=>x[1]).join('|');});
    assert.equal(new Set(geometry).size,24,kind+' must have unique constructed paths');
  }
  const traits=kind=>samples.map(m=>motifTraits(m.seed,kind,m.nodes.find(n=>n.kind===kind&&(kind!=='lotus'||n.habitat==='land')).variant));
  assert.ok(new Set(traits('lotus').map(p=>p.petals)).size>=3);assert.equal(new Set(traits('peacock').map(p=>p.train)).size,2);assert.equal(new Set(traits('fish').map(p=>p.tailType)).size,3);assert.equal(new Set(traits('fish').map(p=>p.pattern)).size,4);
});
test('Hierarchical motion is deterministic, bounded and attached to the deformed supporting branch',()=>{
  const representatives=[...new Map(samples.map(m=>[m.identity.recipe,m])).values()];
  for(const model of representatives){
    const rig=buildMotionRig(model);assert.deepEqual(sampleMotion(rig,19),sampleMotion(rig,19));
    const original=JSON.stringify(model.nodes);
    for(const time of [0,5,19,37,86400]){
      const pose=sampleMotion(rig,time),next=sampleMotion(rig,time+.04);
      for(const n of model.nodes){
        if(n.kind==='branch'){
          const p=pose.branches.get(n.id);assert.ok(p.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));
          if(n.parent&&n.role!=='root')assert.ok(distance(p.points[0],cubic(pose.branches.get(n.parent).points,n.attachmentT))<1e-7);
          assert.ok(Math.max(...p.points.map((v,i)=>distance(v,n.points[i])))<(n.order===0?.5:18));
          assert.ok(Math.max(...p.points.map((v,i)=>distance(v,next.branches.get(n.id).points[i])))<.3);
        }else{
          const p=pose.motifs.get(n.id);assert.ok(Object.values(p).every(Number.isFinite));
          if(n.habitat==='canopy'){const base=cubic(pose.branches.get(n.parent).points,n.attachmentT);assert.ok(distance(p,base)<.25);}
          if(n.kind==='peacock'){assert.ok(Math.abs(p.head)<1.2&&Math.abs(p.tail)<.7&&p.blink>=.05&&p.blink<=1);}
          if(n.kind==='fish')assert.ok(Math.abs(p.x-n.x)<=3.41);
        }
      }
    }
    assert.equal(JSON.stringify(model.nodes),original);
    const pose=sampleMotion(rig,25),leafAngles=model.nodes.filter(n=>n.kind==='leaf').map(n=>pose.motifs.get(n.id).angle-n.angle);assert.ok(new Set(leafAngles.map(v=>v.toFixed(2))).size>20);
  }
});
test('Wind remains perceptible in fitted canopy silhouettes across branching recipes',()=>{
  const representatives=[...new Map(samples.map(m=>[m.identity.recipe,m])).values()];
  for(const model of representatives){
    const rig=buildMotionRig(model),poses=[7,10,13,16,19].map(t=>sampleMotion(rig,t));
    const travel=model.nodes.filter(n=>n.kind==='leaf'&&n.habitat==='canopy').map(n=>{
      const tips=poses.map(p=>{const m=p.motifs.get(n.id),a=m.angle*Math.PI/180,length=65*n.scale;return {x:m.x+Math.sin(a)*length,y:m.y-Math.cos(a)*length};});
      return Math.max(...tips.flatMap((p,i)=>tips.slice(i+1).map(q=>distance(p,q))))*.614;
    }).sort((a,b)=>a-b);
    assert.ok(travel[Math.floor(travel.length/2)]>1,model.seed+' must move leaf silhouettes by more than a subpixel at 614px');
    assert.ok(travel.at(-1)<15,'Wind must remain a restrained movement of the painting');
  }
});
