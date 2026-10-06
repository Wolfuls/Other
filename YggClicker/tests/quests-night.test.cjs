'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js'),B=require('../js/battle-batch.js'),{harness}=require('./app-harness.cjs');
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
test('quest purchase previews and charges scaling price, preserves health ratio and leaves base data unchanged',()=>{
 const s=combatFixture(1000);s.hp=5;s.factors=210;
 assert.equal(E.questCost(s),100);assert.equal(E.getSession(s).hp,20);assert.equal(E.getSession(s).reward,3);
 assert.equal(E.buyQuest(s,'mohicans'),true);assert.equal(s.factors,110);assert.equal(s.hp,5);
 assert.equal(E.getSession(s).hp,22);assert.equal(E.getSession(s).reward,4);assert.equal(E.questCost(s),110);
 assert.equal(E.buyQuest(s,'mohicans'),true);assert.equal(s.factors,0);assert.equal(s.hp,5);
 assert.equal(E.getSession(s).hp,24);assert.equal(E.getSession(s).reward,4);assert.equal(E.questCost(s),121);
 const before=structuredClone(s);assert.equal(E.buyQuest(s,'mohicans'),false);assert.equal(E.buyQuest(s,'unknown'),false);assert.deepEqual(s,before);
 assert.equal(D.sessions[0].hp,20);assert.equal(D.sessions[0].reward,2);
});
test('leveled HP and rewards apply to real attacks, global reward and overkill',()=>{
 const s=combatFixture(1000);s.questLevels.mohicans=2;s.hp=22;s.levels.richter=50;s.selectedCharacterId='richter';s.upgrades.reward=3;s.upgrades.overkill=1;
 const before=s.factors;E.click(s,()=>.999);
 assert.equal(s.kills,1);assert.equal(s.hp,22);near(E.reward(s),5);near(s.factors-before,6);
 s.paused=false;const income=E.expectedIncome(s);s.questLevels.mohicans=3;s.hp=15;assert.equal(E.expectedIncome(s).reward,income.reward);
});
test('schema 12 migration preserves existing progress and new quest/time data round trips',()=>{
 const s=combatFixture(1000);s.factors=999;s.hp=3;s.levels.meta=10;
 const old=structuredClone(s);delete old.questLevels;delete old.sceneSeconds;
 assert.deepEqual(S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:12,state:old})),{...s,hp:6});
 s.questLevels.mohicans=7;s.hp=20;s.sceneSeconds=315.75;assert.deepEqual(S.decode(S.encode(s)),s);
 for(const value of [0,-1,1.5,NaN,null,10000])assert.throws(()=>S.validateState({...s,questLevels:{mohicans:value}}));
 assert.throws(()=>S.validateState({...s,questLevels:{unknown:2}}));
 for(const value of [-1,600,NaN,null])assert.throws(()=>S.validateState({...s,sceneSeconds:value}));
 assert.throws(()=>S.validateState({...s,hp:1e6}));
 const huge=combatFixture();huge.questLevels.mohicans=2000;huge.factors=1e100;assert.equal(E.questCost(huge),Infinity);assert.equal(E.buyQuest(huge,'mohicans'),false);
});
test('scene phase follows game time, pauses, loops, and respects offline cap even with no allies',()=>{
 const s=combatFixture(1000);E.advance(s,290);assert.equal(s.sceneSeconds,290);near(UI.scenePhase(290,D.sceneCycle).night,.5);
 assert.equal(UI.scenePhase(0,D.sceneCycle).label,'昼');assert.equal(UI.scenePhase(350,D.sceneCycle).label,'夜');near(UI.scenePhase(590,D.sceneCycle).night,.5);
 E.advance(s,310);near(s.sceneSeconds,0);s.paused=true;E.advance(s,400);assert.equal(s.sceneSeconds,0);
 s.paused=false;s.sceneSeconds=33;E.catchUp(s,1000+(D.maxOfflineSeconds+100)*1000);near(s.sceneSeconds,(33+D.maxOfflineSeconds)%600);
});

test('quest tab, preview, purchase and saved level work; character picker says Geruhamto',()=>{
 const s=combatFixture(1000);s.paused=true;s.factors=500;s.hp=5;const h=harness(s);
 assert.equal(h.get('picker-name-richter').textContent,'ゲルハムト');h.click('tab-quests');assert.equal(h.get('panel-quests').hidden,false);assert.equal(h.get('panel-characters').hidden,true);
 assert.equal(h.get('quest-hp-mohicans').textContent,'20 → 22');assert.equal(h.get('quest-reward-mohicans').textContent,'3 → 4 Rd');
 h.get('quest-list').listeners.get('click')({target:{closest:sel=>sel==='[data-quest]'?({dataset:{quest:'mohicans'},disabled:false}):null}});
 assert.equal(h.saved().questLevels.mohicans,2);assert.equal(h.saved().factors,400);assert.equal(h.saved().hp,5);
 assert.equal(h.get('quest-hp-mohicans').textContent,'22 → 24');assert.match(h.get('quest-cost-mohicans').textContent,/110/);assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'22');
 h.get('tab-quests').listeners.get('keydown')({key:'ArrowRight',preventDefault(){}});assert.equal(h.document.activeElement.id,'tab-upgrades');
});

test('day/night render advances without forcing formula recalculation on every tick',()=>{
 const s=combatFixture(1000);s.sceneSeconds=289;const h=harness(s);
 const before=Number(h.get('arena-viewport').style.getPropertyValue('--night-opacity'));h.advance(1000);
 assert.ok(Number(h.get('arena-viewport').style.getPropertyValue('--night-opacity'))>before);assert.equal(h.metrics.formulas,0);
 assert.equal(h.get('scene-phase').textContent,'夕暮れ');h.click('pause');const paused=h.get('arena-viewport').style.getPropertyValue('--night-opacity');h.advance(1000);assert.equal(h.get('arena-viewport').style.getPropertyValue('--night-opacity'),paused);
});
