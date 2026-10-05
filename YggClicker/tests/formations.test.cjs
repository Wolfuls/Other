'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),{harness}=require('./app-harness.cjs');
const char=id=>D.characters.find(c=>c.id===id);
function hired(){const s=E.createState(1000);for(const c of D.characters)s.levels[c.id]=1;return s;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('initial party auto-fills until formations are saved; saved empty parties stay empty',()=>{
 const s=E.createState();assert.equal(E.MAX_PARTY_SIZE,5);assert.deepEqual(E.formationIds(s),[]);s.levels.meta=1;assert.deepEqual(E.formationIds(s),['meta']);
 assert.ok(E.setFormation(s,'scarecrow',[]));s.levels.richter=1;assert.deepEqual(E.formationIds(s),['meta']);assert.deepEqual(E.formationIds(s,'scarecrow'),[]);
 assert.ok(E.setFormation(s,'mohicans',['meta']));s.levels.max=1;assert.deepEqual(E.formationIds(s),['meta']);assert.deepEqual(E.formationIds(s,'dementor'),[]);
 const before=structuredClone(s);for(const ids of [['meta','meta'],['vishunal'],['missing'],Array(6).fill('meta'),null])assert.equal(E.setFormation(s,'mohicans',ids),false);assert.equal(E.setFormation(s,'missing',['meta']),false);assert.deepEqual(s,before);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('only deployed allies charge and attack; quest changes clear an excluded manual target',()=>{
 const s=hired();E.setFormation(s,'mohicans',['meta']);E.setFormation(s,'scarecrow',['richter']);E.selectCharacter(s,'meta');s.actionPoints.max=77;
 const attacks=E.advance(s,20,()=>.999).filter(e=>e.type==='attack');assert.ok(attacks.length);assert.ok(attacks.filter(e=>e.sessionId==='mohicans').every(e=>e.actorId==='meta'));assert.ok(attacks.some(e=>e.actorId==='richter'&&e.sessionId==='scarecrow'));assert.equal(s.actionPoints.max,77);assert.equal(s.actionPoints.richter,0);
 assert.equal(E.selectCharacter(s,'max'),false);assert.ok(E.selectSession(s,'scarecrow'));assert.equal(s.selectedCharacterId,null);E.selectCharacter(s,'richter');assert.ok(E.setFormation(s,'scarecrow',[]));assert.equal(s.selectedCharacterId,null);
 E.setFormation(s,'mohicans',[]);assert.deepEqual(E.advance(s,20,()=>0),[]);assert.equal(E.dps(s),0);assert.equal(E.expectedIncome(s).factorsPerSecond,0);assert.equal(E.click(s,()=>0).find(e=>e.type==='attack').actorId,null);
 assert.deepEqual(S.decode(S.encode(s)),s);
});

test('GM and team buffs operate only within the current formation, including long offline batches',()=>{
 const s=hired();s.actionLevels.max=10000;s.purchasedPerks.max=['golden-rule','handout','named-npc'];E.selectCharacter(s,'meta');
 E.setFormation(s,'mohicans',['meta','max']);assert.equal(E.actionPower(s,char('meta')),78);assert.equal(E.actionPower(s,char('richter')),35);assert.equal(E.effectiveAttackRate(s,char('richter')),0);
 const before=structuredClone(s);E.setFormation(s,'mohicans',['meta']);assert.equal(E.actionPower(s,char('meta')),50);assert.equal(E.freeActionChance(s,char('meta')),0);assert.equal(E.isActionDonor(s,char('max')),false);
 const events=E.advance(s,28800,()=>{throw Error('batch must not roll');});assert.ok(events.some(e=>e.metaAttacks>0));assert.ok(events.every(e=>!e.maxTransfers&&!e.richterAttacks&&!e.tordelieseAttacks));assert.equal(s.actionPoints.max,0);
 const boosted=E.advance(before,120,()=>{throw Error('batch must not roll');});assert.ok(boosted.some(e=>e.maxTransfers>0));assert.ok(boosted.every(e=>!e.richterAttacks&&!e.vishunalAttacks&&!e.tordelieseAttacks));
});

test('metrics expose damage per hit times attacks per second; donations and bench states do not inflate DPS',()=>{
 const s=hired();E.setFormation(s,'mohicans',['meta','max']);E.selectCharacter(s,'meta');
 const m=E.characterMetrics(s,char('meta'));near(m.damage,7);near(m.attacksPerSecond,.55);near(m.dps,3.85);near(m.damage*m.attacksPerSecond,m.dps);
 const max=E.characterMetrics(s,char('max'));near(max.damage,9.5);assert.equal(max.attacksPerSecond,0);assert.equal(max.dps,0);near(max.transfersPerSecond,.05);
 assert.equal(E.characterMetrics(s,char('richter')).dps,0);near(E.dps(s),m.dps);
 E.setFormation(s,'mohicans',['max']);E.setFormation(s,'scarecrow',['meta']);E.selectSession(s,'scarecrow');near(E.characterMetrics(s,char('meta')).damage,1);near(E.dps(s),.5*E.combatUptime(s));
});

test('schema20 adds automatic formations without changing progress; invalid party saves are rejected',()=>{
 const old=hired();old.factors=2468;old.actionPoints.meta=12;old.purchasedPerks.max=['handout'];delete old.formations;
 const state=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:20,state:old}));assert.equal(state.factors,2468);assert.equal(state.actionPoints.meta,12);assert.deepEqual(E.formationIds(state),D.characters.map(c=>c.id));assert.deepEqual(S.decode(S.encode(state)),state);
 for(const f of [{mohicans:['meta','meta']},{mohicans:['bogus']},{missing:[]},{mohicans:Array(6).fill('meta')},[]])assert.throws(()=>S.encode({...state,formations:f}));
 const empty=E.createState();assert.throws(()=>S.encode({...empty,formations:{mohicans:['meta']}}));
 E.setFormation(state,'mohicans',[]);assert.throws(()=>S.encode({...state,selectedCharacterId:'meta'}));
});

test('inspecting, keyboard navigation and card whitespace preserve the selected buff recipient',()=>{
 const s=hired();s.paused=true;s.actionLevels.max=100;s.purchasedPerks.max=['handout','named-npc'];s.selectedCharacterId='meta';const h=harness(s),dps=h.get('dps').textContent;
 h.click('inspect-richter');h.get('inspect-richter').listeners.get('keydown')({key:'ArrowRight',preventDefault(){}});
 h.get('character-list').listeners.get('click')({target:{closest:sel=>sel==='.character-card.owned'?{id:'card-max'}:null}});
 assert.equal(h.saved().selectedCharacterId,'meta');assert.equal(h.get('dps').textContent,dps);assert.equal(h.get('card-vishunal').hidden,false);
 h.click('richter-select');assert.equal(h.saved().selectedCharacterId,'richter');
});

test('formation dialog edits a draft, saves per quest, and hides benched sprites and symbols',()=>{
 const s=hired();s.paused=true;s.selectedCharacterId='meta';const h=harness(s);
 const open=id=>h.get('quest-list').listeners.get('click')({target:{closest:sel=>sel==='[data-formation-open]'?{dataset:{formationOpen:id}}:null}});
 const toggle=id=>h.get('formation-members').listeners.get('click')({target:{closest:sel=>sel==='[data-formation-member]'?{dataset:{formationMember:id},disabled:false}:null}});
 open('scarecrow');toggle('max');h.click('formation-cancel');assert.equal(E.formationIds(h.saved(),'scarecrow').length,0);
 open('mohicans');toggle('max');h.click('formation-save');
 open('scarecrow');toggle('max');h.click('formation-save');assert.equal(E.formationIds(h.saved(),'scarecrow').length,1);assert.equal(E.formationIds(h.saved(),'mohicans').length,4);assert.equal(h.get('max-combatant').hidden,true);
 open('mohicans');for(const id of ['meta','richter'])toggle(id);h.click('formation-save');
 assert.equal(h.get('party-count').textContent,'3');assert.equal(h.get('meta-combatant').hidden,true);assert.equal(h.get('max-combatant').hidden,true);assert.equal(h.get('richter-combatant').hidden,true);assert.equal(h.get('tordeliese-combatant').hidden,false);assert.equal(h.get('meta-orbits').children.length,0);assert.equal(h.get('richter-orbits').children.length,0);assert.equal(h.saved().selectedCharacterId,null);
});
