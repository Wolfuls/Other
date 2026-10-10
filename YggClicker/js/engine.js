(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.YggData;
  const B = typeof module !== 'undefined' && module.exports ? require('./battle-batch.js') : root.YggBatch;
  const N = typeof module !== 'undefined' && module.exports ? require('./numbers.js') : root.YggNumbers;
  const T=typeof module!=='undefined'&&module.exports?require('./strength.js'):root.YggStrength;
  const MAX_PARTY_SIZE = 5;
  const EXACT_ATTACK_BUDGET = 120;
  const ENEMY_ID_RANGE = 1000000000;
  function nextEnemyId(state){const id=state.nextEnemyId||0;state.nextEnemyId=(id+1)%ENEMY_ID_RANGE;return id;}

  const formationRow=(state,id)=>state.formationRows?.[id]==='rear'?'rear':'front';
  const inRange=(range,distance)=>!range||distance>=range[0]&&distance<=range[1];
  // Down units retain their assigned row. Only the effective distance collapses.
  function combatDistance(state,id,enemy={row:'front'}){
    const allyFront=formationIds(state).some(id=>formationRow(state,id)==='front'&&canAct(state,id));
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
    if(c?.id==='tordeliese'&&distance===1&&rangedPerks(state,c,distance).some(p=>p.id==='demonic-hammer'))return 'kick';
    return 'normal';
  }
  function enemyCanReach(state,enemy,c){return inRange(enemySpec(state,enemy).attackRange,combatDistance(state,c.id,enemy));}
  const canTakeAction=(state,c)=>isStunned(state,c.id)||hasReachableTarget(state,c)||(isActionDonor(state,c)&&transferTargets(state,c).length>0);

  const incomeCache=new Map();
  const statLevel=(state,c)=>Math.max(0,(state.levels[c.id]||0)-1);
  const strengthValue=(state,c,kind)=>T.personalValue(statLevel(state,c),concentration(state,c.id)[kind]||0,concentrationPoints(state,c.id),kind);
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
  function clearTurnEffects(h){for(const k of ['stunTurns','blastTurns','blastEvasion','magicLevel'])delete h[k];}
  function turnEffects(state,id){const h=healthOf(state,id);return {stunned:isStunned(state,id),blastEvasion:h.blastTurns>0?h.blastEvasion||0:0};}
  function magicState(state,c){
    if(!c?.magicPower)return {current:0,maximum:0};
    const active=activePerks(state,c),maximum=active.some(p=>p.magicCharge)?Math.max(0,...active.map(p=>p.magicLevel||0)):0;
    return {current:Math.min(maximum,Math.max(0,Math.floor(state.health?.[c.id]?.magicLevel||0))),maximum};
  }
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
  const walletArmorBonus=factors=>factors>1e12?10+3*Math.floor(Math.log2(factors/1e12)):0;
  function defenseBonus(state,c){
    const ps=activePerks(state,c);let bonus=ps.reduce((n,p)=>n+(p.defenseBonus||0),0);
    if(c.id==='jewel'&&rainbowActive(state))bonus+=15;
    if(ps.some(p=>p.investmentArmor)){
      bonus+=walletArmorBonus(state.factors);
    }
    return bonus;
  }
  // Current-run income is archived only when a new run is confirmed.
  const incomeRecord=state=>({currentRun:state.earned,allRuns:Math.min(1e100,state.earned+(state.previousRunsEarned||0))});
  function rolloverIncome(state){
    state.previousRunsEarned=incomeRecord(state).allRuns;
    state.earned=0;
  }
  function nextRun(state,now=Date.now()){
    if(!state.viewingMemories||!isMemoriesUnlocked(state)||(state.runNumber||1)>=Number.MAX_SAFE_INTEGER)return null;
    const next=createState(now);
    next.runNumber=(state.runNumber||1)+1;
    next.previousRunsEarned=incomeRecord(state).allRuns;
    next.options={...state.options};
    return next;
  }
  const enemyStrength=(session,kind='power')=>kind==='armor'?(session.defenseStrength??session.strength??T.enemyDurability(session.strengthLevel||0,'armor')):kind==='power'?(session.attackStrength??session.strength??T.enemyDurability(session.strengthLevel||0,'power')):session.strength??T.enemyValue(session.strengthLevel||0);
  function grantIncome(state,amount,type,events=null,detail={}){
    const secondary=D.secondaryIncomeTypes;
    const multiplier=D.seedSystem.enabled&&secondary.includes(type)?1+(state.seedLevels?.greed||0)*.01:1;
    const gain=Math.min(Math.max(0,N.floor(amount*multiplier)),Math.max(0,1e100-state.factors),type==='refund'||type==='migrationRefund'?1e100:Math.max(0,1e100-state.earned));
    state.factors+=gain;if(!['refund','migrationRefund'].includes(type))state.earned+=gain;
    state.incomeTotals||={};state.incomeTotals[type]=Math.min(1e100,(state.incomeTotals[type]||0)+gain);refreshQuestUnlocks(state);
    if(events&&gain)events.push({type:'perkIncome',incomeType:type,amount:gain,...detail});return gain;
  }
  function grantPerkIncome(state,amount,perk,events){return grantIncome(state,amount,perk==='紅の拳'?'jewelDoubleHitIncome':perk==='菫青の大盾'?'jewelDamageIncome':'jewelSideIncome',events,{actorId:'jewel',perk});}
  const perkLevel=(state,c)=>state.levels[c.id]||0;
  const questLevel = (state,id=state.sessionId) => state.questActiveLevels?.[id] ?? state.questLevels?.[id] ?? 1;
  const growAction=(base,multiplier)=>base===0?0:N.floor(Math.min(1e100,base*multiplier));
  function sessionAtLevel(session,level){
    // HP progression is deliberately independent of the combat strength level.
    const hpStrengthLevel=level-1,strength=T.enemyValue(level-1),hpStrength=T.enemyDurability(hpStrengthLevel,'vitality'),defenseStrength=T.enemyDurability(level-1,'armor');
    return {...session,level,hpStrengthLevel,hpStrength,defenseStrength,attackStrength:T.enemyDurability(level-1,'power'),baseHP:session.hp,strengthLevel:level-1,strength,defense:session.defense||0,resistance:session.resistance||0,
      attack:session.attack&&{...session.attack},accuracy:session.accuracy&&{...session.accuracy},evasion:session.evasion&&{...session.evasion},ss:session.ss&&{...session.ss},
      actionMultiplier:strength/D.strength.strengthBase,
      hp:Math.max(1,N.floor(Math.min(1e100,session.hp*hpStrength/D.strength.strengthBase))),reward:N.floor(N.curveValue(session.reward,level-1,D.questGrowth.rewardCurve))};
  }
  function getSession(state,id=state.sessionId) {
    const session=D.sessions.find(item=>item.id===id);
    if(!session)return undefined;
    const q=sessionAtLevel(session,questLevel(state,id));
    const enemies=id===state.sessionId?state.enemies:state.sessionStates?.[id]?.enemies;
    if(q.summons&&enemies?.some(e=>e.kind==='kogumo'&&e.hp>0))q.traits=[...q.traits,'swarm'];
    return q;
  }
  function isQuestUnlocked(state,id){
    const quest=D.sessions.find(q=>q.id===id);
    return !!quest&&(!quest.unlockFactors||state.questUnlocks?.[id]===true||Number.isFinite(state.factors)&&state.factors>=quest.unlockFactors);
  }
  const isMemoriesUnlocked=state=>state.memoriesUnlocked===true||Number.isFinite(state.factors)&&state.factors>D.memoryQuest.unlockFactors;
  function refreshQuestUnlocks(state){
    state.memoriesUnlocked=isMemoriesUnlocked(state);
    state.questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,isQuestUnlocked(state,q.id)]));
  }
  function createState(now = Date.now()) {
    return { perkRefunded:true,perkEnabled:Object.fromEntries(D.characters.map(c=>[c.id,Object.fromEntries((c.perks||[]).map(p=>[p.id,!!(p.initial||p.awakeningLevel)]))])),
      unlockedPerks:Object.fromEntries(D.characters.map(c=>[c.id,[]])),runaway:Object.fromEntries(D.characters.map(c=>[c.id,newRunaway(c)])),incomeTotals:{},
      seedLevels:Object.fromEntries(Object.keys(D.seedSystem.effects).map(k=>[k,0])),karmaSelections:{},
      factors: D.balance.initialFactors, earned: 0, previousRunsEarned: 0, runNumber:1, kills: 0, clicks: 0, totalDamage: 0,
      viewingMemories:false, memoriesUnlocked:false, sessionId: D.sessions[0].id, hp: D.sessions[0].hp, poisonDamage:0, paused: false, options: {...D.displayDefaults},
      rainbowTurns:0, floorClipTargetId:null, floorClipSeconds:0, respawnSeconds:0, sessionStates:{}, enemies:null, nextEnemyId:0, focusedEnemyId:null,
      health:Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}])),
      formationRows:Object.fromEntries(D.characters.map(c=>[c.id,'front'])),
      formations: Object.fromEntries(D.sessions.map(s=>[s.id,null])),
      concentration: Object.fromEntries(D.characters.map(c=>[c.id,emptyConcentration()])),
      questUnlocks: Object.fromEntries(D.sessions.map(q=>[q.id,!q.unlockFactors])),
      questActiveLevels: {},
      questLevels: Object.fromEntries(D.sessions.map(s=>[s.id,1])), sceneSeconds:0, batchHpFraction:0,batchDamageFraction:0,
      levels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionPoints: Object.fromEntries(D.characters.map(c => [c.id, 0])), actionClock: 0, selectedCharacterId: null,
      purchasedPerks: Object.fromEntries(D.characters.map(c => [c.id, []])),
      upgrades: Object.fromEntries(D.upgrades.map(u => [u.id, 0])), savedAt: now };
  }
  const BATTLE_FIELDS=['hp','poisonDamage','batchHpFraction','batchDamageFraction','respawnSeconds','selectedCharacterId','enemies','nextEnemyId','focusedEnemyId','floorClipTargetId','floorClipSeconds','rainbowTurns'];
  const respawnDelay=()=>5;
  const isWaiting=state=>state.enemies?state.enemies.every(e=>e.hp<=0):(state.respawnSeconds||0)>0;
  function battleSnapshot(state){return Object.fromEntries(BATTLE_FIELDS.map(k=>[k,k==='enemies'?(state.enemies?structuredClone(state.enemies):null):state[k]??(['selectedCharacterId','focusedEnemyId','floorClipTargetId'].includes(k)?null:0)]));}
  function battleContext(state,id=state.sessionId){
    if(id===state.sessionId)return state;
    return {...state,rainbowTurns:0,floorClipTargetId:null,floorClipSeconds:0,hp:getSession(state,id).hp,poisonDamage:0,batchHpFraction:0,batchDamageFraction:0,respawnSeconds:0,selectedCharacterId:null,enemies:null,nextEnemyId:0,focusedEnemyId:null,
      ...state.sessionStates?.[id],sessionId:id,formations:Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]))};
  }
  // Only the initially viewed, untouched quest auto-fills unassigned recruits.
  // Explicit parties own their members even while another quest is on screen.
  function formationIds(state,id=state.sessionId){
    const chosen=state.formations?.[id];
    if(Array.isArray(chosen))return chosen.filter(x=>state.levels[x]>0).slice(0,MAX_PARTY_SIZE);
    if(id!==state.sessionId)return [];
    const assigned=new Set(D.sessions.filter(q=>q.id!==id).flatMap(q=>state.formations?.[q.id]||[]));
    return D.characters.filter(c=>state.levels[c.id]>0&&!assigned.has(c.id)).map(c=>c.id).slice(0,MAX_PARTY_SIZE);
  }
  const formationOwner=(state,id)=>D.sessions.find(q=>formationIds(state,q.id).includes(id))?.id||null;
  const isDeployed=(state,id)=>formationIds(state).includes(id);
  const activeCharacters=state=>D.characters.filter(c=>canAct(state,c.id));
  function setFormation(state,questId,ids,rows=state.formationRows){
    if(!isQuestUnlocked(state,questId)||!Array.isArray(ids)||ids.length>MAX_PARTY_SIZE||new Set(ids).size!==ids.length||ids.some(id=>!D.characters.some(c=>c.id===id)||!state.levels[id]))return false;
    if(ids.some(id=>rows?.[id]!==undefined&&!['front','rear'].includes(rows[id])))return false;
    state.formationRows={...state.formationRows,...Object.fromEntries(ids.map(id=>[id,rows?.[id]||'front']))};
    refreshQuestUnlocks(state);
    const rosters=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,q.id===questId?[...ids]:rosters[q.id].filter(id=>!ids.includes(id))]));
    for(const q of D.sessions){
      const ctx=battleContext(state,q.id);
      if(!isDeployed(ctx,'jewel'))ctx.rainbowTurns=0;
      if(ctx.selectedCharacterId&&!isDeployed(ctx,ctx.selectedCharacterId))ctx.selectedCharacterId=null;
      normalizeEnemyActions(ctx);refreshFloorClip(ctx,rosters[q.id].join(',')!==formationIds(ctx).join(','));
      if(q.id!==state.sessionId)state.sessionStates={...state.sessionStates,[q.id]:battleSnapshot(ctx)};
    }
    return true;
  }
  function concentrationResetCost(state,id){const c=D.characters.find(c=>c.id===id);return c&&state.levels[id]?Math.max(1,N.floor(trainingInvestment(state,c)*.05)):Infinity;}
  function resetConcentration(state,id){
    const cost=concentrationResetCost(state,id);
    if(!Number.isFinite(cost)||state.factors<cost||!Object.values(concentration(state,id)).some(n=>n>0))return false;
    state.factors-=cost;setConcentration(state,id,emptyConcentration());return true;
  }
  const emptyConcentration=()=>Object.fromEntries(D.concentration.map(t=>[t.id,0]));
  const concentration=(state,id)=>state.concentration?.[id]||emptyConcentration();
  const concentrationPoints=(state,id)=>Math.max(0,(state.levels[id]||0)-1);
  function clampHealth(state,id){const c=D.characters.find(c=>c.id===id),h=state.health[id],max=maxHP(state,c);h.hp=Math.min(h.hp,max);if(h.hp===max){h.status='active';h.regenSeconds=0;}normalizeMagic(state,c);}
  function setConcentration(state,id,allocation){
    if(!D.characters.some(c=>c.id===id)||!allocation||Object.keys(allocation).some(k=>!D.concentration.some(t=>t.id===k)))return false;
    if(D.concentration.some(t=>!Number.isSafeInteger(allocation[t.id])||allocation[t.id]<0)||Object.values(allocation).reduce((n,v)=>n+v,0)>concentrationPoints(state,id))return false;
    state.concentration={...state.concentration,[id]:{...allocation}};if(state.health?.[id])clampHealth(state,id);return true;
  }
  // Empty and incapacitated parties cannot bank enemy action points. Pending
  // attacks also end as soon as their original target leaves or falls.
  function normalizeEnemyActions(state,events){
    const active=activeCharacters(state);
    if(isWaiting(state))for(const id of formationIds(state))state.actionPoints[id]=0;
    for(const [slot,e]of (state.enemies||[]).entries()){
      if(!active.length)e.actionPoints=0;
      if(e.pendingAttack&&(!active.length||!canAct(state,e.pendingAttack.targetId))){
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
      const awakened=!perk.awakeningLevel||(runawayOf(state,character.id).activationType==='awakening'&&activation(state,character).stacks>=perk.awakeningLevel);
      const unlocked=eligible&&awakened&&enabled&&healthOf(state,character.id).status==='active'&&!runawayOf(state,character.id).runawayCollapsed&&!fails;
      return {...perk,owned,enabled,unlocked,eligible,dice:unlocked?(perk.diceBonus||0)+(perk.diceEvery?Math.floor((state.levels[character.id]||0)/perk.diceEvery):0):0};
    });
  }
  const areaApplies = (perk,session) => perk.areaAttack && (!perk.areaTrait || (session.traits||[]).includes(perk.areaTrait));
  const hasAreaAttack = (state, character, session=getSession(state)) => !!character && perks(state, character).some(p => p.unlocked && areaApplies(p,session));
  function attackBreakdown(state, character, manual = false, session = getSession(state), target = profileTarget(state,character)) {
    const distance=character?combatDistance(state,character.id,target):1;
    const active = character ? rangedPerks(state,character,distance) : [];
    const replacement = active.find(p => p.baseAttack);
    const magic=magicState(state,character);
    const base = replacement?.baseAttack || character || { dice:D.balance.manualDice, flat:D.balance.manualFlat };
    const mental=(replacement?.attackType||character?.attackType)==='mental',apAttack=!!replacement?.apAttack;
    const penetrationBlocked = active.some(p => p.ignoreDefense) && (session.traits||[]).includes('penetrationImmune');
    const ignoreDefense = active.some(p => p.ignoreDefense) && !penetrationBlocked;
    return {
      base:{ dice:base.dice, flat:base.flat, source:replacement?.name || '' },
      perk:{ dice:active.reduce((n,p) => n + p.dice+(apAttack?p.apDiceBonus||0:0), 0), flat:active.reduce((n,p) => n + (p.flat||0), 0)+magic.current*(character?.magicPower||0)+(character?.id==='jewel'&&distance===1&&rainbowActive(state)?15:0),
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
      accuracyPenaltyChance:Math.max(0,...active.map(p=>p.accuracyPenaltyChance||0)),
      accuracyPenalty:Math.max(0,...active.map(p=>p.accuracyPenalty||0)),
      extraAttackChance:Math.max(0,...active.map(p=>p.extraAttackChance||0)),
      autoHitChance:Math.max(0,...active.map(p=>p.autoHitChance||0)),evasionFailureChance:Math.max(0,...active.map(p=>p.evasionFailureChance||0)),doubleHitDamage:active.reduce((n,p)=>n+(p.doubleHitDamage||0),0),
      poisonDamage:active.some(p=>p.inflictPoison)?Math.max(0,...active.map(p=>p.poisonDamage||0))+active.reduce((n,p)=>n+(p.poisonBonus||0),0):0
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
    const breakdown = attackBreakdown(state, character, manual, session,target), b = breakdown;
    const distance=character?combatDistance(state,character.id,target):1;
    const attackStrength=character?strengthValue(state,character,'power'):D.strength.strengthBase;
    // Penetration removes base mitigation, never the strength comparison or scale.
    const defenseStrength=enemyStrength(session,'armor');
    return {actorId:character?.id||null,distance,motion:attackMotion(state,character,distance),reachable:!character||canReach(state,character,target), fixedDamage:character?null:1, apAttack:b.apAttack,hiddenAttack:!!character?.hiddenAttack, accuracy:character?accuracySpec(state,character,b.mental):null, evasion:b.mental?session.ss:session.evasion,
      hitLogRatio:T.relativeLog(character?strengthValue(state,character,'accuracy'):D.strength.strengthBase,enemyStrength(session,'evasion')),
      damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength),
      resultScale:character&&runawayOf(state,character.id).runawaySymptom==='body'?.5:1,
      dice:b.base.dice + b.perk.dice+(character?activation(state,character).dice:0), flat:b.base.flat + b.perk.flat + b.upgrade.flat + b.item.flat+(character?activation(state,character).damage:0),
      bonus:b.perk.conditional, multiplier:(1 + b.upgrade.rate) * b.levelMultiplier,
      autoHitChance:b.autoHitChance,evasionFailureChance:b.evasionFailureChance,doubleHitDamage:b.doubleHitDamage,
      defense:b.defense, mental:b.mental, ignoreDefense:b.ignoreDefense, penetrationBlocked:b.penetrationBlocked, areaAttack:b.areaAttack, extraAttackChance:b.extraAttackChance,poisonDamage:b.poisonDamage,defenseReduction:b.defenseReduction,apReductionRate:b.apReductionRate,apReduction:b.apReduction,tauntId:b.tauntId,accuracyPenaltyChance:b.accuracyPenaltyChance,accuracyPenalty:b.accuracyPenalty,
      afterAttackStun:b.afterAttackStun,noAreaPenalty:b.noAreaPenalty,magicLevel:b.magicLevel,magicMaximum:b.magicMaximum,blastEvasionPerMagic:b.blastEvasionPerMagic,
      minimumLevelBonus:0,preLevelMultiplier:1+b.upgrade.rate,
      overkillThreshold:state.upgrades.overkill ? D.upgrades.find(u=>u.id==='overkill').threshold : 0, breakdown };
  }
  const reward = (state, session = getSession(state)) => Math.min(1e100,session.reward+Math.max(1,N.floor(session.reward*D.balance.rewardPerLevel))*state.upgrades.reward);
  const overkillBonus = state => state.upgrades.overkill ? N.delta(reward(state) * D.upgrades.find(u=>u.id==='overkill').bonusRate) : 0;
  // Each repeatable purchase track has its own unrounded geometric curve.
  // Recompute from the level rather than multiplying an already rounded price.
  const geometricCost = (base, purchases, growth = D.balance.purchaseCostGrowth) => N.geometric(base,growth,purchases);
  function questCost(state,id=state.sessionId) {
    const session=D.sessions.find(s=>s.id===id),level=state.questLevels?.[id]??1;
    if(!session || !Number.isSafeInteger(level+1))return Infinity;
    // Keep the early unlock prices; later prices must not outgrow rewards
    // simply because the legacy 15% curve was tuned for larger payouts.
    const next=sessionAtLevel(session,level+1),cost=Math.min(
      geometricCost(D.questGrowth.cost,level-1,D.questGrowth.costGrowth),
      N.floor(N.curveValue(D.questGrowth.cost,level-1,D.questGrowth.rewardCurve)));
    return [next.hp,next.reward,cost].every(v=>Number.isFinite(v)&&v<=1e100)?cost:Infinity;
  }
  function applyQuestLevel(state,id,level,ctx,oldHP){
    state.questActiveLevels={...state.questActiveLevels,[id]:level};ctx.questActiveLevels=state.questActiveLevels;
    const maximum=getSession(state,id).hp;
    for(const actorId of formationIds(ctx)){state.actionPoints[actorId]=0;clearTurnEffects(state.health[actorId]);}
    ctx.enemies=null;ctx.hp=maximum;ctx.poisonDamage=0;ctx.respawnSeconds=0;ensureEnemies(ctx);
    ctx.focusedEnemyId=null;ctx.floorClipTargetId=null;ctx.floorClipSeconds=0;ctx.rainbowTurns=0;
    syncFront(ctx);ctx.batchHpFraction=0;ctx.batchDamageFraction=0;
    if(id!==state.sessionId)state.sessionStates={...state.sessionStates,[id]:battleSnapshot(ctx)};
  }
  function setQuestLevel(state,id,level){
    if(!isQuestUnlocked(state,id)||!Number.isSafeInteger(level)||level<1||level>(state.questLevels[id]||1))return false;
    if(level===questLevel(state,id))return true;
    const ctx=battleContext(state,id),oldHP=getSession(ctx).hp;ensureEnemies(ctx);refreshQuestUnlocks(state);
    applyQuestLevel(state,id,level,ctx,oldHP);return true;
  }
  function buyQuest(state,id){
    const cost=questCost(state,id);if(!isQuestUnlocked(state,id)||!Number.isFinite(cost)||state.factors<cost)return false;
    const ctx=battleContext(state,id),oldHP=getSession(ctx).hp;ensureEnemies(ctx);refreshQuestUnlocks(state);
    state.factors-=cost;state.questLevels[id]++;
    applyQuestLevel(state,id,state.questLevels[id],ctx,oldHP);return true;
  }
  const hireCost = (state, c) => state.levels[c.id] === 0 ? c.cost
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
    // Forecasts retain fractional expectations; actual AP gains remain integers.
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
  function actionThreshold(state){
    const hasAction=c=>c.actionDice?(c.actionDice.flat!==0||c.actionDice.dice!==0):c.action!==0;
    const values=formationIds(state).map(id=>D.characters.find(c=>c.id===id)).filter(hasAction).map(c=>Math.max(1,actionPower(state,c,c.action,true)));
    const q=getSession(state);
    if(q.summons){for(const e of ensureEnemies(state))if(e.kind!=='kogumo'||e.hp>0)values.push(Math.max(1,enemyActionPower(state,undefined,e)));}
    else if(hasAction(q))for(const e of ensureEnemies(state))values.push(Math.max(1,enemyActionPower(state,undefined,e)));
    // Expectations may be fractional (e.g. party AP dice). Action costs are
    // concrete AP, so apply the shared floor rule before spending or banking.
    values.sort((a,b)=>a-b);
    const median=values[Math.floor((values.length-1)/2)]||1,mean=values.length?values.reduce((sum,value)=>sum+value/values.length,0):1,maximum=values.at(-1)||1;
    return Math.max(1,N.floor(Math.max(median*2,mean*2,maximum)));
  }
  const attackRate = (state, c) => actionPower(state, c) / actionThreshold(state);
  const isActionDonor = (state,c) => isDeployed(state,c.id) && perks(state,c).some(p=>p.unlocked&&p.transferAction) && transferTargets(state,c).length>0;
  const automaticActionRate = (state,c) => isDeployed(state,c.id) ? attackRate(state,c)/(1-freeActionChance(state,c)) : 0;
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
    (automaticActionRate(state,c)+donatedActionRate(state,c))/(1-attackProfile(state,c).extraAttackChance)/(1+magicState(state,c).maximum+(attackProfile(state,c).afterAttackStun||0));
  function performAutomaticActionCore(state,c,random,events) {
    if(!isActionDonor(state,c)){performAttack(state,c,attackProfile(state,c),random,events);return;}
    const targets=transferTargets(state,c);
    if(!targets.length){performAttack(state,c,attackProfile(state,c),random,events);return;}
    const target=targets.length===1?targets[0]:targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];
    const first=events?.length;
    // A donated action costs the recipient no points. Its reattack and poison
    // perks still apply; free-point rolls belong only to the donor's paid action.
    const failures=state.perkFailures;
    if(beginRunawayAction(state,target,random,events))performAttack(state,target,attackProfile(state,target),random,events);
    endRunawayAction(state,target,random,events);state.perkFailures=failures;
    if(events?.[first]){events[first].maxTransfers=1;events[first].delegatedBy=c.id;}
  }
  function performAutomaticAction(state,c,random,events){
    if(isStunned(state,c.id)){state.health[c.id].stunTurns--;if(events)events.push({type:'stunSkip',actorId:c.id,remaining:state.health[c.id].stunTurns});endRunawayAction(state,c,random,events);return;}
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
  const canAct=(state,id)=>isDeployed(state,id)&&healthOf(state,id).status==='active'&&!runawayOf(state,id).runawayCollapsed;
  function newEnemy(state,hp=getSession(state).hp,poisonDamage=0,respawnSeconds=0){
    return {row:getSession(state).row||'front',id:nextEnemyId(state),hp,poisonDamage,respawnSeconds,actionPoints:0,pendingAttack:null,defensePenalty:0,accuracyPenalty:0,evasionPenalty:0,evasionPenaltyTurns:0,evasionFailure:false,tauntId:null,slowSeconds:0,actionPenalty:0,queenCancels:0};
  }
  function emptyKogumo(state){return {...newEnemy(state,0),kind:'kogumo',creationDamage:0,maxHP:0};}
  const enemyMaxHP=(state,enemy)=>enemy?.kind==='kogumo'?enemy.maxHP:getSession(state).hp;
  function enemySpec(state,enemy){
    const q=getSession(state);if(enemy?.kind!=='kogumo')return q;
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
    if(created)target.creationDamage=gain;
    target.maxHP+=gain;target.hp+=gain;
    if(events)events.push({type:'enemySummon',enemyId:target.id,targetSlot:state.enemies.indexOf(target),created,hp:target.hp,amount:gain});
  }
  function ensureEnemies(state){
    const q=getSession(state),count=q.summons?3:(q.formationCount||1);
    if(!Array.isArray(state.enemies)||state.enemies.length!==count){
      state.enemies=Array.from({length:count},(_,i)=>q.summons&&i?emptyKogumo(state):newEnemy(state,i?getSession(state).hp:state.hp,i?0:state.poisonDamage||0,i?0:state.respawnSeconds||0));
      syncFront(state);
    }
    return state.enemies;
  }
  const livingEnemies=state=>ensureEnemies(state).filter(e=>e.hp>0&&!e.respawnSeconds);
  function syncFront(state){
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
    const fixed=base.flat+activePerks(state,c).reduce((n,p)=>n+(p.accuracyBonus||0),0)+party+a.reaction+(mental?0:magicState(state,c).current*(c.magicPower||0));
    return {dice:base.dice+a.dice,flat:symptom==='vision'?Math.floor(fixed/2):fixed,resultScale:symptom==='memory'?.5:1};
  }
  function judgmentBonus(accuracy,evasion){
    if(!accuracy||!evasion||accuracy.total<=evasion.total)return {doubleHit:false,smashCritical:0,bonusDice:0};
    const doubleHit=accuracy.total>=evasion.total*2,smashCritical=Math.floor(accuracy.dice.filter(x=>x===6).length/2);
    return {doubleHit,smashCritical,bonusDice:Number(doubleHit)+smashCritical};
  }
  const opposedCache=new Map();
  function judgmentOutcomes(accuracy,evasion,ratio=0){return T.outcomes(accuracy,evasion,ratio);}
  const opposedHitChance=(accuracy,evasion)=>judgmentOutcomes(accuracy,evasion).chance;
  function recoverAllies(state,seconds,events){
    for(const c of D.characters){
      if(!state.levels[c.id])continue;
      const h=state.health[c.id];
      if(h.hp>=maxHP(state,c)){h.regenSeconds=0;continue;}
      h.regenSeconds+=seconds*(1+activation(state,c).recovery*D.runtimeBalance.recoverySpeedBonusPerStack);
      const ticks=Math.floor((h.regenSeconds+1e-9)/D.balance.recoverySeconds);
      if(!ticks)continue;
      h.regenSeconds=Math.max(0,h.regenSeconds-ticks*D.balance.recoverySeconds);
      const before=h.hp;h.hp=Math.min(maxHP(state,c),h.hp+ticks*Math.max(1,N.floor(maxHP(state,c)*.01)));
      if(h.hp===maxHP(state,c)&&h.status!=='active'){h.status='active';if(events)events.push({type:'revive',actorId:c.id,hp:h.hp});}
      if(h.hp===maxHP(state,c))h.regenSeconds=0;
      if(events&&h.hp>before)events.push({type:'heal',actorId:c.id,amount:h.hp-before,hp:h.hp});
    }
  }
  const enemyAttackDuration=(state,enemy=null)=>enemySpec(state,enemy).attackSeconds||.72;
  function refreshFloorClip(state,force=false){
    if(!supportPerks(state).some(p=>p.protectLowestHP)){if(!state.floorClipSeconds||force){state.floorClipTargetId=null;state.floorClipSeconds=0;}return;}
    if(!force&&state.floorClipSeconds>1e-9)return;
    const active=formationIds(state).filter(id=>canAct(state,id));
    state.floorClipTargetId=active.reduce((best,id)=>best===null||healthOf(state,id).hp<healthOf(state,best).hp?id:best,null);
    state.floorClipSeconds=10;
  }
  function enemyTargetCandidates(state,enemy=null){
    refreshFloorClip(state);
    const active=formationIds(state).map(id=>D.characters.find(c=>c.id===id)).filter(c=>canAct(state,c.id));
    return (active.length<2?active:active.filter(c=>c.id!==state.floorClipTargetId)).filter(c=>!enemy||enemyCanReach(state,enemy,c));
  }
  function enemyTargetWeights(state,enemy=null){
    const jewel=D.characters.find(c=>c.id==='jewel');
    const guarded=canAct(state,'jewel')&&activePerks(state,jewel).some(p=>p.allyTargetWeight);
    return enemyTargetCandidates(state,enemy).map(c=>({character:c,weight:guarded&&c.id!=='jewel'?.5:1}));
  }
  function chooseEnemyTarget(state,random,enemy=null){
    if(enemy?.tauntId&&canAct(state,enemy.tauntId)&&enemyCanReach(state,enemy,D.characters.find(c=>c.id===enemy.tauntId)))return D.characters.find(c=>c.id===enemy.tauntId);
    const choices=enemyTargetWeights(state,enemy);let value=random()*choices.reduce((n,t)=>n+t.weight,0);
    for(const t of choices){value-=t.weight;if(value<0)return t.character;}return choices.at(-1)?.character;
  }
  function enemyActions(state,random,events){
    const session=getSession(state);
    if(!session.actionDice&&!session.action)return;
    if(!activeCharacters(state).length){normalizeEnemyActions(state,events);return;}
    for(const [slot,enemy]of ensureEnemies(state).entries()){
      if(enemy.respawnSeconds||enemy.hp<=0)continue;
      const individual=enemySpec(state,enemy),spec=individual.actionDice;
      // Every living individual rolls its own fresh action dice each second.
      enemy.actionPoints+=enemyActionPower(state,spec?roll(spec.dice,spec.flat,random):individual.action,enemy);
      const threshold=actionThreshold(state);
      if(!enemy.pendingAttack&&!enemyTargetCandidates(state,enemy).length){enemy.actionPoints=Math.min(threshold,enemy.actionPoints);continue;}
      if(enemy.pendingAttack||enemy.actionPoints<threshold)continue;
      const count=Math.floor(enemy.actionPoints/threshold);enemy.actionPoints%=threshold;
      const target=chooseEnemyTarget(state,random,enemy);
      const duration=enemyAttackDuration(state,enemy);
      const kind=session.summons&&enemy.kind!=='kogumo'&&livingEnemies(state).some(e=>e.kind==='kogumo')&&random()<.2?'absorb':individual.apAttack?'flash':'attack';
      const taunted=kind!=='absorb'&&enemy.tauntId===target.id;
      if(kind!=='absorb')enemy.tauntId=null;
      preparePerkFailures(state,random);
      enemy.pendingAttack={targetId:target.id,remaining:duration,count,kind,apCost:threshold,...(taunted?{taunted:true}:{}),profile:enemyHitProfile(state,enemy,target)};delete state.perkFailures;
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
    const accuracyPenalty=enemy.accuracyPenalty||0;accuracySpec.flat-=accuracyPenalty;
    return {...turnEffects(state,c.id),mental,accuracyPenalty,accuracySpec,evasionDice:evasionSpec(state,c,mental),
      reversal:!!state.upgrades.reversal,retake:!!state.upgrades.retake,
      nullifyChance:Math.max(0,...ps.map(p=>p.nullifyChance||0)),attack:enemyAttackSpec(state,enemy),
      hitLogRatio:T.relativeLog(enemyStrength(session,'accuracy'),strengthValue(state,c,'evasion')),
      damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength),
      reactionFailure:runawayOf(state,c.id).runawaySymptom==='mind'?.5:0,
      reduction:ignoreDefense?0:armor(state,c,mental),postReduction:activation(state,c).damage,
      shield:mental||ignoreDefense?0:ps.reduce((n,p)=>n+(p.normalHitDefense||0),0)};
  }
  function rollEnemyHit(p,random=Math.random){
    let accuracy=combatRoll(p.accuracySpec,random),evasion;
    const accuracyReroll=p.reversal&&accuracy.critical;
    if(accuracyReroll){const original=accuracy;accuracy={...combatRoll(p.accuracySpec,random),original};}
    evasion=combatRoll(p.evasionDice,random);
    const evasionReroll=p.retake&&evasion.fumble;
    if(evasionReroll){const original=evasion;evasion={...combatRoll(p.evasionDice,random),original};}
    const correction=T.hit(p.accuracySpec,p.evasionDice,p.hitLogRatio||0).correction;accuracy={...accuracy,rawTotal:accuracy.total,total:accuracy.total+correction,strengthCorrection:correction};
    const forcedFailure=p.stunned||p.reactionFailure&&random()<p.reactionFailure;
    const nullified=p.nullifyChance>0&&random()<p.nullifyChance,hit=!nullified&&(forcedFailure||accuracy.total>evasion.total);
    const judgment=hit?judgmentBonus(accuracy,evasion):{doubleHit:false,smashCritical:0,bonusDice:0};
    const spec={...p.attack,dice:p.attack.dice+judgment.bonusDice},defense=p.reduction+(judgment.doubleHit?0:p.shield),b=hit?T.damage(spec,defense,p.damageLogRatio||0,p.damageScaleLog||0).correction:0;
    const damage=hit?Math.max(1,T.cap(scaledCombatTotal(roll(spec.dice,spec.flat,random,spec.sides),spec)+b-defense-(p.postReduction||0))):0;
    return {mental:p.mental,accuracyPenalty:p.accuracyPenalty,accuracy,evasion,accuracyReroll,evasionReroll,nullified,hit,forcedFailure:!!forcedFailure,judgment,damage};
  }
  function resolveEnemyAttack(state,enemy,slot,random,events){
    const pending=enemy.pendingAttack;enemy.pendingAttack=null;
    if(!pending||enemy.hp<=0||enemy.respawnSeconds||!canAct(state,pending.targetId)){
      if(events&&pending)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});return;
    }
    if((pending.count||1)>1){
      for(let i=0;i<pending.count&&(pending.taunted?activeCharacters(state).length:canAct(state,pending.targetId));i++){
        let kind=pending.kind;
        if(i&&getSession(state).summons&&enemy.kind!=='kogumo')kind=livingEnemies(state).some(e=>e.kind==='kogumo')&&random()<.2?'absorb':'attack';
        const nextTarget=i&&pending.taunted?chooseEnemyTarget(state,random,enemy):null;
        enemy.pendingAttack={...pending,count:1,kind,...(nextTarget?{targetId:nextTarget.id,profile:enemyHitProfile(state,enemy,nextTarget)}:{})};resolveEnemyAttack(state,enemy,slot,random,events);
      }
      return;
    }
    if(pending.kind==='absorb'&&livingEnemies(state).some(e=>e.kind==='kogumo')){
      const amount=Math.min(enemyMaxHP(state,enemy)-enemy.hp,livingEnemies(state).filter(e=>e.kind==='kogumo').reduce((n,e)=>n+e.hp,0));
      dismissKogumo(state,events);enemy.hp+=amount;
      if(events)events.push({type:'enemyAbsorb',enemyId:enemy.id,targetSlot:slot,amount});
      if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;
      syncFront(state);return;
    }
    const session=enemySpec(state,enemy),c=D.characters.find(c=>c.id===pending.targetId),h=state.health[c.id];
    if(interceptEnemyAttack(state,enemy,c,pending.apCost||actionThreshold(state),slot,random,events)){
      if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;
      return;
    }
    // One-use effects and stun resolve at impact, including attacks queued before the spell.
    const snapshot=pending.profile||enemyHitProfile(state,enemy,c),effects=turnEffects(state,c.id);
    const incoming={...snapshot,...effects,evasionDice:{...snapshot.evasionDice,flat:snapshot.evasionDice.flat-(snapshot.blastEvasion||0)+effects.blastEvasion}};
    const before=h.hp,slow=rangedPerks(state,c,combatDistance(state,c.id,enemy)).reduce((n,p)=>Math.max(n,p.retaliationSlow||0),0);
    const {mental,accuracyPenalty,accuracy,evasion,accuracyReroll,evasionReroll,nullified,hit,judgment,damage:rolledDamage}=rollEnemyHit(incoming,random);
    if(effects.blastEvasion)delete h.blastEvasion;
    enemy.accuracyPenalty=0;
    if(hit&&slow){enemy.actionPenalty=slow;enemy.slowSeconds=5;}
    let damage=rolledDamage,badLuck=false,fightingSpirit=false;
    if(hit&&session.apAttack){
      const apBefore=state.actionPoints[c.id];state.actionPoints[c.id]=Math.max(0,apBefore-damage);
      if(events)events.push({type:'enemyAttack',targetId:c.id,enemyId:enemy.id,targetSlot:slot,enemyName:session.enemy,apDamage:true,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,...judgment,damage:apBefore-state.actionPoints[c.id],hpBefore:before,hpAfter:before,status:h.status});
      if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;return;
    }
    if(hit){
      if(before-damage<=0&&state.upgrades.badLuck&&random()<.3){damage=Math.max(1,Math.floor(damage/2));badLuck=true;}
      if(before-damage<=0&&state.upgrades.fightingSpirit&&random()<.3){h.hp=1;h.status='active';fightingSpirit=true;}
      else {h.hp-=damage;if(h.hp<0)h.status='dying';else if(h.hp<4&&random()<.5)h.status='unconscious';}
      if(before===maxHP(state,c))h.regenSeconds=0;
    }
    if(events)events.push({type:'enemyAttack',targetId:c.id,enemyId:enemy.id,targetSlot:slot,enemyName:session.enemy,apDamage:!!session.apAttack,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,accuracyPenalty,...judgment,damage,badLuck,fightingSpirit,hpBefore:before,hpAfter:h.hp,status:h.status});
    if(hit&&c.id==='jewel'&&canAct(state,c.id)&&activePerks(state,c).some(p=>p.damageIncome))grantPerkIncome(state,fightingSpirit?Math.max(0,before-h.hp):damage,'菫青の大盾',events);
    if(enemy.evasionPenaltyTurns>0&&--enemy.evasionPenaltyTurns===0)enemy.evasionPenalty=0;
    if(h.status!=='active')clearTurnEffects(h);
    if(c.id==='jewel'&&h.status!=='active')state.rainbowTurns=0;
    normalizeEnemyActions(state,events);
  }

  function interceptEnemyAttack(state,enemy,c,apCost,slot,random,events){
    const successes=enemy.queenCancels||0;
    if(successes>=4||!rangedPerks(state,c,combatDistance(state,c.id,enemy)).some(p=>p.interceptAttack))return false;
    const q=enemySpec(state,enemy),spec=accuracySpec(state,c,true),defender={...q.ss,flat:q.ss.flat-(enemy.evasionPenalty||0)};
    const raw=combatRoll(spec,random),correction=T.hit(spec,defender,T.relativeLog(strengthValue(state,c,'accuracy'),enemyStrength(q,'evasion'))).correction;
    const accuracy={...raw,rawTotal:raw.total,total:raw.total+correction,strengthCorrection:correction},evasion=combatRoll(defender,random);
    const forced=!!enemy.evasionFailure;enemy.evasionFailure=false;
    const hit=forced||accuracy.total>evasion.total,refund=hit?Math.floor(apCost*successes*.25):0;
    if(hit){enemy.queenCancels=successes+1;enemy.actionPoints=Math.min(1e100,enemy.actionPoints+refund);}
    if(events){events.push({type:'queenIntercept',actorId:c.id,enemyId:enemy.id,targetSlot:slot,hit,accuracy,evasion,refund});if(hit)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});}
    return hit;
  }
  function clearEnemy(state,enemy,slot,overkill,reason,events,random){
    if(enemy.kind==='kogumo'){
      if(events)events.push({type:'enemyRemoved',enemyId:enemy.id,targetSlot:slot});return;
    }
    if(getSession(state).summons)dismissKogumo(state,events);
    const bonus=overkill?overkillBonus(state):0,gain=grantIncome(state,reward(state),'questReward')+grantIncome(state,bonus,'overkillReward');state.kills++;
    if(events)events.push({type:'clear',reward:gain,overkillBonus:bonus,overkills:overkill?1:0,reason,targetSlot:slot,enemyId:enemy.id,hpAfter:state.hp});

  }
  const targetEvasion=(profile,enemy)=>{const base=enemy?.kind==='kogumo'?{flat:enemy.creationDamage,dice:2}:profile.evasion;return base?{...base,flat:base.flat-(enemy?.evasionPenalty||0)}:null;};
  const targetDefense=(profile,enemy)=>profile.ignoreDefense?0:Math.max(0,(enemy?.kind==='kogumo'?0:profile.defense)-(profile.mental?0:Math.max(enemy?.defensePenalty||0,profile.defenseReduction||0)));
  function attackDamage(profile,enemy,amount,doubleHit=false){
    if(profile.fixedDamage!=null)return profile.fixedDamage;
    const mitigated=N.mitigate(amount,targetDefense(profile,enemy));
    return profile.areaAttack&&!profile.noAreaPenalty&&!doubleHit?Math.max(1,N.floor(mitigated/2)):mitigated;
  }
  function applyHitEffects(enemy,profile,count,random){
    if(profile.tauntId)enemy.tauntId=profile.tauntId;
    if(profile.apReduction)enemy.actionPoints=Math.max(0,enemy.actionPoints-profile.apReduction*count);
    enemy.defensePenalty=Math.max(enemy.defensePenalty||0,profile.defenseReduction||0);
    // AP is an integer gauge; repeated reductions stop as soon as it is empty.
    if(profile.apReductionRate)for(let i=0;i<count&&enemy.actionPoints>0;i++)enemy.actionPoints=Math.max(0,enemy.actionPoints-N.delta(enemy.actionPoints*profile.apReductionRate));
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
    const automaticHit=!confirmedHit&&profile.autoHitChance>0&&random()<profile.autoHitChance;
    const rawAccuracy=!confirmedHit&&!automaticHit&&profile.accuracy?combatRoll(profile.accuracy,random):null;
    let baseDamageRoll=null;
    for(const [targetIndex,enemy]of targets.entries()){
      if(enemy.hp<=0)continue;
      if(character&&rawDamage&&!profile.forceSingleTarget){
        if(!canReach(state,character,enemy))continue;
        const scoped=attackProfile(state,character,false,enemySpec(state,enemy),enemy);
        profile={...originalProfile,...scoped};
      }
      const poisonBefore=enemy.poisonDamage;
      const bHit=T.hit(profile.accuracy,targetEvasion(profile,enemy),profile.hitLogRatio||0).correction;
      const accuracy=rawAccuracy?{...rawAccuracy,rawTotal:rawAccuracy.total,total:rawAccuracy.total+bHit,strengthCorrection:bHit}:null;
      const slot=enemies.indexOf(enemy),forcedEvasionFailure=!!accuracy&&!!enemy.evasionFailure;
      const evasion=accuracy?combatRoll(targetEvasion(profile,enemy),random):null;
      if(forcedEvasionFailure)enemy.evasionFailure=false;
      if(accuracy&&!forcedEvasionFailure&&accuracy.total<=evasion.total){
        if(events)events.push({type:'attack',actor,actorId,motion:profile.motion,distance:profile.distance,apDamage:!!profile.apAttack,magicLevel:profile.magicLevel||0,damage:0,hit:false,accuracy,evasion,poisonBefore,poisonAfter:poisonBefore,hpBefore:enemy.hp,hpAfter:enemy.hp,targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:targetIndex>0,extraAttack});
        continue;
      }
      applyHitEffects(enemy,profile,1,random);
      const judgment=judgmentBonus(accuracy,evasion);
      if(profile.areaAttack&&judgment.doubleHit)judgment.bonusDice--;
      const jewel=actorId==='jewel'?D.characters.find(c=>c.id==='jewel'):null,ps=jewel?rangedPerks(state,jewel,combatDistance(state,jewel.id,enemy)):[];
      if(judgment.doubleHit&&ps.some(p=>p.rainbowArmor)){
        const wasActive=rainbowActive(state);state.rainbowTurns=3;
        if(!wasActive){profile={...profile,flat:profile.flat+15};amount+=15;}
      }
      if(ps.some(p=>p.evasionReduction)){enemy.evasionPenalty=6;enemy.evasionPenaltyTurns=2;}
      const spec={dice:profile.dice+judgment.bonusDice,flat:profile.flat+(profile.bonus||0)+(judgment.doubleHit?profile.doubleHitDamage||0:0),resultScale:profile.resultScale??1};
      const correction=rawDamage&&profile.fixedDamage==null?T.damage(spec,targetDefense(profile,enemy),profile.damageLogRatio||0,profile.damageScaleLog||0).correction:0;
      // Keep one shared base roll for a whole-area action; extra judgment dice
      // and each target's inverse correction are resolved after its hit check.
      if(rawDamage&&baseDamageRoll===null)baseDamageRoll=roll(profile.dice,0,random);
      const powered=rawDamage?scaledCombatTotal(baseDamageRoll+roll(judgment.bonusDice,0,random)+spec.flat,spec)+correction:amount;
      const damage=attackDamage(profile,enemy,powered,judgment.doubleHit);
      if(profile.apAttack){
        const apBefore=enemy.actionPoints;enemy.actionPoints=Math.max(0,apBefore-damage);
        if(events)events.push({type:'attack',actor,actorId,motion:profile.motion,distance:profile.distance,damage:apBefore-enemy.actionPoints,rolledDamage:damage,apDamage:true,apBefore,apAfter:enemy.actionPoints,hit:true,accuracy,evasion,...judgment,poisonBefore,poisonAfter:poisonBefore,hpBefore:enemy.hp,hpAfter:enemy.hp,targetSlot:slot,enemyId:enemy.id,extraAttack});
        continue;
      }
      if(judgment.doubleHit&&ps.some(p=>p.doubleHitIncome))grantPerkIncome(state,damage,'紅の拳',events);
      if(profile.poisonDamage)enemy.poisonDamage=Math.max(enemy.poisonDamage,profile.poisonDamage);
      const hit=(damage,poisonTick=false)=>{
        const before=enemy.hp;state.totalDamage+=Math.min(before,damage);enemy.hp=Math.max(0,before-damage);
        const knockoutRoll=enemy.hp>0&&enemy.hp<=D.balance.knockoutHP?roll(1,0,random):null;
        const knockedOut=knockoutRoll!==null&&knockoutRoll%2===1;
        if(events)events.push({type:'attack',actor:poisonTick?'猛毒':actor,actorId:poisonTick?null:actorId,motion:profile.motion,distance:profile.distance,magicLevel:poisonTick?0:profile.magicLevel||0,damage,hit:true,automaticHit,forcedEvasionFailure,accuracy,evasion,...(poisonTick?{}:judgment),poisonBefore,poisonAfter:enemy.hp>0&&!knockedOut?enemy.poisonDamage:0,hpBefore:before,hpAfter:enemy.hp,
          targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:targetIndex>0,extraAttack,poisonTick,knockoutRoll,knockedOut});
        if(!enemy.hp||knockedOut){
          clearEnemy(state,enemy,slot,!poisonTick&&profile.overkillThreshold>0&&damage-before>=profile.overkillThreshold,knockedOut?'knockout':'hp',events,random);
          if(enemy.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});
          enemy.hp=0;enemy.poisonDamage=0;enemy.respawnSeconds=enemy.kind==='kogumo'?0:respawnDelay(state);enemy.actionPoints=0;enemy.pendingAttack=null;enemy.defensePenalty=0;enemy.accuracyPenalty=0;enemy.evasionPenalty=0;enemy.evasionPenaltyTurns=0;enemy.evasionFailure=false;enemy.tauntId=null;enemy.slowSeconds=0;enemy.actionPenalty=0;enemy.queenCancels=0;
          if(state.focusedEnemyId===enemy.id)state.focusedEnemyId=null;return true;
        }
        if(!poisonTick&&!profile.nonContact&&getSession(state).summons&&enemy.kind!=='kogumo')spawnKogumo(state,damage,events);
        return false;
      };
      if(!hit(damage)&&enemy.poisonDamage)hit(enemy.poisonDamage,true);
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
  function performAttack(state,character,profile,random,events){
    if(character&&!hasReachableTarget(state,character))return;
    if(!prepareMagicAction(state,character,events))return;
    const first=attackTargets(state,profile.areaAttack,random,character);
    if(!first.length)return;
    if(character)profile=attackProfile(state,character,false,enemySpec(state,first[0]),first[0]);
    const count=chainAttackCount(profile.extraAttackChance,random);
    for(let i=0;i<count&&!isWaiting(state);i++){
      const targets=i?attackTargets(state,profile.areaAttack,random,character):first;
      if(!targets.length)break;
      if(i&&character&&!attackProfile(state,character,false,enemySpec(state,targets[0]),targets[0]).extraAttackChance)break;
      applyDamage(state,0,events,character?character.name:'あなた',character?.id||null,random,profile,i>0,targets,false,true);
    }
    finishMagicAttack(state,character,profile);
    if(character?.id==='jewel')state.rainbowTurns=Math.max(0,(state.rainbowTurns||0)-1);
  }
  function click(state,random=Math.random){
    if(state.viewingMemories)return [];
    if(state.paused||isWaiting(state))return [];
    const character=selectedCharacter(state);
    if(character&&(!canAct(state,character.id)||isStunned(state,character.id)||!hasReachableTarget(state,character)))return [];
    // Unassigned manual attacks remain available to bootstrap the first hire.
    state.clicks++;const events=[];if(!character||beginRunawayAction(state,character,random,events))performAttack(state,character,attackProfile(state,character,true),random,events);if(character)endRunawayAction(state,character,random,events);return events;
  }
  function chargeActions(state,c,ticks,random){
    const base=c.actionDice?roll(c.actionDice.dice,c.actionDice.flat,random):c.action;
    const total=state.actionPoints[c.id]+actionPower(state,c,base,false,random)*ticks,threshold=actionThreshold(state);
    if(!canTakeAction(state,c)){state.actionPoints[c.id]=Math.min(total,threshold);return 0;}
    const count=Math.floor(total/threshold);state.actionPoints[c.id]=total%threshold;return count;
  }
  function repeatAverageHits(state,c,profile,count,events,random){
    if(profile.apAttack){
      const es=livingEnemies(state),focused=es.find(e=>e.id===state.focusedEnemyId),targets=focused?[focused]:es;
      for(const [i,enemy]of targets.entries()){
        const actions=Math.floor(count/targets.length)+(i<count%targets.length?1:0);if(!actions)continue;
        const apBefore=enemy.actionPoints,mean=profileAverage({...state,enemies:[enemy],focusedEnemyId:enemy.id},profile);
        enemy.actionPoints=Math.max(0,apBefore-Math.floor(mean*actions));
        if(events)events.push({type:'attack',actor:c.name,actorId:c.id,motion:profile.motion,distance:profile.distance,count:actions,damage:apBefore-enemy.actionPoints,apDamage:true,apBefore,apAfter:enemy.actionPoints,hpBefore:enemy.hp,hpAfter:enemy.hp,enemyId:enemy.id,targetSlot:state.enemies.indexOf(enemy),approximate:true});
      }
      return;
    }
    const auto=profile.autoHitChance||0,outcomes=judgmentOutcomes(profile.accuracy,profile.evasion,profile.hitLogRatio||0);
    const probability=auto+(1-auto)*outcomes.chance,expected=count*probability;
    const hits=Math.floor(expected)+(random()<expected%1?1:0),misses=count-hits;count=hits;
    if(events&&misses>0){const e=livingEnemies(state)[0];if(e)events.push({type:'attack',actor:c.name,actorId:c.id,motion:profile.motion,distance:profile.distance,count:misses,damage:0,hit:false,hpBefore:e.hp,hpAfter:e.hp,enemyId:e.id,targetSlot:state.enemies.indexOf(e),approximate:true});}
    const amount=targetDefense(profile,null)+profileAverage({...state,enemies:null},profile)/Math.max(1e-12,probability)/(profile.areaAttack?3:1)*(profile.areaAttack?2:1);
    let left=count,phase=0;
    // With a per-individual respawn delay, at most three enemies can fall in
    // one tick. Skip only safe interior HP transitions, preserve boundary hits.
    while(left>0&&!isWaiting(state)){
      const es=livingEnemies(state),focused=es.find(e=>e.id===state.focusedEnemyId);
      const targets=profile.areaAttack?es:focused?[focused]:[es[(phase++)%es.length]];
      // For unfocused fast attacks, a round visits each living enemy once.
      const balanced=!profile.areaAttack&&!focused,cycleTargets=balanced?es:targets,cycle=balanced?es.length:1;
      if(cycleTargets.every(e=>!profile.poisonDamage||e.poisonDamage>=profile.poisonDamage)){
        const skip=Math.min(Math.floor((left-1)/cycle),...cycleTargets.map(e=>Math.max(0,Math.floor((e.hp-D.balance.knockoutHP-1)/(attackDamage(profile,e,amount)+e.poisonDamage))-1)));
        if(skip>0){
          for(const e of cycleTargets){applyHitEffects(e,profile,skip,random);const damage=(attackDamage(profile,e,amount)+e.poisonDamage)*skip,before=e.hp;e.hp-=damage;state.totalDamage+=damage;
            if(events)events.push({type:'attack',actor:c.name,actorId:c.id,motion:profile.motion,distance:profile.distance,count:skip,damage,hpBefore:before,hpAfter:e.hp,enemyId:e.id,targetSlot:state.enemies.indexOf(e),continuation:profile.areaAttack&&e!==cycleTargets[0],areaAttack:profile.areaAttack,approximate:true});}
          left-=skip*cycle;syncFront(state);
        }
      }
      // Select the same sampled target for this boundary hit without changing focus.
      applyDamage(state,amount,events,c.name,c.id,random,profile,false,targets,true);left--;
    }
  }
  function automaticTick(state,random,events){
    for(const c of activeCharacters(state)){
      if(isWaiting(state))break;if(!canAct(state,c.id))continue;
      const chargedThreshold=actionThreshold(state);let count=chargeActions(state,c,1,random);if(!count)continue;
      // Turn-ending self damage, misfires and perk failure rolls can change
      // who is able to act. Resolve those turns instead of skipping them in
      // the damage-only batch. Pure roll modifiers remain safe to aggregate.
      const turnSensitive=Object.values(state.formationRows||{}).includes('rear')||livingEnemies(state).some(e=>e.row==='rear')||getSession(state).summons||activeCharacters(state).some(a=>a.id==='megumin'||isStunned(state,a.id))||activeCharacters(state).some(a=>a.id==='jewel'||['control','overload','ability','language'].includes(runawayOf(state,a.id).runawaySymptom))||livingEnemies(state).some(e=>e.evasionFailure||e.evasionPenaltyTurns)||attackProfile(state,c).evasionFailureChance;
      if(runawayOf(state,c.id).runawaySymptom==='oblivion'&&count>EXACT_ATTACK_BUDGET&&!turnSensitive){
        const skipped=Math.floor(count/2)+(count%2&&random()<.5?1:0);count-=skipped;
        if(events&&skipped)events.push({type:'runawaySkip',actorId:c.id,count:skipped,approximate:true});
      }
      const profile=attackProfile(state,c),estimate=count/(1-freeActionChance(state,c))/(1-profile.extraAttackChance);
      // Timed, per-target judgments must resolve individually while Jewel fights.
      if(estimate>EXACT_ATTACK_BUDGET&&!turnSensitive){
        if(isActionDonor(state,c)){
          const donorActions=Math.floor(count/(1-freeActionChance(state,c))),targets=transferTargets(state,c);for(const [i,t]of targets.entries()){
            const actions=Math.floor(donorActions/targets.length)+(i<donorActions%targets.length?1:0),p=attackProfile(state,t);
            repeatAverageHits(state,t,p,Math.floor(actions/(1-p.extraAttackChance)),events,random);
          }
          if(events)events.push({type:'support',actor:c.name,actorId:c.id,maxTransfers:donorActions,count:donorActions,hpBefore:state.hp,hpAfter:state.hp,approximate:true});
        }else repeatAverageHits(state,c,profile,Math.floor(estimate),events,random);
      }else {
        // Stateful turns cannot be replaced by a mean without losing summons,
        // expiring effects or reactions. Carry excess AP forward, never discard
        // it or let a forged/extreme balance monopolize the UI thread.
        const resolved=Math.min(count,EXACT_ATTACK_BUDGET);
        for(let i=0;i<resolved&&!isWaiting(state)&&canAct(state,c.id);i++){
          if(!canTakeAction(state,c)){state.actionPoints[c.id]=chargedThreshold;break;}
          const resting=isStunned(state,c.id),freeTurns=resting?1:chainAttackCount(freeActionChance(state,c),random);
          for(let n=freeTurns;n>0&&!isWaiting(state)&&canAct(state,c.id);n--){
            performAutomaticAction(state,c,random,events);
            // Free repeats must not pay off the required resting turns.
            if(isStunned(state,c.id))break;
          }
        }
        if(count>resolved&&!isWaiting(state)&&canAct(state,c.id)&&canTakeAction(state,c))state.actionPoints[c.id]=Math.min(1e100,state.actionPoints[c.id]+(count-resolved)*chargedThreshold);
      }
    }
    enemyActions(state,random,events);
  }
  function advance(state,seconds,random=Math.random,collectEvents=true,offline=false){
    if(state.paused||seconds<=0)return [];
    const duration=Math.min(seconds,D.maxOfflineSeconds),clock=state.actionClock,events=collectEvents?[]:null;
    state.health||=Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}]));
    const contexts=D.sessions.filter(q=>{const ctx=battleContext(state,q.id);return formationIds(state,q.id).length||isWaiting(ctx)||ctx.enemies?.some(e=>e.respawnSeconds>0||e.pendingAttack);}).map(q=>battleContext(state,q.id));
    for(const ctx of contexts){normalizeEnemyActions(ctx,events?{push:e=>events.push({...e,sessionId:ctx.sessionId})}:null);refreshFloorClip(ctx);}
    const ticks=Math.floor(clock+duration+1e-10);let previous=0,elapsed=0;
    const exponential=()=>-Math.log1p(-Math.max(Number.EPSILON,Math.min(1-Number.EPSILON,random())))*D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds;
    // A thinned Poisson process inserts only a handful of offline income
    // opportunities. No next-event timestamp survives this call or is saved.
    let incomeAt=offline&&!state.forecast?exponential():Infinity;
    function elapse(dt){
      // Resolve sub-second impacts and respawns in chronological order. The
      // same boundaries are used by live, background and offline simulation.
      let remaining=dt;
      while(remaining>1e-10){
        const timers=contexts.flatMap(ctx=>ensureEnemies(ctx).flatMap(e=>[e.respawnSeconds||Infinity,e.pendingAttack?.remaining??Infinity]));
        const step=Math.min(remaining,...timers,...contexts.map(ctx=>ctx.floorClipSeconds||Infinity),Math.max(0,incomeAt-elapsed));recoverAllies(state,step,events);remaining=Math.max(0,remaining-step);elapsed+=step;
        if(elapsed+1e-9>=incomeAt){jewelSideIncome(state,random,events);incomeAt+=exponential();}
        for(const ctx of contexts){
          const local=collectEvents?[]:null;
          ctx.factors=state.factors;ctx.earned=state.earned;ctx.formations=state.formations;
          const incomeBefore={factors:ctx.factors,earned:ctx.earned};
          ctx.floorClipSeconds=Math.max(0,(ctx.floorClipSeconds||0)-step);
          for(const [slot,e]of ensureEnemies(ctx).entries()){
            if(e.slowSeconds>0){e.slowSeconds=Math.max(0,e.slowSeconds-step);if(e.slowSeconds<1e-9){e.slowSeconds=0;e.actionPenalty=0;}}
            if(e.respawnSeconds>0){e.respawnSeconds=Math.max(0,e.respawnSeconds-step);
              if(e.respawnSeconds<1e-9){Object.assign(e,newEnemy(ctx));if(local)local.push({type:'enemyRespawn',targetSlot:slot,enemyId:e.id});}
            }else if(e.pendingAttack){e.pendingAttack.remaining=Math.max(0,e.pendingAttack.remaining-step);
              if(e.pendingAttack.remaining<1e-9)resolveEnemyAttack(ctx,e,slot,random,local);
            }
          }
          syncFront(ctx);refreshFloorClip(ctx);if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
          if(ctx!==state)for(const k of Object.keys(incomeBefore))state[k]+=ctx[k]-incomeBefore[k];
        }
      }
    }
    for(let tick=1;tick<=ticks;tick++){
      const at=tick-clock;elapse(at-previous);previous=at;
      if(!state.forecast){
        for(const c of D.characters)if(state.levels[c.id]){
          const owner=formationOwner(state,c.id),ctx=contexts.find(q=>q.sessionId===owner)||state,before={factors:state.factors,earned:state.earned,kills:state.kills,totalDamage:state.totalDamage};
          Object.assign(ctx,before);ctx.formations=state.formations;
          const local=events?[]:null;
          changeRunaway(ctx,c.id,runawayPressure(state,c),random,local);
          if(events)events.push(...local.map(e=>({...e,sessionId:owner||state.sessionId})));
          if(ctx!==state){for(const k of Object.keys(before))state[k]+=ctx[k]-before[k];state.formations=ctx.formations;}
        }
        if(!offline&&random()<-Math.expm1(-1/D.runtimeBalance.jewelSideIncomeMeanIntervalSeconds))jewelSideIncome(state,random,events);
      }
      for(const ctx of contexts){
        ctx.formations=state.formations;ctx.factors=state.factors;ctx.earned=state.earned;
        normalizeEnemyActions(ctx);if(isWaiting(ctx)||!activeCharacters(ctx).length)continue;
        if(ctx.forecastTicks!==undefined)ctx.forecastTicks++;
        const before={factors:ctx.factors,earned:ctx.earned,kills:ctx.kills,totalDamage:ctx.totalDamage},local=collectEvents?[]:null;
        automaticTick(ctx,random,local);
        if(ctx!==state)for(const k of Object.keys(before))state[k]+=ctx[k]-before[k];
        if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
      }
    }
    elapse(duration-previous);
    for(const ctx of contexts)if(ctx!==state)state.sessionStates={...state.sessionStates,[ctx.sessionId]:battleSnapshot(ctx)};
    state.actionClock=Math.max(0,clock+duration-ticks);state.sceneSeconds=((state.sceneSeconds||0)+duration)%D.sceneCycle.seconds;
    refreshQuestUnlocks(state);refreshPerkUnlocks(state);
    return events||[];
  }
  function catchUp(state, now = Date.now()) {
    const seconds = Math.max(0, Math.min(D.maxOfflineSeconds, (now - state.savedAt) / 1000));
    const oldKills = state.kills, oldFactors = state.factors;
    advance(state, seconds, Math.random, false, true);
    state.savedAt = now;
    return { seconds, kills: state.kills - oldKills, factors: state.factors - oldFactors };
  }
  function hire(state, id) {
    const c = D.characters.find(item => item.id === id);
    if (!c || !Number.isSafeInteger(state.levels[id]+1)) return false;
    const cost = hireCost(state, c);
    if (!Number.isFinite(cost)||cost>1e100||state.factors < cost) return false;
    refreshQuestUnlocks(state);
    state.factors -= cost;
    if (state.levels[id] === 0) state.actionPoints[id] = 0;
    state.levels[id]++;
    return true;
  }
  function buyPerk(state,characterId,perkId){return togglePerk(state,characterId,perkId);}
  function togglePerk(state,characterId,perkId,enabled){
    refreshPerkUnlocks(state);const c=D.characters.find(c=>c.id===characterId),p=c&&perks(state,c).find(p=>p.id===perkId);
    if(!p||!p.owned||p.awakeningLevel)return false;state.perkEnabled[characterId][perkId]=enabled===undefined?!p.enabled:!!enabled;normalizeMagic(state,c);return true;
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
    if(kind==='quest'&&D.sessions.some(q=>q.id===id))return {field:'questLevels',minimum:1,buy:buyQuest,cost:s=>questCost(s,id)};
    return null;
  }
  function tradeDraft(state) { return {...state,incomeTotals:{...state.incomeTotals},unlockedPerks:structuredClone(state.unlockedPerks),perkEnabled:structuredClone(state.perkEnabled),concentration:structuredClone(state.concentration),actionPoints:{...state.actionPoints},levels:{...state.levels},upgrades:{...state.upgrades},questLevels:{...state.questLevels},questActiveLevels:{...state.questActiveLevels},sessionStates:structuredClone(state.sessionStates),enemies:state.enemies?structuredClone(state.enemies):null,health:structuredClone(state.health)}; }
  function purchaseQuote(state,kind,id,count=10) {
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);let cost=0;
    if(!track||kind==='quest'&&!isQuestUnlocked(state,id)||![1,10].includes(count))return {valid:false,cost:Infinity,count};
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
    const track=tradeTrack(state,kind,id),ctx=kind==='quest'?battleContext(state,id):null,oldHP=ctx?getSession(ctx).hp:0,active=ctx?questLevel(state,id):0;
    if(ctx)ensureEnemies(ctx);
    refreshPerkUnlocks(state);state[track.field][id]=quote.to;grantIncome(state,quote.refund,'refund');
    if(['level','power'].includes(kind)){
      const values=concentration(state,id);if(Object.values(values).reduce((n,v)=>n+v,0)>concentrationPoints(state,id))state.concentration={...state.concentration,[id]:emptyConcentration()};
      clampHealth(state,id);
    }
    if(ctx&&active>state.questLevels[id])applyQuestLevel(state,id,state.questLevels[id],ctx,oldHP);
    return true;
  }
  function selectMemories(state){if(state.viewingMemories||!isMemoriesUnlocked(state))return false;state.memoriesUnlocked=true;state.viewingMemories=true;return true;}
  function selectSession(state,id){
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
    if(p.fixedDamage!=null)return p.fixedDamage;
    const original=p;
    const average=enemy=>{const c=D.characters.find(c=>c.id===original.actorId),ctx=c?.magicPower?{...state,health:{...state.health,[c.id]:{...healthOf(state,c.id),magicLevel:original.magicLevel}}}:state;
      const p=c&&enemy&&combatDistance(state,c.id,enemy)!==original.distance?attackProfile(ctx,c,false,enemySpec(state,enemy),enemy):original;
      const outcomes=judgmentOutcomes(p.accuracy,targetEvasion(p,enemy),p.hitLogRatio||0),auto=p.autoHitChance||0,defense=targetDefense(p,enemy);
      const mean=(extra=0,double=0)=>{const spec={dice:p.dice+extra-(p.areaAttack?double:0),flat:p.flat+(p.bonus||0)+double*(p.doubleHitDamage||0),resultScale:p.resultScale??1},b=T.damage(spec,defense,p.damageLogRatio||0,p.damageScaleLog||0).correction;
        return T.distribution(spec,false).reduce((n,[a,,w])=>{const d=Math.max(1,a+b-defense);return n+(p.areaAttack&&!p.noAreaPenalty&&!double?Math.max(1,Math.floor(d/2)):d)*w;},0);};
      return auto*mean()+(1-auto)*(outcomes.conditional.reduce((n,[extra,double,w])=>n+w*mean(extra,double),0)+(enemy?.evasionFailure?(1-outcomes.chance)*mean():0));};
    const actor=D.characters.find(c=>c.id===p.actorId),live=(state.enemies||[]).filter(e=>e.hp>0&&!e.respawnSeconds&&(!actor||canReach(state,actor,e))),focused=live.find(e=>e.id===state.focusedEnemyId),targets=p.areaAttack?live:focused?[focused]:live;
    if(state.enemies?.some(e=>e.hp>0)&&!targets.length)return 0;
    if(!targets.length)return average(null)*(p.areaAttack?3:1);const total=targets.reduce((n,e)=>n+average(e),0);return p.areaAttack?total:total/targets.length;
  }
  function attackForecastProfile(state,c){
    if(!c?.magicPower)return attackProfile(state,c);
    const m=magicState(state,c),forecast={...state,health:{...state.health,[c.id]:{...healthOf(state,c.id),magicLevel:m.maximum}}};
    return attackProfile(forecast,c);
  }
  const averageAttackDamage=(state,c)=>{const p=attackForecastProfile(state,c);return p.apAttack?0:profileAverage(state,p);};
  function characterMetrics(state,c){
    const damage=averageAttackDamage(state,c),uptime=combatUptime(state),attacksPerSecond=effectiveAttackRate(state,c)*uptime;
    const p=attackForecastProfile(state,c);
    return {damage,apDamage:p.apAttack?profileAverage(state,p):0,attacksPerSecond,dps:damage*attacksPerSecond,action:actionPower(state,c),transfersPerSecond:isActionDonor(state,c)?automaticActionRate(state,c)*uptime:0};
  }
  const characterDps=(state,c)=>characterMetrics(state,c).dps;
  const dps=state=>D.characters.reduce((n,c)=>n+characterDps(state,c),0);
  const combatUptime=state=>respawnDelay(state)?expectedIncome(state).combatUptime:1;
  const totalDps=state=>D.sessions.reduce((n,q)=>n+dps(battleContext(state,q.id)),0);
  function totalIncome(state){
    const sessions=D.sessions.filter(q=>formationIds(state,q.id).length).map(q=>({id:q.id,name:q.name,...expectedIncome(battleContext(state,q.id))}));
    return {sessions,factorsPerSecond:sessions.reduce((n,q)=>n+q.factorsPerSecond,0),approximate:true};
  }
  function expectedIncome(state){
    const q=getSession(state),ids=formationIds(state);
    const key=JSON.stringify([q.id,q.level,q.hp,q.reward,q.defense,q.resistance,q.evasion,q.traits,q.action,q.actionDice,q.attack,q.accuracy,q.ss,q.attackType,state.concentration,state.formationRows,ids,state.levels,state.upgrades,state.purchasedPerks,state.perkEnabled,ids.map(id=>activation(state,D.characters.find(c=>c.id===id))),ids.includes('max')?state.selectedCharacterId:null,ids.includes('jewel')?walletArmorBonus(state.factors):0]);
    if(incomeCache.has(key))return incomeCache.get(key);
    const sample=structuredClone(state);sample.paused=false;sample.rainbowTurns=0;sample.enemies=null;sample.hp=q.hp;sample.poisonDamage=0;sample.respawnSeconds=0;sample.focusedEnemyId=null;sample.nextEnemyId=0;
    sample.formations=Object.fromEntries(D.sessions.map(s=>[s.id,s.id===q.id?ids:[]]));sample.sessionStates={};sample.actionClock=0;sample.forecastTicks=0;sample.forecast=true;
    sample.actionPoints=Object.fromEntries(D.characters.map(c=>[c.id,0]));sample.health=Object.fromEntries(D.characters.map(c=>[c.id,{hp:maxHP(state,c),status:'active',regenSeconds:0}]));
    sample.factors=state.factors;sample.earned=0;sample.kills=0;sample.totalDamage=0;
    let seed=0x143fa53;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    advance(sample,120,random,false);
    // Credit unfinished HP progress in the forecast, never in the real balance.
    const progress=isWaiting(sample)?0:(sample.enemies||[]).filter(e=>e.kind!=='kogumo').reduce((n,e)=>n+(e.hp>0?(q.hp-e.hp)/q.hp:0),0);
    const perClear=reward(state),result=Object.freeze({clearsPerSecond:(sample.kills+progress)/120,reward:perClear,bonusPerSecond:(sample.earned-sample.kills*perClear)/120,factorsPerSecond:(sample.earned+progress*perClear)/120,approximate:true,combatUptime:sample.forecastTicks/120});
    if(incomeCache.size>=32)incomeCache.delete(incomeCache.keys().next().value);incomeCache.set(key,result);return result;
  }
  function revivalCost(state,id){
    const c=D.characters.find(c=>c.id===id);if(!c||!state.levels[id])return Infinity;
    const cost=c.cost+N.delta(trainingInvestment(state,c)*.01);return Number.isFinite(cost)&&cost<=1e100?cost:Infinity;
  }
  function revive(state,id){
    const cost=revivalCost(state,id),h=state.health?.[id],c=D.characters.find(c=>c.id===id);
    if(!c||!h||h.status==='active'||!Number.isFinite(cost)||state.factors<cost)return false;
    refreshQuestUnlocks(state);
    state.factors-=cost;h.hp=maxHP(state,c);h.status='active';h.regenSeconds=0;return true;
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
    const active=deployed&&healthy&&!r.runawayCollapsed;
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
    const generated=active?source*recoveryMultiplier:0;
    return {base,training,trainingScale,trainingLevels,trainingTotal,perkEntries,perkPressure,temporary,source,recoveryStacks,recoveryReduction,recoveryMultiplier,calmingEntries,calming,generated,net:generated-calming,active,inactiveReason:active?null:r.runawayCollapsed?'collapsed':!healthy?'down':'undeployed',criticalReserve:r.criticalReserve||0};
  }
  function runawayPressure(state,c){return runawayPressureBreakdown(state,c).net;}
  function suppressionQuote(state,id=null){
    const ids=id===null?formationIds(state):[id];
    const targets=ids.filter(x=>D.characters.some(c=>c.id===x)&&state.levels[x]>0&&runawayOf(state,x).runawayRate>0);
    const cost=targets.reduce((sum,x)=>sum+N.delta(trainingInvestment(state,D.characters.find(c=>c.id===x))*.01),0);
    return {targets,cost,valid:targets.length>0&&Number.isFinite(cost)&&cost<=1e100};
  }
  function suppressRunaway(state,id=null){
    const quote=suppressionQuote(state,id);if(!quote.valid||state.factors<quote.cost)return false;
    state.factors-=quote.cost;
    for(const target of quote.targets)changeRunaway(state,target,-10);
    return true;
  }
  function criticalFactorReward(state,c,threshold){return Math.max(0,N.floor(trainingInvestment(state,c)*D.runtimeBalance.criticalRewardRate));}
  function damageAlly(state,c,amount,random,events,source='runaway'){
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
    const incoming={...turnEffects(state,target.id),accuracySpec:hitSpec,evasionDice,attack,reduction:ignoreDefense?0:armor(state,target,mental),postReduction:activation(state,target).damage,shield:0,hitLogRatio:T.relativeLog(strengthValue(state,c,'accuracy'),strengthValue(state,target,'evasion')),damageLogRatio:T.relativeLog(attackStrength,defenseStrength),damageScaleLog:T.absoluteLog(attackStrength,defenseStrength)};
    const result=rollEnemyHit(incoming,random);delete state.health[target.id].blastEvasion;
    if(!result.hit&&p.blastEvasionPerMagic)roll(attack.dice,attack.flat,random,attack.sides);
    if(result.hit){if(p.apAttack)state.actionPoints[target.id]=Math.max(0,state.actionPoints[target.id]-result.damage);else damageAlly(state,target,result.damage,random,events,'misfire');}
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
      else {result('criticalRecovery');const h=state.health[c.id],before=h.hp;h.hp=Math.min(maxHP(state,c),h.hp+Math.max(1,Math.floor(maxHP(state,c)*roll(2,0,random)/28)));r.criticalReserve+=roll(2,0,random);if(h.hp===maxHP(state,c)){h.status='active';h.regenSeconds=0;}if(events)events.push({type:'heal',actorId:c.id,amount:h.hp-before,hp:h.hp});}
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
    if(!canAct(state,c.id)||isStunned(state,c.id))return false;preparePerkFailures(state,random);
    const symptom=runawayOf(state,c.id).runawaySymptom;
    if(symptom==='oblivion'&&random()<.5){if(events)events.push({type:'runawaySkip',actorId:c.id});return false;}
    if(symptom==='control'&&random()<.5){runawayAttack(state,c,random,events,null,true);return false;}
    return true;
  }
  function endRunawayAction(state,c,random,events){
    if(canAct(state,c.id)&&runawayOf(state,c.id).runawaySymptom==='overload')nonContactSelfDamage(state,c,D.runtimeBalance.overloadDamageRate,random,events);
    const h=state.health[c.id];if(h.blastTurns>0&&--h.blastTurns===0){delete h.blastTurns;delete h.blastEvasion;}
    delete state.perkFailures;
  }
  function jewelEligible(state){
    const owner=formationOwner(state,'jewel');if(!owner)return false;const ctx=battleContext(state,owner),c=D.characters.find(c=>c.id==='jewel');
    return canAct(ctx,'jewel')&&activePerks(ctx,c).some(p=>p.sideIncome);
  }
  function jewelSideIncome(state,random,events){
    if(state.paused||!jewelEligible(state))return 0;
    const symptom=runawayOf(state,'jewel').runawaySymptom;
    if(['ability','language'].includes(symptom)&&random()<.5)return 0;
    return grantPerkIncome(state,Math.floor(state.factors*D.runtimeBalance.jewelSideIncomeRate),'臨時収入',events);
  }

  const api = { formationRow,inRange,combatDistance,canReach,reachableEnemies,hasReachableTarget,enemyCanReach,rangedPerks,attackMotion, magicState, ownActionBonus, attackForecastProfile, isStunned, turnEffects, nextRun, isMemoriesUnlocked, incomeRecord, rolloverIncome, enemyStrength, selectMemories, concentrationResetCost, resetConcentration, strengthValue, concentrationPoints, clampHealth, hpStrength, hpFromStrength, enemyActionValue, suppressionQuote,suppressRunaway,newRunaway,runawayOf,activation,trainingRunawayPressure,runawayPressureBreakdown,runawayPressure,criticalFactorReward,changeRunaway,symptomRoll,thresholdEvent,jewelEligible,jewelSideIncome, T, grantIncome, refreshPerkUnlocks, togglePerk, profileAverage, enemyHitProfile, rollEnemyHit, enemySpec, scaledCombatTotal, trainingPlan, judgmentBonus, judgmentOutcomes, actionThreshold, enemyActionPower, accuracySpec, opposedHitChance, maxHP, armor, statLevel, enemyTargetCandidates, targetDefense, targetEvasion, evasionSpec, enemyAttackSpec, setQuestLevel, isQuestUnlocked, refreshQuestUnlocks, concentration, setConcentration, normalizeEnemyActions, livingEnemies, selectEnemy, enemyAttackDuration, revivalCost, revive, healthOf, canAct, ensureEnemies, combatRoll, battleContext, battleSnapshot, respawnDelay, isWaiting, formationOwner, totalDps, totalIncome, combatUptime, MAX_PARTY_SIZE, formationIds, isDeployed, activeCharacters, setFormation, averageAttackDamage, characterMetrics, isActionDonor, automaticActionRate, createState, getSession, questLevel, sessionAtLevel, questCost, buyQuest, purchaseQuote, buyMany, saleQuote, sell, perks, hasAreaAttack, stats, manualStats, selectedCharacter, selectCharacter, sawCount, bombCount, weaponScale, enemyDefense, attackBreakdown, attackProfile, reward, overkillBonus, hireCost, actionPower, freeActionChance, attackRate, effectiveAttackRate, chainAttackCount, actionCost, upgradeCost, roll, click, advance, catchUp, hire, buyPerk, buyUpgrade, selectSession, dps, characterDps, expectedIncome };
  Object.assign(api,{enemyMaxHP,trainingInvestment,perkLevel,rainbowActive,enemyTargetWeights});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
