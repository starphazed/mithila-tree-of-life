import test from 'node:test';
import assert from 'node:assert/strict';
import {renderingPolicy,surfaceRatio} from '../dist/js/performance.js';
import {CompositionTask} from '../dist/js/composition-task.js';
import {compose} from '../dist/js/composition.js';
import {compose as previous} from '../dist/diagnostics/pre-pi4/composition.js';

test('Conservative collision bounds preserve complete generator-4 paintings',()=>{
  for(const seed of ['MITHILA-001','MITHILA-003','MITHILA-005','MITHILA-006','MITHILA-007','MITHILA-024'])assert.deepEqual(compose(seed),previous(seed),seed);
});
test('Pi 4 policy bounds screen cost without changing seed identity',()=>{
  const before=compose('MITHILA-005'),pi=renderingPolicy({mode:'pi4',dpr:2,cores:4,memory:4});
  assert.equal(pi.pixelRatio,2);assert.equal(pi.windInterval,50);assert.equal(pi.growthInterval,50);
  assert.equal(surfaceRatio(pi,627,614),2,'A fitted painting must retain native HiDPI sharpness');
  const native=renderingPolicy({mode:'pi4',dpr:1});assert.equal(surfaceRatio(native,1920,1080),1,'A native 1080p Pi does not gain extra pixels');
  const ratio=surfaceRatio(pi,3840,2160);assert.ok(3840*2160*ratio**2<=pi.maxPixels+1);assert.ok(3840*ratio<=pi.maxSurface);
  assert.equal(renderingPolicy({arm:true}).name,'pi4');assert.equal(renderingPolicy({mode:'quality',cores:4,memory:4,dpr:2}).pixelRatio,2);
  assert.deepEqual(compose('MITHILA-005'),before);
});
test('A stale worker response cannot terminate or replace a newer composition request',async()=>{
  const saved=globalThis.Worker,workers=[];
  class WorkerStub{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}}
  globalThis.Worker=WorkerStub;
  try{
    const task=new CompositionTask(),first=task.run('old').catch(e=>e.name),second=task.run('new');
    assert.equal(await first,'AbortError');assert.equal(workers[0].terminated,true);
    workers[0].onmessage({data:{model:{seed:'old'}}});assert.ok(!workers[1].terminated);
    workers[1].onmessage({data:{model:{seed:'new'}}});assert.deepEqual(await second,{seed:'new'});assert.equal(workers[1].terminated,true);
    task.cancel();
  }finally{if(saved===undefined)delete globalThis.Worker;else globalThis.Worker=saved;}
});
test('Composition remains available when module workers are unavailable',async()=>{
  const task=new CompositionTask();assert.deepEqual(await task.run('FALLBACK'),compose('FALLBACK'));task.cancel();
});
