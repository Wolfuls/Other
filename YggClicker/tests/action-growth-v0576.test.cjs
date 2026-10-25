const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,character,enable,roundTrip}=require('./current-fixtures.cjs'),N=require('../js/numbers');
test('all ally action tracks use the linear eight percent without an additive minimum',()=>{
 for(const c of D.characters){const s=ready([c.id]);for(const lv of [0,1,10,50,100,200]){
  s.levels[c.id]=lv+1;
  for(const base of [0,2,13,27])assert.equal(E.actionPower(s,c,base),N.floor(base*(1+.08*lv)));
 }}
});
test('all quests and summons use challenge level minus one, keeping zero-action actors at zero',()=>{
 for(const q of D.sessions.filter(q=>!q.members)){const s=ready(['meta'],q.id);for(const lv of [1,2,10,50,100]){
  s.questLevels[q.id]=s.questActiveLevels[q.id]=lv;
  assert.equal(E.getSession(s).actionMultiplier,(E.T.enemyValue(lv-1)/100));
  for(const raw of [0,7,11,22])assert.equal(E.enemyActionPower(s,raw),N.floor(raw*(E.T.enemyValue(lv-1)/100)));
  if(q.summons)assert.equal(E.enemyActionPower(s,13,s.enemies[1]),N.floor(13*(E.T.enemyValue(lv-1)/100)));
 }}
});
test('action metrics retain the growth curve without AP accumulation',()=>{
 const s=ready(['meta']);s.levels.meta=51;const c=character('meta'),expected=N.floor(c.action*5);
 assert.equal(E.characterMetrics(s,c).action,expected);assert.equal(E.actionPower(roundTrip(s),c),expected);
 const events=E.advance(s,1,()=>.5);assert.equal(events.filter(e=>e.type==='timelineTurn').length,1);assert.equal(s.actionPoints.meta,0);
});