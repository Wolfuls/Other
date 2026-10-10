'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,character:c,faces,ready,enable,roundTrip}=require('./current-fixtures.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const active=(s,id,key)=>E.perks(s,c(id)).find(p=>p.id===key).unlocked;
const tables={
 vishunal:[['mad-dog',0,1],['legal-launcher',25,1],['missile-missile',75,1],['rabid-dog',100,0]],
 tordeliese:[['greedy-gale',0,.3],['retreating-wind',25,.3],['folding-gale',50,.5],['severing-storm',75,.5],['demonic-hammer',100,.5],['for-whom-the-storm',125,.8],['annihilation',150,2]],
 max:[['gm',0,.2],['handout',25,.5],['plot-armor',50,.5],['mouth-wrestling',75,.8],['named-npc',100,1]],
 jewel:[['side-income',0,0],['yellow-glow',10,.1],['crimson-fist',25,.1],['crystal-radiance',50,.3],['iolite-shield',75,.4],['adamant-fist',100,.6],['rainbow-armor',125,1],['black-egg',150,1.2]]
};
for(const [id,rows]of Object.entries(tables))test(`${id}: ordered unlock levels, minute pressure, ON/OFF and down behavior`,()=>{
 assert.deepEqual(c(id).perks.map(p=>[p.id,p.level]),rows.map(([key,lv])=>[key,lv]));
 const s=ready([id]);
 for(const [key,lv,minute]of rows){const p=c(id).perks.find(p=>p.id===key);near(p.runawayPressure*60,minute);
  s.levels[id]=Math.max(1,lv);assert.ok(E.togglePerk(s,id,key,true));assert.equal(active(s,id,key),true);
  let b=E.runawayPressureBreakdown(s,c(id));near(b.perkEntries.find(x=>x.id===key).pressure,minute/60);
  if(lv){s.levels[id]=lv-1;assert.equal(active(s,id,key),false);near(E.runawayPressureBreakdown(s,c(id)).perkEntries.find(x=>x.id===key).pressure,0);s.levels[id]=lv;}
  s.health[id].status='unconscious';assert.equal(active(s,id,key),false);s.health[id].status='active';
  E.togglePerk(s,id,key,false);assert.equal(active(s,id,key),false);
 }
});
test('Watchdog is initially active and only targets all enemies when they are a swarm',()=>{
 const s=ready(['vishunal'],'mohicans');assert.equal(c('vishunal').perks[0].name,'番犬');assert.equal(E.attackProfile(s,c('vishunal')).areaAttack,true);
 const events=E.click(s,()=>.5).filter(e=>e.type==='attack');assert.equal(events.length,3);assert.equal(new Set(events.map(e=>e.enemyId)).size,3);
 E.selectSession(s,'mohican-solo');E.setFormation(s,'mohican-solo',['vishunal']);assert.equal(E.attackProfile(s,c('vishunal')).areaAttack,false);
});
test('Rabid Dog replaces only 50/70/90 rolls without consuming AP or creating a symptom',()=>{
 for(const threshold of [50,70,90]){
  const s=ready(['vishunal']);enable(s,'vishunal','rabid-dog');s.actionPoints.vishunal=17;s.runaway.vishunal.runawayRate=threshold-.001;
  const events=[];E.changeRunaway(s,'vishunal',.001,()=>.25,events);
  assert.equal(events.filter(e=>e.type==='runawayMisfire').length,1);assert.equal(events.some(e=>e.type==='runawaySymptom'),false);assert.equal(s.runaway.vishunal.runawaySymptom,null);assert.equal(s.actionPoints.vishunal,17);near(s.runaway.vishunal.runawayRate,threshold);
 }
});
test('Rabid Dog self-hit uses 2D6+0 with the shared strength/armor calculation, ignoring offensive perk dice',()=>{
 const amounts=[];
 for(const boosted of [false,true]){
  const s=ready(['vishunal']);enable(s,'vishunal','rabid-dog');if(boosted)enable(s,'vishunal','legal-launcher','missile-missile');s.health.vishunal.hp=E.maxHP(s,c('vishunal'));
  const events=[],spec={dice:2,flat:0,resultScale:1},strength=E.strengthValue(s,c('vishunal'),'power'),armor=E.armor(s,c('vishunal'));
  const expected=Math.max(1,7+E.T.damage(spec,armor,0,E.T.absoluteLog(strength,strength)).correction-armor);
  E.thresholdEvent(s,c('vishunal'),50,faces(1,5,2,3,4),events);
  const damage=events.find(e=>e.type==='runawayDamage');assert.ok(damage);assert.equal(damage.source,'misfire');assert.equal(damage.damage,expected);amounts.push(damage.damage);
 }
 assert.equal(amounts[0],amounts[1]);
});
test('Rabid Dog retains full attack dice against allies and remains a single-target attack against a boss swarm',()=>{
 const ally=ready(['vishunal','meta']);enable(ally,'vishunal','rabid-dog','legal-launcher','missile-missile');ally.levels.meta=100;ally.health.meta.hp=E.maxHP(ally,c('meta'));
 const ev=[];E.thresholdEvent(ally,c('vishunal'),50,faces(1,5,2),ev);
 assert.equal(ev.find(e=>e.type==='runawayDamage')?.targetId,'meta');assert.ok(ev.find(e=>e.type==='runawayDamage').damage>100);
 const s=ready(['vishunal'],'ozmorn');enable(s,'vishunal','rabid-dog');s.questLevels.ozmorn=150;E.setQuestLevel(s,'ozmorn',150);
 for(const e of s.enemies.slice(1))Object.assign(e,{hp:100,maxHP:100,creationDamage:100});
 const events=[];let first=true;E.thresholdEvent(s,c('vishunal'),50,()=>first?(first=false,.3):.5,events);
 const hits=events.filter(e=>e.type==='attack');assert.equal(hits.length,1);assert.equal(hits[0].enemyId,s.enemies[0].id);assert.equal(hits[0].areaAttack,false);assert.ok(s.enemies.slice(1).every(e=>e.hp>=100));
});
test('Rabid Dog OFF, below Lv100 and incapacitation do not replace rolls; critical events and collapse remain',()=>{
 for(const mode of ['off','level','down']){const s=ready(['vishunal']);enable(s,'vishunal','rabid-dog');if(mode==='off')E.togglePerk(s,'vishunal','rabid-dog',false);if(mode==='level')s.levels.vishunal=99;if(mode==='down')s.health.vishunal.status='unconscious';const ev=[];E.thresholdEvent(s,c('vishunal'),90,faces(2,3),ev);assert.ok(ev.some(e=>e.type==='runawaySymptom'));assert.equal(ev.some(e=>e.type==='runawayMisfire'),false);}
 for(const threshold of [110,120,130,140]){const s=ready(['vishunal']);enable(s,'vishunal','rabid-dog');s.health.vishunal.hp=10;const ev=[];E.thresholdEvent(s,c('vishunal'),threshold,faces(5,3,3,2,2),ev);assert.ok(ev.some(e=>e.type==='heal'));assert.equal(s.runaway.vishunal.criticalReserve,4);assert.equal(ev.some(e=>e.type==='runawayMisfire'),false);}
 const s=ready(['vishunal']);enable(s,'vishunal','rabid-dog');s.runaway.vishunal.runawayRate=149;E.changeRunaway(s,'vishunal',1,()=>.5,[]);assert.equal(s.runaway.vishunal.runawayCollapsed,true);assert.equal(E.formationOwner(s,'vishunal'),s.sessionId);
});
test('off-screen misfires remain in their own session and credit kills/damage exactly once',()=>{
 const s=ready(['meta']);s.levels.vishunal=100;E.setFormation(s,'mohican-solo',['vishunal']);enable(s,'vishunal','rabid-dog');s.runaway.vishunal.runawayRate=49.99;s.runaway.vishunal.baseRunawayPressure=.1;
 const hp=s.enemies[0].hp,before=s.kills,damage=s.totalDamage;const ev=E.advance(s,1,()=>.75);
 const hits=ev.filter(e=>e.type==='attack'&&e.actorId==='vishunal');assert.equal(hits.length,1);assert.equal(hits[0].sessionId,'mohican-solo');assert.equal(s.enemies[0].hp,hp);assert.equal(s.kills,before+1);assert.equal(s.totalDamage,damage+hits[0].hpBefore);assert.equal(s.sessionStates['mohican-solo'].enemies[0].hp,0);assert.doesNotThrow(()=>S.encode(s));
});
test('Tordeliese applies poison from hire, never on a miss, and additive poison bonuses survive the new levels',()=>{
 const s=ready(['tordeliese']);assert.equal(E.attackProfile(s,c('tordeliese')).poisonDamage,4);
 const miss=E.click(s,faces(1,6,6,6,6,5));assert.equal(miss.find(e=>e.type==='attack').hit,false);assert.equal(s.enemies[0].poisonDamage,0);
 for(const [key,expected]of [['folding-gale',8],['severing-storm',12],['for-whom-the-storm',16]]){enable(s,'tordeliese',key);assert.equal(E.attackProfile(s,c('tordeliese')).poisonDamage,expected);}
 E.togglePerk(s,'tordeliese','greedy-gale',false);assert.equal(E.attackProfile(s,c('tordeliese')).poisonDamage,0);
});
test('Plot Armor AP die is trained, Handout stays selected-only, and GM never shares attack levels',()=>{
 const s=ready(['max','meta']);enable(s,'max','plot-armor');s.levels.meta=51;const m=c('meta');
 assert.equal(E.actionPower(s,m,15,false,faces(4)),38);near(E.actionPower(s,m,15),37);
 enable(s,'max','handout');assert.equal(E.actionPower(s,m,15,false,faces(4)),38);s.selectedCharacterId='meta';assert.equal(E.actionPower(s,m,15,false,faces(5)),48);
 assert.equal(E.strengthValue(s,m,'power'),200);assert.equal(E.concentrationPoints(s,'meta'),50);assert.equal(c('max').perks.some(p=>p.id==='western-munchkin'),false);
 const before=E.attackProfile(s,m);s.perkEnabled.max['western-munchkin']=true;assert.deepEqual(E.attackProfile(s,m),before);
});
test('schema41 adds initial perks only when previously unavailable, preserves toggle choices and strips Western Munchkin',()=>{
 for(const previous of [false,true])for(const enabled of [false,true]){
  const s=ready(['vishunal','tordeliese','max']);
  for(const [id,key,level]of [['vishunal','mad-dog',25],['tordeliese','greedy-gale',10]]){s.levels[id]=previous?level:1;s.perkEnabled[id][key]=enabled;s.unlockedPerks[id]=previous?[key]:[];}
  s.perkEnabled.max['western-munchkin']=true;s.purchasedPerks.max=['western-munchkin'];s.unlockedPerks.max=['western-munchkin'];s.health.tordeliese={hp:-2,status:'dying',regenSeconds:3};s.runaway.max.runawayRate=22;
  const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:41,state:s}));
  assert.equal(loaded.perkEnabled.vishunal['mad-dog'],previous?enabled:true);assert.equal(loaded.perkEnabled.tordeliese['greedy-gale'],previous?enabled:true);
  assert.equal(loaded.perkEnabled.max['western-munchkin'],undefined);assert.equal(loaded.purchasedPerks.max.includes('western-munchkin'),false);assert.equal(loaded.unlockedPerks.max.includes('western-munchkin'),false);
  assert.deepEqual(loaded.health,s.health);assert.deepEqual(loaded.runaway,s.runaway);assert.equal(loaded.factors,s.factors);assert.equal(loaded.earned,s.earned);assert.deepEqual(roundTrip(loaded),loaded);
 }
});
