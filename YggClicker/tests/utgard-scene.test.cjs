'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),UI=require('../js/display.js'),S=require('../js/save.js'),{harness}=require('./app-harness.cjs');

test('crystal density follows income monotonically, saturates at 24, and does not add combat state',()=>{
 let previous=0;for(const income of [0,.01,1,10,100,1000,1e6,1e20,1e100,Infinity]){
  const count=UI.factorRainCount(income);assert.ok(Number.isInteger(count));assert.ok(count>=previous&&count<=24);previous=count;
 }
 assert.equal(UI.factorRainCount(0),0);assert.equal(UI.factorRainCount(NaN),0);assert.equal(UI.factorRainCount(-1),0);assert.equal(UI.factorRainCount(1e100),24);
 const empty=harness(E.createState(1000));assert.equal(empty.get('factor-rain').children.length,24);assert.ok(empty.get('factor-rain').children.every(n=>n.hidden));
 const s=E.createState(1000);s.levels.richter=50;s.actionLevels.richter=1000000;s.purchasedPerks.richter=['bom-ber'];
 const h=harness(s),pool=[...h.get('factor-rain').children];
 assert.equal(pool.filter(n=>!n.hidden).length,UI.factorRainCount(E.expectedIncome(s).factorsPerSecond));
 h.advance(4000);assert.deepEqual(h.get('factor-rain').children,pool,'effect reuses a fixed pool across live ticks');
 h.click('pause');assert.ok(h.get('arena-viewport').classList.contains('scene-paused'));
 h.click('pause');assert.ok(!h.get('arena-viewport').classList.contains('scene-paused'));
 h.visible(false);assert.ok(h.get('arena-viewport').classList.contains('scene-paused'));
 h.visible(true);h.media.matches=true;h.media.change();assert.ok(h.get('arena-viewport').classList.contains('scene-paused'));
 assert.equal(h.get('factor-rain').children.length,24);
});

test('the gang quest uses Utgard, hides the individual enemy title and includes three women among ten variants',()=>{
 const mob=D.sessions.find(s=>s.id==='mohicans');assert.equal(mob.variants.length,10);assert.equal(mob.variants.filter(v=>v.name.startsWith('モヒカン女')).length,3);
 const s=E.createState(1000);s.sessionId='mohicans';s.hp=10;const h=harness(s);
 assert.ok(h.get('enemy-name').hidden);assert.ok(h.get('arena-viewport').classList.contains('has-scene'));
 assert.equal(h.get('arena-viewport').style.getPropertyValue('--session-background'),'url("'+mob.background+'")');
 assert.deepEqual(D.sessions.map(s=>s.id),['mohicans','scarecrow','dementor']);
 assert.equal(E.selectSession(s,'practice'),false);assert.ok(h.get('enemy-name').hidden);
});

test('cumulative clears retain full grouped digits beyond exponential notation; save transfer remains unchanged',()=>{
 for(const[kills,label]of [[1234567,'1,234,567'],[1234567890123,'1,234,567,890,123'],[1e21,'1,000,000,000,000,000,000,000']]){
  const s=E.createState(1000);s.kills=kills;s.paused=true;s.factors=123;s.upgrades.reward=7;s.upgrades.power=9;s.levels.meta=15;s.actionLevels.meta=35;
  const doc=JSON.parse(S.encode(s));doc.gameVersion='0.24.0';assert.deepEqual(S.decode(JSON.stringify(doc)),s);
  assert.equal(harness(s).get('kills').textContent,label);
 }
});
