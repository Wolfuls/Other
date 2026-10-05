(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.YggData;
  const B = typeof module !== 'undefined' && module.exports ? require('./battle-batch.js') : root.YggBatch;
  const N = typeof module !== 'undefined' && module.exports ? require('./numbers.js') : root.YggNumbers;
  const MAX_LEVEL = 200, MAX_PARTY_SIZE = 5;
  const EXACT_ATTACK_BUDGET = 1200;
  let incomeKey, incomeValue;
  const questLevel = (state,id=state.sessionId) => state.questLevels?.[id] ?? 1;
  function sessionAtLevel(session,level) {
    const defense=session.defenseGrowth ? N.geometric(session.defense||0,session.defenseGrowth,level-1) : (session.defense||0)+(session.defensePerLevel||0)*(level-1);
    return {...session,level,defense,hp:N.geometric(session.hp,D.questGrowth.hpGrowth,level-1),reward:N.geometric(session.reward,D.questGrowth.rewardGrowth,level-1)};
  }
  function getSession(state,id=state.sessionId) {
    const session=D.sessions.find(item=>item.id===id);
    return session ? sessionAtLevel(session,questLevel(state,id)) : undefined;
  }
  function createState(now = Date.now()) {
    return { factors: D.balance.initialFactors, earned: 0, kills: 0, clicks: 0, totalDamage: 0,
      sessionId: D.sessions[0].id, hp: D.sessions[0].hp, poisonDamage:0, paused: false, boostSeconds: 0, options: {...D.displayDefaults},
      respawnSeconds:0, sessionStates:{},
      formations: Object.fromEntries(D.sessions.map(s=>[s.id,null])),
      questLevels: Object.fromEntries(D.sessions.map(s=>[s.id,1])), sceneSeconds:0, batchHpFraction:0,batchDamageFraction:0,
      levels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionLevels: Object.fromEntries(D.characters.map(c => [c.id, 0])),
      actionPoints: Object.fromEntries(D.characters.map(c => [c.id, 0])), actionClock: 0, selectedCharacterId: null,
      purchasedPerks: Object.fromEntries(D.characters.map(c => [c.id, []])),
      upgrades: Object.fromEntries(D.upgrades.map(u => [u.id, 0])), savedAt: now };
  }
  const BATTLE_FIELDS=['hp','poisonDamage','batchHpFraction','batchDamageFraction','respawnSeconds','selectedCharacterId'];
  const respawnDelay=state=>(getSession(state).traits||[]).includes('swarm')?0:5;
  const isWaiting=state=>(state.respawnSeconds||0)>0;
  function battleSnapshot(state){return Object.fromEntries(BATTLE_FIELDS.map(k=>[k,state[k]??(k==='selectedCharacterId'?null:0)]));}
  function battleContext(state,id=state.sessionId){
    if(id===state.sessionId)return state;
    return {...state,hp:getSession(state,id).hp,poisonDamage:0,batchHpFraction:0,batchDamageFraction:0,respawnSeconds:0,selectedCharacterId:null,
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
  const activeCharacters=state=>D.characters.filter(c=>isDeployed(state,c.id));
  function setFormation(state,questId,ids){
    if(!D.sessions.some(q=>q.id===questId)||!Array.isArray(ids)||ids.length>MAX_PARTY_SIZE||new Set(ids).size!==ids.length||ids.some(id=>!D.characters.some(c=>c.id===id)||!state.levels[id]||(formationOwner(state,id)&&formationOwner(state,id)!==questId)))return false;
    // Freeze implicit rosters before modifying ownership or changing the view.
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,q.id===questId?[...ids]:formationIds(state,q.id)]));
    const ctx=battleContext(state,questId);
    if(ctx.selectedCharacterId&&!ids.includes(ctx.selectedCharacterId))ctx.selectedCharacterId=null;
    if(questId!==state.sessionId)state.sessionStates={...state.sessionStates,[questId]:battleSnapshot(ctx)};
    return true;
  }
  function perks(state, character) {
    return (character.perks || []).map(perk => {
      const level = (perk.levelType === 'action' ? state.actionLevels[character.id] : state.levels[character.id]) || 0;
      const owned=!!perk.initial || (state.purchasedPerks[character.id] || []).includes(perk.id);
      const unlocked = state.levels[character.id] > 0 && level >= perk.level && owned;
      return { ...perk, owned, unlocked, eligible: state.levels[character.id] > 0 && level >= perk.level,
        dice: unlocked ? (perk.diceBonus || 0) + (perk.diceEvery ? Math.floor(level / perk.diceEvery) : 0) : 0 };
    });
  }
  const overflowApplies = (perk,session) => perk.overflow && (!perk.overflowTrait || (session.traits||[]).includes(perk.overflowTrait));
  const hasOverflow = (state, character, session=getSession(state)) => !!character && perks(state, character).some(p => p.unlocked && overflowApplies(p,session));
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
      upgrade:{ flat:state.upgrades.click * D.balance.concentrationPerLevel, rate:0 },
      spe:{ rate:state.boostSeconds > 0 ? D.balance.boostDamageBonus : 0 },
      item:{ flat:0 },
      levelMultiplier:characterMultiplier(state, character),
      defense:ignoreDefense ? 0 : enemyDefense(session), ignoreDefense, penetrationBlocked,
      overflow:active.some(p => overflowApplies(p,session)), overflowDefense:ignoreDefense?0:enemyDefense(session),
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
    return { dice:base.dice, flat:base.flat + state.upgrades.click * D.balance.concentrationPerLevel };
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
    return isDeployed(state,id) ? Math.min(Number.MAX_SAFE_INTEGER, 1 + (state.actionLevels[id] || 0)) : 0;
  }
  function weaponScale(state, id) {
    const level = Math.max(1, Math.min(MAX_LEVEL, state.levels[id] || 0));
    return 1 + Math.log2(level) * D.balance.weaponSizePerDoubling;
  }
  const multiplier = state => state.boostSeconds > 0 ? 1 + D.balance.boostDamageBonus : 1;
  const characterMultiplier = (state, character) => 1 + Math.max(0, (character ? state.levels[character.id] : 1) - 1) * D.balance.characterDamagePerLevel;
  const enemyDefense = session => Math.max(0, Math.floor(session.defense || 0));
  function attackProfile(state, character, manual = false, session = getSession(state)) {
    const breakdown = attackBreakdown(state, character, manual, session), b = breakdown;
    return { dice:b.base.dice + b.perk.dice, flat:b.base.flat + b.perk.flat + b.upgrade.flat + b.item.flat,
      bonus:b.perk.conditional, multiplier:(1 + b.upgrade.rate) * (1 + b.spe.rate) * b.levelMultiplier,
      defense:b.defense, ignoreDefense:b.ignoreDefense, penetrationBlocked:b.penetrationBlocked, overflow:b.overflow, overflowDefense:b.overflowDefense, extraAttackChance:b.extraAttackChance,poisonDamage:b.poisonDamage,
      minimumLevelBonus:character&&state.levels[character.id]>1?1:0,preLevelMultiplier:(1+b.upgrade.rate)*(1+b.spe.rate),
      overkillThreshold:state.upgrades.overkill ? D.upgrades.find(u=>u.id==='overkill').threshold : 0, breakdown };
  }
  const reward = (state, session = getSession(state)) => N.linear(session.reward,D.balance.rewardPerLevel,state.upgrades.reward);
  const overkillBonus = state => state.upgrades.overkill ? N.delta(reward(state) * D.upgrades.find(u=>u.id==='overkill').bonusRate) : 0;
  // Each repeatable purchase track has its own unrounded geometric curve.
  // Recompute from the level rather than multiplying an already rounded price.
  const geometricCost = (base, purchases, growth = D.balance.purchaseCostGrowth) => N.geometric(base,growth,purchases);
  function questCost(state,id=state.sessionId) {
    const session=D.sessions.find(s=>s.id===id),level=questLevel(state,id);
    if(!session || !Number.isSafeInteger(level+1))return Infinity;
    const next=sessionAtLevel(session,level+1),cost=geometricCost(D.questGrowth.cost,level-1,D.questGrowth.costGrowth);
    return [next.hp,next.reward,cost].every(v=>Number.isFinite(v)&&v<=1e100)?cost:Infinity;
  }
  function buyQuest(state,id) {
    const cost=questCost(state,id),previous=getSession(state,id);
    if(!previous || !Number.isFinite(cost) || state.factors<cost)return false;
    state.factors-=cost;
    state.questLevels ||= Object.fromEntries(D.sessions.map(s=>[s.id,1]));
    state.questLevels[id]=previous.level+1;
    // Preserve the current enemy's remaining-health proportion when investing.
    const ctx=battleContext(state,id);ctx.batchHpFraction=0;
    if(!isWaiting(ctx))ctx.hp=Math.min(getSession(state,id).hp,ctx.hp+N.delta(ctx.hp/previous.hp*(getSession(state,id).hp-previous.hp)));
    if(id!==state.sessionId)state.sessionStates={...state.sessionStates,[id]:battleSnapshot(ctx)};
    return true;
  }
  const hireCost = (state, c) => state.levels[c.id] === 0 ? c.cost
    : geometricCost(c.powerCost, state.levels[c.id] - 1);
  function supportPerks(state) {
    const max = D.characters.find(c=>c.id==='max');
    return isDeployed(state,'max') ? perks(state,max).filter(p=>p.unlocked) : [];
  }
  function actionPower(state,c) {
    const active=isDeployed(state,c.id)?supportPerks(state):[];
    const base=N.floor(c.action)+D.balance.actionPerLevel*state.actionLevels[c.id]+D.balance.speedPerLevel*state.upgrades.power;
    const withAllies=base+(c.id==='max'?0:active.reduce((n,p)=>n+(p.allyAction||0),0));
    return state.selectedCharacterId===c.id ? N.linear(withAllies,active.reduce((n,p)=>n+(p.selectedActionRate||0),0),1) : withAllies;
  }
  const freeActionChance = (state,c) => isDeployed(state,c.id)&&state.selectedCharacterId===c.id ? Math.max(0,...supportPerks(state).map(p=>p.freeActionChance||0)) : 0;
  // A zero base has no meaningful relative multiplier; the UI shows absolute action power.
  const actionMultiplier = (state, c) => N.floor(c.action)>0 ? actionPower(state,c)/N.floor(c.action) : null;
  const attackRate = (state, c) => actionPower(state, c) / D.balance.actionThreshold;
  const isActionDonor = (state,c) => isDeployed(state,c.id) && perks(state,c).some(p=>p.unlocked&&p.transferAction);
  const automaticActionRate = (state,c) => isDeployed(state,c.id) ? attackRate(state,c)/(1-freeActionChance(state,c)) : 0;
  function transferTargets(state,donor) {
    const others=D.characters.filter(c=>c.id!==donor.id&&isDeployed(state,c.id));
    const selected=others.find(c=>c.id===state.selectedCharacterId);
    return selected ? [selected] : others;
  }
  function donatedActionRate(state,c) {
    return D.characters.filter(d=>isActionDonor(state,d)).reduce((sum,d)=>{
      const targets=transferTargets(state,d);
      return sum+(targets.some(t=>t.id===c.id)?automaticActionRate(state,d)/targets.length:0);
    },0);
  }
  const effectiveAttackRate = (state,c) => !isDeployed(state,c.id)||isActionDonor(state,c) ? 0 :
    (automaticActionRate(state,c)+donatedActionRate(state,c))/(1-attackProfile(state,c).extraAttackChance);
  function performAutomaticAction(state,c,random,events) {
    if(!isActionDonor(state,c)){performAttack(state,c,attackProfile(state,c),random,events);return;}
    const targets=transferTargets(state,c);
    if(!targets.length){
      if(events)events.push({type:'support',actor:c.name,actorId:c.id,maxTransfers:1,hpBefore:state.hp,hpAfter:state.hp});
      return;
    }
    const target=targets.length===1?targets[0]:targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];
    const first=events?.length;
    // A donated action costs the recipient no points. Its reattack and poison
    // perks still apply; free-point rolls belong only to the donor's paid action.
    performAttack(state,target,attackProfile(state,target),random,events);
    if(events){events[first].maxTransfers=1;events[first].delegatedBy=c.id;}
  }
  const actionCost = (state, c) => geometricCost(c.actionCost, state.actionLevels[c.id]);
  const upgradeCost = (state, u) => geometricCost(u.cost, state.upgrades[u.id], D.balance.upgradeCostGrowth);
  function roll(dice, flat, random = Math.random) {
    let amount = flat;
    for (let i = 0; i < dice; i++) amount += 1 + Math.floor(random() * 6);
    return amount;
  }
  function applyDamage(state, amount, events, actor, actorId, random, profile, extraAttack = false, poisonTick = false) {
    if(isWaiting(state))return;
    state.batchHpFraction=0;
    const { overflow, defense } = profile, overflowDefense=profile.overflowDefense??defense;
    let remaining = amount, continuation = false;
    do {
      if(!poisonTick && profile.poisonDamage)state.poisonDamage=Math.max(state.poisonDamage||0,profile.poisonDamage);
      const afterDefense = N.mitigate(remaining,continuation?overflowDefense:defense);
      const overkill = profile.overkillThreshold > 0 && afterDefense - state.hp >= profile.overkillThreshold;
      const damage = overflow ? Math.min(state.hp, afterDefense) : afterDefense;
      const hpBefore = state.hp;
      state.totalDamage += Math.min(state.hp, damage);
      state.hp = Math.max(0, state.hp - damage);
      // Only a positive HP loss triggers the check. Surviving another hit at
      // 1-4 HP requires another roll; zero HP is an unconditional defeat.
      const knockoutRoll = damage > 0 && state.hp > 0 && state.hp <= D.balance.knockoutHP ? roll(1, 0, random) : null;
      const knockedOut = knockoutRoll !== null && knockoutRoll % 2 === 1;
      if (events) events.push({ type: 'attack', actor, actorId, damage, hpBefore, hpAfter:state.hp, knockoutRoll, knockedOut, continuation, ...(extraAttack ? {extraAttack:true} : {}), ...(poisonTick?{poisonTick:true}:{}) });
      if (state.hp <= 0 || knockedOut) {
        const bonus=overkill ? overkillBonus(state) : 0, gain = reward(state) + bonus;
        state.factors += gain;
        state.earned += gain;
        state.kills++;
        state.respawnSeconds=respawnDelay(state);
        state.hp = isWaiting(state)?0:getSession(state).hp;
        state.poisonDamage=0;
        if (events) events.push({ type: 'clear', reward: gain, overkillBonus:bonus, overkills:overkill?1:0, reason:knockedOut ? 'knockout' : 'hp', hpAfter:state.hp });
      } else if(!poisonTick && state.poisonDamage) {
        // Damage-over-time is its own fixed hit, never an attack/re-attack trigger.
        // Direct kills and KOs have already cleared the status and skip this branch.
        applyDamage(state,state.poisonDamage,events,'猛毒',null,random,
          {defense:0,overflow:false,overkillThreshold:0},false,true);
      }
      if(isWaiting(state))break;
      remaining = overflow ? Math.max(0, afterDefense - damage) : 0;
      continuation = true;
      // Collapse only long runs of guaranteed full-HP kills; the final partial
      // target still gets its own 50% knockout check. No RNG is skipped here.
      const fullKillCost = getSession(state).hp + overflowDefense;
      const fullKills = Math.floor(remaining / fullKillCost);
      if (fullKills > 12) {
        const overkills = profile.overkillThreshold > 0 ? Math.max(0,Math.floor((remaining-profile.overkillThreshold)/fullKillCost)) : 0;
        const bonus=overkills*overkillBonus(state),dealt = fullKills * getSession(state).hp, gain = fullKills * reward(state) + bonus;
        state.kills += fullKills; state.totalDamage += dealt; state.factors += gain; state.earned += gain;
        state.poisonDamage=0;
        if (events) {
          events.push({ type:'attack', actor, actorId, damage:dealt, count:fullKills, hpBefore:state.hp, hpAfter:0, continuation:true, approximate:true, ...(extraAttack ? {extraAttack:true} : {}) });
          events.push({ type:'clear', count:fullKills, reward:gain, overkillBonus:bonus, overkills, reason:'hp', hpAfter:state.hp });
        }
        remaining -= fullKills * fullKillCost;
      }
    } while (remaining > 0);
  }
  // A chain ends at its first failed reattack roll. Inverse sampling gives
  // exactly that geometric distribution without an unbounded random loop.
  function chainAttackCount(chance, random = Math.random) {
    if (!(chance>0 && chance<1)) return 1;
    const u=Math.max(0,Math.min(1-Number.EPSILON/2,random()));
    return 1+Math.floor(Math.log1p(-u)/Math.log(chance));
  }
  function performAttack(state, character, profile, random, events) {
    const count=chainAttackCount(profile.extraAttackChance,random);
    for(let i=0;i<count&&!isWaiting(state);i++) {
      const amount=B.rolledDamage(profile,roll(profile.dice,profile.flat,random)+profile.bonus);
      applyDamage(state,amount,events,character?character.name:'あなた',character?character.id:null,random,profile,i>0);
    }
  }
  function click(state, random = Math.random) {
    if (state.paused||isWaiting(state)) return [];
    state.clicks++;
    const events = [];
    const character = selectedCharacter(state);
    const profile = attackProfile(state, character, true);
    performAttack(state,character,profile,random,events);
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
    const profiles=[],actions=Object.fromEntries(active.map(c=>[c.id,chargeActions(state,c,ticks)/(1-freeActionChance(state,c))]));
    let maxTransfers=0;
    for(const donor of active.filter(c=>isActionDonor(state,c))){
      const count=actions[donor.id],targets=transferTargets(state,donor);
      maxTransfers+=count;actions[donor.id]=0;
      for(const target of targets)actions[target.id]+=count/targets.length;
    }
    const counts={meta:0,richter:0,vishunal:0,tordeliese:0,max:0};let attacks=0;
    for(const c of active){
      const profile=attackProfile(state,c),count=actions[c.id]/(1-profile.extraAttackChance);
      counts[c.id]=count;attacks+=count;if(count)profiles.push({...profile,rate:count});
    }
    let {meta:metaAttacks,richter:richterAttacks,vishunal:vishunalAttacks,tordeliese:tordelieseAttacks,max:maxAttacks}=counts;
    if(!attacks){
      if(events&&maxTransfers)events.push({type:'support',actor:'マックス',actorId:'max',maxTransfers:Math.round(maxTransfers),count:Math.round(maxTransfers),hpBefore:state.hp,hpAfter:state.hp,approximate:true});
      return;
    }
    const hpBefore = state.hp;
    const result = B.resolve(state.hp+(state.batchHpFraction||0), getSession(state).hp, attacks, profiles, { threshold:D.balance.knockoutHP, chance:.5 },state.poisonDamage||0);
    state.poisonDamage=result.poisonDamage??(result.kills?0:state.poisonDamage||0);
    if(respawnDelay(state)&&result.kills){
      // No following target exists during a single-enemy respawn. A bounded
      // average tick may therefore clear at most one target, whatever its DPS.
      const used=Math.min(1,Math.max(1,attacks/result.kills)/attacks);
      metaAttacks*=used;richterAttacks*=used;vishunalAttacks*=used;tordelieseAttacks*=used;maxAttacks*=used;maxTransfers*=used;attacks*=used;
      result.kills=1;result.overkills=Math.min(1,result.overkills||0);result.knockouts=Math.min(1,result.knockouts||0);
      result.hp=0;result.damage=hpBefore;state.poisonDamage=0;state.respawnSeconds=respawnDelay(state);
    }
    const bonus=(result.overkills || 0)*overkillBonus(state),gain = result.kills * reward(state) + bonus;
    // Fractional predictions stay internal so splitting a long offline interval
    // cannot repeatedly grant rounding damage. Actual HP/counters are integers.
    state.hp = isWaiting(state)?0:Math.max(1,N.floor(result.hp));state.batchHpFraction=result.hp-state.hp;
    const predictedDamage=result.damage+(state.batchDamageFraction||0),creditedDamage=N.delta(predictedDamage);
    state.batchDamageFraction=predictedDamage-creditedDamage;
    state.kills += result.kills; state.totalDamage += creditedDamage;
    state.factors += gain; state.earned += gain;
    if (events && attacks) events.push({ type:'attack', actor:'パーティ（平均判定）', actorId:null, maxTransfers:Math.round(maxTransfers), metaAttacks, richterAttacks, vishunalAttacks:Math.round(vishunalAttacks),tordelieseAttacks:Math.round(tordelieseAttacks),maxAttacks:Math.round(maxAttacks), count:Math.round(maxAttacks)+metaAttacks+richterAttacks+Math.round(vishunalAttacks)+Math.round(tordelieseAttacks), damage:result.damage, hpBefore, hpAfter:state.hp, approximate:true });
    if (events && result.kills) events.push({ type:'clear', count:result.kills, knockouts:result.knockouts, overkills:result.overkills||0, overkillBonus:bonus, reward:gain, reason:'average', hpAfter:state.hp });
  }
  // All hired characters gain action points on each whole-second game tick.
  // Unspent points and the fractional second both survive saves and pauses.
  function advanceBattle(state, seconds, random = Math.random, collectEvents = true) {
    if (state.paused || seconds <= 0) return [];
    const duration = Math.min(seconds, D.maxOfflineSeconds);
    state.sceneSeconds=((state.sceneSeconds||0)+duration)%D.sceneCycle.seconds;
    const oldClock = state.actionClock, oldBoost = state.boostSeconds;
    const elapsed = oldClock + duration, ticks = Math.floor(elapsed + 1e-10);
    state.actionClock = Math.max(0, elapsed - ticks);
    const active = activeCharacters(state);
    const events = collectEvents ? [] : null;
    if(respawnDelay(state)){
      let previous=0;
      const approximate=active.reduce((n,c)=>n+(state.actionPoints[c.id]+actionPower(state,c)*ticks)/D.balance.actionThreshold/(1-freeActionChance(state,c))/(1-attackProfile(state,c).extraAttackChance),0)>EXACT_ATTACK_BUDGET;
      const wait=dt=>{if(!isWaiting(state))return;state.respawnSeconds=Math.max(0,state.respawnSeconds-dt);if(state.respawnSeconds<1e-9){state.respawnSeconds=0;state.hp=getSession(state).hp;state.batchHpFraction=0;}};
      for(let tick=1;tick<=ticks;tick++){
        const waitingAtTickStart=isWaiting(state),at=tick-oldClock;wait(at-previous);previous=at;
        state.boostSeconds=Math.max(0,oldBoost-at);
        if(waitingAtTickStart||isWaiting(state)||!active.length)continue;
        const estimate=active.reduce((n,c)=>n+(state.actionPoints[c.id]+actionPower(state,c))/D.balance.actionThreshold/(1-freeActionChance(state,c))/(1-attackProfile(state,c).extraAttackChance),0);
        if(approximate||estimate>EXACT_ATTACK_BUDGET){advanceBatch(state,1,active,events);continue;}
        const charged=active.map(c=>[c,chargeActions(state,c,1)]);
        for(const [c,count] of charged){
          if(isWaiting(state))break;
          for(let action=0;action<count&&!isWaiting(state);action++){
            const attempts=chainAttackCount(freeActionChance(state,c),random);
            for(let attempt=0;attempt<attempts&&!isWaiting(state);attempt++)performAutomaticAction(state,c,random,events);
          }
        }
      }
      wait(duration-previous);
      state.boostSeconds=Math.max(0,oldBoost-duration);
      return events||[];
    }
    if (!active.length || !ticks) {
      state.boostSeconds = Math.max(0, oldBoost - duration);
      return [];
    }
    const estimated = active.reduce((sum, c) => sum + Math.ceil((state.actionPoints[c.id] + actionPower(state, c) * ticks) / D.balance.actionThreshold)/(1-attackProfile(state,c).extraAttackChance)/(1-freeActionChance(state,c)), 0);
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
        const count = chargeActions(state, c, 1);
        for (let action = 0; action < count; action++) {
          // Each paid action includes the geometrically distributed free attempts
          // before the first consumed action. Manual clicks remain free as before.
          const attempts=chainAttackCount(freeActionChance(state,c),random);
          for(let attempt=0;attempt<attempts;attempt++)performAutomaticAction(state,c,random,events);
        }
      }
    }
    state.boostSeconds = Math.max(0, oldBoost - duration);
    return events || [];
  }
  function advance(state,seconds,random=Math.random,collectEvents=true){
    if(state.paused||seconds<=0)return [];
    // Each quest receives the same time interval and shared upgrades. Only its
    // assigned allies act; counters are merged once and only visible FX render.
    const clock=state.actionClock,boost=state.boostSeconds,scene=state.sceneSeconds;
    const background=D.sessions.filter(q=>q.id!==state.sessionId&&(formationIds(state,q.id).length||isWaiting(battleContext(state,q.id))));
    const all=advanceBattle(state,seconds,random,collectEvents).map(e=>({...e,sessionId:state.sessionId}));
    for(const q of background){
      const ctx={...battleContext(state,q.id),actionClock:clock,boostSeconds:boost,sceneSeconds:scene};
      const before={factors:ctx.factors,earned:ctx.earned,kills:ctx.kills,totalDamage:ctx.totalDamage};
      const events=advanceBattle(ctx,seconds,random,collectEvents);
      for(const key of Object.keys(before))state[key]+=ctx[key]-before[key];
      state.sessionStates={...state.sessionStates,[q.id]:battleSnapshot(ctx)};
      if(collectEvents)all.push(...events.map(e=>({...e,sessionId:q.id})));
    }
    return all;
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
    if (!perk || !perk.eligible || perk.owned || state.factors < perk.cost) return false;
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
  function tradeDraft(state) { return {...state,levels:{...state.levels},actionLevels:{...state.actionLevels},upgrades:{...state.upgrades},questLevels:{...state.questLevels},sessionStates:{...state.sessionStates}}; }
  function purchaseQuote(state,kind,id,count=10) {
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);let cost=0;
    if(!track||![1,10].includes(count))return {valid:false,cost:Infinity,count};
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
    const track=tradeTrack(state,kind,id),draft=tradeDraft(state);
    // Avoid repeated subtraction rounding changing the final affordable step.
    draft.factors=Infinity;
    for(let i=0;i<count;i++)if(!track.buy(draft,id))return false;
    draft.factors=state.factors-quote.cost;Object.assign(state,draft);return true;
  }
  function saleQuote(state,kind,id) {
    const track=tradeTrack(state,kind,id);
    if(!track||state[track.field][id]<=track.minimum)return {valid:false,refund:0};
    const draft=tradeDraft(state);draft[track.field][id]--;
    const price=track.cost(draft),refund=Math.max(1,N.floor(price*.5));
    return {valid:Number.isFinite(price)&&state.factors+refund<=1e100,refund,from:state[track.field][id],to:draft[track.field][id]};
  }
  function sell(state,kind,id) {
    const quote=saleQuote(state,kind,id);if(!quote.valid)return false;
    const track=tradeTrack(state,kind,id),oldHP=kind==='quest'?getSession(state,id).hp:0,ctx=oldHP?battleContext(state,id):null;
    state[track.field][id]--;state.factors+=quote.refund;
    if(oldHP){if(!isWaiting(ctx))ctx.hp=Math.max(1,Math.min(getSession(state,id).hp,N.floor(ctx.hp/oldHP*getSession(state,id).hp)));ctx.batchHpFraction=0;
      if(id!==state.sessionId)state.sessionStates={...state.sessionStates,[id]:battleSnapshot(ctx)};}
    return true;
  }
  function buyBoost(state) {
    const cost = boostCost(state);
    if (!Number.isFinite(cost) || cost <= 0 || state.factors < cost || state.boostSeconds > 0) return false;
    state.factors -= cost;
    state.boostSeconds = D.balance.boostDuration;
    return true;
  }
  function selectSession(state,id){
    if(!D.sessions.some(q=>q.id===id)||state.sessionId===id)return false;
    const next=battleContext(state,id),previous=state.sessionId;
    state.formations=Object.fromEntries(D.sessions.map(q=>[q.id,formationIds(state,q.id)]));
    state.sessionStates={...state.sessionStates,[previous]:battleSnapshot(state)};
    delete state.sessionStates[id];
    Object.assign(state,battleSnapshot(next));state.sessionId=id;
    if(state.selectedCharacterId&&!isDeployed(state,state.selectedCharacterId))state.selectedCharacterId=null;
    return true;
  }
  const averageAttackDamage=(state,c)=>B.averageDamage(attackProfile(state,c));
  function characterMetrics(state,c){
    const damage=averageAttackDamage(state,c),uptime=combatUptime(state),attacksPerSecond=effectiveAttackRate(state,c)*uptime;
    return {damage,attacksPerSecond,dps:damage*attacksPerSecond,action:actionPower(state,c),transfersPerSecond:isActionDonor(state,c)?automaticActionRate(state,c)*uptime:0};
  }
  const characterDps = (state,c) => characterMetrics(state,c).dps;
  const dps = state => D.characters.reduce((sum,c)=>sum+characterDps(state,c),0);
  function respawnUptime(rate,delay){
    // Automatic actions are issued on whole-second ticks. A single target can
    // occupy at least one combat tick, then five full recharge-free wait ticks.
    return delay&&rate>0?Math.min(1,1/rate)/(1+Math.min(1,rate)*delay):1;
  }
  function combatUptime(state){
    if(!respawnDelay(state))return 1;
    const profiles=activeCharacters(state).map(c=>({...attackProfile(state,c),rate:effectiveAttackRate(state,c)}));
    const rate=B.rewardRates(getSession(state).hp,profiles,{threshold:D.balance.knockoutHP,chance:.5}).clears;
    return respawnUptime(rate,respawnDelay(state));
  }
  const totalDps=state=>D.sessions.reduce((sum,q)=>sum+dps(battleContext(state,q.id)),0);
  function totalIncome(state){
    const sessions=D.sessions.filter(q=>formationIds(state,q.id).length).map(q=>({id:q.id,name:q.name,...expectedIncome(battleContext(state,q.id))}));
    return {sessions,factorsPerSecond:sessions.reduce((n,q)=>n+q.factorsPerSecond,0),boosted:state.boostSeconds>0,approximate:sessions.some(q=>q.approximate)};
  }
  // The active boost never inflates its own next price. Defense and paid
  // target-specific perks use the same unboosted DPS shown by the game.
  const unboostedDps = state => totalDps(state.boostSeconds > 0 ? {...state, boostSeconds:0} : state);
  const boostCost = state => N.delta(unboostedDps(state) * D.balance.boostCostDpsRatio);
  function expectedIncome(state) {
    const session=getSession(state),boosted=state.boostSeconds>0;
    const key=JSON.stringify([session.id,session.hp,session.reward,session.defense,session.traits,formationIds(state),state.levels,state.actionLevels,
      state.purchasedPerks,supportPerks(state).some(p=>p.selectedActionRate||p.freeActionChance||p.transferAction)?state.selectedCharacterId:null,state.upgrades.click,state.upgrades.power,state.upgrades.reward,state.upgrades.overkill,boosted]);
    if (key===incomeKey) return incomeValue;
    const profiles=activeCharacters(state).map(c=>({...attackProfile(state,c),rate:effectiveAttackRate(state,c)}));
    const rates=B.rewardRates(session.hp,profiles,{threshold:D.balance.knockoutHP,chance:.5}),uptime=respawnUptime(rates.clears,respawnDelay(state)),clearsPerSecond=rates.clears*uptime,perClear=reward(state);
    const bonusPerSecond=rates.overkills*overkillBonus(state)*uptime;
    incomeKey=key;incomeValue=Object.freeze({clearsPerSecond,reward:perClear,bonusPerSecond,factorsPerSecond:clearsPerSecond*perClear+bonusPerSecond,boosted,approximate:!!rates.approximate});
    return incomeValue;
  }
  const api = { battleContext, battleSnapshot, respawnDelay, isWaiting, formationOwner, totalDps, totalIncome, combatUptime, MAX_PARTY_SIZE, formationIds, isDeployed, activeCharacters, setFormation, averageAttackDamage, characterMetrics, isActionDonor, automaticActionRate, MAX_LEVEL, createState, getSession, questLevel, sessionAtLevel, questCost, buyQuest, purchaseQuote, buyMany, saleQuote, sell, perks, hasOverflow, stats, manualStats, selectedCharacter, selectCharacter, sawCount, bombCount, weaponScale, multiplier, characterMultiplier, enemyDefense, attackBreakdown, attackProfile, reward, overkillBonus, hireCost, actionPower, freeActionChance, actionMultiplier, attackRate, effectiveAttackRate, chainAttackCount, actionCost, upgradeCost, roll, click, advance, catchUp, hire, buyAction, buyPerk, buyUpgrade, buyBoost, boostCost, unboostedDps, selectSession, dps, characterDps, expectedIncome };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
