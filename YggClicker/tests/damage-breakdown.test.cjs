'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),FX=require('../js/combat-effects.js');

test('displayed additive terms equal actual damage with global concentration',()=>{
  for(const actor of [null,...D.characters])for(const face of [1,4,6]){
    const s=combatFixture();Object.values(s.concentration).forEach(a=>a.attack=3);
    if(actor){s.levels[actor.id]=50;s.selectedCharacterId=actor.id;s.purchasedPerks[actor.id]=actor.perks.map(p=>p.id);}
    moveTestParty(s,'practice');
    const p=E.attackProfile(s,actor,true),b=p.breakdown;
    const base=b.base.dice*face+b.base.flat,perk=b.perk.dice*face+b.perk.flat+b.perk.conditional;
    const subtotalA=base+perk+b.upgrade.flat;
    const upgrade=b.upgrade.flat+subtotalA*b.upgrade.rate;

    const total=Math.floor((base+perk+upgrade+b.item.flat)*b.levelMultiplier+1e-9);

    assert.equal(total,Math.floor(subtotalA*b.levelMultiplier+1e-9));
    const hits=E.click(s,()=>(face-.5)/6).filter(e=>e.type==='attack');
    assert.equal(hits.filter(e=>!e.extraAttack).reduce((n,e)=>n+e.damage,0),p.areaAttack?Math.floor(total/2)*3:total);
    assert.equal(E.attackBreakdown(s,actor).upgrade.flat,actor?3:0,'concentration also adds to automatic damage');
  }
});

test('breakdown separates base replacement, dice perks, conditional perks',()=>{
  const s=combatFixture();for(const c of D.characters){s.levels[c.id]=100;s.purchasedPerks[c.id]=c.perks.map(p=>p.id);}
  const meta=D.characters[0],richter=D.characters[1];
  let b=E.attackBreakdown(s,meta,false,{defense:9,traits:['mohican']});
  assert.deepEqual(b.base,{dice:4,flat:5,source:'レアメタル・ブレード'});
  assert.deepEqual(b.perk,{dice:0,flat:12,conditional:15});assert.equal(b.defense,0);assert.ok(b.ignoreDefense);
  b=E.attackBreakdown(s,richter,false,{defense:9,traits:['mohican']});
  assert.deepEqual(b.base,{dice:5,flat:0,source:''});assert.deepEqual(b.perk,{dice:10,flat:48,conditional:0});assert.equal(b.defense,9);
  assert.equal(Object.hasOwn(b,'spe'),false);
});

test('visual variation covers left, right and downward falls in bounded space',()=>{
  let seed=14541;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const samples=Array.from({length:100},()=>FX.impactMotion(rng));
  assert.deepEqual([...new Set(samples.map(m=>m.fallDirection))].sort(),['down','left','right']);
  assert.ok(new Set(samples.map(m=>m.x)).size>90);
  for(const m of samples){
    assert.ok(Math.abs(m.x)<=22&&Math.abs(m.y)<=14);
    assert.ok(Math.abs(m.fallX)<=88&&m.fallY>=65&&m.fallY<=105);
    assert.ok(m.fallMs>=420&&m.fallMs<=620);
    assert.equal(Math.sign(m.fallX),m.fallDirection==='left'?-1:m.fallDirection==='right'?1:Math.sign(m.fallX));
  }
});
