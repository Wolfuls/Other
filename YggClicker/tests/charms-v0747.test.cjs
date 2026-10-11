const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,S,ready,character}=require('./current-fixtures.cjs');
function setup(kind,down=false){const s=ready(['meta'],'egg-or-chicken');s.levels.meta=500;s.health.meta.hp=E.maxHP(s,character('meta'));const e=s.enemies[1];if(down){s.enemies[0].hp=0;s.enemies[0].respawnSeconds=E.respawnDelay(s);}e.pendingAttack={kind,remaining:.6,count:1,targetId:'meta',apCost:100,profile:E.enemyHitProfile(s,e,character('meta'))};return s;}
test('ward applies at catch, skips downed ally and expires without stacking',()=>{
 const s=setup('ward',true);E.advance(s,.1,()=>.9);assert.equal(s.enemies[1].wardSeconds,0);
 const ev=E.advance(s,.021,()=>.9);assert.ok(ev.some(e=>e.type==='enemyCharm'));assert.equal(s.enemies[0].wardSeconds,0);assert.ok(s.enemies[1].wardSeconds>9.99);
 assert.equal(E.targetDefense({defense:5},s.enemies[1]),10);assert.equal(E.targetDefense({defense:5,mental:true},s.enemies[1]),5);
 const copy=S.decode(S.encode(s));assert.equal(copy.enemies[1].pendingAttack.charmApplied,true);assert.ok(copy.enemies[1].wardSeconds>9.99);
 s.enemies[1].pendingAttack=null;s.enemies[1].wardSeconds=.1;E.advance(s,.11,()=>.9);assert.equal(s.enemies[1].wardSeconds,0);
});
test('revival rolls once at catch: success restores half HP, failure leaves downed',()=>{
 for(const [roll,success] of [[.49,true],[.5,false]]){const s=setup('revive',true),ev=E.advance(s,.121,()=>roll);assert.equal(ev.find(e=>e.type==='enemyCharm').success,success);assert.equal(s.enemies[0].hp,success?E.enemyMaxHP(s,s.enemies[0])/2:0);assert.equal(s.kills,0);const more=E.advance(s,.1,()=>0);assert.equal(more.some(e=>e.type==='enemyCharm'),false);}
});
test('revival is offered only while Chikira is down; dead caster cannot finish',()=>{
 const s=setup('ward');assert.ok(!E.enemyAttackChoices(s,s.enemies[1],character('meta')).some(a=>a.id==='revive'));s.enemies[0].hp=0;s.enemies[0].respawnSeconds=E.respawnDelay(s);assert.ok(E.enemyAttackChoices(s,s.enemies[1],character('meta')).some(a=>a.id==='revive'));
 s.enemies[1].hp=0;s.enemies[1].respawnSeconds=E.respawnDelay(s);const ev=E.advance(s,.2,()=>0);assert.equal(ev.some(e=>e.type==='enemyCharm'),false);
});
