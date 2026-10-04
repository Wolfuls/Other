'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js');

test('v0.16 saves preserve purchases; manual and automatic attacks roll only their stated dice',()=>{
  for(const [id,dice,flat,damage,manualDamage,seconds] of [['meta',4,17,123,141,2],['richter',10,48,330,347,4]]){
    const character=D.characters.find(c=>c.id===id),state=E.createState(1000);
    state.levels[id]=50;state.selectedCharacterId=id;state.upgrades.click=3;
    state.purchasedPerks[id]=character.perks.map(p=>p.id);E.selectSession(state,'heavy');
    const legacy=JSON.parse(S.encode(state));legacy.gameVersion='0.16.0';
    const restored=S.decode(JSON.stringify(legacy));assert.deepEqual(restored,state);
    assert.deepEqual(E.stats(restored,character),{dice,flat});
    let calls=0;const random=()=>{calls++;assert.ok(calls<=dice,'flat bonus must not add RNG calls');return 0;};
    const manual=E.click(structuredClone(restored),random).filter(e=>e.type==='attack');
    assert.equal(calls,dice);assert.equal(manual.reduce((sum,e)=>sum+e.damage,0),manualDamage);
    calls=0;const auto=E.advance(restored,seconds,random).filter(e=>e.type==='attack');
    assert.equal(calls,dice);assert.equal(auto.reduce((sum,e)=>sum+e.damage,0),damage);
  }
});

test('flat perk damage reaches DPS and long offline progress without inheriting manual training',()=>{
  const state=E.createState(1000),meta=D.characters.find(c=>c.id==='meta');
  state.levels.meta=40;state.purchasedPerks.meta=['attack-plus','full-metal-burst'];
  state.upgrades.click=25;E.selectSession(state,'patrol');
  const sums=[1,2,3,4,5,6].flatMap(a=>[1,2,3,4,5,6].map(b=>a+b));
  const mean=sums.reduce((n,sum)=>n+(Math.floor((sum+12)*4.9+1e-9)-2),0)/36;
  assert.ok(Math.abs(E.dps(state)-mean*E.attackRate(state,meta))<1e-10);
  // Every 2D6+12 roll at x4.9 exceeds this enemy's 40 HP, so each attack clears exactly once.
  E.catchUp(state,1000+3600*1000);
  assert.equal(state.kills,2000);assert.equal(state.totalDamage,80000);
  assert.equal(state.earned,20000);assert.equal(state.hp,40);
});
