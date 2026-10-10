'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S}=require('./current-fixtures.cjs'),N=require('../js/numbers');
test('new quest unlock boundaries include exact threshold and persist after spending',()=>{
 for(const [id,threshold]of [['mohicans',100],['dementor',2500],['ozmorn',1000]]){
  const s=E.createState(1000);s.factors=threshold-1;assert.equal(E.isQuestUnlocked(s,id),false);s.factors=threshold;assert.equal(E.isQuestUnlocked(s,id),true);E.refreshQuestUnlocks(s);s.factors=0;assert.equal(E.isQuestUnlocked(S.decode(S.encode(s)),id),true);
 }
});
test('all quest initial prices use unmodified initial reward and retain growth for buy/sell',()=>{
 const s=E.createState(1000);s.factors=1e30;E.refreshQuestUnlocks(s);
 for(const q of D.sessions){
  s.questLevels[q.id]=1;s.upgrades.reward=100;assert.equal(E.questCost(s,q.id),q.reward*20);
  for(const L of [1,2,25,170,500]){s.questLevels[q.id]=L;const base=q.reward*20;assert.equal(E.questCost(s,q.id),Math.min(N.geometric(base,D.questGrowth.costGrowth,L-1),N.floor(N.curveValue(base,L-1,D.questGrowth.rewardCurve))));}
  s.questLevels[q.id]=1;const price=E.purchaseQuote(s,'quest',q.id,10);assert.ok(price.valid);assert.ok(E.buyMany(s,'quest',q.id,10));assert.equal(s.questLevels[q.id],11);assert.ok(E.saleQuote(s,'quest',q.id,10).refund<=price.cost/2+10);
 }
});
