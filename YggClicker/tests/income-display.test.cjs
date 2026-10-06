'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),B=require('../js/battle-batch.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs');

test('balances use grouped full decimal notation even beyond exponential and safe-integer thresholds',()=>{
  for(const [n,text]of [[5,'5'],[1234567,'1,234,567'],[999999999999,'999,999,999,999'],[1e21,'1,000,000,000,000,000,000,000']])assert.equal(UI.fullNumber(n),text);
  assert.equal(UI.fullNumber(1e100).replaceAll(',',''),'1'+'0'.repeat(100));
  assert.equal(UI.fullNumber(12.99),'12');assert.equal(UI.incomeNumber(.0005),'0.001');
});

test('orbit radii and inter-ring distances grow in proportion to weapon size while bodies stay unchanged',()=>{
  for(const mobile of [false,true]){
    const a=UI.orbitLayout({width:300,mobile,richterHired:true}),b=UI.orbitLayout({width:300,mobile,richterHired:true,metaScale:2,richterScale:2});
    for(const id of ['meta','richter']){assert.equal(b[id].width,2*a[id].width);assert.equal(b[id].height,2*a[id].height);}
    assert.ok(b.width>a.width);assert.ok(b.height>a.height);assert.ok(b.zoom<a.zoom);
    assert.ok(b.meta.y+b.meta.footprint/2+64 < b.richter.y-b.richter.footprint/2);
    assert.ok(b.richter.y+b.richter.footprint/2+64 < b.height);
    assert.ok(b.richter.x+b.richter.footprint/2 < b.enemyX-b.enemyWidth/2);
  }
});

test('automatic zoom fits every allowed size in both dimensions without enlarging small scenes',()=>{
  for(const width of [240,322,531,800,1400])for(const mobile of [false,true])for(const richterHired of [false,true])for(const level of [1,10,50,200]){
    const s=combatFixture();s.levels.meta=level;s.levels.richter=richterHired?level:0;
    const layout=UI.orbitLayout({width,mobile,richterHired,metaScale:E.weaponScale(s,'meta'),richterScale:E.weaponScale(s,'richter')});
    assert.ok(layout.zoom>0&&layout.zoom<=1);assert.ok(layout.viewWidth<=width+1e-9);assert.ok(layout.viewHeight<=layout.heightLimit+1e-9);
    assert.ok(layout.offsetX>=-1e-9);
    assert.ok((layout.enemyX+layout.enemyWidth/2)*layout.zoom+layout.offsetX<=width);
    for(const id of richterHired?['meta','richter']:['meta']){
      const actor=layout[id];assert.ok((actor.x-actor.footprint/2)*layout.zoom+layout.offsetX>=0);
      assert.ok((actor.y+actor.footprint/2+64)*layout.zoom<=layout.viewHeight);
    }
  }
  assert.equal(UI.orbitLayout({width:900}).zoom,1);
});

test('income is zero without allies; ignores balance, current HP and pause for its long-term estimate',()=>{
  const s=combatFixture();assert.equal(E.expectedIncome(s).factorsPerSecond,0);
  s.levels.meta=1;const before=structuredClone(s),income=E.expectedIncome(s);assert.ok(income.factorsPerSecond>0);assert.deepEqual(s,before);
  s.hp=1;s.factors=1e20;s.selectedCharacterId='meta';s.actionPoints.meta=50;s.paused=true;
  assert.strictEqual(E.expectedIncome(s),income,'reuse the calculation while only non-performance state changes');
  s.actionLevels.meta=1;assert.ok(Math.abs(E.expectedIncome(s).factorsPerSecond/income.factorsPerSecond-52/50)<.03);
  s.actionLevels.meta=0;s.upgrades.reward=1;assert.ok(Math.abs(E.expectedIncome(s).factorsPerSecond/income.factorsPerSecond-1.5)<1e-10);
});

test('guaranteed one-hit kills cap income at attack frequency unless paid BoM-BeR enables spillover',()=>{
  const s=combatFixture();s.levels.richter=50;
  assert.equal(E.expectedIncome(s).factorsPerSecond,.7);s.boostSeconds=30;
  assert.equal(E.expectedIncome(s).factorsPerSecond,.7,'extra damage is still discarded');
  s.boostSeconds=0;s.purchasedPerks.richter=['bom-ber'];const spill=E.expectedIncome(s).factorsPerSecond;assert.ok(spill>.7&&spill<=1.5*E.reward(s));assert.equal(spill,.88);
  s.boostSeconds=30;const boost=E.expectedIncome(s);assert.equal(boost.factorsPerSecond,spill);s.boostSeconds=10;assert.strictEqual(E.expectedIncome(s),boost);
  s.boostSeconds=0;assert.equal(E.expectedIncome(s).factorsPerSecond,boost.factorsPerSecond);
});







test('UI reflects loaded target conditions and does not abbreviate the balance',()=>{
  const s=combatFixture(1000);s.levels.richter=50;s.factors=1234567890123;s.paused=true;
  const h=harness(s);assert.equal(h.get('factors').textContent,'1,234,567,890,123');
  assert.equal(h.get('income-rate').textContent,'0.7');assert.match(h.get('income-context').textContent,/再開時/);
  moveTestParty(s,'heavy');const armored=harness(s);
  assert.notEqual(armored.get('income-rate').textContent,'1');assert.match(armored.get('income-context').textContent,/1セッション合計/);
});

test('UI shows integer rewards, balances and the total reward bonus consistently',()=>{
  const s=combatFixture(1000);s.levels.meta=1;s.factors=1234567;s.upgrades.reward=1;s.paused=true;
  const h=harness(s);assert.equal(h.get('factors').textContent,'1,234,567');
  assert.equal(h.get('reward').textContent,'◇ 3Rd');assert.equal(h.get('reward-bonus').textContent,'＋10%');
  assert.match(h.get('income-formula').textContent,/3Rd/);
  moveTestParty(s,'heavy');const armored=harness(s);
  assert.equal(armored.get('reward').textContent,'◇ 49Rd');assert.match(armored.get('income-formula').textContent,/49Rd/);
});
