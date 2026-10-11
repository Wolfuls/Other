const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),F=require('../js/matchup'),N=require('../js/numbers'),{harness}=require('./app-harness.cjs');
const c=id=>D.characters.find(c=>c.id===id);
function ready(q='mohican-solo',ids=['meta']){const s=E.createState();s.factors=1e8;for(const id of ids)s.levels[id]=1;E.refreshQuestUnlocks(s);E.setFormation(s,q,ids);E.selectSession(s,q);E.ensureEnemies(s);return s;}
test('all quests retain HP/reward/action growth and move combat growth to intensity',()=>{
 for(const q of D.sessions.filter(q=>!q.members)){const s=ready(q.id);s.questLevels[q.id]=s.questActiveLevels[q.id]=12;const next=E.getSession(s);
 for(const k of ['attack','accuracy','evasion','ss'])assert.deepEqual(next[k],q[k]);assert.equal(next.strengthLevel,11);
 assert.equal(next.hp,N.floor(q.hp*E.T.enemyDurability(11,'vitality')/100));assert.equal(next.reward,N.floor(q.reward*1.04**11*(1+11/q.rewardTransition)**(q.rewardTransition*Math.log(1.28/1.04))));
 const action=q.actionDice?q.actionDice.flat+3.5*q.actionDice.dice:q.action||0;assert.equal(E.enemyActionPower(s),N.floor(action*(E.T.enemyValue(11)/100)));}
});
test('wiping out enemies clears only that party AP, no banking or manual attacks during respawn',()=>{
 const s=ready('mohican-solo',['meta','richter']);s.levels.vishunal=1;E.setFormation(s,'scarecrow',['vishunal']);s.actionPoints.meta=20;s.actionPoints.richter=15;s.actionPoints.vishunal=9;s.hp=s.enemies[0].hp=1;
 E.click(s,()=>.5);assert.equal(s.actionPoints.meta,0);assert.equal(s.actionPoints.richter,0);assert.equal(s.actionPoints.vishunal,9);
 assert.equal(E.click(s).length,0);E.advance(s,4.5,()=>.5);assert.equal(s.actionPoints.meta,0);assert.equal(s.actionPoints.richter,0);assert.ok(E.isWaiting(s));
 E.advance(s,.5,()=>.5);assert.ok(!E.isWaiting(s));assert.ok(E.click(s,()=>.5).length);
});
test('summons retain creation-damage bases and receive the corresponding check/action growth',()=>{
 const s=ready('ozmorn');s.questLevels.ozmorn=s.questActiveLevels.ozmorn=8;
 const cloud={...s.enemies[1],creationDamage:4,maxHP:4,hp:4},q=E.enemySpec(s,cloud);
 assert.equal(q.accuracy.flat,4);assert.equal(q.accuracy.multiplier,undefined);assert.equal(q.strengthLevel,7);
 assert.equal(E.targetEvasion(E.attackProfile(s,c('meta')),cloud).multiplier,undefined);
 assert.equal(E.enemyActionPower(s,undefined,cloud),N.floor(13.5*(E.T.enemyValue(7)/100)));
});
test('partial swarm defeat preserves ally AP until all slots are gone',()=>{
 const s=ready('mohicans');s.actionPoints.meta=12;s.enemies[0].hp=1;E.selectEnemy(s,s.enemies[0].id);E.click(s,()=>.5);assert.equal(s.actionPoints.meta,12);
 for(const e of s.enemies.filter(e=>e.hp>0)){e.hp=1;E.selectEnemy(s,e.id);E.click(s,()=>.5);}assert.equal(s.actionPoints.meta,0);
});
test('forecast is deterministic, nonmutating and matches opposed probabilities including mental attack',()=>{
 const s=ready('dementor',['meta','max']);s.health.meta.hp=5;s.health.meta.status='unconscious';const before=JSON.stringify(s),report=F.party(s);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(F.party(s).rows,report.rows);
 for(const row of report.rows){const p=E.attackProfile(report.state,c(row.id)),incoming=E.enemyHitProfile(report.state,{},c(row.id));
 assert.ok(Math.abs(row.hitRate-E.opposedHitChance(p.accuracy,p.evasion))<.02);
 assert.ok(Math.abs(row.evadeRate-(1-E.opposedHitChance(incoming.accuracySpec,incoming.evasionDice)))<.02);
 assert.ok(row.damageOnHit>0);assert.ok(row.endurance>=1);}
 const max=E.attackProfile(report.state,c('max'));assert.equal(max.evasion.flat,E.getSession(s).ss.flat);
});
test('draft concentration and level-correct enemy stats affect forecasts, passive enemies have no endurance threat',()=>{
 const s=ready();s.levels.meta=11;const first=F.party(s).rows[0];E.setConcentration(s,'meta',{...s.concentration.meta,armor:5,evasion:5});const buffed=F.party(s).rows[0];assert.ok(buffed.evadeRate>first.evadeRate);assert.ok(buffed.endurance>first.endurance);
 s.questLevels[s.sessionId]=s.questActiveLevels[s.sessionId]=20;assert.ok(F.party(s).rows[0].hitRate<buffed.hitRate);
 const passive=F.party(ready('scarecrow')).rows[0];assert.equal(passive.passive,true);assert.equal(passive.endurance,Infinity);
});
test('expected stat values include exploding/fumbling dice and per-roll rounding',()=>{
 assert.ok(Math.abs(F.expectedRoll({flat:10,dice:1})-(13+37/60))<1e-5);
 assert.equal(F.expectedRoll({flat:3,dice:3,sides:4},false),10.5);
 assert.equal(F.expectedRoll({flat:10,dice:0,multiplier:1.05}),11);
});
test('lethal enemy sprite stays present in flight, then swaps to a defeat snapshot',()=>{
 const s=ready();s.enemies[0].hp=s.hp=1;s.actionPoints.meta=0;E.selectCharacter(s,'meta');
 const h=harness(s,undefined,{combatRandom:()=>.5});h.click('attack');
 assert.equal(h.get('enemy-art').classList.contains('enemy-absent'),false);assert.equal(h.get('enemy-defeats').children.length,0);
 h.advance(180);assert.equal(h.get('enemy-art').classList.contains('enemy-absent'),false);
 h.advance(500);assert.equal(h.get('enemy-art').classList.contains('enemy-absent'),true);assert.ok(h.get('enemy-defeats').children.some(n=>n.classList.contains('enemy-defeat')));
});
test('enemy information opens separately and formation edits preview unsaved allocations',()=>{
 const s=ready();s.paused=true;const h=harness(s);const click=data=>h.get('quest-list').listeners.get('click')({target:{closest:sel=>sel===data.selector?{dataset:data.dataset,setAttribute(){}}:null}});
 click({selector:'[data-enemy-info]',dataset:{enemyInfo:s.sessionId}});click({selector:'[data-enemy-info]',dataset:{enemyInfo:s.sessionId}});
 assert.equal(h.get('enemy-info-dialog').open,true);
 assert.ok(h.get('enemy-info-content').innerHTML.includes('命中率'));
 h.click('enemy-info-close');assert.equal(h.get('enemy-info-dialog').open,false);
 click({selector:'[data-formation-open]',dataset:{formationOpen:s.sessionId}});
 assert.match(h.get('formation-enemy-info').innerHTML,/命中率/);assert.equal(h.saved().concentration.meta.evasion,0);assert.equal(h.get('formation-concentration').innerHTML,'');
});
