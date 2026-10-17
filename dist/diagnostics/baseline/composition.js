import {random,cubic,tangent,clamp,distance,hash} from './random.js';
import {deriveIdentity,GENERATOR_VERSION} from './identity.js';
import {motifTraits} from './motif-families.js';
import {createSkeleton,establishedAt} from './branching.js';
import {footprint,overlapFraction,layeringLimit,insetFootprint,polygonsOverlap,clearOfBranches,inFrame} from './placement.js';
export const DEFAULT_SETTINGS={speed:1,branching:.58,density:.66,complexity:.72,palette:'kachni',wind:.22,randomness:.38,border:true,architecture:'mixed',secondaryArchitecture:'mixed',terminalArchitecture:'lateral',angleVariation:.45,internode:.55,apicalDominance:.72,growthBehavior:'leader',symmetry:.76,motifSpacing:.7};
export function compose(seed){
  const identity=deriveIdentity(seed);seed=identity.seed;
  const opt={...DEFAULT_SETTINGS,...identity.settings},r=random(seed+':composition:ornament'),skeleton=createSkeleton(seed,opt);
  const nodes=[...skeleton.branches],occupied=[],children=new Map();
  const obstacles=skeleton.branches.map(b=>({...b,samples:Array.from({length:17},(_,i)=>cubic(b.points,i/16))}));
  for(const b of skeleton.branches)if(b.parent)children.set(b.parent,(children.get(b.parent)||0)+1);
  const vary=amount=>(r()-.5)*amount*(.25+opt.randomness*.75);
  const add=n=>{n.id='m'+(nodes.length-skeleton.branches.length);n.variant=hash(seed+':motifs:'+n.kind+':'+(n.parent||'ground')+':'+(n.attachmentT??n.x));nodes.push(n);return n;};
  function place(kind,branch,t,angle,scale,{priority=0,facing=1,variant}={}){
    const variantId=hash(seed+':motifs:'+kind+':'+branch.id+':'+t);
    const p=cubic(branch.points,t),tune={...opt.motifs?.[kind],family:kind==='lotus'?motifTraits(seed,kind,variantId):null},polygon=footprint(kind,p.x,p.y,angle,scale,facing,1+opt.motifSpacing*2,tune);
    if(!inFrame(polygon)||!clearOfBranches(polygon,obstacles,branch.id))return false;
    let cover=0;
    for(const o of occupied){
      const overlap=overlapFraction(o.polygon,polygon);cover+=overlap;
      if(overlap>layeringLimit(kind,o.kind,opt.motifSpacing))return false;
      if(o.kind==='bird'&&polygonsOverlap(o.core,polygon))return false;
    }
    if(cover>.72-opt.motifSpacing*.22)return false;
    occupied.push({polygon,kind,core:kind==='bird'?insetFootprint(polygon,.62):null});
    return add({kind,x:p.x,y:p.y,angle,scale,birth:establishedAt(branch,t)+2+priority,duration:kind==='bird'?14:kind==='flower'||kind==='lotus'?10:8*(.8+scale*.3),parent:branch.id,attachmentT:t,footprint:polygon,facing,habitat:'canopy',variant});
  }
  const boughs=skeleton.branches.filter(n=>n.role==='bough'),trunk=skeleton.branches[0];
  // Perches are focal anchors. Foliage is distributed around their reserved envelopes.
  for(const side of [-1,1]){
    const candidates=boughs.filter(b=>Math.sign(cubic(b.points,.7).x-500)===side).sort((a,b)=>Math.abs(cubic(a.points,.7).y-482)-Math.abs(cubic(b.points,.7).y-482));
    let found=false;for(const b of candidates){for(const t of [.61,.74,.88])if(place('bird',b,t,0,.72,{priority:10,facing:-side})){found=true;break;}if(found)break;}
  }
  // Axillary children do not consume the parent's terminal bud.
  const terminals=skeleton.branches.filter(b=>b.role!=='root'&&b.order>0&&!skeleton.branches.some(c=>c.parent===b.id&&c.attachmentT>.975));
  if(!children.has(trunk.id)||trunk.points[3].y<250)place('bud',trunk,1,0,.64,{priority:6});
  // Flower accents are planned against three canopy regions, not sprinkled uniformly.
  for(const [index,target] of [{x:275,y:468},{x:725,y:468},{x:500,y:190},{x:350,y:276},{x:650,y:276}].entries()){
    const candidates=[...terminals].sort((a,b)=>distance(a.points[3],target)-distance(b.points[3],target));
    for(const b of candidates){if(place(index<3?'lotus':'flower',b,1,0,index<3?.65:.72,{priority:8}))break;}
  }
  for(const b of boughs.filter(b=>cubic(b.points,.66).y>430).filter((b,i)=>i%3===0))place('fruit',b,.72,176+vary(18),.72,{priority:12});
  // Terminal buds take precedence over nearby foliage, so tips read as living growth.
  for(const b of [...terminals].sort((a,b)=>b.order-a.order)){
    const v=tangent(b.points,1),angle=clamp(Math.atan2(v.x,-v.y)*180/Math.PI,-60,60);
    const tipKind=b.role==='spur'?'leaf':b.order>1&&r()>1-opt.floralAbundance?'flower':'bud';
    if(!place(tipKind,b,1,angle,tipKind==='flower'?.68:.58,{priority:6}))place('leaf',b,1,angle,.55,{priority:5});
  }
  // Leaf-bearing axes develop unequal internodes and alternating pairs. Boughs
  // carry broad mature leaves near their lower axils; fine shoots carry clusters.
  for(const b of [...skeleton.branches].sort((a,b)=>b.order-a.order)){
    if(b.role==='root'||b.role==='trunk')continue;
    const length=distance(b.points[0],b.points[3]);
    const count=b.order===1?2+Math.round(opt.density*3):clamp(Math.round(length/(34-opt.density*15)),2,7);
    const phase=r(),family=Math.floor(r()*3)*3;
    for(let j=0;j<count;j++){
      const t=clamp(.19+(j+.4)/(count+.2)*.76+Math.sin(j*1.9+phase*6)*.044,.2,.97),p=cubic(b.points,t),v=tangent(b.points,t),side=Math.sign(p.x-500)||1;
      const base=Math.atan2(v.x,-v.y)*180/Math.PI;
      const matureSize=(.63+clamp((p.y-210)/530,0,1)*.42)*(opt.leafScale||1);
      const paired=b.order>1&&j%3!==1&&opt.density>.28;
      for(const leafSide of paired?[-1,1]:[j%2?-1:1]){
        const attachment=clamp(t+(leafSide===-1?.025:-.009),.15,.99);
        const angle=clamp(base+leafSide*(47+phase*17)+vary(16),-133,133),scale=matureSize*(b.order>1?.88:1)*(j===count-1?.83:1)*(1+vary(.12));
        for(const adjust of [0,13,-15])if(place('leaf',b,attachment,angle+adjust,scale,{variant:family+j%3,priority:j*.45}))break;
      }
    }
    if(!children.has(b.id)){
      const tip=clamp(Math.atan2(tangent(b.points,1).x,-tangent(b.points,1).y)*180/Math.PI,-65,65);
      place(b.order>1&&r()>.55?'flower':'bud',b,1,tip,.64,{priority:5});
      if(b.grammar==='fan')for(const turn of [-32,32])place('leaf',b,.95,tip+turn,.56,{priority:4,variant:family});
    }
  }
  // Only open pockets of the leader receive accent leaves.
  for(let i=0;i<11;i++){
    const t=.14+i*.069,side=i%2?-1:1,p=cubic(trunk.points,t);place(i%5===3?'bud':'leaf',trunk,t,side*(47+i%3*9),.6+clamp((p.y-200)/550,0,1)*.33,{priority:3});
  }
  // Aquatic forms belong beneath the roots, within a small river register.
  for(const side of [-1,1])add({kind:'fish',x:500+side*(94+r()*35),y:912+r()*5,angle:vary(9),scale:.43+r()*.13,birth:trunk.duration+48,duration:12,parent:trunk.id,facing:r()<.62?-side:side,habitat:'water'});
  const groundSide=opt.groundSide||1,peacockX=500+groundSide*238,lotusX=500-groundSide*238;
  add({kind:'peacock',x:peacockX,y:879,angle:vary(3),scale:opt.groundScale||.94,birth:trunk.duration+35,duration:18,parent:trunk.id,facing:-groundSide,habitat:'land'});
  add({kind:'lotus',x:lotusX,y:873,angle:vary(8),scale:.83+r()*.19,birth:trunk.duration+31,duration:12,parent:trunk.id,facing:1,habitat:'land'});
  for(const [i,offset] of [-31,-16,18,33].entries())add({kind:'leaf',x:lotusX+offset,y:883+Math.sin(i)*3,angle:i%2?-46:38,scale:.42+r()*.1,birth:trunk.duration+29+i,duration:10,parent:trunk.id,habitat:'land'});
  const maturity=Math.max(...nodes.map(n=>n.birth+n.duration*(n.kind==='branch'?1.5:2.15)));
  opt.speed=maturity/opt.growthSeconds;
  return {version:GENERATOR_VERSION,seed:String(seed),identity,nodes,settings:opt,maturity,capacity:nodes.filter(n=>n.kind!=='branch').length,borderSeed:String(seed),architecture:skeleton.architecture};
}
export function inspectComposition(model){
  const branches=model.nodes.filter(n=>n.kind==='branch');
  return {nodes:model.nodes.length,motifs:model.capacity,branches:branches.length,maturity:model.maturity,orders:[...new Set(branches.map(b=>b.order))],grammars:[...new Set(branches.map(b=>b.grammar))],bounds:model.nodes.filter(n=>n.kind!=='branch').every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y))};
}
