(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const E=common?require('./engine.js'):root.YggEngine,D=common?require('./data.js'):root.YggData;
  const cache=new Map(),meanCache=new Map();
  // Enumerate the roll totals; the omitted tail is below 1 in 60 million per die.
  function expectedRoll(spec,judgment=true){
    if(!spec)return 0;
    const key=JSON.stringify([spec,judgment]);if(meanCache.has(key))return meanCache.get(key);
    const die=[];
    if(judgment)for(let n=0;n<10;n++){
      const weight=6**(-n-1);
      for(let f=2;f<=5;f++)die.push([6*n+f,weight]);
      for(let p=1;p<=6;p++)die.push([6*n+1-p,weight/6]);
    }else for(let f=1;f<=(spec.sides||6);f++)die.push([f,1/(spec.sides||6)]);
    let totals=new Map([[spec.flat||0,1]]);
    for(let i=0;i<spec.dice;i++){
      const next=new Map();for(const [sum,p]of totals)for(const [face,q]of die)next.set(sum+face,(next.get(sum+face)||0)+p*q);totals=next;
    }
    let value=0,weight=0;for(const [sum,p]of totals){value+=E.scaledCombatTotal(sum,spec)*p;weight+=p;}
    value/=weight;if(meanCache.size>128)meanCache.clear();meanCache.set(key,value);return value;
  }
  function matchup(state,c){
    const q=E.getSession(state),profile=E.attackProfile(state,c),incoming=E.enemyHitProfile(state,{},c);
    const maxHP=E.maxHP(state,c),passive=E.enemyActionPower(state)===0;
    const key=JSON.stringify([profile.accuracy,profile.evasion,profile.autoHitChance,incoming,maxHP,passive]);
    if(cache.has(key))return {...cache.get(key),id:c.id,name:c.name};
    let seed=0x5F3759DF;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const samples=8192;let hits=0,evades=0,damage=0,incomingHits=0;
    // Use the actual battle's opposed rolls, rerolls and mitigation. A fixed
    // sequence makes the estimate stable when reopening or editing a party.
    for(let i=0;i<samples;i++){
      if(random()<(profile.autoHitChance||0)||E.combatRoll(profile.accuracy,random).total>E.combatRoll(profile.evasion,random).total)hits++;
      const result=E.rollEnemyHit(incoming,random);
      if(result.accuracy.total<=result.evasion.total)evades++;
      if(result.hit){incomingHits++;damage+=result.damage;}
    }
    const mean=damage/samples;
    const result={hitRate:hits/samples,evadeRate:evades/samples,damageOnHit:incomingHits?damage/incomingHits:0,damagePerAttack:mean,endurance:passive||!mean?Infinity:Math.max(1,maxHP/mean),passive};
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
