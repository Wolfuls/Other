'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const UI=require('../js/display.js'),D=require('../js/data.js'),E=require('../js/engine.js'),{harness}=require('./app-harness.cjs');
const seeded=(seed=23142)=>()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
const buy=(h,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s==='[data-hire], [data-action]'?{dataset,disabled:false}:null}});

test('new arrivals are random, keep visible reserves in order, and do not repeat a fixed ten-enemy cycle',()=>{
 const rng=seeded(),seen=[],counts=Array(10).fill(0);let queue=UI.advanceEnemyQueue([],10,0,rng);
 for(let i=0;i<10000;i++){
  const before=[...queue];counts[queue[0]]++;seen.push(queue[0]);queue=UI.advanceEnemyQueue(queue,10,1,rng);
  assert.deepEqual(queue.slice(0,2),before.slice(1));assert.equal(new Set(queue).size,3);
 }
 assert.ok(counts.every(n=>n>880&&n<1120));
 assert.notDeepEqual(seen.slice(0,10),seen.slice(10,20));
 assert.deepEqual(UI.advanceEnemyQueue(queue,10,0,()=>{throw Error('Ordinary render must retain enemies');}),queue);
 let calls=0;const skip=UI.advanceEnemyQueue(queue,10,1e15,()=>{calls++;return .25;});assert.equal(calls,3);assert.equal(new Set(skip).size,3);
 assert.deepEqual(UI.advanceEnemyQueue([],0,1,rng),[]);
});

test('character identity stays hidden below hire price, reveals at affordability and stays visible after hire',()=>{
 const s=combatFixture(1000);s.factors=97;s.levels.meta=1;s.selectedCharacterId='meta';const h=harness(s);
 assert.ok(h.get('card-richter').classList.contains('obscured'));assert.equal(h.get('identity-richter').textContent,'？？？');
 assert.equal(h.get('hire-cost-richter').textContent,'100 Rd');assert.equal(h.get('meta-combatant').hidden,false);
 h.click('attack');assert.ok(h.get('card-richter').classList.contains('obscured'));
 h.click('attack');h.click('attack');h.click('attack');assert.ok(!h.get('card-richter').classList.contains('obscured'));assert.equal(h.get('identity-richter').textContent,D.characters[1].name);
 buy(h,{hire:'richter'});assert.equal(h.saved().levels.richter,1);assert.ok(h.saved().factors<100);assert.ok(!h.get('card-richter').classList.contains('obscured'));
 assert.ok(h.get('card-vishunal').classList.contains('obscured'));
 const t=combatFixture(1000);t.paused=true;t.factors=100;t.levels.meta=1;const k=harness(t);
 assert.ok(!k.get('card-richter').classList.contains('obscured'));buy(k,{hire:'meta'});
 assert.ok(k.get('card-richter').classList.contains('obscured'));assert.ok(!k.get('card-meta').classList.contains('obscured'));
 assert.equal(harness(combatFixture(1000)).get('meta-combatant').hidden,true);
});

test('battle window size stays stable across levels, counts and hires; only occupied content controls zoom',()=>{
 for(const mobile of [false,true])for(const width of [390,950,1400]){
  const layouts=[];
  for(const count of [0,1,8,60])for(const scale of [1,1.5,2.15,4])for(const richterHired of [false,true]){
   layouts.push(UI.orbitLayout({width,mobile,grounded:true,enemyCount:3,metaScale:scale,richterScale:scale,metaCount:count,richterCount:count,richterHired}));
  }
  assert.equal(new Set(layouts.map(l=>l.viewHeight)).size,1);
  for(const l of layouts){assert.ok(l.viewWidth<=width+1e-9);assert.ok(l.height*l.zoom<=l.viewHeight+1e-9);}
 }
 const hidden=UI.orbitLayout({width:1000,grounded:true,enemyCount:3,metaHired:false,metaScale:100,metaCount:60});assert.equal(hidden.zoom,1);
 const s=combatFixture(1000);s.paused=true;s.factors=1e7;s.levels.meta=50;s.actionLevels.meta=50;const h=harness(s);
 const height=h.get('arena-viewport').style.height;
 for(let i=0;i<20;i++){buy(h,{hire:'meta'});buy(h,{action:'meta'});assert.equal(h.get('arena-viewport').style.height,height);}
});

test('missile volleys use all eight muzzle origins and clear their synchronized flashes on pause',()=>{
 const s=combatFixture(1000);s.levels.vishunal=1;s.selectedCharacterId='vishunal';s.questLevels.mohicans=30;s.hp=E.getSession(s).hp;const h=harness(s),shots=[];
 for(let i=0;i<8;i++){h.click('attack');shots.push(h.get('vishunal-projectiles').lastElementChild);}
 assert.equal(new Set(shots.map(n=>n.dataset.muzzle)).size,8);
 assert.equal(new Set(shots.map(n=>n.style.left+','+n.style.top)).size,8);
 const flashes=h.get('vishunal-muzzles').children;assert.equal(flashes.length,8);
 for(let i=0;i<8;i++){assert.equal(flashes[i].dataset.muzzle,shots[i].dataset.muzzle);assert.equal(flashes[i].style.getPropertyValue('--launch-delay'),shots[i].style.getPropertyValue('--launch-delay'));}
 h.advance(200);h.click('pause');assert.equal(h.get('vishunal-muzzles').children.length,0);
 for(const ports of D.vishunalVisual.muzzles){assert.equal(ports.length,8);assert.ok(ports.every(([x,y])=>x>0&&x<224&&y>0&&y<224));}
});
