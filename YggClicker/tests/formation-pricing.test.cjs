'use strict';
require('./battle-fixtures.cjs')();
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/engine.js'),D=require('../js/data.js'),S=require('../js/save.js'),UI=require('../js/display.js');
const {harness}=require('./app-harness.cjs');

test('character and global prices use separate exact growth rates before rounding',()=>{
 const s=E.createState();
 const reference=(base,n,numerator=115n)=>{const den=100n**BigInt(n);return Number((BigInt(base)*numerator**BigInt(n)+den-1n)/den);};
 for(let n=0;n<=60;n++){
  for(const c of D.characters){s.levels[c.id]=n+1;s.actionLevels[c.id]=n;assert.equal(E.hireCost(s,c),reference(c.powerCost,n));assert.equal(E.actionCost(s,c),reference(c.actionCost,n));}
  if(n<25)for(const u of D.upgrades.filter(u=>u.max!==1)){s.upgrades[u.id]=n;assert.equal(E.upgradeCost(s,u),reference(u.cost,n,125n));}
 }
 s.upgrades.overkill=0;assert.equal(E.upgradeCost(s,D.upgrades.find(u=>u.id==='overkill')),200);
 const before=structuredClone(s);S.decode(S.encode(s));assert.deepEqual(s,before,'price calculation does not rewrite old levels');
});

test('limit break charges 100% unboosted target-aware party DPS, rounds up and never feeds back into its price',()=>{
 const s=E.createState();s.levels.meta=1;s.factors=100;
 assert.ok(Math.abs(E.unboostedDps(s)-7/1.8)<1e-10);assert.equal(E.boostCost(s),4);
 s.factors=3.99;assert.equal(E.buyBoost(s),false);s.factors=4;assert.equal(E.buyBoost(s),true);assert.equal(s.factors,0);assert.equal(s.boostSeconds,30);
 assert.equal(E.boostCost(s),4);assert.ok(E.dps(s)>E.unboostedDps(s));s.factors=100;assert.equal(E.buyBoost(s),false);assert.equal(s.factors,100);
 const before=structuredClone(s);E.boostCost(s);assert.deepEqual(s,before);
 s.boostSeconds=0;s.levels.meta=30;s.purchasedPerks.meta=['mohican-slayer'];s.sessionId='mohicans';s.hp=10;
 const special=E.boostCost(s);E.selectSession(s,'practice');assert.ok(E.boostCost(s)<special);
 s.levels.richter=1;const withAlly=E.boostCost(s);s.levels.richter=0;assert.ok(E.boostCost(s)<withAlly);
 s.actionLevels.meta=20;assert.ok(E.boostCost(s)>withAlly);
});

test('zero DPS cannot buy a free limit break; old active effects and progress survive save transfer',()=>{
 const s=E.createState();assert.equal(E.boostCost(s),0);assert.equal(E.buyBoost(s),false);
 s.levels.meta=50;s.actionLevels.meta=1000000;s.boostSeconds=17;s.upgrades.power=3;
 const old=JSON.parse(S.encode(s));old.gameVersion='0.22.0';assert.deepEqual(S.decode(JSON.stringify(old)),s);
 const h=harness(E.createState(1000));assert.equal(h.get('boost').disabled,true);assert.match(h.get('boost-cost-rule').textContent,/100%/);
});

test('mohican front plus two reserves rotate on clears and preserve the down snapshot',()=>{
 const s=E.createState(1000);s.sessionId='mohicans';s.hp=10;s.levels.meta=1;s.selectedCharacterId='meta';
 const h=harness(s),ids=['enemy-art','enemy-next-1','enemy-next-2'];
 const appearance=()=>ids.map(id=>h.get(id).dataset.appearance),before=appearance();assert.equal(new Set(before).size,3);
 assert.ok(ids.every(id=>h.get(id).firstElementChild));assert.ok(!h.get('enemy-next-1').hidden);
 h.click('attack');h.advance(630);
 assert.deepEqual(appearance(),[before[1],before[2],D.sessions.find(s=>s.id==='mohicans').variants[3].sheet]);
 const ghost=h.get('enemy-defeats').children.find(n=>n.classList.contains('enemy-defeat'));
 assert.equal(ghost.dataset.appearance,before[0]);assert.equal(ghost.firstElementChild.style.getPropertyValue('--enemy-image'),'url("'+D.sessions.find(s=>s.id==='mohicans').variants[0].defeatSheet+'")');
 h.click('pause');assert.ok(h.get('arena').classList.contains('enemy-paused'));const paused=appearance();h.advance(1500);assert.deepEqual(appearance(),paused);
});

test('reduced motion still advances the visual enemy queue without creating falling sprites',()=>{
 const s=E.createState(1000);s.sessionId='mohicans';s.hp=10;s.levels.meta=1;s.selectedCharacterId='meta';const h=harness(s);
 h.media.matches=true;h.media.change();const next=h.get('enemy-next-1').dataset.appearance;h.click('attack');
 assert.equal(h.get('enemy-art').dataset.appearance,next);assert.equal(h.get('enemy-defeats').children.length,0);assert.ok(h.get('arena').classList.contains('enemy-paused'));
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
