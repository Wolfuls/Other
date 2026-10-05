'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js');
test('Meta rolls two dice, keeps floor rounding and benefits from the first power purchase',()=>{
  const s=E.createState(1000);s.factors=D.characters[0].cost;E.hire(s,'meta');E.selectCharacter(s,'meta');E.selectSession(s,'patrol');
  let base=0,raised=0;
  for(let a=1;a<=6;a++)for(let b=1;b<=6;b++){
    for(const level of [1,2]){
      s.levels.meta=level;s.hp=40;const faces=[a,b];
      const hit=E.click(s,()=>{assert.ok(faces.length,'no extra dice');return(faces.shift()-.5)/6;})[0];
      assert.equal(faces.length,0);assert.equal(hit.damage,Math.max(1,Math.max(a+b+(level===1?0:1),Math.floor((a+b)*(level===1?1:1.1)+1e-9))-2));
      if(level===1)base+=hit.damage;else raised+=hit.damage;
    }
  }
  assert.equal(base,181);assert.equal(raised-base,35,'all rolls except the already minimum-clamped roll gain one point');
  E.selectCharacter(s,null);assert.deepEqual(E.manualStats(s),{dice:1,flat:0});
  s.levels.meta=50;s.purchasedPerks.meta=['metal-blade'];assert.deepEqual(E.stats(s,D.characters[0]),{dice:4,flat:5});
});
test('reward levels apply the same additive percentage to every session with integer total corrections',()=>{
  const s=E.createState(1000);s.upgrades.reward=1;
  D.sessions.forEach((session,i)=>assert.ok(Math.abs(E.reward(s,session)-[3,11,49,3,9,11][i])<1e-10));
  s.upgrades.reward=2;assert.deepEqual(D.sessions.map(session=>E.reward(s,session)),[3,12,54,3,9,12]);
  s.upgrades.reward=25;assert.deepEqual(D.sessions.map(session=>E.reward(s,session)),[7,35,157,7,28,35]);
});
test('manual clears, auto clears, spillover and offline batches award the same integer reward',()=>{
  for(const mode of ['manual','auto','offline']){
    const s=E.createState(1000);s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];
    s.upgrades.reward=1;s.factors=0;E.selectSession(s,'heavy');s.hp=1;
    if(mode==='manual')E.click(s,()=>.999);
    else if(mode==='auto')E.advance(s,4,()=>.999);
    else E.catchUp(s,1000+8*3600*1000);
    assert.ok(s.kills>0);assert.ok(Math.abs(s.factors-s.kills*49)<1e-7);assert.equal(s.earned,s.factors);
    const saved=S.decode(S.encode(s));assert.deepEqual(saved,s);
  }
});
test('integer reward corrections reach session income including BoM-BeR',()=>{
  const s=E.createState();for(const c of D.characters){s.levels[c.id]=50;s.purchasedPerks[c.id]=c.perks.map(p=>p.id);}
  const rates=level=>{s.upgrades.reward=level;return D.sessions.map(session=>{s.sessionId=session.id;return E.expectedIncome(s).factorsPerSecond;});};
  const base=rates(0);assert.ok(base[2]>base[1]&&base[1]>base[0]);
  for(const level of [1,3,25]){const upgraded=rates(level);for(let i=0;i<3;i++)assert.ok(Math.abs(upgraded[i]/base[i]-(1+Math.max(1,Math.floor(D.sessions[i].reward*.1*level+1e-9))/D.sessions[i].reward))<1e-10);}
});
test('rebalanced prices keep entry hires affordable, are nondecreasing after floor rounding and preserve purchase boundaries',()=>{
  const s=E.createState();assert.equal(E.hireCost(s,D.characters[0]),10);assert.equal(E.hireCost(s,D.characters[1]),100);
  for(const [id,firstPower,firstAction,lv50Power]of [['meta',5,6,4711],['richter',12,15,11307]]){
    const c=D.characters.find(c=>c.id===id);s.levels[id]=1;s.actionLevels[id]=0;
    assert.equal(E.hireCost(s,c),firstPower);assert.equal(E.actionCost(s,c),firstAction);
    s.factors=firstPower-.25;assert.equal(E.hire(s,id),false);s.factors+=.25;assert.equal(E.hire(s,id),true);assert.equal(s.factors,0);
    let previous=0;for(let lv=1;lv<200;lv++){s.levels[id]=lv;const price=E.hireCost(s,c);assert.ok(Number.isInteger(price)&&price>=previous);previous=price;}
    s.levels[id]=50;assert.equal(E.hireCost(s,c),lv50Power);
    previous=0;for(const level of [0,1,10,50,100,1000]){s.actionLevels[id]=level;const price=E.actionCost(s,c);assert.ok(Number.isFinite(price)&&price>previous);previous=price;}
    s.actionLevels[id]=1e9;s.factors=1e100;assert.equal(E.actionCost(s,c),Infinity);assert.equal(E.buyAction(s,id),false);assert.equal(s.actionLevels[id],1e9);
  }
  assert.equal(D.balance.boostCostDpsRatio,1);assert.equal(D.balance.boostDuration,30);
  assert.ok(D.sessions.slice(0,3).every(s=>s.traits.includes('swarm')));
});
test('old saves retain balances and all purchases when only the balance configuration changes',()=>{
  const s=E.createState(1000);s.levels.meta=100;s.levels.richter=100;s.factors=12345;s.earned=50000;
  s.actionLevels.meta=70;s.actionLevels.richter=99;s.upgrades.reward=3;s.upgrades.power=2;
  for(const c of D.characters.filter(c=>s.levels[c.id]))s.purchasedPerks[c.id]=c.perks.map(p=>p.id);
  const doc=JSON.parse(S.encode(s));doc.gameVersion='0.20.1';assert.deepEqual(S.decode(JSON.stringify(doc)),s);
});
test('currency formatting truncates cents, retains grouping and non-exponential large values',()=>{
  for(const [n,text]of [[2.5,'2'],[56.25,'56'],[1234567.5,'1,234,567'],[1234567890123.25,'1,234,567,890,123'],[1e21,'1,000,000,000,000,000,000,000']])assert.equal(UI.currencyNumber(n),text);
});
