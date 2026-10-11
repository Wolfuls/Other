'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character:c,rng,roundTrip}=require('./current-fixtures.cjs');
const N=require('../js/numbers'),F=require('../js/matchup'),{harness}=require('./app-harness.cjs');
const stat=x=>100*1.012**x*(1+x/100)**(100*Math.log(1.025/1.012));
const prize=(base,x,transition=100)=>base*1.04**x*(1+x/transition)**(transition*Math.log(1.28/1.04));
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('all enemy strengths, HP, action and rewards follow the supplied curves at Q-1',()=>{
 for(const base of D.sessions.filter(q=>!q.members))for(const level of [1,2,10,25,100,101,500,1000]){
  const q=E.sessionAtLevel(base,level),x=level-1;
  near(q.strength,stat(x));near(q.hpStrength,E.T.enemyDurability(x,'vitality'));near(q.actionMultiplier,stat(x)/100);
  near(q.hp,N.floor(base.hp*E.T.enemyDurability(x,'vitality')/100));near(q.reward,N.floor(prize(base.reward,x,base.rewardTransition)));
  for(const key of ['attack','accuracy','evasion','ss','defense','resistance'])assert.deepEqual(q[key],base[key]??0);
  if(level===1){assert.equal(q.strength,100);assert.equal(q.hp,base.hp);assert.equal(q.reward,base.reward);}
 }
 const s=ready(['meta'],'scarecrow');s.questLevels.scarecrow=s.questActiveLevels.scarecrow=1000;
 assert.equal(E.enemyActionPower(s),0);
});

test('growth gradually eases, stays monotone and caps finite values at extreme levels',()=>{
 for(const curve of [D.questGrowth.enemyCurve,D.questGrowth.rewardCurve]){
  let previous=curve.initial;
  for(const x of [0,1,10,100,1000,10000]){
   const ratio=Math.exp(N.curveLog(x+1,curve)-N.curveLog(x,curve));
   assert.ok(ratio>curve.terminal&&ratio<previous);previous=ratio;
  }
 }
 for(const q of D.sessions.filter(q=>!q.members))for(const level of [10000,1e6,Number.MAX_SAFE_INTEGER]){
  const grown=E.sessionAtLevel(q,level);
  for(const key of ['strength','hpStrength','actionMultiplier','hp','reward'])assert.ok(Number.isFinite(grown[key])&&grown[key]>0&&grown[key]<=1e100,key);
 }
});

test('battle profiles and matchup estimates share current enemy strengths in both directions',()=>{
 const s=ready(['meta'],'mohican-solo');s.levels.meta=51;s.questLevels[s.sessionId]=101;E.setQuestLevel(s,s.sessionId,101);
 const a=E.strengthValue(s,c('meta'),'power'),enemy=stat(100),p=E.attackProfile(s,c('meta')),incoming=E.enemyHitProfile(s,s.enemies[0],c('meta'));
 near(p.hitLogRatio,Math.log(a/enemy));near(p.damageLogRatio,Math.log(a/E.T.enemyDurability(100,'armor')));near(incoming.damageLogRatio,Math.log(E.T.enemyDurability(100,'power')/a));
 near(incoming.hitLogRatio,Math.log(enemy/a));near(p.damageScaleLog,Math.log(a*E.T.enemyDurability(100,'armor')/10000)/2);
 const report=F.matchup(s,c('meta'));
 assert.equal(report.enemyDamageCorrection,E.T.damage(incoming.attack,incoming.reduction,incoming.damageLogRatio,incoming.damageScaleLog).correction);
 assert.equal(report.damageCorrection,E.T.damage({dice:p.dice,flat:p.flat+p.bonus,resultScale:p.resultScale},p.defense,p.damageLogRatio,p.damageScaleLog).correction);
});

test('schema39 preserves current earnings and migrates enemy HP ratios, summons, AP and queued actions',()=>{
 const s=ready(['meta'],'mohicans');s.earned=987654;s.health.meta.hp=9;s.actionPoints.meta=12;
 for(const char of D.characters)s.levels[char.id]=1;
 for(const [i,base]of D.sessions.filter(q=>!q.members).entries())E.setFormation(s,base.id,[D.characters[i].id]);
 for(const base of D.sessions.filter(q=>!q.members)){
  s.questLevels[base.id]=101;s.questActiveLevels[base.id]=101;E.selectSession(s,base.id);s.enemies=null;E.ensureEnemies(s);
  const oldMax=E.hpFromStrength(base.hp,100);
  for(const enemy of s.enemies)if(enemy.kind!=='kogumo')enemy.hp=Math.floor(oldMax*.4);
  s.hp=s.enemies[0].hp;s.enemies[0].poisonDamage=s.poisonDamage=4;s.enemies[0].actionPoints=7;
  if(base.id==='ozmorn'){
   Object.assign(s.enemies[1],{hp:8,maxHP:12,creationDamage:12});E.selectEnemy(s,s.enemies[1].id);
   const targetId=E.formationIds(s)[0],current=E.enemyHitProfile(s,s.enemies[0],c(targetId)),delta=Math.log(E.T.value(100)/E.enemyStrength(E.getSession(s)));
   s.enemies[0].pendingAttack={targetId,remaining:.1,count:1,profile:{...current,hitLogRatio:current.hitLogRatio+Math.log(E.T.value(100)/E.getSession(s).strength),damageLogRatio:current.damageLogRatio+delta,damageScaleLog:current.damageScaleLog+delta/2}};
  }
 }
 E.selectSession(s,'ozmorn');delete s.previousRunsEarned;
 const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:39,state:s}));
 assert.deepEqual(E.incomeRecord(migrated),{currentRun:987654,allRuns:987654});
 assert.equal(migrated.health.meta.hp,9);assert.equal(migrated.actionPoints.meta,12);
 for(const base of D.sessions.filter(q=>!q.members)){
  const ctx=E.battleContext(migrated,base.id),max=E.getSession(ctx).hp,oldMax=E.hpFromStrength(base.hp,100);
  assert.equal(ctx.enemies[0].hp,Math.max(1,N.floor(N.floor(Math.floor(oldMax*.4)/oldMax*N.floor(base.hp*stat(100)/100))/N.floor(base.hp*stat(100)/100)*max)));
  assert.equal(ctx.enemies[0].actionPoints,7);assert.equal(ctx.enemies[0].poisonDamage,4);
 }
 assert.equal(migrated.hp,8);assert.equal(migrated.enemies[1].maxHP,12);assert.equal(migrated.enemies[1].creationDamage,12);
 const pending=migrated.enemies[0].pendingAttack,expected=E.enemyHitProfile(migrated,migrated.enemies[0],c(migrated.enemies[0].pendingAttack.targetId));
 assert.equal(pending.remaining,.1);near(pending.profile.damageLogRatio,expected.damageLogRatio);near(pending.profile.hitLogRatio,expected.hitLogRatio);near(pending.profile.damageScaleLog,expected.damageScaleLog);
 assert.deepEqual(roundTrip(migrated),migrated);
});

test('schema39 migration preserves defeat waits and does not revive enemies',()=>{
 const s=ready(['meta'],'mohicans');s.questLevels.mohicans=s.questActiveLevels.mohicans=20;
 for(const e of s.enemies)Object.assign(e,{hp:0,respawnSeconds:3});s.hp=0;s.respawnSeconds=3;delete s.previousRunsEarned;
 const m=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:39,state:s}));
 assert.equal(m.hp,0);assert.equal(m.respawnSeconds,3);assert.ok(m.enemies.every(e=>e.hp===0&&e.respawnSeconds===3));
});

test('income counts real gains once, excludes expenses/refunds, and archives only at the future run boundary',()=>{
 const s=ready();s.factors=0;
 for(const type of D.incomeTypes)E.grantIncome(s,100,type);
 const total=100*D.incomeTypes.filter(t=>!['refund','migrationRefund'].includes(t)).length;
 assert.deepEqual(E.incomeRecord(s),{currentRun:total,allRuns:total});
 E.buyMany(s,'level','meta',1);E.sell(s,'level','meta',1);assert.equal(s.earned,total);
 E.selectMemories(s);E.selectSession(s,'mohicans');s.questLevels.mohicans=2;E.setQuestLevel(s,'mohicans',2);assert.equal(s.earned,total);
 E.rolloverIncome(s);assert.deepEqual(E.incomeRecord(s),{currentRun:0,allRuns:total});E.rolloverIncome(s);assert.equal(E.incomeRecord(s).allRuns,total);
 E.grantIncome(s,77,'questReward');assert.deepEqual(E.incomeRecord(roundTrip(s)),{currentRun:77,allRuns:total+77});
 for(const n of [-1,.5,Infinity]){const invalid=structuredClone(s);invalid.previousRunsEarned=n;assert.throws(()=>S.encode(invalid));}
});

test('simultaneous battles and offline gains feed the same run and all-run records',()=>{
 for(const offline of [false,true]){
  const s=ready(['meta'],'mohican-solo');s.levels.meta=s.levels.richter=51;E.setFormation(s,'scarecrow',['richter']);s.previousRunsEarned=123456;
  const events=E.advance(s,30,rng(93),true,offline);
  assert.ok(events.some(e=>e.type==='attack'&&e.sessionId==='mohican-solo'));assert.ok(events.some(e=>e.type==='attack'&&e.sessionId==='scarecrow'));
  const sum=Object.entries(s.incomeTotals).filter(([id])=>!['refund','migrationRefund'].includes(id)).reduce((n,[,amount])=>n+amount,0);
  assert.ok(sum>0);assert.equal(s.earned,sum);assert.deepEqual(E.incomeRecord(roundTrip(s)),{currentRun:sum,allRuns:123456+sum});
 }
});

test('memory displays separate saved totals, including simplified number formatting',()=>{
 const s=ready();s.paused=true;s.viewingMemories=true;s.earned=2345678;s.previousRunsEarned=1000000000;
 const h=harness(s);assert.equal(h.get('memory-current').textContent,'2,345,678 Rd');assert.equal(h.get('memory-total').textContent,'1,002,345,678 Rd');
 const input=h.get('option-simple-numbers');input.value='western';input.listeners.get('change')();
 assert.equal(h.get('memory-current').textContent,'2.346 million Rd');assert.equal(h.get('memory-total').textContent,'1.002 billion Rd');
 assert.deepEqual(E.incomeRecord(h.saved()),E.incomeRecord(s));
});
