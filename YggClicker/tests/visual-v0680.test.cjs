const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,enable,character}=require('./current-fixtures.cjs'),FX=require('../js/combat-effects'),{harness}=require('./app-harness.cjs');

test('full names preserve short labels and saved character IDs',()=>{
 for(const[id,full,short]of [['megumin','江間 愛','めぐみん'],['jewel','豪雀朱院・Ｊ・鳳世輝','ジュエル'],['queen','クイーン・ガーランド','クイーン'],['max','ゲイリー・R・I・マクスウェル','マックス']]){
  assert.equal(character(id).name,full);assert.equal(character(id).shortName,short);assert.ok(id in E.createState().levels);
 }
});

test('each explosion carries the spent magic after the simulation resets it, including misses and area targets',()=>{
 for(const level of [0,3,6])for(const miss of [false,true]){
  const s=ready(['megumin'],'mohicans');enable(s,'megumin','eternal-hammer');s.health.megumin.magicLevel=level;
  if(!level)E.togglePerk(s,'megumin','eternal-hammer',false);
  if(level===3){E.togglePerk(s,'megumin','eternal-hammer',false);enable(s,'megumin','laws-of-heaven');s.health.megumin.magicLevel=3;}
  s.runaway.megumin.runawayRate=60;
  if(miss){s.questLevels.mohicans=10000;E.setQuestLevel(s,'mohicans',10000);s.health.megumin.magicLevel=level;}else s.enemies.forEach(e=>e.evasionFailure=true);
  const events=E.click(s,()=>.4).filter(e=>e.type==='attack'&&!e.poisonTick);
  assert.ok(events.length>0);assert.ok(events.every(e=>e.magicLevel===level));assert.equal(s.health.megumin.magicLevel,undefined);
  assert.ok(FX.plan(events).every(e=>e.magicLevel===level));
 }
 const events=Array.from({length:200},(_,i)=>({type:'attack',actorId:'megumin',magicLevel:i%7,count:1,hit:true,damage:1,hpBefore:500-i,hpAfter:499-i}));
 assert.ok(FX.plan(events).every(e=>Number.isFinite(e.magicLevel)&&e.magicLevel>=0&&e.magicLevel<=6));
 assert.equal(FX.meguminExplosionSize(0),480);assert.equal(FX.meguminExplosionSize(6),1200);assert.equal(FX.meguminExplosionSize(100),1200);
});

test('casting keeps circles through impact, uses the dedicated scaled blast, then leaves no stale charge',()=>{
 const s=ready(['megumin']);enable(s,'megumin','laws-of-heaven');s.health.megumin.magicLevel=3;s.enemies[0].evasionFailure=true;s.forecast=true;
 const h=harness(s,undefined,{combatRandom:()=>.4});h.click('attack');
 const actor=h.get('megumin-combatant'),axis=h.get('megumin-charge-axis');
 assert.ok(actor.classList.contains('spell-casting'));assert.equal(axis.children.filter(x=>!x.hidden).length,3);
 h.advance(800);assert.ok(actor.classList.contains('spell-casting'));assert.equal(axis.children.filter(x=>!x.hidden).length,3);
 const blasts=h.get('explosions').children.filter(x=>x.classList.contains('megumin-explosion'));assert.ok(blasts.length>0);
 assert.equal(blasts[0].style.getPropertyValue('--explosion-size'),'840px');assert.ok(blasts[0].children[0].classList.contains('megumin-fireball'));
 h.advance(650);assert.equal(actor.classList.contains('spell-casting'),false);
 h.click('pause');assert.equal(h.get('explosions').children.length,0);assert.equal(axis.children.filter(x=>!x.hidden).length,0);
});

test('Queen registration removes umbrella-biased offsets and all registered shoe centers stay within half a pixel',()=>{
 const meta=require('../img/queen-registration-v3.json');assert.equal(meta.frames.length,12);
 for(const f of meta.frames)assert.ok(Math.abs((f.footBefore[0]+f.footBefore[1])/2+f.shift[0]-192)<=.5);
 assert.ok(meta.frames.some(f=>Math.abs(f.shift[0])>=20));
});
