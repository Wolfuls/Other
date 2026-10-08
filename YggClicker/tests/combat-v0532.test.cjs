const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),N=require('../js/numbers'),B=require('../js/battle-batch'),{harness}=require('./app-harness.cjs');
const c=id=>D.characters.find(x=>x.id===id);
function ready(ids=['meta'],q='mohican-solo'){const s=E.createState(1000);s.factors=1e9;for(const id of ids)s.levels[id]=1;E.refreshQuestUnlocks(s);E.setFormation(s,q,ids);if(q!==s.sessionId)E.selectSession(s,q);E.ensureEnemies(s);s.selectedCharacterId=ids[0];return s;}
const faces=(...values)=>()=>((values.shift()??4)-.5)/6;
const clickControl=(h,selector,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s===selector?{disabled:false,dataset}:null}});
test('legacy training helper remains for HP/action; combat training grows intensity',()=>{
 for(const base of [-4,0,1,2,6,13,20,50])for(const rate of [.05,.1])for(let lv=1;lv<=100;lv++)assert.ok(N.training(base,rate,lv)-N.training(base,rate,lv-1)>=1);
 const s=ready(['tordeliese']);s.armorLevels.tordeliese=10;assert.equal(E.armor(s,c('tordeliese')),0);assert.equal(E.armor(s,c('tordeliese'),true),2);
 s.actionLevels.tordeliese=10;assert.equal(E.actionPower(s,c('tordeliese')),23);
 s.accuracyLevels.tordeliese=10;const spec=E.accuracySpec(s,c('tordeliese'));assert.equal(E.combatRoll({...spec,flat:0},faces(1,6)).total,-5);
 s.levels.tordeliese=11;assert.equal(E.attackProfile(s,c('tordeliese')).damageLogRatio,E.T.logRatio(10,0));
});
test('AP excludes zero-base participants but retains all other occupied slots and always multiplies by two',()=>{
 const s=ready(['meta'],'scarecrow');assert.equal(E.actionThreshold(s),30);s.health.meta.status='dying';s.health.meta.hp=-2;assert.equal(E.actionThreshold(s),30);s.enemies[0].hp=0;s.enemies[0].respawnSeconds=5;assert.equal(E.actionThreshold(s),30);
 const multi=ready(['meta','richter'],'scarecrow');assert.equal(E.actionThreshold(multi),28);assert.equal(E.enemyActionPower(multi),0);
 const original=c('richter').actionDice;c('richter').actionDice={flat:0,dice:0};try{assert.equal(E.actionThreshold(multi),30);}finally{c('richter').actionDice=original;}
});
test('double hit includes equality; smash counts each pair of rolled sixes, stacks with double hit, and never applies to a miss',()=>{
 const result=(a,b,dice)=>E.judgmentBonus({total:a,dice},{total:b,dice:[]});
 assert.deepEqual(result(20,10,[6,6,6,6,6,2]),{doubleHit:true,smashCritical:2,bonusDice:3});
 assert.equal(result(19,10,[6,6,2]).bonusDice,1);assert.equal(result(11,10,[6,2]).bonusDice,0);assert.equal(result(10,10,[6,6]).bonusDice,0);
});
test('allied bonus dice define the original formula before intensity inversion',()=>{
 const s=ready();s.levels.meta=11;const hit=E.click(s,faces(6,6,4,4,3,5,4,4)).find(e=>e.type==='attack');
 assert.equal(hit.accuracy.total,30);assert.equal(hit.evasion.total,14);assert.equal(hit.doubleHit,true);assert.equal(hit.smashCritical,1);assert.equal(hit.bonusDice,2);assert.equal(hit.damage,16+E.T.damage({dice:4,flat:0,resultScale:1},0,E.T.logRatio(10,0)).correction);
});
test('enemy bonus dice precede quest damage scaling and normal defense',()=>{
 const s=ready();s.questLevels[s.sessionId]=2;E.setQuestLevel(s,s.sessionId,2);E.ensureEnemies(s)[0].pendingAttack={targetId:'meta',remaining:.1,count:1};
 const hit=E.advance(s,.1,faces(6,6,4,4,4,4,4,4)).find(e=>e.type==='enemyAttack');
 assert.equal(hit.doubleHit,true);assert.equal(hit.smashCritical,1);assert.equal(hit.bonusDice,2);assert.equal(hit.damage,15);assert.equal(s.health.meta.hp,5);
});
test('mental attacks use SS to earn judgment damage bonuses too',()=>{
 const s=ready(['max'],'scarecrow'),hit=E.click(s,faces(4,6,6,4,4,4,4,4)).find(e=>e.type==='attack');
 assert.equal(hit.accuracy.total,36);assert.equal(hit.evasion.total,11);assert.equal(hit.bonusDice,2);assert.equal(hit.damage,1); // 18 minus resistance 30
});
test('poison is only applied by an actual hit; a miss never triggers existing poison',()=>{
 const s=ready(['tordeliese'],'scarecrow');s.levels.tordeliese=10;s.purchasedPerks.tordeliese=['greedy-gale'];s.perkEnabled.tordeliese=Object.fromEntries(s.purchasedPerks.tordeliese.map(id=>[id,true]));
 const hit=E.click(s,()=>.5);assert.equal(s.enemies[0].poisonDamage,4);assert.equal(hit.filter(e=>e.poisonTick).length,1);assert.equal(hit.find(e=>e.type==='attack').poisonBefore,0);
 s.questLevels.scarecrow=80;E.setQuestLevel(s,'scarecrow',80);s.enemies[0].poisonDamage=4;const hp=s.enemies[0].hp;
 const miss=E.click(s,()=>.5);assert.equal(miss.find(e=>e.type==='attack').hit,false);assert.equal(miss.some(e=>e.poisonTick),false);assert.equal(s.enemies[0].hp,hp);
 s.enemies[0].poisonDamage=0;E.click(s,()=>.5);assert.equal(s.enemies[0].poisonDamage,0);
});
test('poison badge is synchronized to visual impact instead of the immediate tick result',()=>{
 const s=ready(['tordeliese'],'scarecrow');s.levels.tordeliese=10;s.purchasedPerks.tordeliese=['greedy-gale'];s.perkEnabled.tordeliese=Object.fromEntries(s.purchasedPerks.tordeliese.map(id=>[id,true]));const h=harness(s,undefined,{combatRandom:()=>.5});
 h.click('attack');const bar=h.get('enemy-art').querySelector('.enemy-health');assert.doesNotMatch(bar.textContent,/猛毒/);h.advance(900);assert.match(bar.textContent,/猛毒/);
});
test('training draft cancels purchases, sale quotes, and HP clipping without changing saves; undoing a provisional increase costs nothing',()=>{
 const s=ready();s.paused=true;const h=harness(s,undefined,{combatRandom:()=>.5});
 clickControl(h,'[data-ability]',{ability:'meta'});clickControl(h,'[data-trade]',{trade:'buy',kind:'armor',id:'meta'});
 assert.equal(h.get('ability-level-armor-meta').textContent,'Lv.10');assert.equal(h.saved().armorLevels.meta,0);assert.equal(h.saved().factors,s.factors);
 clickControl(h,'[data-trade]',{trade:'sell',kind:'armor',id:'meta',count:'10'});assert.match(h.get('ability-changes-meta').textContent,/増減なし/);
 clickControl(h,'[data-trade]',{trade:'buy',kind:'vitality',id:'meta'});clickControl(h,'[data-ability-close]',{abilityClose:'meta'});assert.equal(h.saved().vitalityLevels.meta,0);assert.equal(h.saved().factors,s.factors);
});
test('confirm commits all draft tracks once; Escape discards and combat pauses while editing',()=>{
 const s=ready(['meta'],'scarecrow'),h=harness(s,undefined,{combatRandom:()=>.5});
 clickControl(h,'[data-ability]',{ability:'meta'});clickControl(h,'[data-trade]',{trade:'buy',kind:'action',id:'meta'});clickControl(h,'[data-stat]',{stat:'armor',statCharacter:'meta'});
 h.advance(5000);assert.equal(h.saved().actionLevels.meta,0);assert.equal(h.saved().actionPoints.meta,0);
 clickControl(h,'[data-ability-confirm]',{abilityConfirm:'meta'});assert.equal(h.saved().actionLevels.meta,10);assert.equal(h.saved().armorLevels.meta,1);assert.equal(h.saved().factors,s.factors-176-8);
 clickControl(h,'[data-ability]',{ability:'meta'});clickControl(h,'[data-trade]',{trade:'sell',kind:'action',id:'meta',count:'10'});h.get('ability-dialog-meta').listeners.get('cancel')({preventDefault(){}});assert.equal(h.saved().actionLevels.meta,10);
});
test('joint probability forecasts include bonus dice and agree with sampled opposing rolls',()=>{
 const a={flat:14,dice:2},b={flat:9,dice:1};let seed=71;const r=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const distribution=E.judgmentOutcomes(a,b);let hits=0,extra=0;
 for(let i=0;i<30000;i++){const ac=E.combatRoll(a,r),ev=E.combatRoll(b,r);if(ac.total>ev.total){hits++;extra+=E.judgmentBonus(ac,ev).bonusDice;}}
 assert.ok(Math.abs(hits/30000-distribution.chance)<.015);assert.ok(Math.abs(extra/30000-distribution.bonuses.reduce((n,[k,p])=>n+k*p,0))<.02);
});
test('training plans preserve original HP when a proposed sale is undone and permit sale-funded changes',()=>{
 const s=ready();s.vitalityLevels.meta=10;s.armorLevels.meta=10;s.health.meta.hp=35;s.factors=0;const before=structuredClone(s);
 const sale=E.trainingPlan(s,'meta',{vitality:0});assert.ok(sale.valid);assert.equal(sale.state.health.meta.hp,20);assert.deepEqual(s,before);
 const undo=E.trainingPlan(s,'meta',{vitality:10});assert.ok(undo.valid);assert.equal(undo.state.health.meta.hp,35);assert.equal(undo.state.factors,0);
 const funded=E.trainingPlan(s,'meta',{armor:0,accuracy:4});assert.ok(funded.valid);assert.equal(funded.state.armorLevels.meta,0);assert.equal(funded.state.accuracyLevels.meta,4);
 const poor=E.trainingPlan(s,'meta',{accuracy:1});assert.equal(poor.valid,false);assert.deepEqual(s,before);
});
test('page hiding while editing persists only the original training and currency',()=>{
 const s=ready();s.paused=true;const h=harness(s,undefined,{combatRandom:()=>.5});clickControl(h,'[data-ability]',{ability:'meta'});clickControl(h,'[data-trade]',{trade:'buy',kind:'power',id:'meta'});
 h.visible(false);assert.equal(h.saved().levels.meta,1);assert.equal(h.saved().factors,s.factors);h.visible(true);clickControl(h,'[data-ability-close]',{abilityClose:'meta'});assert.equal(h.saved().levels.meta,1);
});


