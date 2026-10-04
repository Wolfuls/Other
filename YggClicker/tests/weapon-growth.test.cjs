'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),B=require('../js/battle-batch.js');

test('action purchases grow orbit counts while damage purchases grow size, independently for both characters',()=>{
  const s=E.createState();s.factors=1e20;
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

test('the configured armor applies to every manual and automatic spillover target',()=>{
  assert.deepEqual(D.sessions.map(s=>[s.id,s.defense]),[['practice',0],['patrol',2],['heavy',4],['mohicans',0],['scarecrow',35],['dementor',3]]);
  for(const [session,kills,hp,damage] of [['practice',11,10,106],['patrol',2,20,100],['heavy',0,48,102]]){
    for(const manual of [true,false]){
      const s=E.createState();s.levels.richter=50;s.selectedCharacterId='richter';
      s.purchasedPerks.richter=D.characters.find(c=>c.id==='richter').perks.filter(p=>p.level<=50).map(p=>p.id);
      E.selectSession(s,session);
      // Minimum (10D6+8) ×5.9 =106. Each full target costs HP + its defense.
      const events=manual?E.click(s,()=>0):E.advance(s,2,()=>0);
      assert.equal(s.kills,kills);assert.equal(s.hp,hp);assert.equal(s.totalDamage,damage);
      assert.equal(events.filter(e=>e.type==='attack'&&!e.continuation).length,1);
    }
  }
});

test('long batches pay armor on every full spillover clear without losing progress',()=>{
  for(const session of D.sessions){
    // A deterministic hit equal to three full armored targets has exactly three clears.
    const p={dice:0,flat:3*(session.hp+session.defense),multiplier:1,defense:session.defense,overflow:true,rate:1};
    const r=B.resolve(session.hp,session.hp,100000,[p]);
    assert.ok(Math.abs(r.kills-300000)<=1);
    assert.ok(Math.abs(r.damage-300000*session.hp)<session.hp);
    assert.ok(r.knockouts<.01);
  }
});
