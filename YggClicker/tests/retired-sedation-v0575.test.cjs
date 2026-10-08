'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,roundTrip}=require('./current-fixtures.cjs');
const N=require('../js/numbers');
const document=s=>JSON.stringify({gameId:D.gameId,schemaVersion:35,gameVersion:'0.57.4',state:s});

test('retired calming upgrade refunds retained levels once without changing investment, wounds or stabilization',()=>{
 const s=ready(['meta']);s.factors=12345;s.earned=900;s.levels.meta=8;s.upgrades.sedation=3;s.upgrades.stabilization=7;
 s.health.meta.hp=5;s.runaway.meta.runawayRate=43;s.incomeTotals.migrationRefund=70;
 const loaded=S.decode(document(s));
 assert.equal(loaded.factors,12345+1000+1250+1562);assert.equal(loaded.earned,900);
 assert.equal(loaded.incomeTotals.migrationRefund,70+3812);assert.equal(loaded.upgrades.stabilization,7);
 assert.equal(loaded.levels.meta,8);assert.equal(loaded.health.meta.hp,5);assert.equal(loaded.runaway.meta.runawayRate,43);
 assert.equal(Object.hasOwn(loaded.upgrades,'sedation'),false);
 assert.deepEqual(roundTrip(loaded),loaded);assert.equal(JSON.parse(S.encode(loaded)).schemaVersion,36);
});

test('zero/missing retired upgrade adds no refund, and invalid old levels are rejected promptly',()=>{
 for(const count of [undefined,0]){const s=ready();if(count!==undefined)s.upgrades.sedation=count;assert.equal(S.decode(document(s)).factors,s.factors);}
 for(const count of [-1,.5,'3',Number.MAX_SAFE_INTEGER]){const s=ready();s.upgrades.sedation=count;assert.throws(()=>S.decode(document(s)));}
});

test('refund uses historical rounded prices independently of current balancing and saturates the currency limit',()=>{
 const s=ready();s.factors=100;s.upgrades.sedation=10;
 const before=D.balance.upgradeCostGrowth;D.balance.upgradeCostGrowth=2;
 try{assert.equal(S.decode(document(s)).factors,100+Array.from({length:10},(_,i)=>N.geometric(1000,1.25,i)).reduce((a,b)=>a+b,0));}
 finally{D.balance.upgradeCostGrowth=before;}
 s.factors=1e100;s.upgrades.sedation=1000;
 const full=S.decode(document(s));assert.equal(full.factors,1e100);assert.equal(full.incomeTotals.migrationRefund??0,0);
});

test('stabilization is the only purchasable calming source and legacy runtime keys cannot exert pressure',()=>{
 const s=ready(['meta']);s.upgrades.stabilization=6;s.health.meta.status='unconscious';
 assert.equal(E.buyUpgrade(s,'sedation'),false);assert.equal(D.upgrades.some(u=>u.id==='sedation'),false);
 s.upgrades.sedation=100;
 const b=E.runawayPressureBreakdown(s,character('meta'));
 assert.deepEqual(b.calmingEntries.map(x=>x.id),['stabilization']);assert.ok(Math.abs(b.net+.01)<1e-10);
});
