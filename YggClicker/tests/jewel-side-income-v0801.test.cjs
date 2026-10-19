const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,ready,roundTrip}=require('./current-fixtures.cjs');
test('Jewel C side income ignores sin and applies greed once',()=>{
 for(const [sin,greed]of [[0,0],[100,0],[0,5],[100,5]]){const s=ready(['jewel']);s.sinTotal=sin;s.seedLevels.greed=greed;s.credits=12345;const rd=s.factors,earned=s.earned,ev=[],expected=Math.floor(123*(1+greed*.01));assert.equal(E.jewelSideIncome(s,()=>.5,ev),expected);assert.equal(s.credits,12345+expected);assert.equal(s.factors,rd);assert.equal(s.earned,earned);assert.equal(ev[0].currency,'C');assert.equal(roundTrip(s).creditsEarned,expected);}
});
test('C income respects wallet and acquired caps',()=>{for(const key of ['credits','creditsEarned']){const s=ready(['jewel']);s[key]=1e100;assert.equal(E.grantCredits(s,100),0);}});
