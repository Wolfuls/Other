'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,character:c,rng,faces,ready,enable,neutralHealth,roundTrip}=require('./current-fixtures.cjs');
for(const q of D.sessions)test(`${q.id}: original stats, four intensities and independent HP/reward/action curves`,()=>{
 const s=ready(['meta'],q.id),base=E.getSession(s);s.questLevels[q.id]=100;E.setQuestLevel(s,q.id,30);const grown=E.getSession(s);
 for(const k of ['attack','accuracy','evasion','ss','defense','resistance'])assert.deepEqual(grown[k],base[k]);
 assert.equal(grown.strengthLevel,29);assert.ok(Math.abs(grown.hp/base.hp-E.T.enemyDurability(29,'vitality')/100)<1/base.hp);assert.ok(Math.abs(grown.reward/base.reward-1.04**29*(1+29/100)**(100*Math.log(1.28/1.04)))<1/base.reward);assert.equal(grown.actionMultiplier,E.T.enemyValue(29)/100);
 assert.deepEqual(E.formationIds(s),['meta']);assert.equal(roundTrip(s).questActiveLevels[q.id],30);
});
test('all quest unlocks remain after wallet falls, and the current roster/order are stable',()=>{
 const s=E.createState();assert.deepEqual(D.sessions.map(q=>q.id),['mohican-solo','scarecrow','mohicans','dementor','ozmorn']);assert.equal(E.isQuestUnlocked(s,'ozmorn'),false);
 s.factors=1e6;E.refreshQuestUnlocks(s);s.factors=0;for(const q of D.sessions)assert.equal(E.isQuestUnlocked(roundTrip(s),q.id),true);
});
test('formations move occupied characters atomically, keep five-unit cap and preserve explicit empty parties',()=>{
 const s=ready(D.characters.slice(0,5).map(c=>c.id));for(const char of D.characters)s.levels[char.id]=1;
 assert.equal(E.setFormation(s,'mohicans',D.characters.slice(0,6).map(c=>c.id)),false);assert.ok(E.setFormation(s,'mohicans',['meta','richter']));assert.deepEqual(E.formationIds(s,'scarecrow'),D.characters.slice(0,5).map(c=>c.id).filter(id=>!['meta','richter'].includes(id)));
 assert.ok(E.setFormation(s,'mohicans',[]));assert.deepEqual(E.formationIds(roundTrip(s),'mohicans'),[]);assert.equal(E.setFormation(s,'mohicans',['meta','meta']),false);
});
test('camera switches preserve independent enemy IDs, HP, AP, poison, focus and pending effects',()=>{
 const s=ready(['meta'],'mohicans');s.levels.richter=1;E.setFormation(s,'dementor',['richter']);const enemy=s.enemies[1];enemy.hp=11;enemy.poisonDamage=4;enemy.actionPoints=8;enemy.evasionFailure=true;E.selectEnemy(s,enemy.id);const before=E.battleSnapshot(s);
 E.selectSession(s,'dementor');E.advance(s,.25,rng());E.selectSession(s,'mohicans');assert.deepEqual(E.battleSnapshot(s),before);assert.equal(roundTrip(s).focusedEnemyId,enemy.id);
});
test('level change clears battle AP/statuses without healing allies or touching another battle',()=>{
 const s=ready(['meta'],'mohicans');s.levels.richter=1;E.setFormation(s,'dementor',['richter']);const other=E.battleSnapshot(E.battleContext(s,'dementor'));s.health.meta.hp=8;s.runaway.meta.runawayRate=41;s.actionPoints.meta=9;s.enemies[0].poisonDamage=4;s.enemies[0].actionPoints=8;s.questLevels.mohicans=2;
 assert.ok(E.setQuestLevel(s,'mohicans',2));assert.equal(s.actionPoints.meta,0);assert.equal(s.enemies[0].actionPoints,0);assert.equal(s.enemies[0].poisonDamage,0);assert.equal(s.health.meta.hp,8);assert.equal(s.runaway.meta.runawayRate,41);assert.deepEqual(E.battleSnapshot(E.battleContext(s,'dementor')),other);
});
test('both wipes stop opposing AP; player manual attack remains possible against a living enemy',()=>{
 const s=ready(['meta'],'mohicans');s.selectedCharacterId=null;s.health.meta={hp:-1,status:'dying',regenSeconds:0};for(const e of s.enemies)e.actionPoints=50;E.advance(s,1,rng());assert.ok(s.enemies.every(e=>e.actionPoints===0));assert.ok(E.click(s,()=>.5).some(e=>e.hit));
 for(const e of s.enemies){e.hp=0;e.respawnSeconds=5;}s.hp=0;s.actionPoints.meta=20;E.advance(s,1,rng());assert.equal(s.actionPoints.meta,0);assert.deepEqual(E.click(s),[]);
});
test('AP uses the maximum of median, mean and peak terms, excluding intrinsic zero actors and including down participants',()=>{
 const s=ready(['meta','richter'],'scarecrow');assert.equal(E.actionThreshold(s),29);s.health.richter={hp:-3,status:'dying',regenSeconds:0};assert.equal(E.actionThreshold(s),29);
 E.setFormation(s,'scarecrow',['meta']);assert.equal(E.actionThreshold(s),30);assert.equal(E.enemyActionPower(s),0);
});
test('swarm individuals attack independently after their animation, die separately and return after five seconds',()=>{
 const s=ready(['meta'],'mohicans');s.levels.meta=11;s.concentration.meta.vitality=10;s.health.meta.hp=E.maxHP(s,c('meta'));for(const e of s.enemies)e.actionPoints=E.actionThreshold(s)-1;
 const windups=E.advance(s,1,()=>.5).filter(e=>e.type==='enemyWindup');assert.equal(windups.length,3);const hp=s.health.meta.hp;E.advance(s,.2,()=>.5);assert.equal(s.health.meta.hp,hp);const impacts=E.advance(s,1,()=>.5).filter(e=>e.type==='enemyAttack');assert.equal(impacts.length,3);
 s.health.meta.hp=E.maxHP(s,c('meta'));s.actionPoints.meta=0;const e=s.enemies[1],neighbor=s.enemies[0].hp;s.health.meta.status='active';s.selectedCharacterId=null;e.hp=1;e.respawnSeconds=0;E.selectEnemy(s,e.id);E.click(s,()=>.5);assert.equal(e.hp,0);assert.equal(s.enemies[0].hp,neighbor);E.advance(s,4.99,()=>.5);assert.equal(e.hp,0);E.advance(s,.02,()=>.5);assert.ok(e.hp>0);
});
test('concentration belongs to the character, is free and cannot exceed earned points',()=>{
 const s=ready(['meta','richter']);s.levels.meta=11;const before=s.factors,base=E.strengthValue(s,c('meta'),'armor'),other=E.strengthValue(s,c('richter'),'armor');
 assert.ok(E.setConcentration(s,'meta',{power:3,armor:5,evasion:1,action:1,accuracy:0,vitality:0}));assert.equal(s.factors,before);assert.ok(E.strengthValue(s,c('meta'),'armor')>base);assert.equal(E.strengthValue(s,c('richter'),'armor'),other);assert.equal(E.attackProfile(s,c('meta')).flat,5);
 assert.equal(E.setConcentration(s,'meta',{...s.concentration.meta,power:4}),false);E.setFormation(s,'mohicans',['meta']);assert.equal(s.concentration.meta.armor,5);
});

test('physical defense and mental resistance remain separate, minimum damage is one',()=>{
 for(const char of D.characters){const s=ready([char.id],'mohican-solo');const p=E.enemyHitProfile(s,s.enemies[0],char);assert.equal(p.reduction,char.defense);E.setFormation(s,'dementor',[char.id]);E.selectSession(s,'dementor');assert.equal(E.enemyHitProfile(s,E.ensureEnemies(s)[0],char).reduction,char.resistance);}
 const p={accuracySpec:{flat:100,dice:0},evasionDice:{flat:60,dice:0},attack:{flat:1,dice:0},reduction:999,shield:0};assert.equal(E.rollEnemyHit(p).damage,1);
});
test('retake and reversal reroll once; luck halves lethal damage before spirit saves at one',()=>{
 const p={accuracySpec:{flat:20,dice:1},evasionDice:{flat:5,dice:1},attack:{flat:10,dice:0},reduction:0,shield:0,retake:true,reversal:true};
 const hit=E.rollEnemyHit(p,faces(6,2,4,1,6,3,4));assert.equal(hit.accuracyReroll,true);assert.equal(hit.evasionReroll,true);assert.ok(hit.accuracy.original.critical);assert.ok(hit.evasion.original.fumble);
 const s=ready(['meta'],'mohican-solo');s.health.meta.hp=2;s.upgrades.badLuck=s.upgrades.fightingSpirit=1;s.enemies[0].pendingAttack={targetId:'meta',count:1,remaining:.1,profile:{...p,accuracySpec:{flat:50,dice:0},evasionDice:{flat:40,dice:0},retake:false,reversal:false}};
 const e=E.advance(s,.1,()=>0).find(e=>e.type==='enemyAttack');assert.ok(e.badLuck&&e.fightingSpirit);assert.equal(s.health.meta.hp,1);assert.equal(s.health.meta.status,'active');
});
test('wounded/down allies regenerate at six seconds and revival pays a quote once',()=>{
 const s=ready();s.health.meta={hp:-1,status:'dying',regenSeconds:0};E.advance(s,6,()=>.5);assert.equal(s.health.meta.hp,0);assert.equal(s.health.meta.status,'dying');const cost=E.revivalCost(s,'meta'),balance=s.factors;assert.ok(E.revive(s,'meta'));assert.equal(s.factors,balance-cost);assert.equal(s.health.meta.hp,20);assert.equal(E.revive(s,'meta'),false);
});
test('bulk and split deterministic steps agree, including offscreen battles and eventless processing',()=>{
 const a=ready(['meta']);a.levels.richter=1;E.setFormation(a,'mohican-solo',['richter']);const b=structuredClone(a),c=structuredClone(a);E.advance(a,30,()=>.5,true);for(let i=0;i<300;i++)E.advance(b,.1,()=>.5,false);E.advance(c,30,()=>.5,false);
 const rounded=x=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='number'?Math.round(v*1e8)/1e8:v));
 for(const key of ['factors','earned','kills','health','runaway','enemies','sessionStates']){assert.deepEqual(rounded(a[key]),rounded(b[key]));assert.deepEqual(a[key],c[key]);}
});
