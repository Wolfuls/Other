'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,character:c,rng,faces,ready,enable,roundTrip}=require('./current-fixtures.cjs');
for(const char of D.characters)for(const p of char.perks.filter(p=>!p.awakeningLevel))test(`${char.id}/${p.id}: automatic unlock, free ON/OFF, level suspension and save`,()=>{
 const s=ready([char.id]),field='levels';
 if(!p.initial){s[field][char.id]=p.level-1;assert.equal(E.togglePerk(s,char.id,p.id,true),false);s[field][char.id]=p.level;E.refreshPerkUnlocks(s);assert.equal(E.perks(s,char).find(x=>x.id===p.id).enabled,false);}
 const balance=s.factors;assert.ok(E.togglePerk(s,char.id,p.id,true));assert.equal(s.factors,balance);assert.equal(E.perks(s,char).find(x=>x.id===p.id).unlocked,true);
 if(!p.initial){s[field][char.id]=p.level-1;assert.equal(E.perks(s,char).find(x=>x.id===p.id).unlocked,false);s[field][char.id]=p.level;}
 const loaded=roundTrip(s);assert.equal(E.perks(loaded,char).find(x=>x.id===p.id).unlocked,true);
 E.togglePerk(loaded,char.id,p.id,false);assert.equal(E.perks(loaded,char).find(x=>x.id===p.id).unlocked,false);
});
test('Meta penetration preserves its new base attack, fixed bonuses and Mohican special',()=>{
 const s=ready(['meta'],'mohican-solo');enable(s,'meta','attack-plus','mohican-slayer','metal-blade','full-metal-burst','lock-plus');
 const p=E.attackProfile(s,c('meta'));assert.equal(p.dice,3);assert.equal(p.flat,17);assert.equal(p.bonus,15);assert.equal(p.ignoreDefense,true);assert.equal(p.accuracy.flat,26);
 E.selectSession(s,'scarecrow');E.setFormation(s,'scarecrow',['meta']);const blocked=E.attackProfile(s,c('meta'));assert.equal(blocked.ignoreDefense,false);assert.equal(blocked.penetrationBlocked,true);assert.equal(blocked.bonus,0);
});
for(const [id,perk]of [['meta','metal-storm'],['richter','bom-ber'],['vishunal','mad-dog']])test(`${id}: area uses three independent targets and one visual launch`,()=>{
 const s=ready([id],'mohicans');enable(s,id,perk);const p=E.attackProfile(s,c(id));assert.equal(p.areaAttack,true);
 const events=E.click(s,()=>.5),hits=events.filter(e=>e.type==='attack'&&!e.poisonTick);assert.equal(hits.length,3);assert.equal(new Set(hits.map(e=>e.enemyId)).size,3);assert.equal(hits.filter(e=>!e.continuation).length,1);
 E.setFormation(s,'mohican-solo',[id]);E.selectSession(s,'mohican-solo');assert.equal(E.attackProfile(s,c(id)).areaAttack,false);
});
test('poison starts only on a hit, triggers once per attack and cannot reach a replacement victim',()=>{
 const s=ready(['tordeliese','meta']);enable(s,'tordeliese','greedy-gale');
 const hit=E.click(s,()=>.5);assert.equal(hit.filter(e=>e.poisonTick).length,1);assert.equal(s.enemies[0].poisonDamage,4);
 s.questLevels.scarecrow=600;E.setQuestLevel(s,'scarecrow',600);s.enemies[0].poisonDamage=4;const hp=s.hp,miss=E.click(s,()=>.5);assert.equal(miss[0].hit,false);assert.equal(s.hp,hp);assert.equal(miss.some(e=>e.poisonTick),false);
 E.setQuestLevel(s,'scarecrow',1);s.enemies[0].hp=1;E.click(s,()=>.5);assert.equal(s.enemies[0].poisonDamage,0);assert.equal(s.enemies[0].respawnSeconds,5);
});
test('poison strength follows its three upgrade tracks and OFF removes only future application',()=>{
 const s=ready(['tordeliese']);enable(s,'tordeliese','greedy-gale','severing-storm','demonic-hammer','annihilation','folding-gale','for-whom-the-storm');
 const p=E.attackProfile(s,c('tordeliese'));assert.equal(p.poisonDamage,16);assert.equal(p.doubleHitDamage,40);assert.equal(p.accuracy.flat,32);
 s.enemies[0].poisonDamage=16;E.togglePerk(s,'tordeliese','greedy-gale',false);assert.equal(E.attackProfile(s,c('tordeliese')).poisonDamage,0);assert.equal(s.enemies[0].poisonDamage,16);
});
test('GM selects the chosen ally, gives a free action and falls back to normal Max attacks alone',()=>{
 const s=ready(['max','meta']);s.selectedCharacterId='meta';s.actionPoints.max=E.actionThreshold(s);s.actionPoints.meta=0;
 const events=E.advance(s,1,()=>.5);assert.ok(events.some(e=>e.delegatedBy==='max'&&e.actorId==='meta'));assert.ok(s.actionPoints.meta<E.actionThreshold(s));
 s.health.meta={hp:-1,status:'dying',regenSeconds:0};assert.equal(E.isActionDonor(s,c('max')),false);s.actionPoints.max=E.actionThreshold(s);const own=E.advance(s,1,()=>.5);assert.ok(own.some(e=>e.actorId==='max'&&e.type==='attack'));
});
test('Max support is local; Plot Armor replaces D6 with D4 and Mouth Wrestling adds physical evasion dice',()=>{
 const s=ready(['max','meta']);s.levels.waku=1;E.setFormation(s,'mohican-solo',['waku']);enable(s,'max','plot-armor','mouth-wrestling','handout');s.selectedCharacterId='meta';
 assert.equal(E.enemyAttackSpec(s).sides,4);assert.equal(E.evasionSpec(s,c('meta')).dice,3);assert.equal(E.evasionSpec(s,c('meta'),true).dice,1);assert.equal(E.strengthValue(s,c('meta'),'power'),100);
 const other=E.battleContext(s,'mohican-solo');assert.equal(E.enemyAttackSpec(other).sides,6);assert.equal(E.evasionSpec(other,c('waku')).dice,1);
});
test('Waku first-hit defense loss, repeated AP loss and one-use accuracy/evasion conditions are independent per target',()=>{
 const s=ready(['waku'],'dementor');enable(s,'waku','expanded-hurtbox','invisible-wall','vanishing-hitbox','next-frame');s.questLevels.dementor=100;E.setQuestLevel(s,'dementor',100);s.levels.waku=501;s.concentration.waku.accuracy=400;s.selectedCharacterId='waku';E.selectEnemy(s,s.enemies[1].id);s.enemies[1].actionPoints=150;
 const values=[.7,.2,.01,.01];const hit=E.click(s,()=>values.shift()??.5);assert.equal(hit.find(e=>e.type==='attack').hit,true);const target=s.enemies[1];assert.equal(target.defensePenalty,3);assert.equal(target.actionPoints,143);assert.equal(target.accuracyPenalty,15);assert.equal(target.evasionFailure,true);assert.equal(s.enemies[0].defensePenalty,0);
});
test('Jewel investment decreases on sale; crystal debuff and rainbow expire by recipient turns',()=>{
 const s=ready(['jewel']);enable(s,'jewel','crimson-fist','crystal-radiance','rainbow-armor','black-egg');s.levels.jewel=1001;s.concentration.jewel.accuracy=700;s.questLevels.scarecrow=100;E.setQuestLevel(s,'scarecrow',100);s.selectedCharacterId='jewel';
 E.click(s,()=>.5);assert.ok(s.incomeTotals.jewelDoubleHitIncome>0);assert.equal(s.rainbowTurns,2);assert.equal(s.enemies[0].evasionPenalty,6);assert.equal(s.enemies[0].evasionPenaltyTurns,2);
 const before=E.armor(s,c('jewel'));E.sell(s,'power','jewel',90);assert.ok(E.armor(s,c('jewel'))<=before);
});
