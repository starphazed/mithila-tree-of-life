import {random,mix,hash} from './random.js';
import {seedPalette} from './palette.js';
import {borderIdentity} from './borders.js';

export const GENERATOR_VERSION=4;
export function seedStream(seed,system){return random(String(seed)+':'+system);}
const RECIPES=[
 {name:'Spreading garden',architecture:'mixed',shape:'wide',branching:.75,density:.85,internode:.46,dominance:.6,balance:.62},
 {name:'Rising grove',architecture:'lateral',shape:'tall',branching:.62,density:.78,internode:.63,dominance:.8,balance:.48},
 {name:'Candelabra',architecture:'tiered',shape:'oval',branching:.72,density:.84,internode:.48,dominance:.72,balance:.75},
 {name:'Forked crown',architecture:'bifurcating',shape:'vase',branching:.84,density:.92,internode:.4,dominance:.48,balance:.57},
 {name:'Unfolding fan',architecture:'fan',shape:'round',branching:.8,density:.91,internode:.4,dominance:.45,balance:.65},
 {name:'Wandering boughs',architecture:'mixed',shape:'leaning',branching:.64,density:.83,internode:.57,dominance:.68,balance:.4}
];
export function deriveIdentity(seed){
  seed=String(seed).trim().slice(0,64)||'MITHILA-014';
  const c=seedStream(seed,'composition'),m=seedStream(seed,'motifs'),a=seedStream(seed,'animation');
  const recipe=RECIPES[Math.floor(c()*RECIPES.length)],v=(base,range)=>base+(c()-.5)*range;
  const lushness=c(),lean=(c()-.5)*(recipe.shape==='leaning'?110:38),artPalette=seedPalette(seed);
  const motifs=Object.fromEntries(['leaf','flower','bud','fruit','bird','lotus','fish','peacock'].map(kind=>[kind,{width:.86+m()*.3,curve:.83+m()*.33,spacing:.72+m()*.29}]));
  const weather={intensity:.18+a()*.35,direction:a()<.5?-1:1,rhythm:.11+a()*.13,gustPeriod:23+a()*34,
    phase:a()*Math.PI*2,spatialScale:.0025+a()*.003,response:.75+a()*.5,flutter:.7+a()*.8};
  const settings={seed,recipe:recipe.name,canopyShape:recipe.shape,lean,canopyWidth:recipe.shape==='wide'?1.06:recipe.shape==='tall'?.84:recipe.shape==='leaning'?.94:1,
    crownHeight:recipe.shape==='tall'?142:recipe.shape==='wide'?202:171+c()*32,trunkWidth:19+c()*7,
    branching:v(recipe.branching,.14),density:v(recipe.density,.13),internode:v(recipe.internode,.12),apicalDominance:v(recipe.dominance,.14),
    symmetry:v(recipe.balance,.14),angleVariation:.38+c()*.36,randomness:.5+c()*.35,motifSpacing:.42+c()*.2,
    architecture:recipe.architecture,secondaryArchitecture:c()<.68?'mixed':['lateral','fan','tiered'][Math.floor(c()*3)],terminalArchitecture:['lateral','fan','bifurcating'][Math.floor(c()*3)],
    growthBehavior:['leader','balanced','flush'][Math.floor(a()*3)],growthSeconds:10+a()*5,wind:weather.intensity,weather,
    complexity:.78+m()*.2,motifs,palette:'seed',artPalette,border:true,ornaments:true,leafScale:.87+lushness*.2,
    floralAbundance:.18+c()*.25,groundSide:c()<.5?-1:1,groundScale:.78+c()*.25};
  return {version:GENERATOR_VERSION,seed,settings,signature:hash(seed+':identity:v4').toString(36),palette:artPalette,recipe:recipe.name,border:borderIdentity(seed)};
}
