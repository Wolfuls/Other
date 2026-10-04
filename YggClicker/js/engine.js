(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.YggData;
  const B = typeof module !== 'undefined' && module.exports ? require('./battle-batch.js') : root.YggBatch;
  const MAX_LEVEL = 200;
  const EXACT_ATTACK_BUDGET = 1200;
  let incomeKey, incomeValue;
  const getSession = state => D.sessions.find(item => item.id === state.sessionId);
  function createState(now = Date.now()) {
    return { factors: D.balance.initialFactors, earned: 0, kills: 0, clicks: 0, totalDamage: 0,
      sessionId: D.sessions[0].id, hp: D.sessions[0].hp, paused: false, boostSeconds: 0,
      levels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionLevels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionPoints: Object.fromEntries(D.characters.map(c => [c.id, 0])), actionClock: 0, selectedCharacterId: null,
      purchasedPerks: Object.fromEntries(D.characters.map(c => [c.id, []])),
      upgrades: Object.fromEntries(D.upgrades.map(u => [u.id, 0])), savedAt: now };
  }
  function perks(state, character) {
    const level = state.levels[character.id] || 0;
    return (character.perks || []).map(perk => {
      const unlocked = level >= perk.level && (state.purchasedPerks[character.id] || []).includes(perk.id);
      return { ...perk, unlocked, eligible: level >= perk.level,
        dice: unlocked && perk.diceEvery ? Math.floor(level / perk.diceEvery) : 0 };
    });
  }
  const hasOverflow = (state, character) => !!character && perks(state, character).some(p => p.unlocked && p.overflow);
  function attackBreakdown(state, character, manual = false, session = getSession(state)) {
    const active = character ? perks(state, character).filter(p => p.unlocked) : [];
    const replacement = active.find(p => p.baseAttack);
    const base = replacement?.baseAttack || character || { dice:D.balance.manualDice, flat:D.balance.manualFlat };
    const ignoreDefense = active.some(p => p.ignoreDefense);
    return {
      base:{ dice:base.dice, flat:base.flat, source:replacement?.name || '' },
      perk:{ dice:active.reduce((n,p) => n + p.dice, 0), flat:active.reduce((n,p) => n + (p.flat || 0), 0),
        conditional:active.reduce((n,p) => n + (p.targetTrait && (session.traits || []).includes(p.targetTrait) ? p.damageBonus || 0 : 0), 0) },
      upgrade:{ flat:manual ? state.upgrades.click * D.balance.manualFlatPerLevel : 0, rate:state.upgrades.power * D.balance.upgradeDamagePerLevel },
      spe:{ rate:state.boostSeconds > 0 ? D.balance.boostDamageBonus : 0 },
      item:{ flat:0 },
      levelMultiplier:characterMultiplier(state, character),
      defense:ignoreDefense ? 0 : enemyDefense(session), ignoreDefense, overflow:active.some(p => p.overflow)
    };
  }
  function stats(state, character) {
    const {base, perk} = attackBreakdown(state, character);
    return { dice:base.dice + perk.dice, flat:base.flat + perk.flat };
  }
  const selectedCharacter = state => D.characters.find(c => c.id === state.selectedCharacterId && state.levels[c.id] > 0) || null;
  function manualStats(state) {
    const character = selectedCharacter(state);
    const base = character ? stats(state, character) : { dice: D.balance.manualDice, flat: D.balance.manualFlat };
    return { dice:base.dice, flat:base.flat + state.upgrades.click * D.balance.manualFlatPerLevel };
  }
  function selectCharacter(state, id) {
    if (id !== null && !D.characters.some(c => c.id === id && state.levels[id] > 0)) return false;
    state.selectedCharacterId = id;
    return true;
  }
  function sawCount(state) {
    const total = orbitCount(state, 'meta');
    return { total, visible: Math.min(total, D.metaVisual.maxVisibleSaws) };
  }
  function bombCount(state) {
    const total = orbitCount(state, 'richter');
    return { total, visible: Math.min(total, D.richterVisual.maxVisibleBombs) };
  }
  function orbitCount(state, id) {
    return state.levels[id] > 0 ? Math.min(Number.MAX_SAFE_INTEGER, 1 + (state.actionLevels[id] || 0)) : 0;
  }
  function weaponScale(state, id) {
    const level = Math.max(1, Math.min(MAX_LEVEL, state.levels[id] || 0));
    return 1 + Math.log2(level) * D.balance.weaponSizePerDoubling;
  }
  const multiplier = state => (1 + state.upgrades.power * D.balance.upgradeDamagePerLevel) * (state.boostSeconds > 0 ? 1 + D.balance.boostDamageBonus : 1);
  const characterMultiplier = (state, character) => 1 + Math.max(0, (character ? state.levels[character.id] : 1) - 1) * D.balance.characterDamagePerLevel;
  const enemyDefense = session => Math.max(0, Math.floor(session.defense || 0));
  function attackProfile(state, character, manual = false, session = getSession(state)) {
    const breakdown = attackBreakdown(state, character, manual, session), b = breakdown;
    return { dice:b.base.dice + b.perk.dice, flat:b.base.flat + b.perk.flat + b.upgrade.flat + b.item.flat,
      bonus:b.perk.conditional, multiplier:(1 + b.upgrade.rate) * (1 + b.spe.rate) * b.levelMultiplier,
      defense:b.defense, ignoreDefense:b.ignoreDefense, overflow:b.overflow,
      overkillThreshold:state.upgrades.overkill ? D.upgrades.find(u=>u.id==='overkill').threshold : 0, breakdown };
  }
  const reward = (state, session = getSession(state)) => session.reward * (1 + state.upgrades.reward * D.balance.rewardPerLevel);
  // Each repeatable purchase track has its own unrounded geometric curve.
  // Recompute from the level rather than multiplying an already rounded price.
  const geometricCost = (base, purchases, growth = D.balance.purchaseCostGrowth) => Math.ceil(base * growth ** purchases);
  const hireCost = (state, c) => state.levels[c.id] === 0 ? c.cost
    : geometricCost(c.powerCost, state.levels[c.id] - 1);
  const actionPower = (state, c) => c.action * (1 + state.actionLevels[c.id] * D.balance.actionPerLevel);
  const attackRate = (state, c) => actionPower(state, c) / D.balance.actionThreshold;
  const actionCost = (state, c) => geometricCost(c.actionCost, state.actionLevels[c.id]);
  const upgradeCost = (state, u) => geometricCost(u.cost, state.upgrades[u.id], D.balance.upgradeCostGrowth);
  function roll(dice, flat, random = Math.random) {
    let amount = flat;
    for (let i = 0; i < dice; i++) amount += 1 + Math.floor(random() * 6);
    return amount;
  }
  function applyDamage(state, amount, events, actor, actorId, random, profile) {
    const { overflow, defense } = profile;
    let remaining = amount, continuation = false;
    do {
      const afterDefense = Math.max(0, remaining - defense);
      const overkill = profile.overkillThreshold > 0 && afterDefense - state.hp >= profile.overkillThreshold;
      const damage = overflow ? Math.min(state.hp, afterDefense) : afterDefense;
      const hpBefore = state.hp;
      state.totalDamage += Math.min(state.hp, damage);
      state.hp = Math.max(0, state.hp - damage);
      // Only a positive HP loss triggers the check. Surviving another hit at
      // 1-4 HP requires another roll; zero HP is an unconditional defeat.
      const knockoutRoll = damage > 0 && state.hp > 0 && state.hp <= D.balance.knockoutHP ? roll(1, 0, random) : null;
      const knockedOut = knockoutRoll !== null && knockoutRoll % 2 === 1;
      if (events) events.push({ type: 'attack', actor, actorId, damage, hpBefore, hpAfter:state.hp, knockoutRoll, knockedOut, continuation });
      if (state.hp <= 0 || knockedOut) {
        const gain = reward(state) + (overkill ? 1 : 0);
        state.factors += gain;
        state.earned += gain;
        state.kills++;
        state.hp = getSession(state).hp;
        if (events) events.push({ type: 'clear', reward: gain, overkills:overkill?1:0, reason:knockedOut ? 'knockout' : 'hp', hpAfter:state.hp });
      }
      remaining = overflow ? Math.max(0, afterDefense - damage) : 0;
      continuation = true;
      // Collapse only long runs of guaranteed full-HP kills; the final partial
      // target still gets its own 50% knockout check. No RNG is skipped here.
      const fullKillCost = getSession(state).hp + defense;
      const fullKills = Math.floor(remaining / fullKillCost);
      if (fullKills > 12) {
        const overkills = profile.overkillThreshold > 0 ? Math.max(0,Math.floor((remaining-profile.overkillThreshold)/fullKillCost)) : 0;
        const dealt = fullKills * getSession(state).hp, gain = fullKills * reward(state) + overkills;
        state.kills += fullKills; state.totalDamage += dealt; state.factors += gain; state.earned += gain;
        if (events) {
          events.push({ type:'attack', actor, actorId, damage:dealt, count:fullKills, hpBefore:state.hp, hpAfter:0, continuation:true, approximate:true });
          events.push({ type:'clear', count:fullKills, reward:gain, overkills, reason:'hp', hpAfter:state.hp });
        }
        remaining -= fullKills * fullKillCost;
      }
    } while (remaining > 0);
  }
  function click(state, random = Math.random) {
    if (state.paused) return [];
    state.clicks++;
    const events = [];
    const character = selectedCharacter(state);
    const profile = attackProfile(state, character, true);
    const amount = B.scaleDamage(roll(profile.dice, profile.flat, random) + profile.bonus, profile.multiplier);
    applyDamage(state, amount, events, character ? character.name : 'あなた', character ? character.id : null, random, profile);
    return events;
  }
  function chargeActions(state, c, ticks) {
    const threshold = D.balance.actionThreshold;
    const total = state.actionPoints[c.id] + actionPower(state, c) * ticks;
    let count = Math.floor(total / threshold), remainder = total % threshold;
    // Do not miss an attack at a decimal boundary such as (100 / 1.8) * 9.
    if (threshold - remainder < threshold * 1e-10) { count++; remainder = 0; }
    state.actionPoints[c.id] = remainder;
    return count;
  }
  function advanceBatch(state, ticks, active, events) {
    const profiles = [];
    let attacks = 0, metaAttacks = 0, richterAttacks = 0;
    for (const c of active) {
      const count = chargeActions(state, c, ticks);
      attacks += count;
      if (count) profiles.push({ ...attackProfile(state, c), rate:count });
      if (c.id === 'meta') metaAttacks = count;
      if (c.id === 'richter') richterAttacks = count;
    }
    const hpBefore = state.hp;
    const result = B.resolve(state.hp, getSession(state).hp, attacks, profiles, { threshold:D.balance.knockoutHP, chance:.5 });
    const gain = result.kills * reward(state) + (result.overkills || 0);
    state.hp = result.hp; state.kills += result.kills; state.totalDamage += result.damage;
    state.factors += gain; state.earned += gain;
    if (events && attacks) events.push({ type:'attack', actor:'パーティ（平均判定）', actorId:null, metaAttacks, richterAttacks, count:attacks, damage:result.damage, hpBefore, hpAfter:state.hp, approximate:true });
    if (events && result.kills) events.push({ type:'clear', count:result.kills, knockouts:result.knockouts, overkills:result.overkills||0, reward:gain, reason:'average', hpAfter:state.hp });
  }
  // All hired characters gain action points on each whole-second game tick.
  // Unspent points and the fractional second both survive saves and pauses.
  function advance(state, seconds, random = Math.random, collectEvents = true) {
    if (state.paused || seconds <= 0) return [];
    const duration = Math.min(seconds, D.maxOfflineSeconds);
    const oldClock = state.actionClock, oldBoost = state.boostSeconds;
    const elapsed = oldClock + duration, ticks = Math.floor(elapsed + 1e-10);
    state.actionClock = Math.max(0, elapsed - ticks);
    const active = D.characters.filter(c => state.levels[c.id] > 0);
    const events = collectEvents ? [] : null;
    if (!active.length || !ticks) {
      state.boostSeconds = Math.max(0, oldBoost - duration);
      return [];
    }
    const estimated = active.reduce((sum, c) => sum + Math.ceil((state.actionPoints[c.id] + actionPower(state, c) * ticks) / D.balance.actionThreshold), 0);
    if (estimated > EXACT_ATTACK_BUDGET) {
      // A boost ending exactly on a tick has already expired for that tick.
      const boostedTicks = Math.min(ticks, Math.max(0, Math.ceil(oldBoost + oldClock) - 1));
      if (boostedTicks) advanceBatch(state, boostedTicks, active, events);
      if (ticks > boostedTicks) { state.boostSeconds = 0; advanceBatch(state, ticks - boostedTicks, active, events); }
      state.boostSeconds = Math.max(0, oldBoost - duration);
      return events || [];
    }
    for (let tick = 1; tick <= ticks; tick++) {
      state.boostSeconds = Math.max(0, oldBoost - (tick - oldClock));
      for (const c of active) {
        const count = chargeActions(state, c, 1), attack = attackProfile(state, c);
        for (let action = 0; action < count; action++) {
          const amount = B.scaleDamage(roll(attack.dice, attack.flat, random) + attack.bonus, attack.multiplier);
          applyDamage(state, amount, events, c.name, c.id, random, attack);
        }
      }
    }
    state.boostSeconds = Math.max(0, oldBoost - duration);
    return events || [];
  }
  function catchUp(state, now = Date.now()) {
    const seconds = Math.max(0, Math.min(D.maxOfflineSeconds, (now - state.savedAt) / 1000));
    const oldKills = state.kills, oldFactors = state.factors;
    advance(state, seconds, Math.random, false);
    state.savedAt = now;
    return { seconds, kills: state.kills - oldKills, factors: state.factors - oldFactors };
  }
  function hire(state, id) {
    const c = D.characters.find(item => item.id === id);
    if (!c || state.levels[id] >= MAX_LEVEL) return false;
    const cost = hireCost(state, c);
    if (state.factors < cost) return false;
    state.factors -= cost;
    if (state.levels[id] === 0) state.actionPoints[id] = 0;
    state.levels[id]++;
    return true;
  }
  function buyPerk(state, characterId, perkId) {
    const character = D.characters.find(c => c.id === characterId);
    if (!character) return false;
    const perk = perks(state, character).find(p => p.id === perkId);
    if (!perk || !perk.eligible || perk.unlocked || state.factors < perk.cost) return false;
    state.factors -= perk.cost;
    state.purchasedPerks[characterId].push(perkId);
    return true;
  }
  function buyUpgrade(state, id) {
    const u = D.upgrades.find(item => item.id === id);
    if (!u || (u.max != null && state.upgrades[id] >= u.max) || !Number.isSafeInteger(state.upgrades[id]+1)) return false;
    const cost = upgradeCost(state, u);
    if (!Number.isFinite(cost) || state.factors < cost) return false;
    state.factors -= cost;
    state.upgrades[id]++;
    return true;
  }
  function buyAction(state, id) {
    const c = D.characters.find(item => item.id === id);
    // No game-level cap. Only reject values JavaScript cannot represent exactly.
    if (!c || !state.levels[id] || !Number.isSafeInteger(state.actionLevels[id] + 1)) return false;
    const cost = actionCost(state, c);
    if (!Number.isFinite(cost) || state.factors < cost) return false;
    state.factors -= cost;
    state.actionLevels[id]++;
    return true;
  }
  function buyBoost(state) {
    const cost = boostCost(state);
    if (!Number.isFinite(cost) || cost <= 0 || state.factors < cost || state.boostSeconds > 0) return false;
    state.factors -= cost;
    state.boostSeconds = D.balance.boostDuration;
    return true;
  }
  function selectSession(state, id) {
    const session = D.sessions.find(s => s.id === id);
    if (!session || state.sessionId === id) return false;
    state.sessionId = id;
    state.hp = session.hp;
    return true;
  }
  function dps(state) {
    return D.characters.reduce((sum, c) => {
      if (!state.levels[c.id]) return sum;
      return sum + B.averageDamage(attackProfile(state, c)) * attackRate(state, c);
    }, 0);
  }
  // The active boost never inflates its own next price. Defense and paid
  // target-specific perks use the same unboosted DPS shown by the game.
  const unboostedDps = state => dps(state.boostSeconds > 0 ? {...state, boostSeconds:0} : state);
  const boostCost = state => Math.ceil(unboostedDps(state) * D.balance.boostCostDpsRatio);
  function expectedIncome(state) {
    const session=getSession(state),boosted=state.boostSeconds>0;
    const key=JSON.stringify([session.id,session.hp,session.defense,session.traits,state.levels,state.actionLevels,
      state.purchasedPerks,state.upgrades.power,state.upgrades.reward,state.upgrades.overkill,boosted]);
    if (key===incomeKey) return incomeValue;
    const profiles=D.characters.filter(c=>state.levels[c.id]>0).map(c=>({...attackProfile(state,c),rate:attackRate(state,c)}));
    const rates=B.rewardRates(session.hp,profiles,{threshold:D.balance.knockoutHP,chance:.5}),clearsPerSecond=rates.clears,perClear=reward(state);
    const bonusPerSecond=rates.overkills;
    incomeKey=key;incomeValue=Object.freeze({clearsPerSecond,reward:perClear,bonusPerSecond,factorsPerSecond:clearsPerSecond*perClear+bonusPerSecond,boosted});
    return incomeValue;
  }
  const api = { MAX_LEVEL, createState, getSession, perks, hasOverflow, stats, manualStats, selectedCharacter, selectCharacter, sawCount, bombCount, weaponScale, multiplier, characterMultiplier, enemyDefense, attackBreakdown, attackProfile, reward, hireCost, actionPower, attackRate, actionCost, upgradeCost, roll, click, advance, catchUp, hire, buyAction, buyPerk, buyUpgrade, buyBoost, boostCost, unboostedDps, selectSession, dps, expectedIncome };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
