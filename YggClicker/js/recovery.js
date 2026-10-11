(function(root){
 'use strict';
 function seeded(seed){return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};}
 function runLocal(engine,state,seconds,{random=Math.random,offline=true,schedule=fn=>setTimeout(fn,0),now=()=>performance.now(),budget=8,progress=()=>{}}={}){
  const job=engine.advanceSteps(state,seconds,random,false,offline);
  return new Promise((resolve,reject)=>{function pump(){const start=now();try{let step;do{step=job.next();if(step.done){resolve(state);return;}}while(now()-start<budget);progress(step.value);schedule(pump);}catch(e){reject(e);}}schedule(pump);});
 }
 function run(engine,state,seconds,{offline=true,progress=()=>{},workerFactory=()=>new Worker('./js/recovery-worker.js'),seed,random}={}){
  // Keep an untouched snapshot for a deterministic retry after worker failure.
  const snapshot=structuredClone(state);seed??=root.crypto?.getRandomValues?root.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296);if(!seed)seed=1;
  const fallback=()=>runLocal(engine,structuredClone(snapshot),seconds,{offline,progress,random:random||seeded(seed)});
  if(random||typeof Worker==='undefined')return fallback();
  return new Promise((resolve,reject)=>{let worker,settled=false,timer;function fail(){if(settled)return;settled=true;clearTimeout(timer);worker?.terminate();fallback().then(resolve,reject);}
   try{worker=workerFactory();timer=setTimeout(fail,10000);worker.onmessage=({data})=>{if(settled)return;if(data.type==='ready'){clearTimeout(timer);worker.postMessage({state:snapshot,seconds,offline,seed});}else if(data.type==='progress')progress(data.value);else if(data.type==='done'){settled=true;worker.terminate();resolve(data.state);}else if(data.type==='error')fail();};worker.onerror=fail;worker.onmessageerror=fail;}catch{fail();}
  });
 }
 const api={run,runLocal,seeded};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggRecovery=api;
})(typeof window!=='undefined'?window:globalThis);
