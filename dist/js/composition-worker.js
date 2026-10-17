import {compose} from './composition.js';
self.onmessage=({data})=>{
  try{self.postMessage({model:compose(data.seed)});}catch(error){self.postMessage({error:error.message});}
};
