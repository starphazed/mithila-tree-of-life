const NS='http://www.w3.org/2000/svg';
// Split at anatomical joints while preserving painter order, shared clipping,
// inherited paint and nested motion (for example, an eyelid within a head).
export function spriteLayers(body,parts){
  if(!parts?.length)return [{markup:new XMLSerializer().serializeToString(body),chain:[]}];
  const byElement=new Map(parts.map(p=>[p.el,p])),layers=[];
  const defs='<defs>'+[...body.querySelectorAll('defs')].map(d=>d.innerHTML).join('')+'</defs>';
  const descriptor=p=>{
    const holder=document.createElementNS(NS,'g');holder.setAttribute('transform',p.base);
    let matrix=new DOMMatrix();for(let i=0;i<holder.transform.baseVal.numberOfItems;i++)matrix=matrix.multiply(holder.transform.baseVal.getItem(i).matrix);
    return {part:p.part,pivot:p.pivot.split(' ').map(Number),base:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f]};
  };
  function visit(parent,ancestors,chain){
    let run=[];
    const flush=()=>{
      if(!run.length)return;
      let fragment=document.createDocumentFragment();
      for(const el of run){const clone=el.cloneNode(true);clone.querySelectorAll?.('defs').forEach(d=>d.remove());fragment.append(clone);}
      for(const ancestor of [...ancestors].reverse()){
        const wrapper=ancestor.cloneNode(false);if(byElement.has(ancestor))wrapper.removeAttribute('transform');wrapper.append(fragment);fragment=wrapper;
      }
      layers.push({markup:defs+new XMLSerializer().serializeToString(fragment),chain});run=[];
    };
    for(const child of parent.children){
      if(child.tagName.toLowerCase()==='defs')continue;
      if(byElement.has(child)||child.querySelector('[data-part]')){
        flush();const part=byElement.get(child);visit(child,[...ancestors,child],part?[...chain,descriptor(part)]:chain);
      }else run.push(child);
    }flush();
  }
  visit(body,[body],[]);return layers;
}
