'use strict';
// Historical combat cases start in their original arena with every quest unlocked.
// New-game defaults and threshold unlocking are exercised separately in quests-v0480.
module.exports=function combatFixture(now){
 const E=require('../js/engine.js'),D=require('../js/data.js'),s=E.createState(now);
 s.questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,true]));
 const q=D.sessions.find(q=>q.id==='practice')||D.sessions.find(q=>q.id==='mohicans');
 s.sessionId=q.id;s.hp=q.hp;return s;
};
