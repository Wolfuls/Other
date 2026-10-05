'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');
const prepared=()=>{const s=E.createState(1000);s.paused=true;s.factors=12345;s.kills=999;s.hp=3;s.levels.meta=50;s.levels.richter=50;s.levels.vishunal=30;s.actionLevels.meta=100;s.actionLevels.richter=100;s.purchasedPerks.richter=['bom-ber'];s.upgrades.reward=4;return s;};
const toggle=(h,value)=>{h.get('option-orbits').checked=value;h.get('option-orbits').listeners.get('change')();};

test('currency stays synchronized across the desktop, pinned bar and dialog headers after earning, spending and importing',()=>{
 const state=prepared();state.paused=false;const h=harness(state);
 const amounts=()=>['factors','factors-pinned','factors-save','factors-help'].map(id=>h.get(id).textContent);
 const check=value=>assert.deepEqual(amounts(),Array(4).fill(UI.currencyNumber(value)));
 check(state.factors);
 h.click('attack');h.advance(500);h.click('pause');const earned=h.saved();assert.ok(earned.factors>state.factors);check(earned.factors);
 h.get('character-list').listeners.get('click')({target:{closest:selector=>selector==='[data-hire], [data-action]'?{dataset:{hire:'meta'},disabled:false}:null}});
 const spent=h.saved();assert.ok(spent.factors<earned.factors);check(spent.factors);
 const imported=prepared();imported.factors=1234567890123;
 h.get('save-text').value=S.encode(imported);h.click('preview-import');h.click('confirm-import');check(imported.factors);
 h.click('tab-options');h.click('option-help');check(imported.factors);
});

test('schema 11 migration adds visible orbits and preserves all game progress',()=>{
 const state=prepared(),old=structuredClone(state);delete old.options;
 assert.deepEqual(S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:11,state:old})),{...state,hp:6});
});

test('display preference survives export/import and old unversioned states use the default',()=>{
 const state=prepared();state.options.showOrbits=false;
 assert.equal(JSON.parse(S.encode(state)).schemaVersion,S.VERSION);
 assert.deepEqual(S.decode(S.encode(state)),state);
 const legacy=structuredClone(state);delete legacy.options;
 assert.equal(S.validateState(legacy).options.showOrbits,true);
 for(const value of [null,0,'false',{}]){const invalid=structuredClone(state);invalid.options.showOrbits=value;assert.throws(()=>S.encode(invalid),/表示設定/);}
});

test('orbit option removes the decorative nodes, persists and restores without changing combat values',()=>{
 const state=prepared(),h=harness(state),dps=h.get('dps').textContent,stats=h.get('stats-meta').textContent;
 assert.ok(h.get('meta-orbits').children.length>0);assert.ok(h.get('richter-orbits').children.length>0);
 toggle(h,false);
 for(const id of ['meta-orbits','richter-orbits']){assert.equal(h.get(id).hidden,true);assert.equal(h.get(id).children.length,0);}
 assert.deepEqual(h.saved(),{...state,options:{...state.options,showOrbits:false}});
 assert.equal(h.get('dps').textContent,dps);assert.equal(h.get('stats-meta').textContent,stats);
 const reloaded=harness(h.saved());assert.equal(reloaded.get('option-orbits').checked,false);assert.equal(reloaded.get('meta-orbits').children.length,0);
 toggle(h,true);assert.deepEqual(h.saved(),state);assert.ok(h.get('meta-orbits').children.length>0);assert.ok(h.get('richter-orbits').children.length>0);
});

test('hidden floating symbols retain attack projectiles, impacts and identical earned currency',()=>{
 const state=prepared();state.paused=false;state.selectedCharacterId='meta';
 const on=harness(state),off=harness({...state,options:{...state.options,showOrbits:false}});
 for(const h of [on,off]){h.click('attack');h.advance(120);assert.ok(h.get('saw-projectiles').children.length>0);h.advance(1600);h.click('pause');}
 const a=on.saved(),b=off.saved();delete a.options;delete b.options;assert.deepEqual(a,b);
 assert.ok(a.kills>state.kills);assert.ok(a.factors>state.factors);
});

test('manager tabs and keyboard navigation switch panels without touching the running battle',()=>{
 const s=prepared();s.paused=false;const a=harness(s),b=harness(s);
 a.click('tab-upgrades');assert.equal(a.get('panel-upgrades').hidden,false);assert.equal(a.get('panel-characters').hidden,true);
 let prevented=false;a.get('tab-upgrades').listeners.get('keydown')({key:'ArrowRight',preventDefault(){prevented=true;}});
 assert.ok(prevented);assert.equal(a.document.activeElement.id,'tab-stats');assert.equal(a.get('tab-stats').tabIndex,0);assert.equal(a.get('tab-upgrades').tabIndex,-1);
 assert.equal(a.get('panel-stats').hidden,false);assert.equal(a.get('panel-upgrades').hidden,true);
 for(const h of [a,b]){h.advance(2300);h.click('pause');}assert.deepEqual(a.saved(),b.saved());
});

test('character picker inspects allies without selecting a manual attacker',()=>{
 const s=prepared();s.levels.vishunal=0;s.factors=0;const h=harness(s);
 h.click('inspect-richter');assert.equal(h.get('card-meta').hidden,true);assert.equal(h.get('card-richter').hidden,false);assert.equal(h.saved().selectedCharacterId,null);
 h.click('inspect-vishunal');assert.equal(h.get('card-vishunal').hidden,false);assert.equal(h.saved().selectedCharacterId,null);assert.equal(h.get('picker-name-vishunal').textContent,'？？？');
 h.get('inspect-vishunal').listeners.get('keydown')({key:'Home',preventDefault(){}});assert.equal(h.document.activeElement.id,'inspect-meta');assert.equal(h.get('card-meta').hidden,false);assert.equal(h.saved().selectedCharacterId,null);
});

test('desktop arena fits the actual available height and ignoring hidden orbits reduces zoom-out',()=>{
 const base={width:900,grounded:true,metaHired:true,richterHired:true,vishunalHired:true,enemyCount:3,metaScale:2,richterScale:2,metaCount:60,richterCount:60};
 for(const availableHeight of [180,300,520]){
  const visible=UI.orbitLayout({...base,availableHeight}),hidden=UI.orbitLayout({...base,availableHeight,metaCount:0,richterCount:0});
  assert.equal(visible.viewHeight,availableHeight);assert.equal(hidden.viewHeight,availableHeight);assert.ok(hidden.zoom>visible.zoom);assert.ok(hidden.viewWidth<=base.width);
 }
});
