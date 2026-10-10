(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const E=common?require('./engine.js'):root.YggEngine,D=common?require('./data.js'):root.YggData,N=common?require('./numbers.js'):root.YggNumbers;
  const cache=new Map();
  // Enumerate the roll totals; the omitted tail is below floating-point probability resolution.
  function expectedRoll(spec,judgment=true){
    if(!spec)return 0;
    return E.T.distribution(spec,judgment).reduce((sum,[value,,p])=>sum+(spec.multiplier?N.linear(value,spec.multiplier-1,1):value)*p,0);
  }
  function matchup(state,c){
    const q=E.getSession(state),profile=E.attackForecastProfile(state,c),incoming=E.enemyHitProfile(state,{},c);
    const enemyReachable=E.enemyCanReach(state,{row:q.row||'front'},c);
    const maxHP=E.maxHP(state,c),passive=E.enemyActionPower(state)===0;
    const key=JSON.stringify([profile,incoming,maxHP,passive,enemyReachable]);
    if(cache.has(key))return {...cache.get(key),id:c.id,name:c.name};
    let seed=0x5F3759DF;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const samples=4096,hit=E.T.hit(profile.accuracy,profile.evasion,profile.hitLogRatio),normalDamage=E.T.damage({dice:profile.dice,flat:profile.flat+profile.bonus,resultScale:profile.resultScale},profile.defense,profile.damageLogRatio,profile.damageScaleLog||0);let evades=0,damage=0,incomingHits=0;
    // Use the actual battle's opposed rolls, rerolls and mitigation. A fixed
    // sequence makes the estimate stable when reopening or editing a party.
    for(let i=0;i<samples;i++){

      const result=E.rollEnemyHit(incoming,random);
      if(!result.forcedFailure&&result.accuracy.total<=result.evasion.total)evades++;
      if(result.hit){incomingHits++;damage+=result.damage;}
    }
    const mean=enemyReachable?damage/samples:0;
    const result={reachable:profile.reachable!==false,enemyReachable,hitRate:profile.reachable===false?0:(profile.autoHitChance||0)+(1-(profile.autoHitChance||0))*hit.chance,hitCorrection:hit.correction,damageCorrection:normalDamage.correction,averageDamage:E.averageAttackDamage(state,c),averageAPDamage:profile.apAttack?E.profileAverage(state,profile):0,apAttack:!!profile.apAttack,enemyHitCorrection:E.T.hit(incoming.accuracySpec,incoming.evasionDice,incoming.hitLogRatio).correction,enemyDamageCorrection:E.T.damage(incoming.attack,incoming.reduction,incoming.damageLogRatio,incoming.damageScaleLog||0).correction,evadeRate:evades/samples,damageOnHit:incomingHits?damage/incomingHits:0,damagePerAttack:mean,endurance:passive||!mean?Infinity:Math.max(1,maxHP/mean),passive};
    if(cache.size>=128)cache.clear();cache.set(key,result);return {...result,id:c.id,name:c.name};
  }
  function party(state){
    // Preview a fresh engagement without mutating the saved or draft formation.
    const ctx={...state,rainbowTurns:0,enemies:null,respawnSeconds:0,focusedEnemyId:null,
      health:Object.fromEntries(D.characters.map(c=>[c.id,{hp:E.maxHP(state,c),status:'active',regenSeconds:0}]))};
    ctx.hp=E.getSession(ctx).hp;
    return {state:ctx,rows:E.formationIds(ctx).map(id=>matchup(ctx,D.characters.find(c=>c.id===id)))};
  }
  const api={expectedRoll,party,matchup};if(common)module.exports=api;else root.YggMatchup=api;
})(typeof window!=='undefined'?window:globalThis);
