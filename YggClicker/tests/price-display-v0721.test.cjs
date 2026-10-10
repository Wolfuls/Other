'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,ready,character}=require('./current-fixtures.cjs'),{harness}=require('./app-harness.cjs'),UI=require('../js/display');
const click=(h,selector,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s===selector?{disabled:false,dataset}:null}});
test('large wallets do not erase level prices or draft totals, and undo restores zero',()=>{
 const s=ready(['meta']);s.paused=true;s.factors=1e31;const c=character('meta'),cost=E.hireCost(s,c),ten=E.purchaseQuote(s,'level','meta',10).cost;
 assert.equal(s.factors-cost,s.factors);
 const h=harness(s);click(h,'[data-ability]',{ability:'meta'});
 assert.equal(h.get('hire-cost-meta').textContent,UI.currencyNumber(cost)+' Rd');
 assert.equal(h.get('buy10-level-meta').querySelector('small').textContent,UI.currencyNumber(ten)+' Rd');
 click(h,'[data-hire]',{hire:'meta'});
 assert.equal(h.get('ability-changes-meta').textContent,'確定時に '+UI.currencyNumber(cost)+' Rd消費');
 click(h,'[data-trade]',{kind:'level',trade:'sell',id:'meta',count:'1'});
 assert.equal(h.get('ability-changes-meta').textContent,'因子の増減なし');
});
test('large wallet CP reset fee is included in draft total',()=>{
 const s=ready(['meta']);s.paused=true;s.factors=1e31;s.levels.meta=20;s.concentration.meta.power=5;
 const h=harness(s),fee=E.concentrationResetCost(s,'meta');click(h,'[data-ability]',{ability:'meta'});click(h,'[data-focus-reset]',{focusReset:'meta'});
 assert.equal(h.get('ability-changes-meta').textContent,'確定時に '+UI.currencyNumber(fee)+' Rd消費');
});
