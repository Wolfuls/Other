'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,roundTrip}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
function memory(){const s=ready(['jewel','mitsuru']);s.paused=true;s.earned=1234567;s.previousRunsEarned=7654321;s.options.simplifiedNumbers=true;s.runNumber=3;E.selectMemories(s);return s;}
test('new run archives only earned income once and preserves only records and preferences',()=>{
 const old=memory();old.upgrades.stabilization=5;old.questLevels.ozmorn=30;old.levels.jewel=150;old.runaway.jewel.runawayRate=80;
 const unchanged=structuredClone(old),next=E.nextRun(old,9999),fresh=E.createState(9999);assert.deepEqual(old,unchanged);
 assert.equal(next.runNumber,4);assert.equal(next.previousRunsEarned,8888888);assert.equal(next.earned,0);assert.equal(next.factors,0);assert.deepEqual(next.options,old.options);
 assert.deepEqual(next,{...fresh,runNumber:4,previousRunsEarned:8888888,options:old.options});assert.deepEqual(roundTrip(next),next);assert.equal(E.nextRun(next),null);
 E.grantIncome(next,1000001,'questReward');E.selectMemories(next);const again=E.nextRun(next,10000);assert.equal(again.runNumber,5);assert.equal(again.previousRunsEarned,9888889);
});
test('schema43 starts on run one and introduces Mitsuru without touching previous progress',()=>{
 const s=memory();delete s.runNumber;for(const field of ['levels','health','runaway','actionPoints','concentration','perkEnabled','purchasedPerks','unlockedPerks'])delete s[field].mitsuru;
 s.formations.scarecrow=['jewel'];const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:43,state:s}));assert.equal(loaded.runNumber,1);assert.equal(loaded.levels.mitsuru,0);assert.equal(loaded.earned,s.earned);assert.equal(loaded.previousRunsEarned,s.previousRunsEarned);assert.equal(loaded.factors,s.factors);assert.deepEqual(roundTrip(loaded),loaded);
});
test('confirmation commits one new run at the dark midpoint and reveals the fresh battle',()=>{
 const h=harness(memory());h.click('dream-yes');assert.ok(!h.get('dream-transition').open);h.click('memory-monolith');h.click('dream-yes');
 h.advance(1500);assert.equal(h.saved().runNumber,3);h.click('memory-monolith');h.click('dream-yes');h.advance(400);assert.equal(h.saved().runNumber,4);assert.equal(h.get('dream-transition').open,true);
 h.advance(1900);assert.equal(h.get('dream-transition').open,false);assert.equal(h.get('memory-scene').hidden,true);assert.equal(h.saved().factors,0);assert.equal(h.saved().previousRunsEarned,8888888);assert.equal(h.get('run-number').textContent,'第4周');assert.equal(h.document.activeElement,h.get('attack'));h.click('dream-yes');h.advance(4000);assert.equal(h.saved().runNumber,4);
});
test('hidden tabs, Escape and reduced motion finish a confirmed run exactly once',()=>{
 for(const mode of ['hidden','escape','reduced']){const h=harness(memory());if(mode==='reduced')h.media.matches=true;h.click('memory-monolith');h.click('dream-yes');
  if(mode==='hidden')h.visible(false);if(mode==='escape')h.get('dream-transition').listeners.get('cancel')({preventDefault(){}});if(mode==='reduced')h.advance(801);
  assert.equal(h.get('dream-transition').open,false);assert.equal(h.saved().runNumber,4);h.advance(4000);assert.equal(h.saved().runNumber,4);
 }
});
test('invalid run numbers cannot enter a save',()=>{for(const value of [0,-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1]){const s=memory();s.runNumber=value;assert.throws(()=>S.encode(s));}});
test('a failed next-run save retains the current run and closes the transition safely',()=>{
 let armed=false;const h=harness(memory(),undefined,{beforeStorageWrite(key,value){if(armed&&key===S.KEY&&JSON.parse(value).state.runNumber===4)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});}});
 const before=h.saved();armed=true;h.click('memory-monolith');h.click('dream-yes');h.advance(3700);
 assert.equal(h.get('dream-transition').open,false);assert.equal(h.get('memory-scene').hidden,false);assert.deepEqual(h.saved(),before);assert.match(h.get('notice').textContent,/保存容量/);
});
