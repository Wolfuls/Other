'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip,enable,faces}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
const FX=require('../js/combat-effects');
function fight(){const s=ready(['mitsuru','meta'],'mohican-solo');s.questLevels['mohican-solo']=200;s.questActiveLevels['mohican-solo']=200;s.enemies=null;s.hp=E.getSession(s).hp;E.ensureEnemies(s);return s;}
test('Mitsuru base stats, price order, recovery activation with normal pressure, and seven perk unlocks',()=>{
 const c=character('mitsuru');assert.equal(c.cost,100);assert.equal(c.powerCost,20);assert.deepEqual([c.action,c.maxHP,c.defense,c.resistance,c.dice,c.flat],[9,32,7,1,4,1]);assert.equal(c.activationType,'recovery');assert.equal(c.baseRunawayPressure,.02);assert.equal(D.characters[1].id,'mitsuru');
 const s=ready(['mitsuru'],'mohican-solo');s.levels.mitsuru=150;for(const p of c.perks)E.togglePerk(s,c.id,p.id,true);
 assert.equal(E.armor(s,c),17);assert.deepEqual(E.stats(s,c),{dice:8,flat:2});assert.equal(E.accuracySpec(s,c).flat,26);assert.ok(E.attackProfile(s,c).ignoreDefense);assert.ok(Math.abs(E.runawayPressureBreakdown(s,c).perkPressure*60-3.9)<1e-10);
});
test('wire and spark apply only on hit, repeat without stacking taunts, and clamp AP at zero',()=>{
 const s=fight();E.selectSession(s,'mohicans');E.setFormation(s,'mohicans',['mitsuru','meta']);s.questLevels.mohicans=200;s.questActiveLevels.mohicans=200;s.enemies=null;s.hp=E.getSession(s).hp;E.ensureEnemies(s);s.selectedCharacterId='mitsuru';enable(s,'mitsuru','spark-shot');const enemy=s.enemies[0];enemy.actionPoints=13;
 // Spark Shot now applies only at distance 3; retain a living front enemy and ally.
 enemy.row='rear';s.formationRows.mitsuru='rear';s.focusedEnemyId=enemy.id;
 const missed=E.click(s,()=>.4);assert.equal(missed[0].hit,false);assert.equal(enemy.tauntId,null);assert.equal(enemy.actionPoints,13);
 // A failed evasion forces a hit even against a stronger enemy.
 enemy.evasionFailure=true;E.click(s,()=>.4);assert.equal(enemy.tauntId,'mitsuru');assert.equal(enemy.actionPoints,9);
 for(let i=0;i<3;i++){enemy.evasionFailure=true;E.click(s,()=>.4);}assert.equal(enemy.actionPoints,0);assert.equal(enemy.tauntId,'mitsuru');
 assert.equal(E.combatDistance(s,'mitsuru',enemy),3);
});
test('taunt is consumed by the next attack; unavailable targets fall back to a living ally',()=>{
 for(const down of [false,true]){const s=fight(),enemy=s.enemies[0];enemy.tauntId='mitsuru';enemy.actionPoints=E.actionThreshold(s)*2;if(down)s.health.mitsuru={hp:-1,status:'dying',regenSeconds:0};
  const events=E.advance(s,1,()=>.4);const attack=events.find(e=>e.type==='enemyWindup');assert.equal(attack.targetId,down?'meta':'mitsuru');assert.equal(enemy.tauntId,null);
 }
});
test('being hit slows only the attacker for five seconds, refreshing without stacking and surviving save',()=>{
 const s=fight();enable(s,'mitsuru','spaghetti-code');const e=s.enemies[0],base=E.enemyActionPower(s,10,e);s.health.mitsuru.hp=E.maxHP(s,character('mitsuru'));
 e.pendingAttack={targetId:'mitsuru',remaining:.1,count:1,kind:'attack',profile:{accuracySpec:{flat:100,dice:0},evasionDice:{flat:0,dice:0},attack:{dice:0,flat:1},reduction:0,shield:0,hitLogRatio:0,damageLogRatio:0,damageScaleLog:0}};
 E.advance(s,.1,()=>.4);assert.equal(e.slowSeconds,5);assert.equal(e.actionPenalty,4);assert.ok(E.enemyActionPower(s,10,e)<base);
 const loaded=roundTrip(s);assert.equal(loaded.enemies[0].slowSeconds,5);
 for(const id of ['mitsuru','meta'])s.health[id]={hp:-100,status:'dying',regenSeconds:0};E.advance(s,4.9,()=>.4);assert.ok(e.slowSeconds>0);E.advance(s,.1,()=>.4);assert.equal(e.slowSeconds,0);assert.equal(e.actionPenalty,0);assert.equal(E.enemyActionPower(s,10,e),base);
});
test('Mitsuru joins UI, selecting downed actor opens revival and rapid attacks enter the shared bounded playback',()=>{
 const s=ready(['mitsuru']);s.paused=true;const h=harness(s);assert.equal(h.get('mitsuru-combatant').hidden,false);assert.equal(h.get('picker-name-mitsuru').textContent,'ミツル');
 const down=ready(['mitsuru']);down.paused=true;down.health.mitsuru={hp:-2,status:'dying',regenSeconds:0};const d=harness(down);d.click('mitsuru-select');assert.equal(d.get('revive-dialog').open,true);
 const frames=FX.plan([{type:'attack',actorId:'mitsuru',count:4,damage:40,hpBefore:100,hpAfter:60}]);assert.equal(frames.reduce((n,f)=>n+f.mitsuruAttacks,0),4);assert.ok(frames.every(f=>f.volleyMitsuruCount===4));
});
test('taunt controls only one attack in a multi-action enemy volley and survives saving its windup',()=>{
 const s=ready(['mitsuru','meta'],'mohican-solo'),e=s.enemies[0];s.actionPoints.mitsuru=s.actionPoints.meta=0;e.actionPoints=E.actionThreshold(s)*3;e.tauntId='mitsuru';
 E.advance(s,1,()=>.4);assert.equal(e.pendingAttack.taunted,true);assert.equal(roundTrip(s).enemies[0].pendingAttack.taunted,true);
 // Isolate targeting from combat randomness; both party members stay alive.
 e.pendingAttack.profile={accuracySpec:{flat:-100,dice:0},evasionDice:{flat:100,dice:0},attack:{dice:0,flat:1},reduction:0,shield:0,hitLogRatio:0,damageLogRatio:0,damageScaleLog:0};
 const events=E.advance(s,.95,()=>.8).filter(x=>x.type==='enemyAttack');assert.equal(events[0].targetId,'mitsuru');assert.ok(events.slice(1).some(x=>x.targetId==='meta'));assert.equal(e.tauntId,null);
});
test('timed slow is local to its individual/session and clears on quest-level changes',()=>{
 const s=ready(['mitsuru'],'mohicans');s.enemies[1].slowSeconds=5;s.enemies[1].actionPenalty=4;s.enemies[1].tauntId='mitsuru';
 assert.ok(E.enemyActionPower(s,10,s.enemies[1])<E.enemyActionPower(s,10,s.enemies[0]));s.levels.meta=1;E.setFormation(s,'dementor',['meta']);E.selectSession(s,'dementor');E.advance(s,.5,()=>.4);
 const other=E.battleContext(s,'mohicans');assert.equal(other.enemies[1].slowSeconds,4.5);assert.equal(s.enemies[0].slowSeconds,0);
 s.questLevels.mohicans=2;E.setQuestLevel(s,'mohicans',2);assert.ok(E.battleContext(s,'mohicans').enemies.every(e=>!e.tauntId&&!e.slowSeconds&&!e.actionPenalty));
});
