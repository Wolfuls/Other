'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),B=require('../js/battle-batch.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js');
const richter=D.characters.find(c=>c.id==='richter');
function stateAt(level){const s=combatFixture(1000);s.levels.richter=level;s.selectedCharacterId='richter';s.purchasedPerks.richter=richter.perks.filter(p=>level>=p.level).map(p=>p.id);return s;}
function rolls(...values){return()=>{assert.ok(values.length,'unexpected RNG');return values.shift();};}
test('Richter keeps dice and cumulative flat perk bonuses separate at every unlock boundary',()=>{
  for(const [level,dice,flat] of [[1,5,0],[9,5,0],[10,6,0],[24,7,0],[25,7,8],[49,9,8],[50,10,8],[74,12,8],[75,12,24],[99,14,24],[100,15,48],[200,25,48]]){
    const s=stateAt(level);assert.deepEqual(E.stats(s,richter),{dice,flat},`level ${level}`);
    assert.equal(E.hasAreaAttack(s,richter),level>=50);
    assert.equal(E.perks(s,richter).filter(p=>p.unlocked).length,[10,25,50,75,100].filter(l=>level>=l).length);
  }
  assert.equal(E.perks(stateAt(60),richter)[0].dice,6);
});
test('attack levels enable purchases; action purchases do not, and all allies act',()=>{
  const s=stateAt(9);s.factors=1e10;const original=E.stats(s,richter);
  assert.ok(E.buyAction(s,'richter'));assert.deepEqual(E.stats(s,richter),original);
  assert.ok(E.hire(s,'richter'));assert.equal(E.stats(s,richter).dice,5);assert.ok(E.buyPerk(s,'richter','z-bom'));assert.equal(E.stats(s,richter).dice,6);
  s.levels.meta=1;s.actionLevels.richter=40;s.actionLevels.meta=20;
  const actors=new Set(E.advance(s,1,()=>0).filter(e=>e.type==='attack').map(e=>e.actorId));
  assert.deepEqual(actors,new Set(['meta','richter']));
});
test('Lv49 remains single-target; Lv50 shares one defended roll over exactly three enemies',()=>{
 const before=stateAt(49);E.click(before,()=>0);assert.equal(before.kills,1);
 const after=stateAt(50);moveTestParty(after,'patrol');const events=E.click(after,()=>0),hits=events.filter(e=>e.type==='attack');
 assert.equal(after.kills,3);assert.equal(after.totalDamage,120);assert.equal(after.factors,30);assert.deepEqual(hits.map(e=>e.damage),[52,52,52]);assert.deepEqual(hits.map(e=>e.continuation),[false,true,true]);assert.deepEqual(after.enemies.map(e=>e.hp),[0,0,0]);
});

test('all three surviving area victims perform independent knockout checks',()=>{
 const s=stateAt(50);moveTestParty(s,'patrol');s.questLevels.patrol=2;s.hp=4;const es=E.ensureEnemies(s);es[1].hp=4;es[2].hp=4;
 // Raise defense so all three receive the minimum one point.
 const q=D.sessions.find(q=>q.id==='patrol'),armor=q.defense;q.defense=10000;
 try{const events=E.click(s,rolls(...Array(10).fill(0),0,.25,0));assert.deepEqual(events.filter(e=>e.type==='attack').map(e=>e.knockedOut),[true,false,true]);assert.equal(s.kills,2);assert.equal(s.hp,3);}finally{q.defense=armor;}
});

test('manual training and boosts increase spillover, while eventless progress is identical',()=>{
  const s=stateAt(50);Object.values(s.concentration).forEach(a=>a.attack=3);s.boostSeconds=30;moveTestParty(s,'patrol');
  E.click(s,rolls(...Array(10).fill(0)));assert.equal(s.totalDamage,120);assert.equal(s.kills,3);assert.equal(s.hp,0);
  s.actionLevels.richter=30;const without=structuredClone(s);
  E.advance(s,1,()=>0);E.advance(without,1,()=>0,false);assert.deepEqual(s,without);
});
test('chain impacts retain each clear but launch only one Richter projectile per actual attack',()=>{
  const s=stateAt(50);moveTestParty(s,'patrol');const frames=FX.plan(E.click(s,()=>0));
  assert.equal(frames.length,3);assert.equal(frames.reduce((n,f)=>n+f.clears,0),3);
  assert.equal(frames.reduce((n,f)=>n+f.richterAttacks,0),1);assert.equal(frames.reduce((n,f)=>n+f.metaAttacks,0),0);
  s.levels.richter=200;s.boostSeconds=30;
  freshTarget(s);const many=E.click(s,()=>.99),planned=FX.plan(many);
  assert.ok(many.length<35);assert.ok(planned.length<=FX.MAX_STEPS);
  assert.equal(planned.reduce((n,f)=>n+f.richterAttacks,0),1);
  assert.equal(planned.reduce((n,f)=>n+f.clears,0),many.filter(e=>e.type==='clear').reduce((n,e)=>n+(e.count||1),0));
});
test('old schema6 without Richter imports unowned, and new perks/selection survive save transfer',()=>{
  const old=combatFixture(1000);old.levels.meta=2;
  for(const key of ['levels','actionLevels','actionPoints'])delete old[key].richter;
  const imported=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:6,state:old}));
  assert.equal(imported.levels.richter,0);assert.equal(imported.levels.meta,2);
  const current=stateAt(50);current.actionLevels.richter=50;current.actionPoints.richter=37;
  const saved=S.decode(S.encode(current));assert.deepEqual(saved,current);assert.equal(E.hasAreaAttack(saved,richter),true);
});


