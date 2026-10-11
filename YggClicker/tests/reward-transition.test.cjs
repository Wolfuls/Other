const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready}=require('./current-fixtures.cjs'),N=require('../js/numbers');
const config={'mohican-solo':[2,100],scarecrow:[10,100],mohicans:[2,98],dementor:[70,108],ozmorn:[50,100],'egg-or-chicken':[100000000,100]};
test('quest reward transitions preserve Q1, fallback, monotonicity and numeric cap',()=>{
 for(const q of D.sessions){assert.deepEqual([q.reward,q.rewardTransition],config[q.id]);assert.equal(E.sessionAtLevel(q,1).reward,q.reward);
  let previous=0;for(let level=1;level<=500;level++){const actual=E.sessionAtLevel(q,level).reward;assert.ok(actual>=previous);previous=actual;}
  const {rewardTransition,...fallback}=q;
  for(const level of [1,10,30,50,100,170,300,500,1e6,Number.MAX_SAFE_INTEGER]){
   assert.equal(E.sessionAtLevel(fallback,level).reward,N.floor(N.curveValue(q.reward,level-1,D.questGrowth.rewardCurve)));
   const r=E.sessionAtLevel(q,level).reward;assert.ok(Number.isFinite(r)&&r<=1e100);
  }
 }
});
test('reward transition affects only reward, never enemy stats or Q purchase curve',()=>{
 for(const q of D.sessions)for(const level of [1,10,30,50,100,170,300,500]){
  const {reward:a,rewardTransition:b,...actual}=E.sessionAtLevel(q,level),{reward:c,rewardTransition:d,...standard}=E.sessionAtLevel({...q,rewardTransition:100},level);assert.deepEqual(actual,standard);
  const s=ready(['meta'],q.id);s.questLevels[q.id]=level;
  const base=q.reward*D.questGrowth.costRewardMultiplier;
  assert.equal(E.questCost(s),Math.min(N.geometric(base,D.questGrowth.costGrowth,level-1),N.floor(N.curveValue(base,level-1,D.questGrowth.rewardCurve))));
 }
});
test('transition is static quest configuration, not persisted save state',()=>{
 const s=ready(['meta'],'dementor');s.questLevels.dementor=170;s.questActiveLevels.dementor=100;
 const text=S.encode(s,1000),restored=S.decode(text);assert.ok(!text.includes('rewardTransition'));assert.equal(restored.questLevels.dementor,170);assert.equal(restored.questActiveLevels.dementor,100);assert.equal(E.getSession(restored).reward,E.getSession(s).reward);
});
