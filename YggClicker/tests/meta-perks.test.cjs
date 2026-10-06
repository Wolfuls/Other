'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),B=require('../js/battle-batch.js'),S=require('../js/save.js');
const meta=D.characters.find(c=>c.id==='meta'),richter=D.characters.find(c=>c.id==='richter');
function prepared(level=50){const s=combatFixture(1000);s.levels.meta=level;s.selectedCharacterId='meta';s.factors=1e9;return s;}
function withEnemy(defense,traits,run){
  const enemy=D.sessions[0],before={defense:enemy.defense,traits:enemy.traits};
  Object.assign(enemy,{defense,traits:[...new Set([...traits,'swarm'])]});try{return run();}finally{Object.assign(enemy,before);}
}
function rolls(...values){return()=>{assert.ok(values.length,'unexpected roll');return values.shift();};}
test('all five Meta perks require both their own attack level and factors, and are paid once',()=>{
  assert.deepEqual(meta.perks.map(p=>p.name),['アタックプラス','モヒカン死すべし、慈悲はない','レアメタル・ブレード','メタル・ストーム','フルメタルバースト']);
  for(const p of meta.perks){
    const s=prepared(p.level-1),before=structuredClone(s);
    assert.equal(E.buyPerk(s,'meta',p.id),false);assert.deepEqual(s,before);
    s.levels.meta=p.level;s.factors=p.cost-1;assert.equal(E.buyPerk(s,'meta',p.id),false);
    s.factors=p.cost;s.actionPoints.meta=37;s.actionClock=.4;assert.equal(E.buyPerk(s,'meta',p.id),true);
    assert.equal(s.factors,0);assert.equal(s.earned,0);assert.equal(s.actionPoints.meta,37);assert.equal(s.actionClock,.4);
    s.factors=100000;assert.equal(E.buyPerk(s,'meta',p.id),false);assert.equal(s.factors,100000);
  }
});
test('Meta perk boundaries preserve flat bonuses and Metal Man replaces only the base',()=>{
  for(const [level,dice,flat] of [[1,2,0],[9,2,0],[10,2,4],[24,2,4],[25,2,4],[49,2,4],[50,4,9],[74,4,9],[75,4,9],[99,4,9],[100,4,17],[200,4,17]]){
    const s=prepared(level);s.purchasedPerks.meta=meta.perks.filter(p=>p.level<=level).map(p=>p.id);
    assert.deepEqual(E.stats(s,meta),{dice,flat},`Lv${level}`);
    assert.equal(E.attackProfile(s,meta).bonus,0,'ordinary enemies never get the conditional +15');
  }
  const s=prepared(100);assert.deepEqual(E.stats(s,meta),{dice:2,flat:0},'levels alone grant no perks');
  assert.ok(E.buyPerk(s,'meta','metal-blade'));assert.deepEqual(E.stats(s,meta),{dice:4,flat:5});
  assert.ok(E.buyPerk(s,'meta','full-metal-burst'));assert.deepEqual(E.stats(s,meta),{dice:4,flat:13});
  assert.ok(E.buyPerk(s,'meta','attack-plus'));assert.deepEqual(E.stats(s,meta),{dice:4,flat:17});
});
test('level growth applies after perks, with one final rounding',()=>{
  const s=prepared(100);for(const p of meta.perks.filter(p=>!p.areaAttack))assert.ok(E.buyPerk(s,'meta',p.id));
  moveTestParty(s,'heavy');
  const plain=E.click(s,()=>0)[0];assert.equal(plain.damage,228,'(4+17) ×10.9 floors to 123');
  s.hp=150;
  assert.equal(E.click(s,()=>0)[0].damage,228,'21 ×10.9 is rounded only once; speed does not change damage');
  E.selectCharacter(s,null);s.hp=150;
  assert.equal(E.click(s,()=>0)[0].damage,1,'self attack has no character multiplier and deals minimum1 after defense4');
});
test('Metal Blade bypasses defense on automatic and selected manual attacks, never for another actor',()=>withEnemy(200,[],()=>{
  const s=prepared(50);s.actionLevels.meta=20;freshTarget(s);
  assert.equal(E.click(s,()=>.999)[0].damage,1);assert.equal(s.hp,9);
  assert.ok(E.buyPerk(s,'meta','metal-blade'));
  assert.equal(E.click(s,()=>.999)[0].damage,171);
  assert.equal((freshTarget(s),E.advance(s,1,()=>.999)).find(e=>e.type==='attack').damage,171);
  s.levels.richter=1;E.selectCharacter(s,'richter');
  assert.equal(E.click(s,()=>0)[0].damage,1);
  E.selectCharacter(s,null);assert.equal(E.click(s,()=>.999)[0].damage,1);
}));
test('Mohican bonus is a fixed judgment bonus before multiplication and is target- and actor-specific',()=>withEnemy(0,['mohican'],()=>{
  const s=prepared(30);s.actionLevels.meta=20;freshTarget(s);
  assert.equal(E.attackProfile(s,meta).bonus,0);assert.ok(E.buyPerk(s,'meta','mohican-slayer'));
  assert.deepEqual(E.stats(s,meta),{dice:2,flat:0},'+15 must not turn into five extra dice');
  assert.equal(E.click(s,rolls(0,0))[0].damage,66,'(2+15) ×3.9 floors to 66');
  assert.equal((freshTarget(s),E.advance(s,1,rolls(0,0))).find(e=>e.type==='attack').damage,66);
  assert.equal(E.attackProfile(s,meta).bonus,15);
  s.levels.richter=1;E.selectCharacter(s,'richter');freshTarget(s);assert.equal(E.click(s,rolls(0,0,0,0,0))[0].damage,5);
  E.selectCharacter(s,'meta');moveTestParty(s,'patrol');freshTarget(s);assert.equal(E.attackProfile(s,meta).bonus,0);
  assert.equal(E.click(s,rolls(0,0))[0].damage,5);
}));
test('DPS is the mean of rounded target-aware damage, including blocked rolls',()=>withEnemy(4,['mohican'],()=>{
  const s=prepared(3);
  const sums=[1,2,3,4,5,6].flatMap(a=>[1,2,3,4,5,6].map(b=>a+b));
  const blockedMean=sums.reduce((n,sum)=>n+Math.max(1,Math.max(sum+1,Math.floor(sum*1.2+1e-9))-4),0)/36;
  assert.ok(Math.abs(E.dps(s)-blockedMean*.5)<1e-12);
  s.levels.meta=30;E.buyPerk(s,'meta','mohican-slayer');
  const expected=sums.reduce((n,sum)=>n+Math.floor((sum+15)*3.9+1e-9)-4,0)/36*.5;
  assert.ok(Math.abs(E.dps(s)-expected)<1e-10);
}));
test('schema7 saves retain levels, factors and Richter purchases; Meta perks round-trip in the current schema',()=>{
  const s=prepared(50);s.levels.richter=50;s.purchasedPerks.richter=['z-bom','bom-ber'];s.actionPoints.meta=33;s.actionClock=.7;
  const old={gameId:D.gameId,schemaVersion:7,gameVersion:'0.15.0',state:s};
  const restored=S.decode(JSON.stringify(old));assert.deepEqual(restored,{...s,sessionId:'mohicans',hp:20});
  for(const p of meta.perks)E.buyPerk(restored,'meta',p.id);
  const doc=JSON.parse(S.encode(restored));assert.equal(doc.schemaVersion,S.VERSION);assert.deepEqual(S.decode(JSON.stringify(doc)),restored);
  for(const bad of ['z-bom','missing']){const corrupt=structuredClone(restored);corrupt.purchasedPerks.meta=[bad];assert.throws(()=>S.encode(corrupt));}
  const tooEarly=structuredClone(restored);tooEarly.levels.meta=49;assert.deepEqual(S.decode(S.encode(tooEarly)),tooEarly);
});
