'use strict';
const moveTestParty=require('./single-party-fixture.cjs');
require('./battle-fixtures.cjs')();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const S = require('../js/save.js');
const D = require('../js/data.js');
const fixedRoll = () => 0;
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) };
}
function hiredState() {
  const state = E.createState(100000);
  state.factors = D.characters[0].cost + 1;
  assert.equal(E.hire(state, 'meta'), true);
  return state;
}
function version4State(state) {
  const result = structuredClone(state);
  const intervals = {meta:1.8,richter:4};
  result.speedLevels = result.actionLevels;
  result.timers = Object.fromEntries(D.characters.map(c=>[c.id,intervals[c.id]/(1+result.speedLevels[c.id]*.1)*(1-result.actionPoints[c.id]/100)]));
  delete result.actionLevels; delete result.actionPoints; delete result.actionClock;
  return result;
}
function legacyState(state) {
  const result = version4State(state);
  delete result.speedLevels;
  result.levels.hikari = result.levels.meta; delete result.levels.meta;
  result.timers.hikari = result.timers.meta; delete result.timers.meta;
  return result;
}
test('funded hire leaves the expected balance; same character levels up, all hires participate', () => {
  const state = hiredState();
  assert.equal(state.factors, 1);
  assert.equal(state.levels.meta, 1);
  assert.equal(E.hire(state, 'richter'), false);
  state.factors = 1000;
  E.hire(state, 'richter'); E.hire(state, 'meta');
  assert.equal(state.levels.meta, 2);
  const events = E.advance(state, 4, fixedRoll);
  assert.equal(new Set(events.filter(e => e.type === 'attack').map(e => e.actor)).size, 2);
});
test('clear awards factors, repeats the same target, and drops excess damage', () => {
  const state = E.createState();
  state.hp = 1;
  const events = E.click(state, () => 0.999);
  assert.equal(state.factors, 2);
  assert.equal(state.kills, 1);
  assert.equal(state.sessionId, 'practice');
  assert.equal(state.hp, 10);
  assert.equal(state.totalDamage, 1);
  assert.equal(events[1].type, 'clear');
  E.advance(state, 200, fixedRoll);
  assert.equal(state.kills, 1, 'No characters means no automatic attacks');
});
test('session stays selected across repeated clears and pays its own reward', () => {
  const state = hiredState();
  moveTestParty(state, 'patrol');
  E.advance(state, 36, () => .999, false);
  assert.equal(state.sessionId, 'patrol');
  assert.equal(state.kills, 4);
  assert.equal(state.factors, 41);
});
test('changing targets resets HP without resetting action points', () => {
  const state = hiredState();
  E.advance(state, 1, fixedRoll);
  E.click(state, fixedRoll);
  const timers = structuredClone(state.actionPoints);
  assert.equal(moveTestParty(state, 'patrol'), true);
  assert.equal(state.hp, 40);
  assert.deepEqual(state.actionPoints, timers);
  assert.equal(moveTestParty(state, 'unknown'), false);
});
test('purchases cannot make factors negative or exceed level caps', () => {
  const state = E.createState();
  assert.equal(E.buyUpgrade(state, 'power'), false);
  assert.equal(E.buyBoost(state), false);
  assert.equal(state.factors, 0);
  E.buyUpgrade(state, 'click');
  assert.equal(state.factors, 0);
  state.factors = 1e30;
  state.levels.meta = E.MAX_LEVEL;
  assert.equal(E.hire(state, 'meta'), false);
  state.upgrades.click = 25;
  assert.equal(E.buyUpgrade(state, 'click'), true);
  assert.equal(state.upgrades.click,26);
});
test('paused games do not attack or earn offline, and do not queue paused time', () => {
  const state = hiredState();
  state.paused = true;
  const oldHP = state.hp;
  assert.deepEqual(E.click(state), []);
  assert.deepEqual(E.advance(state, 100), []);
  const report = E.catchUp(state, 200000);
  assert.equal(report.kills, 0);
  assert.equal(state.hp, oldHP);
  assert.equal(state.savedAt, 200000);
});
test('bulk catch-up matches many small steps at fixed rolls, including boost expiry', () => {
  const state = hiredState(); state.factors = 1000;
  E.hire(state, 'richter'); E.hire(state, 'richter'); E.buyBoost(state);
  const stepped = structuredClone(state);
  E.advance(state, 120, fixedRoll, false);
  for (let i = 0; i < 1200; i++) E.advance(stepped, 0.1, fixedRoll, false);
  assert.equal(state.factors, stepped.factors);
  assert.equal(state.hp, stepped.hp);
  assert.equal(state.kills, stepped.kills);
  assert.equal(state.boostSeconds, 0);
});
test('offline time is capped at eight hours and clock rollback does not produce negative progress', () => {
  const state = hiredState();
  const report = E.catchUp(state, 100000 + 48 * 3600000);
  assert.equal(report.seconds, D.maxOfflineSeconds);
  assert.ok(report.kills > 0);
  const oldFactors = state.factors;
  assert.equal(E.catchUp(state, 0).seconds, 0);
  assert.equal(state.factors, oldFactors);
});
test('boost purchase doubles damage and cannot be stacked', () => {
  const state = hiredState(); state.factors = 100;
  assert.equal(E.buyBoost(state), true);
  assert.equal(state.factors, 97);
  assert.equal(E.multiplier(state), 2);
  assert.equal(E.buyBoost(state), false);
  E.advance(state, 31, fixedRoll);
  assert.equal(E.multiplier(state), 1);
});
test('JSON round trip carries full progress between unrelated storage origins', () => {
  const state = hiredState(); state.factors = 900;
  E.hire(state, 'richter'); moveTestParty(state, 'heavy'); E.buyUpgrade(state, 'power');
  E.advance(state, 17, fixedRoll);
  const source = memoryStorage(), destination = memoryStorage();
  S.persist(source, state);
  const exported = S.encode(S.load(source).state);
  const imported = S.decode(exported);
  S.persist(destination, imported);
  assert.deepEqual(S.load(destination).state, state);
  assert.equal(S.KEY, 'yggclicker.save');
});
test('invalid, alien, oversized, future-version and malicious save inputs are rejected', () => {
  assert.throws(() => S.decode('{broken'));
  assert.throws(() => S.decode('null'));
  assert.throws(() => S.decode('x'.repeat(S.MAX_BYTES + 1)));
  const original = JSON.parse(S.encode(E.createState()));
  for (const change of [
    doc => { doc.gameId = 'other-game'; },
    doc => { doc.schemaVersion = 999; },
    doc => { doc.state.factors = -1; },
    doc => { doc.state.hp = 0; },
    doc => { doc.state.hp = 1000; },
    doc => { doc.state.levels.meta = 201; },
    doc => { doc.state.upgrades.click = 1.5; },
    doc => { doc.state.actionPoints.meta = '0'; },
    doc => { doc.state.paused = 'false'; },
    doc => { doc.state.levels.unknown = 3; },
    doc => { doc.state.sessionId = '__proto__'; }
  ]) { const candidate = structuredClone(original); change(candidate); assert.throws(() => S.decode(JSON.stringify(candidate))); }
  assert.throws(() => S.decode(S.encode(E.createState()).replace('"factors": 0', '"factors": 1e999')));
  assert.equal({}.polluted, undefined);
});
test('new content IDs may be absent from older saves and get initial values', () => {
  const doc = JSON.parse(S.encode(hiredState()));
  delete doc.state.levels.richter; delete doc.state.actionPoints.richter; delete doc.state.upgrades.reward;
  const state = S.decode(JSON.stringify(doc));
  assert.equal(state.levels.richter, 0);
  assert.equal(state.actionPoints.richter, 0);
  assert.equal(state.upgrades.reward, 0);
});
test('corrupt primary falls back to last healthy backup without overwriting it', () => {
  const storage = memoryStorage(), state = hiredState();
  S.persist(storage, state); state.factors = 100; S.persist(storage, state);
  storage.setItem(S.KEY, '{broken');
  const loaded = S.load(storage);
  assert.equal(loaded.state.factors, 1);
  assert.ok(loaded.warning);
  S.persist(storage, loaded.state);
  assert.equal(S.decode(storage.getItem(S.BACKUP_KEY)).factors, 1);
});
test('unrecoverable saves remain intact and block autosave; denied storage is surfaced', () => {
  const storage = memoryStorage(); storage.setItem(S.KEY, 'broken');
  const result = S.load(storage);
  assert.equal(result.blocked, true);
  assert.equal(storage.getItem(S.KEY), 'broken');
  const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } };
  assert.equal(S.load(denied).unavailable, true);
  assert.equal(S.persist(denied, E.createState()).ok, false);
});
test('quota errors do not erase the last good primary save', () => {
  const storage = memoryStorage(), state = hiredState();
  S.persist(storage, state);
  const previous = storage.getItem(S.KEY);
  const quotaStorage = { getItem: storage.getItem, setItem() { const error = new Error(); error.name = 'QuotaExceededError'; throw error; } };
  assert.equal(S.persist(quotaStorage, state).ok, false);
  assert.equal(storage.getItem(S.KEY), previous);
});
test('older app never rolls back a newer primary save to its old backup', () => {
  const storage = memoryStorage();
  const current = S.encode(hiredState());
  const future = JSON.parse(current); future.schemaVersion = S.VERSION + 1;
  storage.setItem(S.BACKUP_KEY, current);
  storage.setItem(S.KEY, JSON.stringify(future));
  assert.equal(S.load(storage).blocked, true);
  assert.equal(JSON.parse(storage.getItem(S.KEY)).schemaVersion, S.VERSION + 1);
});
test('unupgraded manual attack rolls exactly 1 through 6 and session 1 pays 2Rd', () => {
  for (let face = 1; face <= 6; face++) {
    const state = E.createState();
    const events = E.click(state, () => (face - .5) / 6);
    assert.equal(events[0].damage, face);
    assert.equal(state.hp, 10 - face);
  }
  const state = E.createState();
  for (let i = 0; i < 10; i++) E.click(state, fixedRoll);
  assert.equal(state.kills, 1);
  assert.equal(state.factors, 2);
});
test('first concentration and reward upgrades have an immediate effect at small values', () => {
  const state = E.createState();state.factors=5;
  assert.equal(E.buyUpgrade(state, 'click'), true);
  assert.equal(E.click(state, fixedRoll)[0].damage, 2);
  state.factors = 100;
  assert.equal(E.buyUpgrade(state, 'reward'), true);
  assert.equal(E.reward(state), 3);
  assert.equal(E.reward(state, D.sessions[1]), 11);
});
test('schema 1 migration preserves progress and converts remaining HP proportion for every session', () => {
  for (const [id, oldHP, newHP] of [['practice', 80, 10], ['patrol', 400, 40], ['heavy', 2000, 150]]) {
    for (const ratio of [1, .5, .01]) {
      const state = hiredState(); state.factors = 123; state.earned = 500; state.kills = 7;
      state.upgrades.click = 2; state.sessionId = id; state.hp = oldHP * ratio;
      const document = { gameId: 'yggclicker', schemaVersion: 1, gameVersion: '0.1.0', state: legacyState(state) };
      const migrated = S.decode(JSON.stringify(document));
      assert.equal(migrated.hp,20);assert.equal(migrated.sessionId,'mohicans');
      assert.equal(migrated.factors, 123);
      assert.equal(migrated.kills, 7);
      assert.deepEqual(migrated.levels, state.levels);
      assert.deepEqual(migrated.upgrades, state.upgrades);
      assert.deepEqual(S.decode(S.encode(migrated)), migrated, 'migration only happens once');
    }
  }
});
test('invalid old HP is rejected instead of hidden by migration', () => {
  const state = E.createState();
  for (const badHP of [0, -10, 81, '40']) {
    state.hp = badHP;
    assert.throws(() => S.decode(JSON.stringify({ gameId: 'yggclicker', schemaVersion: 1, state })));
  }
});
test('loaded legacy save is upgraded and the original is kept in the rotating backup', () => {
  const storage = memoryStorage(); const state = hiredState(); state.hp = 40;
  const legacy = JSON.stringify({ gameId: 'yggclicker', schemaVersion: 1, state: legacyState(state) });
  storage.setItem(S.KEY, legacy);
  const loaded = S.load(storage);
  assert.equal(loaded.state.hp,20);
  assert.equal(S.persist(storage, loaded.state).ok, true);
  assert.equal(JSON.parse(storage.getItem(S.KEY)).schemaVersion, S.VERSION);
  assert.equal(storage.getItem(S.BACKUP_KEY), legacy);
});
test('schema 2 transfers the old first character level and charge to Meta', () => {
  const state = hiredState(); state.levels.meta = 8; state.actionPoints.meta = 50;
  state.hp = 3; state.factors = 87;
  const old = { gameId: 'yggclicker', schemaVersion: 2, state: legacyState(state) };
  const expected = {...state, sessionId:'mohicans', hp:20};
  assert.deepEqual(S.decode(JSON.stringify(old)), expected);
  assert.deepEqual(S.decode(S.encode(S.decode(JSON.stringify(old)))), expected);
});
test('legacy character migration validates values and rejects duplicate slots', () => {
  const state = legacyState(hiredState()); state.levels.hikari = -1;
  assert.throws(() => S.decode(JSON.stringify({ gameId:'yggclicker', schemaVersion:2, state })));
  state.levels.hikari = 2; state.levels.meta = 2;
  assert.throws(() => S.decode(JSON.stringify({ gameId:'yggclicker', schemaVersion:2, state })));
});
test('Meta gains a saw per action purchase with a bounded visual ring', () => {
  const state = E.createState();
  assert.deepEqual(E.sawCount(state), {total:0,visible:0});
  state.factors = D.characters[0].cost;
  E.hire(state, 'meta');
  assert.deepEqual(E.sawCount(state), {total:1,visible:1});
  state.factors = 100; E.buyAction(state, 'meta');
  assert.deepEqual(E.sawCount(state), {total:2,visible:2});
  state.actionLevels.meta = 199;
  assert.deepEqual(E.sawCount(state), {total:200,visible:D.metaVisual.maxVisibleSaws});
});
test('Meta auto-attacks identify the actor for saw effects; manual attacks stay 1D6+0', () => {
  const state = hiredState();
  const event = E.advance(state, 2, fixedRoll).find(e => e.type === 'attack');
  assert.equal(event.actor, '鋼音メタ'); assert.equal(event.actorId,'meta'); assert.equal(event.damage,2);
  const manual = E.click(state, fixedRoll)[0];
  assert.equal(manual.actorId,null); assert.equal(manual.damage,1);
});

test('character levels grow the damage multiplier without adding flat stats', () => {
  const state = E.createState();
  for (const character of D.characters) {
    for (const [level,multiplier] of [[1,1],[3,1.2],[4,1.3],[10,1.9],[50,5.9],[200,20.9]]) {
      state.levels[character.id] = level;
      assert.deepEqual(E.stats(state,character), {dice:character.dice,flat:character.flat});
      assert.ok(Math.abs(E.characterMultiplier(state,character)-multiplier)<1e-12);
    }
  }
});

test('level scaling uses rounded rolls for automatic attacks and DPS; manual training stays flat', () => {
  const state = hiredState(); state.levels.meta = 4;
  assert.equal(E.advance(state,2,()=>0).find(e=>e.type==='attack').damage,3);
  assert.equal(E.advance(state,2,()=>.999).find(e=>e.type==='attack').damage,15);
  const sums=[1,2,3,4,5,6].flatMap(a=>[1,2,3,4,5,6].map(b=>a+b));
  const mean=sums.reduce((n,sum)=>n+Math.max(sum+1,Math.floor(sum*1.3+1e-9)),0)/36;
  assert.ok(Math.abs(E.dps(state)-mean*.5)<1e-12);
  for (const [level,dice,flat] of [[2,1,2],[3,1,3],[4,1,4],[6,1,6],[25,1,25]]) {
    state.upgrades.click = level;
    assert.deepEqual(E.manualStats(state),{dice,flat});
    assert.equal(E.click(state,()=>0)[0].damage,dice+flat);
    assert.equal(E.click(state,()=>.999)[0].damage,dice*6+flat);
  }
});

test('saved levels keep their progress and recalculate the damage formula', () => {
  const state = hiredState(); state.levels.meta=10; state.upgrades.click=6;
  const document=JSON.parse(S.encode(state)); document.gameVersion='0.3.0';
  const restored=S.decode(JSON.stringify(document));
  assert.deepEqual(restored,state);
  assert.deepEqual(E.stats(restored,D.characters[0]),{dice:2,flat:0});
  assert.equal(E.characterMultiplier(restored,D.characters[0]),1.9);
  assert.deepEqual(E.manualStats(restored),{dice:1,flat:6});
  for (const level of [12,13,32,33,60,61,200]) {
    restored.levels.meta=level;
    assert.equal(E.sawCount(restored).visible,1);
  }
});

test('power and action purchases have separate prices, progress, and effects', () => {
  const state=E.createState(), meta=D.characters[0];
  state.factors=1000;
  assert.equal(E.buyAction(state,'meta'),false,'hire is required first');
  E.hire(state,'meta');
  const attack=E.stats(state,meta), saws=E.sawCount(state), damagePrice=E.hireCost(state,meta);
  const oldFunds=state.factors, price=E.actionCost(state,meta);
  assert.equal(price,6);
  assert.equal(E.buyAction(state,'meta'),true);
  assert.equal(state.factors,oldFunds-price);
  assert.equal(state.actionLevels.meta,1);
  assert.deepEqual(E.stats(state,meta),attack);
  assert.deepEqual(E.sawCount(state),{total:saws.total+1,visible:saws.visible+1});
  assert.equal(E.hireCost(state,meta),damagePrice);
  const nextSpeedPrice=E.actionCost(state,meta);
  E.hire(state,'meta');
  assert.equal(state.actionLevels.meta,1);
  assert.equal(E.actionCost(state,meta),nextSpeedPrice);
  assert.deepEqual(E.stats(state,meta),attack);
  assert.equal(E.characterMultiplier(state,meta),1.1);
  state.factors=0;
  assert.equal(E.buyAction(state,'meta'),false);
  assert.equal(E.buyAction(state,'unknown'),false);
});

test('action training preserves points and the next tick, and affects subsequent gains and DPS', () => {
  const state=hiredState(), meta=D.characters[0];state.factors=100;
  E.advance(state,1.5,fixedRoll);
  const beforePoints=state.actionPoints.meta, beforeClock=state.actionClock;
  const oldDPS=E.dps(state);
  E.buyAction(state,'meta');
  assert.equal(state.actionPoints.meta,beforePoints);
  assert.equal(state.actionClock,beforeClock);
  assert.ok(Math.abs(E.dps(state)-oldDPS*55/50)<1e-12);
  assert.equal(E.advance(state,.499,fixedRoll).length,0);
  assert.equal(E.advance(state,.001,fixedRoll).filter(e=>e.type==='attack').length,1);
  assert.ok(Math.abs(state.actionPoints.meta-(beforePoints+E.actionPower(state,meta)-100))<1e-10);
});

test('action power still grows far beyond the damage level cap', () => {
  const state=hiredState(), meta=D.characters[0];state.levels.meta=E.MAX_LEVEL;
  for(const speed of [200,500,1000]) {
    state.actionLevels.meta=speed;state.factors=1e100;
    state.actionPoints.meta=0;
    const before=E.actionPower(state,meta);
    assert.equal(E.buyAction(state,'meta'),true);
    assert.ok(E.actionPower(state,meta)>before);
    assert.equal(state.actionLevels.meta,speed+1);
    assert.equal(E.hire(state,'meta'),false);
  }
});

test('schema 3 migration retains power, funds, and charge, and starts action training at zero', () => {
  const original=hiredState(); original.levels.meta=7;original.factors=200;original.actionPoints.meta=50;
  const old={gameId:D.gameId,schemaVersion:3,gameVersion:'0.4.0',state:version4State(original)};delete old.state.speedLevels;
  const migrated=S.decode(JSON.stringify(old));
  assert.deepEqual(migrated,{...original,sessionId:'mohicans',hp:20});
  migrated.factors=1000;E.buyAction(migrated,'meta');
  assert.deepEqual(S.decode(S.encode(migrated)),migrated);
});

test('save validation rejects bad action levels, charge and clock values', () => {
  for(const mutate of [
    s=>{s.actionLevels.meta=-1;},s=>{s.actionLevels.meta=1.5;},s=>{s.actionLevels.meta='2';},
    s=>{s.actionLevels.meta=Number.MAX_SAFE_INTEGER+1;},s=>{s.actionLevels.unknown=2;},
    s=>{s.actionLevels.richter=1;},s=>{s.actionPoints.meta=101;},s=>{s.actionPoints.meta=-1;},
    s=>{s.actionClock=1;},s=>{s.actionClock=-.1;},s=>{s.actionPoints.richter=1;}
  ]) {const doc=JSON.parse(S.encode(hiredState()));mutate(doc.state);assert.throws(()=>S.decode(JSON.stringify(doc)));}
});

test('huge action batches complete in bounded work, retain overkill rules, and remain saveable', () => {
  const state=hiredState(), meta=D.characters[0];state.levels.meta=200;state.actionLevels.meta=1e12;
  state.actionPoints.meta=0;
  let rolls=0;const start=performance.now();
  const events=E.advance(state,3600,()=>{rolls++;return 0;});
  assert.ok(performance.now()-start<1000);
  assert.equal(rolls,0,'high action power does not loop over dice');
  const count=events.find(e=>e.type==='attack').count;
  assert.equal(state.kills,count,'every hit kills once, and excess damage never clears another enemy');
  assert.equal(state.factors,1+count*2);
  assert.equal(state.totalDamage,count*10);
  assert.ok(events.length<=2,'visual events do not grow with attack count');
  assert.deepEqual(S.decode(S.encode(state)),state);
});

test('average batches with knockout disabled preserve the original overkill cost', () => {
  const B=require('../js/battle-batch.js');
  const profiles=[{dice:1,flat:0,rate:1,multiplier:1}];
  const knockout={threshold:0,chance:0};
  const attacks=100000,result=B.resolve(10,10,attacks,profiles,knockout);
  let seed=123456789,hp=10,kills=0;
  for(let i=0;i<attacks;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    hp-=1+Math.floor(seed/4294967296*6);
    if(hp<=0){kills++;hp=10;}
  }
  assert.ok(Math.abs(result.kills-kills)/kills<.015);
  assert.ok(result.kills<attacks*3.5/10*.95,'overkill must reduce rewards compared with DPS / HP');
  let splitHP=10,splitKills=0;
  for(let i=0;i<100;i++){const part=B.resolve(splitHP,10,1000,profiles,knockout);splitHP=part.hp;splitKills+=part.kills;}
  assert.ok(Math.abs(splitKills-result.kills)<=1);
  assert.ok(splitHP>0 && splitHP<=10);
});

test('huge multi-character offline progress handles boost expiry, paused games and large counters', () => {
  const state=hiredState();state.factors=1e40;
  E.hire(state,'richter');
  for(const c of D.characters){if(!state.levels[c.id])E.hire(state,c.id);state.actionLevels[c.id]=1e14;state.actionPoints[c.id]=0;}
  E.buyBoost(state);
  const paused=structuredClone(state);paused.paused=true;
  E.catchUp(paused,paused.savedAt+86400000);
  assert.equal(paused.kills,0);assert.equal(paused.boostSeconds,30);
  const result=E.catchUp(state,state.savedAt+86400000);
  assert.equal(result.seconds,D.maxOfflineSeconds);
  assert.equal(state.boostSeconds,0);
  assert.ok(state.kills>Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isFinite(state.factors));
  assert.deepEqual(S.decode(S.encode(state)),state);
});

test('points only arrive on whole-second ticks, including several attacks and a remainder', () => {
  const state=hiredState();state.actionLevels.meta=40; // 250 points / second.
  assert.equal(E.actionPower(state,D.characters[0]),250);
  assert.deepEqual(E.advance(state,.75,fixedRoll),[]);
  assert.equal(state.actionPoints.meta,0);
  const first=E.advance(state,.25,fixedRoll);
  assert.equal(first.filter(e=>e.type==='attack').length,2);
  assert.equal(state.actionPoints.meta,50);
  assert.equal(E.advance(state,1,fixedRoll).filter(e=>e.type==='attack').length,3);
  assert.equal(state.actionPoints.meta,0);
});

test('partial points and tick phase survive pause, manual attacks, target changes, and save transfer', () => {
  const state=hiredState();state.actionLevels.meta=40;
  E.advance(state,1.4,fixedRoll);
  assert.equal(state.actionPoints.meta,50);
  E.click(state,fixedRoll);moveTestParty(state,'heavy');
  const originalPoints=state.actionPoints.meta,clock=state.actionClock;
  state.paused=true;E.advance(state,50,fixedRoll);
  assert.equal(state.actionPoints.meta,originalPoints);assert.equal(state.actionClock,clock);
  const restored=S.decode(S.encode(state));restored.paused=false;
  assert.equal(E.advance(restored,.59,fixedRoll).length,0);
  assert.equal(E.advance(restored,.01,fixedRoll).filter(e=>e.type==='attack').length,3);
  assert.equal(restored.actionPoints.meta,0);
});

test('schema 4 preserves action upgrades and maps old remaining time into charged points', () => {
  const state=hiredState();state.actionLevels.meta=7;state.actionPoints.meta=75;state.factors=400;
  const old={gameId:D.gameId,schemaVersion:4,gameVersion:'0.5.0',state:version4State(state)};
  assert.deepEqual(S.decode(JSON.stringify(old)),{...state,sessionId:'mohicans',hp:20});
  old.state.timers.meta=0;
  assert.equal(S.decode(JSON.stringify(old)).actionPoints.meta,100);
  old.state.timers.meta=99;
  assert.throws(()=>S.decode(JSON.stringify(old)));
  old.state.timers.meta=0;old.state.timers.unknown=0;
  assert.throws(()=>S.decode(JSON.stringify(old)));
});

test('extreme action power still waits for a tick and batches every complete threshold', () => {
  const state=hiredState();state.levels.meta=200;state.actionLevels.meta=1e9;
  const amount=E.actionPower(state,D.characters[0]);
  assert.deepEqual(E.advance(state,.4,fixedRoll),[]);
  const events=E.advance(state,.6,fixedRoll);
  assert.equal(events.find(e=>e.type==='attack').count,Math.floor(amount/100));
  assert.equal(state.kills,Math.floor(amount/100));
  assert.ok(Math.abs(state.actionPoints.meta-amount%100)<1e-6);
  assert.deepEqual(S.decode(S.encode(state)),state);
});

test('boost expiry exactly at a charge tick does not boost that tick', () => {
  for(const [duration,damage] of [[1,2],[1.01,4]]) {
    const state=hiredState();state.actionLevels.meta=40;state.boostSeconds=duration;
    const attacks=E.advance(state,1,fixedRoll).filter(e=>e.type==='attack');
    assert.equal(attacks.length,2);
    assert.ok(attacks.every(event=>event.damage===damage));
  }
});

test('unhired characters never collect points, and the shared tick phase is retained on hire', () => {
  const state=E.createState();E.advance(state,3.5,fixedRoll);
  assert.ok(Object.values(state.actionPoints).every(value=>value===0));
  state.factors=D.characters[0].cost;E.hire(state,'meta');E.advance(state,.5,fixedRoll);
  assert.ok(Math.abs(state.actionPoints.meta-E.actionPower(state,D.characters[0]))<1e-10);
  assert.equal(state.actionPoints.richter,0);
});
