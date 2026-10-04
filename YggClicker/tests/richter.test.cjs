'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),B=require('../js/battle-batch.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js');
const richter=D.characters.find(c=>c.id==='richter');
function stateAt(level){const s=E.createState(1000);s.levels.richter=level;s.selectedCharacterId='richter';s.purchasedPerks.richter=richter.perks.filter(p=>level>=p.level).map(p=>p.id);return s;}
function rolls(...values){return()=>{assert.ok(values.length,'unexpected RNG');return values.shift();};}
test('Richter keeps dice and cumulative flat perk bonuses separate at every unlock boundary',()=>{
  for(const [level,dice,flat] of [[1,5,0],[9,5,0],[10,6,0],[19,6,0],[20,7,8],[29,7,8],[30,8,24],[39,8,24],[40,9,48],[49,9,48],[50,10,48],[60,11,48],[200,25,48]]){
    const s=stateAt(level);assert.deepEqual(E.stats(s,richter),{dice,flat},`level ${level}`);
    assert.equal(E.hasOverflow(s,richter),level>=50);
    assert.equal(E.perks(s,richter).filter(p=>p.unlocked).length,Math.min(5,Math.floor(level/10)));
  }
  assert.equal(E.perks(stateAt(60),richter)[0].dice,6);
});
test('attack levels enable purchases; action purchases do not, and all allies act',()=>{
  const s=stateAt(9);s.factors=1e10;const original=E.stats(s,richter);
  assert.ok(E.buyAction(s,'richter'));assert.deepEqual(E.stats(s,richter),original);
  assert.ok(E.hire(s,'richter'));assert.equal(E.stats(s,richter).dice,5);assert.ok(E.buyPerk(s,'richter','z-bom'));assert.equal(E.stats(s,richter).dice,6);
  s.levels.meta=1;s.actionLevels.richter=30;s.actionLevels.meta=8;
  const actors=new Set(E.advance(s,1,()=>0).filter(e=>e.type==='attack').map(e=>e.actorId));
  assert.deepEqual(actors,new Set(['meta','richter']));
});
test('Lv49 still discards overkill; Lv50 sends exactly the remaining damage through later targets',()=>{
  const before=stateAt(49);E.click(before,()=>0);assert.equal(before.kills,1);assert.equal(before.totalDamage,10);
  const after=stateAt(50);E.selectSession(after,'patrol');const events=E.click(after,()=>0);
  assert.equal(after.kills,8);assert.equal(after.hp,36);assert.equal(after.totalDamage,324);assert.equal(after.factors,85);
  const hits=events.filter(e=>e.type==='attack');assert.deepEqual(hits.map(e=>e.damage),[40,40,40,40,40,40,40,40,4]);
  assert.deepEqual(hits.map(e=>e.continuation),[false,true,true,true,true,true,true,true,true]);
  const exact=stateAt(50);E.selectSession(exact,'patrol');exact.hp=4;E.click(exact,()=>0);assert.equal(exact.kills,9);assert.equal(exact.hp,40);assert.equal(exact.totalDamage,324);
  const meta=stateAt(50);meta.levels.meta=200;meta.selectedCharacterId='meta';E.click(meta,()=>0);assert.equal(meta.kills,1);
});
test('the last spillover target checks KO; its unused HP creates neither damage nor another hit',()=>{
  for(const face of [1,2]){
    const s=stateAt(50);s.upgrades.reward=2;E.selectSession(s,'patrol');
    const events=E.click(s,rolls(.5,.5,...Array(8).fill(0),(face-.5)/6));
    assert.equal(s.totalDamage,359);assert.equal(s.kills,face===1?9:8);assert.equal(s.hp,face===1?40:1);
    assert.equal(s.factors,5+s.kills*15);assert.equal(events.filter(e=>e.type==='attack').length,9);
    assert.equal(events.filter(e=>e.type==='attack').at(-1).knockoutRoll,face);
  }
});
test('manual training and boosts increase spillover, while eventless progress is identical',()=>{
  const s=stateAt(50);s.upgrades.click=3;s.boostSeconds=30;E.selectSession(s,'patrol');
  E.click(s,rolls(...Array(10).fill(0)));assert.equal(s.totalDamage,683);assert.equal(s.kills,17);assert.equal(s.hp,37);
  s.actionLevels.richter=30;const without=structuredClone(s);
  E.advance(s,1,()=>0);E.advance(without,1,()=>0,false);assert.deepEqual(s,without);
});
test('chain impacts retain each clear but launch only one Richter projectile per actual attack',()=>{
  const s=stateAt(50);E.selectSession(s,'patrol');const frames=FX.plan(E.click(s,()=>0));
  assert.equal(frames.length,9);assert.equal(frames.reduce((n,f)=>n+f.clears,0),8);
  assert.equal(frames.reduce((n,f)=>n+f.richterAttacks,0),1);assert.equal(frames.reduce((n,f)=>n+f.metaAttacks,0),0);
  s.levels.richter=200;s.boostSeconds=30;s.upgrades.power=25;
  const many=E.click(s,()=>.99),planned=FX.plan(many);
  assert.ok(many.length<35);assert.ok(planned.length<=FX.MAX_STEPS);
  assert.equal(planned.reduce((n,f)=>n+f.richterAttacks,0),1);
  assert.equal(planned.reduce((n,f)=>n+f.clears,0),many.filter(e=>e.type==='clear').reduce((n,e)=>n+(e.count||1),0));
});
test('old schema6 without Richter imports unowned, and new perks/selection survive save transfer',()=>{
  const old=E.createState(1000);old.levels.meta=2;
  for(const key of ['levels','actionLevels','actionPoints'])delete old[key].richter;
  const imported=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:6,state:old}));
  assert.equal(imported.levels.richter,0);assert.equal(imported.levels.meta,2);
  const current=stateAt(50);current.actionLevels.richter=50;current.actionPoints.richter=37;
  const saved=S.decode(S.encode(current));assert.deepEqual(saved,current);assert.equal(E.hasOverflow(saved,richter),true);
});
test('spillover batch rewards agree with seeded multi-character rolls and conserve split progress',()=>{
  const profiles=[{dice:42,flat:1,multiplier:1,rate:1,overflow:true},{dice:2,flat:0,multiplier:1,rate:2,overflow:false}];
  const attacks=100000,H=40,result=B.resolve(H,H,attacks,profiles);
  let seed=12345,hp=H,kills=0,dealt=0,stuns=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<attacks;i++){
    const p=profiles[random()<1/3?0:1];let damage=E.roll(p.dice,p.flat,random);
    do{
      const hit=p.overflow?Math.min(hp,damage):damage;dealt+=Math.min(hp,hit);hp=Math.max(0,hp-hit);damage=p.overflow?damage-hit:0;
      const ko=hp>0&&hp<=4&&(1+Math.floor(random()*6))%2===1;
      if(hp===0||ko){kills++;stuns+=ko?1:0;hp=H;}
    }while(damage>0);
  }
  for(const [a,b] of [[result.kills,kills],[result.damage,dealt],[result.knockouts,stuns]])assert.ok(Math.abs(a-b)/b<.02,`${a} vs ${b}`);
  let splitHP=H,splitKills=0,splitDamage=0;
  for(let i=0;i<100;i++){const r=B.resolve(splitHP,H,1000,profiles);splitHP=r.hp;splitKills+=r.kills;splitDamage+=r.damage;}
  assert.ok(Math.abs(splitKills-result.kills)<=1);assert.ok(Math.abs(splitDamage-result.damage)<H);
});
test('spillover batches remain finite at large action levels and multipliers with shared divisors',()=>{
  for(const mult of [1,2,5,10,14.5])for(const hp of [10,40,150]){
    const r=B.resolve(hp,hp,1e9,[{dice:42,flat:1,multiplier:mult,rate:1,overflow:true}]);
    assert.ok(Number.isFinite(r.damage)&&r.damage>0);assert.ok(r.kills>0);assert.ok(r.hp>0&&r.hp<=hp);
    assert.ok(Math.abs(r.damage/(148*mult*1e9)-1)<.001);
  }
  const a=stateAt(50);a.actionLevels.richter=1e12;a.levels.meta=2;a.actionLevels.meta=1e12;a.boostSeconds=30;
  const b=structuredClone(a);E.advance(a,28800,()=>0);E.advance(b,28800,()=>0,false);assert.deepEqual(a,b);
  assert.deepEqual(S.decode(S.encode(a)),a);
});
