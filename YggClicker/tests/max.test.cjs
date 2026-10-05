'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs');
const max=D.characters.find(c=>c.id==='max'),meta=D.characters.find(c=>c.id==='meta');
function setup(){const s=E.createState(1000);s.levels.max=1;s.levels.meta=1;s.actionLevels.max=100;s.selectedCharacterId='meta';return s;}
test('Max hires at 12000 and his four paid perks require action levels, not power levels',()=>{
 const s=E.createState();s.factors=11999;assert.equal(E.hire(s,'max'),false);s.factors++;assert.ok(E.hire(s,'max'));assert.equal(s.factors,0);assert.deepEqual(E.stats(s,max),{dice:1,flat:6});assert.equal(E.actionPower(s,max),0);assert.equal(E.hireCost(s,max),2400);assert.equal(E.actionCost(s,max),3000);
 for(const p of max.perks){s.levels.max=200;s.actionLevels.max=p.level-1;s.factors=p.cost;assert.equal(E.buyPerk(s,'max',p.id),false);s.levels.max=1;s.actionLevels.max=p.level;s.factors--;assert.equal(E.buyPerk(s,'max',p.id),false);s.factors++;assert.ok(E.buyPerk(s,'max',p.id));assert.equal(s.factors,0);assert.equal(E.buyPerk(s,'max',p.id),false);}
 assert.deepEqual(S.decode(S.encode(s)),s);s.actionLevels.max=99;assert.deepEqual(S.decode(S.encode(s)),s);assert.equal(E.perks(s,max).find(p=>p.id==='named-npc').unlocked,false);
});
test('support stacks once, excludes Max from flat buffs, follows selection and rounds the total bonus',()=>{
 const s=setup();assert.equal(E.actionPower(s,meta),50);s.purchasedPerks.max=['gm'];assert.equal(E.actionPower(s,meta),60);assert.equal(E.actionPower(s,max),500);
 s.purchasedPerks.max.push('golden-rule','handout');assert.equal(E.actionPower(s,meta),90);assert.equal(E.actionPower(s,max),500);
 E.selectCharacter(s,'max');assert.equal(E.actionPower(s,meta),75);assert.equal(E.actionPower(s,max),600);
 s.actionLevels.meta=1;s.upgrades.power=1;assert.equal(E.actionPower(s,meta),81);E.selectCharacter(s,'meta');assert.equal(E.actionPower(s,meta),97);
 s.levels.max=0;assert.equal(E.actionPower(s,meta),56);
});
test('Named NPC gives free attempts only to the selected automatic actor and keeps integer points',()=>{
 const s=setup();s.purchasedPerks.max=['named-npc'];s.actionPoints.meta=50;
 // Geometric .75 gives 3 attempts; each dice roll is 1 and no knockout occurs.
 const rolls=[.75,0,0,0];const events=E.advance(s,1,()=>rolls.length?rolls.shift():0);
 assert.equal(events.filter(e=>e.type==='attack'&&e.actorId==='meta').length,3);assert.equal(s.actionPoints.meta,0);
 assert.equal(E.freeActionChance(s,meta),.5);assert.equal(E.freeActionChance(s,max),0);assert.equal(E.effectiveAttackRate(s,meta),1);
 const points=s.actionPoints.meta;assert.equal(E.click(s,()=>0).filter(e=>e.type==='attack').length,1);assert.equal(s.actionPoints.meta,points);
 E.selectCharacter(s,'max');assert.equal(E.freeActionChance(s,meta),0);assert.equal(E.freeActionChance(s,max),.5);
});
test('selection invalidates support income forecasts and batch includes Max with free-action rates',()=>{
 const s=setup();s.purchasedPerks.max=['handout','named-npc'];const a=E.expectedIncome(s);E.selectCharacter(s,'max');const b=E.expectedIncome(s);assert.notEqual(a,b);assert.notEqual(a.factorsPerSecond,b.factorsPerSecond);
 s.actionLevels.max=10000;const events=E.advance(s,120,()=>{throw Error('batch should not roll')});assert.ok(events.some(e=>e.maxAttacks>0));assert.ok(s.kills>0);assert.deepEqual(S.decode(S.encode(s)),s);
 const frames=FX.plan(events);assert.equal(frames.reduce((n,f)=>n+f.maxAttacks,0),events.filter(e=>e.type==='attack').reduce((n,e)=>n+e.maxAttacks,0));
});
test('old saves omit Max safely and retain all pre-existing progression',()=>{
 const s=E.createState(1000);s.factors=1234;s.levels.meta=12;
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

test('zero-action Max has finite forecasts and UI, gains action from upgrades and can still attack manually',()=>{
 const s=E.createState(1000);s.levels.max=1;s.selectedCharacterId='max';
 assert.equal(E.actionMultiplier(s,max),null);assert.equal(E.characterDps(s,max),0);assert.equal(E.effectiveAttackRate(s,max),0);assert.equal(E.expectedIncome(s).factorsPerSecond,0);
 assert.equal(E.advance(s,60,()=>0).filter(e=>e.type==='attack').length,0);assert.equal(s.actionPoints.max,0);
 assert.equal(E.click(s,()=>0).filter(e=>e.type==='attack').length,1);
 const h=harness(s);assert.equal(h.get('action-bonus-max').textContent,'行動力 0');
 s.factors=100000;assert.ok(E.buyAction(s,'max'));assert.equal(E.actionPower(s,max),5);
 assert.ok(E.buyUpgrade(s,'power'));assert.equal(E.actionPower(s,max),6);assert.equal(E.effectiveAttackRate(s,max),.06);
 assert.equal(E.advance(s,17,()=>0).filter(e=>e.type==='attack').length,1);assert.equal(s.actionPoints.max,2);
 assert.deepEqual(S.decode(S.encode(s)),s);
});
