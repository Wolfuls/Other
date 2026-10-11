'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,character:c,ready,enable,faces,rng,roundTrip}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
const near=(a,b,eps=1e-10)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
const tables={
 meta:[['mohican-slayer',0,0],['attack-plus',10,.1],['lock-plus',25,.1],['metal-shield',50,.1],['metal-blade',75,.3],['spinning-rush',100,.3],['metal-storm',125,.5],['full-metal-burst',150,.9]],
 richter:[['z-bom',0,.2],['dx-bom',10,.1],['bom-ber',25,.3],['gx-bom',50,.5],['vx-bom',75,.7],['ex-bom',100,.9]],
 waku:[['deceptive-hitbox',0,.1],['expanded-hurtbox',10,.1],['floor-clip',25,.2],['monado-smash',50,.3],['invisible-wall',75,.3],['vanishing-hurtbox',100,.8],['vanishing-hitbox',125,.9],['full-screen-hurtbox',150,.9],['next-frame',200,1.5]]
};
test('rebalanced catalogs match every level and per-minute pressure; hire order follows the new price',()=>{
 assert.deepEqual([c('meta').dice,c('meta').flat,c('richter').cost],[3,5,2500]);
 assert.deepEqual(D.characters.map(c=>c.cost),D.characters.map(c=>c.cost).toSorted((a,b)=>a-b));
 for(const [id,rows]of Object.entries(tables)){
  assert.deepEqual(c(id).perks.map(p=>[p.id,p.level]),rows.map(([id,lv])=>[id,lv]));
  for(const [pid,lv,pressure]of rows){const p=c(id).perks.find(p=>p.id===pid);near(p.runawayPressure*60,pressure);assert.equal(!!p.initial,lv===0);assert.doesNotMatch(p.description,/※|実装|防御計算後|半減ペナルティ/);}
 }
 assert.equal(c('waku').perks[0].name,'詐欺判定有効');
});
test('manual player damage is always exactly one, including high strengths, resistance, armor and minions',()=>{
 for(const q of D.sessions)for(const level of [1,100,1000]){
  const s=ready([],q.id);s.questLevels[q.id]=level;E.setQuestLevel(s,q.id,level);s.selectedCharacterId=null;
  if(q.members)E.selectEnemy(s,E.livingEnemies(s)[0].id);
  const before=E.livingEnemies(s)[0].hp,hit=E.click(s,()=>.5).find(e=>e.type==='attack');
  assert.equal(hit.damage,1);assert.equal(hit.hpAfter,before-1);assert.deepEqual(E.manualStats(s),{dice:0,flat:1});assert.equal(E.profileAverage(s,E.attackProfile(s,null,true)),1);
  if(q.id==='ozmorn'){const add=s.enemies[1];assert.equal(add.creationDamage,1);E.selectEnemy(s,add.id);assert.equal(E.click(s,()=>.5)[0].damage,1);}
 }
});
test('new initial perks act from hire; new optional perks are OFF; old ON/OFF choices migrate once',()=>{
 for(const [id,rows]of Object.entries(tables)){
  const [initial]=rows[0],s=ready([id]);assert.equal(E.perks(s,c(id)).find(p=>p.id===initial).unlocked,true);
  const old=structuredClone(s);old.perkEnabled[id][initial]=false;old.unlockedPerks[id]=[];old.purchasedPerks[id]=[];
  const decode=state=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:40,gameVersion:'0.61.0',state}));
  assert.equal(decode(old).perkEnabled[id][initial],true);
  old.levels[id]=200;old.unlockedPerks[id]=[initial];
  for(const on of [false,true]){old.perkEnabled[id][initial]=on;const migrated=decode(old);assert.equal(migrated.perkEnabled[id][initial],on);assert.equal(roundTrip(migrated).perkEnabled[id][initial],on);assert.equal(migrated.factors,old.factors);assert.deepEqual(migrated.health,old.health);}
 }
 const s=ready(['richter']);s.levels.richter=50;E.refreshPerkUnlocks(s);assert.equal(E.perks(s,c('richter')).find(p=>p.id==='gx-bom').enabled,false);
 const old=ready(['meta']);old.levels.meta=60;old.perkEnabled.meta['metal-blade']=true;old.unlockedPerks.meta=['metal-blade'];const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:40,state:old}));
 assert.equal(migrated.perkEnabled.meta['metal-blade'],true);assert.equal(E.attackProfile(migrated,c('meta')).ignoreDefense,false);migrated.levels.meta=75;assert.equal(E.attackProfile(migrated,c('meta')).ignoreDefense,false); // scarecrow immunity
 E.setFormation(migrated,'dementor',['meta']);E.selectSession(migrated,'dementor');assert.equal(E.attackProfile(migrated,c('meta')).ignoreDefense,true);
});
test('perk pressure accumulates only from eligible ON perks and is inactive while down',()=>{
 for(const [id,rows]of Object.entries(tables)){
  const s=ready([id]);enable(s,id,...rows.map(r=>r[0]));const amount=rows.reduce((sum,r)=>sum+r[2],0);near(E.runawayPressureBreakdown(s,c(id)).perkPressure*60,amount);
  const b=E.runawayPressureBreakdown(s,c(id));E.advance(s,1,()=>.5);near(s.runaway[id].runawayRate,b.net);
  for(const [pid]of rows)E.togglePerk(s,id,pid,false);near(E.runawayPressureBreakdown(s,c(id)).perkPressure,0);
  enable(s,id,...rows.map(r=>r[0]));s.levels[id]=1;near(E.runawayPressureBreakdown(s,c(id)).perkPressure*60,rows[0][2]);
  s.health[id].status='dying';s.health[id].hp=-1;const down=E.runawayPressureBreakdown(s,c(id));assert.equal(down.active,false);near(down.generated,0);
 }
});
test('Richter GX uses the same recursive 25% chain as Meta and spends no extra AP',()=>{
 const s=ready(['richter']);enable(s,'richter','gx-bom');s.perkEnabled.richter['z-bom']=false;
 const p=E.attackProfile(s,c('richter'));assert.equal(p.extraAttackChance,.25);assert.equal(E.chainAttackCount(.25,()=>.99),4);
 s.enemies[0].hp=1e8;s.hp=1e8;let first=true;const hits=E.click(s,()=>first?(first=false,.99):.5).filter(e=>e.type==='attack');
 assert.equal(hits.length,4);assert.equal(hits.filter(e=>e.extraAttack).length,3);assert.equal(s.actionPoints.richter,0);
 near(E.effectiveAttackRate(s,c('richter')),E.attackRate(s,c('richter'))/.75);
 E.togglePerk(s,'richter','gx-bom',false);assert.equal(E.attackProfile(s,c('richter')).extraAttackChance,0);
});
// Isolate shared area rules at equal strength. Production unlock levels are
// checked above; only this fixture lowers the area perk to Lv1.
function areaFixture(run,accuracy={flat:15,dice:0},evasion={flat:10,dice:0}){
 const actor=c('meta'),q=D.sessions.find(q=>q.id==='mohicans'),perk=actor.perks.find(p=>p.id==='metal-storm'),before={accuracy:actor.accuracy,level:perk.level,evasion:q.evasion,defense:q.defense};
 try{actor.accuracy=accuracy;perk.level=1;q.evasion=evasion;q.defense=7;const s=ready(['meta'],'mohicans');E.togglePerk(s,'meta','mohican-slayer',false);E.togglePerk(s,'meta','metal-storm',true);return run(s,actor);}
 finally{actor.accuracy=before.accuracy;perk.level=before.level;q.evasion=before.evasion;q.defense=before.defense;}
}
test('area double hits remove post-defense halving in place of bonus dice; smash dice still stack',()=>{
 for(const [accuracy,rolls,expected,double,smash,bonus]of [
  [{flat:15,dice:0},[4],5,false,0,0],
  [{flat:20,dice:0},[4],10,true,0,0],
  [{flat:0,dice:1},[6,6,4],7,false,1,1],
  [{flat:4,dice:1},[6,6,4],14,true,1,1]
 ])areaFixture(s=>{const hits=E.click(s,faces(...rolls)).filter(e=>e.type==='attack');assert.equal(hits.length,3);for(const h of hits){assert.equal(h.damage,expected);assert.equal(h.doubleHit,double);assert.equal(h.smashCritical,smash);assert.equal(h.bonusDice,bonus);}},accuracy);
});
test('one area roll applies double-hit relief to each enemy independently; forecasts match exhaustive damage dice',()=>{
 areaFixture((s,actor)=>{
  s.enemies[1].evasionPenalty=6;const projected=E.averageAttackDamage(s,actor);const hits=E.click(s,faces(4)).filter(e=>e.type==='attack');
  assert.deepEqual(hits.map(h=>h.damage),[5,10,5]);assert.deepEqual(hits.map(h=>h.doubleHit),[false,true,false]);
  let mean=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){const d=Math.max(1,a+b+c+5-7);mean+=(2*Math.max(1,Math.floor(d/2))+d)/216;}near(projected,mean);
 },{flat:20,dice:0},{flat:14,dice:0});
});
test('area forecast includes opposed judgments and agrees with sampled combat after the new double-hit rule',()=>{
 areaFixture((s,actor)=>{
  const projected=E.averageAttackDamage(s,actor),random=rng(817);let damage=0;
  for(let i=0;i<5000;i++){for(const e of s.enemies)e.hp=1e8;damage+=E.click(s,random).filter(e=>e.type==='attack').reduce((n,e)=>n+e.damage,0);}
  near(damage/5000,projected,.4);
 },{flat:14,dice:1},{flat:10,dice:1});
});
test('Waku AP reduction repeats at five percent and nextFrame always reapplies without stacking',()=>{
 const s=ready(['waku'],'dementor');enable(s,'waku','expanded-hurtbox','invisible-wall','next-frame');s.enemies[0].hp=1e8;s.hp=1e8;E.selectEnemy(s,s.enemies[0].id);s.enemies[0].actionPoints=200;
 const first=E.click(s,()=>.5).find(e=>e.type==='attack');assert.ok(first.hit);assert.equal(s.enemies[0].actionPoints,190);assert.equal(s.enemies[0].defensePenalty,3);assert.equal(s.enemies[0].evasionFailure,true);
 const second=E.click(s,()=>.5).find(e=>e.type==='attack');assert.equal(second.forcedEvasionFailure,true);assert.equal(s.enemies[0].actionPoints,181);assert.equal(s.enemies[0].defensePenalty,3);assert.equal(s.enemies[0].evasionFailure,true);assert.equal(s.enemies[1].evasionFailure,false);
 E.togglePerk(s,'waku','next-frame',false);E.click(s,()=>.5);assert.equal(s.enemies[0].evasionFailure,false);
 s.questLevels.dementor=1000;E.setQuestLevel(s,'dementor',1000);enable(s,'waku','next-frame','vanishing-hitbox');const enemy=s.enemies[0];enemy.actionPoints=200;E.selectEnemy(s,enemy.id);const miss=E.click(s,()=>.5).find(e=>e.type==='attack');assert.equal(miss.hit,false);assert.equal(enemy.actionPoints,200);assert.equal(enemy.defensePenalty,0);assert.equal(enemy.accuracyPenalty,0);assert.equal(enemy.evasionFailure,false);
});
test('ability cards show updated unlocks and minute pressure without implementation notes',()=>{
 const s=ready(['meta','richter','waku']);s.paused=true;const h=harness(s);
 const html=h.get('character-list').innerHTML;
 assert.match(html,/id="perk-meta-metal-storm"><div><span>Lv.125<\/span><span class="perk-pressure">暴走圧 0.5%\/分/);
 assert.match(html,/GX-BoM/);assert.match(html,/id="perk-waku-next-frame"><div><span>Lv.200<\/span><span class="perk-pressure">暴走圧 1.5%\/分/);
 for(const id of Object.keys(tables))for(const [pid]of tables[id])assert.doesNotMatch(c(id).perks.find(p=>p.id===pid).description,/※|実装|防御計算後|半減ペナルティ/);
});
