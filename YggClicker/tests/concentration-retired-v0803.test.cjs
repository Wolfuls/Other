const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,roundTrip,character}=require('./current-fixtures.cjs');
test('legacy HP/action CP is returned without touching other allocations or balances',()=>{
 const s=ready(['meta']);s.levels.meta=101;s.concentration.meta={action:20,vitality:30,power:10,accuracy:5,evasion:4,armor:6};s.health.meta.hp=17;
 const loaded=roundTrip(s);assert.deepEqual(loaded.concentration.meta,{power:10,accuracy:5,evasion:4,armor:6});
 assert.equal(E.concentrationPoints(loaded,'meta')-Object.values(loaded.concentration.meta).reduce((a,b)=>a+b,0),75);
 assert.equal(loaded.health.meta.hp,17);assert.equal(loaded.factors,s.factors);assert.deepEqual(roundTrip(loaded),loaded);
 for(const kind of ['action','vitality'])assert.equal(E.setConcentration(loaded,'meta',{...loaded.concentration.meta,[kind]:1}),false);
});
test('six ability seeds use 1.04 per level including HP and action without CP',()=>{
 const s=ready(['meta']);s.levels.meta=101;const c=character('meta');
 for(const [id,kind]of Object.entries({pride:'action',vanity:'evasion',envy:'accuracy',wrath:'power',gluttony:'vitality',lust:'armor'})){
 const base=E.strengthValue(s,c,kind);s.seedLevels[id]=10;assert.ok(Math.abs(E.strengthValue(s,c,kind)/base-1.04**10)<1e-12);
 }
 assert.deepEqual(D.concentration.map(t=>t.id),['accuracy','evasion','power','armor']);
});
