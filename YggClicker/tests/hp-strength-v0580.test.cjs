'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character:c,faces,roundTrip}=require('./current-fixtures.cjs');
const T=require('../js/strength'),N=require('../js/numbers'),F=require('../js/matchup'),UI=require('../js/display');
const {harness}=require('./app-harness.cjs');
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const legacy=s=>JSON.stringify({gameId:D.gameId,schemaVersion:36,gameVersion:'0.57.6',state:s});

test('unified HP strength is linear two percent, with independent eight percent focus',()=>{
 const s=ready();for(const char of D.characters)for(const lv of [1,2,3,11,201]){s.levels[char.id]=lv;near(E.hpStrength(s,char),100*(1+.02*(lv-1)));assert.equal(E.maxHP(s,char),N.floor(char.maxHP*(1+.02*(lv-1))));}
 s.levels.meta=11;s.concentration.meta.vitality=10;near(E.hpStrength(s,c('meta')),120*1.08**(10/3.5));
});

test('enemy HP uses the current shared curve and has a separate derived HP strength level',()=>{
 for(const q of D.sessions.filter(q=>!q.members))for(let lv=1;lv<=100;lv++){
  const next=E.sessionAtLevel(q,lv);assert.equal(next.hpStrengthLevel,lv-1);
  assert.equal(next.hpStrength,T.enemyDurability(lv-1,'vitality'));assert.equal(next.hp,N.floor(q.hp*T.enemyDurability(lv-1,'vitality')/100));
 }
 const s=ready(['meta'],'ozmorn'),cloud={...s.enemies[1],hp:13,maxHP:13,creationDamage:13};
 s.questLevels.ozmorn=s.questActiveLevels.ozmorn=100;
 const spec=E.enemySpec(s,cloud);assert.equal(spec.hp,13);assert.equal(spec.hpStrengthLevel,0);
});

test('equal attack, armor and HP levels preserve approximate TTK at high levels',()=>{
 const spec={dice:3,flat:5},base=T.damage(spec,7,0,0),ttk0=36/base.mean;
 for(const lv of [1,10,25,50,100,500]){
  const d=T.damage(spec,7,T.logRatio(lv,lv),T.scaleLog(lv,lv));
  near(d.target,base.base*1.1**lv,1e-12);
  near(E.hpFromStrength(36,lv)/d.mean,ttk0,.04);
 }
});

test('absolute scale participates once in inversion; the old three-argument API is unchanged',()=>{
 const spec={dice:0,flat:10},ratio=T.logRatio(7,2),scale=T.scaleLog(7,2);
 const result=T.damage(spec,2,ratio,scale);
 near(result.target,8*Math.exp(scale+ratio*D.strength.damageStrengthExponent));
 assert.equal(result.mean,Math.max(1,10+result.correction-2));
 assert.deepEqual(T.damage(spec,2,ratio),T.damage(spec,2,ratio,0));
 assert.notEqual(T.damage(spec,2,0,T.scaleLog(10,10)).mean,T.damage(spec,2,0).mean);
});

test('hopeless strength deficits fall to one and overwhelming attack defeats unfavorable base armor',()=>{
 const weak=T.damage({dice:3,flat:5},7,T.logRatio(0,300),T.scaleLog(0,300));
 assert.equal(weak.target,1);near(weak.mean,1);
 for(const [roll]of T.distribution({dice:3,flat:5},false))assert.equal(Math.max(1,roll+weak.correction-7),1);
 const strong=T.damage({dice:1,flat:0},10000,T.logRatio(200,0),T.scaleLog(200,0));
 assert.ok(strong.mean>1e12);assert.ok(strong.correction>10000);
 for(const [a,d]of [[1e6,1e6],[1e6,0],[0,1e6]]){
  const damage=T.damage({dice:3,flat:1},35,T.logRatio(a,d),T.scaleLog(a,d));
  assert.ok([damage.target,damage.mean,damage.correction].every(Number.isFinite));assert.ok(damage.target<=1e100);
 }
});

test('player and enemy profiles use the same inversion with personal versus enemy strengths',()=>{
 const s=ready(['meta'],'mohican-solo'),char=c('meta');s.levels.meta=51;s.questLevels[s.sessionId]=11;E.setQuestLevel(s,s.sessionId,11);
 const a=200,d=T.enemyDurability(10,'armor'),enemyAttack=T.enemyDurability(10,'power'),p=E.attackProfile(s,char),incoming=E.enemyHitProfile(s,s.enemies[0],char);
 near(p.damageLogRatio,Math.log(a/d));near(incoming.damageLogRatio,Math.log(enemyAttack/a));near(p.damageScaleLog,Math.log(a*d/10000)/2);near(incoming.damageScaleLog,Math.log(a*enemyAttack/10000)/2);
 const report=F.matchup(s,char);assert.equal(report.damageCorrection,T.damage({dice:p.dice,flat:p.flat+p.bonus,resultScale:p.resultScale},p.defense,p.damageLogRatio,p.damageScaleLog).correction);
 assert.equal(report.enemyDamageCorrection,T.damage(incoming.attack,incoming.reduction,incoming.damageLogRatio,incoming.damageScaleLog).correction);
});

test('HP-focused allocation does not alter defense strength or incoming damage',()=>{
 const s=ready(['meta'],'mohican-solo'),char=c('meta');s.levels.meta=101;const before=E.enemyHitProfile(s,s.enemies[0],char),oldHP=E.maxHP(s,char);
 s.concentration.meta.vitality=100;assert.deepEqual(E.enemyHitProfile(s,s.enemies[0],char),before);assert.equal(E.maxHP(s,char),Math.floor(oldHP*1.08**(100/3.5)));
});

test('unified level and HP allocations leave wounds unchanged, reductions clamp HP',()=>{
 const s=ready();s.health.meta.hp=7;assert.ok(E.buyMany(s,'level','meta',10));assert.equal(s.health.meta.hp,7);assert.equal(E.maxHP(s,c('meta')),24);
 assert.ok(E.setConcentration(s,'meta',{...s.concentration.meta,vitality:10}));assert.equal(s.health.meta.hp,7);s.health.meta.hp=E.maxHP(s,c('meta'));
 assert.ok(E.sell(s,'level','meta',10));assert.equal(s.health.meta.hp,20);assert.equal(Object.values(s.concentration.meta).reduce((a,b)=>a+b,0),0);
 s.health.meta={hp:-5,status:'dying',regenSeconds:1};assert.ok(E.buyMany(s,'level','meta',1));assert.equal(s.health.meta.hp,-5);assert.equal(s.health.meta.status,'dying');
});

test('old six-track investment migrates once with residual refund and HP ratio/status intact',()=>{
 for(const [hp,status]of [[51,'active'],[25,'active'],[1,'unconscious'],[0,'unconscious'],[-7,'dying']]){
 const s=ready();s.levels.meta=11;for(const field of ['actionLevels',...D.statUpgrades.map(t=>t.field)])s[field]=Object.fromEntries(D.characters.map(c=>[c.id,c.id==='meta'?10:0]));s.health.meta={hp,status,regenSeconds:hp===51?0:2};
 const investment=[8,10,8,8,8,8].reduce((sum,base)=>sum+Array.from({length:10},(_,i)=>N.geometric(base,1.125,i)).reduce((a,b)=>a+b,0),0),m=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:37,state:s})),max=E.maxHP(m,c('meta'));
 assert.ok(m.levels.meta>11);assert.equal(E.trainingInvestment(m,c('meta'))+m.factors-s.factors,investment);assert.equal(m.earned,s.earned);
 assert.equal(m.health.meta.hp,hp>0?Math.max(1,N.floor(hp/51*max)):N.floor(hp/51*max));assert.equal(m.health.meta.status,status);assert.equal(m.health.meta.regenSeconds,s.health.meta.regenSeconds);assert.equal(m.vitalityLevels,undefined);assert.deepEqual(roundTrip(m),m);
 }
});

test('legacy pending attacks preserve timers and rolls while adopting migrated strengths',()=>{
 const s=ready(['meta'],'mohican-solo');s.levels.meta=11;s.armorLevels={meta:7};s.vitalityLevels={meta:0};s.questLevels[s.sessionId]=11;E.setQuestLevel(s,s.sessionId,11);
 const profile=E.enemyHitProfile(s,s.enemies[0],c('meta'));s.enemies[0].pendingAttack={targetId:'meta',remaining:.1,count:1,profile};const m=S.decode(legacy(s)),pending=m.enemies[0].pendingAttack;
 assert.equal(pending.remaining,.1);assert.deepEqual(pending.profile.attack,profile.attack);near(pending.profile.damageLogRatio,Math.log(T.enemyDurability(10,'power')/E.strengthValue(m,c('meta'),'armor')));assert.deepEqual(roundTrip(m).enemies[0].pendingAttack,pending);
});

test('legacy high-level enemy HP survives harmless exponential rounding differences',()=>{
 const s=ready(['meta'],'mohican-solo');
 for(const q of D.sessions.filter(q=>!q.members)){
  s.questLevels[q.id]=310;s.questActiveLevels[q.id]=310;s.questUnlocks[q.id]=true;
  E.selectSession(s,q.id);E.setQuestLevel(s,q.id,310);s.enemies=null;E.ensureEnemies(s);
  const oldMax=N.geometric(q.hp,1.1,309);for(const enemy of s.enemies)if(enemy.kind!=='kogumo')enemy.hp=oldMax;
  s.hp=oldMax;
 }
 const migrated=S.decode(legacy(s));
 for(const q of D.sessions.filter(q=>!q.members)){const ctx=E.battleContext(migrated,q.id),maximum=E.getSession(ctx).hp;
  for(const enemy of ctx.enemies)if(enemy.kind!=='kogumo'){assert.ok(enemy.hp<=maximum);assert.equal(enemy.hp,maximum);}
 }
 assert.deepEqual(roundTrip(migrated),migrated);
});

test('six-second recovery follows actual scaled HP and revives only at full HP',()=>{
 const s=ready(['meta']),char=c('meta');s.levels.meta=101;s.concentration.meta.vitality=30;const max=E.maxHP(s,char),gain=N.floor(max*.01);
 s.health.meta={hp:max-gain-1,status:'unconscious',regenSeconds:0};E.setFormation(s,s.sessionId,[]);
 E.advance(s,6,()=>.5);assert.equal(s.health.meta.hp,max-1);assert.equal(s.health.meta.status,'unconscious');
 E.advance(s,6,()=>.5);assert.equal(s.health.meta.hp,max);assert.equal(s.health.meta.status,'active');
});

test('ability UI shows shared HP strength and actual HP while gauges remain actual health',()=>{
 const s=ready(['meta']);s.paused=true;s.levels.meta=11;s.health.meta.hp=7;
 const h=harness(s);h.openAbility('meta');assert.equal(h.get('ability-value-vitality-meta').textContent,'11');
 assert.equal(h.get('ability-maxhp-meta').textContent,'最大HP 24');assert.match(h.get('picker-hp-meta').textContent,/7 \/ 24/);
 assert.match(h.get('ally-hp-meta').textContent,/7 \/ 24/);assert.match(h.get('character-list').innerHTML,/HP強度/);
});
