'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine'),{harness}=require('./app-harness.cjs');
function party(quest='mohicans'){
 const s=combatFixture(1000);s.levels.meta=1;s.levels.richter=1;s.factors=1000;
 E.setFormation(s,'mohicans',[]);E.setFormation(s,quest,['meta','richter']);E.selectSession(s,quest);E.selectCharacter(s,'meta');E.ensureEnemies(s);return s;
}
test('clicking a downed sprite offers revival without changing the manual actor, then charges once',()=>{
 const s=party();s.paused=true;s.health.richter={hp:-2,status:'dying',regenSeconds:0};const h=harness(s);
 assert.match(h.get('richter-select').getAttribute('aria-label'),/復活バースト/);
 h.click('richter-select');assert.equal(h.get('revive-dialog').open,true);assert.equal(h.saved().selectedCharacterId,'meta');
 assert.match(h.get('revive-cost').textContent,/100Rd/);h.click('cancel-revive');assert.equal(h.get('revive-dialog').open,false);assert.equal(h.saved().factors,1000);
 h.click('richter-select');h.click('confirm-revive');const after=h.saved();assert.equal(after.health.richter.hp,24);assert.equal(after.health.richter.status,'active');assert.equal(after.factors,900);assert.equal(after.selectedCharacterId,'meta');assert.equal(h.get('revive-dialog').open,false);
 h.click('confirm-revive');assert.equal(h.saved().factors,900);
});
test('rear enemy focus toggles through its own target button and can be cleared',()=>{
 const s=party();s.paused=true;const h=harness(s,undefined,{combatRandom:()=>.4}),rear=h.get('enemy-next-2'),button=rear.querySelector('.enemy-target');
 button.click();assert.equal(h.saved().focusedEnemyId,s.enemies[2].id);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(rear.classList.contains('focused-enemy'),true);
 button.click();assert.equal(h.saved().focusedEnemyId,null);button.click();h.click('clear-focus');assert.equal(h.saved().focusedEnemyId,null);
});
test('loaded soul drain starts without damage and displays impact only after its remaining animation',()=>{
 const s=party('dementor');s.enemies[1].pendingAttack={targetId:'meta',remaining:.6};const h=harness(s,undefined,{combatRandom:()=>.4}),rear=h.get('enemy-next-1');
 assert.equal(rear.classList.contains('enemy-attacking'),true);assert.equal(h.get('enemy-effects').children.length,1);
 assert.equal(h.get('damage-floats').children.filter(e=>e.classList.contains('ally-damage')).length,0);
 h.advance(400);assert.equal(rear.classList.contains('enemy-attacking'),true);assert.equal(h.get('damage-floats').children.filter(e=>e.classList.contains('ally-damage')).length,0);
 h.advance(250);assert.equal(rear.classList.contains('enemy-attacking'),false);assert.equal(h.get('enemy-effects').children.length,0);assert.ok(h.get('damage-floats').children.some(e=>e.classList.contains('ally-damage')));
});
test('pause cancels soul visuals while preserving the pending attack for resume',()=>{
 const s=party('dementor');s.enemies[0].pendingAttack={targetId:'meta',remaining:1.1};const h=harness(s);
 assert.equal(h.get('enemy-effects').children.length,1);h.click('pause');h.advance(3000);assert.equal(h.get('enemy-effects').children.length,0);assert.equal(h.saved().enemies[0].pendingAttack.remaining,1.1);
 h.click('pause');assert.equal(h.get('enemy-effects').children.length,1);assert.equal(h.get('enemy-art').classList.contains('enemy-attacking'),true);
});
