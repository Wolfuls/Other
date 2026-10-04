'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),B=require('../js/battle-batch.js'),FX=require('../js/combat-effects.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs'),dog=D.characters.find(c=>c.id==='vishunal');
function prepared(level=50){const s=E.createState(1000);s.levels.vishunal=level;s.selectedCharacterId='vishunal';s.factors=1000000;return s;}
function seeded(seed=781){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

test('Vishunal costs1000, starts at10D6, and all three perks require level and a separate factor purchase',()=>{
 const s=E.createState(1000);s.factors=999;assert.equal(E.hire(s,'vishunal'),false);s.factors=1000;assert.equal(E.hire(s,'vishunal'),true);
 assert.equal(s.factors,0);assert.deepEqual(E.stats(s,dog),{dice:10,flat:0});assert.equal(E.actionPower(s,dog),50);
 assert.equal(E.hireCost(s,dog),120);assert.equal(E.actionCost(s,dog),150);
 for(const perk of dog.perks){s.levels.vishunal=perk.level-1;s.factors=1e6;assert.equal(E.buyPerk(s,dog.id,perk.id),false);
  s.levels.vishunal=perk.level;s.factors=perk.cost-.01;assert.equal(E.buyPerk(s,dog.id,perk.id),false);
  s.factors=perk.cost;assert.equal(E.buyPerk(s,dog.id,perk.id),true);assert.equal(s.factors,0);assert.equal(E.buyPerk(s,dog.id,perk.id),false);}
 assert.deepEqual(E.stats(s,dog),{dice:30,flat:0});assert.equal(E.attackProfile(s,dog).extraAttackChance,0);assert.equal(E.hasOverflow(s,dog),true);
});

test('Vishunal parks no longer proc extra attacks and leave action power unchanged',()=>{
 for(const owned of [[],['mad-dog'],['missile-missile'],dog.perks.map(p=>p.id)]){
  const s=prepared();s.purchasedPerks.vishunal=owned;
  assert.equal(E.attackProfile(s,dog).extraAttackChance,0);assert.equal(E.actionPower(s,dog),50);assert.equal(E.effectiveAttackRate(s,dog),.5);
 }
});

test('recursive extra attacks follow geometric probabilities and means, with no explicit chain-count cap',()=>{
 for(const p of [.1,.25,.5]){
  const rng=seeded(),n=150000;let total=0,second=0,third=0;
  for(let i=0;i<n;i++){const count=E.chainAttackCount(p,rng);total+=count;second+=count>=2;third+=count>=3;}
  assert.ok(Math.abs(total/n-1/(1-p))<.009);assert.ok(Math.abs(second/n-p)<.004);assert.ok(Math.abs(third/n-p*p)<.003);
 }
 assert.equal(E.chainAttackCount(0,()=>{throw Error('No proc RNG without perk');}),1);
 assert.ok(E.chainAttackCount(.5,()=>1)>40);assert.ok(Number.isFinite(E.chainAttackCount(.5,()=>1)));
});

test('manual missile rolls once and swarm spillover adds no missiles or random proc checks',()=>{
 const s=prepared(25);s.purchasedPerks.vishunal=['mad-dog'];s.actionPoints.vishunal=75;s.upgrades.click=2;let calls=0;
 const events=E.click(s,()=>{calls++;return 0;}),shots=events.filter(e=>e.type==='attack'&&!e.continuation);
 assert.equal(shots.length,1);assert.equal(s.kills,2);assert.equal(calls,10);assert.equal(s.actionPoints.vishunal,75);assert.equal(s.clicks,1);
 assert.equal(FX.plan(events).reduce((n,f)=>n+f.vishunalAttacks,0),1);
});

test('automatic missile consumes one scheduled action in both collected and silent progress',()=>{
 for(const collect of [true,false]){
  const s=prepared(25);s.purchasedPerks.vishunal=['mad-dog'];s.actionPoints.vishunal=75;s.upgrades.click=100;let calls=0;
  const events=E.advance(s,1,()=>{calls++;return 0;},collect);
  assert.equal(s.kills,18);assert.equal(s.hp,6);assert.equal(calls,10);assert.equal(s.actionPoints.vishunal,25);assert.equal(s.clicks,0);
  if(collect)assert.equal(events.filter(e=>e.type==='attack'&&!e.continuation).length,1);else assert.deepEqual(events,[]);
 }
});

test('overflow does not create additional proc rolls or missiles, and pays defense on every victim',()=>{
 const session=D.sessions[0],defense=session.defense,hp=session.hp;
 try{
  session.hp=10;session.defense=4;const s=prepared(30);s.purchasedPerks.vishunal=['mad-dog'];let calls=0;
  const events=E.click(s,()=>++calls===11?.999:0);const hits=events.filter(e=>e.type==='attack');
  assert.equal(calls,11,'ten damage dice and one surviving knockout roll; no proc sampling');
  assert.deepEqual(hits.map(e=>e.damage),[10,10,7]);assert.equal(s.kills,2);assert.equal(s.hp,3);
 }finally{session.defense=defense;session.hp=hp;}
});

test('dice parks increase damage while Mad Dog increases swarm income through overflow',()=>{
 const s=prepared(),damage=B.averageDamage(E.attackProfile(s,dog)),before=E.expectedIncome(s).factorsPerSecond;
 s.purchasedPerks.vishunal=['mad-dog'];assert.equal(B.averageDamage(E.attackProfile(s,dog)),damage);assert.equal(E.effectiveAttackRate(s,dog),.5);
 assert.ok(E.expectedIncome(s).factorsPerSecond>before*5);
 s.purchasedPerks.vishunal.push('missile-missile');assert.equal(E.stats(s,dog).dice,20);assert.ok(E.dps(s)>damage*.5);
 s.purchasedPerks.vishunal.push('legal-launcher');assert.equal(E.stats(s,dog).dice,30);
});

test('large offline batches account for dice bonuses and spillover, retain charge, and match split processing',()=>{
 for(const p of ['mad-dog','legal-launcher','missile-missile']){
  const s=prepared(50);s.purchasedPerks.vishunal=[...new Set([p,'mad-dog'])];s.actionLevels.vishunal=100000;s.boostSeconds=7.5;s.actionClock=.2;s.actionPoints.vishunal=33;
  const split=structuredClone(s);E.advance(s,120,seeded(),false);E.advance(split,60,seeded(),false);E.advance(split,60,seeded(),false);
  assert.equal(s.kills,split.kills);assert.ok(Math.abs(s.hp-split.hp)<1e-5);assert.equal(s.actionPoints.vishunal,split.actionPoints.vishunal);
  assert.deepEqual(S.decode(S.encode(s)),s);
 }
});

test('schema10 saves gain an unowned dog without progress loss and the new selection/perks round-trip',()=>{
 const s=E.createState(1000);s.levels.meta=35;s.actionLevels.meta=70;s.factors=12345;s.hp=3;s.boostSeconds=12;
 const old=structuredClone(s);for(const key of ['levels','actionLevels','actionPoints','purchasedPerks'])delete old[key].vishunal;
 assert.deepEqual(S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:10,state:old})),{...s,hp:6});
 const trained=prepared();trained.purchasedPerks.vishunal=dog.perks.map(p=>p.id);assert.deepEqual(S.decode(S.encode(trained)),trained);
 assert.equal(JSON.parse(S.encode(trained)).schemaVersion,S.VERSION);
 const invalid=structuredClone(trained);invalid.levels.vishunal=49;assert.throws(()=>S.encode(invalid));
});

test('third-character geometry fits all three allies and the enemy queue without overlapping footprints',()=>{
 for(const width of [240,390,900,1500])for(const mobile of [false,true])for(const richterHired of [false,true])for(const scale of [1,2.15]){
  const l=UI.orbitLayout({width,mobile,richterHired,vishunalHired:true,metaScale:scale,richterScale:scale,metaCount:60,richterCount:60,grounded:true,enemyCount:3});
  assert.ok(l.zoom>0&&l.zoom<=1&&l.viewWidth<=width+1e-9&&l.viewHeight<=l.heightLimit+1e-9);
  const previous=richterHired?l.richter:l.meta;assert.ok(previous.x+previous.footprint/2<l.vishunal.x-l.vishunal.footprint/2);
  assert.ok(l.vishunal.x+l.vishunal.footprint/2<l.enemyX-l.enemyWidth/2);
  assert.ok(l.vishunal.y+l.vishunal.footOffset>l.groundY);assert.ok(l.vishunal.y+l.vishunal.extentY/2+12<=l.height);
 }
});

test('dog can be selected, missiles launch for every repeated attack and all combat effects reset on pause',()=>{
 const s=prepared(25);s.purchasedPerks.vishunal=['mad-dog'];const h=harness(s);
 assert.equal(h.get('vishunal-combatant').hidden,false);assert.equal(h.get('party-capacity').textContent,'/ 3');
 h.click('vishunal-select');h.click('attack');h.advance(200);
 assert.ok(!h.get('vishunal-combatant').classList.contains('bursting'));assert.equal(h.get('vishunal-projectiles').children.length,1);
 h.advance(640);assert.ok(h.get('hit-effects').children.length>0);assert.ok(h.get('explosions').children.length>0);
 h.click('pause');assert.equal(h.get('vishunal-projectiles').children.length,0);assert.ok(!h.get('vishunal-combatant').classList.contains('bursting'));
});

test('sustained missile volleys stay animated across tick gaps, remain bounded and respect reduced motion',()=>{
 const s=prepared(50);s.actionLevels.vishunal=1000000;s.purchasedPerks.vishunal=['missile-missile','mad-dog'];const h=harness(s);h.advance(2200);
 for(let i=0;i<100;i++){h.advance(20);assert.ok(h.get('vishunal-combatant').classList.contains('bursting'));assert.ok(h.get('vishunal-projectiles').children.length<=FX.MAX_PROJECTILES);}
 h.media.matches=true;h.media.change();h.advance(2000);assert.equal(h.get('vishunal-projectiles').children.length,0);assert.equal(h.get('hit-effects').children.length,0);
});

test('a single missile does not enter rapid pose and all flight effects finish',()=>{
 const s=prepared(25);s.purchasedPerks.vishunal=['mad-dog'];const h=harness(s);h.click('attack');
 h.advance(300);assert.ok(!h.get('vishunal-combatant').classList.contains('bursting'));assert.equal(h.get('vishunal-projectiles').children.length,1);
 h.advance(1000);assert.equal(h.get('vishunal-projectiles').children.length,0);
});
