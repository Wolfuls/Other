const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = {
  v05: path.join(root, 'work/cr_yggdrasill_starter_v05/cr_yggdrasill_prototype_v05.html'),
  v06: path.join(root, 'outputs/cr_yggdrasill_prototype_v06.html'),
};
function rng(seed) { return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296); }
function load(file, seed = 42, saved = null) {
  const html = fs.readFileSync(file, 'utf8');
  let js = html;
  new vm.Script(js, { filename: file });
  js = js.replace(/\}\)\(\);\s*$/, `window.test = {s, pins:()=>pins, rails:()=>rails, balls:()=>activeBalls,
    reset(nailset){activeBalls=[];holds=[];spinning=true;Object.assign(s,DEFAULT,{stock:100000,nailset});buildPins()},
    step:()=>physicsStep(STEP), launch:power=>{s.power=power;return launchOne()},
    inject(data){activeBalls.push({id:++serial,r:BALL_R,vx:0,vy:0,age:0,warped:false,...data})}, draw:drawBoard, start(h){spinning=false;holds=[h];return processQueue()}, cancel(){token++;}, regen:regenStamina, borrow:borrowBalls, blocked:()=>rightHeld, bonus:()=>jackpotSequence(token), pocket:onStartPocket, cue:reelRecovery, queue:()=>holds, add:addHold, choose:n=>{randomInt=()=>n}, segment:collideSegment, clamp:constrainWalls};})();`);
  const calls = {pinCanvas: [], ballCanvas: []};
  const elements = new Map();const events={};const pending=[];
  const makeElement = id => ({
    style: {setProperty(){}}, dataset: {}, classList:{add(){},remove(){},toggle(){},contains(){return false}},
    addEventListener(type,fn){events[id+":"+type]=fn}, setAttribute(){}, remove(){}, append(){}, replaceChildren(){},
    querySelectorAll:()=>[0,1,2,3].map(i=>element(`hold${i}`)),
    getContext:()=>new Proxy({}, {get:(obj,key)=>obj[key]||((...args)=>{
      if (key === 'arc' || key === 'clearRect') calls[id]?.push({key,args});
      return {addColorStop(){}};
    }),set:(obj,key,val)=>(obj[key]=val,true)}),
  });
  const element = id => {if(!elements.has(id))elements.set(id,makeElement(id));return elements.get(id)};
  const random = rng(seed), cryptoRandom = rng(seed+1000);
  const math = Object.create(Math); math.random = random;
  const sandbox = {Image:class {set src(v){if(this.onload)this.onload()}},window:{addEventListener(type,fn){events["window:"+type]=fn}},document:{querySelector:element,getElementById:element,querySelectorAll:()=>[],createElement:()=>makeElement('')},
    localStorage:{getItem:()=>saved?JSON.stringify(saved):null,setItem(){}},performance:{now:()=>0},Math:math,
    crypto:{getRandomValues(a){for(let i=0;i<a.length;i++)a[i]=Math.floor(cryptoRandom()*4294967296);return a}},
    setInterval:()=>0,clearInterval(){},setTimeout:(fn,ms)=>{pending.push({fn,ms});return 0},requestAnimationFrame(){},confirm:()=>false};
  vm.runInNewContext(js,sandbox);
  const test = sandbox.window.test;const sounds=[];sandbox.window.YggAudio={play:name=>sounds.push(name)};
  
  return {test, calls, html,events,pending,element,sounds};
}
function red(b){return b.x>=125&&b.x<=200&&b.y>=490&&b.y<=540}
function run(file,power,nails,count=750){
  const {test:t}=load(file);t.reset(nails);
  let ticks=0,shots=0,occupancy=0,peak=0,slow=0,timeouts=0,redTimeouts=0,slowRed=0;
  while(shots<count||t.balls().length){
    if(shots<count&&ticks%72===0){assert(t.launch(power));shots++}
    const before = t.balls().slice(); t.step();
    for(const b of before) if(b.age>13&&!t.balls().includes(b)){timeouts++;if(red(b))redTimeouts++}
    const inRed=t.balls().filter(red); occupancy+=inRed.length;peak=Math.max(peak,inRed.length);
    slow+=t.balls().filter(b=>b.age>2&&Math.hypot(b.vx,b.vy)<35).length;
    slowRed+=inRed.filter(b=>b.age>2&&Math.hypot(b.vx,b.vy)<35).length;
    ticks++;assert(ticks<(count*72+2000));
  }
  return {power,nails,shots,entryRate:+(t.s.entered/shots*100).toFixed(2),meanRed:+(occupancy/ticks).toFixed(3),peakRed:peak,
    meanSlow:+(slow/ticks).toFixed(3),meanSlowRed:+(slowRed/ticks).toFixed(3),timeouts,redTimeouts,
    direct:t.s.directEntered,warp:t.s.warpEntered,warpVisits:t.s.warped,bonus:t.s.bonusEntered,entered:t.s.entered,outs:t.s.outs,conserved:t.s.entered+t.s.outs+(t.s.bonusEntered||0)===shots};
}
function dropSweep(file){
 const {test:t}=load(file);let retained=0,total=0,maxAfter2=0;
 for(const vx of [-80,0,80])for(let x=130;x<=195;x+=5){
  t.reset('normal');t.inject({x,y:491,vx});let seen=false;
  for(let i=0;i<480;i++){t.step();if(i===239)maxAfter2+=t.balls().some(red)?1:0;if(i===479)seen=t.balls().some(red)}
  retained+=seen?1:0;total++;
 }
 return {total,stillInRedAfter2Seconds:maxAfter2,stillInRedAfter4Seconds:retained};
}







(async()=>{const file='assets/js/game.js';const e=load(file);e.test.reset('normal');assert(e.test.launch(60));assert.deepEqual(e.sounds,['launch']);assert(!e.test.launch(0));assert.equal(e.sounds.length,1);e.test.pocket({warped:false},false);e.test.pocket({warped:false},true);assert.deepEqual(e.sounds,['launch','pocket','electric']);e.test.s.sound=false;e.test.pocket({warped:false},false);assert.equal(e.sounds.length,3);console.log('PASS launch, blocked launch, both intake types, mute');e.test.s.sound=true;let done=false;e.test.bonus().then(v=>done=v);for(let i=0;i<20&&!done;i++){const t=e.pending.shift();if(t)t.fn();await Promise.resolve();await Promise.resolve();}assert(done);assert(e.sounds.includes('win'));console.log('PASS jackpot sequence completes');const c=load(file);let result;c.test.bonus().then(v=>result=v);c.test.cancel();c.pending.shift().fn();await Promise.resolve();await Promise.resolve();assert.equal(result,false);console.log('PASS jackpot cancellation');})().catch(e=>{console.error(e);process.exitCode=1});
