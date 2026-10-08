'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,character:c,ready,enable}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('individual suppression prices all six training tracks, preserves wounds/reserve, and floors the rate',()=>{
 const s=ready(['meta','max']);s.levels.meta=2;s.actionLevels.meta=1;
 for(const t of D.statUpgrades)s[t.field].meta=1;
 assert.equal(E.trainingInvestment(s,c('meta')),50);
 s.runaway.meta.runawayRate=7;s.runaway.meta.criticalReserve=9;s.health.meta.hp=3;
 assert.deepEqual(E.suppressionQuote(s,'meta'),{targets:['meta'],cost:1,valid:true});
 const money=s.factors;assert.equal(E.suppressRunaway(s,'meta'),true);assert.equal(s.factors,money-1);
 assert.equal(s.runaway.meta.runawayRate,0);assert.equal(s.runaway.meta.criticalReserve,9);assert.equal(s.health.meta.hp,3);
 assert.equal(E.suppressRunaway(s,'meta'),false);
 s.runaway.max.runawayRate=8;assert.equal(E.suppressionQuote(s,'max').cost,0);assert.equal(E.suppressRunaway(s,'max'),true);
});

test('whole-party suppression is atomic and only charges members of the displayed party with a positive rate',()=>{
 const s=ready(['meta','max','jewel']);s.levels.waku=1;E.setFormation(s,'mohican-solo',['waku']);
 s.actionLevels.max=1;s.runaway.max.runawayRate=50;s.health.max.hp=1;s.health.max.status='unconscious';
 s.runaway.meta.runawayRate=20;s.runaway.waku.runawayRate=40;s.runaway.jewel.runawayRate=0;
 const q=E.suppressionQuote(s);assert.deepEqual(q.targets,['meta','max']);assert.equal(q.cost,30);
 s.factors=29;const before=structuredClone(s);assert.equal(E.suppressRunaway(s),false);assert.deepEqual(s,before);
 s.factors=30;assert.equal(E.suppressRunaway(s),true);assert.equal(s.factors,0);assert.equal(s.runaway.max.runawayRate,40);
 assert.equal(s.runaway.meta.runawayRate,10);assert.equal(s.runaway.waku.runawayRate,40);
 assert.equal(s.health.max.status,'unconscious');
});

test('suppression rearms thresholds and can clear symptoms without rejoining a collapsed unit',()=>{
 const s=ready(['meta']);E.changeRunaway(s,'meta',70,()=>.8,[]);s.runaway.meta.runawaySymptom='body';
 assert.equal(E.suppressRunaway(s,'meta'),true);assert.equal(s.runaway.meta.runawaySymptom,null);
 const events=[];E.changeRunaway(s,'meta',10,()=>.8,events);assert.ok(events.some(e=>e.threshold===70));
 s.actionLevels.meta=20;const before=E.suppressionQuote(s,'meta').cost;E.sell(s,'action','meta',10);
 assert.ok(E.suppressionQuote(s,'meta').cost<before);
});

test('factor stabilization uses its own price curve and applies per-minute pressure to downed and benched allies',()=>{
 const s=ready(['meta','max']),u=D.upgrades.find(u=>u.id==='stabilization');
 for(const price of [20000,30000,45000]){assert.equal(E.upgradeCost(s,u),price);assert.equal(E.buyUpgrade(s,u.id),true);}
 assert.equal(E.saleQuote(s,'upgrade',u.id).refund,22500);
 const base=E.runawayPressure(s,c('meta'));s.upgrades[u.id]=0;near(E.runawayPressure(s,c('meta'))-base,.3/60);
 s.upgrades[u.id]=15;s.health.meta.status='dying';s.health.meta.hp=-5;
 near(E.runawayPressure(s,c('meta')),-.025);E.setFormation(s,'scarecrow',['meta']);near(E.runawayPressure(s,c('max')),-.025);
 s.runaway.max.runawayRate=20;E.advance(s,60,()=>.5);near(s.runaway.max.runawayRate,18.5);
});

test('schema34 adds stabilization without changing money, training or runaway; new upgrade persists',()=>{
 const s=ready(['meta']);s.levels.meta=20;s.runaway.meta.runawayRate=34;delete s.upgrades.stabilization;
 const result=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:34,gameVersion:'0.57.1',state:s}));
 assert.equal(result.factors,s.factors);assert.equal(result.levels.meta,20);assert.equal(result.runaway.meta.runawayRate,34);assert.equal(result.upgrades.stabilization,0);
 E.buyUpgrade(result,'stabilization');const saved=S.decode(S.encode(result));assert.equal(saved.upgrades.stabilization,1);assert.equal(saved.factors,result.factors);
});

test('Black Egg follows current player funds and not Jewel training investment',()=>{
 const s=ready(['jewel']);enable(s,'jewel','black-egg');const investment=E.trainingInvestment(s,c('jewel'));
 for(const [money,bonus]of [[1e12,0],[1e12+1,10],[2e12,13],[4e12,16],[900000000000,0]]){
  s.factors=money;assert.equal(E.armor(s,c('jewel')),7+bonus);assert.equal(E.trainingInvestment(s,c('jewel')),investment);
 }
 s.factors=4e12;E.togglePerk(s,'jewel','black-egg',false);assert.equal(E.armor(s,c('jewel')),7);
});

test('character list suppression updates balance and labels without opening its ability window',()=>{
 const s=ready(['meta']);s.paused=true;s.actionLevels.meta=10;s.runaway.meta.runawayRate=25;const quote=E.suppressionQuote(s,'meta'),h=harness(s);
 h.get('character-picker').listeners.get('click')({target:{closest:sel=>sel==='[data-suppress]'?{disabled:false,dataset:{suppress:'meta'}}:null}});
 assert.equal(h.saved().factors,s.factors-quote.cost);assert.equal(h.saved().runaway.meta.runawayRate,15);assert.equal(h.get('picker-runaway-meta').textContent,'暴走 15%');
 h.click('suppress-all');assert.equal(h.saved().runaway.meta.runawayRate,5);
});

test('a quest level draft survives enemy respawn and rendering until applied',()=>{
 const s=ready(['meta']);s.questLevels.scarecrow=20;s.hp=s.enemies[0].hp=0;s.enemies[0].respawnSeconds=s.respawnSeconds=1;
 const h=harness(s),input=h.get('quest-active-scarecrow');input.value='12';h.document.activeElement=null;
 h.get('quest-list').listeners.get('input')({target:input});h.advance(1500);assert.equal(input.value,'12');
 h.click('pause');assert.equal(input.value,'12');
 h.get('quest-list').listeners.get('click')({target:{closest:sel=>sel==='[data-quest-level]'?{disabled:false,dataset:{questLevel:'scarecrow'}}:null}});
 assert.equal(h.saved().questActiveLevels.scarecrow,12);
});

