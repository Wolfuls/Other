'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,S,ready,character,faces,enable}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');

test('status conditions are separate head labels, never part of any vital gauge',()=>{
 const s=ready(['megumin','meta']);s.paused=true;s.health.megumin.stunTurns=5;
 s.runaway.megumin.runawayRate=90;s.runaway.megumin.runawaySymptom='vision';
 const h=harness(s);
 assert.equal(h.get('ally-status-megumin').textContent,'スタン 5R · 視覚異常');
 assert.equal(h.get('ally-status-megumin').hidden,false);
 assert.equal(h.get('ally-status-meta').hidden,true);
 for(const gauge of ['hp','ap','runaway'])assert.doesNotMatch(h.get('ally-'+gauge+'-megumin').textContent,/スタン|視覚異常/);
 const actor=h.get('megumin-combatant');
 assert.ok(actor.children.some(n=>n.id==='ally-status-megumin'));
 assert.ok(Number.parseFloat(actor.style.getPropertyValue('--head-offset'))>0);
});

test('five remaining stun turns round-trip; existing shorter rests remain unchanged',()=>{
 for(const turns of [1,2,3,4,5]){const s=ready(['megumin']);s.health.megumin.stunTurns=turns;assert.equal(S.decode(S.encode(s)).health.megumin.stunTurns,turns);}
});

test('roll result events describe the actual roll without consuming extra RNG',()=>{
 for(const [threshold,face,outcome]of [[50,1,'selfDamage'],[50,2,'rise'],[50,6,'control'],[70,1,'selfDamage'],[70,3,'misfire'],[70,4,'chain'],[70,6,'control']]){
   const s=ready(),events=[];let n=0;const random=()=>{n++;return ((n===1?face:4)-.5)/6;};
   E.thresholdEvent(s,character('meta'),threshold,random,events);
   const result=events.find(e=>e.type==='runawayRoll');assert.equal(result.outcome,outcome);assert.deepEqual(result.dice,[face]);
   const before=n;const silent=ready();let count=0;
   E.thresholdEvent(silent,character('meta'),threshold,()=>{count++;return ((count===1?face:4)-.5)/6;},null);
   assert.equal(count,before);assert.deepEqual(silent.health,s.health);assert.deepEqual(silent.runaway,s.runaway);
 }
 const s=ready(),events=[];E.thresholdEvent(s,character('meta'),90,faces(2,4),events);
 assert.equal(events.find(e=>e.type==='runawaySymptom').symptom,'vision');
 const dog=ready(['vishunal']);enable(dog,'vishunal','rabid-dog');const ev=[];E.thresholdEvent(dog,character('vishunal'),50,()=>.5,ev);
 assert.equal(ev.find(e=>e.type==='runawayRoll').outcome,'misfire');
});

test('roll results float above heads, expire, and clear immediately on pause',()=>{
 const s=ready();s.runaway.meta.runawayRate=49.99;s.runaway.meta.baseRunawayPressure=.1;
 const h=harness(s,undefined,{combatRandom:()=>.65});h.advance(1050);
 const layer=h.get('ally-rolls-meta');assert.equal(layer.children.length,1);assert.equal(layer.children[0].textContent,'暴走：自制');
 assert.ok(layer.children[0].classList.contains('runaway-result'));h.advance(1800);assert.equal(layer.children.length,0);
 const h2=harness(s,undefined,{combatRandom:()=>.65});h2.advance(1050);h2.click('pause');assert.equal(h2.get('ally-rolls-meta').children.length,0);
});

test('symptom results remain legible with reduced motion and never leak from other parties',()=>{
 const s=ready(['meta','jewel']);s.runaway.meta.runawayRate=89.99;s.runaway.meta.baseRunawayPressure=.1;
 E.setFormation(s,'mohicans',['jewel']);s.runaway.jewel.runawayRate=49.99;s.runaway.jewel.baseRunawayPressure=.1;
 const h=harness(s,undefined,{combatRandom:()=>.6});h.media.matches=true;h.advance(1050);
 const layer=h.get('ally-rolls-meta');assert.ok(layer.children.length);assert.equal(layer.children[0].textContent,'暴走：視覚異常');
 assert.ok(layer.children[0].classList.contains('reduced-motion'));assert.equal(h.get('ally-rolls-jewel').children.length,0);
 assert.match(h.get('ally-status-meta').textContent,/視覚異常/);
});
