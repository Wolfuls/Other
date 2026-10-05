'use strict';
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
    const s=E.createState();s.levels.meta=level;s.levels.richter=richterHired?level:0;
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
  const s=E.createState();assert.equal(E.expectedIncome(s).factorsPerSecond,0);
  s.levels.meta=1;const before=structuredClone(s),income=E.expectedIncome(s);assert.ok(income.factorsPerSecond>0);assert.deepEqual(s,before);
  s.hp=1;s.factors=1e20;s.selectedCharacterId='meta';s.actionPoints.meta=50;s.paused=true;
  assert.strictEqual(E.expectedIncome(s),income,'reuse the calculation while only non-performance state changes');
  s.actionLevels.meta=1;assert.ok(Math.abs(E.expectedIncome(s).factorsPerSecond/income.factorsPerSecond-55/50)<1e-10);
  s.actionLevels.meta=0;s.upgrades.reward=1;assert.ok(Math.abs(E.expectedIncome(s).factorsPerSecond/income.factorsPerSecond-1.5)<1e-10);
});

test('guaranteed one-hit kills cap income at attack frequency unless paid BoM-BeR enables spillover',()=>{
  const s=E.createState();s.levels.richter=50;
  assert.equal(E.expectedIncome(s).factorsPerSecond,.7);s.boostSeconds=30;
  assert.equal(E.expectedIncome(s).factorsPerSecond,.7,'extra damage is still discarded');
  s.boostSeconds=0;s.purchasedPerks.richter=['bom-ber'];const spill=E.expectedIncome(s).factorsPerSecond;assert.ok(spill>4);
  s.boostSeconds=30;const boost=E.expectedIncome(s);assert.ok(boost.factorsPerSecond>spill*1.8);s.boostSeconds=10;assert.strictEqual(E.expectedIncome(s),boost);
  s.boostSeconds=0;assert.ok(E.expectedIncome(s).factorsPerSecond<boost.factorsPerSecond);
});

test('defense, defense bypass, target perks and knockout are included in expected clear speed',()=>{
  const p={dice:0,flat:6,multiplier:1,rate:1,defense:0,overflow:false};
  assert.equal(B.clearRate(10,[p],{threshold:4,chance:0}),.5);
  assert.ok(Math.abs(B.clearRate(10,[p])-2/3)<1e-12,'half the first hits clear by knockout');
  assert.ok(Math.abs(B.clearRate(10,[{...p,defense:6}])-16/111)<1e-12);
  const s=E.createState();s.levels.meta=50;moveTestParty(s,'heavy');
  const armored=E.expectedIncome(s).factorsPerSecond;s.purchasedPerks.meta=['metal-blade'];
  assert.ok(E.expectedIncome(s).factorsPerSecond>armored);
  s.purchasedPerks.meta.push('mohican-slayer');const neutral=E.expectedIncome(s).factorsPerSecond;
  const enemy=D.sessions.find(enemy=>enemy.id===s.sessionId),traits=enemy.traits;try{enemy.traits=['mohican','swarm'];assert.ok(E.expectedIncome(s).factorsPerSecond>neutral);}finally{enemy.traits=traits;}
});

test('spillover pays armor on every subsequent target in the income model',()=>{
  for(const defense of [0,2,4]){
    const p={dice:0,flat:3*(40+defense),multiplier:1,rate:2,defense,overflow:true};
    assert.ok(Math.abs(B.clearRate(40,[p])-6)<1e-6);
  }
});

test('mixed-party expected clears agree with independent sampled attacks including armor and spillover',()=>{
  const profiles=[{dice:1,flat:4,multiplier:2.9,defense:0,rate:2,overflow:false},{dice:5,flat:8,multiplier:5.9,defense:4,rate:1,overflow:true}];
  const expected=B.clearRate(150,profiles),N=120000;let seed=7919,hp=150,kills=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<N;i++){
    const p=profiles[random()<2/3?0:1];let remaining=B.scaleDamage(E.roll(p.dice,p.flat,random),p.multiplier);
    do{const available=Math.max(0,remaining-p.defense),hit=Math.min(hp,available);hp-=hit;
      const ko=hit>0&&hp>0&&hp<=4&&random()<.5;
      if(hp===0||ko){kills++;hp=150;}remaining=p.overflow?available-hit:0;
    }while(remaining>0);
  }
  const sampled=kills/N*3;assert.ok(Math.abs(sampled/expected-1)<.02,`${sampled} vs ${expected}`);
});

test('UI reflects loaded target conditions and does not abbreviate the balance',()=>{
  const s=E.createState(1000);s.levels.richter=50;s.factors=1234567890123;s.paused=true;
  const h=harness(s);assert.equal(h.get('factors').textContent,'1,234,567,890,123');
  assert.equal(h.get('income-rate').textContent,'0.7');assert.match(h.get('income-context').textContent,/再開時/);
  moveTestParty(s,'heavy');const armored=harness(s);
  assert.notEqual(armored.get('income-rate').textContent,'1');assert.match(armored.get('income-context').textContent,/1セッション合計/);
});

test('UI shows integer rewards, balances and the total reward bonus consistently',()=>{
  const s=E.createState(1000);s.levels.meta=1;s.factors=1234567;s.upgrades.reward=1;s.paused=true;
  const h=harness(s);assert.equal(h.get('factors').textContent,'1,234,567');
  assert.equal(h.get('reward').textContent,'◇ 3Rd');assert.equal(h.get('reward-bonus').textContent,'＋10%');
  assert.match(h.get('income-formula').textContent,/3Rd/);
  moveTestParty(s,'heavy');const armored=harness(s);
  assert.equal(armored.get('reward').textContent,'◇ 49Rd');assert.match(armored.get('income-formula').textContent,/49Rd/);
});
