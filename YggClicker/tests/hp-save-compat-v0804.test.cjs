const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip}=require('./current-fixtures.cjs');
const oldE={maxHP:(s,c)=>Math.floor(c.maxHP*(1+.02*Math.max(0,s.levels[c.id]-1))*1.08**((s.concentration[c.id].vitality||0)/(1+2.5*(s.concentration[c.id].vitality||0)/100))*1.08**s.seedLevels.gluttony)};
test('pre-change full and wounded HP saves load with CP/seed changes without losing progress',()=>{
 for(const cp of [0,100])for(const seed of [0,10])for(const status of ['active','unconscious','dying']){
 const s=ready(['meta']);s.levels.meta=101;s.concentration.meta={action:0,vitality:cp,power:0,accuracy:0,evasion:0,armor:0};s.seedLevels.gluttony=seed;
 for(const c of D.characters)if(!s.levels[c.id])s.health[c.id].hp=oldE.maxHP(s,c);
 const max=oldE.maxHP(s,character('meta'));s.health.meta={hp:status==='dying'?-7:status==='unconscious'?max-1:max,status,regenSeconds:status==='active'?0:2};
 const original=JSON.stringify({gameId:D.gameId,schemaVersion:58,state:s}),loaded=S.decode(original),limit=E.maxHP(loaded,character('meta'));
 assert.equal(loaded.health.meta.hp,status==='dying'?-7:status==='active'?Math.min(max,limit):Math.min(max-1,limit-1));
 assert.equal(loaded.health.meta.status,status);assert.equal(loaded.factors,s.factors);assert.deepEqual(loaded.levels,s.levels);assert.deepEqual(loaded.seedLevels,s.seedLevels);assert.deepEqual(roundTrip(loaded),loaded);
 const values=new Map([[S.KEY,original]]),storage={getItem:k=>values.get(k)||null};assert.equal(S.load(storage).blocked,undefined);assert.equal(values.get(S.KEY),original);
 }
});
test('wounded HP below new cap stays unchanged and new saves still reject excessive HP',()=>{
 const s=ready(['meta']);s.levels.meta=101;s.health.meta.hp=17;
 assert.equal(S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:58,state:s})).health.meta.hp,17);
 s.health.meta.hp=1000;assert.throws(()=>roundTrip(s),/味方HP/);
});

