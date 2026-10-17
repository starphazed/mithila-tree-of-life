import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compose} from '../dist/js/composition.js';
import {completeSVG} from '../dist/js/snapshot.js';
import {motif} from '../dist/js/grammar.js';
import {motifTraits} from '../dist/js/motif-families.js';
import {contrast} from '../dist/js/palette.js';
const output=path.resolve('artifacts/seed-validation');await fs.mkdir(output,{recursive:true});
const sharpModule=process.env.MITHILA_SHARP_MODULE;
const sharp=sharpModule?(await import(pathToFileURL(sharpModule).href)).default:null;
const models=[],records=[];
for(let i=1;i<=24;i++){
  const seed='MITHILA-'+String(i).padStart(3,'0'),model=compose(seed),p=model.identity.palette;models.push(model);
  const traits=Object.fromEntries(['lotus','peacock','fish'].map(k=>[k,motifTraits(seed,k,model.nodes.find(n=>n.kind===k&& (k!=='lotus'||n.habitat==='land')).variant)]));
  records.push({seed,recipe:model.identity.recipe,palette:p.name,mode:p.mode,dark:p.dark,contrast:+contrast(p.ink,p.paper).toFixed(2),motifs:model.capacity,branches:model.nodes.filter(n=>n.kind==='branch').length,traits});
  const svg=completeSVG(model);await fs.writeFile(path.join(output,seed+'.svg'),svg);
  if(sharp)await sharp(Buffer.from(svg)).resize(700,700).png().toFile(path.join(output,seed+'.png'));
}
await fs.writeFile(path.join(output,'validation.json'),JSON.stringify({version:4,records},null,2));
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
if(sharp){
  const composites=[];for(let i=0;i<models.length;i++){
    const {seed,palette,recipe,mode}=records[i],svg=`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="47"><rect width="440" height="47" fill="#eeeee6"/><text x="12" y="19" font-family="Georgia" font-size="14" fill="#34392d">${xml(seed)} · ${xml(palette)}</text><text x="12" y="37" font-family="Arial" font-size="10" fill="#707367">${xml(recipe)} / ${mode}</text></svg>`;
    composites.push({input:await sharp(path.join(output,seed+'.png')).resize(440,440).toBuffer(),left:i%6*460+10,top:Math.floor(i/6)*500+10});
    composites.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:i%6*460+10,top:Math.floor(i/6)*500+450});
  }
  await sharp({create:{width:2760,height:2000,channels:4,background:'#eeeee6'}}).composite(composites).png().toFile(path.join(output,'contact-sheet-24.png'));
  const specimens=[];
  for(let i=0;i<12;i++){
    const model=models[i*2],p=model.identity.palette;let content=`<rect width="600" height="230" fill="${p.paper}"/><text x="14" y="22" font-family="Georgia" font-size="14" fill="${p.ink}">${model.seed} · ${xml(p.name)}</text>`;
    for(const [j,kind] of ['lotus','peacock','fish'].entries()){
      const n=model.nodes.find(n=>n.kind===kind&&(kind!=='lotus'||n.habitat==='land')),b=motifTraits(model.seed,kind,n.variant).bounds;
      content+=`<svg x="${j*200+6}" y="37" width="185" height="160" viewBox="${b[0]-8} ${b[1]-8} ${b[2]-b[0]+16} ${b[3]-b[1]+16}">${motif(kind,kind,n.variant,model.settings)}</svg><text x="${j*200+90}" y="215" font-family="Arial" text-anchor="middle" font-size="10" fill="${p.ink}">${kind}</text>`;
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="230">${content}</svg>`;
    specimens.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:i%3*612+6,top:Math.floor(i/3)*242+6});
  }
  await sharp({create:{width:1836,height:968,channels:4,background:'#eeeee6'}}).composite(specimens).png().toFile(path.join(output,'motif-family-comparison.png'));
}
console.log(JSON.stringify({seeds:24,recipes:[...new Set(records.map(r=>r.recipe))],dark:records.filter(r=>r.dark).length,monochrome:records.filter(r=>r.mode==='monochrome').length,limited:records.filter(r=>r.mode==='limited').length,rich:records.filter(r=>r.mode==='rich').length,paletteFamilies:new Set(records.map(r=>r.palette)).size,motifRange:[Math.min(...records.map(r=>r.motifs)),Math.max(...records.map(r=>r.motifs))],output},null,2));
