import {random,cubic,tangent,clamp,distance,mix} from './random.js';

export const ARCHITECTURES=['mixed','lateral','bifurcating','fan','tiered'];
export const STRUCTURE_KEYS=['architecture','secondaryArchitecture','terminalArchitecture','branching','angleVariation','internode','apicalDominance','growthBehavior','randomness','symmetry','motifSpacing'];
const radians=degrees=>degrees*Math.PI/180;
const direction=degrees=>({x:Math.sin(radians(degrees)),y:-Math.cos(radians(degrees))});
const heading=v=>Math.atan2(v.x,-v.y)*180/Math.PI;
export function inverseSmooth(t){let lo=0,hi=1;for(let i=0;i<16;i++){const m=(lo+hi)/2;if(m*m*(3-2*m)<t)lo=m;else hi=m;}return (lo+hi)/2;}
export function establishedAt(branch,t){return branch.birth+branch.duration*inverseSmooth(t);}
const pointSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
const turn=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function segmentDistance(a,b,c,d){if(turn(a,b,c)*turn(a,b,d)<0&&turn(c,d,a)*turn(c,d,b)<0)return 0;return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));}

class BranchField {
  constructor(){this.branches=[];}
  add(branch){
    const samples=Array.from({length:25},(_,i)=>cubic(branch.points,i/24));
    const segments=samples.slice(0,-1).map((p,i)=>{const q=samples[i+1];return {minX:Math.min(p.x,q.x),maxX:Math.max(p.x,q.x),minY:Math.min(p.y,q.y),maxY:Math.max(p.y,q.y),width:mix(branch.width,branch.endWidth,i/24)};});
    this.branches.push({branch,samples,segments,minX:Math.min(...samples.map(p=>p.x)),maxX:Math.max(...samples.map(p=>p.x)),minY:Math.min(...samples.map(p=>p.y)),maxY:Math.max(...samples.map(p=>p.y))});
  }
  score(points,width,parent){
    let conflicts=0;
    for(let i=1;i<=24;i++){
      const p=cubic(points,i/24),a=cubic(points,(i-1)/24);
      if(p.x<117||p.x>883||p.y<119||p.y>850)return 100;
      // The canopy has soft oval shoulders, so crowded corners stay open.
      if(p.y<340&&Math.abs(p.x-500)>(295+(p.y-200)*.4))conflicts+=.12;
      const minX=Math.min(a.x,p.x),maxX=Math.max(a.x,p.x),minY=Math.min(a.y,p.y),maxY=Math.max(a.y,p.y);
      for(const other of this.branches){
        if(other.branch.role==='root')continue;
        const sameJunction=other.branch.id===parent?.id||distance(other.branch.points[0],points[0])<3;
        if(sameJunction&&distance(p,points[0])<Math.max(44,parent?.width*3.4||44))continue;
        const candidateWidth=width*(1-i/24*.7);let proximity=0;
        // Conservative broad phase: skip only pairs whose bounding boxes prove
        // they cannot reach the existing clearance threshold. Scores are unchanged.
        const reach=candidateWidth+Math.max(other.branch.width,other.branch.endWidth)+4;
        if(minX>other.maxX+reach||maxX<other.minX-reach||minY>other.maxY+reach||maxY<other.minY-reach)continue;
        for(let k=0;k<24;k++){
          const box=other.segments[k],otherWidth=box.width,clearance=candidateWidth+otherWidth+4;
          if(minX>box.maxX+clearance||maxX<box.minX-clearance||minY>box.maxY+clearance||maxY<box.minY-clearance)continue;
          const separation=segmentDistance(a,p,other.samples[k],other.samples[k+1]);
          // Crossing woody axes are harmful; neighboring contours and fine shoots
          // may approach one another without suppressing an entire canopy sector.
          if(separation<Math.max(.65,(candidateWidth+otherWidth)*.32))return 1000;
          if(separation<clearance)proximity=Math.max(proximity,(1-separation/clearance)*.1);
        }
        conflicts+=proximity;
      }
    }
    return conflicts;
  }
}

// These are different architectures, not one recursive rule with new labels.
// Lateral: alternating axillary buds. Fork: a terminal division. Fan: a whorl.
// Tiered: paired buds at several internodes, with a dominant continuing leader.
export function budGrammar(kind,parent,options,rand){
  const order=parent.order+1,density=options.branching,spread=17+options.angleVariation*27;
  if(kind==='lateral'){
    const count=Math.max(2,Math.round(2+density*3-(options.internode-.5)*2)),buds=[];
    for(let i=0;i<count;i++)buds.push({t:.3+i*.56/(count-1),turn:(i%2?-1:1)*(37+rand()*spread),length:47+(1-i/count)*36,priority:i*.7,continuation:false});
    return buds;
  }
  if(kind==='bifurcating')return [{t:.91,turn:-spread,length:order===2?115:62,priority:0,continuation:true},{t:.91,turn:spread*(.75+rand()*.4),length:order===2?101:55,priority:1.2,continuation:true}];
  if(kind==='fan'){
    const count=3+Math.round(density*2);
    return Array.from({length:count},(_,i)=>({t:.91,turn:mix(-spread*1.55,spread*1.55,i/(count-1)),length:(order===2?99:58)*(1-Math.abs(i-(count-1)/2)/count*.22),priority:Math.abs(i-(count-1)/2),continuation:true}));
  }
  const stations=Math.max(1,1+Math.round(density*2+(.5-options.internode))),buds=[];
  for(let i=0;i<stations;i++)for(const side of [-1,1])buds.push({t:.36+i*.47/Math.max(1,stations-1),turn:side*(45+spread*.4),length:(order===2?73:40)*(1-i/(stations+1)*.28),priority:i+side*.25,continuation:false});
  return buds;
}

export function createSkeleton(seed,options){
  const rand=random(seed+':skeleton'),branches=[],field=new BranchField();
  const vary=amount=>(rand()-.5)*amount*(.25+options.randomness*.75)*(1-(options.symmetry??.72)*.55);
  const arch=options.architecture||'mixed',forked=arch==='bifurcating'||arch==='fan';
  const add=branch=>{branch.id='b'+branches.length;branches.push(branch);field.add(branch);return branch;};
  const lean=options.lean||0,crown=options.crownHeight||177,span=options.canopyWidth||1;
  const trunkEnd=forked?{x:491+lean*.6+vary(24),y:548}:{x:485+lean+vary(31),y:crown};
  const trunk=add({kind:'branch',points:[{x:500,y:851},{x:453+lean*.22+vary(35),y:720},{x:551+lean*.68+vary(45),y:forked?615:379},trunkEnd],width:options.trunkWidth||23,endWidth:forked?11:2.3,birth:0,duration:forked?23:33,order:0,role:'trunk',grammar:arch});
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const t=.035+i*.009,p=cubic(trunk.points,t);
    add({kind:'branch',points:[p,{x:p.x+side*29,y:p.y+19},{x:500+side*(45+i*19),y:837+i*3},{x:500+side*(60+i*24),y:858}],width:4.6-i*.6,endWidth:.7,birth:establishedAt(trunk,t)+1,duration:7,order:1,parent:trunk.id,attachmentT:t,role:'root',grammar:'fan'});
  }
  function addCandidate(parent,{t,angle,length,role='shoot',grammar,priority=0,order=parent.order+1,tipRatio=.22,endpoint}){
    if(branches.length>=85+Math.round(options.branching*32))return null;
    const origin=cubic(parent.points,t),startDir=tangent(parent.points,t);
    const parentWidth=mix(parent.width,parent.endWidth,t),width=parentWidth*(order===1?.63:.61);
    let best=null,bestScore=Infinity;
    const curvature=vary(24);
    for(const [delta,lengthRatio] of [[0,1],[7,1],[-8,1],[14,.83],[-17,.83],[23,.62],[-25,.62],[38,.48],[-39,.48]]){
      const a=clamp(angle+delta,-81,81),v=direction(a),len=length*(role==='bough'?1:lengthRatio);
      const end=endpoint?{x:endpoint.x+delta*.65,y:endpoint.y+Math.abs(delta)*.55}:{x:origin.x+v.x*len,y:origin.y+v.y*len};
      const dx=end.x-origin.x,dy=end.y-origin.y,bend=curvature+delta*.5;
      const points=role==='bough'?
        [origin,{x:origin.x+dx*(.4+curvature*.002),y:origin.y+dy*(.12+curvature*.003)+8},{x:end.x+dx*.07+bend,y:end.y-dy*(.34+curvature*.004)},end]:
        [origin,{x:origin.x+(startDir.x*.55+v.x*.45)*len*.31,y:origin.y+(startDir.y*.55+v.y*.45)*len*.31},
          {x:end.x-v.x*len*.25-v.y*bend,y:end.y-v.y*len*.25+v.x*bend},end];
      const score=field.score(points,width,parent);
      if(score<bestScore){bestScore=score;best={points,angle:a};}if(score<.15)break;
    }
    // A crowded bud remains dormant. It never becomes a crossing just to meet a count.
    if(!best||bestScore>5)return null;
    const budDelay=options.growthBehavior==='balanced'?1.4:options.growthBehavior==='flush'?3:2.5+options.apicalDominance*6;
    const time=establishedAt(parent,t)+budDelay+priority;
    const birth=options.growthBehavior==='flush'?Math.ceil(time/4)*4:time;
    return add({kind:'branch',points:best.points,width,endWidth:Math.max(width*.08,width*tipRatio),birth,duration:Math.max(9,length/13+order*1.5),order,parent:parent.id,attachmentT:t,role,grammar,angle:best.angle,budPriority:priority});
  }
  const primary=[],regionalGrammars=['lateral','bifurcating','fan','tiered'];
  for(let i=regionalGrammars.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[regionalGrammars[i],regionalGrammars[j]]=[regionalGrammars[j],regionalGrammars[i]];}
  if(forked){
    const count=arch==='fan'?3+Math.round(options.branching*2):2;
    for(let i=0;i<count;i++){
      const a=mix(arch==='fan'?-53:-37,arch==='fan'?53:36,i/(count-1))+vary(options.angleVariation*17);
      const b=addCandidate(trunk,{t:.99,angle:a,length:330+vary(46)-Math.abs(a)*.3,role:'bough',grammar:arch,priority:i*.6,tipRatio:arch==='bifurcating'?.48:.36});if(b)primary.push(b);
    }
  }else{
    const count=clamp(6+Math.round(options.branching*2-(options.internode-.5)*1.5)+(rand()<.28?-1:rand()>.72?1:0),5,8),phase=rand()*Math.PI*2;
    for(let i=0;i<count;i++){
      const rank=i/(count-1),y=754-rank*(355+options.internode*40)+Math.sin(phase+i*1.7)*13;
      for(const side of [-1,1]){
        let lo=0,hi=1;const startY=y+(arch==='tiered'?0:side*(10+Math.sin(phase+i)*17)*(1-options.symmetry))+vary(12);
        for(let j=0;j<16;j++){const m=(lo+hi)/2;if(cubic(trunk.points,m).y>startY)lo=m;else hi=m;}
        const t=(lo+hi)/2,origin=cubic(trunk.points,t);
        const reach=(208+164*Math.sin(rank*Math.PI)-86*rank+Math.sin(phase+rank*4)*22)*span;
        const rise=112+109*Math.sin(rank*Math.PI*.8)+side*Math.cos(i+phase)*options.angleVariation*42*(1-options.symmetry);
        const endpoint={x:origin.x+side*(reach+vary(44)),y:Math.max(136,startY-rise+vary(50))};
        const len=distance(origin,endpoint),angle=heading({x:endpoint.x-origin.x,y:endpoint.y-origin.y});
        const b=addCandidate(trunk,{t,angle,length:len,endpoint,role:'bough',grammar:arch==='mixed'?'lateral':arch,priority:rank*(1-options.apicalDominance)*4,tipRatio:.19});if(b){b.side=side;b.tier=i;primary.push(b);}
      }
    }
  }
  // Forked crowns retain lower lateral limbs, then divide into a broad upper
  // scaffold. This gives their architecture comparable visual mass to a leader.
  if(forked){
    for(const t of [.3,.58,.79])for(const side of [-1,1]){
      const p=cubic(trunk.points,t),end={x:p.x+side*(180+t*75)*span,y:p.y-82-t*55};
      const b=addCandidate(trunk,{t,angle:side*64,length:distance(p,end),endpoint:end,role:'bough',grammar:'lateral',tipRatio:.21});if(b)primary.push(b);
    }
    const leaders=primary.slice(0,arch==='fan'?5:2);
    for(const parent of leaders)for(const turn of [-26,27]){
      const b=addCandidate(parent,{t:.84,angle:heading(tangent(parent.points,.84))+turn,length:135+rand()*48,role:'bough',grammar:arch,tipRatio:.22});if(b)primary.push(b);
    }
  }
  // Develop the crown before allocating later shoots, so a dense lower canopy
  // cannot consume the leader's terminal growth budget.
  if(!forked)for(const side of [-1,1])addCandidate(trunk,{t:.88,angle:side*(27+rand()*13),length:126+vary(20),role:'crown',grammar:'bifurcating',tipRatio:.17});
  // Axillary short shoots occupy the inner canopy as well as terminal fans.
  // They follow the established bough locally, then turn into the light.
  for(const [i,parent] of primary.entries())for(let j=0;j<2;j++){
    const t=.28+j*.29+(rand()-.5)*.065,local=heading(tangent(parent.points,t));
    addCandidate(parent,{t,angle:clamp(local*.55+(j%2?-18:23),-76,76),length:43+rand()*24+options.branching*15,role:'spur',grammar:'lateral',priority:3+i%3,tipRatio:.18});
  }
  const secondary=[],secondaryBudget=18+Math.round(options.branching*26);
    const primaryOrder=Array.from({length:primary.length},(_,i)=>i).sort((a,b)=>(a*5%primary.length)-(b*5%primary.length));
  for(const i of primaryOrder){
    if(secondary.length>=secondaryBudget)break;
    const parent=primary[i];
    const selected=options.secondaryArchitecture||'mixed';
    const kind=selected==='mixed'?(arch==='mixed'?regionalGrammars[(parent.tier??i)%4]:arch):selected;
    const base=heading(tangent(parent.points,.75));
    for(const bud of budGrammar(kind,parent,options,rand)){
      const localBase=heading(tangent(parent.points,bud.t));
      const side=Math.sign(parent.points[3].x-500)||1;
      const angle=clamp(localBase*.55+bud.turn*.82*side,-79,79)+vary(options.angleVariation*22);
      const b=addCandidate(parent,{t:bud.t,angle,length:bud.length*(.8+options.internode*.45),grammar:kind,priority:bud.priority,tipRatio:.24});if(b)secondary.push(b);
    }
  }
  // Only selected terminal leaders branch again; apical dominance budgets laterals.
  for(let i=0;i<secondary.length;i++){
    const parent=secondary[i];if(i%2!==0&&options.branching<.82)continue;
    const selected=options.terminalArchitecture||'lateral',kind=selected==='mixed'?['lateral','fan','bifurcating'][i%3]:selected;
    const buds=budGrammar(kind,parent,options,rand).slice(0,options.branching>.72?3:2);
    for(const bud of buds){
      const local=heading(tangent(parent.points,bud.t));
      addCandidate(parent,{t:bud.t,angle:clamp(local*.45+bud.turn,-76,76),length:bud.length*.58,grammar:kind,priority:bud.priority+2,tipRatio:.18});
    }
    if(branches.length>93)break;
  }
  return {branches,trunkId:trunk.id,architecture:arch};
}
