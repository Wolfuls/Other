(function(__YggBig){
(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.YggData;
  const N = typeof module !== 'undefined' && module.exports ? require('./numbers.js') : root.YggNumbers;
  const T=typeof module!=='undefined'&&module.exports?require('./strength.js'):root.YggStrength;
  const FX=typeof module!=='undefined'&&module.exports?require('./combat-effects.js'):root.YggCombatEffects;
  const Missions=typeof module!=='undefined'&&module.exports?require('./missions.js'):root.YggMissions;
  const elementNames={break:'ブレイク',shock:'感電',blast:'爆破',fire:'火炎',wind:'風'};
  function attributeMultiplier(target,elements=[]){
    if(elements.some(id=>target?.resistances?.includes(id)))return 0;
    return elements.some(id=>target?.weaknesses?.includes(id))?1.5:1;
  }
  const attributeDamage=(damage,multiplier=1)=>(__YggBig.eq(multiplier,1))?damage:(__YggBig.max(0,N.floor((__YggBig.min(Infinity,(__YggBig.mul(damage,multiplier)))))));
  const attributeSummary=target=>['resistances','weaknesses'].map((key,i)=>(__YggBig.add((__YggBig.add(i?'弱点':target?.resistanceLabel||'耐性','：')),(target?.[key]||[]).map(id=>elementNames[id]||id).join('・')||'なし'))).join(' / ');
  function elementalPerk(perk,target){const scaled={...perk};for(const [key,elements]of Object.entries(perk.effectElements||{}))scaled[key]=(__YggBig.mul(perk[key]||0,attributeMultiplier(target,elements)));return scaled;}

  function pomUnits(state){return isDeployed(state,'richter')?(healthOf(state,'richter').pomBombs||[]).filter(b=>(__YggBig.eq(b.sessionId,state.sessionId))&&(__YggBig.gt(b.hp,0))):[];}
  function consumePoms(state){const h=healthOf(state,'richter'),bombs=pomUnits(state);h.pomBonus={dice:bombs.reduce((n,b)=>(__YggBig.add(n,b.dice)),0),flat:bombs.reduce((n,b)=>(__YggBig.add(n,b.flat)),0)};delete h.pomBombs;}
  function summonPoms(state){const c=D.characters.find(c=>c.id==='richter'),h=healthOf(state,c.id),ps=activePerks(state,c);delete h.pomBonus;if(!canAct(state,c.id)||!ps.some(p=>p.pomSummon))return;const power=strengthValue(state,c,'power'),maxHP=(__YggBig.max(1,N.floor((__YggBig.min(Infinity,(__YggBig.div((__YggBig.mul(10,power)),100))))))),count=(__YggBig.max(1,...ps.map(p=>p.pomCount||1)));h.pomBombs=Array.from({length:count},(_,i)=>({id:(__YggBig.add('pom-',i)),sessionId:state.sessionId,hp:maxHP,maxHP,power,dice:(__YggBig.add(5,ps.reduce((n,p)=>(__YggBig.add(n,p.pomDice||0)),0))),flat:ps.reduce((n,p)=>(__YggBig.add(n,p.pomFlat||0)),0)}));}
  function damagePoms(state,profile,random,events){for(const b of pomUnits(state)){const p=typeof profile==='function'?profile(b):profile,result=rollEnemyHit(p,random);if(result.hit)b.hp=(__YggBig.max(0,(__YggBig.sub(b.hp,result.damage))));if(events)events.push({type:'pomDamage',id:b.id,damage:result.damage,hit:result.hit,hp:b.hp});}const h=healthOf(state,'richter');if(h.pomBombs)h.pomBombs=h.pomBombs.filter(b=>(__YggBig.gt(b.hp,0)));}
  function pomIncoming(state,b,session){const mental=session.attackType==='mental';return {mental,accuracySpec:mental?session.ss:session.accuracy,evasionDice:{flat:10,dice:0},attack:session.attack,reduction:0,shield:0,postReduction:0,areaAttack:true,damageElementMultiplier:1,hitLogRatio:T.relativeLog(enemyStrength(session),mental?100:b.power),damageLogRatio:T.relativeLog(enemyStrength(session),100),damageScaleLog:T.absoluteLog(enemyStrength(session),100)};}
  const cherryPerk=(state,key)=>{const c=D.characters.find(c=>c.id==='cherry');return !!c&&activePerks(state,c).some(p=>p[key]);};
  function allyElements(state,c){
    const resistances=[...(c.resistances||[])],weaknesses=[...(c.weaknesses||[])];
    if(c.id==='cherry'&&cherryPerk(state,'dominance')){resistances.push('fire');weaknesses.push('wind');}
    if(c.id!=='cherry'&&isDeployed(state,'cherry')&&canAct(state,'cherry')&&cherryPerk(state,'fireCover'))resistances.push('fire');
    return {...c,resistances,weaknesses};
  }
  function receiveFire(state,c,elements,source){
    if(c.id==='cherry'&&source!=='cherry'&&elements?.includes('fire')&&canAct(state,c.id)&&cherryPerk(state,'dominance'))state.health.cherry.fireBonus=(__YggBig.min(Infinity,(__YggBig.add(state.health.cherry.fireBonus||0,4))));
  }
  const cherryDamage=state=>N.floor((__YggBig.min(Infinity,(__YggBig.mul(4,(__YggBig.sqrt((__YggBig.div(strengthValue(state,D.characters.find(c=>c.id==='cherry'),'power'),100)))))))));
  function clearBurns(state){
    const h=state.health?.cherry,down=!h||h.status!=='active'||runawayOf(state,'cherry').runawayCollapsed;
    if(down&&h)delete h.fireBonus;
    for(const battle of [state,...Object.values(state.sessionStates||{})])for(const e of battle.enemies||[])if(down||(__YggBig.le(e.hp,0))){delete e.burnDamage;}
  }
  function fireField(state,c,random,events){
    const amount=cherryDamage(state);damagePoms(state,{nonContact:true,attack:{dice:0,flat:amount},reduction:0,shield:0,postReduction:0,damageElementMultiplier:1},random,events);const targets=[...livingEnemies(state)],allies=[...activeCharacters(state)];
    for(const e of targets)if((__YggBig.gt(e.hp,0)))applyDamage(state,amount,events,'VOLCANO',c.id,random,{fixedDamage:amount,attackElements:['fire'],nonContact:true,forceSingleTarget:true,areaAttack:true},false,[e],true);
    for(const target of allies){const factor=attributeMultiplier(allyElements(state,target),['fire']);damageAlly(state,target,attributeDamage(amount,factor),random,events,'VOLCANO');}
    clearBurns(state);
  }
  function cherryExtra(state,c,random,events){
    const p={...attackProfile(state,c),attackElements:['fire'],areaAttack:true,forceSingleTarget:true};
    damagePoms(state,b=>({accuracySpec:p.accuracy,evasionDice:{flat:10,dice:0},attack:{dice:p.dice,flat:(__YggBig.add(p.flat,p.bonus||0))},areaAttack:true,reduction:0,shield:0,postReduction:0,damageElementMultiplier:1,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),b.power),damageLogRatio:T.relativeLog(strengthValue(state,c,'power'),100),damageScaleLog:T.absoluteLog(strengthValue(state,c,'power'),100)}),random,events);
    const allies=[...activeCharacters(state)];
    applyDamage(state,0,events,'DISSATISFACTION',c.id,random,p,true,[...livingEnemies(state)],false,true);
    for(const target of allies){
      const a=strengthValue(state,c,'power'),d=strengthValue(state,target,'armor');
      const result=rollEnemyHit({accuracySpec:accuracySpec(state,c),evasionDice:evasionSpec(state,target),attack:{dice:p.dice,flat:(__YggBig.add(p.flat,p.bonus||0))},reduction:armor(state,target),postReduction:activation(state,target).damage,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),strengthValue(state,target,'evasion')),damageLogRatio:T.relativeLog(a,d),damageScaleLog:T.absoluteLog(a,d),damageElementMultiplier:attributeMultiplier(allyElements(state,target),['fire']),areaAttack:true},random);
      if(result.hit)damageAlly(state,target,result.damage,random,events,'DISSATISFACTION');
    }
    clearBurns(state);
  }

  const battleSpeed=state=>(__YggBig.eq(state.battleSpeed,2))?2:1;
  const MAX_PARTY_SIZE = 5;
  const partyCapacity=id=>id==='infirmary'?3:MAX_PARTY_SIZE;
  const MAX_TURN_ACTIONS=8, MAX_CHAIN_HITS=16;
  const ENEMY_ID_RANGE = 1000000000;
  function nextEnemyId(state){const id=state.nextEnemyId||0;state.nextEnemyId=((__YggBig.add(id,1)))%ENEMY_ID_RANGE;return id;}

  const formationRow=(state,id)=>state.formationRows?.[id]==='rear'?'rear':'front';
  const inRange=(range,distance)=>!range||(__YggBig.ge(distance,range[0]))&&(__YggBig.le(distance,range[1]));
  // Down units retain their assigned row. Only the effective distance collapses.
  function combatDistance(state,id,enemy={row:'front'},incoming=false){
    const allyFront=formationIds(state).some(id=>formationRow(state,id)==='front'&&canAct(state,id)&&(!incoming||(__YggBig.ne(id,state.floorClipTargetId))||(__YggBig.lt(formationIds(state).filter(id=>canAct(state,id)).length,2))));
    const enemies=state.enemies??[{hp:1,row:getSession(state).row||'front'}];
    const enemyFront=enemies.some(e=>(__YggBig.gt(e.hp,0))&&!e.respawnSeconds&&e.row!=='rear');
    return (__YggBig.add((__YggBig.add(1,Number(formationRow(state,id)==='rear'&&allyFront))),Number(enemy.row==='rear'&&enemyFront)));
  }
  const rangedPerks=(state,c,distance)=>activePerks(state,c).filter(p=>inRange(p.attackRange||p.effectRange,distance));
  function canReach(state,c,enemy){const distance=combatDistance(state,c.id,enemy);return inRange(c.attackRange,distance)||activePerks(state,c).some(p=>p.attackRange&&inRange(p.attackRange,distance));}
  function reachableEnemies(state,c){const es=state.enemies??[{id:null,hp:state.hp||getSession(state).hp,row:getSession(state).row||'front'}];return es.filter(e=>(__YggBig.gt(e.hp,0))&&!e.respawnSeconds&&(!c||canReach(state,c,e)));}
  const hasReachableTarget=(state,c)=>(__YggBig.gt(reachableEnemies(state,c).length,0));
  function profileTarget(state,c){const es=reachableEnemies(state,c);return es.find(e=>(__YggBig.eq(e.id,state.focusedEnemyId)))||es[0]||(state.enemies||[]).find(e=>(__YggBig.gt(e.hp,0)))||{row:getSession(state).row||'front'};}
  function attackMotion(state,c,distance){
    if(c?.id==='aniya')return (__YggBig.gt(distance,1))?'beam':'chop';
    if(c?.id==='waku')return (__YggBig.eq(distance,1))?'stab':'shoot';
    if(c?.id==='mitsuru'&&(__YggBig.eq(distance,3)))return 'spark';
    return 'normal';
  }
  function enemyCanReach(state,enemy,c){return inRange(enemySpec(state,enemy).attackRange,combatDistance(state,c.id,enemy,true));}
  const canTakeAction=(state,c)=>isStunned(state,c.id)||hasReachableTarget(state,c)||(isActionDonor(state,c)&&(__YggBig.gt(transferTargets(state,c).length,0)));

  let incomeObserver=null;
  const observeIncome=listener=>{incomeObserver=listener;};
  const statLevel=(state,c)=>(__YggBig.max(0,(__YggBig.sub(state.levels[c.id]||0,1))));
  const seedMultiplier=(state,id)=>(__YggBig.min(Infinity,(__YggBig.pow(1.04,state.seedLevels?.[id]||0))));
  function perkStrengthMultiplier(state,c,kind){return (__YggBig.add(1,(c.perks||[]).reduce((sum,p)=>(__YggBig.add(sum,(__YggBig.gt(state.levels[c.id]||0,0))&&(__YggBig.ge(state.levels[c.id]||0,p.level))&&(state.perkEnabled?.[c.id]?.[p.id]??!!p.initial)?p.strengthBonus?.[kind]||0:0)),0)));}
  const strengthValue=(state,c,kind)=>(__YggBig.min(Infinity,(__YggBig.mul((__YggBig.mul(T.personalValue(statLevel(state,c),concentration(state,c.id)[kind]||0,concentrationPoints(state,c.id),kind),seedMultiplier(state,({action:'pride',evasion:'vanity',accuracy:'envy',power:'wrath',vitality:'gluttony',armor:'lust'})[kind]))),perkStrengthMultiplier(state,c,kind)))));
  const penetrationImmune=c=>(c.traits||[]).includes('penetrationImmune');
  const hpStrength=(state,c)=>strengthValue(state,c,'vitality');
  const hpFromStrength=(base,level)=>(__YggBig.max(1,N.floor((__YggBig.min(Infinity,(__YggBig.mul(base,(__YggBig.div(T.value(level),D.strength.strengthBase)))))))));
  const maxHP=(state,c)=>(__YggBig.max(1,N.floor((__YggBig.min(Infinity,(__YggBig.mul(c.maxHP,(__YggBig.div(hpStrength(state,c),D.strength.strengthBase)))))))));
  const armor=(state,c,mental=false)=>mental?c.resistance||0:(__YggBig.add(c.defense||0,defenseBonus(state,c)));
  const investmentCache=new Map();
  function trainingInvestment(state,c){
    if(!state.levels[c.id])return 0;
    const tracks=[[c.powerCost,statLevel(state,c)]];
    const key=JSON.stringify(tracks);if(investmentCache.has(key))return investmentCache.get(key);
    let sum=0;
    for(const [base,count]of tracks){
      if(count&&(!(__YggBig.isFinite(geometricCost(base,(__YggBig.sub(count,1)))))||(__YggBig.gt(geometricCost(base,(__YggBig.sub(count,1))),Infinity))))return Infinity;
      for(let i=0;(__YggBig.lt(i,count));i++)(sum=(__YggBig.add(sum,geometricCost(base,i))));
    }
    sum=(__YggBig.min(Infinity,sum));if((__YggBig.gt(investmentCache.size,64)))investmentCache.clear();investmentCache.set(key,sum);return sum;
  }
  const activePerks=(state,c)=>perks(state,c).filter(p=>p.unlocked);
  const isStunned=(state,id)=>(__YggBig.gt(state.health?.[id]?.stunTurns||0,0));
  function clearTurnEffects(h){for(const k of ['stunTurns','blastTurns','blastEvasion','magicLevel','pomBombs','pomBonus'])delete h[k];}
  function turnEffects(state,id){const h=healthOf(state,id);return {stunned:isStunned(state,id),blastEvasion:(__YggBig.gt(h.blastTurns,0))?h.blastEvasion||0:0};}
  function magicState(state,c){
    if(!c?.magicPower)return {current:0,maximum:0};
    const active=activePerks(state,c),maximum=active.some(p=>p.magicCharge)?(__YggBig.add(1,(__YggBig.max(0,...active.map(p=>p.magicLevel||0))))):0;
    return {current:(__YggBig.min(maximum,(__YggBig.max(maximum?1:0,(__YggBig.floor(state.health?.[c.id]?.magicLevel||0)))))),maximum};
  }
  function magicPerPoint(state,c){if(!c?.magicPower)return 0;return (__YggBig.add(c?.magicPower||0,activePerks(state,c).reduce((n,p)=>(__YggBig.add(n,p.magicBonusLevelStep?(__YggBig.floor((__YggBig.div(state.levels[c.id]||0,p.magicBonusLevelStep)))):0)),0)));}
  function normalizeMagic(state,c){if(c?.magicPower&&state.health?.[c.id]){const h=state.health[c.id],m=magicState(state,c);if(m.current)h.magicLevel=m.current;else delete h.magicLevel;}}
  function ownActionBonus(state,c){return activePerks(state,c).reduce((n,p)=>(__YggBig.add((__YggBig.add(n,p.actionBonus||0)),p.runawayActionStep?(__YggBig.floor((__YggBig.div(runawayOf(state,c.id).runawayRate,p.runawayActionStep)))):0)),0);}
  // Charge consumes one action, including a manual or donated action, without an attack roll.
  function prepareMagicAction(state,c,events){
    if(!c?.magicPower)return true;
    normalizeMagic(state,c);const m=magicState(state,c);if((__YggBig.ge(m.current,m.maximum)))return true;
    state.health[c.id].magicLevel=(__YggBig.add(m.current,1));
    if(events)events.push({type:'magicCharge',actorId:c.id,actor:c.name,magicLevel:(__YggBig.add(m.current,1)),maximum:m.maximum});
    return false;
  }
  function finishMagicAttack(state,c,p,withinTurn=true){
    if(!c)return;const h=state.health[c.id];
    if((__YggBig.gt(p.magicLevel,0))&&p.blastEvasionPerMagic&&h.status==='active'){h.blastTurns=withinTurn?2:1;h.blastEvasion=(__YggBig.mul(p.magicLevel,p.blastEvasionPerMagic));}
    if(c.magicPower)delete h.magicLevel;
    if(p.afterAttackStun&&h.status==='active')h.stunTurns=p.afterAttackStun;
  }
  const rainbowActive=state=>(__YggBig.gt(state.rainbowTurns||0,0))&&canAct(state,'jewel');
  const walletArmorBonus=credits=>(__YggBig.ge(credits,1e9))?(__YggBig.add(10,(__YggBig.mul(3,(__YggBig.floor((__YggBig.log2((__YggBig.div(credits,1e9)))))))))):0;
  function defenseBonus(state,c){
    const ps=activePerks(state,c);let bonus=ps.reduce((n,p)=>(__YggBig.add(n,p.defenseBonus||0)),0);
    if(c.id==='jewel'&&rainbowActive(state))(bonus=(__YggBig.add(bonus,15)));
    if(ps.some(p=>p.investmentArmor)){
      (bonus=(__YggBig.add(bonus,walletArmorBonus(state.credits||0))));
    }
    return bonus;
  }
  // Current-run income is archived only when a new run is confirmed.
  const incomeRecord=state=>({currentRun:state.earned,allRuns:(__YggBig.min(Infinity,(__YggBig.add(state.earned,state.previousRunsEarned||0))))});
  function rolloverIncome(state){
    state.previousRunsEarned=incomeRecord(state).allRuns;
    state.earned=0;
  }
  // Lifetime entitlement is credited once; spending never reduces this high-water mark.
  function sinEntitlement(produced){return (__YggBig.lt(produced,1e6))?0:(__YggBig.max(1,(__YggBig.floor((__YggBig.mul(10,(__YggBig.pow((__YggBig.log10((__YggBig.add(1,(__YggBig.div((__YggBig.min(Infinity,produced)),1e6)))))),2))))))));}
  function beginDream(state){
    if(state.dreamShop||!state.viewingMemories||!isMemoriesUnlocked(state)||(__YggBig.ge(state.runNumber||1,Number.MAX_SAFE_INTEGER)))return false;
    const total=sinEntitlement(incomeRecord(state).allRuns),gain=(__YggBig.max(0,(__YggBig.sub(total,state.sinTotal||0))));
    state.sinTotal=(__YggBig.max(total,state.sinTotal||0));state.sinBalance=(__YggBig.add(state.sinBalance||0,gain));
    state.dreamGain=gain;state.dreamPurchases={};state.dreamShop=true;return true;
  }
  function seedCost(state,id){if(!Object.hasOwn(D.seedSystem.effects,id))return Infinity;const price=(__YggBig.ceil((__YggBig.pow(1.06,state.seedLevels[id]||0))));return Number.isSafeInteger(price)?price:Infinity;}
  function buySeed(state,id){
    const cost=seedCost(state,id);if(!state.dreamShop||!(__YggBig.isFinite(cost))||(__YggBig.lt(state.sinBalance,cost)))return false;
    state.dreamPurchases||={};const bought=state.dreamPurchases[id]||{levels:0,cost:0};
    state.dreamPurchases[id]={levels:(__YggBig.add(bought.levels,1)),cost:(__YggBig.add(bought.cost,cost))};
    (__YggBig.assign(state,"sinBalance","sub",()=>(cost)));state.seedLevels[id]++;
    if(id==='gluttony')for(const c of D.characters)if(!state.levels[c.id])state.health[c.id].hp=maxHP(state,c);
    return true;
  }
  function refundSeed(state,id){
    const bought=state.dreamPurchases?.[id];
    if(!state.dreamShop||!bought||(__YggBig.lt(bought.levels,1)))return false;
    const level=state.seedLevels[id];
    // Old saves contain floor-priced purchases; refund only the amount paid.
    let oldTotal=0;
    for(let l=(__YggBig.sub(level,bought.levels));(__YggBig.lt(l,level));l++)(oldTotal=(__YggBig.add(oldTotal,(__YggBig.floor((__YggBig.pow(1.06,l)))))));
    const floorCost=(__YggBig.floor((__YggBig.pow(1.06,(__YggBig.sub(level,1))))));
    const cost=(__YggBig.gt(bought.cost,oldTotal))?(__YggBig.ceil((__YggBig.pow(1.06,(__YggBig.sub(level,1)))))):floorCost;
    if(!Number.isSafeInteger(cost)||(__YggBig.gt(cost,bought.cost)))return false;
    state.seedLevels[id]--;(__YggBig.assign(state,"sinBalance","add",()=>(cost)));bought.levels--;(__YggBig.assign(bought,"cost","sub",()=>(cost)));
    if(!bought.levels)delete state.dreamPurchases[id];
    if(id==='gluttony')for(const c of D.characters){if(!state.levels[c.id])state.health[c.id].hp=maxHP(state,c);else clampHealth(state,c.id);}
    return true;
  }
  function resetDreamPurchases(state){
    if(!state.dreamShop||!Object.keys(state.dreamPurchases||{}).length)return false;
    for(const [id,purchase]of Object.entries(state.dreamPurchases)){(__YggBig.assign(state.seedLevels,id,"sub",()=>(purchase.levels)));(__YggBig.assign(state,"sinBalance","add",()=>(purchase.cost)));}
    state.dreamPurchases={};
    for(const c of D.characters){if(!state.levels[c.id])state.health[c.id].hp=maxHP(state,c);else clampHealth(state,c.id);}
    return true;
  }
  const questChangePending=(state,id=state.sessionId)=>(__YggBig.ne(state.pendingQuestLevels?.[id],undefined));
  const questBusy=ctx=>(__YggBig.gt(ctx.timeline?.manualAttacks?.length||0,0))||(__YggBig.gt(ctx.timeline?.busySeconds||0,1e-8))||ctx.enemies?.some(e=>e.pendingAttack);
  function requestQuestLevel(state,id,level,ctx){
    if(questBusy(ctx)){state.pendingQuestLevels[id]=level;return;}
    delete state.pendingQuestLevels[id];applyQuestLevel(state,id,level,ctx);
  }
  function nextRun(state,now=Date.now()){
    if(!state.dreamShop)return null;
    if(!state.viewingMemories||!isMemoriesUnlocked(state)||(__YggBig.ge(state.runNumber||1,Number.MAX_SAFE_INTEGER)))return null;
    const next=createState(now);
    next.runNumber=(__YggBig.add(state.runNumber||1,1));
    next.previousRunsEarned=incomeRecord(state).allRuns;
    next.rescue={...(state.rescue||newRescue()),open:false};
    refreshQuestUnlocks(state);next.questUnlocks={...state.questUnlocks};next.sessionClears={...state.sessionClears};next.characterUnlocks={...state.characterUnlocks};next.defeatCounts={...state.defeatCounts};
    next.creatorAccess={...state.creatorAccess};next.upgrades.blessing=state.upgrades.blessing||0;next.inventory={...state.inventory};next.muffinLevel=state.muffinLevel||0;next.credits=state.credits||0;
    next.options={...state.options};
    next.seedLevels={...state.seedLevels};next.sinTotal=state.sinTotal;next.sinBalance=state.sinBalance;next.karmaSelections={...state.karmaSelections};
    for(const c of D.characters)next.health[c.id].hp=maxHP(next,c);
    return next;
  }
  const enemyStrength=(session,kind='power')=>kind==='armor'?(session.defenseStrength??session.strength??T.enemyDurability(session.strengthLevel||0,'armor')):kind==='power'?(session.attackStrength??session.strength??T.enemyDurability(session.strengthLevel||0,'power')):session.strength??T.enemyValue(session.strengthLevel||0);
  const sinIncomeMultiplier=state=>(__YggBig.add(1,(__YggBig.mul(state.sinTotal||0,.01))));
  function incomeAmount(state,amount,type='questReward'){
    const unmodified=type==='refund'||type==='migrationRefund'||type==='jewelSideIncome';
    const greed=1;
    return (__YggBig.min(Infinity,(__YggBig.max(0,N.floor((__YggBig.mul((__YggBig.mul(amount,greed)),unmodified?1:(__YggBig.mul(sinIncomeMultiplier(state),state.creatorAccess?.defeated?2:1)))))))));
  }
  function grantIncome(state,amount,type,events=null,detail={}){
    const gain=(__YggBig.min(incomeAmount(state,amount,type),(__YggBig.max(0,(__YggBig.sub(Infinity,state.factors))))));
    (__YggBig.assign(state,"factors","add",()=>(gain)));if(!['refund','migrationRefund'].includes(type)){state.earned=(__YggBig.min(Infinity,(__YggBig.add(state.earned,gain))));if(gain&&incomeObserver)incomeObserver(state.sessionId,gain,type);}
    state.incomeTotals||={};state.incomeTotals[type]=(__YggBig.min(Infinity,(__YggBig.add(state.incomeTotals[type]||0,gain))));refreshQuestUnlocks(state);
    if(events&&gain)events.push({type:'perkIncome',incomeType:type,amount:gain,...detail});return gain;
  }
  function grantPerkIncome(state,amount,perk,events){const gain=Missions.grantCredits(state,amount);if(events&&gain)events.push({type:'perkIncome',currency:'C',amount:gain,actorId:'jewel',perk});return gain;}
  const perkLevel=(state,c)=>state.levels[c.id]||0;
  const questLevel = (state,id=state.sessionId) => D.sessions.find(q=>(__YggBig.eq(q.id,id)))?.fixedLevel ?? state.questActiveLevels?.[id] ?? state.questLevels?.[id] ?? 1;
  const growAction=(base,multiplier)=>(__YggBig.eq(base,0))?0:N.floor((__YggBig.min(Infinity,(__YggBig.mul(base,multiplier)))));
  function sessionAtLevel(session,level){
    level=session.fixedLevel??level;
    // Start every stat at the same inferred growth stage, using its own curve.
    const strengthLevel=(__YggBig.sub((__YggBig.add(T.enemyStageForHP(session.hp,session.initialHP),level)),1));
    const hpStrengthLevel=strengthLevel,strength=T.enemyValue(strengthLevel),hpStrength=T.enemyDurability(strengthLevel,'vitality'),defenseStrength=T.enemyDurability(strengthLevel,'armor');
    return {...session,level,hpStrengthLevel,hpStrength,defenseStrength,attackStrength:T.enemyDurability(strengthLevel,'power'),baseHP:session.hp,strengthLevel,strength,defense:session.defense||0,resistance:session.resistance||0,
      attack:session.attack&&{...session.attack},accuracy:session.accuracy&&{...session.accuracy},evasion:session.evasion&&{...session.evasion},ss:session.ss&&{...session.ss},
      actionMultiplier:(__YggBig.div(strength,D.strength.strengthBase)),
      hp:(__YggBig.max(1,N.floor((__YggBig.min(Infinity,(__YggBig.div((__YggBig.mul(session.hp,hpStrength)),D.strength.strengthBase))))))),reward:N.floor(N.currencyCurve(session.reward,(__YggBig.sub(level,1)),{...D.questGrowth.rewardCurve,transition:session.rewardTransition??D.questGrowth.rewardCurve.transition}))};
  }
  function getSession(state,id=state.sessionId) {
    const session=D.sessions.find(item=>(__YggBig.eq(item.id,id)));
    if(!session)return undefined;
    const q=sessionAtLevel(session,questLevel(state,id));
    const enemies=(__YggBig.eq(id,state.sessionId))?state.enemies:state.sessionStates?.[id]?.enemies;
    if(q.summons&&enemies?.some(e=>e.kind==='kogumo'&&(__YggBig.gt(e.hp,0))))q.traits=[...q.traits,'swarm'];
    return q;
  }
  function requirementMet(state,req){if(req.resource==='blessing')return (__YggBig.eq(state.upgrades.blessing,1));if(req.pending)return false;if(req.resource==='sessionClears')return (__YggBig.ge(D.sessions.filter(q=>q.id!=='scarecrow'&&!q.medical).reduce((n,q)=>(__YggBig.add(n,state.sessionClears?.[q.id]||0)),0),req.amount));if(req.resource.startsWith('clears:'))return (__YggBig.ge(state.sessionClears?.[req.resource.slice(7)]||0,req.amount));return req.resource==='mohicanDefeats'?(__YggBig.ge((__YggBig.add(state.defeatCounts?.['mohican-solo']||0,state.defeatCounts?.mohicans||0)),req.amount)):(__YggBig.isFinite(state[req.resource]||0))&&(__YggBig.ge(state[req.resource]||0,req.amount));}
  function refreshCharacterUnlocks(state){state.characterUnlocks||={};for(const c of D.characters)if((__YggBig.gt(state.levels?.[c.id],0))||(c.recruitUnlock?requirementMet(state,c.recruitUnlock):c.unlockCreditsEarned?(__YggBig.ge(state.creditsEarned||0,c.unlockCreditsEarned)):(__YggBig.ge(state.earned||0,c.unlockEarned||0))))state.characterUnlocks[c.id]=true;}
  function isQuestUnlocked(state,id){const q=D.sessions.find(q=>(__YggBig.eq(q.id,id)));return !!q&&(state.questUnlocks?.[id]===true||(q.unlockRequirement?requirementMet(state,q.unlockRequirement):!q.unlockFactors||(__YggBig.ge(q.unlockByEarned?state.earned:state.factors,q.unlockFactors))));}
  const isMemoriesUnlocked=state=>state.memoriesUnlocked===true||(__YggBig.isFinite(state.factors))&&(__YggBig.ge(state.factors,D.memoryQuest.unlockFactors));
  function refreshQuestUnlocks(state){
    state.creatorAccess||={seen:false,defeated:false};if((__YggBig.ge(state.factors,1e300))||state.upgrades.blessing)state.creatorAccess.seen=true;refreshCharacterUnlocks(state);state.memoriesUnlocked=isMemoriesUnlocked(state);
    state.questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,isQuestUnlocked(state,q.id)]));
  }
  const newAutoRest=()=>({enabled:false,kills:0,minutes:0,restMinutes:5,elapsed:0,defeats:0,remaining:0});
  const restOf=(state,id=state.sessionId)=>state.autoRest?.[id]||newAutoRest();
  const isResting=(state,id=state.sessionId)=>(__YggBig.gt(restOf(state,id).remaining,0));
  function setAutoRest(state,id,settings){
    if(!D.sessions.some(q=>(__YggBig.eq(q.id,id)))||typeof settings.enabled!=='boolean'||!Number.isSafeInteger(settings.kills)||(__YggBig.lt(settings.kills,0))||(__YggBig.gt(settings.kills,1e9))||!(__YggBig.isFinite(settings.minutes))||(__YggBig.lt(settings.minutes,0))||(__YggBig.gt(settings.minutes,1e6))||!(__YggBig.isFinite(settings.restMinutes))||(__YggBig.lt(settings.restMinutes,(__YggBig.div(1,60))))||(__YggBig.gt(settings.restMinutes,1e6))||settings.enabled&&!settings.kills&&!settings.minutes)return false;
    state.autoRest||={};const old=restOf(state,id);
    if(['enabled','kills','minutes','restMinutes'].some(k=>(__YggBig.ne(old[k],settings[k]))))state.autoRest[id]={...newAutoRest(),...Object.fromEntries(['enabled','kills','minutes','restMinutes'].map(k=>[k,settings[k]]))};
    return true;
  }
  function checkAutoRest(state){const r=restOf(state);if(r.enabled&&!r.remaining&&formationIds(state).length&&((r.kills&&(__YggBig.ge(r.defeats,r.kills)))||(r.minutes&&(__YggBig.ge((__YggBig.add(r.elapsed,1e-9)),(__YggBig.mul(r.minutes,60)))))))r.remaining=(__YggBig.mul(r.restMinutes,60));}
  function restBoundary(state){const r=restOf(state);return !r.enabled||!formationIds(state).length?Infinity:r.remaining|| (r.minutes?(__YggBig.max(1e-9,(__YggBig.sub((__YggBig.mul(r.minutes,60)),r.elapsed)))):Infinity);}
  function advanceRest(state,seconds){const r=restOf(state);if(!r.enabled||!formationIds(state).length)return;if(r.remaining){r.remaining=(__YggBig.max(0,(__YggBig.sub(r.remaining,seconds))));if((__YggBig.lt(r.remaining,1e-9))){r.remaining=0;r.elapsed=0;r.defeats=0;}}else {r.elapsed=(__YggBig.min(Infinity,(__YggBig.add(r.elapsed,seconds))));checkAutoRest(state);}}
  function createState(now = Date.now()) {
    return { autoRest:Object.fromEntries(D.sessions.map(q=>[q.id,newAutoRest()])),perkRefunded:true,perkEnabled:Object.fromEntries(D.characters.map(c=>[c.id,Object.fromEntries((c.perks||[]).map(p=>[p.id,!!(p.initial||p.awakeningLevel||p.mandatory)]))])),
      unlockedPerks:Object.fromEntries(D.characters.map(c=>[c.id,[]])),runaway:Object.fromEntries(D.characters.map(c=>[c.id,newRunaway(c)])),incomeTotals:{},
      seedLevels:Object.fromEntries(Object.keys(D.seedSystem.effects).map(k=>[k,0])),karmaSelections:{},sinTotal:0,sinBalance:0,dreamShop:false,dreamGain:0,dreamPurchases:{},pendingQuestLevels:{},
      creatorAccess:{seen:false,defeated:false},characterUnlocks:{},defeatCounts:{},sessionClears:{},rescue:newRescue(), inventory:{}, missions:{}, muffinLevel:0, credits:0, creditsEarned:0, factors: D.balance.initialFactors, earned: 0, previousRunsEarned: 0, runNumber:1, kills: 0, clicks: 0, totalDamage: 0,
      viewingMemories:false, memoriesUnlocked:false, sessionId: D.sessions[0].id, hp: D.sessions[0].hp, poisonDamage:0, paused: false, battleSpeed:1, options: {...D.displayDefaults},
      siblingMarks:{},rainbowTurns:0, floorClipTargetId:null, floorClipTurns:0, respawnSeconds:0, sessionStates:{}, enemies:null, nextEnemyId:0, focusedEnemyId:null,
      health:Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}])),
      formationRows:Object.fromEntries(D.characters.map(c=>[c.id,'front'])),
      formations: Object.fromEntries(D.sessions.map(s=>[s.id,null])),
      concentration: Object.fromEntries(D.characters.map(c=>[c.id,emptyConcentration()])),
      questUnlocks: Object.fromEntries(D.sessions.map(q=>[q.id,q.unlockRequirement?(__YggBig.eq(q.unlockRequirement.amount,0)):!q.unlockFactors])),
      questActiveLevels: {},
      questLevels: Object.fromEntries(D.sessions.map(s=>[s.id,1])), sceneSeconds:0, batchHpFraction:0,batchDamageFraction:0,
      levels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      timeline:newTimeline(),actionPoints: Object.fromEntries(D.characters.map(c => [c.id, 0])), actionClock: 0, selectedCharacterId: null,
      purchasedPerks: Object.fromEntries(D.characters.map(c => [c.id, []])),
      upgrades: Object.fromEntries(D.upgrades.map(u => [u.id, 0])), savedAt: now };
  }
  const BATTLE_FIELDS=['siblingMarks','timeline','hp','poisonDamage','batchHpFraction','batchDamageFraction','respawnSeconds','selectedCharacterId','enemies','nextEnemyId','focusedEnemyId','floorClipTargetId','floorClipTurns','rainbowTurns'];
  const respawnDelay=()=>5;
  const isWaiting=state=>getSession(state).medical?false:state.enemies?state.enemies.every(e=>(__YggBig.le(e.hp,0))):(__YggBig.gt(state.respawnSeconds||0,0));
  function battleSnapshot(state){return Object.fromEntries(BATTLE_FIELDS.map(k=>[k,k==='siblingMarks'?structuredClone(state.siblingMarks||{}):k==='timeline'?structuredClone(state.timeline||newTimeline()):k==='enemies'?(state.enemies?structuredClone(state.enemies):null):state[k]??(['selectedCharacterId','focusedEnemyId','floorClipTargetId'].includes(k)?null:0)]));}
  function battleContext(state,id=state.sessionId){
    if((__YggBig.eq(id,state.sessionId)))return state;
    return {...state,siblingMarks:{},timeline:newTimeline(),rainbowTurns:0,floorClipTargetId:null,floorClipTurns:0,hp:getSession(state,id).hp,poisonDamage:0,batchHpFraction:0,batchDamageFraction:0,respawnSeconds:0,selectedCharacterId:null,enemies:null,nextEnemyId:0,focusedEnemyId:null,
      ...state.sessionStates?.[id],sessionId:id,formations:Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]))};
  }
  // Only the initially viewed, untouched quest auto-fills unassigned recruits.
  // Explicit parties own their members even while another quest is on screen.
  function formationIds(state,id=state.sessionId){
    const chosen=state.formations?.[id];
    if(Array.isArray(chosen))return chosen.filter(x=>(__YggBig.gt(state.levels[x],0))).slice(0,partyCapacity(id));
    if((__YggBig.ne(id,state.sessionId)))return [];
    const assigned=new Set(D.sessions.filter(q=>(__YggBig.ne(q.id,id))).flatMap(q=>state.formations?.[q.id]||[]));
    return D.characters.filter(c=>(__YggBig.gt(state.levels[c.id],0))&&!assigned.has(c.id)&&!Missions.busy(state,c.id)).map(c=>c.id).slice(0,partyCapacity(id));
  }
  const formationOwner=(state,id)=>D.sessions.find(q=>formationIds(state,q.id).includes(id))?.id||null;
  const isDeployed=(state,id)=>formationIds(state).includes(id);
  const activeCharacters=state=>D.characters.filter(c=>canAct(state,c.id));
  function setFormation(state,questId,ids,rows=state.formationRows){
    if(!isQuestUnlocked(state,questId)||!Array.isArray(ids)||(__YggBig.gt(ids.length,partyCapacity(questId)))||(__YggBig.ne(new Set(ids).size,ids.length))||ids.some(id=>!D.characters.some(c=>(__YggBig.eq(c.id,id)))||!state.levels[id]))return false;
    if(ids.some(id=>Missions.busy(state,id)))return false;
    if(ids.some(id=>(__YggBig.ne(rows?.[id],undefined))&&!['front','rear'].includes(rows[id])))return false;
    for(const id of ids)if((__YggBig.ne(formationOwner(state,id),questId)))healthOf(state,id).regenSeconds=0;
    state.formationRows={...state.formationRows,...Object.fromEntries(ids.map(id=>[id,rows?.[id]||'front']))};
    refreshQuestUnlocks(state);
    const rosters=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,(__YggBig.eq(q.id,questId))?[...ids]:rosters[q.id].filter(id=>!ids.includes(id))]));
    for(const q of D.sessions){
      const ctx=battleContext(state,q.id);
      if(!formationIds(ctx).length&&state.autoRest?.[q.id])Object.assign(state.autoRest[q.id],{elapsed:0,defeats:0,remaining:0});
      if(!isDeployed(ctx,'jewel'))ctx.rainbowTurns=0;
      if(ctx.selectedCharacterId&&!isDeployed(ctx,ctx.selectedCharacterId))ctx.selectedCharacterId=null;
      const changed=(__YggBig.ne(rosters[q.id].join(','),formationIds(ctx).join(',')));
      if((__YggBig.eq(q.id,questId))||changed)resetFormationEnemies(ctx);
      normalizeEnemyActions(ctx);refreshFloorClip(ctx,changed);
      if((__YggBig.ne(q.id,state.sessionId)))state.sessionStates={...state.sessionStates,[q.id]:battleSnapshot(ctx)};
    }
    return true;
  }
  // Rebuilding a party starts a fresh enemy encounter; ally health/progression are retained.
  function resetFormationEnemies(ctx){
    ctx.siblingMarks={};ctx.enemies=null;ctx.hp=getSession(ctx).hp;ctx.poisonDamage=0;ctx.respawnSeconds=0;
    ctx.batchHpFraction=0;ctx.batchDamageFraction=0;ctx.focusedEnemyId=null;
    ctx.timeline||=newTimeline();delete ctx.timeline.manualAttacks;delete ctx.timeline.busySeconds;
    for(const key of Object.keys(ctx.timeline.priorities))if(key.startsWith('e:'))delete ctx.timeline.priorities[key];
    ensureEnemies(ctx);
  }
  function concentrationResetCost(state,id){const c=D.characters.find(c=>(__YggBig.eq(c.id,id)));return c&&state.levels[id]?(__YggBig.max(1,N.floor((__YggBig.mul(trainingInvestment(state,c),.05))))):Infinity;}
  function resetConcentration(state,id){
    const cost=concentrationResetCost(state,id);
    if(!(__YggBig.isFinite(cost))||(__YggBig.lt(state.factors,cost))||!Object.values(concentration(state,id)).some(n=>(__YggBig.gt(n,0))))return false;
    (__YggBig.assign(state,"factors","sub",()=>(cost)));setConcentration(state,id,emptyConcentration());return true;
  }
  const emptyConcentration=()=>Object.fromEntries(D.concentration.map(t=>[t.id,0]));
  const concentration=(state,id)=>Object.fromEntries(D.concentration.map(t=>[t.id,state.concentration?.[id]?.[t.id]||0]));
  const concentrationPoints=(state,id)=>(__YggBig.max(0,(__YggBig.sub(state.levels[id]||0,1))));
  function clampHealth(state,id){const c=D.characters.find(c=>(__YggBig.eq(c.id,id))),h=state.health[id],max=maxHP(state,c);h.hp=(__YggBig.min(h.hp,max));if((__YggBig.eq(h.hp,max))){delete h.revivalTurns;delete h.revivalSeconds;h.status='active';h.regenSeconds=0;}normalizeMagic(state,c);}
  function setConcentration(state,id,allocation){
    if(!D.characters.some(c=>(__YggBig.eq(c.id,id)))||!allocation||Object.keys(allocation).some(k=>!D.concentration.some(t=>(__YggBig.eq(t.id,k)))))return false;
    if(D.concentration.some(t=>!Number.isSafeInteger(allocation[t.id])||(__YggBig.lt(allocation[t.id],0)))||(__YggBig.gt(Object.values(allocation).reduce((n,v)=>(__YggBig.add(n,v)),0),concentrationPoints(state,id))))return false;
    state.concentration={...state.concentration,[id]:{...allocation}};if(state.health?.[id])clampHealth(state,id);return true;
  }
  // Empty and incapacitated parties cannot bank enemy action points. Pending
  // attacks also end as soon as their original target leaves or falls.
  function normalizeEnemyActions(state,events){
    const owner=state.health.richter;
    if(owner&&(owner.status!=='active'||state.runaway?.richter?.runawayCollapsed)){delete owner.pomBombs;delete owner.pomBonus;}
    clearBurns(state);
    const active=activeCharacters(state);
    if(state.timeline){if(isWaiting(state)||isResting(state)||!active.length)state.timeline.priorities={};else for(const key of Object.keys(state.timeline.priorities)){const alive=key.startsWith('a:')?canAct(state,key.slice(2))&&!((__YggBig.gt(healthOf(state,key.slice(2)).summonDelaySeconds,0))):state.enemies?.some(e=>(__YggBig.eq((__YggBig.add('e:',e.id)),key))&&(__YggBig.gt(e.hp,0))&&!e.respawnSeconds&&!((__YggBig.gt(e.summonDelaySeconds,0))));if(!alive)delete state.timeline.priorities[key];}}
    if(isWaiting(state))for(const id of formationIds(state))state.actionPoints[id]=0;
    for(const [slot,e]of (state.enemies||[]).entries()){
      if(!active.length)e.actionPoints=0;
      if(e.pendingAttack&&(!active.length||!['ward','revive'].includes(e.pendingAttack.kind)&&!canAct(state,e.pendingAttack.targetId))){
        e.pendingAttack=null;if(events)events.push({type:'enemyCancel',enemyId:e.id,targetSlot:slot});
      }
    }
  }
  function refreshPerkUnlocks(state){
    state.unlockedPerks||={};state.perkEnabled||={};
    for(const c of D.characters){const list=state.unlockedPerks[c.id]||=([]),enabled=state.perkEnabled[c.id]||={};
      for(const p of c.perks||[])if((__YggBig.gt(state.levels[c.id],0))&&(__YggBig.ge(perkLevel(state,c,p),p.level))){if(!list.includes(p.id))list.push(p.id);if((__YggBig.eq(enabled[p.id],undefined)))enabled[p.id]=!!(p.initial||p.awakeningLevel);}
    }
  }
  function perks(state,character){
    return (character.perks||[]).map(perk=>{
      const level=perkLevel(state,character,perk),eligible=(__YggBig.gt(state.levels[character.id],0))&&(__YggBig.ge(level,perk.level));
      const owned=eligible||(state.unlockedPerks?.[character.id]||[]).includes(perk.id)||(state.purchasedPerks?.[character.id]||[]).includes(perk.id);
      const enabled=(perk.awakeningLevel||perk.mandatory)?true:state.perkEnabled?.[character.id]?.[perk.id]??(!!perk.initial||(state.purchasedPerks?.[character.id]||[]).includes(perk.id));
      const failure=state.perkFailures?.[character.id],fails=failure==='all'||failure==='support'&&['support','special'].includes(perk.effectClass);
      const rateReady=(__YggBig.eq(perk.minRunaway,undefined))||(__YggBig.ge(runawayOf(state,character.id).runawayRate,perk.minRunaway));
      const awakened=rateReady&&(!perk.awakeningLevel||(runawayOf(state,character.id).activationType==='awakening'&&(__YggBig.ge(activation(state,character).stacks,perk.awakeningLevel))));
      const unlocked=eligible&&awakened&&enabled&&healthOf(state,character.id).status==='active'&&!runawayOf(state,character.id).runawayCollapsed&&!fails;
      return {...perk,owned,enabled,unlocked,eligible,dice:unlocked?(__YggBig.add(perk.diceBonus||0,perk.diceEvery?(__YggBig.floor((__YggBig.div(state.levels[character.id]||0,perk.diceEvery)))):0)):0};
    });
  }
  const areaApplies = (perk,session) => perk.areaAttack && (!perk.areaTrait || (session.traits||[]).includes(perk.areaTrait));
  const hasAreaAttack = (state, character, session=getSession(state)) => !!character && perks(state, character).some(p => p.unlocked && areaApplies(p,session));
  function attackBreakdown(state, character, manual = false, session = getSession(state), target = profileTarget(state,character)) {
    const distance=character?combatDistance(state,character.id,target):1;
    const active = character ? rangedPerks(state,character,distance).map(p=>elementalPerk(p,session)) : [];
    const replacement = active.find(p => p.baseAttack);
    const magic=magicState(state,character);
    const base = replacement?.baseAttack || character || { dice:D.balance.manualDice, flat:D.balance.manualFlat };
    const mental=(replacement?.attackType||character?.attackType)==='mental',apAttack=!!replacement?.apAttack;
    const penetrationBlocked = active.some(p => p.ignoreDefense) && (session.traits||[]).includes('penetrationImmune');
    const ignoreDefense = active.some(p => p.ignoreDefense) && !penetrationBlocked;
    return {
      attackElements:[...new Set([...(character?.attackElements||[]),...active.flatMap(p=>p.attackElements||[])])],
      base:{ dice:base.dice, flat:base.flat, source:replacement?.name || '' },
      perk:{ dice:active.reduce((n,p) => (__YggBig.add((__YggBig.add(n,p.dice)),apAttack?p.apDiceBonus||0:0)), 0), flat:(__YggBig.add((__YggBig.add((__YggBig.add(active.reduce((n,p) => (__YggBig.add(n,p.flat||0)), 0),(__YggBig.mul(magic.current,magicPerPoint(state,character))))),character?.id==='cherry'&&cherryPerk(state,'dominance')?(state.health.cherry.fireBonus||0):0)),character?.id==='jewel'&&(__YggBig.eq(distance,1))&&rainbowActive(state)?15:0)),
        conditional:active.reduce((n,p) => (__YggBig.add(n,p.targetTrait && (session.traits || []).includes(p.targetTrait) ? p.damageBonus || 0 : 0)), 0) },
      upgrade:{ flat:0, rate:0 },
      item:{ flat:0 },
      levelMultiplier:1,
      defense:ignoreDefense ? 0 : mental ? session.resistance||0 : enemyDefense(session), mental, apAttack, ignoreDefense, penetrationBlocked,
      areaAttack:active.some(p => areaApplies(p,session)),
      afterAttackStun:(__YggBig.max(0,...active.map(p=>p.afterAttackStun||0))),noAreaPenalty:active.some(p=>p.noAreaPenalty),magicLevel:magic.current,magicMaximum:magic.maximum,blastEvasionPerMagic:(__YggBig.max(0,...active.map(p=>p.blastEvasionPerMagic||0))),
      defenseReduction:(__YggBig.max(0,...active.map(p=>p.defenseReduction||0))),
      apReductionRate:(__YggBig.max(0,...active.map(p=>p.apReductionRate||0))),
      apReduction:active.reduce((n,p)=>(__YggBig.add(n,p.apReduction||0)),0),tauntId:active.some(p=>p.taunt)?character.id:null,
      accuracyRetries:(__YggBig.max(0,...active.map(p=>p.accuracyRetries||0))),enemyCriticalRetries:(__YggBig.max(0,...active.map(p=>p.enemyCriticalRetries||0))),sightDebuff:active.some(p=>p.sightDebuff)?{accuracy:active.some(p=>p.sightDebuffUpgrade)?10:4,evasion:active.some(p=>p.sightDebuffUpgrade)?5:4,turns:3}:null,confusion:active.some(p=>p.confusion)?{releaseChance:(__YggBig.max(0,(__YggBig.sub(.4,active.reduce((n,p)=>(__YggBig.add(n,p.confusionReleaseReduction||0)),0))))),friendlyFire:active.some(p=>p.confusionFriendlyFire)}:null,accuracyPenaltyChance:(__YggBig.max(0,...active.map(p=>p.accuracyPenaltyChance||0))),
      accuracyPenalty:(__YggBig.max(0,...active.map(p=>p.accuracyPenalty||0))),
      extraAttackChance:(__YggBig.max(0,...active.map(p=>p.extraAttackChance||0))),
      autoHitChance:(__YggBig.max(0,...active.map(p=>p.autoHitChance||0))),evasionFailureChance:(__YggBig.max(0,...active.map(p=>p.evasionFailureChance||0))),doubleHitDamage:active.reduce((n,p)=>(__YggBig.add(n,p.doubleHitDamage||0)),0),
      poisonDamage:active.some(p=>p.inflictPoison)?N.floor((__YggBig.min(Infinity,(__YggBig.mul((__YggBig.add((__YggBig.max(0,...active.map(p=>p.poisonDamage||0))),active.reduce((n,p)=>(__YggBig.add(n,p.poisonBonus||0)),0))),(__YggBig.pow((__YggBig.div(strengthValue(state,character,'power'),D.strength.strengthBase)),(__YggBig.max(0,...active.map(p=>p.poisonStrengthExponent||0)))))))))):0
    };
  }
  function stats(state, character) {
    const {base, perk} = attackBreakdown(state, character);
    return { dice:(__YggBig.add(base.dice,perk.dice)), flat:(__YggBig.add(base.flat,perk.flat)) };
  }
  const selectedCharacter = state => D.characters.find(c => (__YggBig.eq(c.id,state.selectedCharacterId)) && isDeployed(state,c.id)) || null;
  function manualStats(state) {
    const character = selectedCharacter(state);
    const base = character ? stats(state, character) : { dice: D.balance.manualDice, flat: D.balance.manualFlat };
    return { dice:base.dice, flat:base.flat };
  }
  function selectCharacter(state, id) {
    if (id !== null && !D.characters.some(c => (__YggBig.eq(c.id,id)) && isDeployed(state,id))) return false;
    state.selectedCharacterId = id;
    return true;
  }
  function sawCount(state) {
    const total = orbitCount(state, 'meta');
    return { total, visible: (__YggBig.min(total,D.metaVisual.maxVisibleSaws)) };
  }
  function bombCount(state) {
    const total = orbitCount(state, 'richter');
    return { total, visible: (__YggBig.min(total,D.richterVisual.maxVisibleBombs)) };
  }
  function orbitCount(state, id) {
    return canAct(state,id) ? (__YggBig.min(Number.MAX_SAFE_INTEGER,state.levels[id] || 0)) : 0;
  }
  function weaponScale(state, id) {
    const level = (__YggBig.max(1,state.levels[id] || 0));
    return (__YggBig.add(1,(__YggBig.mul((__YggBig.log2(level)),D.balance.weaponSizePerDoubling))));
  }
  const enemyDefense = session => (__YggBig.max(0,(__YggBig.floor(session.defense || 0))));
  function attackProfile(state, character, manual = false, session = getSession(state), target = profileTarget(state,character)) {
    if(session.members&&target)session=enemySpec(state,target);
    const breakdown = attackBreakdown(state, character, manual, session,target), b = breakdown;
    const distance=character?combatDistance(state,character.id,target):1;
    const attackStrength=character?strengthValue(state,character,'power'):D.strength.strengthBase;
    // Penetration removes base mitigation, never the strength comparison or scale.
    const defenseStrength=enemyStrength(session,'armor');
    return {attackElements:b.attackElements,damageElementMultiplier:attributeMultiplier(session,b.attackElements),actorId:character?.id||null,distance,motion:attackMotion(state,character,distance),reachable:!character||canReach(state,character,target), fixedDamage:character?null:1, apAttack:b.apAttack,hiddenAttack:!!character?.hiddenAttack, accuracy:character?accuracySpec(state,character,b.mental):null, evasion:b.mental?session.ss:session.evasion,
      hitLogRatio:T.relativeLog(character?strengthValue(state,character,'accuracy'):D.strength.strengthBase,enemyStrength(session,'evasion')),
      damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength),
      resultScale:character&&runawayOf(state,character.id).runawaySymptom==='body'?.5:1,
      dice:(__YggBig.add((__YggBig.add(b.base.dice,b.perk.dice)),character?activation(state,character).dice:0)), flat:(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(b.base.flat,b.perk.flat)),b.upgrade.flat)),b.item.flat)),character?activation(state,character).damage:0)),
      bonus:b.perk.conditional, multiplier:(__YggBig.mul((__YggBig.add(1,b.upgrade.rate)),b.levelMultiplier)),
      autoHitChance:b.autoHitChance,evasionFailureChance:b.evasionFailureChance,doubleHitDamage:b.doubleHitDamage,
      defense:b.defense, mental:b.mental, ignoreDefense:b.ignoreDefense, penetrationBlocked:b.penetrationBlocked, areaAttack:b.areaAttack, extraAttackChance:b.extraAttackChance,poisonDamage:b.poisonDamage,defenseReduction:b.defenseReduction,apReductionRate:b.apReductionRate,apReduction:b.apReduction,tauntId:b.tauntId,accuracyRetries:b.accuracyRetries,enemyCriticalRetries:b.enemyCriticalRetries,sightDebuff:b.sightDebuff,confusion:b.confusion,accuracyPenaltyChance:b.accuracyPenaltyChance,accuracyPenalty:b.accuracyPenalty,
      afterAttackStun:b.afterAttackStun,noAreaPenalty:b.noAreaPenalty,magicLevel:b.magicLevel,magicMaximum:b.magicMaximum,blastEvasionPerMagic:b.blastEvasionPerMagic,
      minimumLevelBonus:0,preLevelMultiplier:(__YggBig.add(1,b.upgrade.rate)),
      overkillThreshold:state.upgrades.overkill ? D.upgrades.find(u=>u.id==='overkill').threshold : 0, breakdown };
  }
  const reward = (state, session = getSession(state)) => (__YggBig.min(Infinity,session.reward));
  const overkillBonus = (state,session=getSession(state)) => state.upgrades.overkill ? N.delta((__YggBig.mul(reward(state,session),D.upgrades.find(u=>u.id==='overkill').bonusRate))) : 0;
  // Each repeatable purchase track has its own unrounded geometric curve.
  // Recompute from the level rather than multiplying an already rounded price.
  const geometricCost = (base, purchases, growth = D.balance.purchaseCostGrowth) => N.geometric(base,growth,purchases);
  function questCost(state,id=state.sessionId) {
    const session=D.sessions.find(s=>(__YggBig.eq(s.id,id))),level=state.questLevels?.[id]??1;
    if(!session || session.fixedLevel || session.medical || !Number.isSafeInteger((__YggBig.add(level,1))))return Infinity;
    // Each quest starts at 20 times its unmodified initial reward.
    // Retain the existing growth curve and late reward-based ceiling.
    const base=(__YggBig.mul(session.costRewardBase??session.reward,D.questGrowth.costRewardMultiplier));
    const next=sessionAtLevel(session,(__YggBig.add(level,1))),cost=(__YggBig.min(geometricCost(base,(__YggBig.sub(level,1)),D.questGrowth.costGrowth),N.floor(N.currencyCurve(base,(__YggBig.sub(level,1)),D.questGrowth.rewardCurve))));
    return [next.hp,next.reward,cost].every(v=>(__YggBig.isFinite(v))&&(__YggBig.le(v,Infinity)))?cost:Infinity;
  }
  function applyQuestLevel(state,id,level,ctx,oldHP){
    const waits=(ctx.enemies||[]).map(e=>e.kind!=='kogumo'?(e.respawnSeconds||0):0);
    state.questActiveLevels={...state.questActiveLevels,[id]:level};ctx.questActiveLevels=state.questActiveLevels;
    const maximum=getSession(state,id).hp;
    for(const actorId of formationIds(ctx)){state.actionPoints[actorId]=0;}
    ctx.enemies=null;ctx.hp=maximum;ctx.poisonDamage=0;ctx.respawnSeconds=0;ensureEnemies(ctx);
    for(const [i,e]of ctx.enemies.entries())if((__YggBig.gt(waits[i],0))){e.hp=0;e.respawnSeconds=waits[i];e.pendingAttack=null;}
    if(ctx.timeline)for(const key of Object.keys(ctx.timeline.priorities))if(key.startsWith('e:'))delete ctx.timeline.priorities[key];ctx.focusedEnemyId=null;ctx.floorClipTargetId=null;ctx.floorClipTurns=0;ctx.rainbowTurns=0;
    syncFront(ctx);ctx.batchHpFraction=0;ctx.batchDamageFraction=0;
    if((__YggBig.ne(id,state.sessionId)))state.sessionStates={...state.sessionStates,[id]:battleSnapshot(ctx)};
  }
  function setQuestLevel(state,id,level){
    if(D.sessions.find(q=>(__YggBig.eq(q.id,id)))?.fixedLevel)return false;
    if(!isQuestUnlocked(state,id)||!Number.isSafeInteger(level)||(__YggBig.lt(level,1))||(__YggBig.gt(level,state.questLevels[id]||1)))return false;
    if((__YggBig.eq(level,questLevel(state,id)))){delete state.pendingQuestLevels[id];return true;}
    const ctx=battleContext(state,id),oldHP=getSession(ctx).hp;ensureEnemies(ctx);refreshQuestUnlocks(state);
    requestQuestLevel(state,id,level,ctx);return true;
  }
  function buyQuest(state,id){
    const cost=questCost(state,id);if(!isQuestUnlocked(state,id)||!(__YggBig.isFinite(cost))||(__YggBig.lt(state.factors,cost)))return false;
    const ctx=battleContext(state,id),oldHP=getSession(ctx).hp;ensureEnemies(ctx);refreshQuestUnlocks(state);
    (__YggBig.assign(state,"factors","sub",()=>(cost)));state.questLevels[id]++;
    requestQuestLevel(state,id,state.questLevels[id],ctx);return true;
  }
  const isCharacterUnlocked=(state,c)=>{refreshCharacterUnlocks(state);return !!c&&!!state.characterUnlocks[c.id];};
  const hireCurrency=(state,c)=>(__YggBig.eq(state.levels[c.id],0))?(c.hireCurrency||'factors'):'factors';
  const hireCost = (state, c) => (__YggBig.eq(state.levels[c.id],0)) ? (c.hirePending?Infinity:(c.hirePrice??c.cost))
    : geometricCost(c.powerCost, (__YggBig.sub(state.levels[c.id],1)));
  function supportPerks(state) {
    return activeCharacters(state).flatMap(c=>perks(state,c).filter(p=>p.unlocked));
  }
  function actionPower(state,c,baseRoll=c.action,includeDown=false,random=null) {
    if(!includeDown&&healthOf(state,c.id).status!=='active')return 0;
    const active=isDeployed(state,c.id)?supportPerks(state):[];
    const bonusDice=(__YggBig.add(active.reduce((n,p)=>(__YggBig.add(n,p.partyActionDice||0)),0),activation(state,c).dice));
    const fixed=(__YggBig.add((__YggBig.add((__YggBig.add(baseRoll,activation(state,c).action)),active.reduce((n,p)=>(__YggBig.add(n,p.partyAction||0)),0))),ownActionBonus(state,c)));
    const calculate=extra=>{const withAllies=(__YggBig.add(fixed,extra));
      const supported=(__YggBig.eq(state.selectedCharacterId,c.id)) ? N.linear(withAllies,active.reduce((n,p)=>(__YggBig.add(n,p.selectedActionRate||0)),0),1) : withAllies;
      return growAction(supported,(__YggBig.div(strengthValue(state,c,'action'),D.strength.strengthBase)));};
    if(random||!bonusDice)return calculate(random?roll(bonusDice,0,random):0);
    // Forecasts retain fractional expectations; actual action weights retain their integer rolls.
    let distribution=new Map([[0,1]]);for(let i=0;(__YggBig.lt(i,bonusDice));i++){const next=new Map();for(const [sum,p]of distribution)for(let face=1;(__YggBig.le(face,6));face++)next.set((__YggBig.add(sum,face)),(__YggBig.add(next.get((__YggBig.add(sum,face)))||0,p)));distribution=next;}
    return (__YggBig.div([...distribution].reduce((n,[sum,p])=>(__YggBig.add(n,(__YggBig.mul(calculate(sum),p)))),0),(__YggBig.pow(6,bonusDice))));
  }
  const freeActionChance = (state,c) => isDeployed(state,c.id)&&(__YggBig.eq(state.selectedCharacterId,c.id)) ? (__YggBig.max(0,...supportPerks(state).map(p=>p.freeActionChance||0))) : 0;
  // A zero base has no meaningful relative multiplier; the UI shows absolute action power.
  function enemyActionValue(q,raw){
    const base=raw??(q.actionDice?(__YggBig.add(q.actionDice.flat,(__YggBig.mul(q.actionDice.dice,3.5)))):q.action||0);
    return growAction(base,q.actionMultiplier);
  }
  const enemyActionPower=(state,raw,enemy=null)=>{
    const q=enemySpec(state,enemy),base=raw??(q.actionDice?(__YggBig.add(q.actionDice.flat,(__YggBig.mul(q.actionDice.dice,3.5)))):q.action||0);
    const rate=(__YggBig.max(0,(__YggBig.sub(1,supportPerks(state).reduce((n,p)=>(__YggBig.add(n,p.enemyActionReduction||0)),0)))));
    return (__YggBig.floor((__YggBig.add((__YggBig.mul(enemyActionValue(q,(__YggBig.max(0,(__YggBig.sub(base,(__YggBig.gt(enemy?.slowSeconds||0,0))?enemy.actionPenalty||0:0))))),rate)),1e-9))));
  };
  const newTimeline=()=>({priorities:{},turns:0});
  // Scientific weights preserve relative action rates beyond native Number range.
  const actionWeight=value=>(__YggBig.isFinite(value))?(__YggBig.max(0,(__YggBig.min(Infinity,value)))):0;
  function smoothTurn(units,priorities){
    const maximum=(__YggBig.max(0,...units.map(u=>u.weight)));if(!maximum){for(const key of Object.keys(priorities))delete priorities[key];return null;}
    const total=units.reduce((n,u)=>(__YggBig.add(n,u.weight)),0);let winner=null,highest=(__YggBig.neg(Infinity));
    const live=new Set(units.map(u=>u.key));for(const key of Object.keys(priorities))if(!live.has(key))delete priorities[key];
    units.forEach(u=>{const p=(__YggBig.add((__YggBig.max((__YggBig.mul((__YggBig.neg(2)),total)),(__YggBig.min((__YggBig.mul(2,total)),priorities[u.key]||0)))),u.weight));priorities[u.key]=p;if((__YggBig.gt(p,highest))){highest=p;winner=u;}});
    (__YggBig.assign(priorities,winner.key,"sub",()=>(total)));return winner;
  }
  // Summoning delay only restricts automatic turn allocation, not targeting.
  const SUMMON_DELAY_SECONDS=5;
  function markSummoned(unit){unit.summonDelaySeconds=SUMMON_DELAY_SECONDS;return unit;}
  function elapseSummonDelay(unit,seconds){if((__YggBig.gt(unit.summonDelaySeconds,0))){unit.summonDelaySeconds=(__YggBig.max(0,(__YggBig.sub(unit.summonDelaySeconds,seconds))));if((__YggBig.lt(unit.summonDelaySeconds,1e-9)))unit.summonDelaySeconds=0;}}
  function timelineUnits(state,random=null){
    if(getSession(state).medical||isResting(state)||isWaiting(state)||!activeCharacters(state).length)return [];
    const result=[];
    for(const c of activeCharacters(state))if(canTakeAction(state,c)&&!((__YggBig.gt(healthOf(state,c.id).summonDelaySeconds,0)))){
      const raw=random?(c.actionDice?roll(c.actionDice.dice,c.actionDice.flat,random):c.action):c.action;
      const h=healthOf(state,c.id),value=actionPower(state,c,raw,!random,random),weight=actionWeight((__YggBig.mul(value,(__YggBig.gt(h.turnSlowSeconds,0))?(__YggBig.sub(1,h.turnSlowRate||0)):1)));
      if((__YggBig.gt(weight,0)))result.push({key:(__YggBig.add('a:',c.id)),id:c.id,name:c.name,side:'ally',actor:c,action:value,weight});
    }
    for(const e of [...ensureEnemies(state)].sort((__YggBig.sort((a,b)=>(__YggBig.sub(a.id,b.id))))))if((__YggBig.gt(e.hp,0))&&!e.respawnSeconds&&!e.pendingAttack&&!((__YggBig.gt(e.summonDelaySeconds,0)))&&enemyTargetCandidates(state,e).length){
      const q=enemySpec(state,e),raw=random&&q.actionDice?roll(q.actionDice.dice,q.actionDice.flat,random):undefined;
      const value=enemyActionPower(state,raw,e),weight=actionWeight((__YggBig.mul(value,(__YggBig.gt(e.turnSlowSeconds,0))?(__YggBig.sub(1,e.turnSlowRate||0)):1)));
      if((__YggBig.gt(weight,0)))result.push({key:(__YggBig.add('e:',e.id)),id:e.id,name:q.enemy||q.name,side:'enemy',enemy:e,action:value,weight});
    }
    return result;
  }
  function timelineView(state,count=8){
    const units=timelineUnits(state),maximum=(__YggBig.max(0,...units.map(u=>u.weight))),total=units.reduce((n,u)=>(__YggBig.add(n,maximum?(__YggBig.div(u.weight,maximum)):0)),0),priorities={...(state.timeline?.priorities||{})};
    const order=[];for(let i=0;(__YggBig.lt(i,(__YggBig.min(10,(__YggBig.max(0,count))))));i++){const u=smoothTurn(units,priorities);if(u)order.push({key:u.key,name:u.name});}
    return {units:units.map(u=>({key:u.key,id:u.id,name:u.name,side:u.side,action:u.action,weight:u.weight,share:total?(__YggBig.div((__YggBig.div(u.weight,maximum)),total)):0})),order};
  }
  function slowAction(target,damage,reference,rate=0){
    if((__YggBig.le(target.hp,0))||target.status&&target.status!=='active')return 0;
    const converted=rate||(__YggBig.div(damage,(__YggBig.add((__YggBig.max(1,reference)),damage))));
    const amount=(__YggBig.min(.5,(__YggBig.max(0,converted))));if(!((__YggBig.gt(amount,0))))return 0;
    target.turnSlowRate=(__YggBig.min(.5,(__YggBig.max(target.turnSlowRate||0,amount))));target.turnSlowSeconds=5;return amount;
  }
  function delayTurn(state,key,cycles){state.timeline||=newTimeline();const total=timelineUnits(state).reduce((n,u)=>(__YggBig.add(n,u.weight)),0);state.timeline.priorities[key]=(__YggBig.max((__YggBig.mul((__YggBig.neg(2)),total)),(__YggBig.sub(state.timeline.priorities[key]||0,(__YggBig.mul(total,(__YggBig.min(1,(__YggBig.max(0,cycles))))))))));}
  const attackRate=(state,c)=>timelineView(state,0).units.find(u=>(__YggBig.eq(u.key,(__YggBig.add('a:',c.id)))))?.share||0;
  const isActionDonor = (state,c) => isDeployed(state,c.id) && perks(state,c).some(p=>p.unlocked&&p.transferAction) && (__YggBig.gt(transferTargets(state,c).length,0));
  const boundedRepeats=(chance,limit)=>(__YggBig.gt(chance,0))?(__YggBig.div((__YggBig.sub(1,(__YggBig.pow(chance,limit)))),(__YggBig.sub(1,chance)))):1;
  const automaticActionRate = (state,c) => isDeployed(state,c.id) ? (__YggBig.mul(attackRate(state,c),isActionDonor(state,c)?1:boundedRepeats(freeActionChance(state,c),MAX_TURN_ACTIONS))) : 0;
  function transferTargets(state,donor) {
    const others=D.characters.filter(c=>(__YggBig.ne(c.id,donor.id))&&canAct(state,c.id)&&!isStunned(state,c.id)&&hasReachableTarget(state,c));
    const selected=others.find(c=>(__YggBig.eq(c.id,state.selectedCharacterId)));
    return selected ? [selected] : others;
  }
  function donatedActionRate(state,c) {
    return D.characters.filter(d=>isActionDonor(state,d)).reduce((sum,d)=>{
      const targets=transferTargets(state,d);
      return (__YggBig.add(sum,targets.some(t=>(__YggBig.eq(t.id,c.id)))?(__YggBig.div(automaticActionRate(state,d),targets.length)):0));
    },0);
  }
  const effectiveAttackRate = (state,c) => !canAct(state,c.id)||!hasReachableTarget(state,c)||isActionDonor(state,c) ? 0 :
    (__YggBig.div((__YggBig.mul((__YggBig.add(automaticActionRate(state,c),donatedActionRate(state,c))),boundedRepeats(attackProfile(state,c).extraAttackChance,MAX_CHAIN_HITS))),(__YggBig.add((__YggBig.add(1,(__YggBig.max(0,(__YggBig.sub(magicState(state,c).maximum,1)))))),attackProfile(state,c).afterAttackStun||0))));
  function performAutomaticActionCore(state,c,random,events) {
    if(!isActionDonor(state,c)){performAttack(state,c,attackProfile(state,c),random,events,MAX_CHAIN_HITS);return;}
    const targets=transferTargets(state,c);
    if(!targets.length){performAttack(state,c,attackProfile(state,c),random,events);return;}
    const target=(__YggBig.eq(targets.length,1))?targets[0]:targets[(__YggBig.min((__YggBig.sub(targets.length,1)),(__YggBig.floor((__YggBig.mul(random(),targets.length))))))];
    const first=events?.length;
    // A donated action costs the recipient no points. Its reattack and poison
    // perks still apply; free-point rolls belong only to the donor's paid action.
    const failures=state.perkFailures;
    if(beginRunawayAction(state,target,random,events))performAttack(state,target,attackProfile(state,target),random,events,MAX_CHAIN_HITS);
    endRunawayAction(state,target,random,events);state.perkFailures=failures;
    if(events?.[first]){events[first].maxTransfers=1;events[first].delegatedBy=c.id;}
  }
  function performAutomaticAction(state,c,random,events){
    if(isStunned(state,c.id)){if(c.id==='richter')consumePoms(state);state.health[c.id].stunTurns--;if(events)events.push({type:'stunSkip',actorId:c.id,remaining:state.health[c.id].stunTurns});endRunawayAction(state,c,random,events);return;}
    if(beginRunawayAction(state,c,random,events))performAutomaticActionCore(state,c,random,events);
    if(c.id==='aniya')aniyaFollowup(state,random,events);
    endRunawayAction(state,c,random,events);
  }
  const actionCost = (state,c)=>hireCost(state,c);
  const upgradeCost = (state, u) => u.id==='blessing'?1e300: geometricCost(u.cost, state.upgrades[u.id], u.costGrowth??D.balance.upgradeCostGrowth);
  function roll(dice, flat, random = Math.random, sides = 6) {
    let amount = flat;
    for (let i = 0; (__YggBig.lt(i,dice)); i++) (amount=(__YggBig.add(amount,(__YggBig.add(1,(__YggBig.floor((__YggBig.mul(random(),sides)))))))));
    return amount;
  }
  const healthOf=(state,id)=>state.health?.[id]||{hp:maxHP(state,D.characters.find(c=>(__YggBig.eq(c.id,id)))),status:'active',regenSeconds:0};
  const canAct=(state,id)=>!isResting(state)&&isDeployed(state,id)&&healthOf(state,id).status==='active'&&!runawayOf(state,id).runawayCollapsed;
  function newEnemy(state,hp=getSession(state).hp,poisonDamage=0,respawnSeconds=0){
    return {...(getSession(state).id==='creator'?{creatorTurns:0,creatorPattern:'judgment'}:{}),row:getSession(state).row||'front',id:nextEnemyId(state),hp,poisonDamage,respawnSeconds,actionPoints:0,pendingAttack:null,wardSeconds:0,defensePenalty:0,accuracyPenalty:0,evasionPenalty:0,evasionPenaltyTurns:0,evasionFailure:false,tauntId:null,slowSeconds:0,actionPenalty:0,queenCancels:0};
  }
  function emptyKogumo(state){return {...newEnemy(state,0),kind:'kogumo',creationDamage:0,maxHP:0};}
  const enemyMaxHP=(state,enemy)=>enemy?.kind==='kogumo'?enemy.maxHP:enemySpec(state,enemy).hp;
  const duoWaiting=state=>!!getSession(state).members&&!getSession(state).independentRespawns&&ensureEnemies(state).some(e=>(__YggBig.gt(e.hp,0)));
  function newMember(state,index){const q=getSession(state),member=q.members[index],spec=sessionAtLevel({...D.sessions.find(q=>(__YggBig.eq(q.id,state.sessionId))),...member},q.level);return {...newEnemy(state,spec.hp),kind:member.id};}
  function enemySpec(state,enemy){
    const q=getSession(state);
    if(q.members){const member=q.members.find(m=>(__YggBig.eq(m.id,enemy?.kind)))||q.members[0];return sessionAtLevel({...D.sessions.find(q=>(__YggBig.eq(q.id,state.sessionId))),...member},q.level);}
    if(q.id==='creator'&&enemy?.creatorPattern==='genesis')return {...q,attackType:'physical'};if(enemy?.kind!=='kogumo')return q;
    const check={flat:enemy.creationDamage,dice:2};
    return {...q,...q.summon,enemy:'コグモ',ignoreDefense:false,hpStrengthLevel:0,hpStrength:T.value(0),baseHP:enemy.maxHP,hp:enemy.maxHP,accuracy:check,evasion:check,ss:{...check},
      attack:{...q.summon.attack}};
  }
  function dismissKogumo(state,events){
    for(const [slot,e]of state.enemies.entries())if(e.kind==='kogumo'){
      if(e.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:e.id,targetSlot:slot});
      Object.assign(e,emptyKogumo(state));
    }
  }
  function spawnKogumo(state,damage,events){
    const clouds=state.enemies.filter(e=>e.kind==='kogumo');
    const target=clouds.find(e=>!e.hp)||clouds.reduce((a,b)=>(__YggBig.le(a.hp,b.hp))?a:b);
    const created=(__YggBig.eq(target.hp,0));if(created)Object.assign(target,emptyKogumo(state));
    const gain=(__YggBig.min(damage,(__YggBig.sub(Infinity,target.maxHP))));if((__YggBig.le(gain,0)))return;
    if(created){target.creationDamage=gain;markSummoned(target);delete state.timeline?.priorities[(__YggBig.add('e:',target.id))];}
    (__YggBig.assign(target,"maxHP","add",()=>(gain)));(__YggBig.assign(target,"hp","add",()=>(gain)));
    if(events)events.push({type:'enemySummon',enemyId:target.id,targetSlot:state.enemies.indexOf(target),created,hp:target.hp,amount:gain});
  }
  function ensureEnemies(state){
    const q=getSession(state);if(q.medical){state.enemies=[];state.hp=1;state.poisonDamage=0;state.respawnSeconds=0;state.focusedEnemyId=null;return state.enemies;}const count=q.summons?3:(q.formationCount||1);
    if(!Array.isArray(state.enemies)||(__YggBig.ne(state.enemies.length,count))){
      state.enemies=Array.from({length:count},(_,i)=>q.members?newMember(state,i):q.summons&&i?emptyKogumo(state):newEnemy(state,i?getSession(state).hp:state.hp,i?0:state.poisonDamage||0,i?0:state.respawnSeconds||0));
      syncFront(state);
    }
    return state.enemies;
  }
  const livingEnemies=state=>ensureEnemies(state).filter(e=>(__YggBig.gt(e.hp,0))&&!e.respawnSeconds);
  function syncFront(state){
    if(getSession(state).medical){state.hp=1;state.poisonDamage=0;state.respawnSeconds=0;state.focusedEnemyId=null;return;}
    const living=state.enemies.filter(e=>(__YggBig.gt(e.hp,0))&&!e.respawnSeconds);
    if(!living.some(e=>(__YggBig.eq(e.id,state.focusedEnemyId))))state.focusedEnemyId=null;
    const target=living.find(e=>(__YggBig.eq(e.id,state.focusedEnemyId)))||living[0];
    state.hp=target?.hp||0;state.poisonDamage=target?.poisonDamage||0;
    state.respawnSeconds=target?0:(__YggBig.min(...state.enemies.filter(e=>e.kind!=='kogumo').map(e=>e.respawnSeconds)));
  }
  function selectEnemy(state,id){
    if(id!==null&&(!(getSession(state).traits||[]).includes('swarm')||!livingEnemies(state).some(e=>(__YggBig.eq(e.id,id)))))return false;
    state.focusedEnemyId=id;syncFront(state);return true;
  }
  function attackTargets(state,areaAttack,random,character=null){
    ensureEnemies(state);const es=reachableEnemies(state,character);if(areaAttack||(__YggBig.lt(es.length,2)))return es;
    return [es.find(e=>(__YggBig.eq(e.id,state.focusedEnemyId)))||es[(__YggBig.min((__YggBig.sub(es.length,1)),(__YggBig.floor((__YggBig.mul(random(),es.length))))))]];
  }
  function combatRoll(spec,random=Math.random){
    let total=spec.flat||0;const dice=[];
    for(let i=0;(__YggBig.lt(i,spec.dice||0));i++){
      let face=roll(1,0,random);dice.push(face);(total=(__YggBig.add(total,face)));
      if((__YggBig.eq(face,1))){const penalty=roll(1,0,random);(total=(__YggBig.sub(total,penalty)));dice.push((__YggBig.neg(penalty)));}
      else while((__YggBig.eq(face,6))){if((__YggBig.ge(dice.length,4096)))throw new Error('対抗ロールの乱数が収束しません。');face=roll(1,0,random);dice.push(face);(total=(__YggBig.add(total,face)));}
    }
    return {total:scaledCombatTotal(total,spec),dice,critical:dice.includes(6),fumble:dice.some(x=>(__YggBig.lt(x,0)))};
  }
  const scaledCombatTotal=(total,spec)=>(__YggBig.floor((__YggBig.mul(total,spec.resultScale??1))));
  function accuracySpec(state,c,mental=(activePerks(state,c).find(p=>p.baseAttack)?.attackType||c.attackType)==='mental'){
    const base=mental?c.ss:c.accuracy,a=activation(state,c),symptom=runawayOf(state,c.id).runawaySymptom;
    const party=isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>(__YggBig.add(n,p.partyAccuracyBonus||0)),0):0;
    const fixed=(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(base.flat,c.id==='cherry'&&cherryPerk(state,'dominance')?(state.health.cherry.fireBonus||0):0)),activePerks(state,c).reduce((n,p)=>(__YggBig.add(n,p.accuracyBonus||0)),0))),party)),a.reaction)),mental?0:(__YggBig.mul(magicState(state,c).current,magicPerPoint(state,c)))));
    return {dice:(__YggBig.add(base.dice,a.dice)),flat:symptom==='vision'?(__YggBig.floor((__YggBig.div(fixed,2)))):fixed,resultScale:symptom==='memory'?.5:1};
  }
  function judgmentBonus(accuracy,evasion){
    if(!accuracy||!evasion||(__YggBig.le(accuracy.total,evasion.total)))return {doubleHit:false,smashCritical:0,bonusDice:0};
    const doubleHit=(__YggBig.ge(accuracy.total,(__YggBig.mul(evasion.total,2)))),smashCritical=(__YggBig.floor((__YggBig.div(accuracy.dice.filter(x=>(__YggBig.eq(x,6))).length,2))));
    return {doubleHit,smashCritical,bonusDice:(__YggBig.add(Number(doubleHit),smashCritical))};
  }
  const opposedCache=new Map();
  function judgmentOutcomes(accuracy,evasion,ratio=0,retries=0,criticalRetries=0){
    if(!retries&&!criticalRetries||!accuracy||!evasion)return T.outcomes(accuracy,evasion,ratio);
    const key=JSON.stringify([accuracy,evasion,ratio,retries,criticalRetries]);if(opposedCache.has(key))return opposedCache.get(key);
    const left=T.distribution(accuracy,true,true),right=T.distribution(evasion,true,true),criticalMass=right.reduce((n,[,k,p])=>(__YggBig.add(n,k?p:0)),0),correction=T.hit(accuracy,evasion,ratio).correction,conditional=new Map(),bonuses=new Map();let chance=0;
    for(const [b,k,q]of right){const rw=(__YggBig.mul(q,k?(__YggBig.pow(criticalMass,criticalRetries)):Array.from({length:(__YggBig.add(criticalRetries,1))},(_,i)=>(__YggBig.pow(criticalMass,i))).reduce((n,v)=>(__YggBig.add(n,v)),0)));const fail=left.reduce((n,[a,,p])=>(__YggBig.add(n,(__YggBig.le((__YggBig.add(a,correction)),b))?p:0)),0),factor=Array.from({length:(__YggBig.add(retries,1))},(_,i)=>(__YggBig.pow(fail,i))).reduce((n,v)=>(__YggBig.add(n,v)),0);
      for(const [a,k,p]of left){if((__YggBig.le((__YggBig.add(a,correction)),b)))continue;const double=Number((__YggBig.ge((__YggBig.add(a,correction)),(__YggBig.mul(2,b))))),extra=(__YggBig.add(double,(__YggBig.floor((__YggBig.div(k,2)))))),w=(__YggBig.mul((__YggBig.mul(p,factor)),rw)),id=(__YggBig.add((__YggBig.add(extra,',')),double));(chance=(__YggBig.add(chance,w)));conditional.set(id,(__YggBig.add(conditional.get(id)||0,w)));bonuses.set(extra,(__YggBig.add(bonuses.get(extra)||0,w)));}
    }
    const result={chance,bonuses:[...bonuses],conditional:[...conditional].map(([key,p])=>[...key.split(',').map(Number),p])};if((__YggBig.ge(opposedCache.size,128)))opposedCache.clear();opposedCache.set(key,result);return result;
  }
  const opposedHitChance=(accuracy,evasion)=>judgmentOutcomes(accuracy,evasion).chance;
  function healAlly(state,c,amount,events,sessionId){
    const h=state.health[c.id],before=h.hp,max=maxHP(state,c);h.hp=(__YggBig.min(max,(__YggBig.add(h.hp,amount))));
    if((__YggBig.eq(h.hp,max))){delete h.revivalTurns;delete h.revivalSeconds;h.regenSeconds=0;if(h.status!=='active'){h.status='active';if(events)events.push({type:'revive',actorId:c.id,hp:h.hp,sessionId});}}
    if(events&&(__YggBig.gt(h.hp,before)))events.push({type:'heal',actorId:c.id,amount:(__YggBig.sub(h.hp,before)),hp:h.hp,sessionId});
  }
  function recoverAllies(state,seconds,events,contexts=[]){
    autoReviveAllies(state,events);
    // Snapshot wiped parties and finish their paid revivals atomically. Reviving one
    // member must not switch the remaining members back to turn-based waiting.
    const grouped=new Set();
    for(const q of D.sessions){
      const ctx=contexts.find(ctx=>(__YggBig.eq(ctx.sessionId,q.id)))||battleContext(state,q.id);
      if(q.medical||activeCharacters(ctx).length)continue;
      const ids=formationIds(ctx).filter(id=>(__YggBig.gt(state.health[id]?.revivalTurns,0)));
      if(!ids.length)continue;
      const remaining=(__YggBig.max(0,(__YggBig.sub((__YggBig.max(...ids.map(id=>state.health[id].revivalSeconds??10))),seconds))));
      for(const id of ids){grouped.add(id);state.health[id].revivalSeconds=remaining;}
      if((__YggBig.lt(remaining,1e-9)))for(const id of ids)finishRevival(state,id,events,q.id);
    }
    for(const c of D.characters){if(!state.levels[c.id]||grouped.has(c.id))continue;const h=state.health[c.id],owner=formationOwner(state,c.id);
      if((__YggBig.gt(h.revivalTurns,0))){
        const ctx=contexts.find(ctx=>(__YggBig.eq(ctx.sessionId,owner)));
        if(revivalUsesSeconds(state,c.id,ctx)){
          h.revivalSeconds=(__YggBig.max(0,(__YggBig.sub(h.revivalSeconds??10,seconds))));
          if((__YggBig.lt(h.revivalSeconds,1e-9))){finishRevival(state,c.id,events,owner);continue;}
        }else h.revivalSeconds=10;
      }
      if((__YggBig.ge(h.hp,maxHP(state,c)))){h.regenSeconds=0;continue;}
      const period=owner==='infirmary'?2:D.balance.recoverySeconds;(__YggBig.assign(h,"regenSeconds","add",()=>(seconds)));const ticks=(__YggBig.floor((__YggBig.div((__YggBig.add(h.regenSeconds,1e-9)),period))));h.regenSeconds=(__YggBig.max(0,(__YggBig.sub(h.regenSeconds,(__YggBig.mul(ticks,period))))));
      if(ticks)healAlly(state,c,(__YggBig.mul(ticks,(__YggBig.max(1,N.floor((__YggBig.mul(maxHP(state,c),.01))))))),events,owner);
    }
  }

  const enemyAttackDuration=(state,enemy=null,kind=enemy?.pendingAttack?.kind)=>enemySpec(state,enemy).attacks?.find(a=>(__YggBig.eq(a.id,kind)))?.attackSeconds||enemySpec(state,enemy).attackSeconds||.72;
  function refreshFloorClip(state,force=false){
    if(!supportPerks(state).some(p=>p.protectLowestHP)){if(!state.floorClipTurns||force){state.floorClipTargetId=null;state.floorClipTurns=0;}return;}
    if(!force&&(__YggBig.gt(state.floorClipTurns,0)))return;
    const active=formationIds(state).filter(id=>canAct(state,id));
    state.floorClipTargetId=active.reduce((best,id)=>best===null||(__YggBig.lt(healthOf(state,id).hp,healthOf(state,best).hp))?id:best,null);
    state.floorClipTurns=1;
  }
  function enemyTargetCandidates(state,enemy=null){
    refreshFloorClip(state);
    const active=formationIds(state).map(id=>D.characters.find(c=>(__YggBig.eq(c.id,id)))).filter(c=>canAct(state,c.id));
    return ((__YggBig.lt(active.length,2))?active:active.filter(c=>(__YggBig.ne(c.id,state.floorClipTargetId)))).filter(c=>!enemy||enemyCanReach(state,enemy,c));
  }
  function enemyTargetWeights(state,enemy=null){
    const jewel=D.characters.find(c=>c.id==='jewel');
    const guarded=canAct(state,'jewel')&&activePerks(state,jewel).some(p=>p.allyTargetWeight);
    return enemyTargetCandidates(state,enemy).map(c=>({character:c,weight:(__YggBig.mul(guarded&&c.id!=='jewel'?.5:1,formationRow(state,c.id)==='rear'?(__YggBig.div(1,3)):1))}));
  }
  function chooseEnemyTarget(state,random,enemy=null){
    if(enemy?.tauntId&&enemyTargetCandidates(state,enemy).some(c=>(__YggBig.eq(c.id,enemy.tauntId))))return D.characters.find(c=>(__YggBig.eq(c.id,enemy.tauntId)));
    const choices=enemyTargetWeights(state,enemy);let value=(__YggBig.mul(random(),choices.reduce((n,t)=>(__YggBig.add(n,t.weight)),0)));
    for(const t of choices){(value=(__YggBig.sub(value,t.weight)));if((__YggBig.lt(value,0)))return t.character;}return choices.at((__YggBig.neg(1)))?.character;
  }
  function enemyAttackChoices(state,enemy,target){if(getSession(state).id==='creator')return getSession(state).attacks.filter(a=>(__YggBig.eq(a.id,(__YggBig.eq(((__YggBig.add(enemy.creatorTurns||0,1)))%4,0))?'genesis':'judgment')));
    const q=enemySpec(state,enemy),distance=combatDistance(state,target.id,enemy,true);
    return (q.attacks||[]).filter(a=>inRange(a.range,distance)&&(a.id!=='revive'||ensureEnemies(state).some(e=>e.kind==='chikira'&&(__YggBig.le(e.hp,0)))));
  }
  function confusionTarget(state,enemy,random,events){
    const effect=enemy.confusion;if(!effect)return null;

    if((__YggBig.ge(random(),.5)))return null;
    const candidates=livingEnemies(state).map(e=>({side:'enemy',enemy:e}));
    if(!effect.friendlyFire)candidates.push(...activeCharacters(state).map(c=>({side:'ally',actor:c})));
    return candidates[(__YggBig.min((__YggBig.sub(candidates.length,1)),(__YggBig.floor((__YggBig.mul(random(),candidates.length))))))]||null;
  }
  function finishSightTurn(enemy){if(enemy.sightDebuff&&(__YggBig.le(--enemy.sightDebuff.turns,0)))delete enemy.sightDebuff;}
  function confusedEnemyAttack(state,source,target,area,random,events){
    const attacker=enemySpec(state,source),mental=attacker.attackType==='mental',attackStrength=enemyStrength(attacker);
    const targets=area?[...livingEnemies(state)]:[target];
    for(const defender of targets){
      if((__YggBig.le(defender.hp,0))||defender.respawnSeconds)continue;
      const q=enemySpec(state,defender),accuracySpec={...(mental?attacker.ss:attacker.accuracy)},evasionDice={...(mental?q.ss:q.evasion)};
      (__YggBig.assign(accuracySpec,"flat","sub",()=>((__YggBig.add(source.accuracyPenalty||0,source.sightDebuff?.accuracy||0)))));(__YggBig.assign(evasionDice,"flat","sub",()=>((__YggBig.add(defender.evasionPenalty||0,defender.sightDebuff?.evasion||0)))));
      const p={mental,accuracySpec,evasionDice,attack:enemyAttackSpec(state,source),areaAttack:area,reduction:attacker.ignoreDefense?0:(__YggBig.max(0,mental?q.resistance:(__YggBig.sub((__YggBig.add(q.defense,(__YggBig.gt(defender.wardSeconds,0))?5:0)),defender.defensePenalty||0)))),damageElementMultiplier:attributeMultiplier(q,attacker.attackElements),hitLogRatio:T.relativeLog(enemyStrength(attacker,'accuracy'),enemyStrength(q,'evasion')),damageLogRatio:T.relativeLog(attackStrength,enemyStrength(q,'armor')),damageScaleLog:T.absoluteLog(attackStrength,enemyStrength(q,'armor'))};
      const result=rollEnemyHit(p,random),start=events?.length||0;
      if(result.hit)applyDamage(state,result.damage,events,(__YggBig.add(attacker.enemy,'（混乱）')),null,random,{fixedDamage:result.damage,forceSingleTarget:true,areaAttack:area},false,[defender],true);
      else if(events)events.push({type:'attack',actor:(__YggBig.add(attacker.enemy,'（混乱）')),actorId:null,enemyId:defender.id,targetSlot:state.enemies.indexOf(defender),damage:0,hpBefore:defender.hp,hpAfter:defender.hp,hit:false});
      if(events)for(const e of events.slice(start))if(e.type==='attack'&&!e.poisonTick){Object.assign(e,{confusionAttack:true,sourceEnemyId:source.id,accuracy:result.accuracy,evasion:result.evasion,...result.judgment});}
    }
    source.accuracyPenalty=0;
  }
  function enemyActions(state,random,events,selectedEnemy){
    if(isResting(state))return;
    const session=getSession(state);
    if(!session.actionDice&&!session.action)return;
    if(!activeCharacters(state).length){normalizeEnemyActions(state,events);return;}
    for(const [slot,enemy]of ensureEnemies(state).entries()){
      if(enemy.respawnSeconds||(__YggBig.le(enemy.hp,0)))continue;
      const individual=enemySpec(state,enemy),spec=individual.actionDice;
      if((__YggBig.ne(enemy,selectedEnemy))||enemy.pendingAttack||!enemyTargetCandidates(state,enemy).length)continue;
      const confused=confusionTarget(state,enemy,random,events);
      const count=1;
      const target=confused?.side==='ally'?confused.actor:chooseEnemyTarget(state,random,enemy);
      const choices=confused?(individual.attacks||[]).filter(a=>!a.support):enemyAttackChoices(state,enemy,target),pattern=choices.length?choices[(__YggBig.min((__YggBig.sub(choices.length,1)),(__YggBig.floor((__YggBig.mul(random(),choices.length))))))]:null;
      const kind=pattern?pattern.id:confused?'attack':session.summons&&enemy.kind!=='kogumo'&&livingEnemies(state).some(e=>e.kind==='kogumo')&&(__YggBig.lt(random(),.2))?'absorb':individual.apAttack?'flash':'attack';
      if(confused?.side==='enemy'){confusedEnemyAttack(state,enemy,confused.enemy,!!pattern?.area,random,events);finishSightTurn(enemy);continue;}
      if(siblingCancel(state,(__YggBig.add('e:',enemy.id)),target.id,random,events)){continue;}
      if(session.id==='creator'){enemy.creatorTurns=(__YggBig.add(enemy.creatorTurns||0,1));enemy.creatorPattern=kind;}
      const duration=enemyAttackDuration(state,enemy,kind);
      const taunted=kind!=='absorb'&&(__YggBig.eq(enemy.tauntId,target.id));
      if(kind!=='absorb')enemy.tauntId=null;
      preparePerkFailures(state,random);
      enemy.pendingAttack={confused:!!confused,targetId:target.id,remaining:duration,count:pattern?.support?1:count,kind,...(taunted?{taunted:true}:{}),profile:{...enemyHitProfile(state,enemy,target),areaAttack:!!pattern?.area}};delete state.perkFailures;finishSightTurn(enemy);
      if(events)events.push({type:'enemyWindup',targetId:target.id,enemyId:enemy.id,targetSlot:slot,duration,count,kind});
    }
  }
  function evasionSpec(state,c,mental=false){
    const base=mental?c.ss:c.evasion,extra=!mental&&isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>(__YggBig.add(n,p.partyEvasionDice||0)),0):0;
    const own=activePerks(state,c).reduce((n,p)=>(__YggBig.add(n,p.evasionBonus||0)),0),party=isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>(__YggBig.add(n,p.partyEvasionBonus||0)),0):0;
    const a=activation(state,c),symptom=runawayOf(state,c.id).runawaySymptom,fixed=(__YggBig.add((__YggBig.add((__YggBig.add(base.flat,own)),party)),a.reaction));
    return {flat:(__YggBig.add(symptom==='vision'?(__YggBig.floor((__YggBig.div(fixed,2)))):fixed,turnEffects(state,c.id).blastEvasion)),dice:(__YggBig.add((__YggBig.add(base.dice,extra)),a.dice)),resultScale:symptom==='hearing'?.5:1};
  }
  function enemyAttackSpec(state,enemy=null){
    const attack=enemySpec(state,enemy).attack;
    return attack?{...attack,sides:(__YggBig.min(6,...supportPerks(state).map(p=>p.enemyDamageSides||6)))}:null;
  }
  function enemyHitProfile(state,enemy,c){
    const session=enemySpec(state,enemy);
    const mental=session.attackType==='mental',ps=activePerks(state,c),ignoreDefense=!!session.ignoreDefense&&!penetrationImmune(c);
    const attackStrength=enemyStrength(session),defenseStrength=strengthValue(state,c,'armor');
    const accuracySpec={...(mental?session.ss:session.accuracy)};
    const accuracyPenalty=(__YggBig.add(enemy.accuracyPenalty||0,enemy.sightDebuff?.accuracy||0));(__YggBig.assign(accuracySpec,"flat","sub",()=>(accuracyPenalty)));
    return {damageElementMultiplier:attributeMultiplier(allyElements(state,c),session.attackElements),...turnEffects(state,c.id),mental,accuracyPenalty,accuracySpec,evasionDice:evasionSpec(state,c,mental),
      enemyCriticalRetries:(__YggBig.max(0,...ps.map(p=>p.enemyCriticalRetries||0))),reversal:!!state.upgrades.reversal,retake:!!state.upgrades.retake,
      nullifyChance:(__YggBig.max(0,...ps.map(p=>p.nullifyChance||0))),attack:enemyAttackSpec(state,enemy),
      hitLogRatio:T.relativeLog(enemyStrength(session,'accuracy'),strengthValue(state,c,'evasion')),
      damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength),
      reactionFailure:runawayOf(state,c.id).runawaySymptom==='mind'?.5:0,
      reduction:ignoreDefense?0:armor(state,c,mental),postReduction:activation(state,c).damage,
      shield:mental||ignoreDefense?0:ps.reduce((n,p)=>(__YggBig.add(n,p.normalHitDefense||0)),0)};
  }
  function rollEnemyHit(p,random=Math.random){
    const automaticHit=!!p.nonContact||!!p.covering;
    let accuracy=automaticHit?null:combatRoll(p.accuracySpec,random),evasion;
    const accuracyReroll=!automaticHit&&p.reversal&&accuracy.critical;
    if(accuracyReroll){const original=accuracy;accuracy={...combatRoll(p.accuracySpec,random),original};}
    if(!automaticHit)for(let i=0;(__YggBig.lt(i,p.enemyCriticalRetries||0))&&accuracy.critical;i++){const original=accuracy;accuracy={...combatRoll(p.accuracySpec,random),original};}
    evasion=automaticHit?null:combatRoll(p.evasionDice,random);
    const evasionReroll=!automaticHit&&p.retake&&evasion.fumble;
    if(evasionReroll){const original=evasion;evasion={...combatRoll(p.evasionDice,random),original};}
    const correction=T.hit(p.accuracySpec,p.evasionDice,p.hitLogRatio||0).correction;if(accuracy)accuracy={...accuracy,rawTotal:accuracy.total,total:(__YggBig.add(accuracy.total,correction)),strengthCorrection:correction};
    const forcedFailure=!automaticHit&&(p.stunned||p.reactionFailure&&(__YggBig.lt(random(),p.reactionFailure)));
    const nullified=!automaticHit&&(__YggBig.gt(p.nullifyChance,0))&&(__YggBig.lt(random(),p.nullifyChance)),hit=automaticHit||(!nullified&&(forcedFailure||(__YggBig.gt(accuracy.total,evasion.total))));
    const judgment=p.coverDoubleHit?{doubleHit:true,smashCritical:0,bonusDice:1}:hit?judgmentBonus(accuracy,evasion):{doubleHit:false,smashCritical:0,bonusDice:0};
    if(p.areaAttack&&judgment.doubleHit)judgment.bonusDice--;
    const spec={...p.attack,dice:(__YggBig.add(p.attack.dice,judgment.bonusDice))},defense=(__YggBig.add(p.reduction||0,p.nonContact||judgment.doubleHit?0:p.shield||0)),b=hit?T.damage(spec,defense,p.damageLogRatio||0,p.damageScaleLog||0).correction:0;
    const damage=hit&&!p.noDamage?(__YggBig.max(1,T.cap((__YggBig.sub((__YggBig.sub(attributeDamage((__YggBig.add(scaledCombatTotal(roll(spec.dice,spec.flat,random,spec.sides),spec),b)),p.damageElementMultiplier),defense)),p.postReduction||0))))):0;
    const appliedDamage=p.areaAttack&&!judgment.doubleHit&&hit?(__YggBig.floor((__YggBig.div(damage,2)))):damage;
    return {nonContact:!!p.nonContact,automaticHit,mental:p.mental,accuracyPenalty:p.accuracyPenalty,accuracy,evasion,accuracyReroll,evasionReroll,nullified,hit,forcedFailure:!!forcedFailure,judgment,damage:(__YggBig.eq(p.damageElementMultiplier,0))?0:appliedDamage};
  }
  const isCharm=kind=>kind==='ward'||kind==='revive';
  function applyCharm(state,enemy,slot,random,events){
    const p=enemy.pendingAttack;if(!p||p.charmApplied||!isCharm(p.kind)||(__YggBig.le(enemy.hp,0))||enemy.respawnSeconds)return;
    p.charmApplied=true;let success=false,targets=[];
    if(p.kind==='ward'){for(const e of livingEnemies(state))if(['eggra','chikira'].includes(e.kind)){e.wardSeconds=10;targets.push(e.id);}success=(__YggBig.gt(targets.length,0));}
    else {const e=ensureEnemies(state).find(e=>e.kind==='chikira'&&(__YggBig.le(e.hp,0)));if(e&&(__YggBig.lt(random(),.5))){if(state.timeline)delete state.timeline.priorities[(__YggBig.add('e:',e.id))];e.hp=(__YggBig.max(1,(__YggBig.floor((__YggBig.mul(enemyMaxHP(state,e),.5))))));e.respawnSeconds=0;e.actionPoints=0;e.pendingAttack=null;e.wardSeconds=0;success=true;targets=[e.id];if(events)events.push({type:'enemyRespawn',enemyId:e.id,targetSlot:state.enemies.indexOf(e)});syncFront(state);}}
    if(events)events.push({type:'enemyCharm',enemyId:enemy.id,targetSlot:slot,kind:p.kind,success,targets});
  }
  function applyElectricField(state,source,random,events){
    if(events)events.push({type:'electricField',enemyId:source.id,targetSlot:state.enemies.indexOf(source)});
    const amount=N.floor((__YggBig.min(Infinity,(__YggBig.mul(4,(__YggBig.pow((__YggBig.div(enemyStrength(enemySpec(state,source)),D.strength.strengthBase)),.75)))))));
    damagePoms(state,{nonContact:true,attack:{dice:0,flat:amount},reduction:0,shield:0,postReduction:0,damageElementMultiplier:1},random,events);
    // Snapshot participants: the field fires once per discharge, never once per target.
    const allies=activeCharacters(state).filter(c=>canAct(state,c.id)),enemies=[...livingEnemies(state)];
    for(const c of allies){const factor=attributeMultiplier(allyElements(state,c),['shock']);damageAlly(state,c,attributeDamage(amount,factor),random,events,'electricField');}
    for(const e of enemies){const damage=N.floor(attributeDamage(amount,attributeMultiplier(enemySpec(state,e),['shock'])));if(!damage)continue;const before=e.hp;e.hp=(__YggBig.max(0,(__YggBig.sub(e.hp,damage))));
      if(events)events.push({type:'attack',actor:'エレキフィールド',actorId:null,hit:true,damage,nonContact:true,targetSlot:state.enemies.indexOf(e),enemyId:e.id,hpBefore:before,hpAfter:e.hp});
      if(!e.hp){
        clearEnemy(state,e,state.enemies.indexOf(e),false,'hp',events,random);
        if(e.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:e.id,targetSlot:state.enemies.indexOf(e)});
        Object.assign(e,{respawnSeconds:respawnDelay(state),pendingAttack:null,poisonDamage:0,actionPoints:0,wardSeconds:0,defensePenalty:0,accuracyPenalty:0,evasionPenalty:0,evasionPenaltyTurns:0,evasionFailure:false,tauntId:null,slowSeconds:0,actionPenalty:0,queenCancels:0});
        delete e.confusion;delete e.sightDebuff;delete e.turnSlowRate;delete e.turnSlowSeconds;if(state.timeline)delete state.timeline.priorities[(__YggBig.add('e:',e.id))];
      }
    }syncFront(state);
  }
  function coveringAllies(state){return formationIds(state).map(id=>D.characters.find(c=>(__YggBig.eq(c.id,id)))).filter(c=>canAct(state,c.id)&&!isStunned(state,c.id)&&formationRow(state,c.id)==='front'&&activePerks(state,c).some(p=>p.covering));}
  function receiveBreak(state,c,damage,elements,random=Math.random,events=null){
    if(!elements?.includes('break')||!((__YggBig.gt(damage,0))))return 0;
    const rise=(__YggBig.min(Infinity,(__YggBig.div((__YggBig.mul((__YggBig.div(damage,(__YggBig.max(1,maxHP(state,c))))),100)),3))));
    changeRunaway(state,c.id,rise,random,events);return rise;
  }
  function resolveEnemyAttackCore(state,enemy,slot,random,events){
    if(isCharm(enemy.pendingAttack?.kind)){applyCharm(state,enemy,slot,random,events);enemy.pendingAttack=null;if(events)events.push({type:'enemyCharmEnd',enemyId:enemy.id});return;}
    const pending=enemy.pendingAttack;enemy.pendingAttack=null;
    if(!pending||(__YggBig.le(enemy.hp,0))||enemy.respawnSeconds||(!pending.covering&&!pending.profile?.areaAttack&&!canAct(state,pending.targetId))){
      if(events&&pending)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});return;
    }
    pending.count=1; // Retired AP volleys never create extra timeline actions.
    if(pending.profile?.areaAttack&&!pending.areaResolved){
      damagePoms(state,b=>pomIncoming(state,b,enemySpec(state,enemy)),random,events);
      const targets=pending.confused?activeCharacters(state):enemyTargetCandidates(state,enemy),penalty=enemy.accuracyPenalty||0,turns=enemy.evasionPenaltyTurns;
      const covers=new Map(),guards=pending.profile.nonContact||pending.profile.mental||enemySpec(state,enemy).attackType==='mental'?[]:coveringAllies(state).filter(c=>targets.some(t=>(__YggBig.eq(t.id,c.id))));
      const rears=targets.filter(c=>formationRow(state,c.id)==='rear');while(guards.length&&rears.length){const guard=guards.splice((__YggBig.floor((__YggBig.mul(random(),guards.length)))),1)[0],rear=rears.splice((__YggBig.floor((__YggBig.mul(random(),rears.length)))),1)[0];covers.set(guard.id,rear.id);}
      const protectedIds=new Set(covers.values());
      for(const c of targets){
        if(protectedIds.has(c.id))continue;
        enemy.accuracyPenalty=penalty;enemy.evasionPenaltyTurns=turns;
        const protectedId=covers.get(c.id),baseProfile=enemyHitProfile(state,enemy,c),profile={...baseProfile,accuracySpec:pending.profile.accuracySpec,accuracyPenalty:pending.profile.accuracyPenalty,areaAttack:true,covering:!!protectedId,coverDoubleHit:!!protectedId};
        for(let hitIndex=0;(__YggBig.lt(hitIndex,protectedId?2:1));hitIndex++){enemy.pendingAttack={...pending,targetId:c.id,areaResolved:true,covering:!!protectedId,coveredTargetId:protectedId,coverHitIndex:(__YggBig.add(hitIndex,1)),profile};resolveEnemyAttack(state,enemy,slot,random,events);}
      }
      enemy.accuracyPenalty=0;enemy.evasionPenaltyTurns=(__YggBig.max(0,(__YggBig.sub(turns,1))));if(!enemy.evasionPenaltyTurns)enemy.evasionPenalty=0;
      if(enemySpec(state,enemy).attacks?.find(a=>(__YggBig.eq(a.id,pending.kind)))?.electricField)applyElectricField(state,enemy,random,events);
      return;
    }
    if(pending.kind==='absorb'&&livingEnemies(state).some(e=>e.kind==='kogumo')){
      const amount=(__YggBig.min((__YggBig.sub(enemyMaxHP(state,enemy),enemy.hp)),livingEnemies(state).filter(e=>e.kind==='kogumo').reduce((n,e)=>(__YggBig.add(n,e.hp)),0)));
      dismissKogumo(state,events);(__YggBig.assign(enemy,"hp","add",()=>(amount)));
      if(events)events.push({type:'enemyAbsorb',enemyId:enemy.id,targetSlot:slot,amount});
      if((__YggBig.gt(enemy.evasionPenaltyTurns,0))&&(__YggBig.eq(--enemy.evasionPenaltyTurns,0)))enemy.evasionPenalty=0;
      syncFront(state);return;
    }
    if(!pending.covering&&!pending.areaResolved&&!pending.profile?.nonContact&&!pending.profile?.mental&&enemySpec(state,enemy).attackType!=='mental'&&formationRow(state,pending.targetId)==='rear'){const guards=coveringAllies(state),guard=guards.length?guards[(__YggBig.floor((__YggBig.mul(random(),guards.length))))]:null;if(guard){pending.coveredTargetId=pending.targetId;pending.targetId=guard.id;pending.covering=true;pending.profile={...enemyHitProfile(state,enemy,guard),covering:true};}}
    const session=enemySpec(state,enemy),c=D.characters.find(c=>(__YggBig.eq(c.id,pending.targetId))),h=state.health[c.id];
    if(!pending.covering&&interceptEnemyAttack(state,enemy,c,slot,random,events)){
      if((__YggBig.gt(enemy.evasionPenaltyTurns,0))&&(__YggBig.eq(--enemy.evasionPenaltyTurns,0)))enemy.evasionPenalty=0;
      return;
    }
    // One-use effects and stun resolve at impact, including attacks queued before the spell.
    const snapshot=pending.profile||enemyHitProfile(state,enemy,c),effects=turnEffects(state,c.id);
    const pattern=session.attacks?.find(a=>(__YggBig.eq(a.id,pending.kind)));
    const incoming={...snapshot,...effects,noDamage:!!pattern?.noDamage,damageElementMultiplier:attributeMultiplier(allyElements(state,c),session.attackElements),evasionDice:{...snapshot.evasionDice,flat:(__YggBig.add((__YggBig.sub(snapshot.evasionDice.flat,snapshot.blastEvasion||0)),effects.blastEvasion))}};
    const before=h.hp,slow=rangedPerks(state,c,combatDistance(state,c.id,enemy)).reduce((n,p)=>(__YggBig.max(n,elementalPerk(p,session).retaliationSlow||0)),0);
    const {mental,accuracyPenalty,accuracy,evasion,accuracyReroll,evasionReroll,nullified,hit,judgment,damage:rolledDamage}=rollEnemyHit(incoming,random);
    if(effects.blastEvasion)delete h.blastEvasion;
    enemy.accuracyPenalty=0;
    if(hit&&!incoming.nonContact&&slow){enemy.actionPenalty=slow;enemy.slowSeconds=5;}
    let damage=rolledDamage,badLuck=false,fightingSpirit=false;
    if(hit&&session.apAttack){
      const slow=slowAction(h,damage,maxHP(state,c));
      if(hit&&(__YggBig.gt(damage,0)))siblingDamage(state,(__YggBig.add('a:',c.id)),random,events);
    if(events)events.push({type:'enemyAttack',elementMultiplier:incoming.damageElementMultiplier,targetId:c.id,enemyId:enemy.id,targetSlot:slot,enemyName:session.enemy,apDamage:true,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,...judgment,actionSlow:true,damage:(__YggBig.round((__YggBig.mul(slow,100)))),hpBefore:before,hpAfter:before,status:h.status});
      if((__YggBig.gt(enemy.evasionPenaltyTurns,0))&&(__YggBig.eq(--enemy.evasionPenaltyTurns,0)))enemy.evasionPenalty=0;return;
    }
    if(hit)receiveFire(state,c,session.attackElements,enemy.kind||'enemy');
    if(hit&&pattern?.actionSlowRate&&(__YggBig.ne(incoming.damageElementMultiplier,0)))slowAction(h,0,1,(__YggBig.mul(pattern.actionSlowRate,incoming.damageElementMultiplier)));
    if(hit&&(__YggBig.gt(damage,0))){
      if((__YggBig.le((__YggBig.sub(before,damage)),0))&&state.upgrades.badLuck&&(__YggBig.lt(random(),.3))){damage=(__YggBig.max(1,(__YggBig.floor((__YggBig.div(damage,2))))));badLuck=true;}
      if((__YggBig.le((__YggBig.sub(before,damage)),0))&&state.upgrades.fightingSpirit&&(__YggBig.lt(random(),.3))){h.hp=1;h.status='active';fightingSpirit=true;}
      else {(__YggBig.assign(h,"hp","sub",()=>(damage)));if((__YggBig.lt(h.hp,0)))h.status='dying';else if((__YggBig.lt(h.hp,4))&&(__YggBig.lt(random(),.5)))h.status='unconscious';}
      if((__YggBig.eq(before,maxHP(state,c))))h.regenSeconds=0;
    }
    if(events)events.push({type:'enemyAttack',elementMultiplier:incoming.damageElementMultiplier,targetId:c.id,enemyId:enemy.id,targetSlot:slot,enemyName:session.enemy,kind:pending.kind,covering:!!pending.covering,coveredTargetId:pending.coveredTargetId,coverHitIndex:pending.coverHitIndex,areaAttack:!!pending.profile?.areaAttack,apDamage:!!session.apAttack,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,accuracyPenalty,...judgment,damage,badLuck,fightingSpirit,hpBefore:before,hpAfter:h.hp,status:h.status});
    if(hit)receiveBreak(state,c,fightingSpirit?(__YggBig.max(0,(__YggBig.sub(before,h.hp)))):damage,session.attackElements,random,events);
    if(hit&&c.id==='jewel'&&canAct(state,c.id)&&activePerks(state,c).some(p=>p.damageIncome))grantPerkIncome(state,fightingSpirit?(__YggBig.max(0,(__YggBig.sub(before,h.hp)))):damage,'菫青の大盾',events);
    if((__YggBig.gt(enemy.evasionPenaltyTurns,0))&&(__YggBig.eq(--enemy.evasionPenaltyTurns,0)))enemy.evasionPenalty=0;
    if(h.status!=='active')clearTurnEffects(h);
    if(c.id==='jewel'&&h.status!=='active')state.rainbowTurns=0;
    normalizeEnemyActions(state,events);
  }

  function interceptEnemyAttack(state,enemy,c,slot,random,events){
    const successes=enemy.queenCancels||0;
    if((__YggBig.ge(successes,4))||!rangedPerks(state,c,combatDistance(state,c.id,enemy)).some(p=>p.interceptAttack))return false;
    const q=enemySpec(state,enemy),spec=accuracySpec(state,c,true),defender={...q.ss,flat:(__YggBig.sub(q.ss.flat,(__YggBig.add(enemy.evasionPenalty||0,enemy.sightDebuff?.evasion||0))))};
    const raw=combatRoll(spec,random),correction=T.hit(spec,defender,T.relativeLog(strengthValue(state,c,'accuracy'),enemyStrength(q,'evasion'))).correction;
    const accuracy={...raw,rawTotal:raw.total,total:(__YggBig.add(raw.total,correction)),strengthCorrection:correction},evasion=combatRoll(defender,random);
    const forced=!!enemy.evasionFailure;enemy.evasionFailure=false;
    const hit=forced||(__YggBig.gt(accuracy.total,evasion.total));
    if(hit){enemy.queenCancels=(__YggBig.add(successes,1));delayTurn(state,(__YggBig.add('e:',enemy.id)),(__YggBig.mul(.5,(__YggBig.sub(1,(__YggBig.mul(successes,.25)))))));}
    if(events){events.push({type:'queenIntercept',actorId:c.id,enemyId:enemy.id,targetSlot:slot,hit,accuracy,evasion,delayCycles:hit?(__YggBig.mul(.5,(__YggBig.sub(1,(__YggBig.mul(successes,.25)))))):0});if(hit)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});}
    return hit;
  }
  // Sibling marks belong to this battle context, never to the global ally record.
  function aniyaPerk(state,id){const c=D.characters.find(c=>c.id==='aniya');return !!c&&isDeployed(state,c.id)&&canAct(state,c.id)&&activePerks(state,c).some(p=>(__YggBig.eq(p.id,id)));}
  function siblingExists(state,key){return key.startsWith('a:')?key!=='a:aniya'&&formationIds(state).includes(key.slice(2))&&canAct(state,key.slice(2)):(state.enemies||[]).some(e=>(__YggBig.eq((__YggBig.add('e:',e.id)),key))&&(__YggBig.gt(e.hp,0))&&!e.respawnSeconds);}
  function siblingActive(state,key){if(!aniyaPerk(state,'big-brother')||!siblingExists(state,key))return false;return aniyaPerk(state,'brother-zone')||!!state.siblingMarks?.[key];}
  function confusionRelease(state,key,random,events){
    const enemy=(state.enemies||[]).find(e=>(__YggBig.eq((__YggBig.add('e:',e.id)),key))),effect=enemy?.confusion;if(!effect)return false;
    if((__YggBig.lt(random(),effect.releaseChance))){delete enemy.confusion;if(events)events.push({type:'confusionEnd',enemyId:enemy.id});return true;}
    effect.releaseChance=(__YggBig.min(1,(__YggBig.add(effect.releaseChance,.1))));return false;
  }
  function siblingRelease(state,key,random,events){const confused=confusionRelease(state,key,random,events);return releaseSibling(state,key,random,events)||confused;}
  function releaseSibling(state,key,random,events){
    if(!state.siblingMarks?.[key]||aniyaPerk(state,'brother-zone'))return false;
    if(!siblingExists(state,key)||!aniyaPerk(state,'big-brother')||(__YggBig.lt(random(),aniyaPerk(state,'wonderful-brother')?.2:.3))){delete state.siblingMarks[key];if(events)events.push({type:'siblingEnd',unitKey:key});return true;}return false;
  }
  function siblingDamage(state,key,random,events){if(key.startsWith('a:'))for(const e of state.enemies||[])if(e.confusion&&(__YggBig.eq(e.confusion.sourceId||'hayato',key.slice(2))))confusionRelease(state,(__YggBig.add('e:',e.id)),random,events);if(key==='a:aniya'){for(const target of Object.keys(state.siblingMarks||{}))siblingRelease(state,target,random,events);}else siblingRelease(state,key,random,events);}
  function siblingCancel(state,sourceKey,targetId,random,events){
    if(!siblingActive(state,sourceKey)||!formationIds(state).includes(targetId))return false;
    // Both perks roll independently even when the first succeeds.
    const own=targetId==='aniya'&&aniyaPerk(state,'obey-brother')?(__YggBig.lt(random(),.15)):false;
    const party=aniyaPerk(state,'no-fighting')?(__YggBig.lt(random(),.15)):false;
    if(own||party){if(events)events.push({type:'siblingCancel',unitKey:sourceKey,targetId,actorId:sourceKey.startsWith('a:')?sourceKey.slice(2):null,enemyId:sourceKey.startsWith('e:')?Number(sourceKey.slice(2)):null});return true;}return false;
  }
  function aniyaMarkAttack(state,targets,random){
    if(!aniyaPerk(state,'big-brother'))return;state.siblingMarks||={};
    for(const e of targets)if((__YggBig.gt(e.hp,0)))state.siblingMarks[(__YggBig.add('e:',e.id))]=true;
    if(aniyaPerk(state,'your-brother')){const allies=activeCharacters(state).filter(c=>c.id!=='aniya');if(allies.length)state.siblingMarks[(__YggBig.add('a:',allies[(__YggBig.min((__YggBig.sub(allies.length,1)),(__YggBig.floor((__YggBig.mul(random(),allies.length))))))].id))]=true;}
  }
  function aniyaFollowup(state,random,events){
    if(!aniyaPerk(state,'family'))return;
    const c={...D.characters.find(c=>c.id==='aniya'),attackType:'mental'};
    const enemies=(state.enemies||[]).filter(e=>siblingActive(state,(__YggBig.add('e:',e.id))));
    const allies=activeCharacters(state).filter(t=>siblingActive(state,(__YggBig.add('a:',t.id))));
    // Snapshot recipients before damage-triggered releases; every marked unit gets one check.
    for(const e of enemies){const p=attackProfile(state,c,false,enemySpec(state,e),e);applyDamage(state,0,events,c.name,c.id,random,{...p,motion:'beam',forceSingleTarget:true,areaAttack:false},true,[e],false,true);}
    for(const target of allies){
      const p=attackProfile(state,c),power=strengthValue(state,c,'power'),defense=strengthValue(state,target,'armor');
      const incoming={damageElementMultiplier:1,...turnEffects(state,target.id),accuracySpec:accuracySpec(state,c,true),evasionDice:evasionSpec(state,target,true),attack:{dice:p.dice,flat:(__YggBig.add(p.flat,p.bonus||0)),resultScale:p.resultScale},reduction:armor(state,target,true),postReduction:activation(state,target).damage,shield:0,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),strengthValue(state,target,'evasion')),damageLogRatio:T.relativeLog(power,defense),damageScaleLog:T.absoluteLog(power,defense)};
      const result=rollEnemyHit(incoming,random);if(result.hit)damageAlly(state,target,result.damage,random,events,'妹弟への追撃');
      if(events)events.push({type:'siblingFollowup',actorId:c.id,targetId:target.id,mental:true,hit:result.hit,damage:result.damage,motion:'beam'});
    }
  }
  function resolveEnemyAttack(state,enemy,slot,random,events){
    const pending=enemy.pendingAttack;
    resolveEnemyAttackCore(state,enemy,slot,random,events);
    if(pending&&!pending.areaResolved)siblingRelease(state,(__YggBig.add('e:',enemy.id)),random,events);
  }

  function newRescue(){return {dementorClears:0,appearances:0,remaining:0,completed:false,open:false,unread:false};}
  function rescueAvailable(state){const r=state.rescue;return !!r&&!r.completed&&((__YggBig.gt(r.remaining,0))||r.open);}
  function rescueClear(state,random=Math.random,events){
    const r=state.rescue||(state.rescue=newRescue());r.dementorClears=(__YggBig.min(Number.MAX_SAFE_INTEGER,(__YggBig.add(r.dementorClears,1))));
    if(r.completed||(__YggBig.lt(r.dementorClears,20))||rescueAvailable(state))return false;
    if((__YggBig.gt(r.appearances,0))&&(__YggBig.ge(random(),.05)))return false;
    r.appearances=(__YggBig.min(Number.MAX_SAFE_INTEGER,(__YggBig.add(r.appearances,1))));r.remaining=600;r.unread=true;
    if(events)events.push({type:'rescueAvailable'});return true;
  }
  function advanceRescue(state,seconds){const r=state.rescue;if(!r||r.completed)return;r.remaining=(__YggBig.max(0,(__YggBig.sub(r.remaining,seconds))));if(!r.remaining&&!r.open)r.unread=false;}
  function openRescue(state){if(!rescueAvailable(state))return false;state.rescue.open=true;state.rescue.unread=false;return true;}
  function closeRescue(state){if(!state.rescue?.open)return false;state.rescue.open=false;if(!state.rescue.remaining)state.rescue.unread=false;return true;}
  function completeRescue(state){if(!state.rescue?.open||state.rescue.completed)return false;Object.assign(state.rescue,{completed:true,open:false,unread:false,remaining:0});return true;}
  function clearEnemy(state,enemy,slot,overkill,reason,events,random){
    if(enemy.kind==='kogumo'){
      if(events)events.push({type:'enemyRemoved',enemyId:enemy.id,targetSlot:slot});return;
    }
    const encounter=getSession(state),sharedClear=encounter.members&&!encounter.independentRespawns;
    if(sharedClear&&state.enemies.some(e=>(__YggBig.ne(e,enemy))&&(__YggBig.gt(e.hp,0)))){if(events)events.push({type:'enemyDown',enemyId:enemy.id,targetSlot:slot});return;}
    if(sharedClear)for(const e of state.enemies)e.respawnSeconds=respawnDelay(state);
    if(getSession(state).summons)dismissKogumo(state,events);
    const rewardSpec=encounter.independentRespawns?enemySpec(state,enemy):encounter;
    const bonus=overkill?overkillBonus(state,rewardSpec):0,baseGain=grantIncome(state,reward(state,rewardSpec),'questReward'),bonusGain=grantIncome(state,bonus,'overkillReward'),gain=(__YggBig.add(baseGain,bonusGain));
    const credits=Missions.grantCredits(state,rewardSpec.creditsReward||0);
    if(encounter.id!=='scarecrow'&&!encounter.medical&&state.enemies.every(e=>(__YggBig.eq(e,enemy))||e.kind==='kogumo'||(__YggBig.le(e.hp,0)))){state.sessionClears||={};state.sessionClears[encounter.id]=(__YggBig.min(Number.MAX_SAFE_INTEGER,(__YggBig.add(state.sessionClears[encounter.id]||0,1))));}
    if(encounter.id==='creator')state.creatorAccess.defeated=true;state.kills++;state.defeatCounts||={};state.defeatCounts[encounter.id]=(__YggBig.min(Number.MAX_SAFE_INTEGER,(__YggBig.add(state.defeatCounts[encounter.id]||0,1))));refreshQuestUnlocks(state);if(encounter.id==='dementor')rescueClear(state,random,events);
    const rest=restOf(state);if(rest.enabled){rest.defeats=(__YggBig.min(1e9,(__YggBig.add(rest.defeats,1))));checkAutoRest(state);}
    if(events)events.push({type:'clear',reward:gain,credits,overkillBonus:bonusGain,overkills:overkill?1:0,reason,targetSlot:slot,enemyId:enemy.id,hpAfter:state.hp});

  }
  const targetEvasion=(profile,enemy)=>{const base=enemy?.kind==='kogumo'?{flat:enemy.creationDamage,dice:2}:profile.evasion;return base?{...base,flat:(__YggBig.sub((__YggBig.sub(base.flat,enemy?.evasionPenalty||0)),enemy?.sightDebuff?.evasion||0))}:null;};
  const targetDefense=(profile,enemy)=>profile.ignoreDefense?0:(__YggBig.max(0,(__YggBig.sub((__YggBig.add(enemy?.kind==='kogumo'?0:profile.defense,!profile.mental&&(__YggBig.gt(enemy?.hp,0))&&(__YggBig.gt(enemy?.wardSeconds,0))?5:0)),profile.mental?0:(__YggBig.max(enemy?.defensePenalty||0,profile.defenseReduction||0))))));
  function attackDamage(profile,enemy,amount,doubleHit=false){
    if(profile.fixedDamage!=null)return attributeDamage(profile.fixedDamage,profile.damageElementMultiplier);
    if((__YggBig.eq(profile.damageElementMultiplier,0)))return 0;
    const mitigated=N.mitigate(attributeDamage(amount,profile.damageElementMultiplier),targetDefense(profile,enemy));
    return profile.areaAttack&&!profile.noAreaPenalty&&!doubleHit?(__YggBig.max(1,N.floor((__YggBig.div(mitigated,2))))):mitigated;
  }
  function applyHitEffects(state,enemy,profile,count,random){
    if((__YggBig.le(enemy.hp,0))||enemy.respawnSeconds)return;
    if(profile.sightDebuff)enemy.sightDebuff={...profile.sightDebuff};
    if(profile.confusion)enemy.confusion={...profile.confusion,sourceId:profile.actorId||'hayato'};
    if(profile.tauntId)enemy.tauntId=profile.tauntId;
    if(profile.apReduction)slowAction(enemy,profile.apReduction,enemyMaxHP(state,enemy));
    enemy.defensePenalty=(__YggBig.max(enemy.defensePenalty||0,profile.defenseReduction||0));
    if(profile.apReductionRate)slowAction(enemy,0,1,profile.apReductionRate);
    const chance=profile.accuracyPenaltyChance||0;
    if(chance&&(__YggBig.lt(random(),(__YggBig.eq(count,1))?chance:(__YggBig.neg(Math.expm1((__YggBig.mul(count,(__YggBig.log1p((__YggBig.neg(chance))))))))))))enemy.accuracyPenalty=(__YggBig.max(enemy.accuracyPenalty||0,profile.accuracyPenalty));
    const evasionChance=profile.evasionFailureChance||0;
    if(evasionChance&&(__YggBig.lt(random(),(__YggBig.eq(count,1))?evasionChance:(__YggBig.neg(Math.expm1((__YggBig.mul(count,(__YggBig.log1p((__YggBig.neg(evasionChance))))))))))))enemy.evasionFailure=true;
  }
  function applyDamage(state,amount,events,actor,actorId,random,profile,extraAttack=false,chosenTargets=null,confirmedHit=false,rawDamage=false){
    if(isWaiting(state))return;
    const enemies=ensureEnemies(state);
    if(getSession(state).summons&&!profile.forceSingleTarget)profile={...profile,areaAttack:hasAreaAttack(state,D.characters.find(c=>(__YggBig.eq(c.id,actorId))))};
    const character=D.characters.find(c=>(__YggBig.eq(c.id,actorId)));
    const targets=chosenTargets||attackTargets(state,profile.areaAttack,random,character);
    const originalProfile=profile;
    const automaticHit=!!profile.nonContact||(!confirmedHit&&(__YggBig.gt(profile.autoHitChance,0))&&(__YggBig.lt(random(),profile.autoHitChance)));
    const rawAccuracy=!confirmedHit&&!automaticHit&&profile.accuracy?combatRoll(profile.accuracy,random):null;
    let baseDamageRoll=null;
    for(const [targetIndex,enemy]of targets.entries()){
      if((__YggBig.le(enemy.hp,0)))continue;
      if(character&&rawDamage&&!profile.forceSingleTarget){
        if(!canReach(state,character,enemy))continue;
        const scoped=attackProfile(state,character,false,enemySpec(state,enemy),enemy);
        profile={...originalProfile,...scoped};
      }
      profile={...profile,damageElementMultiplier:attributeMultiplier(enemySpec(state,enemy),profile.attackElements)};
      const burnBefore=enemy.burnDamage||0;
      const poisonBefore=enemy.poisonDamage;
      const bHit=T.hit(profile.accuracy,targetEvasion(profile,enemy),profile.hitLogRatio||0).correction;
      let accuracy=rawAccuracy?{...rawAccuracy,rawTotal:rawAccuracy.total,total:(__YggBig.add(rawAccuracy.total,bHit)),strengthCorrection:bHit}:null;
      const slot=enemies.indexOf(enemy),forcedEvasionFailure=!!accuracy&&!!enemy.evasionFailure;
      let evasion=accuracy?combatRoll(targetEvasion(profile,enemy),random):null;
      if(evasion)for(let i=0;(__YggBig.lt(i,profile.enemyCriticalRetries||0))&&evasion.critical;i++){const original=evasion;evasion={...combatRoll(targetEvasion(profile,enemy),random),original};}
      if(accuracy&&!forcedEvasionFailure)for(let i=0;(__YggBig.lt(i,profile.accuracyRetries||0))&&(__YggBig.le(accuracy.total,evasion.total));i++){const original=accuracy,raw=combatRoll(profile.accuracy,random);accuracy={...raw,rawTotal:raw.total,total:(__YggBig.add(raw.total,bHit)),strengthCorrection:bHit,original};}
      if(forcedEvasionFailure)enemy.evasionFailure=false;
      if(accuracy&&!forcedEvasionFailure&&(__YggBig.le(accuracy.total,evasion.total))){
        if(events)events.push({type:'attack',mental:!!profile.mental,actor,actorId,pomAssisted:!!profile.pomDice,motion:profile.motion,distance:profile.distance,apDamage:!!profile.apAttack,magicLevel:profile.magicLevel||0,damage:0,hit:false,accuracy,evasion,poisonBefore,poisonAfter:poisonBefore,hpBefore:enemy.hp,hpAfter:enemy.hp,targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:(__YggBig.gt(targetIndex,0)),extraAttack});
        continue;
      }
      if(!profile.nonContact)applyHitEffects(state,enemy,profile,1,random);
      const judgment=judgmentBonus(accuracy,evasion);
      if(profile.areaAttack&&judgment.doubleHit)judgment.bonusDice--;
      const jewel=actorId==='jewel'?D.characters.find(c=>c.id==='jewel'):null,ps=jewel?rangedPerks(state,jewel,combatDistance(state,jewel.id,enemy)):[];
      if(judgment.doubleHit&&ps.some(p=>p.rainbowArmor)){
        const wasActive=rainbowActive(state);state.rainbowTurns=3;
        if(!wasActive){profile={...profile,flat:(__YggBig.add(profile.flat,15))};(amount=(__YggBig.add(amount,15)));}
      }
      if(ps.some(p=>p.evasionReduction)){enemy.evasionPenalty=6;enemy.evasionPenaltyTurns=2;}
      const spec={dice:(__YggBig.add((__YggBig.add(profile.dice,profile.pomDice||0)),judgment.bonusDice)),flat:(__YggBig.add((__YggBig.add((__YggBig.add(profile.flat,profile.pomFlat||0)),profile.bonus||0)),judgment.doubleHit?profile.doubleHitDamage||0:0)),resultScale:profile.resultScale??1};
      const correction=rawDamage&&profile.fixedDamage==null?T.damage(spec,targetDefense(profile,enemy),profile.damageLogRatio||0,profile.damageScaleLog||0).correction:0;
      // Keep one shared base roll for a whole-area action; extra judgment dice
      // and each target's inverse correction are resolved after its hit check.
      if(rawDamage&&baseDamageRoll===null)baseDamageRoll=roll((__YggBig.add(profile.dice,profile.pomDice||0)),0,random);
      const powered=rawDamage?(__YggBig.add(scaledCombatTotal((__YggBig.add((__YggBig.add(baseDamageRoll,roll(judgment.bonusDice,0,random))),spec.flat)),spec),correction)):amount;
      let damage=attackDamage(profile,enemy,powered,judgment.doubleHit);if(getSession(state).id==='creator'&&(__YggBig.le(enemy.hp,(__YggBig.mul(enemyMaxHP(state,enemy),.5))))&&(__YggBig.eq(!!profile.mental,!!((enemy.creatorTurns||0)%2))))damage=(__YggBig.floor((__YggBig.div(damage,2))));
      if(profile.apAttack){
        const apBefore=0;const slow=slowAction(enemy,damage,enemyMaxHP(state,enemy));
        if(events)events.push({type:'attack',mental:!!profile.mental,actor,actorId,motion:profile.motion,distance:profile.distance,damage:(__YggBig.round((__YggBig.mul(slow,100)))),rolledDamage:damage,apDamage:true,actionSlow:true,apBefore,apAfter:0,hit:true,accuracy,evasion,...judgment,poisonBefore,poisonAfter:poisonBefore,hpBefore:enemy.hp,hpAfter:enemy.hp,targetSlot:slot,enemyId:enemy.id,extraAttack});
        continue;
      }
      if(judgment.doubleHit&&ps.some(p=>p.doubleHitIncome))grantPerkIncome(state,(__YggBig.min(enemy.hp,damage)),'紅の拳',events);
      if(!profile.nonContact&&profile.poisonDamage)enemy.poisonDamage=(__YggBig.max(enemy.poisonDamage,profile.poisonDamage));
      const hit=(damage,poisonTick=false)=>{
        const before=enemy.hp;(__YggBig.assign(state,"totalDamage","add",()=>((__YggBig.min(before,damage)))));enemy.hp=(__YggBig.max(0,(__YggBig.sub(before,damage))));
        const knockoutRoll=(__YggBig.gt(damage,0))&&(__YggBig.gt(enemy.hp,0))&&(__YggBig.le(enemy.hp,D.balance.knockoutHP))?roll(1,0,random):null;
        const knockedOut=knockoutRoll!==null&&(__YggBig.eq(knockoutRoll%2,1));
        if((__YggBig.gt(damage,0))&&!poisonTick&&!profile.periodic)siblingDamage(state,(__YggBig.add('e:',enemy.id)),random,events);
        if(events)events.push({type:'attack',mental:!!profile.mental,actor:poisonTick?'猛毒':actor,actorId:poisonTick?null:actorId,motion:profile.motion,distance:profile.distance,magicLevel:poisonTick?0:profile.magicLevel||0,damage,elementMultiplier:poisonTick?1:profile.damageElementMultiplier,hit:true,nonContact:poisonTick||!!profile.nonContact,automaticHit:poisonTick||automaticHit,forcedEvasionFailure:poisonTick?false:forcedEvasionFailure,accuracy:poisonTick?null:accuracy,evasion:poisonTick?null:evasion,...(poisonTick?{}:judgment),poisonBefore,poisonAfter:(__YggBig.gt(enemy.hp,0))&&!knockedOut?enemy.poisonDamage:0,hpBefore:before,hpAfter:enemy.hp,
          targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:(__YggBig.gt(targetIndex,0)),extraAttack,pomDice:poisonTick?0:profile.pomDice||0,pomFlat:poisonTick?0:profile.pomFlat||0,poisonTick,knockoutRoll,knockedOut});
        if(!enemy.hp||knockedOut){
          clearEnemy(state,enemy,slot,!poisonTick&&(__YggBig.gt(profile.overkillThreshold,0))&&(__YggBig.ge((__YggBig.sub(damage,before)),profile.overkillThreshold)),knockedOut?'knockout':'hp',events,random);
          if(enemy.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});
          enemy.hp=0;if(state.siblingMarks)delete state.siblingMarks[(__YggBig.add('e:',enemy.id))];if(state.timeline)delete state.timeline.priorities[(__YggBig.add("e:",enemy.id))];delete enemy.confusion;delete enemy.sightDebuff;delete enemy.turnSlowRate;delete enemy.turnSlowSeconds;enemy.wardSeconds=0;enemy.poisonDamage=0;enemy.respawnSeconds=enemy.kind==='kogumo'?0:respawnDelay(state);enemy.actionPoints=0;enemy.pendingAttack=null;enemy.defensePenalty=0;enemy.accuracyPenalty=0;enemy.evasionPenalty=0;enemy.evasionPenaltyTurns=0;enemy.evasionFailure=false;enemy.tauntId=null;enemy.slowSeconds=0;enemy.actionPenalty=0;enemy.queenCancels=0;
          if((__YggBig.eq(state.focusedEnemyId,enemy.id)))state.focusedEnemyId=null;return true;
        }
        if(!poisonTick&&!profile.nonContact&&getSession(state).summons&&enemy.kind!=='kogumo')spawnKogumo(state,damage,events);
        return false;
      };
      const dead=hit(damage);
      if(!dead&&!profile.nonContact&&enemy.poisonDamage)hit(enemy.poisonDamage,true);
      if(!profile.nonContact&&burnBefore&&(__YggBig.gt(enemy.hp,0))&&state.health?.cherry?.status==='active'&&!runawayOf(state,'cherry').runawayCollapsed){
        applyDamage(state,burnBefore,events,'炎上',null,random,{periodic:true,fixedDamage:burnBefore,attackElements:['fire'],nonContact:true,forceSingleTarget:true},false,[enemy],true);
      }
      if((__YggBig.gt(enemy.hp,0))&&!profile.nonContact&&actorId==='cherry'&&cherryPerk(state,'burning'))enemy.burnDamage=cherryDamage(state);
    }
    // An explosion still makes its damage roll when every target evades.
    // The new ward uses magic, not this roll, and is granted once after the action.
    if(rawDamage&&baseDamageRoll===null&&profile.blastEvasionPerMagic)roll(profile.dice,profile.flat,random);
    syncFront(state);if(isWaiting(state))normalizeEnemyActions(state);
    if(events){const last=events.findLast(e=>e.type==='attack'||e.type==='clear');if(last)last.frontHP=state.hp;}
  }
  // Inverse sampling keeps reattack/free-action chains bounded even with a
  // deterministic test RNG; damage and opposed checks still roll real dice.
  function chainAttackCount(chance,random=Math.random){
    if(!((__YggBig.gt(chance,0))&&(__YggBig.lt(chance,1))))return 1;
    const u=(__YggBig.max(0,(__YggBig.min((__YggBig.sub(1,(__YggBig.div(Number.EPSILON,2)))),random()))));
    return (__YggBig.add(1,(__YggBig.floor((__YggBig.div((__YggBig.log1p((__YggBig.neg(u)))),(__YggBig.log(chance))))))));
  }
  function performAttack(state,character,profile,random,events,limit=Infinity){
    if(character&&!hasReachableTarget(state,character))return;
    if(!prepareMagicAction(state,character,events))return;
    const first=attackTargets(state,profile.areaAttack,random,character);
    if(!first.length)return;
    if(character)profile=attackProfile(state,character,false,enemySpec(state,first[0]),first[0]);
    const count=(__YggBig.min(limit,chainAttackCount(profile.extraAttackChance,random)));
    for(let i=0;(__YggBig.lt(i,count))&&!isWaiting(state);i++){
      const targets=i?attackTargets(state,profile.areaAttack,random,character):first;
      if(!targets.length)break;
      if(i&&character&&!attackProfile(state,character,false,enemySpec(state,targets[0]),targets[0]).extraAttackChance)break;
      if(character?.id==='aniya')aniyaMarkAttack(state,targets,random);
      const recoilDice=character?attackRecoilDice(state,character,random):0;
      applyDamage(state,0,events,character?character.name:'あなた',character?.id||null,random,{...profile,pomDice:i?0:state.health[character?.id]?.pomBonus?.dice||0,pomFlat:i?0:state.health[character?.id]?.pomBonus?.flat||0},(__YggBig.gt(i,0)),targets,false,true);
      if(recoilDice){const power=strengthValue(state,character,'power'),defense=strengthValue(state,character,'armor'),spec={dice:recoilDice,flat:0};const correction=T.damage(spec,0,T.relativeLog(power,defense),T.absoluteLog(power,defense)).correction;damageAlly(state,character,(__YggBig.max(1,(__YggBig.add(roll(recoilDice,0,random),correction)))),random,events,'反動');if(healthOf(state,character.id).status!=='active')break;}
    }
    if(character?.id==='cherry'){delete state.health.cherry.fireBonus;if(canAct(state,'cherry')&&cherryPerk(state,'fireExtra')&&(__YggBig.lt(random(),.25)))cherryExtra(state,character,random,events);}
    clearBurns(state);
    finishMagicAttack(state,character,profile);
    if(character?.id==='jewel')state.rainbowTurns=(__YggBig.max(0,(__YggBig.sub(state.rainbowTurns||0,1))));
  }
  function queueManualAttack(state,random=Math.random){
    if(getSession(state).medical||state.viewingMemories||state.dreamShop||state.paused||isResting(state)||isWaiting(state))return [];
    const c=selectedCharacter(state);if(c&&(!canAct(state,c.id)||isStunned(state,c.id)||!hasReachableTarget(state,c)))return [];
    state.timeline||=newTimeline();const pending=state.timeline.manualAttacks||[];if((__YggBig.ge(pending.length,32)))return [];
    if(c?.magicPower&&pending.some(p=>(__YggBig.eq(p.actorId,c.id))))return [];
    const magic=magicState(state,c),charging=(__YggBig.lt(magic.current,magic.maximum));
    const p=attackProfile(state,c,true),target=attackTargets(state,p.areaAttack,random,c)[0];if(!target)return [];
    const remaining=charging?.25:FX.manualImpactSeconds(c?.id,p.motion);state.clicks++;
    state.timeline.manualAttacks=[...pending,{actorId:c?.id||null,targetId:target.id,remaining}];
    // Manual projectiles run alongside the automatic turn clock.
    return [{type:'manualLaunch',pomAssisted:c?.id==='richter'&&(__YggBig.gt(pomUnits(state).length,0)),charging,actorId:c?.id||null,actor:c?.name||'あなた',targetSlot:state.enemies.indexOf(target),enemyId:target.id,motion:p.motion,magicLevel:p.magicLevel||0,count:1,hit:true,damage:0}];
  }
  function resolveManualAttack(state,p,random){
    const c=p.actorId?D.characters.find(c=>(__YggBig.eq(c.id,p.actorId))):null;
    if(!state.enemies?.some(e=>(__YggBig.eq(e.id,p.targetId))&&(__YggBig.gt(e.hp,0))&&!e.respawnSeconds)||c&&!isDeployed(state,c.id))return [];
    const selected=state.selectedCharacterId,focused=state.focusedEnemyId;
    state.selectedCharacterId=p.actorId;state.focusedEnemyId=p.targetId;
    try{const busy=state.timeline.busySeconds||0,events=click(state,random,false);state.timeline.busySeconds=busy;return events.map(e=>({...e,manualImpact:true}));}
    finally{state.selectedCharacterId=selected;state.focusedEnemyId=state.enemies?.some(e=>(__YggBig.eq(e.id,focused))&&(__YggBig.gt(e.hp,0)))?focused:null;syncFront(state);}
  }
  function click(state,random=Math.random,countClick=true){
    if(countClick&&state.viewingMemories)return [];
    if(getSession(state).medical||state.dreamShop||state.paused||isResting(state)||isWaiting(state))return [];
    const character=selectedCharacter(state);
    if(character&&(!canAct(state,character.id)||isStunned(state,character.id)||!hasReachableTarget(state,character)))return [];
    // Unassigned manual attacks remain available to bootstrap the first hire.
    if(countClick)state.clicks++;const events=[];if(!character||beginRunawayAction(state,character,random,events))performAttack(state,character,attackProfile(state,character,true),random,events);if(character)endRunawayAction(state,character,random,events);state.timeline||=newTimeline();state.timeline.busySeconds=(__YggBig.max(state.timeline.busySeconds||0,FX.turnDuration(events)));return events;
  }
  function automaticTick(state,random,events){
    state.timeline||=newTimeline();const units=timelineUnits(state,random).filter(u=>!(u.actor?.magicPower&&state.timeline.manualAttacks?.some(p=>(__YggBig.eq(p.actorId,u.id))))),chosen=smoothTurn(units,state.timeline.priorities);
    if(!chosen)return;state.timeline.turns=(__YggBig.min(Infinity,(__YggBig.add(state.timeline.turns,1))));
    if(chosen.side==='ally'&&chosen.id==='waku')refreshFloorClip(state,true);
    if(events)events.push({type:'timelineTurn',unitKey:chosen.key,actorId:chosen.side==='ally'?chosen.id:null,enemyId:chosen.side==='enemy'?chosen.id:null});
    if(chosen.side==='enemy'){enemyActions(state,random,events,chosen.enemy);if(!chosen.enemy.pendingAttack)siblingRelease(state,(__YggBig.add('e:',chosen.enemy.id)),random,events);advanceRevivalTurns(state,events);return;}
    const c=chosen.actor,count=isStunned(state,c.id)||isActionDonor(state,c)?1:(__YggBig.min(MAX_TURN_ACTIONS,chainAttackCount(freeActionChance(state,c),random)));
    for(let n=0;(__YggBig.lt(n,count))&&!isWaiting(state)&&canAct(state,c.id);n++){
      performAutomaticAction(state,c,random,events);if(isStunned(state,c.id))break;
    }
    advanceRevivalTurns(state,events);
  }
  function* advanceSteps(state,seconds,random=Math.random,collectEvents=true,offline=false){
    // Closed-browser time advances dispatch timers only, never battle state.
    if(offline){if((__YggBig.isFinite(seconds))&&(__YggBig.gt(seconds,0)))Missions.advance(state,seconds);return [];}
    if(state.dreamShop||state.paused||(__YggBig.le(seconds,0)))return [];
    const duration=(__YggBig.min(seconds,D.maxOfflineSeconds)),clock=state.actionClock,speed=battleSpeed(state),events=collectEvents?[]:null;
    state.health||=Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}]));
    state.autoRest||=Object.fromEntries(D.sessions.map(q=>[q.id,newAutoRest()]));
    const contexts=D.sessions.filter(q=>{const ctx=battleContext(state,q.id);return (__YggBig.gt(ctx.timeline?.manualAttacks?.length||0,0))||formationIds(state,q.id).length||(__YggBig.gt(ctx.timeline?.busySeconds||0,0))||isWaiting(ctx)||questChangePending(state,q.id)||ctx.enemies?.some(e=>(__YggBig.gt(e.respawnSeconds,0))||e.pendingAttack);}).map(q=>battleContext(state,q.id));
    for(const ctx of contexts){normalizeEnemyActions(ctx,events?{push:e=>events.push({...e,sessionId:ctx.sessionId})}:null);refreshFloorClip(ctx);}
    let elapsed=0,wallAt=(__YggBig.sub(1,clock));
    const gummyEnabled=(__YggBig.ge(state.levels.pine||0,10))&&(state.perkEnabled?.pine?.['apple-gummy']||false);
    function elapse(dt){
      // Resolve sub-second impacts and respawns in chronological order. The
      // same boundaries are used by live and background simulation.
      let remaining=dt;
      while((__YggBig.gt(remaining,1e-10))){
        const timers=contexts.filter(ctx=>!isResting(ctx)).flatMap(ctx=>ensureEnemies(ctx).flatMap(e=>[duoWaiting(ctx)?Infinity:e.respawnSeconds||Infinity,e.pendingAttack?.remaining??Infinity,isCharm(e.pendingAttack?.kind)&&!e.pendingAttack.charmApplied?(__YggBig.max(1e-9,(__YggBig.sub(e.pendingAttack.remaining,.48)))):Infinity,e.wardSeconds||Infinity]));
        const step=(__YggBig.min(remaining,...timers.map(t=>(__YggBig.div(t,speed))),...contexts.map(restBoundary)));Missions.advance(state,step);advanceRescue(state,step);recoverAllies(state,step,events,contexts);remaining=(__YggBig.max(0,(__YggBig.sub(remaining,step))));(elapsed=(__YggBig.add(elapsed,step)));
        for(const h of Object.values(state.health||{}))if((__YggBig.gt(h.turnSlowSeconds,0))){h.turnSlowSeconds=(__YggBig.max(0,(__YggBig.sub(h.turnSlowSeconds,(__YggBig.mul(step,speed))))));if((__YggBig.lt(h.turnSlowSeconds,1e-9))){h.turnSlowSeconds=0;h.turnSlowRate=0;}}
        for(const h of Object.values(state.health||{}))elapseSummonDelay(h,(__YggBig.mul(step,speed)));
        for(const ctx of contexts){
          for(const p of ctx.timeline?.manualAttacks||[])p.remaining=(__YggBig.max(0,(__YggBig.sub(p.remaining,(__YggBig.mul(step,speed))))));
          if((__YggBig.gt(ctx.timeline?.busySeconds,0)))ctx.timeline.busySeconds=(__YggBig.max(0,(__YggBig.sub(ctx.timeline.busySeconds,(__YggBig.mul(step,speed))))));
          for(const e of ctx.enemies||[])elapseSummonDelay(e,(__YggBig.mul(step,speed)));
          for(const e of ctx.enemies||[])if((__YggBig.gt(e.turnSlowSeconds,0))){e.turnSlowSeconds=(__YggBig.max(0,(__YggBig.sub(e.turnSlowSeconds,(__YggBig.mul(step,speed))))));if((__YggBig.lt(e.turnSlowSeconds,1e-9))){e.turnSlowSeconds=0;e.turnSlowRate=0;}}
          if(isResting(ctx)){if(ctx.timeline?.manualAttacks)ctx.timeline.manualAttacks=ctx.timeline.manualAttacks.filter(p=>(__YggBig.gt(p.remaining,1e-9)));advanceRest(ctx,step);continue;}
          const local=[];
          ctx.factors=state.factors;ctx.earned=state.earned;ctx.credits=state.credits;ctx.creditsEarned=state.creditsEarned;ctx.formations=state.formations;
          const incomeBefore={factors:ctx.factors,earned:ctx.earned,credits:ctx.credits,creditsEarned:ctx.creditsEarned,kills:ctx.kills,totalDamage:ctx.totalDamage};
          const due=(ctx.timeline?.manualAttacks||[]).filter(p=>(__YggBig.lt(p.remaining,1e-9)));
          if(due.length){ctx.timeline.manualAttacks=ctx.timeline.manualAttacks.filter(p=>(__YggBig.ge(p.remaining,1e-9)));for(const p of due)local.push(...resolveManualAttack(ctx,p,random));}
          // Protection expires at Waku's next automatic turn, never on a wall-clock deadline.
          const holdDown=duoWaiting(ctx);
          for(const [slot,e]of ensureEnemies(ctx).entries()){
            if((__YggBig.gt(e.wardSeconds,0)))e.wardSeconds=(__YggBig.max(0,(__YggBig.sub(e.wardSeconds,(__YggBig.mul(step,speed))))));
            if((__YggBig.gt(e.slowSeconds,0))){e.slowSeconds=(__YggBig.max(0,(__YggBig.sub(e.slowSeconds,(__YggBig.mul(step,speed))))));if((__YggBig.lt(e.slowSeconds,1e-9))){e.slowSeconds=0;e.actionPenalty=0;}}
            if((__YggBig.gt(e.respawnSeconds,0))){if(holdDown)continue;e.respawnSeconds=(__YggBig.max(0,(__YggBig.sub(e.respawnSeconds,(__YggBig.mul(step,speed))))));
              if((__YggBig.lt(e.respawnSeconds,1e-9))){Object.assign(e,getSession(ctx).members?newMember(ctx,slot):newEnemy(ctx));if(local)local.push({type:'enemyRespawn',targetSlot:slot,enemyId:e.id});}
            }else if(e.pendingAttack){e.pendingAttack.remaining=(__YggBig.max(0,(__YggBig.sub(e.pendingAttack.remaining,(__YggBig.mul(step,speed))))));
              if(isCharm(e.pendingAttack.kind)&&(__YggBig.le(e.pendingAttack.remaining,.48000001)))applyCharm(ctx,e,slot,random,local);
              if((__YggBig.lt(e.pendingAttack.remaining,1e-9)))resolveEnemyAttack(ctx,e,slot,random,local);
            }
          }
          if(!isResting(ctx))advanceRest(ctx,step);syncFront(ctx);refreshFloorClip(ctx);if(local?.some(e=>e.type==='enemyAttack'||e.type==='enemyAbsorb'||e.type==='enemyCharmEnd'||e.type==='enemyRespawn')){ctx.timeline||=newTimeline();ctx.timeline.busySeconds=(__YggBig.max(ctx.timeline.busySeconds||0,1.2));}if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
          if((__YggBig.ne(ctx,state)))for(const k of Object.keys(incomeBefore))(__YggBig.assign(state,k,"add",()=>((__YggBig.sub(ctx[k],incomeBefore[k])))));
        }
      }
    }
    function readyTurns(){
      for(const ctx of contexts){
        ctx.formations=state.formations;ctx.factors=state.factors;ctx.earned=state.earned;ctx.credits=state.credits;ctx.creditsEarned=state.creditsEarned;
        ctx.questActiveLevels=state.questActiveLevels;
        if(questChangePending(state,ctx.sessionId)&&!questBusy(ctx)){const level=state.pendingQuestLevels[ctx.sessionId];delete state.pendingQuestLevels[ctx.sessionId];applyQuestLevel(state,ctx.sessionId,level,ctx);}
        normalizeEnemyActions(ctx);if(getSession(ctx).medical||isResting(ctx)||isWaiting(ctx)||!activeCharacters(ctx).length||(__YggBig.gt(ctx.timeline?.busySeconds||0,1e-8))||ctx.enemies?.some(e=>e.pendingAttack))continue;
        const before={factors:ctx.factors,earned:ctx.earned,credits:ctx.credits,creditsEarned:ctx.creditsEarned,kills:ctx.kills,totalDamage:ctx.totalDamage},local=[];
        automaticTick(ctx,random,local);
        ctx.timeline.busySeconds=FX.turnDuration(local);
        if((__YggBig.ne(ctx,state)))for(const k of Object.keys(before))(__YggBig.assign(state,k,"add",()=>((__YggBig.sub(ctx[k],before[k])))));
        if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
      }
    }
    // Animation deadlines are battle time; periodic recovery/pressure stay wall time.
    // Starting a turn always creates a finite barrier, including status-only turns.
    readyTurns();
    while((__YggBig.lt(elapsed,(__YggBig.sub(duration,1e-10))))){
      const deadlines=contexts.flatMap(ctx=>{
        if(isResting(ctx))return [restBoundary(ctx)];
        return [...(ctx.timeline?.manualAttacks||[]).map(p=>(__YggBig.div(p.remaining,speed))),(__YggBig.div(ctx.timeline?.busySeconds||Infinity,speed)),...ensureEnemies(ctx).flatMap(e=>[(__YggBig.div(duoWaiting(ctx)?Infinity:e.respawnSeconds||Infinity,speed)),(__YggBig.div(e.pendingAttack?.remaining??Infinity,speed)),(__YggBig.div(e.summonDelaySeconds||Infinity,speed))])];
      });
      const step=(__YggBig.min((__YggBig.sub(duration,elapsed)),(__YggBig.max(1e-9,(__YggBig.sub(wallAt,elapsed)))),...deadlines.filter(t=>(__YggBig.gt(t,1e-8))),...Object.values(state.health).map(h=>(__YggBig.div(h.summonDelaySeconds||Infinity,speed)))));
      elapse(step);
      if((__YggBig.ge((__YggBig.add(elapsed,1e-8)),wallAt))){
        for(const c of D.characters)if(state.levels[c.id]){
          const owner=formationOwner(state,c.id),ctx=contexts.find(q=>(__YggBig.eq(q.sessionId,owner)))||state,before={factors:state.factors,earned:state.earned,credits:state.credits,creditsEarned:state.creditsEarned,kills:state.kills,totalDamage:state.totalDamage};
          Object.assign(ctx,before);ctx.formations=state.formations;
          const local=events?[]:null;
          changeRunaway(ctx,c.id,runawayPressure(state,c),random,local);
          if(events)events.push(...local.map(e=>({...e,sessionId:owner||state.sessionId})));
          if((__YggBig.ne(ctx,state))){for(const k of Object.keys(before))(__YggBig.assign(state,k,"add",()=>((__YggBig.sub(ctx[k],before[k])))));state.formations=ctx.formations;}
        }
        if((__YggBig.lt(random(),(__YggBig.neg(Math.expm1((__YggBig.div((__YggBig.neg(1)),D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds))))))))jewelSideIncome(state,random,events);
        if(gummyEnabled&&(__YggBig.lt(random(),rareEventChance((__YggBig.div(1,600))))))pineGummy(state,random,events);
        (wallAt=(__YggBig.add(wallAt,1)));
      }
      // Do not start an action at the right-open end of this advance call.
      if((__YggBig.lt(elapsed,(__YggBig.sub(duration,1e-10)))))readyTurns();
      yield (__YggBig.div(elapsed,duration));
    }
    autoReviveAllies(state,events);
    for(const ctx of contexts)if((__YggBig.ne(ctx,state)))state.sessionStates={...state.sessionStates,[ctx.sessionId]:battleSnapshot(ctx)};
    state.actionClock=(__YggBig.max(0,((__YggBig.add(clock,duration)))%1));if((__YggBig.lt(state.actionClock,1e-9))||(__YggBig.gt(state.actionClock,(__YggBig.sub(1,1e-9)))))state.actionClock=0;state.sceneSeconds=((__YggBig.add(state.sceneSeconds||0,duration)))%D.sceneCycle.seconds;
    refreshQuestUnlocks(state);refreshPerkUnlocks(state);
    return events||[];
  }
  // Drain the same continuation synchronously for live play. Async recovery
  // suspends this generator without restarting its clocks.
  function advance(state,seconds,random=Math.random,collectEvents=true,offline=false){
    const job=advanceSteps(state,seconds,random,collectEvents,offline);let step;do{step=job.next();}while(!step.done);return step.value;
  }
  function catchUp(state, now = Date.now()) {
    const seconds = (__YggBig.max(0,(__YggBig.div((__YggBig.sub(now,state.savedAt)),1000))));
    const oldKills = state.kills, oldFactors = state.factors;
    advance(state, seconds, Math.random, false, true);
    state.savedAt = now;
    return { seconds, kills: (__YggBig.sub(state.kills,oldKills)), factors: (__YggBig.sub(state.factors,oldFactors)) };
  }
  function hire(state, id) {
    const c = D.characters.find(item => (__YggBig.eq(item.id,id)));
    if (!c || !isCharacterUnlocked(state,c) || !Number.isSafeInteger((__YggBig.add(state.levels[id],1)))) return false;
    const cost = hireCost(state, c),currency=hireCurrency(state,c);
    if (!(__YggBig.isFinite(cost))||(__YggBig.gt(cost,Infinity))||(__YggBig.lt(state[currency],cost))) return false;
    refreshQuestUnlocks(state);
    (__YggBig.assign(state,currency,"sub",()=>(cost)));
    if ((__YggBig.eq(state.levels[id],0))) state.actionPoints[id] = 0;
    state.levels[id]++;
    return true;
  }
  function buyPerk(state,characterId,perkId){return togglePerk(state,characterId,perkId);}
  function togglePerk(state,characterId,perkId,enabled){
    refreshPerkUnlocks(state);const c=D.characters.find(c=>(__YggBig.eq(c.id,characterId))),p=c&&perks(state,c).find(p=>(__YggBig.eq(p.id,perkId)));
    if(!p||!p.owned||p.awakeningLevel||p.mandatory)return false;state.perkEnabled[characterId][perkId]=(__YggBig.eq(enabled,undefined))?!p.enabled:!!enabled;normalizeMagic(state,c);if(p.strengthBonus?.vitality)clampHealth(state,c.id);return true;
  }
  function buyUpgrade(state, id) {
    const u = D.upgrades.find(item => (__YggBig.eq(item.id,id)));
    if (!u || (u.max != null && (__YggBig.ge(state.upgrades[id],u.max))) || !Number.isSafeInteger((__YggBig.add(state.upgrades[id],1)))) return false;
    const cost = upgradeCost(state, u);
    if (!(__YggBig.isFinite(cost)) || (__YggBig.lt(state.factors,cost))) return false;
    refreshQuestUnlocks(state);
    (__YggBig.assign(state,"factors","sub",()=>(cost)));
    state.upgrades[id]++;refreshQuestUnlocks(state);
    return true;
  }
  // All quotes are calculated from the same independently rounded prices as
  // single purchases. A bulk purchase commits only if every step is affordable.
  function tradeTrack(state,kind,id) {
    const c=D.characters.find(c=>(__YggBig.eq(c.id,id))),u=D.upgrades.find(u=>(__YggBig.eq(u.id,id)));
    if(['level','power'].includes(kind)&&c)return {field:'levels',minimum:1,buy:hire,cost:s=>hireCost(s,c)};
    if(kind==='upgrade'&&u)return {field:'upgrades',minimum:0,buy:buyUpgrade,cost:s=>upgradeCost(s,u)};
    if(kind==='quest'&&D.sessions.some(q=>(__YggBig.eq(q.id,id))&&!q.medical))return {field:'questLevels',minimum:1,buy:buyQuest,cost:s=>questCost(s,id)};
    return null;
  }
  function tradeDraft(state) { return {...state,creatorAccess:{...state.creatorAccess},characterUnlocks:{...state.characterUnlocks},defeatCounts:{...state.defeatCounts},sessionClears:{...state.sessionClears},incomeTotals:{...state.incomeTotals},unlockedPerks:structuredClone(state.unlockedPerks),perkEnabled:structuredClone(state.perkEnabled),concentration:structuredClone(state.concentration),actionPoints:{...state.actionPoints},levels:{...state.levels},upgrades:{...state.upgrades},questLevels:{...state.questLevels},questActiveLevels:{...state.questActiveLevels},pendingQuestLevels:{...state.pendingQuestLevels},timeline:structuredClone(state.timeline),sessionStates:structuredClone(state.sessionStates),enemies:state.enemies?structuredClone(state.enemies):null,health:structuredClone(state.health)}; }
  function purchaseQuote(state,kind,id,count=10) {
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);let cost=0;
    if(!track||kind==='quest'&&!isQuestUnlocked(state,id)||![1,10].includes(count))return {valid:false,cost:Infinity,count};
    if(['level','power'].includes(kind)&&!state.levels[id]&&D.characters.find(c=>(__YggBig.eq(c.id,id)))?.hireCurrency)return {valid:false,cost:Infinity,count};
    refreshQuestUnlocks(draft);
    draft.factors=Infinity;
    for(let i=0;(__YggBig.lt(i,count));i++){
      const next=track.cost(draft);
      if(!(__YggBig.isFinite(next))||!track.buy(draft,id)||!(__YggBig.isFinite((__YggBig.add(cost,next))))||(__YggBig.gt((__YggBig.add(cost,next)),Infinity)))return {valid:false,cost:Infinity,count};
      (cost=(__YggBig.add(cost,next)));
    }
    return {valid:true,cost,count,from:state[track.field][id],to:draft[track.field][id]};
  }
  function buyMany(state,kind,id,count=10) {
    const quote=purchaseQuote(state,kind,id,count);
    if(!quote.valid||(__YggBig.lt(state.factors,quote.cost)))return false;
    refreshQuestUnlocks(state);
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);
    // Avoid repeated subtraction rounding changing the final affordable step.
    draft.factors=Infinity;
    for(let i=0;(__YggBig.lt(i,count));i++)if(!track.buy(draft,id))return false;
    draft.factors=(__YggBig.sub(state.factors,quote.cost));Object.assign(state,draft);return true;
  }
  function saleQuote(state,kind,id,count=1) {
    const track=tradeTrack(state,kind,id);
    if(!track||![1,10].includes(count)||kind==='quest'&&!isQuestUnlocked(state,id)||(__YggBig.lt((__YggBig.sub(state[track.field][id],count)),track.minimum)))return {valid:false,refund:0};
    const draft=tradeDraft(state);let refund=0;
    for(let i=0;(__YggBig.lt(i,count));i++){draft[track.field][id]--;const price=track.cost(draft);if(!(__YggBig.isFinite(price)))return {valid:false,refund:0};(refund=(__YggBig.add(refund,(__YggBig.max(1,N.floor((__YggBig.mul(price,.5))))))));}
    return {valid:(__YggBig.isFinite(refund))&&(__YggBig.le((__YggBig.add(state.factors,refund)),Infinity)),refund,count,from:state[track.field][id],to:draft[track.field][id]};
  }
  function sell(state,kind,id,count=1) {
    const quote=saleQuote(state,kind,id,count);if(!quote.valid)return false;
    if(kind==='quest')delete state.pendingQuestLevels[id];
    const track=tradeTrack(state,kind,id),ctx=kind==='quest'?battleContext(state,id):null,oldHP=ctx?getSession(ctx).hp:0,active=ctx?questLevel(state,id):0;
    if(ctx)ensureEnemies(ctx);
    refreshPerkUnlocks(state);state[track.field][id]=quote.to;grantIncome(state,quote.refund,'refund');
    if(['level','power'].includes(kind)){
      const values=concentration(state,id);if((__YggBig.gt(Object.values(values).reduce((n,v)=>(__YggBig.add(n,v)),0),concentrationPoints(state,id))))state.concentration={...state.concentration,[id]:emptyConcentration()};
      clampHealth(state,id);
    }
    if(ctx&&(__YggBig.gt(active,state.questLevels[id]))){
      // A sale is atomic: clamp the challenge to the remaining owned level.
      // Old projectiles must not migrate to the replacement encounter.
      if(ctx.timeline)ctx.timeline.manualAttacks=[];
      applyQuestLevel(state,id,state.questLevels[id],ctx,oldHP);
    }
    return true;
  }
  function selectMemories(state){if(state.viewingMemories||!isMemoriesUnlocked(state))return false;state.memoriesUnlocked=true;state.viewingMemories=true;return true;}
  function selectSession(state,id){
    if(state.dreamShop)return false;
    if(state.viewingMemories&&(__YggBig.eq(state.sessionId,id))){state.viewingMemories=false;return true;}
    if(!isQuestUnlocked(state,id)||(__YggBig.eq(state.sessionId,id)))return false;
    state.viewingMemories=false;refreshQuestUnlocks(state);
    const next=battleContext(state,id),previous=state.sessionId;
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.sessionStates={...state.sessionStates,[previous]:battleSnapshot(state)};
    delete state.sessionStates[id];
    Object.assign(state,battleSnapshot(next));state.sessionId=id;
    if(state.selectedCharacterId&&!isDeployed(state,state.selectedCharacterId))state.selectedCharacterId=null;
    return true;
  }
  function trainingPlan(original,id,targets){
    const tracks=[{id:'level',field:'levels',minimum:1}];
    if(!original.levels[id]||!targets||Object.keys(targets).some(k=>!tracks.some(t=>(__YggBig.eq(t.id,k)))))return {valid:false};
    const draft=tradeDraft(original);let cost=0,refund=0;
    for(const t of tracks){const n=targets[t.id]??original[t.field][id];if(!Number.isSafeInteger(n)||(__YggBig.lt(n,t.minimum)))return {valid:false};}
    for(const t of tracks){const n=targets[t.id]??original[t.field][id];while((__YggBig.gt(draft[t.field][id],n))){const q=saleQuote(draft,t.id,id);if(!q.valid||!sell(draft,t.id,id))return {valid:false};(refund=(__YggBig.add(refund,q.refund)));}}
    for(const t of tracks){const n=targets[t.id]??original[t.field][id],track=tradeTrack(draft,t.id,id);while((__YggBig.lt(draft[t.field][id],n))){const price=track.cost(draft);if(!track.buy(draft,id))return {valid:false};(cost=(__YggBig.add(cost,price)));}}
    return {valid:true,state:draft,cost,refund};
  }
  function profileAverage(state,p){
    if(p.reachable===false)return 0;
    if(p.fixedDamage!=null)return attributeDamage(p.fixedDamage,p.damageElementMultiplier);
    const original=p;
    const average=enemy=>{const c=D.characters.find(c=>(__YggBig.eq(c.id,original.actorId))),ctx=c?.magicPower?{...state,health:{...state.health,[c.id]:{...healthOf(state,c.id),magicLevel:original.magicLevel}}}:state;
      const p=c&&enemy&&(getSession(state).members||enemy.kind==='kogumo'||(__YggBig.ne(combatDistance(state,c.id,enemy),original.distance)))?attackProfile(ctx,c,false,enemySpec(state,enemy),enemy):original;
      const outcomes=judgmentOutcomes(p.accuracy,targetEvasion(p,enemy),p.hitLogRatio||0,p.accuracyRetries,p.enemyCriticalRetries),auto=p.autoHitChance||0,defense=targetDefense(p,enemy);
      const mean=(extra=0,double=0)=>{const spec={dice:(__YggBig.sub((__YggBig.add(p.dice,extra)),p.areaAttack?double:0)),flat:(__YggBig.add((__YggBig.add(p.flat,p.bonus||0)),(__YggBig.mul(double,p.doubleHitDamage||0)))),resultScale:p.resultScale??1},b=T.damage(spec,defense,p.damageLogRatio||0,p.damageScaleLog||0).correction;
        return T.distribution(spec,false).reduce((n,[a,,w])=>{const d=(__YggBig.max(1,(__YggBig.sub(attributeDamage((__YggBig.add(a,b)),p.damageElementMultiplier),defense))));return (__YggBig.add(n,(__YggBig.mul((__YggBig.eq(p.damageElementMultiplier,0))?0:p.areaAttack&&!p.noAreaPenalty&&!double?(__YggBig.max(1,(__YggBig.floor((__YggBig.div(d,2)))))):d,w))));},0);};
      return (__YggBig.add((__YggBig.mul(auto,mean())),(__YggBig.mul((__YggBig.sub(1,auto)),(__YggBig.add(outcomes.conditional.reduce((n,[extra,double,w])=>(__YggBig.add(n,(__YggBig.mul(w,mean(extra,double))))),0),enemy?.evasionFailure?(__YggBig.mul((__YggBig.sub(1,outcomes.chance)),mean())):0))))));};
    const actor=D.characters.find(c=>(__YggBig.eq(c.id,p.actorId))),live=(state.enemies||[]).filter(e=>(__YggBig.gt(e.hp,0))&&!e.respawnSeconds&&(!actor||canReach(state,actor,e))),focused=live.find(e=>(__YggBig.eq(e.id,state.focusedEnemyId))),targets=p.areaAttack?live:focused?[focused]:live;
    if(state.enemies?.some(e=>(__YggBig.gt(e.hp,0)))&&!targets.length)return 0;
    if(!targets.length)return (__YggBig.mul(average(null),p.areaAttack?3:1));const total=targets.reduce((n,e)=>(__YggBig.add(n,average(e))),0);return p.areaAttack?total:(__YggBig.div(total,targets.length));
  }
  function attackForecastProfile(state,c,target=null){
    if(!c?.magicPower)return target?attackProfile(state,c,false,enemySpec(state,target),target):attackProfile(state,c);
    const m=magicState(state,c),forecast={...state,health:{...state.health,[c.id]:{...healthOf(state,c.id),magicLevel:m.maximum}}};
    return target?attackProfile(forecast,c,false,enemySpec(forecast,target),target):attackProfile(forecast,c);
  }
  const averageAttackDamage=(state,c)=>{const p=attackForecastProfile(state,c);return p.apAttack?0:profileAverage(state,p);};
  function characterMetrics(state,c,uptime=combatUptime(state)){
    const damage=averageAttackDamage(state,c),attacksPerSecond=(__YggBig.mul(effectiveAttackRate(state,c),uptime));
    const p=attackForecastProfile(state,c);
    return {damage,apDamage:p.apAttack?profileAverage(state,p):0,attacksPerSecond,dps:(__YggBig.mul(damage,attacksPerSecond)),action:actionPower(state,c),transfersPerSecond:isActionDonor(state,c)?(__YggBig.mul(automaticActionRate(state,c),uptime)):0};
  }
  const characterDps=(state,c)=>characterMetrics(state,c).dps;
  const dpsCache=new Map();
  function dpsKey(state){
    return JSON.stringify([combatKey(state),state.health,state.enemies,state.focusedEnemyId,state.rainbowTurns,state.selectedCharacterId,state.respawnSeconds],(key,value)=>{
      if(['regenSeconds','actionPoints','busySeconds'].includes(key))return undefined;
      if(key==='pendingAttack')return !!value;
      if(key==='hp')return (__YggBig.gt(value,0));
      if(['respawnSeconds','wardSeconds','slowSeconds','turnSlowSeconds','summonDelaySeconds'].includes(key))return (__YggBig.gt(value,0));
      return value;
    });
  }
  const dps=state=>{
    const key=dpsKey(state);
    if(dpsCache.has(key))return dpsCache.get(key);
    const uptime=combatUptime(state),value=activeCharacters(state).reduce((n,c)=>(__YggBig.add(n,characterMetrics(state,c,uptime).dps)),0);
    if((__YggBig.ge(dpsCache.size,32)))dpsCache.delete(dpsCache.keys().next().value);dpsCache.set(key,value);return value;
  };
  // Display-only sustained attacking DPS; no simulated respawn/health uptime.
  const combatUptime=()=>1;
  const totalDps=state=>D.sessions.filter(q=>formationIds(state,q.id).length).reduce((n,q)=>(__YggBig.add(n,dps(battleContext(state,q.id)))),0);
  function combatKey(state){const q=getSession(state),ids=formationIds(state);return JSON.stringify([restOf(state).enabled,restOf(state).kills,restOf(state).minutes,restOf(state).restMinutes,isResting(state),q.id,q.level,q.hp,q.reward,q.defense,q.resistance,q.evasion,q.traits,q.action,q.actionDice,q.attack,q.accuracy,q.ss,q.attackType,state.concentration,state.formationRows,ids,state.levels,state.upgrades,state.purchasedPerks,state.perkEnabled,ids.map(id=>activation(state,D.characters.find(c=>(__YggBig.eq(c.id,id))))),ids.includes('max')?state.selectedCharacterId:null,ids.includes('jewel')&&activePerks(state,D.characters.find(c=>c.id==='jewel')).some(p=>p.investmentArmor)?state.credits:(__YggBig.gt(state.factors,1e99))?state.factors:0,state.seedLevels,state.karmaSelections]);}
  function autoReviveAllies(state,events){
    for(const c of D.characters){
      const h=state.health?.[c.id],owner=formationOwner(state,c.id);
      if(!owner||owner==='infirmary'||!h||h.status==='active'||(__YggBig.gt(h.revivalTurns,0))||runawayOf(state,c.id).runawayCollapsed||isResting(battleContext(state,owner)))continue;
      if(!perks(state,c).some(p=>p.autoRevive&&p.eligible&&p.enabled))continue;
      const cost=revivalCost(state,c.id);
      if(revive(state,c.id,false,true)&&events)events.push({type:'revivePending',actorId:c.id,turns:10,automatic:true,cost,sessionId:owner});
    }
  }
  function revivalCost(state,id){
    const c=D.characters.find(c=>(__YggBig.eq(c.id,id)));if(!c||!state.levels[id])return Infinity;
    const cost=(__YggBig.add(c.cost,N.delta((__YggBig.mul(trainingInvestment(state,c),.20)))));return (__YggBig.isFinite(cost))&&(__YggBig.le(cost,Infinity))?cost:Infinity;
  }
  function revive(state,id,useItem=false,automatic=false){
    const cost=revivalCost(state,id),h=state.health?.[id],c=D.characters.find(c=>(__YggBig.eq(c.id,id)));
    if(state.dreamShop||!c||!state.levels[id]||!h||h.status==='active'||(__YggBig.gt(h.revivalTurns,0))||(useItem?(__YggBig.lt(state.inventory?.[3]||0,1)):!(__YggBig.isFinite(cost))||(__YggBig.lt(state.factors,cost))))return false;
    refreshQuestUnlocks(state);
    if(useItem)state.inventory[3]--;else (__YggBig.assign(state,"factors","sub",()=>(cost)));if(automatic){h.revivalTurns=10;h.revivalSeconds=10;}else finishRevival(state,id);return true;
  }
  function revivalUsesSeconds(state,id,context=null){
    const owner=formationOwner(state,id);if(!owner)return true;
    const ctx=context||battleContext(state,owner);
    if(getSession(ctx).medical||isResting(ctx)||!activeCharacters(ctx).length)return true;
    // Attack animations and enemy respawns are part of a running battle.
    if((__YggBig.gt(ctx.timeline?.busySeconds||0,1e-8))||ctx.enemies?.some(e=>e.pendingAttack)||isWaiting(ctx))return false;
    return (__YggBig.eq(timelineUnits(ctx).length,0));
  }
  function finishRevival(state,id,events,sessionId=formationOwner(state,id)){
    const h=state.health[id],c=D.characters.find(c=>(__YggBig.eq(c.id,id)));
    delete h.revivalTurns;delete h.revivalSeconds;
    h.hp=maxHP(state,c);h.status='active';h.regenSeconds=0;
    if(events)events.push({type:'revive',actorId:id,hp:h.hp,sessionId});
  }
  function advanceRevivalTurns(state,events){
    for(const id of formationIds(state)){
      const h=state.health[id];if(!((__YggBig.gt(h?.revivalTurns,0))))continue;
      if((__YggBig.gt(--h.revivalTurns,0)))continue;
      finishRevival(state,id,events,state.sessionId);
    }
  }
  function newRunaway(c){return {runawayRate:0,activationType:c.activationType,baseRunawayPressure:c.baseRunawayPressure||0,runawaySymptom:null,runawayCollapsed:false,criticalReserve:0,temporaryRunawayPressure:0,thresholdArmedState:Object.fromEntries(D.runawayThresholds.map(t=>[t,true]))};}
  function runawayOf(state,id){return state.runaway?.[id]||newRunaway(D.characters.find(c=>(__YggBig.eq(c.id,id))));}
  function activation(state,c){
    const r=runawayOf(state,c.id),n=[50,60,70].filter(t=>(__YggBig.ge(r.runawayRate,t))).length,type=r.activationType;
    return {stacks:n,dice:[80,90].filter(t=>(__YggBig.ge(r.runawayRate,t))).length,damage:type==='augment'?n:0,reaction:type==='reaction'?n:0,action:type==='sense'?n:0,recovery:type==='recovery'?n:0,awakening:type==='awakening'?(c.awakeningEffects||[]):[]};
  }
  function trainingPressureLevels(state,c){
    return D.concentration.map(t=>({id:t.id,level:concentration(state,c.id)[t.id]||0}));
  }
  function trainingRunawayPressure(state,c){
    return (__YggBig.mul(D.runtimeBalance.trainingPressureScale,(__YggBig.log2((__YggBig.add(1,trainingPressureLevels(state,c).reduce((n,t)=>(__YggBig.add(n,t.level)),0)))))));
  }
  // The ability panel and the once-per-second runtime share this calculation.
  // Entries retain their configured values when OFF or ineligible for inspection.
  function runawayPressureBreakdown(state,c){
    const r=runawayOf(state,c.id),deployed=!!formationOwner(state,c.id),healthy=healthOf(state,c.id).status==='active';
    const active=deployed&&healthy&&!r.runawayCollapsed&&!isResting(state,formationOwner(state,c.id));
    const trainingLevels=trainingPressureLevels(state,c),trainingTotal=trainingLevels.reduce((n,t)=>(__YggBig.add(n,t.level)),0),trainingScale=D.runtimeBalance.trainingPressureScale;
    const training=(__YggBig.mul(trainingScale,(__YggBig.log2((__YggBig.add(1,trainingTotal))))));
    const perkEntries=perks(state,c).map(p=>({id:p.id,name:p.name,enabled:p.enabled,eligible:p.eligible,configured:p.runawayPressure||0,pressure:p.enabled&&p.eligible?p.runawayPressure||0:0}));
    const perkPressure=perkEntries.reduce((n,p)=>(__YggBig.add(n,p.pressure)),0);
    const calmingEntries=D.upgrades.filter(u=>u.pressure).map(u=>({id:u.id,name:u.name,level:state.upgrades[u.id]||0,perLevel:u.pressure,pressure:(__YggBig.mul(state.upgrades[u.id]||0,u.pressure))}));
    const owner=formationOwner(state,c.id);
    if(owner)for(const p of supportPerks(battleContext(state,owner)).filter(p=>p.partyCalming))calmingEntries.push({id:p.id,name:p.name,level:1,perLevel:p.partyCalming,pressure:p.partyCalming,source:'perk'});
    const calming=calmingEntries.reduce((n,u)=>(__YggBig.add(n,u.pressure)),0);
    const base=r.baseRunawayPressure,temporary=r.temporaryRunawayPressure||0,source=(__YggBig.add((__YggBig.add((__YggBig.add(base,training)),perkPressure)),temporary));
    const recoveryStacks=activation(state,c).recovery,recoveryReduction=D.runtimeBalance.runawayPressureReductionPerStack,recoveryMultiplier=(__YggBig.sub(1,(__YggBig.mul(recoveryStacks,recoveryReduction))));
    const seedPressureMultiplier=(__YggBig.pow(.95,state.seedLevels?.sloth||0));
    const generated=active?(__YggBig.mul((__YggBig.mul(source,recoveryMultiplier)),(__YggBig.gt(source,0))?seedPressureMultiplier:1)):0;
    return {medicalOverride:owner==='infirmary',seedPressureMultiplier,base,training,trainingScale,trainingLevels,trainingTotal,perkEntries,perkPressure,temporary,source,recoveryStacks,recoveryReduction,recoveryMultiplier,calmingEntries,calming,generated,net:owner==='infirmary'?(__YggBig.div((__YggBig.neg(10)),60)):(__YggBig.sub(generated,calming)),active,inactiveReason:active?null:r.runawayCollapsed?'collapsed':!healthy?'down':'undeployed',criticalReserve:r.criticalReserve||0};
  }
  function runawayPressure(state,c){return runawayPressureBreakdown(state,c).net;}
  function suppressionQuote(state,id=null){
    const ids=id===null?formationIds(state):[id];
    const targets=ids.filter(x=>D.characters.some(c=>(__YggBig.eq(c.id,x)))&&(__YggBig.gt(state.levels[x],0))&&(__YggBig.gt(runawayOf(state,x).runawayRate,0)));
    const cost=targets.length;
    return {targets,cost,valid:(__YggBig.gt(targets.length,0))&&(__YggBig.isFinite(cost))&&(__YggBig.le(cost,Infinity))};
  }
  function suppressRunaway(state,id=null){
    const quote=suppressionQuote(state,id);if(state.dreamShop||!quote.valid||(__YggBig.lt(state.inventory?.[2]||0,quote.cost)))return false;
    (__YggBig.assign(state.inventory,2,"sub",()=>(quote.cost)));
    for(const target of quote.targets)changeRunaway(state,target,(__YggBig.neg(10)));
    return true;
  }
  function healWithMagtough(state,id){
    const c=D.characters.find(c=>(__YggBig.eq(c.id,id))),h=state.health?.[id];
    if(state.dreamShop||!c||!state.levels[id]||!h||(__YggBig.lt(state.inventory?.[0]||0,1))||(__YggBig.ge(h.hp,maxHP(state,c))))return false;
    state.inventory[0]--;healAlly(state,c,(__YggBig.max(1,N.floor((__YggBig.mul(maxHP(state,c),.1))))),null,formationOwner(state,id));return true;
  }
  function criticalFactorReward(state,c,threshold){return (__YggBig.max(0,N.floor((__YggBig.mul(trainingInvestment(state,c),D.runtimeBalance.criticalRewardRate)))));}
  function damageAlly(state,c,amount,random,events,source='runaway'){
    if((__YggBig.le(amount,0)))return 0;
    const h=state.health[c.id],before=h.hp;amount=(__YggBig.max(1,N.floor((__YggBig.min(Infinity,amount)))));
    let damage=amount;
    if((__YggBig.le((__YggBig.sub(before,damage)),0))&&state.upgrades.badLuck&&(__YggBig.lt(random(),.3)))damage=(__YggBig.max(1,(__YggBig.floor((__YggBig.div(damage,2))))));
    if((__YggBig.le((__YggBig.sub(before,damage)),0))&&state.upgrades.fightingSpirit&&(__YggBig.lt(random(),.3))){h.hp=1;h.status='active';}
    else {h.hp=(__YggBig.max((__YggBig.neg(Infinity)),(__YggBig.sub(h.hp,damage))));if((__YggBig.lt(h.hp,0)))h.status='dying';else if((__YggBig.lt(h.hp,4))&&(__YggBig.lt(random(),.5)))h.status='unconscious';}
    if(!['炎上','猛毒','継続'].includes(source))siblingDamage(state,(__YggBig.add('a:',c.id)),random,events);
    if(events)events.push({type:'runawayDamage',targetId:c.id,source,damage,hpBefore:before,hpAfter:h.hp,status:h.status});
    if((__YggBig.eq(before,maxHP(state,c))))h.regenSeconds=0;
    if(h.status!=='active')clearTurnEffects(h);
    normalizeEnemyActions(state,events);return damage;
  }
  function nonContactSelfDamage(state,c,rate,random,events){
    const p=attackProfile(state,c),spec={dice:p.dice,flat:(__YggBig.add(p.flat,p.bonus||0)),resultScale:p.resultScale},attackStrength=strengthValue(state,c,'power'),defenseStrength=strengthValue(state,c,'armor'),ratio=T.relativeLog(attackStrength,defenseStrength);
    const b=T.damage(spec,0,ratio,T.absoluteLog(attackStrength,defenseStrength)).correction,damage=(__YggBig.max(1,(__YggBig.add(scaledCombatTotal(roll(spec.dice,spec.flat,random),spec),b))));
    damageAlly(state,c,(__YggBig.max(1,(__YggBig.floor((__YggBig.mul(damage,rate)))))),random,events);
  }
  function runawayAttack(state,c,random,events,selfAttack=null,withinTurn=false){
    if(isStunned(state,c.id)||!prepareMagicAction(state,c,events))return;
    const allies=activeCharacters(state),enemies=livingEnemies(state),all=[...allies.map(c=>({c})),...enemies.map(e=>({e}))];if(!all.length)return;
    const chosen=all[(__YggBig.min((__YggBig.sub(all.length,1)),(__YggBig.floor((__YggBig.mul(random(),all.length))))))],p=attackProfile(state,c);
    const finish=()=>finishMagicAttack(state,c,p,withinTurn);
    if(chosen.e){applyDamage(state,0,events,c.name,c.id,random,{...p,areaAttack:false,forceSingleTarget:true},false,[chosen.e],false,true);finish();return;}
    if(siblingCancel(state,(__YggBig.add('a:',c.id)),chosen.c.id,random,events)){finish();return;}
    const target=chosen.c,mental=!!p.mental,hitSpec=accuracySpec(state,c),evasionDice=evasionSpec(state,target,mental);
    const ignoreDefense=p.ignoreDefense&&!penetrationImmune(target),attackStrength=strengthValue(state,c,'power'),defenseStrength=strengthValue(state,target,'armor');
    const attack=selfAttack&&(__YggBig.eq(target.id,c.id))?{...selfAttack,resultScale:p.resultScale}:{dice:p.dice,flat:(__YggBig.add(p.flat,p.bonus||0)),resultScale:p.resultScale};
    const incoming={damageElementMultiplier:attributeMultiplier(allyElements(state,target),p.attackElements),...turnEffects(state,target.id),accuracySpec:hitSpec,evasionDice,attack,reduction:ignoreDefense?0:armor(state,target,mental),postReduction:activation(state,target).damage,shield:0,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),strengthValue(state,target,'evasion')),damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength)};
    const result=rollEnemyHit(incoming,random);delete state.health[target.id].blastEvasion;
    if(!result.hit&&p.blastEvasionPerMagic)roll(attack.dice,attack.flat,random,attack.sides);
    if(result.hit)receiveFire(state,target,p.attackElements,c.id);
    if(result.hit){if(p.apAttack)slowAction(healthOf(state,target.id),result.damage,maxHP(state,target));else damageAlly(state,target,result.damage,random,events,'misfire');}
    finish();
    if(events)events.push({type:'runawayMisfire',actorId:c.id,targetId:target.id,hit:result.hit});
  }
  function symptomRoll(state,c,random,events){
    const first=roll(1,0,random),second=roll(1,0,random),r=runawayOf(state,c.id);
    const even=['control','overload','hearing','vision','body',null],odd=['ability','language','memory','mind','oblivion',null];
    r.runawaySymptom=(first%2?odd:even)[(__YggBig.sub(second,1))];
    if(events)events.push({type:'runawaySymptom',actorId:c.id,symptom:r.runawaySymptom,dice:[first,second]});
    if(r.runawaySymptom==='ability')changeRunaway(state,c.id,2,random,events);
  }
  function thresholdEvent(state,c,threshold,random,events){
    const r=runawayOf(state,c.id);
    const result=(outcome,dice=[])=>{if(events)events.push({type:'runawayRoll',actorId:c.id,threshold,outcome,dice});};
    if(events)events.push({type:'runawayThreshold',actorId:c.id,threshold});
    const replacement=[50,70,90].includes(threshold)&&activePerks(state,c).find(p=>p.runawayAsMisfire);
    if(replacement){result('misfire');runawayAttack(state,c,random,events,replacement.misfireSelfAttack);return;}
    if((__YggBig.eq(threshold,50))){
      const face=roll(1,0,random);result((__YggBig.eq(face,1))?'selfDamage':(__YggBig.le(face,3))?'rise':'control',[face]);
      if((__YggBig.eq(face,1)))nonContactSelfDamage(state,c,.5,random,events);else if((__YggBig.le(face,3)))changeRunaway(state,c.id,roll(1,0,random),random,events);
    }
    else if((__YggBig.eq(threshold,70))){
      const face=roll(1,0,random);
      // The symptom event carries its own actual two-die result, including 自制.
      if((__YggBig.ne(face,5)))result((__YggBig.le(face,2))?'selfDamage':(__YggBig.eq(face,3))?'misfire':(__YggBig.eq(face,4))?'chain':'control',[face]);
      if((__YggBig.le(face,2)))nonContactSelfDamage(state,c,1,random,events);else if((__YggBig.eq(face,3)))runawayAttack(state,c,random,events);else if((__YggBig.eq(face,4)))changeRunaway(state,c.id,roll(2,0,random),random,events);else if((__YggBig.eq(face,5)))symptomRoll(state,c,random,events);
    }
    else if((__YggBig.eq(threshold,90)))symptomRoll(state,c,random,events);
    else if((__YggBig.ge(threshold,110))&&(__YggBig.lt(threshold,150))){
      grantIncome(state,criticalFactorReward(state,c,threshold),'secondaryIncome',events,{actorId:c.id,perk:'臨界因子'});
      if((__YggBig.lt(random(),.5))){result('selfDamage');nonContactSelfDamage(state,c,1,random,events);}
      else {result('criticalRecovery');const h=state.health[c.id],before=h.hp;h.hp=(__YggBig.min(maxHP(state,c),(__YggBig.add(h.hp,(__YggBig.max(1,(__YggBig.floor((__YggBig.div((__YggBig.mul(maxHP(state,c),roll(2,0,random))),28))))))))));(__YggBig.assign(r,"criticalReserve","add",()=>(roll(2,0,random))));if((__YggBig.eq(h.hp,maxHP(state,c)))){delete h.revivalTurns;delete h.revivalSeconds;h.status='active';h.regenSeconds=0;}if(events)events.push({type:'heal',actorId:c.id,amount:(__YggBig.sub(h.hp,before)),hp:h.hp});}
    }else if((__YggBig.eq(threshold,150))){
      r.runawayCollapsed=true;
      // Runaway down keeps the roster, selection and HP. It recovers below 100%.
      state.actionPoints[c.id]=0;clearTurnEffects(state.health[c.id]);
      const owner=formationOwner(state,c.id),ctx=owner?battleContext(state,owner):state;
      normalizeEnemyActions(ctx,events);
      if((__YggBig.ne(ctx,state)))state.sessionStates={...state.sessionStates,[owner]:battleSnapshot(ctx)};
    }
  }
  function changeRunaway(state,id,delta,random=Math.random,events=null){
    const c=D.characters.find(c=>(__YggBig.eq(c.id,id)));if(!c||!(__YggBig.isFinite(delta)))return false;
    state.runaway||={};const r=state.runaway[id]||=(newRunaway(c));
    if((__YggBig.gt(delta,0))){const used=(__YggBig.min(delta,r.criticalReserve));(__YggBig.assign(r,"criticalReserve","sub",()=>(used)));(delta=(__YggBig.sub(delta,used)));}
    if((__YggBig.le(delta,0))){r.runawayRate=(__YggBig.max(0,(__YggBig.add(r.runawayRate,delta))));for(const t of D.runawayThresholds)if((__YggBig.le(r.runawayRate,(__YggBig.sub(t,10)))))r.thresholdArmedState[t]=true;if((__YggBig.lt(r.runawayRate,70)))r.runawaySymptom=null;if((__YggBig.lt(r.runawayRate,100)))r.runawayCollapsed=false;return true;}
    // Consume the requested rise in threshold order. Nested rises (高揚/連鎖)
    // enter through this same function after disarming the current threshold.
    let remaining=delta;
    while((__YggBig.gt(remaining,1e-10))&&(__YggBig.lt(r.runawayRate,150))){
      const target=(__YggBig.min(150,(__YggBig.add(r.runawayRate,remaining)))),next=D.runawayThresholds.find(t=>r.thresholdArmedState[t]&&(__YggBig.gt(t,r.runawayRate))&&(__YggBig.le(t,target)));
      if((__YggBig.eq(next,undefined))){r.runawayRate=target;break;}
      (remaining=(__YggBig.sub(remaining,(__YggBig.sub(next,r.runawayRate)))));r.runawayRate=next;r.thresholdArmedState[next]=false;thresholdEvent(state,c,next,random,events);
      if((__YggBig.gt(remaining,0))&&r.criticalReserve){const used=(__YggBig.min(remaining,r.criticalReserve));(remaining=(__YggBig.sub(remaining,used)));(__YggBig.assign(r,"criticalReserve","sub",()=>(used)));}
    }
    return true;
  }
  function preparePerkFailures(state,random){
    state.perkFailures={};for(const c of activeCharacters(state)){const symptom=runawayOf(state,c.id).runawaySymptom;if((symptom==='ability'||symptom==='language')&&(__YggBig.lt(random(),.5)))state.perkFailures[c.id]=symptom==='ability'?'all':'support';}
  }
  function beginRunawayAction(state,c,random,events){
    if(c.id==='richter')consumePoms(state);
    if(!canAct(state,c.id)||isStunned(state,c.id))return false;preparePerkFailures(state,random);
    const symptom=runawayOf(state,c.id).runawaySymptom;
    if(symptom==='oblivion'&&(__YggBig.lt(random(),.5))){if(events)events.push({type:'runawaySkip',actorId:c.id});return false;}
    if(symptom==='control'&&(__YggBig.lt(random(),.5))){runawayAttack(state,c,random,events,null,true);return false;}
    if(c.id==='cherry'&&cherryPerk(state,'volcano'))fireField(state,c,random,events);
    return canAct(state,c.id);
  }
  function endRunawayAction(state,c,random,events){
    siblingRelease(state,(__YggBig.add('a:',c.id)),random,events);
    if(c.id==='richter')summonPoms(state);
    if(canAct(state,c.id)&&runawayOf(state,c.id).runawaySymptom==='overload')nonContactSelfDamage(state,c,D.runtimeBalance.overloadDamageRate,random,events);
    const h=state.health[c.id];if((__YggBig.gt(h.blastTurns,0))&&(__YggBig.eq(--h.blastTurns,0))){delete h.blastTurns;delete h.blastEvasion;}
    delete state.perkFailures;
  }
  // Poisson hazard/exposure form shared with the gummy event. Calibrate one attack to exactly 8%.
  const rareEventChance=(hazard,exposure=1)=>(__YggBig.neg(Math.expm1((__YggBig.mul((__YggBig.neg(hazard)),exposure)))));
  function attackRecoilDice(state,character,random){return activePerks(state,character).reduce((dice,p)=>(__YggBig.add(dice,p.recoilDice&&(__YggBig.lt(random(),rareEventChance((__YggBig.neg((__YggBig.log1p((__YggBig.neg(p.recoilChance)))))))))?p.recoilDice:0)),0);}
  function pineGummy(state,random,events){
    if(state.dreamShop||state.paused)return 0;const owner=formationOwner(state,'pine');if(!owner)return 0;const ctx=battleContext(state,owner),c=D.characters.find(c=>c.id==='pine');if(!canAct(ctx,'pine'))return 0;
    const ps=activePerks(ctx,c),base=ps.reduce((n,p)=>(__YggBig.add(n,p.gummyHeal||0)),0);if(!base)return 0;
    if(['ability','language'].includes(runawayOf(state,'pine').runawaySymptom)&&(__YggBig.lt(random(),.5)))return 0;
    const before=state.health.pine.hp,amount=(__YggBig.max(1,N.floor((__YggBig.mul(maxHP(ctx,c),(__YggBig.add(base,ps.reduce((n,p)=>(__YggBig.add(n,p.gummyBonus||0)),0))))))));healAlly(state,c,amount,events?{push:e=>events.push({...e,perk:'アップルグミ'})}:null,owner);return (__YggBig.sub(state.health.pine.hp,before));
  }
  function jewelEligible(state){
    const owner=formationOwner(state,'jewel');if(!owner)return false;const ctx=battleContext(state,owner),c=D.characters.find(c=>c.id==='jewel');
    return canAct(ctx,'jewel')&&activePerks(ctx,c).some(p=>p.sideIncome);
  }
  function jewelSideIncome(state,random,events){
    if(state.dreamShop||state.paused||!jewelEligible(state))return 0;
    const symptom=runawayOf(state,'jewel').runawaySymptom;
    if(['ability','language'].includes(symptom)&&(__YggBig.lt(random(),.5)))return 0;
    return grantPerkIncome(state,(__YggBig.floor((__YggBig.mul(state.credits,D.runtimeBalance.jewelSideIncomeRate)))),'臨時収入',events);
  }

  const api = { confusionRelease,siblingActive,siblingRelease,siblingDamage,siblingCancel,aniyaFollowup,aniyaMarkAttack, confusionTarget,confusedEnemyAttack,finishSightTurn,enemyActions,resolveEnemyAttack,revivalUsesSeconds,hireCurrency,refreshCharacterUnlocks,requirementMet,receiveBreak, newRescue,rescueAvailable,rescueClear,advanceRescue,openRescue,closeRescue,completeRescue, healWithMagtough, creditAmount:Missions.creditAmount,grantCredits:Missions.grantCredits, attackRecoilDice,rareEventChance,isCharacterUnlocked, pineGummy, partyCapacity,pomUnits,consumePoms,summonPoms,damagePoms,pomIncoming,allyElements,receiveFire,cherryDamage,fireField,cherryExtra,clearBurns,sinIncomeMultiplier,incomeAmount, queueManualAttack, refundSeed, attributeMultiplier,attributeDamage,attributeSummary,elementNames,elementalPerk, resetDreamPurchases,sinEntitlement,beginDream,seedCost,buySeed,seedMultiplier,questChangePending,battleSpeed,SUMMON_DELAY_SECONDS,markSummoned,newTimeline,actionWeight,smoothTurn,timelineUnits,timelineView,slowAction,MAX_TURN_ACTIONS,MAX_CHAIN_HITS,advanceSteps, observeIncome, combatKey, dpsKey, newAutoRest,restOf,isResting,setAutoRest, formationRow,inRange,combatDistance,canReach,reachableEnemies,hasReachableTarget,enemyCanReach,rangedPerks,attackMotion, magicState, ownActionBonus, attackForecastProfile, isStunned, turnEffects, nextRun, isMemoriesUnlocked, incomeRecord, rolloverIncome, enemyStrength, selectMemories, concentrationResetCost, resetConcentration, strengthValue, concentrationPoints, clampHealth, hpStrength, hpFromStrength, enemyActionValue, suppressionQuote,suppressRunaway,newRunaway,runawayOf,activation,trainingRunawayPressure,runawayPressureBreakdown,runawayPressure,criticalFactorReward,changeRunaway,symptomRoll,thresholdEvent,jewelEligible,jewelSideIncome, T, grantIncome, refreshPerkUnlocks, togglePerk, profileAverage, enemyHitProfile, rollEnemyHit, enemySpec, scaledCombatTotal, trainingPlan, judgmentBonus, judgmentOutcomes, enemyActionPower, accuracySpec, opposedHitChance, maxHP, armor, statLevel, enemyTargetCandidates, targetDefense, targetEvasion, evasionSpec, enemyAttackSpec, setQuestLevel, isQuestUnlocked, refreshQuestUnlocks, concentration, setConcentration, normalizeEnemyActions, livingEnemies, selectEnemy, enemyAttackDuration, revivalCost, revive, healthOf, canAct, ensureEnemies, combatRoll, battleContext, battleSnapshot, respawnDelay, isWaiting, formationOwner, totalDps, combatUptime, MAX_PARTY_SIZE, formationIds, isDeployed, activeCharacters, setFormation, averageAttackDamage, characterMetrics, isActionDonor, automaticActionRate, createState, getSession, questLevel, sessionAtLevel, questCost, buyQuest, purchaseQuote, buyMany, saleQuote, sell, perks, hasAreaAttack, stats, manualStats, selectedCharacter, selectCharacter, sawCount, bombCount, weaponScale, enemyDefense, attackBreakdown, attackProfile, reward, overkillBonus, hireCost, actionPower, freeActionChance, attackRate, effectiveAttackRate, chainAttackCount, actionCost, upgradeCost, roll, click, advance, catchUp, hire, buyPerk, buyUpgrade, selectSession, dps, characterDps };
  Object.assign(api,{enemyAttackChoices,enemyMaxHP,trainingInvestment,perkLevel,rainbowActive,enemyTargetWeights});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);


})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
