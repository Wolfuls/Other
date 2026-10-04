'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');

test('all three allies start with 50 action power and attack once per two seconds; new games start at zero',()=>{
 const s=E.createState(1000);assert.equal(s.factors,0);
 for(const c of D.characters){s.levels[c.id]=1;assert.equal(c.action,50);assert.equal(E.actionPower(s,c),50);assert.equal(E.attackRate(s,c),.5);}
 assert.equal(E.advance(s,1,()=>.999).filter(e=>e.type==='attack').length,0);
 const attacks=E.advance(s,1,()=>.999).filter(e=>e.type==='attack');
 assert.equal(attacks.length,3);assert.ok(D.characters.every(c=>s.actionPoints[c.id]===0));
});

test('quest roster has independent HP, rewards, defense and level growth',()=>{
 const s=E.createState(1000);
 assert.deepEqual(D.sessions.map(q=>[q.id,q.hp,q.defense,q.reward]),[['mohicans',20,0,2],['scarecrow',40,35,8],['dementor',100,3,4]]);
 for(const q of D.sessions)s.questLevels[q.id]=3;
 assert.deepEqual(D.sessions.map(q=>[E.getSession(s,q.id).hp,E.getSession(s,q.id).defense,E.getSession(s,q.id).reward]),[[28,2,3],[57,36,12],[144,4,6]]);
 s.factors=1000;s.hp=7;s.batchHpFraction=.25;
 assert.equal(E.buyQuest(s,'scarecrow'),true);assert.equal(s.hp,7);assert.equal(s.batchHpFraction,.25);assert.equal(s.sessionId,'mohicans');
 assert.equal(E.selectSession(s,'scarecrow'),true);assert.equal(s.hp,E.getSession(s).hp);assert.equal(s.batchHpFraction,0);
 assert.equal(E.selectSession(s,'dementor'),true);assert.equal(s.hp,144);assert.equal(E.getSession(s).defense,4);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('high defense keeps minimum damage; Metal Blade bypasses it; overflow pays armor for every new enemy',()=>{
 const s=E.createState();E.selectSession(s,'scarecrow');
 E.click(s,()=>0);assert.equal(s.hp,39);
 s.levels.meta=50;s.selectedCharacterId='meta';s.purchasedPerks.meta=['metal-blade'];
 const before=s.hp;E.click(s,()=>0);assert.equal(before-s.hp,18);
 s.questLevels.mohicans=3;E.selectSession(s,'mohicans');s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];
 E.click(s,()=>.999); // 177 raw; five clears cost 30 each, then 27 - 2 = 25 damage.
 assert.equal(s.kills,5);assert.equal(s.hp,3);assert.equal(s.factors,15);
});

test('schema 14 preserves paid progress and converts remaining enemy health exactly once',()=>{
 const old=E.createState(1000);old.questLevels={mohicans:3};old.hp=7;old.factors=12345;old.levels.richter=50;old.actionLevels.richter=12;old.actionPoints.richter=37;old.purchasedPerks.richter=['bom-ber'];old.options.showOrbits=false;
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:14,state:old}));
 assert.equal(s.hp,14);assert.deepEqual(s.questLevels,{mohicans:3,scarecrow:1,dementor:1});
 for(const key of ['factors','levels','actionLevels','actionPoints','purchasedPerks','options'])assert.deepEqual(s[key],old[key]);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('quest UI switches enemy artwork, defense, HP and reward; formula minimum note stays separate',()=>{
 const s=E.createState(1000);s.paused=true;s.levels.meta=2;s.selectedCharacterId='meta';const h=harness(s);
 const choose=id=>h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-session]'?{dataset:{session:id}}:null}});
 choose('scarecrow');assert.equal(h.saved().sessionId,'scarecrow');assert.equal(h.get('enemy-art').classList.contains('enemy-placeholder'),false);
 assert.equal(h.get('quest-reward-scarecrow').textContent,'8 → 10 Rd');assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'40');
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
