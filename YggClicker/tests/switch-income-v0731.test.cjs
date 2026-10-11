'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,enable}=require('./current-fixtures.cjs');
test('view changes, quest levels, purchases and sales preserve stun and pending respawns',()=>{
 const s=ready(['megumin'],'mohicans');s.questLevels.mohicans=3;s.health.megumin.stunTurns=5;
 for(const [i,e]of s.enemies.entries()){e.hp=0;e.respawnSeconds=2+i*.5;}s.hp=0;s.respawnSeconds=2;
 const check=()=>{const ctx=E.battleContext(s,'mohicans');assert.equal(s.health.megumin.stunTurns,5);assert.deepEqual(ctx.enemies.map(e=>e.respawnSeconds),[2,2.5,3]);assert.ok(ctx.enemies.every(e=>e.hp===0));assert.deepEqual(E.click(ctx),[]);};
 E.selectSession(s,'scarecrow');check();E.setQuestLevel(s,'mohicans',2);check();E.buyQuest(s,'mohicans');check();E.sell(s,'quest','mohicans',1);check();E.selectSession(s,'mohicans');check();assert.deepEqual(S.decode(S.encode(s)).health.megumin,s.health.megumin);
 E.advance(s,1,()=>.5);assert.deepEqual(s.enemies.map(e=>e.respawnSeconds),[1,1.5,2]);assert.equal(s.health.megumin.stunTurns,5);
});
test('crimson fist income never exceeds HP actually removed, including overkill',()=>{
 for(const hp of [1,5,30]){const s=ready(['jewel'],'scarecrow');s.levels.jewel=1001;s.concentration.jewel.accuracy=700;enable(s,'jewel','crimson-fist');s.selectedCharacterId='jewel';s.enemies[0].hp=hp;s.hp=hp;
 const events=E.click(s,()=>.5),hit=events.find(e=>e.type==='attack'&&e.actorId==='jewel'&&e.hit);assert.ok(hit.doubleHit);assert.equal(s.incomeTotals.jewelDoubleHitIncome,Math.min(hp,hit.damage));}
});
test('quest order, rewards, unlock and initial upgrade prices follow the new progression',()=>{
 const s=E.createState();assert.deepEqual(D.sessions.map(q=>q.id),['mohican-solo','scarecrow','mohicans','ozmorn','dementor','egg-or-chicken']);assert.deepEqual(D.sessions.map(q=>q.code),['01','02','03','04','05','06']);assert.equal(E.getSession(s,'mohicans').reward,2);assert.equal(E.getSession(s,'dementor').reward,70);assert.equal(E.questCost(s,'mohicans'),40);assert.equal(E.questCost(s,'dementor'),1400);
 s.factors=2499;assert.equal(E.isQuestUnlocked(s,'dementor'),false);s.factors=2500;assert.equal(E.isQuestUnlocked(s,'dementor'),true);
});

