(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.YggData;
  const B = typeof module !== 'undefined' && module.exports ? require('./battle-batch.js') : root.YggBatch;
  const N = typeof module !== 'undefined' && module.exports ? require('./numbers.js') : root.YggNumbers;
  const MAX_LEVEL = 200, MAX_PARTY_SIZE = 5;
  const EXACT_ATTACK_BUDGET = 120;
  const ENEMY_ID_RANGE = 1000000000;
  function nextEnemyId(state){const id=state.nextEnemyId||0;state.nextEnemyId=(id+1)%ENEMY_ID_RANGE;return id;}
  const incomeCache=new Map();
  const questLevel = (state,id=state.sessionId) => state.questActiveLevels?.[id] ?? state.questLevels?.[id] ?? 1;
  function sessionAtLevel(session,level) {
    const defense=session.defenseGrowth ? N.geometric(session.defense||0,session.defenseGrowth,level-1) : (session.defense||0)+(session.defensePerLevel||0)*(level-1);
    return {...session,level,defense,hp:N.geometric(session.hp,D.questGrowth.hpGrowth,level-1),reward:N.geometric(session.reward,D.questGrowth.rewardGrowth,level-1)};
  }
  function getSession(state,id=state.sessionId) {
    const session=D.sessions.find(item=>item.id===id);
    return session ? sessionAtLevel(session,questLevel(state,id)) : undefined;
  }
  function isQuestUnlocked(state,id){
    const quest=D.sessions.find(q=>q.id===id);
    return !!quest&&(!quest.unlockFactors||state.questUnlocks?.[id]===true||Number.isFinite(state.factors)&&state.factors>=quest.unlockFactors);
  }
  function refreshQuestUnlocks(state){
    state.questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,isQuestUnlocked(state,q.id)]));
  }
  function createState(now = Date.now()) {
    return { factors: D.balance.initialFactors, earned: 0, kills: 0, clicks: 0, totalDamage: 0,
      sessionId: D.sessions[0].id, hp: D.sessions[0].hp, poisonDamage:0, paused: false, options: {...D.displayDefaults},
      floorClipTargetId:null, floorClipSeconds:0, respawnSeconds:0, sessionStates:{}, enemies:null, nextEnemyId:0, focusedEnemyId:null,
      health:Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}])),
      formations: Object.fromEntries(D.sessions.map(s=>[s.id,null])),
      concentration: Object.fromEntries(D.sessions.map(q=>[q.id,Object.fromEntries(D.concentration.map(c=>[c.id,0]))])),
      questUnlocks: Object.fromEntries(D.sessions.map(q=>[q.id,!q.unlockFactors])),
      questActiveLevels: {},
      questLevels: Object.fromEntries(D.sessions.map(s=>[s.id,1])), sceneSeconds:0, batchHpFraction:0,batchDamageFraction:0,
      levels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionLevels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionPoints: Object.fromEntries(D.characters.map(c => [c.id, 0])), actionClock: 0, selectedCharacterId: null,
      purchasedPerks: Object.fromEntries(D.characters.map(c => [c.id, []])),
      upgrades: Object.fromEntries(D.upgrades.map(u => [u.id, 0])), savedAt: now };
  }
  const BATTLE_FIELDS=['hp','poisonDamage','batchHpFraction','batchDamageFraction','respawnSeconds','selectedCharacterId','enemies','nextEnemyId','focusedEnemyId','floorClipTargetId','floorClipSeconds'];
  const respawnDelay=()=>5;
  const isWaiting=state=>state.enemies?state.enemies.every(e=>e.respawnSeconds>0):(state.respawnSeconds||0)>0;
  function battleSnapshot(state){return Object.fromEntries(BATTLE_FIELDS.map(k=>[k,k==='enemies'?(state.enemies?structuredClone(state.enemies):null):state[k]??(['selectedCharacterId','focusedEnemyId','floorClipTargetId'].includes(k)?null:0)]));}
  function battleContext(state,id=state.sessionId){
    if(id===state.sessionId)return state;
    return {...state,floorClipTargetId:null,floorClipSeconds:0,hp:getSession(state,id).hp,poisonDamage:0,batchHpFraction:0,batchDamageFraction:0,respawnSeconds:0,selectedCharacterId:null,enemies:null,nextEnemyId:0,focusedEnemyId:null,
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
  function setFormation(state,questId,ids){
    if(!isQuestUnlocked(state,questId)||!Array.isArray(ids)||ids.length>MAX_PARTY_SIZE||new Set(ids).size!==ids.length||ids.some(id=>!D.characters.some(c=>c.id===id)||!state.levels[id]))return false;
    refreshQuestUnlocks(state);
    const rosters=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,q.id===questId?[...ids]:rosters[q.id].filter(id=>!ids.includes(id))]));
    for(const q of D.sessions){
      const ctx=battleContext(state,q.id);
      if(ctx.selectedCharacterId&&!isDeployed(ctx,ctx.selectedCharacterId))ctx.selectedCharacterId=null;
      normalizeEnemyActions(ctx);refreshFloorClip(ctx,rosters[q.id].join(',')!==formationIds(ctx).join(','));
      if(q.id!==state.sessionId)state.sessionStates={...state.sessionStates,[q.id]:battleSnapshot(ctx)};
    }
    return true;
  }
  const concentration=(state,id=state.sessionId)=>state.concentration?.[id]||Object.fromEntries(D.concentration.map(c=>[c.id,0]));
  function setConcentration(state,id,allocation){
    if(!D.sessions.some(q=>q.id===id)||!allocation||Object.keys(allocation).some(k=>!D.concentration.some(c=>c.id===k)))return false;
    if(D.concentration.some(c=>!Number.isInteger(allocation[c.id])||allocation[c.id]<0||allocation[c.id]>c.max)||Object.values(allocation).reduce((n,v)=>n+v,0)>10)return false;
    state.concentration={...state.concentration,[id]:{...allocation}};return true;
  }
  // Empty and incapacitated parties cannot bank enemy action points. Pending
  // attacks also end as soon as their original target leaves or falls.
  function normalizeEnemyActions(state,events){
    const active=activeCharacters(state);
    for(const [slot,e]of (state.enemies||[]).entries()){
      if(!active.length)e.actionPoints=0;
      if(e.pendingAttack&&(!active.length||!canAct(state,e.pendingAttack.targetId))){
        e.pendingAttack=null;if(events)events.push({type:'enemyCancel',enemyId:e.id,targetSlot:slot});
      }
    }
  }
  function perks(state, character) {
    return (character.perks || []).map(perk => {
      const level = (perk.levelType === 'action' ? state.actionLevels[character.id] : state.levels[character.id]) || 0;
      const owned=!!perk.initial || (state.purchasedPerks[character.id] || []).includes(perk.id);
      const unlocked = state.levels[character.id] > 0 && healthOf(state,character.id).status==='active' && level >= perk.level && owned;
      return { ...perk, owned, unlocked, eligible: state.levels[character.id] > 0 && level >= perk.level,
        dice: unlocked ? (perk.diceBonus || 0) + (perk.diceEvery ? Math.floor(effectivePowerLevel(state,character) / perk.diceEvery) : 0) : 0 };
    });
  }
  const areaApplies = (perk,session) => perk.areaAttack && (!perk.areaTrait || (session.traits||[]).includes(perk.areaTrait));
  const hasAreaAttack = (state, character, session=getSession(state)) => !!character && perks(state, character).some(p => p.unlocked && areaApplies(p,session));
  function attackBreakdown(state, character, manual = false, session = getSession(state)) {
    const active = character ? perks(state, character).filter(p => p.unlocked) : [];
    const replacement = active.find(p => p.baseAttack);
    const base = replacement?.baseAttack || character || { dice:D.balance.manualDice, flat:D.balance.manualFlat };
    const penetrationBlocked = active.some(p => p.ignoreDefense) && (session.traits||[]).includes('penetrationImmune');
    const ignoreDefense = active.some(p => p.ignoreDefense) && !penetrationBlocked;
    return {
      base:{ dice:base.dice, flat:base.flat, source:replacement?.name || '' },
      perk:{ dice:active.reduce((n,p) => n + p.dice, 0), flat:active.reduce((n,p) => n + (p.flat || 0), 0),
        conditional:active.reduce((n,p) => n + (p.targetTrait && (session.traits || []).includes(p.targetTrait) ? p.damageBonus || 0 : 0), 0) },
      upgrade:{ flat:character&&isDeployed(state,character.id)?concentration(state).attack:0, rate:0 },
      item:{ flat:0 },
      levelMultiplier:characterMultiplier(state, character),
      defense:ignoreDefense ? 0 : enemyDefense(session), ignoreDefense, penetrationBlocked,
      areaAttack:active.some(p => areaApplies(p,session)),
      defenseReduction:Math.max(0,...active.map(p=>p.defenseReduction||0)),
      apReductionRate:Math.max(0,...active.map(p=>p.apReductionRate||0)),
      accuracyPenaltyChance:Math.max(0,...active.map(p=>p.accuracyPenaltyChance||0)),
      accuracyPenalty:Math.max(0,...active.map(p=>p.accuracyPenalty||0)),
      extraAttackChance:Math.max(0,...active.map(p=>p.extraAttackChance||0)),
      poisonDamage:active.some(p=>p.inflictPoison)?Math.max(0,...active.map(p=>p.poisonDamage||0)):0
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
    return { dice:base.dice, flat:base.flat + (character?concentration(state).attack:0) };
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
    return canAct(state,id) ? Math.min(Number.MAX_SAFE_INTEGER, 1 + (state.actionLevels[id] || 0)) : 0;
  }
  function weaponScale(state, id) {
    const level = Math.max(1, Math.min(MAX_LEVEL, state.levels[id] || 0));
    return 1 + Math.log2(level) * D.balance.weaponSizePerDoubling;
  }
  function effectivePowerLevel(state,c){
    const base=c?state.levels[c.id]||0:1;
    if(!c||c.id==='max'||!canAct(state,c.id)||!canAct(state,'max'))return base;
    const max=D.characters.find(c=>c.id==='max');
    const target=state.selectedCharacterId===c.id||state.gmRecipientId===c.id;
    return base+(target&&perks(state,max).some(p=>p.unlocked&&p.sharePowerLevel)?state.levels.max:0);
  }
  const donatedProfile=(state,c)=>attackProfile({...state,gmRecipientId:c.id},c);
  const characterMultiplier = (state, character) => 1 + Math.max(0, effectivePowerLevel(state,character) - 1) * D.balance.characterDamagePerLevel;
  const enemyDefense = session => Math.max(0, Math.floor(session.defense || 0));
  function attackProfile(state, character, manual = false, session = getSession(state)) {
    const breakdown = attackBreakdown(state, character, manual, session), b = breakdown;
    return { dice:b.base.dice + b.perk.dice, flat:b.base.flat + b.perk.flat + b.upgrade.flat + b.item.flat,
      bonus:b.perk.conditional, multiplier:(1 + b.upgrade.rate) * b.levelMultiplier,
      defense:b.defense, ignoreDefense:b.ignoreDefense, penetrationBlocked:b.penetrationBlocked, areaAttack:b.areaAttack, extraAttackChance:b.extraAttackChance,poisonDamage:b.poisonDamage,defenseReduction:b.defenseReduction,apReductionRate:b.apReductionRate,accuracyPenaltyChance:b.accuracyPenaltyChance,accuracyPenalty:b.accuracyPenalty,
      minimumLevelBonus:character&&effectivePowerLevel(state,character)>1?1:0,preLevelMultiplier:1+b.upgrade.rate,
      overkillThreshold:state.upgrades.overkill ? D.upgrades.find(u=>u.id==='overkill').threshold : 0, breakdown };
  }
  const reward = (state, session = getSession(state)) => N.linear(session.reward,D.balance.rewardPerLevel,state.upgrades.reward);
  const overkillBonus = state => state.upgrades.overkill ? N.delta(reward(state) * D.upgrades.find(u=>u.id==='overkill').bonusRate) : 0;
  // Each repeatable purchase track has its own unrounded geometric curve.
  // Recompute from the level rather than multiplying an already rounded price.
  const geometricCost = (base, purchases, growth = D.balance.purchaseCostGrowth) => N.geometric(base,growth,purchases);
  function questCost(state,id=state.sessionId) {
    const session=D.sessions.find(s=>s.id===id),level=state.questLevels?.[id]??1;
    if(!session || !Number.isSafeInteger(level+1))return Infinity;
    const next=sessionAtLevel(session,level+1),cost=geometricCost(D.questGrowth.cost,level-1,D.questGrowth.costGrowth);
    return [next.hp,next.reward,cost].every(v=>Number.isFinite(v)&&v<=1e100)?cost:Infinity;
  }
  function applyQuestLevel(state,id,level,ctx,oldHP){
    state.questActiveLevels={...state.questActiveLevels,[id]:level};ctx.questActiveLevels=state.questActiveLevels;
    const maxHP=getSession(state,id).hp;
    for(const e of ctx.enemies)if(e.hp>0)e.hp=Math.max(1,Math.min(maxHP,N.floor(e.hp/oldHP*maxHP)));
    syncFront(ctx);ctx.batchHpFraction=0;
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
  function actionPower(state,c) {
    if(healthOf(state,c.id).status!=='active')return 0;
    const active=isDeployed(state,c.id)?supportPerks(state):[];
    const base=N.linear(c.action,D.balance.actionPerLevel,state.actionLevels[c.id]);
    const withAllies=base+active.reduce((n,p)=>n+(p.partyAction||0),0);
    const supported=state.selectedCharacterId===c.id ? N.linear(withAllies,active.reduce((n,p)=>n+(p.selectedActionRate||0),0),1) : withAllies;
    return isDeployed(state,c.id)?N.linear(supported,.1,concentration(state).action):supported;
  }
  const freeActionChance = (state,c) => isDeployed(state,c.id)&&state.selectedCharacterId===c.id ? Math.max(0,...supportPerks(state).map(p=>p.freeActionChance||0)) : 0;
  // A zero base has no meaningful relative multiplier; the UI shows absolute action power.
  const actionMultiplier = (state, c) => N.floor(c.action)>0 ? actionPower(state,c)/N.floor(c.action) : null;
  const attackRate = (state, c) => actionPower(state, c) / D.balance.actionThreshold;
  const isActionDonor = (state,c) => isDeployed(state,c.id) && perks(state,c).some(p=>p.unlocked&&p.transferAction) && transferTargets(state,c).length>0;
  const automaticActionRate = (state,c) => isDeployed(state,c.id) ? attackRate(state,c)/(1-freeActionChance(state,c)) : 0;
  function transferTargets(state,donor) {
    const others=D.characters.filter(c=>c.id!==donor.id&&canAct(state,c.id));
    const selected=others.find(c=>c.id===state.selectedCharacterId);
    return selected ? [selected] : others;
  }
  function donatedActionRate(state,c) {
    return D.characters.filter(d=>isActionDonor(state,d)).reduce((sum,d)=>{
      const targets=transferTargets(state,d);
      return sum+(targets.some(t=>t.id===c.id)?automaticActionRate(state,d)/targets.length:0);
    },0);
  }
  const effectiveAttackRate = (state,c) => !canAct(state,c.id)||isActionDonor(state,c) ? 0 :
    (automaticActionRate(state,c)+donatedActionRate(state,c))/(1-attackProfile(state,c).extraAttackChance);
  function performAutomaticAction(state,c,random,events) {
    if(!isActionDonor(state,c)){performAttack(state,c,attackProfile(state,c),random,events);return;}
    const targets=transferTargets(state,c);
    const target=targets.length===1?targets[0]:targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];
    const first=events?.length;
    // A donated action costs the recipient no points. Its reattack and poison
    // perks still apply; free-point rolls belong only to the donor's paid action.
    performAttack(state,target,donatedProfile(state,target),random,events);
    if(events?.[first]){events[first].maxTransfers=1;events[first].delegatedBy=c.id;}
  }
  const actionCost = (state, c) => geometricCost(c.actionCost, state.actionLevels[c.id]);
  const upgradeCost = (state, u) => geometricCost(u.cost, state.upgrades[u.id], D.balance.upgradeCostGrowth);
  function roll(dice, flat, random = Math.random, sides = 6) {
    let amount = flat;
    for (let i = 0; i < dice; i++) amount += 1 + Math.floor(random() * sides);
    return amount;
  }
  const healthOf=(state,id)=>state.health?.[id]||{hp:D.characters.find(c=>c.id===id).maxHP,status:'active',regenSeconds:0};
  const canAct=(state,id)=>isDeployed(state,id)&&healthOf(state,id).status==='active';
  function newEnemy(state,hp=getSession(state).hp,poisonDamage=0,respawnSeconds=0){
    return {id:nextEnemyId(state),hp,poisonDamage,respawnSeconds,actionPoints:0,pendingAttack:null,defensePenalty:0,accuracyPenalty:0};
  }
  function ensureEnemies(state){
    const count=(getSession(state).traits||[]).includes('swarm')?3:1;
    if(!Array.isArray(state.enemies)||state.enemies.length!==count){
      state.enemies=Array.from({length:count},(_,i)=>newEnemy(state,i?getSession(state).hp:state.hp,i?0:state.poisonDamage||0,i?0:state.respawnSeconds||0));
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
    state.respawnSeconds=target?0:Math.min(...state.enemies.map(e=>e.respawnSeconds));
  }
  function selectEnemy(state,id){
    if(id!==null&&(!(getSession(state).traits||[]).includes('swarm')||!livingEnemies(state).some(e=>e.id===id)))return false;
    state.focusedEnemyId=id;syncFront(state);return true;
  }
  function attackTargets(state,areaAttack,random){
    const es=livingEnemies(state);if(areaAttack||es.length<2)return es;
    return [es.find(e=>e.id===state.focusedEnemyId)||es[Math.min(es.length-1,Math.floor(random()*es.length))]];
  }
  function combatRoll(spec,random=Math.random){
    let total=spec.flat||0;const dice=[];
    for(let i=0;i<spec.dice;i++){
      let face;
      do{
        if(dice.length>=4096)throw new Error('対抗ロールの乱数が収束しません。');
        face=roll(1,0,random);dice.push(face);total+=face;
        if(face===1){const penalty=roll(1,0,random);total-=penalty;dice.push(-penalty);}
      }while(face===6);
    }
    return {total,dice,critical:dice.includes(6),fumble:dice.includes(1)};
  }
  function recoverAllies(state,seconds,events){
    for(const c of D.characters){
      if(!state.levels[c.id])continue;
      const h=state.health[c.id];
      if(h.hp>=c.maxHP){h.regenSeconds=0;continue;}
      h.regenSeconds+=seconds;
      const ticks=Math.floor((h.regenSeconds+1e-9)/D.balance.recoverySeconds);
      if(!ticks)continue;
      h.regenSeconds=Math.max(0,h.regenSeconds-ticks*D.balance.recoverySeconds);
      const before=h.hp;h.hp=Math.min(c.maxHP,h.hp+ticks*Math.max(1,N.floor(c.maxHP*.01)));
      if(h.hp===c.maxHP&&h.status!=='active'){h.status='active';if(events)events.push({type:'revive',actorId:c.id,hp:h.hp});}
      if(h.hp===c.maxHP)h.regenSeconds=0;
      if(events&&h.hp>before)events.push({type:'heal',actorId:c.id,amount:h.hp-before,hp:h.hp});
    }
  }
  const enemyAttackDuration=state=>getSession(state).attackSeconds||.72;
  function refreshFloorClip(state,force=false){
    if(!supportPerks(state).some(p=>p.protectLowestHP)){state.floorClipTargetId=null;state.floorClipSeconds=0;return;}
    if(!force&&state.floorClipSeconds>1e-9)return;
    const active=formationIds(state).filter(id=>canAct(state,id));
    state.floorClipTargetId=active.reduce((best,id)=>best===null||healthOf(state,id).hp<healthOf(state,best).hp?id:best,null);
    state.floorClipSeconds=10;
  }
  function enemyTargetCandidates(state){
    refreshFloorClip(state);
    const active=formationIds(state).map(id=>D.characters.find(c=>c.id===id)).filter(c=>canAct(state,c.id));
    return active.length<2?active:active.filter(c=>c.id!==state.floorClipTargetId);
  }
  function enemyActions(state,random,events){
    const session=getSession(state),spec=session.actionDice;
    if(!spec&&!session.action)return;
    if(!activeCharacters(state).length){normalizeEnemyActions(state,events);return;}
    for(const [slot,enemy]of ensureEnemies(state).entries()){
      if(enemy.respawnSeconds||enemy.hp<=0)continue;
      // Every living individual rolls its own fresh action dice each second.
      enemy.actionPoints+=spec?roll(spec.dice,spec.flat,random):session.action;
      if(enemy.pendingAttack||enemy.actionPoints<D.balance.actionThreshold)continue;
      enemy.actionPoints-=D.balance.actionThreshold;
      const targets=enemyTargetCandidates(state),target=targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];
      const duration=enemyAttackDuration(state);
      enemy.pendingAttack={targetId:target.id,remaining:duration};
      if(events)events.push({type:'enemyWindup',targetId:target.id,enemyId:enemy.id,targetSlot:slot,duration});
    }
  }
  function evasionSpec(state,c,mental=false){
    const base=mental?c.ss:c.evasion,extra=!mental&&isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>n+(p.partyEvasionDice||0),0):0;
    const own=perks(state,c).filter(p=>p.unlocked).reduce((n,p)=>n+(p.evasionBonus||0),0);
    const party=isDeployed(state,c.id)?supportPerks(state).reduce((n,p)=>n+(p.partyEvasionBonus||0),0):0;
    return {...base,flat:base.flat+own+party+(isDeployed(state,c.id)?concentration(state).reaction:0),dice:base.dice+extra};
  }
  function enemyAttackSpec(state){
    const attack=getSession(state).attack;
    return attack?{...attack,sides:Math.min(6,...supportPerks(state).map(p=>p.enemyDamageSides||6))}:null;
  }
  function resolveEnemyAttack(state,enemy,slot,random,events){
    const pending=enemy.pendingAttack;enemy.pendingAttack=null;
    if(!pending||enemy.hp<=0||enemy.respawnSeconds||!canAct(state,pending.targetId)){
      if(events&&pending)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});return;
    }
    const session=getSession(state),c=D.characters.find(c=>c.id===pending.targetId),h=state.health[c.id];
    const mental=session.attackType==='mental',bonus=concentration(state);
    const accuracySpec={...(mental?session.ss:session.accuracy)};
    const accuracyPenalty=enemy.accuracyPenalty||0;accuracySpec.flat-=accuracyPenalty;enemy.accuracyPenalty=0;
    let accuracy=combatRoll(accuracySpec,random),evasion;
    const accuracyReroll=!!state.upgrades.reversal&&accuracy.critical;
    if(accuracyReroll){const original=accuracy;accuracy={...combatRoll(accuracySpec,random),original};}
    const evasionDice=evasionSpec(state,c,mental);
    evasion=combatRoll(evasionDice,random);
    const evasionReroll=!!state.upgrades.retake&&evasion.fumble;
    if(evasionReroll){const original=evasion;evasion={...combatRoll(evasionDice,random),original};}
    const nullifyChance=Math.max(0,...perks(state,c).filter(p=>p.unlocked).map(p=>p.nullifyChance||0));
    const nullified=nullifyChance>0&&random()<nullifyChance;
    const hit=!nullified&&accuracy.total>evasion.total,before=h.hp;
    const attack=enemyAttackSpec(state);
    let damage=hit?Math.max(1,roll(attack.dice,attack.flat,random,attack.sides)-bonus.defense-(mental?c.resistance||0:c.defense||0)):0,badLuck=false,fightingSpirit=false;
    if(hit){
      if(before-damage<=0&&state.upgrades.badLuck&&random()<.3){damage=Math.max(1,Math.floor(damage/2));badLuck=true;}
      if(before-damage<=0&&state.upgrades.fightingSpirit&&random()<.3){h.hp=1;h.status='active';fightingSpirit=true;}
      else {h.hp-=damage;if(h.hp<0)h.status='dying';else if(h.hp<4&&random()<.5)h.status='unconscious';}
      if(before===c.maxHP)h.regenSeconds=0;
    }
    if(events)events.push({type:'enemyAttack',targetId:c.id,enemyId:enemy.id,targetSlot:slot,accuracy,evasion,accuracyReroll,evasionReroll,mental,hit,nullified,accuracyPenalty,damage,badLuck,fightingSpirit,hpBefore:before,hpAfter:h.hp,status:h.status});
    normalizeEnemyActions(state,events);
  }

  function clearEnemy(state,enemy,slot,overkill,reason,events){
    const bonus=overkill?overkillBonus(state):0,gain=reward(state)+bonus;
    state.factors+=gain;refreshQuestUnlocks(state);state.earned+=gain;state.kills++;
    if(events)events.push({type:'clear',reward:gain,overkillBonus:bonus,overkills:overkill?1:0,reason,targetSlot:slot,enemyId:enemy.id,hpAfter:state.hp});
  }
  const targetDefense=(profile,enemy)=>profile.ignoreDefense?0:Math.max(0,profile.defense-Math.max(enemy?.defensePenalty||0,profile.defenseReduction||0));
  function attackDamage(profile,enemy,amount){
    const mitigated=N.mitigate(amount,targetDefense(profile,enemy));
    return profile.areaAttack?Math.max(1,N.floor(mitigated/2)):mitigated;
  }
  function applyHitEffects(enemy,profile,count,random){
    enemy.defensePenalty=Math.max(enemy.defensePenalty||0,profile.defenseReduction||0);
    // AP is an integer gauge; repeated reductions stop as soon as it is empty.
    if(profile.apReductionRate)for(let i=0;i<count&&enemy.actionPoints>0;i++)enemy.actionPoints=Math.max(0,enemy.actionPoints-N.delta(enemy.actionPoints*profile.apReductionRate));
    const chance=profile.accuracyPenaltyChance||0;
    if(chance&&random()<(count===1?chance:-Math.expm1(count*Math.log1p(-chance))))enemy.accuracyPenalty=Math.max(enemy.accuracyPenalty||0,profile.accuracyPenalty);
  }
  function applyDamage(state,amount,events,actor,actorId,random,profile,extraAttack=false,chosenTargets=null){
    if(isWaiting(state))return;
    const enemies=ensureEnemies(state),targets=chosenTargets||attackTargets(state,profile.areaAttack,random);
    for(const [targetIndex,enemy]of targets.entries()){
      const slot=enemies.indexOf(enemy);applyHitEffects(enemy,profile,1,random);
      const damage=attackDamage(profile,enemy,amount);
      if(profile.poisonDamage)enemy.poisonDamage=Math.max(enemy.poisonDamage,profile.poisonDamage);
      const hit=(damage,poisonTick=false)=>{
        const before=enemy.hp;state.totalDamage+=Math.min(before,damage);enemy.hp=Math.max(0,before-damage);
        const knockoutRoll=enemy.hp>0&&enemy.hp<=D.balance.knockoutHP?roll(1,0,random):null;
        const knockedOut=knockoutRoll!==null&&knockoutRoll%2===1;
        if(events)events.push({type:'attack',actor:poisonTick?'猛毒':actor,actorId:poisonTick?null:actorId,damage,hpBefore:before,hpAfter:enemy.hp,
          targetSlot:slot,enemyId:enemy.id,areaAttack:!!profile.areaAttack,continuation:targetIndex>0,extraAttack,poisonTick,knockoutRoll,knockedOut});
        if(!enemy.hp||knockedOut){
          clearEnemy(state,enemy,slot,!poisonTick&&profile.overkillThreshold>0&&damage-before>=profile.overkillThreshold,knockedOut?'knockout':'hp',events);
          if(enemy.pendingAttack&&events)events.push({type:'enemyCancel',enemyId:enemy.id,targetSlot:slot});
          enemy.hp=0;enemy.poisonDamage=0;enemy.respawnSeconds=respawnDelay(state);enemy.actionPoints=0;enemy.pendingAttack=null;enemy.defensePenalty=0;enemy.accuracyPenalty=0;
          if(state.focusedEnemyId===enemy.id)state.focusedEnemyId=null;return true;
        }
        return false;
      };
      if(!hit(damage)&&enemy.poisonDamage)hit(enemy.poisonDamage,true);
    }
    syncFront(state);
    if(events){const last=events.at(-1);if(last)last.frontHP=state.hp;}
  }
  // Inverse sampling keeps reattack/free-action chains bounded even with a
  // deterministic test RNG; damage and opposed checks still roll real dice.
  function chainAttackCount(chance,random=Math.random){
    if(!(chance>0&&chance<1))return 1;
    const u=Math.max(0,Math.min(1-Number.EPSILON/2,random()));
    return 1+Math.floor(Math.log1p(-u)/Math.log(chance));
  }
  function performAttack(state,character,profile,random,events){
    const count=chainAttackCount(profile.extraAttackChance,random);
    for(let i=0;i<count&&!isWaiting(state);i++)applyDamage(state,B.rolledDamage(profile,roll(profile.dice,profile.flat,random)+profile.bonus),events,character?character.name:'あなた',character?.id||null,random,profile,i>0);
  }
  function click(state,random=Math.random){
    if(state.paused||isWaiting(state))return [];
    const character=selectedCharacter(state);
    if(character&&!canAct(state,character.id))return [];
    // Unassigned manual attacks remain available to bootstrap the first hire.
    state.clicks++;const events=[];performAttack(state,character,attackProfile(state,character,true),random,events);return events;
  }
  function chargeActions(state,c,ticks){
    const total=state.actionPoints[c.id]+actionPower(state,c)*ticks,threshold=D.balance.actionThreshold;
    const count=Math.floor(total/threshold);state.actionPoints[c.id]=total%threshold;return count;
  }
  function repeatAverageHits(state,c,profile,count,events,random){
    const amount=B.rolledDamage(profile,profile.dice*3.5+profile.flat+profile.bonus);
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
            if(events)events.push({type:'attack',actor:c.name,actorId:c.id,count:skip,damage,hpBefore:before,hpAfter:e.hp,enemyId:e.id,targetSlot:state.enemies.indexOf(e),continuation:profile.areaAttack&&e!==cycleTargets[0],areaAttack:profile.areaAttack,approximate:true});}
          left-=skip*cycle;syncFront(state);
        }
      }
      // Select the same sampled target for this boundary hit without changing focus.
      applyDamage(state,amount,events,c.name,c.id,random,profile,false,targets);left--;
    }
  }
  function automaticTick(state,random,events){
    for(const c of activeCharacters(state)){
      if(isWaiting(state))break;
      const count=chargeActions(state,c,1);if(!count)continue;
      const profile=attackProfile(state,c),estimate=count/(1-freeActionChance(state,c))/(1-profile.extraAttackChance);
      if(estimate>EXACT_ATTACK_BUDGET){
        if(isActionDonor(state,c)){
          const donorActions=Math.floor(count/(1-freeActionChance(state,c))),targets=transferTargets(state,c);for(const [i,t]of targets.entries()){
            const actions=Math.floor(donorActions/targets.length)+(i<donorActions%targets.length?1:0),p=donatedProfile(state,t);
            repeatAverageHits(state,t,p,Math.floor(actions/(1-p.extraAttackChance)),events,random);
          }
          if(events)events.push({type:'support',actor:c.name,actorId:c.id,maxTransfers:donorActions,count:donorActions,hpBefore:state.hp,hpAfter:state.hp,approximate:true});
        }else repeatAverageHits(state,c,profile,Math.floor(estimate),events,random);
      }else for(let i=0;i<count&&!isWaiting(state);i++)for(let n=chainAttackCount(freeActionChance(state,c),random);n>0&&!isWaiting(state);n--)performAutomaticAction(state,c,random,events);
    }
    enemyActions(state,random,events);
  }
  function advance(state,seconds,random=Math.random,collectEvents=true){
    if(state.paused||seconds<=0)return [];
    const duration=Math.min(seconds,D.maxOfflineSeconds),clock=state.actionClock,events=collectEvents?[]:null;
    state.health||=Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}]));
    const contexts=D.sessions.filter(q=>{const ctx=battleContext(state,q.id);return formationIds(state,q.id).length||isWaiting(ctx)||ctx.enemies?.some(e=>e.respawnSeconds>0||e.pendingAttack);}).map(q=>battleContext(state,q.id));
    for(const ctx of contexts){normalizeEnemyActions(ctx,events?{push:e=>events.push({...e,sessionId:ctx.sessionId})}:null);refreshFloorClip(ctx);}
    const ticks=Math.floor(clock+duration+1e-10);let previous=0;
    function elapse(dt){
      // Resolve sub-second impacts and respawns in chronological order. The
      // same boundaries are used by live, background and offline simulation.
      let remaining=dt;
      while(remaining>1e-10){
        const timers=contexts.flatMap(ctx=>ensureEnemies(ctx).flatMap(e=>[e.respawnSeconds||Infinity,e.pendingAttack?.remaining??Infinity]));
        const step=Math.min(remaining,...timers,...contexts.map(ctx=>ctx.floorClipSeconds||Infinity));recoverAllies(state,step,events);remaining=Math.max(0,remaining-step);
        for(const ctx of contexts){
          const local=collectEvents?[]:null;
          ctx.floorClipSeconds=Math.max(0,(ctx.floorClipSeconds||0)-step);
          for(const [slot,e]of ensureEnemies(ctx).entries()){
            if(e.respawnSeconds>0){e.respawnSeconds=Math.max(0,e.respawnSeconds-step);
              if(e.respawnSeconds<1e-9){Object.assign(e,newEnemy(ctx));if(local)local.push({type:'enemyRespawn',targetSlot:slot,enemyId:e.id});}
            }else if(e.pendingAttack){e.pendingAttack.remaining=Math.max(0,e.pendingAttack.remaining-step);
              if(e.pendingAttack.remaining<1e-9)resolveEnemyAttack(ctx,e,slot,random,local);
            }
          }
          syncFront(ctx);refreshFloorClip(ctx);if(events)events.push(...local.map(e=>({...e,sessionId:ctx.sessionId})));
        }
      }
    }
    for(let tick=1;tick<=ticks;tick++){
      const at=tick-clock;elapse(at-previous);previous=at;
      for(const ctx of contexts){
        if(isWaiting(ctx)||!activeCharacters(ctx).length)continue;
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
    refreshQuestUnlocks(state);
    return events||[];
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
    refreshQuestUnlocks(state);
    state.factors -= cost;
    if (state.levels[id] === 0) state.actionPoints[id] = 0;
    state.levels[id]++;
    return true;
  }
  function buyPerk(state, characterId, perkId) {
    const character = D.characters.find(c => c.id === characterId);
    if (!character) return false;
    const perk = perks(state, character).find(p => p.id === perkId);
    if (!perk || !perk.eligible || perk.owned || state.factors < perk.cost) return false;
    refreshQuestUnlocks(state);
    state.factors -= perk.cost;
    state.purchasedPerks[characterId].push(perkId);
    return true;
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
  function buyAction(state, id) {
    const c = D.characters.find(item => item.id === id);
    // No game-level cap. Only reject values JavaScript cannot represent exactly.
    if (!c || !state.levels[id] || !Number.isSafeInteger(state.actionLevels[id] + 1)) return false;
    const cost = actionCost(state, c);
    if (!Number.isFinite(cost) || state.factors < cost) return false;
    refreshQuestUnlocks(state);
    state.factors -= cost;
    state.actionLevels[id]++;
    return true;
  }
  // All quotes are calculated from the same independently rounded prices as
  // single purchases. A bulk purchase commits only if every step is affordable.
  function tradeTrack(state,kind,id) {
    const c=D.characters.find(c=>c.id===id),u=D.upgrades.find(u=>u.id===id);
    if(kind==='power'&&c)return {field:'levels',minimum:1,buy:hire,cost:s=>hireCost(s,c)};
    if(kind==='action'&&c)return {field:'actionLevels',minimum:0,buy:buyAction,cost:s=>actionCost(s,c)};
    if(kind==='upgrade'&&u)return {field:'upgrades',minimum:0,buy:buyUpgrade,cost:s=>upgradeCost(s,u)};
    if(kind==='quest'&&D.sessions.some(q=>q.id===id))return {field:'questLevels',minimum:1,buy:buyQuest,cost:s=>questCost(s,id)};
    return null;
  }
  function tradeDraft(state) { return {...state,levels:{...state.levels},actionLevels:{...state.actionLevels},upgrades:{...state.upgrades},questLevels:{...state.questLevels},questActiveLevels:{...state.questActiveLevels},sessionStates:structuredClone(state.sessionStates),enemies:state.enemies?structuredClone(state.enemies):null,health:structuredClone(state.health)}; }
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
  function saleQuote(state,kind,id) {
    const track=tradeTrack(state,kind,id);
    if(!track||kind==='quest'&&!isQuestUnlocked(state,id)||state[track.field][id]<=track.minimum)return {valid:false,refund:0};
    const draft=tradeDraft(state);draft[track.field][id]--;
    const price=track.cost(draft),refund=Math.max(1,N.floor(price*.5));
    return {valid:Number.isFinite(price)&&state.factors+refund<=1e100,refund,from:state[track.field][id],to:draft[track.field][id]};
  }
  function sell(state,kind,id) {
    const quote=saleQuote(state,kind,id);if(!quote.valid)return false;
    const track=tradeTrack(state,kind,id),ctx=kind==='quest'?battleContext(state,id):null,oldHP=ctx?getSession(ctx).hp:0,active=ctx?questLevel(state,id):0;
    if(ctx)ensureEnemies(ctx);
    state[track.field][id]--;state.factors+=quote.refund;refreshQuestUnlocks(state);
    if(ctx&&active>state.questLevels[id])applyQuestLevel(state,id,state.questLevels[id],ctx,oldHP);
    return true;
  }
  function selectSession(state,id){
    if(!isQuestUnlocked(state,id)||state.sessionId===id)return false;
    refreshQuestUnlocks(state);
    const next=battleContext(state,id),previous=state.sessionId;
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.sessionStates={...state.sessionStates,[previous]:battleSnapshot(state)};
    delete state.sessionStates[id];
    Object.assign(state,battleSnapshot(next));state.sessionId=id;
    if(state.selectedCharacterId&&!isDeployed(state,state.selectedCharacterId))state.selectedCharacterId=null;
    return true;
  }
  function profileAverage(state,p){
    const live=(state.enemies||[]).filter(e=>e.hp>0&&!e.respawnSeconds),focused=live.find(e=>e.id===state.focusedEnemyId);
    const targets=p.areaAttack?live:focused?[focused]:live;
    if(!targets.length)return B.averageDamage({...p,defense:targetDefense(p,null)})*(p.areaAttack?3:1);
    const total=targets.reduce((n,e)=>n+B.averageDamage({...p,defense:targetDefense(p,e)}),0);
    return p.areaAttack?total:total/targets.length;
  }
  const averageAttackDamage=(state,c)=>profileAverage(state,attackProfile(state,c));
  function characterMetrics(state,c){
    const normal=automaticActionRate(state,c),donated=donatedActionRate(state,c),p=donatedProfile(state,c);
    const direct=averageAttackDamage(state,c),gift=profileAverage(state,p);
    const damage=normal+donated?(direct*normal+gift*donated)/(normal+donated):direct,uptime=combatUptime(state),attacksPerSecond=effectiveAttackRate(state,c)*uptime;
    return {damage,attacksPerSecond,dps:damage*attacksPerSecond,action:actionPower(state,c),transfersPerSecond:isActionDonor(state,c)?automaticActionRate(state,c)*uptime:0};
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
    const key=JSON.stringify([q.id,q.hp,q.reward,q.defense,q.traits,q.action,q.actionDice,q.attack,q.accuracy,q.ss,q.attackType,concentration(state),ids,state.levels,state.actionLevels,state.upgrades,state.purchasedPerks,ids.includes('max')?state.selectedCharacterId:null]);
    if(incomeCache.has(key))return incomeCache.get(key);
    const sample=structuredClone(state);sample.paused=false;sample.enemies=null;sample.hp=q.hp;sample.poisonDamage=0;sample.respawnSeconds=0;sample.focusedEnemyId=null;sample.nextEnemyId=0;
    sample.formations=Object.fromEntries(D.sessions.map(s=>[s.id,s.id===q.id?ids:[]]));sample.sessionStates={};sample.actionClock=0;sample.forecastTicks=0;
    sample.actionPoints=Object.fromEntries(D.characters.map(c=>[c.id,0]));sample.health=Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}]));
    sample.factors=0;sample.earned=0;sample.kills=0;sample.totalDamage=0;
    let seed=0x143fa53;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    advance(sample,600,random,false);
    // Credit unfinished HP progress in the forecast, never in the real balance.
    const progress=isWaiting(sample)?0:(sample.enemies||[]).reduce((n,e)=>n+(e.hp>0?(q.hp-e.hp)/q.hp:0),0);
    const perClear=reward(state),result=Object.freeze({clearsPerSecond:(sample.kills+progress)/600,reward:perClear,bonusPerSecond:(sample.earned-sample.kills*perClear)/600,factorsPerSecond:(sample.earned+progress*perClear)/600,approximate:true,combatUptime:sample.forecastTicks/600});
    if(incomeCache.size>=32)incomeCache.delete(incomeCache.keys().next().value);incomeCache.set(key,result);return result;
  }
  function revivalCost(state,id){
    const c=D.characters.find(c=>c.id===id);if(!c||!state.levels[id])return Infinity;
    const power=Math.max(0,state.levels[id]-1),action=state.actionLevels[id];let spent=0;
    // Finite current-level investment, using the same rounded purchase prices.
    for(const [base,count]of [[c.powerCost,power],[c.actionCost,action]]){
      if(count&&!Number.isFinite(geometricCost(base,count-1)))return Infinity;
      if(count&&geometricCost(base,count-1)>1e100)return Infinity;
      for(let level=0;level<count;level++){spent+=geometricCost(base,level);if(spent>1e101)return Infinity;}
    }
    const cost=c.cost+N.delta(spent*.1);return Number.isFinite(cost)&&cost<=1e100?cost:Infinity;
  }
  function revive(state,id){
    const cost=revivalCost(state,id),h=state.health?.[id],c=D.characters.find(c=>c.id===id);
    if(!c||!h||h.status==='active'||!Number.isFinite(cost)||state.factors<cost)return false;
    refreshQuestUnlocks(state);
    state.factors-=cost;h.hp=c.maxHP;h.status='active';h.regenSeconds=0;return true;
  }
  const api = { enemyTargetCandidates, targetDefense, effectivePowerLevel, evasionSpec, enemyAttackSpec, setQuestLevel, isQuestUnlocked, refreshQuestUnlocks, concentration, setConcentration, normalizeEnemyActions, livingEnemies, selectEnemy, enemyAttackDuration, revivalCost, revive, healthOf, canAct, ensureEnemies, combatRoll, battleContext, battleSnapshot, respawnDelay, isWaiting, formationOwner, totalDps, totalIncome, combatUptime, MAX_PARTY_SIZE, formationIds, isDeployed, activeCharacters, setFormation, averageAttackDamage, characterMetrics, isActionDonor, automaticActionRate, MAX_LEVEL, createState, getSession, questLevel, sessionAtLevel, questCost, buyQuest, purchaseQuote, buyMany, saleQuote, sell, perks, hasAreaAttack, stats, manualStats, selectedCharacter, selectCharacter, sawCount, bombCount, weaponScale, characterMultiplier, enemyDefense, attackBreakdown, attackProfile, reward, overkillBonus, hireCost, actionPower, freeActionChance, actionMultiplier, attackRate, effectiveAttackRate, chainAttackCount, actionCost, upgradeCost, roll, click, advance, catchUp, hire, buyAction, buyPerk, buyUpgrade, selectSession, dps, characterDps, expectedIncome };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
