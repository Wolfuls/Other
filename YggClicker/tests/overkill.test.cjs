'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),B=require('../js/battle-batch.js'),S=require('../js/save.js');
test('overkill unlock costs 200 once; HP -19 fails, -20 and below gain 25% of the upgraded reward',()=>{
 const s=E.createState(1000);s.factors=199;assert.equal(E.buyUpgrade(s,'overkill'),false);s.factors=200;
 assert.ok(E.buyUpgrade(s,'overkill'));assert.equal(s.factors,0);s.factors=999;assert.equal(E.buyUpgrade(s,'overkill'),false);assert.equal(s.factors,999);
 s.levels.meta=1;s.selectedCharacterId='meta';s.upgrades.reward=2;
 for(const [flat,bonus]of [[17,0],[18,1],[19,1]]){s.hp=10;s.upgrades.click=flat;const old=s.factors;
  const clear=E.click(s,()=>.999).find(e=>e.type==='clear');assert.equal(clear.overkills,bonus);assert.equal(clear.reward,2.4+bonus*.6);assert.ok(Math.abs(s.factors-old-(2.4+bonus*.6))<1e-10);
 }
 s.upgrades.overkill=0;s.hp=10;s.upgrades.click=19;assert.equal(E.click(s,()=>.999).find(e=>e.type==='clear').reward,2.4);
});
test('overkill uses current HP after armor and never pays for a knockout',()=>{
 const s=E.createState(1000);s.levels.meta=1;s.selectedCharacterId='meta';s.upgrades.overkill=1;s.upgrades.reward=1;E.selectSession(s,'patrol');
 for(const [flat,bonus]of [[19,0],[20,1]]){s.hp=10;s.upgrades.click=flat;const event=E.click(s,()=>.999).find(e=>e.type==='clear');assert.equal(event.reward,11+bonus*2.75);}
 s.upgrades.click=0;E.selectSession(s,'practice');s.hp=6;const event=E.click(s,()=>0).find(e=>e.type==='clear');assert.equal(event.reason,'knockout');assert.equal(event.reward,2.2);assert.equal(event.overkills,0);
});
test('spillover pays overkill for each eligible enemy including compacted kills',()=>{
 const s=E.createState(1000);s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];s.upgrades.overkill=1;
 const events=E.click(s,()=>.999),clears=events.filter(e=>e.type==='clear');
 assert.equal(s.kills,17);assert.equal(clears.reduce((n,e)=>n+e.overkills,0),15);assert.equal(s.earned,17*2+15*.5);assert.ok(clears.some(e=>e.count>12));
 E.selectSession(s,'heavy');s.hp=150;const old=s.earned;E.click(s,()=>.999);assert.equal(s.earned-old,56.25,'177 damage pays defense4, overkills HP150 by23');
});
test('offline overkill expectations match independent seeded rolls with armor and mixed spillover',()=>{
 for(const overflow of [false,true]){
  const H=40,N=200000,profiles=[{dice:2,flat:2,multiplier:3.9,defense:2,rate:2,overkillThreshold:20}, {dice:5,flat:8,multiplier:4.9,defense:2,rate:1,overflow,overkillThreshold:20}];
  let seed=817381,hp=H,kills=0,overkills=0;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<N;i++){const p=profiles[rng()<2/3?0:1];let sum=p.flat;for(let d=0;d<p.dice;d++)sum+=1+Math.floor(rng()*6);let remaining=Math.floor(sum*p.multiplier+1e-9);
   do{const hit=Math.max(0,remaining-p.defense),before=hp,lethal=hit>=hp;hp=Math.max(0,hp-hit);const ko=hit>0&&hp>0&&hp<=4&&(1+Math.floor(rng()*6))%2===1;
    if(lethal||ko){kills++;if(hit-before>=20)overkills++;hp=H;}
    remaining=p.overflow?Math.max(0,hit-before):0;
   }while(remaining>0);
  }
  const batch=B.resolve(H,H,N,profiles);assert.ok(Math.abs(batch.kills/kills-1)<.015);assert.ok(Math.abs(batch.overkills/overkills-1)<.02);
  const rates=B.rewardRates(H,profiles);assert.ok(Math.abs(rates.overkills/(overkills/N*3)-1)<.02);
 }
});
test('old saves default overkill to unowned, new saves round-trip and older clients are gated',()=>{
 const s=E.createState(1000);s.levels.meta=30;s.purchasedPerks.meta=['mohican-slayer'];s.upgrades.reward=4;s.factors=987.25;
 const old=JSON.parse(S.encode(s));old.schemaVersion=8;old.gameVersion='0.21.0';delete old.state.upgrades.overkill;
 assert.deepEqual(S.decode(JSON.stringify(old)),{...s,sessionId:'mohicans',hp:10});s.upgrades.overkill=1;s.sessionId='mohicans';s.hp=10;
 const saved=JSON.parse(S.encode(s));assert.equal(saved.schemaVersion,S.VERSION);assert.deepEqual(S.decode(JSON.stringify(saved)),s);
});
test('mohican variants share training stats and activate Meta special damage',()=>{
 const mob=D.sessions.find(s=>s.id==='mohicans'),practice=D.sessions[0];for(const key of ['hp','defense','reward'])assert.equal(mob[key],practice[key]);
 assert.deepEqual(mob.traits,['mohican']);assert.equal(new Set(mob.variants.map(v=>v.sheet)).size,10);
 const s=E.createState();s.levels.meta=30;s.purchasedPerks.meta=['mohican-slayer'];const base=E.expectedIncome(s).factorsPerSecond;
 E.selectSession(s,'mohicans');assert.equal(E.attackProfile(s,D.characters[0]).bonus,15);assert.ok(E.expectedIncome(s).factorsPerSecond>=base);
 s.upgrades.overkill=1;const income=E.expectedIncome(s);assert.ok(income.bonusPerSecond>0);assert.equal(income.factorsPerSecond,income.clearsPerSecond*2+income.bonusPerSecond);
});
