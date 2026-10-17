import {smooth} from './random.js';
export function nodeState(node,time){
  const age=time-node.birth;
  if(age<0)return {visible:false,progress:0,detail:0,kind:node.kind,epoch:0,opacity:0};
  return {visible:true,progress:smooth(age/node.duration),detail:smooth((age/node.duration-(node.kind==='branch'?.35:1))/1.15),kind:node.kind,epoch:0,opacity:1};
}
export function stage(time,maturity){return time<14?'Seedling':time<maturity*.68?'Reaching':time<maturity?'Flowering':'Fully drawn';}
