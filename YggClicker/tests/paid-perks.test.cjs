'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js');
const richter=D.characters.find(c=>c.id==='richter');
function prepared(level=50){const s=combatFixture(1000);s.levels.richter=level;s.selectedCharacterId='richter';s.factors=1e9;return s;}
test('Meta, Richter and Vishunal are available while retired characters stay unavailable',()=>{
  assert.deepEqual(D.characters.map(c=>c.id),['meta','richter','vishunal','tordeliese','max','waku']);
  const s=prepared();
  for(const id of ['hollow','jamie']){assert.equal(E.hire(s,id),false);assert.equal(E.buyAction(s,id),false);assert.equal(E.selectCharacter(s,id),false);}
  assert.deepEqual(Object.keys(s.levels),['meta','richter','vishunal','tordeliese','max','waku']);
});
test('level and funds are both required; purchase deducts once and does not alter action charge or earned total',()=>{
  const s=prepared(9),before=structuredClone(s);
  assert.equal(E.buyPerk(s,'richter','z-bom'),false);assert.deepEqual(s,before);
  s.levels.richter=10;s.factors=99;const unfunded=structuredClone(s);
  assert.equal(E.buyPerk(s,'richter','z-bom'),false);assert.deepEqual(s,unfunded);
  s.factors=100;s.actionPoints.richter=77;s.actionClock=.25;
  const prior=E.stats(s,richter);assert.equal(prior.dice,5);
  assert.equal(E.buyPerk(s,'richter','z-bom'),true);assert.equal(s.factors,0);assert.equal(s.earned,0);
  assert.deepEqual(E.stats(s,richter),{dice:6,flat:0});assert.equal(s.actionPoints.richter,77);assert.equal(s.actionClock,.25);
  s.factors=100;assert.equal(E.buyPerk(s,'richter','z-bom'),false);assert.equal(s.factors,100);
  assert.equal(E.buyPerk(s,'unknown','z-bom'),false);assert.equal(E.buyPerk(s,'richter','unknown'),false);
});
test('levels alone grant no perk; each purchased flat bonus is cumulative and Z-BoM scales afterwards',()=>{
  const s=prepared(100);assert.deepEqual(E.stats(s,richter),{dice:5,flat:0});assert.equal(E.hasAreaAttack(s,richter),false);
  assert.ok(E.buyPerk(s,'richter','vx-bom'));assert.deepEqual(E.stats(s,richter),{dice:5,flat:16});
  assert.ok(E.buyPerk(s,'richter','z-bom'));assert.deepEqual(E.stats(s,richter),{dice:15,flat:16});
  s.levels.richter=110;assert.deepEqual(E.stats(s,richter),{dice:16,flat:16});
  assert.ok(E.buyPerk(s,'richter','dx-bom'));assert.ok(E.buyPerk(s,'richter','ex-bom'));
  assert.deepEqual(E.stats(s,richter),{dice:16,flat:48});
});
test('BoM-BeR starts overflow only after purchase, on manual and automatic attacks',()=>{
  const s=prepared();const before=E.click(s,()=>0);assert.equal(before.filter(e=>e.type==='clear').length,1);
  assert.equal(E.hasAreaAttack(s,richter),false);assert.ok(E.buyPerk(s,'richter','bom-ber'));
  freshTarget(s);const manual=E.click(s,()=>0);assert.equal(manual.filter(e=>e.type==='clear').length,3);assert.equal(s.hp,0);freshTarget(s);
  s.actionLevels.richter=40;const auto=E.advance(s,1,()=>0);assert.ok(auto.some(e=>e.continuation));
});
test('schema6 removes retired characters, clears their selection, retains active progress, and starts perks unpurchased',()=>{
  const s=prepared();s.levels.meta=7;s.actionPoints.meta=39;s.actionClock=.3;s.kills=123;s.earned=456;
  for(const field of ['levels','actionLevels','actionPoints']){s[field].hollow=field==='levels'?20:4;s[field].jamie=field==='levels'?30:5;}
  s.selectedCharacterId='hollow';delete s.purchasedPerks;
  const restored=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:6,state:s}));
  assert.deepEqual(restored.levels,{meta:7,richter:50,vishunal:0,tordeliese:0,max:0,waku:0});assert.equal(restored.selectedCharacterId,null);
  assert.equal(restored.actionPoints.meta,39);assert.equal(restored.actionClock,.3);
  for(const key of ['factors','earned','kills'])assert.equal(restored[key],s[key]);
  assert.deepEqual(restored.purchasedPerks,{meta:[],richter:[],vishunal:[],tordeliese:[],max:[],waku:[]});assert.equal(E.hasAreaAttack(restored,richter),false);
  assert.equal(JSON.parse(S.encode(restored)).schemaVersion,S.VERSION);
});
test('schema1 and schema4 with retired IDs still migrate through the whole chain',()=>{
  for(const version of [1,4]){
    const s=prepared(1);s.levels.meta=3;s.levels.hollow=2;s.levels.jamie=1;
    s.timers={meta:.9,richter:4,hollow:1.2,jamie:3.5};s.speedLevels={meta:0,richter:0,hollow:0,jamie:0};
    for(const key of ['actionLevels','actionPoints','actionClock','selectedCharacterId','purchasedPerks'])delete s[key];
    if(version===1){s.hp=80;s.levels.hikari=s.levels.meta;delete s.levels.meta;s.timers.hikari=s.timers.meta;delete s.timers.meta;delete s.speedLevels;}
    const restored=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:version,state:s}));
    assert.deepEqual(restored.levels,{meta:3,richter:1,vishunal:0,tordeliese:0,max:0,waku:0});assert.equal(restored.actionPoints.meta,50);assert.equal(restored.selectedCharacterId,null);
    assert.deepEqual(restored.purchasedPerks.richter,[]);
  }
});
test('purchased perks round-trip without another charge; malformed and duplicate purchases are rejected',()=>{
  const s=prepared();E.buyPerk(s,'richter','z-bom');E.buyPerk(s,'richter','bom-ber');
  const restored=S.decode(S.encode(s));assert.deepEqual(restored,s);assert.equal(E.hasAreaAttack(restored,richter),true);
  assert.equal(E.buyPerk(restored,'richter','bom-ber'),false);assert.equal(restored.factors,s.factors);
  for(const change of [p=>{p.purchasedPerks.richter=['z-bom','z-bom'];},p=>{p.purchasedPerks.richter=['fake'];},p=>{p.purchasedPerks.meta=['z-bom'];},p=>{p.purchasedPerks.richter='z-bom';},p=>{p.purchasedPerks.hollow=[];},p=>{delete p.purchasedPerks;}]){
    const malformed=structuredClone(s);change(malformed);assert.throws(()=>S.encode(malformed));
  }
});
test('only the two known retired IDs are removed from legacy saves; unknown IDs remain rejected',()=>{
  const s=prepared();s.levels.unrecognized=1;
  assert.throws(()=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:6,state:s})));
});
