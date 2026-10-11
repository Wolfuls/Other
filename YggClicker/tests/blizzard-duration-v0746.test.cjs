const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,S,ready,character}=require('./current-fixtures.cjs');
test('sustained blizzard timing survives saving and does not slow the other patterns',()=>{
 const s=ready(['meta'],'egg-or-chicken'),e=s.enemies[1];
 assert.equal(E.enemyAttackDuration(s,e,'blizzard'),3.2);
 assert.equal(E.enemyAttackDuration(s,e,'slash'),1.4);
 assert.equal(E.enemyAttackDuration(s,e,'boomerang'),1.4);
 e.pendingAttack={kind:'blizzard',remaining:3,count:1,targetId:'meta',apCost:100,profile:{...E.enemyHitProfile(s,e,character('meta')),areaAttack:true}};
 const loaded=S.decode(S.encode(s));assert.equal(loaded.enemies[1].pendingAttack.remaining,3);
 assert.equal(E.enemyAttackDuration(loaded,loaded.enemies[1]),3.2);
});
