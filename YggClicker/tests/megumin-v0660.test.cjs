'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip,enable}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs'),FX=require('../js/combat-effects'),F=require('../js/matchup');
const meg=()=>character('megumin'),random=()=>.4;
function battle(ids=['megumin'],q='scarecrow'){const s=ready(ids,q);s.forecast=true;E.selectCharacter(s,'megumin');return s;}
function act(s){s.enemies.forEach(e=>e.evasionFailure=true);return E.click(s,random);}
function cast(s){s.health.megumin.magicLevel=E.magicState(s,meg()).maximum;return act(s).filter(e=>e.type==='attack');}
function turn(s){s.actionPoints.megumin=E.actionThreshold(s);return E.advance(s,1,random);}
function incoming(s,attack=10){const e=s.enemies[0];e.pendingAttack={targetId:'megumin',remaining:.01,count:1,profile:{accuracySpec:{flat:-100,dice:0},evasionDice:{flat:100,dice:0},attack:{dice:0,flat:attack},reduction:0,shield:0,hitLogRatio:0,damageLogRatio:0,damageScaleLog:0}};return E.advance(s,.01,random).find(e=>e.type==='enemyAttack');}

test('Megumin keeps her base stats; six magic perks replace fixed bonuses and level 200 area exemption',()=>{
 const c=meg();assert.deepEqual([c.cost,c.powerCost,c.dice,c.flat,c.action,c.maxHP,c.defense,c.resistance],[500,100,4,1,13,18,1,6]);assert.deepEqual(c.actionDice,{flat:6,dice:2});assert.deepEqual(c.accuracy,{flat:13,dice:1});assert.equal(c.magicPower,11);assert.equal(c.perks.length,10);
 assert.deepEqual(c.perks.filter(p=>p.awakeningLevel).map(p=>[p.name,p.awakeningLevel]),[['広域爆発',1],['爆風障壁',2],['高速詠唱',3]]);
 assert.deepEqual(c.perks.filter(p=>p.magicLevel).map(p=>[p.level,p.magicLevel,Math.round(p.runawayPressure*600)]),[[10,1,1],[25,2,3],[50,3,5],[100,4,7],[150,5,9],[200,6,11]]);
 assert.ok(c.perks.every(p=>!p.flat&&!p.diceBonus&&!p.noAreaPenalty&&!p.perkAttackAmplifier&&!p.actionBonus&&!p.blastReduction));
});

test('the highest enabled and eligible magic perk sets the cap without stacking; OFF clamps stored charge',()=>{
 const s=battle();assert.deepEqual(E.magicState(s,meg()),{current:1,maximum:1});enable(s,'megumin','crimson-flame','king-of-worlds','laws-of-heaven');
 s.health.megumin.magicLevel=4;assert.deepEqual(E.magicState(s,meg()),{current:4,maximum:4});
 E.togglePerk(s,'megumin','laws-of-heaven',false);assert.equal(s.health.megumin.magicLevel,3);
 E.togglePerk(s,'megumin','king-of-worlds',false);assert.equal(s.health.megumin.magicLevel,2);
 E.togglePerk(s,'megumin','crimson-flame',false);assert.equal(E.magicState(s,meg()).maximum,1);assert.equal(s.health.megumin.magicLevel,1);
 enable(s,'megumin','eternal-hammer');assert.equal(E.magicState(s,meg()).maximum,7);E.togglePerk(s,'megumin','explosion-girl',false);assert.equal(E.magicState(s,meg()).maximum,0);
});

test('current magic adds exactly 11 per level to attack and physical accuracy, never to SS',()=>{
 const s=battle();enable(s,'megumin','eternal-hammer');
 for(let level=1;level<=7;level++){s.health.megumin.magicLevel=level;assert.deepEqual(E.stats(s,meg()),{dice:4,flat:1+level*11});assert.equal(E.accuracySpec(s,meg()).flat,13+level*11);assert.equal(E.accuracySpec(s,meg(),true).flat,14);}
});

test('manual actions charge Lv2, Lv3, Lv4 then attack on the fourth action and reset magic',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');s.enemies[0].hp=1e8;const hp=s.enemies[0].hp;
 for(let level=2;level<=4;level++){const events=act(s);assert.equal(events.filter(e=>e.type==='magicCharge').length,1);assert.ok(!events.some(e=>e.type==='attack'));assert.equal(s.health.megumin.magicLevel,level);assert.equal(s.enemies[0].hp,hp);assert.equal(E.isStunned(s,'megumin'),false);}
 assert.ok(act(s).some(e=>e.type==='attack'));assert.ok(s.enemies[0].hp<hp);assert.equal(s.health.megumin.magicLevel,undefined);assert.equal(s.health.megumin.stunTurns,5);
 assert.deepEqual(E.click(s,random),[]);assert.equal(s.health.megumin.stunTurns,5);
});

test('no enabled magic perk attacks immediately at magic one and still rests five paid turns',()=>{
 const s=battle();assert.equal(cast(s).length,1);assert.equal(s.health.megumin.stunTurns,5);
 for(const remaining of [4,3,2,1,0]){const events=turn(s);assert.ok(events.some(e=>e.type==='stunSkip'&&e.remaining===remaining));assert.ok(!events.some(e=>e.type==='attack'&&e.actorId==='megumin'));}
 assert.ok(turn(s).some(e=>e.type==='attack'&&e.actorId==='megumin'));
});

test('automatic paid turns implement the full three-charge, cast, five-rest cycle',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');s.enemies[0].hp=1e8;
 for(let i=1;i<=3;i++){assert.ok(turn(s).some(e=>e.type==='magicCharge'&&e.magicLevel===i+1));assert.equal(s.health.megumin.magicLevel,i+1);}
 assert.ok(turn(s).some(e=>e.type==='attack'));assert.equal(s.health.megumin.stunTurns,5);
 for(const remaining of [4,3,2,1,0]){turn(s);assert.equal(s.health.megumin.stunTurns,remaining);assert.equal(E.magicState(s,meg()).current,1);}
 assert.ok(turn(s).some(e=>e.type==='magicCharge'&&e.magicLevel===2));
});

test('awakening transitions grant area at 50, ward at 60 and fast chanting at 70',()=>{
 const s=battle();
 for(const [rate,area,ward,action]of [[49,false,0,0],[50,true,0,0],[60,true,5,0],[69.99,true,5,0],[70,true,5,7],[79.99,true,5,7],[80,true,5,8],[0,false,0,0]]){
  s.runaway.megumin.runawayRate=rate;const p=E.attackProfile(s,meg());assert.deepEqual([p.areaAttack,p.blastEvasionPerMagic,E.ownActionBonus(s,meg())],[area,ward,action]);
 }
 assert.equal(E.togglePerk(s,'megumin','quick-chant',false),false);
});

test('fast chanting is added before training scaling and follows suppression without a stray plus one',()=>{
 const s=battle();enable(s,'megumin','crimson-flame');assert.equal(E.ownActionBonus(s,meg()),0);s.levels.megumin=51;s.runaway.megumin.runawayRate=80;
 const actual=E.actionPower(s,meg(),13,false,()=>0); // The shared 80% bonus adds 1 D6, rolled as 1.
 assert.equal(actual,44);assert.ok(E.suppressRunaway(s,'megumin'));assert.equal(E.ownActionBonus(s,meg()),7);assert.equal(E.actionPower(s,meg(),13,false,()=>0),40);
});

test('ward uses consumed magic times five even on an all-miss attack and still rolls damage',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');s.runaway.megumin.runawayRate=60;s.questLevels.scarecrow=10000;E.setQuestLevel(s,'scarecrow',10000);s.health.megumin.magicLevel=4;
 let calls=0;const events=E.click(s,()=>{calls++;return .4;});assert.equal(events.find(e=>e.type==='attack').hit,false);assert.equal(s.health.megumin.blastEvasion,20);assert.equal(s.health.megumin.blastTurns,1);assert.equal(s.health.megumin.magicLevel,undefined);assert.equal(s.health.megumin.stunTurns,5);
 assert.ok(calls>=6);assert.equal(s.health.megumin.blastReduction,undefined);
});

test('ward applies once and expires after one own turn, with stun failure taking priority',()=>{
 const s=battle();enable(s,'megumin','crimson-flame');s.runaway.megumin.runawayRate=60;cast(s);assert.equal(s.health.megumin.blastEvasion,10);
 const p=E.enemyHitProfile(s,s.enemies[0],meg()),hit=E.rollEnemyHit({...p,accuracySpec:{flat:-100,dice:0}},random);assert.ok(hit.hit&&hit.forcedFailure);assert.equal(F.matchup(s,meg()).evadeRate,0);
 const hp=s.health.megumin.hp;incoming(s,4);assert.equal(s.health.megumin.hp,hp-4);assert.equal(s.health.megumin.blastEvasion,undefined);
 const t=battle();enable(t,'megumin','crimson-flame');t.runaway.megumin.runawayRate=60;cast(t);turn(t);assert.equal(t.health.megumin.blastEvasion,undefined);assert.equal(t.health.megumin.blastTurns,undefined);assert.equal(t.health.megumin.stunTurns,4);
});

test('area explosion grants one magic-based ward; the Lv200 attack still has the common half penalty',()=>{
 const s=battle(['megumin'],'mohicans');enable(s,'megumin','eternal-hammer');s.runaway.megumin.runawayRate=60;s.enemies.forEach(e=>e.hp=1e8);
 const p=E.attackForecastProfile(s,meg());assert.equal(p.noAreaPenalty,false);assert.equal(cast(s).length,3);assert.equal(s.health.megumin.blastEvasion,35);
 const half=E.profileAverage(s,{...p,dice:0,flat:20,accuracy:null,defense:0,damageLogRatio:0,damageScaleLog:0});
 const full=E.profileAverage(s,{...p,dice:0,flat:20,accuracy:null,defense:0,noAreaPenalty:true,damageLogRatio:0,damageScaleLog:0});assert.equal(full,half*2);
});

test('GM donations progress one charge each and cannot bypass the rest after casting',()=>{
 const s=battle(['megumin','max']);enable(s,'megumin','king-of-worlds');s.enemies[0].hp=1e8;
 function donated(){s.actionPoints.max=E.actionThreshold(s);s.actionPoints.megumin=0;return E.advance(s,1,random);}
 for(let i=1;i<=2;i++){const ev=donated();assert.ok(ev.some(e=>e.type==='magicCharge'&&e.magicLevel===i+1&&e.delegatedBy==='max'));assert.ok(!ev.some(e=>e.type==='attack'&&e.actorId==='megumin'));}
 assert.ok(donated().some(e=>e.type==='attack'&&e.actorId==='megumin'));assert.equal(s.health.megumin.stunTurns,5);
 assert.ok(!donated().some(e=>e.type==='attack'&&e.actorId==='megumin'));assert.equal(s.health.megumin.stunTurns,5);
});

test('free-action repeats never erase resting turns; huge AP banks retain the charging cycle',()=>{
 const t=battle(['megumin','max']);enable(t,'megumin','crimson-flame');enable(t,'max','named-npc');t.enemies[0].hp=1e8;t.actionPoints.megumin=E.actionThreshold(t);t.actionPoints.max=0;E.advance(t,1,()=>.7);assert.equal(t.health.megumin.stunTurns,5);
 const s=battle();enable(s,'megumin','king-of-worlds');s.enemies[0].hp=1e50;s.actionPoints.megumin=E.actionThreshold(s)*1000;
 const events=E.advance(s,1,random);assert.equal(events.filter(e=>e.type==='attack'&&e.actorId==='megumin').length,15);assert.equal(events.filter(e=>e.type==='magicCharge').length,30);assert.equal(events.filter(e=>e.type==='stunSkip').length,75);assert.ok(s.actionPoints.megumin>0);
});

test('damage and hit forecasts use the fully charged cast and include charge/rest time without state mutation',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');const before=structuredClone(s.health),p=E.attackForecastProfile(s,meg());assert.equal(p.flat,45);assert.equal(p.accuracy.flat,57);assert.equal(E.attackProfile(s,meg()).flat,12);
 assert.equal(E.averageAttackDamage(s,meg()),E.profileAverage(s,p));assert.ok(Math.abs(E.effectiveAttackRate(s,meg())-E.automaticActionRate(s,meg())/9)<1e-12);assert.deepEqual(s.health,before);
 assert.ok(Math.abs(F.matchup(s,meg()).hitRate-E.T.hit(p.accuracy,p.evasion,p.hitLogRatio).chance)<1e-12);
});

test('charge, stun and new ward survive save/load and off-screen turns; quest changes preserve them without healing',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');act(s);delete s.forecast;const loaded=roundTrip(s);assert.equal(loaded.health.megumin.magicLevel,2);
 loaded.forecast=true;E.selectSession(loaded,'mohican-solo');loaded.actionPoints.megumin=E.actionThreshold(E.battleContext(loaded,'scarecrow'));E.advance(loaded,1,random);assert.equal(loaded.health.megumin.magicLevel,3);
 s.runaway.megumin.runawayRate=60;cast(s);assert.deepEqual(roundTrip(s).health.megumin,s.health.megumin);
 s.questLevels.scarecrow=2;const before=structuredClone(s.health.megumin);E.setQuestLevel(s,'scarecrow',2);assert.deepEqual(s.health.megumin,before);
});

test('schema 46 migration retires old ward effects and perk IDs but preserves progress and stun',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');delete s.forecast;s.runNumber=3;s.previousRunsEarned=555;s.health.megumin.stunTurns=2;s.health.megumin.blastTurns=1;s.health.megumin.blastReduction=90;s.health.megumin.blastEvasion=90;s.perkEnabled.megumin['blast-wall']=true;s.unlockedPerks.megumin.push('blast-wall');
 const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:46,state:s}));assert.equal(loaded.factors,s.factors);assert.equal(loaded.runNumber,3);assert.equal(loaded.previousRunsEarned,555);assert.equal(loaded.health.megumin.stunTurns,2);assert.equal(loaded.health.megumin.blastEvasion,undefined);assert.equal(loaded.health.megumin.blastReduction,undefined);assert.equal(loaded.perkEnabled.megumin['laws-of-heaven'],true);assert.equal(loaded.perkEnabled.megumin['blast-wall'],undefined);
 assert.deepEqual(roundTrip(loaded).health.megumin,loaded.health.megumin);
});

test('new saves reject invalid charge or ward values and older saves still gain an unhired Megumin',()=>{
 const s=ready(['meta']);for(const k of ['levels','health','runaway','actionPoints','concentration','perkEnabled','purchasedPerks','unlockedPerks'])delete s[k].megumin;
 const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:45,state:s}));assert.equal(loaded.levels.megumin,0);assert.equal(loaded.factors,s.factors);
 const t=battle();for(const bad of [-1,8,1.5]){t.health.megumin.magicLevel=bad;assert.throws(()=>S.encode(t));}delete t.health.megumin.magicLevel;t.health.megumin.blastEvasion=5;assert.throws(()=>S.encode(t));
});

test('UI shows magic/current attack, new awakening names, chant action and the charged pose',()=>{
 const s=battle();enable(s,'megumin','laws-of-heaven');s.health.megumin.magicLevel=2;s.paused=true;const h=harness(s);
 assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.1 / 4');assert.equal(h.get('attack-action').textContent,'詠唱する');assert.ok(h.get('megumin-combatant').classList.contains('charging'));h.openAbility('megumin');assert.match(h.get('magic-summary-megumin').textContent,/魔力 Lv.1 \/ 4/);assert.match(h.get('character-list').innerHTML,/高速詠唱/);assert.doesNotMatch(h.get('character-list').innerHTML,/爆風防壁|各パークの攻撃力補正を2倍/);
 const frames=FX.plan([{type:'magicCharge',actorId:'megumin',magicLevel:1,maximum:3},{type:'attack',actorId:'megumin',count:1,damage:100,hpBefore:200,hpAfter:100}]);assert.equal(frames.reduce((n,f)=>n+f.meguminAttacks,0),1);
});
