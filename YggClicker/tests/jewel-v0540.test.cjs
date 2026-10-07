const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),FX=require('../js/combat-effects'),UI=require('../js/display');
const c=D.characters.find(c=>c.id==='jewel');
function ready(ids=['jewel'],q='mohican-solo'){
 const s=E.createState(1000);s.factors=1e15;for(const id of ids)s.levels[id]=1;E.refreshQuestUnlocks(s);E.setFormation(s,q,ids);if(s.sessionId!==q)E.selectSession(s,q);E.ensureEnemies(s);s.selectedCharacterId='jewel';return s;
}
const faces=(...v)=>()=>((v.shift()??4)-.5)/6;
const durable=s=>{s.enemies[0].hp=100000;s.hp=100000;return s;};
test('Jewel base stats, six-track investment, sales, and cancelled draft are consistent',()=>{
 assert.equal(c.cost,12000);assert.equal(c.action,11);assert.deepEqual(c.accuracy,{flat:16,dice:1});assert.equal(E.armor(ready(),c),7);
 const s=ready();assert.equal(E.trainingInvestment(s,c),0);
 assert.ok(E.hire(s,'jewel'));assert.ok(E.buyAction(s,'jewel'));for(const t of D.statUpgrades)assert.ok(E.buyStat(s,'jewel',t.id));
 assert.equal(E.trainingInvestment(s,c),2400*5+3000);
 const before=structuredClone(s),draft=E.trainingPlan(s,'jewel',{power:3});assert.ok(draft.valid);assert.deepEqual(s,before);assert.ok(E.trainingInvestment(draft.state,c)>E.trainingInvestment(s,c));
 assert.ok(E.sell(s,'armor','jewel'));assert.equal(E.trainingInvestment(s,c),12600);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('accuracy and armor perks unlock on their own levels and deactivate after sale',()=>{
 const s=ready();s.levels.jewel=100;assert.equal(E.buyPerk(s,'jewel','crystal-radiance'),false);s.accuracyLevels.jewel=50;assert.ok(E.buyPerk(s,'jewel','crystal-radiance'));
 s.armorLevels.jewel=10;assert.ok(E.buyPerk(s,'jewel','yellow-glow'));assert.equal(E.armor(s,c),22);
 E.sell(s,'armor','jewel');assert.equal(E.perks(s,c).find(p=>p.id==='yellow-glow').unlocked,false);
});
test('side income uses 1% probability, 1% current investment, only local active Jewel',()=>{
 const s=ready();E.hire(s,'jewel');s.selectedCharacterId=null;s.enemies[0].hp=s.hp=1;
 const events=E.click(s,()=>0);assert.equal(events.find(e=>e.type==='perkIncome').amount,24);
 const miss=ready();E.hire(miss,'jewel');miss.selectedCharacterId=null;miss.enemies[0].hp=miss.hp=1;assert.equal(E.click(miss,()=>.5).some(e=>e.type==='perkIncome'),false);
 const down=ready();E.hire(down,'jewel');down.health.jewel={hp:-1,status:'dying',regenSeconds:0};down.selectedCharacterId=null;down.enemies[0].hp=down.hp=1;assert.equal(E.click(down,()=>0).some(e=>e.type==='perkIncome'),false);
});
test('double-hit income is awarded after a hit, never a miss or ordinary hit',()=>{
 const s=durable(ready());s.levels.jewel=10;s.purchasedPerks.jewel=['crimson-fist'];
 const hit=E.click(s,faces(4,4,4,4,1,6,4)),attack=hit.find(e=>e.type==='attack');assert.equal(attack.doubleHit,true);assert.equal(hit.find(e=>e.type==='perkIncome').amount,attack.damage);
 assert.equal(E.click(s,faces(4,4,4,4,4)).some(e=>e.type==='perkIncome'),false);
 assert.equal(E.click(s,faces(4,4,4,4,6,6,4)).some(e=>e.type==='perkIncome'),false);
});
test('rainbow includes triggering damage and expires after three own turns without stacking',()=>{
 const s=durable(ready());s.levels.jewel=100;s.purchasedPerks.jewel=['rainbow-armor'];
 const hit=E.click(s,faces(4,4,4,4,1,6,4)).find(e=>e.type==='attack');assert.equal(hit.damage,Math.floor((17+15+4)*10.9));assert.equal(s.rainbowTurns,2);assert.equal(E.armor(s,c),22);
 E.click(s,faces(4,4,4,4,1,6,4));assert.equal(s.rainbowTurns,2);assert.equal(E.stats(s,c).flat,20);
 E.click(s,faces(4,4,4,4,6,6,4));assert.equal(s.rainbowTurns,1);
 E.click(s,faces(4,4,4,4,6,6,4));assert.equal(s.rainbowTurns,0);assert.equal(E.armor(s,c),7);
});
test('crystal applies only on hit, lasts two target turns and does not stack',()=>{
 const s=durable(ready());s.accuracyLevels.jewel=50;s.purchasedPerks.jewel=['crystal-radiance'];E.click(s,()=>.5);assert.equal(s.enemies[0].evasionPenalty,6);assert.equal(s.enemies[0].evasionPenaltyTurns,2);
 E.click(s,()=>.5);assert.equal(s.enemies[0].evasionPenalty,6);assert.equal(s.enemies[0].evasionPenaltyTurns,2);
 const enemy=s.enemies[0];enemy.pendingAttack={targetId:'jewel',remaining:.1,count:1};E.advance(s,.1,()=>.5);assert.equal(enemy.evasionPenaltyTurns,1);
 enemy.pendingAttack={targetId:'jewel',remaining:.1,count:1};E.advance(s,.1,()=>.5);assert.equal(enemy.evasionPenaltyTurns,0);assert.equal(enemy.evasionPenalty,0);
});
test('yellow halves other ally weights, respects Waku protection and stops when down',()=>{
 const s=ready(['jewel','meta','waku']);s.armorLevels.jewel=10;s.purchasedPerks.jewel=['yellow-glow'];assert.deepEqual(E.enemyTargetWeights(s).map(t=>[t.character.id,t.weight]),[['jewel',1],['meta',.5],['waku',.5]]);
 s.actionLevels.waku=25;s.purchasedPerks.waku=['floor-clip'];s.health.meta.hp=1;assert.deepEqual(E.enemyTargetWeights(s).map(t=>t.character.id),['jewel','waku']);
 s.health.jewel={hp:-1,status:'dying',regenSeconds:0};assert.ok(E.enemyTargetWeights(s).every(t=>t.weight===1));
});
test('iolite grants received damage only if still active after the hit; lethal and knockout hits grant none',()=>{
 const hit=(hp,random)=>{const s=ready();s.armorLevels.jewel=50;s.purchasedPerks.jewel=['iolite-shield'];s.health.jewel.hp=hp;s.enemies[0].pendingAttack={targetId:'jewel',remaining:.1,count:1};return {s,events:E.advance(s,.1,random)};};
 const healthy=hit(36,()=>.5);assert.equal(healthy.events.find(e=>e.type==='perkIncome').amount,1);
 const fatal=hit(0,()=>.5);assert.equal(fatal.s.health.jewel.status,'dying');assert.equal(fatal.events.some(e=>e.type==='perkIncome'),false);
 const ko=hit(3,faces(4,4,4,4,1));assert.equal(ko.s.health.jewel.status,'unconscious');assert.equal(ko.events.some(e=>e.type==='perkIncome'),false);
});
test('black egg starts above one trillion and gains three per doubling; selling reduces it',()=>{
 const s=ready();s.armorLevels.jewel=100;s.purchasedPerks.jewel=['black-egg'];
 s.actionLevels.jewel=130;const before=E.armor(s,c),spent=E.trainingInvestment(s,c);assert.ok(spent<1e12);
 while(E.trainingInvestment(s,c)<=1e12)E.buyAction(s,'jewel');assert.ok(E.armor(s,c)>before);const level=s.actionLevels.jewel;
 while(E.trainingInvestment(s,c)<2e12)E.buyAction(s,'jewel');assert.equal(E.armor(s,c),220);
 while(s.actionLevels.jewel>=level)E.sell(s,'action','jewel');assert.equal(E.armor(s,c),before);
});
test('timed statuses persist through save and session switch, and reset only on challenge change',()=>{
 const s=ready(['jewel'],'mohicans');s.rainbowTurns=2;s.enemies[1].evasionPenalty=6;s.enemies[1].evasionPenaltyTurns=2;
 assert.deepEqual(S.decode(S.encode(s)),s);assert.ok(E.selectSession(s,'scarecrow'));assert.equal(s.rainbowTurns,0);E.selectSession(s,'mohicans');assert.equal(s.rainbowTurns,2);assert.equal(s.enemies[1].evasionPenaltyTurns,2);
 s.questActiveLevels.mohicans=1;s.questLevels.mohicans=2;E.setQuestLevel(s,'mohicans',2);assert.equal(s.rainbowTurns,0);assert.ok(s.enemies.every(e=>e.evasionPenaltyTurns===0));
 const old=JSON.parse(S.encode(ready()));old.schemaVersion=30;for(const f of ['levels','actionLevels','actionPoints','purchasedPerks','health',...D.statUpgrades.map(t=>t.field)])delete old.state[f].jewel;old.state.formations[old.state.sessionId]=[];old.state.selectedCharacterId=null;delete old.state.rainbowTurns;const loaded=S.decode(JSON.stringify(old));assert.equal(loaded.levels.jewel,0);assert.equal(loaded.health.jewel.hp,36);
});
test('offscreen damage income reaches shared factors and no effects leak into another session',()=>{
 const s=ready(['meta']);s.levels.jewel=1;s.armorLevels.jewel=50;s.purchasedPerks.jewel=['iolite-shield'];E.setFormation(s,'mohicans',['jewel']);
 const ctx=E.battleContext(s,'mohicans');E.ensureEnemies(ctx)[0].pendingAttack={targetId:'jewel',remaining:.1,count:1};s.sessionStates.mohicans=E.battleSnapshot(ctx);const before=s.factors;
 const events=E.advance(s,.1,()=>.5);assert.equal(s.factors-before,1);assert.equal(events.find(e=>e.type==='perkIncome').sessionId,'mohicans');assert.equal(s.rainbowTurns,0);
});
test('Jewel participates in visual batching and grounded placement',()=>{
 const frames=FX.plan([{type:'attack',actor:'ジュエル',actorId:'jewel',damage:20,hpBefore:100,hpAfter:80},{type:'attack',actor:'ジュエル',actorId:'jewel',damage:20,hpBefore:80,hpAfter:60}],{sustainedActors:['jewel']});assert.equal(frames.length,2);assert.ok(frames.every(f=>f.jewelAttacks===1&&f.volleyJewelCount===2));assert.ok(Number.isFinite(frames[1].offset));
 const layout=UI.orbitLayout({grounded:true,jewelHired:true,width:1000});assert.ok(Number.isFinite(layout.jewel.x));assert.equal(layout.jewel.y+layout.jewel.footOffset,layout.meta.y+layout.meta.footOffset);
});
