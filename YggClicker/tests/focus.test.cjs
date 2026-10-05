'use strict';
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs');

test('the three quests are playable; all schema9 targets migrate without losing owned progress',()=>{
 assert.deepEqual(D.sessions.map(s=>s.id),['mohicans','scarecrow','dementor']);
 for(const sessionId of ['practice','patrol','heavy','mohicans']){
  const s=E.createState(1000);s.sessionId=sessionId;s.hp=3;s.levels.meta=50;s.levels.richter=50;
  s.factors=12345;s.upgrades.reward=25;s.actionLevels.meta=71;s.purchasedPerks.meta=['metal-blade'];
  s.boostSeconds=12;s.actionPoints.meta=37;s.actionClock=.4;s.paused=true;
  const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:9,state:s}));
  assert.deepEqual(migrated,{...s,sessionId:'mohicans',hp:sessionId==='mohicans'?6:20});
  assert.deepEqual(S.decode(S.encode(migrated)),migrated);
 }
 for(const sessionId of ['practice','patrol','heavy'])assert.equal(moveTestParty(E.createState(),sessionId),false);
});

test('migration still rejects unknown targets and invalid old HP or upgrade values',()=>{
 const document={gameId:D.gameId,schemaVersion:9,state:E.createState(1000)};
 for(const sessionId of ['unknown',['practice'],null]){
  document.state.sessionId=sessionId;assert.throws(()=>S.decode(JSON.stringify(document)));
 }
 document.state.sessionId='heavy';
 for(const hp of [0,151,'3',null]){document.state.hp=hp;assert.throws(()=>S.decode(JSON.stringify(document)));}
 const current=JSON.parse(S.encode(E.createState(1000)));
 for(const level of [-1,2.5,'26',Number.MAX_SAFE_INTEGER+1]){
  current.state.upgrades.power=level;assert.throws(()=>S.decode(JSON.stringify(current)));
 }
});

test('all repeatable upgrades purchase beyond25 with the same cost/effect rules, and survive save transfer',()=>{
 for(const id of ['click','power','reward'])for(const level of [25,26,100,500]){
  const s=E.createState(1000),u=D.upgrades.find(u=>u.id===id);s.upgrades[id]=level;
  const cost=E.upgradeCost(s,u);assert.equal(cost,Math.floor(u.cost*1.25**level));
  s.factors=cost*.99;assert.equal(E.buyUpgrade(s,id),false);
  s.factors=cost;assert.equal(E.buyUpgrade(s,id),true);assert.equal(s.factors,0);assert.equal(s.upgrades[id],level+1);
  assert.deepEqual(S.decode(S.encode(s)),s);
 }
 const s=E.createState(1000);s.factors=1000;assert.equal(E.buyUpgrade(s,'overkill'),true);
 const balance=s.factors;assert.equal(E.buyUpgrade(s,'overkill'),false);assert.equal(s.factors,balance);
});

test('Lv25 upgrade controls remain usable and persist the newly purchased level',()=>{
 const s=E.createState(1000);s.paused=true;s.factors=10000000;s.upgrades={click:25,power:25,reward:25,overkill:1};
 const h=harness(s);
 for(const id of ['click','power','reward']){
  assert.doesNotMatch(h.get('upgrade-cost-'+id).textContent,/MAX|最大/);
  h.get('upgrade-list').listeners.get('click')({target:{closest:()=>({dataset:{upgrade:id}})}});
  assert.equal(h.get('upgrade-level-'+id).textContent,'Lv.26');assert.equal(h.saved().upgrades[id],26);
 }
 assert.equal(h.get('power-bonus').textContent,'＋26');assert.equal(h.get('reward-bonus').textContent,'＋260%');
});

test('zoom uses visible occupancy: missing or sparse symbols stay full size, crowded orbits shrink',()=>{
 const options={grounded:true,width:1200,enemyCount:3,richterHired:true,metaScale:2.15,richterScale:2.15};
 const empty=UI.orbitLayout({...options,metaCount:0,richterCount:0});assert.equal(empty.zoom,1);
 const sparse=UI.orbitLayout({...options,metaCount:1,richterCount:1});assert.equal(sparse.zoom,1);
 const crowded=UI.orbitLayout({...options,metaCount:60,richterCount:60});assert.ok(crowded.zoom<1);
 assert.ok(crowded.width>options.width||crowded.height>crowded.heightLimit);
 assert.ok(crowded.viewWidth<=options.width&&crowded.viewHeight<=crowded.heightLimit);
 const s=E.createState(1000);s.paused=true;s.levels.meta=1;s.levels.richter=1;
 const h=harness(s);h.get('arena-viewport').clientWidth=1000;h.resize();
 assert.match(h.get('arena').style.transform,/scale\(1\)/);
});

test('ordinary and character impacts produce individual hit sparks; only Richter adds explosions',()=>{
 for(const actor of [null,'meta','richter']){
  const s=E.createState(1000);if(actor){s.levels[actor]=1;s.selectedCharacterId=actor;}
  const h=harness(s);h.click('attack');h.advance(actor==='richter'?760:actor==='meta'?630:560);
  const sparks=h.get('hit-effects').children;assert.equal(sparks.length,1,actor||'manual');
  assert.equal(h.get('explosions').children.length,actor==='richter'?1:0);
  assert.equal(sparks[0].dataset.impactId,h.get('damage-floats').children[0].dataset.impactId);
  h.click('pause');assert.equal(h.get('hit-effects').children.length,0);
 }
});

test('sustained hits remain bounded, expire, and stop while hidden or with reduced motion',()=>{
 const s=E.createState(1000);s.levels.meta=1;s.actionLevels.meta=1000000;
 const h=harness(s);h.advance(1800);assert.ok(h.get('hit-effects').children.length>0);
 h.advance(5000);assert.ok(h.get('hit-effects').children.length<=32);
 h.visible(false);assert.equal(h.get('hit-effects').children.length,0);h.advance(2000);
 h.visible(true);h.media.matches=true;h.media.change();h.advance(2000);assert.equal(h.get('hit-effects').children.length,0);
 const single=harness(E.createState(1000));single.click('attack');single.advance(560);assert.equal(single.get('hit-effects').children.length,1);
 single.advance(320);assert.equal(single.get('hit-effects').children.length,0);
});
