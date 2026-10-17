import {random,cubic,tangent,smooth,clamp} from './random.js';
const degrees=v=>Math.atan2(v.y,v.x)*180/Math.PI;
const angleDifference=(a,b)=>((a-b+540)%360)-180;
const rotate=(p,origin,dest,angle)=>{const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=p.x-origin.x,y=p.y-origin.y;return {x:dest.x+x*c-y*s,y:dest.y+x*s+y*c};};
export function buildMotionRig(model){
  const descriptors=new Map(model.nodes.map(n=>{
    const r=random(model.seed+':animation:'+n.kind+':'+n.id);
    return [n.id,{phase:r()*Math.PI*2,response:.7+r()*.6,delay:(n.order||0)*(.45+r()*.35),flutter:.85+r()*.85,blinkPeriod:8+r()*8,blinkPhase:2+r()*6}];
  }));
  const nodesById=new Map(model.nodes.map(n=>[n.id,n]));
  const attachmentAngles=new Map(model.nodes.filter(n=>Number.isFinite(n.attachmentT)).map(n=>[n.id,degrees(tangent(nodesById.get(n.parent).points,n.attachmentT))]));
  return {model,weather:model.settings.weather,descriptors,nodesById,attachmentAngles};
}
export function windField(weather,seconds,x,y,delay=0){
  const t=Math.max(0,seconds-delay),spatial=(x-500)*weather.spatialScale*weather.direction+(y-500)*weather.spatialScale*.36;
  const gust=(Math.sin(t*2*Math.PI/weather.gustPeriod+weather.phase)+1)*.5;
  const flow=.22+Math.sin(t*weather.rhythm+weather.phase+spatial)*(.27+gust*.2)+Math.sin(t*weather.rhythm*.617+spatial*1.7)*.17;
  return flow*weather.direction*weather.intensity*smooth(clamp(seconds/4,0,1));
}
export function sampleMotion(rig,seconds){
  seconds=Math.max(0,seconds);const {model,weather,descriptors,attachmentAngles}=rig,branches=new Map(),motifs=new Map();
  for(const n of model.nodes){
    if(n.kind!=='branch')continue;
    const d=descriptors.get(n.id),parent=branches.get(n.parent),origin=n.points[0];
    if(n.role==='root'){branches.set(n.id,{points:n.points,angle:0,origin,rigid:true,matrix:[1,0,0,1,0,0]});continue;}
    const dest=parent?cubic(parent.points,n.attachmentT):origin;
    const inherited=parent?angleDifference(degrees(tangent(parent.points,n.attachmentT)),attachmentAngles.get(n.id)):0;
    const field=windField(weather,seconds,origin.x,origin.y,d.delay),flex=n.order===0?.075:n.order===1?.75:n.order===2?2.2:3.6;
    const angle=field*flex*d.response,rigid=n.order>1;
    const points=n.points.map((p,i)=>rotate(p,origin,dest,inherited+angle*(rigid?1:[0,.17,.66,1][i])));
    const a=(inherited+angle)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    branches.set(n.id,{points,angle:inherited+angle,origin:dest,rigid,matrix:[c,s,-s,c,dest.x-c*origin.x+s*origin.y,dest.y-s*origin.x-c*origin.y]});
  }
  const fade=smooth(clamp(seconds/4,0,1));
  for(const n of model.nodes){
    if(n.kind==='branch')continue;
    const d=descriptors.get(n.id),parent=branches.get(n.parent),attached=n.habitat==='canopy'&&Number.isFinite(n.attachmentT);
    const dest=attached?cubic(parent.points,n.attachmentT):{x:n.x,y:n.y};
    const inherited=attached?angleDifference(degrees(tangent(parent.points,n.attachmentT)),attachmentAngles.get(n.id)):0;
    const flow=windField(weather,seconds,n.x,n.y,d.delay),flutter=(Math.sin(seconds*d.flutter*weather.flutter+d.phase)+Math.sin(seconds*d.flutter*.47+d.phase*.61)*.3)*fade;
    let angle=n.angle+inherited,twist=1,x=dest.x,y=dest.y,head=0,tail=0,fin=0,corolla=0,blink=1;
    if(n.kind==='leaf'){const exposure=.4+.6*Math.abs(Math.cos(angle*Math.PI/180));angle+=(flow*2.5+flutter*weather.intensity*1.65*(n.habitat==='land'?.4:1))*exposure;twist+=flutter*.014*exposure;}
    else if(n.kind==='flower'||n.kind==='bud'||n.kind==='fruit'){angle+=flow*(n.kind==='fruit'?.32:.65)/Math.max(.7,n.scale**1.1);y+=flutter*.18*weather.intensity;}
    else if(n.kind==='lotus'){corolla=flow*(n.habitat==='land'?.34:.7)/Math.max(.65,n.scale**1.35);angle+=corolla*.3;}
    else if(n.kind==='bird'){angle+=flow*.28;}
    else if(n.kind==='peacock'){
      head=(Math.sin(seconds*.16*d.response+d.phase)*.9+flow*.6)*fade;tail=(Math.sin(seconds*.08*d.flutter+d.phase*.8)*.42+flow*.4)*fade;
      const cycle=(seconds+d.blinkPhase)%d.blinkPeriod;blink=cycle<.22?1-.94*Math.sin(cycle/.22*Math.PI)**2:1;
    }else if(n.kind==='fish'){
      x+=Math.sin(seconds*.11*d.response+d.phase)*(2.4+d.response*.7)*fade;y+=Math.sin(seconds*.15*d.response+d.phase*.6)*.55*fade;
      angle+=Math.sin(seconds*.17*d.response+d.phase)*.7*fade;tail=Math.sin(seconds*.65*d.flutter+d.phase)*2.5*fade;fin=Math.sin(seconds*.43*d.flutter+d.phase)*1.3*fade;
    }
    motifs.set(n.id,{x,y,angle,twist,head,tail,fin,corolla,blink});
  }
  return {branches,motifs};
}
export function inversePosePoint(point,pose){const [a,b,c,d,e,f]=pose.matrix,x=point.x-e,y=point.y-f;return {x:a*x+b*y,y:c*x+d*y};}
