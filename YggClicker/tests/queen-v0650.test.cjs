'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip,enable}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs'),FX=require('../js/combat-effects'),F=require('../js/matchup');
const queen=()=>character('queen');
function encounter(ids=['queen'],quest='mohican-solo'){const s=ready(ids,quest);E.selectCharacter(s,'queen');return s;}
function pending(s,e,target='queen',apCost=100){e.pendingAttack={targetId:target,remaining:.01,count:1,kind:'attack',apCost,profile:{accuracySpec:{flat:-100,dice:0},evasionDice:{flat:100,dice:0},attack:{dice:0,flat:1},reduction:0,shield:0,hitLogRatio:0,damageLogRatio:0,damageScaleLog:0}};return E.advance(s,.01,()=>.4);}
test('Queen has the specified hidden base, costs, reaction type and six perk levels/pressures',()=>{
 const c=queen();assert.deepEqual([c.cost,c.powerCost,c.action,c.dice,c.flat,c.maxHP,c.defense,c.resistance],[30000,6000,10,1,0,15,0,8]);assert.deepEqual(c.ss,{flat:17,dice:2});assert.equal(c.activationType,'reaction');assert.equal(c.baseRunawayPressure,.03);
 assert.deepEqual(c.perks.map(p=>p.level),[0,25,50,75,100,150]);assert.deepEqual(c.perks.map(p=>Math.round(p.runawayPressure*600)),[0,4,3,8,15,10]);assert.ok(c.hiddenAttack);assert.equal(c.statFlavor.power,'計り知れない');
});
test('BLESS rolls mental 4D6 against resistance and strength, reducing only AP with a zero floor',()=>{
 const s=encounter(),e=s.enemies[0],p=E.attackProfile(s,queen());assert.ok(p.apAttack&&p.mental);assert.equal(p.dice,4);assert.equal(p.flat,0);assert.equal(p.accuracy.flat,17);assert.equal(p.evasion.flat,E.getSession(s).ss.flat);assert.equal(p.defense,2);
 e.actionPoints=1000;e.poisonDamage=4;s.poisonDamage=4;const before={hp:e.hp,total:s.totalDamage,kills:s.kills,factors:s.factors};e.evasionFailure=true;
 const hit=E.click(s,()=>.4).find(x=>x.type==='attack');assert.ok(hit.apDamage&&hit.hit);assert.ok(hit.damage>0);assert.equal(e.actionPoints,1000-hit.damage);assert.equal(e.hp,before.hp);assert.equal(s.totalDamage,before.total);assert.equal(s.kills,before.kills);assert.equal(s.factors,before.factors);assert.equal(e.poisonDamage,4);
 e.actionPoints=1;e.evasionFailure=true;E.click(s,()=>.4);assert.equal(e.actionPoints,0);assert.equal(e.hp,before.hp);
 const low=E.attackProfile(s,queen());s.levels.queen=200;const high=E.attackProfile(s,queen());assert.ok(high.damageScaleLog>low.damageScaleLog&&high.damageLogRatio>low.damageLogRatio);
 assert.equal(E.averageAttackDamage(s,queen()),0);const f=F.matchup(s,queen());assert.equal(f.averageDamage,0);assert.ok(f.averageAPDamage>0&&f.apAttack);
});
test('BLESS misses leave AP untouched; KILLER adds only to BLESS and OFF restores internal 1D6',()=>{
 const s=encounter();s.questLevels[s.sessionId]=1000;s.questActiveLevels[s.sessionId]=1000;s.enemies=null;s.hp=E.getSession(s).hp;const e=E.ensureEnemies(s)[0];e.actionPoints=100;
 assert.equal(E.click(s,()=>.4)[0].hit,false);assert.equal(e.actionPoints,100);
 enable(s,'queen','killer-queen');assert.equal(E.attackProfile(s,queen()).dice,6);E.togglePerk(s,'queen','queens-bless',false);
 const p=E.attackProfile(s,queen());assert.equal(p.dice,1);assert.equal(p.apAttack,false);assert.equal(p.mental,false);
});
test('royal party effects include self, remain session-local and stop when Queen is down or OFF',()=>{
 const s=encounter(['queen','meta'],'mohicans');s.levels.mitsuru=1;E.setFormation(s,'dementor',['mitsuru']);const other=E.battleContext(s,'dementor'),base=E.enemyActionPower(s,20),own=E.accuracySpec(s,queen(),true).flat;
 enable(s,'queen','royal-presence','royal-blessing','royal-intimidation');assert.equal(E.accuracySpec(s,queen(),true).flat,own+4);assert.equal(E.accuracySpec(s,character('meta'),false).flat,18);assert.equal(E.accuracySpec(other,character('mitsuru'),false).flat,13);
 for(const e of s.enemies)assert.equal(E.enemyActionPower(s,20,e),Math.floor(base*.9));assert.equal(E.enemyActionPower(other,20),E.enemyActionValue(E.getSession(other),20));
 for(const id of ['queen','meta'])assert.equal(E.runawayPressureBreakdown(s,character(id)).calming,.1/60);assert.equal(E.runawayPressureBreakdown(s,character('mitsuru')).calming,0);
 s.health.queen.status='unconscious';assert.equal(E.enemyActionPower(s,20),base);assert.equal(E.accuracySpec(s,character('meta'),false).flat,14);assert.equal(E.runawayPressureBreakdown(s,character('meta')).calming,0);
 s.health.queen.status='active';E.togglePerk(s,'queen','royal-presence',false);assert.equal(E.accuracySpec(s,character('meta'),false).flat,14);
});
test('interception cancels four times with 0/25/50/75 percent refunds, then becomes ineffective',()=>{
 const s=encounter();enable(s,'queen','insolent');const e=s.enemies[0],hp=e.hp,allyHP=s.health.queen.hp;e.actionPoints=20;
 for(const [i,ap]of [20,45,95,170].entries()){
  const events=pending(s,e);assert.ok(events.some(x=>x.type==='queenIntercept'&&x.hit));assert.ok(events.some(x=>x.type==='enemyCancel'));assert.ok(!events.some(x=>x.type==='enemyAttack'));assert.equal(e.actionPoints,ap);assert.equal(e.queenCancels,i+1);assert.equal(e.hp,hp);assert.equal(s.health.queen.hp,allyHP);
 }
 const immune=pending(s,e);assert.ok(!immune.some(x=>x.type==='queenIntercept'));assert.ok(immune.some(x=>x.type==='enemyAttack'));assert.equal(e.queenCancels,4);assert.equal(e.actionPoints,170);assert.equal(roundTrip(s).enemies[0].queenCancels,4);
});
test('failed interception does not advance immunity; allies are not guarded by the counter',()=>{
 const s=encounter(['queen','meta']);enable(s,'queen','insolent');const e=s.enemies[0];assert.ok(!pending(s,e,'meta').some(x=>x.type==='queenIntercept'));assert.equal(e.queenCancels,0);
 s.questLevels[s.sessionId]=1000;s.questActiveLevels[s.sessionId]=1000;s.enemies=null;s.hp=E.getSession(s).hp;const strong=E.ensureEnemies(s)[0];const events=pending(s,strong);assert.ok(events.some(x=>x.type==='queenIntercept'&&!x.hit));assert.ok(events.some(x=>x.type==='enemyAttack'));assert.equal(strong.queenCancels,0);
 E.togglePerk(s,'queen','insolent',false);assert.ok(!pending(s,strong).some(x=>x.type==='queenIntercept'));
});
test('immunity is independent per enemy, resets with the encounter, and pending AP cost is saved',()=>{
 const s=encounter(['queen'],'mohicans');enable(s,'queen','insolent');s.enemies[0].queenCancels=4;s.enemies[1].queenCancels=2;
 const events=pending(s,s.enemies[2]);assert.ok(events.some(x=>x.type==='queenIntercept'&&x.hit));assert.deepEqual(s.enemies.map(e=>e.queenCancels),[4,2,1]);
 s.enemies[0].pendingAttack={targetId:'queen',remaining:.3,count:2,kind:'attack',apCost:40};assert.equal(roundTrip(s).enemies[0].pendingAttack.apCost,40);
 s.questLevels.mohicans=2;E.setQuestLevel(s,'mohicans',2);assert.ok(s.enemies.every(e=>e.queenCancels===0));
 for(const value of [-1,5,1.5]){s.enemies[0].queenCancels=value;assert.throws(()=>S.encode(s));}
});
test('old saves add unhired Queen without losing progress or changing run records',()=>{
 const s=ready(['meta']);s.runNumber=7;s.previousRunsEarned=12345;for(const field of ['levels','health','runaway','actionPoints','concentration','perkEnabled','purchasedPerks','unlockedPerks'])delete s[field].queen;
 for(const e of s.enemies)delete e.queenCancels;const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:44,state:s}));assert.equal(loaded.levels.queen,0);assert.equal(loaded.runNumber,7);assert.equal(loaded.previousRunsEarned,12345);assert.equal(loaded.factors,s.factors);assert.equal(loaded.enemies[0].queenCancels,0);assert.deepEqual(roundTrip(loaded),loaded);
});
test('Queen UI hides attack base, retains flavors, supports revival and bounded rapid animation',()=>{
 const s=encounter();s.paused=true;const h=harness(s);assert.equal(h.get('queen-combatant').hidden,false);h.openAbility('queen');assert.equal(h.get('ability-base-power-queen').textContent,'？？？');assert.equal(h.get('ability-base-ss-queen').textContent,'17＋2D6');assert.match(h.get('health-queen').textContent,/命中 8＋2D6/);
 const d=encounter();d.paused=true;d.health.queen={hp:-1,status:'dying',regenSeconds:0};const ui=harness(d);ui.click('queen-select');assert.ok(ui.get('revive-dialog').open);
 const frames=FX.plan([{type:'attack',actorId:'queen',apDamage:true,count:4,damage:32,hpBefore:20,hpAfter:20}]);assert.equal(frames.reduce((n,f)=>n+f.queenAttacks,0),4);assert.ok(frames.every(f=>f.volleyQueenCount===4&&f.apDamage));
});

test('large AP-only volleys leave enemy HP and rewards untouched',()=>{
 const s=encounter(['queen'],'scarecrow'),e=s.enemies[0];s.actionPoints.queen=E.actionThreshold(s)*2000;e.actionPoints=10000;
 const before={hp:e.hp,total:s.totalDamage,kills:s.kills,factors:s.factors};const events=E.advance(s,1,()=>.4);
 assert.ok(events.some(e=>e.type==='attack'&&e.apDamage&&e.approximate));assert.equal(e.hp,before.hp);assert.equal(s.totalDamage,before.total);assert.equal(s.kills,before.kills);assert.equal(s.factors,before.factors);assert.ok(e.actionPoints<10000&&e.actionPoints>=0);
});

test('bounded visual summaries never add AP reduction into HP damage',()=>{
 const events=Array.from({length:240},(_,i)=>({type:'attack',actorId:i%2?'queen':'meta',apDamage:!!(i%2),count:1,damage:i%2?7:3,hpBefore:500,hpAfter:i%2?500:497}));
 const frames=FX.plan(events);assert.ok(frames.length<=24);assert.equal(frames.filter(f=>f.apDamage).reduce((n,f)=>n+f.damage,0),840);assert.equal(frames.filter(f=>!f.apDamage).reduce((n,f)=>n+f.damage,0),360);
 assert.ok(frames.filter(f=>f.apDamage).every(f=>f.metaAttacks===0));assert.ok(frames.filter(f=>!f.apDamage).every(f=>f.queenAttacks===0));
});
