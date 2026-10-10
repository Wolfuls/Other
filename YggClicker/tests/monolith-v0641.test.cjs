'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,ready}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
function scene(){const s=ready(['meta']);s.paused=true;E.selectMemories(s);return harness(s);}
const red=h=>h.get('memory-monolith').classList.contains('dream-awakening');
test('monolith stays dark until Yes and goes dark at the next-run midpoint',()=>{
 const h=scene();assert.equal(red(h),false);h.click('memory-monolith');assert.equal(h.get('dream-dialog').open,true);assert.equal(red(h),false);
 h.click('dream-no');assert.equal(red(h),false);h.click('memory-monolith');h.click('dream-yes');assert.equal(red(h),true);
 h.advance(1700);assert.equal(red(h),true);assert.equal(h.saved().runNumber,1);
 h.advance(110);assert.equal(red(h),false);assert.equal(h.saved().runNumber,2);
 h.advance(2000);assert.equal(red(h),false);assert.equal(h.get('dream-transition').open,false);
});
test('early transition completion and reduced motion never leave the monolith lit',()=>{
 for(const mode of ['hidden','escape','reduced']){const h=scene();if(mode==='reduced')h.media.matches=true;h.click('memory-monolith');h.click('dream-yes');assert.equal(red(h),true);
  if(mode==='hidden')h.visible(false);else if(mode==='escape')h.get('dream-transition').listeners.get('cancel')({preventDefault(){}});else h.advance(810);
  assert.equal(red(h),false);assert.equal(h.saved().runNumber,2);
 }
});
