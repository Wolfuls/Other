'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),{harness}=require('./app-harness.cjs');
const change=(h,id,value)=>{const el=h.get('option-'+id);if(typeof value==='boolean')el.checked=value;else el.value=value;el.listeners.get('change')();};
function fighter(){const s=combatFixture(1000);s.levels.richter=50;s.selectedCharacterId='richter';s.factors=100000;s.upgrades.overkill=1;return s;}
const textOf=node=>node.textContent+' '+node.children.map(textOf).join(' ');

test('all display preferences persist, missing fields default safely, and malformed values are rejected',()=>{
 const s=fighter();s.options={showOrbits:false};assert.deepEqual(S.validateState(s).options,{...D.displayDefaults,showOrbits:false});
 s.options={...D.displayDefaults,hitEffects:'simple',showFactorRain:false,showRewardDice:false,showDamageNumbers:false,showOverflowLabels:false,showDefeatLabels:false};
 assert.deepEqual(S.decode(S.encode(s)),S.validateState(s));
 for(const key of Object.keys(D.displayDefaults))for(const value of [null,42,{},'invalid'])assert.throws(()=>S.encode({...s,options:{...s.options,[key]:value}}),/表示設定/);
});

test('hit modes retain the same single-target combat but change only their visual layers',()=>{
 let expected;
 for(const mode of D.hitEffectModes){
  const s=fighter();s.options.hitEffects=mode;moveTestParty(s,'scarecrow');E.ensureEnemies(s)[0].hp=1;s.hp=1;const h=harness(s,undefined,{combatRandom:()=>.5});
  h.click('attack');h.advance(780);
  assert.equal(h.get('arena-viewport').dataset.hitEffects,mode);
  assert.equal(h.get('hit-effects').children.length,mode==='off'?0:1);
  assert.equal(h.get('explosions').children.length,['normal','translucent'].includes(mode)?1:0);
  if(mode==='simple')assert.ok(h.get('hit-effects').firstElementChild.classList.contains('simple-hit'));
  assert.ok(h.get('enemy-defeats').children.some(n=>n.classList.contains('enemy-defeat')),'defeat animation remains');
  h.click('pause');const result=h.saved();delete result.options;
  if(expected)assert.deepEqual(result,expected);else expected=result;
 }
});

test('turning off visuals during a volley clears current effects, keeps projectiles and preserves all progress',()=>{
 const s=fighter();s.levels.richter=Math.max(s.levels.richter,201);s.purchasedPerks.richter=['bom-ber'];s.perkEnabled.richter=Object.fromEntries(s.purchasedPerks.richter.map(id=>[id,true]));
 const on=harness(s,undefined,{combatRandom:()=>.5}),off=harness(s,undefined,{combatRandom:()=>.5});
 for(const h of [on,off]){h.click("attack");h.advance(780);}
 assert.ok(off.get('explosions').children.length>0);
 for(const [id,value] of [['hit-effects','off'],['factor-rain',false],['reward-dice',false],['damage-numbers',false],['overflow-labels',false],['defeat-labels',false]])change(off,id,value);
 for(let i=0;i<30;i++){
  for(const id of ['hit-effects','explosions','damage-floats'])assert.equal(off.get(id).children.length,0);
  for(const id of ['reward-rain','factor-rain'])assert.ok(off.get(id).children.every(n=>n.hidden));
  assert.ok(off.get('enemy-defeats').children.every(n=>!n.classList.contains('defeat-label')));
  assert.equal(off.get('richter-projectiles').children.length,on.get('richter-projectiles').children.length,'visual options do not remove real projectiles; both views share respawn gaps');
  on.advance(100);off.advance(100);
 }
 for(const h of [on,off])h.click('pause');
 const a=on.saved(),b=off.saved();delete a.options;delete b.options;assert.deepEqual(a,b);
 assert.ok(a.kills>0);assert.ok(a.factors>s.factors);
});

test('damage, overflow and defeat text have independent controls and include batched summaries',()=>{
 for(const key of ['showDamageNumbers','showOverflowLabels','showDefeatLabels']){
  const s=fighter();s.levels.richter=1001;s.concentration.richter.action=500;s.concentration.richter.power=500;s.purchasedPerks.richter=['bom-ber'];s.perkEnabled.richter=Object.fromEntries(s.purchasedPerks.richter.map(id=>[id,true]));
  for(const option of ['showDamageNumbers','showOverflowLabels','showDefeatLabels'])s.options[option]=option===key;
  const h=harness(s,undefined,{combatRandom:()=>.5});let seen=false;
  for(let i=0;i<80;i++){
   h.advance(50);const damage=textOf(h.get('damage-floats')),down=textOf(h.get('enemy-defeats'));
   if(key==='showDamageNumbers'){assert.doesNotMatch(damage,/巻き込み|気絶/);assert.doesNotMatch(down,/DOWN|OVERKILL/);seen||=/\d/.test(damage);}
   if(key==='showOverflowLabels'){assert.doesNotMatch(damage,/合計|気絶|\d/);assert.doesNotMatch(down,/DOWN|OVERKILL/);seen||=/全体攻撃/.test(damage);}
   if(key==='showDefeatLabels'){assert.doesNotMatch(damage,/合計|巻き込み/);seen||=/DOWN.*OVERKILL/.test(down);}
  }
  assert.ok(seen,key);
 }
});

test('reward dice can be disabled independently of ambient dice and restored on future impacts',()=>{
 const h=harness(fighter());h.click('attack');h.advance(780);assert.ok(h.get('factor-rain').children.some(n=>!n.hidden));
 h.click('attack');h.advance(780);assert.ok(h.get('reward-rain').children.some(n=>!n.hidden));
 change(h,'reward-dice',false);assert.ok(h.get('reward-rain').children.every(n=>n.hidden));
 assert.ok(h.get('factor-rain').children.some(n=>!n.hidden));
 change(h,'factor-rain',false);change(h,'reward-dice',true);h.click('attack');h.advance(780);
 assert.ok(h.get('factor-rain').children.every(n=>n.hidden));assert.ok(h.get('reward-rain').children.some(n=>!n.hidden));
 const reloaded=harness(h.saved());assert.equal(reloaded.get('option-factor-rain').checked,false);assert.equal(reloaded.get('option-reward-dice').checked,true);
});

