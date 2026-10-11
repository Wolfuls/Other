const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,rng}=require('./current-fixtures.cjs');
const quest='egg-or-chicken';
test('duo unlock, individual stats, price, and shared clear with in-place recovery',()=>{
 const s=ready([],quest);s.factors=9999999;s.questUnlocks[quest]=false;assert.equal(E.isQuestUnlocked(s,quest),false);s.factors=10000000;E.refreshQuestUnlocks(s);assert.equal(E.isQuestUnlocked(s,quest),true);assert.equal(E.questCost(s,quest),2000000000);
 const before=s.factors;s.enemies[0].hp=1;E.selectEnemy(s,s.enemies[0].id);const first=E.click(s,()=>.5);assert.ok(first.some(e=>e.type==='enemyDown'));assert.equal(s.factors,before);assert.equal(s.kills,0);
 const wait=s.enemies[0].respawnSeconds;E.advance(s,wait+1,rng());assert.equal(s.enemies[0].hp,0);assert.equal(s.enemies[0].respawnSeconds,wait);assert.equal(S.decode(S.encode(s)).enemies[0].hp,0);
 E.selectSession(s,'scarecrow');E.selectSession(s,quest);assert.equal(s.enemies[0].hp,0);
 s.enemies[1].hp=1;E.selectEnemy(s,s.enemies[1].id);const last=E.click(s,()=>.5);assert.equal(last.filter(e=>e.type==='clear').length,1);assert.equal(s.factors-before,100000000);assert.equal(s.kills,1);
 assert.equal(s.enemies[0].respawnSeconds,s.enemies[1].respawnSeconds);const revived=S.decode(S.encode(s));E.advance(revived,E.respawnDelay(revived)+.01,rng());assert.deepEqual(revived.enemies.map(e=>e.hp),[3200,2800]);assert.deepEqual(revived.enemies.map(e=>e.kind),['chikira','eggra']);
});
test('distance selects only supported attack patterns and all queued patterns round trip',()=>{
 const s=ready(['meta','mitsuru'],quest),c=character('meta');
 assert.deepEqual(E.enemyAttackChoices(s,s.enemies[0],c).map(a=>a.id),['fists','boulder']);assert.deepEqual(E.enemyAttackChoices(s,s.enemies[1],c).map(a=>a.id),['slash','ward','blizzard']);
 s.formationRows.meta='rear';assert.deepEqual(E.enemyAttackChoices(s,s.enemies[0],c).map(a=>a.id),['boulder']);assert.deepEqual(E.enemyAttackChoices(s,s.enemies[1],c).map(a=>a.id),['boomerang','ward','blizzard']);
 for(const e of s.enemies)for(const p of E.enemySpec(s,e).attacks){e.pendingAttack={targetId:'meta',remaining:E.enemyAttackDuration(s,e,p.id),count:1,kind:p.id,apCost:100,profile:{...E.enemyHitProfile(s,e,c),areaAttack:!!p.area}};assert.equal(S.decode(S.encode(s)).enemies.find(x=>x.kind===e.kind).pendingAttack.kind,p.id);e.pendingAttack=null;}
});
test('boulder and blizzard hit every eligible ally once and spend only one action',()=>{
 for(const [slot,kind]of [[0,'boulder'],[1,'blizzard']]){
  const s=ready(['meta','mitsuru'],quest);for(const id of ['meta','mitsuru']){s.levels[id]=500;s.health[id]={hp:E.maxHP(s,character(id)),status:'active',regenSeconds:0};}
  const enemy=s.enemies[slot];enemy.pendingAttack={targetId:'meta',remaining:.05,count:1,kind,apCost:100,profile:{...E.enemyHitProfile(s,enemy,character('meta')),areaAttack:true}};
  const events=E.advance(s,.05,rng()).filter(e=>e.type==='enemyAttack');assert.deepEqual(events.map(e=>e.targetId).sort(),['meta','mitsuru']);assert.ok(events.every(e=>e.areaAttack&&e.kind===kind));assert.equal(enemy.pendingAttack,null);
 }
});
test('area damage halves normal hits and trades double-hit bonus for full damage',()=>{
 const p={attack:{flat:100,dice:0},accuracySpec:{flat:15,dice:0},evasionDice:{flat:10,dice:0},reduction:20,postReduction:0,shield:0};
 assert.equal(E.rollEnemyHit(p,()=>.5).damage,80);assert.equal(E.rollEnemyHit({...p,areaAttack:true},()=>.5).damage,40);
 const doubled=E.rollEnemyHit({...p,accuracySpec:{flat:30,dice:0},areaAttack:true},()=>.5);assert.equal(doubled.damage,80);assert.equal(doubled.judgment.bonusDice,0);
});


