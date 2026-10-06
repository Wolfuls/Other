'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('lineup exposes reward, overkill and four one-time defensive upgrades',()=>{
 assert.deepEqual(D.upgrades.map(u=>u.id),['retake','reversal','fightingSpirit','badLuck','reward','overkill']);
 const s=combatFixture();s.factors=1e10;for(const u of D.upgrades){assert.ok(E.buyUpgrade(s,u.id));if(u.max===1)assert.equal(E.buyUpgrade(s,u.id),false);}
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('quest action concentration boosts trained action without changing hit damage',()=>{
 const s=combatFixture(),c=D.characters[1];s.levels.richter=1;s.actionLevels.richter=10;const before=E.attackProfile(s,c);
 s.concentration[s.sessionId].action=4;assert.deepEqual(E.attackProfile(s,c),before);assert.equal(E.actionPower(s,c),72);E.advance(s,1,()=>.4);assert.equal(s.actionPoints.richter,72);
 s.concentration[s.sessionId].action=10;assert.equal(E.actionPower(s,c),104);
});

test('character DPS and UI metrics include quest damage and action allocation',()=>{
 const s=combatFixture(1000),c=D.characters[0];s.levels.meta=11;s.actionLevels.meta=2;s.concentration[s.sessionId]={attack:2,defense:0,reaction:0,action:2};s.paused=true;
 assert.equal(E.actionPower(s,c),66);assert.equal(E.averageAttackDamage(s,c),18);const metrics=E.characterMetrics(s,c);near(metrics.dps,metrics.damage*metrics.attacksPerSecond);near(E.dps(s),metrics.dps);
 const h=harness(s);assert.equal(h.get('action-bonus-meta').textContent,'66');assert.equal(h.get('character-damage-meta').textContent,'18');
});

test('quest allocations invalidate income estimates without changing the other quest',()=>{
 const s=combatFixture();s.levels.meta=1;const before=E.expectedIncome(s);s.concentration[s.sessionId].attack=10;const after=E.expectedIncome(s);assert.ok(after.factorsPerSecond>before.factorsPerSecond);
 s.concentration.scarecrow.attack=10;assert.equal(E.expectedIncome(s),after);
});

test('percentage overkill pays upgraded reward in exact, collapsed and offline paths and preserves visual bonus totals',()=>{
 const s=combatFixture(1000);s.levels.richter=50;s.selectedCharacterId='richter';s.purchasedPerks.richter=['bom-ber'];s.upgrades.reward=3;s.upgrades.overkill=1;s.factors=0;
 const events=E.click(s,()=>.999),clears=events.filter(e=>e.type==='clear');near(s.earned,4*3+3);
 const frames=FX.plan(events);near(frames.reduce((sum,f)=>sum+f.overkillBonus,0),3);near(frames.reduce((sum,f)=>sum+f.reward,0),s.earned);
 s.upgrades.reward=5;near(FX.plan(events).reduce((sum,f)=>sum+f.overkillBonus,0),3);
 const off=combatFixture(1000);off.levels.richter=50;off.actionLevels.richter=100000;off.purchasedPerks.richter=['bom-ber'];off.upgrades.reward=5;off.upgrades.overkill=1;off.factors=0;
 const summary=E.advance(off,600,()=>.999),reward=summary.filter(e=>e.type==='clear');
 near(off.earned,off.kills*4+reward.reduce((sum,e)=>sum+e.overkills,0)*1);
 near(FX.plan(summary).reduce((sum,f)=>sum+f.overkillBonus,0),reward.reduce((sum,e)=>sum+e.overkills,0)*1);
 const rates=E.expectedIncome(off);assert.ok(rates.bonusPerSecond>0);near(rates.factorsPerSecond,rates.clearsPerSecond*4+rates.bonusPerSecond);
});

test('Vishunal uses a small grounded footprint with the same scaled muzzle coordinates',()=>{
 for(const mobile of [false,true]){
  const l=UI.orbitLayout({width:1100,mobile,grounded:true,metaHired:true,vishunalHired:true,metaCount:0,enemyCount:3});
  assert.equal(l.vishunal.extentY,mobile?105:112);near(l.vishunal.footOffset,90*l.vishunal.spriteScale);
  near(l.vishunal.y+l.vishunal.footOffset,l.meta.y+l.meta.footOffset);assert.ok(l.vishunal.footprint<l.meta.footprint*.6);
 }
 const s=combatFixture(1000);s.levels.vishunal=1;s.selectedCharacterId='vishunal';const h=harness(s);h.click('attack');
 const shot=h.get('vishunal-projectiles').lastElementChild,flash=h.get('vishunal-muzzles').lastElementChild;
 near(parseFloat(shot.style.left),140+(parseFloat(flash.style.left)-112)*.5);near(parseFloat(shot.style.top),150+(parseFloat(flash.style.top)-112)*.5);
});
