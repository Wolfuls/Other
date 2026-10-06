'use strict';
const combatFixture=require('./combat-fixture.cjs');
const {freshTarget}=require('./target-fixtures.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs');

test('character and global prices use separate exact growth rates before rounding',()=>{
 const s=combatFixture();
 const reference=(base,n,numerator=1125n)=>{const den=1000n**BigInt(n);return Math.max(base+(n?1:0),Number(BigInt(base)*numerator**BigInt(n)/den));};
 for(let n=0;n<=60;n++){
  for(const c of D.characters){s.levels[c.id]=n+1;s.actionLevels[c.id]=n;assert.equal(E.hireCost(s,c),reference(c.powerCost,n));assert.equal(E.actionCost(s,c),reference(c.actionCost,n));}
  if(n<25)for(const u of D.upgrades.filter(u=>u.max!==1)){s.upgrades[u.id]=n;assert.equal(E.upgradeCost(s,u),reference(u.cost,n,1250n));}
 }
 s.upgrades.overkill=0;assert.equal(E.upgradeCost(s,D.upgrades.find(u=>u.id==='overkill')),200);
 const before=structuredClone(s);S.decode(S.encode(s));assert.deepEqual(s,before,'price calculation does not rewrite old levels');
});



test('three individual enemy slots preserve their neighbors and the down snapshot',()=>{
 const s=combatFixture(1000);s.sessionId='mohicans';s.hp=10;s.levels.meta=1;s.selectedCharacterId='meta';freshTarget(s,10);
 const h=harness(s),ids=['enemy-art','enemy-next-1','enemy-next-2'];
 const appearance=()=>ids.map(id=>h.get(id).dataset.appearance),before=appearance();assert.equal(new Set(before).size,3);
 assert.ok(ids.every(id=>h.get(id).firstElementChild));assert.ok(!h.get('enemy-next-1').hidden);
 h.click('attack');h.advance(630);
 assert.deepEqual(appearance(),before);assert.ok(h.get('enemy-art').classList.contains('enemy-absent'));assert.equal(new Set(appearance()).size,3);
 const ghost=h.get('enemy-defeats').children.find(n=>n.classList.contains('enemy-defeat'));
 assert.equal(ghost.dataset.appearance,before[0]);assert.equal(ghost.firstElementChild.style.getPropertyValue('--enemy-image'),'url("'+D.sessions.find(s=>s.id==='mohicans').variants.find(v=>v.sheet===before[0]).defeatSheet+'")');
 h.click('pause');assert.ok(h.get('arena').classList.contains('enemy-paused'));const paused=appearance();h.advance(1500);assert.deepEqual(appearance(),paused);
});

test('reduced motion still hides defeated individuals without creating falling sprites',()=>{
 const s=combatFixture(1000);s.sessionId='mohicans';s.hp=10;s.levels.meta=1;s.selectedCharacterId='meta';freshTarget(s,10);const h=harness(s);
 h.media.matches=true;h.media.change();const next=h.get('enemy-next-1').dataset.appearance;h.click('attack');
 assert.equal(h.get('enemy-next-1').dataset.appearance,next);assert.ok(h.get('enemy-art').classList.contains('enemy-absent'));assert.equal(h.get('enemy-defeats').children.length,0);assert.ok(h.get('arena').classList.contains('enemy-paused'));
});

test('the whole three-enemy formation and party fit the auto-zoom bounds',()=>{
 for(const width of [240,390,700,1200])for(const mobile of [false,true])for(const richterHired of [false,true])for(const scale of [1,2.15]){
  const l=UI.orbitLayout({width,mobile,richterHired,metaScale:scale,richterScale:scale,enemyCount:3});
  assert.equal(l.reserves.length,2);assert.ok(l.viewWidth<=width+1e-9&&l.viewHeight<=l.heightLimit+1e-9);
  for(const p of [{x:0,y:0},...l.reserves]){
   assert.ok(l.enemyX+p.x-l.enemyWidth/2>=0);assert.ok(l.enemyX+p.x+l.enemyWidth/2<=l.width);
   assert.ok(l.enemyY+p.y-l.enemyHeight/2>=0);assert.ok(l.enemyY+p.y+l.enemyHeight/2<=l.height);
  }
 }
});
