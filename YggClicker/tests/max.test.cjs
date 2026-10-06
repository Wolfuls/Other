'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs');
const max=D.characters.find(c=>c.id==='max'),meta=D.characters.find(c=>c.id==='meta');
function setup(){const s=combatFixture(1000);s.levels.max=1;s.levels.meta=1;s.actionLevels.max=100;s.selectedCharacterId='meta';return s;}
test('Max hires at 12000 and GM is initial with paid perks on their specified level tracks',()=>{
 const s=combatFixture();s.factors=11999;assert.equal(E.hire(s,'max'),false);s.factors++;assert.ok(E.hire(s,'max'));assert.equal(s.factors,0);assert.deepEqual(E.stats(s,max),{dice:1,flat:6});assert.equal(E.actionPower(s,max),50);assert.equal(E.hireCost(s,max),2400);assert.equal(E.actionCost(s,max),3000);
 assert.ok(E.perks(s,max)[0].unlocked);assert.equal(E.buyPerk(s,'max','gm'),false);
 for(const p of max.perks.filter(p=>!p.initial)){const track=p.levelType==='action'?'actionLevels':'levels';s.levels.max=1;s.actionLevels.max=0;s[track].max=p.level-1;s.factors=p.cost;assert.equal(E.buyPerk(s,'max',p.id),false);s[track].max=p.level;s.factors--;assert.equal(E.buyPerk(s,'max',p.id),false);s.factors++;assert.ok(E.buyPerk(s,'max',p.id));assert.equal(s.factors,0);assert.equal(E.buyPerk(s,'max',p.id),false);}
 assert.deepEqual(S.decode(S.encode(s)),s);s.actionLevels.max=99;assert.deepEqual(S.decode(S.encode(s)),s);assert.equal(E.perks(s,max).find(p=>p.id==='named-npc').unlocked,false);
});
test('support stacks once, includes Max in flat buffs, follows selection and rounds the total bonus',()=>{
 const s=setup();assert.equal(E.actionPower(s,meta),50);s.purchasedPerks.max=[];assert.equal(E.actionPower(s,meta),50);assert.equal(E.actionPower(s,max),300);
 s.purchasedPerks.max.push('plot-armor','handout');assert.equal(E.actionPower(s,meta),72);assert.equal(E.actionPower(s,max),310);
 E.selectCharacter(s,'max');assert.equal(E.actionPower(s,meta),60);assert.equal(E.actionPower(s,max),372);
 s.actionLevels.meta=1;assert.equal(E.actionPower(s,meta),62);E.selectCharacter(s,'meta');assert.equal(E.actionPower(s,meta),74);
 s.levels.max=0;assert.equal(E.actionPower(s,meta),52);
});
test('Named NPC gives free attempts only to the selected automatic actor and keeps integer points',()=>{
 const s=setup();s.purchasedPerks.max=['named-npc'];s.actionPoints.meta=50;
 // Geometric .75 gives 3 attempts; each dice roll is 1 and no knockout occurs.
 const rolls=[.75,0,0,0];const events=E.advance(s,1,()=>rolls.length?rolls.shift():0);
 assert.equal(events.filter(e=>e.type==='attack'&&e.actorId==='meta'&&!e.delegatedBy).length,3);assert.equal(s.actionPoints.meta,0);
 assert.equal(E.freeActionChance(s,meta),.5);assert.equal(E.freeActionChance(s,max),0);assert.equal(E.effectiveAttackRate(s,meta),4);
 const points=s.actionPoints.meta;assert.equal(E.click(s,()=>0).filter(e=>e.type==='attack').length,1);assert.equal(s.actionPoints.meta,points);
 E.selectCharacter(s,'max');assert.equal(E.freeActionChance(s,meta),0);assert.equal(E.freeActionChance(s,max),.5);
});
test('selection invalidates support income forecasts and batch includes Max with free-action rates',()=>{
 const s=setup();s.purchasedPerks.max=['handout','named-npc'];const a=E.expectedIncome(s);E.selectCharacter(s,'max');const b=E.expectedIncome(s);assert.notEqual(a,b);assert.notEqual(a.factorsPerSecond,b.factorsPerSecond);
 s.actionLevels.max=10000;const events=E.advance(s,120,()=>0);assert.ok(events.some(e=>e.maxTransfers>0));assert.ok(s.kills>0);assert.deepEqual(S.decode(S.encode(s)),s);
 const frames=FX.plan(events);assert.equal(frames.reduce((n,f)=>n+f.maxTransfers,0),events.reduce((n,e)=>n+(e.maxTransfers||0),0));
});
test('old saves omit Max safely and retain all pre-existing progression',()=>{
 const s=combatFixture(1000);s.factors=1234;s.levels.meta=12;
 for(const k of ['levels','actionLevels','actionPoints','purchasedPerks'])delete s[k].max;
 const restored=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:S.VERSION,state:s}));assert.equal(restored.factors,1234);assert.equal(restored.levels.meta,12);assert.equal(restored.levels.max,0);assert.deepEqual(restored.purchasedPerks.max,[]);
});
test('Max floats at the rear with room for the hover cycle while other allies stay grounded',()=>{
 for(const mobile of [false,true])for(const width of [320,800,1400]){const l=UI.orbitLayout({width,mobile,grounded:true,metaHired:true,richterHired:true,vishunalHired:true,tordelieseHired:true,maxHired:true,metaCount:0,richterCount:0,enemyCount:3,availableHeight:350});
 assert.equal(l.tordeliese.spriteSize,mobile?216:230);assert.equal(l.max.spriteSize,180);
 const ground=l.tordeliese.y+l.tordeliese.footOffset;
 assert.ok(Math.abs(ground-l.max.y-l.max.footOffset-l.max.hoverHeight)<1e-9);
 assert.equal(l.meta.y+l.meta.footOffset,ground);assert.equal(l.richter.y+l.richter.footOffset,ground);
 assert.ok(l.max.x+90<l.meta.x);assert.ok(l.max.y-90-5>=0);assert.ok(l.tordeliese.x+l.tordeliese.footprint/2<l.enemyX-l.enemyWidth/2);assert.ok(l.viewWidth<=width+.01);}
});
test('Max is selectable, drops tubs and clears visual queues on pause',()=>{
 const s=setup();s.selectedCharacterId='max';const h=harness(s);h.click('max-select');h.click('attack');assert.equal(h.get('max-tubs').children.length,1);assert.ok(h.get('max-combatant').classList.contains('attacking'));
 h.advance(1500);assert.ok(h.get('max-combatant').classList.contains('bursting'));h.click('pause');assert.equal(h.get('max-tubs').children.length,0);assert.equal(h.get('max-combatant').classList.contains('bursting'),false);
});

test('Max without conscious recipients attacks normally; manual attacks and upgrades still work',()=>{
 const s=combatFixture(1000);s.levels.max=1;s.selectedCharacterId='max';
 assert.equal(E.actionMultiplier(s,max),1);assert.equal(E.characterDps(s,max),4.75);assert.equal(E.effectiveAttackRate(s,max),.5);assert.equal(E.automaticActionRate(s,max),.5);assert.ok(E.expectedIncome(s).factorsPerSecond>0);
 const events=E.advance(s,2,()=>0);assert.equal(events.length,1);assert.equal(events[0].type,'attack');assert.equal(s.hp,13);assert.equal(s.totalDamage,7);assert.equal(s.actionPoints.max,0);
 const frames=FX.plan(events);assert.equal(frames[0].maxTransfers,0);assert.equal(frames[0].maxAttacks,1);assert.equal(frames[0].supportOnly,false);
 assert.equal(E.click(s,()=>0).filter(e=>e.type==='attack').length,1);
 s.factors=100000;assert.ok(E.buyAction(s,'max'));assert.equal(E.actionPower(s,max),52);assert.equal(E.buyUpgrade(s,'power'),false);s.concentration[s.sessionId].action=1;assert.equal(E.actionPower(s,max),57);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('GM prefers the selected ally, spends only donor points and keeps recipient perks',()=>{
 const s=combatFixture(1000);s.levels.max=1;s.levels.meta=1;s.levels.tordeliese=25;s.actionPoints.max=95;s.selectedCharacterId='tordeliese';s.purchasedPerks.tordeliese=['greedy-gale','retreating-wind'];moveTestParty(s,'scarecrow');
 let calls=0;const events=E.advance(s,1,()=>++calls===1?.92:0);
 assert.equal(events.filter(e=>e.type==='attack'&&e.actorId==='tordeliese').length,3);assert.equal(events.filter(e=>e.poisonTick).length,3);
 assert.equal(events.filter(e=>e.maxTransfers).length,1);assert.equal(events.find(e=>e.maxTransfers).delegatedBy,'max');assert.equal(events.some(e=>e.actorId==='max'),false);
 assert.equal(s.actionPoints.tordeliese,80);assert.equal(s.actionPoints.meta,50);assert.equal(s.actionPoints.max,45);
});

test('GM random fallback excludes Max and unowned actors; changing selection updates DPS and income',()=>{
 const richter=D.characters.find(c=>c.id==='richter');
 for(const selected of [null,'max'])for(const [random,expected] of [[0,'meta'],[.999,'richter']]){
   const s=combatFixture();s.levels.max=s.levels.meta=s.levels.richter=1;s.selectedCharacterId=selected;s.actionPoints.max=95;
   const e=E.advance(s,1,()=>random).find(e=>e.maxTransfers);assert.equal(e.actorId,expected);
 }
 const s=combatFixture();s.levels.max=s.levels.meta=s.levels.richter=1;s.actionLevels.max=20;E.selectCharacter(s,'meta');
 assert.equal(E.effectiveAttackRate(s,meta),1.5);assert.equal(E.effectiveAttackRate(s,richter),.35);assert.equal(E.characterDps(s,max),0);assert.ok(Math.abs(E.dps(s)-16.625*E.combatUptime(s))<1e-9);
 const first=E.expectedIncome(s);E.selectCharacter(s,'richter');assert.equal(E.effectiveAttackRate(s,richter),1.35);assert.ok(Math.abs(E.dps(s)-27.125*E.combatUptime(s))<1e-9);assert.notEqual(E.expectedIncome(s).factorsPerSecond,first.factorsPerSecond);
 E.selectCharacter(s,null);assert.equal(E.effectiveAttackRate(s,meta),1);assert.equal(E.effectiveAttackRate(s,richter),.85);
});

test('GM refunds historical purchase once, including inactive owned perks, without adding earnings',()=>{
 for(const level of [0,10,100]){
   const old=combatFixture(1000);old.levels.max=1;old.actionLevels.max=level;old.purchasedPerks.max=['gm'];old.factors=1234;
   const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:19,state:old}));assert.equal(s.factors,101234);assert.equal(s.earned,0);assert.deepEqual(s.purchasedPerks.max,[]);assert.ok(E.perks(s,max)[0].unlocked);assert.deepEqual(S.decode(S.encode(s)),s);
 }
});

test('GM donations omit tubs; solo and manual Max attacks create tubs',()=>{
 const solo=combatFixture(1000);solo.levels.max=1;solo.actionPoints.max=95;const h=harness(solo);h.advance(1100);
 assert.ok(h.get('max-combatant').classList.contains('attacking'));assert.equal(h.get('max-tubs').children.length,1);h.advance(700);assert.equal(h.get('damage-floats').children.length,0);assert.equal(h.get('hit-effects').children.length,0);
 const s=combatFixture(1000);s.levels.max=s.levels.meta=1;s.selectedCharacterId='meta';s.actionPoints.max=95;const ally=harness(s);ally.advance(1100);
 assert.ok(ally.get('max-combatant').classList.contains('attacking'));assert.equal(ally.get('max-tubs').children.length,0);assert.ok(ally.get('saw-projectiles').children.length>0);
 ally.click('max-select');ally.click('attack');assert.equal(ally.get('max-tubs').children.length,1);
});

test('large GM batches credit recipients; Max attacks when no recipients remain',()=>{
 const s=combatFixture(1000);s.levels.max=s.levels.meta=1;s.actionLevels.max=10000;s.selectedCharacterId='meta';
 const events=E.advance(s,120,()=>0);assert.equal(events.filter(e=>e.type==='support').reduce((n,e)=>n+e.maxTransfers,0),6012);assert.ok(events.filter(e=>e.type==='attack').every(e=>e.actorId==='meta'));assert.ok(s.kills>0);assert.deepEqual(S.decode(S.encode(s)),s);
 const solo=combatFixture(1000);solo.levels.max=1;solo.actionLevels.max=10000;const gestures=E.advance(solo,120,()=>0);assert.ok(gestures.some(e=>e.type==='attack'&&e.actorId==='max'));assert.ok(gestures.every(e=>!e.maxTransfers));assert.ok(solo.kills>0);assert.ok(solo.totalDamage>0);
});

