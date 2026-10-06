'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),N=require('../js/numbers'),{harness}=require('./app-harness.cjs');
const character=id=>D.characters.find(c=>c.id===id);
function ready(quest='mohicans'){
 const s=combatFixture(1000);s.levels.meta=1;E.setFormation(s,quest,['meta']);E.selectSession(s,quest);E.selectCharacter(s,'meta');E.ensureEnemies(s);return s;
}
function faces(list){const values=list.map(n=>(n-.5)/6);return ()=>{assert.ok(values.length,'unexpected random call');return values.shift();};}
function strike(s,rng){E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1};return E.advance(s,.1,rng).find(e=>e.type==='enemyAttack');}
test('specified SS, evasion and accuracy values are available for all characters',()=>{
 assert.deepEqual(D.characters.map(c=>[c.id,c.evasion.flat,c.ss.flat,c.ss.dice]),[['meta',9,12,1],['richter',9,12,1],['vishunal',14,9,1],['tordeliese',12,12,1],['max',16,16,2],['waku',16,9,1]]);
 assert.deepEqual(D.sessions.map(q=>[q.accuracy.flat,q.ss.flat,q.ss.dice]),[[10,6,1],[20,7,1],[10,6,1],[10,17,1]]);
});
test('mental attacks compare SS on both sides; reaction and defense apply',()=>{
 const s=ready('dementor');E.setConcentration(s,'dementor',{attack:0,defense:5,reaction:5,action:0});
 let hit=strike(s,faces([3,3]));assert.equal(hit.accuracy.total,20);assert.equal(hit.evasion.total,20);assert.equal(hit.hit,false);assert.equal(hit.mental,true);
 E.setConcentration(s,'dementor',{attack:0,defense:5,reaction:0,action:0});hit=strike(s,faces([3,3,2,2,2,2]));assert.equal(hit.evasion.total,15);assert.equal(hit.damage,2);assert.equal(s.health.meta.hp,18);
 const p=ready();E.setConcentration(p,'mohicans',{attack:0,defense:5,reaction:0,action:0});hit=strike(p,faces([3,3,1,1]));assert.equal(hit.damage,1);assert.equal(hit.mental,false);
});
test('retake rerolls the entire fumbled evasion once and keeps the new result',()=>{
 const s=ready();s.upgrades.retake=1;
 const hit=strike(s,faces([3,1,5,6,2]));assert.equal(hit.evasion.original.total,5);assert.equal(hit.evasion.total,17);assert.equal(hit.evasionReroll,true);assert.equal(hit.hit,false);
 const again=strike(s,faces([3,1,5,1,5,2,2]));assert.equal(again.evasion.fumble,true);assert.equal(again.hit,true);assert.equal(again.damage,2);
});
test('reversal rerolls the entire critical accuracy only once, including mental attacks',()=>{
 for(const quest of ['mohicans','dementor']){const s=ready(quest);s.upgrades.reversal=1;
 const r=strike(s,faces(quest==='mohicans'?[6,6,2,2,3]:[6,6,2,2,5,2,2,2,2]));assert.equal(r.accuracyReroll,true);assert.equal(r.accuracy.original.critical,true);assert.equal(r.accuracy.total,quest==='mohicans'?12:19);}
 const s=ready();s.upgrades.reversal=1;const hit=strike(s,faces([6,2,6,2,3,2,2]));assert.equal(hit.accuracy.critical,true);assert.equal(hit.damage,2);
});
test('bad luck resolves before fighting spirit; HP zero and negative outcomes are lethal',()=>{
 const s=ready();s.health.meta.hp=4;s.upgrades.badLuck=1;s.upgrades.fightingSpirit=1;
 let hit=strike(s,faces([3,3,3,3,2,5]));assert.equal(hit.badLuck,true);assert.equal(hit.damage,2);assert.equal(hit.fightingSpirit,false);assert.equal(s.health.meta.hp,2);assert.equal(s.health.meta.status,'active');
 s.health.meta.hp=2;hit=strike(s,faces([3,3,3,3,2,2]));assert.equal(hit.badLuck,true);assert.equal(hit.fightingSpirit,true);assert.equal(s.health.meta.hp,1);assert.equal(s.health.meta.status,'active');
 s.upgrades.badLuck=0;s.health.meta.hp=4;hit=strike(s,faces([3,3,3,3,2]));assert.equal(hit.fightingSpirit,true);assert.equal(s.health.meta.hp,1);
 s.health.meta.hp=2;hit=strike(s,faces([3,3,3,3,5]));assert.equal(hit.fightingSpirit,false);assert.equal(s.health.meta.hp,-2);assert.equal(s.health.meta.status,'dying');
});
test('a wipe clears every enemy charge and wind-up; self manual attacks remain available',()=>{
 const s=ready();s.health.meta.hp=2;s.enemies.forEach(e=>{e.actionPoints=95;e.pendingAttack={targetId:'meta',remaining:.2};});s.enemies[0].pendingAttack.remaining=.1;
 E.advance(s,.1,faces([3,3,3,3]));assert.ok(s.enemies.every(e=>e.actionPoints===0&&e.pendingAttack===null));
 E.advance(s,30,()=>{throw Error('no enemy dice while wiped');});assert.ok(s.enemies.every(e=>e.actionPoints===0));
 assert.deepEqual(E.click(s),[]);E.selectCharacter(s,null);assert.ok(E.click(s,()=>.4).some(e=>e.type==='attack'));
 const h=harness(s);assert.equal(h.get('attack').disabled,false);h.click('attack');assert.ok(h.saved().clicks>0);
 s.factors=100;E.revive(s,'meta');E.advance(s,.9,()=>.4);assert.ok(s.enemies.every(e=>e.actionPoints===30));
});
test('formation reassignment removes old selections and pending attacks without duplicating the unit',()=>{
 const s=ready();s.levels.richter=1;E.setFormation(s,'scarecrow',['richter']);s.enemies[0].actionPoints=90;s.enemies[0].pendingAttack={targetId:'meta',remaining:.5};s.health.meta.hp=13;
 assert.ok(E.setFormation(s,'scarecrow',['richter','meta']));assert.deepEqual(E.formationIds(s,'mohicans'),[]);assert.deepEqual(E.formationIds(s,'scarecrow'),['richter','meta']);assert.equal(s.selectedCharacterId,null);assert.equal(s.health.meta.hp,13);assert.equal(s.enemies[0].pendingAttack,null);assert.equal(s.enemies[0].actionPoints,0);
 assert.deepEqual(S.decode(S.encode(s)),s);
});
test('concentration is free, capped per quest, saved, and applied before damage level multipliers',()=>{
 const s=ready();s.levels.meta=11;s.factors=99;assert.ok(E.setConcentration(s,'mohicans',{attack:3,defense:2,reaction:2,action:3}));
 const p=E.attackProfile(s,character('meta'));assert.equal(p.flat,3);assert.equal(p.multiplier,2);assert.equal(E.actionPower(s,character('meta')),65);assert.equal(E.attackProfile(s,null,true).flat,0);
 const before=structuredClone(s);for(const bad of [{attack:4,defense:2,reaction:2,action:3},{attack:0,defense:6,reaction:0,action:0},{attack:1.5,defense:0,reaction:0,action:0},{attack:-1,defense:0,reaction:0,action:0}]){assert.equal(E.setConcentration(s,'mohicans',bad),false);assert.deepEqual(s,before);}
 E.setFormation(s,'dementor',['meta']);const other=E.battleContext(s,'dementor');assert.equal(E.actionPower(other,character('meta')),50);assert.equal(E.attackProfile(other,character('meta')).flat,0);assert.equal(s.factors,99);assert.deepEqual(S.decode(S.encode(s)),s);
 const invalid=structuredClone(s);invalid.concentration.mohicans.defense=6;assert.throws(()=>S.encode(invalid));
});
test('schema24 refunds retired purchases once, retains other progress, and rejects invalid legacy counts',()=>{
 const old=ready();old.upgrades={click:3,power:2,reward:4,overkill:1};old.factors=100;delete old.concentration;
 const doc={gameId:D.gameId,schemaVersion:24,state:old},next=S.decode(JSON.stringify(doc));
 assert.equal(next.factors,100+[5,6,7,30,37].reduce((a,b)=>a+b));assert.equal(next.upgrades.reward,4);assert.equal(next.upgrades.overkill,1);assert.ok(!('click'in next.upgrades));assert.ok(!('power'in next.upgrades));assert.deepEqual(S.decode(S.encode(next)),next);
 for(const count of [-1,1.5,Number.MAX_SAFE_INTEGER]){const bad=structuredClone(doc);bad.state.upgrades.click=count;assert.throws(()=>S.decode(JSON.stringify(bad)));}
});
test('new defensive upgrades cost exactly 500 thousand each and unlock only once',()=>{
 for(const id of ['retake','reversal','fightingSpirit','badLuck']){const s=ready();s.factors=499999;assert.equal(E.buyUpgrade(s,id),false);s.factors=500000;assert.ok(E.buyUpgrade(s,id));assert.equal(s.factors,0);s.factors=1e9;assert.equal(E.buyUpgrade(s,id),false);assert.equal(s.factors,1e9);assert.equal(s.upgrades[id],1);}
 assert.equal(E.buyUpgrade(ready(),'click'),false);assert.equal(E.buyUpgrade(ready(),'power'),false);
});
test('allocation buttons and sliders update the live display, preserve currency and enforce remaining budget',()=>{
 const s=ready();s.paused=true;s.factors=123;const h=harness(s);
 const click=(stat,step)=>h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-step][data-concentration]'?{dataset:{concentration:'mohicans',stat,step:String(step)},disabled:false}:null}});
 for(let i=0;i<6;i++)click('defense',1);assert.equal(h.saved().concentration.mohicans.defense,5);assert.equal(h.get('concentration-total-mohicans').textContent,'5 / 10点');
 h.get('quest-list').listeners.get('input')({target:{dataset:{concentration:'mohicans',stat:'attack'},type:'range',value:'10'}});
 assert.equal(h.saved().concentration.mohicans.attack,5);assert.equal(h.get('concentration-total-mohicans').textContent,'10 / 10点');assert.equal(h.saved().factors,123);
 click('defense',-1);click('action',1);assert.equal(h.get('concentration-value-mohicans-action').textContent,'1');assert.equal(h.get('action-bonus-meta').textContent,'55');
});
test('self attack control becomes usable when every selected ally is incapacitated',()=>{
 const s=ready();s.health.meta={hp:-5,status:'dying',regenSeconds:0};const h=harness(s);assert.equal(h.get('attack').disabled,true);
 h.click('select-self');assert.equal(h.get('attack').disabled,false);assert.equal(h.saved().selectedCharacterId,null);h.click('attack');h.advance(650);assert.ok(h.get('damage-floats').children.length>0);
});
test('fumble penalty dice do not create new criticals or fumbles',()=>{
 assert.deepEqual(E.combatRoll({flat:12,dice:1},faces([1,6])),{total:7,dice:[1,-6],critical:false,fumble:true});
});
test('defensive upgrades and concentration keep multi-session live and offline timing identical',()=>{
 const s=ready();s.levels.richter=1;s.levels.max=1;E.setFormation(s,'dementor',['richter','max']);s.upgrades.retake=1;s.upgrades.reversal=1;s.upgrades.badLuck=1;s.upgrades.fightingSpirit=1;
 E.setConcentration(s,'mohicans',{attack:3,defense:3,reaction:2,action:2});E.setConcentration(s,'dementor',{attack:0,defense:5,reaction:5,action:0});
 const rng=()=>{let x=3456;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};
 const one=structuredClone(s),split=structuredClone(s);E.advance(one,120,rng(),false);const r=rng();for(let i=0;i<1200;i++)E.advance(split,.1,r,false);
 for(const k of ['hp','kills','earned','actionPoints'])assert.deepEqual(split[k],one[k]);for(const c of D.characters){assert.equal(split.health[c.id].hp,one.health[c.id].hp);assert.equal(split.health[c.id].status,one.health[c.id].status);}
 assert.deepEqual(S.decode(S.encode(one)),one);
});
