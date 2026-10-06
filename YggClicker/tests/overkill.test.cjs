'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),B=require('../js/battle-batch.js'),S=require('../js/save.js');
test('overkill unlock costs 200 once; HP -19 fails, -20 and below gain 25% of the upgraded reward',()=>{
 const s=combatFixture(1000);s.factors=199;assert.equal(E.buyUpgrade(s,'overkill'),false);s.factors=200;
 assert.ok(E.buyUpgrade(s,'overkill'));assert.equal(s.factors,0);s.factors=999;assert.equal(E.buyUpgrade(s,'overkill'),false);assert.equal(s.factors,999);
 s.levels.meta=1;s.selectedCharacterId='meta';s.upgrades.reward=2;
 for(const [flat,bonus]of [[17,0],[18,1],[19,1]]){freshTarget(s,10);D.characters[0].flat=flat;const old=s.factors;
  const clear=E.click(s,()=>.999).find(e=>e.type==='clear');assert.equal(clear.overkills,bonus);assert.equal(clear.reward,3+bonus);assert.ok(Math.abs(s.factors-old-(3+bonus))<1e-10);
 }
 s.upgrades.overkill=0;freshTarget(s,10);D.characters[0].flat=19;assert.equal(E.click(s,()=>.999).find(e=>e.type==='clear').reward,3);D.characters[0].flat=0;
});
test('overkill uses current HP after armor and never pays for a knockout',()=>{
 const s=combatFixture(1000);s.levels.meta=1;s.selectedCharacterId='meta';s.upgrades.overkill=1;s.upgrades.reward=1;moveTestParty(s,'patrol');
 for(const [flat,bonus]of [[19,0],[20,1]]){freshTarget(s,10);D.characters[0].flat=flat;const event=E.click(s,()=>.999).find(e=>e.type==='clear');assert.equal(event.reward,11+bonus*2);}
 D.characters[0].flat=0;moveTestParty(s,'practice');freshTarget(s,6);const event=E.click(s,()=>0).find(e=>e.type==='clear');assert.equal(event.reason,'knockout');assert.equal(event.reward,3);assert.equal(event.overkills,0);
});
test('area overkill pays once per eligible victim, never for a fourth enemy',()=>{
 const s=combatFixture();s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];s.upgrades.overkill=1;const events=E.click(s,()=>.999);assert.equal(s.kills,3);assert.equal(s.earned,9);assert.equal(events.filter(e=>e.type==='clear'&&e.overkills===1).length,3);
});

test('old saves default overkill to unowned, new saves round-trip and older clients are gated',()=>{
 const s=combatFixture(1000);s.levels.meta=30;s.purchasedPerks.meta=['mohican-slayer'];s.upgrades.reward=4;s.factors=987;
 const old=JSON.parse(S.encode(s));old.schemaVersion=8;old.gameVersion='0.21.0';delete old.state.upgrades.overkill;
 assert.deepEqual(S.decode(JSON.stringify(old)),{...s,sessionId:'mohicans',hp:20});s.upgrades.overkill=1;s.sessionId='mohicans';freshTarget(s,10);
 const saved=JSON.parse(S.encode(s));assert.equal(saved.schemaVersion,S.VERSION);assert.deepEqual(S.decode(JSON.stringify(saved)),s);
});
test('mohican variants share training stats and activate Meta special damage',()=>{
 const mob=D.sessions.find(s=>s.id==='mohicans'),practice=D.sessions[0];assert.equal(mob.hp,20);assert.equal(mob.defense,practice.defense);assert.equal(mob.reward,3);
 assert.deepEqual(mob.traits,['mohican','swarm']);assert.equal(new Set(mob.variants.map(v=>v.sheet)).size,10);
 const s=combatFixture();s.levels.meta=30;s.purchasedPerks.meta=['mohican-slayer'];const base=E.expectedIncome(s).factorsPerSecond;
 moveTestParty(s,'mohicans');assert.equal(E.attackProfile(s,D.characters[0]).bonus,15);assert.ok(E.expectedIncome(s).factorsPerSecond>=base);
 s.upgrades.overkill=1;const income=E.expectedIncome(s);assert.ok(income.bonusPerSecond>0);assert.equal(income.factorsPerSecond,income.clearsPerSecond*3+income.bonusPerSecond);
});
