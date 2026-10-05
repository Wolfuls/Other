'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),{harness}=require('./app-harness.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function parties(){const s=E.createState(1000);s.levels.meta=50;s.levels.richter=50;s.actionLevels.meta=10;s.actionLevels.richter=13;
 assert.ok(E.setFormation(s,'mohicans',['meta']));assert.ok(E.setFormation(s,'scarecrow',['richter']));return s;}

test('distinct parties advance together with correct target defenses, independent HP, and additive currency',()=>{
 const s=parties(),a=structuredClone(s),b=structuredClone(s);E.setFormation(a,'scarecrow',[]);E.setFormation(b,'mohicans',[]);
 const events=E.advance(s,40,()=>.999);E.advance(a,40,()=>.999);E.advance(b,40,()=>.999);
 assert.ok(events.some(e=>e.sessionId==='mohicans'&&e.actorId==='meta'));
 assert.ok(events.some(e=>e.sessionId==='scarecrow'&&e.actorId==='richter'));
 assert.ok(events.every(e=>e.actorId!=='meta'||e.sessionId==='mohicans'));
 assert.equal(s.kills,a.kills+b.kills);assert.equal(s.earned,a.earned+b.earned);assert.equal(s.factors,a.factors+b.factors);
 assert.equal(s.hp,a.hp);assert.deepEqual(E.battleSnapshot(E.battleContext(s,'scarecrow')),E.battleSnapshot(E.battleContext(b,'scarecrow')));
 near(E.totalDps(s),E.dps(s)+E.dps(E.battleContext(s,'scarecrow')));
 near(E.totalIncome(s).factorsPerSecond,E.expectedIncome(s).factorsPerSecond+E.expectedIncome(E.battleContext(s,'scarecrow')).factorsPerSecond);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('camera switching preserves each enemy, poison, wait and manual target; it never moves a character',()=>{
 const s=parties();E.selectCharacter(s,'meta');s.hp=7;s.poisonDamage=4;
 E.selectSession(s,'scarecrow');E.selectCharacter(s,'richter');E.click(s,()=>.999);
 assert.equal(s.hp,0);assert.equal(s.respawnSeconds,5);const forms=structuredClone(s.formations);
 E.selectSession(s,'mohicans');assert.equal(s.hp,7);assert.equal(s.poisonDamage,4);assert.equal(s.selectedCharacterId,'meta');
 E.selectSession(s,'scarecrow');assert.equal(s.hp,0);assert.equal(s.respawnSeconds,5);assert.equal(s.selectedCharacterId,'richter');assert.deepEqual(s.formations,forms);
 const before=structuredClone(s);assert.equal(E.setFormation(s,'dementor',['meta']),false);assert.deepEqual(s,before);
 assert.ok(E.setFormation(s,'mohicans',[]));assert.ok(E.setFormation(s,'dementor',['meta']));
 assert.deepEqual(E.formationIds(s,'dementor'),['meta']);assert.equal(E.battleContext(s,'mohicans').selectedCharacterId,null);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('single enemies wait five real seconds, ignore input and freeze charge; swarms immediately replace victims',()=>{
 const s=E.createState(1000);E.selectSession(s,'scarecrow');s.hp=1;
 assert.equal(E.click(s,()=>.999).filter(e=>e.type==='clear').length,1);assert.equal(s.respawnSeconds,5);assert.equal(s.hp,0);
 const before=structuredClone(s);for(let n=0;n<100;n++)assert.deepEqual(E.click(s,()=>0),[]);assert.deepEqual(s,before);
 s.levels.meta=1;E.setFormation(s,'scarecrow',['meta']);s.actionPoints.meta=17;
 E.advance(s,4.9,()=>.999);near(s.respawnSeconds,.1);assert.equal(s.hp,0);assert.equal(s.actionPoints.meta,17);assert.equal(s.kills,1);
 assert.deepEqual(S.decode(S.encode(s)),s);
 E.advance(s,.1,()=>.999);assert.equal(s.respawnSeconds,0);assert.equal(s.hp,40);assert.equal(s.actionPoints.meta,17);
 E.advance(s,1,()=>.999);assert.equal(s.actionPoints.meta,67);
 const swarm=E.createState();swarm.hp=1;E.click(swarm,()=>.999);assert.equal(swarm.hp,20);assert.equal(swarm.respawnSeconds,0);
});

test('respawn survives pauses, small-step timing, upgrades and long bounded offline averages',()=>{
 const s=parties();s.actionLevels.richter=1000000;E.selectSession(s,'scarecrow');
 E.selectCharacter(s,'richter');E.click(s,()=>.999);const before=structuredClone(s);s.paused=true;E.advance(s,1000);assert.equal(s.respawnSeconds,before.respawnSeconds);s.paused=false;
 s.factors=100000;assert.ok(E.buyQuest(s,'scarecrow'));assert.equal(s.hp,0);assert.ok(E.sell(s,'quest','scarecrow'));assert.equal(s.hp,0);
 const split=structuredClone(s);E.advance(s,30,()=>.999,false);for(let n=0;n<300;n++)E.advance(split,.1,()=>.999,false);
 assert.equal(s.kills,split.kills);assert.equal(s.hp,split.hp);near(s.respawnSeconds,split.respawnSeconds);assert.equal(s.factors,split.factors);
 const high=E.createState(1000);high.levels.richter=100;high.actionLevels.richter=100000000;
 E.setFormation(high,'mohicans',[]);E.setFormation(high,'scarecrow',['richter']);E.selectSession(high,'scarecrow');
 const started=performance.now();E.advance(high,28800,()=>{throw Error('unbounded random work');},false);
 assert.ok(performance.now()-started<3000);assert.equal(high.kills,4800);assert.equal(high.earned,4800*8);assert.deepEqual(S.decode(S.encode(high)),high);
 near(E.expectedIncome(high).factorsPerSecond,8/6);
});

test('support cannot cross parties, per-session selections persist, and global boost elapses only once',()=>{
 const s=parties();s.levels.max=1;s.actionLevels.max=100;s.purchasedPerks.max=['handout','named-npc'];
 E.setFormation(s,'mohicans',['meta','max']);E.selectCharacter(s,'meta');E.selectSession(s,'scarecrow');E.selectCharacter(s,'richter');
 const r=D.characters.find(c=>c.id==='richter'),m=D.characters.find(c=>c.id==='meta');
 assert.equal(E.actionPower(s,r),100);assert.equal(E.freeActionChance(s,r),0);assert.equal(E.actionPower(E.battleContext(s,'mohicans'),m),120);
 s.boostSeconds=30;const events=E.advance(s,2,()=>.999);assert.equal(s.boostSeconds,28);
 assert.ok(events.some(e=>e.maxTransfers&&e.sessionId==='mohicans'));assert.ok(events.every(e=>!e.maxTransfers||e.sessionId==='mohicans'));
 E.selectSession(s,'mohicans');assert.equal(s.selectedCharacterId,'meta');assert.equal(s.boostSeconds,28);
});

test('schema21 resolves duplicate parties in favor of the visible quest; schema22 rejects duplicate/corrupt battles',()=>{
 const s=parties();s.sessionId='scarecrow';s.hp=21;s.formations={mohicans:['meta','richter'],scarecrow:['richter'],dementor:['meta']};delete s.sessionStates;delete s.respawnSeconds;
 const next=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:21,state:s}));
 assert.deepEqual(next.formations,{scarecrow:['richter'],mohicans:['meta'],dementor:[]});assert.equal(next.hp,21);
 assert.deepEqual(S.decode(S.encode(next)),next);
 for(const invalid of [{...next,formations:{...next.formations,dementor:['meta']}},{...next,hp:0},{...next,respawnSeconds:6},{...next,respawnSeconds:2,hp:3},{...next,sessionStates:{scarecrow:E.battleSnapshot(next)}}])assert.throws(()=>S.encode(invalid));
});

test('UI labels simultaneous quests, blocks assigned members and hides only the waiting target',()=>{
 const s=parties();s.paused=true;E.selectSession(s,'scarecrow');s.hp=0;s.respawnSeconds=3;
 const h=harness(s);assert.equal(h.get('respawn-notice').hidden,false);assert.ok(h.get('arena').classList.contains('is-respawning'));assert.equal(h.get('attack').disabled,true);
 assert.match(h.get('quest-live-mohicans').textContent,/1\/5人/);assert.match(h.get('quest-live-scarecrow').textContent,/再出現まで/);
 assert.match(h.get('income-context').textContent,/2セッション合計/);
 h.get('quest-list').listeners.get('click')({target:{closest:sel=>sel==='[data-formation-open]'?{dataset:{formationOpen:'scarecrow'}}:null}});
 assert.match(h.get('formation-members').innerHTML,/今日も今日とてモヒカン日和に参加中/);
 const before=h.saved();h.get('formation-members').listeners.get('click')({target:{closest:()=>({dataset:{formationMember:'meta'},disabled:false})}});h.click('formation-save');
 assert.deepEqual(h.saved().formations,before.formations);
});
