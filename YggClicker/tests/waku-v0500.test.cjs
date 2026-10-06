'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),N=require('../js/numbers'),B=require('../js/battle-batch'),FX=require('../js/combat-effects'),UI=require('../js/display');
const {harness}=require('./app-harness.cjs');
const c=id=>D.characters.find(c=>c.id===id);
function ready(quest='scarecrow',ids=['waku']){const s=E.createState(1000);s.factors=1e12;for(const id of ids)s.levels[id]=1;E.setFormation(s,quest,ids);if(quest!==s.sessionId)E.selectSession(s,quest);E.selectCharacter(s,ids[0]);E.ensureEnemies(s);return s;}
function high(s,lv=80){s.questLevels[s.sessionId]=lv;s.hp=E.getSession(s).hp;s.enemies=null;E.ensureEnemies(s);return s;}
function equip(s,power=100,action=100,ids=c('waku').perks.map(p=>p.id)){s.levels.waku=power;s.actionLevels.waku=action;s.purchasedPerks.waku=[...ids];return s;}
function strike(s,id,rng){s.enemies[0].pendingAttack={targetId:id,remaining:.1};return E.advance(s,.1,rng).find(e=>e.type==='enemyAttack');}
function rng(values=[],fallback=.4){return ()=>values.length?values.shift():fallback;}

test('Waku purchase, base stats, both perk tracks and agreed prices',()=>{
 const s=E.createState(),w=c('waku');assert.deepEqual([w.cost,w.dice,w.flat,w.action,w.maxHP,w.defense,w.resistance,w.evasion.flat,w.ss.flat],[4000,4,0,75,20,1,3,16,9]);
 s.factors=3999;assert.equal(E.hire(s,'waku'),false);s.factors++;assert.ok(E.hire(s,'waku'));assert.equal(s.factors,0);assert.equal(E.hireCost(s,w),800);assert.equal(E.actionCost(s,w),1000);
 for(const p of w.perks){const track=p.levelType==='action'?'actionLevels':'levels';s[track].waku=p.level-1;s.factors=p.cost;assert.equal(E.buyPerk(s,'waku',p.id),false);s[track].waku++;s.factors--;assert.equal(E.buyPerk(s,'waku',p.id),false);s.factors++;assert.ok(E.buyPerk(s,'waku',p.id));assert.equal(E.buyPerk(s,'waku',p.id),false);assert.equal(p.cost,{10:50000,25:500000,50:5000000,100:500000000}[p.level]);}
 assert.deepEqual(S.decode(S.encode(s)),s);
});
test('every ally uses physical defense or mental resistance with minimum one damage',()=>{
 assert.deepEqual(D.characters.map(x=>[x.id,x.defense,x.resistance]),[['meta',2,6],['richter',1,6],['vishunal',4,1],['tordeliese',0,2],['max',1,2],['waku',1,3]]);
 for(const x of D.characters)for(const quest of ['mohican-solo','dementor']){
  const s=ready(quest,[x.id]);const e=strike(s,x.id,rng([.9,.9,.4]));assert.equal(e.hit,true);
  assert.equal(e.damage,Math.max(1,(quest==='dementor'?17:6)-(quest==='dementor'?x.resistance:x.defense)));
 }
 const s=ready('mohican-solo',['vishunal']);s.concentration[s.sessionId].defense=5;assert.equal(strike(s,'vishunal',rng([.9,.9,.4])).damage,1);
});
test('defense minus three affects the very first attack, never stacks, and benefits later allies',()=>{
 const s=ready('scarecrow',['waku','meta']);equip(s,10,0,['expanded-hurtbox']);const p=E.attackProfile(s,c('waku'));
 const first=E.click(s,()=>.7).find(e=>e.type==='attack');assert.equal(first.damage,6);assert.equal(s.enemies[0].defensePenalty,3);assert.equal(s.hp,29);
 E.click(s,()=>.4);assert.equal(s.enemies[0].defensePenalty,3);
 s.levels.meta=50;E.selectCharacter(s,'meta');const mp=E.attackProfile(s,c('meta')),amount=B.rolledDamage(mp,6);assert.equal(E.click(s,()=>.4).find(e=>e.type==='attack').damage,Math.max(1,amount-32));
 assert.equal(E.targetDefense(p,s.enemies[0]),32);
});
test('defense loss is individual, never negative, and cannot bypass penetration immunity',()=>{
 const s=high(ready('mohicans'));equip(s,50,0,['expanded-hurtbox','monado-smash']);E.selectEnemy(s,s.enemies[1].id);E.click(s,()=>.4);
 assert.deepEqual(s.enemies.map(e=>e.defensePenalty),[0,3,0]);assert.equal(E.targetDefense(E.attackProfile(s,c('waku')),s.enemies[1]),0);
 const armored=high(ready());equip(armored,50,0,['expanded-hurtbox','monado-smash']);const p=E.attackProfile(armored,c('waku'));assert.equal(p.ignoreDefense,false);assert.equal(p.penetrationBlocked,true);assert.equal(E.click(armored,()=>.4).find(e=>e.type==='attack').damage,1);
});
test('Invisible Wall reduces current AP on every hit, floors with minimum one, never underflows',()=>{
 const s=high(ready());equip(s,25,0,['invisible-wall']);const e=s.enemies[0];
 for(const [ap,result]of [[250,248],[99,98],[1,0],[0,0]]){e.actionPoints=ap;E.click(s,()=>.4);assert.equal(e.actionPoints,result);}
 e.actionPoints=5;E.click(s,()=>.4);E.click(s,()=>.4);assert.equal(e.actionPoints,3);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('nextFrame and Deceptive Hitbox add independently, local conscious owner only',()=>{
 const s=ready('scarecrow',['waku','meta']);equip(s,100,10,['next-frame','deceptive-hitbox']);assert.equal(E.stats(s,c('waku')).dice,6);
 assert.deepEqual(E.evasionSpec(s,c('waku')),{flat:22,dice:1});assert.equal(E.evasionSpec(s,c('meta')).flat,12);assert.equal(E.evasionSpec(s,c('meta'),true).flat,15);
 s.health.waku={hp:0,status:'unconscious',regenSeconds:0};assert.equal(E.evasionSpec(s,c('meta')).flat,9);
 s.health.waku={hp:20,status:'active',regenSeconds:0};E.setFormation(s,'dementor',['waku']);assert.equal(E.evasionSpec(s,c('meta')).flat,9);assert.equal(E.evasionSpec(E.battleContext(s,'dementor'),c('waku')).flat,22);
});
test('Floor Clip protects exactly the lowest current HP in formation order and releases the last survivor',()=>{
 const s=ready('mohicans',['meta','waku','vishunal']);equip(s,1,25,['floor-clip']);s.health.meta.hp=12;s.health.waku.hp=12;s.health.vishunal.hp=14;
 assert.deepEqual(E.enemyTargetCandidates(s).map(c=>c.id),['waku','vishunal']);
 s.health.waku.hp=10;assert.deepEqual(E.enemyTargetCandidates(s).map(c=>c.id),['waku','vishunal']);
 s.enemies.forEach(e=>e.actionPoints=99);const events=E.advance(s,1,()=>.4);assert.ok(events.filter(e=>e.type==='enemyWindup').every(e=>e.targetId!=='meta'));
 s.health.meta.status=s.health.vishunal.status='unconscious';assert.deepEqual(E.enemyTargetCandidates(s).map(c=>c.id),['waku']);
 s.health.waku.status='unconscious';assert.deepEqual(E.enemyTargetCandidates(s),[]);
});
test('Vanishing Hurtbox nullifies 20% of physical or mental attacks before damage and survival rolls',()=>{
 for(const quest of ['mohican-solo','dementor']){
  const s=ready(quest);equip(s,1,50,['vanishing-hurtbox']);const no=strike(s,'waku',rng([.9,.9,.4,.4,.1]));assert.equal(no.nullified,true);assert.equal(no.hit,false);assert.equal(no.damage,0);assert.equal(s.health.waku.hp,20);
  const yes=strike(s,'waku',rng([.9,.9,.4,.4,.2]));assert.equal(yes.nullified,false);assert.equal(yes.hit,true);assert.equal(yes.damage,quest==='dementor'?14:5);
 }
});
test('accuracy debuff has a five-percent boundary, is nonstacking and is consumed by exactly one opposed attack',()=>{
 for(const quest of ['mohicans','dementor']){
  const s=high(ready(quest));equip(s,1,100,['vanishing-hitbox']);E.selectEnemy(s,s.enemies[0].id);
  E.click(s,rng([.4,.4,.4,.4,.05]));assert.equal(s.enemies[0].accuracyPenalty,0);
  E.click(s,rng([.4,.4,.4,.4,.049]));assert.equal(s.enemies[0].accuracyPenalty,15);
  E.click(s,()=>.04);assert.equal(s.enemies[0].accuracyPenalty,15);assert.equal(s.enemies[1].accuracyPenalty,0);
  const first=strike(s,'waku',()=>.4);assert.equal(first.accuracy.total,(quest==='dementor'?17:10)+3-15);assert.equal(first.accuracyPenalty,15);assert.equal(s.enemies[0].accuracyPenalty,0);
  const second=strike(s,'waku',()=>.4);assert.equal(second.accuracy.total,(quest==='dementor'?17:10)+3);assert.equal(second.accuracyPenalty,0);
 }
});
test('debuffed accuracy reroll retains the same minus fifteen and cancellation does not consume it',()=>{
 const s=high(ready('dementor'));s.upgrades.reversal=1;s.enemies[0].accuracyPenalty=15;
 const r=strike(s,'waku',rng([.9,.4,.4,.4]));assert.equal(r.accuracyReroll,true);assert.equal(r.accuracy.original.total,11);assert.equal(r.accuracy.total,5);
 s.enemies[0].accuracyPenalty=15;s.enemies[0].pendingAttack={targetId:'waku',remaining:.5};s.health.waku={hp:0,status:'unconscious',regenSeconds:0};E.advance(s,.1,()=>.4);assert.equal(s.enemies[0].pendingAttack,null);assert.equal(s.enemies[0].accuracyPenalty,15);
});
test('enemy statuses survive offscreen save and level changes, and clear on death/respawn',()=>{
 const s=high(ready('mohicans',['waku']));const e=s.enemies[1];e.defensePenalty=3;e.accuracyPenalty=15;e.actionPoints=77;
 E.selectSession(s,'scarecrow');const restored=S.decode(S.encode(s));assert.equal(restored.sessionStates.mohicans.enemies[1].accuracyPenalty,15);E.setQuestLevel(restored,'mohicans',2);assert.equal(restored.sessionStates.mohicans.enemies[1].defensePenalty,3);
 E.selectSession(restored,'mohicans');E.selectCharacter(restored,'waku');E.selectEnemy(restored,e.id);restored.enemies[1].hp=1;restored.hp=1;E.click(restored,()=>.4);assert.equal(restored.enemies[1].defensePenalty,0);assert.equal(restored.enemies[1].accuracyPenalty,0);
 E.setFormation(restored,'mohicans',[]);E.advance(restored,5,()=>.4);assert.notEqual(restored.enemies[1].id,e.id);assert.equal(restored.enemies[1].accuracyPenalty,0);
});
test('schema27 saves add Waku unowned and empty debuffs without changing previous progression',()=>{
 const old=ready('scarecrow',['meta']);old.factors=12345;old.levels.meta=23;old.enemies.forEach(e=>{delete e.defensePenalty;delete e.accuracyPenalty;});for(const field of ['health','levels','actionLevels','actionPoints','purchasedPerks'])delete old[field].waku;
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:27,state:old}));assert.equal(s.factors,12345);assert.equal(s.levels.meta,23);assert.equal(s.levels.waku,0);assert.deepEqual(s.health.waku,{hp:20,status:'active',regenSeconds:0});assert.equal(s.enemies[0].defensePenalty,0);assert.deepEqual(S.decode(S.encode(s)),s);
 for(const [field,bad]of [['defensePenalty',6],['accuracyPenalty',30],['defensePenalty',-1],['accuracyPenalty',1.5]]){const corrupt=structuredClone(s);corrupt.enemies[0][field]=bad;assert.throws(()=>S.encode(corrupt));}
});
test('very high action rate applies repeated AP loss and bounded debuffs without unbounded work',()=>{
 const s=high(ready());equip(s);s.actionLevels.waku=1e8;s.enemies[0].actionPoints=250;
 const start=performance.now(),events=E.advance(s,1,()=>.05);assert.ok(performance.now()-start<1000);assert.equal(s.enemies[0].actionPoints,0);assert.ok(events.some(e=>e.approximate));assert.ok(s.enemies[0].defensePenalty===3||s.enemies[0].respawnSeconds>0);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('Max switches to normal attacks and forecasts when all other deployed allies are down, then returns to GM',()=>{
 const s=high(ready('mohican-solo',['max','meta']));s.health.meta={hp:0,status:'unconscious',regenSeconds:0};s.actionPoints.max=50;
 assert.equal(E.isActionDonor(s,c('max')),false);assert.equal(E.effectiveAttackRate(s,c('max')),.5);assert.ok(E.characterMetrics(s,c('max')).dps>0);
 const events=E.advance(s,1,()=>.4);assert.ok(events.some(e=>e.actorId==='max'&&e.type==='attack'));assert.ok(events.every(e=>!e.maxTransfers));
 E.revive(s,'meta');s.actionPoints.max=50;const gifts=E.advance(s,1,()=>.4);assert.ok(gifts.some(e=>e.delegatedBy==='max'));assert.equal(E.isActionDonor(s,c('max')),true);
 E.setFormation(s,'scarecrow',['meta']);assert.equal(E.isActionDonor(s,c('max')),false);
});
test('quest costs use exact 1.1 powers for single, ten, sale and cap-level prices',()=>{
 const s=ready();for(const lv of [1,2,3,10,50]){s.questLevels.scarecrow=lv;assert.equal(E.questCost(s),Number(100n*11n**BigInt(lv-1)/10n**BigInt(lv-1)));}
 s.questLevels.scarecrow=1;const q=E.purchaseQuote(s,'quest','scarecrow',10),single=structuredClone(s);for(let i=0;i<10;i++)E.buyQuest(single,'scarecrow');assert.ok(E.buyMany(s,'quest','scarecrow'));assert.equal(s.factors,single.factors);assert.equal(q.cost,1e12-s.factors);assert.equal(E.saleQuote(s,'quest','scarecrow').refund,Math.floor(Number(100n*11n**9n/10n**9n)/2));
 const cost=E.questCost(s);E.setQuestLevel(s,'scarecrow',1);assert.equal(E.questCost(s),cost);
});
test('six-character roster respects five-unit cap and Waku moves between simultaneous quests',()=>{
 const s=E.createState();s.factors=1e9;D.characters.forEach(c=>E.hire(s,c.id));assert.equal(E.formationIds(s).length,5);assert.equal(E.isDeployed(s,'waku'),false);
 assert.equal(E.setFormation(s,s.sessionId,D.characters.map(c=>c.id)),false);assert.ok(E.setFormation(s,'scarecrow',['waku']));assert.equal(E.formationOwner(s,'waku'),'scarecrow');assert.ok(E.setFormation(s,s.sessionId,['meta','richter','waku']));assert.deepEqual(E.formationIds(s,'scarecrow'),[]);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('Waku visual release accounting preserves all attacks in compacted/sustained volleys',()=>{
 const events=Array.from({length:300},(_,i)=>({type:'attack',actorId:'waku',actor:'元加 枠',damage:2,count:1,hpBefore:1000-i*2,hpAfter:998-i*2}));
 const frames=FX.plan(events,{sustainedActors:['waku']});assert.equal(frames.reduce((n,f)=>n+f.wakuAttacks,0),300);assert.ok(frames.every(f=>Number.isFinite(f.offset)&&Number.isFinite(f.gap)));
 const layout=UI.orbitLayout({grounded:true,width:1000,metaHired:true,wakuHired:true,metaCount:0,richterCount:0});assert.equal(layout.waku.y+layout.waku.footOffset,layout.meta.y+layout.meta.footOffset);assert.ok(layout.waku.x<layout.enemyX);
});
test('Waku can be inspected, manually selected, uses handgun once and wooden sword when firing continuously',()=>{
 const s=high(ready());s.paused=false;const h=harness(s);h.click('inspect-waku');assert.equal(h.get('card-waku').hidden,false);h.click('waku-select');h.click('attack');assert.ok(h.get('waku-projectiles').children.some(n=>n.className==='waku-bullet'));h.advance(80);h.click('attack');assert.ok(h.get('waku-combatant').classList.contains('bursting'));assert.ok(h.get('waku-projectiles').children.some(n=>n.className==='waku-slash'));
 assert.match(h.get('health-waku').textContent,/防御 1 \/ 抵抗 3 · AP/);h.click('pause');assert.equal(h.get('waku-projectiles').children.length,0);
});
