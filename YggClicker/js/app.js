(function () {
  'use strict';
  const D = window.YggData, E = window.YggEngine, S = window.YggSave, FX = window.YggCombatEffects, UI = window.YggDisplay;
  const elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, document.getElementById(id)); return elements.get(id); };
  const setText = (id, value) => { const node = $(id), text = String(value); if (node.textContent !== text) node.textContent = text; };
  let controlsKey = '', battleRender = null, combatGeometry = null;
  let enemyVariantSession = '', enemyQueue = [], lastEnemyAdvance = -Infinity;
  let orbitLayoutKey = '', arenaViewportWidth = 0;
  let shownCrystals = -1;
  let rewardDieIndex = 0;
  const PRE_IMPORT = 'yggclicker.before-import';
  const RICHTER_EXPLOSION_MS = 640;
  let state = E.createState(), storage, readOnly = false, corruptSave = false;
  let importCandidate = null, lastTime = Date.now(), lastSave = Date.now(), initialized = false;
  let storageError = false, importBackup = null;
  let shownSaws = -1, metaAttackTimer, lastMetaAttack = -Infinity, lastMetaShot = -Infinity;
  let displayedHP = null, visualHitId = 0, spawnTimer, hitTimer;
  let shownBombs = -1, richterAttackTimer, lastRichterShot = -Infinity;
  const visualTimers = new Set();
  const playback = FX.createPlayback({ onLaunch:showLaunch, onImpact:showImpact, onActorIdle:finishBurst, onIdle:() => {
    const hitId = visualHitId;
    deferVisual(() => { if (!playback.pending && hitId === visualHitId) { displayedHP = null; $('arena').classList.remove('combat-playing'); requestBattleRender(); } }, 200);
  } });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const money = UI.currencyNumber;
  const format = n => n < 1e6 ? Math.floor(n).toLocaleString('ja-JP') : n.toExponential(2);
  const rateFormat = n => n < 1e6 ? n.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : n.toExponential(2);
  function attackFormula(profile) {
    let text = `${profile.dice}D6 + ${profile.flat}${profile.bonus ? ` + ${profile.bonus}（特効）` : ''}`;
    const b = profile.breakdown, correction = (1 + b.upgrade.rate) * (1 + b.spe.rate);
    if (correction !== 1 || b.levelMultiplier !== 1) {
      text = `(${text})${correction !== 1 ? ` ×${rateFormat(correction)}（補正）` : ''} ×${rateFormat(b.levelMultiplier)}（Lv）`;
    }
    if (profile.ignoreDefense) text += ' / 防御無視';
    else if (profile.defense) text += ` − ${profile.defense}（防御）`;
    return text;
  }
  function formulaPanel(id, manual = false) {
    return `<details class="damage-breakdown" id="formula-${id}"${manual ? ' open' : ''}><summary>${manual ? '手動攻撃' : '自動攻撃'}の計算式・補正内訳</summary>
      <p class="formula-order">（基礎攻撃力 ＋ パーク補正 ＋ アップグレード補正 ＋ SPE補正 ＋ アイテム補正）× 攻撃力Lv倍率</p>
      <dl>${[['base','基礎攻撃力'],['perk','パーク補正'],['upgrade','アップグレード補正'],['spe','SPE補正'],['item','アイテム補正'],['level','攻撃力Lv倍率']].map(([key,label])=>`<div><dt>${label}</dt><dd id="formula-${id}-${key}"></dd></div>`).join('')}</dl>
      <p class="formula-subtotals" id="formula-${id}-subtotals"></p><p class="formula-result" id="formula-${id}-result"></p></details>`;
  }
  function renderFormula(id, profile) {
    const b = profile.breakdown, percent = rate => `${rateFormat(rate * 100)}%`;
    $('formula-' + id + '-base').textContent = `${b.base.dice}D6 + ${b.base.flat}${b.base.source ? `（${b.base.source}適用後）` : ''}`;
    const perk = [];
    if (b.perk.dice) perk.push(`${b.perk.dice}D6`);
    if (b.perk.flat) perk.push(`${b.perk.flat}`);
    if (b.perk.conditional) perk.push(`${b.perk.conditional}（対象への特効）`);
    $('formula-' + id + '-perk').textContent = perk.length ? `＋ ${perk.join(' + ')}` : '0';
    const upgrade = [];
    if (b.upgrade.flat) upgrade.push(`${b.upgrade.flat}（手動訓練）`);
    if (b.upgrade.rate) upgrade.push(`小計A × ${percent(b.upgrade.rate)}（連携戦術）`);
    $('formula-' + id + '-upgrade').textContent = upgrade.length ? `＋ ${upgrade.join(' + ')}` : '0';
    $('formula-' + id + '-spe').textContent = b.spe.rate ? `＋ 小計B × ${percent(b.spe.rate)}（限界突破）` : '0（限界突破なし）';
    $('formula-' + id + '-item').textContent = '0（なし）';
    $('formula-' + id + '-level').textContent = `×${rateFormat(b.levelMultiplier)}（＋${rateFormat((b.levelMultiplier - 1) * 100)}%）`;
    $('formula-' + id + '-subtotals').textContent = (b.upgrade.rate || b.spe.rate) ? `小計A＝${profile.dice}D6 + ${profile.flat}${b.perk.conditional ? ` + ${b.perk.conditional}（特効）` : ''}（基礎＋パーク＋訓練）。小計B＝A${b.upgrade.rate ? `＋A×${percent(b.upgrade.rate)}` : ''}。各補正で同じ出目を使い、振り直しません。` : '';
    $('formula-' + id + '-result').textContent = `合計にLv倍率を掛けて端数切り捨て → ${b.ignoreDefense ? '防御無視' : `防御${b.defense}を引く`}（最低0ダメージ）`;
  }
  const blocked = () => readOnly || corruptSave;
  function notice(text, error = false) {
    $('notice').textContent = text;
    $('notice').classList.toggle('error', error);
    $('notice').hidden = !text;
  }
  function message(text, error = false) {
    $('save-message').textContent = text;
    $('save-message').classList.toggle('error', error);
  }
  function log(text) {
    const row = document.createElement('li'), time = document.createElement('time'), content = document.createElement('span');
    time.textContent = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    content.textContent = text;
    row.append(time, content);
    $('activity-log').prepend(row);
    while ($('activity-log').children.length > 5) $('activity-log').lastElementChild.remove();
  }
  function build() {
    // Allocate a fixed pool once; CSS animates it independently of game ticks.
    for (let i=0; i<UI.MAX_FACTOR_CRYSTALS; i++) {
      const crystal=document.createElement('span'),die=UI.factorDieAppearance(i); crystal.className='factor-crystal factor-die'; crystal.hidden=true;
      crystal.dataset.face=String(die.face);
      crystal.style.left=(-4+((i*.61803398875+.13)%1)*108)+'%';
      crystal.style.setProperty('--crystal-size',die.size+'px');
      crystal.style.setProperty('--die-pips',die.pips);
      crystal.style.setProperty('--rain-duration',(8+i%5)+'s');
      crystal.style.setProperty('--rain-delay',(-i*1.73)+'s');
      crystal.style.setProperty('--rain-drift',((i%2?1:-1)*(8+i%7*4))+'px');
      $('factor-rain').append(crystal);
    }
    for (let i=0;i<UI.MAX_REWARD_DICE;i++) {
      const die=UI.factorDieAppearance(i),node=document.createElement('span');
      node.className='factor-die reward-die';node.hidden=true;node.dataset.face=String(die.face);
      node.style.setProperty('--crystal-size',(12+die.size*.45)+'px');
      node.style.setProperty('--die-pips',die.pips);
      $('reward-rain').append(node);
    }
    $('meta-standing').style.setProperty('--meta-normal-sheet', `url("${D.metaVisual.sheet}")`);
    $('meta-standing').style.setProperty('--meta-burst-sheet', `url("${D.metaVisual.burstSheet}")`);
    $('richter-standing').style.setProperty('--richter-sheet', `url("${D.richterVisual.sheet}")`);
    $('richter-standing').style.setProperty('--richter-burst-sheet', `url("${D.richterVisual.burstSheet}")`);
    $('explosions').style.setProperty('--explosion-sheet', `url("${D.richterVisual.explosionSheet}")`);
    $('explosions').style.setProperty('--blast-duration', `${RICHTER_EXPLOSION_MS}ms`);
    $('party-capacity').textContent = `/ ${D.characters.length}`;
    $('manual-formula').innerHTML = formulaPanel('manual', true);
    for (const src of [D.metaVisual.burstSheet, D.richterVisual.burstSheet, D.richterVisual.bomb, D.richterVisual.explosionSheet,...D.sessions.flatMap(s=>(s.variants||[]).flatMap(v=>[v.sheet||v.image,v.defeatSheet].filter(Boolean)))]) { const preload = new Image(); preload.src = src; }
    $('character-list').innerHTML = D.characters.map(c => `<article class="character-card compact-character" id="card-${c.id}" style="--char-color:${c.color}">
      <button class="character-select" data-select-character="${c.id}" aria-label="${c.name}を手動攻撃に選択" aria-pressed="false" title="クリックで手動攻撃の担当に選択"><span class="avatar ${c.portrait ? 'sprite-avatar' : ''}" aria-hidden="true">${c.portrait ? `<img class="pixel-art" src="${c.portrait}" alt="">` : c.initials}</span><strong class="character-identity">${c.name}</strong></button>
      <div class="character-controls">
        <div class="enhancement-row"><button class="button secondary hire-button" data-hire="${c.id}"><span id="hire-label-${c.id}"></span><span id="hire-cost-${c.id}"></span></button><strong class="current-multiplier" id="damage-bonus-${c.id}" title="攻撃力Lvによる現在の倍率"></strong></div>
        <div class="enhancement-row"><button class="button secondary hire-button action-button" data-action="${c.id}"><span id="action-label-${c.id}"></span><span id="action-cost-${c.id}"></span></button><strong class="current-multiplier action-multiplier" id="action-bonus-${c.id}" title="行動力の基礎値に対する現在の倍率"></strong></div>
      </div>
      ${c.perks ? `<details class="perk-list"><summary>パーク<span id="perk-summary-${c.id}"></span></summary>${c.perks.map(p => `<div class="perk" id="perk-${c.id}-${p.id}"><div><span>Lv.${p.level}</span><strong>${p.name}</strong><span class="perk-status"></span></div><p>${p.description}</p><button class="button secondary perk-buy" data-perk-character="${c.id}" data-perk="${p.id}"></button></div>`).join('')}</details>` : ''}
      <p class="current-attack"><span>攻撃力の現在式</span><strong id="stats-${c.id}"></strong></p></article>`).join('');

    $('upgrade-list').innerHTML = D.upgrades.map(u => `<article class="upgrade-card"><span class="upgrade-icon" aria-hidden="true">${u.icon}</span><span class="upgrade-level" id="upgrade-level-${u.id}">Lv.0</span><h3>${u.name}</h3><p>${u.label}</p>${u.id === 'overkill' ? '<p>1回購入で解放。報酬倍率とは別に加算</p>' : ''}<div class="upgrade-purchase"><button class="button secondary" data-upgrade="${u.id}" aria-label="${u.name}を購入"><span id="upgrade-cost-${u.id}"></span></button>${['power','reward'].includes(u.id) ? `<span class="enhancement-bonus"><small>${u.id === 'power' ? 'ダメージ補正' : '報酬補正'}</small><strong id="${u.id}-bonus">＋0%</strong></span>` : ''}</div></article>`).join('');
  }
  function renderBattleHUD() {
    const session = E.getSession(state), hp = displayedHP === null ? state.hp : displayedHP;
    setText('factors', money(state.factors)); setText('kills', UI.fullNumber(state.kills));
    setText('hp-text', `${format(Math.ceil(hp))} / ${format(session.hp)}`);
    const width = `${hp / session.hp * 100}%`;
    if ($('hp-fill').style.width !== width) $('hp-fill').style.width = width;
    for (const [name, value] of [['aria-valuemax', session.hp], ['aria-valuenow', hp]]) {
      if ($('hp-progress').getAttribute(name) !== String(value)) $('hp-progress').setAttribute(name, value);
    }
  }
  function requestBattleRender() {
    if (battleRender !== null || document.hidden) return;
    battleRender = requestAnimationFrame(() => { battleRender = null; renderBattleHUD(); });
  }
  function render() {
    renderBattleHUD();
    // Action-clock fractions and visual HP do not change cards, formulas or prices.
    const key = JSON.stringify([state.factors, state.sessionId, state.selectedCharacterId,
      state.levels, state.actionLevels, state.upgrades, state.purchasedPerks,
      Math.ceil(state.boostSeconds), state.paused, blocked()]);
    if (key === controlsKey) return;
    controlsKey = key;
    const session = E.getSession(state);
    $('dps').textContent = rateFormat(E.dps(state));
    const income = E.expectedIncome(state);
    renderFactorRain(income.factorsPerSecond);
    setText('income-rate', UI.incomeNumber(income.factorsPerSecond));
    setText('income-context', `${session.name} / ${state.paused ? '再開時の見込み' : '自動周回'}`);
    setText('income-formula', `${session.name}：約${UI.incomeNumber(income.clearsPerSecond)}周 / 秒 × ${money(income.reward)}Rd / 周${state.upgrades.overkill ? ` ＋ 約${UI.incomeNumber(income.bonusPerSecond)}Rd / 秒（オーバーキル）` : ''} ＝ 約${UI.incomeNumber(income.factorsPerSecond)}Rd / 秒（表示は丸め、計算は丸め前の値を使用）。`);
    setText('income-condition', income.boosted ? 'SPE：限界突破有効中の性能で算出。効果が切れると見込みを更新します。' : '現在の攻撃性能で自動周回を続けた場合の見込みです。一時停止中も再開時の性能を表示します。');
    $('party-count').textContent = D.characters.filter(c => state.levels[c.id] > 0).length;
    renderEnemy(session);
    $('battle-area').textContent = session.area;
    $('session-code').textContent = `SESSION ${session.code} / ${session.name}`;
    $('session-description').textContent = session.description;
    $('enemy-rules').textContent = `防御 ${E.enemyDefense(session)} / 属性：${(session.traits || []).map(t => D.enemyTraits[t] || t).join('・') || 'なし'}`;
    $('reward').textContent = `◇ ${money(E.reward(state))}Rd`;
    const selected = E.selectedCharacter(state);
    $('manual-actor').textContent = `手動攻撃：${selected ? selected.name : 'あなた'}`;
    $('select-self').hidden = !selected;
    $('select-self').disabled = blocked();
    $('attack').setAttribute('aria-label', `${selected ? selected.name : 'あなた'}で攻撃する`);
    const manualProfile = E.attackProfile(state, selected, true);
    $('click-formula').textContent = attackFormula(manualProfile);
    renderFormula('manual', manualProfile);
    $('loop-status').textContent = blocked() ? '● 待機中' : state.paused ? 'Ⅱ 一時停止' : '● 自動周回';
    $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', state.paused ? '周回を再開' : '周回を一時停止');
    $('pause').disabled = blocked();
    $('attack').disabled = blocked() || state.paused;
    $('save-now').disabled = blocked();
    $('confirm-import').disabled = readOnly;
    for (const c of D.characters) {
      const level = state.levels[c.id], cost = E.hireCost(state, c);
      $('card-' + c.id).classList.toggle('owned', level > 0);
      $('card-' + c.id).classList.toggle('manual-selected', state.selectedCharacterId === c.id);
      const selectButton = document.querySelector(`[data-select-character="${c.id}"]`);
      selectButton.disabled = blocked() || !level;
      selectButton.setAttribute('aria-pressed', state.selectedCharacterId === c.id);
      const profile = E.attackProfile(state, c);
      $('stats-' + c.id).textContent = attackFormula(profile);
      $('damage-bonus-' + c.id).textContent = `×${rateFormat(profile.breakdown.levelMultiplier)}`;
      $('action-bonus-' + c.id).textContent = `×${rateFormat(1 + state.actionLevels[c.id] * D.balance.actionPerLevel)}`;
      $('hire-label-' + c.id).textContent = `${level >= E.MAX_LEVEL ? '攻撃力最大' : level ? '攻撃力を強化' : '雇用する'}（Lv.${UI.fullNumber(level)}）`;
      $('hire-cost-' + c.id).textContent = level >= E.MAX_LEVEL ? 'MAX' : `◇ ${money(cost)}Rd`;
      const button = document.querySelector(`[data-hire="${c.id}"]`);
      button.disabled = blocked() || state.factors < cost || level >= E.MAX_LEVEL;
      button.setAttribute('aria-label', `${c.name}${level ? 'の攻撃力を強化' : 'を雇用'}（現在Lv.${UI.fullNumber(level)}） · 因子${money(cost)}Rd`);
      const actionCost = E.actionCost(state, c), actionButton = document.querySelector(`[data-action="${c.id}"]`);
      $('action-label-' + c.id).textContent = `行動力を強化（Lv.${UI.fullNumber(state.actionLevels[c.id])}）`;
      $('action-cost-' + c.id).textContent = `◇ ${Number.isFinite(actionCost)?money(actionCost)+'Rd':'計算範囲外'}`;
      actionButton.disabled = blocked() || !level || state.factors < actionCost || !Number.isSafeInteger(state.actionLevels[c.id] + 1);
      actionButton.setAttribute('aria-label', `${c.name}の行動力を強化（現在Lv.${UI.fullNumber(state.actionLevels[c.id])}） · 因子${Number.isFinite(actionCost)?money(actionCost)+'Rd':'計算範囲外'}`);
      if (c.perks) {
        const perks = E.perks(state, c), active = perks.filter(p => p.unlocked), next = perks.find(p => !p.unlocked);
        const ready = perks.filter(p => p.eligible && !p.unlocked).length;
        $('perk-summary-' + c.id).textContent = `${active.length}/${perks.length} 解放${ready ? `・${ready}件購入待ち` : next ? `・次 Lv.${next.level}` : '・全解放'}`;
        for (const p of perks) {
          const row = $(`perk-${c.id}-${p.id}`);
          row.classList.toggle('unlocked', p.unlocked);
          const targetAbsent = p.targetTrait && !(session.traits || []).includes(p.targetTrait);
          row.querySelector('.perk-status').textContent = p.unlocked ? (targetAbsent ? '解放済・対象外' : p.diceEvery ? `有効 ＋${p.dice}D6` : '有効') : p.eligible ? '購入待ち' : 'Lv未達成';
          const buy = row.querySelector('[data-perk]');
          buy.disabled = blocked() || p.unlocked || !p.eligible || state.factors < p.cost;
          buy.hidden = p.unlocked;
          buy.textContent = `${!p.eligible ? `Lv.${p.level}で購入可能` : state.factors < p.cost ? '因子不足' : '解放する'} · ◇ ${money(p.cost)}Rd`;
          buy.setAttribute('aria-label', `${c.name}の${p.name}を解放 · 因子${money(p.cost)}Rd`);
        }
      }
    }
    for (const u of D.upgrades) {
      const maxed = u.max != null && state.upgrades[u.id] >= u.max, cost=E.upgradeCost(state,u);
      $('upgrade-level-' + u.id).textContent = u.max === 1 ? (maxed ? '解放済' : '未解放') : `Lv.${state.upgrades[u.id]}`;
      $('upgrade-cost-' + u.id).textContent = maxed ? (u.max === 1 ? '解放済' : 'MAX') : Number.isFinite(cost)?`購入 · ◇ ${money(cost)}Rd`:'計算範囲外';
      document.querySelector(`[data-upgrade="${u.id}"]`).disabled = blocked() || maxed || !Number.isFinite(cost) || !Number.isSafeInteger(state.upgrades[u.id]+1) || state.factors < cost;
    }
    $('power-bonus').textContent = `＋${rateFormat(state.upgrades.power * D.balance.upgradeDamagePerLevel * 100)}%`;
    $('reward-bonus').textContent = `＋${rateFormat(state.upgrades.reward * D.balance.rewardPerLevel * 100)}%`;
    const boostCost = E.boostCost(state);
    $('boost').textContent = state.boostSeconds > 0 ? `効果中 · 残り${Math.ceil(state.boostSeconds)}秒` : `使用 · ◇ ${money(boostCost)}Rd`;
    $('boost').disabled = blocked() || boostCost <= 0 || !Number.isFinite(boostCost) || state.factors < boostCost || state.boostSeconds > 0;
    setText('boost-cost-rule', `通常DPS ${rateFormat(E.unboostedDps(state))} × ${D.balance.boostCostDpsRatio*100}% → ${money(boostCost)}Rd（端数切り上げ）`);
    renderMeta();
    const richter = D.characters.find(c => c.id === 'richter'), hired = state.levels.richter > 0;
    if ($('arena').classList.contains('has-richter') !== hired) combatGeometry = null;
    $('arena').classList.toggle('has-richter', hired);
    $('richter-combatant').hidden = !hired;
    $('richter-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('richter-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'richter');
    $('richter-select').disabled = blocked() || !hired;
    $('richter-select').setAttribute('aria-pressed', state.selectedCharacterId === 'richter');
    $('richter-caption').textContent = `威力Lv.${state.levels.richter} / 爆弾 ×${format(E.bombCount(state).total)} / 大きさ ×${rateFormat(E.weaponScale(state, 'richter'))}${E.hasOverflow(state, richter) ? ' / 巻き込み' : ''}`;
    renderRichterOrbits();
    renderOrbitSpacing();
  }
  function enemyMotionState() {
    const paused=state.paused || blocked() || document.hidden || reducedMotion.matches;
    $('arena').classList.toggle('enemy-paused', paused);
    $('arena-viewport').classList.toggle('scene-paused', paused);
  }
  function renderFactorRain(income) {
    const count=UI.factorRainCount(income);
    if(count===shownCrystals)return;
    shownCrystals=count;
    for(const [i,crystal] of Array.from($('factor-rain').children).entries())crystal.hidden=i>=count;
  }
  function showRewardRain(frame) {
    if(document.hidden || reducedMotion.matches || state.paused) return;
    let remaining=UI.rewardDiceCount(frame.clears),launched=0;
    const pool=$('reward-rain').children;
    // Reuse idle particles; an ongoing fall is never cut short to make room.
    for(let checked=0;checked<pool.length && remaining>0;checked++) {
      const index=rewardDieIndex++%pool.length,node=pool[index];
      if(!node.hidden)continue;
      const duration=650+Math.round(Math.random()*250),delay=launched*35;
      node.style.left=(-4+((index*.61803398875+Math.random()*.1)%1)*108)+'%';
      node.style.setProperty('--reward-duration',duration+'ms');
      node.style.setProperty('--reward-delay',delay+'ms');
      node.style.setProperty('--rain-drift',((Math.random()-.5)*60)+'px');
      node.hidden=false;node.dataset.impactId=visualHitId;
      deferVisual(()=>{node.hidden=true;},duration+delay+30);
      remaining--;launched++;
    }
  }
  function renderScene(session) {
    const viewport=$('arena-viewport'), background=session.background||'';
    if(viewport.dataset.scene===background)return;
    viewport.dataset.scene=background;
    viewport.classList.toggle('has-scene',!!background);
    viewport.style.setProperty('--session-background',background?'url("'+background+'")':'none');
  }
  function setEnemyAppearance(node, appearance, role) {
    node.setAttribute('role','img');
    node.setAttribute('aria-label',role+appearance.name);
    node.classList.toggle('animated-enemy',!!appearance.sheet);
    node.classList.toggle('pixel-art',!!appearance.sheet);
    const source=appearance.sheet||appearance.image;
    if(appearance.defeatSheet)node.dataset.defeatSheet=appearance.defeatSheet;
    else delete node.dataset.defeatSheet;
    if(node.dataset.appearance===source)return;
    node.dataset.appearance=source;
    let sprite=node.firstElementChild;
    if(!sprite){sprite=document.createElement('span');sprite.className='enemy-sprite';sprite.setAttribute('aria-hidden','true');node.append(sprite);}
    sprite.style.setProperty('--enemy-image','url("'+source+'")');
    sprite.style.setProperty('--foot-shift',((211-(appearance.footY??211))/224*100)+'%');
  }
  function renderEnemy(session, steps = 0) {
    renderScene(session);
    $('enemy-name').hidden = !!session.variants;
    const variants=session.variants||[],formation=variants.length>=3;
    if(enemyVariantSession!==session.id){enemyVariantSession=session.id;enemyQueue=variants.map((_,i)=>i);}
    // Only three visual slots; aggregated clears advance by modulo without
    // allocating a queue proportional to actual kills or altering combat state.
    if(steps&&enemyQueue.length)for(let i=0;i<steps%enemyQueue.length;i++)enemyQueue.push(enemyQueue.shift());
    const appearance=variants[enemyQueue[0]]||{name:session.enemy,image:session.image};
    setText('enemy-name',appearance.name);
    setEnemyAppearance($('enemy-art'),appearance,formation?'攻撃対象：':'');
    $('arena').classList.toggle('mohican-line',formation);
    for(let i=1;i<=2;i++){
      const node=$('enemy-next-'+i);node.hidden=!formation;
      if(formation)setEnemyAppearance(node,variants[enemyQueue[i]],'後続'+i+'：');
    }
    enemyMotionState();
  }
  function renderOrbitSpacing(width = arenaViewportWidth) {
    arenaViewportWidth = width || $('arena-viewport').clientWidth || 300;
    const options = {metaScale:E.weaponScale(state,'meta'),richterScale:E.weaponScale(state,'richter'),metaCount:E.sawCount(state).visible,richterCount:E.bombCount(state).visible,
      richterHired:state.levels.richter>0,enemyCount:(E.getSession(state).variants||[]).length>=3?3:1,grounded:!!E.getSession(state).background,width:arenaViewportWidth,mobile:window.matchMedia('(max-width:600px)').matches};
    const key = JSON.stringify(options);
    if (key === orbitLayoutKey) return;
    orbitLayoutKey = key;
    const layout = UI.orbitLayout(options), arena = $('arena'), viewport = $('arena-viewport');
    arena.classList.toggle('grounded',options.grounded);
    arena.style.width = `${layout.width}px`; arena.style.height = `${layout.height}px`;
    arena.style.transform = `translateX(${layout.offsetX}px) scale(${layout.zoom})`;
    viewport.style.height = `${layout.viewHeight}px`;
    viewport.style.setProperty('--scene-width',`${layout.viewWidth}px`);
    viewport.style.setProperty('--rain-distance',`${layout.viewHeight+100}px`);
    arena.style.setProperty('--enemy-x', `${layout.enemyX}px`);
    arena.style.setProperty('--enemy-y', `${layout.enemyY}px`);
    arena.style.setProperty('--enemy-width', `${layout.enemyWidth}px`);
    arena.style.setProperty('--enemy-height', `${layout.enemyHeight}px`);
    arena.style.setProperty('--enemy-foot', `${layout.enemyFoot || 0}px`);
    layout.reserves.forEach((p,i)=>{arena.style.setProperty(`--reserve-${i+1}-x`,`${p.x}px`);arena.style.setProperty(`--reserve-${i+1}-y`,`${p.y}px`);});
    for (const id of ['meta','richter']) {
      const placement = layout[id], actor = $(`${id}-combatant`), orbit = $(`${id}-orbits`);
      actor.style.left = `${placement.x}px`; actor.style.top = `${placement.y}px`;
      actor.style.setProperty('--orbit-half', `${(placement.extentY||placement.footprint)/2}px`);
      actor.style.setProperty('--body-foot', `${placement.footOffset || 0}px`);
      orbit.style.setProperty('--orbit-width', `${placement.width}px`);
      orbit.style.setProperty('--orbit-height', `${placement.height}px`);
    }
    $('arena-zoom').hidden = layout.zoom >= .999;
    setText('arena-zoom', `自動ズーム ${Math.round(layout.zoom * 100)}%`);
    combatGeometry = null;
  }
  function renderRichterOrbits() {
    const count = E.bombCount(state), orbits = $('richter-orbits');
    orbits.style.setProperty('--weapon-scale', E.weaponScale(state, 'richter'));
    orbits.title = `行動力強化Lv.${format(state.actionLevels.richter)} / 浮遊数${format(count.total)}（表示${count.visible}）`;
    if (shownBombs === count.visible) return;
    shownBombs = count.visible;
    orbits.replaceChildren(); orbits.classList.toggle('dense', count.visible > 12);
    const rings = count.visible <= 12 ? [[count.visible, 44]] : count.visible <= 32
      ? [[12, 28], [count.visible - 12, 45]] : [[12, 22], [20, 34], [count.visible - 32, 46]];
    rings.forEach(([amount, radius], ringIndex) => {
      const ring = document.createElement('span'); ring.className = 'creature-ring';
      ring.style.setProperty('--orbit-duration', `${14 + ringIndex * 4}s`);
      ring.style.setProperty('--orbit-direction', ringIndex % 2 ? 'reverse' : 'normal');
      for (let i = 0; i < amount; i++) {
        const angle = i / amount * Math.PI * 2 - Math.PI / 2 + ringIndex * .18;
        const slot = document.createElement('span'); slot.className = 'creature-slot';
        slot.style.left = `${50 + Math.cos(angle) * radius}%`;
        slot.style.top = `${50 + Math.sin(angle) * radius}%`;
        const img = document.createElement('img'); img.src = D.richterVisual.bomb;
        img.alt = ''; img.className = 'richter-creature pixel-art'; img.width = 48; img.height = 48;
        slot.append(img); ring.append(slot);
      }
      orbits.append(ring);
    });
  }
  function renderMeta() {
    const count = E.sawCount(state);
    $('meta-orbits').style.setProperty('--weapon-scale', E.weaponScale(state, 'meta'));
    $('meta-orbits').title = `行動力強化Lv.${format(state.actionLevels.meta)} / 浮遊数${format(count.total)}（表示${count.visible}）`;
    $('meta-combatant').classList.toggle('unhired', count.total === 0);
    $('meta-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('meta-select').disabled = blocked() || !state.levels.meta;
    $('meta-select').setAttribute('aria-pressed', state.selectedCharacterId === 'meta');
    $('meta-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'meta');
    $('meta-saw-count').textContent = count.total ? `威力Lv.${state.levels.meta} / 丸鋸 ×${format(count.total)} / 大きさ ×${rateFormat(E.weaponScale(state, 'meta'))}` : '雇用すると参戦';
    // Each ring moves as one layer; rebuild only when the visible count changes.
    if (shownSaws !== count.visible) {
      shownSaws = count.visible;
      $('meta-orbits').replaceChildren();
      $('meta-orbits').classList.toggle('dense', count.visible > 12);
      const rings = count.visible <= 12 ? [[count.visible, 44]] : count.visible <= 32
        ? [[12, 27], [count.visible - 12, 44]] : [[12, 21], [20, 33], [count.visible - 32, 45]];
      rings.forEach(([amount, radius], ringIndex) => {
        const ring = document.createElement('span'); ring.className = 'saw-ring';
        ring.style.animationDuration = `${10 + ringIndex * 4}s`;
        ring.style.animationDirection = ringIndex % 2 ? 'reverse' : 'normal';
        for (let i = 0; i < amount; i++) {
          const angle = i / amount * Math.PI * 2 - Math.PI / 2 + ringIndex * .18;
          const slot = document.createElement('span'); slot.className = 'saw-slot';
          slot.style.left = `${50 + Math.cos(angle) * radius}%`;
          slot.style.top = `${50 + Math.sin(angle) * radius}%`;
          const img = document.createElement('img'); img.src = D.metaVisual.saw;
          img.alt = ''; img.className = 'meta-saw pixel-art'; img.width = 32; img.height = 32;
          img.style.animationDelay = `${-i * .13}s`;
          slot.append(img); ring.append(slot);
        }
        $('meta-orbits').append(ring);
      });
    }
  }
  function labelProjectile(flight, count) {
    flight.dataset.attackCount = count;
    let label = flight.querySelector('.projectile-count');
    if (count > 1) {
      if (!label) { label = document.createElement('span'); label.className = 'projectile-count'; flight.append(label); }
      label.textContent = `×${format(count)}`;
    }
  }
  function deferVisual(callback, milliseconds) {
    const id = setTimeout(() => { visualTimers.delete(id); callback(); }, milliseconds);
    visualTimers.add(id); return id;
  }
  function cancelVisual(id) { clearTimeout(id); visualTimers.delete(id); }
  function continuousBurst(actor) {
    const character = D.characters.find(c => c.id === actor);
    return !blocked() && !state.paused && !document.hidden && !reducedMotion.matches &&
      state.levels[actor] > 0 && E.actionPower(state, character) >= 2 * D.balance.actionThreshold;
  }
  function readCombatGeometry() {
    if (!combatGeometry) {
      const enemy = $('enemy-art'), meta = $('meta-combatant'), richter = $('richter-combatant');
      combatGeometry = {enemyX:enemy.offsetLeft, enemyY:enemy.offsetTop,
        metaX:meta.offsetLeft, metaY:meta.offsetTop, richterX:richter.offsetLeft, richterY:richter.offsetTop,
        richterScale:$('richter-standing').offsetHeight / 224};
    }
    return combatGeometry;
  }
  function restartAnimation(element, name) {
    // Restart the CSS timeline without removing classes and forcing a layout read.
    for (const animation of element.getAnimations()) if (animation.animationName === name) animation.currentTime = 0;
  }
  function finishBurst(actor) {
    // Every game tick will supply another multi-hit volley: keep the same cycle
    // across that tick boundary. Finite/manual bursts still end at last release.
    if (continuousBurst(actor)) return;
    const combatant = $(`${actor}-combatant`);
    if (!combatant.classList.contains('bursting')) return;
    combatant.classList.remove('bursting', 'attacking');
    if (actor === 'meta') lastMetaAttack = -Infinity;
  }
  function animateMetaAttack(count, volleyCount = count, summarized = false) {
    if (!state.levels.meta || reducedMotion.matches || document.hidden) return;
    const now = performance.now();
    const combatant = $('meta-combatant');
    const burst = volleyCount > 1 || count > 1 || now - lastMetaShot < 280;
    lastMetaShot = now;
    // The pose may finish, but its cooldown never discards a projectile.
    // A multi-hit volley (or rapid manual clicks) takes priority immediately.
    if (burst || combatant.classList.contains('bursting')) {
      combatant.classList.remove('attacking');
      combatant.classList.add('bursting');
      clearTimeout(metaAttackTimer);
    } else if (now - lastMetaAttack >= 650) {
      lastMetaAttack = now;
      $('meta-combatant').classList.add('attacking');
      clearTimeout(metaAttackTimer);
      metaAttackTimer = setTimeout(() => $('meta-combatant').classList.remove('attacking'), 620);
    }
    const layer = $('saw-projectiles');
    const groups = FX.projectileGroups(count, FX.MAX_PROJECTILES - layer.children.length, summarized);
    if (!groups.length && layer.lastElementChild) {
      labelProjectile(layer.lastElementChild, Number(layer.lastElementChild.dataset.attackCount) + count);
      return 0;
    }
    const geometry = readCombatGeometry();
    groups.forEach((amount, index) => {
      const flight = document.createElement('span'); flight.className = 'saw-projectile';
      flight.style.setProperty('--weapon-scale', E.weaponScale(state, 'meta'));
      const delay = 60 + (groups.length > 1 ? index / (groups.length - 1) * 160 : 0);
      flight.style.setProperty('--flight-duration', `${FX.PROJECTILE_FLIGHT_MS}ms`);
      flight.style.setProperty('--travel', `${geometry.enemyX - geometry.metaX}px`);
      flight.style.left = `${geometry.metaX}px`;
      flight.style.top = `${geometry.metaY - 18}px`;
      flight.style.setProperty('--rise', `${geometry.enemyY - geometry.metaY + 8}px`);
      flight.style.setProperty('--lane', `${(index % 5 - (Math.min(5, groups.length) - 1) / 2) * 24}px`);
      flight.style.setProperty('--launch-delay', `${delay}ms`);
      const img = document.createElement('img'); img.src = D.metaVisual.saw; img.alt = '';
      img.className = 'meta-saw pixel-art'; flight.append(img);
      labelProjectile(flight, amount); layer.append(flight);
      deferVisual(() => flight.remove(), FX.PROJECTILE_FLIGHT_MS + delay + 80);
    });
    // A grouped extreme-rate launch spreads its projectiles over 160ms.
    return groups.length > 1 ? 220 : 60;
  }
  function animateRichterAttack(count, volleyCount = count, summarized = false) {
    if (!state.levels.richter || reducedMotion.matches || document.hidden) return;
    const combatant = $('richter-combatant'), layer = $('richter-projectiles');
    const now = performance.now(), burst = volleyCount > 1 || now - lastRichterShot < 280;
    lastRichterShot = now;
    if (burst || combatant.classList.contains('bursting')) {
      combatant.classList.remove('attacking'); combatant.classList.add('bursting');
    } else {
      combatant.classList.add('attacking');
      restartAnimation($('richter-standing'), 'richter-frames');
      restartAnimation(combatant.querySelector('.meta-body'), 'meta-lunge');
    }
    cancelVisual(richterAttackTimer);
    const throwDelay = combatant.classList.contains('bursting') ? 80 : 200;
    if (!combatant.classList.contains('bursting')) {
      richterAttackTimer = deferVisual(() => combatant.classList.remove('attacking'), 620);
    }
    const groups = FX.projectileGroups(count, FX.MAX_PROJECTILES - layer.children.length, summarized);
    if (!groups.length && layer.lastElementChild) labelProjectile(layer.lastElementChild, Number(layer.lastElementChild.dataset.attackCount) + count);
    const geometry = readCombatGeometry();
    for (const amount of groups) {
      const flight = document.createElement('span'); flight.className = 'richter-projectile';
      flight.style.setProperty('--weapon-scale', E.weaponScale(state, 'richter'));
      flight.style.setProperty('--throw-delay', `${throwDelay}ms`);
      flight.style.setProperty('--flight-duration', `${FX.PROJECTILE_FLIGHT_MS}ms`);
      const mobile = geometry.richterScale;
      const startX = geometry.richterX + 62 * mobile, startY = geometry.richterY - 32 * mobile;
      flight.style.left = `${startX}px`; flight.style.top = `${startY}px`;
      flight.style.setProperty('--travel', `${geometry.enemyX - startX}px`);
      flight.style.setProperty('--rise', `${geometry.enemyY - startY}px`);
      const img = document.createElement('img'); img.src = D.richterVisual.bomb; img.alt = ''; img.className = 'pixel-art'; flight.append(img);
      labelProjectile(flight, amount); layer.append(flight); deferVisual(() => flight.remove(), throwDelay + FX.PROJECTILE_FLIGHT_MS + 80);
    }
    return throwDelay;
  }
  function resetCombatVisuals(resetRoll = false) {
    playback.reset();
    if (battleRender !== null) cancelAnimationFrame(battleRender); battleRender = null;
    for (const id of visualTimers) clearTimeout(id); visualTimers.clear();
    clearTimeout(metaAttackTimer);
    displayedHP = null; lastRichterShot = -Infinity; visualHitId++;
    lastMetaAttack = -Infinity; lastMetaShot = -Infinity;
    $('arena').classList.remove('enemy-down', 'enemy-spawning', 'clear', 'hit', 'combat-playing');
    $('enemy-defeats').replaceChildren();
    $('meta-combatant').classList.remove('attacking', 'bursting');
    $('saw-projectiles').replaceChildren(); $('damage-floats').replaceChildren();
    $('richter-combatant').classList.remove('attacking', 'bursting');
    $('richter-projectiles').replaceChildren(); $('explosions').replaceChildren();
    $('hit-effects').replaceChildren();
    for(const die of $('reward-rain').children)die.hidden=true;
    rewardDieIndex=0;
    if (resetRoll) $('last-roll').textContent = '仲間を雇うか、攻撃して開始';
  }
  function animateEnemyDown(frame, motion) {
    const layer = $('enemy-defeats');
    while (layer.children.length >= FX.MAX_STEPS * 2) layer.firstElementChild.remove();
    const ghost = $('enemy-art').cloneNode(true);
    ghost.removeAttribute('id'); ghost.removeAttribute('aria-label'); ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('enemy-defeat'); ghost.dataset.clearCount = frame.clears;
    ghost.dataset.reason = frame.knockouts === frame.clears ? 'knockout' : 'hp';
    ghost.dataset.fallDirection = motion.fallDirection;
    ghost.dataset.impactId = visualHitId;
    const hasDefeatSheet = !!ghost.dataset.defeatSheet;
    const fallMs = motion.fallMs + (hasDefeatSheet ? 240 : 0);
    if (hasDefeatSheet) {
      ghost.classList.add('has-defeat-sheet');
      ghost.firstElementChild.style.setProperty('--enemy-image', 'url("'+ghost.dataset.defeatSheet+'")');
    }
    ghost.style.setProperty('--fall-x', `${motion.fallX}px`);
    ghost.style.setProperty('--fall-y', `${motion.fallY}px`);
    ghost.style.setProperty('--pop-y', `${motion.popY}px`);
    ghost.style.setProperty('--fall-angle', `${motion.fallAngle}deg`);
    ghost.style.setProperty('--fall-scale', motion.fallScale);
    ghost.style.setProperty('--fall-duration', `${fallMs}ms`);
    ghost.style.marginLeft = `${motion.x * .25}px`;
    const label = document.createElement('span'); label.className = 'enemy-down-label defeat-label';
    label.textContent = frame.knockouts === frame.clears ? '気絶！' : 'DOWN';
    if (frame.overkills) label.textContent += ` / OVERKILL ＋${money(frame.overkills)}Rd`;
    if (frame.clears > 1) label.textContent += ` ×${format(frame.clears)}`;
    label.style.marginLeft = `${motion.x}px`;
    label.style.marginTop = `${motion.y}px`;
    label.style.setProperty('--label-drift', `${motion.fallX * .25}px`);
    label.style.setProperty('--fall-duration', `${fallMs}ms`);
    layer.append(ghost, label);
    renderEnemy(E.getSession(state), frame.clears);
    deferVisual(() => { ghost.remove(); label.remove(); }, fallMs + 20);
    const formation=$('arena').classList.contains('mohican-line');
    const now=performance.now();
    // At rapid clear rates, let the current step finish instead of constantly
    // pulling the new target away from the impact position. Slots still rotate.
    if(!formation || now-lastEnemyAdvance>=180){
      cancelVisual(spawnTimer);
      $('arena').classList.add('enemy-spawning');
      restartAnimation($('enemy-art'), formation?'mohican-step-front':'enemy-spawn');
      if(formation){restartAnimation($('enemy-next-1'),'mohican-step-next');restartAnimation($('enemy-next-2'),'mohican-step-enter');}
      spawnTimer = deferVisual(() => $('arena').classList.remove('enemy-spawning'), 180);
    }
    lastEnemyAdvance=now;
  }
  function showLaunch(frame) {
    $('arena').classList.add('combat-playing');
    if (displayedHP === null && Number.isFinite(frame.hpBefore)) displayedHP = frame.hpBefore;
    const meta = frame.metaAttacks ? animateMetaAttack(frame.metaAttacks,frame.volleyMetaCount,frame.approximate) : 0;
    const richter = frame.richterAttacks ? animateRichterAttack(frame.richterAttacks,frame.volleyRichterCount,frame.approximate) : 0;
    const continuation = frame.continuation ? (continuousBurst('richter') ? 80 : 200) : 0;
    return {meta,richter,impact:Math.max(meta||0,richter||0,continuation)+FX.PROJECTILE_FLIGHT_MS};
  }
  function showImpact(frame) {
    visualHitId++;
    const motion = FX.impactMotion();
    const sparks=$('hit-effects');
    while(sparks.children.length>=32)sparks.firstElementChild.remove();
    const spark=document.createElement('span');spark.className='hit-spark';spark.dataset.impactId=visualHitId;
    spark.style.marginLeft=motion.x+'px';spark.style.marginTop=motion.y+'px';
    spark.style.setProperty('--spark-angle',motion.recoilAngle*3+'deg');
    sparks.append(spark);deferVisual(()=>spark.remove(),320);
    if (frame.actorId === 'richter' || frame.richterAttacks) {
      const layer = $('explosions');
      // Keep each ordinary impact independent, including overflow targets.
      // At extreme rates bound the number of lingering smoke animations.
      while (layer.children.length >= FX.MAX_STEPS) layer.firstElementChild.remove();
      const blast = document.createElement('span'); blast.className = `richter-explosion${frame.continuation ? ' chain-explosion' : ''}`;
      blast.dataset.impactId = visualHitId;
      blast.style.marginLeft = `${motion.x}px`; blast.style.marginTop = `${motion.y}px`;
      const fireball = document.createElement('span'); fireball.className = 'blast-fireball pixel-art';
      const sparks = document.createElement('span'); sparks.className = 'blast-sparks';
      blast.append(fireball, sparks);
      layer.append(blast); deferVisual(() => blast.remove(), RICHTER_EXPLOSION_MS);
    }
    if (Number.isFinite(frame.hpAfter)) displayedHP = frame.hpAfter;
    const floating = document.createElement('span'); floating.className = 'damage-float';
    floating.dataset.attackCount = frame.count;
    floating.dataset.impactId = visualHitId;
    floating.textContent = `${frame.approximate ? '合計 ' : ''}${format(frame.damage)}`;
    floating.style.marginLeft = `${motion.x}px`; floating.style.marginTop = `${motion.y}px`;
    floating.style.setProperty('--float-drift', `${motion.driftX}px`);
    floating.style.setProperty('--float-rise', `${-motion.floatRise}px`);
    if (frame.count > 1 || frame.knockoutRoll || frame.continuation) {
      const detail = document.createElement('small');
      detail.textContent = `${frame.continuation ? '巻き込み ' : ''}${frame.knockoutRoll ? `気絶判定 ${frame.knockoutRoll}：${frame.knockedOut ? '気絶' : '回避'}` : frame.count > 1 ? `${format(frame.count)}${frame.continuation ? '体' : '回'}` : ''}`;
      floating.append(detail);
    }
    while ($('damage-floats').children.length >= FX.MAX_STEPS) $('damage-floats').firstElementChild.remove();
    $('damage-floats').append(floating);
    deferVisual(() => floating.remove(), 850);
    $('last-roll').textContent = `${frame.actor} / ${format(frame.damage)} DMG${frame.continuation ? '・巻き込み' : ''}${frame.count > 1 ? `・${format(frame.count)}${frame.continuation ? '体' : '回'}（合計）` : ''}${frame.knockoutRoll ? ` / 気絶判定${frame.knockoutRoll}：${frame.knockedOut ? '気絶' : '回避'}` : ''}`;
    cancelVisual(hitTimer); $('arena').classList.remove('hit');
    if (!frame.clears) {
      const target = $('enemy-art');
      target.style.setProperty('--hit-x', `${motion.recoilX}px`);
      target.style.setProperty('--hit-y', `${motion.recoilY}px`);
      target.style.setProperty('--hit-angle', `${motion.recoilAngle}deg`);
      $('arena').classList.add('hit');
      restartAnimation(target, 'enemy-impact-varied');
      hitTimer = deferVisual(() => $('arena').classList.remove('hit'), 180);
    }
    if (frame.clears) {
      showRewardRain(frame);
      animateEnemyDown(frame, motion);
      const hitId = visualHitId;
      deferVisual(() => { if (hitId === visualHitId && Number.isFinite(frame.endHP)) { displayedHP = frame.endHP; requestBattleRender(); } }, 90);
    }
    requestBattleRender();
  }
  function showEvents(events, automatic = false) {
    const attacks = events.filter(e => e.type === 'attack'), clears = events.filter(e => e.type === 'clear');
    if (attacks.length && !document.hidden && !reducedMotion.matches) playback.enqueue(events,{sustainedActors:automatic ? ['meta','richter'].filter(continuousBurst) : []});
    else if (attacks.length) {
      const last = attacks[attacks.length - 1];
      const totalAttacks = attacks.reduce((sum, e) => sum + (e.count || 1), 0);
      const totalDamage = attacks.reduce((sum, e) => sum + e.damage, 0);
      const actor = new Set(attacks.map(e => e.actor)).size === 1 ? last.actor : 'パーティ';
      $('last-roll').textContent = `${actor} / ${format(totalDamage)} DMG${totalAttacks > 1 ? `・${format(totalAttacks)}回` : ''}`;
    }
    if (clears.length) {
      if(document.hidden||reducedMotion.matches)renderEnemy(E.getSession(state),clears.reduce((n,e)=>n+(e.count||1),0));
      const count = clears.reduce((sum, e) => sum + (e.count || 1), 0);
      const knockouts = clears.reduce((sum,e) => sum + (e.reason === 'knockout' ? (e.count || 1) : (e.knockouts || 0)), 0);
      log(`${E.getSession(state).name} クリア${count > 1 ? ` ×${format(count)}` : ''}${knockouts ? `（気絶 ${format(knockouts)}回）` : ''}。因子 +${money(clears.reduce((n, e) => n + e.reward, 0))}Rd`);
    }
  }
  function sync() {
    const now = Date.now();
    if (!blocked()) {
      const elapsed = Math.max(0, (now - lastTime) / 1000);
      if (elapsed > 5) {
        const before = state.factors, oldKills = state.kills;
        E.advance(state, elapsed, Math.random, false);
        if (state.kills > oldKills) log(`離席中に${UI.fullNumber(state.kills - oldKills)}周。因子 +${money(state.factors - before)}Rd`);
      } else showEvents(E.advance(state, elapsed), true);
      state.savedAt = now;
    }
    lastTime = now;
  }
  function save() {
    if (blocked()) return false;
    sync();
    const result = storage ? S.persist(storage, state) : { ok: false, error: 'ブラウザへの保存を利用できません。セーブを書き出してください。' };
    lastSave = Date.now();
    storageError = !result.ok;
    $('save-status').textContent = result.ok ? `保存済み ${new Date(lastSave).toLocaleTimeString('ja-JP')}` : '自動保存不可 · 書き出しで保存してください';
    if (!result.ok) notice(result.error, true);
    return result.ok;
  }
  function exportText() { sync(); return S.encode(state); }
  function preview(text) {
    importCandidate = null;
    $('import-preview').hidden = true;
    try {
      const parsed = S.decode(text);
      importCandidate = parsed;
      $('import-summary').textContent = `所持因子 ${money(parsed.factors)}Rd / 累計クリア ${UI.fullNumber(parsed.kills)}\n参加 ${D.characters.filter(c => parsed.levels[c.id]).length}人 / ${E.getSession(parsed).name}\n保存日時 ${new Date(parsed.savedAt).toLocaleString('ja-JP')}\n読み込むと現在の進行を置き換えます。`;
      $('import-preview').hidden = false;
      message('形式を確認しました。内容を確認してから読み込んでください。');
    } catch (error) { message(error.message, true); }
  }
  function bind() {
    window.addEventListener('resize', () => { combatGeometry = null; renderOrbitSpacing($('arena-viewport').clientWidth); });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(entries => {
      renderOrbitSpacing(entries[0].contentRect.width);
    }).observe($('arena-viewport'));
    $('attack').addEventListener('click', () => { sync(); showEvents(E.click(state)); render(); });
    $('pause').addEventListener('click', () => { sync(); state.paused = !state.paused; if (state.paused) resetCombatVisuals(); save(); render(); log(state.paused ? '周回を一時停止しました。' : '周回を再開しました。'); });
    const chooseCharacter = id => {
      if (blocked()) return;
      sync();
      if (E.selectCharacter(state, id)) { save(); render(); }
    };
    $('meta-select').addEventListener('click', () => chooseCharacter('meta'));
    $('richter-select').addEventListener('click', () => chooseCharacter('richter'));
    $('select-self').addEventListener('click', () => chooseCharacter(null));
    $('character-list').addEventListener('click', event => {
      const perkButton = event.target.closest('[data-perk]');
      if (perkButton) {
        if (blocked() || perkButton.disabled) return;
        sync();
        const c = D.characters.find(c => c.id === perkButton.dataset.perkCharacter);
        if (E.buyPerk(state, c.id, perkButton.dataset.perk)) {
          const p = c.perks.find(p => p.id === perkButton.dataset.perk);
          const text = `${c.name}：因子${money(p.cost)}Rdで特性【${p.name}】を解放。${p.description}`;
          log(text); notice(text); save(); render();
        }
        return;
      }
      if (event.target.closest('.perk-list')) return;
      const selectButton = event.target.closest('[data-select-character]');
      if (selectButton) { if (!selectButton.disabled) chooseCharacter(selectButton.dataset.selectCharacter); return; }
      const button = event.target.closest('[data-hire], [data-action]');
      if (!button) {
        const card = event.target.closest('.character-card.owned');
        if (card) chooseCharacter(card.id.slice(5));
        return;
      }
      if (!button || blocked()) return;
      sync();
      if (button.dataset.action) {
        const c = D.characters.find(c => c.id === button.dataset.action);
        if (E.buyAction(state, c.id)) { log(`${c.name}の行動力を${rateFormat(E.actionPower(state, c))}に強化。`); save(); render(); }
        return;
      }
      if (E.hire(state, button.dataset.hire)) {
        const c = D.characters.find(c => c.id === button.dataset.hire);
        log(`${c.name} ${state.levels[c.id] === 1 ? 'が参加しました。' : `の威力をLv.${state.levels[c.id]}に強化。`}`);
        for (const p of c.perks || []) if (p.level === state.levels[c.id]) {
          const text = `${c.name}：特性【${p.name}】が購入可能になりました。因子${money(p.cost)}Rdで解放できます。`;
          log(text); notice(text);
        }
        save(); render();
      }
    });
    $('upgrade-list').addEventListener('click', event => {
      const button = event.target.closest('[data-upgrade]');
      if (!button || blocked()) return;
      sync();
      if (E.buyUpgrade(state, button.dataset.upgrade)) { log(`${D.upgrades.find(u => u.id === button.dataset.upgrade).name}を強化。`); save(); render(); }
    });
    $('boost').addEventListener('click', () => { sync(); if (E.buyBoost(state)) { log('限界突破：30秒間、全ダメージ×2。'); save(); render(); } });
    $('save-open').addEventListener('click', () => $('save-dialog').showModal());
    $('save-close').addEventListener('click', () => $('save-dialog').close());
    $('help-open').addEventListener('click', () => $('help-dialog').showModal());
    $('help-close').addEventListener('click', () => $('help-dialog').close());
    $('save-now').addEventListener('click', () => message(save() ? 'ブラウザに保存しました。' : '自動保存できません。ファイルに書き出して保存してください。', storageError));
    $('show-export').addEventListener('click', () => {
      $('save-text').value = exportText(); $('save-text').select(); importCandidate = null;
      $('import-preview').hidden = true; message('表示したデータをコピーして保管できます。');
    });
    $('export').addEventListener('click', () => {
      const text = exportText(), blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `yggclicker-save-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      message('書き出しました。移動先の「セーブ管理」で読み込めます。');
    });
    $('save-text').addEventListener('input', () => { importCandidate = null; $('import-preview').hidden = true; });
    $('preview-import').addEventListener('click', () => preview($('save-text').value));
    $('import-file').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', async () => {
      const file = $('file-input').files[0]; $('file-input').value = '';
      if (!file) return;
      importCandidate = null; $('import-preview').hidden = true;
      if (file.size > S.MAX_BYTES) { message('セーブファイルは1MB以下にしてください。', true); return; }
      try { const text = await file.text(); $('save-text').value = text; preview(text); }
      catch { message('ファイルを読み込めませんでした。', true); }
    });
    $('confirm-import').addEventListener('click', () => {
      if (!importCandidate || readOnly) return;
      sync();
      const previous = S.encode(state);
      // Always keep a recoverable pre-import copy; this key is not rotated by autosave.
      importBackup = previous;
      try { if (storage) storage.setItem(PRE_IMPORT, previous); } catch { /* Memory backup and export remain usable. */ }
      state = S.decode(S.encode(importCandidate));
      resetCombatVisuals(true);
      const result = E.catchUp(state);
      corruptSave = false; importCandidate = null; lastTime = Date.now();
      const persisted = save(); render();
      $('import-preview').hidden = true;
      message(persisted ? 'セーブを読み込みました。移動先でも続きから遊べます。' : '読み込みました。ブラウザに保存できないため、終了前に書き出してください。', !persisted);
      if (persisted) notice('セーブを引き継ぎました。');
      log(`セーブを読み込みました。${result.kills ? `離席中に${UI.fullNumber(result.kills)}周。` : ''}`);
    });
    $('restore-import').addEventListener('click', () => {
      let backup = importBackup;
      try { backup = backup || (storage && storage.getItem(PRE_IMPORT)); } catch { /* Fall back to memory. */ }
      if (!backup) { message('読み込み前のバックアップはまだありません。'); return; }
      $('save-text').value = backup; preview(backup);
    });
    document.addEventListener('visibilitychange', () => { enemyMotionState(); if (document.hidden) { save(); resetCombatVisuals(); } else { sync(); render(); } });
    reducedMotion.addEventListener('change', () => { resetCombatVisuals(); enemyMotionState(); render(); });
    window.addEventListener('pagehide', save);
    window.addEventListener('storage', event => {
      if ((event.key === S.KEY || event.key === null) && !readOnly) {
        readOnly = true; resetCombatVisuals(); notice('別のタブでセーブが更新・削除されました。競合を防ぐため停止しました。このタブを再読み込みして続けてください。', true); render();
      }
    });
  }
  function initialize(hasLock) {
    if (initialized) return;
    initialized = true; readOnly = !hasLock;
    try { storage = window.localStorage; } catch { storage = null; }
    const loaded = storage ? S.load(storage) : { state: null, unavailable: true, warning: 'ブラウザへの保存を利用できません。セーブを書き出して保存してください。' };
    if (loaded.state) state = loaded.state;
    corruptSave = !!loaded.blocked;
    build(); bind();
    if (readOnly) notice('別のタブでYggClickerが起動中です。二重進行を防ぐため待機しています。もう一方を閉じ、このタブを再読み込みしてください。', true);
    else if (loaded.warning) notice(loaded.warning, !!(loaded.blocked || loaded.unavailable));
    if (!blocked()) {
      const report = E.catchUp(state);
      if (report.kills) { log(`離席中に${UI.fullNumber(report.kills)}周。因子 +${money(report.factors)}Rd`); if (!loaded.warning) notice(`おかえりなさい。離席中に${UI.fullNumber(report.kills)}周クリアし、因子を${money(report.factors)}Rd獲得しました。（最大8時間）`); }
      save();
    } else $('save-status').textContent = '保存を停止しています';
    render();
    setInterval(() => { sync(); render(); if (Date.now() - lastSave >= 10000 && !blocked()) save(); }, 100);
  }
  if (navigator.locks && navigator.locks.request) {
    navigator.locks.request('yggclicker.writer', { ifAvailable: true }, lock => {
      initialize(!!lock);
      if (lock) return new Promise(() => {}); // Browser releases this lock when the tab closes.
    }).catch(() => initialize(true));
  } else initialize(true);
})();
