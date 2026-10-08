const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),T=require('../js/strength'),F=require('../js/matchup');
const c=id=>D.characters.find(x=>x.id===id),rng=(seed=148)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const faces=(...xs)=>()=>((xs.shift()??3)-.5)/6;
function ready(ids=['meta'],quest='mohican-solo'){const s=E.createState(1000);s.factors=1e10;for(const id of ids)s.levels[id]=1;E.refreshQuestUnlocks(s);E.setFormation(s,quest,ids);E.selectSession(s,quest);E.ensureEnemies(s);return s;}
const almost=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`);
test('judgment branches do not recurse into each other; damage dice are ordinary',()=>{
 assert.deepEqual(E.combatRoll({flat:0,dice:1},faces(6,6,1)),{total:13,dice:[6,6,1],critical:true,fumble:false});
 assert.deepEqual(E.combatRoll({flat:0,dice:1},faces(1,6)),{total:-5,dice:[1,-6],critical:false,fumble:true});
 assert.equal(E.roll(2,0,faces(6,1)),7);almost(T.distribution({flat:0,dice:1}).reduce((n,[v,,p])=>n+p,0),1);
});
test('equal strengths preserve original win chance and expected damage',()=>{
 const h={flat:14,dice:1},e={flat:9,dice:1};const x=T.hit(h,e,0);assert.equal(x.correction,0);almost(x.chance,x.base);
 const d=T.damage({flat:0,dice:1},3,0);assert.equal(d.correction,0);almost(d.mean,1.5);
});
test('ratio two adjusts odds and mean, and nearest signed integer uses tie rules',()=>{
 const h={flat:14,dice:1},e={flat:10,dice:1},x=T.hit(h,e,Math.log(2));almost(x.target/(1-x.target),2*x.base/(1-x.base));
 const d=T.damage({flat:0,dice:2},4,Math.log(2));almost(d.target,d.base*2);
 const p=T.damage({flat:10,dice:0},0,Math.log(.25));assert.equal(p.correction,-7);assert.equal(p.mean,3);
 assert.equal(T.nearest(b=>b,.5),0);assert.equal(T.nearest(b=>b,-1.5),-1);
 assert.ok(T.hit(h,e,-2).correction<0);assert.ok(T.damage({flat:1,dice:3},2,-2).correction<0);
});
test('inversion selects the closest achievable hit chance over positive and negative candidates',()=>{
 const h={flat:4,dice:2},e={flat:9,dice:1};
 for(const ratio of [-3,-1,0,1,3]){const x=T.hit(h,e,ratio),pmfH=T.distribution(h),pmfE=T.distribution(e);const probability=b=>pmfH.reduce((n,[a,,p])=>n+pmfE.reduce((m,[v,,q])=>m+(a+b>v?p*q:0),0),0);const error=Math.abs(x.chance-x.target);for(let b=-50;b<=50;b++)assert.ok(error<=Math.abs(probability(b)-x.target)+1e-12);}
});
test('zero and certain base wins can be crossed; huge levels never overflow',()=>{
 assert.equal(T.hit({flat:0,dice:0},{flat:10,dice:0},30).chance,1);
 assert.equal(T.hit({flat:10,dice:0},{flat:0,dice:0},-30).chance,0);
 for(const lv of [1000,1e6,Number.MAX_SAFE_INTEGER]){assert.ok(Number.isFinite(T.value(lv)));for(const sign of [-1,1]){const r=T.damage({flat:0,dice:3},35,sign*T.logRatio(lv,0));assert.ok([r.mean,r.target,r.correction].every(Number.isFinite));}}
});
test('original stats remain constant across training and enemy levels; HP/action/reward still grow',()=>{
 const s=ready(['meta'],'dementor'),base=E.attackProfile(s,c('meta'));s.levels.meta=80;s.armorLevels.meta=s.accuracyLevels.meta=s.evasionLevels.meta=70;
 const p=E.attackProfile(s,c('meta'));assert.equal(p.dice,base.dice);assert.equal(p.flat,base.flat);assert.deepEqual(p.accuracy,base.accuracy);assert.equal(E.armor(s,c('meta')),2);
 s.questLevels.dementor=s.questActiveLevels.dementor=20;const q=E.getSession(s),original=D.sessions.find(x=>x.id==='dementor');assert.deepEqual(q.attack,original.attack);assert.deepEqual(q.ss,original.ss);assert.equal(q.defense,original.defense);assert.equal(q.resistance,original.resistance);assert.ok(q.hp>original.hp&&q.reward>original.reward&&q.actionMultiplier>1);
});
test('penetration retains defense intensity; mental damage uses resistance',()=>{
 const s=ready(['meta','max'],'dementor');s.levels.meta=50;E.togglePerk(s,'meta','metal-blade',true);s.questLevels.dementor=s.questActiveLevels.dementor=10;
 const p=E.attackProfile(s,c('meta'));assert.equal(p.defense,0);almost(p.damageLogRatio,T.logRatio(49,9));
 const incoming=E.enemyHitProfile(s,{},c('meta'));assert.equal(incoming.reduction,6);assert.ok(incoming.damageLogRatio>0);
 const max=E.attackProfile(s,c('max'));assert.equal(max.mental,true);assert.equal(max.defense,4);assert.equal(max.evasion.flat,17);
});
test('live allied and enemy judgments use adjusted totals for double hit and damage inverse correction',()=>{
 const s=ready(['meta'],'scarecrow');s.accuracyLevels.meta=50;s.selectedCharacterId='meta';
 const e=E.click(s,faces(3,3,3,3)).find(e=>e.type==='attack');assert.ok(e.accuracy.strengthCorrection>0);assert.equal(e.doubleHit,e.accuracy.total>=e.evasion.total*2);
 const p={accuracySpec:{flat:0,dice:0},evasionDice:{flat:10,dice:0},hitLogRatio:30,damageLogRatio:Math.log(2),attack:{flat:5,dice:0},reduction:0,shield:0};
 const hit=E.rollEnemyHit(p,faces(3));assert.equal(hit.hit,true);assert.ok(hit.damage>=10);
});
test('newly qualified perks are OFF, free toggles are immediate and survive save round trips',()=>{
 const s=ready();s.levels.meta=10;E.refreshPerkUnlocks(s);const balance=s.factors;assert.equal(E.perks(s,c('meta'))[0].owned,true);assert.equal(E.perks(s,c('meta'))[0].enabled,false);
 assert.equal(E.togglePerk(s,'meta','attack-plus'),true);assert.equal(s.factors,balance);assert.equal(E.stats(s,c('meta')).flat,4);
 let loaded=S.decode(S.encode(s));assert.equal(loaded.perkEnabled.meta['attack-plus'],true);E.togglePerk(loaded,'meta','attack-plus',false);assert.equal(E.stats(loaded,c('meta')).flat,0);
});
test('schema33 paid perks refund exactly once and remain ON even if under level',()=>{
 const s=ready();s.purchasedPerks.meta=['attack-plus','metal-blade'];delete s.perkRefunded;delete s.perkEnabled;delete s.unlockedPerks;
 const document=JSON.stringify({gameId:D.gameId,schemaVersion:33,gameVersion:'0.56.3',state:s}),loaded=S.decode(document);
 assert.equal(loaded.factors,s.factors+50050);assert.equal(loaded.earned,s.earned);assert.equal(loaded.incomeTotals.migrationRefund,50050);assert.equal(loaded.perkEnabled.meta['metal-blade'],true);
 const again=S.decode(S.encode(loaded));assert.equal(again.factors,loaded.factors);assert.equal(again.perkRefunded,true);
});
test('OFF does not erase rainbow, enemy debuffs, protection or pending enemy profiles',()=>{
 const s=ready(['jewel','waku']);s.levels.jewel=100;E.togglePerk(s,'jewel','rainbow-armor',true);s.rainbowTurns=3;E.togglePerk(s,'jewel','rainbow-armor',false);assert.equal(E.rainbowActive(s),true);
 s.actionLevels.waku=25;E.togglePerk(s,'waku','floor-clip',true);s.floorClipTargetId='jewel';s.floorClipSeconds=10;E.togglePerk(s,'waku','floor-clip',false);E.enemyTargetCandidates(s);assert.equal(s.floorClipTargetId,'jewel');
 s.enemies[0].evasionPenalty=6;s.enemies[0].evasionPenaltyTurns=2;s.enemies[0].pendingAttack={targetId:'waku',remaining:.5,count:1,profile:E.enemyHitProfile(s,s.enemies[0],c('waku'))};
 const loaded=S.decode(S.encode(s));assert.deepEqual(loaded.enemies[0].pendingAttack.profile,s.enemies[0].pendingAttack.profile);assert.equal(loaded.enemies[0].evasionPenalty,6);
});
test('income classification excludes refunds/quest/overkill from greed',()=>{
 const s=ready();s.seedLevels.greed=100;D.seedSystem.enabled=true;try{for(const type of D.incomeTypes){const before=s.factors;E.grantIncome(s,100,type);assert.equal(s.factors-before,D.secondaryIncomeTypes.includes(type)?200:100);}}finally{D.seedSystem.enabled=false;}
});
test('Jewel income uses current wallet, never triggers on clear, is gated by deployment/health/pause',()=>{
 const s=ready(['jewel'],'scarecrow');s.factors=10000;s.selectedCharacterId=null;s.hp=s.enemies[0].hp=1;E.click(s,()=>0);assert.equal(s.incomeTotals.jewelSideIncome,undefined);
 const before=s.factors;E.jewelSideIncome(s,()=>.5);assert.equal(s.factors-before,Math.floor(before*.01));
 s.health.jewel.status='unconscious';s.health.jewel.hp=1;assert.equal(E.jewelSideIncome(s,()=>.5),0);s.paused=true;const snapshot=JSON.stringify(s);E.advance(s,100,()=>0);assert.equal(JSON.stringify(s),snapshot);
 assert.equal(Object.keys(s).some(k=>/nextIncome|countdown/i.test(k)),false);
});
test('offline Poisson event count is consistent with mean interval without per-second income draws',()=>{
 const old=D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds;D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds=30;
 try{let count=0;for(let i=0;i<20;i++){const s=ready(['jewel'],'scarecrow');s.actionLevels.jewel=0;s.runaway.jewel.baseRunawayPressure=0;s.paused=false;const before=s.factors;E.advance(s,120,rng(9+i),true,true);const received=s.incomeTotals.jewelSideIncome||0;assert.ok(s.factors>=before);count+=Math.log1p(received/before)/Math.log(1.01);assert.equal(Object.keys(s).some(k=>/incomeAt|nextIncome/i.test(k)),false);}assert.ok(count>55&&count<105,'events '+count);}finally{D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds=old;}
});
test('activation stacks and original extra dice accumulate without changing intensity',()=>{
 const s=ready();for(const type of ['augment','reaction','sense','recovery','awakening']){s.runaway.meta.activationType=type;for(const [rate,stacks,dice]of [[49,0,0],[50,1,0],[60,2,0],[70,3,0],[80,3,1],[90,3,2]]){s.runaway.meta.runawayRate=rate;const a=E.activation(s,c('meta'));assert.equal(a.stacks,stacks);assert.equal(a.dice,dice);assert.equal(a.damage,type==='augment'?stacks:0);assert.equal(E.attackProfile(s,c('meta')).damageLogRatio,0);}}
});
test('runaway pressure is independent, stabilization works while incapacitated, recovery scales pressure/regen',()=>{
 const s=ready(['max']);s.actionLevels.max=10;const normal=E.runawayPressure(s,c('max'));s.runaway.max.runawayRate=70;almost(E.runawayPressure(s,c('max')),normal*.7);
 s.health.max.hp=10;s.health.max.status='unconscious';s.upgrades.stabilization=18;almost(E.runawayPressure(s,c('max')),-.03);E.advance(s,6,()=>.6);assert.equal(s.health.max.hp,11);assert.ok(s.runaway.max.runawayRate<70);
});
test('thresholds fire only ascending and rearm ten points below, symptoms clear below70',()=>{
 const s=ready(),events=[];E.changeRunaway(s,'meta',70,()=>.8,events);assert.deepEqual(events.filter(e=>e.type==='runawayThreshold').map(e=>e.threshold),[50,70]);
 E.changeRunaway(s,'meta',-5,()=>.8,events);E.changeRunaway(s,'meta',5,()=>.8,events);assert.equal(events.filter(e=>e.threshold===70).length,1);
 E.changeRunaway(s,'meta',-10,()=>.8,events);E.changeRunaway(s,'meta',10,()=>.8,events);assert.equal(events.filter(e=>e.threshold===70).length,2);
 s.runaway.meta.runawaySymptom='body';E.changeRunaway(s,'meta',-.1);assert.equal(s.runaway.meta.runawaySymptom,null);
});
test('50/70 tables self damage and rises; all90 symptoms select from parity and replace',()=>{
 const s=ready();const hp=s.health.meta.hp;E.thresholdEvent(s,c('meta'),50,faces(1,3,3),[]);assert.ok(s.health.meta.hp<hp);
 const before=s.runaway.meta.runawayRate;E.thresholdEvent(s,c('meta'),70,faces(4,2,3),[]);assert.equal(s.runaway.meta.runawayRate,before+5);
 for(const [series,n,symptom]of [[2,1,'control'],[2,2,'overload'],[2,3,'hearing'],[2,4,'vision'],[2,5,'body'],[1,1,'ability'],[1,2,'language'],[1,3,'memory'],[1,4,'mind'],[1,5,'oblivion'],[1,6,null]]){s.runaway.meta.runawayRate=90;E.symptomRoll(s,c('meta'),faces(series,n),[]);assert.equal(s.runaway.meta.runawaySymptom,symptom);}
});
test('critical reward precedes resolution, reserve absorbs positive pressure, 150 detaches without loss',()=>{
 const s=ready(),events=[];s.runaway.meta.runawayRate=109;s.health.meta.hp=1;
 E.changeRunaway(s,'meta',1,faces(6,3,4,2,3),events);assert.equal(s.runaway.meta.criticalReserve,5);assert.ok(s.health.meta.hp>1);
 E.changeRunaway(s,'meta',3,()=>.8,events);assert.equal(s.runaway.meta.runawayRate,110);assert.equal(s.runaway.meta.criticalReserve,2);
 s.runaway.meta.criticalReserve=0;s.runaway.meta.runawayRate=149;E.changeRunaway(s,'meta',1,()=>.8,events);assert.equal(s.runaway.meta.runawayCollapsed,true);assert.equal(E.formationOwner(s,'meta'),null);assert.equal(s.levels.meta,1);assert.equal(E.setFormation(s,s.sessionId,['meta']),false);
 E.changeRunaway(s,'meta',-51);assert.equal(E.setFormation(s,s.sessionId,['meta']),true);
});
test('runaway states persist over saves and quest changes; offline processes all crossings in order',()=>{
 const s=ready(['meta'],'scarecrow');s.runaway.meta.baseRunawayPressure=1;s.upgrades.stabilization=0;
 const events=E.advance(s,200,()=>.8,true,true),thresholds=events.filter(e=>e.type==='runawayThreshold').map(e=>e.threshold);
 assert.deepEqual(thresholds,[50,70,90,110,120,130,140,150]);
 const loaded=S.decode(S.encode(s));assert.deepEqual(loaded.runaway,s.runaway);E.selectSession(loaded,'mohican-solo');assert.deepEqual(loaded.runaway,s.runaway);
});
test('quest resets preserve ally wounds/runaway and other battle; concentration, reward increments, quest prices',()=>{
 const s=ready(['meta']);s.levels.richter=1;E.setFormation(s,'scarecrow',['richter']);s.questLevels[s.sessionId]=10;s.health.meta.hp=8;s.runaway.meta.runawayRate=42;const other=JSON.stringify(s.sessionStates.scarecrow);
 assert.ok(E.setQuestLevel(s,s.sessionId,2));assert.equal(s.health.meta.hp,8);assert.equal(s.runaway.meta.runawayRate,42);assert.equal(JSON.stringify(s.sessionStates.scarecrow),other);
 s.upgrades.reward=3;assert.equal(E.reward(s,{reward:2}),5);assert.equal(E.reward(s,{reward:45}),57);assert.equal(D.questGrowth.costGrowth,1.15);
});
test('forecasts share corrected hit chance and original values without mutation',()=>{
 const s=ready(['meta'],'dementor');s.accuracyLevels.meta=30;const before=JSON.stringify(s),row=F.party(s).rows[0],p=E.attackProfile(s,c('meta'));almost(row.hitRate,T.hit(p.accuracy,p.evasion,p.hitLogRatio).chance);assert.ok(Number.isFinite(row.averageDamage));assert.equal(JSON.stringify(s),before);
});
test('all income and combat state serialize after concurrent offline encounters',()=>{
 const s=ready(['meta']);s.levels.jewel=s.levels.max=1;E.setFormation(s,'scarecrow',['jewel','max']);E.advance(s,3600,rng(),false,true);const loaded=S.decode(S.encode(s));assert.deepEqual(loaded.runaway,s.runaway);assert.equal(loaded.factors,s.factors);assert.ok(loaded.incomeTotals.questReward>0);
});
