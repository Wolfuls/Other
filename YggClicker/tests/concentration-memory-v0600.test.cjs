'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip,rng}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs'),fs=require('node:fs'),path=require('node:path');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const click=(h,selector,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s===selector?{disabled:false,dataset}:null}});
const type=(h,track,value)=>h.get('character-list').listeners.get('input')({target:{dataset:{focusInput:'meta',focusStat:track},value:String(value)}});
const base=()=>{const s=ready();s.paused=true;s.levels.meta=101;s.concentration.meta.power=30;s.concentration.meta.vitality=10;s.health.meta.hp=17;return s;};
test('eight percent CP uses earned total, including zero CP and every allocation track',()=>{
 assert.equal(E.T.focusLog(0,0),0);assert.equal(E.T.focusLog(10,0),0);
 for(const C of [10,50,100,1000])for(const P of [0,1,C/2,C])near(Math.exp(E.T.focusLog(P,C)),1.08**(P/(1+2.5*P/C)));
 const s=ready();s.levels.meta=101;for(const t of D.concentration){E.setConcentration(s,'meta',Object.fromEntries(D.concentration.map(x=>[x.id,x.id===t.id?50:0])));near(E.strengthValue(s,character('meta'),t.id),300*(t.id==='action'?1+.08*(50/2.25):1.08**(50/2.25)));}
 assert.ok(E.T.focusLog(10,100)>E.T.focusLog(10,10));
});
test('GM delegation does not share levels or create CP for its target',()=>{
 const s=ready(['meta','max']);s.levels.meta=51;s.levels.max=10;s.perkEnabled.max['western-munchkin']=true;s.selectedCharacterId='meta';s.concentration.meta.power=50;
 assert.equal(E.concentrationPoints(s,'meta'),50);near(E.strengthValue(s,character('meta'),'power'),200*1.08**(50/3.5));
});
test('reset costs five percent of retained investment and never adds to lifetime earnings',()=>{
 const s=base(),cost=Math.max(1,Math.floor(E.trainingInvestment(s,character('meta'))*.05)),factors=s.factors,earned=s.earned;
 assert.equal(E.concentrationResetCost(s,'meta'),cost);assert.ok(E.resetConcentration(s,'meta'));assert.equal(s.factors,factors-cost);assert.equal(s.earned,earned);assert.equal(s.health.meta.hp,17);assert.ok(Object.values(s.concentration.meta).every(n=>n===0));
 const copy=structuredClone(s);assert.equal(E.resetConcentration(s,'meta'),false);assert.deepEqual(s,copy);
 const poor=base();poor.factors=cost-1;const before=structuredClone(poor);assert.equal(E.resetConcentration(poor,'meta'),false);assert.deepEqual(poor,before);
});
test('committed CP cannot be removed free; draft additions can be undone free',()=>{
 const s=base(),h=harness(s);click(h,'[data-ability]',{ability:'meta'});type(h,'power',0);type(h,'accuracy',20);type(h,'accuracy',0);click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});
 assert.equal(h.saved().concentration.meta.power,30);assert.equal(h.saved().concentration.meta.accuracy,0);assert.equal(h.saved().factors,s.factors);
});
test('reset is charged once on confirm; close cancels both allocation and payment',()=>{
 const s=base(),h=harness(s),cost=E.concentrationResetCost(s,'meta');click(h,'[data-ability]',{ability:'meta'});click(h,'[data-focus-reset]',{focusReset:'meta'});type(h,'power',40);click(h,'[data-focus-reset]',{focusReset:'meta'});click(h,'[data-ability-close]',{abilityClose:'meta'});assert.equal(h.saved().factors,s.factors);assert.equal(h.saved().concentration.meta.power,30);
 click(h,'[data-ability]',{ability:'meta'});click(h,'[data-focus-reset]',{focusReset:'meta'});type(h,'power',40);click(h,'[data-focus-reset]',{focusReset:'meta'});type(h,'vitality',50);click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});assert.equal(h.saved().factors,s.factors-cost);assert.equal(h.saved().concentration.meta.vitality,50);assert.equal(h.saved().health.meta.hp,17);
});
test('reset fee follows the final draft level and cannot be lost by subsequent level edits',()=>{
 const s=base(),h=harness(s);click(h,'[data-ability]',{ability:'meta'});click(h,'[data-focus-reset]',{focusReset:'meta'});click(h,'[data-hire]',{hire:'meta'});type(h,'power',101);click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});
 const expected=structuredClone(s);E.hire(expected,'meta');expected.factors-=E.concentrationResetCost(expected,'meta');assert.equal(h.saved().factors,expected.factors);assert.equal(h.saved().levels.meta,102);assert.equal(h.saved().concentration.meta.power,101);
});
test('level sale cannot silently erase committed CP as a free reset',()=>{
 const s=base();s.concentration.meta={action:0,accuracy:0,evasion:0,power:100,vitality:0,armor:0};const h=harness(s);
 click(h,'[data-ability]',{ability:'meta'});click(h,'[data-trade]',{kind:'level',trade:'sell',id:'meta',count:'1'});click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});
 assert.equal(h.saved().levels.meta,101);assert.equal(h.saved().concentration.meta.power,100);assert.equal(h.saved().factors,s.factors);
});
test('old CP allocations persist on migration without healing, illegal HP or broken down status',()=>{
 for(const [hp,status,regenSeconds]of [[1000,'active',4],[1,'unconscious',2],[-7,'dying',3]]){
  const s=base();s.concentration.meta={action:0,accuracy:0,evasion:0,power:0,vitality:100,armor:0};s.health.meta={hp,status,regenSeconds};
  const decoded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:38,state:s}));assert.equal(decoded.concentration.meta.vitality,100);assert.ok(decoded.health.meta.hp<=E.maxHP(decoded,character('meta')));assert.ok(decoded.health.meta.hp<=hp);assert.equal(decoded.health.meta.status,status);assert.deepEqual(roundTrip(decoded),decoded);
 }
});
test('recollection is a noncombat quest view: no roster, upgrades, manual attacks or battle resets',()=>{
 const s=ready(['meta'],'mohicans');s.levels.meta=51;s.actionPoints.meta=14;s.enemies[0].actionPoints=18;const battle=E.battleSnapshot(s),rosters=structuredClone(s.formations);
 assert.ok(E.selectMemories(s));assert.deepEqual(E.click(s),[]);assert.equal(E.setFormation(s,'memories',['meta']),false);assert.equal(E.buyQuest(s,'memories'),false);assert.deepEqual(E.battleSnapshot(s),battle);assert.deepEqual(s.formations,rosters);assert.equal(roundTrip(s).viewingMemories,true);
 assert.ok(E.selectSession(s,'mohicans'));assert.equal(s.viewingMemories,false);assert.deepEqual(E.battleSnapshot(s),battle);
 const a=structuredClone(s),b=structuredClone(s);E.selectMemories(a);E.advance(a,5,rng(512),false);E.advance(b,5,rng(512),false);a.viewingMemories=false;assert.deepEqual(a,b);
});
test('recollection is reachable from quests, hides combat and exposes the live earned total',()=>{
 const s=base();s.earned=123456789;const h=harness(s);h.get('quest-list').listeners.get('click')({target:{closest:k=>k==='[data-memories]'?{disabled:false}:null}});
 assert.equal(h.saved().viewingMemories,true);assert.equal(h.get('memory-scene').hidden,false);assert.equal(h.get('arena-viewport').hidden,true);assert.equal(h.get('attack').disabled,true);assert.equal(h.get('memory-total').textContent,'123,456,789 Rd');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.doesNotMatch(html,/tab-memories|panel-memories/);assert.match(h.get('quest-list').innerHTML,/quest-card-memories/);
 const css=fs.readFileSync(path.join(__dirname,'../memories.css'),'utf8');assert.match(css,/:hover~\.memory-inscription/);assert.match(css,/prefers-reduced-motion/);
});
