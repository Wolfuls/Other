(function(root){'use strict';
const N=typeof module!=='undefined'&&module.exports?require('./numbers.js'):root.YggNumbers;
  const damageCache = new Map();
  const scaleDamage = (amount,multiplier) => Math.max(0,N.floor(amount*multiplier));
  const rolledDamage=(p,amount)=>N.damage(amount,p.multiplier,p.minimumLevelBonus||0,p.preLevelMultiplier||1);
  function damageDistribution(p) {
    const key = JSON.stringify([p.dice, p.flat, p.bonus || 0, p.multiplier, p.defense || 0,p.minimumLevelBonus||0,p.preLevelMultiplier||1,!!p.areaAttack]);
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
      const mitigated=N.mitigate(rolledDamage(p,sum+p.flat+(p.bonus||0)),p.defense||0),damage=p.areaAttack?Math.max(1,N.floor(mitigated/2)):mitigated;
      amounts.set(damage, (amounts.get(damage) || 0) + sums[sum]);
    }
    const result = [...amounts];
    if (damageCache.size >= 64) damageCache.delete(damageCache.keys().next().value);
    damageCache.set(key, result);
    return result;
  }
  const averageDamage = profile => damageDistribution(profile).reduce((n, [damage, chance]) => n + damage * chance, 0);

const api={scaleDamage,rolledDamage,averageDamage,damageDistribution};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggBatch=api;
})(typeof window!=='undefined'?window:globalThis);
