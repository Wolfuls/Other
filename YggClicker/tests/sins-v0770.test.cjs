'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,roundTrip}=require('./current-fixtures.cjs'),{harness}=require('./app-harness.cjs');
function memory(){const s=ready(['meta']);s.earned=1e10;s.memoriesUnlocked=true;s.viewingMemories=true;return s;}
test('sin formula boundaries, monotonic entitlement and floor prices',()=>{
 for(const [c,p] of [[0,0],[999999,0],[1e6,1],[1e7,10],[1e8,40],[1e10,160]])assert.equal(E.sinEntitlement(c),p);
 let previous=0;for(let i=0;i<=100;i++){const p=E.sinEntitlement(10**i);assert.ok(p>=previous);previous=p;}
 const s=memory();for(let level=0;level<100;level++){s.seedLevels.pride=level;assert.equal(E.seedCost(s,'pride'),Math.floor(1.06**level));}
 assert.equal(E.seedCost(s,'invalid'),Infinity);
});
test('shop credits once, freezes all time, saves purchases and carries permanent progression',()=>{
 const s=memory();assert.equal(E.nextRun(s),null);assert.ok(E.beginDream(s));assert.equal(s.sinBalance,160);
 const same=structuredClone(s);assert.equal(E.beginDream(s),false);E.advance(s,28800,()=>.5);assert.deepEqual(s,same);assert.deepEqual(E.click(s,()=>.5),[]);
 for(const id of Object.keys(D.seedSystem.effects))assert.ok(E.buySeed(s,id));
 const loaded=roundTrip(s);assert.equal(loaded.sinBalance,152);assert.equal(loaded.dreamShop,true);
 const next=E.nextRun(loaded,3000);assert.equal(next.runNumber,2);assert.equal(next.previousRunsEarned,1e10);assert.deepEqual(next.seedLevels,loaded.seedLevels);assert.equal(next.sinBalance,152);
 next.memoriesUnlocked=true;next.viewingMemories=true;E.beginDream(next);assert.equal(next.dreamGain,0);assert.equal(next.sinBalance,152);
 const third=E.nextRun(next);third.earned=1e11;third.memoriesUnlocked=true;third.viewingMemories=true;E.beginDream(third);assert.equal(third.dreamGain,E.sinEntitlement(1.1e11)-160);
});
test('each seed changes its intended strength; greed excludes rewards and refunds; sloth excludes calming',()=>{
 const s=ready(['meta']),c=D.characters.find(c=>c.id==='meta');
 for(const [id,kind]of [['pride','action'],['vanity','evasion'],['envy','accuracy'],['wrath','power'],['gluttony','vitality'],['lust','armor']]){
  const before=E.strengthValue(s,c,kind);s.seedLevels[id]=3;assert.ok(Math.abs(E.strengthValue(s,c,kind)/before-1.08**3)<1e-12);
 }
 s.seedLevels.greed=5;for(const type of D.incomeTypes){const before=s.factors;E.grantIncome(s,100,type);assert.equal(s.factors-before,D.secondaryIncomeTypes.includes(type)?200:100);}
 const b=E.runawayPressureBreakdown(s,c);s.seedLevels.sloth=4;const a=E.runawayPressureBreakdown(s,c);assert.equal(a.calming,b.calming);assert.ok(Math.abs(a.generated-b.generated*.95**4)<1e-12);
});
test('schema54 converts retired seed name and shortens existing Megumin stun only',()=>{
 const s=ready(['megumin','meta']);s.seedLevels.melancholy=2;delete s.seedLevels.sloth;s.health.megumin.stunTurns=5;s.health.meta.stunTurns=3;
 const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:54,state:s}));assert.equal(loaded.health.megumin.stunTurns,1);assert.equal(loaded.health.meta.stunTurns,3);assert.equal(loaded.seedLevels.sloth,2);assert.equal(loaded.sinBalance,0);assert.deepEqual(roundTrip(loaded),loaded);
});
test('queued Q preserves enemy windup, stun and HP through save, then changes after impact',()=>{
 const s=ready(['meta']);s.questLevels.scarecrow=2;const e=s.enemies[0];e.pendingAttack={targetId:'meta',remaining:.5};s.timeline.busySeconds=.5;s.health.meta.stunTurns=1;
 const before=structuredClone(e);assert.ok(E.setQuestLevel(s,'scarecrow',2));assert.deepEqual(e,before);assert.equal(E.questLevel(s),1);assert.equal(s.health.meta.stunTurns,1);
 const loaded=roundTrip(s);assert.equal(loaded.pendingQuestLevels.scarecrow,2);E.advance(loaded,.25,()=>.5);assert.equal(E.questLevel(loaded),1);
 const events=E.advance(loaded,.3,()=>.5);assert.ok(events.some(e=>e.type==='enemyAttack'));assert.equal(E.questLevel(loaded),1);E.advance(loaded,1.3,()=>.5);assert.equal(E.questLevel(loaded),2);assert.equal(E.questChangePending(loaded),false);roundTrip(loaded);
});
test('Q buys and bulk buys queue without mutating current battle or quote state',()=>{
 const s=ready(['meta']);s.timeline.busySeconds=2;const before=structuredClone(s);E.purchaseQuote(s,'quest','scarecrow',10);assert.deepEqual(s,before);
 assert.ok(E.buyMany(s,'quest','scarecrow',10));assert.equal(E.questLevel(s),1);assert.equal(s.pendingQuestLevels.scarecrow,11);assert.deepEqual(s.enemies,before.enemies);
 assert.ok(E.setQuestLevel(s,'scarecrow',1));assert.equal(E.questChangePending(s),false);assert.equal(E.sell(s,'quest','scarecrow'),false);
});
test('offscreen quest applies queued Q independently',()=>{
 const s=ready(['meta']);s.timeline.busySeconds=.5;s.questLevels.scarecrow=2;E.setQuestLevel(s,'scarecrow',2);E.selectSession(s,'mohican-solo');E.advance(s,.6,()=>.5);assert.equal(E.questLevel(s,'scarecrow'),2);assert.equal(E.questLevel(s,'mohican-solo'),1);roundTrip(s);
});
test('UI shop survives reload and starts next run only after explicit completion',()=>{
 const s=memory();s.paused=true;E.beginDream(s);const h=harness(s);assert.ok(h.get('sin-shop').open);h.click('sin-buy-pride');assert.equal(h.saved().seedLevels.pride,1);assert.equal(h.saved().runNumber,1);
 const again=harness(h.saved());assert.ok(again.get('sin-shop').open);assert.equal(again.saved().sinBalance,159);again.click('sin-finish');assert.equal(again.saved().runNumber,2);assert.equal(again.saved().sinBalance,159);assert.equal(again.get('sin-shop').open,false);
});
test('failed shop purchase save cannot spend currency or grant levels',()=>{
 const s=memory();E.beginDream(s);let fail=false;const h=harness(s,undefined,{beforeStorageWrite(key){if(fail&&key===S.KEY)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});}});fail=true;h.click('sin-buy-wrath');assert.equal(h.saved().seedLevels.wrath,0);assert.equal(h.saved().sinBalance,160);assert.match(h.get('sin-message').textContent,/保存/);
});
test('failed completion keeps the purchased shop state, and retry starts exactly one run',()=>{
 const s=memory();E.beginDream(s);E.buySeed(s,'gluttony');let fail=false;const h=harness(s,undefined,{beforeStorageWrite(key,value){if(fail&&key===S.KEY&&JSON.parse(value).state.runNumber===2)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});}});
 fail=true;h.click('sin-finish');assert.equal(h.saved().runNumber,1);assert.equal(h.saved().seedLevels.gluttony,1);assert.equal(h.get('sin-shop').open,true);assert.match(h.get('sin-message').textContent,/保存/);
 fail=false;h.click('sin-finish');assert.equal(h.saved().runNumber,2);assert.equal(h.saved().sinBalance,159);assert.equal(h.saved().seedLevels.gluttony,1);h.click('sin-finish');assert.equal(h.saved().runNumber,2);
});
