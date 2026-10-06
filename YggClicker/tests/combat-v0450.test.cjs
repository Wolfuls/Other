'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),B=require('../js/battle-batch');
const char=id=>D.characters.find(c=>c.id===id),seeded=()=>{let x=271828;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};};
const ready=(id='meta')=>{const s=combatFixture(1000);s.levels[id]=1;s.selectedCharacterId=id;return s;};
test('new enemy/player stats and aggregate base-5% action growth',()=>{
 assert.equal(D.sessions.find(q=>q.id==='scarecrow').hp,35);assert.equal(D.sessions.find(q=>q.id==='scarecrow').reward,10);
 assert.deepEqual(D.characters.map(c=>[c.maxHP,c.evasion.flat,c.evasion.dice]),[[20,9,1],[24,9,1],[36,14,1],[15,12,1],[22,16,2],[20,16,1]]);
 const s=combatFixture();for(const [id,base,first,tenth]of [['meta',50,52,75],['richter',35,36,52],['vishunal',60,63,90],['tordeliese',80,84,120],['max',50,52,75],['waku',75,78,112]]){
  s.levels[id]=1;assert.equal(E.actionPower(s,char(id)),base);s.actionLevels[id]=1;assert.equal(E.actionPower(s,char(id)),first);s.actionLevels[id]=10;assert.equal(E.actionPower(s,char(id)),tenth);
 }
});
test('opposed dice: recursive six, one subtraction without recursion, separate starting dice',()=>{
 let faces=[6,6,1,6,3],i=0;const r=()=>((faces[i++]-1)+.1)/6;
 assert.deepEqual(E.combatRoll({flat:8,dice:2},r),{total:18,dice:[6,6,1,-6,3],critical:true,fumble:true});assert.equal(i,5);
 const q=D.sessions.find(q=>q.id==='mohicans'),old=q.accuracy;try{q.accuracy={flat:9,dice:1};const s=ready();E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};const hit=E.advance(s,.1,()=>.4).find(e=>e.type==='enemyAttack');assert.equal(hit.accuracy.total,hit.evasion.total);assert.equal(hit.hit,false);assert.equal(s.health.meta.hp,20);}finally{q.accuracy=old;}
});
test('three independent enemies only target local allies and scarecrow never attacks',()=>{
 const s=ready();s.levels.richter=1;E.setFormation(s,'mohicans',['meta']);E.setFormation(s,'scarecrow',['richter']);
 for(const e of E.ensureEnemies(s))e.actionPoints=90;
 assert.equal(E.advance(s,1,()=>.4).filter(e=>e.type==='enemyWindup').length,3);
 const attacks=E.advance(s,.72,()=>.4).filter(e=>e.type==='enemyAttack');assert.equal(attacks.length,3);assert.ok(attacks.every(e=>e.targetId==='meta'));assert.deepEqual(attacks.map(e=>e.targetSlot),[0,1,2]);assert.equal(s.health.richter.hp,24);
 const solo=ready();E.setFormation(solo,'mohicans',[]);E.setFormation(solo,'scarecrow',['meta']);E.selectSession(solo,'scarecrow');assert.equal(E.advance(solo,20,()=>.4).filter(e=>e.type==='enemyAttack').length,0);
});
test('strict player thresholds, full-HP recovery, bench healing, pause and burst price',()=>{
 for(const [before,status,hp]of [[8,'active',4],[7,'unconscious',3],[4,'unconscious',0],[3,'dying',-1]]){
  const s=ready();s.health.meta.hp=before;E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};E.advance(s,.1,()=>.4);assert.equal(s.health.meta.hp,hp);assert.equal(s.health.meta.status,status);
 }
 const s=ready();s.health.meta={hp:-2,status:'dying',regenSeconds:0};E.setFormation(s,'mohicans',[]);E.advance(s,35,()=>.4);assert.equal(s.health.meta.hp,3);assert.equal(s.health.meta.status,'dying');
 E.advance(s,1,()=>.4);assert.equal(s.health.meta.hp,4);assert.equal(s.health.meta.status,'dying');s.paused=true;E.advance(s,100);assert.equal(s.health.meta.hp,4);s.paused=false;
 E.advance(s,96,()=>.4);assert.equal(s.health.meta.hp,20);assert.equal(s.health.meta.status,'active');
 s.levels.meta=2;s.actionLevels.meta=1;assert.equal(E.revivalCost(s,'meta'),11);s.health.meta={hp:2,status:'unconscious',regenSeconds:2};s.factors=10;assert.equal(E.revive(s,'meta'),false);s.factors=11;assert.equal(E.revive(s,'meta'),true);assert.equal(s.factors,0);assert.deepEqual(s.health.meta,{hp:20,status:'active',regenSeconds:0});
});
test('incapacitated characters lose attacks, manual actions, perks and Max support but keep purchases',()=>{
 const s=ready('max');s.levels.meta=50;s.purchasedPerks.meta=['metal-blade'];s.purchasedPerks.max=['plot-armor'];s.actionLevels.max=50;
 s.health.max.status='unconscious';s.health.max.hp=1;s.health.meta.status='dying';s.health.meta.hp=-1;
 assert.equal(E.actionPower(s,char('meta')),0);assert.equal(E.perks(s,char('meta')).some(p=>p.unlocked),false);assert.deepEqual(E.click(s),[]);assert.equal(E.advance(s,1,()=>.4).length,0);
 s.factors=1e9;E.revive(s,'meta');assert.equal(E.actionPower(s,char('meta')),50);assert.equal(E.attackProfile(s,char('meta')).ignoreDefense,true);assert.deepEqual(s.purchasedPerks.meta,['metal-blade']);
});
test('area attack halves AFTER defense, tracks wounded rear enemies, never chains into fourth target',()=>{
 const s=ready('vishunal');s.levels.vishunal=25;s.purchasedPerks.vishunal=['mad-dog'];s.questLevels.mohicans=8;s.hp=E.getSession(s).hp;
 const p=E.attackProfile(s,char('vishunal')),es=E.ensureEnemies(s);es[0].hp=3;s.hp=3;es[1].hp=30;es[2].hp=40;
 const expected=Math.max(1,Math.floor((B.rolledDamage(p,20)-p.defense)/2));const events=E.click(s,()=>.2),hits=events.filter(e=>e.type==='attack');
 assert.equal(hits.length,3);assert.ok(hits.every(e=>e.damage===expected));assert.equal(s.kills,2);assert.equal(s.nextEnemyId,3);assert.deepEqual(s.enemies.map(e=>e.hp),[0,0,6]);
 const low=ready('vishunal');low.levels.vishunal=25;low.purchasedPerks.vishunal=['mad-dog'];low.questLevels.mohicans=25;low.hp=E.getSession(low).hp;const full=low.hp;
 E.click(low,()=>.2);assert.deepEqual(low.enemies.map(e=>e.hp),[full-34,full-34,full-34]);
 const partial=ready();const back=E.ensureEnemies(partial);back[1].hp=9;back[1].poisonDamage=4;back[0].hp=1;E.selectEnemy(partial,back[0].id);E.click(partial,()=>.4);assert.equal(partial.hp,9);assert.equal(partial.poisonDamage,4);assert.equal(partial.enemies[2].hp,20);
 assert.deepEqual(S.decode(S.encode(partial)),partial);
});
test('solo five-second delay, independent offscreen queues, current-save and schema22 migration',()=>{
 const s=ready();E.setFormation(s,'mohicans',[]);E.setFormation(s,'scarecrow',['meta']);E.selectSession(s,'scarecrow');s.hp=1;E.click(s,()=>.4);assert.equal(s.respawnSeconds,5);assert.deepEqual(E.click(s),[]);
 E.advance(s,4.9,()=>.4);assert.equal(s.hp,0);E.advance(s,.1,()=>.4);assert.equal(s.hp,35);assert.equal(s.actionPoints.meta,50);
 assert.deepEqual(S.decode(S.encode(s)),s);
 const old={...s,hp:20,enemies:undefined,health:undefined,respawnSeconds:0};const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:22,state:old}));assert.equal(migrated.hp,17);assert.equal(migrated.health.max.hp,22);
 const corrupt=structuredClone(s);corrupt.enemies[0].hp=0;assert.throws(()=>S.encode(corrupt));
});
test('parallel battles and recovery match split intervals and never duplicate time or members',()=>{
 const s=ready();s.levels.richter=1;E.setFormation(s,'mohicans',['meta']);E.setFormation(s,'scarecrow',['richter']);
 const a=structuredClone(s),b=structuredClone(s);E.advance(a,30,seeded(),false);const r=seeded();for(let i=0;i<300;i++)E.advance(b,.1,r,false);
 for(const field of ['kills','earned','hp','sessionStates','actionPoints'])assert.deepEqual(a[field],b[field]);
 for(const c of D.characters){assert.equal(a.health[c.id].hp,b.health[c.id].hp);assert.equal(a.health[c.id].status,b.health[c.id].status);assert.ok(Math.abs(a.health[c.id].regenSeconds-b.health[c.id].regenSeconds)<1e-8);}
 assert.equal(E.setFormation(a,'dementor',['meta']),true);assert.deepEqual(S.decode(S.encode(a)),a);
});
test('extreme action rates stay bounded, online and offline use the same target limit',()=>{
 const s=ready('richter');s.levels.richter=100;s.actionLevels.richter=1000000;E.setFormation(s,'mohicans',[]);E.setFormation(s,'scarecrow',['richter']);E.selectSession(s,'scarecrow');
 const started=performance.now();E.advance(s,28800,()=>.4,false);assert.ok(performance.now()-started<5000);assert.equal(s.kills,5760);assert.equal(s.earned,5760*10);assert.deepEqual(S.decode(S.encode(s)),s);
});
