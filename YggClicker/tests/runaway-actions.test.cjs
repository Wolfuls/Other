'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,character:c,faces,ready,enable,neutralHealth}=require('./current-fixtures.cjs');
function symptom(s,id,value){s.runaway[id].runawayRate=75;s.runaway[id].runawaySymptom=value;}
test('assigned activation types and provisional pressure values match the roster',()=>{
 for(const [id,type,pressure]of [['meta','awakening',.02],['richter','awakening',.02],['jewel','awakening',.02],['vishunal','reaction',.01],['waku','reaction',.01],['tordeliese','recovery',.005],['max','recovery',.005]]){const s=ready([id]);assert.equal(s.runaway[id].activationType,type);assert.equal(E.runawayPressure(s,c(id)),pressure);}
});
test('oblivion skips actions, control substitutes a self/ally/enemy attack, overload follows the attack',()=>{
 const s=ready();symptom(s,'meta','oblivion');assert.equal(E.click(s,()=>.25)[0].type,'runawaySkip');assert.equal(s.hp,35);
 symptom(s,'meta','control');const misfire=E.click(s,faces(1,1,4,4,4));assert.ok(misfire.some(e=>e.type==='runawayMisfire'));assert.equal(s.hp,35);
 symptom(s,'meta','overload');const events=E.click(s,()=>.5);assert.ok(events.findIndex(e=>e.type==='attack')<events.findIndex(e=>e.type==='runawayDamage'));assert.ok(s.health.meta.hp<20);assert.equal(s.perkFailures,undefined);
});
test('vision halves original fixed terms, memory/hearing halve totals, body halves raw damage',()=>{
 const s=ready(),a=E.accuracySpec(s,c('meta')),v=E.evasionSpec(s,c('meta'));
 symptom(s,'meta','vision');assert.equal(E.accuracySpec(s,c('meta')).flat,Math.floor(a.flat/2));assert.equal(E.evasionSpec(s,c('meta')).flat,Math.floor(v.flat/2));
 symptom(s,'meta','memory');assert.equal(E.combatRoll(E.accuracySpec(s,c('meta')),faces(4)).total,Math.floor((a.flat+4)/2));
 symptom(s,'meta','hearing');assert.equal(E.combatRoll(E.evasionSpec(s,c('meta')),faces(4)).total,Math.floor((v.flat+4)/2));
 symptom(s,'meta','body');const p=E.attackProfile(s,c('meta'));assert.equal(p.resultScale,.5);assert.equal(E.scaledCombatTotal(9,p),4);
});
test('mind can fail an otherwise winning defense; ability/language can suppress a special perk while attack remains',()=>{
 const s=ready();symptom(s,'meta','mind');const p=E.enemyHitProfile(s,s.enemies[0],c('meta'));p.accuracySpec={flat:0,dice:0};p.evasionDice={flat:100,dice:0};assert.equal(E.rollEnemyHit(p,()=>.25).hit,true);assert.equal(E.rollEnemyHit(p,()=>.75).hit,false);
 for(const value of ['ability','language']){const a=ready(['tordeliese']);enable(a,'tordeliese','greedy-gale');symptom(a,'tordeliese',value);const ev=E.click(a,()=>.25);assert.ok(ev.some(e=>e.type==='attack'&&e.hit));assert.equal(a.enemies[0].poisonDamage,0);assert.equal(a.perkFailures,undefined);}
});
test('GM recipient resolves its own overload and oblivion without spending its AP',()=>{
 for(const value of ['overload','oblivion']){const s=ready(['max','meta']);s.selectedCharacterId='meta';symptom(s,'meta',value);s.actionPoints.max=E.actionThreshold(s);const events=E.advance(s,1,()=>.25);assert.ok(events.some(e=>e.delegatedBy==='max'));assert.ok(events.some(e=>e.type===(value==='overload'?'runawayDamage':'runawaySkip')));assert.ok(s.actionPoints.meta<E.actionThreshold(s));assert.doesNotThrow(()=>S.encode(s));}
});
test('large stateful action queues retain AP and spawn minions without skipping effects',()=>{
 const s=ready(['meta'],'ozmorn');neutralHealth(s,1000);s.questLevels.ozmorn=100;E.setQuestLevel(s,'ozmorn',100);s.accuracyLevels.meta=200;s.actionPoints.meta=1e12;E.click(s,()=>.5);E.selectEnemy(s,s.enemies[0].id);
 const events=E.advance(s,1,()=>.5);assert.ok(s.actionPoints.meta>1e11);assert.equal(E.livingEnemies(s).length,3);assert.ok(events.some(e=>e.type==='enemySummon'));assert.ok(s.enemies.slice(1).every(e=>e.hp>0));assert.doesNotThrow(()=>S.encode(s));
});
test('floor protection selects current lowest HP every ten seconds and expires even with perk OFF',()=>{
 const s=ready(['waku','meta']);enable(s,'waku','floor-clip');s.health.meta.hp=5;E.advance(s,.1,()=>.5);assert.equal(s.floorClipTargetId,'meta');s.health.waku.hp=4;E.advance(s,9,()=>.5);assert.equal(s.floorClipTargetId,'meta');E.advance(s,1,()=>.5);assert.equal(s.floorClipTargetId,'waku');E.togglePerk(s,'waku','floor-clip',false);E.advance(s,10,()=>.5);assert.equal(s.floorClipTargetId,null);
});
test('next evasion failure is consumed only by a judgment, not an automatic hit',()=>{
 const s=ready(['waku']);enable(s,'waku','full-screen-hurtbox');s.enemies[0].evasionFailure=true;E.click(s,()=>.01);assert.equal(s.enemies[0].evasionFailure,true);E.togglePerk(s,'waku','full-screen-hurtbox',false);E.click(s,()=>.5);assert.equal(s.enemies[0].evasionFailure,false);
});
