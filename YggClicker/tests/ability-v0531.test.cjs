const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),{harness}=require('./app-harness.cjs');
function ready(){const s=E.createState();s.levels.meta=1;s.factors=1e7;s.paused=true;return s;}
for(const kind of ['level'])test(kind+': sell ten matches ten singles, cannot cross minimum, and quote does not mutate',()=>{
 const a=ready();assert.ok(E.buyMany(a,kind,'meta',10));const b=structuredClone(a),before=structuredClone(a),q=E.saleQuote(a,kind,'meta',10);
 assert.ok(q.valid);assert.deepEqual(a,before);assert.ok(E.sell(a,kind,'meta',10));
 for(let i=0;i<10;i++)assert.ok(E.sell(b,kind,'meta'));assert.deepEqual(a,b);assert.equal(a.factors,before.factors+q.refund);assert.deepEqual(S.decode(S.encode(a)),a);
 const floor=structuredClone(a);assert.equal(E.sell(a,kind,'meta',10),false);assert.deepEqual(a,floor);
 E.buyMany(a,kind,'meta',10);E.sell(a,kind,'meta');const nine=structuredClone(a);assert.equal(E.saleQuote(a,kind,'meta',10).valid,false);assert.equal(E.sell(a,kind,'meta',10),false);assert.deepEqual(a,nine);
});
test('ability controls show prices, no gauge, separate original rolls and trained intensity, dispatch sell ten',()=>{
 const s=ready();E.buyMany(s,'level','meta',10);const h=harness(s,undefined,{combatRandom:()=>.5});h.openAbility('meta');
 const html=h.get('character-list').innerHTML;assert.doesNotMatch(html,/ability-track|ability-fill|ability-price/);assert.match(html,/sell10-level-meta/);
 assert.equal(h.get('hire-cost-meta').textContent,E.hireCost(s,D.characters[0])+' Rd');
 assert.equal(h.get('ability-value-accuracy-meta').textContent,'11');assert.equal(h.get('ability-value-evasion-meta').textContent,'11');
 assert.match(h.get('ability-base-accuracy-meta').textContent,/D6/);
 assert.doesNotMatch(h.get('ability-value-accuracy-meta').textContent,/判定 ×/);
 const control={disabled:false,dataset:{kind:'level',id:'meta',trade:'sell',count:'10'}};
 h.get('character-list').listeners.get('click')({target:{closest:sel=>sel==='[data-trade]'?control:null}});
 assert.equal(h.get('ability-value-accuracy-meta').textContent,'1');h.get('character-list').listeners.get('click')({target:{closest:sel=>sel==='[data-ability-confirm]'?{dataset:{abilityConfirm:'meta'}}:null}});assert.equal(h.saved().levels.meta,1);
});

