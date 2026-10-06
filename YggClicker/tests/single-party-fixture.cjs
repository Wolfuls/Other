'use strict';
// Existing combat/FX tests explicitly move their one test party to a fresh
// target. Production selectSession now changes the camera only. Concurrent
// session behavior is tested separately without this fixture.
module.exports=function moveTestParty(state,id){
 const E=require('../js/engine.js'),D=require('../js/data.js');
 if(!D.sessions.some(q=>q.id===id)||state.sessionId===id)return false;
 const selected=state.selectedCharacterId;
 E.selectSession(state,id);
 state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,null]));
 state.sessionStates={};state.hp=E.getSession(state).hp;state.poisonDamage=0;state.respawnSeconds=0;state.batchHpFraction=0;state.enemies=null;state.nextEnemyId=0;state.focusedEnemyId=null;
 E.selectCharacter(state,selected);
 return true;
};
