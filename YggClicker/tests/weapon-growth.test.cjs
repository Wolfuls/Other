'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),B=require('../js/battle-batch.js');

test('action purchases grow orbit counts while damage purchases grow size, independently for both characters',()=>{
  const s=combatFixture();s.factors=1e20;
  for(const [id,count] of [['meta',E.sawCount],['richter',E.bombCount]]){
    assert.equal(count(s).total,0);assert.ok(E.hire(s,id));
    assert.deepEqual(count(s),{total:1,visible:1});const scale=E.weaponScale(s,id);
    assert.ok(E.buyAction(s,id));assert.deepEqual(count(s),{total:2,visible:2});
    assert.equal(E.weaponScale(s,id),scale);
    assert.ok(E.hire(s,id));assert.deepEqual(count(s),{total:2,visible:2});
    assert.ok(E.weaponScale(s,id)>scale);
    s.actionLevels[id]=1e9;assert.deepEqual(count(s),{total:1000000001,visible:60});
    const denseScale=E.weaponScale(s,id);s.actionLevels[id]++;assert.equal(E.weaponScale(s,id),denseScale);
    s.levels[id]=E.MAX_LEVEL;assert.ok(E.weaponScale(s,id)>denseScale);assert.ok(E.weaponScale(s,id)<3);
    const restored=S.decode(S.encode(s));assert.deepEqual(count(restored),count(s));assert.equal(E.weaponScale(restored,id),E.weaponScale(s,id));
  }
});

test('configured armor is applied before halving every area target',()=>{
 for(const q of D.sessions){const s=combatFixture();s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];moveTestParty(s,q.id);const p=E.attackProfile(s,D.characters[1]);const events=E.click(s,()=>.999),hits=events.filter(e=>e.type==='attack');assert.equal(hits.length,p.areaAttack?3:1);const expected=Math.max(1,Math.floor(Math.max(1,177-p.defense)/(p.areaAttack?2:1)));assert.ok(hits.every(e=>e.damage===expected));}
});

