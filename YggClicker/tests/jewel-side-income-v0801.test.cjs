const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,ready,roundTrip}=require('./current-fixtures.cjs');
test('Jewel side income ignores sin and greed independently and together, while recording actual earnings',()=>{
 for(const [sin,greed] of [[0,0],[100,0],[0,5],[100,5]]){
  const s=ready(['jewel']);s.sinTotal=sin;s.seedLevels.greed=greed;s.paused=false;s.factors=12345;
  const earned=s.earned,total=s.incomeTotals.jewelSideIncome||0,events=[];
  assert.equal(E.jewelSideIncome(s,()=>.5,events),123);
  assert.equal(s.factors,12468);assert.equal(s.earned-earned,123);assert.equal(s.incomeTotals.jewelSideIncome-total,123);
  assert.equal(events[0].amount,123);assert.equal(events[0].incomeType,'jewelSideIncome');
  const loaded=roundTrip(s);assert.equal(loaded.incomeTotals.jewelSideIncome,s.incomeTotals.jewelSideIncome);
  assert.equal(E.incomeAmount(loaded,10000,'jewelSideIncome'),10000);
  for(const type of ['jewelDoubleHitIncome','jewelDamageIncome'])assert.equal(E.incomeAmount(s,10000,type),10000*(1+sin*.01)*(1+greed*.2));
 }
});
test('unmodified side income still respects wallet and earned caps',()=>{
 for(const key of ['factors','earned']){const s=ready(['jewel']);s.sinTotal=100;s.seedLevels.greed=5;s[key]=1e100;assert.equal(E.grantIncome(s,100,'jewelSideIncome'),0);}
});
