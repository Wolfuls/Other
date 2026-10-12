const {test}=require('node:test'),assert=require('node:assert/strict');const {D,E,ready,character}=require('./current-fixtures.cjs');const {harness}=require('./app-harness.cjs'),UI=require('../js/display');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('retired action CP is ignored while attack CP remains exponential',()=>{const s=ready(['waku']);s.levels.waku=232;s.concentration.waku.action=100;s.concentration.waku.power=100;const c=character('waku'),effective=100/(1+2.5*100/231),base=562;near(E.T.focusMultiplier(100,231,'action'),1+.08*effective);near(E.strengthValue(s,c,'action'),1948);near(E.strengthValue(s,c,'power'),base*1.08**effective);assert.equal(E.T.focusMultiplier(100,0,'action'),1);const h=harness(s);h.openAbility('waku');assert.doesNotMatch(h.get('character-list').innerHTML,/id="focus-action-waku"/);assert.equal(h.get('ability-value-action-waku').textContent,UI.fullNumber(E.actionPower(s,c,c.action,true)));});
test('weights use the unchanged action curve and SWRR proportions',()=>{
 const units=[30,15,15].map((weight,i)=>({key:String(i),weight})),p={},counts=[0,0,0];
 for(let i=0;i<8000;i++)counts[Number(E.smoothTurn(units,p).key)]++;
 assert.deepEqual(counts,[4000,2000,2000]);assert.equal(E.actionThreshold,undefined);
});
