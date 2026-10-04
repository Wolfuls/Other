(function (root) {
  'use strict';
  const N=typeof module !== 'undefined'&&module.exports?require('./numbers.js'):root.YggNumbers;
  let cachedKey, cachedTable;
  let overflowKey, overflowTable;
  let largeKey, largeValue;
  const EXACT_HP_LIMIT=160;
  // One distribution supplies exact-hit rounding, displayed DPS and offline
  // rewards. Cache only damage-relevant fields, not changing action rates.
  const damageCache = new Map();
  const scaleDamage = (amount,multiplier) => Math.max(0,N.floor(amount*multiplier));
  const rolledDamage=(p,amount)=>N.damage(amount,p.multiplier,p.minimumLevelBonus||0,p.preLevelMultiplier||1);
  function damageDistribution(p) {
    const key = JSON.stringify([p.dice, p.flat, p.bonus || 0, p.multiplier, p.defense || 0,p.minimumLevelBonus||0,p.preLevelMultiplier||1]);
    if (damageCache.has(key)) return damageCache.get(key);
    let sums = new Float64Array(p.dice * 6 + 1); sums[0] = 1;
    for (let die = 0; die < p.dice; die++) {
      const next = new Float64Array(sums.length);
      for (let sum = die; sum <= die * 6; sum++) if (sums[sum]) {
        for (let face = 1; face <= 6; face++) next[sum + face] += sums[sum] / 6;
      }
      sums = next;
    }
    const amounts = new Map();
    for (let sum = p.dice; sum < sums.length; sum++) if (sums[sum]) {
      const damage = N.mitigate(rolledDamage(p,sum+p.flat+(p.bonus||0)),p.defense||0);
      amounts.set(damage, (amounts.get(damage) || 0) + sums[sum]);
    }
    const result = [...amounts];
    if (damageCache.size >= 64) damageCache.delete(damageCache.keys().next().value);
    damageCache.set(key, result);
    return result;
  }
  const averageDamage = profile => damageDistribution(profile).reduce((n, [damage, chance]) => n + damage * chance, 0);
  const qualifies = (damage,hp,p) => p.overkillThreshold > 0 && damage-hp >= p.overkillThreshold;
  const bonusResult = (profiles,count,kills) => profiles.some(p=>p.overkillThreshold>0) ? {overkills:Math.max(0,Math.min(kills,Math.round(count)))} : {};
  // Quest HP can grow without a game-level cap. Never allocate a matrix with
  // one row per HP at that scale. Estimate boundary effects with a bounded,
  // reproducible sample; long stretches far from a defeat use average damage.
  // Actual online attacks still use the engine's exact dice/KO/overflow rules.
  function largeHPModel(maxHP,profiles,knockout) {
    const totalRate=profiles.reduce((n,p)=>n+p.rate,0);
    const normalized=profiles.filter(p=>p.rate>0).map(p=>({...p,rate:p.rate/totalRate}));
    const key=JSON.stringify([maxHP,normalized,knockout]);
    if(key===largeKey)return largeValue;
    const hits=[];let positive=0,mean=0,maxDamage=0;
    for(const p of normalized)for(const [damage,chance] of damageDistribution(p))if(damage>0){
      positive+=p.rate*chance;mean+=damage*p.rate*chance;maxDamage=Math.max(maxDamage,damage);
      hits.push({p,damage,cumulative:positive});
    }
    if(!positive||!mean)return {clears:0,overkills:0,knockouts:0,damagePerClear:0};
    let seed=0x79a25f13;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    let hp=maxHP,attacks=0,kills=0,overkills=0,knockouts=0,dealt=0;
    for(let i=0;i<8192 && kills<2048;i++){
      const tail=Math.min(maxHP,2*maxDamage+knockout.threshold);
      if(hp>tail){const bulk=hp-tail;attacks+=bulk/mean;dealt+=bulk;hp=tail;}
      const pick=random()*positive;let low=0,high=hits.length-1;
      while(low<high){const mid=(low+high)>>1;if(hits[mid].cumulative<pick)low=mid+1;else high=mid;}
      const {p,damage}=hits[low];attacks+=1/positive;
      overkills+=qualifies(damage,hp,p)?1:0;dealt+=Math.min(hp,damage);
      if(damage>=hp){
        const excess=damage-hp;kills++;hp=maxHP;
        if(p.overflow){
          const armor=p.overflowDefense??p.defense??0,cost=maxHP+armor,full=Math.floor(excess/cost),rest=excess%cost>0?N.mitigate(excess%cost,armor):0;
          kills+=full;dealt+=full*maxHP+rest;hp=maxHP-rest;
          if(hp<=0){kills++;hp=maxHP;}
          if(p.overkillThreshold>0)overkills+=Math.max(0,Math.floor((excess-p.overkillThreshold)/cost));
          if(rest>0&&hp<=knockout.threshold&&random()<knockout.chance){kills++;knockouts++;hp=maxHP;}
        }
      }else{
        hp-=damage;
        if(hp<=knockout.threshold&&random()<knockout.chance){kills++;knockouts++;hp=maxHP;}
      }
    }
    const progress=kills+(1-hp/maxHP);
    largeKey=key;largeValue={clears:progress/attacks,overkills:overkills/attacks,knockouts:knockouts/attacks,
      damagePerClear:progress?Math.max(0,Math.min(maxHP,dealt/progress)):maxHP};
    return largeValue;
  }
  function resolveLargeHP(hp,maxHP,attacks,profiles,knockout){
    const model=largeHPModel(maxHP,profiles,knockout);
    if(!model.clears)return {hp,kills:0,damage:0,knockouts:0,...bonusResult(profiles,0,0)};
    const progress=1-hp/maxHP+attacks*model.clears,kills=Math.floor(progress);
    const nextHP=Math.max(Number.EPSILON,Math.min(maxHP,(1-(progress-kills))*maxHP));
    return {hp:nextHP,kills,damage:Math.max(0,(kills+(hp-nextHP)/maxHP)*model.damagePerClear),
      knockouts:Math.min(kills,Math.round(kills*model.knockouts/model.clears)),
      ...bonusResult(profiles,kills*model.overkills/model.clears,kills)};
  }
  // With spillover a hit can cross several enemies, so expected hits until the
  // first clear is no longer sufficient. Solve a finite HP-state reward model.
  // Its progress coordinate preserves fractional progress across batch calls.
  function overflowModel(maxHP, profiles, knockout) {
    const key = JSON.stringify([maxHP, profiles, knockout]);
    if (key === overflowKey) return overflowTable;
    const transitions = Array.from({length:maxHP}, () => new Float64Array(maxHP));
    const gains = Array.from({length:maxHP}, () => new Float64Array(4));
    const totalRate = profiles.reduce((n,p) => n + p.rate, 0);
    for (const p of profiles) {
      for (const [damage, chanceOfDamage] of damageDistribution(p)) {
        const weight = chanceOfDamage * p.rate / totalRate;
        if (!weight) continue;
        for (let hp = 1; hp <= maxHP; hp++) {
          let remaining = hp - damage, kills = 0, dealt = Math.min(hp, damage), touched = damage > 0;
          let overkills = qualifies(damage,hp,p) ? 1 : 0;
          if (remaining <= 0) {
            kills = 1; remaining = maxHP; touched = false;
            if (p.overflow) {
              const excess = damage - hp, armor=p.overflowDefense??p.defense??0, cost = maxHP + armor;
              const fullKills = Math.floor(excess / cost), tail = excess%cost>0?N.mitigate(excess%cost,armor):0;
              if(p.overkillThreshold>0) overkills += Math.max(0,Math.floor((excess-p.overkillThreshold)/cost));
              kills += fullKills; remaining = maxHP - tail;
              if(remaining<=0){kills++;remaining=maxHP;}
              dealt = hp + fullKills * maxHP + tail; touched = tail > 0;
            }
          }
          const chance = touched && remaining <= knockout.threshold ? knockout.chance : 0;
          const row = transitions[hp - 1];
          row[remaining - 1] += weight * (1 - chance); row[maxHP - 1] += weight * chance;
          gains[hp - 1][0] += weight * (kills + chance);
          gains[hp - 1][1] += weight * dealt;
          gains[hp - 1][2] += weight * chance;
          gains[hp - 1][3] += weight * overkills;
        }
      }
    }
    // An infinitesimal one-point step joins residue classes when a multiplier
    // makes every damage value a multiple of e.g. 5. This fixes the potential's
    // otherwise arbitrary offset without changing displayed expected rewards.
    const epsilon = 1e-9;
    for (let i = 0; i < maxHP; i++) {
      for (let j = 0; j < maxHP; j++) transitions[i][j] *= 1 - epsilon;
      transitions[i][i ? i - 1 : maxHP - 1] += epsilon;
      for (let j = 0; j < 4; j++) gains[i][j] *= 1 - epsilon;
      gains[i][0] += i ? 0 : epsilon; gains[i][1] += epsilon;
    }
    // Unknowns are potentials at HP 1..H-1 and reward per attack. Fix the
    // full-HP potential to 1 for clears, and 0 for damage/knockout rewards.
    const matrix = transitions.map((row, i) => {
      const equation = new Float64Array(maxHP + 4);
      for (let j = 0; j < maxHP - 1; j++) equation[j] = row[j] - (i === j ? 1 : 0);
      equation[maxHP - 1] = 1;
      equation[maxHP] = gains[i][0] + (i === maxHP - 1 ? 1 : 0) - row[maxHP - 1];
      equation[maxHP + 1] = gains[i][1]; equation[maxHP + 2] = gains[i][2]; equation[maxHP + 3] = gains[i][3];
      return equation;
    });
    for (let col = 0; col < maxHP; col++) {
      let pivot = col;
      for (let row = col + 1; row < maxHP; row++) if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
      if (Math.abs(matrix[pivot][col]) < 1e-12) throw new Error('Spillover distribution must reach all HP states.');
      [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
      const divisor = matrix[col][col];
      for (let j = col; j < maxHP + 4; j++) matrix[col][j] /= divisor;
      for (let row = col + 1; row < maxHP; row++) {
        const factor = matrix[row][col];
        if (!factor) continue;
        for (let j = col; j < maxHP + 4; j++) matrix[row][j] -= factor * matrix[col][j];
      }
    }
    const solutions = Array.from({length:4}, () => new Float64Array(maxHP));
    for (let row = maxHP - 1; row >= 0; row--) for (let reward = 0; reward < 4; reward++) {
      let value = matrix[row][maxHP + reward];
      for (let col = row + 1; col < maxHP; col++) value -= matrix[row][col] * solutions[reward][col];
      solutions[reward][row] = value;
    }
    const rates = solutions.map(values => values[maxHP - 1]);
    const potentials = solutions.map((values, i) => Float64Array.from([0, ...values.slice(0, -1), i ? 0 : 1]));
    overflowKey = key; overflowTable = { rates, potentials };
    return overflowTable;
  }
  function resolveOverflow(hp, maxHP, attacks, profiles, knockout) {
    const {rates, potentials} = overflowModel(maxHP, profiles, knockout);
    const at = (values, hp) => values[Math.floor(hp)] + (values[Math.ceil(hp)] - values[Math.floor(hp)]) * (hp % 1);
    const progress = at(potentials[0], hp) - attacks * rates[0];
    const kills = progress <= 0 ? 1 + Math.floor(-progress) : 0;
    const remaining = Math.max(Number.EPSILON, Math.min(1, progress + kills));
    let high = 1;
    while (high < maxHP && potentials[0][high] < remaining) high++;
    const low = high - 1, span = potentials[0][high] - potentials[0][low];
    const nextHP = Math.max(Number.EPSILON, Math.min(maxHP, low + (span > 1e-12 ? (remaining - potentials[0][low]) / span : 1)));
    // Boundary correction makes splitting a large interval conserve progress.
    const usedAttacks = (kills + at(potentials[0], hp) - at(potentials[0], nextHP)) / rates[0];
    const expectedReward = i => usedAttacks * rates[i] - at(potentials[i], hp) + at(potentials[i], nextHP);
    return { hp:nextHP, kills, damage:Math.max(0, expectedReward(1)), knockouts:Math.max(0, Math.min(kills, Math.round(expectedReward(2)))), ...bonusResult(profiles,expectedReward(3),kills) };
  }
  // Expected attacks to clear each HP value. Clamping each individual hit at
  // enemy HP preserves the cost of overkill, unlike simply dividing DPS by HP.
  function expectedHits(maxHP, profiles, knockout) {
    const key = JSON.stringify([maxHP, profiles, knockout]);
    if (key === cachedKey) return cachedTable;
    const probabilities = new Float64Array(maxHP + 1), overkillChances = new Float64Array(maxHP + 1);
    const totalRate = profiles.reduce((sum, p) => sum + p.rate, 0);
    for (const p of profiles) {
      const weight = p.rate / totalRate;
      if (!p.overkillThreshold && N.mitigate(rolledDamage(p,p.dice+p.flat+(p.bonus||0)),p.defense||0)>=maxHP) {
        probabilities[maxHP] += weight; continue;
      }
      for (const [damage, probability] of damageDistribution(p)) {
        probabilities[Math.min(maxHP, damage)] += weight * probability;
        if(p.overkillThreshold>0) for(let hp=1;hp<=Math.min(maxHP,damage-p.overkillThreshold);hp++)overkillChances[hp]+=weight*probability;
      }
    }
    const positiveChance = probabilities.slice(1).reduce((n, p) => n + p, 0);
    const expected = new Float64Array(maxHP + 1), dealt = new Float64Array(maxHP + 1), stuns = new Float64Array(maxHP + 1), overkills = new Float64Array(maxHP + 1);
    for (let hp = 1; hp <= maxHP; hp++) {
      let turns = 1, damageTotal = 0, stunTotal = 0, overkillTotal = overkillChances[hp];
      for (let damage = 1; damage <= maxHP; damage++) {
        const probability = probabilities[damage], remaining = Math.max(0, hp - damage);
        const chance = remaining > 0 && remaining <= knockout.threshold ? knockout.chance : 0;
        turns += probability * (1 - chance) * expected[remaining];
        damageTotal += probability * (Math.min(hp, damage) + (1 - chance) * dealt[remaining]);
        stunTotal += probability * (chance + (1 - chance) * stuns[remaining]);
        overkillTotal += probability * (1-chance) * overkills[remaining];
      }
      expected[hp] = turns / positiveChance;
      dealt[hp] = damageTotal / positiveChance;
      stuns[hp] = stunTotal / positiveChance;
      overkills[hp] = overkillTotal / positiveChance;
    }
    cachedKey = key; cachedTable = { expected, dealt, stuns, overkills };
    return cachedTable;
  }
  function resolve(hp, maxHP, attacks, profiles, knockout = { threshold:4, chance:.5 }) {
    if (!attacks) return { hp, kills: 0, damage: 0, knockouts:0 };
    if (profiles.every(p => p.rate <= 0 || averageDamage(p) === 0)) return { hp, kills:0, damage:0, knockouts:0 };
    if(maxHP>EXACT_HP_LIMIT)return resolveLargeHP(hp,maxHP,attacks,profiles,knockout);
    if (profiles.some(p => p.overflow)) return resolveOverflow(hp, maxHP, attacks, profiles, knockout);
    const { expected:table, dealt, stuns, overkills } = expectedHits(maxHP, profiles, knockout);
    const interpolate = (values, value) => { const lower = Math.floor(value); return values[lower] + (values[Math.ceil(value)] - values[lower]) * (value - lower); };
    const needed = interpolate(table, hp);
    let kills = 0, remaining;
    if (attacks < needed) remaining = needed - attacks;
    else {
      const afterFirst = attacks - needed;
      kills = 1 + Math.floor(afterFirst / table[maxHP]);
      remaining = table[maxHP] - afterFirst % table[maxHP];
    }
    let nextHP = maxHP;
    if (remaining < table[maxHP]) {
      let high = 1;
      while (high < maxHP && table[high] < remaining) high++;
      const low = high - 1;
      nextHP = low + (remaining - table[low]) / (table[high] - table[low]);
    }
    nextHP = Math.max(Number.EPSILON, Math.min(maxHP, nextHP));
    return { hp: nextHP, kills,
      damage: Math.max(0, kills * dealt[maxHP] + interpolate(dealt, hp) - interpolate(dealt, nextHP)),
      knockouts:Math.max(0, Math.min(kills, Math.round(kills * stuns[maxHP] + interpolate(stuns, hp) - interpolate(stuns, nextHP)))),
      ...bonusResult(profiles,kills*overkills[maxHP]+interpolate(overkills,hp)-interpolate(overkills,nextHP),kills) };
  }
  function rewardRates(maxHP, profiles, knockout = { threshold:4, chance:.5 }) {
    const active=profiles.filter(p=>p.rate>0),totalRate=active.reduce((n,p)=>n+p.rate,0);
    if (!totalRate || active.every(p=>averageDamage(p)===0)) return {clears:0,overkills:0};
    if(maxHP>EXACT_HP_LIMIT){const model=largeHPModel(maxHP,active,knockout);return{clears:model.clears*totalRate,overkills:model.overkills*totalRate,approximate:true};}
    // Relative attack frequency models the party's long-run mixture; the game
    // still resolves actual whole-second attacks in its usual character order.
    const normalized=active.map(p=>({dice:p.dice,flat:p.flat,bonus:p.bonus||0,multiplier:p.multiplier,
      minimumLevelBonus:p.minimumLevelBonus||0,preLevelMultiplier:p.preLevelMultiplier||1,defense:p.defense||0,overflowDefense:p.overflowDefense??p.defense??0,overflow:!!p.overflow,overkillThreshold:p.overkillThreshold||0,rate:p.rate/totalRate}));
    if(normalized.some(p=>p.overflow)){
      const {rates}=overflowModel(maxHP,normalized,knockout);
      return {clears:Math.max(0,rates[0]*totalRate),overkills:Math.max(0,rates[3]*totalRate)};
    }
    const table=expectedHits(maxHP,normalized,knockout),clears=totalRate/table.expected[maxHP];
    return {clears,overkills:clears*table.overkills[maxHP]};
  }
  const clearRate = (hp,profiles,knockout) => rewardRates(hp,profiles,knockout).clears;
  const api = { resolve, scaleDamage, rolledDamage, averageDamage, clearRate, rewardRates };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggBatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
