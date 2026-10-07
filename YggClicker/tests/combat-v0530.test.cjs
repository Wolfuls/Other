'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),N=require('../js/numbers'),{harness}=require('./app-harness.cjs');
const char=id=>D.characters.find(c=>c.id===id);
function ready(ids=['meta'],quest='mohican-solo'){
 const s=E.createState(1000);s.factors=1e15;s.questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,true]));
 for(const id of ids)s.levels[id]=1;E.setFormation(s,quest,ids);if(quest!==s.sessionId)E.selectSession(s,quest);E.ensureEnemies(s);return s;
}
function rng(seed=8731){return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
test('new combat base values, physical accuracy and Max mental attack',()=>{
 assert.deepEqual(D.characters.map(c=>[c.id,c.accuracy.flat,c.accuracy.dice,c.action]),[['meta',14,1,15],['richter',14,1,14],['vishunal',12,1,17],['tordeliese',20,1,13],['max',4,2,19],['waku',14,1,21],['jewel',16,1,11]]);
 assert.deepEqual(D.sessions.map(q=>[q.evasion.flat,q.resistance]),[[10,2],[2,30],[10,2],[14,4],[9,0]]);
 const s=ready(['max'],'scarecrow'),p=E.attackProfile(s,char('max'));assert.equal(p.mental,true);assert.equal(p.defense,30);assert.equal(p.accuracy.flat,16);assert.equal(p.evasion.flat,7);
});
test('lower median includes enemy slots, downed allies and respawning enemies; zero base action is excluded from threshold',()=>{
 const s=ready();assert.equal(E.actionThreshold(s),22);
 const squad=ready(['meta','richter','vishunal','tordeliese','waku']);assert.equal(E.actionThreshold(squad),28);
 squad.health.richter={hp:-3,status:'dying',regenSeconds:0};const e=squad.enemies[0];e.hp=0;e.respawnSeconds=5;
 assert.equal(E.actionThreshold(squad),28);
 const robot=ready(['meta'],'scarecrow');assert.equal(E.actionThreshold(robot),30);assert.equal(E.enemyActionPower(robot),0);
});
test('action level bonus includes flat party support, and each second rolls two fresh dice',()=>{
 const s=ready(['meta','max']);s.actionLevels.max=50;s.armorLevels.max=50;s.purchasedPerks.max=['plot-armor'];s.actionLevels.meta=10;
 assert.equal(E.actionPower(s,char('meta')),28.5);assert.equal(E.actionPower(s,char('meta'),10),23.5);
 const a=ready(['meta'],'scarecrow');a.questLevels.scarecrow=100;a.hp=E.getSession(a).hp;a.enemies=null;E.ensureEnemies(a);
 E.advance(a,.99,()=>.5);assert.equal(a.actionPoints.meta,0);
 E.advance(a,.01,()=>.5);assert.equal(a.actionPoints.meta,16); // 8+4+4, threshold 30
 E.advance(a,1,()=>.2);assert.equal(a.actionPoints.meta,28); // plus 8+2+2
});
test('challenge level resets only its battle, leaves ally wounds and other sessions untouched',()=>{
 const s=ready(['meta','richter'],'mohicans');s.levels.waku=1;E.setFormation(s,'scarecrow',['waku']);
 s.questLevels.mohicans=8;s.actionPoints.meta=25;s.actionPoints.richter=18;s.actionPoints.waku=7;
 s.health.meta={hp:-2,status:'dying',regenSeconds:2};const beforeHealth=structuredClone(s.health);
 s.enemies[1].hp=2;s.enemies[1].poisonDamage=4;s.enemies[1].actionPoints=17;s.enemies[1].defensePenalty=3;s.enemies[1].accuracyPenalty=15;s.enemies[1].pendingAttack={targetId:'richter',remaining:.2,count:2};E.selectEnemy(s,s.enemies[1].id);
 const other=E.battleSnapshot(E.battleContext(s,'scarecrow'));s.sessionStates.scarecrow=other;
 assert.ok(E.setQuestLevel(s,'mohicans',4));assert.deepEqual(s.health,beforeHealth);assert.equal(s.actionPoints.meta,0);assert.equal(s.actionPoints.richter,0);assert.equal(s.actionPoints.waku,7);assert.deepEqual(s.sessionStates.scarecrow,other);
 for(const e of s.enemies){assert.equal(e.hp,E.getSession(s).hp);assert.equal(e.poisonDamage,0);assert.equal(e.actionPoints,0);assert.equal(e.pendingAttack,null);assert.equal(e.defensePenalty,0);assert.equal(e.accuracyPenalty,0);}assert.equal(s.focusedEnemyId,null);
 const same=structuredClone(s);assert.ok(E.setQuestLevel(s,'mohicans',4));assert.deepEqual(s,same);
});
test('all new tracks buy once, buy ten atomically, sell and survive save/load',()=>{
 const s=ready();for(const t of D.statUpgrades){assert.equal(E.statCost(s,char('meta'),t.id),8);assert.ok(E.buyStat(s,'meta',t.id));const quote=E.purchaseQuote(s,t.id,'meta',10);assert.ok(quote.valid);const before=s.factors;assert.ok(E.buyMany(s,t.id,'meta',10));assert.equal(s.factors,before-quote.cost);assert.equal(s[t.field].meta,11);assert.ok(E.sell(s,t.id,'meta'));assert.equal(s[t.field].meta,10);}
 assert.equal(E.maxHP(s,char('meta')),40);assert.equal(E.armor(s,char('meta')),12);assert.equal(E.armor(s,char('meta'),true),16);
 assert.deepEqual(S.decode(S.encode(s)),s);
 const poor=ready();poor.factors=8;const before=structuredClone(poor);assert.equal(E.buyMany(poor,'vitality','meta',10),false);assert.deepEqual(poor,before);
});
test('HP training does not heal; recovery and revival use raised maximum',()=>{
 const s=ready();s.vitalityLevels.meta=10;s.health.meta={hp:19,status:'active',regenSeconds:0};s.formations[s.sessionId]=[];
 E.advance(s,6,()=>.5);assert.equal(s.health.meta.hp,20);assert.equal(E.maxHP(s,char('meta')),40);
 s.health.meta={hp:-5,status:'dying',regenSeconds:0};assert.ok(E.revive(s,'meta'));assert.equal(s.health.meta.hp,40);
 E.buyStat(s,'meta','vitality');assert.equal(s.health.meta.hp,40);assert.equal(E.maxHP(s,char('meta')),42);
});
test('accuracy and evasion upgrades scale completed rolls including SS and critical/fumble',()=>{
 const s=ready(['max']);s.accuracyLevels.max=10;s.evasionLevels.max=5;
 assert.equal(E.combatRoll(E.accuracySpec(s,char('max')),()=>.5).total,48);
 assert.equal(E.combatRoll(E.evasionSpec(s,char('max'),true),()=>.5).total,36);
 const values=[.999,.5];assert.equal(E.combatRoll({flat:10,dice:1,bonusRate:1},()=>values.shift()).total,40);
 const f=[0,.5];assert.equal(E.combatRoll({flat:10,dice:1,bonusRate:1},()=>f.shift()).total,14);
});
test('misses cause no damage, poison, AP loss or other debuffs; unselected player remains guaranteed',()=>{
 const s=ready(['waku'],'mohicans');s.selectedCharacterId='waku';s.levels.waku=100;s.purchasedPerks.waku=['expanded-hurtbox','invisible-wall','vanishing-hitbox'];
 s.questLevels.mohicans=100;E.setQuestLevel(s,'mohicans',100);const before=structuredClone(s.enemies);
 const events=E.click(s,()=>.5);assert.equal(events.filter(e=>e.type==='attack').length,1);assert.equal(events[0].hit,false);assert.deepEqual(s.enemies,before);
 s.selectedCharacterId=null;assert.equal(E.click(s,()=>.5)[0].hit,true);
});
test('single area roll checks each of three evaders independently and applies defense before halving',()=>{
 const s=ready(['meta'],'mohicans');s.levels.meta=75;s.purchasedPerks.meta=['metal-storm'];s.selectedCharacterId='meta';
 const events=E.click(s,()=>.5).filter(e=>e.type==='attack');assert.equal(events.length,3);assert.ok(events.every(e=>e.hit&&e.areaAttack));assert.equal(new Set(events.map(e=>e.enemyId)).size,3);assert.equal(new Set(events.map(e=>e.damage)).size,1);
});
test('enemy combat stats grow 1.05, HP/armor/resistance/SS 1.1, reward 1.25, cost 1.1',()=>{
 const s=ready(['meta'],'dementor');s.questLevels.dementor=5;const q=E.getSession(s);
 assert.equal(q.hp,N.geometric(100,1.1,4));assert.equal(q.defense,N.geometric(3,1.1,4));assert.equal(q.resistance,N.geometric(4,1.1,4));assert.equal(q.reward,N.geometric(10,1.25,4));
 for(const key of ['attack','accuracy','evasion'])assert.equal(q[key].multiplier,1.05**4);assert.equal(q.ss.multiplier,1.1**4);
 assert.equal(E.enemyActionPower(s),N.geometric(7,1.05,4));assert.equal(E.questCost(s),N.geometric(100,1.1,4));
 s.upgrades.reward=1;assert.ok(E.reward(s)-q.reward>=1);
});
test('enemy damage lands after windup; multiple actions are represented in one windup',()=>{
 const s=ready(['meta']);s.enemies[0].actionPoints=100;s.actionLevels.meta=0;
 const wind=E.advance(s,1,()=>.5).find(e=>e.type==='enemyWindup');assert.ok(wind);assert.ok(wind.count>=3);assert.equal(s.health.meta.hp,20);
 E.advance(s,.71,()=>.5);assert.equal(s.health.meta.hp,20);E.advance(s,.01,()=>.5);assert.ok(s.health.meta.hp<20);
});
test('save validation retains new tracks, pending count and large AP; rejects invalid training',()=>{
 const s=ready();s.actionPoints.meta=155;s.enemies[0].pendingAttack={targetId:'meta',remaining:.3,count:3};s.enemies[0].actionPoints=1030;
 assert.deepEqual(S.decode(S.encode(s)),s);
 const invalid=structuredClone(s);invalid.accuracyLevels.meta=-1;assert.throws(()=>S.decode(S.encode(invalid)));
 const old=structuredClone(s);for(const t of D.statUpgrades)delete old[t.field];old.actionPoints.meta=20;old.enemies[0].actionPoints=0;
 const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:29,state:old}));assert.equal(migrated.accuracyLevels.meta,0);assert.equal(migrated.levels.meta,1);
});
test('one-second results equal small-step live progress, no forecast mutation',()=>{
 const a=ready(['meta','max'],'mohicans'),b=structuredClone(a),r1=rng(),r2=rng();
 E.advance(a,20,r1);for(let i=0;i<80;i++)E.advance(b,.25,r2);assert.deepEqual(a,b);
 const before=structuredClone(a),income=E.expectedIncome(a);assert.ok(Number.isFinite(income.factorsPerSecond));assert.deepEqual(a,before);
});
test('ability dialog matches six-track layout and omits removed metrics',()=>{
 const s=ready(['meta']);s.paused=true;const h=harness(s,undefined,{combatRandom:()=>.5});
 const html=h.get('character-list').innerHTML;assert.match(html,/ability-dialog-meta/);assert.match(html,/最大HP/);assert.match(html,/命中判定/);assert.doesNotMatch(html,/DPS期待値|秒間攻撃回数|character-performance/);
 const node={disabled:false,dataset:{ability:'meta'}};h.get('character-list').listeners.get('click')({target:{closest:sel=>sel==='[data-ability]'?node:null}});assert.equal(h.get('ability-dialog-meta').open,true);
 assert.match(h.get('ability-value-vitality-meta').textContent,/20/);
});
for(const id of ['meta','richter','vishunal','tordeliese','waku','max'])test(id+': accuracy, elemental armor and offscreen combat remain saveable',()=>{
 const s=ready([id],'scarecrow');s.selectedCharacterId=id;s.levels[id]=50;s.actionLevels[id]=30;s.vitalityLevels[id]=3;s.armorLevels[id]=5;s.accuracyLevels[id]=10;s.evasionLevels[id]=10;
 const p=E.attackProfile(s,char(id));assert.equal(p.defense,id==='max'?30:35);
 const e=E.click(s,()=>.5).find(e=>e.type==='attack');assert.equal(e.hit,true);assert.ok(e.damage>0);
 const before=structuredClone(s);E.selectSession(s,'mohican-solo');E.advance(s,12,rng());assert.ok(s.totalDamage>=before.totalDamage);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('hit probability includes recursive critical/fumble and ties evade',()=>{
 assert.equal(E.opposedHitChance({flat:10,dice:0},{flat:10,dice:0}),0);
 assert.equal(E.opposedHitChance({flat:11,dice:0},{flat:10,dice:0}),1);
 const accuracy={flat:14,dice:1,bonusRate:.5},evasion={flat:12,dice:2},r=rng();let hits=0;
 for(let i=0;i<20000;i++)hits+=E.combatRoll(accuracy,r).total>E.combatRoll(evasion,r).total;
 assert.ok(Math.abs(hits/20000-E.opposedHitChance(accuracy,evasion))<.015);
});
test('extreme allied action levels stay bounded and aggregated misses never poison enemies',()=>{
 const s=ready(['tordeliese'],'mohicans');s.levels.tordeliese=150;s.actionLevels.tordeliese=100000;s.purchasedPerks.tordeliese=['greedy-gale','retreating-wind','severing-storm','demonic-hammer','annihilation'];
 s.questLevels.mohicans=200;E.setQuestLevel(s,'mohicans',199);E.setQuestLevel(s,'mohicans',200);s.actionPoints.tordeliese=1e13;const before=structuredClone(s.enemies),events=E.advance(s,1,rng());
 assert.ok(events.length<100);assert.ok(events.some(e=>e.type==='attack'&&e.hit===false));assert.ok(s.enemies.every(e=>e.poisonDamage===0));assert.ok(s.enemies.every((e,i)=>e.hp===before[i].hp));assert.deepEqual(S.decode(S.encode(s)),s);
});
test('new-stat purchases and quest resets are atomic when quoted and cannot mutate live AP or health',()=>{
 const s=ready(['meta'],'mohicans');s.questLevels.mohicans=2;s.actionPoints.meta=12;s.enemies[0].hp=9;s.health.meta.hp=7;
 const before=structuredClone(s);assert.ok(E.purchaseQuote(s,'quest','mohicans',10).valid);assert.deepEqual(s,before);
 assert.ok(E.buyMany(s,'quest','mohicans',10));assert.equal(s.actionPoints.meta,0);assert.equal(s.health.meta.hp,7);assert.equal(s.questLevels.mohicans,12);assert.equal(s.enemies[0].hp,E.getSession(s).hp);
 assert.ok(E.sell(s,'quest','mohicans'));assert.equal(s.enemies[0].hp,E.getSession(s).hp);assert.equal(s.health.meta.hp,7);
});
test('MISS playback keeps the attack pose but suppresses impact sparks and enemy recoil',()=>{
 const s=ready(['meta'],'mohicans');s.selectedCharacterId='meta';s.questLevels.mohicans=80;E.setQuestLevel(s,'mohicans',80);
 const h=harness(s,undefined,{combatRandom:()=>.5});h.click('attack');h.advance(900);
 assert.ok(h.get('damage-floats').children.some(n=>n.textContent==='MISS'));
 assert.equal(h.get('hit-effects').children.length,0);assert.equal(h.get('enemy-art').classList.contains('enemy-hit'),false);
});



