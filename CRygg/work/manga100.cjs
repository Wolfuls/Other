const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9254/json')).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id)}});
 const call=(method,params={})=>new Promise(r=>{const id=++seq;pending.set(id,r);ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value};
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 await ev(`window.originalTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms*.08,...args);document.getElementById('borrow').click();__ygPhysics.launch(65);window.ticks=0;window.tickId=YggClock.setInterval(()=>ticks++,80);document.getElementById('demoMangaMiss').click()`);
 const before=await ev('({balls:__ygPhysics.getBalls(),ticks})');await delay(500);
 assert(await ev('YggClock.paused'));assert.deepEqual(await ev('({balls:__ygPhysics.getBalls(),ticks})'),before);
 assert.equal(await ev("document.querySelectorAll('.manga-scene').length"),2);
 await delay(1600);assert(!await ev('YggClock.paused'));assert(await ev('ticks>0'));assert.equal(await ev("document.querySelectorAll('.manga-scene').length"),0);
 await ev("document.getElementById('demoMangaWin').click()");await delay(1900);assert(!await ev('YggClock.paused'));
 console.log('PASS preview pause, frozen physics and timer, both monitors, both outcomes, resume');await call('Browser.close');ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
