'use strict';
const combatFixture=require('./combat-fixture.cjs');
require('./passive-enemies.cjs');
const moveTestParty=require('./single-party-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),B=require('../js/battle-batch.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');
const [meta,richter,dog]=D.characters;
const trained=()=>{const s=combatFixture(1000);for(const c of [meta,richter,dog]){s.levels[c.id]=100;s.purchasedPerks[c.id]=c.perks.map(p=>p.id);}return s;};

test('revised park levels and effects match the unified Rare Metal Blade and three Vishunal purchases',()=>{
 assert.deepEqual(meta.perks.map(p=>[p.id,p.level]),[['attack-plus',10],['mohican-slayer',25],['metal-blade',50],['metal-storm',75],['full-metal-burst',100]]);
 assert.deepEqual(richter.perks.map(p=>[p.id,p.level]),[['z-bom',10],['dx-bom',25],['bom-ber',50],['vx-bom',75],['ex-bom',100]]);
 assert.deepEqual(dog.perks.map(p=>[p.id,p.level]),[['legal-launcher',10],['mad-dog',25],['missile-missile',50]]);
 const s=combatFixture();s.levels.meta=50;s.factors=50000;assert.ok(E.buyPerk(s,'meta','metal-blade'));assert.deepEqual(E.stats(s,meta),{dice:4,flat:5});assert.ok(E.attackProfile(s,meta).ignoreDefense);
 assert.equal(dog.perks[0].struckPrefix,'違');assert.equal(E.buyPerk(s,'meta','metal-man'),false);
});

test('every ally spills over only on swarm quests and every damage path respects penetration immunity',()=>{
 const s=trained();
 for(const q of D.sessions){moveTestParty(s,q.id);for(const c of [meta,richter,dog]){
  const p=E.attackProfile(s,c);assert.equal(p.areaAttack,q.traits.includes('swarm'));assert.equal(E.hasAreaAttack(s,c),p.areaAttack);
  assert.equal(p.extraAttackChance,0);
  if(q.id==='scarecrow'){assert.equal(p.defense,35);assert.equal(p.ignoreDefense,false);assert.equal(p.areaAttack,false);}
 }}
 s.levels={meta:50,richter:0,vishunal:0,tordeliese:0,max:0,waku:0};s.purchasedPerks={meta:['metal-blade'],richter:[],vishunal:[],tordeliese:[],max:[],waku:[]};s.selectedCharacterId='meta';moveTestParty(s,'scarecrow');
 const p=E.attackProfile(s,meta);assert.equal(p.penetrationBlocked,true);assert.equal(p.defense,35);
 const before=s.hp;E.click(s,()=>0);assert.equal(before-s.hp,18); // (4+5)*5.9=53, armor35.
 assert.equal(E.characterDps(s,meta),B.averageDamage(p)*.5*E.combatUptime(s));
 const s2=structuredClone(s);s2.actionLevels.meta=100000;E.advance(s2,120,()=>{throw Error('expected aggregate combat');});assert.ok(s2.kills>0);assert.deepEqual(S.decode(S.encode(s2)),s2);
});



test('schema15 refunds removed and newly ineligible perks once, merges Meta ownership and preserves progression',()=>{
 const old=combatFixture(1000);old.factors=12345;old.earned=56789;old.levels={meta:50,richter:50,vishunal:50};old.actionPoints={meta:31,richter:47,vishunal:9};
 old.purchasedPerks={meta:['metal-blade','attack-plus','mohican-slayer','full-metal-burst','metal-man'],richter:['z-bom','dx-bom','vx-bom','ex-bom','bom-ber'],vishunal:['legal-launcher','mad-dog','eel-delivery','trigger-happy','missile-missile']};
 const s=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:15,state:old}));assert.equal(s.factors,old.factors+11810);assert.equal(s.earned,old.earned);assert.deepEqual(s.actionPoints,{...old.actionPoints,tordeliese:0,max:0,waku:0});assert.deepEqual(s.levels,{...old.levels,tordeliese:0,max:0,waku:0});
 assert.deepEqual(s.purchasedPerks.meta,['attack-plus','mohican-slayer','metal-blade']);assert.deepEqual(s.purchasedPerks.richter,['z-bom','dx-bom','bom-ber']);assert.deepEqual(s.purchasedPerks.vishunal,['legal-launcher','mad-dog','missile-missile']);
 assert.deepEqual(S.decode(S.encode(s)),s);
 for(const ids of [['metal-blade'],['metal-man']]){const state={...old,purchasedPerks:{meta:ids,richter:[],vishunal:[]}};const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:15,state}));assert.deepEqual(migrated.purchasedPerks.meta,['metal-blade']);assert.equal(migrated.factors,old.factors);}
 old.levels.meta=10;old.levels.vishunal=20;old.purchasedPerks={meta:['metal-blade'],richter:[],vishunal:['mad-dog']};const low=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:15,state:old}));assert.equal(low.factors,old.factors+1510);assert.deepEqual(low.purchasedPerks.meta,[]);assert.deepEqual(low.purchasedPerks.vishunal,[]);
});

test('invalid legacy perks never produce refunds and current saves reject retired purchases',()=>{
 const old=combatFixture();old.levels.meta=50;
 for(const ids of [['metal-blade','metal-blade'],['unknown'],['metal-storm']]){old.purchasedPerks.meta=ids;assert.throws(()=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:15,state:old})));}
 old.purchasedPerks.meta=['metal-man'];assert.throws(()=>S.encode(old));old.levels.meta=49;assert.throws(()=>S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:15,state:old})));
});

test('new enemy art has four idle and four defeat frames and all sprites stay above a shared floor',()=>{
 for(const id of ['scarecrow','dementor'])for(const type of ['idle','defeat']){const png=fs.readFileSync(path.join(__dirname,`../img/enemy-${id}-${type}-v1.png`));assert.equal(png.readUInt32BE(16),type==='idle'?768:1024);assert.equal(png.readUInt32BE(20),224);}
 for(const width of [320,780,1400])for(const q of D.sessions){const l=UI.orbitLayout({width,grounded:true,metaCount:0,richterCount:0,richterHired:true,enemyScale:q.enemyScale||1,availableHeight:300});assert.ok(l.enemyY-l.enemyHeight/2>=0);assert.ok(l.enemyY+l.enemyHeight/2<=l.height);assert.ok(l.viewWidth<=width+1e-9);}
 const base={width:1000,grounded:true,metaCount:0,richterCount:0,richterHired:true};assert.ok(UI.orbitLayout({...base,enemyScale:1.68}).enemyHeight>UI.orbitLayout({...base,enemyScale:1.09}).enemyHeight*1.5);
});

test('armor kneeling keeps its dedicated sheet and position through defeat, then gets cleaned up',()=>{
 const s=trained();moveTestParty(s,'scarecrow');s.selectedCharacterId='richter';s.hp=1;s.paused=false;const h=harness(s);h.click('attack');h.advance(900);
 const ghost=h.get('enemy-defeats').children.find(n=>n.classList.contains('enemy-defeat'));assert.ok(ghost);assert.equal(ghost.dataset.defeatStyle,'kneel');assert.equal(ghost.style.marginLeft,'0px');assert.equal(ghost.style.getPropertyValue('--fall-duration'),'1100ms');
 assert.ok(ghost.firstElementChild.style.getPropertyValue('--enemy-image').includes('enemy-scarecrow-defeat-v1.png'));h.click('pause');assert.equal(h.get('enemy-defeats').children.length,0);
});
