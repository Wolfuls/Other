'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),N=require('../js/numbers'),B=require('../js/battle-batch'),UI=require('../js/display');
const {harness}=require('./app-harness.cjs');
const c=id=>D.characters.find(c=>c.id===id),q=id=>D.sessions.find(q=>q.id===id);
function ready(id='mohicans'){
 const s=E.createState(1000);s.factors=1e12;for(const x of D.characters)s.levels[x.id]=1;
 E.setFormation(s,id,D.characters.slice(0,E.MAX_PARTY_SIZE).map(c=>c.id));if(id!==s.sessionId)E.selectSession(s,id);
 s.levels.max=10;s.actionLevels.max=100;s.selectedCharacterId='meta';return s;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('v049 prices and Max perk requirements use separate power/action tracks',()=>{
 const s=ready(),prices={'western-munchkin':100000,'plot-armor':10000000,'mouth-wrestling':100000000};
 for(const [id,cost]of Object.entries(prices)){
  const p=c('max').perks.find(p=>p.id===id),track=p.levelType==='action'?'actionLevels':'levels';assert.equal(p.cost,cost);
  s[track].max=p.level-1;s.factors=cost;assert.equal(E.buyPerk(s,'max',id),false);s[track].max++;s.factors--;assert.equal(E.buyPerk(s,'max',id),false);s.factors++;assert.ok(E.buyPerk(s,'max',id));assert.equal(s.factors,0);
 }
 for(const id of ['retake','reversal','fightingSpirit','badLuck'])assert.equal(D.upgrades.find(u=>u.id===id).cost,500000);
 assert.equal(c('max').perks.some(p=>p.id==='golden-rule'),false);
});

test('Plot Armor replaces individual damage dice, retains fixed values, and affects the local party including Max',()=>{
 for(const [id,dice,flat]of [['mohicans',2,0],['scarecrow',3,1],['dementor',4,5]]){
  const s=ready(id);s.purchasedPerks.max=['plot-armor'];
  assert.deepEqual(E.enemyAttackSpec(s),{dice,flat,sides:4});assert.equal(E.actionPower(s,c('meta')),60);assert.equal(E.actionPower(s,c('max')),310);
  assert.equal(E.roll(dice,flat,()=>.999,4),dice*4+flat);
  if(id!=='scarecrow'){
   E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};const hit=E.advance(s,.1,()=>.4).find(e=>e.type==='enemyAttack');
   assert.ok(hit.hit);assert.equal(hit.damage,Math.max(1,dice*2+flat-(id==='dementor'?6:2)));
  }
  E.setFormation(s,'mohican-solo',['max']);assert.equal(E.enemyAttackSpec(s).sides,6);assert.equal(E.actionPower(s,c('meta')),50);
 }
});

test('Mouth Wrestling adds two opposed D6 including for Max, without modifying SS',()=>{
 const s=ready();s.purchasedPerks.max=['mouth-wrestling'];s.concentration.mohicans.reaction=2;
 assert.deepEqual(E.evasionSpec(s,c('meta')),{flat:11,dice:3});assert.deepEqual(E.evasionSpec(s,c('max')),{flat:18,dice:4});
 assert.deepEqual(E.evasionSpec(s,c('meta'),true),{flat:14,dice:1});
 E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};const hit=E.advance(s,.1,()=>.4).find(e=>e.type==='enemyAttack');
 assert.equal(hit.evasion.dice.length,3);assert.equal(hit.hit,false);
 s.health.max={hp:1,status:'unconscious',regenSeconds:0};assert.equal(E.evasionSpec(s,c('meta')).dice,1);
 s.health.max={hp:22,status:'active',regenSeconds:0};s.actionLevels.max=74;assert.equal(E.evasionSpec(s,c('meta')).dice,1);
});

test('Western Munchkin borrows only Max power levels and never unlocks recipient perks',()=>{
 const s=ready();s.purchasedPerks.max=['western-munchkin'];s.levels.meta=9;s.purchasedPerks.meta=['attack-plus'];
 assert.equal(E.effectivePowerLevel(s,c('meta')),19);assert.equal(E.characterMultiplier(s,c('meta')),2.8);
 assert.equal(E.perks(s,c('meta')).find(p=>p.id==='attack-plus').unlocked,false);assert.equal(E.buyPerk(s,'meta','attack-plus'),false);
 assert.equal(E.stats(s,c('meta')).flat,0);assert.equal(E.effectivePowerLevel(s,c('max')),10);
 s.levels.richter=10;s.purchasedPerks.richter=['z-bom'];E.selectCharacter(s,'richter');assert.equal(E.stats(s,c('richter')).dice,7);
 assert.equal(E.effectivePowerLevel(s,c('meta')),9);
 s.health.max={hp:0,status:'unconscious',regenSeconds:0};assert.equal(E.effectivePowerLevel(s,c('richter')),10);
});

test('unselected GM recipients borrow levels only for delegated attacks and DPS weights both types',()=>{
 for(const selected of [null,'max','meta']){
  const s=ready('mohican-solo');E.setFormation(s,s.sessionId,['meta','max']);s.actionLevels.max=0;s.selectedCharacterId=selected;s.purchasedPerks.max=['western-munchkin'];s.actionPoints.max=50;
  const ordinary=E.attackProfile(s,c('meta'));
  assert.equal(ordinary.multiplier,selected==='meta'?2:1);
  const hit=E.advance(s,1,()=>.4).find(e=>e.delegatedBy==='max');assert.equal(hit.actorId,'meta');assert.equal(hit.damage,12);
  assert.equal(E.attackProfile(s,c('meta')).multiplier,ordinary.multiplier);
  const metrics=E.characterMetrics(s,c('meta'));near(metrics.damage,selected==='meta'?14:10.5);near(metrics.dps,metrics.damage*metrics.attacksPerSecond);
 }
});

test('borrowed levels work in high-rate GM batches and change income predictions',()=>{
 const s=ready('scarecrow');E.setFormation(s,s.sessionId,['richter','max']);s.selectedCharacterId=null;s.levels.richter=10;s.purchasedPerks.richter=['z-bom'];s.purchasedPerks.max=['western-munchkin'];
 const withPerk=E.expectedIncome(s).factorsPerSecond;s.purchasedPerks.max=[];const without=E.expectedIncome(s).factorsPerSecond;assert.ok(withPerk>without);
 s.purchasedPerks.max=['western-munchkin'];s.actionLevels.max=100000;s.questLevels.scarecrow=10;s.hp=E.getSession(s).hp;
 const events=E.advance(s,1,()=>.4);assert.ok(events.some(e=>e.maxTransfers));assert.ok(s.totalDamage>0);assert.ok(s.kills>0);assert.equal(Object.hasOwn(s,'gmRecipientId'),false);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('six-second recovery keeps partial time, heals reserves, and revives only at full HP',()=>{
 const s=ready();E.setFormation(s,s.sessionId,[]);s.health.meta={hp:18,status:'unconscious',regenSeconds:0};
 E.advance(s,5.9,()=>.4);assert.equal(s.health.meta.hp,18);E.advance(s,.1,()=>.4);assert.equal(s.health.meta.hp,19);assert.equal(s.health.meta.status,'unconscious');
 s.paused=true;E.advance(s,12,()=>.4);assert.equal(s.health.meta.hp,19);s.paused=false;E.advance(s,6,()=>.4);assert.deepEqual(s.health.meta,{hp:20,status:'active',regenSeconds:0});
});

test('all quest growth uses exact independent base curves, zero armor remains zero',()=>{
 for(const base of D.sessions)for(const lv of [1,2,10,50,100]){
  const n=BigInt(lv-1),at=E.sessionAtLevel(base,lv),reference=(b,num,den)=>Math.max(b+(lv>1&&b?1:0),Number(BigInt(b)*num**n/den**n));
  assert.equal(at.hp,reference(base.hp,11n,10n));assert.equal(at.defense,reference(base.defense,11n,10n));assert.equal(at.reward,reference(base.reward,12n,10n));
 }
});

test('free quest level selection preserves purchased cap, price, statuses, enemy identities and rewards',()=>{
 const s=ready();s.questLevels.mohicans=10;s.hp=E.getSession(s).hp;const enemies=E.ensureEnemies(s);enemies[0].hp=30;s.hp=30;enemies[0].poisonDamage=4;s.poisonDamage=4;enemies[0].pendingAttack={targetId:'meta',remaining:.3};enemies[0].actionPoints=21;
 Object.assign(enemies[1],{hp:0,respawnSeconds:3.2});const oldMax=E.getSession(s).hp,oldCost=E.questCost(s),money=s.factors,ids=enemies.map(e=>e.id);
 assert.ok(E.setQuestLevel(s,'mohicans',2));assert.equal(E.getSession(s).hp,22);assert.equal(s.questLevels.mohicans,10);assert.equal(s.questActiveLevels.mohicans,2);assert.equal(E.questCost(s),oldCost);
 assert.equal(s.hp,Math.floor(30/oldMax*22));assert.equal(s.enemies[0].poisonDamage,4);assert.equal(s.enemies[0].pendingAttack.remaining,.3);assert.equal(s.enemies[0].actionPoints,21);assert.equal(s.enemies[1].respawnSeconds,3.2);assert.deepEqual(s.enemies.map(e=>e.id),ids);
  assert.equal(s.factors,money);assert.equal(s.kills,0);assert.deepEqual(S.decode(S.encode(s)),s);
 const unchanged=structuredClone(s);assert.ok(E.setQuestLevel(s,'mohicans',2));assert.deepEqual(s,unchanged);
 for(const lv of [0,11,1.5,NaN]){const before=structuredClone(s);assert.equal(E.setQuestLevel(s,'mohicans',lv),false);assert.deepEqual(s,before);}
 assert.ok(E.setQuestLevel(s,'mohicans',10));assert.equal(s.factors,money);
});

test('level changes in other sessions, purchases and sales use the owned cap',()=>{
 const s=ready();s.questLevels.scarecrow=5;const ctx=E.battleContext(s,'scarecrow');ctx.hp=10;E.ensureEnemies(ctx);s.sessionStates.scarecrow=E.battleSnapshot(ctx);const front=E.battleSnapshot(s);
 assert.ok(E.setQuestLevel(s,'scarecrow',1));assert.equal(E.getSession(s,'scarecrow').level,1);assert.deepEqual(E.battleSnapshot(s),front);
 const hp=s.sessionStates.scarecrow.hp,cost=E.questCost(s,'scarecrow');assert.equal(cost,146);
 E.sell(s,'quest','scarecrow');assert.equal(s.questLevels.scarecrow,4);assert.equal(s.questActiveLevels.scarecrow,1);assert.equal(s.sessionStates.scarecrow.hp,hp);
 assert.ok(E.buyQuest(s,'scarecrow'));assert.equal(s.questLevels.scarecrow,5);assert.equal(s.questActiveLevels.scarecrow,5);
 E.sell(s,'quest','scarecrow');assert.equal(s.questActiveLevels.scarecrow,4);assert.deepEqual(S.decode(S.encode(s)),s);
});

test('schema26 migration preserves purchased progress and relative enemy health once, changes Golden Rule and removes boost',()=>{
 const old=ready();old.questLevels.mohicans=10;old.hp=Math.floor(N.geometric(20,1.15,9)*.6);E.ensureEnemies(old);old.enemies.forEach(e=>e.hp=old.hp);
 old.questLevels.scarecrow=4;old.sessionStates.scarecrow={hp:26,poisonDamage:0,batchHpFraction:0,batchDamageFraction:0,respawnSeconds:0,selectedCharacterId:null,enemies:null,nextEnemyId:0,focusedEnemyId:null};
 old.purchasedPerks.max=['golden-rule'];old.boostSeconds=12;old.health.meta={hp:13,status:'active',regenSeconds:7.5};delete old.questActiveLevels;
 const restored=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:26,state:old}));
 assert.equal(restored.hp,Math.floor(old.hp/N.geometric(20,1.15,9)*47));assert.equal(restored.sessionStates.scarecrow.hp,Math.floor(26/53*46));
 assert.deepEqual(restored.purchasedPerks.max,['plot-armor']);assert.equal(restored.health.meta.regenSeconds,4.5);assert.equal(restored.factors,old.factors);assert.deepEqual(restored.questLevels,old.questLevels);assert.equal(E.getSession(restored).level,10);assert.equal(Object.hasOwn(restored,'boostSeconds'),false);
 assert.deepEqual(S.decode(S.encode(restored)),restored);
 const big=ready();big.questLevels.scarecrow=400;big.sessionId='scarecrow';big.hp=N.geometric(35,1.15,399);big.enemies=null;big.sessionStates={};big.formations=E.createState().formations;
 assert.doesNotThrow(()=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:26,state:big})));
});

test('current saves reject invalid selected levels and retain valid challenge levels',()=>{
 const s=ready();s.questLevels.mohicans=5;assert.ok(E.setQuestLevel(s,'mohicans',2));assert.deepEqual(S.decode(S.encode(s)),s);
 for(const value of [0,6,1.2,null,'2',Infinity])assert.throws(()=>S.encode({...s,questActiveLevels:{mohicans:value}}));
 assert.throws(()=>S.encode({...s,questActiveLevels:{unknown:1}}));
});

test('UI keeps level controls folded, changes challenge level without spending, and shows current D4 defenses',()=>{
 const s=ready();s.paused=true;s.questLevels.mohicans=3;s.purchasedPerks.max=['plot-armor','mouth-wrestling'];const h=harness(s);
 const html=h.get('quest-list').innerHTML;assert.match(html,/id="quest-enhancement-mohicans" hidden/);assert.match(h.get('health-meta').textContent,/回避 9＋3D6/);assert.equal(h.get('quest-attack-mohicans').textContent,'2D4＋0');
 h.get('quest-active-mohicans').value='1';h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-quest-level]'?{dataset:{questLevel:'mohicans'}}:null}});
 const saved=h.saved();assert.equal(saved.questLevels.mohicans,3);assert.equal(saved.questActiveLevels.mohicans,1);assert.equal(saved.factors,s.factors);assert.match(h.get('quest-level-mohicans').textContent,/購入済み Lv.3 ／ 挑戦中 Lv.1/);assert.equal(h.get('quest-hp-mohicans').textContent,'24 → 26');
});

test('all down sprites compensate transparent padding and Max lands below the hover height',()=>{
 const s=ready();s.paused=true;for(const x of D.characters)s.health[x.id]={hp:-1,status:'dying',regenSeconds:0};const h=harness(s);
 for(const x of D.characters){const actor=h.get(x.id+'-combatant'),img=actor.children.find(n=>n.className.includes('ally-down-sprite')),gap=parseFloat(img.style.getPropertyValue('--down-bottom-gap'))/100;assert.ok(actor.classList.contains('downed'));
  for(const width of [96,128,166,170,185]){const height=width*x.downContact.height/x.downContact.width;near(-height+gap*height+x.downContact.bottom*width/x.downContact.width,0);}
 }
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');assert.match(app,/setProperty\('--down-foot',\(m.footOffset\+m.hoverHeight\)/);
});

test('help explains current controls concisely and retired boost is absent from UI and public API',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8'),help=html.slice(html.indexOf('<dialog id="help-dialog"'),html.indexOf('<dialog id="revive-dialog"'));
 assert.ok(help.length<2300);assert.match(help,/6秒/);assert.match(help,/挑戦Lv/);assert.match(help,/復活バースト/);assert.doesNotMatch(html+app,/SPE補正|限界突破|boost-status/);assert.equal(E.buyBoost,undefined);assert.equal(Object.hasOwn(E.createState(),'boostSeconds'),false);
 for(const p of c('max').perks)assert.doesNotMatch(p.description,/タライ|元々無料|ランダム/);
});
