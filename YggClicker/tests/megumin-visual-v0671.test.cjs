'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {ready,enable}=require('./current-fixtures.cjs'),UI=require('../js/display'),{harness}=require('./app-harness.cjs');

test('Megumin uses the same ground anchor as Meta and Tordeliese after shrinking at either breakpoint',()=>{
 for(const mobile of [false,true])for(const width of [390,1280]){
  const l=UI.orbitLayout({width,mobile,grounded:true,metaHired:true,tordelieseHired:true,meguminHired:true,metaCount:0});
  assert.equal(l.megumin.y+l.megumin.footOffset,l.meta.y+l.meta.footOffset);
  assert.equal(l.megumin.y+l.megumin.footOffset,l.tordeliese.y+l.tordeliese.footOffset);
  assert.ok(l.megumin.spriteSize<l.tordeliese.spriteSize&&l.megumin.spriteSize<=200);
  assert.ok(l.megumin.y-l.megumin.height/2>=0);
 }
});

test('a loaded charge shows exactly one pooled circle per magic level and resize never duplicates them',()=>{
 for(let level=1;level<=7;level++){
  const s=ready(['megumin']);enable(s,'megumin','eternal-hammer');s.paused=true;s.health.megumin.magicLevel=level;
  const h=harness(s),rings=h.get('megumin-charge-axis').children;
  assert.equal(rings.length,7);assert.equal(rings.filter(r=>!r.hidden).length,level);
  assert.equal(h.get('megumin-combatant').classList.contains('charging'),level>0);
  h.resize();h.resize();h.advance(1000);assert.equal(h.get('megumin-charge-axis').children.length,7);
 }
});

test('downed or stunned Megumin never retains the charging pose',()=>{
 for(const down of [false,true]){
  const s=ready(['megumin']);enable(s,'megumin','laws-of-heaven');s.paused=true;s.health.megumin.magicLevel=3;
  if(down){s.health.megumin.hp=0;s.health.megumin.status='unconscious';}else s.health.megumin.stunTurns=2;
  const h=harness(s);assert.equal(h.get('megumin-combatant').classList.contains('charging'),false);
 }
});
