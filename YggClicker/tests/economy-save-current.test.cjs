'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,character:c,rng,ready,enable,roundTrip}=require('./current-fixtures.cjs');
const UI=require('../js/display'),N=require('../js/numbers');
for(const char of D.characters)for(const [kind,field]of [['power','levels'],['action','actionLevels'],...D.statUpgrades.map(t=>[t.id,t.field])])test(`${char.id}/${kind}: ten-buy equals singles, sale refund and save are consistent`,()=>{
 const a=ready([char.id]),b=structuredClone(a),before=a.factors,lv=a[field][char.id];
 const quote=E.purchaseQuote(a,kind,char.id,10);assert.ok(quote.valid);assert.ok(E.buyMany(a,kind,char.id,10));
 for(let i=0;i<10;i++)assert.ok(E.buyMany(b,kind,char.id,1));assert.equal(a.factors,b.factors);assert.equal(a.factors,before-quote.cost);assert.equal(a[field][char.id],lv+10);
 const sale=E.saleQuote(a,kind,char.id,10);assert.ok(sale.valid);assert.ok(E.sell(a,kind,char.id,10));assert.equal(a[field][char.id],lv);assert.equal(a.factors,b.factors+sale.refund);assert.equal(a.incomeTotals.refund,sale.refund);assert.equal(roundTrip(a)[field][char.id],lv);
});
test('quote failure is atomic; temporary plans can cancel and sale proceeds can fund other tracks',()=>{
 const s=ready();s.factors=7;const before=structuredClone(s);assert.equal(E.buyMany(s,'power','meta',10),false);assert.deepEqual(s,before);s.armorLevels.meta=20;s.factors=0;const start=structuredClone(s);
 const proposal=E.trainingPlan(s,'meta',{armor:0,accuracy:4});assert.ok(proposal.valid);assert.equal(proposal.state.accuracyLevels.meta,4);assert.deepEqual(s,start);assert.equal(E.trainingPlan(s,'meta',{accuracy:200}).valid,false);
});
test('HP/action still guarantee one per level; original attack and armor instead grow intensity',()=>{
 for(const n of [-4,0,1,2,20])for(const rate of [.05,.1])for(let lv=1;lv<100;lv++)assert.ok(N.training(n,rate,lv)>=N.training(n,rate,lv-1)+1);
 const s=ready();const original=E.attackProfile(s,c('meta'));s.levels.meta=100;s.armorLevels.meta=100;assert.equal(E.attackProfile(s,c('meta')).flat,original.flat);assert.equal(E.armor(s,c('meta')),2);assert.ok(E.T.value(100)>1000000);
});
test('quest quotes grow at 1.15, reward at 1.25 and reward upgrade has minimum one every level',()=>{
 const s=ready();for(let lv=1;lv<80;lv++){s.questLevels.scarecrow=lv;assert.equal(E.questCost(s),N.geometric(100,1.15,lv-1));}
 s.upgrades.reward=3;assert.equal(E.reward(s,{reward:2}),5);assert.equal(E.reward(s,{reward:45}),57);
 const u=D.upgrades.find(u=>u.id==='stabilization');s.upgrades.stabilization=2;assert.equal(E.upgradeCost(s,u),45000);assert.ok(E.buyUpgrade(s,'stabilization'));assert.equal(s.upgrades.stabilization,3);
});
test('quest/overkill/refund credits remain separated; current save never repays them',()=>{
 const s=ready(['meta'],'mohican-solo');s.selectedCharacterId=null;s.upgrades.overkill=1;s.enemies[0].hp=1;s.enemies[0].poisonDamage=0;
 const old=D.balance.manualFlat;D.balance.manualFlat=100;try{const events=E.click(s,()=>.5);assert.ok(events.some(e=>e.type==='clear'&&e.overkillBonus));assert.equal(s.incomeTotals.questReward,2);assert.equal(s.incomeTotals.overkillReward,1);}finally{D.balance.manualFlat=old;}
 const again=roundTrip(s);assert.equal(again.factors,s.factors);assert.deepEqual(again.incomeTotals,s.incomeTotals);
});
test('all schema33 purchased perks refund their historical costs once with original funds and progress retained',()=>{
 const s=ready();for(const char of D.characters){s.levels[char.id]=1;s.purchasedPerks[char.id]=char.perks.map(p=>p.id);}delete s.perkRefunded;
 const sum=D.characters.flatMap(c=>c.perks).reduce((n,p)=>n+(p.cost||0),0),legacy={gameId:D.gameId,schemaVersion:33,gameVersion:'0.56.3',state:s};
 const loaded=S.decode(JSON.stringify(legacy));assert.equal(loaded.factors,s.factors+sum);assert.equal(loaded.earned,s.earned);assert.equal(loaded.incomeTotals.migrationRefund,sum);assert.equal(roundTrip(loaded).factors,loaded.factors);
 for(const char of D.characters)for(const p of char.perks)assert.equal(loaded.perkEnabled[char.id][p.id],true);
});
test('older Plot Armor migration refund is also classified and never counted twice',()=>{
 const s=ready(['max']);s.purchasedPerks.max=['plot-armor'];delete s.perkRefunded;const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:31,state:s}));
 assert.equal(loaded.factors,s.factors+1e7);assert.equal(loaded.incomeTotals.migrationRefund,1e7);assert.equal(loaded.perkEnabled.max['plot-armor'],false);assert.equal(roundTrip(loaded).factors,loaded.factors);
});
test('runaway, seeds, preferences, pending attacks and simultaneous battles survive canonical save round trip',()=>{
 const s=ready(['meta']);s.levels.richter=1;E.setFormation(s,'dementor',['richter']);s.runaway.richter.runawayRate=89;s.runaway.richter.runawaySymptom='body';s.runaway.richter.criticalReserve=6;s.options.showOrbits=false;s.options.hitEffects='translucent';s.seedLevels.greed=5;s.karmaSelections.greed='future';
 const first=roundTrip(s),second=roundTrip(first);assert.deepEqual(second,first);assert.equal(second.runaway.richter.runawaySymptom,'body');assert.equal(second.seedLevels.greed,5);assert.equal(second.karmaSelections.greed,'future');assert.equal(D.seedSystem.enabled,false);
});
for(const [label,mutate]of [
 ['negative wallet',s=>s.factors=-1],['unknown actor',s=>s.levels.invalid=1],['unknown quest',s=>s.sessionId='unknown'],
 ['fractional HP',s=>s.health.meta.hp=3.5],['invalid perk toggle',s=>s.perkEnabled.meta['attack-plus']='yes'],
 ['duplicate unlock',s=>s.unlockedPerks.meta=['attack-plus','attack-plus']],['unknown symptom',s=>s.runaway.meta.runawaySymptom='bad'],
 ['rate above150',s=>s.runaway.meta.runawayRate=151],['negative reserve',s=>s.runaway.meta.criticalReserve=-1],['invalid rearm flag',s=>s.runaway.meta.thresholdArmedState[70]=0],
 ['unknown income',s=>s.incomeTotals.bad=1],['two karmas in one slot',s=>s.karmaSelections.greed=['one','two']]
])test(`malformed save rejected: ${label}`,()=>{const s=ready();mutate(s);assert.throws(()=>S.validateState(s));});
test('future schemas cannot overwrite storage; broken primary falls back to valid backup',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const s=ready();assert.ok(S.persist(storage,s).ok);const doc=JSON.parse(S.encode(s));doc.schemaVersion=S.VERSION+1;values.set(S.KEY,JSON.stringify(doc));assert.ok(S.load(storage).blocked);assert.equal(JSON.parse(values.get(S.KEY)).schemaVersion,S.VERSION+1);
 values.set(S.BACKUP_KEY,S.encode(s));values.set(S.KEY,'broken');assert.equal(S.load(storage).state.factors,s.factors);
});
test('paused offline time is not banked; catch-up is capped at eight hours and tolerates clock rollback',()=>{
 const s=ready();s.paused=true;const before=s.factors;const paused=E.catchUp(s,100000,rng());assert.equal(paused.kills,0);assert.equal(s.factors,before);assert.equal(s.savedAt,100000);s.paused=false;
 const report=E.catchUp(s,100000+48*3600e3,rng());assert.equal(report.seconds,28800);assert.equal(E.catchUp(s,0,rng()).seconds,0);assert.doesNotThrow(()=>roundTrip(s));
});
test('currency formatting floors fractions and retains full grouped large balances',()=>{
 for(const [n,text]of [[2.8,'2'],[1234567.8,'1,234,567'],[1e21,'1,000,000,000,000,000,000,000']])assert.equal(UI.currencyNumber(n),text);
});

test('early timer saves migrate old character names, charges, currency and counters exactly once',()=>{
 for(const version of [1,2,3,4]){
  const s=E.createState(1000);s.factors=123;s.earned=500;s.kills=7;s.levels.meta=2;s.sessionId='practice';s.hp=version===1?40:5;
  delete s.perkRefunded;delete s.actionLevels;delete s.actionPoints;delete s.actionClock;
  s.speedLevels={meta:7};s.timers={meta:(1.8/1.7)*.25};
  if(version<4){delete s.speedLevels;s.timers.meta=1.8*.25;}
  if(version<3){s.levels.hikari=s.levels.meta;delete s.levels.meta;s.timers.hikari=s.timers.meta;delete s.timers.meta;}
  const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:version,state:s}));
  assert.equal(loaded.levels.meta,2);assert.equal(loaded.factors,123);assert.equal(loaded.kills,7);assert.equal(loaded.earned,500);assert.equal(loaded.actionLevels.meta,version===4?7:0);assert.ok(Math.abs(loaded.actionPoints.meta-75)<1e-8);assert.deepEqual(roundTrip(loaded),loaded);
 }
});
