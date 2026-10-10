'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,rng}=require('./current-fixtures.cjs'),{harness}=require('./app-harness.cjs');
const config=(s,id='mohican-solo',extra={})=>assert.ok(E.setAutoRest(s,id,{enabled:true,kills:0,minutes:1,restMinutes:1,...extra}));
test('time trigger freezes combat and AP, recovers HP, resumes and repeats across offline elapsed time',()=>{
 const s=ready(['meta'],'mohican-solo');s.paused=false;config(s);s.autoRest['mohican-solo'].elapsed=59.5;
 E.advance(s,.5,()=>.5);assert.equal(E.isResting(s),true);assert.equal(E.restOf(s).remaining,60);
 const enemies=structuredClone(s.enemies),ap=s.actionPoints.meta;s.health.meta.hp=1;
 assert.deepEqual(E.click(s),[]);E.advance(s,6,()=>.5,false,true);
 assert.deepEqual(s.enemies,enemies);assert.equal(s.actionPoints.meta,ap);assert.ok(s.health.meta.hp>1);
 const loaded=S.decode(S.encode(s));assert.equal(E.restOf(loaded).remaining,54);
 E.advance(loaded,54,()=>.5,false,true);assert.equal(E.isResting(loaded),false);assert.equal(E.restOf(loaded).elapsed,0);assert.equal(E.restOf(loaded).defeats,0);
 E.advance(loaded,60,()=>.5,false,true);assert.equal(E.isResting(loaded),true);
});
test('kill trigger counts this quest only and manual clears also start rest',()=>{
 const s=ready(['meta'],'mohican-solo');config(s,'mohican-solo',{kills:1,minutes:100});s.selectedCharacterId=null;s.enemies[0].hp=1;s.hp=1;
 E.click(s,()=>.5);assert.equal(E.restOf(s).defeats,1);assert.equal(E.isResting(s),true);assert.equal(E.restOf(s,'ozmorn').defeats,0);
});
test('offscreen rest is independent, pausing freezes the timer and emptying resets the cycle',()=>{
 const s=ready(['meta','waku'],'mohican-solo');E.setFormation(s,'mohican-solo',['meta']);E.setFormation(s,'scarecrow',['waku']);config(s);s.autoRest['mohican-solo'].remaining=30;
 E.selectSession(s,'scarecrow');s.paused=true;E.advance(s,10,()=>.5);assert.equal(E.restOf(s,'mohican-solo').remaining,30);
 s.paused=false;const before=s.totalDamage;E.advance(s,10,()=>.5);assert.equal(E.restOf(s,'mohican-solo').remaining,20);assert.ok(s.totalDamage>before);
 E.setFormation(s,'mohican-solo',[]);assert.equal(E.restOf(s,'mohican-solo').remaining,0);assert.equal(E.restOf(s,'mohican-solo').enabled,true);
});
test('legacy saves default OFF and malformed rest state is rejected',()=>{
 const s=ready();delete s.autoRest;const migrated=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:49,state:s}));assert.ok(Object.values(migrated.autoRest).every(r=>!r.enabled));
 config(migrated);migrated.autoRest['mohican-solo'].remaining=-1;assert.throws(()=>S.encode(migrated));
 assert.equal(E.setAutoRest(s,'mohican-solo',{enabled:true,kills:0,minutes:0,restMinutes:5}),false);
});
test('formation settings save and cancel use the same validation and show rest status',()=>{
 const s=ready(['meta'],'mohican-solo'),h=harness(s);
 const open=()=>h.get('quest-list').listeners.get('click')({target:{closest:q=>q==='[data-formation-open]'?{disabled:false,dataset:{formationOpen:'mohican-solo'}}:null}});
 open();h.get('auto-rest-enabled').checked=true;h.get('auto-rest-kills').value='5';h.get('auto-rest-duration').value='2';h.click('formation-cancel');assert.equal(E.restOf(h.saved()).enabled,false);
 open();h.get('auto-rest-enabled').checked=true;h.get('auto-rest-kills').value='5';h.get('auto-rest-duration').value='2';h.click('formation-save');assert.equal(E.restOf(h.saved()).kills,5);assert.equal(E.restOf(h.saved()).restMinutes,2);
});
test('one large offline step and small live steps reach the same rest cycle',()=>{
 const a=ready(['meta'],'mohican-solo');config(a,'mohican-solo',{minutes:.1,restMinutes:.1});const b=structuredClone(a);
 E.advance(a,37,()=>.5,false,true);for(let i=0;i<74;i++)E.advance(b,.5,()=>.5,false,true);
 assert.deepEqual(E.restOf(a),E.restOf(b));assert.equal(E.restOf(a).elapsed,1);assert.equal(E.restOf(a).remaining,0);
});
