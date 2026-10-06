'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save'),{harness}=require('./app-harness.cjs');
function ready(quest='scarecrow'){
 const s=E.createState(1000);s.factors=1e12;
 for(const id of ['meta','waku','vishunal','richter'])s.levels[id]=1;
 E.setFormation(s,quest,['meta','waku','vishunal']);E.selectSession(s,quest);
 s.questLevels[quest]=100;s.hp=E.getSession(s).hp;s.enemies=null;E.ensureEnemies(s);
 s.actionLevels.waku=25;s.purchasedPerks.waku=['floor-clip'];
 s.health.meta.hp=8;s.health.waku.hp=15;s.health.vishunal.hp=20;
 return s;
}
const candidates=s=>E.enemyTargetCandidates(s).map(c=>c.id);
test('Floor Clip holds current-HP target until exactly ten elapsed seconds, independent of HP ratios',()=>{
 const s=ready();assert.deepEqual(candidates(s),['waku','vishunal']);
 s.health.waku.hp=5;
 E.advance(s,9.999,()=>.4);assert.equal(s.floorClipTargetId,'meta');assert.deepEqual(candidates(s),['waku','vishunal']);
 E.advance(s,.001,()=>.4);assert.equal(s.floorClipTargetId,'waku');assert.deepEqual(candidates(s),['meta','vishunal']);
 assert.equal(s.floorClipSeconds,10);
 s.health.vishunal.hp=4;E.advance(s,10,()=>.4);assert.equal(s.floorClipTargetId,'vishunal');
});
test('Floor Clip countdown survives saving, session switching, split advances, and pauses',()=>{
 const s=ready();candidates(s);s.health.waku.hp=5;E.advance(s,3.25,()=>.4);
 E.setFormation(s,'mohicans',['richter']);assert.equal(s.floorClipSeconds,6.75);assert.equal(s.floorClipTargetId,'meta');
 const saved=S.decode(S.encode(s));assert.equal(saved.floorClipSeconds,6.75);
 saved.paused=true;E.advance(saved,20,()=>.4);assert.equal(saved.floorClipSeconds,6.75);saved.paused=false;
 E.selectSession(saved,'mohican-solo');E.advance(saved,6.74,()=>.4);
 assert.equal(E.battleContext(saved,'scarecrow').floorClipTargetId,'meta');
 E.advance(saved,.01,()=>.4);E.selectSession(saved,'scarecrow');assert.equal(saved.floorClipTargetId,'waku');
 const whole=structuredClone(s),split=structuredClone(s);E.advance(whole,6.75,()=>.4);for(const dt of [1.25,2,.5,3])E.advance(split,dt,()=>.4);
 assert.equal(whole.floorClipTargetId,split.floorClipTargetId);assert.equal(whole.floorClipSeconds,split.floorClipSeconds);
 assert.deepEqual(S.decode(S.encode(saved)),saved);
});
test('Floor Clip respects formation changes, incapacitated owner, ties and last survivor',()=>{
 const s=ready();s.health.meta.hp=s.health.waku.hp=10;assert.deepEqual(candidates(s),['waku','vishunal']);
 s.health.meta.status='unconscious';assert.deepEqual(candidates(s),['waku','vishunal']);
 s.health.vishunal.status='unconscious';assert.deepEqual(candidates(s),['waku']);
 s.health.waku.status='unconscious';assert.deepEqual(candidates(s),[]);assert.equal(s.floorClipSeconds,0);
 s.health.waku.status='active';s.health.waku.hp=20;E.setFormation(s,'mohican-solo',['waku']);assert.equal(s.floorClipTargetId,null);
 const moved=E.battleContext(s,'mohican-solo');assert.deepEqual(candidates(moved),['waku']);assert.deepEqual(S.decode(S.encode(s)),s);
});
test('schema28 saves gain empty protection clocks and invalid cached targets are rejected',()=>{
 const s=ready();delete s.floorClipSeconds;delete s.floorClipTargetId;
 const restored=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:28,state:s}));assert.equal(restored.floorClipTargetId,null);assert.equal(restored.floorClipSeconds,0);
 for(const patch of [{floorClipTargetId:'max',floorClipSeconds:5},{floorClipTargetId:'meta',floorClipSeconds:0},{floorClipSeconds:10.1},{floorClipSeconds:-1}])assert.throws(()=>S.encode({...restored,...patch}));
});
test('a focused hit shakes only the individual swarm target, including reserves',()=>{
 for(let slot=0;slot<3;slot++){
  const s=ready('mohicans');E.selectCharacter(s,'meta');E.selectEnemy(s,s.enemies[slot].id);
  const h=harness(s,undefined,{combatRandom:()=>.4}),ids=['enemy-art','enemy-next-1','enemy-next-2'],seen=new Set();
  h.click('attack');for(let i=0;i<45;i++){h.advance(20);ids.forEach((id,j)=>{if(h.get(id).classList.contains('enemy-hit'))seen.add(j);});}
  assert.deepEqual([...seen],[slot]);h.click('pause');assert.ok(ids.every(id=>!h.get(id).classList.contains('enemy-hit')));
 }
});
test('a group attack shakes all three enemies and pause clears independent timers',()=>{
 const s=ready('mohicans');s.levels.richter=50;s.purchasedPerks.richter=['bom-ber'];E.setFormation(s,'mohicans',['richter']);E.selectCharacter(s,'richter');
 const h=harness(s,undefined,{combatRandom:()=>.4}),ids=['enemy-art','enemy-next-1','enemy-next-2'],seen=new Set();h.click('attack');
 for(let i=0;i<65;i++){h.advance(20);ids.forEach((id,j)=>{if(h.get(id).classList.contains('enemy-hit'))seen.add(j);});}
 assert.deepEqual([...seen].sort(),[0,1,2]);h.click('pause');h.advance(500);assert.ok(ids.every(id=>!h.get(id).classList.contains('enemy-hit')));
});
