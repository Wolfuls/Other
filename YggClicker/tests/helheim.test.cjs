'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),B=require('../js/battle-batch.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');

test('armor compounds from base without accumulating rounded per-level bonuses',()=>{
 for(const id of ['scarecrow','dementor']){
  const q=D.sessions.find(q=>q.id===id);
  for(let level=1;level<=200;level++){
   const n=BigInt(level-1),expected=Math.max(q.defense+(level>1?1:0),Number(BigInt(q.defense)*101n**n/100n**n));
   assert.equal(E.sessionAtLevel(q,level).defense,expected,`${id} Lv${level}`);
  }
 }
 const levels=[1,2,3,10,50,100],armor=id=>levels.map(l=>E.sessionAtLevel(D.sessions.find(q=>q.id===id),l).defense);
 assert.deepEqual(armor('scarecrow'),[35,36,36,38,56,93]);
 assert.deepEqual(armor('dementor'),[3,4,4,4,4,8]);
 assert.deepEqual(armor('mohicans'),[0,1,2,9,49,99]);
});

test('quest defense preview, saved levels, combat and forecasts use the same compounded armor',()=>{
 const s=E.createState(1000);s.factors=1000;s.paused=true;s.levels.meta=50;s.purchasedPerks.meta=['metal-blade'];s.selectedCharacterId='meta';E.selectSession(s,'scarecrow');
 const h=harness(s);assert.equal(h.get('quest-defense-scarecrow').textContent,'35 → 36');assert.equal(h.get('quest-defense-dementor').textContent,'3 → 4');
 assert.ok(E.buyQuest(s,'scarecrow'));assert.equal(E.attackProfile(s,D.characters[0]).defense,36);const before=s.hp;s.paused=false;E.click(s,()=>0);assert.equal(before-s.hp,17);
 const profile=E.attackProfile(s,D.characters[0]);assert.equal(E.dps(s),B.averageDamage(profile)*.5);assert.equal(profile.penetrationBlocked,true);
 E.selectSession(s,'dementor');s.questLevels.dementor=100;s.hp=100;s.levels.richter=50;s.purchasedPerks.richter=['bom-ber'];
 const restored=S.decode(S.encode(s));assert.equal(E.getSession(restored).defense,8);assert.equal(restored.hp,s.hp);assert.deepEqual(restored,s);
 assert.equal(E.attackProfile(restored,D.characters[1]).overflowDefense,8);assert.equal(E.attackProfile(restored,D.characters[0]).defense,0);
});

test('identical wraith sprites form three visible slots without multiplying HP or rewards',()=>{
 const s=E.createState(1000);E.selectSession(s,'dementor');s.hp=1;const h=harness(s),ids=['enemy-art','enemy-next-1','enemy-next-2'];
 assert.ok(ids.every(id=>!h.get(id).hidden));assert.equal(new Set(ids.map(id=>h.get(id).dataset.appearance)).size,1);
 assert.ok(ids.every(id=>h.get(id).dataset.defeatStyle==='dissolve'));assert.equal(h.get('hp-progress').getAttribute('aria-valuemax'),'100');
 assert.match(h.get('enemy-next-2').getAttribute('aria-label'),/後続2：ディメンター/);
 h.click('attack');h.advance(900);
 assert.ok(h.get('enemy-defeats').children.some(n=>n.dataset.defeatStyle==='dissolve'));assert.ok(h.get('arena').classList.contains('mohican-line'));
 h.click('pause');assert.equal(h.get('enemy-defeats').children.length,0);const result=h.saved();assert.equal(result.kills,1);assert.equal(result.factors,4);assert.equal(result.hp,100);
 const choose=id=>h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-session]'?{dataset:{session:id}}:null}});
 choose('scarecrow');assert.ok(h.get('enemy-next-1').hidden&&h.get('enemy-next-2').hidden);
 choose('mohicans');assert.ok(!h.get('enemy-next-1').hidden);assert.equal(new Set(ids.map(id=>h.get(id).dataset.appearance)).size,3);
 choose('dementor');assert.ok(ids.every(id=>h.get(id).dataset.defeatStyle==='dissolve'));
});

test('all three 3m wraiths fit the zoomed scene with allies across viewport sizes',()=>{
 const q=D.sessions.find(q=>q.id==='dementor');assert.equal(UI.enemyFormationSize(q),3);assert.equal(UI.enemyFormationSize(D.sessions.find(q=>q.id==='scarecrow')),1);
 for(const width of [240,390,760,1280])for(const availableHeight of [180,300,600])for(const mobile of [false,true]){
  const l=UI.orbitLayout({width,availableHeight,mobile,grounded:true,metaHired:true,richterHired:true,vishunalHired:true,metaCount:1,richterCount:1,enemyCount:3,enemyScale:q.enemyScale,formationLayout:q.formationLayout});
  assert.ok(l.viewWidth<=width+1e-8);assert.ok(l.viewHeight<=availableHeight+1e-8);
  for(const p of [{x:0,y:0},...l.reserves]){
   assert.ok(l.enemyX+p.x-l.enemyWidth/2>=0);assert.ok(l.enemyX+p.x+l.enemyWidth/2<=l.width);
   assert.ok(l.enemyY+p.y-l.enemyHeight/2>=0);assert.ok(l.enemyY+p.y+l.enemyHeight/2<=l.height);
  }
 }
});
