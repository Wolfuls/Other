'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');

test('allies use their own base action power with integer one-second charges; new games start at zero',()=>{
 const s=combatFixture(1000);assert.equal(s.factors,0);
 for(const c of D.characters){const action={meta:50,richter:35,vishunal:60,tordeliese:80,max:50,waku:75}[c.id];s.levels[c.id]=1;assert.equal(c.action,action);assert.equal(E.actionPower(s,c),action);assert.equal(E.attackRate(s,c),action/100);}
 s.questLevels.mohicans=50;s.hp=E.getSession(s).hp;assert.equal(E.advance(s,1,()=>.999).filter(e=>e.type==='attack').length,0);
 const attacks=E.advance(s,1,()=>.999).filter(e=>e.type==='attack');
 assert.deepEqual(attacks.map(e=>e.actorId),['meta','vishunal','tordeliese','tordeliese']);assert.deepEqual(s.actionPoints,{meta:0,richter:70,vishunal:20,tordeliese:60,max:0,waku:0});const next=E.advance(s,1,()=>.999).filter(e=>e.type==='attack');assert.deepEqual(next.map(e=>e.actorId),['richter','tordeliese']);assert.equal(s.actionPoints.richter,5);
});

test('quest roster has independent HP, rewards, defense and level growth',()=>{
 const s=combatFixture(1000);
 assert.deepEqual(D.sessions.map(q=>[q.id,q.hp,q.defense,q.reward]),[['mohican-solo',20,0,2],['scarecrow',35,35,10],['mohicans',20,0,3],['dementor',100,3,10]]);
 for(const q of D.sessions)s.questLevels[q.id]=3;
 assert.deepEqual(D.sessions.map(q=>[E.getSession(s,q.id).hp,E.getSession(s,q.id).defense,E.getSession(s,q.id).reward]),[[24,0,3],[42,42,14],[24,0,4],[121,4,14]]);
 s.factors=1000;s.hp=7;s.batchHpFraction=.25;
 assert.equal(E.buyQuest(s,'scarecrow'),true);assert.equal(s.hp,7);assert.equal(s.batchHpFraction,.25);assert.equal(s.sessionId,'mohicans');
 assert.equal(moveTestParty(s,'scarecrow'),true);assert.equal(s.hp,E.getSession(s).hp);assert.equal(s.batchHpFraction,0);
 assert.equal(moveTestParty(s,'dementor'),true);assert.equal(s.hp,121);assert.equal(E.getSession(s).defense,4);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('high defense keeps minimum damage; Metal Blade bypasses it; overflow pays armor for every new enemy',()=>{
 const s=combatFixture();moveTestParty(s,'scarecrow');
 E.click(s,()=>0);assert.equal(s.hp,34);
 s.levels.meta=50;s.selectedCharacterId='meta';s.purchasedPerks.meta=['metal-blade'];
 const before=s.hp;E.click(s,()=>0);assert.equal(before-s.hp,18);
 s.questLevels.mohicans=3;moveTestParty(s,'mohicans');s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];
 E.click(s,()=>.999); // 177 raw; six clears cost 28 each, then 9 - 2 = 7 damage.
 assert.equal(s.kills,3);assert.equal(s.hp,0);assert.equal(s.factors,12);
});

test('schema 14 preserves paid progress and converts remaining enemy health exactly once',()=>{
 const old=combatFixture(1000);old.questLevels={mohicans:3};old.hp=7;old.factors=12345;old.levels.richter=50;old.actionLevels.richter=12;old.actionPoints.richter=37;old.purchasedPerks.richter=['bom-ber'];old.options.showOrbits=false;
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:14,state:old}));
 assert.equal(s.hp,12);assert.deepEqual(s.questLevels,{'mohican-solo':1,mohicans:3,scarecrow:1,dementor:1});
 for(const key of ['factors','levels','actionLevels','actionPoints','purchasedPerks','options'])assert.deepEqual(s[key],old[key]);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('quest UI switches enemy artwork, defense, HP and reward; formula minimum note stays separate',()=>{
 const s=combatFixture(1000);s.paused=true;s.levels.meta=2;s.selectedCharacterId='meta';const h=harness(s);
 const choose=id=>h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-session]'?{dataset:{session:id}}:null}});
 choose('scarecrow');assert.equal(h.saved().sessionId,'scarecrow');assert.equal(h.get('enemy-art').classList.contains('enemy-placeholder'),false);
 assert.equal(h.get('quest-reward-scarecrow').textContent,'10 → 12 Rd');assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'35');
 assert.doesNotMatch(h.get('stats-meta').textContent,/最低/);assert.equal(h.get('stats-note-meta').textContent,'Lv補正は最低＋1');
 choose('dementor');assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'100');
 choose('mohicans');assert.equal(h.get('enemy-art').classList.contains('enemy-placeholder'),false);assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'20');
});

test('full creature rings keep their footprint bounded while scaling with weapon size',()=>{
 for(const mobile of [false,true]){
  const base=UI.creatureOrbit(60,1,mobile),large=UI.creatureOrbit(60,2.15,mobile);
  assert.ok(base.footprint<460);assert.ok(large.footprint<850);assert.ok(large.footprint>base.footprint);
  assert.equal(large.rings.reduce((n,r)=>n+r[0],0),60);
 }
});
