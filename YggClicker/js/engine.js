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
  const attributeDamage=(damage,multiplier=1)=>multiplier===1?damage:Math.max(0,N.floor(Math.min(1e100,damage*multiplier)));
  const attributeSummary=target=>['resistances','weaknesses'].map((key,i)=>(i?'弱点':target?.resistanceLabel||'耐性')+'：'+((target?.[key]||[]).map(id=>elementNames[id]||id).join('・')||'なし')).join(' / ');
  function elementalPerk(perk,target){const scaled={...perk};for(const [key,elements]of Object.entries(perk.effectElements||{}))scaled[key]=(perk[key]||0)*attributeMultiplier(target,elements);return scaled;}

  function pomUnits(state){return isDeployed(state,'richter')?(healthOf(state,'richter').pomBombs||[]).filter(b=>b.sessionId===state.sessionId&&b.hp>0):[];}
  function consumePoms(state){const h=healthOf(state,'richter'),bombs=pomUnits(state);h.pomBonus={dice:bombs.reduce((n,b)=>n+b.dice,0),flat:bombs.reduce((n,b)=>n+b.flat,0)};delete h.pomBombs;}
  function summonPoms(state){const c=D.characters.find(c=>c.id==='richter'),h=healthOf(state,c.id),ps=activePerks(state,c);delete h.pomBonus;if(!canAct(state,c.id)||!ps.some(p=>p.pomSummon))return;const power=strengthValue(state,c,'power'),maxHP=Math.max(1,N.floor(Math.min(1e100,10*power/100))),count=Math.max(1,...ps.map(p=>p.pomCount||1));h.pomBombs=Array.from({length:count},(_,i)=>({id:'pom-'+i,sessionId:state.sessionId,hp:maxHP,maxHP,power,dice:5+ps.reduce((n,p)=>n+(p.pomDice||0),0),flat:ps.reduce((n,p)=>n+(p.pomFlat||0),0)}));}
  function damagePoms(state,profile,random,events){for(const b of pomUnits(state)){const p=typeof profile==='function'?profile(b):profile,result=rollEnemyHit(p,random);if(result.hit)b.hp=Math.max(0,b.hp-result.damage);if(events)events.push({type:'pomDamage',id:b.id,damage:result.damage,hit:result.hit,hp:b.hp});}const h=healthOf(state,'richter');if(h.pomBombs)h.pomBombs=h.pomBombs.filter(b=>b.hp>0);}
  function pomIncoming(state,b,session){const mental=session.attackType==='mental';return {mental,accuracySpec:mental?session.ss:session.accuracy,evasionDice:{flat:10,dice:0},attack:session.attack,reduction:0,shield:0,postReduction:0,areaAttack:true,damageElementMultiplier:1,hitLogRatio:T.relativeLog(enemyStrength(session),mental?100:b.power),damageLogRatio:T.relativeLog(enemyStrength(session),100),damageScaleLog:T.absoluteLog(enemyStrength(session),100)};}
  const cherryPerk=(state,key)=>{const c=D.characters.find(c=>c.id==='cherry');return !!c&&activePerks(state,c).some(p=>p[key]);};
  function allyElements(state,c){
    const resistances=[...(c.resistances||[])],weaknesses=[...(c.weaknesses||[])];
    if(c.id==='cherry'&&cherryPerk(state,'dominance')){resistances.push('fire');weaknesses.push('wind');}
    if(c.id!=='cherry'&&isDeployed(state,'cherry')&&canAct(state,'cherry')&&cherryPerk(state,'fireCover'))resistances.push('fire');
    return {...c,resistances,weaknesses};
  }
  function receiveFire(state,c,elements,source){
    if(c.id==='cherry'&&source!=='cherry'&&elements?.includes('fire')&&canAct(state,c.id)&&cherryPerk(state,'dominance'))state.health.cherry.fireBonus=Math.min(1e100,(state.health.cherry.fireBonus||0)+4);
  }
  const cherryDamage=state=>N.floor(Math.min(1e100,4*Math.sqrt(strengthValue(state,D.characters.find(c=>c.id==='cherry'),'power')/100)));
  function clearBurns(state){
    const h=state.health?.cherry,down=!h||h.status!=='active'||runawayOf(state,'cherry').runawayCollapsed;
    if(down&&h)delete h.fireBonus;
    for(const battle of [state,...Object.values(state.sessionStates||{})])for(const e of battle.enemies||[])if(down||e.hp<=0){delete e.burnDamage;}
  }
  function fireField(state,c,random,events){
    const amount=cherryDamage(state);damagePoms(state,{nonContact:true,attack:{dice:0,flat:amount},reduction:0,shield:0,postReduction:0,damageElementMultiplier:1},random,events);const targets=[...livingEnemies(state)],allies=[...activeCharacters(state)];
    for(const e of targets)if(e.hp>0)applyDamage(state,amount,events,'VOLCANO',c.id,random,{fixedDamage:amount,attackElements:['fire'],nonContact:true,forceSingleTarget:true,areaAttack:true},false,[e],true);
    for(const target of allies){const factor=attributeMultiplier(allyElements(state,target),['fire']);damageAlly(state,target,attributeDamage(amount,factor),random,events,'VOLCANO');}
    clearBurns(state);
  }
  function cherryExtra(state,c,random,events){
    const p={...attackProfile(state,c),attackElements:['fire'],areaAttack:true,forceSingleTarget:true};
    damagePoms(state,b=>({accuracySpec:p.accuracy,evasionDice:{flat:10,dice:0},attack:{dice:p.dice,flat:p.flat+(p.bonus||0)},areaAttack:true,reduction:0,shield:0,postReduction:0,damageElementMultiplier:1,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),b.power),damageLogRatio:T.relativeLog(strengthValue(state,c,'power'),100),damageScaleLog:T.absoluteLog(strengthValue(state,c,'power'),100)}),random,events);
    const allies=[...activeCharacters(state)];
    applyDamage(state,0,events,'DISSATISFACTION',c.id,random,p,true,[...livingEnemies(state)],false,true);
    for(const target of allies){
      const a=strengthValue(state,c,'power'),d=strengthValue(state,target,'armor');
      const result=rollEnemyHit({accuracySpec:accuracySpec(state,c),evasionDice:evasionSpec(state,target),attack:{dice:p.dice,flat:p.flat+(p.bonus||0)},reduction:armor(state,target),postReduction:activation(state,target).damage,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),strengthValue(state,target,'evasion')),damageLogRatio:T.relativeLog(a,d),damageScaleLog:T.absoluteLog(a,d),damageElementMultiplier:attributeMultiplier(allyElements(state,target),['fire']),areaAttack:true},random);
      if(result.hit)damageAlly(state,target,result.damage,random,events,'DISSATISFACTION');
    }
    clearBurns(state);
  }

  const battleSpeed=state=>state.battleSpeed===2?2:1;
  const MAX_PARTY_SIZE = 5;
  const partyCapacity=id=>id==='infirmary'?3:MAX_PARTY_SIZE;
  const MAX_TURN_ACTIONS=8, MAX_CHAIN_HITS=16;
  const ENEMY_ID_RANGE = 1000000000;
  function nextEnemyId(state){const id=state.nextEnemyId||0;state.nextEnemyId=(id+1)%ENEMY_ID_RANGE;return id;}

  const formationRow=(state,id)=>state.formationRows?.[id]==='rear'?'rear':'front';
  const inRange=(range,distance)=>!range||distance>=range[0]&&distance<=range[1];
  // Down units retain their assigned row. Only the effective distance collapses.
  function combatDistance(state,id,enemy={row:'front'},incoming=false){
    const allyFront=formationIds(state).some(id=>formationRow(state,id)==='front'&&canAct(state,id)&&(!incoming||id!==state.floorClipTargetId||formationIds(state).filter(id=>canAct(state,id)).length<2));
    const enemies=state.enemies??[{hp:1,row:getSession(state).row||'front'}];
    const enemyFront=enemies.some(e=>e.hp>0&&!e.respawnSeconds&&e.row!=='rear');
    return 1+Number(formationRow(state,id)==='rear'&&allyFront)+Number(enemy.row==='rear'&&enemyFront);
  }
  const rangedPerks=(state,c,distance)=>activePerks(state,c).filter(p=>inRange(p.attackRange||p.effectRange,distance));
  function canReach(state,c,enemy){const distance=combatDistance(state,c.id,enemy);return inRange(c.attackRange,distance)||activePerks(state,c).some(p=>p.attackRange&&inRange(p.attackRange,distance));}
  function reachableEnemies(state,c){const es=state.enemies??[{id:null,hp:state.hp||getSession(state).hp,row:getSession(state).row||'front'}];return es.filter(e=>e.hp>0&&!e.respawnSeconds&&(!c||canReach(state,c,e)));}
  const hasReachableTarget=(state,c)=>reachableEnemies(state,c).length>0;
  function profileTarget(state,c){const es=reachableEnemies(state,c);return es.find(e=>e.id===state.focusedEnemyId)||es[0]||(state.enemies||[]).find(e=>e.hp>0)||{row:getSession(state).row||'front'};}
  function attackMotion(state,c,distance){
    if(c?.id==='waku')return distance===1?'stab':'shoot';
    if(c?.id==='mitsuru'&&distance===3)return 'spark';
    return 'normal';
  }
  function enemyCanReach(state,enemy,c){return inRange(enemySpec(state,enemy).attackRange,combatDistance(state,c.id,enemy,true));}
  const canTakeAction=(state,c)=>isStunned(state,c.id)||hasReachableTarget(state,c)||(isActionDonor(state,c)&&transferTargets(state,c).length>0);

  let incomeObserver=null;
  const observeIncome=listener=>{incomeObserver=listener;};
  const statLevel=(state,c)=>Math.max(0,(state.levels[c.id]||0)-1);
  const seedMultiplier=(state,id)=>Math.min(1e100,1.04**(state.seedLevels?.[id]||0));
  function perkStrengthMultiplier(state,c,kind){return 1+(c.perks||[]).reduce((sum,p)=>sum+((state.levels[c.id]||0)>0&&(state.levels[c.id]||0)>=p.level&&(state.perkEnabled?.[c.id]?.[p.id]??!!p.initial)?p.strengthBonus?.[kind]||0:0),0);}
  const strengthValue=(state,c,kind)=>Math.min(1e100,T.personalValue(statLevel(state,c),concentration(state,c.id)[kind]||0,concentrationPoints(state,c.id),kind)*seedMultiplier(state,({action:'pride',evasion:'vanity',accuracy:'envy',power:'wrath',vitality:'gluttony',armor:'lust'})[kind])*perkStrengthMultiplier(state,c,kind));
  const penetrationImmune=c=>(c.traits||[]).includes('penetrationImmune');
  const hpStrength=(state,c)=>strengthValue(state,c,'vitality');
  const hpFromStrength=(base,level)=>Math.max(1,N.floor(Math.min(1e100,base*(T.value(level)/D.strength.strengthBase))));
  const maxHP=(state,c)=>Math.max(1,N.floor(Math.min(1e100,c.maxHP*(hpStrength(state,c)/D.strength.strengthBase))));
  const armor=(state,c,mental=false)=>mental?c.resistance||0:(c.defense||0)+defenseBonus(state,c);
  const investmentCache=new Map();
  function trainingInvestment(state,c){
    if(!state.levels[c.id])return 0;
    const tracks=[[c.powerCost,statLevel(state,c)]];
    const key=JSON.stringify(tracks);if(investmentCache.has(key))return investmentCache.get(key);
    let sum=0;
    for(const [base,count]of tracks){
      if(count&&(!Number.isFinite(geometricCost(base,count-1))||geometricCost(base,count-1)>1e100))return 1e100;
      for(let i=0;i<count;i++)sum+=geometricCost(base,i);
    }
    sum=Math.min(1e100,sum);if(investmentCache.size>64)investmentCache.clear();investmentCache.set(key,sum);return sum;
  }
  const activePerks=(state,c)=>perks(state,c).filter(p=>p.unlocked);
  const isStunned=(state,id)=>(state.health?.[id]?.stunTurns||0)>0;
  function clearTurnEffects(h){for(const k of ['stunTurns','blastTurns','blastEvasion','magicLevel','pomBombs','pomBonus'])delete h[k];}
  function turnEffects(state,id){const h=healthOf(state,id);return {stunned:isStunned(state,id),blastEvasion:h.blastTurns>0?h.blastEvasion||0:0};}
  function magicState(state,c){
    if(!c?.magicPower)return {current:0,maximum:0};
    const active=activePerks(state,c),maximum=active.some(p=>p.magicCharge)?1+Math.max(0,...active.map(p=>p.magicLevel||0)):0;
    return {current:Math.min(maximum,Math.max(maximum?1:0,Math.floor(state.health?.[c.id]?.magicLevel||0))),maximum};
  }
  function magicPerPoint(state,c){if(!c?.magicPower)return 0;return (c?.magicPower||0)+activePerks(state,c).reduce((n,p)=>n+(p.magicBonusLevelStep?Math.floor((state.levels[c.id]||0)/p.magicBonusLevelStep):0),0);}
  function normalizeMagic(state,c){if(c?.magicPower&&state.health?.[c.id]){const h=state.health[c.id],m=magicState(state,c);if(m.current)h.magicLevel=m.current;else delete h.magicLevel;}}
  function ownActionBonus(state,c){return activePerks(state,c).reduce((n,p)=>n+(p.actionBonus||0)+(p.runawayActionStep?Math.floor(runawayOf(state,c.id).runawayRate/p.runawayActionStep):0),0);}
  // Charge consumes one action, including a manual or donated action, without an attack roll.
  function prepareMagicAction(state,c,events){
    if(!c?.magicPower)return true;
    normalizeMagic(state,c);const m=magicState(state,c);if(m.current>=m.maximum)return true;
    state.health[c.id].magicLevel=m.current+1;
    if(events)events.push({type:'magicCharge',actorId:c.id,actor:c.name,magicLevel:m.current+1,maximum:m.maximum});
    return false;
  }
  function finishMagicAttack(state,c,p,withinTurn=true){
    if(!c)return;const h=state.health[c.id];
    if(p.magicLevel>0&&p.blastEvasionPerMagic&&h.status==='active'){h.blastTurns=withinTurn?2:1;h.blastEvasion=p.magicLevel*p.blastEvasionPerMagic;}
    if(c.magicPower)delete h.magicLevel;
    if(p.afterAttackStun&&h.status==='active')h.stunTurns=p.afterAttackStun;
  }
  const rainbowActive=state=>(state.rainbowTurns||0)>0&&canAct(state,'jewel');
  const walletArmorBonus=credits=>credits>=1e9?10+3*Math.floor(Math.log2(credits/1e9)):0;
  function defenseBonus(state,c){
    const ps=activePerks(state,c);let bonus=ps.reduce((n,p)=>n+(p.defenseBonus||0),0);
    if(c.id==='jewel'&&rainbowActive(state))bonus+=15;
    if(ps.some(p=>p.investmentArmor)){
      bonus+=walletArmorBonus(state.credits||0);
    }
    return bonus;
  }
  // Current-run income is archived only when a new run is confirmed.
  const incomeRecord=state=>({currentRun:state.earned,allRuns:Math.min(1e100,state.earned+(state.previousRunsEarned||0))});
  function rolloverIncome(state){
    state.previousRunsEarned=incomeRecord(state).allRuns;
    state.earned=0;
  }
  // Lifetime entitlement is credited once; spending never reduces this high-water mark.
  function sinEntitlement(produced){return produced<1e6?0:Math.max(1,Math.floor(10*Math.log10(1+Math.min(1e100,produced)/1e6)**2));}
  function beginDream(state){
    if(state.dreamShop||!state.viewingMemories||!isMemoriesUnlocked(state)||(state.runNumber||1)>=Number.MAX_SAFE_INTEGER)return false;
    const total=sinEntitlement(incomeRecord(state).allRuns),gain=Math.max(0,total-(state.sinTotal||0));
    state.sinTotal=Math.max(total,state.sinTotal||0);state.sinBalance=(state.sinBalance||0)+gain;
    state.dreamGain=gain;state.dreamPurchases={};state.dreamShop=true;return true;
  }
  function seedCost(state,id){if(!Object.hasOwn(D.seedSystem.effects,id))return Infinity;const price=Math.ceil(1.06**(state.seedLevels[id]||0));return Number.isSafeInteger(price)?price:Infinity;}
  function buySeed(state,id){
    const cost=seedCost(state,id);if(!state.dreamShop||!Number.isFinite(cost)||state.sinBalance<cost)return false;
    state.dreamPurchases||={};const bought=state.dreamPurchases[id]||{levels:0,cost:0};
    state.dreamPurchases[id]={levels:bought.levels+1,cost:bought.cost+cost};
    state.sinBalance-=cost;state.seedLevels[id]++;
    if(id==='gluttony')for(const c of D.characters)if(!state.levels[c.id])state.health[c.id].hp=maxHP(state,c);
    return true;
  }
  function refundSeed(state,id){
    const bought=state.dreamPurchases?.[id];
    if(!state.dreamShop||!bought||bought.levels<1)return false;
    const level=state.seedLevels[id];
    // Old saves contain floor-priced purchases; refund only the amount paid.
    let oldTotal=0;
    for(let l=level-bought.levels;l<level;l++)oldTotal+=Math.floor(1.06**l);
    const floorCost=Math.floor(1.06**(level-1));
    const cost=bought.cost>oldTotal?Math.ceil(1.06**(level-1)):floorCost;
    if(!Number.isSafeInteger(cost)||cost>bought.cost)return false;
    state.seedLevels[id]--;state.sinBalance+=cost;bought.levels--;bought.cost-=cost;
    if(!bought.levels)delete state.dreamPurchases[id];
    if(id==='gluttony')for(const c of D.characters){if(!state.levels[c.id])state.health[c.id].hp=maxHP(state,c);else clampHealth(state,c.id);}
    return true;
  }
  function resetDreamPurchases(state){
    if(!state.dreamShop||!Object.keys(state.dreamPurchases||{}).length)return false;
    for(const [id,purchase]of Object.entries(state.dreamPurchases)){state.seedLevels[id]-=purchase.levels;state.sinBalance+=purchase.cost;}
    state.dreamPurchases={};
    for(const c of D.characters){if(!state.levels[c.id])state.health[c.id].hp=maxHP(state,c);else clampHealth(state,c.id);}
    return true;
  }
  const questChangePending=(state,id=state.sessionId)=>state.pendingQuestLevels?.[id]!==undefined;
  const questBusy=ctx=>(ctx.timeline?.manualAttacks?.length||0)>0||(ctx.timeline?.busySeconds||0)>1e-8||ctx.enemies?.some(e=>e.pendingAttack);
  function requestQuestLevel(state,id,level,ctx){
    if(questBusy(ctx)){state.pendingQuestLevels[id]=level;return;}
    delete state.pendingQuestLevels[id];applyQuestLevel(state,id,level,ctx);
  }
  function nextRun(state,now=Date.now()){
    if(!state.dreamShop)return null;
    if(!state.viewingMemories||!isMemoriesUnlocked(state)||(state.runNumber||1)>=Number.MAX_SAFE_INTEGER)return null;
    const next=createState(now);
    next.runNumber=(state.runNumber||1)+1;
    next.previousRunsEarned=incomeRecord(state).allRuns;
    next.rescue={...(state.rescue||newRescue()),open:false};
    refreshCharacterUnlocks(state);next.characterUnlocks={...state.characterUnlocks};next.defeatCounts={...state.defeatCounts};
    next.inventory={...state.inventory};next.muffinLevel=state.muffinLevel||0;next.credits=state.credits||0;next.prestige=state.prestige||0;
    next.options={...state.options};
    next.seedLevels={...state.seedLevels};next.sinTotal=state.sinTotal;next.sinBalance=state.sinBalance;next.karmaSelections={...state.karmaSelections};
    for(const c of D.characters)next.health[c.id].hp=maxHP(next,c);
    return next;
  }
  const enemyStrength=(session,kind='power')=>kind==='armor'?(session.defenseStrength??session.strength??T.enemyDurability(session.strengthLevel||0,'armor')):kind==='power'?(session.attackStrength??session.strength??T.enemyDurability(session.strengthLevel||0,'power')):session.strength??T.enemyValue(session.strengthLevel||0);
  const sinIncomeMultiplier=state=>1+(state.sinTotal||0)*.01;
  function incomeAmount(state,amount,type='questReward'){
    const unmodified=type==='refund'||type==='migrationRefund'||type==='jewelSideIncome';
    const greed=1;
    return Math.min(1e100,Math.max(0,N.floor(amount*greed*(unmodified?1:sinIncomeMultiplier(state)))));
  }
  function grantIncome(state,amount,type,events=null,detail={}){
    const gain=Math.min(incomeAmount(state,amount,type),Math.max(0,1e100-state.factors),type==='refund'||type==='migrationRefund'?1e100:Math.max(0,1e100-state.earned));
    state.factors+=gain;if(!['refund','migrationRefund'].includes(type)){state.earned+=gain;if(gain&&incomeObserver)incomeObserver(state.sessionId,gain,type);}
    state.incomeTotals||={};state.incomeTotals[type]=Math.min(1e100,(state.incomeTotals[type]||0)+gain);refreshQuestUnlocks(state);
    if(events&&gain)events.push({type:'perkIncome',incomeType:type,amount:gain,...detail});return gain;
  }
  function grantPerkIncome(state,amount,perk,events){const gain=Missions.grantCredits(state,amount);if(events&&gain)events.push({type:'perkIncome',currency:'C',amount:gain,actorId:'jewel',perk});return gain;}
  const perkLevel=(state,c)=>state.levels[c.id]||0;
  const questLevel = (state,id=state.sessionId) => state.questActiveLevels?.[id] ?? state.questLevels?.[id] ?? 1;
  const growAction=(base,multiplier)=>base===0?0:N.floor(Math.min(1e100,base*multiplier));
  function sessionAtLevel(session,level){
    // Start every stat at the same inferred growth stage, using its own curve.
    const strengthLevel=T.enemyStageForHP(session.hp,session.initialHP)+level-1;
    const hpStrengthLevel=strengthLevel,strength=T.enemyValue(strengthLevel),hpStrength=T.enemyDurability(strengthLevel,'vitality'),defenseStrength=T.enemyDurability(strengthLevel,'armor');
    return {...session,level,hpStrengthLevel,hpStrength,defenseStrength,attackStrength:T.enemyDurability(strengthLevel,'power'),baseHP:session.hp,strengthLevel,strength,defense:session.defense||0,resistance:session.resistance||0,
      attack:session.attack&&{...session.attack},accuracy:session.accuracy&&{...session.accuracy},evasion:session.evasion&&{...session.evasion},ss:session.ss&&{...session.ss},
      actionMultiplier:strength/D.strength.strengthBase,
      hp:Math.max(1,N.floor(Math.min(1e100,session.hp*hpStrength/D.strength.strengthBase))),reward:N.floor(N.curveValue(session.reward,level-1,{...D.questGrowth.rewardCurve,transition:session.rewardTransition??D.questGrowth.rewardCurve.transition}))};
  }
  function getSession(state,id=state.sessionId) {
    const session=D.sessions.find(item=>item.id===id);
    if(!session)return undefined;
    const q=sessionAtLevel(session,questLevel(state,id));
    const enemies=id===state.sessionId?state.enemies:state.sessionStates?.[id]?.enemies;
    if(q.summons&&enemies?.some(e=>e.kind==='kogumo'&&e.hp>0))q.traits=[...q.traits,'swarm'];
    return q;
  }
  function requirementMet(state,req){return req.resource==='mohicanDefeats'?((state.defeatCounts?.['mohican-solo']||0)+(state.defeatCounts?.mohicans||0))>=req.amount:Number.isFinite(state[req.resource]||0)&&(state[req.resource]||0)>=req.amount;}
  function refreshCharacterUnlocks(state){state.characterUnlocks||={};for(const c of D.characters)if(state.levels?.[c.id]>0||(c.recruitUnlock?requirementMet(state,c.recruitUnlock):c.unlockCreditsEarned?(state.creditsEarned||0)>=c.unlockCreditsEarned:(state.earned||0)>=(c.unlockEarned||0)))state.characterUnlocks[c.id]=true;}
  function isQuestUnlocked(state,id){const q=D.sessions.find(q=>q.id===id);return !!q&&(state.questUnlocks?.[id]===true||(q.unlockRequirement?requirementMet(state,q.unlockRequirement):!q.unlockFactors||(q.unlockByEarned?state.earned:state.factors)>=q.unlockFactors));}
  const isMemoriesUnlocked=state=>state.memoriesUnlocked===true||Number.isFinite(state.factors)&&state.factors>=D.memoryQuest.unlockFactors;
  function refreshQuestUnlocks(state){
    refreshCharacterUnlocks(state);state.memoriesUnlocked=isMemoriesUnlocked(state);
    state.questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,isQuestUnlocked(state,q.id)]));
  }
  const newAutoRest=()=>({enabled:false,kills:0,minutes:0,restMinutes:5,elapsed:0,defeats:0,remaining:0});
  const restOf=(state,id=state.sessionId)=>state.autoRest?.[id]||newAutoRest();
  const isResting=(state,id=state.sessionId)=>restOf(state,id).remaining>0;
  function setAutoRest(state,id,settings){
    if(!D.sessions.some(q=>q.id===id)||typeof settings.enabled!=='boolean'||!Number.isSafeInteger(settings.kills)||settings.kills<0||settings.kills>1e9||!Number.isFinite(settings.minutes)||settings.minutes<0||settings.minutes>1e6||!Number.isFinite(settings.restMinutes)||settings.restMinutes<1/60||settings.restMinutes>1e6||settings.enabled&&!settings.kills&&!settings.minutes)return false;
    state.autoRest||={};const old=restOf(state,id);
    if(['enabled','kills','minutes','restMinutes'].some(k=>old[k]!==settings[k]))state.autoRest[id]={...newAutoRest(),...Object.fromEntries(['enabled','kills','minutes','restMinutes'].map(k=>[k,settings[k]]))};
    return true;
  }
  function checkAutoRest(state){const r=restOf(state);if(r.enabled&&!r.remaining&&formationIds(state).length&&((r.kills&&r.defeats>=r.kills)||(r.minutes&&r.elapsed+1e-9>=r.minutes*60)))r.remaining=r.restMinutes*60;}
  function restBoundary(state){const r=restOf(state);return !r.enabled||!formationIds(state).length?Infinity:r.remaining|| (r.minutes?Math.max(1e-9,r.minutes*60-r.elapsed):Infinity);}
  function advanceRest(state,seconds){const r=restOf(state);if(!r.enabled||!formationIds(state).length)return;if(r.remaining){r.remaining=Math.max(0,r.remaining-seconds);if(r.remaining<1e-9){r.remaining=0;r.elapsed=0;r.defeats=0;}}else {r.elapsed=Math.min(1e100,r.elapsed+seconds);checkAutoRest(state);}}
  function createState(now = Date.now()) {
    return { autoRest:Object.fromEntries(D.sessions.map(q=>[q.id,newAutoRest()])),perkRefunded:true,perkEnabled:Object.fromEntries(D.characters.map(c=>[c.id,Object.fromEntries((c.perks||[]).map(p=>[p.id,!!(p.initial||p.awakeningLevel)]))])),
      unlockedPerks:Object.fromEntries(D.characters.map(c=>[c.id,[]])),runaway:Object.fromEntries(D.characters.map(c=>[c.id,newRunaway(c)])),incomeTotals:{},
      seedLevels:Object.fromEntries(Object.keys(D.seedSystem.effects).map(k=>[k,0])),karmaSelections:{},sinTotal:0,sinBalance:0,dreamShop:false,dreamGain:0,dreamPurchases:{},pendingQuestLevels:{},
      characterUnlocks:{},defeatCounts:{},rescue:newRescue(), inventory:{}, missions:{}, muffinLevel:0, credits:0, creditsEarned:0, prestige:0, factors: D.balance.initialFactors, earned: 0, previousRunsEarned: 0, runNumber:1, kills: 0, clicks: 0, totalDamage: 0,
      viewingMemories:false, memoriesUnlocked:false, sessionId: D.sessions[0].id, hp: D.sessions[0].hp, poisonDamage:0, paused: false, battleSpeed:1, options: {...D.displayDefaults},
      rainbowTurns:0, floorClipTargetId:null, floorClipTurns:0, respawnSeconds:0, sessionStates:{}, enemies:null, nextEnemyId:0, focusedEnemyId:null,
      health:Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}])),
      formationRows:Object.fromEntries(D.characters.map(c=>[c.id,'front'])),
      formations: Object.fromEntries(D.sessions.map(s=>[s.id,null])),
      concentration: Object.fromEntries(D.characters.map(c=>[c.id,emptyConcentration()])),
      questUnlocks: Object.fromEntries(D.sessions.map(q=>[q.id,q.unlockRequirement?q.unlockRequirement.amount===0:!q.unlockFactors])),
      questActiveLevels: {},
      questLevels: Object.fromEntries(D.sessions.map(s=>[s.id,1])), sceneSeconds:0, batchHpFraction:0,batchDamageFraction:0,
      levels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      timeline:newTimeline(),actionPoints: Object.fromEntries(D.characters.map(c => [c.id, 0])), actionClock: 0, selectedCharacterId: null,
      purchasedPerks: Object.fromEntries(D.characters.map(c => [c.id, []])),
      upgrades: Object.fromEntries(D.upgrades.map(u => [u.id, 0])), savedAt: now };
  }
  const BATTLE_FIELDS=['timeline','hp','poisonDamage','batchHpFraction','batchDamageFraction','respawnSeconds','selectedCharacterId','enemies','nextEnemyId','focusedEnemyId','floorClipTargetId','floorClipTurns','rainbowTurns'];
  const respawnDelay=()=>5;
  const isWaiting=state=>getSession(state).medical?false:state.enemies?state.enemies.every(e=>e.hp<=0):(state.respawnSeconds||0)>0;
  function battleSnapshot(state){return Object.fromEntries(BATTLE_FIELDS.map(k=>[k,k==='timeline'?structuredClone(state.timeline||newTimeline()):k==='enemies'?(state.enemies?structuredClone(state.enemies):null):state[k]??(['selectedCharacterId','focusedEnemyId','floorClipTargetId'].includes(k)?null:0)]));}
  function battleContext(state,id=state.sessionId){
    if(id===state.sessionId)return state;
    return {...state,timeline:newTimeline(),rainbowTurns:0,floorClipTargetId:null,floorClipTurns:0,hp:getSession(state,id).hp,poisonDamage:0,batchHpFraction:0,batchDamageFraction:0,respawnSeconds:0,selectedCharacterId:null,enemies:null,nextEnemyId:0,focusedEnemyId:null,
      ...state.sessionStates?.[id],sessionId:id,formations:Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]))};
  }
  // Only the initially viewed, untouched quest auto-fills unassigned recruits.
  // Explicit parties own their members even while another quest is on screen.
  function formationIds(state,id=state.sessionId){
    const chosen=state.formations?.[id];
    if(Array.isArray(chosen))return chosen.filter(x=>state.levels[x]>0).slice(0,partyCapacity(id));
    if(id!==state.sessionId)return [];
    const assigned=new Set(D.sessions.filter(q=>q.id!==id).flatMap(q=>state.formations?.[q.id]||[]));
    return D.characters.filter(c=>state.levels[c.id]>0&&!assigned.has(c.id)&&!Missions.busy(state,c.id)).map(c=>c.id).slice(0,partyCapacity(id));
  }
  const formationOwner=(state,id)=>D.sessions.find(q=>formationIds(state,q.id).includes(id))?.id||null;
  const isDeployed=(state,id)=>formationIds(state).includes(id);
  const activeCharacters=state=>D.characters.filter(c=>canAct(state,c.id));
  function setFormation(state,questId,ids,rows=state.formationRows){
    if(!isQuestUnlocked(state,questId)||!Array.isArray(ids)||ids.length>partyCapacity(questId)||new Set(ids).size!==ids.length||ids.some(id=>!D.characters.some(c=>c.id===id)||!state.levels[id]))return false;
    if(ids.some(id=>Missions.busy(state,id)))return false;
    if(ids.some(id=>rows?.[id]!==undefined&&!['front','rear'].includes(rows[id])))return false;
    for(const id of ids)if(formationOwner(state,id)!==questId)healthOf(state,id).regenSeconds=0;
    state.formationRows={...state.formationRows,...Object.fromEntries(ids.map(id=>[id,rows?.[id]||'front']))};
    refreshQuestUnlocks(state);
    const rosters=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,q.id===questId?[...ids]:rosters[q.id].filter(id=>!ids.includes(id))]));
    for(const q of D.sessions){
      const ctx=battleContext(state,q.id);
      if(!formationIds(ctx).length&&state.autoRest?.[q.id])Object.assign(state.autoRest[q.id],{elapsed:0,defeats:0,remaining:0});
      if(!isDeployed(ctx,'jewel'))ctx.rainbowTurns=0;
      if(ctx.selectedCharacterId&&!isDeployed(ctx,ctx.selectedCharacterId))ctx.selectedCharacterId=null;
      const changed=rosters[q.id].join(',')!==formationIds(ctx).join(',');
      if(q.id===questId||changed)resetFormationEnemies(ctx);
      normalizeEnemyActions(ctx);refreshFloorClip(ctx,changed);
      if(q.id!==state.sessionId)state.sessionStates={...state.sessionStates,[q.id]:battleSnapshot(ctx)};
    }
    return true;
  }
  // Rebuilding a party starts a fresh enemy encounter; ally health/progression are retained.
  function resetFormationEnemies(ctx){
    ctx.enemies=null;ctx.hp=getSession(ctx).hp;ctx.poisonDamage=0;ctx.respawnSeconds=0;
    ctx.batchHpFraction=0;ctx.batchDamageFraction=0;ctx.focusedEnemyId=null;
    ctx.timeline||=newTimeline();delete ctx.timeline.manualAttacks;delete ctx.timeline.busySeconds;
    for(const key of Object.keys(ctx.timeline.priorities))if(key.startsWith('e:'))delete ctx.timeline.priorities[key];
    ensureEnemies(ctx);
  }
  function concentrationResetCost(state,id){const c=D.characters.find(c=>c.id===id);return c&&state.levels[id]?Math.max(1,N.floor(trainingInvestment(state,c)*.05)):Infinity;}
  function resetConcentration(state,id){
    const cost=concentrationResetCost(state,id);
    if(!Number.isFinite(cost)||state.factors<cost||!Object.values(concentration(state,id)).some(n=>n>0))return false;
    state.factors-=cost;setConcentration(state,id,emptyConcentration());return true;
  }
  const emptyConcentration=()=>Object.fromEntries(D.concentration.map(t=>[t.id,0]));
  const concentration=(state,id)=>Object.fromEntries(D.concentration.map(t=>[t.id,state.concentration?.[id]?.[t.id]||0]));
  const concentrationPoints=(state,id)=>Math.max(0,(state.levels[id]||0)-1);
  function clampHealth(state,id){const c=D.characters.find(c=>c.id===id),h=state.health[id],max=maxHP(state,c);h.hp=Math.min(h.hp,max);if(h.hp===max){delete h.revivalTurns;delete h.revivalSeconds;h.status='active';h.regenSeconds=0;}normalizeMagic(state,c);}
  function setConcentration(state,id,allocation){
    if(!D.characters.some(c=>c.id===id)||!allocation||Object.keys(allocation).some(k=>!D.concentration.some(t=>t.id===k)))return false;
    if(D.concentration.some(t=>!Number.isSafeInteger(allocation[t.id])||allocation[t.id]<0)||Object.values(allocation).reduce((n,v)=>n+v,0)>concentrationPoints(state,id))return false;
    state.concentration={...state.concentration,[id]:{...allocation}};if(state.health?.[id])clampHealth(state,id);return true;
  }
  // Empty and incapacitated parties cannot bank enemy action points. Pending
  // attacks also end as soon as their original target leaves or falls.
  function normalizeEnemyActions(state,events){
    const owner=state.health.richter;
    if(owner&&(owner.status!=='active'||state.runaway?.richter?.runawayCollapsed)){delete owner.pomBombs;delete owner.pomBonus;}
    clearBurns(state);
    const active=activeCharacters(state);
    if(state.timeline){if(isWaiting(state)||isResting(state)||!active.length)state.timeline.priorities={};else for(const key of Object.keys(state.timeline.priorities)){const alive=key.startsWith('a:')?canAct(state,key.slice(2))&&!(healthOf(state,key.slice(2)).summonDelaySeconds>0):state.enemies?.some(e=>'e:'+e.id===key&&e.hp>0&&!e.respawnSeconds&&!(e.summonDelaySeconds>0));if(!alive)delete state.timeline.priorities[key];}}
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
      for(const p of c.perks||[])if(state.levels[c.id]>0&&perkLevel(state,c,p)>=p.level){if(!list.includes(p.id))list.push(p.id);if(enabled[p.id]===undefined)enabled[p.id]=!!(p.initial||p.awakeningLevel);}
    }
  }
  function perks(state,character){
    return (character.perks||[]).map(perk=>{
      const level=perkLevel(state,character,perk),eligible=state.levels[character.id]>0&&level>=perk.level;
      const owned=eligible||(state.unlockedPerks?.[character.id]||[]).includes(perk.id)||(state.purchasedPerks?.[character.id]||[]).includes(perk.id);
      const enabled=perk.awakeningLevel?true:state.perkEnabled?.[character.id]?.[perk.id]??(!!perk.initial||(state.purchasedPerks?.[character.id]||[]).includes(perk.id));
      const failure=state.perkFailures?.[character.id],fails=failure==='all'||failure==='support'&&['support','special'].includes(perk.effectClass);
      const rateReady=perk.minRunaway===undefined||runawayOf(state,character.id).runawayRate>=perk.minRunaway;
      const awakened=rateReady&&(!perk.awakeningLevel||(runawayOf(state,character.id).activationType==='awakening'&&activation(state,character).stacks>=perk.awakeningLevel));
      const unlocked=eligible&&awakened&&enabled&&healthOf(state,character.id).status==='active'&&!runawayOf(state,character.id).runawayCollapsed&&!fails;
      return {...perk,owned,enabled,unlocked,eligible,dice:unlocked?(perk.diceBonus||0)+(perk.diceEvery?Math.floor((state.levels[character.id]||0)/perk.diceEvery):0):0};
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
      perk:{ dice:active.reduce((n,p) => n + p.dice+(apAttack?p.apDiceBonus||0:0), 0), flat:active.reduce((n,p) => n + (p.flat||0), 0)+magic.current*magicPerPoint(state,character)+(character?.id==='cherry'&&cherryPerk(state,'dominance')?(state.health.cherry.fireBonus||0):0)+(character?.id==='jewel'&&distance===1&&rainbowActive(state)?15:0),
        conditional:active.reduce((n,p) => n + (p.targetTrait && (session.traits || []).includes(p.targetTrait) ? p.damageBonus || 0 : 0), 0) },
      upgrade:{ flat:0, rate:0 },
      item:{ flat:0 },
      levelMultiplier:1,
      defense:ignoreDefense ? 0 : mental ? session.resistance||0 : enemyDefense(session), mental, apAttack, ignoreDefense, penetrationBlocked,
      areaAttack:active.some(p => areaApplies(p,session)),
      afterAttackStun:Math.max(0,...active.map(p=>p.afterAttackStun||0)),noAreaPenalty:active.some(p=>p.noAreaPenalty),magicLevel:magic.current,magicMaximum:magic.maximum,blastEvasionPerMagic:Math.max(0,...active.map(p=>p.blastEvasionPerMagic||0)),
      defenseReduction:Math.max(0,...active.map(p=>p.defenseReduction||0)),
      apReductionRate:Math.max(0,...active.map(p=>p.apReductionRate||0)),
      apReduction:active.reduce((n,p)=>n+(p.apReduction||0),0),tauntId:active.some(p=>p.taunt)?character.id:null,
      accuracyRetries:Math.max(0,...active.map(p=>p.accuracyRetries||0)),enemyCriticalRetries:Math.max(0,...active.map(p=>p.enemyCriticalRetries||0)),sightDebuff:active.some(p=>p.sightDebuff)?{accuracy:active.some(p=>p.sightDebuffUpgrade)?10:4,evasion:active.some(p=>p.sightDebuffUpgrade)?5:4,turns:3}:null,confusion:active.some(p=>p.confusion)?{releaseChance:Math.max(0,.4-active.reduce((n,p)=>n+(p.confusionReleaseReduction||0),0)),friendlyFire:active.some(p=>p.confusionFriendlyFire)}:null,accuracyPenaltyChance:Math.max(0,...active.map(p=>p.accuracyPenaltyChance||0)),
      accuracyPenalty:Math.max(0,...active.map(p=>p.accuracyPenalty||0)),
      extraAttackChance:Math.max(0,...active.map(p=>p.extraAttackChance||0)),
      autoHitChance:Math.max(0,...active.map(p=>p.autoHitChance||0)),evasionFailureChance:Math.max(0,...active.map(p=>p.evasionFailureChance||0)),doubleHitDamage:active.reduce((n,p)=>n+(p.doubleHitDamage||0),0),
      poisonDamage:active.some(p=>p.inflictPoison)?N.floor(Math.min(1e100,(Math.max(0,...active.map(p=>p.poisonDamage||0))+active.reduce((n,p)=>n+(p.poisonBonus||0),0))*Math.pow(strengthValue(state,character,'power')/D.strength.strengthBase,Math.max(0,...active.map(p=>p.poisonStrengthExponent||0))))):0
    };
  }
  function stats(state, character) {
    const {base, perk} = attackBreakdown(state, character);
    return { dice:base.dice + perk.dice, flat:base.flat + perk.flat };
  }
  const selectedCharacter = state => D.characters.find(c => c.id === state.selectedCharacterId && isDeployed(state,c.id)) || null;
  function manualStats(state) {
    const character = selectedCharacter(state);
    const base = character ? stats(state, character) : { dice: D.balance.manualDice, flat: D.balance.manualFlat };
    return { dice:base.dice, flat:base.flat };
  }
  function selectCharacter(state, id) {
    if (id !== null && !D.characters.some(c => c.id === id && isDeployed(state,id))) return false;
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
    return canAct(state,id) ? Math.min(Number.MAX_SAFE_INTEGER, state.levels[id] || 0) : 0;
  }
  function weaponScale(state, id) {
    const level = Math.max(1, state.levels[id] || 0);
    return 1 + Math.log2(level) * D.balance.weaponSizePerDoubling;
  }
  const enemyDefense = session => Math.max(0, Math.floor(session.defense || 0));
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
      dice:b.base.dice + b.perk.dice+(character?activation(state,character).dice:0), flat:b.base.flat + b.perk.flat + b.upgrade.flat + b.item.flat+(character?activation(state,character).damage:0),
      bonus:b.perk.conditional, multiplier:(1 + b.upgrade.rate) * b.levelMultiplier,
      autoHitChance:b.autoHitChance,evasionFailureChance:b.evasionFailureChance,doubleHitDamage:b.doubleHitDamage,
      defense:b.defense, mental:b.mental, ignoreDefense:b.ignoreDefense, penetrationBlocked:b.penetrationBlocked, areaAttack:b.areaAttack, extraAttackChance:b.extraAttackChance,poisonDamage:b.poisonDamage,defenseReduction:b.defenseReduction,apReductionRate:b.apReductionRate,apReduction:b.apReduction,tauntId:b.tauntId,accuracyRetries:b.accuracyRetries,enemyCriticalRetries:b.enemyCriticalRetries,sightDebuff:b.sightDebuff,confusion:b.confusion,accuracyPenaltyChance:b.accuracyPenaltyChance,accuracyPenalty:b.accuracyPenalty,
      afterAttackStun:b.afterAttackStun,noAreaPenalty:b.noAreaPenalty,magicLevel:b.magicLevel,magicMaximum:b.magicMaximum,blastEvasionPerMagic:b.blastEvasionPerMagic,
      minimumLevelBonus:0,preLevelMultiplier:1+b.upgrade.rate,
      overkillThreshold:state.upgrades.overkill ? D.upgrades.find(u=>u.id==='overkill').threshold : 0, breakdown };
  }
  const reward = (state, session = getSession(state)) => Math.min(1e100,session.reward);
  const overkillBonus = (state,session=getSession(state)) => state.upgrades.overkill ? N.delta(reward(state,session) * D.upgrades.find(u=>u.id==='overkill').bonusRate) : 0;
  // Each repeatable purchase track has its own unrounded geometric curve.
  // Recompute from the level rather than multiplying an already rounded price.
  const geometricCost = (base, purchases, growth = D.balance.purchaseCostGrowth) => N.geometric(base,growth,purchases);
  function questCost(state,id=state.sessionId) {
    const session=D.sessions.find(s=>s.id===id),level=state.questLevels?.[id]??1;
    if(!session || session.medical || !Number.isSafeInteger(level+1))return Infinity;
    // Each quest starts at 20 times its unmodified initial reward.
    // Retain the existing growth curve and late reward-based ceiling.
    const base=(session.costRewardBase??session.reward)*D.questGrowth.costRewardMultiplier;
    const next=sessionAtLevel(session,level+1),cost=Math.min(
      geometricCost(base,level-1,D.questGrowth.costGrowth),
      N.floor(N.curveValue(base,level-1,D.questGrowth.rewardCurve)));
    return [next.hp,next.reward,cost].every(v=>Number.isFinite(v)&&v<=1e100)?cost:Infinity;
  }
  function applyQuestLevel(state,id,level,ctx,oldHP){
    const waits=(ctx.enemies||[]).map(e=>e.kind!=='kogumo'?(e.respawnSeconds||0):0);
    state.questActiveLevels={...state.questActiveLevels,[id]:level};ctx.questActiveLevels=state.questActiveLevels;
    const maximum=getSession(state,id).hp;
    for(const actorId of formationIds(ctx)){state.actionPoints[actorId]=0;}
    ctx.enemies=null;ctx.hp=maximum;ctx.poisonDamage=0;ctx.respawnSeconds=0;ensureEnemies(ctx);
    for(const [i,e]of ctx.enemies.entries())if(waits[i]>0){e.hp=0;e.respawnSeconds=waits[i];e.pendingAttack=null;}
    if(ctx.timeline)for(const key of Object.keys(ctx.timeline.priorities))if(key.startsWith('e:'))delete ctx.timeline.priorities[key];ctx.focusedEnemyId=null;ctx.floorClipTargetId=null;ctx.floorClipTurns=0;ctx.rainbowTurns=0;
    syncFront(ctx);ctx.batchHpFraction=0;ctx.batchDamageFraction=0;
    if(id!==state.sessionId)state.sessionStates={...state.sessionStates,[id]:battleSnapshot(ctx)};
  }
  function setQuestLevel(state,id,level){
    if(!isQuestUnlocked(state,id)||!Number.isSafeInteger(level)||level<1||level>(state.questLevels[id]||1))return false;
    if(level===questLevel(state,id)){delete state.pendingQuestLevels[id];return true;}
    const ctx=battleContext(state,id),oldHP=getSession(ctx).hp;ensureEnemies(ctx);refreshQuestUnlocks(state);
    requestQuestLevel(state,id,level,ctx);return true;
  }
  function buyQuest(state,id){
    const cost=questCost(state,id);if(!isQuestUnlocked(state,id)||!Number.isFinite(cost)||state.factors<cost)return false;
    const ctx=battleContext(state,id),oldHP=getSession(ctx).hp;ensureEnemies(ctx);refreshQuestUnlocks(state);
    state.factors-=cost;state.questLevels[id]++;
    requestQuestLevel(state,id,state.questLevels[id],ctx);return true;
  }
  const isCharacterUnlocked=(state,c)=>{refreshCharacterUnlocks(state);return !!c&&!!state.characterUnlocks[c.id];};
  const hireCurrency=(state,c)=>state.levels[c.id]===0?(c.hireCurrency||'factors'):'factors';
  const hireCost = (state, c) => state.levels[c.id] === 0 ? (c.hirePrice??c.cost)
    : geometricCost(c.powerCost, state.levels[c.id] - 1);
  function supportPerks(state) {
    return activeCharacters(state).flatMap(c=>perks(state,c).filter(p=>p.unlocked));
  }
  function actionPower(state,c,baseRoll=c.action,includeDown=false,random=null) {
    if(!includeDown&&healthOf(state,c.id).status!=='active')return 0;
    const active=isDeployed(state,c.id)?supportPerks(state):[];
    const bonusDice=active.reduce((n,p)=>n+(p.partyActionDice||0),0)+activation(state,c).dice;
    const fixed=baseRoll+activation(state,c).action+active.reduce((n,p)=>n+(p.partyAction||0),0)+ownActionBonus(state,c);
    const calculate=extra=>{const withAllies=fixed+extra;
      const supported=state.selectedCharacterId===c.id ? N.linear(withAllies,active.reduce((n,p)=>n+(p.selectedActionRate||0),0),1) : withAllies;
      return growAction(supported,strengthValue(state,c,'action')/D.strength.strengthBase);};
    if(random||!bonusDice)return calculate(random?roll(bonusDice,0,random):0);
    // Forecasts retain fractional expectations; actual action weights retain their integer rolls.
    let distribution=new Map([[0,1]]);for(let i=0;i<bonusDice;i++){const next=new Map();for(const [sum,p]of distribution)for(let face=1;face<=6;face++)next.set(sum+face,(next.get(sum+face)||0)+p);distribution=next;}
    return [...distribution].reduce((n,[sum,p])=>n+calculate(sum)*p,0)/6**bonusDice;
  }
  const freeActionChance = (state,c) => isDeployed(state,c.id)&&state.selectedCharacterId===c.id ? Math.max(0,...supportPerks(state).map(p=>p.freeActionChance||0)) : 0;
  // A zero base has no meaningful relative multiplier; the UI shows absolute action power.
  function enemyActionValue(q,raw){
    const base=raw??(q.actionDice?q.actionDice.flat+q.actionDice.dice*3.5:q.action||0);
    return growAction(base,q.actionMultiplier);
  }
  const enemyActionPower=(state,raw,enemy=null)=>{
    const q=enemySpec(state,enemy),base=raw??(q.actionDice?q.actionDice.flat+q.actionDice.dice*3.5:q.action||0);
    const rate=Math.max(0,1-supportPerks(state).reduce((n,p)=>n+(p.enemyActionReduction||0),0));
    return Math.floor(enemyActionValue(q,Math.max(0,base-((enemy?.slowSeconds||0)>0?enemy.actionPenalty||0:0)))*rate+1e-9);
  };
  const newTimeline=()=>({priorities:{},turns:0});
  // Weights are capped before summing; at most 32 participants stay far below IEEE overflow.
  const actionWeight=value=>Number.isFinite(value)?Math.max(0,Math.min(1e100,value)):value===Infinity?1e100:0;
  function smoothTurn(units,priorities){
    const maximum=Math.max(0,...units.map(u=>u.weight));if(!maximum){for(const key of Object.keys(priorities))delete priorities[key];return null;}
    const total=units.reduce((n,u)=>n+u.weight,0);let winner=null,highest=-Infinity;
    const live=new Set(units.map(u=>u.key));for(const key of Object.keys(priorities))if(!live.has(key))delete priorities[key];
    units.forEach(u=>{const p=Math.max(-2*total,Math.min(2*total,priorities[u.key]||0))+u.weight;priorities[u.key]=p;if(p>highest){highest=p;winner=u;}});
    priorities[winner.key]-=total;return winner;
  }
  // Summoning delay only restricts automatic turn allocation, not targeting.
  const SUMMON_DELAY_SECONDS=5;
  function markSummoned(unit){unit.summonDelaySeconds=SUMMON_DELAY_SECONDS;return unit;}
  function elapseSummonDelay(unit,seconds){if(unit.summonDelaySeconds>0){unit.summonDelaySeconds=Math.max(0,unit.summonDelaySeconds-seconds);if(unit.summonDelaySeconds<1e-9)unit.summonDelaySeconds=0;}}
  function timelineUnits(state,random=null){
    if(getSession(state).medical||isResting(state)||isWaiting(state)||!activeCharacters(state).length)return [];
    const result=[];
    for(const c of activeCharacters(state))if(canTakeAction(state,c)&&!(healthOf(state,c.id).summonDelaySeconds>0)){
      const raw=random?(c.actionDice?roll(c.actionDice.dice,c.actionDice.flat,random):c.action):c.action;
      const h=healthOf(state,c.id),value=actionPower(state,c,raw,!random,random),weight=actionWeight(value*(h.turnSlowSeconds>0?1-(h.turnSlowRate||0):1));
      if(weight>0)result.push({key:'a:'+c.id,id:c.id,name:c.name,side:'ally',actor:c,action:value,weight});
    }
    for(const e of [...ensureEnemies(state)].sort((a,b)=>a.id-b.id))if(e.hp>0&&!e.respawnSeconds&&!e.pendingAttack&&!(e.summonDelaySeconds>0)&&enemyTargetCandidates(state,e).length){
      const q=enemySpec(state,e),raw=random&&q.actionDice?roll(q.actionDice.dice,q.actionDice.flat,random):undefined;
      const value=enemyActionPower(state,raw,e),weight=actionWeight(value*(e.turnSlowSeconds>0?1-(e.turnSlowRate||0):1));
      if(weight>0)result.push({key:'e:'+e.id,id:e.id,name:q.enemy||q.name,side:'enemy',enemy:e,action:value,weight});
    }
    return result;
  }
  function timelineView(state,count=8){
    const units=timelineUnits(state),maximum=Math.max(0,...units.map(u=>u.weight)),total=units.reduce((n,u)=>n+(maximum?u.weight/maximum:0),0),priorities={...(state.timeline?.priorities||{})};
    const order=[];for(let i=0;i<Math.min(10,Math.max(0,count));i++){const u=smoothTurn(units,priorities);if(u)order.push({key:u.key,name:u.name});}
    return {units:units.map(u=>({key:u.key,id:u.id,name:u.name,side:u.side,action:u.action,weight:u.weight,share:total?u.weight/maximum/total:0})),order};
  }
  function slowAction(target,damage,reference,rate=0){
    if(target.hp<=0||target.status&&target.status!=='active')return 0;
    const converted=rate||damage/(Math.max(1,reference)+damage);
    const amount=Math.min(.5,Math.max(0,converted));if(!(amount>0))return 0;
    target.turnSlowRate=Math.min(.5,Math.max(target.turnSlowRate||0,amount));target.turnSlowSeconds=5;return amount;
  }
  function delayTurn(state,key,cycles){state.timeline||=newTimeline();const total=timelineUnits(state).reduce((n,u)=>n+u.weight,0);state.timeline.priorities[key]=Math.max(-2*total,(state.timeline.priorities[key]||0)-total*Math.min(1,Math.max(0,cycles)));}
  const attackRate=(state,c)=>timelineView(state,0).units.find(u=>u.key==='a:'+c.id)?.share||0;
  const isActionDonor = (state,c) => isDeployed(state,c.id) && perks(state,c).some(p=>p.unlocked&&p.transferAction) && transferTargets(state,c).length>0;
  const boundedRepeats=(chance,limit)=>chance>0?(1-chance**limit)/(1-chance):1;
  const automaticActionRate = (state,c) => isDeployed(state,c.id) ? attackRate(state,c)*(isActionDonor(state,c)?1:boundedRepeats(freeActionChance(state,c),MAX_TURN_ACTIONS)) : 0;
  function transferTargets(state,donor) {
    const others=D.characters.filter(c=>c.id!==donor.id&&canAct(state,c.id)&&!isStunned(state,c.id)&&hasReachableTarget(state,c));
    const selected=others.find(c=>c.id===state.selectedCharacterId);
    return selected ? [selected] : others;
  }
  function donatedActionRate(state,c) {
    return D.characters.filter(d=>isActionDonor(state,d)).reduce((sum,d)=>{
      const targets=transferTargets(state,d);
      return sum+(targets.some(t=>t.id===c.id)?automaticActionRate(state,d)/targets.length:0);
    },0);
  }
  const effectiveAttackRate = (state,c) => !canAct(state,c.id)||!hasReachableTarget(state,c)||isActionDonor(state,c) ? 0 :
    (automaticActionRate(state,c)+donatedActionRate(state,c))*boundedRepeats(attackProfile(state,c).extraAttackChance,MAX_CHAIN_HITS)/(1+Math.max(0,magicState(state,c).maximum-1)+(attackProfile(state,c).afterAttackStun||0));
  function performAutomaticActionCore(state,c,random,events) {
    if(!isActionDonor(state,c)){performAttack(state,c,attackProfile(state,c),random,events,MAX_CHAIN_HITS);return;}
    const targets=transferTargets(state,c);
    if(!targets.length){performAttack(state,c,attackProfile(state,c),random,events);return;}
    const target=targets.length===1?targets[0]:targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];
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
    endRunawayAction(state,c,random,events);
  }
  const actionCost = (state,c)=>hireCost(state,c);
  const upgradeCost = (state, u) => geometricCost(u.cost, state.upgrades[u.id], u.costGrowth??D.balance.upgradeCostGrowth);
  function roll(dice, flat, random = Math.random, sides = 6) {
    let amount = flat;
    for (let i = 0; i < dice; i++) amount += 1 + Math.floor(random() * sides);
    return amount;
  }
  const healthOf=(state,id)=>state.health?.[id]||{hp:maxHP(state,D.characters.find(c=>c.id===id)),status:'active',regenSeconds:0};
  const canAct=(state,id)=>!isResting(state)&&isDeployed(state,id)&&healthOf(state,id).status==='active'&&!runawayOf(state,id).runawayCollapsed;
  function newEnemy(state,hp=getSession(state).hp,poisonDamage=0,respawnSeconds=0){
    return {row:getSession(state).row||'front',id:nextEnemyId(state),hp,poisonDamage,respawnSeconds,actionPoints:0,pendingAttack:null,wardSeconds:0,defensePenalty:0,accuracyPenalty:0,evasionPenalty:0,evasionPenaltyTurns:0,evasionFailure:false,tauntId:null,slowSeconds:0,actionPenalty:0,queenCancels:0};
  }
  function emptyKogumo(state){return {...newEnemy(state,0),kind:'kogumo',creationDamage:0,maxHP:0};}
  const enemyMaxHP=(state,enemy)=>enemy?.kind==='kogumo'?enemy.maxHP:enemySpec(state,enemy).hp;
  const duoWaiting=state=>!!getSession(state).members&&!getSession(state).independentRespawns&&ensureEnemies(state).some(e=>e.hp>0);
  function newMember(state,index){const q=getSession(state),member=q.members[index],spec=sessionAtLevel({...D.sessions.find(q=>q.id===state.sessionId),...member},q.level);return {...newEnemy(state,spec.hp),kind:member.id};}
  function enemySpec(state,enemy){
    const q=getSession(state);
    if(q.members){const member=q.members.find(m=>m.id===enemy?.kind)||q.members[0];return sessionAtLevel({...D.sessions.find(q=>q.id===state.sessionId),...member},q.level);}
    if(enemy?.kind!=='kogumo')return q;
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
    const target=clouds.find(e=>!e.hp)||clouds.reduce((a,b)=>a.hp<=b.hp?a:b);
    const created=target.hp===0;if(created)Object.assign(target,emptyKogumo(state));
    const gain=Math.min(damage,1e100-target.maxHP);if(gain<=0)return;
    if(created){target.creationDamage=gain;markSummoned(target);delete state.timeline?.priorities['e:'+target.id];}
    target.maxHP+=gain;target.hp+=gain;
    if(events)events.push({type:'enemySummon',enemyId:target.id,targetSlot:state.enemies.indexOf(target),created,hp:target.hp,amount:gain});
  }
  function ensureEnemies(state){
    const q=getSession(state);if(q.medical){state.enemies=[];state.hp=1;state.poisonDamage=0;state.respawnSeconds=0;state.focusedEnemyId=null;return state.enemies;}const count=q.summons?3:(q.formationCount||1);
    if(!Array.isArray(state.enemies)||state.enemies.length!==count){
      state.enemies=Array.from({length:count},(_,i)=>q.members?newMember(state,i):q.summons&&i?emptyKogumo(state):newEnemy(state,i?getSession(state).hp:state.hp,i?0:state.poisonDamage||0,i?0:state.respawnSeconds||0));
      syncFront(state);
    }
    return state.enemies;
  }
  const livingEnemies=state=>ensureEnemies(state).filter(e=>e.hp>0&&!e.respawnSeconds);
  function syncFront(state){
    if(getSession(state).medical){state.hp=1;state.poisonDamage=0;state.respawnSeconds=0;state.focusedEnemyId=null;return;}
    const living=state.enemies.filter(e=>e.hp>0&&!e.respawnSeconds);
    if(!living.some(e=>e.id===state.focusedEnemyId))state.focusedEnemyId=null;
    const target=living.find(e=>e.id===state.focusedEnemyId)||living[0];
    state.hp=target?.hp||0;state.poisonDamage=target?.poisonDamage||0;
    state.respawnSeconds=target?0:Math.min(...state.enemies.filter(e=>e.kind!=='kogumo').map(e=>e.respawnSeconds));
  }
  function selectEnemy(state,id){
    if(id!==null&&(!(getSession(state).traits||[]).includes('swarm')||!livingEnemies(state).some(e=>e.id===id)))return false;
    state.focusedEnemyId=id;syncFront(state);return true;
  }
  function attackTargets(state,areaAttack,random,character=null){
    ensureEnemies(state);const es=reachableEnemies(state,character);if(areaAttack||es.length<2)return es;
    return [es.find(e=>e.id===state.focusedEnemyId)||es[Math.min(es.length-1,Math.floor(random()*es.length))]];
  }
  function combatRoll(spec,random=Math.random){
    let total=spec.flat||0;const dice=[];
    for(let i=0;i<(spec.dice||0);i++){
      let face=roll(1,0,random);dice.push(face);total+=face;
      if(face===1){const penalty=roll(1,0,random);total-=penalty;dice.push(-penalty);}
      else while(face===6){if(dice.length>=4096)throw new Error('対抗ロールの乱数が収束しません。');face=roll(1,0,random);dice.push(face);total+=face;}
    }
    return {total:scaledCombatTotal(total,spec),dice,critical:dice.includes(6),fumble:dice.some(x=>x<0)};
  }
  const scaledCombatTotal=(total,spec)=>Math.floor(total*(spec.resultScale??1));
  function accuracySpec(state,c,mental=(activePerks(state,c).find(p=>p.baseAttack)?.attackType||c.attackType)==='mental'){
    const base=mental?c.ss:c.accuracy,a=activation(state,c),symptom=runawayOf(state,c.id).runawaySymptom;
    const party=isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>n+(p.partyAccuracyBonus||0),0):0;
    const fixed=base.flat+(c.id==='cherry'&&cherryPerk(state,'dominance')?(state.health.cherry.fireBonus||0):0)+activePerks(state,c).reduce((n,p)=>n+(p.accuracyBonus||0),0)+party+a.reaction+(mental?0:magicState(state,c).current*magicPerPoint(state,c));
    return {dice:base.dice+a.dice,flat:symptom==='vision'?Math.floor(fixed/2):fixed,resultScale:symptom==='memory'?.5:1};
  }
  function judgmentBonus(accuracy,evasion){
    if(!accuracy||!evasion||accuracy.total<=evasion.total)return {doubleHit:false,smashCritical:0,bonusDice:0};
    const doubleHit=accuracy.total>=evasion.total*2,smashCritical=Math.floor(accuracy.dice.filter(x=>x===6).length/2);
    return {doubleHit,smashCritical,bonusDice:Number(doubleHit)+smashCritical};
  }
  const opposedCache=new Map();
  function judgmentOutcomes(accuracy,evasion,ratio=0,retries=0,criticalRetries=0){
    if(!retries&&!criticalRetries||!accuracy||!evasion)return T.outcomes(accuracy,evasion,ratio);
    const key=JSON.stringify([accuracy,evasion,ratio,retries,criticalRetries]);if(opposedCache.has(key))return opposedCache.get(key);
    const left=T.distribution(accuracy,true,true),right=T.distribution(evasion,true,true),criticalMass=right.reduce((n,[,k,p])=>n+(k?p:0),0),correction=T.hit(accuracy,evasion,ratio).correction,conditional=new Map(),bonuses=new Map();let chance=0;
    for(const [b,k,q]of right){const rw=q*(k?criticalMass**criticalRetries:Array.from({length:criticalRetries+1},(_,i)=>criticalMass**i).reduce((n,v)=>n+v,0));const fail=left.reduce((n,[a,,p])=>n+(a+correction<=b?p:0),0),factor=Array.from({length:retries+1},(_,i)=>fail**i).reduce((n,v)=>n+v,0);
      for(const [a,k,p]of left){if(a+correction<=b)continue;const double=Number(a+correction>=2*b),extra=double+Math.floor(k/2),w=p*factor*rw,id=extra+','+double;chance+=w;conditional.set(id,(conditional.get(id)||0)+w);bonuses.set(extra,(bonuses.get(extra)||0)+w);}
    }
    const result={chance,bonuses:[...bonuses],conditional:[...conditional].map(([key,p])=>[...key.split(',').map(Number),p])};if(opposedCache.size>=128)opposedCache.clear();opposedCache.set(key,result);return result;
  }
  const opposedHitChance=(accuracy,evasion)=>judgmentOutcomes(accuracy,evasion).chance;
  function healAlly(state,c,amount,events,sessionId){
    const h=state.health[c.id],before=h.hp,max=maxHP(state,c);h.hp=Math.min(max,h.hp+amount);
    if(h.hp===max){delete h.revivalTurns;delete h.revivalSeconds;h.regenSeconds=0;if(h.status!=='active'){h.status='active';if(events)events.push({type:'revive',actorId:c.id,hp:h.hp,sessionId});}}
    if(events&&h.hp>before)events.push({type:'heal',actorId:c.id,amount:h.hp-before,hp:h.hp,sessionId});
  }
  function recoverAllies(state,seconds,events,contexts=[]){
    autoReviveAllies(state,events);
    for(const c of D.characters){if(!state.levels[c.id])continue;const h=state.health[c.id],owner=formationOwner(state,c.id);
      if(h.revivalTurns>0){
        const ctx=contexts.find(ctx=>ctx.sessionId===owner);
        if(revivalUsesSeconds(state,c.id,ctx)){
          h.revivalSeconds=Math.max(0,(h.revivalSeconds??10)-seconds);
          if(h.revivalSeconds<1e-9){finishRevival(state,c.id,events,owner);continue;}
        }else h.revivalSeconds=10;
      }
      if(h.hp>=maxHP(state,c)){h.regenSeconds=0;continue;}
      const period=owner==='infirmary'?2:D.balance.recoverySeconds;h.regenSeconds+=seconds;const ticks=Math.floor((h.regenSeconds+1e-9)/period);h.regenSeconds=Math.max(0,h.regenSeconds-ticks*period);
      if(ticks)healAlly(state,c,ticks*Math.max(1,N.floor(maxHP(state,c)*.01)),events,owner);
    }
  }

  const enemyAttackDuration=(state,enemy=null,kind=enemy?.pendingAttack?.kind)=>enemySpec(state,enemy).attacks?.find(a=>a.id===kind)?.attackSeconds||enemySpec(state,enemy).attackSeconds||.72;
  function refreshFloorClip(state,force=false){
    if(!supportPerks(state).some(p=>p.protectLowestHP)){if(!state.floorClipTurns||force){state.floorClipTargetId=null;state.floorClipTurns=0;}return;}
    if(!force&&state.floorClipTurns>0)return;
    const active=formationIds(state).filter(id=>canAct(state,id));
    state.floorClipTargetId=active.reduce((best,id)=>best===null||healthOf(state,id).hp<healthOf(state,best).hp?id:best,null);
    state.floorClipTurns=1;
  }
  function enemyTargetCandidates(state,enemy=null){
    refreshFloorClip(state);
    const active=formationIds(state).map(id=>D.characters.find(c=>c.id===id)).filter(c=>canAct(state,c.id));
    return (active.length<2?active:active.filter(c=>c.id!==state.floorClipTargetId)).filter(c=>!enemy||enemyCanReach(state,enemy,c));
  }
  function enemyTargetWeights(state,enemy=null){
    const jewel=D.characters.find(c=>c.id==='jewel');
    const guarded=canAct(state,'jewel')&&activePerks(state,jewel).some(p=>p.allyTargetWeight);
    return enemyTargetCandidates(state,enemy).map(c=>({character:c,weight:(guarded&&c.id!=='jewel'?.5:1)*(formationRow(state,c.id)==='rear'?1/3:1)}));
  }
  function chooseEnemyTarget(state,random,enemy=null){
    if(enemy?.tauntId&&enemyTargetCandidates(state,enemy).some(c=>c.id===enemy.tauntId))return D.characters.find(c=>c.id===enemy.tauntId);
    const choices=enemyTargetWeights(state,enemy);let value=random()*choices.reduce((n,t)=>n+t.weight,0);
    for(const t of choices){value-=t.weight;if(value<0)return t.character;}return choices.at(-1)?.character;
  }
  function enemyAttackChoices(state,enemy,target){
    const q=enemySpec(state,enemy),distance=combatDistance(state,target.id,enemy,true);
    return (q.attacks||[]).filter(a=>inRange(a.range,distance)&&(a.id!=='revive'||ensureEnemies(state).some(e=>e.kind==='chikira'&&e.hp<=0)));
  }
  function confusionTarget(state,enemy,random,events){
    const effect=enemy.confusion;if(!effect)return null;
    if(random()<effect.releaseChance){delete enemy.confusion;if(events)events.push({type:'confusionEnd',enemyId:enemy.id});return null;}
    effect.releaseChance=Math.min(1,effect.releaseChance+.1);
    if(random()>=.5)return null;
    const candidates=livingEnemies(state).map(e=>({side:'enemy',enemy:e}));
    if(!effect.friendlyFire)candidates.push(...activeCharacters(state).map(c=>({side:'ally',actor:c})));
    return candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]||null;
  }
  function finishSightTurn(enemy){if(enemy.sightDebuff&&--enemy.sightDebuff.turns<=0)delete enemy.sightDebuff;}
  function confusedEnemyAttack(state,source,target,area,random,events){
    const attacker=enemySpec(state,source),mental=attacker.attackType==='mental',attackStrength=enemyStrength(attacker);
    const targets=area?[...livingEnemies(state)]:[target];
    for(const defender of targets){
      if(defender.hp<=0||defender.respawnSeconds)continue;
      const q=enemySpec(state,defender),accuracySpec={...(mental?attacker.ss:attacker.accuracy)},evasionDice={...(mental?q.ss:q.evasion)};
      accuracySpec.flat-=(source.accuracyPenalty||0)+(source.sightDebuff?.accuracy||0);evasionDice.flat-=(defender.evasionPenalty||0)+(defender.sightDebuff?.evasion||0);
      const p={mental,accuracySpec,evasionDice,attack:enemyAttackSpec(state,source),areaAttack:area,reduction:attacker.ignoreDefense?0:Math.max(0,mental?q.resistance:q.defense+(defender.wardSeconds>0?5:0)-(defender.defensePenalty||0)),damageElementMultiplier:attributeMultiplier(q,attacker.attackElements),hitLogRatio:T.relativeLog(enemyStrength(attacker,'accuracy'),enemyStrength(q,'evasion')),damageLogRatio:T.relativeLog(attackStrength,enemyStrength(q,'armor')),damageScaleLog:T.absoluteLog(attackStrength,enemyStrength(q,'armor'))};
      const result=rollEnemyHit(p,random),start=events?.length||0;
      if(result.hit)applyDamage(state,result.damage,events,attacker.enemy+'（混乱）',null,random,{fixedDamage:result.damage,forceSingleTarget:true,areaAttack:area},false,[defender],true);
      else if(events)events.push({type:'attack',actor:attacker.enemy+'（混乱）',actorId:null,enemyId:defender.id,targetSlot:state.enemies.indexOf(defender),damage:0,hpBefore:defender.hp,hpAfter:defender.hp,hit:false});
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
      if(enemy.respawnSeconds||enemy.hp<=0)continue;
      const individual=enemySpec(state,enemy),spec=individual.actionDice;
      if(enemy!==selectedEnemy||enemy.pendingAttack||!enemyTargetCandidates(state,enemy).length)continue;
      const confused=confusionTarget(state,enemy,random,events);
      const count=1;
      const target=confused?.side==='ally'?confused.actor:chooseEnemyTarget(state,random,enemy);
      const choices=confused?(individual.attacks||[]).filter(a=>!a.support):enemyAttackChoices(state,enemy,target),pattern=choices.length?choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]:null;
      const kind=pattern?pattern.id:confused?'attack':session.summons&&enemy.kind!=='kogumo'&&livingEnemies(state).some(e=>e.kind==='kogumo')&&random()<.2?'absorb':individual.apAttack?'flash':'attack';
      if(confused?.side==='enemy'){confusedEnemyAttack(state,enemy,confused.enemy,!!pattern?.area,random,events);finishSightTurn(enemy);continue;}
      const duration=enemyAttackDuration(state,enemy,kind);
      const taunted=kind!=='absorb'&&enemy.tauntId===target.id;
      if(kind!=='absorb')enemy.tauntId=null;
      preparePerkFailures(state,random);
      enemy.pendingAttack={confused:!!confused,targetId:target.id,remaining:duration,count:pattern?.support?1:count,kind,...(taunted?{taunted:true}:{}),profile:{...enemyHitProfile(state,enemy,target),areaAttack:!!pattern?.area}};delete state.perkFailures;finishSightTurn(enemy);
      if(events)events.push({type:'enemyWindup',targetId:target.id,enemyId:enemy.id,targetSlot:slot,duration,count,kind});
    }
  }
  function evasionSpec(state,c,mental=false){
    const base=mental?c.ss:c.evasion,extra=!mental&&isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>n+(p.partyEvasionDice||0),0):0;
    const own=activePerks(state,c).reduce((n,p)=>n+(p.evasionBonus||0),0),party=isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>n+(p.partyEvasionBonus||0),0):0;
    const a=activation(state,c),symptom=runawayOf(state,c.id).runawaySymptom,fixed=base.flat+own+party+a.reaction;
    return {flat:(symptom==='vision'?Math.floor(fixed/2):fixed)+turnEffects(state,c.id).blastEvasion,dice:base.dice+extra+a.dice,resultScale:symptom==='hearing'?.5:1};
  }
  function enemyAttackSpec(state,enemy=null){
    const attack=enemySpec(state,enemy).attack;
    return attack?{...attack,sides:Math.min(6,...supportPerks(state).map(p=>p.enemyDamageSides||6))}:null;
  }
  function enemyHitProfile(state,enemy,c){
    const session=enemySpec(state,enemy);
    const mental=session.attackType==='mental',ps=activePerks(state,c),ignoreDefense=!!session.ignoreDefense&&!penetrationImmune(c);
    const attackStrength=enemyStrength(session),defenseStrength=strengthValue(state,c,'armor');
    const accuracySpec={...(mental?session.ss:session.accuracy)};
    const accuracyPenalty=(enemy.accuracyPenalty||0)+(enemy.sightDebuff?.accuracy||0);accuracySpec.flat-=accuracyPenalty;
    return {damageElementMultiplier:attributeMultiplier(allyElements(state,c),session.attackElements),...turnEffects(state,c.id),mental,accuracyPenalty,accuracySpec,evasionDice:evasionSpec(state,c,mental),
      enemyCriticalRetries:Math.max(0,...ps.map(p=>p.enemyCriticalRetries||0)),reversal:!!state.upgrades.reversal,retake:!!state.upgrades.retake,
      nullifyChance:Math.max(0,...ps.map(p=>p.nullifyChance||0)),attack:enemyAttackSpec(state,enemy),
      hitLogRatio:T.relativeLog(enemyStrength(session,'accuracy'),strengthValue(state,c,'evasion')),
      damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength),
      reactionFailure:runawayOf(state,c.id).runawaySymptom==='mind'?.5:0,
      reduction:ignoreDefense?0:armor(state,c,mental),postReduction:activation(state,c).damage,
      shield:mental||ignoreDefense?0:ps.reduce((n,p)=>n+(p.normalHitDefense||0),0)};
  }
  function rollEnemyHit(p,random=Math.random){
    const automaticHit=!!p.nonContact||!!p.covering;
    let accuracy=automaticHit?null:combatRoll(p.accuracySpec,random),evasion;
    const accuracyReroll=!automaticHit&&p.reversal&&accuracy.critical;
    if(accuracyReroll){const original=accuracy;accuracy={...combatRoll(p.accuracySpec,random),original};}
    if(!automaticHit)for(let i=0;i<(p.enemyCriticalRetries||0)&&accuracy.critical;i++){const original=accuracy;accuracy={...combatRoll(p.accuracySpec,random),original};}
    evasion=automaticHit?null:combatRoll(p.evasionDice,random);
    const evasionReroll=!automaticHit&&p.retake&&evasion.fumble;
    if(evasionReroll){const original=evasion;evasion={...combatRoll(p.evasionDice,random),original};}
    const correction=T.hit(p.accuracySpec,p.evasionDice,p.hitLogRatio||0).correction;if(accuracy)accuracy={...accuracy,rawTotal:accuracy.total,total:accuracy.total+correction,strengthCorrection:correction};
    const forcedFailure=!automaticHit&&(p.stunned||p.reactionFailure&&random()<p.reactionFailure);
    const nullified=!automaticHit&&p.nullifyChance>0&&random()<p.nullifyChance,hit=automaticHit||(!nullified&&(forcedFailure||accuracy.total>evasion.total));
    const judgment=p.coverDoubleHit?{doubleHit:true,smashCritical:0,bonusDice:1}:hit?judgmentBonus(accuracy,evasion):{doubleHit:false,smashCritical:0,bonusDice:0};
    if(p.areaAttack&&judgment.doubleHit)judgment.bonusDice--;
    const spec={...p.attack,dice:p.attack.dice+judgment.bonusDice},defense=(p.reduction||0)+(p.nonContact||judgment.doubleHit?0:p.shield||0),b=hit?T.damage(spec,defense,p.damageLogRatio||0,p.damageScaleLog||0).correction:0;
    const damage=hit&&!p.noDamage?Math.max(1,T.cap(attributeDamage(scaledCombatTotal(roll(spec.dice,spec.flat,random,spec.sides),spec)+b,p.damageElementMultiplier)-defense-(p.postReduction||0))):0;
    const appliedDamage=p.areaAttack&&!judgment.doubleHit&&hit?Math.floor(damage/2):damage;
    return {nonContact:!!p.nonContact,automaticHit,mental:p.mental,accuracyPenalty:p.accuracyPenalty,accuracy,evasion,accuracyReroll,evasionReroll,nullified,hit,forcedFailure:!!forcedFailure,judgment,damage:p.damageElementMultiplier===0?0:appliedDamage};
  }
  const isCharm=kind=>kind==='ward'||kind==='revive';
  function applyCharm(state,enemy,slot,random,events){
    const p=enemy.pendingAttack;if(!p||p.charmApplied||!isCharm(p.kind)||enemy.hp<=0||enemy.respawnSeconds)return;
    p.charmApplied=true;let success=false,targets=[];
    if(p.kind==='ward'){for(const e of livingEnemies(state))if(['eggra','chikira'].includes(e.kind)){e.wardSeconds=10;targets.push(e.id);}success=targets.length>0;}
    else {const e=ensureEnemies(state).find(e=>e.kind==='chikira'&&e.hp<=0);if(e&&random()<.5){if(state.timeline)delete state.timeline.priorities['e:'+e.id];e.hp=Math.max(1,Math.floor(enemyMaxHP(state,e)*.5));e.respawnSeconds=0;e.actionPoints=0;e.pendingAttack=null;e.wardSeconds=0;success=true;targets=[e.id];if(events)events.push({type:'enemyRespawn',enemyId:e.id,targetSlot:state.enemies.indexOf(e)});syncFront(state);}}
    if(events)events.push({type:'enemyCharm',enemyId:enemy.id,targetSlot:slot,kind:p.kind,success,targets});
  }
  function applyElectricField(state,source,random,events){
    if(events)events.push({type:'electricField',enemyId:source.id,targetSlot:state.enemies.indexOf(source)});
    const amount=N.floor(Math.min(1e100,4*Math.pow(enemyStrength(enemySpec(state,source))/D.strength.strengthBase,.75)));
    damagePoms(state,{nonContact:true,attack:{dice:0,flat:amount},reduction:0,shield:0,postReduction:0,damageElementMultiplier:1},random,events);
    // Snapshot participants: the field fires once per discharge, never once per target.
    const allies=activeCharacters(state).filter(c=>canAct(state,c.id)),enemies=[...livingEnemies(state)];
    for(const c of allies){const factor=attributeMultiplier(allyElements(state,c),['shock']);damageAlly(state,c,attributeDamage(amount,factor),random,events,'electricField');}
    for(const e of enemies){const damage=N.floor(attributeDamage(amount,attributeMultiplier(enemySpec(state,e),['shock'])));if(!damage)continue;const before=e.hp;e.hp=Math.max(0,e.hp-damage);
      if(events)events.push({type:'attack',actor:'エレキフィールド',actorId:null,hit:true,damage,nonContact:true,targetSlot:state.enemies.indexOf(e),enemyId:e.id,hpBefore:before,hpAfter:e.hp});
      if(!e.hp){
        clearEnemy(state,e,state.enemies.indexOf(e),false,'hp',events,random);
        if(e.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:e.id,targetSlot:state.enemies.indexOf(e)});
        Object.assign(e,{respawnSeconds:respawnDelay(state),pendingAttack:null,poisonDamage:0,actionPoints:0,wardSeconds:0,defensePenalty:0,accuracyPenalty:0,evasionPenalty:0,evasionPenaltyTurns:0,evasionFailure:false,tauntId:null,slowSeconds:0,actionPenalty:0,queenCancels:0});
        delete e.confusion;delete e.sightDebuff;delete e.turnSlowRate;delete e.turnSlowSeconds;if(state.timeline)delete state.timeline.priorities['e:'+e.id];
      }
    }syncFront(state);
  }
  function coveringAllies(state){return formationIds(state).map(id=>D.characters.find(c=>c.id===id)).filter(c=>canAct(state,c.id)&&!isStunned(state,c.id)&&formationRow(state,c.id)==='front'&&activePerks(state,c).some(p=>p.covering));}
  function receiveBreak(state,c,damage,elements,random=Math.random,events=null){
    if(!elements?.includes('break')||!(damage>0))return 0;
    const rise=Math.min(1e100,damage/Math.max(1,maxHP(state,c))*100/3);
    changeRunaway(state,c.id,rise,random,events);return rise;
  }
  function resolveEnemyAttack(state,enemy,slot,random,events){
    if(isCharm(enemy.pendingAttack?.kind)){applyCharm(state,enemy,slot,random,events);enemy.pendingAttack=null;if(events)events.push({type:'enemyCharmEnd',enemyId:enemy.id});return;}
    const pending=enemy.pendingAttack;enemy.pendingAttack=null;
    if(!pending||enemy.hp<=0||enemy.respawnSeconds||(!pending.covering&&!pending.profile?.areaAttack&&!canAct(state,pending.targetId))){
      if(events&&pending)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});return;
    }
    pending.count=1; // Retired AP volleys never create extra timeline actions.
    if(pending.profile?.areaAttack&&!pending.areaResolved){
      damagePoms(state,b=>pomIncoming(state,b,enemySpec(state,enemy)),random,events);
      const targets=pending.confused?activeCharacters(state):enemyTargetCandidates(state,enemy),penalty=enemy.accuracyPenalty||0,turns=enemy.evasionPenaltyTurns;
      const covers=new Map(),guards=pending.profile.nonContact||pending.profile.mental||enemySpec(state,enemy).attackType==='mental'?[]:coveringAllies(state).filter(c=>targets.some(t=>t.id===c.id));
      const rears=targets.filter(c=>formationRow(state,c.id)==='rear');while(guards.length&&rears.length){const guard=guards.splice(Math.floor(random()*guards.length),1)[0],rear=rears.splice(Math.floor(random()*rears.length),1)[0];covers.set(guard.id,rear.id);}
      const protectedIds=new Set(covers.values());
      for(const c of targets){
        if(protectedIds.has(c.id))continue;
        enemy.accuracyPenalty=penalty;enemy.evasionPenaltyTurns=turns;
        const protectedId=covers.get(c.id),baseProfile=enemyHitProfile(state,enemy,c),profile={...baseProfile,accuracySpec:pending.profile.accuracySpec,accuracyPenalty:pending.profile.accuracyPenalty,areaAttack:true,covering:!!protectedId,coverDoubleHit:!!protectedId};
        for(let hitIndex=0;hitIndex<(protectedId?2:1);hitIndex++){enemy.pendingAttack={...pending,targetId:c.id,areaResolved:true,covering:!!protectedId,coveredTargetId:protectedId,coverHitIndex:hitIndex+1,profile};resolveEnemyAttack(state,enemy,slot,random,events);}
      }
      enemy.accuracyPenalty=0;enemy.evasionPenaltyTurns=Math.max(0,turns-1);if(!enemy.evasionPenaltyTurns)enemy.evasionPenalty=0;
      if(enemySpec(state,enemy).attacks?.find(a=>a.id===pending.kind)?.electricField)applyElectricField(state,enemy,random,events);
      return;
    }
    if(pending.kind==='absorb'&&livingEnemies(state).some(e=>e.kind==='kogumo')){
      const amount=Math.min(enemyMaxHP(state,enemy)-enemy.hp,livingEnemies(state).filter(e=>e.kind==='kogumo').reduce((n,e)=>n+e.hp,0));
      dismissKogumo(state,events);enemy.hp+=amount;
      if(events)events.push({type:'enemyAbsorb',enemyId:enemy.id,targetSlot:slot,amount});
      if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;
      syncFront(state);return;
    }
    if(!pending.covering&&!pending.areaResolved&&!pending.profile?.nonContact&&!pending.profile?.mental&&enemySpec(state,enemy).attackType!=='mental'&&formationRow(state,pending.targetId)==='rear'){const guards=coveringAllies(state),guard=guards.length?guards[Math.floor(random()*guards.length)]:null;if(guard){pending.coveredTargetId=pending.targetId;pending.targetId=guard.id;pending.covering=true;pending.profile={...enemyHitProfile(state,enemy,guard),covering:true};}}
    const session=enemySpec(state,enemy),c=D.characters.find(c=>c.id===pending.targetId),h=state.health[c.id];
    if(!pending.covering&&interceptEnemyAttack(state,enemy,c,slot,random,events)){
      if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;
      return;
    }
    // One-use effects and stun resolve at impact, including attacks queued before the spell.
    const snapshot=pending.profile||enemyHitProfile(state,enemy,c),effects=turnEffects(state,c.id);
    const pattern=session.attacks?.find(a=>a.id===pending.kind);
    const incoming={...snapshot,...effects,noDamage:!!pattern?.noDamage,damageElementMultiplier:attributeMultiplier(allyElements(state,c),session.attackElements),evasionDice:{...snapshot.evasionDice,flat:snapshot.evasionDice.flat-(snapshot.blastEvasion||0)+effects.blastEvasion}};
    const before=h.hp,slow=rangedPerks(state,c,combatDistance(state,c.id,enemy)).reduce((n,p)=>Math.max(n,elementalPerk(p,session).retaliationSlow||0),0);
    const {mental,accuracyPenalty,accuracy,evasion,accuracyReroll,evasionReroll,nullified,hit,judgment,damage:rolledDamage}=rollEnemyHit(incoming,random);
    if(effects.blastEvasion)delete h.blastEvasion;
    enemy.accuracyPenalty=0;
    if(hit&&!incoming.nonContact&&slow){enemy.actionPenalty=slow;enemy.slowSeconds=5;}
    let damage=rolledDamage,badLuck=false,fightingSpirit=false;
    if(hit&&session.apAttack){
      const slow=slowAction(h,damage,maxHP(state,c));
      if(events)events.push({type:'enemyAttack',elementMultiplier:incoming.damageElementMultiplier,targetId:c.id,enemyId:enemy.id,targetSlot:slot,enemyName:session.enemy,apDamage:true,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,...judgment,actionSlow:true,damage:Math.round(slow*100),hpBefore:before,hpAfter:before,status:h.status});
      if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;return;
    }
    if(hit)receiveFire(state,c,session.attackElements,enemy.kind||'enemy');
    if(hit&&pattern?.actionSlowRate&&incoming.damageElementMultiplier!==0)slowAction(h,0,1,pattern.actionSlowRate*incoming.damageElementMultiplier);
    if(hit&&damage>0){
      if(before-damage<=0&&state.upgrades.badLuck&&random()<.3){damage=Math.max(1,Math.floor(damage/2));badLuck=true;}
      if(before-damage<=0&&state.upgrades.fightingSpirit&&random()<.3){h.hp=1;h.status='active';fightingSpirit=true;}
      else {h.hp-=damage;if(h.hp<0)h.status='dying';else if(h.hp<4&&random()<.5)h.status='unconscious';}
      if(before===maxHP(state,c))h.regenSeconds=0;
    }
    if(events)events.push({type:'enemyAttack',elementMultiplier:incoming.damageElementMultiplier,targetId:c.id,enemyId:enemy.id,targetSlot:slot,enemyName:session.enemy,kind:pending.kind,covering:!!pending.covering,coveredTargetId:pending.coveredTargetId,coverHitIndex:pending.coverHitIndex,areaAttack:!!pending.profile?.areaAttack,apDamage:!!session.apAttack,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,accuracyPenalty,...judgment,damage,badLuck,fightingSpirit,hpBefore:before,hpAfter:h.hp,status:h.status});
    if(hit)receiveBreak(state,c,fightingSpirit?Math.max(0,before-h.hp):damage,session.attackElements,random,events);
    if(hit&&c.id==='jewel'&&canAct(state,c.id)&&activePerks(state,c).some(p=>p.damageIncome))grantPerkIncome(state,fightingSpirit?Math.max(0,before-h.hp):damage,'菫青の大盾',events);
    if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;
    if(h.status!=='active')clearTurnEffects(h);
    if(c.id==='jewel'&&h.status!=='active')state.rainbowTurns=0;
    normalizeEnemyActions(state,events);
  }

  function interceptEnemyAttack(state,enemy,c,slot,random,events){
    const successes=enemy.queenCancels||0;
    if(successes>=4||!rangedPerks(state,c,combatDistance(state,c.id,enemy)).some(p=>p.interceptAttack))return false;
    const q=enemySpec(state,enemy),spec=accuracySpec(state,c,true),defender={...q.ss,flat:q.ss.flat-((enemy.evasionPenalty||0)+(enemy.sightDebuff?.evasion||0))};
    const raw=combatRoll(spec,random),correction=T.hit(spec,defender,T.relativeLog(strengthValue(state,c,'accuracy'),enemyStrength(q,'evasion'))).correction;
    const accuracy={...raw,rawTotal:raw.total,total:raw.total+correction,strengthCorrection:correction},evasion=combatRoll(defender,random);
    const forced=!!enemy.evasionFailure;enemy.evasionFailure=false;
    const hit=forced||accuracy.total>evasion.total;
    if(hit){enemy.queenCancels=successes+1;delayTurn(state,'e:'+enemy.id,.5*(1-successes*.25));}
    if(events){events.push({type:'queenIntercept',actorId:c.id,enemyId:enemy.id,targetSlot:slot,hit,accuracy,evasion,delayCycles:hit?.5*(1-successes*.25):0});if(hit)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});}
    return hit;
  }
  function newRescue(){return {dementorClears:0,appearances:0,remaining:0,completed:false,open:false,unread:false};}
  function rescueAvailable(state){const r=state.rescue;return !!r&&!r.completed&&(r.remaining>0||r.open);}
  function rescueClear(state,random=Math.random,events){
    const r=state.rescue||(state.rescue=newRescue());r.dementorClears=Math.min(Number.MAX_SAFE_INTEGER,r.dementorClears+1);
    if(r.completed||r.dementorClears<20||rescueAvailable(state))return false;
    if(r.appearances>0&&random()>=.05)return false;
    r.appearances=Math.min(Number.MAX_SAFE_INTEGER,r.appearances+1);r.remaining=600;r.unread=true;
    if(events)events.push({type:'rescueAvailable'});return true;
  }
  function advanceRescue(state,seconds){const r=state.rescue;if(!r||r.completed)return;r.remaining=Math.max(0,r.remaining-seconds);if(!r.remaining&&!r.open)r.unread=false;}
  function openRescue(state){if(!rescueAvailable(state))return false;state.rescue.open=true;state.rescue.unread=false;return true;}
  function closeRescue(state){if(!state.rescue?.open)return false;state.rescue.open=false;if(!state.rescue.remaining)state.rescue.unread=false;return true;}
  function completeRescue(state){if(!state.rescue?.open||state.rescue.completed)return false;Object.assign(state.rescue,{completed:true,open:false,unread:false,remaining:0});return true;}
  function clearEnemy(state,enemy,slot,overkill,reason,events,random){
    if(enemy.kind==='kogumo'){
      if(events)events.push({type:'enemyRemoved',enemyId:enemy.id,targetSlot:slot});return;
    }
    const encounter=getSession(state),sharedClear=encounter.members&&!encounter.independentRespawns;
    if(sharedClear&&state.enemies.some(e=>e!==enemy&&e.hp>0)){if(events)events.push({type:'enemyDown',enemyId:enemy.id,targetSlot:slot});return;}
    if(sharedClear)for(const e of state.enemies)e.respawnSeconds=respawnDelay(state);
    if(getSession(state).summons)dismissKogumo(state,events);
    const rewardSpec=encounter.independentRespawns?enemySpec(state,enemy):encounter;
    const bonus=overkill?overkillBonus(state,rewardSpec):0,baseGain=grantIncome(state,reward(state,rewardSpec),'questReward'),bonusGain=grantIncome(state,bonus,'overkillReward'),gain=baseGain+bonusGain;
    const credits=Missions.grantCredits(state,rewardSpec.creditsReward||0),prestige=Math.min(rewardSpec.prestigeReward||0,Math.max(0,1e100-(state.prestige||0)));
    state.prestige=(state.prestige||0)+prestige;state.kills++;state.defeatCounts||={};state.defeatCounts[encounter.id]=Math.min(Number.MAX_SAFE_INTEGER,(state.defeatCounts[encounter.id]||0)+1);refreshQuestUnlocks(state);if(encounter.id==='dementor')rescueClear(state,random,events);
    const rest=restOf(state);if(rest.enabled){rest.defeats=Math.min(1e9,rest.defeats+1);checkAutoRest(state);}
    if(events)events.push({type:'clear',reward:gain,credits,prestige,overkillBonus:bonusGain,overkills:overkill?1:0,reason,targetSlot:slot,enemyId:enemy.id,hpAfter:state.hp});

  }
  const targetEvasion=(profile,enemy)=>{const base=enemy?.kind==='kogumo'?{flat:enemy.creationDamage,dice:2}:profile.evasion;return base?{...base,flat:base.flat-(enemy?.evasionPenalty||0)-(enemy?.sightDebuff?.evasion||0)}:null;};
  const targetDefense=(profile,enemy)=>profile.ignoreDefense?0:Math.max(0,(enemy?.kind==='kogumo'?0:profile.defense)+(!profile.mental&&enemy?.hp>0&&enemy?.wardSeconds>0?5:0)-(profile.mental?0:Math.max(enemy?.defensePenalty||0,profile.defenseReduction||0)));
  function attackDamage(profile,enemy,amount,doubleHit=false){
    if(profile.fixedDamage!=null)return attributeDamage(profile.fixedDamage,profile.damageElementMultiplier);
    if(profile.damageElementMultiplier===0)return 0;
    const mitigated=N.mitigate(attributeDamage(amount,profile.damageElementMultiplier),targetDefense(profile,enemy));
    return profile.areaAttack&&!profile.noAreaPenalty&&!doubleHit?Math.max(1,N.floor(mitigated/2)):mitigated;
  }
  function applyHitEffects(state,enemy,profile,count,random){
    if(enemy.hp<=0||enemy.respawnSeconds)return;
    if(profile.sightDebuff)enemy.sightDebuff={...profile.sightDebuff};
    if(profile.confusion)enemy.confusion={...profile.confusion};
    if(profile.tauntId)enemy.tauntId=profile.tauntId;
    if(profile.apReduction)slowAction(enemy,profile.apReduction,enemyMaxHP(state,enemy));
    enemy.defensePenalty=Math.max(enemy.defensePenalty||0,profile.defenseReduction||0);
    if(profile.apReductionRate)slowAction(enemy,0,1,profile.apReductionRate);
    const chance=profile.accuracyPenaltyChance||0;
    if(chance&&random()<(count===1?chance:-Math.expm1(count*Math.log1p(-chance))))enemy.accuracyPenalty=Math.max(enemy.accuracyPenalty||0,profile.accuracyPenalty);
    const evasionChance=profile.evasionFailureChance||0;
    if(evasionChance&&random()<(count===1?evasionChance:-Math.expm1(count*Math.log1p(-evasionChance))))enemy.evasionFailure=true;
  }
  function applyDamage(state,amount,events,actor,actorId,random,profile,extraAttack=false,chosenTargets=null,confirmedHit=false,rawDamage=false){
    if(isWaiting(state))return;
    const enemies=ensureEnemies(state);
    if(getSession(state).summons&&!profile.forceSingleTarget)profile={...profile,areaAttack:hasAreaAttack(state,D.characters.find(c=>c.id===actorId))};
    const character=D.characters.find(c=>c.id===actorId);
    const targets=chosenTargets||attackTargets(state,profile.areaAttack,random,character);
    const originalProfile=profile;
    const automaticHit=!!profile.nonContact||(!confirmedHit&&profile.autoHitChance>0&&random()<profile.autoHitChance);
    const rawAccuracy=!confirmedHit&&!automaticHit&&profile.accuracy?combatRoll(profile.accuracy,random):null;
    let baseDamageRoll=null;
    for(const [targetIndex,enemy]of targets.entries()){
      if(enemy.hp<=0)continue;
      if(character&&rawDamage&&!profile.forceSingleTarget){
        if(!canReach(state,character,enemy))continue;
        const scoped=attackProfile(state,character,false,enemySpec(state,enemy),enemy);
        profile={...originalProfile,...scoped};
      }
      profile={...profile,damageElementMultiplier:attributeMultiplier(enemySpec(state,enemy),profile.attackElements)};
      const burnBefore=enemy.burnDamage||0;
      const poisonBefore=enemy.poisonDamage;
      const bHit=T.hit(profile.accuracy,targetEvasion(profile,enemy),profile.hitLogRatio||0).correction;
      let accuracy=rawAccuracy?{...rawAccuracy,rawTotal:rawAccuracy.total,total:rawAccuracy.total+bHit,strengthCorrection:bHit}:null;
      const slot=enemies.indexOf(enemy),forcedEvasionFailure=!!accuracy&&!!enemy.evasionFailure;
      let evasion=accuracy?combatRoll(targetEvasion(profile,enemy),random):null;
      if(evasion)for(let i=0;i<(profile.enemyCriticalRetries||0)&&evasion.critical;i++){const original=evasion;evasion={...combatRoll(targetEvasion(profile,enemy),random),original};}
      if(accuracy&&!forcedEvasionFailure)for(let i=0;i<(profile.accuracyRetries||0)&&accuracy.total<=evasion.total;i++){const original=accuracy,raw=combatRoll(profile.accuracy,random);accuracy={...raw,rawTotal:raw.total,total:raw.total+bHit,strengthCorrection:bHit,original};}
      if(forcedEvasionFailure)enemy.evasionFailure=false;
      if(accuracy&&!forcedEvasionFailure&&accuracy.total<=evasion.total){
        if(events)events.push({type:'attack',mental:!!profile.mental,actor,actorId,pomAssisted:!!profile.pomDice,motion:profile.motion,distance:profile.distance,apDamage:!!profile.apAttack,magicLevel:profile.magicLevel||0,damage:0,hit:false,accuracy,evasion,poisonBefore,poisonAfter:poisonBefore,hpBefore:enemy.hp,hpAfter:enemy.hp,targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:targetIndex>0,extraAttack});
        continue;
      }
      if(!profile.nonContact)applyHitEffects(state,enemy,profile,1,random);
      const judgment=judgmentBonus(accuracy,evasion);
      if(profile.areaAttack&&judgment.doubleHit)judgment.bonusDice--;
      const jewel=actorId==='jewel'?D.characters.find(c=>c.id==='jewel'):null,ps=jewel?rangedPerks(state,jewel,combatDistance(state,jewel.id,enemy)):[];
      if(judgment.doubleHit&&ps.some(p=>p.rainbowArmor)){
        const wasActive=rainbowActive(state);state.rainbowTurns=3;
        if(!wasActive){profile={...profile,flat:profile.flat+15};amount+=15;}
      }
      if(ps.some(p=>p.evasionReduction)){enemy.evasionPenalty=6;enemy.evasionPenaltyTurns=2;}
      const spec={dice:profile.dice+(profile.pomDice||0)+judgment.bonusDice,flat:profile.flat+(profile.pomFlat||0)+(profile.bonus||0)+(judgment.doubleHit?profile.doubleHitDamage||0:0),resultScale:profile.resultScale??1};
      const correction=rawDamage&&profile.fixedDamage==null?T.damage(spec,targetDefense(profile,enemy),profile.damageLogRatio||0,profile.damageScaleLog||0).correction:0;
      // Keep one shared base roll for a whole-area action; extra judgment dice
      // and each target's inverse correction are resolved after its hit check.
      if(rawDamage&&baseDamageRoll===null)baseDamageRoll=roll(profile.dice+(profile.pomDice||0),0,random);
      const powered=rawDamage?scaledCombatTotal(baseDamageRoll+roll(judgment.bonusDice,0,random)+spec.flat,spec)+correction:amount;
      const damage=attackDamage(profile,enemy,powered,judgment.doubleHit);
      if(profile.apAttack){
        const apBefore=0;const slow=slowAction(enemy,damage,enemyMaxHP(state,enemy));
        if(events)events.push({type:'attack',mental:!!profile.mental,actor,actorId,motion:profile.motion,distance:profile.distance,damage:Math.round(slow*100),rolledDamage:damage,apDamage:true,actionSlow:true,apBefore,apAfter:0,hit:true,accuracy,evasion,...judgment,poisonBefore,poisonAfter:poisonBefore,hpBefore:enemy.hp,hpAfter:enemy.hp,targetSlot:slot,enemyId:enemy.id,extraAttack});
        continue;
      }
      if(judgment.doubleHit&&ps.some(p=>p.doubleHitIncome))grantPerkIncome(state,Math.min(enemy.hp,damage),'紅の拳',events);
      if(!profile.nonContact&&profile.poisonDamage)enemy.poisonDamage=Math.max(enemy.poisonDamage,profile.poisonDamage);
      const hit=(damage,poisonTick=false)=>{
        const before=enemy.hp;state.totalDamage+=Math.min(before,damage);enemy.hp=Math.max(0,before-damage);
        const knockoutRoll=damage>0&&enemy.hp>0&&enemy.hp<=D.balance.knockoutHP?roll(1,0,random):null;
        const knockedOut=knockoutRoll!==null&&knockoutRoll%2===1;
        if(events)events.push({type:'attack',mental:!!profile.mental,actor:poisonTick?'猛毒':actor,actorId:poisonTick?null:actorId,motion:profile.motion,distance:profile.distance,magicLevel:poisonTick?0:profile.magicLevel||0,damage,elementMultiplier:poisonTick?1:profile.damageElementMultiplier,hit:true,nonContact:poisonTick||!!profile.nonContact,automaticHit:poisonTick||automaticHit,forcedEvasionFailure:poisonTick?false:forcedEvasionFailure,accuracy:poisonTick?null:accuracy,evasion:poisonTick?null:evasion,...(poisonTick?{}:judgment),poisonBefore,poisonAfter:enemy.hp>0&&!knockedOut?enemy.poisonDamage:0,hpBefore:before,hpAfter:enemy.hp,
          targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:targetIndex>0,extraAttack,pomDice:poisonTick?0:profile.pomDice||0,pomFlat:poisonTick?0:profile.pomFlat||0,poisonTick,knockoutRoll,knockedOut});
        if(!enemy.hp||knockedOut){
          clearEnemy(state,enemy,slot,!poisonTick&&profile.overkillThreshold>0&&damage-before>=profile.overkillThreshold,knockedOut?'knockout':'hp',events,random);
          if(enemy.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});
          enemy.hp=0;if(state.timeline)delete state.timeline.priorities["e:"+enemy.id];delete enemy.confusion;delete enemy.sightDebuff;delete enemy.turnSlowRate;delete enemy.turnSlowSeconds;enemy.wardSeconds=0;enemy.poisonDamage=0;enemy.respawnSeconds=enemy.kind==='kogumo'?0:respawnDelay(state);enemy.actionPoints=0;enemy.pendingAttack=null;enemy.defensePenalty=0;enemy.accuracyPenalty=0;enemy.evasionPenalty=0;enemy.evasionPenaltyTurns=0;enemy.evasionFailure=false;enemy.tauntId=null;enemy.slowSeconds=0;enemy.actionPenalty=0;enemy.queenCancels=0;
          if(state.focusedEnemyId===enemy.id)state.focusedEnemyId=null;return true;
        }
        if(!poisonTick&&!profile.nonContact&&getSession(state).summons&&enemy.kind!=='kogumo')spawnKogumo(state,damage,events);
        return false;
      };
      const dead=hit(damage);
      if(!dead&&!profile.nonContact&&enemy.poisonDamage)hit(enemy.poisonDamage,true);
      if(!profile.nonContact&&burnBefore&&enemy.hp>0&&state.health?.cherry?.status==='active'&&!runawayOf(state,'cherry').runawayCollapsed){
        applyDamage(state,burnBefore,events,'炎上',null,random,{fixedDamage:burnBefore,attackElements:['fire'],nonContact:true,forceSingleTarget:true},false,[enemy],true);
      }
      if(enemy.hp>0&&!profile.nonContact&&actorId==='cherry'&&cherryPerk(state,'burning'))enemy.burnDamage=cherryDamage(state);
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
    if(!(chance>0&&chance<1))return 1;
    const u=Math.max(0,Math.min(1-Number.EPSILON/2,random()));
    return 1+Math.floor(Math.log1p(-u)/Math.log(chance));
  }
  function performAttack(state,character,profile,random,events,limit=Infinity){
    if(character&&!hasReachableTarget(state,character))return;
    if(!prepareMagicAction(state,character,events))return;
    const first=attackTargets(state,profile.areaAttack,random,character);
    if(!first.length)return;
    if(character)profile=attackProfile(state,character,false,enemySpec(state,first[0]),first[0]);
    const count=Math.min(limit,chainAttackCount(profile.extraAttackChance,random));
    for(let i=0;i<count&&!isWaiting(state);i++){
      const targets=i?attackTargets(state,profile.areaAttack,random,character):first;
      if(!targets.length)break;
      if(i&&character&&!attackProfile(state,character,false,enemySpec(state,targets[0]),targets[0]).extraAttackChance)break;
      const recoilDice=character?attackRecoilDice(state,character,random):0;
      applyDamage(state,0,events,character?character.name:'あなた',character?.id||null,random,{...profile,pomDice:i?0:state.health[character?.id]?.pomBonus?.dice||0,pomFlat:i?0:state.health[character?.id]?.pomBonus?.flat||0},i>0,targets,false,true);
      if(recoilDice){const power=strengthValue(state,character,'power'),defense=strengthValue(state,character,'armor'),spec={dice:recoilDice,flat:0};const correction=T.damage(spec,0,T.relativeLog(power,defense),T.absoluteLog(power,defense)).correction;damageAlly(state,character,Math.max(1,roll(recoilDice,0,random)+correction),random,events,'反動');if(healthOf(state,character.id).status!=='active')break;}
    }
    if(character?.id==='cherry'){delete state.health.cherry.fireBonus;if(canAct(state,'cherry')&&cherryPerk(state,'fireExtra')&&random()<.25)cherryExtra(state,character,random,events);}
    clearBurns(state);
    finishMagicAttack(state,character,profile);
    if(character?.id==='jewel')state.rainbowTurns=Math.max(0,(state.rainbowTurns||0)-1);
  }
  function queueManualAttack(state,random=Math.random){
    if(getSession(state).medical||state.viewingMemories||state.dreamShop||state.paused||isResting(state)||isWaiting(state))return [];
    const c=selectedCharacter(state);if(c&&(!canAct(state,c.id)||isStunned(state,c.id)||!hasReachableTarget(state,c)))return [];
    state.timeline||=newTimeline();const pending=state.timeline.manualAttacks||[];if(pending.length>=32)return [];
    if(c?.magicPower&&pending.some(p=>p.actorId===c.id))return [];
    const magic=magicState(state,c),charging=magic.current<magic.maximum;
    const p=attackProfile(state,c,true),target=attackTargets(state,p.areaAttack,random,c)[0];if(!target)return [];
    const remaining=charging?.25:FX.manualImpactSeconds(c?.id,p.motion);state.clicks++;
    state.timeline.manualAttacks=[...pending,{actorId:c?.id||null,targetId:target.id,remaining}];
    // Manual projectiles run alongside the automatic turn clock.
    return [{type:'manualLaunch',pomAssisted:c?.id==='richter'&&pomUnits(state).length>0,charging,actorId:c?.id||null,actor:c?.name||'あなた',targetSlot:state.enemies.indexOf(target),enemyId:target.id,motion:p.motion,magicLevel:p.magicLevel||0,count:1,hit:true,damage:0}];
  }
  function resolveManualAttack(state,p,random){
    const c=p.actorId?D.characters.find(c=>c.id===p.actorId):null;
    if(!state.enemies?.some(e=>e.id===p.targetId&&e.hp>0&&!e.respawnSeconds)||c&&!isDeployed(state,c.id))return [];
    const selected=state.selectedCharacterId,focused=state.focusedEnemyId;
    state.selectedCharacterId=p.actorId;state.focusedEnemyId=p.targetId;
    try{const busy=state.timeline.busySeconds||0,events=click(state,random,false);state.timeline.busySeconds=busy;return events.map(e=>({...e,manualImpact:true}));}
    finally{state.selectedCharacterId=selected;state.focusedEnemyId=state.enemies?.some(e=>e.id===focused&&e.hp>0)?focused:null;syncFront(state);}
  }
  function click(state,random=Math.random,countClick=true){
    if(countClick&&state.viewingMemories)return [];
    if(getSession(state).medical||state.dreamShop||state.paused||isResting(state)||isWaiting(state))return [];
    const character=selectedCharacter(state);
    if(character&&(!canAct(state,character.id)||isStunned(state,character.id)||!hasReachableTarget(state,character)))return [];
    // Unassigned manual attacks remain available to bootstrap the first hire.
    if(countClick)state.clicks++;const events=[];if(!character||beginRunawayAction(state,character,random,events))performAttack(state,character,attackProfile(state,character,true),random,events);if(character)endRunawayAction(state,character,random,events);state.timeline||=newTimeline();state.timeline.busySeconds=Math.max(state.timeline.busySeconds||0,FX.turnDuration(events));return events;
  }
  function automaticTick(state,random,events){
    state.timeline||=newTimeline();const units=timelineUnits(state,random).filter(u=>!(u.actor?.magicPower&&state.timeline.manualAttacks?.some(p=>p.actorId===u.id))),chosen=smoothTurn(units,state.timeline.priorities);
    if(!chosen)return;state.timeline.turns=Math.min(1e100,state.timeline.turns+1);
    if(chosen.side==='ally'&&chosen.id==='waku')refreshFloorClip(state,true);
    if(events)events.push({type:'timelineTurn',unitKey:chosen.key,actorId:chosen.side==='ally'?chosen.id:null,enemyId:chosen.side==='enemy'?chosen.id:null});
    if(chosen.side==='enemy'){enemyActions(state,random,events,chosen.enemy);advanceRevivalTurns(state,events);return;}
    const c=chosen.actor,count=isStunned(state,c.id)||isActionDonor(state,c)?1:Math.min(MAX_TURN_ACTIONS,chainAttackCount(freeActionChance(state,c),random));
    for(let n=0;n<count&&!isWaiting(state)&&canAct(state,c.id);n++){
      performAutomaticAction(state,c,random,events);if(isStunned(state,c.id))break;
    }
    advanceRevivalTurns(state,events);
  }
  function* advanceSteps(state,seconds,random=Math.random,collectEvents=true,offline=false){
    // Closed-browser time advances dispatch timers only, never battle state.
    if(offline){if(Number.isFinite(seconds)&&seconds>0)Missions.advance(state,seconds);return [];}
    if(state.dreamShop||state.paused||seconds<=0)return [];
    const duration=Math.min(seconds,D.maxOfflineSeconds),clock=state.actionClock,speed=battleSpeed(state),events=collectEvents?[]:null;
    state.health||=Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}]));
    state.autoRest||=Object.fromEntries(D.sessions.map(q=>[q.id,newAutoRest()]));
    const contexts=D.sessions.filter(q=>{const ctx=battleContext(state,q.id);return (ctx.timeline?.manualAttacks?.length||0)>0||formationIds(state,q.id).length||(ctx.timeline?.busySeconds||0)>0||isWaiting(ctx)||questChangePending(state,q.id)||ctx.enemies?.some(e=>e.respawnSeconds>0||e.pendingAttack);}).map(q=>battleContext(state,q.id));
    for(const ctx of contexts){normalizeEnemyActions(ctx,events?{push:e=>events.push({...e,sessionId:ctx.sessionId})}:null);refreshFloorClip(ctx);}
    let elapsed=0,wallAt=1-clock;
    const gummyEnabled=(state.levels.pine||0)>=10&&(state.perkEnabled?.pine?.['apple-gummy']||false);
    function elapse(dt){
      // Resolve sub-second impacts and respawns in chronological order. The
      // same boundaries are used by live and background simulation.
      let remaining=dt;
      while(remaining>1e-10){
        const timers=contexts.filter(ctx=>!isResting(ctx)).flatMap(ctx=>ensureEnemies(ctx).flatMap(e=>[duoWaiting(ctx)?Infinity:e.respawnSeconds||Infinity,e.pendingAttack?.remaining??Infinity,isCharm(e.pendingAttack?.kind)&&!e.pendingAttack.charmApplied?Math.max(1e-9,e.pendingAttack.remaining-.48):Infinity,e.wardSeconds||Infinity]));
        const step=Math.min(remaining,...timers.map(t=>t/speed),...contexts.map(restBoundary));Missions.advance(state,step);advanceRescue(state,step);recoverAllies(state,step,events,contexts);remaining=Math.max(0,remaining-step);elapsed+=step;
        for(const h of Object.values(state.health||{}))if(h.turnSlowSeconds>0){h.turnSlowSeconds=Math.max(0,h.turnSlowSeconds-step*speed);if(h.turnSlowSeconds<1e-9){h.turnSlowSeconds=0;h.turnSlowRate=0;}}
        for(const h of Object.values(state.health||{}))elapseSummonDelay(h,step*speed);
        for(const ctx of contexts){
          for(const p of ctx.timeline?.manualAttacks||[])p.remaining=Math.max(0,p.remaining-step*speed);
          if(ctx.timeline?.busySeconds>0)ctx.timeline.busySeconds=Math.max(0,ctx.timeline.busySeconds-step*speed);
          for(const e of ctx.enemies||[])elapseSummonDelay(e,step*speed);
          for(const e of ctx.enemies||[])if(e.turnSlowSeconds>0){e.turnSlowSeconds=Math.max(0,e.turnSlowSeconds-step*speed);if(e.turnSlowSeconds<1e-9){e.turnSlowSeconds=0;e.turnSlowRate=0;}}
          if(isResting(ctx)){if(ctx.timeline?.manualAttacks)ctx.timeline.manualAttacks=ctx.timeline.manualAttacks.filter(p=>p.remaining>1e-9);advanceRest(ctx,step);continue;}
          const local=[];
          ctx.factors=state.factors;ctx.earned=state.earned;ctx.credits=state.credits;ctx.creditsEarned=state.creditsEarned;ctx.prestige=state.prestige;ctx.formations=state.formations;
          const incomeBefore={factors:ctx.factors,earned:ctx.earned,credits:ctx.credits,creditsEarned:ctx.creditsEarned,prestige:ctx.prestige,kills:ctx.kills,totalDamage:ctx.totalDamage};
          const due=(ctx.timeline?.manualAttacks||[]).filter(p=>p.remaining<1e-9);
          if(due.length){ctx.timeline.manualAttacks=ctx.timeline.manualAttacks.filter(p=>p.remaining>=1e-9);for(const p of due)local.push(...resolveManualAttack(ctx,p,random));}
          // Protection expires at Waku's next automatic turn, never on a wall-clock deadline.
          const holdDown=duoWaiting(ctx);
          for(const [slot,e]of ensureEnemies(ctx).entries()){
            if(e.wardSeconds>0)e.wardSeconds=Math.max(0,e.wardSeconds-step*speed);
            if(e.slowSeconds>0){e.slowSeconds=Math.max(0,e.slowSeconds-step*speed);if(e.slowSeconds<1e-9){e.slowSeconds=0;e.actionPenalty=0;}}
            if(e.respawnSeconds>0){if(holdDown)continue;e.respawnSeconds=Math.max(0,e.respawnSeconds-step*speed);
              if(e.respawnSeconds<1e-9){Object.assign(e,getSession(ctx).members?newMember(ctx,slot):newEnemy(ctx));if(local)local.push({type:'enemyRespawn',targetSlot:slot,enemyId:e.id});}
            }else if(e.pendingAttack){e.pendingAttack.remaining=Math.max(0,e.pendingAttack.remaining-step*speed);
              if(isCharm(e.pendingAttack.kind)&&e.pendingAttack.remaining<=.48000001)applyCharm(ctx,e,slot,random,local);
              if(e.pendingAttack.remaining<1e-9)resolveEnemyAttack(ctx,e,slot,random,local);
            }
          }
          if(!isResting(ctx))advanceRest(ctx,step);syncFront(ctx);refreshFloorClip(ctx);if(local?.some(e=>e.type==='enemyAttack'||e.type==='enemyAbsorb'||e.type==='enemyCharmEnd'||e.type==='enemyRespawn')){ctx.timeline||=newTimeline();ctx.timeline.busySeconds=Math.max(ctx.timeline.busySeconds||0,1.2);}if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
          if(ctx!==state)for(const k of Object.keys(incomeBefore))state[k]+=ctx[k]-incomeBefore[k];
        }
      }
    }
    function readyTurns(){
      for(const ctx of contexts){
        ctx.formations=state.formations;ctx.factors=state.factors;ctx.earned=state.earned;ctx.credits=state.credits;ctx.creditsEarned=state.creditsEarned;ctx.prestige=state.prestige;
        ctx.questActiveLevels=state.questActiveLevels;
        if(questChangePending(state,ctx.sessionId)&&!questBusy(ctx)){const level=state.pendingQuestLevels[ctx.sessionId];delete state.pendingQuestLevels[ctx.sessionId];applyQuestLevel(state,ctx.sessionId,level,ctx);}
        normalizeEnemyActions(ctx);if(getSession(ctx).medical||isResting(ctx)||isWaiting(ctx)||!activeCharacters(ctx).length||(ctx.timeline?.busySeconds||0)>1e-8||ctx.enemies?.some(e=>e.pendingAttack))continue;
        const before={factors:ctx.factors,earned:ctx.earned,credits:ctx.credits,creditsEarned:ctx.creditsEarned,prestige:ctx.prestige,kills:ctx.kills,totalDamage:ctx.totalDamage},local=[];
        automaticTick(ctx,random,local);
        ctx.timeline.busySeconds=FX.turnDuration(local);
        if(ctx!==state)for(const k of Object.keys(before))state[k]+=ctx[k]-before[k];
        if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
      }
    }
    // Animation deadlines are battle time; periodic recovery/pressure stay wall time.
    // Starting a turn always creates a finite barrier, including status-only turns.
    readyTurns();
    while(elapsed<duration-1e-10){
      const deadlines=contexts.flatMap(ctx=>{
        if(isResting(ctx))return [restBoundary(ctx)];
        return [...(ctx.timeline?.manualAttacks||[]).map(p=>p.remaining/speed),(ctx.timeline?.busySeconds||Infinity)/speed,...ensureEnemies(ctx).flatMap(e=>[(duoWaiting(ctx)?Infinity:e.respawnSeconds||Infinity)/speed,(e.pendingAttack?.remaining??Infinity)/speed,(e.summonDelaySeconds||Infinity)/speed])];
      });
      const step=Math.min(duration-elapsed,Math.max(1e-9,wallAt-elapsed),...deadlines.filter(t=>t>1e-8),...Object.values(state.health).map(h=>(h.summonDelaySeconds||Infinity)/speed));
      elapse(step);
      if(elapsed+1e-8>=wallAt){
        for(const c of D.characters)if(state.levels[c.id]){
          const owner=formationOwner(state,c.id),ctx=contexts.find(q=>q.sessionId===owner)||state,before={factors:state.factors,earned:state.earned,credits:state.credits,creditsEarned:state.creditsEarned,prestige:state.prestige,kills:state.kills,totalDamage:state.totalDamage};
          Object.assign(ctx,before);ctx.formations=state.formations;
          const local=events?[]:null;
          changeRunaway(ctx,c.id,runawayPressure(state,c),random,local);
          if(events)events.push(...local.map(e=>({...e,sessionId:owner||state.sessionId})));
          if(ctx!==state){for(const k of Object.keys(before))state[k]+=ctx[k]-before[k];state.formations=ctx.formations;}
        }
        if(random()<-Math.expm1(-1/D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds))jewelSideIncome(state,random,events);
        if(gummyEnabled&&random()<rareEventChance(1/600))pineGummy(state,random,events);
        wallAt+=1;
      }
      // Do not start an action at the right-open end of this advance call.
      if(elapsed<duration-1e-10)readyTurns();
      yield elapsed/duration;
    }
    autoReviveAllies(state,events);
    for(const ctx of contexts)if(ctx!==state)state.sessionStates={...state.sessionStates,[ctx.sessionId]:battleSnapshot(ctx)};
    state.actionClock=Math.max(0,(clock+duration)%1);if(state.actionClock<1e-9||state.actionClock>1-1e-9)state.actionClock=0;state.sceneSeconds=((state.sceneSeconds||0)+duration)%D.sceneCycle.seconds;
    refreshQuestUnlocks(state);refreshPerkUnlocks(state);
    return events||[];
  }
  // Drain the same continuation synchronously for live play. Async recovery
  // suspends this generator without restarting its clocks.
  function advance(state,seconds,random=Math.random,collectEvents=true,offline=false){
    const job=advanceSteps(state,seconds,random,collectEvents,offline);let step;do{step=job.next();}while(!step.done);return step.value;
  }
  function catchUp(state, now = Date.now()) {
    const seconds = Math.max(0, (now - state.savedAt) / 1000);
    const oldKills = state.kills, oldFactors = state.factors;
    advance(state, seconds, Math.random, false, true);
    state.savedAt = now;
    return { seconds, kills: state.kills - oldKills, factors: state.factors - oldFactors };
  }
  function hire(state, id) {
    const c = D.characters.find(item => item.id === id);
    if (!c || !isCharacterUnlocked(state,c) || !Number.isSafeInteger(state.levels[id]+1)) return false;
    const cost = hireCost(state, c),currency=hireCurrency(state,c);
    if (!Number.isFinite(cost)||cost>1e100||state[currency] < cost) return false;
    refreshQuestUnlocks(state);
    state[currency] -= cost;
    if (state.levels[id] === 0) state.actionPoints[id] = 0;
    state.levels[id]++;
    return true;
  }
  function buyPerk(state,characterId,perkId){return togglePerk(state,characterId,perkId);}
  function togglePerk(state,characterId,perkId,enabled){
    refreshPerkUnlocks(state);const c=D.characters.find(c=>c.id===characterId),p=c&&perks(state,c).find(p=>p.id===perkId);
    if(!p||!p.owned||p.awakeningLevel)return false;state.perkEnabled[characterId][perkId]=enabled===undefined?!p.enabled:!!enabled;normalizeMagic(state,c);if(p.strengthBonus?.vitality)clampHealth(state,c.id);return true;
  }
  function buyUpgrade(state, id) {
    const u = D.upgrades.find(item => item.id === id);
    if (!u || (u.max != null && state.upgrades[id] >= u.max) || !Number.isSafeInteger(state.upgrades[id]+1)) return false;
    const cost = upgradeCost(state, u);
    if (!Number.isFinite(cost) || state.factors < cost) return false;
    refreshQuestUnlocks(state);
    state.factors -= cost;
    state.upgrades[id]++;
    return true;
  }
  // All quotes are calculated from the same independently rounded prices as
  // single purchases. A bulk purchase commits only if every step is affordable.
  function tradeTrack(state,kind,id) {
    const c=D.characters.find(c=>c.id===id),u=D.upgrades.find(u=>u.id===id);
    if(['level','power'].includes(kind)&&c)return {field:'levels',minimum:1,buy:hire,cost:s=>hireCost(s,c)};
    if(kind==='upgrade'&&u)return {field:'upgrades',minimum:0,buy:buyUpgrade,cost:s=>upgradeCost(s,u)};
    if(kind==='quest'&&D.sessions.some(q=>q.id===id&&!q.medical))return {field:'questLevels',minimum:1,buy:buyQuest,cost:s=>questCost(s,id)};
    return null;
  }
  function tradeDraft(state) { return {...state,characterUnlocks:{...state.characterUnlocks},defeatCounts:{...state.defeatCounts},incomeTotals:{...state.incomeTotals},unlockedPerks:structuredClone(state.unlockedPerks),perkEnabled:structuredClone(state.perkEnabled),concentration:structuredClone(state.concentration),actionPoints:{...state.actionPoints},levels:{...state.levels},upgrades:{...state.upgrades},questLevels:{...state.questLevels},questActiveLevels:{...state.questActiveLevels},pendingQuestLevels:{...state.pendingQuestLevels},timeline:structuredClone(state.timeline),sessionStates:structuredClone(state.sessionStates),enemies:state.enemies?structuredClone(state.enemies):null,health:structuredClone(state.health)}; }
  function purchaseQuote(state,kind,id,count=10) {
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);let cost=0;
    if(!track||kind==='quest'&&!isQuestUnlocked(state,id)||![1,10].includes(count))return {valid:false,cost:Infinity,count};
    if(['level','power'].includes(kind)&&!state.levels[id]&&D.characters.find(c=>c.id===id)?.hireCurrency)return {valid:false,cost:Infinity,count};
    refreshQuestUnlocks(draft);
    draft.factors=Infinity;
    for(let i=0;i<count;i++){
      const next=track.cost(draft);
      if(!Number.isFinite(next)||!track.buy(draft,id)||!Number.isFinite(cost+next)||cost+next>1e100)return {valid:false,cost:Infinity,count};
      cost+=next;
    }
    return {valid:true,cost,count,from:state[track.field][id],to:draft[track.field][id]};
  }
  function buyMany(state,kind,id,count=10) {
    const quote=purchaseQuote(state,kind,id,count);
    if(!quote.valid||state.factors<quote.cost)return false;
    refreshQuestUnlocks(state);
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);
    // Avoid repeated subtraction rounding changing the final affordable step.
    draft.factors=Infinity;
    for(let i=0;i<count;i++)if(!track.buy(draft,id))return false;
    draft.factors=state.factors-quote.cost;Object.assign(state,draft);return true;
  }
  function saleQuote(state,kind,id,count=1) {
    const track=tradeTrack(state,kind,id);
    if(!track||![1,10].includes(count)||kind==='quest'&&!isQuestUnlocked(state,id)||state[track.field][id]-count<track.minimum)return {valid:false,refund:0};
    const draft=tradeDraft(state);let refund=0;
    for(let i=0;i<count;i++){draft[track.field][id]--;const price=track.cost(draft);if(!Number.isFinite(price))return {valid:false,refund:0};refund+=Math.max(1,N.floor(price*.5));}
    return {valid:Number.isFinite(refund)&&state.factors+refund<=1e100,refund,count,from:state[track.field][id],to:draft[track.field][id]};
  }
  function sell(state,kind,id,count=1) {
    const quote=saleQuote(state,kind,id,count);if(!quote.valid)return false;
    if(kind==='quest')delete state.pendingQuestLevels[id];
    const track=tradeTrack(state,kind,id),ctx=kind==='quest'?battleContext(state,id):null,oldHP=ctx?getSession(ctx).hp:0,active=ctx?questLevel(state,id):0;
    if(ctx)ensureEnemies(ctx);
    refreshPerkUnlocks(state);state[track.field][id]=quote.to;grantIncome(state,quote.refund,'refund');
    if(['level','power'].includes(kind)){
      const values=concentration(state,id);if(Object.values(values).reduce((n,v)=>n+v,0)>concentrationPoints(state,id))state.concentration={...state.concentration,[id]:emptyConcentration()};
      clampHealth(state,id);
    }
    if(ctx&&active>state.questLevels[id]){
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
    if(state.viewingMemories&&state.sessionId===id){state.viewingMemories=false;return true;}
    if(!isQuestUnlocked(state,id)||state.sessionId===id)return false;
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
    if(!original.levels[id]||!targets||Object.keys(targets).some(k=>!tracks.some(t=>t.id===k)))return {valid:false};
    const draft=tradeDraft(original);let cost=0,refund=0;
    for(const t of tracks){const n=targets[t.id]??original[t.field][id];if(!Number.isSafeInteger(n)||n<t.minimum)return {valid:false};}
    for(const t of tracks){const n=targets[t.id]??original[t.field][id];while(draft[t.field][id]>n){const q=saleQuote(draft,t.id,id);if(!q.valid||!sell(draft,t.id,id))return {valid:false};refund+=q.refund;}}
    for(const t of tracks){const n=targets[t.id]??original[t.field][id],track=tradeTrack(draft,t.id,id);while(draft[t.field][id]<n){const price=track.cost(draft);if(!track.buy(draft,id))return {valid:false};cost+=price;}}
    return {valid:true,state:draft,cost,refund};
  }
  function profileAverage(state,p){
    if(p.reachable===false)return 0;
    if(p.fixedDamage!=null)return attributeDamage(p.fixedDamage,p.damageElementMultiplier);
    const original=p;
    const average=enemy=>{const c=D.characters.find(c=>c.id===original.actorId),ctx=c?.magicPower?{...state,health:{...state.health,[c.id]:{...healthOf(state,c.id),magicLevel:original.magicLevel}}}:state;
      const p=c&&enemy&&(getSession(state).members||enemy.kind==='kogumo'||combatDistance(state,c.id,enemy)!==original.distance)?attackProfile(ctx,c,false,enemySpec(state,enemy),enemy):original;
      const outcomes=judgmentOutcomes(p.accuracy,targetEvasion(p,enemy),p.hitLogRatio||0,p.accuracyRetries,p.enemyCriticalRetries),auto=p.autoHitChance||0,defense=targetDefense(p,enemy);
      const mean=(extra=0,double=0)=>{const spec={dice:p.dice+extra-(p.areaAttack?double:0),flat:p.flat+(p.bonus||0)+double*(p.doubleHitDamage||0),resultScale:p.resultScale??1},b=T.damage(spec,defense,p.damageLogRatio||0,p.damageScaleLog||0).correction;
        return T.distribution(spec,false).reduce((n,[a,,w])=>{const d=Math.max(1,attributeDamage(a+b,p.damageElementMultiplier)-defense);return n+(p.damageElementMultiplier===0?0:p.areaAttack&&!p.noAreaPenalty&&!double?Math.max(1,Math.floor(d/2)):d)*w;},0);};
      return auto*mean()+(1-auto)*(outcomes.conditional.reduce((n,[extra,double,w])=>n+w*mean(extra,double),0)+(enemy?.evasionFailure?(1-outcomes.chance)*mean():0));};
    const actor=D.characters.find(c=>c.id===p.actorId),live=(state.enemies||[]).filter(e=>e.hp>0&&!e.respawnSeconds&&(!actor||canReach(state,actor,e))),focused=live.find(e=>e.id===state.focusedEnemyId),targets=p.areaAttack?live:focused?[focused]:live;
    if(state.enemies?.some(e=>e.hp>0)&&!targets.length)return 0;
    if(!targets.length)return average(null)*(p.areaAttack?3:1);const total=targets.reduce((n,e)=>n+average(e),0);return p.areaAttack?total:total/targets.length;
  }
  function attackForecastProfile(state,c,target=null){
    if(!c?.magicPower)return target?attackProfile(state,c,false,enemySpec(state,target),target):attackProfile(state,c);
    const m=magicState(state,c),forecast={...state,health:{...state.health,[c.id]:{...healthOf(state,c.id),magicLevel:m.maximum}}};
    return target?attackProfile(forecast,c,false,enemySpec(forecast,target),target):attackProfile(forecast,c);
  }
  const averageAttackDamage=(state,c)=>{const p=attackForecastProfile(state,c);return p.apAttack?0:profileAverage(state,p);};
  function characterMetrics(state,c,uptime=combatUptime(state)){
    const damage=averageAttackDamage(state,c),attacksPerSecond=effectiveAttackRate(state,c)*uptime;
    const p=attackForecastProfile(state,c);
    return {damage,apDamage:p.apAttack?profileAverage(state,p):0,attacksPerSecond,dps:damage*attacksPerSecond,action:actionPower(state,c),transfersPerSecond:isActionDonor(state,c)?automaticActionRate(state,c)*uptime:0};
  }
  const characterDps=(state,c)=>characterMetrics(state,c).dps;
  const dpsCache=new Map();
  function dpsKey(state){
    return JSON.stringify([combatKey(state),state.health,state.enemies,state.focusedEnemyId,state.rainbowTurns,state.selectedCharacterId,state.respawnSeconds],(key,value)=>{
      if(['regenSeconds','actionPoints','busySeconds'].includes(key))return undefined;
      if(key==='pendingAttack')return !!value;
      if(key==='hp')return value>0;
      if(['respawnSeconds','wardSeconds','slowSeconds','turnSlowSeconds','summonDelaySeconds'].includes(key))return value>0;
      return value;
    });
  }
  const dps=state=>{
    const key=dpsKey(state);
    if(dpsCache.has(key))return dpsCache.get(key);
    const uptime=combatUptime(state),value=activeCharacters(state).reduce((n,c)=>n+characterMetrics(state,c,uptime).dps,0);
    if(dpsCache.size>=32)dpsCache.delete(dpsCache.keys().next().value);dpsCache.set(key,value);return value;
  };
  // Display-only sustained attacking DPS; no simulated respawn/health uptime.
  const combatUptime=()=>1;
  const totalDps=state=>D.sessions.filter(q=>formationIds(state,q.id).length).reduce((n,q)=>n+dps(battleContext(state,q.id)),0);
  function combatKey(state){const q=getSession(state),ids=formationIds(state);return JSON.stringify([restOf(state).enabled,restOf(state).kills,restOf(state).minutes,restOf(state).restMinutes,isResting(state),q.id,q.level,q.hp,q.reward,q.defense,q.resistance,q.evasion,q.traits,q.action,q.actionDice,q.attack,q.accuracy,q.ss,q.attackType,state.concentration,state.formationRows,ids,state.levels,state.upgrades,state.purchasedPerks,state.perkEnabled,ids.map(id=>activation(state,D.characters.find(c=>c.id===id))),ids.includes('max')?state.selectedCharacterId:null,ids.includes('jewel')&&activePerks(state,D.characters.find(c=>c.id==='jewel')).some(p=>p.investmentArmor)?state.credits:state.factors>1e99?state.factors:0,state.seedLevels,state.karmaSelections]);}
  function autoReviveAllies(state,events){
    for(const c of D.characters){
      const h=state.health?.[c.id],owner=formationOwner(state,c.id);
      if(!owner||owner==='infirmary'||!h||h.status==='active'||h.revivalTurns>0||runawayOf(state,c.id).runawayCollapsed||isResting(battleContext(state,owner)))continue;
      if(!perks(state,c).some(p=>p.autoRevive&&p.eligible&&p.enabled))continue;
      const cost=revivalCost(state,c.id);
      if(revive(state,c.id)&&events)events.push({type:'revivePending',actorId:c.id,turns:10,automatic:true,cost,sessionId:owner});
    }
  }
  function revivalCost(state,id){
    const c=D.characters.find(c=>c.id===id);if(!c||!state.levels[id])return Infinity;
    const cost=c.cost+N.delta(trainingInvestment(state,c)*.20);return Number.isFinite(cost)&&cost<=1e100?cost:Infinity;
  }
  function revive(state,id,useItem=false){
    const cost=revivalCost(state,id),h=state.health?.[id],c=D.characters.find(c=>c.id===id);
    if(state.dreamShop||!c||!state.levels[id]||!h||h.status==='active'||h.revivalTurns>0||(useItem?(state.inventory?.[3]||0)<1:!Number.isFinite(cost)||state.factors<cost))return false;
    refreshQuestUnlocks(state);
    if(useItem)state.inventory[3]--;else state.factors-=cost;h.revivalTurns=10;h.revivalSeconds=10;return true;
  }
  function revivalUsesSeconds(state,id,context=null){
    const owner=formationOwner(state,id);if(!owner)return true;
    const ctx=context||battleContext(state,owner);
    if(getSession(ctx).medical||isResting(ctx)||!activeCharacters(ctx).length)return true;
    // Attack animations and enemy respawns are part of a running battle.
    if((ctx.timeline?.busySeconds||0)>1e-8||ctx.enemies?.some(e=>e.pendingAttack)||isWaiting(ctx))return false;
    return timelineUnits(ctx).length===0;
  }
  function finishRevival(state,id,events,sessionId=formationOwner(state,id)){
    const h=state.health[id],c=D.characters.find(c=>c.id===id);
    delete h.revivalTurns;delete h.revivalSeconds;
    h.hp=maxHP(state,c);h.status='active';h.regenSeconds=0;
    if(events)events.push({type:'revive',actorId:id,hp:h.hp,sessionId});
  }
  function advanceRevivalTurns(state,events){
    for(const id of formationIds(state)){
      const h=state.health[id];if(!(h?.revivalTurns>0))continue;
      if(--h.revivalTurns>0)continue;
      finishRevival(state,id,events,state.sessionId);
    }
  }
  function newRunaway(c){return {runawayRate:0,activationType:c.activationType,baseRunawayPressure:c.baseRunawayPressure||0,runawaySymptom:null,runawayCollapsed:false,criticalReserve:0,temporaryRunawayPressure:0,thresholdArmedState:Object.fromEntries(D.runawayThresholds.map(t=>[t,true]))};}
  function runawayOf(state,id){return state.runaway?.[id]||newRunaway(D.characters.find(c=>c.id===id));}
  function activation(state,c){
    const r=runawayOf(state,c.id),n=[50,60,70].filter(t=>r.runawayRate>=t).length,type=r.activationType;
    return {stacks:n,dice:[80,90].filter(t=>r.runawayRate>=t).length,damage:type==='augment'?n:0,reaction:type==='reaction'?n:0,action:type==='sense'?n:0,recovery:type==='recovery'?n:0,awakening:type==='awakening'?(c.awakeningEffects||[]):[]};
  }
  function trainingPressureLevels(state,c){
    return D.concentration.map(t=>({id:t.id,level:concentration(state,c.id)[t.id]||0}));
  }
  function trainingRunawayPressure(state,c){
    return D.runtimeBalance.trainingPressureScale*Math.log2(1+trainingPressureLevels(state,c).reduce((n,t)=>n+t.level,0));
  }
  // The ability panel and the once-per-second runtime share this calculation.
  // Entries retain their configured values when OFF or ineligible for inspection.
  function runawayPressureBreakdown(state,c){
    const r=runawayOf(state,c.id),deployed=!!formationOwner(state,c.id),healthy=healthOf(state,c.id).status==='active';
    const active=deployed&&healthy&&!r.runawayCollapsed&&!isResting(state,formationOwner(state,c.id));
    const trainingLevels=trainingPressureLevels(state,c),trainingTotal=trainingLevels.reduce((n,t)=>n+t.level,0),trainingScale=D.runtimeBalance.trainingPressureScale;
    const training=trainingScale*Math.log2(1+trainingTotal);
    const perkEntries=perks(state,c).map(p=>({id:p.id,name:p.name,enabled:p.enabled,eligible:p.eligible,configured:p.runawayPressure||0,pressure:p.enabled&&p.eligible?p.runawayPressure||0:0}));
    const perkPressure=perkEntries.reduce((n,p)=>n+p.pressure,0);
    const calmingEntries=D.upgrades.filter(u=>u.pressure).map(u=>({id:u.id,name:u.name,level:state.upgrades[u.id]||0,perLevel:u.pressure,pressure:(state.upgrades[u.id]||0)*u.pressure}));
    const owner=formationOwner(state,c.id);
    if(owner)for(const p of supportPerks(battleContext(state,owner)).filter(p=>p.partyCalming))calmingEntries.push({id:p.id,name:p.name,level:1,perLevel:p.partyCalming,pressure:p.partyCalming,source:'perk'});
    const calming=calmingEntries.reduce((n,u)=>n+u.pressure,0);
    const base=r.baseRunawayPressure,temporary=r.temporaryRunawayPressure||0,source=base+training+perkPressure+temporary;
    const recoveryStacks=activation(state,c).recovery,recoveryReduction=D.runtimeBalance.runawayPressureReductionPerStack,recoveryMultiplier=1-recoveryStacks*recoveryReduction;
    const seedPressureMultiplier=.95**(state.seedLevels?.sloth||0);
    const generated=active?source*recoveryMultiplier*(source>0?seedPressureMultiplier:1):0;
    return {medicalOverride:owner==='infirmary',seedPressureMultiplier,base,training,trainingScale,trainingLevels,trainingTotal,perkEntries,perkPressure,temporary,source,recoveryStacks,recoveryReduction,recoveryMultiplier,calmingEntries,calming,generated,net:owner==='infirmary'?-10/60:generated-calming,active,inactiveReason:active?null:r.runawayCollapsed?'collapsed':!healthy?'down':'undeployed',criticalReserve:r.criticalReserve||0};
  }
  function runawayPressure(state,c){return runawayPressureBreakdown(state,c).net;}
  function suppressionQuote(state,id=null){
    const ids=id===null?formationIds(state):[id];
    const targets=ids.filter(x=>D.characters.some(c=>c.id===x)&&state.levels[x]>0&&runawayOf(state,x).runawayRate>0);
    const cost=targets.length;
    return {targets,cost,valid:targets.length>0&&Number.isFinite(cost)&&cost<=1e100};
  }
  function suppressRunaway(state,id=null){
    const quote=suppressionQuote(state,id);if(state.dreamShop||!quote.valid||(state.inventory?.[2]||0)<quote.cost)return false;
    state.inventory[2]-=quote.cost;
    for(const target of quote.targets)changeRunaway(state,target,-10);
    return true;
  }
  function healWithMagtough(state,id){
    const c=D.characters.find(c=>c.id===id),h=state.health?.[id];
    if(state.dreamShop||!c||!state.levels[id]||!h||(state.inventory?.[0]||0)<1||h.hp>=maxHP(state,c))return false;
    state.inventory[0]--;healAlly(state,c,Math.max(1,N.floor(maxHP(state,c)*.1)),null,formationOwner(state,id));return true;
  }
  function criticalFactorReward(state,c,threshold){return Math.max(0,N.floor(trainingInvestment(state,c)*D.runtimeBalance.criticalRewardRate));}
  function damageAlly(state,c,amount,random,events,source='runaway'){
    if(amount<=0)return 0;
    const h=state.health[c.id],before=h.hp;amount=Math.max(1,N.floor(Math.min(1e100,amount)));
    let damage=amount;
    if(before-damage<=0&&state.upgrades.badLuck&&random()<.3)damage=Math.max(1,Math.floor(damage/2));
    if(before-damage<=0&&state.upgrades.fightingSpirit&&random()<.3){h.hp=1;h.status='active';}
    else {h.hp=Math.max(-1e100,h.hp-damage);if(h.hp<0)h.status='dying';else if(h.hp<4&&random()<.5)h.status='unconscious';}
    if(events)events.push({type:'runawayDamage',targetId:c.id,source,damage,hpBefore:before,hpAfter:h.hp,status:h.status});
    if(before===maxHP(state,c))h.regenSeconds=0;
    if(h.status!=='active')clearTurnEffects(h);
    normalizeEnemyActions(state,events);return damage;
  }
  function nonContactSelfDamage(state,c,rate,random,events){
    const p=attackProfile(state,c),spec={dice:p.dice,flat:p.flat+(p.bonus||0),resultScale:p.resultScale},attackStrength=strengthValue(state,c,'power'),defenseStrength=strengthValue(state,c,'armor'),ratio=T.relativeLog(attackStrength,defenseStrength);
    const b=T.damage(spec,0,ratio,T.absoluteLog(attackStrength,defenseStrength)).correction,damage=Math.max(1,scaledCombatTotal(roll(spec.dice,spec.flat,random),spec)+b);
    damageAlly(state,c,Math.max(1,Math.floor(damage*rate)),random,events);
  }
  function runawayAttack(state,c,random,events,selfAttack=null,withinTurn=false){
    if(isStunned(state,c.id)||!prepareMagicAction(state,c,events))return;
    const allies=activeCharacters(state),enemies=livingEnemies(state),all=[...allies.map(c=>({c})),...enemies.map(e=>({e}))];if(!all.length)return;
    const chosen=all[Math.min(all.length-1,Math.floor(random()*all.length))],p=attackProfile(state,c);
    const finish=()=>finishMagicAttack(state,c,p,withinTurn);
    if(chosen.e){applyDamage(state,0,events,c.name,c.id,random,{...p,areaAttack:false,forceSingleTarget:true},false,[chosen.e],false,true);finish();return;}
    const target=chosen.c,mental=!!p.mental,hitSpec=accuracySpec(state,c),evasionDice=evasionSpec(state,target,mental);
    const ignoreDefense=p.ignoreDefense&&!penetrationImmune(target),attackStrength=strengthValue(state,c,'power'),defenseStrength=strengthValue(state,target,'armor');
    const attack=selfAttack&&target.id===c.id?{...selfAttack,resultScale:p.resultScale}:{dice:p.dice,flat:p.flat+(p.bonus||0),resultScale:p.resultScale};
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
    r.runawaySymptom=(first%2?odd:even)[second-1];
    if(events)events.push({type:'runawaySymptom',actorId:c.id,symptom:r.runawaySymptom,dice:[first,second]});
    if(r.runawaySymptom==='ability')changeRunaway(state,c.id,2,random,events);
  }
  function thresholdEvent(state,c,threshold,random,events){
    const r=runawayOf(state,c.id);
    const result=(outcome,dice=[])=>{if(events)events.push({type:'runawayRoll',actorId:c.id,threshold,outcome,dice});};
    if(events)events.push({type:'runawayThreshold',actorId:c.id,threshold});
    const replacement=[50,70,90].includes(threshold)&&activePerks(state,c).find(p=>p.runawayAsMisfire);
    if(replacement){result('misfire');runawayAttack(state,c,random,events,replacement.misfireSelfAttack);return;}
    if(threshold===50){
      const face=roll(1,0,random);result(face===1?'selfDamage':face<=3?'rise':'control',[face]);
      if(face===1)nonContactSelfDamage(state,c,.5,random,events);else if(face<=3)changeRunaway(state,c.id,roll(1,0,random),random,events);
    }
    else if(threshold===70){
      const face=roll(1,0,random);
      // The symptom event carries its own actual two-die result, including 自制.
      if(face!==5)result(face<=2?'selfDamage':face===3?'misfire':face===4?'chain':'control',[face]);
      if(face<=2)nonContactSelfDamage(state,c,1,random,events);else if(face===3)runawayAttack(state,c,random,events);else if(face===4)changeRunaway(state,c.id,roll(2,0,random),random,events);else if(face===5)symptomRoll(state,c,random,events);
    }
    else if(threshold===90)symptomRoll(state,c,random,events);
    else if(threshold>=110&&threshold<150){
      grantIncome(state,criticalFactorReward(state,c,threshold),'secondaryIncome',events,{actorId:c.id,perk:'臨界因子'});
      if(random()<.5){result('selfDamage');nonContactSelfDamage(state,c,1,random,events);}
      else {result('criticalRecovery');const h=state.health[c.id],before=h.hp;h.hp=Math.min(maxHP(state,c),h.hp+Math.max(1,Math.floor(maxHP(state,c)*roll(2,0,random)/28)));r.criticalReserve+=roll(2,0,random);if(h.hp===maxHP(state,c)){delete h.revivalTurns;delete h.revivalSeconds;h.status='active';h.regenSeconds=0;}if(events)events.push({type:'heal',actorId:c.id,amount:h.hp-before,hp:h.hp});}
    }else if(threshold===150){
      r.runawayCollapsed=true;
      // Runaway down keeps the roster, selection and HP. It recovers below 100%.
      state.actionPoints[c.id]=0;clearTurnEffects(state.health[c.id]);
      const owner=formationOwner(state,c.id),ctx=owner?battleContext(state,owner):state;
      normalizeEnemyActions(ctx,events);
      if(ctx!==state)state.sessionStates={...state.sessionStates,[owner]:battleSnapshot(ctx)};
    }
  }
  function changeRunaway(state,id,delta,random=Math.random,events=null){
    const c=D.characters.find(c=>c.id===id);if(!c||!Number.isFinite(delta))return false;
    state.runaway||={};const r=state.runaway[id]||=(newRunaway(c));
    if(delta>0){const used=Math.min(delta,r.criticalReserve);r.criticalReserve-=used;delta-=used;}
    if(delta<=0){r.runawayRate=Math.max(0,r.runawayRate+delta);for(const t of D.runawayThresholds)if(r.runawayRate<=t-10)r.thresholdArmedState[t]=true;if(r.runawayRate<70)r.runawaySymptom=null;if(r.runawayRate<100)r.runawayCollapsed=false;return true;}
    // Consume the requested rise in threshold order. Nested rises (高揚/連鎖)
    // enter through this same function after disarming the current threshold.
    let remaining=delta;
    while(remaining>1e-10&&r.runawayRate<150){
      const target=Math.min(150,r.runawayRate+remaining),next=D.runawayThresholds.find(t=>r.thresholdArmedState[t]&&t>r.runawayRate&&t<=target);
      if(next===undefined){r.runawayRate=target;break;}
      remaining-=next-r.runawayRate;r.runawayRate=next;r.thresholdArmedState[next]=false;thresholdEvent(state,c,next,random,events);
      if(remaining>0&&r.criticalReserve){const used=Math.min(remaining,r.criticalReserve);remaining-=used;r.criticalReserve-=used;}
    }
    return true;
  }
  function preparePerkFailures(state,random){
    state.perkFailures={};for(const c of activeCharacters(state)){const symptom=runawayOf(state,c.id).runawaySymptom;if((symptom==='ability'||symptom==='language')&&random()<.5)state.perkFailures[c.id]=symptom==='ability'?'all':'support';}
  }
  function beginRunawayAction(state,c,random,events){
    if(c.id==='richter')consumePoms(state);
    if(!canAct(state,c.id)||isStunned(state,c.id))return false;preparePerkFailures(state,random);
    const symptom=runawayOf(state,c.id).runawaySymptom;
    if(symptom==='oblivion'&&random()<.5){if(events)events.push({type:'runawaySkip',actorId:c.id});return false;}
    if(symptom==='control'&&random()<.5){runawayAttack(state,c,random,events,null,true);return false;}
    if(c.id==='cherry'&&cherryPerk(state,'volcano'))fireField(state,c,random,events);
    return canAct(state,c.id);
  }
  function endRunawayAction(state,c,random,events){
    if(c.id==='richter')summonPoms(state);
    if(canAct(state,c.id)&&runawayOf(state,c.id).runawaySymptom==='overload')nonContactSelfDamage(state,c,D.runtimeBalance.overloadDamageRate,random,events);
    const h=state.health[c.id];if(h.blastTurns>0&&--h.blastTurns===0){delete h.blastTurns;delete h.blastEvasion;}
    delete state.perkFailures;
  }
  // Poisson hazard/exposure form shared with the gummy event. Calibrate one attack to exactly 8%.
  const rareEventChance=(hazard,exposure=1)=>-Math.expm1(-hazard*exposure);
  function attackRecoilDice(state,character,random){return activePerks(state,character).reduce((dice,p)=>dice+(p.recoilDice&&random()<rareEventChance(-Math.log1p(-p.recoilChance))?p.recoilDice:0),0);}
  function pineGummy(state,random,events){
    if(state.dreamShop||state.paused)return 0;const owner=formationOwner(state,'pine');if(!owner)return 0;const ctx=battleContext(state,owner),c=D.characters.find(c=>c.id==='pine');if(!canAct(ctx,'pine'))return 0;
    const ps=activePerks(ctx,c),base=ps.reduce((n,p)=>n+(p.gummyHeal||0),0);if(!base)return 0;
    if(['ability','language'].includes(runawayOf(state,'pine').runawaySymptom)&&random()<.5)return 0;
    const before=state.health.pine.hp,amount=Math.max(1,N.floor(maxHP(ctx,c)*(base+ps.reduce((n,p)=>n+(p.gummyBonus||0),0))));healAlly(state,c,amount,events?{push:e=>events.push({...e,perk:'アップルグミ'})}:null,owner);return state.health.pine.hp-before;
  }
  function jewelEligible(state){
    const owner=formationOwner(state,'jewel');if(!owner)return false;const ctx=battleContext(state,owner),c=D.characters.find(c=>c.id==='jewel');
    return canAct(ctx,'jewel')&&activePerks(ctx,c).some(p=>p.sideIncome);
  }
  function jewelSideIncome(state,random,events){
    if(state.dreamShop||state.paused||!jewelEligible(state))return 0;
    const symptom=runawayOf(state,'jewel').runawaySymptom;
    if(['ability','language'].includes(symptom)&&random()<.5)return 0;
    return grantPerkIncome(state,Math.floor(state.credits*D.runtimeBalance.jewelSideIncomeRate),'臨時収入',events);
  }

  const api = { confusionTarget,confusedEnemyAttack,finishSightTurn,enemyActions,resolveEnemyAttack,revivalUsesSeconds,hireCurrency,refreshCharacterUnlocks,requirementMet,receiveBreak, newRescue,rescueAvailable,rescueClear,advanceRescue,openRescue,closeRescue,completeRescue, healWithMagtough, creditAmount:Missions.creditAmount,grantCredits:Missions.grantCredits, attackRecoilDice,rareEventChance,isCharacterUnlocked, pineGummy, partyCapacity,pomUnits,consumePoms,summonPoms,damagePoms,pomIncoming,allyElements,receiveFire,cherryDamage,fireField,cherryExtra,clearBurns,sinIncomeMultiplier,incomeAmount, queueManualAttack, refundSeed, attributeMultiplier,attributeDamage,attributeSummary,elementNames,elementalPerk, resetDreamPurchases,sinEntitlement,beginDream,seedCost,buySeed,seedMultiplier,questChangePending,battleSpeed,SUMMON_DELAY_SECONDS,markSummoned,newTimeline,actionWeight,smoothTurn,timelineUnits,timelineView,slowAction,MAX_TURN_ACTIONS,MAX_CHAIN_HITS,advanceSteps, observeIncome, combatKey, dpsKey, newAutoRest,restOf,isResting,setAutoRest, formationRow,inRange,combatDistance,canReach,reachableEnemies,hasReachableTarget,enemyCanReach,rangedPerks,attackMotion, magicState, ownActionBonus, attackForecastProfile, isStunned, turnEffects, nextRun, isMemoriesUnlocked, incomeRecord, rolloverIncome, enemyStrength, selectMemories, concentrationResetCost, resetConcentration, strengthValue, concentrationPoints, clampHealth, hpStrength, hpFromStrength, enemyActionValue, suppressionQuote,suppressRunaway,newRunaway,runawayOf,activation,trainingRunawayPressure,runawayPressureBreakdown,runawayPressure,criticalFactorReward,changeRunaway,symptomRoll,thresholdEvent,jewelEligible,jewelSideIncome, T, grantIncome, refreshPerkUnlocks, togglePerk, profileAverage, enemyHitProfile, rollEnemyHit, enemySpec, scaledCombatTotal, trainingPlan, judgmentBonus, judgmentOutcomes, enemyActionPower, accuracySpec, opposedHitChance, maxHP, armor, statLevel, enemyTargetCandidates, targetDefense, targetEvasion, evasionSpec, enemyAttackSpec, setQuestLevel, isQuestUnlocked, refreshQuestUnlocks, concentration, setConcentration, normalizeEnemyActions, livingEnemies, selectEnemy, enemyAttackDuration, revivalCost, revive, healthOf, canAct, ensureEnemies, combatRoll, battleContext, battleSnapshot, respawnDelay, isWaiting, formationOwner, totalDps, combatUptime, MAX_PARTY_SIZE, formationIds, isDeployed, activeCharacters, setFormation, averageAttackDamage, characterMetrics, isActionDonor, automaticActionRate, createState, getSession, questLevel, sessionAtLevel, questCost, buyQuest, purchaseQuote, buyMany, saleQuote, sell, perks, hasAreaAttack, stats, manualStats, selectedCharacter, selectCharacter, sawCount, bombCount, weaponScale, enemyDefense, attackBreakdown, attackProfile, reward, overkillBonus, hireCost, actionPower, freeActionChance, attackRate, effectiveAttackRate, chainAttackCount, actionCost, upgradeCost, roll, click, advance, catchUp, hire, buyPerk, buyUpgrade, selectSession, dps, characterDps };
  Object.assign(api,{enemyAttackChoices,enemyMaxHP,trainingInvestment,perkLevel,rainbowActive,enemyTargetWeights});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

