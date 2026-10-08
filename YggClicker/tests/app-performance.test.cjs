'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require("../js/data.js");
const E=require('../js/engine.js'),{harness}=require('./app-harness.cjs');
function fixture(action=190){const s=combatFixture(1000);s.levels.richter=50;s.accuracyLevels.richter=200;s.actionLevels.richter=action;s.selectedCharacterId='richter';moveTestParty(s,'heavy');s.questLevels.heavy=160;s.hp=E.getSession(s).hp;return s;}

test('continuous auto volleys stay in the same burst through tick gaps and delayed callbacks',()=>{
  const h=harness(fixture(),undefined,{combatRandom:()=>.5});h.advance(1100);
  for(let i=0;i<40;i++){assert.ok(h.get('richter-combatant').classList.contains('bursting'));h.advance(100);}
  h.stall(600);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.advance(500);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.click('pause');assert.ok(!h.get('richter-combatant').classList.contains('bursting'));h.advance(1000);
  assert.ok(!h.get('richter-combatant').classList.contains('bursting'));assert.equal(h.get('richter-projectiles').children.length,0);
});

test('finite rapid manual attacks return to idle after their release',()=>{
  const q=D.sessions.find(q=>q.id==='heavy'),old=q.action;q.action=0;
  try{const h=harness(fixture(0),undefined,{combatRandom:()=>.5});h.click('attack');h.advance(20);h.click('attack');
  assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.advance(200);assert.ok(h.get('richter-projectiles').children.length>0,'launched bombs continue');
  h.advance(700);assert.ok(!h.get('richter-combatant').classList.contains('bursting'));}finally{q.action=old;}
});

test('a burst produced by accumulated points at low action returns to idle',()=>{
  const q=D.sessions.find(q=>q.id==='heavy'),old=q.action;q.action=0;
  try{const s=fixture(0);s.actionPoints.richter=E.actionThreshold(s)*2-E.actionPower(s,D.characters.find(c=>c.id==="richter"));const h=harness(s,undefined,{combatRandom:()=>.5});
  h.advance(1100);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.advance(800);assert.ok(!h.get('richter-combatant').classList.contains('bursting'));}finally{q.action=old;}
});

test('hidden pages and reduced motion reset sustained bursts; resume starts on a real attack',()=>{
  const h=harness(fixture());h.advance(1200);h.visible(false);
  assert.ok(!h.get('richter-combatant').classList.contains('bursting'));h.advance(2100);h.visible(true);
  assert.ok(!h.get('richter-combatant').classList.contains('bursting'));h.advance(1000);
  assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.media.matches=true;h.media.change();h.advance(1200);
  assert.ok(!h.get('richter-combatant').classList.contains('bursting'));
});

test('unchanged ticks do not rewrite controls; hits only update combat HUD, geometry is reused until resize',()=>{
  const s=fixture();s.paused=true;const h=harness(s);h.advance(1000);
  assert.deepEqual(h.metrics,{text:0,formulas:0,controls:0,layout:0});
  h.click('pause');h.resetMetrics();h.advance(5000);
  assert.ok(h.metrics.controls<=5,JSON.stringify(h.metrics));assert.ok(h.metrics.formulas<=5*24);
  assert.equal(h.metrics.layout,11,'one geometry read for the entire volley stream');
  h.resize();h.advance(1000);assert.equal(h.metrics.layout,22);
});

test('extreme attack summaries are not expanded again into hundreds of projectile nodes',()=>{
  const s=fixture(190);s.levels.meta=50;s.accuracyLevels.meta=200;s.actionLevels.meta=190;s.actionPoints.meta=1e6;s.actionPoints.richter=1e6;const h=harness(s);
  let max=0,labelled=false;
  for(let i=0;i<400;i++){
    h.advance(10);
    const shots=[...h.get('saw-projectiles').children,...h.get('richter-projectiles').children];
    max=Math.max(max,shots.length);labelled ||= shots.some(el=>el.dataset.attackCount>1);
  }
  assert.ok(labelled);assert.ok(max<=24,`${max} projectile nodes`);
});

test('both actors maintain projectile streams across successive one-second volleys',()=>{
  const q=D.sessions.find(q=>q.id==='heavy'),old={...q};Object.assign(q,{hp:1e9,action:1,formationCount:3});
  try{for(const spillover of [false,true]){
    const s=fixture(96);s.levels.meta=50;s.accuracyLevels.meta=200;s.actionLevels.meta=60;s.questLevels.heavy=1;s.questActiveLevels.heavy=1;s.hp=E.getSession(s).hp;
    if(spillover)s.purchasedPerks.richter=['bom-ber'];s.perkEnabled.richter=Object.fromEntries(s.purchasedPerks.richter.map(id=>[id,true]));
    const h=harness(s);h.advance(2500);
    const visible={meta:0,richter:0};for(let i=0;i<250;i++){
      for(const [id,delayKey]of [['meta','--launch-delay'],['richter','--throw-delay']]){
        const layer=h.get(id==='meta'?'saw-projectiles':'richter-projectiles');
        const flying=layer.children.filter(e=>{const start=e.createdAt+parseFloat(e.style.getPropertyValue(delayKey));const end=start+parseFloat(e.style.getPropertyValue('--flight-duration'));return h.now>=start+6&&h.now<end;});
        if(flying.length>0)visible[id]++;
      }
      h.advance(20);
    }
    for(const id of Object.keys(visible))assert.ok(visible[id]>=200,`${id}: ${visible[id]}/250 frames in flight`);
    h.click('pause');assert.equal(h.get('saw-projectiles').children.length,0);assert.equal(h.get('richter-projectiles').children.length,0);
  }}finally{Object.keys(q).forEach(k=>delete q[k]);Object.assign(q,old);}
});

test('mohican appearances rotate on defeats and normal renders retain the active variant',()=>{
  const s=fixture(70);s.sessionId='mohicans';s.hp=10;const h=harness(s),names=new Set();
  for(let i=0;i<400;i++){h.advance(50);names.add(h.get('enemy-art').dataset.appearance);}
  assert.ok(names.size>=3);h.click('pause');const image=h.get('enemy-art').dataset.appearance;h.advance(1000);assert.equal(h.get('enemy-art').dataset.appearance,image);
});
