'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js'),B=require('../js/battle-batch.js'),{harness}=require('./app-harness.cjs');
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
test('quest purchase previews and charges scaling price, preserves health ratio and leaves base data unchanged',()=>{
 const s=E.createState(1000);s.hp=5;s.factors=225;
 assert.equal(E.questCost(s),100);assert.equal(E.getSession(s).hp,20);assert.equal(E.getSession(s).reward,2);
 assert.equal(E.buyQuest(s,'mohicans'),true);assert.equal(s.factors,125);assert.equal(s.hp,6);
 assert.equal(E.getSession(s).hp,23);assert.equal(E.getSession(s).reward,3);assert.equal(E.questCost(s),125);
 assert.equal(E.buyQuest(s,'mohicans'),true);assert.equal(s.factors,0);assert.equal(s.hp,7);
 assert.equal(E.getSession(s).hp,26);assert.equal(E.getSession(s).reward,3);assert.equal(E.questCost(s),156);
 const before=structuredClone(s);assert.equal(E.buyQuest(s,'mohicans'),false);assert.equal(E.buyQuest(s,'unknown'),false);assert.deepEqual(s,before);
 assert.equal(D.sessions[0].hp,20);assert.equal(D.sessions[0].reward,2);
});
test('leveled HP and rewards apply to real attacks, global reward and overkill',()=>{
 const s=E.createState(1000);s.questLevels.mohicans=2;s.hp=23;s.levels.richter=50;s.selectedCharacterId='richter';s.upgrades.reward=3;s.upgrades.overkill=1;
 const before=s.factors;E.click(s,()=>.999);
 assert.equal(s.kills,1);assert.equal(s.hp,23);near(E.reward(s),4);near(s.factors-before,5);
 s.paused=false;const income=E.expectedIncome(s);s.questLevels.mohicans=3;s.hp=15;assert.equal(E.expectedIncome(s).reward,income.reward);
});
test('schema 12 migration preserves existing progress and new quest/time data round trips',()=>{
 const s=E.createState(1000);s.factors=999;s.hp=3;s.levels.meta=10;
 const old=structuredClone(s);delete old.questLevels;delete old.sceneSeconds;
 assert.deepEqual(S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:12,state:old})),{...s,hp:6});
 s.questLevels.mohicans=7;s.hp=20;s.sceneSeconds=315.75;assert.deepEqual(S.decode(S.encode(s)),s);
 for(const value of [0,-1,1.5,NaN,null,10000])assert.throws(()=>S.validateState({...s,questLevels:{mohicans:value}}));
 assert.throws(()=>S.validateState({...s,questLevels:{unknown:2}}));
 for(const value of [-1,600,NaN,null])assert.throws(()=>S.validateState({...s,sceneSeconds:value}));
 assert.throws(()=>S.validateState({...s,hp:1e6}));
 const huge=E.createState();huge.questLevels.mohicans=1100;huge.factors=1e100;assert.equal(E.questCost(huge),Infinity);assert.equal(E.buyQuest(huge,'mohicans'),false);
});
test('scene phase follows game time, pauses, loops, and respects offline cap even with no allies',()=>{
 const s=E.createState(1000);E.advance(s,290);assert.equal(s.sceneSeconds,290);near(UI.scenePhase(290,D.sceneCycle).night,.5);
 assert.equal(UI.scenePhase(0,D.sceneCycle).label,'昼');assert.equal(UI.scenePhase(350,D.sceneCycle).label,'夜');near(UI.scenePhase(590,D.sceneCycle).night,.5);
 E.advance(s,310);near(s.sceneSeconds,0);s.paused=true;E.advance(s,400);assert.equal(s.sceneSeconds,0);
 s.paused=false;s.sceneSeconds=33;E.catchUp(s,1000+(D.maxOfflineSeconds+100)*1000);near(s.sceneSeconds,(33+D.maxOfflineSeconds)%600);
});
test('very high quest HP uses a bounded deterministic estimate, supports spillover and conserves batch progress',()=>{
 const p={dice:5,flat:8,multiplier:4,rate:1,defense:2,overflow:true,overkillThreshold:20};
 for(const hp of [161,1e6,1e30]){
  const rates=B.rewardRates(hp,[p]);assert.equal(rates.approximate,true);assert.ok(rates.clears>0&&Number.isFinite(rates.clears));
  assert.deepEqual(B.rewardRates(hp,[p]),rates);
 }
 const hp=200,all=B.resolve(hp,hp,10000,[p]),a=B.resolve(hp,hp,4000,[p]),b=B.resolve(a.hp,hp,6000,[p]);
 assert.equal(all.kills,a.kills+b.kills);near(all.hp,b.hp,1e-6);assert.ok(all.overkills>0);
 const noOverflow=B.rewardRates(200,[{...p,overflow:false}]);assert.ok(B.rewardRates(200,[p]).clears>noOverflow.clears);
 const s=E.createState(1000);s.questLevels.mohicans=100;s.hp=E.getSession(s).hp;s.levels.richter=50;s.actionLevels.richter=1000;s.purchasedPerks.richter=['bom-ber'];
 const estimate=E.expectedIncome(s);assert.ok(Number.isFinite(estimate.factorsPerSecond));E.catchUp(s,1000+D.maxOfflineSeconds*1000);assert.ok(s.hp>0&&s.hp<=E.getSession(s).hp);assert.doesNotThrow(()=>S.encode(s));
});
test('quest tab, preview, purchase and saved level work; character picker says Geruhamto',()=>{
 const s=E.createState(1000);s.paused=true;s.factors=500;s.hp=5;const h=harness(s);
 assert.equal(h.get('picker-name-richter').textContent,'ゲルハムト');h.click('tab-quests');assert.equal(h.get('panel-quests').hidden,false);assert.equal(h.get('panel-characters').hidden,true);
 assert.equal(h.get('quest-hp-mohicans').textContent,'20 → 23');assert.equal(h.get('quest-reward-mohicans').textContent,'2 → 3 Rd');
 h.get('quest-list').listeners.get('click')({target:{closest:()=>({dataset:{quest:'mohicans'},disabled:false})}});
 assert.equal(h.saved().questLevels.mohicans,2);assert.equal(h.saved().factors,400);assert.equal(h.saved().hp,6);
 assert.equal(h.get('quest-hp-mohicans').textContent,'23 → 26');assert.match(h.get('quest-cost-mohicans').textContent,/125/);assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'23');
 h.get('tab-quests').listeners.get('keydown')({key:'ArrowRight',preventDefault(){}});assert.equal(h.document.activeElement.id,'tab-upgrades');
});
test('bounded high-HP model tracks independent sampled armor, KO, overkill and spillover outcomes',()=>{
 const profiles=[{dice:2,flat:3,multiplier:3,rate:2,defense:0,overflow:false,overkillThreshold:20},{dice:5,flat:8,multiplier:5.9,rate:1,defense:4,overflow:true,overkillThreshold:20}];
 for(const maxHP of [200,500,1500]){
  let seed=71313,hp=maxHP,kills=0,overkills=0;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const count=160000;
  for(let i=0;i<count;i++){
   const p=profiles[rng()<2/3?0:1];let raw=B.scaleDamage(E.roll(p.dice,p.flat,rng),p.multiplier);
   for(;;){const damage=Math.max(0,raw-p.defense),before=hp;hp-=damage;
    if(hp<=0){kills++;if(hp<=-20)overkills++;const excess=-hp;hp=maxHP;if(p.overflow&&excess>0){raw=excess;continue;}}
    else if(damage>0&&hp<=4&&rng()<.5){kills++;hp=maxHP;}
    break;
   }
  }
  const estimate=B.rewardRates(maxHP,profiles);
  assert.ok(Math.abs(estimate.clears/3-kills/count)/(kills/count)<.06);
  assert.ok(Math.abs(estimate.overkills/3-overkills/count)<.006);
 }
});
test('day/night render advances without forcing formula recalculation on every tick',()=>{
 const s=E.createState(1000);s.sceneSeconds=289;const h=harness(s);
 const before=Number(h.get('arena-viewport').style.getPropertyValue('--night-opacity'));h.advance(1000);
 assert.ok(Number(h.get('arena-viewport').style.getPropertyValue('--night-opacity'))>before);assert.equal(h.metrics.formulas,0);
 assert.equal(h.get('scene-phase').textContent,'夕暮れ');h.click('pause');const paused=h.get('arena-viewport').style.getPropertyValue('--night-opacity');h.advance(1000);assert.equal(h.get('arena-viewport').style.getPropertyValue('--night-opacity'),paused);
});
