'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),N=require('../js/numbers.js');

test('all thirteen perks use requested prices and exact affordability boundaries',()=>{
 const prices={meta:[50,1000,50000,30000,30000000],richter:[100,1000,10000,3000000,100000000],vishunal:[15000,150000,3000000]};
 for(const c of D.characters.filter(c=>Object.hasOwn({meta:1,richter:1,vishunal:1},c.id))){
  assert.deepEqual(c.perks.map(p=>p.cost),prices[c.id]);
  for(const p of c.perks){const s=combatFixture();s.levels[c.id]=p.level;s.factors=p.cost-1;
   assert.equal(E.buyPerk(s,c.id,p.id),false);assert.equal(s.factors,p.cost-1);
   s.factors=p.cost;assert.equal(E.buyPerk(s,c.id,p.id),true);assert.equal(s.factors,0);
   assert.equal(E.buyPerk(s,c.id,p.id),false);assert.deepEqual(s.purchasedPerks[c.id],[p.id]);
  }
 }
});

test('every quest uses 1.1 HP growth, independently rounded from its base',()=>{
 for(const q of D.sessions)for(let level=1;level<=100;level++){
  const n=BigInt(level-1),expected=Number(BigInt(q.hp)*11n**n/10n**n);
  // Exact rational reference avoids checking the production formula against itself.
  assert.equal(E.sessionAtLevel(q,level).hp,expected,`${q.id} Lv${level}`);
 }
});

test('schema16 rebases active HP once and retains money, purchased perks, charges and all quest levels',()=>{
 for(const q of D.sessions.filter(q=>q.id!=='mohican-solo'))for(const level of [1,2,3,10,50,100]){
  const old=combatFixture(1000);old.sessionId=q.id;old.questLevels[q.id]=level;old.factors=123456;old.earned=999999;old.kills=654;old.sceneSeconds=302.4;
  for(const c of D.characters.filter(c=>Object.hasOwn({meta:1,richter:1,vishunal:1},c.id))){old.levels[c.id]=100;old.purchasedPerks[c.id]=c.perks.map(p=>p.id);old.actionLevels[c.id]=80;old.actionPoints[c.id]=65;}
  old.options={showOrbits:false};const oldMax=N.geometric(q.id==='scarecrow'?40:q.hp,1.2,level-1),newMax=E.getSession(old).hp;
  for(const fraction of [1,.4]){
   old.hp=Math.max(1,N.floor(oldMax*fraction));const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:16,state:old}));
   const intermediate=N.geometric(q.id==='scarecrow'?40:q.hp,1.15,level-1),previous=N.geometric(q.hp,1.15,level-1);let hp=Math.max(1,N.floor(old.hp/oldMax*intermediate));hp=Math.max(1,N.floor(hp/intermediate*previous));assert.equal(s.hp,Math.max(1,N.floor(hp/previous*newMax)));
   assert.deepEqual(s,{...old,hp:s.hp,options:{...D.displayDefaults,showOrbits:false}});
   assert.deepEqual(S.decode(S.encode(s)),s,'no repeated rescaling or price adjustment');
  }
 }
});

test('HP migration preserves valid offline remainders and rejects corrupt old HP before rescaling',()=>{
 const old=combatFixture(1000);old.questLevels.mohicans=3;old.hp=14;old.batchHpFraction=.5;
 const decode=s=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:16,state:s}));
 assert.equal(decode(old).hp,12);assert.equal(decode(old).batchHpFraction,0);
 for(const hp of [0,-1,29,2.5])assert.throws(()=>decode({...old,hp}));
 for(const batchHpFraction of [-1,1,NaN])assert.throws(()=>decode({...old,batchHpFraction}));
 assert.throws(()=>decode({...old,hp:28,batchHpFraction:.5}));
 const lv1={...old,questLevels:{...old.questLevels,mohicans:1}};assert.equal(decode(lv1).batchHpFraction,0);
});
