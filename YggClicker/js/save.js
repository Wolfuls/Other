(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const D = commonJS ? require('./data.js') : root.YggData;
  const E = commonJS ? require('./engine.js') : root.YggEngine;
  const N = commonJS ? require('./numbers.js') : root.YggNumbers;
  // Neither repository name nor pathname participates in the save key.
  const KEY = 'yggclicker.save', BACKUP_KEY = 'yggclicker.backup', VERSION = 29;
  const retiredSessionHP = { practice:10, patrol:40, heavy:150 };
  const RETIRED = ['hollow', 'jamie'];
  const MAX_BYTES = 1024 * 1024;
  const migrations = {
    28(document){return {...document,schemaVersion:29};},
    27(document){return {...document,schemaVersion:28};},
    26(document){
      const old=record(document.state,'旧セーブ'),{boostSeconds,...state}=old;
      state.questActiveLevels={};
      const convert=(battle,id)=>{
        const q=D.sessions.find(q=>q.id===id);if(!q)throw new Error('未対応のクエストです。');
        const level=number(old.questLevels?.[id]??1,'クエストLv',1,Number.MAX_SAFE_INTEGER,true),before=N.geometric(q.hp,1.15,level-1),after=N.geometric(q.hp,1.1,level-1);
        const scale=(hp,wait)=>{number(hp,'旧敵HP',wait?0:1,before);if(!Number.isInteger(hp)||wait&&hp!==0)throw new Error('旧敵HPが正しくありません。');return wait?0:Math.max(1,Math.min(after,N.floor(hp/before*after)));};
        return {...battle,hp:scale(battle.hp,battle.respawnSeconds),enemies:battle.enemies?.map(e=>({...e,hp:scale(e.hp,e.respawnSeconds)}))??null,batchHpFraction:0,batchDamageFraction:0};
      };
      Object.assign(state,convert(state,old.sessionId));state.sessionStates=Object.fromEntries(Object.entries(old.sessionStates||{}).map(([id,b])=>[id,convert(b,id)]));
      state.health=Object.fromEntries(Object.entries(old.health||{}).map(([id,h])=>[id,{...h,regenSeconds:number(h.regenSeconds,'旧回復周期',0,10)*.6}]));
      state.purchasedPerks={...old.purchasedPerks,max:(old.purchasedPerks?.max||[]).map(id=>id==='golden-rule'?'plot-armor':id)};
      return {...document,schemaVersion:27,state};
    },
    25(document){
      const old=record(document.state,'旧セーブ');
      const questUnlocks=Object.fromEntries(D.sessions.map(q=>[q.id,!q.unlockFactors||old.questUnlocks?.[q.id]===true||old.factors>=q.unlockFactors||old.sessionId===q.id||(old.questLevels?.[q.id]??1)>1||(old.formations?.[q.id]?.length??0)>0]));
      // Preserve elapsed waiting time when extending the old two-second delay.
      const extend=value=>{const seconds=number(value??0,'旧再出現待ち',0,2);return seconds>0?seconds+3:0;};
      const convert=battle=>({...battle,respawnSeconds:extend(battle.respawnSeconds),enemies:battle.enemies?.map(e=>({...e,respawnSeconds:extend(e.respawnSeconds)}))??null});
      return {...document,schemaVersion:26,state:{...convert(old),questUnlocks,sessionStates:Object.fromEntries(Object.entries(old.sessionStates||{}).map(([id,b])=>[id,convert(b)]))}};
    },
    24(document){
      const old=record(document.state,'旧セーブ'),upgrades={...record(old.upgrades,'旧全体強化')};let refund=0;
      for(const [id,base]of [['click',5],['power',30]]){
        const count=number(upgrades[id]??0,'旧強化Lv',0,Number.MAX_SAFE_INTEGER,true);
        if(count&&N.geometric(base,1.25,count-1)>1e100)throw new Error('旧強化価格が計算範囲外です。');
        for(let i=0;i<count;i++)refund+=N.geometric(base,1.25,i);
        delete upgrades[id];
      }
      return {...document,schemaVersion:25,state:{...old,upgrades,factors:number(number(old.factors,'所持因子')+refund,'返還後因子'),concentration:E.createState().concentration}};
    },
    23(document){
      const old=record(document.state,'旧セーブ');
      function convert(value){
        const {enemyActionPoints,...battle}=value;
        const enemies=battle.enemies?.map((e,i)=>({...e,respawnSeconds:i===0?battle.respawnSeconds||0:0,actionPoints:i===0?number(enemyActionPoints??0,'旧敵AP',0,D.balance.actionThreshold,true):0,pendingAttack:null}))??null;
        return {...battle,enemies,focusedEnemyId:null};
      }
      return {...document,schemaVersion:24,state:{...convert(old),sessionStates:Object.fromEntries(Object.entries(old.sessionStates||{}).map(([id,v])=>[id,convert(v)]))}};
    },
    22(document){
      const old=record(document.state,'旧セーブ'),state={...old,sessionStates:{}};
      state.health=Object.fromEntries(D.characters.map(c=>[c.id,{hp:c.maxHP,status:'active',regenSeconds:0}]));
      const convert=(value,id)=>{
        const level=number(old.questLevels?.[id]??1,'クエストレベル',1,Number.MAX_SAFE_INTEGER,true),q=D.sessions.find(q=>q.id===id);
        if(!q)throw new Error('未対応のクエストです。');
        const oldMax=N.geometric(id==='scarecrow'?40:q.hp,1.15,level-1),maxHP=N.geometric(q.hp,1.15,level-1);
        const wait=number(value.respawnSeconds??0,'再出現待ち',0,id==='scarecrow'?5:0);
        const hp=number(value.hp,'旧残りHP',wait?0:1,oldMax);
        if(!Number.isInteger(hp)||wait&&hp!==0)throw new Error('旧HPが正しくありません。');
        return {...value,hp:wait?0:Math.max(1,Math.min(maxHP,N.floor(hp/oldMax*maxHP))),respawnSeconds:Math.min(wait,2),enemies:null,nextEnemyId:0,enemyActionPoints:0,batchHpFraction:0,batchDamageFraction:0};
      };
      Object.assign(state,convert(old,old.sessionId));state.sessionStates={};
      for(const [id,value]of Object.entries(old.sessionStates||{}))state.sessionStates[id]=convert(value,id);
      return {...document,schemaVersion:23,state};
    },
    21(document){
      const old=record(document.state,'旧セーブ'),forms=old.formations===undefined?{}:record(old.formations,'旧部隊編成'),used=new Set(),formations={};
      if(Object.keys(forms).some(id=>!D.sessions.some(q=>q.id===id)))throw new Error('旧部隊編成のクエストが正しくありません。');
      if(D.sessions.every(q=>forms[q.id]==null))return {...document,schemaVersion:22,state:{...old,formations:Object.fromEntries(D.sessions.map(q=>[q.id,null])),respawnSeconds:0,sessionStates:{}}};
      const quests=[...D.sessions].sort((a,b)=>(b.id===old.sessionId)-(a.id===old.sessionId));
      for(const q of quests){
        const ids=Array.isArray(forms[q.id])?forms[q.id]:(q.id===old.sessionId?D.characters.filter(c=>old.levels?.[c.id]>0).map(c=>c.id):[]);
        if(new Set(ids).size!==ids.length||ids.length>E.MAX_PARTY_SIZE||ids.some(id=>!D.characters.some(c=>c.id===id)||!old.levels?.[id]))throw new Error('旧部隊編成が正しくありません。');
        formations[q.id]=ids.filter(id=>{if(used.has(id))return false;used.add(id);return true;});
      }
      return {...document,schemaVersion:22,state:{...old,formations,respawnSeconds:0,sessionStates:{}}};
    },
    20(document) { return {...document,schemaVersion:21,state:{...document.state,formations:Object.fromEntries(D.sessions.map(q=>[q.id,null]))}}; },
    19(document) {
      const old=record(document.state,'旧セーブ'),owned=record(old.purchasedPerks,'購入済みパーク');
      const max=owned.max??[];
      if(!Array.isArray(max)||new Set(max).size!==max.length)throw new Error('購入済みパークの値が正しくありません。');
      const refund=max.includes('gm')?100000:0;
      if(refund)number(record(old.levels,'旧威力レベル').max,'マックスの威力レベル',1,E.MAX_LEVEL,true);
      return {...document,schemaVersion:20,state:{...old,factors:number(old.factors,'所持因子')+refund,
        purchasedPerks:{...owned,max:max.filter(id=>id!=='gm')}}};
    },
    18(document) { return {...document,schemaVersion:19}; },
    1(document) {
      const oldState = record(document.state, '旧セーブ');
      const oldMaxHP = { practice: 80, patrol: 400, heavy: 2000 };
      const session = typeof oldState.sessionId==='string' && Object.hasOwn(retiredSessionHP,oldState.sessionId)?{id:oldState.sessionId,hp:retiredSessionHP[oldState.sessionId]}:null;
      if (!session) throw new Error('このバージョンでは読み込めないセッションです。');
      const previousHP = number(oldState.hp, '旧セーブの残りHP', Number.MIN_VALUE, oldMaxHP[session.id]);
      // Preserve owned characters, upgrades and currency; only convert the
      // active target's remaining HP proportion to the smaller HP scale.
      return { ...document, schemaVersion: 2, state: { ...oldState, hp: Math.max(1, Math.ceil(previousHP / oldMaxHP[session.id] * session.hp)) } };
    },
    2(document) {
      const oldState = record(document.state, '旧セーブ');
      const levels = { ...record(oldState.levels, '旧セーブのキャラクター') };
      const timers = { ...record(oldState.timers, '旧セーブの攻撃間隔') };
      for (const [values, label] of [[levels, 'レベル'], [timers, '攻撃間隔']]) {
        if (Object.hasOwn(values, 'hikari')) {
          if (Object.hasOwn(values, 'meta')) throw new Error(`旧キャラクターと鋼音メタの${label}が重複しています。`);
          values.meta = values.hikari;
          delete values.hikari;
        }
      }
      return { ...document, schemaVersion: 3, state: { ...oldState, levels, timers } };
    },
    3(document) {
      const oldState = record(document.state, '旧セーブ');
      return { ...document, schemaVersion: 4, state: { ...oldState,
        speedLevels: Object.fromEntries(D.characters.map(c => [c.id, 0])) } };
    },
    4(document) {
      const oldState = record(document.state, '旧セーブ');
      const speedLevels = record(oldState.speedLevels, '旧速度レベル');
      const timers = record(oldState.timers, '旧攻撃待ち時間');
      const levels = record(oldState.levels, '旧威力レベル');
      // Freeze historical intervals: current base action may now be zero.
      const oldIntervals = { meta: 1.8, richter:4, vishunal:4, tordeliese:1.25, max:2, hollow: 2.4, jamie: 3.5 };
      for (const values of [speedLevels, timers]) {
        if (Object.keys(values).some(id => !D.characters.some(c => c.id === id) && !RETIRED.includes(id))) throw new Error('未対応のキャラクターが含まれています。');
      }
      const actionLevels = {}, actionPoints = {};
      for (const c of D.characters) {
        actionLevels[c.id] = number(speedLevels[c.id] ?? 0, '旧速度レベル', 0, Number.MAX_SAFE_INTEGER, true);
        const interval = (oldIntervals[c.id] ?? D.balance.actionThreshold / c.action) / (1 + actionLevels[c.id] * .1);
        const timer = Math.min(interval, number(timers[c.id] ?? interval, '旧攻撃待ち時間', 0, interval * (1 + 1e-12)));
        actionPoints[c.id] = levels[c.id] ? (1 - timer / interval) * D.balance.actionThreshold : 0;
      }
      const { speedLevels: removedSpeed, timers: removedTimers, ...retained } = oldState;
      return { ...document, schemaVersion: 5, state: { ...retained, actionLevels, actionPoints, actionClock: 0 } };
    },
    5(document) {
      const oldState = record(document.state, '旧セーブ');
      return { ...document, schemaVersion: 6, state: { ...oldState, selectedCharacterId: null } };
    },
    6(document) {
      const oldState = record(document.state, '旧セーブ'), state = { ...oldState };
      for (const field of ['levels', 'actionLevels', 'actionPoints']) {
        state[field] = { ...record(oldState[field], field) };
        for (const id of RETIRED) delete state[field][id];
      }
      if (RETIRED.includes(state.selectedCharacterId)) state.selectedCharacterId = null;
      state.purchasedPerks = Object.fromEntries(D.characters.map(c => [c.id, []]));
      return { ...document, schemaVersion:7, state };
    },
    7(document) {
      // Progress is unchanged. The version gate keeps older clients from
      // treating newly purchased Meta perks as corrupt and restoring a backup.
      return { ...document, schemaVersion:8 };
    },
    8(document) {
      return { ...document, schemaVersion:9, state:{...document.state, upgrades:{...document.state.upgrades, overkill:0}} };
    },
    9(document) {
      const state=record(document.state,'旧セーブ');
      if(typeof state.sessionId==='string' && Object.hasOwn(retiredSessionHP,state.sessionId)) {
        number(state.hp,'旧セーブの残りHP',Number.MIN_VALUE,retiredSessionHP[state.sessionId]);
        const target=D.sessions.find(s=>s.id==='mohicans');
        return {...document,schemaVersion:10,state:{...state,sessionId:target.id,hp:10}};
      }
      return {...document,schemaVersion:10};
    },
    10(document) {
      // New IDs default to unowned during validation. The version gate also
      // prevents old clients from treating the third character as corrupt.
      return {...document,schemaVersion:11};
    },
    11(document) {
      return {...document,schemaVersion:12,state:{...document.state,options:{showOrbits:true}}};
    },
    12(document) {
      return {...document,schemaVersion:13,state:{...document.state,questLevels:Object.fromEntries(D.sessions.map(s=>[s.id,1])),sceneSeconds:0}};
    },
    13(document) {
      const old=record(document.state,'旧セーブ'),state={...old,actionPoints:{...record(old.actionPoints,'AP')}};
      for(const key of ['factors','earned','totalDamage'])state[key]=Math.floor(number(old[key],key));
      for(const c of D.characters)state.actionPoints[c.id]=Math.floor(number(state.actionPoints[c.id]??0,'AP',0,D.balance.actionThreshold));
      const base=D.sessions.find(s=>s.id===old.sessionId),level=number(old.questLevels?.[old.sessionId]??1,'クエストレベル',1,Number.MAX_SAFE_INTEGER,true);
      if(!base)throw new Error('未対応のクエストです。');
      const historicalBase=base.id==='mohicans'?10:base.hp;
      const oldHP=Math.ceil(historicalBase*1.2**(level-1)),targetHP=N.geometric(historicalBase,1.2,level-1);
      number(old.hp,'旧残りHP',Number.MIN_VALUE,oldHP);
      state.hp=Math.max(1,Math.min(targetHP,Math.floor(old.hp/oldHP*targetHP)));
      state.batchHpFraction=0;state.batchDamageFraction=0;
      return {...document,schemaVersion:14,state};
    },
    14(document) {
      const old=record(document.state,'旧セーブ'),state={...old,questLevels:{...old.questLevels}};
      for(const q of D.sessions)state.questLevels[q.id]??=1;
      if(old.sessionId==='mohicans'){
        const level=number(state.questLevels.mohicans,'クエストレベル',1,Number.MAX_SAFE_INTEGER,true);
        const previousMax=N.geometric(10,1.2,level-1);
        number(old.hp,'旧残りHP',1,previousMax);
        state.hp=Math.max(1,N.floor(old.hp/previousMax*N.geometric(20,1.2,level-1)));
        state.batchHpFraction=0;
      }
      return {...document,schemaVersion:15,state};
    },
    15(document) {
      const old=record(document.state,'旧セーブ'),owned=record(old.purchasedPerks,'購入済みパーク');
      // Historical prices and eligibility are frozen: changing today's data
      // must never change a refund or make an invalid old purchase refundable.
      const legacy={
        meta:{'metal-blade':[10,10],'attack-plus':[20,50],'mohican-slayer':[30,100],'full-metal-burst':[40,250],'metal-man':[50,800]},
        richter:{'z-bom':[10,40],'dx-bom':[20,150],'vx-bom':[30,350],'ex-bom':[40,700],'bom-ber':[50,1600]},
        vishunal:{'legal-launcher':[10,400],'mad-dog':[20,1500],'eel-delivery':[30,3500],'trigger-happy':[40,7000],'missile-missile':[50,16000]}
      };
      if(Object.keys(owned).some(id=>!Object.hasOwn(legacy,id)&&(!D.characters.some(c=>c.id===id)||!Array.isArray(owned[id])||owned[id].length)))throw new Error('未対応の購入済みパークです。');
      const purchasedPerks={};let refund=0;
      for(const c of D.characters){
        const level=number(old.levels?.[c.id]??0,'旧威力レベル',0,E.MAX_LEVEL,true),ids=owned[c.id]??[];
        if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw new Error('旧パークの形式が正しくありません。');
        purchasedPerks[c.id]=[];
        for(const id of ids){
          const previous=typeof id==='string'&&Object.hasOwn(legacy[c.id]||{},id)?legacy[c.id][id]:null;
          if(!previous||level<previous[0])throw new Error('旧パークの購入条件が正しくありません。');
          // Metal Man and Metal Blade are now one Lv50 purchase. Preserve
          // either ownership, and refund the old 10Rd Blade if both were paid.
          if(c.id==='meta'&&id==='metal-blade'&&ids.includes('metal-man')){refund+=previous[1];continue;}
          const mapped=c.id==='meta'&&id==='metal-man'?'metal-blade':id;
          const current=c.perks.find(p=>p.id===mapped);
          if(!current||level<current.level)refund+=previous[1];
          else purchasedPerks[c.id].push(mapped);
        }
      }
      return {...document,schemaVersion:16,state:{...old,factors:number(old.factors,'所持因子')+refund,purchasedPerks}};
    },
    16(document) {
      const old=record(document.state,'旧セーブ');
      const hpBases={mohicans:20,scarecrow:40,dementor:100};
      if(typeof old.sessionId!=='string'||!Object.hasOwn(hpBases,old.sessionId))throw new Error('未対応のクエストです。');
      const level=number(old.questLevels?.[old.sessionId]??1,'クエストレベル',1,Number.MAX_SAFE_INTEGER,true);
      // Freeze both curves so a future balance update cannot change this migration.
      const oldMax=number(N.geometric(hpBases[old.sessionId],1.2,level-1),'旧最大HP',1);
      const newMax=number(N.geometric(hpBases[old.sessionId],1.15,level-1),'最大HP',1);
      const hp=number(old.hp,'旧残りHP',1,oldMax);
      if(!Number.isInteger(hp))throw new Error('旧残りHPは整数で指定してください。');
      const fraction=number(old.batchHpFraction===undefined?0:old.batchHpFraction,'放置計算の端数',-1,1);
      if(Math.abs(fraction)>=1||hp+fraction<=0||hp+fraction>oldMax)throw new Error('放置計算のHPが正しくありません。');
      const unchanged=oldMax===newMax;
      return {...document,schemaVersion:17,state:{...old,
        hp:unchanged?hp:Math.max(1,Math.min(newMax,N.floor((hp+fraction)/oldMax*newMax))),
        batchHpFraction:unchanged?fraction:0}};
    },
    17(document) {
      return {...document,schemaVersion:18,state:{...document.state,poisonDamage:0}};
    }
  };
  function record(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}の形式が正しくありません。`);
    return value;
  }
  function number(value, label, min = 0, max = 1e100, integer = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) {
      throw new Error(`${label}の値が正しくありません。`);
    }
    return value;
  }
  function validateState(input) {
    const raw = record(input, 'セーブ');
    const result = E.createState();
    for (const key of ['factors', 'earned', 'totalDamage']) { result[key] = number(raw[key], key); if(!Number.isInteger(result[key]))throw new Error(`${key}は整数で指定してください。`); }
    for (const key of ['kills', 'clicks']) {
      result[key] = number(raw[key], key);
      if (!Number.isInteger(result[key])) throw new Error(`${key}の値が正しくありません。`);
    }
    result.savedAt = number(raw.savedAt, '保存日時', 0, 8640000000000000, true);
    const session = D.sessions.find(s => s.id === raw.sessionId);
    if (!session) throw new Error('このバージョンでは読み込めないセッションです。');
    result.sessionId = session.id;
    const unlocks=raw.questUnlocks===undefined?{}:record(raw.questUnlocks,'クエスト解放');
    if(Object.keys(unlocks).some(id=>!D.sessions.some(q=>q.id===id))||Object.values(unlocks).some(value=>typeof value!=='boolean'))throw new Error('クエスト解放の値が正しくありません。');
    result.questUnlocks={...result.questUnlocks,...unlocks};E.refreshQuestUnlocks(result);
    if(!E.isQuestUnlocked(result,result.sessionId))throw new Error('未解放のクエストは選択できません。');
    const quests=raw.questLevels===undefined?{}:record(raw.questLevels,'クエストレベル');
    if(Object.keys(quests).some(id=>!D.sessions.some(s=>s.id===id)))throw new Error('未対応のクエストが含まれています。');
    for(const s of D.sessions){
      result.questLevels[s.id]=number(quests[s.id]===undefined?1:quests[s.id],'クエストレベル',1,Number.MAX_SAFE_INTEGER,true);
      const scaled=E.getSession(result,s.id);
      number(scaled.hp,'クエストHP',1);number(scaled.reward,'クエスト報酬',0);
    }
    const activeLevels=raw.questActiveLevels===undefined?{}:record(raw.questActiveLevels,'挑戦Lv');
    if(Object.keys(activeLevels).some(id=>!D.sessions.some(q=>q.id===id)))throw new Error('未対応の挑戦クエストです。');
    result.questActiveLevels=Object.fromEntries(Object.entries(activeLevels).map(([id,level])=>[id,number(level,'挑戦Lv',1,result.questLevels[id],true)]));
    const allocation=raw.concentration===undefined?{}:record(raw.concentration,'コンセントレイション');
    if(Object.keys(allocation).some(id=>!D.sessions.some(q=>q.id===id)))throw new Error('未対応のクエスト配分です。');
    for(const q of D.sessions){
      const value=allocation[q.id]===undefined?result.concentration[q.id]:record(allocation[q.id],'配分');
      if(!E.setConcentration(result,q.id,value))throw new Error('配分は合計10点以内、防御は5点以内の整数で指定してください。');
    }
    result.sceneSeconds=number(raw.sceneSeconds===undefined?0:raw.sceneSeconds,'昼夜の経過時間',0,D.sceneCycle.seconds);
    if(result.sceneSeconds>=D.sceneCycle.seconds)throw new Error('昼夜の経過時間が正しくありません。');
    result.respawnSeconds=number(raw.respawnSeconds??0,'再出現待ち',0,E.respawnDelay(result));
    result.hp = number(raw.hp, '残りHP', result.respawnSeconds>0?0:1, E.getSession(result).hp);
    if(result.respawnSeconds>0&&result.hp!==0)throw new Error('再出現待ちのHPが正しくありません。');
    result.poisonDamage=raw.poisonDamage===undefined?0:raw.poisonDamage;
    if(![0,4,8,12,16].includes(result.poisonDamage))throw new Error('猛毒の値が正しくありません。');
    if(!Number.isInteger(result.hp))throw new Error('残りHPは整数で指定してください。');
    for(const field of ['batchHpFraction','batchDamageFraction']){
      result[field]=number(raw[field]??0,'放置計算の端数',-1,1);
      if(Math.abs(result[field])>=1)throw new Error('放置計算の端数が正しくありません。');
    }
    if(result.respawnSeconds>0?result.batchHpFraction!==0||result.poisonDamage!==0:result.hp+result.batchHpFraction<=0||result.hp+result.batchHpFraction>E.getSession(result).hp)throw new Error('放置計算のHPが正しくありません。');
    if (typeof raw.paused !== 'boolean') throw new Error('一時停止状態が正しくありません。');
    result.paused = raw.paused;
    const options = raw.options === undefined ? {} : record(raw.options, '表示設定');
    for(const [key,defaultValue] of Object.entries(D.displayDefaults)){
      const value=options[key]===undefined?defaultValue:options[key];
      if(key==='hitEffects'?!D.hitEffectModes.includes(value):typeof value!=='boolean')throw new Error('表示設定が正しくありません。');
      result.options[key]=value;
    }
    result.actionClock = number(raw.actionClock, 'APの加算周期', 0, 1);
    if (result.actionClock >= 1) throw new Error('APの加算周期が正しくありません。');
    for (const field of ['levels', 'actionLevels', 'actionPoints', 'upgrades', 'purchasedPerks']) record(raw[field], field);
    for (const field of ['levels', 'actionLevels', 'actionPoints', 'purchasedPerks']) {
      if (Object.keys(raw[field]).some(id => !D.characters.some(c => c.id === id))) throw new Error('未対応のキャラクターが含まれています。ゲームを更新してください。');
    }
    if (Object.keys(raw.upgrades).some(id => !D.upgrades.some(u => u.id === id))) throw new Error('未対応の強化が含まれています。');
    for (const c of D.characters) {
      // Missing new character IDs default to unowned, allowing content additions.
      result.levels[c.id] = number(raw.levels[c.id] ?? 0, c.name, 0, E.MAX_LEVEL, true);
      result.actionLevels[c.id] = number(raw.actionLevels[c.id] ?? 0, '行動力の強化レベル', 0, Number.MAX_SAFE_INTEGER, true);
      result.actionPoints[c.id] = number(raw.actionPoints[c.id] ?? 0, 'AP', 0, D.balance.actionThreshold);
      if(!Number.isInteger(result.actionPoints[c.id]))throw new Error('APは整数で指定してください。');
      if (!result.levels[c.id] && (result.actionLevels[c.id] || result.actionPoints[c.id])) throw new Error('未雇用キャラクターの行動力・APが正しくありません。');
      const purchased = raw.purchasedPerks[c.id] ?? [];
      if (!Array.isArray(purchased) || new Set(purchased).size !== purchased.length || purchased.some(id => {
        const perk = (c.perks || []).find(p => p.id === id);
        return !perk || !result.levels[c.id];
      })) throw new Error('購入済みパークの値が正しくありません。');
      result.purchasedPerks[c.id] = [...purchased];
    }
    const health=raw.health===undefined?{}:record(raw.health,'味方のHP');
    if(Object.keys(health).some(id=>!D.characters.some(c=>c.id===id)))throw new Error('未対応の味方HPです。');
    for(const c of D.characters){
      const h=health[c.id]??{hp:c.maxHP,status:'active',regenSeconds:0};record(h,'味方の状態');
      const hp=number(h.hp,'味方HP',-1e100,c.maxHP),regenSeconds=number(h.regenSeconds,'回復周期',0,D.balance.recoverySeconds);
      if(!Number.isInteger(hp)||regenSeconds>=D.balance.recoverySeconds||!['active','unconscious','dying'].includes(h.status)||hp<0&&h.status!=='dying'||hp===c.maxHP&&(h.status!=='active'||regenSeconds!==0)||!result.levels[c.id]&&(hp!==c.maxHP||h.status!=='active'))throw new Error('味方HP・戦闘不能状態が正しくありません。');
      result.health[c.id]={hp,status:h.status,regenSeconds};
    }
    const formations=raw.formations===undefined?{}:record(raw.formations,'部隊編成');
    if(Object.keys(formations).some(id=>!D.sessions.some(q=>q.id===id)))throw new Error('未対応のクエスト編成です。');
    for(const q of D.sessions){
      const ids=formations[q.id]??null;
      if(ids!==null&&(!Array.isArray(ids)||ids.length>E.MAX_PARTY_SIZE||new Set(ids).size!==ids.length||ids.some(id=>!D.characters.some(c=>c.id===id)||!result.levels[id])))throw new Error('部隊編成は雇用済みの仲間を重複なく最大5人で指定してください。');
      result.formations[q.id]=ids===null?null:[...ids];
    }
    const assigned=new Set();
    for(const q of D.sessions)for(const id of E.formationIds(result,q.id)){
      if(assigned.has(id))throw new Error('同じ仲間を複数のクエストに編成できません。');assigned.add(id);
    }
    function validateProtection(value,ctx){
      const floorClipTargetId=value.floorClipTargetId??null,floorClipSeconds=number(value.floorClipSeconds??0,'保護対象の更新待ち',0,10);
      if(floorClipTargetId!==null&&(!E.formationIds(ctx).includes(floorClipTargetId)||floorClipSeconds===0))throw new Error('保護対象が正しくありません。');
      return {floorClipTargetId,floorClipSeconds};
    }
    function validateEnemies(value,ctx){
      const nextEnemyId=number(value.nextEnemyId??0,'敵の識別番号',0),enemies=value.enemies??null,maxHP=E.getSession(ctx).hp;
      const focusedEnemyId=value.focusedEnemyId??null;
      if(!Number.isInteger(nextEnemyId)||nextEnemyId>=1000000000)throw new Error('敵の識別番号が正しくありません。');
      if(enemies===null){if(focusedEnemyId!==null)throw new Error('集中対象が正しくありません。');return {enemies:null,nextEnemyId,focusedEnemyId};}
      const count=(E.getSession(ctx).traits||[]).includes('swarm')?3:1;
      if(!Array.isArray(enemies)||enemies.length!==count)throw new Error('敵の人数が正しくありません。');
      const ids=new Set(),normalized=enemies.map(e=>{
        record(e,'エネミー');
        const id=number(e.id,'敵の識別番号',0),respawnSeconds=number(e.respawnSeconds,'個体の再出現待ち',0,E.respawnDelay(ctx));
        const hp=number(e.hp,'エネミーHP',respawnSeconds>0?0:1,maxHP),poisonDamage=e.poisonDamage;
        const actionPoints=number(e.actionPoints,'敵のAP',0,1000,true);
        if(!Number.isInteger(id)||id>=1000000000||ids.has(id)||!Number.isInteger(hp)||![0,4,8,12,16].includes(poisonDamage)||respawnSeconds&&(hp!==0||poisonDamage!==0||actionPoints!==0))throw new Error('個体の状態が正しくありません。');
        const defensePenalty=number(e.defensePenalty??0,'防御低下',0,3,true),accuracyPenalty=number(e.accuracyPenalty??0,'命中低下',0,15,true);
        if(![0,3].includes(defensePenalty)||![0,15].includes(accuracyPenalty)||respawnSeconds&&(defensePenalty||accuracyPenalty))throw new Error('敵の弱体効果が正しくありません。');
        let pendingAttack=null;
        if(e.pendingAttack!=null){
          const p=record(e.pendingAttack,'攻撃待機'),remaining=number(p.remaining,'攻撃の残り時間',Number.MIN_VALUE,E.enemyAttackDuration(ctx));
          if(respawnSeconds||!D.characters.some(c=>c.id===p.targetId&&result.levels[c.id]>0))throw new Error('攻撃対象が正しくありません。');
          pendingAttack={targetId:p.targetId,remaining};
        }
        ids.add(id);return {id,hp,poisonDamage,respawnSeconds,actionPoints,pendingAttack,defensePenalty,accuracyPenalty};
      });
      const living=normalized.filter(e=>e.hp>0),target=living.find(e=>e.id===focusedEnemyId)||living[0];
      if(focusedEnemyId!==null&&(count===1||!living.some(e=>e.id===focusedEnemyId)))throw new Error('集中対象が正しくありません。');
      const wait=target?0:Math.min(...normalized.map(e=>e.respawnSeconds));
      if(ctx.hp!==(target?.hp||0)||ctx.poisonDamage!==(target?.poisonDamage||0)||Math.abs(ctx.respawnSeconds-wait)>1e-9)throw new Error('表示対象の状態が正しくありません。');
      return {enemies:normalized,nextEnemyId,focusedEnemyId};
    }
    Object.assign(result,validateEnemies(raw,result),validateProtection(raw,result));
    const battles=raw.sessionStates===undefined?{}:record(raw.sessionStates,'クエスト別の戦況');
    result.sessionStates={};
    for(const [id,data] of Object.entries(battles)){
      if(!D.sessions.some(q=>q.id===id)||id===result.sessionId)throw new Error('クエスト別の戦況が重複しています。');
      const value=record(data,'戦況'),ctx=E.battleContext(result,id),maxHP=E.getSession(ctx).hp;
      const respawnSeconds=number(value.respawnSeconds??0,'再出現待ち',0,E.respawnDelay(ctx));
      const hp=number(value.hp,'残りHP',respawnSeconds?0:1,maxHP);
      if(!Number.isInteger(hp)||respawnSeconds&&hp!==0)throw new Error('クエスト別HPが正しくありません。');
      const poisonDamage=value.poisonDamage??0,batchHpFraction=number(value.batchHpFraction??0,'HP端数',-1,1),batchDamageFraction=number(value.batchDamageFraction??0,'ダメージ端数',-1,1);
      if(![0,4,8,12,16].includes(poisonDamage)||Math.abs(batchHpFraction)>=1||Math.abs(batchDamageFraction)>=1||(respawnSeconds?poisonDamage!==0||batchHpFraction!==0:hp+batchHpFraction<=0||hp+batchHpFraction>maxHP))throw new Error('クエスト別の戦闘状態が正しくありません。');
      const selectedCharacterId=value.selectedCharacterId??null;
      if(selectedCharacterId!==null&&!E.formationIds(result,id).includes(selectedCharacterId))throw new Error('クエスト別の手動攻撃対象が正しくありません。');
      const battle={hp,poisonDamage,batchHpFraction,batchDamageFraction,respawnSeconds,selectedCharacterId};
      result.sessionStates[id]={...battle,...validateEnemies(value,{...ctx,...battle}),...validateProtection(value,ctx)};
    }
    if (raw.selectedCharacterId !== null && !D.characters.some(c => c.id === raw.selectedCharacterId && E.isDeployed(result,c.id))) throw new Error('手動攻撃の担当キャラクターが正しくありません。');
    result.selectedCharacterId = raw.selectedCharacterId;
    for (const u of D.upgrades) result.upgrades[u.id] = number(raw.upgrades[u.id] ?? 0, u.name, 0, u.max ?? Number.MAX_SAFE_INTEGER, true);
    for(const q of D.sessions){const ctx=E.battleContext(result,q.id);E.normalizeEnemyActions(ctx);if(q.id!==result.sessionId&&result.sessionStates[q.id])result.sessionStates[q.id]=E.battleSnapshot(ctx);}
    for(const q of D.sessions)if(!E.isQuestUnlocked(result,q.id)&&(result.questLevels[q.id]>1||E.formationIds(result,q.id).length))throw new Error('未解放のクエストに進行データがあります。');
    return result;
  }
  function encode(state, now = Date.now()) {
    return JSON.stringify({ gameId: D.gameId, schemaVersion: VERSION, gameVersion: D.version, exportedAt: new Date(now).toISOString(), state: validateState(state) }, null, 2);
  }
  function decode(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('セーブファイルは1MB以下にしてください。');
    let document;
    try { document = JSON.parse(text); } catch { throw new Error('JSON形式のセーブファイルを選んでください。'); }
    record(document, 'ファイル');
    if (document.gameId !== D.gameId) throw new Error('YggClickerのセーブデータではありません。');
    number(document.schemaVersion, '形式バージョン', 1, Number.MAX_SAFE_INTEGER, true);
    if (document.schemaVersion > VERSION) {
      const error = new Error('新しい形式のセーブです。ゲームを更新してから読み込んでください。');
      error.code = 'NEWER_VERSION';
      throw error;
    }
    while (document.schemaVersion < VERSION) {
      const migration = migrations[document.schemaVersion];
      if (!migration) throw new Error('この旧形式にはまだ対応していません。');
      const oldVersion = document.schemaVersion;
      document = migration(document);
      if (document.schemaVersion <= oldVersion) throw new Error('セーブ形式の更新に失敗しました。');
    }
    return validateState(document.state);
  }
  function load(storage) {
    try {
      const primary = storage.getItem(KEY);
      if (primary !== null) {
        try { return { state: decode(primary), warning: '' }; }
        catch (error) {
          if (error.code === 'NEWER_VERSION') return { state: null, blocked: true, warning: error.message };
          const backup = storage.getItem(BACKUP_KEY);
          if (backup !== null) {
            try { return { state: decode(backup), warning: '最新のセーブを読めなかったため、前回のバックアップを復元しました。' }; } catch { /* Keep the original data untouched. */ }
          }
          return { state: null, blocked: true, warning: `${error.message} 元のデータは保持しています。セーブ管理から有効なファイルを読み込んでください。` };
        }
      }
      return { state: null, warning: '' };
    } catch { return { state: null, unavailable: true, warning: 'ブラウザへの保存を利用できません。セーブの書き出しで進行を保存してください。' }; }
  }
  function persist(storage, state, { keepBackup = false } = {}) {
    try {
      const text = encode(state);
      const previous = storage.getItem(KEY);
      if (previous && !keepBackup) {
        try { decode(previous); storage.setItem(BACKUP_KEY, previous); } catch (error) {
          // Invalid current data must never replace a healthy backup.
          if (error.name === 'QuotaExceededError') throw error;
        }
      }
      storage.setItem(KEY, text);
      return { ok: true };
    } catch (error) { return { ok: false, error: `自動保存できませんでした。セーブを書き出してください。${error.name === 'QuotaExceededError' ? ' 保存容量が不足しています。' : ''}` }; }
  }
  const api = { KEY, BACKUP_KEY, VERSION, MAX_BYTES, encode, decode, validateState, load, persist };
  if (commonJS) module.exports = api;
  else root.YggSave = api;
})(typeof window !== 'undefined' ? window : globalThis);
