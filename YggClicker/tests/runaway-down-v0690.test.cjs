const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,enable,character,roundTrip}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs'),FX=require('../js/combat-effects');
function collapse(s,id){s.runaway[id].runawayRate=149;s.runaway[id].criticalReserve=0;const events=[];E.changeRunaway(s,id,1,()=>.6,events);return events;}

test('150% keeps party, selected attacker and HP; stops actions, auras and pending targeting',()=>{
 const s=ready(['megumin']);enable(s,'megumin','laws-of-heaven');s.health.megumin.magicLevel=3;s.health.megumin.blastTurns=1;s.health.megumin.blastEvasion=15;
 const hp=s.health.megumin.hp,enemy=s.enemies[0];s.actionPoints.megumin=50;enemy.actionPoints=40;
 enemy.pendingAttack={targetId:'megumin',remaining:.5,count:1,profile:E.enemyHitProfile(s,enemy,character('megumin'))};
 const events=collapse(s,'megumin');
 assert.deepEqual(E.formationIds(s),['megumin']);assert.equal(E.formationOwner(s,'megumin'),'scarecrow');assert.equal(s.selectedCharacterId,'megumin');
 assert.equal(s.health.megumin.hp,hp);assert.equal(s.health.megumin.status,'active');assert.equal(s.actionPoints.megumin,0);
 assert.equal(s.health.megumin.magicLevel,undefined);assert.equal(s.health.megumin.blastEvasion,undefined);
 assert.equal(E.canAct(s,'megumin'),false);assert.deepEqual(E.click(s),[]);assert.equal(E.activeCharacters(s).length,0);
 assert.equal(E.perks(s,character('megumin')).some(p=>p.unlocked),false);
 assert.equal(enemy.pendingAttack,null);assert.equal(enemy.actionPoints,0);assert.ok(events.some(e=>e.type==='enemyCancel'));
 assert.equal(E.advance(s,2,()=>.6).some(e=>e.type==='attack'||e.type==='enemyAttack'),false);
});

test('suppression includes special down, below100 resumes in-place, full HP alone does not',()=>{
 const s=ready(['meta']);collapse(s,'meta');const original=[...E.formationIds(s)];
 s.health.meta.hp=E.maxHP(s,character('meta'))-1;E.advance(s,6,()=>.6);
 assert.equal(s.health.meta.hp,E.maxHP(s,character('meta')));assert.equal(E.canAct(s,'meta'),false);
 assert.deepEqual(E.suppressionQuote(s).targets,['meta']);
 for(let i=0;i<5;i++)assert.equal(E.suppressRunaway(s),true);
 assert.equal(s.runaway.meta.runawayRate,100);assert.equal(E.canAct(s,'meta'),false);
 assert.equal(E.suppressRunaway(s),true);assert.equal(s.runaway.meta.runawayRate,90);assert.equal(E.canAct(s,'meta'),true);
 assert.deepEqual(E.formationIds(s),original);assert.equal(s.selectedCharacterId,'meta');
 assert.ok(E.click(s,()=>.4).some(e=>e.type==='attack'&&e.actorId==='meta'));
});

test('HP incapacity is independent: burst heals HP but does not erase runaway down',()=>{
 const s=ready(['meta']);collapse(s,'meta');s.health.meta.hp=1;s.health.meta.status='unconscious';
 assert.equal(E.revive(s,'meta'),true);assert.equal(s.health.meta.hp,E.maxHP(s,character('meta')));assert.equal(E.canAct(s,'meta'),false);
 s.health.meta.hp=1;s.health.meta.status='unconscious';E.changeRunaway(s,'meta',-51);
 assert.equal(s.runaway.meta.runawayCollapsed,false);assert.equal(E.canAct(s,'meta'),false);assert.equal(E.revive(s,'meta'),true);assert.equal(E.canAct(s,'meta'),true);
});

test('off-screen collapse survives saves and quests; party can be edited during special down',()=>{
 const s=ready(['meta']);s.levels.jewel=1;E.setFormation(s,'mohican-solo',['jewel']);
 const ctx=E.battleContext(s,'mohican-solo');E.ensureEnemies(ctx);ctx.selectedCharacterId='jewel';ctx.enemies[0].pendingAttack={targetId:'jewel',remaining:.5,count:1,profile:E.enemyHitProfile(ctx,ctx.enemies[0],character('jewel'))};s.sessionStates['mohican-solo']=E.battleSnapshot(ctx);
 collapse(s,'jewel');assert.equal(s.sessionStates['mohican-solo'].enemies[0].pendingAttack,null);
 const loaded=roundTrip(s);assert.equal(E.formationOwner(loaded,'jewel'),'mohican-solo');assert.equal(loaded.runaway.jewel.runawayCollapsed,true);
 assert.equal(E.jewelEligible(loaded),false);E.selectSession(loaded,'mohican-solo');assert.equal(loaded.selectedCharacterId,'jewel');
 assert.equal(E.setFormation(loaded,'scarecrow',['meta','jewel']),true);assert.equal(E.formationOwner(loaded,'jewel'),'scarecrow');
 E.selectSession(loaded,'scarecrow');assert.equal(E.canAct(loaded,'jewel'),false);
 E.changeRunaway(loaded,'jewel',-51);assert.equal(E.canAct(loaded,'jewel'),true);
});

test('automatic off-screen 150 crossing keeps party and receives stabilization while down',()=>{
 const s=ready(['meta']);s.levels.jewel=1;E.setFormation(s,'mohican-solo',['jewel']);s.runaway.jewel.runawayRate=149.9;s.runaway.jewel.baseRunawayPressure=.5;
 E.advance(s,1,()=>.6,true,true);assert.equal(s.runaway.jewel.runawayCollapsed,true);assert.deepEqual(E.formationIds(s,'mohican-solo'),['jewel']);
 s.upgrades.stabilization=60;const before=s.runaway.jewel.runawayRate;E.advance(s,2,()=>.6,true,true);
 assert.ok(s.runaway.jewel.runawayRate<before);assert.equal(E.formationOwner(s,'jewel'),'mohican-solo');
});

test('UI displays a deployed down sprite, actual HP, recovery reason and suppression; no revival for healthy special down',()=>{
 const s=ready(['jewel']);collapse(s,'jewel');s.paused=true;const h=harness(s);
 assert.equal(h.get('jewel-combatant').hidden,false);assert.ok(h.get('jewel-combatant').classList.contains('downed'));
 assert.match(h.get('ally-status-jewel').textContent,/暴走ダウン/);assert.equal(h.get('ally-hp-jewel').hidden,false);
 assert.match(h.get('picker-runaway-jewel').textContent,/暴走ダウン/);assert.match(h.get('health-jewel').textContent,/100%未満で復帰/);
 assert.equal(h.get('revive-jewel').hidden,true);assert.equal(h.get('suppress-jewel').disabled,false);assert.equal(h.get('suppress-all').disabled,false);
 h.click('jewel-select');assert.ok(!h.get('revive-dialog').open);assert.equal(h.saved().selectedCharacterId,'jewel');
 h.click('pause');assert.equal(h.get('attack').disabled,true);
});

test('explosion grounding moves 40 world pixels lower without changing magic scale',()=>{
 for(const height of [120,224,480])assert.equal(FX.meguminExplosionY(150,height),150+height*.42+40);
 const s=ready(['megumin']);s.enemies[0].evasionFailure=true;s.forecast=true;const h=harness(s,undefined,{combatRandom:()=>.4});h.click('attack');h.advance(800);
 const blast=h.get('explosions').children.find(e=>e.classList.contains('megumin-explosion'));assert.ok(blast);
 // The app harness's shared combat geometry anchors the enemy at offsetTop=150.
 assert.equal(blast.style.top,FX.meguminExplosionY(150,224)+'px');assert.equal(blast.style.getPropertyValue('--explosion-size'),'600px');
});
