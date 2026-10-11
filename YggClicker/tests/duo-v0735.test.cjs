const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js');
test('pending duo starts at requested independent HP on existing growth curves',()=>{
 const q=D.sessions.find(q=>q.id==='egg-or-chicken');assert.equal(q.sharedHP,false);assert.equal(q.unlockFactors,10000000);assert.equal(q.reward,100000000);
 for(const e of q.members){
  const s=E.sessionAtLevel({...e,reward:0},1);assert.equal(s.hp,e.initialHP);assert.equal(s.baseHP,e.hp);
  assert.ok(s.attackStrength<s.strength);assert.ok(s.strength<s.defenseStrength);assert.ok(s.defenseStrength<s.hpStrength);assert.ok(s.attackStrength<200);assert.equal(e.initialStrengthMultiplier,undefined);
  for(const level of [1,2,10,100]){
   const actual=E.sessionAtLevel({...e,reward:45},level),equivalent=E.sessionAtLevel({...e,initialHP:undefined,reward:45},s.strengthLevel+level);
   for(const key of ['hp','strength','hpStrength','defenseStrength','attackStrength','actionMultiplier'])assert.ok(Math.abs(actual[key]-equivalent[key])<1e-8);
   assert.equal(actual.reward,E.sessionAtLevel({...e,initialHP:undefined,reward:45},level).reward);
  }
 }
});
test('ordinary quests retain their original growth stage',()=>{
 for(const e of D.sessions.filter(q=>!q.members))for(const level of [1,50,100]){
  const q=E.sessionAtLevel(e,level);assert.equal(q.strengthLevel,level-1);assert.equal(q.strength,E.T.enemyValue(level-1));assert.equal(q.hpStrength,E.T.enemyDurability(level-1,'vitality'));assert.equal(q.attackStrength,E.T.enemyDurability(level-1,'power'));
 }
});
