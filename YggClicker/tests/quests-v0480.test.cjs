'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),UI=require('../js/display'),{harness}=require('./app-harness.cjs');
const quest=id=>D.sessions.find(q=>q.id===id);
test('new games start in the solo quest; ordered names, base rewards and swarm tags match the roster',()=>{
 const s=E.createState(1000);
 assert.equal(s.sessionId,'mohican-solo');assert.equal(s.factors,0);
 assert.deepEqual(D.sessions.map(q=>[q.code,q.name,q.reward]),[
  ['01','今日も今日とてモヒカン日和',2],['02','バスターライラック内模擬戦闘訓練',10],['03','YDF密着24分 101匹モヒちゃん大暴れ！',3],['04','旧き看守',10]]);
 assert.equal(E.ensureEnemies(s).length,1);assert.equal(UI.enemyFormationSize(quest('mohican-solo')),1);
 assert.ok(quest('mohican-solo').traits.includes('mohican'));assert.ok(!quest('mohican-solo').traits.includes('swarm'));
 s.factors=1000;E.selectSession(s,'mohicans');assert.equal(E.ensureEnemies(s).length,3);assert.equal(UI.enemyFormationSize(quest('mohicans')),3);
 assert.equal(quest('mohican-solo').variants.length,10);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('locked quests reject selection, assignment, single/bulk upgrades and sales until the exact held-factor threshold',()=>{
 for(const [id,threshold]of [['mohicans',1000],['dementor',100000]]){
  const s=E.createState();s.levels.meta=1;s.factors=threshold-1;
  assert.equal(E.isQuestUnlocked(s,id),false);assert.equal(E.selectSession(s,id),false);assert.equal(E.setFormation(s,id,['meta']),false);
  assert.equal(E.buyQuest(s,id),false);assert.equal(E.purchaseQuote(s,'quest',id,10).valid,false);assert.equal(E.buyMany(s,'quest',id),false);assert.equal(E.sell(s,'quest',id),false);
  s.factors=threshold;assert.equal(E.isQuestUnlocked(s,id),true);assert.equal(E.selectSession(s,id),true);assert.equal(s.questUnlocks[id],true);
  s.factors=0;assert.ok(E.isQuestUnlocked(s,id));assert.deepEqual(S.decode(S.encode(s)),s);
 }
});
test('crossing thresholds via rewards, refunds or immediate spending permanently unlocks quests',()=>{
 const reward=E.createState();reward.factors=999;reward.hp=1;E.click(reward,()=>.4);assert.equal(reward.factors,1001);assert.equal(reward.questUnlocks.mohicans,true);
 const spend=E.createState();spend.factors=1000;assert.ok(E.hire(spend,'vishunal'));assert.equal(spend.factors,0);assert.ok(spend.questUnlocks.mohicans);
 const high=E.createState();high.factors=100000;assert.ok(E.buyUpgrade(high,'reward'));assert.ok(high.questUnlocks.dementor);high.factors=0;assert.ok(S.decode(S.encode(high)).questUnlocks.dementor);
 const sale=E.createState();sale.levels.meta=2;sale.factors=998;assert.ok(E.sell(sale,'power','meta'));assert.equal(sale.factors,1002);assert.ok(sale.questUnlocks.mohicans);
});
test('price quotes never unlock quests or mutate the source state with their unlimited calculation budget',()=>{
 const s=E.createState();s.levels.meta=1;s.factors=999;const before=structuredClone(s);
 E.purchaseQuote(s,'power','meta',10);E.saleQuote(s,'power','meta');assert.deepEqual(s,before);assert.equal(s.questUnlocks.dementor,false);
 s.factors=1000;const threshold=structuredClone(s);assert.ok(E.purchaseQuote(s,'quest','mohicans',10).valid);assert.deepEqual(s,threshold);
 s.factors=10000;assert.ok(E.buyMany(s,'power','meta'));assert.ok(s.questUnlocks.mohicans);assert.equal(s.questUnlocks.dementor,false);
});
test('offline reward aggregation also unlocks reached thresholds',()=>{
 const s=E.createState(1000);s.factors=998;s.levels.meta=200;s.actionLevels.meta=100000;
 E.advance(s,1,()=>.4,false);assert.ok(s.factors>=1000);assert.ok(s.questUnlocks.mohicans);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('solo and swarm individuals respawn at exactly five seconds, including after save/load',()=>{
 for(const id of ['mohican-solo','scarecrow','mohicans','dementor']){
  const s=E.createState();s.factors=100000;E.refreshQuestUnlocks(s);E.selectSession(s,id);
  const enemies=E.ensureEnemies(s);enemies.forEach(e=>e.hp=1);s.hp=1;
  E.click(s,()=>.4);const slot=enemies.findIndex(e=>e.hp===0),oldID=enemies[slot].id;assert.equal(enemies[slot].respawnSeconds,5);
  E.advance(s,4.999,()=>.4);assert.equal(enemies[slot].hp,0);
  const saved=S.decode(S.encode(s));E.advance(saved,.001,()=>.4);assert.equal(saved.enemies[slot].respawnSeconds,0);assert.equal(saved.enemies[slot].hp,quest(id).hp);assert.notEqual(saved.enemies[slot].id,oldID);
 }
});
test('solo Mohicans receive special damage but never trigger swarm area attacks',()=>{
 const s=E.createState();s.levels.meta=75;s.selectedCharacterId='meta';s.purchasedPerks.meta=['mohican-slayer','metal-blade','metal-storm'];
 const meta=D.characters.find(c=>c.id==='meta');assert.equal(E.hasAreaAttack(s,meta),false);assert.equal(E.stats(s,meta).flat,5);assert.equal(E.attackProfile(s,meta).bonus,15);
 const events=E.click(s,()=>.4);assert.equal(events.filter(e=>e.type==='clear').length,1);assert.equal(s.earned,2);
});
test('character prices use the requested bases and exact 9/8 growth; ten-buy and sell use identical rounded stages',()=>{
 for(const [id,power,action]of [['meta',8,10],['richter',20,25],['vishunal',200,250],['tordeliese',500,625],['max',2400,3000]]){
  const s=E.createState(),c=D.characters.find(c=>c.id===id);s.levels[id]=1;s.factors=1e10;
  assert.equal(E.hireCost(s,c),power);assert.equal(E.actionCost(s,c),action);
  for(let n=0;n<=30;n++){s.levels[id]=n+1;s.actionLevels[id]=n;const expected=base=>Number(BigInt(base)*9n**BigInt(n)/8n**BigInt(n));assert.equal(E.hireCost(s,c),expected(power));assert.equal(E.actionCost(s,c),expected(action));}
  s.levels[id]=1;s.actionLevels[id]=0;const quote=E.purchaseQuote(s,'power',id,10),singles=structuredClone(s);for(let i=0;i<10;i++)assert.ok(E.hire(singles,id));
  assert.equal(quote.cost,s.factors-singles.factors);assert.ok(E.buyMany(s,'power',id));assert.equal(s.factors,singles.factors);assert.equal(s.levels[id],11);
  assert.equal(E.saleQuote(s,'power',id).refund,Math.max(1,Math.floor(Number(BigInt(power)*9n**9n/8n**9n)/2)));
 }
 assert.equal(D.balance.upgradeCostGrowth,1.25);assert.equal(D.questGrowth.costGrowth,1.1);
});
function oldSave(){
 const s=E.createState(1000);s.sessionId='scarecrow';s.hp=35;
 for(const key of ['questLevels','formations','concentration'])delete s[key]['mohican-solo'];
 delete s.questUnlocks;return s;
}
test('schema25 migration preserves experienced quests and original swarm progression at low currency',()=>{
 const old=oldSave();old.factors=12;old.questLevels.mohicans=8;old.levels.max=1;old.formations.dementor=['max'];
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:25,state:old}));
 assert.equal(s.sessionId,'scarecrow');assert.equal(s.questLevels.mohicans,8);assert.equal(s.questLevels['mohican-solo'],1);assert.equal(s.formations['mohican-solo'],null);
 assert.ok(s.questUnlocks.mohicans&&s.questUnlocks.dementor);assert.equal(s.factors,12);assert.deepEqual(s.formations.dementor,['max']);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('migration does not unlock unvisited quests merely because empty battle snapshots exist',()=>{
 const old=oldSave();old.sessionStates={mohicans:E.battleSnapshot(E.battleContext(old,'mohicans')),dementor:E.battleSnapshot(E.battleContext(old,'dementor'))};
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:25,state:old}));assert.equal(s.questUnlocks.mohicans,false);assert.equal(s.questUnlocks.dementor,false);
 old.sessionId='mohicans';old.hp=20;delete old.sessionStates.mohicans;assert.ok(S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:25,state:old})).questUnlocks.mohicans);
});
test('migration extends existing enemy waits once and retains elapsed time',()=>{
 const old=oldSave();E.ensureEnemies(old);old.hp=0;old.respawnSeconds=1.25;Object.assign(old.enemies[0],{hp:0,respawnSeconds:1.25});
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:25,state:old}));assert.equal(s.respawnSeconds,4.25);assert.equal(s.enemies[0].respawnSeconds,4.25);assert.equal(S.decode(S.encode(s)).respawnSeconds,4.25);
});
test('invalid unlock maps and locked progress are rejected safely',()=>{
 const s=E.createState();for(const questUnlocks of [{mohicans:1},{bogus:true},[]])assert.throws(()=>S.encode({...s,questUnlocks}));
 assert.throws(()=>S.encode({...s,sessionId:'dementor',hp:100}));assert.throws(()=>S.encode({...s,questLevels:{...s.questLevels,mohicans:2}}));
});
test('quest enhancement details toggle independently and locked cards disable their controls',()=>{
 const s=E.createState(1000);s.paused=true;const h=harness(s),html=h.get('quest-list').innerHTML;
 assert.match(html,/id="quest-enhancement-mohican-solo" hidden/);assert.match(html,/aria-expanded="false"/);
 assert.equal(h.get('quest-select-mohicans').disabled,true);assert.equal(h.get('formation-open-dementor').disabled,true);assert.equal(h.get('quest-enhance-toggle-mohicans').disabled,true);
 assert.match(h.get('quest-lock-mohicans').textContent,/1,000 Rd/);assert.match(h.get('quest-lock-dementor').textContent,/100,000 Rd/);
 const panel=h.get('quest-enhancement-mohican-solo'),button=h.get('quest-enhance-toggle-mohican-solo');panel.hidden=true;button.dataset.questDetails='mohican-solo';
 const toggle=()=>h.get('quest-list').listeners.get('click')({target:{closest:sel=>sel==='[data-quest-details]'?button:null}});
 toggle();assert.equal(panel.hidden,false);assert.equal(button.getAttribute('aria-expanded'),'true');toggle();assert.equal(panel.hidden,true);assert.equal(h.saved().factors,0);
});
test('downed Max opens the battlefield revival dialog and completes revival',()=>{
 const s=E.createState(1000);s.paused=true;s.factors=15000;s.levels.max=1;s.health.max={hp:-2,status:'dying',regenSeconds:0};const h=harness(s);
 h.click('max-select');assert.equal(h.get('revive-dialog').open,true);assert.match(h.get('revive-title').textContent,/マックス/);h.click('confirm-revive');
 assert.equal(h.saved().factors,3000);assert.equal(h.saved().health.max.status,'active');assert.equal(h.saved().health.max.hp,22);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.match(html,/class="max-float"><span[^>]*>[\s\S]*?<\/span><\/div><button id="max-select"/);
});
