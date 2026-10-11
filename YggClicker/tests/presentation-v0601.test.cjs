'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,character}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
const Q=require('../js/quest-view'),HUD=require('../js/battle-hud');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function cardEvent(h,id,{key,interactive=false,disabled=false}={}){
 const card=h.get('quest-card-'+id);card.dataset.questCard=id;
 if(disabled)card.setAttribute('aria-disabled','true');
 const event={type:key?'keydown':'click',key,preventDefault(){this.prevented=true;}};
 card.closest=selector=>selector==='[data-quest-card]'?card:null;
 event.target=key?card:{closest:selector=>selector==='[data-quest-card]'?card:interactive?{}:null};
 return event;
}

test('quest titles and blank card space select battles without resetting combat; memory also opens',()=>{
 const s=ready(['meta'],'mohicans');s.paused=true;s.hp=7;s.enemies[0].hp=7;s.timeline.priorities={"a:meta":9,["e:"+s.enemies[0].id]:12};
 const h=harness(s),dispatch=e=>h.get('quest-list').listeners.get('click')(e);
 dispatch(cardEvent(h,'scarecrow'));assert.equal(h.saved().sessionId,'scarecrow');
 dispatch(cardEvent(h,'mohicans'));assert.equal(h.saved().sessionId,'mohicans');assert.equal(h.saved().enemies[0].hp,7);assert.deepEqual(h.saved().timeline.priorities,s.timeline.priorities);
 dispatch(cardEvent(h,'memories'));assert.equal(h.saved().viewingMemories,true);
 dispatch(cardEvent(h,'mohicans'));assert.equal(h.saved().viewingMemories,false);assert.equal(h.saved().enemies[0].hp,7);
});

test('quest card activation respects locked quests, embedded controls and keyboard focus',()=>{
 const s=ready();s.paused=true;const h=harness(s);
 assert.equal(Q.cardSelection(cardEvent(h,'dementor',{disabled:true})),null);
 for(const name of ['input','button','label','summary'])assert.equal(Q.cardSelection(cardEvent(h,'mohicans',{interactive:name})),null);
 const event=cardEvent(h,'mohicans',{key:'Enter'});h.get('quest-list').listeners.get('keydown')(event);assert.equal(event.prevented,true);assert.equal(h.saved().sessionId,'mohicans');
 const space=cardEvent(h,'memories',{key:' '});h.get('quest-list').listeners.get('keydown')(space);assert.equal(h.saved().viewingMemories,true);
 assert.equal(Q.cardSelection(cardEvent(h,'scarecrow',{key:'ArrowDown'})),null);
});

test('locked quest card cannot bypass the engine unlock and never changes the selected battle',()=>{
 const s=E.createState(1000);s.paused=true;s.factors=10;const h=harness(s);
 h.get('quest-list').listeners.get('click')(cardEvent(h,'ozmorn'));
 assert.equal(h.saved().sessionId,s.sessionId);assert.equal(h.saved().questUnlocks.ozmorn,false);
});

test('HUD shows action and owning-quest theoretical share without an AP gauge',()=>{
 const s=ready(['meta','richter'],'scarecrow');s.paused=true;E.setFormation(s,'mohicans',['richter']);const h=harness(s);
 const node=h.get('ally-turn-meta');assert.match(node.textContent,/行動.*理論.*%/);const actor=h.get('meta-combatant'),vitals=actor.children.find(n=>n.className==='ally-vitals');assert.deepEqual(vitals.children.map(n=>n.id),['ally-hp-meta','ally-turn-meta','ally-runaway-meta']);assert.equal(h.get('ally-turn-richter').hidden,true);
});
test('HUD displays a bounded theoretical turn order and pause state',()=>{
 const s=ready(['meta']);const h=harness(s);h.advance(250);assert.match(h.get('turn-order').firstElementChild.textContent,/次の手番（理論）/);h.click('pause');assert.match(h.get('turn-order').firstElementChild.textContent,/停止/);assert.equal(HUD.actionGauge,undefined);
});
test('memory hint is gone; click opens earned total and tab hiding pauses all its layers',()=>{
 const s=ready();s.paused=true;s.viewingMemories=true;s.earned=9876543;const h=harness(s);
 h.click('memory-monolith');assert.equal(h.get('memory-monolith').getAttribute('aria-expanded'),'true');assert.ok(h.get('memory-scene').classList.contains('record-open'));assert.equal(h.get('memory-total').textContent,'9,876,543 Rd');
 h.visible(false);assert.ok(h.get('memory-scene').classList.contains('motion-paused'));h.visible(true);assert.ok(!h.get('memory-scene').classList.contains('motion-paused'));
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.doesNotMatch(html,/memory-hint|モノリスに触れて/);
});

test('browser script order and CommonJS resolve exactly the same canonical game data',()=>{
 const dir=path.join(__dirname,'..'),context={};context.window=context;
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script defer src="\.\/(js\/[^\"]+)"/g)].map(m=>m[1]);
 for(const file of scripts){if(file==='js/app.js')break;vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),context);}
 assert.deepEqual(JSON.parse(JSON.stringify(context.YggData)),JSON.parse(JSON.stringify(D)));
 assert.deepEqual(JSON.parse(JSON.stringify(context.YggEngine.createState(1000))),JSON.parse(JSON.stringify(E.createState(1000))));
 assert.equal(context.YggQuests[0].variants,context.YggQuests[2].variants);
});
