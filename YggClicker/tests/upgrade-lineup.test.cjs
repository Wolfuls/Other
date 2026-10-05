'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('new lineup inherits purchased levels and prices while applying the four new effects',()=>{
 assert.deepEqual(D.upgrades.map(u=>u.name),['コンセントレイション','スピードアップ','クリア報酬増加','オーバーキルボーナス']);
 const old=E.createState(1000);old.levels.meta=11;old.levels.richter=20;old.upgrades={click:3,power:7,reward:4,overkill:1};old.factors=54321;
 const saved=JSON.parse(S.encode(old));saved.gameVersion='0.30.0';const s=S.decode(JSON.stringify(saved));assert.deepEqual(s,old);
 assert.deepEqual(D.upgrades.map(u=>u.cost),[5,30,100,200]);assert.deepEqual(D.upgrades.map(u=>E.upgradeCost(s,u)),[9,143,244,250]);
 for(const c of [null,...D.characters]){assert.equal(E.attackBreakdown(s,c).upgrade.flat,3);assert.equal(E.attackBreakdown(s,c,true).upgrade.flat,3);assert.equal(E.attackBreakdown(s,c).upgrade.rate,0);}
 near(E.reward(s),3);near(E.overkillBonus(s),1);assert.equal(E.buyUpgrade(s,'overkill'),false);
});

test('speed adds to individually trained action power and exact one-second charges, without changing per-hit damage',()=>{
 const s=E.createState(1000),c=D.characters[1];s.levels.richter=1;s.actionLevels.richter=10;
 const profile=E.attackProfile(s,c);s.upgrades.power=20;
 assert.deepEqual(E.attackProfile(s,c),profile);assert.equal(E.actionPower(s,c),105);assert.equal(E.attackRate(s,c),1.05);
 E.advance(s,1,()=>.999);assert.equal(s.actionPoints.richter,5);assert.equal(s.kills,1);
 E.advance(s,1,()=>.999);assert.equal(s.actionPoints.richter,10);assert.equal(s.kills,2);
 s.upgrades.power=100;near(E.actionPower(s,c),185);
});

test('character DPS sums to party DPS, includes all corrections, and action rate excludes free reattacks',()=>{
 const s=E.createState(1000),meta=D.characters[0],dog=D.characters[2];s.levels.meta=11;s.actionLevels.meta=2;s.upgrades.click=2;s.upgrades.power=10;
 near(E.actionMultiplier(s,meta),70/50);near(E.attackRate(s,meta),.7);near(E.characterDps(s,meta),12.6);
 s.boostSeconds=30;near(E.characterDps(s,meta),25.2);assert.equal(E.characterDps(s,dog),0);
 s.levels.vishunal=50;const before=E.characterDps(s,dog),rate=E.attackRate(s,dog);s.purchasedPerks.vishunal=['missile-missile'];
 near(E.characterDps(s,dog),require('../js/battle-batch.js').averageDamage(E.attackProfile(s,dog))*rate);assert.equal(E.attackRate(s,dog),rate);
 near(E.dps(s),D.characters.reduce((sum,c)=>sum+E.characterDps(s,c),0));
 const h=harness({...s,paused:true});assert.equal(h.get('character-dps-meta').textContent,'25.2 DPS');assert.equal(h.get('character-rate-meta').textContent,'0.7 回/秒');
 assert.equal(h.get('action-bonus-meta').textContent,'70');
});

test('concentration invalidates expected income and improves automatic clears rather than only manual damage',()=>{
 const s=E.createState();s.levels.meta=1;const before=E.expectedIncome(s);s.upgrades.click=20;
 const after=E.expectedIncome(s);assert.ok(after.factorsPerSecond>before.factorsPerSecond);
 near(after.factorsPerSecond,1);s.upgrades.power=25;near(E.expectedIncome(s).factorsPerSecond,after.factorsPerSecond*75/50);
});

test('percentage overkill pays upgraded reward in exact, collapsed and offline paths and preserves visual bonus totals',()=>{
 const s=E.createState(1000);s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];s.upgrades.reward=3;s.upgrades.overkill=1;s.factors=0;
 const events=E.click(s,()=>.999),clears=events.filter(e=>e.type==='clear');near(s.earned,8*3+7);
 const frames=FX.plan(events);near(frames.reduce((sum,f)=>sum+f.overkillBonus,0),7);near(frames.reduce((sum,f)=>sum+f.reward,0),s.earned);
 s.upgrades.reward=5;near(FX.plan(events).reduce((sum,f)=>sum+f.overkillBonus,0),7);
 const off=E.createState(1000);off.levels.richter=50;off.actionLevels.richter=100000;off.purchasedPerks.richter=['bom-ber'];off.upgrades={click:2,power:15,reward:5,overkill:1};off.factors=0;
 const summary=E.advance(off,600,()=>.999),reward=summary.filter(e=>e.type==='clear');
 near(off.earned,off.kills*3+reward.reduce((sum,e)=>sum+e.overkills,0)*1);
 near(FX.plan(summary).reduce((sum,f)=>sum+f.overkillBonus,0),reward.reduce((sum,e)=>sum+e.overkills,0)*1);
 const rates=E.expectedIncome(off);assert.ok(rates.bonusPerSecond>0);near(rates.factorsPerSecond,rates.clearsPerSecond*3+rates.bonusPerSecond);
});

test('Vishunal uses a small grounded footprint with the same scaled muzzle coordinates',()=>{
 for(const mobile of [false,true]){
  const l=UI.orbitLayout({width:1100,mobile,grounded:true,metaHired:true,vishunalHired:true,metaCount:0,enemyCount:3});
  assert.equal(l.vishunal.extentY,mobile?105:112);near(l.vishunal.footOffset,90*l.vishunal.spriteScale);
  near(l.vishunal.y+l.vishunal.footOffset,l.meta.y+l.meta.footOffset);assert.ok(l.vishunal.footprint<l.meta.footprint*.6);
 }
 const s=E.createState(1000);s.levels.vishunal=1;s.selectedCharacterId='vishunal';const h=harness(s);h.click('attack');
 const shot=h.get('vishunal-projectiles').lastElementChild,flash=h.get('vishunal-muzzles').lastElementChild;
 near(parseFloat(shot.style.left),140+(parseFloat(flash.style.left)-112)*.5);near(parseFloat(shot.style.top),150+(parseFloat(flash.style.top)-112)*.5);
});
