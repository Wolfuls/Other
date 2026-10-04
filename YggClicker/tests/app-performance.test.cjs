'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),{harness}=require('./app-harness.cjs');
function fixture(action=190){const s=E.createState(1000);s.levels.richter=50;s.actionLevels.richter=action;s.selectedCharacterId='richter';E.selectSession(s,'heavy');return s;}

test('continuous auto volleys stay in the same burst through tick gaps and delayed callbacks',()=>{
  const h=harness(fixture());h.advance(1100);
  for(let i=0;i<40;i++){assert.ok(h.get('richter-combatant').classList.contains('bursting'));h.advance(100);}
  h.stall(600);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.advance(500);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.click('pause');assert.ok(!h.get('richter-combatant').classList.contains('bursting'));h.advance(1000);
  assert.ok(!h.get('richter-combatant').classList.contains('bursting'));assert.equal(h.get('richter-projectiles').children.length,0);
});

test('finite rapid manual attacks stop at their release, with no forced full sprite cycle',()=>{
  const h=harness(fixture(0));h.click('attack');h.advance(20);h.click('attack');
  assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  // The first single throw releases at 200ms, after the second rapid throw at 100ms.
  h.advance(179);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.advance(1);assert.ok(!h.get('richter-combatant').classList.contains('bursting'));
  assert.ok(h.get('richter-projectiles').children.length>0,'already launched bombs continue');
});

test('a burst produced by accumulated points at low action returns to idle',()=>{
  const s=fixture(50);s.actionPoints.richter=75;const h=harness(s);
  h.advance(1100);assert.ok(h.get('richter-combatant').classList.contains('bursting'));
  h.advance(110);assert.ok(!h.get('richter-combatant').classList.contains('bursting'));
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
  assert.equal(h.metrics.layout,7,'one geometry read for the entire volley stream');
  h.resize();h.advance(1000);assert.equal(h.metrics.layout,14);
});

test('extreme attack summaries are not expanded again into hundreds of projectile nodes',()=>{
  const s=fixture(1000000);s.levels.meta=50;s.actionLevels.meta=1000000;const h=harness(s);
  let max=0,labelled=false;
  for(let i=0;i<400;i++){
    h.advance(10);
    const shots=[...h.get('saw-projectiles').children,...h.get('richter-projectiles').children];
    max=Math.max(max,shots.length);labelled ||= shots.some(el=>el.dataset.attackCount>1);
  }
  assert.ok(labelled);assert.ok(max<=24,`${max} projectile nodes`);
});

test('both actors keep projectiles in flight between one-second ticks at two attacks per second',()=>{
  for(const spillover of [false,true]){
    const s=fixture(70);s.levels.meta=50;s.actionLevels.meta=26;s.sessionId='practice';s.hp=10;
    if(spillover)s.purchasedPerks.richter=['bom-ber'];
    const h=harness(s);h.advance(2500);
    for(let i=0;i<250;i++){
      for(const [id,delayKey]of [['meta','--launch-delay'],['richter','--throw-delay']]){
        const layer=h.get(id==='meta'?'saw-projectiles':'richter-projectiles');
        const flying=layer.children.filter(e=>{const start=e.createdAt+parseFloat(e.style.getPropertyValue(delayKey));const end=start+parseFloat(e.style.getPropertyValue('--flight-duration'));return h.now>=start+6&&h.now<end;});
        assert.ok(flying.length>0,`${id} blank at ${h.now}, spillover=${spillover}`);
      }
      h.advance(20);
    }
    h.click('pause');assert.equal(h.get('saw-projectiles').children.length,0);assert.equal(h.get('richter-projectiles').children.length,0);
  }
});

test('mohican appearances rotate on defeats and normal renders retain the active variant',()=>{
  const s=fixture(70);s.sessionId='mohicans';s.hp=10;const h=harness(s),names=new Set();
  for(let i=0;i<200;i++){h.advance(50);names.add(h.get('enemy-name').textContent);}
  assert.equal(names.size,10);h.click('pause');const image=h.get('enemy-art').dataset.appearance;h.advance(1000);assert.equal(h.get('enemy-art').dataset.appearance,image);
});
