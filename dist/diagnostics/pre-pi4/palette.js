import {random,mix,clamp} from './random.js';

// Pigment families establish relationships first; small shared hue shifts create
// continuous variation without independently randomizing every color role.
const FAMILIES=[
 ['Midnight marigold','#142338','#eee3c3',['#d89742','#ad665d','#8eb6b0']],
 ['Wine and shell','#421e34','#f0ddc8',['#d39b76','#ce6875','#b4b391']],
 ['Forest copper','#153934','#e9ddbc',['#bd795b','#a7b27b','#e1b56e']],
 ['Charcoal festival','#24252a','#eee6d8',['#d67952','#bdafb7','#a8bbb3']],
 ['Aubergine gold','#30243e','#e6d9c5',['#cdb05a','#a4819d','#d78370']],
 ['Petrol and coral','#163d4a','#ede3c9',['#d67e65','#b9a765','#94b5bb']],
 ['Lacquer garden','#862e36','#ffe8bd',['#e3b452','#e9c8aa','#91b9ba']],
 ['Deep lapis','#222b68','#ece4c4',['#e1ab4d','#c67c86','#a1c7be']],
 ['Madder on rose','#e8c8c6','#452c38',['#9e4a59','#ad744d','#747893']],
 ['Lapis on milk','#e8e8e4','#2c3b62',['#637ead','#bd5a44','#b39a56']],
 ['Saffron paper','#ecd699','#58362d',['#b15744','#787086','#8c923e']],
 ['Mist and mulberry','#d8d8d2','#3e3346',['#8c637c','#9d7961','#637f82']],
 ['Celadon bloom','#c4d9cf','#2c4843',['#b26372','#9a893f','#626c9b']],
 ['Terracotta dusk','#a3503e','#fff0cd',['#e5b76a','#d6b5a2','#9ab3bd']],
 ['Ochre and indigo','#cfa849','#272f48',['#664878','#a64843','#375c65']],
 ['Ink on bone','#eee7d8','#302c32',['#a85145','#b58e45','#6f7b87']],
 ['Silver on soot','#1c2024','#e7dfcd',['#be9371','#9c9fab','#9aa79e']],
 ['Vermilion vellum','#efddc4','#8b342e',['#c58955','#8a7184','#89794c']]
];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hex=values=>'#'+values.map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
export const blendColor=(a,b,t)=>hex(rgb(a).map((v,i)=>mix(v,rgb(b)[i],t)));
export function luminance(color){const [r,g,b]=rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function detailColor(fill,ink,paper){
  if(contrast(fill,ink)>=5)return ink;
  return [ink,paper,'#141119','#fff5df'].sort((a,b)=>contrast(b,fill)-contrast(a,fill))[0];
}
export function seedPalette(seed){
  const r=random(seed+':palette'),family=FAMILIES[Math.floor(r()*FAMILIES.length)],modeRoll=r();
  const mode=modeRoll<.23?'monochrome':modeRoll<.53?'limited':'rich';
  const shift=[(r()-.5)*12,(r()-.5)*12,(r()-.5)*12],tint=c=>hex(rgb(c).map((v,i)=>v+shift[i]));
  let paper=tint(family[1]);
  let ink=tint(family[2]);if(contrast(ink,paper)<5)ink=detailColor(paper,ink,paper);
  // Midtone papers need a slight value adjustment, rather than sacrificing
  // fine contour readability. Their hue and coordinated pigments are retained.
  for(let i=0;i<8&&contrast(ink,paper)<5;i++)paper=blendColor(paper,luminance(ink)>luminance(paper)?'#10121b':'#fff5df',.065);
  const dark=luminance(paper)<.18;
  const pigments=family[3].map(tint),muted=mode==='limited';
  const colors=mode==='monochrome'?[paper,paper,paper]:muted?[pigments[0],blendColor(paper,pigments[0],.26),blendColor(paper,pigments[2],.42)]:pigments;
  const branch=blendColor(paper,mode==='monochrome'?ink:pigments[1],mode==='monochrome'?.045:dark?.13:.1);
  return {name:family[0],mode,dark,paper,ink,colors,branch,border:mode==='rich'?blendColor(ink,pigments[1],.2):ink,
    roles:{leaf:colors[2],flower:colors[0],lotus:colors[0],fruit:colors[0],bud:colors[1],bird:colors[2],peacock:colors[2],fish:colors[1]},
    details:Object.fromEntries(['leaf','flower','lotus','fruit','bud','bird','peacock','fish'].map((k,i)=>{const fill=colors[[2,0,0,0,1,2,2,1][i]];return [k,detailColor(fill,ink,paper)];}))};
}
