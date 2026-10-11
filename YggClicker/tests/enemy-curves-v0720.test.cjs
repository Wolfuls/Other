'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,rng}=require('./current-fixtures.cjs');
const N=require('../js/numbers'),A=require('../js/ability-view'),UI=require('../js/display'),{harness}=require('./app-harness.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const baseStrength=x=>100*1.012**x*(1+x/100)**(100*Math.log(1.025/1.012));
const boss=D.sessions.find(q=>q.id==='ozmorn');

test('enemy curves separate HP, defense and attack while preserving action and judgments',()=>{
 for(const Q of [1,2,10,100,170,190,260,500,1000]){
  const x=Q-1,u=1+x/100,b=baseStrength(x),q=E.sessionAtLevel(boss,Q);
  near(q.hpStrength,b*u**3.5);near(E.enemyStrength(q,'armor'),b*u);
  near(E.enemyStrength(q),b/u**2);near(E.enemyStrength(q,'accuracy'),b);near(E.enemyStrength(q,'evasion'),b);
  near(q.actionMultiplier,b/100);assert.equal(q.hp,N.floor(Math.min(1e100,boss.hp*q.hpStrength/100)));
  assert.equal(E.enemyActionValue(q),N.floor(14*b/100));
  for(const k of ['defense','resistance','attack','accuracy','evasion','ss'])assert.deepEqual(q[k],boss[k]);
 }
 let previous={power:0,armor:0,vitality:0};
 for(let L=0;L<500;L++)for(const kind of Object.keys(previous)){const value=E.T.enemyDurability(L,kind);assert.ok(value>previous[kind]);previous[kind]=value;}
 for(const L of [10000,1e6,Number.MAX_SAFE_INTEGER])for(const kind of Object.keys(previous)){
  const value=E.T.enemyDurability(L,kind);assert.ok(Number.isFinite(value)&&value>0&&value<=1e100);
 }
});

test('both physical and mental damage use defense strength while judgments keep their own curve',()=>{
 for(const id of ['waku','queen']){
  const s=ready([id],'ozmorn'),c=character(id);s.levels[id]=232;s.concentration[id].power=100;
  s.questLevels.ozmorn=s.questActiveLevels.ozmorn=190;const q=E.getSession(s),p=E.attackProfile(s,c);
  near(p.damageLogRatio,Math.log(E.strengthValue(s,c,'power')/q.defenseStrength));
  near(p.damageScaleLog,E.T.absoluteLog(E.strengthValue(s,c,'power'),q.defenseStrength));
  near(p.hitLogRatio,Math.log(E.strengthValue(s,c,'accuracy')/q.strength));
  const incoming=E.enemyHitProfile(s,s.enemies[0],c);
  near(incoming.damageLogRatio,Math.log(q.attackStrength/E.strengthValue(s,c,'armor')));
  near(incoming.hitLogRatio,Math.log(q.strength/E.strengthValue(s,c,'evasion')));
 }
});

test('schema48 rescales main and offscreen enemy HP once, preserves summons, waits, AP and queued judgments',()=>{
 const s=ready(['meta'],'mohicans');s.levels.waku=232;E.setFormation(s,'ozmorn',['waku']);
 const contexts=[];
 for(const [id,Q]of [['mohicans',170],['ozmorn',190]]){
  s.questLevels[id]=Q;s.questActiveLevels[id]=Q;
  E.selectSession(s,id);s.enemies=null;s.hp=E.getSession(s).hp;E.ensureEnemies(s);
  const base=D.sessions.find(q=>q.id===id),oldMax=N.floor(base.hp*baseStrength(Q-1)/100);
  for(const e of s.enemies)if(e.kind!=='kogumo')e.hp=Math.floor(oldMax*.4);
  s.hp=s.enemies[0].hp;s.enemies[0].actionPoints=7;
  const q=E.getSession(s),target=character(E.formationIds(s)[0]),p=E.enemyHitProfile(s,s.enemies[0],target),delta=Math.log(q.strength/q.attackStrength);
  s.enemies[0].pendingAttack={targetId:target.id,remaining:.3,count:1,kind:'attack',profile:{...p,damageLogRatio:p.damageLogRatio+delta,damageScaleLog:p.damageScaleLog+delta/2}};
  if(id==='mohicans'){s.enemies[1].hp=0;s.enemies[1].respawnSeconds=3;}
  if(id==='ozmorn'){Object.assign(s.enemies[1],{hp:7,maxHP:19,creationDamage:19});E.selectEnemy(s,s.enemies[1].id);}
  contexts.push({id,oldMax,oldHP:Math.floor(oldMax*.4)});
 }
 const before=structuredClone(s),m=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:48,state:s}));
 assert.deepEqual(s,before);for(const key of ['factors','levels','concentration','health','earned','upgrades'])assert.deepEqual(m[key],s[key]);
 for(const {id,oldMax,oldHP}of contexts){
  const ctx=E.battleContext(m,id),q=E.getSession(ctx),e=ctx.enemies[0];
  assert.equal(e.hp,N.floor(oldHP/oldMax*q.hp));assert.equal(e.actionPoints,7);assert.equal(e.pendingAttack.remaining,.3);
  const p=E.enemyHitProfile(ctx,e,character(e.pendingAttack.targetId));near(e.pendingAttack.profile.damageLogRatio,p.damageLogRatio);near(e.pendingAttack.profile.damageScaleLog,p.damageScaleLog);near(e.pendingAttack.profile.hitLogRatio,p.hitLogRatio);
 }
 assert.equal(E.battleContext(m,'mohicans').enemies[1].respawnSeconds,3);assert.equal(E.battleContext(m,'mohicans').enemies[1].hp,0);
 assert.equal(m.hp,7);assert.equal(m.enemies[1].maxHP,19);assert.deepEqual(S.decode(S.encode(m)),m);
 const bad=structuredClone(s);bad.enemies[0].hp=1e90;assert.throws(()=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:48,state:bad})));
});

test('enemy abilities and quest preview expose each actual strength without applying a draft',()=>{
 const s=ready(['waku'],'ozmorn');s.questLevels.ozmorn=200;s.questActiveLevels.ozmorn=170;s.paused=true;
 const h=harness(s),q=E.getSession(s),fmt=n=>UI.incomeNumber(A.strengthLevel(n,D.strength));h.click('tab-quests');
 for(const [key,value]of [['strength',q.attackStrength],['armor-strength',q.defenseStrength],['check-strength',q.strength],['hp-strength',q.hpStrength]])assert.equal(h.get('quest-'+key+'-ozmorn').textContent,fmt(value));
 const button={disabled:false,dataset:{enemyInfo:'ozmorn'}};
 h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-enemy-info]'?button:null}});
 const html=h.get('enemy-info-content').innerHTML;
 for(const v of [q.attackStrength,q.defenseStrength,q.strength,q.hpStrength])assert.ok(html.includes('<strong>'+fmt(v)+'</strong>'));
 assert.equal(s.questActiveLevels.ozmorn,170);
});

function battle(Q){
 const s=E.createState(1000);Object.assign(s,structuredClone(require('./boss-party-fixture.cjs')));s.factors=1e31;
 E.refreshQuestUnlocks(s);E.setFormation(s,'ozmorn',['megumin','queen','jewel','max','waku']);E.selectSession(s,'ozmorn');s.questLevels.ozmorn=Q;E.setQuestLevel(s,'ozmorn',Q);
 for(const c of D.characters){s.health[c.id]={hp:E.maxHP(s,c),status:'active',regenSeconds:0};s.actionPoints[c.id]=0;}
 s.formations=Object.fromEntries(D.sessions.map(q=>[q.id,q.id==='ozmorn'?['megumin','queen','jewel','max','waku']:[]]));s.sessionStates={};s.kills=0;s.questActiveLevels.ozmorn=Q;s.sessionId='ozmorn';s.paused=false;s.viewingMemories=false;s.enemies=null;s.hp=E.getSession(s).hp;s.selectedCharacterId=require('./boss-party-fixture.cjs').selectedCharacterId;E.ensureEnemies(s);
 return s;
}
test('reference party boss encounter takes repeated hits and tens of seconds, not a Waku one-shot',()=>{
 const times=[],hits=[];
 for(let k=0;k<10;k++){
  const s=battle(170),random=rng(81723+k*4139),id=s.enemies[0].id;let count=0,time=null;
  for(let t=1;t<=180;t++){
   const es=E.advance(s,1,random,true);
   count+=es.filter(e=>e.type==='attack'&&e.actorId&&!e.apDamage&&e.hit!==false&&e.enemyId===id&&e.damage>0).reduce((n,e)=>n+(e.count||1),0);
   if(s.kills){time=t;break;}
  }
  if(time!==null){times.push(time);hits.push(count);}
 }
 assert.ok(times.length>=9);times.sort((a,b)=>a-b);hits.sort((a,b)=>a-b);
 assert.ok(times[5]>=30&&times[5]<=60,JSON.stringify(times));assert.ok(hits[5]>=20&&hits[5]<=35,JSON.stringify(hits));
 const s=battle(190),p=E.attackProfile(s,character('waku')),damage=E.T.damage({dice:p.dice,flat:p.flat+p.bonus},p.defense,p.damageLogRatio,p.damageScaleLog).mean;
 assert.ok(E.getSession(s).hp/damage>30);
});
