'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character}=require('./current-fixtures.cjs');
const N=require('../js/numbers');
const q=D.sessions.find(q=>q.id==='ozmorn');
const oldReward=x=>q.reward*1.14**x*(1+x/100)**(100*Math.log(1.25/1.14));

test('reward taper preserves first rewards and reduces the late one-win windfall',()=>{
 const s=ready(['megumin','waku','max','jewel','queen'],'ozmorn');
 Object.assign(s.levels,{megumin:261,waku:232,max:244,jewel:116,queen:101});s.upgrades.reward=129;
 for(const base of D.sessions)assert.equal(E.sessionAtLevel(base,1).reward,base.reward);
 for(const level of [150,200,250,500])assert.ok(E.sessionAtLevel(q,level).reward<oldReward(level-1));
 s.questActiveLevels.ozmorn=170;const reward=E.reward(s);
 assert.ok(reward>3e14&&reward<5e14);
 assert.ok(E.hireCost(s,character('waku'))/reward>1);
 assert.ok(E.hireCost(s,character('megumin'))/reward>4);
 // Even a lucky Q190 win cannot buy a full level for all five members.
 s.questActiveLevels.ozmorn=190;
 assert.ok(E.reward(s)<E.formationIds(s).reduce((n,id)=>n+E.hireCost(s,character(id)),0));
});

test('reward increases increasingly slowly; comparable advancement needs more clears per upgrade',()=>{
 let previousGrowth=Infinity,previousClears=0;
 const s=ready(['megumin'],'ozmorn');s.upgrades.reward=129;
 // This is an economic comparison at equal increments, not a claim that a
 // party can defeat these levels. Runtime pacing also depends on CP and perks.
 for(let level=180;level<=1000;level+=10){
  const a=E.sessionAtLevel(q,level).reward,b=E.sessionAtLevel(q,level+1).reward;
  const growth=b/a;assert.ok(growth<previousGrowth);assert.ok(growth<D.balance.purchaseCostGrowth);
  previousGrowth=growth;s.levels.megumin=level+61;s.questActiveLevels.ozmorn=level;
  const clears=E.hireCost(s,character('megumin'))/E.reward(s);
  assert.ok(clears>previousClears);previousClears=clears;
 }
});

test('late quest unlock costs follow the new reward economy without inflating early prices',()=>{
 const s=ready(['meta'],'ozmorn');let previous=0;
 for(let level=1;level<=1000;level++){
  s.questLevels.ozmorn=level;const cost=E.questCost(s,'ozmorn');
  assert.ok(cost>=previous);previous=cost;
  assert.ok(cost<=N.geometric(q.reward*20,1.15,level-1));
  assert.ok(cost<=(E.sessionAtLevel(q,level).reward*20+20)*(1+1e-12));
  if(level<=25)assert.equal(cost,N.geometric(q.reward*20,1.15,level-1));
 }
 s.questLevels.ozmorn=200;s.factors=1e20;
 const quote=E.purchaseQuote(s,'quest','ozmorn',10),single=structuredClone(s);
 assert.ok(quote.valid);assert.ok(E.buyMany(s,'quest','ozmorn',10));
 for(let i=0;i<10;i++)assert.ok(E.buyQuest(single,'ozmorn'));
 assert.equal(s.questLevels.ozmorn,single.questLevels.ozmorn);
 assert.ok(Math.abs((1e20-single.factors)-quote.cost)<1e6);
 const sale=E.saleQuote(s,'quest','ozmorn',10);assert.ok(sale.valid&&sale.refund<=quote.cost/2+10);
});

test('pacing adjustment retains actual strengths, training prices and saved holdings',()=>{
 const s=ready(['megumin'],'ozmorn');s.levels.megumin=261;s.concentration.megumin.power=200;
 s.factors=4.853077625364153e31;s.earned=9e30;s.previousRunsEarned=7e30;
 s.questLevels.ozmorn=360;s.questActiveLevels.ozmorn=250;
 const restored=S.decode(S.encode(s));
 for(const key of ['factors','earned','previousRunsEarned','levels','concentration','questLevels','questActiveLevels'])assert.deepEqual(restored[key],s[key]);
 assert.equal(E.hireCost(s,character('megumin')),N.geometric(character('megumin').powerCost,1.125,260));
 const x=249,enemy=100*1.012**x*(1+x/100)**(100*Math.log(1.025/1.012));
 assert.ok(Math.abs(E.getSession(s).strength/enemy-1)<1e-12);
 for(const level of [10000,1e6,Number.MAX_SAFE_INTEGER]){
  s.questLevels.ozmorn=level;const reward=E.sessionAtLevel(q,level).reward;
  assert.ok(Number.isFinite(reward)&&reward>0&&reward<=1e100);
  assert.equal(E.questCost(s,'ozmorn'),level===Number.MAX_SAFE_INTEGER?Infinity:1e100);
 }
});
