(() => {
 let paused=false,last=performance.now(),serial=0;const tasks=new Map();
 const add=(fn,ms,repeat)=>{const id=++serial;tasks.set(id,{fn,left:ms,ms,repeat});return id};
 window.setInterval(()=>{const now=performance.now(),dt=now-last;last=now;if(paused)return;for(const [id,t] of [...tasks]){if(!tasks.has(id))continue;t.left-=dt;if(t.left>0)continue;if(t.repeat)t.left+=Math.max(16,t.ms);else tasks.delete(id);t.fn();}},16);
 window.YggClock={get paused(){return paused},set paused(v){paused=v;last=performance.now()},setTimeout:(fn,ms=0)=>add(fn,ms,false),setInterval:(fn,ms=0)=>add(fn,ms,true),clearTimeout:id=>tasks.delete(id),clearInterval:id=>tasks.delete(id)};
})();
