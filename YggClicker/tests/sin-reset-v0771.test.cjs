const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,S,D,ready,roundTrip}=require('./current-fixtures.cjs'),{harness}=require('./app-harness.cjs');
function shop(){const s=ready(['meta']);s.memoriesUnlocked=true;s.viewingMemories=true;s.earned=1e12;s.seedLevels.wrath=15;E.beginDream(s);return s;}
test('refund returns exact paid integer prices and never removes earlier levels',()=>{
 const s=shop(),balance=s.sinBalance;for(let i=0;i<7;i++)E.buySeed(s,'wrath');E.buySeed(s,'gluttony');const bought=roundTrip(s);
 assert.equal(bought.seedLevels.wrath,22);assert.ok(E.resetDreamPurchases(bought));assert.equal(bought.sinBalance,balance);assert.equal(bought.seedLevels.wrath,15);assert.equal(bought.seedLevels.gluttony,0);assert.deepEqual(roundTrip(bought),bought);assert.equal(E.resetDreamPurchases(bought),false);assert.equal(bought.sinBalance,balance);
 E.buySeed(bought,'wrath');const next=E.nextRun(bought);assert.equal(next.seedLevels.wrath,16);assert.equal(E.resetDreamPurchases(next),false);next.memoriesUnlocked=true;next.viewingMemories=true;E.beginDream(next);assert.equal(E.resetDreamPurchases(next),false);E.buySeed(next,'wrath');E.resetDreamPurchases(next);assert.equal(next.seedLevels.wrath,16);
});
test('schema55 purchases without provenance are protected, new purchases can be refunded',()=>{
 const s=shop();E.buySeed(s,'wrath');delete s.dreamPurchases;const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:55,state:s}));assert.equal(E.resetDreamPurchases(loaded),false);E.buySeed(loaded,'wrath');E.resetDreamPurchases(loaded);assert.equal(loaded.seedLevels.wrath,16);
});
test('UI reset persists and survives reload; failed refund does not change progress',()=>{
 const s=shop();s.paused=true;E.buySeed(s,'wrath');let fail=false;const h=harness(s,undefined,{beforeStorageWrite(key){if(fail&&key===S.KEY)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});}});
 const paid=h.saved().sinBalance;fail=true;h.click('sin-reset');assert.equal(h.saved().seedLevels.wrath,16);assert.equal(h.saved().sinBalance,paid);fail=false;h.click('sin-reset');assert.equal(h.saved().seedLevels.wrath,15);assert.ok(h.saved().sinBalance>paid);assert.equal(h.get('sin-reset').disabled,true);assert.equal(h.get('sin-message').textContent,'');
 const again=harness(h.saved());assert.equal(again.get('sin-reset').disabled,true);assert.equal(again.saved().seedLevels.wrath,15);
});
