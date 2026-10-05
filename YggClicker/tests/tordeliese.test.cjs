'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/data.js'),E=require('../js/engine.js'),B=require('../js/battle-batch.js'),S=require('../js/save.js'),UI=require('../js/display.js'),FX=require('../js/combat-effects.js');
const {harness}=require('./app-harness.cjs'),c=D.characters.find(c=>c.id==='tordeliese');
function setup(level=10,quest='scarecrow'){const s=E.createState(1000);s.levels[c.id]=level;s.selectedCharacterId=c.id;E.selectSession(s,quest);return s;}
function poisoned(level=10,quest='scarecrow'){const s=setup(level,quest);s.purchasedPerks[c.id]=['greedy-gale'];return s;}
function rng(seed=731){return()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}

test('Tordeliese hire, price tracks and paid perk boundaries match requested values',()=>{
 const s=E.createState(1000);s.factors=2499;assert.equal(E.hire(s,c.id),false);s.factors=2500;assert.ok(E.hire(s,c.id));assert.equal(s.factors,0);
 assert.deepEqual(E.stats(s,c),{dice:3,flat:1});assert.equal(E.actionPower(s,c),80);assert.equal(E.hireCost(s,c),500);assert.equal(E.actionCost(s,c),625);
 s.factors=10000;assert.ok(E.hire(s,c.id));assert.equal(E.hireCost(s,c),575);assert.ok(E.buyAction(s,c.id));assert.equal(E.actionCost(s,c),718);
 assert.deepEqual(c.perks.map(p=>[p.level,p.cost]),[[10,30000],[25,300000],[50,3000000],[100,100000000],[150,1000000000]]);
 for(const p of c.perks){s.levels[c.id]=p.level-1;s.factors=p.cost;assert.equal(E.buyPerk(s,c.id,p.id),false);s.levels[c.id]++;s.factors--;
  assert.equal(E.buyPerk(s,c.id,p.id),false);s.factors++;assert.ok(E.buyPerk(s,c.id,p.id));assert.equal(s.factors,0);assert.equal(E.buyPerk(s,c.id,p.id),false);}
 assert.deepEqual(E.stats(s,c),{dice:3,flat:33});assert.equal(E.attackProfile(s,c).poisonDamage,16);
});

test('poison is paid, applies on the first hit, ignores armor and triggers from another attacker',()=>{
 const unpaid=setup();assert.equal(E.click(unpaid,()=>.999).length,1);assert.equal(unpaid.poisonDamage,0);
 const s=poisoned(),events=E.click(s,()=>.999);assert.deepEqual(events.filter(e=>e.type==='attack').map(e=>e.damage),[1,4]);assert.equal(s.hp,35);assert.equal(s.poisonDamage,4);
 assert.equal(events[1].actor,'猛毒');assert.equal(events[1].actorId,null);assert.equal(events[1].poisonTick,true);
 s.levels.meta=1;E.selectCharacter(s,'meta');const ally=E.click(s,()=>.999);assert.deepEqual(ally.map(e=>e.damage),[1,4]);assert.equal(s.hp,30);
 E.selectCharacter(s,null);assert.deepEqual(E.click(s,()=>.999).map(e=>e.damage),[1,4]);assert.equal(s.hp,25);
});

test('direct kills, knockouts and poison kills each clear the status without hitting a fresh enemy',()=>{
 const direct=poisoned();direct.hp=1;const a=E.click(direct,()=>.999);assert.deepEqual(a.map(e=>e.type),['attack','clear']);assert.equal(direct.hp,40);assert.equal(direct.poisonDamage,0);
 const ko=poisoned();ko.hp=5;const b=E.click(ko,()=>0);assert.deepEqual(b.map(e=>e.type),['attack','clear']);assert.equal(b[1].reason,'knockout');assert.equal(ko.poisonDamage,0);
 const dot=poisoned();dot.hp=5;const z=E.click(dot,()=>.999);assert.deepEqual(z.map(e=>e.type),['attack','attack','clear']);assert.equal(z[1].damage,4);assert.equal(z[2].reason,'hp');assert.equal(dot.poisonDamage,0);assert.equal(dot.hp,40);assert.equal(dot.factors,8);
 E.selectCharacter(dot,null);assert.equal(E.click(dot,()=>.999).length,1,'no leftover poison on the replacement');
 const switcher=poisoned();E.click(switcher,()=>.999);E.selectSession(switcher,'dementor');assert.equal(switcher.poisonDamage,0);
});

test('poison never recursively triggers itself, bonus attacks, or damage multipliers',()=>{
 const s=poisoned(25,'dementor');s.purchasedPerks[c.id].push('retreating-wind');let calls=0;
 const events=E.click(s,()=>++calls===1?.92:0);assert.equal(events.filter(e=>e.actorId===c.id).length,3);
 assert.equal(events.filter(e=>e.poisonTick).length,3);assert.equal(calls,10,'one chain sample plus three sets of three dice, no DOT proc rolls');
 assert.deepEqual(events.filter(e=>e.poisonTick).map(e=>e.damage),[4,4,4]);
 const boosted=poisoned(150);boosted.purchasedPerks[c.id]=c.perks.filter(p=>p.id!=='retreating-wind').map(p=>p.id);boosted.questLevels.scarecrow=30;boosted.hp=E.getSession(boosted).hp;boosted.boostSeconds=30;boosted.upgrades.click=2;
 const poison=E.click(boosted,()=>0).find(e=>e.poisonTick);assert.equal(poison.damage,16,'no boost, level or flat upgrade applied to DOT');
 assert.equal(E.attackProfile(boosted,c).ignoreDefense,false);assert.equal(E.attackProfile(boosted,c).penetrationBlocked,true);
 E.selectSession(boosted,'dementor');assert.equal(E.attackProfile(boosted,c).ignoreDefense,true);
});

test('poison upgrades require the infliction perk and higher values override rather than add',()=>{
 const s=setup(150);s.purchasedPerks[c.id]=['annihilation'];assert.equal(E.attackProfile(s,c).poisonDamage,0);
 for(const [ids,expected]of [[['greedy-gale'],4],[['greedy-gale','severing-storm'],8],[['greedy-gale','demonic-hammer'],12],[c.perks.map(p=>p.id),16]]){
  s.purchasedPerks[c.id]=ids;assert.equal(E.attackProfile(s,c).poisonDamage,expected);
 }
 const random=rng();let total=0;for(let i=0;i<100000;i++)total+=E.chainAttackCount(.3,random);
 assert.ok(Math.abs(total/100000-1/.7)<.01);
});

test('80 action points per tick and extra attacks do not consume more action points',()=>{
 const s=poisoned(25);s.purchasedPerks[c.id].push('retreating-wind');assert.equal(E.advance(s,1,()=>0).length,0);assert.equal(s.actionPoints[c.id],80);
 let calls=0;const events=E.advance(s,1,()=>++calls===1?.92:0);assert.equal(events.filter(e=>e.actorId===c.id).length,3);assert.equal(s.actionPoints[c.id],60);
 assert.equal(E.effectiveAttackRate(s,c),.8/.7);
});

test('poison follows only the surviving poisoned victim when another character spills over',()=>{
 const s=poisoned(10,'mohicans');s.hp=20;E.click(s,()=>0);assert.equal(s.poisonDamage,4);
 s.levels.meta=75;s.purchasedPerks.meta=['metal-blade','metal-storm'];E.selectCharacter(s,'meta');const hits=E.click(s,()=>.999);
 assert.equal(hits.filter(e=>e.poisonTick).length,0);assert.equal(s.poisonDamage,0);assert.ok(hits.some(e=>e.continuation));
});

test('poison reward forecast agrees with exact repeated combat and respects target resets',()=>{
 const s=poisoned(),income=E.expectedIncome(s);assert.ok(income.approximate);assert.ok(Math.abs(income.factorsPerSecond-.8)<.002,'40 HP, min 1+4 damage = 8 hits, .8 actions/s, 8 Rd');
 const plain=setup();assert.ok(E.expectedIncome(plain).factorsPerSecond<income.factorsPerSecond/3);
 s.levels.meta=1;const predicted=E.expectedIncome(s).factorsPerSecond,random=rng();const n=50000;
 for(let i=0;i<n;i++){E.selectCharacter(s,random()<.8/1.3?c.id:'meta');E.click(s,random);}
 const observed=s.earned/(n/1.3);assert.ok(Math.abs(observed-predicted)/observed<.025,`${predicted} vs ${observed}`);
});

test('large poison batches are bounded, integer/save-safe, and retain real ending status',()=>{
 for(const quest of ['mohicans','scarecrow','dementor']){
  const s=poisoned(25,quest);s.purchasedPerks[c.id].push('retreating-wind');s.actionLevels[c.id]=100000000;
  E.advance(s,28800,()=>{throw Error('batch must use its bounded sampler');},false);
  assert.ok(s.kills>0);assert.ok(Number.isInteger(s.hp));assert.ok(s.hp<=E.getSession(s).hp);assert.ok([0,4].includes(s.poisonDamage));assert.deepEqual(S.decode(S.encode(s)),s);
 }
 const p={dice:0,flat:100,defense:0,multiplier:1,poisonDamage:4,rate:1};
 const oneShot=B.resolve(20,20,10000,[p]);assert.equal(oneShot.kills,10000);assert.equal(oneShot.hp,20);assert.equal(oneShot.poisonDamage,0);
 const high=poisoned();high.questLevels.scarecrow=100;high.hp=E.getSession(high).hp;assert.ok(E.expectedIncome(high).factorsPerSecond>0);
});

test('schema17 preserves three-character progress, defaults the newcomer, and schema18 persists current poison',()=>{
 const old=E.createState(1000);old.levels.meta=50;old.purchasedPerks.meta=['metal-blade'];old.factors=123456;old.hp=7;
 for(const key of ['levels','actionLevels','actionPoints','purchasedPerks'])delete old[key][c.id];delete old.poisonDamage;
 const restored=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:17,state:old}));assert.equal(restored.factors,123456);assert.equal(restored.hp,7);assert.equal(restored.levels[c.id],0);assert.equal(restored.poisonDamage,0);assert.deepEqual(restored.purchasedPerks.meta,['metal-blade']);
 const current=poisoned();E.click(current,()=>.999);assert.deepEqual(S.decode(S.encode(current)),current);
 for(const invalid of [-1,1,4.5,20,'4',null])assert.throws(()=>S.encode({...current,poisonDamage:invalid}));
});

test('four allies fit the arena and external PNG sheets retain expected grids',()=>{
 for(const width of [320,780,1400]){const l=UI.orbitLayout({width,grounded:true,metaHired:true,richterHired:true,vishunalHired:true,tordelieseHired:true,metaCount:0,richterCount:0,enemyCount:3,availableHeight:340});
  assert.ok(l.viewWidth<=width+.001);assert.ok(l.tordeliese.x>l.vishunal.x);assert.ok(l.tordeliese.x+128<l.enemyX-l.enemyWidth/2);assert.ok(l.tordeliese.y+128<=l.height);
 }
 for(const [file,w,h]of [['tordeliese-poses-v1.png',1664,1248],['tordeliese-tendril-v1.png',512,512]]){const png=fs.readFileSync(path.join(__dirname,'../img',file));assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);}
});

test('attached tentacles vary direction during bursts, clear on pause, and DOT adds no limbs',()=>{
 const s=poisoned();s.actionLevels[c.id]=100;s.factors=1e6;const h=harness(s);h.click('tordeliese-select');h.click('attack');
 assert.equal(h.get('tordeliese-tendrils').children.length,1);const limb=h.get('tordeliese-tendrils').children[0];assert.equal(limb.dataset.attached,'true');const x=limb.style.left,y=limb.style.top;
 h.advance(500);assert.equal(limb.style.left,x);assert.equal(limb.style.top,y);assert.equal(h.get('tordeliese-tendrils').children.length,1);
 h.advance(1400);const limbs=h.get('tordeliese-tendrils').children;assert.ok(limbs.length>1);assert.ok(limbs.length<=24);assert.ok(new Set(limbs.map(n=>n.style.getPropertyValue('--tendril-mirror'))).size>1);assert.ok(h.get('tordeliese-combatant').classList.contains('bursting'));
 assert.ok(h.get('damage-floats').children.some(n=>n.textContent.startsWith('猛毒')));h.click('pause');assert.equal(h.get('tordeliese-tendrils').children.length,0);assert.equal(h.get('tordeliese-combatant').classList.contains('bursting'),false);
});

test('poison playback cannot impact before a slow direct hit, and DOT is not another attack pose',()=>{
 const events=[{type:'attack',actorId:'richter',damage:1,hpBefore:5,hpAfter:4},{type:'attack',actorId:null,actor:'猛毒',damage:4,poisonTick:true,hpBefore:4,hpAfter:0},{type:'clear',reward:8,hpAfter:40}];
 const frames=FX.plan(events,{sustainedActors:['richter']});assert.equal(frames.length,2);assert.equal(frames[1].richterAttacks,0);assert.equal(frames[1].tordelieseAttacks,0);
 let now=0,next=0;const timers=new Map(),impacts=[];
 const play=FX.createPlayback({schedule:(fn,delay)=>{const id=++next;timers.set(id,{fn,at:now+delay});return id;},cancel:id=>timers.delete(id),onLaunch:f=>({impact:f.poisonTick?10:100}),onImpact:f=>impacts.push(f.poisonTick?'poison':'direct')});
 play.enqueue(events,{sustainedActors:['richter']});while(timers.size){const [id,t]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];now=t.at;timers.delete(id);t.fn();}
 assert.deepEqual(impacts,['direct','poison']);assert.equal(play.pending,0);
});
