import {compose} from './composition.js';
// Cancel superseded requests; do not leave old seeds queued on a small CPU.
export class CompositionTask{
  constructor(){this.worker=null;this.reject=null;this.version=0;}
  cancel(){this.version++;this.worker?.terminate();this.worker=null;this.reject?.(new DOMException('Superseded seed','AbortError'));this.reject=null;}
  run(seed){
    this.cancel();const version=this.version;
    if(typeof Worker==='undefined')return Promise.resolve().then(()=>compose(seed));
    return new Promise((resolve,reject)=>{
      this.reject=reject;
      const finish=(value,error)=>{if(version!==this.version)return;this.worker?.terminate();this.worker=null;this.reject=null;error?reject(error):resolve(value);};
      try{
        this.worker=new Worker(new URL('./composition-worker.js',import.meta.url),{type:'module'});
        this.worker.onmessage=({data})=>data.error?finish(null,new Error(data.error)):finish(data.model);
        this.worker.onerror=()=>{if(version!==this.version)return;try{finish(compose(seed));}catch(error){finish(null,error);}};
        this.worker.postMessage({seed});
      }catch{try{finish(compose(seed));}catch(error){finish(null,error);}}
    });
  }
}
