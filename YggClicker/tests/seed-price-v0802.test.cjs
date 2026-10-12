const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,ready,roundTrip}=require('./current-fixtures.cjs');
test('seed costs round upward and refunds match old, new and mixed purchases after save reload',()=>{
 for(const legacy of [0,5,10]){
 let s=ready();s.sinTotal=100;s.sinBalance=100;s.dreamShop=true;s.viewingMemories=true;s.memoriesUnlocked=true;
 for(let l=0;l<legacy;l++){const cost=Math.floor(1.06**l);s.seedLevels.pride++;s.sinBalance-=cost;s.dreamPurchases.pride={levels:l+1,cost:(s.dreamPurchases.pride?.cost||0)+cost};}
 const costs=Array.from({length:legacy},(_,l)=>Math.floor(1.06**l));
 for(let l=legacy;l<12;l++){const cost=Math.ceil(1.06**l);assert.equal(E.seedCost(s,'pride'),cost);assert.ok(E.buySeed(s,'pride'));costs.push(cost);}
 s=roundTrip(s);
 for(const cost of costs.reverse()){const before=s.sinBalance;assert.ok(E.refundSeed(s,'pride'));assert.equal(s.sinBalance-before,cost);}
 assert.equal(s.sinBalance,100);assert.equal(s.seedLevels.pride,0);
 }
});
test('memory unlock includes exactly one million and persists after spending',()=>{
 const s=E.createState();s.factors=999999;assert.equal(E.isMemoriesUnlocked(s),false);s.factors=1000000;assert.ok(E.selectMemories(s));s.factors=0;assert.ok(E.isMemoriesUnlocked(roundTrip(s)));
});
