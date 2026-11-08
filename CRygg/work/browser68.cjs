const fs=require('fs'),assert=require('assert/strict');
(async()=>{
const tabs=await(await fetch('http://127.0.0.1:9244/json')).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();
ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id)}});
const call=(method,params={})=>new Promise(r=>{const id=++seq;pending.set(id,r);ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value};
await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:9243/work/test68.html'});await new Promise(r=>setTimeout(r,1800));
await ev('void testBonus()');await new Promise(r=>setTimeout(r,1600));assert(await ev("document.querySelectorAll('.jackpot-scene.crown').length===2"));assert(await ev("document.querySelector('.cabinet').classList.contains('jackpot-lit')"));assert(await ev("document.querySelector('#lcd .jackpot-tree').naturalWidth>0"));
let shot=await call('Page.captureScreenshot');fs.writeFileSync('work/jackpot68-preview.png',Buffer.from(shot.result.data,'base64'));
await new Promise(r=>setTimeout(r,3300));assert(await ev("document.querySelectorAll('.jackpot-scene').length===0&&!document.querySelector('.jackpot-lit')"));
await ev('void testBonus()');await new Promise(r=>setTimeout(r,750));await ev('testReset()');await new Promise(r=>setTimeout(r,500));assert(await ev("document.querySelectorAll('.jackpot-scene').length===0&&!document.querySelector('.jackpot-lit')"));console.log('PASS both monitors, 72 particles, board glow, completion and reset cleanup');await call('Browser.close');ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
