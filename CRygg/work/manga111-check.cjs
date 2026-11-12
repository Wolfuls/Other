const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9254/json')).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id)}});
 const call=(method,params={})=>new Promise(r=>{const id=++seq;pending.set(id,r);ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value};
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Page.reload',{ignoreCache:true});await delay(1800);
 await ev(`window.seenSfx=[];window.sfxObserver=new MutationObserver(()=>{for(const el of document.querySelectorAll('#lcd .manga-sfx')){const key=[...el.classList].find(c=>c.startsWith('sfx-'));if(!seenSfx.includes(key))seenSfx.push(key)}});sfxObserver.observe(document.getElementById('lcd'),{childList:true,subtree:true});document.getElementById('demoMangaWin').click()`);
 async function until(expression){const end=Date.now()+26000;while(!await ev(expression)){if(Date.now()>end)throw Error('Timeout: '+expression);await delay(60);}}
 async function shot(name){await delay(160);assert(await ev("[...document.querySelectorAll('#lcd .manga-sfx')].every(i=>i.complete&&i.naturalWidth>0)"));const r=await call('Page.captureScreenshot');fs.writeFileSync('work/manga111-'+name+'.png',Buffer.from(r.result.data,'base64'));}
 await until("!!document.querySelector('#lcd .sfx-impact')");await shot('assault');
 await until("!!document.querySelector('#lcd .counter-enemy')");await shot('counter');
 await until("!!document.querySelector('#lcd .manga-enter')");await delay(3300);assert(await ev("!!document.querySelector('#lcd .manga-enter')"));
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await until("!!document.querySelector('#lcd .jackpot-scene')");assert(await ev("document.querySelector('#lcd .manga-scene').style.display==='none'"));
 await until("!!document.querySelector('#lcd .sfx-collapse')");await shot('collapse');
 await until("!document.querySelector('#lcd .manga-scene')");
 assert.deepEqual(await ev('seenSfx'),['sfx-windup','sfx-impact','sfx-dodge','sfx-transform','sfx-chainsaw','sfx-slash','sfx-collapse']);
 await until("!document.querySelector('#monitorView .manga-scene')");
 await ev("seenSfx=[];document.getElementById('demoMangaMiss').click()");await until("!!document.querySelector('#lcd .manga-enter')");await ev("document.querySelector('#lcd .manga-enter').click()");await until("!!document.querySelector('#lcd .manga-black')");assert(await ev("!document.querySelector('#lcd .jackpot-scene')"));await until("!document.querySelector('#lcd .manga-scene')");
 assert(!(await ev("seenSfx.includes('sfx-slash')||seenSfx.includes('sfx-collapse')")));
 console.log('PASS: Enter waits, keyboard success jackpot before continuation, click miss without jackpot; seven overlays in order, loaded images, both displays cleaned up, miss has no success lettering');await call('Browser.close');ws.close();
})().catch(e=>{console.error(e);process.exit(1)});

