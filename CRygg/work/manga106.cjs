const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9254/json')).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id)}});
 const call=(method,params={})=>new Promise(r=>{const id=++seq;pending.set(id,r);ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value};
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 await ev("document.getElementById('demoMangaWin').click()");await delay(4300);
 assert.equal(await ev("document.querySelectorAll('#lcd .cell-claw').length"),1);
 let shot=await call('Page.captureScreenshot');fs.writeFileSync('work/manga106-assault.png',Buffer.from(shot.result.data,'base64'));
 await delay(6000);assert(await ev("document.querySelector('#lcd .manga-page-art').naturalWidth>0"));
 shot=await call('Page.captureScreenshot');fs.writeFileSync('work/manga106-counter.png',Buffer.from(shot.result.data,'base64'));
 console.log('PASS new claw and transformation page loaded');await call('Browser.close');ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
