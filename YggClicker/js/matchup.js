(function(__YggBig){
(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const E=common?require('./engine.js'):root.YggEngine,D=common?require('./data.js'):root.YggData,N=common?require('./numbers.js'):root.YggNumbers;
  const cache=new Map();
  // Enumerate the roll totals; the omitted tail is below floating-point probability resolution.
  function expectedRoll(spec,judgment=true){
    if(!spec)return 0;
    return E.T.distribution(spec,judgment).reduce((sum,[value,,p])=>(__YggBig.add(sum,(__YggBig.mul(spec.multiplier?N.linear(value,(__YggBig.sub(spec.multiplier,1)),1):value,p)))),0);
  }
  function matchup(state,c,enemy=null){
    const q=enemy?E.enemySpec(state,enemy):E.getSession(state),profile=E.attackForecastProfile(state,c,enemy),incoming=E.enemyHitProfile(state,enemy||{},c);
    const enemyReachable=E.enemyCanReach(state,enemy||{row:q.row||'front'},c);
    const maxHP=E.maxHP(state,c),passive=(__YggBig.eq(E.enemyActionPower(state,undefined,enemy),0));
    const key=JSON.stringify([profile,incoming,maxHP,passive,enemyReachable]);
    if(cache.has(key))return {...cache.get(key),id:c.id,name:c.name};
    let seed=0x5F3759DF;
    const random=()=>{seed=((__YggBig.add(Math.imul(seed,1664525),1013904223)))>>>0;return (__YggBig.div(seed,4294967296));};
    const samples=4096,hit={...E.T.hit(profile.accuracy,profile.evasion,profile.hitLogRatio),chance:E.judgmentOutcomes(profile.accuracy,E.targetEvasion(profile,enemy),profile.hitLogRatio,profile.accuracyRetries,profile.enemyCriticalRetries).chance},normalDamage=E.T.damage({dice:profile.dice,flat:(__YggBig.add(profile.flat,profile.bonus)),resultScale:profile.resultScale},profile.defense,profile.damageLogRatio,profile.damageScaleLog||0);let evades=0,damage=0,incomingHits=0;
    // Use the actual battle's opposed rolls, rerolls and mitigation. A fixed
    // sequence makes the estimate stable when reopening or editing a party.
    for(let i=0;(__YggBig.lt(i,samples));i++){

      const result=E.rollEnemyHit(incoming,random);
      if(!result.forcedFailure&&(__YggBig.le(result.accuracy.total,result.evasion.total)))evades++;
      if(result.hit){incomingHits++;(damage=(__YggBig.add(damage,result.damage)));}
    }
    const mean=enemyReachable?(__YggBig.div(damage,samples)):0;
    const result={reachable:profile.reachable!==false,enemyReachable,hitRate:profile.reachable===false?0:(__YggBig.add(profile.autoHitChance||0,(__YggBig.mul((__YggBig.sub(1,profile.autoHitChance||0)),hit.chance)))),hitCorrection:hit.correction,damageCorrection:normalDamage.correction,averageDamage:profile.apAttack?0:E.profileAverage(state,profile),averageAPDamage:profile.apAttack?E.profileAverage(state,profile):0,apAttack:!!profile.apAttack,enemyHitCorrection:E.T.hit(incoming.accuracySpec,incoming.evasionDice,incoming.hitLogRatio).correction,enemyDamageCorrection:E.T.damage(incoming.attack,incoming.reduction,incoming.damageLogRatio,incoming.damageScaleLog||0).correction,evadeRate:(__YggBig.div(evades,samples)),damageOnHit:incomingHits?(__YggBig.div(damage,incomingHits)):0,damagePerAttack:mean,endurance:passive||!mean?Infinity:(__YggBig.max(1,(__YggBig.div(maxHP,mean)))),passive};
    if((__YggBig.ge(cache.size,128)))cache.clear();cache.set(key,result);return {...result,id:c.id,name:c.name};
  }
  function party(state,memberId=null){
    // Preview a fresh engagement without mutating the saved or draft formation.
    const ctx={...state,rainbowTurns:0,enemies:null,respawnSeconds:0,focusedEnemyId:null,
      health:Object.fromEntries(D.characters.map(c=>[c.id,{hp:E.maxHP(state,c),status:'active',regenSeconds:0}]))};
    ctx.hp=E.getSession(ctx).hp;
    const enemy=memberId?E.ensureEnemies(ctx).find(e=>(__YggBig.eq(e.kind,memberId))):null;
    return {state:ctx,rows:E.formationIds(ctx).map(id=>matchup(ctx,D.characters.find(c=>(__YggBig.eq(c.id,id))),enemy))};
  }
  const api={expectedRoll,party,matchup};if(common)module.exports=api;else root.YggMatchup=api;
})(typeof window!=='undefined'?window:globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
