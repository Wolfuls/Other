'use strict';
importScripts('characters.js','quests.js','data.js','numbers.js','battle-batch.js','strength.js','engine.js','recovery.js');
onmessage=async({data})=>{try{await YggRecovery.runLocal(YggEngine,data.state,data.seconds,{offline:data.offline,random:YggRecovery.seeded(data.seed),budget:20,progress:value=>postMessage({type:'progress',value})});postMessage({type:'done',state:data.state});}catch(error){postMessage({type:'error',message:String(error)});}};
postMessage({type:'ready'});
