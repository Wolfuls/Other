const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const E=require('../js/engine'),S=require('../js/save'),Shop=require('../js/shop');
let s=E.createState();s.credits=100000;assert.equal(Shop.buy(s,0),false);
for(let i=0;i<19;i++)assert.equal(E.rescueClear(s,()=>1),false);
assert.equal(E.rescueClear(s,()=>{throw Error('first occurrence rolls')}),true);assert.equal(s.rescue.remaining,600);
E.advanceRescue(s,200);assert.equal(E.rescueClear(s,()=>0),false);assert.equal(s.rescue.remaining,400);
E.openRescue(s);E.advanceRescue(s,500);assert.equal(E.rescueAvailable(s),true);s=S.decode(S.encode(s));assert.equal(s.rescue.open,true);E.closeRescue(s);assert.equal(E.rescueAvailable(s),false);
assert.equal(E.rescueClear(s,()=>.05),false);assert.equal(E.rescueClear(s,()=>.049),true);assert.equal(s.rescue.appearances,2);
E.openRescue(s);assert.equal(E.completeRescue(s),true);assert.equal(Shop.buy(s,0),true);assert.equal(E.rescueClear(s,()=>0),false);s=S.decode(S.encode(s));assert.equal(s.rescue.completed,true);
const old=E.createState();delete old.rescue;assert.equal(S.decode(S.encode(old)).rescue.completed,false);
assert.throws(()=>S.encode({...s,rescue:{...s.rescue,remaining:601}}));
console.log('Engine/save: thresholds, independent rerolls, no extension, expiry pin, completion, shop lock, legacy save passed.');

const F=require('./current-fixtures.cjs');const battle=F.ready(['meta'],'dementor');battle.rescue.dementorClears=19;battle.levels.meta=1000;battle.health.meta.hp=E.maxHP(battle,F.character('meta'));for(const e of battle.enemies)e.hp=1;const events=E.click(battle,()=>.5);assert.equal(battle.rescue.dementorClears,20);assert.ok(events.some(e=>e.type==='rescueAvailable'));E.advance(battle,1,()=>.5);assert.equal(battle.rescue.remaining,599);assert.equal(E.battleContext(battle,'mohican-solo').rescue,battle.rescue);battle.rescue.completed=true;battle.rescue.remaining=0;battle.rescue.unread=false;battle.earned=1000000;battle.dreamShop=true;battle.viewingMemories=true;assert.equal(E.nextRun(battle).rescue.completed,true);
