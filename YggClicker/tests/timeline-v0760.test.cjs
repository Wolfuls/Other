'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,rng,enable,roundTrip}=require('./current-fixtures.cjs');
const R=require('../js/recovery');
function force(s,key){s.timeline.busySeconds=0;s.timeline.priorities={[key]:2*E.timelineUnits(s).reduce((n,u)=>n+u.weight,0)};}
function durable(s){s.upgrades.stabilization=18;for(const id of E.formationIds(s)){s.levels[id]=260;s.health[id].hp=E.maxHP(s,character(id));}return s;}
test('SWRR matches the reference algorithm, stable ties and 30:15:15 exactly',()=>{
 const units=[30,15,15].map((weight,i)=>({key:String(i),weight})),p={},raw=[0,0,0],counts=[0,0,0];
 for(let tick=0;tick<8000;tick++){raw.forEach((_,i)=>raw[i]+=units[i].weight);const pick=raw.indexOf(Math.max(...raw));raw[pick]-=60;const u=E.smoothTurn(units,p);assert.equal(+u.key,pick);counts[pick]++;}assert.deepEqual(counts,[4000,2000,2000]);
});
test('weights sanitize extreme values without overflow; finite low weights eventually win',()=>{
 assert.equal(E.actionWeight(Infinity),1e100);assert.equal(E.actionWeight(NaN),0);assert.equal(E.actionWeight(-1),0);
 const p={},units=[{key:'fast',weight:1e100},{key:'slow',weight:1e98}];let slow=0;
 for(let i=0;i<10100;i++){if(E.smoothTurn(units,p).key==='slow')slow++;assert.ok(Object.values(p).every(Number.isFinite));}assert.equal(slow,100);
});
test('extreme trained action and legacy AP cannot bypass attack animation barriers',()=>{
 const s=durable(ready(['meta'],'scarecrow'));s.levels.meta=1e9;s.concentration.meta.action=1e8;s.actionPoints.meta=1e100;s.enemies[0].hp=1e100;
 for(let i=0;i<100;i++){const ev=E.advance(s,.1,()=>.4);assert.ok(ev.filter(e=>e.type==='timelineTurn').length<=1);}assert.ok(s.timeline.turns>0&&s.timeline.turns<=10);
});
test('preview is bounded, deterministic and cannot mutate scores, RNG, health or charge',()=>{
 const s=ready(['megumin','max'],'ozmorn');E.advance(s,1,rng(11));const before=structuredClone(s);const a=E.timelineView(s,1000),b=E.timelineView(s,1000);assert.deepEqual(a,b);assert.equal(a.order.length,10);assert.deepEqual(s,before);assert.ok(Math.abs(a.units.reduce((n,u)=>n+u.share,0)-1)<1e-12);
});
test('stun uses only won own turns; manual attacks do not clear it or alter scores',()=>{
 const s=ready(['meta','richter']);s.health.meta.stunTurns=3;force(s,'a:richter');E.advance(s,1,()=>.4);assert.equal(s.health.meta.stunTurns,3);
 force(s,'a:meta');const events=E.advance(s,.01,()=>.4);assert.equal(s.health.meta.stunTurns,2);assert.equal(events.filter(e=>e.type==='timelineTurn').length,1);
 const before=structuredClone(s.timeline);E.click(s,()=>.4);assert.deepEqual(s.timeline.priorities,before.priorities);assert.equal(s.timeline.turns,before.turns);assert.equal(s.health.meta.stunTurns,2);
});
test('manual nonlethal attack neither advances nor resets the automatic timeline',()=>{
 const s=ready(['meta'],'scarecrow');s.timeline.priorities['a:meta']=-3;s.enemies[0].hp=1e6;const before=structuredClone(s.timeline);E.click(s,()=>.4);assert.deepEqual(s.timeline.priorities,before.priorities);assert.equal(s.timeline.turns,before.turns);
});
test('Max replaces one win with one recipient action even with free-action perks',()=>{
 const s=ready(['max','meta']);enable(s,'max','named-npc');s.selectedCharacterId='meta';s.enemies[0].hp=1e100;force(s,'a:max');const ev=E.advance(s,1,rng(771));assert.equal(ev.filter(e=>e.type==='timelineTurn').length,1);assert.equal(ev.filter(e=>e.delegatedBy==='max').length,1);assert.equal(s.timeline.turns,1);
});
test('free actions and recursive attacks are strictly bounded inside one win',()=>{
 const s=ready(['max','richter']);enable(s,'max','named-npc');enable(s,'richter','gx-bom');s.perkEnabled.richter['z-bom']=false;s.selectedCharacterId='richter';s.enemies[0].hp=1e100;force(s,'a:richter');
 const c=character('richter'),q=D.sessions.find(q=>q.id==='scarecrow'),before=[c.accuracy,q.evasion];
 try{c.accuracy={flat:100,dice:0};q.evasion={flat:0,dice:0};const ev=E.advance(s,1,()=>1-Number.EPSILON);assert.equal(ev.filter(e=>e.type==='timelineTurn').length,1);assert.equal(ev.filter(e=>e.type==='attack').length,E.MAX_TURN_ACTIONS*E.MAX_CHAIN_HITS);}finally{[c.accuracy,q.evasion]=before;}
});test('action slow is nonstacking, duration bounded, ignores down targets and expires in rest',()=>{
 const s=ready(['meta']),h=s.health.meta;E.slowAction(h,1e100,20);assert.equal(h.turnSlowRate,.5);E.slowAction(h,1,20);assert.equal(h.turnSlowRate,.5);assert.equal(h.turnSlowSeconds,5);
 s.autoRest[s.sessionId].remaining=10;E.advance(s,5,()=>.4);assert.equal(h.turnSlowSeconds,0);assert.equal(h.turnSlowRate,0);assert.equal(s.timeline.turns,0);h.status='dying';assert.equal(E.slowAction(h,100,20),0);
});
test('pending attacks do not draw another turn; old count banks resolve only once',()=>{
 const s=ready(['meta'],'mohicans'),e=s.enemies[0];e.pendingAttack={targetId:'meta',remaining:.1,count:1e100,profile:{accuracySpec:{flat:-100,dice:0},evasionDice:{flat:100,dice:0},attack:{dice:0,flat:1},reduction:0,shield:0,hitLogRatio:0,damageLogRatio:0,damageScaleLog:0}};
 assert.ok(!E.timelineUnits(s).some(u=>u.key==='e:'+e.id));const ev=E.advance(s,.1,()=>.4);assert.equal(ev.filter(e=>e.type==='enemyAttack').length,1);assert.equal(s.timeline.turns,0);
});
test('deaths remove credits; revived characters rejoin with zero priority',()=>{
 const s=ready(['meta','richter']);s.timeline.priorities['a:meta']=100;s.health.meta.status='dying';s.health.meta.hp=-1;E.normalizeEnemyActions(s);assert.equal(s.timeline.priorities['a:meta'],undefined);s.health.meta.status='active';s.health.meta.hp=20;assert.ok(E.timelineUnits(s).some(u=>u.key==='a:meta'));assert.equal(s.timeline.priorities['a:meta'],undefined);
});
test('Q edits preserve ally priorities and stun while clearing replaced enemy credits',()=>{
 const s=ready(['meta'],'mohicans');s.timeline.priorities={'a:meta':-9,['e:'+s.enemies[0].id]:12};s.health.meta.stunTurns=2;s.questLevels.mohicans=2;E.setQuestLevel(s,'mohicans',2);assert.equal(s.timeline.priorities['a:meta'],-9);assert.equal(Object.keys(s.timeline.priorities).length,1);assert.equal(s.health.meta.stunTurns,2);
});
test('independent quests advance while offscreen, with at most one win each per second',()=>{
 const s=ready(['meta'],'scarecrow');s.levels.richter=1;E.setFormation(s,'mohicans',['richter']);const ev=E.advance(s,1,()=>.4).filter(e=>e.type==='timelineTurn');assert.deepEqual(ev.map(e=>e.sessionId).sort(),['mohicans','scarecrow']);assert.equal(s.timeline.turns,1);assert.equal(s.sessionStates.mohicans.timeline.turns,1);E.selectSession(s,'mohicans');assert.equal(s.timeline.turns,1);
});
test('schema52 AP migrates to zero; new per-quest priorities round-trip without aliasing',()=>{
 const s=ready(['meta'],'mohicans');s.levels.richter=1;E.setFormation(s,'scarecrow',['richter']);s.actionPoints.meta=1e90;s.enemies[0].actionPoints=1e90;
 const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:52,state:s}));assert.deepEqual(migrated.timeline,E.newTimeline());assert.equal(migrated.actionPoints.meta,0);assert.equal(migrated.enemies[0].actionPoints,0);assert.deepEqual(migrated.sessionStates.scarecrow.timeline,E.newTimeline());
 E.advance(migrated,1,()=>.4);const loaded=roundTrip(migrated);assert.deepEqual(loaded.timeline,migrated.timeline);assert.deepEqual(loaded.sessionStates.scarecrow.timeline,migrated.sessionStates.scarecrow.timeline);assert.notEqual(loaded.timeline.priorities,loaded.sessionStates.scarecrow.timeline.priorities);
});
test('8h offline continuation matches sync exactly and never exceeds 28800 wins per quest',async()=>{
 const s=durable(ready(['meta','megumin'],'mohicans'));s.levels.queen=260;E.setFormation(s,'ozmorn',['queen']);s.actionClock=.37;s.health.megumin.stunTurns=5;s.autoRest.mohicans={...E.newAutoRest(),enabled:true,minutes:1,restMinutes:1};
 const a=structuredClone(s),b=structuredClone(s);let na=0,nb=0;const ra=R.seeded(431),rb=R.seeded(431);E.advance(a,28800,()=>{na++;return ra();},false,true);let yields=0;
 await R.runLocal(E,b,28800,{random:()=>{nb++;return rb();},budget:3,schedule:fn=>{yields++;setImmediate(fn);}});assert.deepEqual(b,a);assert.equal(na,nb);assert.ok(yields>1);for(const q of D.sessions)assert.ok(E.battleContext(b,q.id).timeline.turns<=28800);assert.ok(Math.abs(b.actionClock-.37)<1e-9);
});

test('compressed action-debuff effects show a maximum percentage rather than a sum',()=>{const FX=require('../js/combat-effects'),frames=FX.plan(Array.from({length:200},()=>({type:'attack',actorId:'queen',apDamage:true,actionSlow:true,damage:50,hit:true})));assert.ok(frames.every(f=>f.damage<=50));});

test('fractional live ticks expire slow at exactly five seconds',()=>{const s=ready(['meta']);s.autoRest[s.sessionId].remaining=10;E.slowAction(s.health.meta,20,20);for(let i=0;i<50;i++)E.advance(s,.1,()=>.4);assert.equal(s.health.meta.turnSlowSeconds,0);assert.equal(s.health.meta.turnSlowRate,0);});
test('DPS theoretical shares invalidate for pending attacks and action debuffs',()=>{const s=ready(['meta'],'mohican-solo'),before=E.totalDps(s);s.enemies[0].pendingAttack={targetId:'meta',remaining:1};const waiting=E.totalDps(s);assert.ok(waiting>before);s.enemies[0].pendingAttack=null;E.slowAction(s.health.meta,20,20);const slow=E.totalDps(s);assert.ok(slow<before);assert.equal(slow,E.characterDps(s,character('meta')));});

test('theory and interception weight lookup never draw ambient random dice with Max support',()=>{const s=ready(['max','meta'],'mohicans');enable(s,'max','plot-armor');const original=Math.random;try{Math.random=()=>{throw Error('unseeded random');};assert.doesNotThrow(()=>E.timelineView(s,8));E.advance(s,30,rng(642));}finally{Math.random=original;}});
