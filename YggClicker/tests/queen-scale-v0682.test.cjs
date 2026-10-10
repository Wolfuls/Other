'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),UI=require('../js/display');
const {ready}=require('./current-fixtures.cjs'),{harness}=require('./app-harness.cjs');

test('Queen stays grounded at her smaller height on desktop and mobile, including after resize',()=>{
 for(const mobile of [false,true])for(const width of [390,700,1280]){
  const layout=UI.orbitLayout({width,mobile,grounded:true,metaHired:true,queenHired:true,meguminHired:true,tordelieseHired:true,metaCount:0});
  const queen=layout.queen,feet=queen.y+queen.footOffset;
  assert.equal(feet,layout.megumin.y+layout.megumin.footOffset);
  assert.equal(feet,layout.tordeliese.y+layout.tordeliese.footOffset);
  assert.equal(queen.y-queen.height/2+360/384*queen.spriteSize,feet);
  assert.ok(queen.spriteSize<224&&queen.spriteSize>layout.megumin.spriteSize&&queen.spriteSize<layout.tordeliese.spriteSize);
 }
 const s=ready(['queen']);s.paused=true;const h=harness(s),actor=h.get('queen-combatant');
 assert.equal(actor.style.getPropertyValue('--queen-size'),'208px');
 h.get('arena-viewport').clientWidth=390;h.resize();
 assert.equal(actor.style.getPropertyValue('--body-foot'),'91px');
});
