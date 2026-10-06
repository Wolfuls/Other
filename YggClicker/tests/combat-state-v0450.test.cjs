'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),B=require('../js/battle-batch'),FX=require('../js/combat-effects');
const rng=(seed=199)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const prepare=(id,quest='mohicans')=>{const s=combatFixture(1000);s.levels[id]=100;s.selectedCharacterId=id;s.purchasedPerks[id]=D.characters.find(c=>c.id===id).perks.filter(p=>!p.initial).map(p=>p.id);E.setFormation(s,'mohicans',[]);E.setFormation(s,quest,[id]);E.selectSession(s,quest);E.selectCharacter(s,id);return s;};
for(const id of ['meta','richter','vishunal'])for(const quest of ['mohicans','dementor','scarecrow'])test(`${id}: area immunity/armor, exact three-target rolls and one visual launch on ${quest}`,()=>{
 const s=prepare(id,quest),c=D.characters.find(c=>c.id===id);s.questLevels[quest]=15;s.hp=E.getSession(s).hp;s.upgrades.overkill=1;
 const p=E.attackProfile(s,c),raw=B.rolledDamage(p,p.dice*3+p.flat+p.bonus);let calls=0;const events=E.click(s,()=>{calls++;return .4;}),hits=events.filter(e=>e.type==='attack'),targets=quest==='scarecrow'?1:3;
 const expected=Math.max(1,Math.floor(Math.max(1,raw-p.defense)/(targets===3?2:1)));
 assert.equal(hits.length,targets);assert.ok(hits.every(h=>h.damage===expected));assert.equal(calls,p.dice+hits.filter(h=>h.knockoutRoll!==null).length);assert.ok(s.kills<=3);
 assert.equal(FX.plan(events).reduce((n,f)=>n+(f[id+'Attacks']||0),0),1);assert.deepEqual(S.decode(S.encode(s)),s);
 if(id==='meta')assert.equal(p.defense,quest==='scarecrow'?E.getSession(s).defense:0);
});
test('wounded rear targets, poison and charges survive switching, quest trades and save/load',()=>{
 const s=prepare('richter');s.questLevels.mohicans=15;s.hp=E.getSession(s).hp;const es=E.ensureEnemies(s);es[1].hp=11;es[1].poisonDamage=8;es[2].hp=22;es[1].actionPoints=77;
 const before=structuredClone(s.enemies);E.selectSession(s,'scarecrow');assert.deepEqual(E.battleContext(s,'mohicans').enemies,before);E.selectSession(s,'mohicans');assert.equal(s.enemies[1].actionPoints,77);
 s.factors=1e9;const max=E.getSession(s).hp;E.buyQuest(s,'mohicans');assert.ok(s.enemies[1].hp>11);assert.equal(s.enemies[1].poisonDamage,8);E.sell(s,'quest','mohicans');assert.equal(E.getSession(s).hp,max);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('enemy identity wraps safely even when approximate batches skip enormous clear counts',()=>{
 const s=prepare('richter');s.nextEnemyId=999999999;const es=E.ensureEnemies(s);assert.deepEqual(es.map(e=>e.id),[999999999,0,1]);E.click(s,()=>.4);assert.equal(new Set(s.enemies.map(e=>e.id)).size,3);s.actionLevels.richter=1e14;E.advance(s,300,()=>.4,false);assert.equal(new Set(s.enemies.map(e=>e.id)).size,3);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('surviving a low-HP knockout roll remains combat-capable until another damaging hit',()=>{
 const s=combatFixture();s.levels.meta=1;s.health.meta.hp=7;E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};
 let rolls=[.4,.4,.4,.4,.9];const e=E.advance(s,.1,()=>rolls.shift()??.4).find(e=>e.type==='enemyAttack');assert.equal(e.hpAfter,3);assert.equal(s.health.meta.status,'active');assert.equal(E.canAct(s,'meta'),true);
 E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};E.advance(s,.1,()=>.4);assert.equal(s.health.meta.status,'dying');assert.equal(s.health.meta.hp,-1);assert.equal(E.canAct(s,'meta'),false);
});
test('revival prices sum individually rounded upgrade costs, exclude perks, and charge atomically',()=>{
 for(const c of D.characters){const s=combatFixture();s.levels[c.id]=1;assert.equal(E.revivalCost(s,c.id),c.cost);s.factors=1e12;const original=s.factors;
 for(let i=0;i<4;i++)E.hire(s,c.id);for(let i=0;i<6;i++)E.buyAction(s,c.id);const spent=original-s.factors,expected=c.cost+Math.max(1,Math.floor(spent*.1));assert.equal(E.revivalCost(s,c.id),expected);
 s.health[c.id]={hp:-5,status:'dying',regenSeconds:5};s.factors=expected-1;const before=structuredClone(s);assert.equal(E.revive(s,c.id),false);assert.deepEqual(s,before);s.factors++;assert.ok(E.revive(s,c.id));assert.equal(s.factors,0);assert.equal(s.health[c.id].hp,c.maxHP);assert.equal(E.revive(s,c.id),false);assert.deepEqual(S.decode(S.encode(s)),s);}
});
test('eight-hour incoming combat and offscreen recovery remain bounded and saveable',()=>{
 const s=combatFixture();for(const c of D.characters)s.levels[c.id]=1;E.setFormation(s,'mohicans',['meta','max']);E.setFormation(s,'dementor',['vishunal','tordeliese']);E.setFormation(s,'scarecrow',['richter']);
 const start=performance.now();E.advance(s,28800,rng(),false);assert.ok(performance.now()-start<4000);assert.ok(s.kills>0);assert.ok(Object.values(s.health).some(h=>h.hp<20));assert.deepEqual(S.decode(S.encode(s)),s);
});
test('health/queue validation rejects fractional HP, illegal recovery, duplicate enemy IDs and excess respawn',()=>{
 const s=prepare('meta');E.ensureEnemies(s);for(const change of [x=>x.health.meta.hp=1.5,x=>x.health.meta={hp:20,status:'dying',regenSeconds:0},x=>x.health.meta={hp:-1,status:'active',regenSeconds:0},x=>x.health.meta.regenSeconds=10,x=>x.enemies[1].id=x.enemies[0].id,x=>x.enemies[2].hp=0,x=>x.enemies[1].poisonDamage=5]){const bad=structuredClone(s);change(bad);assert.throws(()=>S.encode(bad));}
 const solo=prepare('meta','scarecrow');solo.hp=0;solo.respawnSeconds=6;assert.throws(()=>S.encode(solo));
});
test('damage PMF preserves floors after defense and area halving',()=>{
 const p={dice:2,flat:0,bonus:0,multiplier:1,defense:3,areaAttack:true};let total=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)total+=Math.max(1,Math.floor(Math.max(1,a+b-3)/2));assert.ok(Math.abs(B.averageDamage(p)-total/36)<1e-10);
});
test('forecast uses shared combat rules, preserves input and includes defense, poison and regeneration',()=>{
 const s=prepare('tordeliese','dementor');s.levels.tordeliese=25;s.purchasedPerks.tordeliese=['greedy-gale','retreating-wind'];const before=structuredClone(s),estimate=E.expectedIncome(s);assert.deepEqual(s,before);assert.ok(estimate.factorsPerSecond>0);
 const copy=structuredClone(s);E.advance(copy,6000,rng(),false);assert.ok(Math.abs(copy.earned/6000-estimate.factorsPerSecond)/estimate.factorsPerSecond<.35);
 const high=prepare('richter','scarecrow');high.questLevels.scarecrow=100;high.hp=E.getSession(high).hp;assert.ok(E.expectedIncome(high).factorsPerSecond>0,'unfinished damage is included in rare-clear estimates');
});
test('all down sprites are packaged and Tordeliese uses one stable animation image',()=>{
 const root=path.join(__dirname,'..');for(const c of D.characters){const bytes=fs.readFileSync(path.join(root,c.downSprite));assert.equal(Math.max(bytes.readUInt32BE(16),bytes.readUInt32BE(20)),256);assert.equal(bytes[25],6,'transparent RGBA sprites');}
 const atlas=fs.readFileSync(path.join(root,D.tordelieseVisual.sheet));assert.equal(atlas.readUInt32BE(16),2304);assert.equal(atlas.readUInt32BE(20),1152);

});
