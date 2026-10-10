'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {D,E,S,ready,enable,character}=require('./current-fixtures.cjs');
test('base magic and cap shift by one, OFF disables it and spent magic restarts at one',()=>{
 const s=ready(['megumin']);const c=character('megumin');assert.deepEqual(E.magicState(s,c),{current:1,maximum:1});assert.equal(E.stats(s,c).flat,12);
 E.togglePerk(s,'megumin','explosion-girl',false);assert.deepEqual(E.magicState(s,c),{current:0,maximum:0});assert.equal(E.stats(s,c).flat,1);
 E.togglePerk(s,'megumin','explosion-girl',true);enable(s,'megumin','eternal-hammer');assert.equal(E.magicState(s,c).maximum,7);
 s.health.megumin.magicLevel=7;s.runaway.megumin.runawayRate=60;s.selectedCharacterId='megumin';s.enemies.forEach(e=>e.evasionFailure=true);const events=E.click(s,()=>.5);assert.ok(events.some(e=>e.magicLevel===7));assert.equal(E.magicState(s,c).current,1);assert.equal(s.health.megumin.blastEvasion,35);assert.deepEqual(S.decode(S.encode(s)).health.megumin,s.health.megumin);
});
test('schema50 charge migration preserves remaining casts and stun, and runs only once',()=>{
 for(const enabled of [true,false])for(const oldLevel of [0,3,6]){const s=ready(['megumin']);enable(s,'megumin','eternal-hammer');s.perkEnabled.megumin['explosion-girl']=enabled;s.health.megumin.magicLevel=oldLevel;s.health.megumin.stunTurns=3;
 const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:50,state:s}));assert.equal(loaded.health.megumin.magicLevel,enabled?oldLevel+1:oldLevel);assert.equal(loaded.health.megumin.stunTurns,3);assert.deepEqual(S.decode(S.encode(loaded)),loaded);}
});
