const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,ready}=require('./current-fixtures.cjs'),{harness}=require('./app-harness.cjs');
test('post-rebirth inspection displays inherited levels and multipliers without allowing purchases',()=>{
 const s=ready(['meta']);s.earned=1e10;s.memoriesUnlocked=true;s.viewingMemories=true;E.beginDream(s);E.buySeed(s,'pride');E.buySeed(s,'greed');E.buySeed(s,'sloth');const next=E.nextRun(s,1000),h=harness(next);
 h.click('sins-open');assert.equal(h.get('sin-shop').open,true);assert.equal(h.get('sin-level-pride').textContent,'Lv.1');assert.equal(h.get('sin-effect-pride').textContent,'現在 ×1.04');assert.equal(h.get('sin-effect-greed').textContent,'現在 ×1.2');assert.equal(h.get('sin-effect-sloth').textContent,'現在 ×0.95');
 assert.equal(h.get('sin-buy-pride').disabled,true);assert.equal(h.get('sin-finish').hidden,true);assert.equal(h.get('sin-reset').hidden,true);assert.equal(h.get('sin-close').hidden,false);const balance=h.saved().sinBalance;
 h.click('sin-buy-pride');assert.equal(h.saved().seedLevels.pride,1);assert.equal(h.saved().sinBalance,balance);h.click('sin-close');assert.equal(h.get('sin-shop').open,false);h.click('sins-open');h.get('sin-shop').listeners.get('cancel')({preventDefault(){}});assert.equal(h.get('sin-shop').open,false);
});
test('inspection leaves battle progression identical to the closed view',()=>{
 const s=ready(['meta']);s.paused=false;s.runNumber=2;const a=harness(structuredClone(s)),b=harness(structuredClone(s));a.click('sins-open');assert.equal(a.get('sin-shop').open,true);a.advance(3000);b.advance(3000);a.click('save-now');b.click('save-now');assert.deepEqual(a.saved(),b.saved());assert.ok(a.saved().timeline.turns>0);
});
