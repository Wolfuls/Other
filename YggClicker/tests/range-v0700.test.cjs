'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,enable,roundTrip}=require('./current-fixtures.cjs');
const UI=require('../js/display'),FX=require('../js/combat-effects'),{harness}=require('./app-harness.cjs');
function rearBattle(id){const s=ready([id,'max'],'mohicans');s.formationRows[id]='rear';s.enemies[1].row='rear';s.focusedEnemyId=s.enemies[1].id;return s;}
test('distance matrix collapses only incapacitated fronts, preserving assigned rows',()=>{
 const s=rearBattle('jewel'),front=s.enemies[0],rear=s.enemies[1];
 assert.equal(E.combatDistance(s,'max',front),1);assert.equal(E.combatDistance(s,'max',rear),2);
 assert.equal(E.combatDistance(s,'jewel',front),2);assert.equal(E.combatDistance(s,'jewel',rear),3);
 s.health.max.stunTurns=3;assert.equal(E.combatDistance(s,'jewel',rear),3);
 s.runaway.max.runawayCollapsed=true;assert.equal(E.combatDistance(s,'jewel',rear),2);
 s.enemies[0].hp=s.enemies[2].hp=0;assert.equal(E.combatDistance(s,'jewel',rear),1);
 assert.equal(s.formationRows.jewel,'rear');s.runaway.max.runawayCollapsed=false;assert.equal(E.combatDistance(s,'jewel',rear),2);
});
test('old parties and enemies start front, valid rows persist and invalid rows cannot mutate a party',()=>{
 const s=ready(['meta','jewel']);assert.ok(Object.values(s.formationRows).every(row=>row==='front'));
 assert.ok(s.enemies.every(e=>e.row==='front'));
 assert.ok(E.setFormation(s,s.sessionId,['meta','jewel'],{meta:'front',jewel:'rear'}));
 assert.equal(roundTrip(s).formationRows.jewel,'rear');const before=structuredClone(s);
 assert.equal(E.setFormation(s,s.sessionId,['jewel'],{jewel:'bad'}),false);assert.deepEqual(s,before);
 const doc=JSON.parse(S.encode(s));doc.schemaVersion=47;delete doc.state.formationRows;
 assert.ok(Object.values(S.decode(JSON.stringify(doc)).formationRows).every(row=>row==='front'));
});
test('all declared reach and add-on ranges are independent from ongoing pressure and passive defenses',()=>{
 const s=rearBattle('mitsuru'),c=character('mitsuru');enable(s,c.id,'spark-shot','radioactivity','spaghetti-code');
 const near=E.attackProfile(s,c,false,E.getSession(s),s.enemies[0]),far=E.attackProfile(s,c,false,E.getSession(s),s.enemies[1]);
 assert.equal(near.distance,2);assert.equal(near.apReduction,0);assert.equal(near.ignoreDefense,true);
 assert.equal(far.distance,3);assert.equal(far.reachable,true);assert.equal(far.apReduction,4);assert.equal(far.ignoreDefense,false);assert.equal(far.motion,'spark');
 const pressure=E.runawayPressure(s,c);s.formationRows.mitsuru='front';assert.equal(E.runawayPressure(s,c),pressure);
 E.togglePerk(s,c.id,'spark-shot',false);s.formationRows.mitsuru='rear';assert.equal(E.canReach(s,c,s.enemies[1]),false);
 const j=rearBattle('jewel');enable(j,'jewel','adamant-fist','rainbow-armor');j.rainbowTurns=3;
 assert.equal(E.attackProfile(j,character('jewel')).flat,character('jewel').flat);assert.equal(E.armor(j,character('jewel')),character('jewel').defense+4+15);
});
test('out-of-range automatic actions keep at most one AP threshold, manual attacks cannot bypass range',()=>{
 const s=ready(['jewel','meta'],'scarecrow');s.formationRows.jewel='rear';s.selectedCharacterId='jewel';
 const threshold=E.actionThreshold(s);s.actionPoints.jewel=threshold*10;
 const clicks=s.clicks;assert.deepEqual(E.click(s),[]);assert.equal(s.clicks,clicks);
 const ev=E.advance(s,1,()=>.4);assert.equal(s.actionPoints.jewel,threshold);assert.ok(!ev.some(e=>e.actorId==='jewel'&&e.type==='attack'));
 assert.equal(E.averageAttackDamage(s,character('jewel')),0);
 s.health.meta={hp:-100,status:'dying',regenSeconds:0};const resumed=E.advance(s,1,()=>.4);assert.ok(resumed.some(e=>e.actorId==='jewel'&&e.type==='attack'));
});
test('only Mohicans have range 1, cannot target a screened rear, and do not bank multiple actions',()=>{
 for(const q of D.sessions)assert.deepEqual(q.attackRange,q.id.includes('mohican')?[1,1]:[1,3]);
 const s=ready(['meta','jewel'],'mohicans'),e=s.enemies[0];s.formationRows.jewel='rear';
 assert.deepEqual(E.enemyTargetCandidates(s,e).map(c=>c.id),['meta']);s.enemies[0].row='rear';
 // A lone enemy rear becomes an effective front. A living enemy front screens it.
 s.formationRows.meta='rear';s.levels.max=1;s.formations[s.sessionId].push('max');
 assert.equal(E.enemyCanReach(s,e,character('meta')),false);e.actionPoints=999;E.advance(s,1,()=>.4);assert.ok(e.actionPoints<=E.actionThreshold(s));assert.equal(e.pendingAttack,null);
});
test('queued attacks keep their original target after row edits',()=>{
 const s=ready(['meta','jewel'],'mohican-solo'),e=s.enemies[0];e.actionPoints=E.actionThreshold(s);E.advance(s,1,()=>.4);
 assert.ok(e.pendingAttack);const target=e.pendingAttack.targetId;E.setFormation(s,s.sessionId,['meta','jewel'],{[target]:'rear'});
 assert.equal(e.pendingAttack.targetId,target);const events=E.advance(s,1,()=>.4);assert.ok(events.some(e=>e.type==='enemyAttack'&&e.targetId===target));
});
test('melee and ranged motions and conditional reattacks follow target distance',()=>{
 const s=rearBattle('waku'),c=character('waku');enable(s,'waku','monado-smash','expanded-hurtbox','next-frame');
 const far=E.attackProfile(s,c,false,E.getSession(s),s.enemies[1]);assert.equal(far.motion,'shoot');assert.equal(far.defenseReduction,0);assert.equal(far.ignoreDefense,false);assert.equal(far.evasionFailureChance,0);
 s.formationRows.waku='front';const near=E.attackProfile(s,c,false,E.getSession(s),s.enemies[0]);assert.equal(near.motion,'stab');assert.equal(near.defenseReduction,3);assert.equal(near.ignoreDefense,true);
 const t=ready(['tordeliese']);enable(t,'tordeliese','demonic-hammer');assert.equal(E.attackProfile(t,character('tordeliese')).motion,'kick');
 const m=ready(['meta','max']);enable(m,'meta','spinning-rush');assert.equal(E.attackProfile(m,character('meta')).extraAttackChance,0);m.formationRows.meta='rear';assert.equal(E.attackProfile(m,character('meta')).extraAttackChance,.25);
});
test('layout places rear allies behind front allies, with consistent foot anchors',()=>{
 const base={metaHired:true,jewelHired:true,grounded:true,width:600};const front=UI.orbitLayout(base),rear=UI.orbitLayout({...base,formationRows:{jewel:'rear'}});
 assert.ok(front.meta.x<front.jewel.x);assert.ok(rear.jewel.x<rear.meta.x);assert.equal(front.jewel.y,rear.jewel.y);
});
