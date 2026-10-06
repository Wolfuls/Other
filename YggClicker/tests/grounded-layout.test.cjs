'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const UI=require('../js/display.js'),E=require('../js/engine.js'),D=require('../js/data.js'),{harness}=require('./app-harness.cjs');

test('Utgard keeps feet on the cover-cropped pavement and complete visible orbit bounds at every zoom',()=>{
 for(const width of [240,390,700,950,1400])for(const mobile of [true,false])for(const richterHired of [true,false])for(const metaScale of [1,2.15,4])for(const richterScale of [1,2.15,4]){
  const l=UI.orbitLayout({width,mobile,richterHired,metaScale,richterScale,enemyCount:3,grounded:true});
  assert.equal(l.groundY,l.height/2+.16*Math.max(l.height,l.width/1.5));
  assert.ok(l.zoom>0&&l.zoom<=1&&l.viewWidth<=width+1e-9&&l.viewHeight<=l.heightLimit+1e-9);
  for(const id of richterHired?['meta','richter']:['meta']){
   const p=l[id],feet=p.y+p.footOffset;
   assert.ok(feet>l.groundY&&feet<l.height,`${id} feet must stay on pavement`);
   assert.ok(p.x-p.footprint/2>=0&&p.x+p.footprint/2<l.width);
   assert.ok(p.y-p.extentY/2>=0&&p.y+p.extentY/2+12<=l.height);
  }
  if(richterHired){assert.ok(l.meta.x+l.meta.footprint/2<l.richter.x-l.richter.footprint/2);assert.equal(l.meta.y+l.meta.footOffset,l.richter.y+l.richter.footOffset);}
  const last=richterHired?l.richter:l.meta;assert.ok(last.x+last.footprint/2<l.enemyX-l.enemyWidth/2);
  for(const p of [{x:0,y:0},...l.reserves]){
   const feet=l.enemyY+p.y+l.enemyFoot;
   assert.ok(feet>l.groundY&&feet<l.height);
   assert.ok(l.enemyX+p.x+l.enemyWidth/2<=l.width);
   assert.ok(l.enemyY+p.y-l.enemyHeight/2>=0&&l.enemyY+p.y+l.enemyHeight/2<=l.height);
  }
 }
});

test('resize refreshes background bounds and combat coordinates without altering progress',()=>{
 const s=combatFixture(1000);s.levels.meta=50;s.levels.richter=20;s.paused=true;const h=harness(s),arena=h.get('arena');
 assert.ok(arena.classList.contains('grounded'));
 const width=500;h.get('arena-viewport').clientWidth=width;h.resize();
 const l=UI.orbitLayout({grounded:true,width,richterHired:true,enemyCount:3,metaScale:E.weaponScale(s,'meta'),richterScale:E.weaponScale(s,'richter'),metaCount:1,richterCount:1});
 assert.equal(arena.style.width,l.width+'px');assert.equal(h.get('meta-combatant').style.top,l.meta.y+'px');
 assert.equal(arena.style.getPropertyValue('--enemy-y'),l.enemyY+'px');
 assert.equal(h.get('arena-viewport').style.getPropertyValue('--scene-width'),l.viewWidth+'px');
 h.get('arena-viewport').clientWidth=950;h.resize();assert.notEqual(h.get('arena-viewport').style.getPropertyValue('--scene-width'),l.viewWidth+'px');
 assert.ok(arena.classList.contains('grounded'));assert.equal(moveTestParty(s,'practice'),false);
 h.advance(11000);const saved=h.saved();assert.deepEqual(saved.levels,s.levels);assert.equal(saved.factors,s.factors);
});

test('enemy feet correction follows the individual when the queue advances',()=>{
 const s=combatFixture(1000);s.sessionId='mohicans';s.hp=10;s.levels.meta=1;s.selectedCharacterId='meta';const h=harness(s);
 const expected=D.sessions.find(s=>s.id==='mohicans').variants.find(v=>v.sheet===h.get('enemy-art').dataset.appearance);
 assert.equal(h.get('enemy-art').firstElementChild.style.getPropertyValue('--foot-shift'),((211-(expected.footY??211))/224*100)+'%');
 const next=h.get('enemy-next-1').firstElementChild.style.getPropertyValue('--foot-shift');
 h.click('attack');h.advance(630);assert.equal(h.get('enemy-art').firstElementChild.style.getPropertyValue('--foot-shift'),next);
});

test('the fixed rain pool contains all six dice faces and a fivefold size range even at low income',()=>{
 const looks=Array.from({length:UI.MAX_FACTOR_CRYSTALS},(_,i)=>UI.factorDieAppearance(i));
 assert.deepEqual([...new Set(looks.map(d=>d.face))].sort(),[1,2,3,4,5,6]);
 assert.equal(Math.min(...looks.map(d=>d.size)),8);assert.equal(Math.max(...looks.map(d=>d.size)),40);
 assert.equal(Math.max(...looks.slice(0,3).map(d=>d.size))/Math.min(...looks.slice(0,3).map(d=>d.size)),5);
 for(const d of looks)assert.equal((d.pips.match(/radial-gradient/g)||[]).length,d.face);
 const h=harness(combatFixture(1000)),pool=h.get('factor-rain').children;
 assert.equal(pool.length,24);pool.forEach((node,i)=>{assert.equal(node.dataset.face,String(looks[i].face));assert.equal(node.style.getPropertyValue('--crystal-size'),looks[i].size+'px');});
});
