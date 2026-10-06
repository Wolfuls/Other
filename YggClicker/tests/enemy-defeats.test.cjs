'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../js/engine.js'),D=require('../js/data.js'),{harness}=require('./app-harness.cjs');

test('manual startup earns the five clears needed for Meta; hire and global upgrade boundaries use the new prices',()=>{
 const s=E.createState();assert.equal(s.factors,0);assert.equal(E.hire(s,'meta'),false);
 for(let i=0;i<5;i++){E.selectEnemy(s,E.livingEnemies(s)[0].id);for(let n=0;n<4;n++)E.click(s,()=>.999);E.advance(s,5,()=>.999);}
 assert.equal(s.kills,5);assert.equal(s.factors,10);assert.ok(E.hire(s,'meta'));assert.equal(s.factors,0);
 s.factors=99;assert.equal(E.hire(s,'richter'),false);s.factors=100;assert.ok(E.hire(s,'richter'));assert.equal(s.factors,0);
 for(const[id,first,next]of [['reward',100,125]]){
  const u=D.upgrades.find(u=>u.id===id);s.factors=first-.01;assert.equal(E.buyUpgrade(s,id),false);
  s.factors=first;assert.ok(E.buyUpgrade(s,id));assert.equal(s.factors,0);assert.equal(E.upgradeCost(s,u),next);
 }
});

test('ten gang appearances include women and two bald enemies, all sharing the same special-damage trait and complete sprite assets',()=>{
 const session=D.sessions.find(s=>s.id==='mohicans');assert.equal(session.variants.length,10);
 assert.equal(session.variants.filter(v=>v.name.startsWith('ハゲ')).length,2);assert.deepEqual(session.traits,['mohican','swarm']);
 for(const v of session.variants)for(const[key,width]of [['sheet',768],['defeatSheet',1024]]){
  const file=path.join(__dirname,'..',v[key]),png=fs.readFileSync(file);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),224);
 }
});

test('each defeated variant keeps its own four-pose sheet while its slot is absent; pause clears all falling sprites',()=>{
 const variants=D.sessions.find(s=>s.id==='mohicans').variants;
 for(let i=0;i<variants.length;i++){
  const s=combatFixture(1000);s.sessionId='mohicans';s.levels.meta=50;s.hp=10;s.selectedCharacterId='meta';freshTarget(s,10);const h=harness(s,undefined,{visualRandom:()=> (i+.1)/variants.length});
  const next=h.get('enemy-next-1').dataset.appearance;
  assert.equal(h.get('enemy-art').dataset.appearance,variants[i].sheet);
  h.click('attack');h.advance(800);
  const ghosts=h.get('enemy-defeats').children.filter(n=>n.classList.contains('enemy-defeat'));
  assert.equal(ghosts.length,1);const ghost=ghosts[0];assert.ok(ghost.classList.contains('has-defeat-sheet'));
  assert.equal(ghost.dataset.reason,'hp');assert.equal(ghost.dataset.defeatSheet,variants[i].defeatSheet);
  assert.equal(ghost.firstElementChild.style.getPropertyValue('--enemy-image'),'url("'+variants[i].defeatSheet+'")');
  assert.ok(parseFloat(ghost.style.getPropertyValue('--fall-duration'))>=660);
  assert.equal(h.get('enemy-next-1').dataset.appearance,next);assert.ok(h.get('enemy-art').classList.contains('enemy-absent'));
  h.click('pause');assert.equal(h.get('enemy-defeats').children.length,0);
  assert.equal(moveTestParty(s,'practice'),false,'retired sessions cannot be selected');
 }
});

test('sustained extreme gang clears keep falling sprites bounded and release them when hidden',()=>{
 const s=combatFixture(1000);s.sessionId='mohicans';s.hp=10;s.levels.richter=50;s.actionLevels.richter=1000000;s.purchasedPerks.richter=['bom-ber'];
 const h=harness(s);let max=0;for(let i=0;i<200;i++){h.advance(40);max=Math.max(max,h.get('enemy-defeats').children.length);}
 assert.ok(max>0);assert.ok(max<=24,`${max} falling sprites and labels`);
 h.visible(false);assert.equal(h.get('enemy-defeats').children.length,0);h.advance(2000);assert.equal(h.get('enemy-defeats').children.length,0);
});
