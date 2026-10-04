'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const S = require('../js/save.js');
const D = require('../js/data.js');
const FX = require('../js/combat-effects.js');

test('selected character supplies manual damage and actor, without consuming action points', () => {
  const state = E.createState(); state.factors = 1000;
  for (const c of D.characters) {
    E.hire(state, c.id); state.levels[c.id] = 7; state.actionPoints[c.id] = 40;
    assert.equal(E.selectCharacter(state, c.id), true);
    assert.deepEqual(E.manualStats(state), E.stats(state, c));
    const oldClock = state.actionClock, event = E.click(state, () => 0)[0];
    assert.equal(event.actorId, c.id); assert.equal(event.actor, c.name);
    assert.equal(event.damage, {meta:3,richter:8,vishunal:16}[c.id], 'Lv7 multiplies the base roll by 1.6, then rounds down');
    assert.equal(state.actionPoints[c.id], 40); assert.equal(state.actionClock, oldClock);
  }
  E.selectCharacter(state, null);
  assert.deepEqual(E.manualStats(state), { dice: 1, flat: 0 });
  assert.equal(E.click(state, () => 0)[0].actorId, null);
});

test('unhired and unknown characters cannot be selected; all hired characters still act', () => {
  const state = E.createState(); state.factors=100; E.hire(state, 'meta');
  E.selectCharacter(state, 'meta');
  for (const id of ['richter', 'unknown', '__proto__', undefined, 42]) {
    assert.equal(E.selectCharacter(state, id), false);
    assert.equal(state.selectedCharacterId, 'meta');
  }
  state.factors = 1000; E.hire(state, 'richter');
  const actors = E.advance(state, 4, () => 0).filter(e => e.type === 'attack').map(e => e.actorId);
  assert.deepEqual([...new Set(actors)].sort(), ['meta', 'richter']);
});

test('concentration remains a flat bonus and scales with the selected actor and SPE', () => {
  const state = E.createState(); state.factors=100; E.hire(state, 'meta'); state.levels.meta = 3;
  E.selectCharacter(state, 'meta'); state.upgrades.click = 3;
  assert.deepEqual(E.manualStats(state), { dice: 2, flat: 3 });
  state.upgrades.power = 1; state.boostSeconds = 30;
  assert.equal(E.click(state, () => .999)[0].damage, 36);
  state.paused = true;
  assert.deepEqual(E.click(state), []);
});

test('selected actor survives export/import; schema 5 defaults to the original manual attack', () => {
  const state = E.createState(); state.factors=100; E.hire(state, 'meta'); E.selectCharacter(state, 'meta');
  state.actionPoints.meta = 37; state.actionClock = .25;
  assert.deepEqual(S.decode(S.encode(state)), state);
  const old = JSON.parse(S.encode(state)); old.schemaVersion = 5; delete old.state.selectedCharacterId;
  const migrated = S.decode(JSON.stringify(old));
  assert.deepEqual(migrated, { ...state, selectedCharacterId: null });
  for (const id of ['richter', 'unknown', '__proto__', {}, 1, undefined]) {
    const bad = JSON.parse(S.encode(state)); bad.state.selectedCharacterId = id;
    assert.throws(() => S.decode(JSON.stringify(bad)));
  }
});

test('250 action power launches two then three saws, including kills between hits', () => {
  const state = E.createState(); state.factors=100; E.hire(state, 'meta');
  state.actionLevels.meta = 35; state.hp = 1;
  assert.equal(E.actionPower(state, D.characters[0]), 250);
  const two = E.advance(state, 1, () => 0), three = E.advance(state, 1, () => 0);
  assert.equal(FX.metaAttackCount(two), 2); assert.equal(FX.metaAttackCount(three), 3);
  assert.deepEqual(FX.projectileGroups(FX.metaAttackCount(two)), [1, 1]);
  assert.deepEqual(FX.projectileGroups(FX.metaAttackCount(three)), [1, 1, 1]);
  E.selectCharacter(state, 'meta');
  assert.equal(FX.metaAttackCount(E.click(state, () => 0)), 1);
  E.selectCharacter(state, null);
  assert.equal(FX.metaAttackCount(E.click(state, () => 0)), 0);
});

test('batched parties launch only Meta saws and preserve the count in bounded groups', () => {
  const state = E.createState(); state.factors = 1000;
  E.hire(state, 'meta'); E.hire(state, 'richter');
  state.actionLevels.meta = 1e9; state.actionLevels.richter = 1e8;
  const events = E.advance(state, 1);
  const count = FX.metaAttackCount(events);
  assert.ok(count > 1e6); assert.ok(count < events[0].count);
  for (const n of [2, 3, 120, 121, 10000, count]) {
    const groups = FX.projectileGroups(n);
    assert.equal(groups.reduce((a, b) => a + b, 0), n);
    assert.ok(groups.length <= FX.MAX_PROJECTILES);
    assert.equal(groups.length, n <= 120 ? n : 12);
  }
  assert.deepEqual(FX.projectileGroups(7, 2), [4, 3]);
  assert.deepEqual(FX.projectileGroups(10, 0), []);
  assert.deepEqual(FX.projectileGroups(1000000, 120, true), [1000000], 'one already summarized step keeps the entire count in one sprite');
  assert.deepEqual(FX.projectileGroups(1000000, 0, true), []);
});

test('defeat events do not delay new rounds or change rewards for multi-hit bursts', () => {
  const state = E.createState(); state.factors=100; E.hire(state, 'meta'); state.levels.meta = 200;
  state.actionLevels.meta = 35;
  const events = E.advance(state, 2, () => 0);
  assert.equal(events.filter(e => e.type === 'clear').length, 5);
  assert.equal(FX.metaAttackCount(events), 5);
  assert.equal(state.kills, 5); assert.equal(state.earned, 10); assert.equal(state.hp, 10);
  assert.deepEqual(S.decode(S.encode(state)), state);
});
