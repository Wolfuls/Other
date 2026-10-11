const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,D,ready,character,roundTrip}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('training pressure counts allocated CP only, independent of unspent levels and distribution',()=>{
 const s=ready(['meta']),c=character('meta');s.levels.meta=101;
 assert.equal(E.trainingRunawayPressure(s,c),0);
 E.setConcentration(s,'meta',{...E.concentration(s,'meta'),power:10,accuracy:20});
 let b=E.runawayPressureBreakdown(s,c);assert.equal(b.trainingTotal,30);near(b.training,.01*Math.log2(31));
 s.levels.meta=201;near(E.trainingRunawayPressure(s,c),b.training);
 E.setConcentration(s,'meta',{...E.concentration(s,'meta'),power:30,accuracy:0});near(E.trainingRunawayPressure(s,c),b.training);
 near(E.trainingRunawayPressure(roundTrip(s),c),b.training);
 assert.ok(E.resetConcentration(s,'meta'));assert.equal(E.trainingRunawayPressure(s,c),0);
});
test('pressure UI shows allocated CP and excludes unspent CP',()=>{
 const s=ready(['meta']);s.levels.meta=101;s.concentration.meta.power=7;
 const h=harness(s);h.openAbility('meta');const html=h.get('pressure-content-meta').innerHTML;
 assert.match(html,/配分済みCP合計/);assert.match(html,/攻撃 7/);assert.match(html,/未使用CPは含まない/);assert.doesNotMatch(html,/育成Lv合計/);
});
test('enemy and ally growth remain distinct at matching levels without CP',()=>{
 const s=ready(['meta']),c=character('meta');s.levels.meta=101;
 const q=E.sessionAtLevel(D.sessions[0],101),expected=100*1.012**100*2**(100*Math.log(1.025/1.012));
 near(E.strengthValue(s,c,'power'),300);near(E.enemyStrength(q),expected/4);assert.ok(q.strength>600);
});
