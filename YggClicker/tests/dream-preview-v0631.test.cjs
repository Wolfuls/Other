'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
function memoryState(){const s=ready(['jewel']);s.paused=true;s.earned=1234567;s.previousRunsEarned=7654321;E.selectMemories(s);return s;}
function selectMemory(h){h.get('quest-list').listeners.get('click')({target:{closest:s=>s==='[data-memories]'?{disabled:false}:null}});}
test('memory is invisible through exactly one million held factors and cannot be opened through the engine/UI',()=>{
 for(const factors of [0,999999,1000000]){const s=E.createState(1000);s.paused=true;s.factors=factors;s.earned=1e10;
  assert.equal(E.isMemoriesUnlocked(s),false);assert.equal(E.selectMemories(s),false);
  const h=harness(s);assert.equal(h.get('quest-card-memories').hidden,true);assert.equal(h.get('quest-select-memories').disabled,true);selectMemory(h);assert.equal(h.saved().viewingMemories,false);h.click('memory-monolith');assert.ok(!h.get('dream-dialog').open);
 }
});
test('exceeding one million unlocks memory permanently, including across spending and saves',()=>{
 const s=E.createState(1000);s.factors=1000000;E.grantIncome(s,1,'questReward');assert.equal(s.memoriesUnlocked,true);s.factors=0;
 const loaded=roundTrip(s);assert.equal(E.isMemoriesUnlocked(loaded),true);assert.ok(E.selectMemories(loaded));loaded.paused=true;const h=harness(loaded);assert.equal(h.get('quest-card-memories').hidden,false);
});
test('schema42 migration applies the current-wallet threshold without resetting any progress',()=>{
 for(const factors of [1000000,1000001]){const s=memoryState();s.factors=factors;delete s.memoriesUnlocked;const b=E.battleSnapshot(s);
  const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:42,state:s}));assert.equal(loaded.memoriesUnlocked,factors>1000000);assert.equal(loaded.viewingMemories,factors>1000000);
  assert.deepEqual(E.battleSnapshot(loaded),b);assert.equal(loaded.earned,s.earned);assert.equal(loaded.previousRunsEarned,s.previousRunsEarned);assert.equal(loaded.factors,factors);assert.deepEqual(loaded.levels,s.levels);assert.deepEqual(roundTrip(loaded),loaded);
 }
});
test('No and Escape dismiss the monolith question without starting a transition',()=>{
 const s=memoryState(),h=harness(s),before=h.saved();
 h.click('memory-monolith');assert.equal(h.get('dream-dialog').open,true);assert.equal(h.get('memory-monolith').getAttribute('aria-expanded'),'true');h.click('dream-no');assert.equal(h.get('dream-dialog').open,false);assert.ok(!h.get('dream-transition').open);
 h.click('memory-monolith');let prevented=false;h.get('dream-dialog').listeners.get('cancel')({preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(h.get('dream-dialog').open,false);assert.deepEqual(h.saved(),before);
});
test('Jewel enabled pressure sums to 3.7 percent per minute and inactive perks contribute nothing',()=>{
 const s=ready(['jewel']);s.levels.jewel=150;for(const p of character('jewel').perks)E.togglePerk(s,'jewel',p.id,true);
 assert.ok(Math.abs(E.runawayPressureBreakdown(s,character('jewel')).perkPressure*60-3.7)<1e-10);
 E.togglePerk(s,'jewel','black-egg',false);assert.ok(Math.abs(E.runawayPressureBreakdown(s,character('jewel')).perkPressure*60-2.5)<1e-10);
});
