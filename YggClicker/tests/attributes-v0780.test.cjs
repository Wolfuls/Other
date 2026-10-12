'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,character,enable,rng,roundTrip}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
test('sins entry is hidden and inaccessible in run one, visible from run two',()=>{
 const s=ready(),h=harness(s);assert.equal(h.get('sins-open').hidden,true);h.click('sins-open');assert.ok(!h.get('sin-shop').open);
 s.runNumber=2;const next=harness(s);assert.equal(next.get('sins-open').hidden,false);next.click('sins-open');assert.equal(next.get('sin-shop').open,true);
});
test('resistance and weakness are independent for attack and effect; resistance wins ties',()=>{
 const t={resistances:['shock'],weaknesses:['blast']};assert.equal(E.attributeMultiplier(t,[]),1);assert.equal(E.attributeMultiplier(t,['shock']),0);assert.equal(E.attributeMultiplier(t,['blast','blast']),1.5);assert.equal(E.attributeMultiplier(t,['shock','blast']),0);
 const p={apReduction:4,effectElements:{apReduction:['shock']}};assert.equal(E.elementalPerk(p,t).apReduction,0);assert.equal(E.elementalPerk(p,{weaknesses:['shock']}).apReduction,6);assert.equal(p.apReduction,4);
 assert.equal(E.attributeDamage(11,1.5),16);assert.equal(E.attributeDamage(1e100,1.5),1e100);
});
test('only specified normal attacks are tagged; Kogumo does not inherit the boss attack tag',()=>{
 for(const id of ['megumin','vishunal','richter'])assert.deepEqual(character(id).attackElements,['blast']);
 assert.deepEqual(character('mitsuru').attackElements,[]);
 const s=ready(['meta'],'ozmorn'),boss=E.enemySpec(s,s.enemies[0]),minion=E.enemySpec(s,{kind:'kogumo',creationDamage:10});
 for(const q of [boss,minion]){assert.deepEqual(q.resistances,['shock']);assert.deepEqual(q.weaknesses,['blast']);}
 assert.deepEqual(boss.attackElements,['shock']);assert.deepEqual(minion.attackElements,[]);
});
test('Mitsuru tags obey perk toggles and ranges, and resisted attached slow leaves untagged damage intact',()=>{
 const s=ready(['mitsuru','max'],'mohicans'),c=character('mitsuru');enable(s,c.id,'spark-shot','radioactivity','spaghetti-code');s.formationRows.mitsuru='rear';s.enemies[1].row='rear';
 const q={...E.getSession(s),resistances:['shock']},near=E.attackProfile(s,c,false,q,s.enemies[0]),far=E.attackProfile(s,c,false,q,s.enemies[1]);
 assert.equal(near.distance,2);assert.equal(far.distance,3);for(const p of [near,far]){assert.deepEqual(p.attackElements,['shock']);assert.equal(p.damageElementMultiplier,0);assert.equal(p.apReduction,0);}
 E.togglePerk(s,c.id,'radioactivity',false);s.formationRows.mitsuru='front';const physical=E.attackProfile(s,c,false,q,s.enemies[0]);assert.deepEqual(physical.attackElements,[]);assert.equal(physical.damageElementMultiplier,1);
 E.togglePerk(s,c.id,'spark-shot',false);assert.deepEqual(E.attackProfile(s,c,false,q,s.enemies[1]).attackElements,[]);
});
function attack(id,weak=true){const s=ready([id],'ozmorn');s.paused=false;s.enemies[0].evasionFailure=true;const q=D.sessions.find(q=>q.id==='ozmorn'),old=q.weaknesses;if(!weak)q.weaknesses=[];try{return {s,events:E.click(s,rng(22))};}finally{q.weaknesses=old;}}
test('actual explosion damage and DPS use weakness multiplier against zero defense, ordinary attacks remain unchanged',()=>{
 for(const id of ['vishunal','richter']){const a=attack(id,false),b=attack(id,true),x=a.events.find(e=>e.type==='attack'&&e.hit),y=b.events.find(e=>e.type==='attack'&&e.hit);assert.ok(x&&y);assert.equal(y.damage,E.attributeDamage(x.damage,1.5));assert.equal(y.elementMultiplier,1.5);}
 const a=attack('meta',false),b=attack('meta',true);assert.deepEqual(a,b);
 const s=ready(['vishunal'],'ozmorn'),c=character('vishunal'),p=E.attackProfile(s,c);assert.equal(p.damageElementMultiplier,1.5);assert.ok(E.averageAttackDamage(s,c)>0);
});
test('immune spark/radio hits deal zero, cannot knock out at low HP, and do not generate summons',()=>{
 const s=ready(['mitsuru'],'ozmorn');s.paused=false;enable(s,'mitsuru','radioactivity');s.enemies[0].hp=1;s.enemies[0].evasionFailure=true;const ev=E.click(s,rng(22)),hit=ev.find(e=>e.type==='attack'&&e.hit);assert.ok(hit);assert.equal(hit.damage,0);assert.equal(s.enemies[0].hp,1);assert.equal(E.livingEnemies(s).length,1);assert.equal(E.averageAttackDamage(s,character('mitsuru')),0);
});
test('old pending enemy attack gains current attributes at impact, without changing save compatibility',()=>{
 const c=character('meta'),s=ready(['meta'],'ozmorn');s.paused=false;const profile=E.enemyHitProfile(s,s.enemies[0],c);delete profile.damageElementMultiplier;profile.accuracySpec={flat:100,dice:0};s.enemies[0].pendingAttack={kind:'attack',targetId:c.id,remaining:.05,count:1,profile};s.timeline.busySeconds=1;
 const old=c.resistances;c.resistances=['shock'];try{const copy=roundTrip(s),before=copy.health.meta.hp,ev=E.advance(copy,.1,rng(9)),hit=ev.find(e=>e.type==='enemyAttack');assert.ok(hit?.hit);assert.equal(hit.damage,0);assert.equal(copy.health.meta.hp,before);}finally{c.resistances=old;}
});
test('incoming weakness retains area penalty with zero defense; effect weakness survives saves',()=>{
 const s=ready(['meta'],'ozmorn'),p=E.enemyHitProfile(s,s.enemies[0],character('meta'));p.accuracySpec={flat:100,dice:0};p.areaAttack=true;
 const a=E.rollEnemyHit({...p,damageElementMultiplier:1},rng(9)),b=E.rollEnemyHit({...p,damageElementMultiplier:1.5},rng(9));assert.ok(a.hit);assert.equal(b.damage,E.attributeDamage(a.damage,1.5));
 s.enemies[0].actionPenalty=6;s.enemies[0].slowSeconds=5;assert.equal(roundTrip(s).enemies[0].actionPenalty,6);
});

test('Spaghetti Code retaliation is resisted independently; neutral enemies receive four, weak enemies six',()=>{
 for(const [resistances,weaknesses,expected]of [[['shock'],[],0],[[],[],4],[[],['shock'],6]]){
 const q=D.sessions.find(q=>q.id==='ozmorn'),old=[q.resistances,q.weaknesses];q.resistances=resistances;q.weaknesses=weaknesses;
 try{const s=ready(['mitsuru'],'ozmorn');s.paused=false;enable(s,'mitsuru','spaghetti-code');const c=character('mitsuru');s.health.mitsuru.hp=E.maxHP(s,c);const p=E.enemyHitProfile(s,s.enemies[0],c);p.accuracySpec={flat:100,dice:0};s.enemies[0].pendingAttack={kind:'attack',remaining:.05,count:1,targetId:'mitsuru',profile:p};s.timeline.busySeconds=1;
 const ev=E.advance(s,.1,rng(99));assert.ok(ev.some(e=>e.type==='enemyAttack'&&e.hit));assert.equal(s.enemies[0].actionPenalty,expected);
 }finally{[q.resistances,q.weaknesses]=old;}}
});
test('Kogumo profiles apply explosion weakness and shock immunity per target',()=>{
 const s=ready(['vishunal'],'ozmorn'),e=s.enemies[1];e.hp=e.maxHP=e.creationDamage=100;const p=E.attackProfile(s,character('vishunal'),false,E.enemySpec(s,e),e);assert.equal(p.damageElementMultiplier,1.5);
 s.levels.mitsuru=1;E.setFormation(s,'ozmorn',['mitsuru']);enable(s,'mitsuru','radioactivity');assert.equal(E.attackProfile(s,character('mitsuru'),false,E.enemySpec(s,e),e).damageElementMultiplier,0);
});
