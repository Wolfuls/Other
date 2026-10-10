const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,character,enable,roundTrip}=require('./current-fixtures.cjs'),N=require('../js/numbers');
test('all ally action tracks use the linear two percent without an additive minimum',()=>{
 for(const c of D.characters){const s=ready([c.id]);for(const lv of [0,1,10,50,100,200]){
  s.levels[c.id]=lv+1;
  for(const base of [0,2,13,27])assert.equal(E.actionPower(s,c,base),N.floor(base*(1+.02*lv)));
 }}
});
test('all quests and summons use challenge level minus one, keeping zero-action actors at zero',()=>{
 for(const q of D.sessions){const s=ready(['meta'],q.id);for(const lv of [1,2,10,50,100]){
  s.questLevels[q.id]=s.questActiveLevels[q.id]=lv;
  assert.equal(E.getSession(s).actionMultiplier,(E.T.enemyValue(lv-1)/100));
  for(const raw of [0,7,11,22])assert.equal(E.enemyActionPower(s,raw),N.floor(raw*(E.T.enemyValue(lv-1)/100)));
  if(q.summons)assert.equal(E.enemyActionPower(s,13,s.enemies[1]),N.floor(13*(E.T.enemyValue(lv-1)/100)));
 }}
});
test('fixed perk bonuses are grown before concentration; a downed unit keeps its forecast but cannot gain AP',()=>{
 const s=ready(['tordeliese']);enable(s,'tordeliese','for-whom-the-storm');const c=character('tordeliese');
 const grown=N.floor((c.action+12)*(1+.02*124));
 assert.equal(E.actionPower(s,c),grown);s.concentration[c.id].action=2;
 assert.equal(E.actionPower(s,c),N.floor((c.action+12)*(1+.02*124)*1.08**(2/(1+2.5*2/124))));
 s.health[c.id].status='unconscious';assert.equal(E.actionPower(s,c),0);
 assert.equal(E.actionPower(s,c,c.action,true),N.floor(c.action*(1+.02*124)*1.08**(2/(1+2.5*2/124))));
});
test('required AP, metrics and one-second AP accumulation follow the new curve',()=>{
 const s=ready(['meta']);s.levels.meta=51;const c=character('meta'),expected=N.floor(c.action*2);
 assert.equal(E.actionThreshold(s),expected*2);assert.equal(E.characterMetrics(s,c).action,expected);
 const before=roundTrip(s);assert.equal(before.levels.meta,51);assert.equal(E.actionPower(before,c),expected);
 E.advance(s,1,()=>.5);assert.equal(s.actionPoints.meta,N.floor((c.actionDice.flat+c.actionDice.dice*4)*1.1**7.5));
});
