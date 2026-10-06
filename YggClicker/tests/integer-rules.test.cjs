const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),B=require('../js/battle-batch.js'),N=require('../js/numbers.js');
test('minimum 1 is applied once to total level bonus, not once per purchase',()=>{
 const s=combatFixture();
 for(const [level,reward]of [[0,3],[1,4],[2,4],[5,4],[10,6],[50,18]]){s.upgrades.reward=level;assert.equal(E.reward(s),reward);}
 const c=D.characters.find(c=>c.id==='richter');s.levels.richter=1;
 for(const [level,power]of [[0,35],[1,38],[2,42],[5,52],[10,70]]){s.concentration[s.sessionId].action=level;assert.equal(E.actionPower(s,c),power);}
 assert.equal(N.delta(-.4),-1);assert.equal(N.delta(0),0);assert.equal(N.delta(4.9),4);
});

test('quest curves and prices use floor with one minimum cumulative correction',()=>{
 const s=combatFixture();const examples=[[1,20,3,100],[2,22,4,110],[3,24,4,121],[4,26,5,133]];
 for(const [level,hp,reward,cost]of examples){s.questLevels.mohicans=level;assert.equal(E.getSession(s).hp,hp);assert.equal(E.reward(s),reward);assert.equal(E.questCost(s),cost);}
 s.levels.meta=1;assert.equal(E.hireCost(s,D.characters[0]),8);s.levels.meta=2;assert.equal(E.hireCost(s,D.characters[0]),9);s.levels.meta=3;assert.equal(E.hireCost(s,D.characters[0]),10);
 s.questLevels.mohicans=1;s.hp=1;s.factors=100;E.buyQuest(s,'mohicans');assert.equal(s.hp,1);
});
test('all actual online and offline balances/HP/action points are integers, rates and clocks retain decimals',()=>{
 const s=combatFixture(1000);s.levels={meta:23,richter:50,vishunal:50};s.actionLevels={meta:10,richter:90,vishunal:90};s.upgrades.reward=1;s.upgrades.overkill=1;s.purchasedPerks.richter=['bom-ber'];s.purchasedPerks.vishunal=['missile-missile','mad-dog'];
 for(const seconds of [.35,1,2.6,10000]){E.advance(s,seconds,()=>.999);for(const value of [s.factors,s.earned,s.totalDamage,s.hp,...Object.values(s.actionPoints)])assert.ok(Number.isInteger(value));assert.ok(s.hp>0||E.isWaiting(s));assert.doesNotThrow(()=>S.encode(s));}
 assert.ok(s.actionClock>0&&s.actionClock<1);assert.ok(E.attackRate(s,D.characters[0])%1!==0);
});


test('schema13 fractional saves migrate once, retain levels/settings, and adjust HP to floored quest capacity',()=>{
 const old=combatFixture(1000);old.factors=123.9;old.earned=456.7;old.totalDamage=89.8;old.levels.meta=20;old.actionPoints.meta=33.3;old.questLevels.mohicans=3;old.hp=7.5;old.sceneSeconds=123.5;old.actionClock=.3;
 const imported=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:13,state:old}));
 assert.equal(imported.factors,123);assert.equal(imported.earned,456);assert.equal(imported.totalDamage,89);assert.equal(imported.actionPoints.meta,33);assert.equal(imported.hp,12);assert.equal(imported.questLevels.mohicans,3);assert.equal(imported.sceneSeconds,123.5);assert.equal(imported.actionClock,.3);
 assert.deepEqual(S.decode(S.encode(imported)),imported);assert.throws(()=>S.encode({...imported,factors:.5}));
});
