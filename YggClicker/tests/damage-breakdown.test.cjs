'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),FX=require('../js/combat-effects.js');

test('displayed additive terms equal actual damage while keeping the 1.25 x 2 boost effect',()=>{
  for(const actor of [null,...D.characters])for(const face of [1,4,6]){
    const s=E.createState();s.upgrades.click=3;s.upgrades.power=1;s.boostSeconds=30;
    if(actor){s.levels[actor.id]=50;s.selectedCharacterId=actor.id;s.purchasedPerks[actor.id]=actor.perks.map(p=>p.id);}
    E.selectSession(s,'practice');
    const p=E.attackProfile(s,actor,true),b=p.breakdown;
    const base=b.base.dice*face+b.base.flat,perk=b.perk.dice*face+b.perk.flat+b.perk.conditional;
    const subtotalA=base+perk+b.upgrade.flat;
    const upgrade=b.upgrade.flat+subtotalA*b.upgrade.rate;
    const spe=(base+perk+upgrade)*b.spe.rate;
    const total=Math.floor((base+perk+upgrade+spe+b.item.flat)*b.levelMultiplier+1e-9);
    assert.equal((1+b.upgrade.rate)*(1+b.spe.rate),2.5);
    assert.equal(total,Math.floor(subtotalA*2.5*b.levelMultiplier+1e-9));
    const hits=E.click(s,()=>(face-.5)/6).filter(e=>e.type==='attack');
    assert.equal(hits.reduce((n,e)=>n+e.damage,0),total);
    assert.equal(E.attackBreakdown(s,actor).upgrade.flat,0,'automatic damage excludes manual training');
  }
});

test('breakdown separates base replacement, dice perks, conditional perks and expiring SPE',()=>{
  const s=E.createState();for(const c of D.characters){s.levels[c.id]=50;s.purchasedPerks[c.id]=c.perks.map(p=>p.id);}
  const meta=D.characters[0],richter=D.characters[1];
  let b=E.attackBreakdown(s,meta,false,{defense:9,traits:['mohican']});
  assert.deepEqual(b.base,{dice:4,flat:5,source:'メタルマン'});
  assert.deepEqual(b.perk,{dice:0,flat:12,conditional:15});assert.equal(b.defense,0);assert.ok(b.ignoreDefense);
  b=E.attackBreakdown(s,richter,false,{defense:9,traits:['mohican']});
  assert.deepEqual(b.base,{dice:5,flat:0,source:''});assert.deepEqual(b.perk,{dice:5,flat:48,conditional:0});assert.equal(b.defense,9);
  s.boostSeconds=.1;assert.equal(E.attackBreakdown(s,richter).spe.rate,1);
  E.advance(s,.1);assert.equal(E.attackBreakdown(s,richter).spe.rate,0);
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
