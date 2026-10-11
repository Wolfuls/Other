'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character:c,roundTrip}=require('./current-fixtures.cjs');
const UI=require('../js/display'),{harness}=require('./app-harness.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const click=(h,selector,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s===selector?{disabled:false,dataset}:null}});
const focus=(s,id,values)=>({...s.concentration[id],...values});

test('every personal strength uses one level, no minimum increment and no former level cap',()=>{
 for(const char of D.characters){const s=ready([char.id]);for(const level of [1,2,11,201,501]){
  s.levels[char.id]=level;for(const t of D.concentration)near(E.strengthValue(s,char,t.id),100*(1+.02*(level-1)));
  assert.equal(E.actionPower(s,char,2),Math.floor(2*(1+.02*(level-1))));
 }
 s.levels[char.id]=200;s.factors=1e50;assert.ok(E.buyMany(s,'level',char.id,10));assert.equal(roundTrip(s).levels[char.id],210);
 }
});
test('focus is six independent multipliers with a shared earned-point budget and diminishing exponent',()=>{
 const s=ready(['meta','richter']);s.levels.meta=101;const base=300,other=structuredClone(s.concentration.richter);
 for(const kind of D.concentration.map(t=>t.id)){
  const allocation=Object.fromEntries(D.concentration.map(t=>[t.id,t.id===kind?100:0]));assert.ok(E.setConcentration(s,'meta',allocation));
  for(const t of D.concentration)near(E.strengthValue(s,c('meta'),t.id),base*(t.id===kind?(t.id==='action'?1+.08*(100/3.5):1.08**(100/3.5)):1));
 }
 assert.deepEqual(s.concentration.richter,other);assert.equal(E.concentrationPoints(s,'meta'),100);
 assert.equal(E.setConcentration(s,'meta',focus(s,'meta',{power:1})),false);
 assert.ok(E.T.focusLog(100,100)-E.T.focusLog(99,100)<E.T.focusLog(2,100)-E.T.focusLog(1,100));
});
test('invalid allocations cannot mutate state or enter saves',()=>{
 const s=ready();s.levels.meta=11;for(const n of [-1,.5,11,Infinity,NaN,'1']){const before=structuredClone(s);assert.equal(E.setConcentration(s,'meta',focus(s,'meta',{power:n})),false);assert.deepEqual(s,before);}
 for(const allocation of [focus(s,'meta',{power:11}),focus(s,'meta',{unknown:0}),focus(s,'meta',{power:.5})])assert.throws(()=>S.encode({...s,concentration:{...s.concentration,meta:allocation}}));
 assert.equal(E.setConcentration(s,'mohicans',focus(s,'meta',{})),false);
});
test('personal concentration survives party moves, saves and quest level changes without leaking to allies',()=>{
 const s=ready(['meta','richter']);s.levels.meta=51;E.setConcentration(s,'meta',focus(s,'meta',{accuracy:20,evasion:10,vitality:20}));
 const before=E.strengthValue(s,c('meta'),'accuracy'),neighbor=E.strengthValue(s,c('richter'),'accuracy');E.setFormation(s,'dementor',['meta']);s.questLevels.dementor=10;E.setQuestLevel(s,'dementor',10);
 const copy=roundTrip(s);near(E.strengthValue(copy,c('meta'),'accuracy'),before);near(E.strengthValue(copy,c('richter'),'accuracy'),neighbor);
});
test('physical and SS judgments use the same respective personal accuracy/evasion strength',()=>{
 const s=ready(['max']);s.levels.max=51;E.setConcentration(s,'max',focus(s,'max',{accuracy:30,evasion:20}));
 const p=E.attackProfile(s,c('max')),incoming=E.enemyHitProfile(s,s.enemies[0],c('max'));
 assert.equal(p.mental,true);assert.deepEqual(p.accuracy,E.accuracySpec(s,c('max'),true));near(p.hitLogRatio,Math.log(E.strengthValue(s,c('max'),'accuracy')/100));
 near(incoming.hitLogRatio,Math.log(100/E.strengthValue(s,c('max'),'evasion')));
});
test('penetration ignores base defense but preserves strength, immunity retains defense in each direction',()=>{
 const s=ready(['meta'],'dementor');s.levels.meta=75;E.togglePerk(s,'meta','metal-blade',true);s.questLevels.dementor=s.questActiveLevels.dementor=20;
 let p=E.attackProfile(s,c('meta'));assert.equal(p.defense,0);near(p.damageLogRatio,Math.log(248/E.T.enemyDurability(19,'armor')));near(p.damageScaleLog,Math.log(2.48*E.T.enemyDurability(19,'armor')/100)/2);
 s.questLevels.scarecrow=s.questActiveLevels.scarecrow=20;E.setFormation(s,'scarecrow',['meta']);E.selectSession(s,'scarecrow');p=E.attackProfile(s,c('meta'));assert.ok(p.penetrationBlocked);assert.equal(p.defense,E.getSession(s).defense);near(p.damageLogRatio,Math.log(248/E.T.enemyDurability(19,'armor')));
 E.setFormation(s,'ozmorn',['meta']);E.selectSession(s,'ozmorn');s.questLevels.ozmorn=s.questActiveLevels.ozmorn=20;
 E.ensureEnemies(s);const normal=E.enemyHitProfile(s,s.enemies[0],c('meta')),immune=E.enemyHitProfile(s,s.enemies[0],{...c('meta'),traits:['penetrationImmune']});
 assert.equal(normal.reduction,0);assert.equal(immune.reduction,2);near(normal.damageLogRatio,Math.log(E.T.enemyDurability(19,'power')/248));near(immune.damageLogRatio,Math.log(E.T.enemyDurability(19,'power')/248));
});
test('all perk tracks unlock from the one character level',()=>{
 const s=ready(['meta']);s.levels.meta=100;E.refreshPerkUnlocks(s);
 for(const p of E.perks(s,c('meta')))assert.equal(p.eligible,p.level<=100);
 assert.ok(E.togglePerk(s,'meta','metal-shield',true));assert.ok(E.togglePerk(s,'meta','spinning-rush',true));
 assert.ok(E.sell(s,'level','meta',1));assert.equal(E.perks(s,c('meta')).find(p=>p.id==='spinning-rush').unlocked,false);
});
test('pending level and HP-focus changes can be undone without healing or damaging the original',()=>{
 const s=ready();s.paused=true;s.levels.meta=51;s.health.meta.hp=35;const h=harness(s);h.openAbility('meta');click(h,'[data-ability]',{ability:'meta'});
 click(h,'[data-trade]',{kind:'level',trade:'sell',id:'meta',count:'10'});click(h,'[data-trade]',{kind:'level',trade:'buy',id:'meta',count:'10'});
 click(h,'[data-focus]',{focus:'meta',focusStat:'vitality',step:'1'});assert.equal(h.saved().concentration.meta.vitality,0);
 click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});assert.equal(h.saved().levels.meta,51);assert.equal(h.saved().health.meta.hp,35);assert.equal(h.saved().factors,s.factors);assert.equal(h.saved().concentration.meta.vitality,1);
});
test('SS has its own base cell, no SS strength; training controls operate on one level',()=>{
 const s=ready();s.paused=true;const h=harness(s),html=h.get('character-list').innerHTML;h.openAbility('meta');
 assert.match(html,/ability-judgments/);assert.match(html,/ss-cell/);assert.equal(h.get('ability-base-ss-meta').textContent,'12＋1D6');assert.doesNotMatch(html,/SS強度|data-stat=|action-cost-meta/);
 assert.match(html,/buy10-level-meta/);assert.match(html,/sell10-level-meta/);
});
test('typed allocations update the draft immediately and persist only after confirmation',()=>{
 const s=ready();s.paused=true;s.levels.meta=32;s.health.meta.hp=17;const h=harness(s);h.openAbility('meta');
 const type=(track,value)=>h.get('character-list').listeners.get('input')({target:{dataset:{focusInput:'meta',focusStat:track},value:String(value)}});
 click(h,'[data-ability]',{ability:'meta'});type('vitality',12);type('power',19);
 assert.equal(h.get('focus-remaining-meta').textContent,'残り 0 / 31 CP');assert.equal(h.saved().concentration.meta.power,0);
 click(h,'[data-ability-close]',{abilityClose:'meta'});assert.equal(h.saved().concentration.meta.vitality,0);
 click(h,'[data-ability]',{ability:'meta'});type('vitality',12);type('power',19);click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});
 assert.equal(h.saved().concentration.meta.vitality,12);assert.equal(h.saved().concentration.meta.power,19);assert.equal(h.saved().health.meta.hp,17);
});
test('large-number formatting is opt-in, changes units cleanly and keeps three decimal places at most',()=>{
 for(const [value,text]of [[999999,'999,999'],[1e6,'1 million'],[1234567,'1.235 million'],[1e9,'1 billion'],[1e12,'1 trillion'],[999999999,'1 billion'],[-1234567890,'-1.235 billion']])assert.equal(UI.fullNumber(value,true),text);
 assert.equal(UI.fullNumber(1234567),'1,234,567');assert.equal(UI.currencyNumber(1e9+.25,true),'1 billion');assert.doesNotMatch(UI.fullNumber(1e100,true),/Infinity|NaN/);
});
test('number preference and recollection use the same persisted amounts; expenses and refunds do not add earned income',()=>{
 const s=ready();s.factors=0;s.earned=0;E.grantIncome(s,1234567890,'questReward');E.buyMany(s,'level','meta',10);const total=s.earned;E.sell(s,'level','meta',10);E.grantIncome(s,500,'migrationRefund');assert.equal(s.earned,total);
 s.paused=true;const h=harness(s);assert.equal(h.get('memory-total').textContent,'1,234,567,890 Rd');
 const input=h.get('option-simple-numbers');input.value='western';input.listeners.get('change')();assert.equal(h.get('memory-total').textContent,'1.235 billion Rd');assert.equal(h.saved().earned,total);assert.equal(h.saved().options.simplifiedNumbers,true);
 input.value='normal';input.listeners.get('change')();assert.equal(h.get('memory-total').textContent,'1,234,567,890 Rd');assert.equal(h.saved().factors,s.factors);
});
