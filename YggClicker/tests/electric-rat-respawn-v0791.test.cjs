const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,rng,roundTrip}=require('./current-fixtures.cjs');
test('each electric rat slot pays its own reward and respawns while the others remain alive',()=>{
 for(const slot of [0,1,2]){const s=ready([],'electric-rat'),before=s.factors,e=s.enemies[slot],oldId=e.id,others=s.enemies.filter(x=>x!==e).map(x=>({...x}));e.hp=1;E.selectEnemy(s,e.id);const events=E.click(s,()=>.5);assert.equal(events.filter(e=>e.type==='clear').length,1);assert.equal(s.factors-before,slot===0?12:8);assert.equal(s.kills,1);assert.equal(e.hp,0);assert.ok(e.respawnSeconds>0);assert.deepEqual(s.enemies.filter(x=>x!==e),others);
 const restored=roundTrip(s);E.advance(restored,E.respawnDelay(restored)+.01,rng());assert.equal(restored.enemies[slot].hp,slot===0?25:15);assert.notEqual(restored.enemies[slot].id,oldId);assert.deepEqual(restored.enemies.filter((_,i)=>i!==slot),others);assert.equal(restored.kills,1);assert.doesNotThrow(()=>roundTrip(restored));}
});
test('individual rewards retain quest growth, upgrades and sin multiplier',()=>{
 const s=ready([],'electric-rat');s.questLevels['electric-rat']=s.questActiveLevels['electric-rat']=10;s.enemies=null;E.ensureEnemies(s);s.upgrades.reward=2;s.sinTotal=50;s.seedLevels.greed=0;
 for(const slot of [0,1]){const e=s.enemies[slot],spec=E.enemySpec(s,e),expected=E.incomeAmount(s,E.reward(s,spec)),before=s.factors;e.hp=1;E.selectEnemy(s,e.id);E.click(s,()=>.5);assert.equal(s.factors-before,expected);}
});
test('partial independent respawn progresses offscreen and survives current saves',()=>{
 const s=ready([],'electric-rat');s.enemies[1].hp=1;E.selectEnemy(s,s.enemies[1].id);E.click(s,()=>.5);const oldId=s.enemies[1].id;E.selectSession(s,'scarecrow');const restored=roundTrip(s);E.advance(restored,E.respawnDelay(restored)+.01,rng());const battle=restored.sessionStates['electric-rat'];assert.equal(battle.enemies[1].hp,15);assert.notEqual(battle.enemies[1].id,oldId);assert.equal(S.VERSION,64);assert.doesNotThrow(()=>roundTrip(restored));
});
test('ordinary duo still waits for all members and awards one group reward',()=>{
 const s=ready([],'egg-or-chicken'),before=s.factors,e=s.enemies[0];e.hp=1;E.selectEnemy(s,e.id);E.click(s,()=>.5);E.advance(s,3,rng());assert.equal(e.hp,0);assert.equal(s.kills,0);assert.equal(s.factors,before);
});

