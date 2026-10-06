'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),FX=require('../js/combat-effects');
const seeded=(n=41)=>()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
function state(quest='mohicans',id='max'){
 const s=combatFixture(1000);s.levels[id]=1;E.setFormation(s,'mohicans',[]);E.setFormation(s,quest,[id]);E.selectSession(s,quest);E.selectCharacter(s,id);E.ensureEnemies(s);return s;
}
function pending(s,slot=0,target='meta',remaining=.1){E.ensureEnemies(s)[slot].pendingAttack={targetId:target,remaining};}
test('each living enemy rolls a new independent action pool on every whole second',()=>{
 const s=state(),values=[...Array(10).fill(0),...Array(10).fill(.2),...Array(10).fill(.4)];let calls=0;
 E.advance(s,.999,()=>{throw Error('early dice');});
 E.advance(s,.001,()=>{calls++;return values.shift();});assert.equal(calls,30);assert.deepEqual(s.enemies.map(e=>e.actionPoints),[10,20,30]);
 E.advance(s,1,()=>.6);assert.deepEqual(s.enemies.map(e=>e.actionPoints),[50,60,70]);
 const ghost=state('dementor');E.advance(ghost,1,()=>.2);assert.deepEqual(ghost.enemies.map(e=>e.actionPoints),[21,21,21]);
});
test('wind-up is per individual and damage is deferred to the final frame',()=>{
 const s=state('mohicans','meta');s.enemies[0].actionPoints=90;s.enemies[1].actionPoints=60;
 const start=E.advance(s,1,()=>.4);assert.equal(start.filter(e=>e.type==='enemyWindup').length,1);assert.equal(start.some(e=>e.type==='enemyAttack'),false);assert.equal(s.health.meta.hp,20);
 E.advance(s,.719,()=>.4);assert.equal(s.health.meta.hp,20);const impact=E.advance(s,.001,()=>.4).find(e=>e.type==='enemyAttack');assert.equal(impact.damage,4);assert.equal(s.health.meta.hp,16);assert.equal(impact.targetSlot,0);
 assert.deepEqual(s.enemies.map(e=>e.actionPoints),[20,90,30]);
});
test('dementor has a longer soul-drain wind-up and locks its original local target',()=>{
 const s=state('dementor','meta');s.levels.richter=1;E.setFormation(s,'scarecrow',['richter']);s.enemies[2].actionPoints=99;
 const start=E.advance(s,1,()=>.4).find(e=>e.type==='enemyWindup');assert.equal(start.duration,1.2);assert.equal(start.targetId,'meta');
 E.advance(s,1.199,()=>.4);assert.equal(s.health.meta.hp,20);const hit=E.advance(s,.001,()=>.4).find(e=>e.type==='enemyAttack');assert.equal(hit.damage,11);assert.equal(s.health.richter.hp,24);
});
test('defeating a winding-up enemy cancels its strike and clears focus, not its neighbors',()=>{
 const s=state('mohicans','meta'),ids=s.enemies.map(e=>e.id);s.enemies[1].hp=1;pending(s,1);E.selectEnemy(s,ids[1]);
 const events=E.click(s,()=>.4);assert.ok(events.some(e=>e.type==='enemyCancel'));assert.equal(s.focusedEnemyId,null);assert.equal(s.enemies[1].respawnSeconds,5);
 assert.deepEqual(s.enemies.filter((_,i)=>i!==1).map(e=>e.hp),[20,20]);E.advance(s,.2,()=>.4);assert.equal(s.health.meta.hp,20);
});
test('every killed slot stays absent for exactly five seconds, even without hired allies',()=>{
 const s=combatFixture(),es=E.ensureEnemies(s),ids=es.map(e=>e.id);es.forEach(e=>e.hp=1);s.hp=1;
 E.selectEnemy(s,ids[1]);E.click(s,()=>.4);assert.equal(es[1].hp,0);assert.equal(E.isWaiting(s),false);assert.equal(E.selectEnemy(s,ids[1]),false);
 E.advance(s,1,()=>.4);E.selectEnemy(s,ids[2]);E.click(s,()=>.4);E.advance(s,3.999,()=>.4);assert.equal(es[1].hp,0);
 E.advance(s,.001,()=>.4);assert.equal(es[1].hp,20);assert.notEqual(es[1].id,ids[1]);assert.equal(es[2].hp,0);assert.ok(Math.abs(es[2].respawnSeconds-1)<1e-9);assert.equal(es[0].id,ids[0]);
 E.advance(s,1,()=>.4);assert.equal(es[2].hp,20);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('unfocused attacks randomly choose living slots and focused rear hits launch projectiles',()=>{
 for(const [value,slot]of [[0,0],[.4,1],[.9,2]]){const s=state('mohicans','meta'),hit=E.click(s,()=>value)[0];assert.equal(hit.targetSlot,slot);assert.equal(hit.continuation,false);assert.equal(FX.plan([hit])[0].metaAttacks,1);}
 const s=state('mohicans','meta');E.selectEnemy(s,s.enemies[2].id);for(let i=0;i<2;i++)assert.equal(E.click(s,()=>.4)[0].targetSlot,2);assert.equal(s.enemies[0].hp,20);E.selectEnemy(s,null);assert.equal(E.click(s,()=>0)[0].targetSlot,0);
});
test('poison is independent and cannot transfer into a dead slot or a fresh replacement',()=>{
 const s=state('dementor','tordeliese');s.levels.tordeliese=10;s.purchasedPerks.tordeliese=['greedy-gale'];E.selectEnemy(s,s.enemies[2].id);E.click(s,()=>.4);
 assert.deepEqual(s.enemies.map(e=>e.poisonDamage),[0,0,4]);const hp=s.enemies[2].hp;E.selectEnemy(s,s.enemies[1].id);s.selectedCharacterId=null;E.click(s,()=>.4);assert.equal(s.enemies[2].hp,hp);
 s.enemies[2].hp=1;E.selectEnemy(s,s.enemies[2].id);E.click(s,()=>.4);assert.equal(s.enemies[2].poisonDamage,0);E.setFormation(s,'dementor',[]);E.advance(s,2,()=>.4);assert.equal(s.enemies[2].poisonDamage,0);
});
test('area attack applies post-defense halves only to live individuals and grants each reward once',()=>{
 const s=state('mohicans','richter');s.levels.richter=50;s.purchasedPerks.richter=['bom-ber'];E.selectEnemy(s,s.enemies[2].id);
 const events=E.click(s,()=>.4);assert.equal(events.filter(e=>e.type==='attack').length,3);assert.equal(s.kills,3);assert.equal(s.earned,9);assert.ok(s.enemies.every(e=>e.hp===0&&e.respawnSeconds===5));assert.equal(E.isWaiting(s),true);assert.deepEqual(E.click(s),[]);
 E.advance(s,1.5,()=>.4);assert.equal(s.kills,3);assert.ok(s.enemies.every(e=>e.hp===0));assert.deepEqual(S.decode(S.encode(s)),s);
});
test('an already disabled or reassigned target is not struck or replaced by another victim',()=>{
 for(const move of [false,true]){const s=state('mohicans','meta');s.levels.richter=1;pending(s);
  if(move){E.setFormation(s,'mohicans',[]);E.setFormation(s,'scarecrow',['meta']);}else{s.health.meta={hp:1,status:'unconscious',regenSeconds:0};}
  const events=E.advance(s,.2,()=>.4);assert.equal(events.some(e=>e.type==='enemyAttack'),false);assert.equal(s.health.richter.hp,24);
 }
});
test('save/load retains individual charges, poison, focus, respawn and pending impacts across quests',()=>{
 const s=state('mohicans','meta');s.levels.richter=1;E.setFormation(s,'dementor',['richter']);s.enemies[1].actionPoints=53;s.enemies[2].poisonDamage=8;E.selectEnemy(s,s.enemies[2].id);pending(s);
 E.selectSession(s,'dementor');E.ensureEnemies(s)[1].actionPoints=88;E.selectEnemy(s,s.enemies[1].id);
 const b=S.decode(S.encode(s));assert.deepEqual(b,s);E.selectSession(b,'mohicans');assert.equal(b.enemies[1].actionPoints,53);assert.equal(b.focusedEnemyId,b.enemies[2].id);assert.equal(b.enemies[0].pendingAttack.targetId,'meta');
});
test('schema23 migrates shared charge once to the front and keeps other individual progress',()=>{
 const s=state('mohicans','meta');s.enemies[1].hp=11;s.enemies[2].poisonDamage=4;
 const old=structuredClone(s);old.enemyActionPoints=80;delete old.focusedEnemyId;old.enemies=old.enemies.map(({id,hp,poisonDamage})=>({id,hp,poisonDamage}));
 const next=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:23,state:old}));assert.deepEqual(next.enemies.map(e=>e.actionPoints),[80,0,0]);assert.equal(next.enemies[1].hp,11);assert.equal(next.enemies[2].poisonDamage,4);assert.equal('enemyActionPoints'in next,false);
});
test('invalid independent slot states cannot be imported',()=>{
 const s=state();for(const mutate of [x=>x.enemies[0].actionPoints=-1,x=>x.enemies[0].respawnSeconds=2,x=>x.focusedEnemyId=999,x=>x.enemies[0].pendingAttack={targetId:'unknown',remaining:.2},x=>x.enemies[1].pendingAttack={targetId:'max',remaining:3}]){const b=structuredClone(s);mutate(b);assert.throws(()=>S.encode(b));}
});
test('small and large time steps give identical battle outcomes and random draw order',()=>{
 const a=state('mohicans','meta');a.levels.richter=1;E.setFormation(a,'dementor',['richter']);const b=structuredClone(a),r=seeded();E.advance(a,70.25,seeded(),false);for(let i=0;i<281;i++)E.advance(b,.25,r,false);
 for(const key of ['kills','earned','hp','actionPoints'])assert.deepEqual(a[key],b[key]);for(const c of D.characters){assert.equal(a.health[c.id].hp,b.health[c.id].hp);assert.equal(a.health[c.id].status,b.health[c.id].status);}
 const compare=(x,y)=>{assert.equal(x.id,y.id);assert.equal(x.hp,y.hp);assert.equal(x.actionPoints,y.actionPoints);assert.ok(Math.abs(x.respawnSeconds-y.respawnSeconds)<1e-8);};a.enemies.forEach((e,i)=>compare(e,b.enemies[i]));assert.deepEqual(S.decode(S.encode(a)),a);
});
