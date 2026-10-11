'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {E,S,ready,enable}=require('./current-fixtures.cjs'),UI=require('../js/display'),{harness}=require('./app-harness.cjs');
test('Japanese grouping uses four digits, at most three decimals and preserves western display',()=>{
 for(const [n,text]of [[9999,'9,999'],[10000,'1万'],[1e6,'100万'],[1e8,'1億'],[1e12,'1兆'],[1e16,'1京'],[123456789,'1.235億'],[-123456789,'-1.235億']])assert.equal(UI.fullNumber(n,'japanese'),text);
 assert.equal(UI.fullNumber(1e6,true),'1 million');assert.equal(UI.fullNumber(1e9,'western'),'1 billion');assert.equal(UI.fullNumber(1e12,'western'),'1 trillion');assert.equal(UI.fullNumber(1e8),'100,000,000');assert.ok(!UI.fullNumber(1e100,'japanese').includes('undefined'));
});
test('selector persists all three modes without changing currency and old preference keeps western units',()=>{
 const s=ready();s.paused=true;s.factors=1e8;s.options.simplifiedNumbers=true;delete s.options.numberUnit;const loaded=S.decode(S.encode(s));assert.equal(loaded.options.numberUnit,'western');const h=harness(loaded),input=h.get('option-simple-numbers');
 for(const [mode,text]of [['japanese','1億'],['western','100 million'],['normal','100,000,000']]){input.value=mode;input.listeners.get('change')();assert.equal(h.get('factors').textContent,text);assert.equal(h.saved().factors,1e8);}
 const bad=structuredClone(loaded);bad.options.numberUnit='invalid';assert.throws(()=>S.encode(bad));
});
test('magic counter holds 0/1 until release, shows consumed 1/1 through animation, then resets',()=>{
 const s=ready(['megumin']);s.forecast=true;s.enemies[0].evasionFailure=true;const h=harness(s,undefined,{combatRandom:()=>.4});assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.0 / 1');h.click('attack');assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.1 / 1');h.advance(800);assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.1 / 1');h.advance(650);assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.0 / 1');
});
test('charged magic counter uses actual spent magic during release rather than reset simulation state',()=>{
 const s=ready(['megumin']);enable(s,'megumin','laws-of-heaven');s.health.megumin.magicLevel=4;s.forecast=true;s.enemies[0].evasionFailure=true;const h=harness(s,undefined,{combatRandom:()=>.4});assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.3 / 4');h.click('attack');assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.4 / 4');h.advance(1450);assert.equal(h.get('ally-magic-megumin').textContent,'魔力 Lv.0 / 4');
});
