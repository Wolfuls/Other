(function () {
  'use strict';
  const D = window.YggData, E = window.YggEngine, S = window.YggSave, FX = window.YggCombatEffects, UI = window.YggDisplay, M=window.YggMaintenance;
  const elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, document.getElementById(id)); return elements.get(id); };
  const setText = (id, value) => { const node = $(id), text = String(value); if (node.textContent !== text) node.textContent = text; };
  let maintenanceBusy=false;
  let controlsKey = '', battleRender = null, combatGeometry = null;
  let managerTab = 'characters', inspectedCharacter = 'meta', noticeTimer;
  const managerTabs = ['characters','quests','upgrades','stats','options'];
  const displayControls = {'option-orbits':'showOrbits','option-hit-effects':'hitEffects',
    'option-factor-rain':'showFactorRain','option-reward-dice':'showRewardDice',
    'option-damage-numbers':'showDamageNumbers','option-overflow-labels':'showOverflowLabels','option-defeat-labels':'showDefeatLabels'};
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
  let maxAttackTimer,lastMaxShot=-Infinity;
  let lastTordelieseShot=-Infinity,tordelieseAttackTimer,tordelieseLashIndex=0,tordelieseSpriteScale=1;
  let vishunalAttackTimer, lastVishunalShot = -Infinity, vishunalMotionStarted = 0, muzzleOrder = [], vishunalSpriteScale=.5;
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
    if(profile.extraAttackChance) text += ` / 追加攻撃${rateFormat(profile.extraAttackChance*100)}%（再抽選）`;
    if(profile.poisonDamage) text += ` / 猛毒：被弾ごとに固定${profile.poisonDamage}（防御・倍率の影響なし）`;
    if(profile.penetrationBlocked) text += ' / 貫通無効';
    if(profile.overflow) text += profile.ignoreDefense?' / 群れに巻き込み（後続も防御無視）':' / 群れに巻き込み（後続は防御適用）';
    return text;
  }
  function renderLevelNote(id,profile){
    const note=$(id);note.hidden=!profile.minimumLevelBonus;
    setText(id,profile.minimumLevelBonus?'Lv補正は最低＋1':'');
  }
  function formulaPanel(id, manual = false) {
    return `<details class="damage-breakdown" id="formula-${id}"${manual ? ' open' : ''}><summary>${manual ? '手動攻撃' : '自動攻撃'}の計算式・補正内訳</summary>
      <p class="formula-order">（基礎攻撃力 ＋ パーク補正 ＋ アップグレード補正 ＋ SPE補正 ＋ アイテム補正）× 攻撃力Lv倍率</p>
      <dl>${[['base','基礎攻撃力'],['perk','パーク補正'],['upgrade','アップグレード補正'],['spe','SPE補正'],['item','アイテム補正'],['level','攻撃力Lv倍率']].map(([key,label])=>`<div><dt>${label}</dt><dd id="formula-${id}-${key}"></dd></div>`).join('')}</dl>
      <p class="formula-subtotals" id="formula-${id}-subtotals"></p><p class="formula-result" id="formula-${id}-result"></p><small class="level-correction-note" id="formula-${id}-note" hidden></small></details>`;
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
    if (b.upgrade.flat) upgrade.push(`${b.upgrade.flat}（コンセントレイション）`);
    $('formula-' + id + '-upgrade').textContent = upgrade.length ? `＋ ${upgrade.join(' + ')}` : '0';
    $('formula-' + id + '-spe').textContent = b.spe.rate ? `＋ 小計B × ${percent(b.spe.rate)}（限界突破）` : '0（限界突破なし）';
    $('formula-' + id + '-item').textContent = '0（なし）';
    $('formula-' + id + '-level').textContent = `×${rateFormat(b.levelMultiplier)}（＋${rateFormat((b.levelMultiplier - 1) * 100)}%）`;
    $('formula-' + id + '-subtotals').textContent = b.spe.rate ? `小計B＝${profile.dice}D6 + ${profile.flat}${b.perk.conditional ? ` + ${b.perk.conditional}（特効）` : ''}（基礎＋パーク＋コンセントレイション）。SPE補正でも同じ出目を使用し、振り直しません。` : '';
    $('formula-' + id + '-result').textContent = `合計にLv倍率を掛けて端数切り捨て → ${b.ignoreDefense ? '防御無視' : `防御${b.defense}を引く${b.penetrationBlocked?'（貫通無効）':''}`}（最低1ダメージ）`;
    renderLevelNote(`formula-${id}-note`,profile);
  }
  const blocked = () => readOnly || corruptSave || maintenanceBusy;
  function notice(text, error = false) {
    clearTimeout(noticeTimer);
    $('notice').textContent = text;
    $('notice').classList.toggle('error', error);
    $('notice').hidden = !text;
    if (text && !error) noticeTimer = setTimeout(() => {$('notice').hidden = true;}, 7000);
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
    $('richter-orbits').style.setProperty('--creature-idle-sheet',`url("${D.richterVisual.idleSheet}")`);
    $('richter-standing').style.setProperty('--richter-sheet', `url("${D.richterVisual.sheet}")`);
    $('richter-standing').style.setProperty('--richter-burst-sheet', `url("${D.richterVisual.burstSheet}")`);
    $('vishunal-standing').style.setProperty('--vishunal-sheet', `url("${D.vishunalVisual.sheet}")`);
    for(const [motion,frames]of Object.entries(D.tordelieseVisual.frames))frames.forEach((src,i)=>$('tordeliese-standing').style.setProperty(`--tordeliese-${motion}-${i}`,`url("${src}")`));
    D.tordelieseVisual.tendrilFrames.forEach((src,i)=>$('tordeliese-tendrils').style.setProperty(`--tendril-${i}`,`url("${src}")`));
    $('explosions').style.setProperty('--explosion-sheet', `url("${D.richterVisual.explosionSheet}")`);
    $('explosions').style.setProperty('--blast-duration', `${RICHTER_EXPLOSION_MS}ms`);
    $('party-capacity').textContent = `/ ${D.characters.length}`;
    $('manual-formula').innerHTML = formulaPanel('manual', true);
    $('character-picker').innerHTML = D.characters.map(c=>`<button id="inspect-${c.id}" type="button" role="tab" aria-controls="card-${c.id}" aria-selected="false" tabindex="-1"><span class="picker-icon" aria-hidden="true">${c.portraitSheet?`<span class="${c.portraitClass||'vishunal-avatar'} pixel-art" style="background-image:url('${c.portrait}')"></span>`:`<img class="pixel-art" src="${c.portrait}" alt="">`}</span><span class="picker-name" id="picker-name-${c.id}"></span></button>`).join('');
    for (const src of ['./img/gamer-throne-standing-v6.png','./img/gamer-throne-attack-v6.png','./img/gamer-throne-burst-v5.png','./img/tarai-v1.png',...D.sessions.flatMap(s=>[s.background,s.nightBackground,s.sheet,s.defeatSheet].filter(Boolean)),...Object.values(D.tordelieseVisual.frames).flat(),...D.tordelieseVisual.tendrilFrames,D.vishunalVisual.sheet,D.vishunalVisual.missile,D.metaVisual.burstSheet, D.richterVisual.burstSheet, D.richterVisual.bomb,D.richterVisual.idleSheet, D.richterVisual.explosionSheet,...D.sessions.flatMap(s=>(s.variants||[]).flatMap(v=>[v.sheet||v.image,v.defeatSheet].filter(Boolean)))]) { const preload = new Image(); preload.src = src; }
    $('character-list').innerHTML = D.characters.map(c => `<article class="character-card compact-character" id="card-${c.id}" role="tabpanel" aria-labelledby="inspect-${c.id}" style="--char-color:${c.color}">
      <button class="character-select" data-select-character="${c.id}" aria-label="${c.name}を手動攻撃に選択" aria-pressed="false" title="クリックで手動攻撃の担当に選択"><span class="avatar ${c.portrait ? 'sprite-avatar' : ''}" aria-hidden="true">${c.portraitSheet ? `<span class="${c.portraitClass||'vishunal-avatar'} pixel-art" style="background-image:url('${c.portrait}')"></span>` : c.portrait ? `<img class="pixel-art" src="${c.portrait}" alt="">` : c.initials}</span><strong class="character-identity" id="identity-${c.id}">${c.name}</strong></button>
      <div class="character-controls">
        <div class="enhancement-row"><button class="button secondary hire-button" data-hire="${c.id}"><span id="hire-label-${c.id}"></span><span id="hire-cost-${c.id}"></span></button><div class="current-multiplier" title="攻撃力Lvの倍率と、このキャラ単体のDPS（防御・パーク・全体強化・SPEを反映）"><strong id="damage-bonus-${c.id}"></strong><span id="character-dps-${c.id}"></span></div></div>
        ${tradeControls('power',c.id)}<div class="enhancement-row"><button class="button secondary hire-button action-button" data-action="${c.id}"><span id="action-label-${c.id}"></span><span id="action-cost-${c.id}"></span></button><div class="current-multiplier action-multiplier" title="基礎行動力＋個別Lv×5＋スピードアップLv×1＋パーク支援。倍率と追加攻撃・消費免除を含む秒間回数"><strong id="action-bonus-${c.id}"></strong><span id="character-rate-${c.id}"></span></div></div>${tradeControls('action',c.id)}
      </div>
      ${c.perks ? `<details class="perk-list"><summary>パーク<span id="perk-summary-${c.id}"></span></summary>${c.perks.map(p => `<div class="perk" id="perk-${c.id}-${p.id}"><div><span>${p.levelType==='action'?'行動力':'攻撃力'}Lv.${p.level}</span><strong>${p.struckPrefix ? `<s>${p.struckPrefix}</s>` : ''}${p.name}</strong><span class="perk-status"></span></div><p>${p.description}</p><button class="button secondary perk-buy" data-perk-character="${c.id}" data-perk="${p.id}"></button></div>`).join('')}</details>` : ''}
      <p class="current-attack"><span>攻撃力の現在式</span><strong id="stats-${c.id}"></strong><small class="level-correction-note" id="stats-note-${c.id}" hidden></small></p></article>`).join('');

    $('quest-list').innerHTML = D.sessions.map(s=>`<article class="quest-card" id="quest-card-${s.id}"><div class="quest-title"><h3>${s.name}</h3><strong id="quest-level-${s.id}"></strong></div><p class="quest-area">${s.enemy}${s.area?` / ${s.area}`:''}</p><button type="button" class="button secondary quest-select" id="quest-select-${s.id}" data-session="${s.id}"></button><div class="quest-columns"><span>強化による変化</span><span>現在 → 次のLv</span></div><dl class="quest-values"><div><dt>エネミーHP</dt><dd id="quest-hp-${s.id}"></dd></div><div><dt>防御</dt><dd id="quest-defense-${s.id}"></dd></div><div><dt>クリア報酬</dt><dd id="quest-reward-${s.id}"></dd></div></dl><p class="quest-note" id="quest-base-${s.id}"></p><p class="quest-note">報酬はオーバーキル加算前の値です。</p><button type="button" class="button quest-buy" id="quest-buy-${s.id}" data-quest="${s.id}"><span>クエストを強化</span><strong id="quest-cost-${s.id}"></strong></button>${tradeControls('quest',s.id)}</article>`).join('');
    $('upgrade-list').innerHTML = D.upgrades.map(u => `<article class="upgrade-card"><span class="upgrade-icon" aria-hidden="true">${u.icon}</span><span class="upgrade-level" id="upgrade-level-${u.id}">Lv.0</span><h3>${u.name}</h3><p>${u.label}</p><div class="upgrade-purchase"><button class="button secondary" data-upgrade="${u.id}" aria-label="${u.name}を購入"><span id="upgrade-cost-${u.id}"></span></button>${u.id !== 'overkill' ? `<span class="enhancement-bonus"><small>${u.id === 'click' ? '固定値補正' : u.id === 'power' ? '行動力補正' : '報酬補正'}</small><strong id="${u.id}-bonus"></strong></span>` : ''}</div>${tradeControls('upgrade',u.id,u.max!==1)}</article>`).join('');
  }
  function tradeControls(kind,id,ten=true) {
    return `<div class="trade-controls" id="trade-controls-${kind}-${id}">${ten?`<button type="button" class="trade-button" id="buy10-${kind}-${id}" data-trade="buy" data-kind="${kind}" data-id="${id}"><span>10回購入</span><small></small></button>`:''}<button type="button" class="trade-button sell-button" id="sell-${kind}-${id}" data-trade="sell" data-kind="${kind}" data-id="${id}"><span>1Lv売却</span><small></small></button></div>`;
  }
  function renderTrades(kind,id,ten=true,hide=false) {
    $('trade-controls-'+kind+'-'+id).hidden=hide;
    if(ten){const b=$('buy10-'+kind+'-'+id),q=E.purchaseQuote(state,kind,id,10);b.disabled=blocked()||!q.valid||state.factors<q.cost;b.querySelector('small').textContent=q.valid?'◇ '+money(q.cost)+'Rd':'購入不可';}
    const b=$('sell-'+kind+'-'+id),q=E.saleQuote(state,kind,id);b.disabled=blocked()||!q.valid;b.querySelector('small').textContent=q.valid?'＋'+money(q.refund)+'Rd':'売却不可';
  }
  function handleTrade(event) {
    const button=event.target.closest('[data-trade]');if(!button?.dataset.trade)return false;
    if(button.disabled||blocked())return true;sync();
    const {kind,id,trade}=button.dataset;
    const ok=trade==='sell'?E.sell(state,kind,id):E.buyMany(state,kind,id,10);
    if(ok){resetCombatVisuals();const c=D.characters.find(c=>c.id===id),u=D.upgrades.find(u=>u.id===id),q=D.sessions.find(q=>q.id===id);
      log(`${c?.name||u?.name||q?.name}：${trade==='sell'?'1段階売却しました。':'10段階購入しました。'}`);save();render();}
    return true;
  }
  function renderBattleHUD() {
    const boosted=state.boostSeconds>0;
    $('limit-break-overlay').hidden=!boosted;
    $('boost-status').hidden=!boosted;
    if(boosted)setText('boost-status',`限界突破 ×${1+D.balance.boostDamageBonus} · 残り${Math.ceil(state.boostSeconds)}秒${state.paused?' / 一時停止':''}`);
    const session = E.getSession(state), hp = displayedHP === null ? state.hp : displayedHP;
    const factors = money(state.factors);
    for (const id of ['factors', 'factors-pinned', 'factors-save', 'factors-help']) setText(id, factors);
    setText('kills', UI.fullNumber(state.kills));
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
    renderScene(E.getSession(state));
    // Action-clock fractions and visual HP do not change cards, formulas or prices.
    const key = JSON.stringify([state.factors, state.sessionId, state.selectedCharacterId,
      state.levels, state.actionLevels, state.upgrades, state.purchasedPerks, state.questLevels,
      Math.ceil(state.boostSeconds), state.paused, state.options, blocked()]);
    if (key === controlsKey) return;
    controlsKey = key;
    const session = E.getSession(state);
    $('dps').textContent = rateFormat(E.dps(state));
    const income = E.expectedIncome(state);
    renderFactorRain(income.factorsPerSecond);
    setText('income-rate', UI.incomeNumber(income.factorsPerSecond));
    setText('income-context', `${session.name} / ${state.paused ? '再開時の見込み' : '自動周回'}`);
    setText('income-formula', `${session.name}：約${UI.incomeNumber(income.clearsPerSecond)}周 / 秒 × ${money(income.reward)}Rd / 周${state.upgrades.overkill ? ` ＋ 約${UI.incomeNumber(income.bonusPerSecond)}Rd / 秒（オーバーキル）` : ''} ＝ 約${UI.incomeNumber(income.factorsPerSecond)}Rd / 秒（表示は丸め、計算は丸め前の値を使用）。`);
    setText('income-condition', (income.approximate ? '猛毒や高HPの戦闘は、付与・撃破時の状態解除、気絶・巻き込み・オーバーキルを含む抽出計算による概算です。' : '') + (income.boosted ? 'SPE：限界突破有効中の性能で算出。効果が切れると見込みを更新します。' : '現在の攻撃性能で自動周回を続けた場合の見込みです。一時停止中も再開時の性能を表示します。'));
    $('party-count').textContent = D.characters.filter(c => state.levels[c.id] > 0).length;
    renderEnemy(session);
    $('battle-area').textContent = session.area;
    $('session-code').textContent = `SESSION ${session.code} / ${session.name} / Lv.${UI.fullNumber(session.level)}`;
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
    renderLevelNote('click-level-note',manualProfile);
    renderFormula('manual', manualProfile);
    $('loop-status').textContent = blocked() ? '● 待機中' : state.paused ? 'Ⅱ 一時停止' : '● 自動周回';
    $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', state.paused ? '周回を再開' : '周回を一時停止');
    $('pause').disabled = blocked();
    $('attack').disabled = blocked() || state.paused;
    $('save-now').disabled = blocked();
    $('option-cache').disabled=maintenanceBusy;
    $('option-delete').disabled=readOnly||maintenanceBusy;
    $('delete-confirm').disabled=readOnly||maintenanceBusy;
    $('confirm-import').disabled = readOnly;
    for (const c of D.characters) {
      const level = state.levels[c.id], cost = E.hireCost(state, c);
      const card=$('card-' + c.id), obscured=!level && state.factors<cost;
      card.classList.toggle('owned', level > 0);
      card.classList.toggle('obscured', obscured);
      card.classList.toggle('manual-selected', state.selectedCharacterId === c.id);
      setText('identity-'+c.id,obscured?'？？？':c.name);
      setText('picker-name-'+c.id,obscured?'？？？':c.id==='meta'?'メタ':c.id==='richter'?'ゲルハムト':c.id==='vishunal'?'ビシュナル':c.id==='tordeliese'?'トルデリーゼ':c.name);
      $('inspect-'+c.id).classList.toggle('obscured',obscured);
      $('inspect-'+c.id).setAttribute('aria-label',obscured?`未公開の仲間・${money(cost)}Rdの詳細`:`${c.name}の詳細`);
      const selectButton = document.querySelector(`[data-select-character="${c.id}"]`);
      selectButton.disabled = blocked() || !level;
      selectButton.setAttribute('aria-pressed', state.selectedCharacterId === c.id);
      selectButton.setAttribute('aria-label',obscured?'未公開の仲間':`${c.name}を手動攻撃に選択`);
      selectButton.title=obscured?'因子を貯めると公開':level?'クリックで手動攻撃の担当に選択':'雇用すると参戦';
      // Unowned cards stay compact until hired, so changing affordability
      // never collapses or expands the surrounding character panel.
      for(const selector of ['.perk-list','.current-attack','.action-button']) {
        const node=card.querySelector(selector);if(node){node.inert=obscured;node.setAttribute('aria-hidden',String(obscured));}
      }
      if(obscured){const perks=card.querySelector('.perk-list');if(perks)perks.open=false;}
      const profile = E.attackProfile(state, c);
      $('stats-' + c.id).textContent = attackFormula(profile);
      renderLevelNote('stats-note-'+c.id,profile);
      $('damage-bonus-' + c.id).textContent = `×${rateFormat(profile.breakdown.levelMultiplier)}`;
      $('character-dps-' + c.id).textContent = `（${rateFormat(E.characterDps(state,c))} DPS）`;
      $('character-dps-'+c.id).title='直接ダメージのDPS（追加攻撃を含む）。猛毒は別判定で、因子獲得見込みに反映します。';
      const actionMultiplier=E.actionMultiplier(state,c);
      $('action-bonus-' + c.id).textContent = actionMultiplier===null ? `行動力 ${rateFormat(E.actionPower(state,c))}` : `×${rateFormat(actionMultiplier)}`;
      $('character-rate-' + c.id).textContent = `（${UI.incomeNumber(level ? E.effectiveAttackRate(state,c) : 0)} 回/秒）`;
      $('hire-label-' + c.id).textContent = obscured ? '因子不足' : `${level >= E.MAX_LEVEL ? '攻撃力最大' : level ? '攻撃力を強化' : '雇用する'}（Lv.${UI.fullNumber(level)}）`;
      $('hire-cost-' + c.id).textContent = level >= E.MAX_LEVEL ? 'MAX' : `◇ ${money(cost)}Rd`;
      const button = document.querySelector(`[data-hire="${c.id}"]`);
      button.disabled = blocked() || state.factors < cost || level >= E.MAX_LEVEL;
      button.setAttribute('aria-label', obscured ? `未公開の仲間 · 因子${money(cost)}Rd` : `${c.name}${level ? 'の攻撃力を強化' : 'を雇用'}（現在Lv.${UI.fullNumber(level)}） · 因子${money(cost)}Rd`);
      const actionCost = E.actionCost(state, c), actionButton = document.querySelector(`[data-action="${c.id}"]`);
      $('action-label-' + c.id).textContent = `行動力＋5（Lv.${UI.fullNumber(state.actionLevels[c.id])}）`;
      $('action-cost-' + c.id).textContent = `◇ ${Number.isFinite(actionCost)?money(actionCost)+'Rd':'計算範囲外'}`;
      actionButton.disabled = blocked() || !level || state.factors < actionCost || !Number.isSafeInteger(state.actionLevels[c.id] + 1);
      actionButton.setAttribute('aria-label', `${c.name}の行動力を強化（現在Lv.${UI.fullNumber(state.actionLevels[c.id])}） · 因子${Number.isFinite(actionCost)?money(actionCost)+'Rd':'計算範囲外'}`);
      renderTrades('power',c.id,true,!level);renderTrades('action',c.id,true,!level);
      if (c.perks) {
        const perks = E.perks(state, c), active = perks.filter(p => p.unlocked), next = perks.find(p => !p.owned);
        const ready = perks.filter(p => p.eligible && !p.owned).length;
        $('perk-summary-' + c.id).textContent = `${active.length}/${perks.length} 解放${ready ? `・${ready}件購入待ち` : next ? `・次 Lv.${next.level}` : '・全解放'}`;
        for (const p of perks) {
          const row = $(`perk-${c.id}-${p.id}`);
          row.classList.toggle('unlocked', p.unlocked);
          const requiredTrait = p.targetTrait || p.overflowTrait;
          const targetAbsent = requiredTrait && !(session.traits || []).includes(requiredTrait);
          const ignoreBlocked = p.ignoreDefense && (session.traits || []).includes('penetrationImmune');
          row.querySelector('.perk-status').textContent = p.unlocked ? (targetAbsent ? '解放済・対象外' : ignoreBlocked ? (p.baseAttack ? '基礎変更のみ有効' : '解放済・貫通無効') : p.diceEvery ? `有効 ＋${p.dice}D6` : '有効') : p.owned ? '保有・Lv不足で休止中' : p.eligible ? '購入待ち' : 'Lv未達成';
          const buy = row.querySelector('[data-perk]');
          buy.disabled = blocked() || p.owned || !p.eligible || state.factors < p.cost;
          buy.hidden = p.owned;
          buy.textContent = `${!p.eligible ? `${p.levelType==='action'?'行動力':'攻撃力'}Lv.${p.level}で購入可能` : state.factors < p.cost ? '因子不足' : '解放する'} · ◇ ${money(p.cost)}Rd`;
          buy.setAttribute('aria-label', `${c.name}の${p.struckPrefix?'違（取り消し）':''}${p.name}を解放 · 因子${money(p.cost)}Rd`);
        }
      }
    }
    renderQuests();
    for (const u of D.upgrades) {
      const maxed = u.max != null && state.upgrades[u.id] >= u.max, cost=E.upgradeCost(state,u);
      $('upgrade-level-' + u.id).textContent = u.max === 1 ? (maxed ? '解放済' : '未解放') : `Lv.${state.upgrades[u.id]}`;
      renderTrades('upgrade',u.id,u.max!==1);
      $('upgrade-cost-' + u.id).textContent = maxed ? (u.max === 1 ? '解放済' : 'MAX') : Number.isFinite(cost)?`購入 · ◇ ${money(cost)}Rd`:'計算範囲外';
      document.querySelector(`[data-upgrade="${u.id}"]`).disabled = blocked() || maxed || !Number.isFinite(cost) || !Number.isSafeInteger(state.upgrades[u.id]+1) || state.factors < cost;
    }
    $('click-bonus').textContent = `＋${rateFormat(state.upgrades.click * D.balance.concentrationPerLevel)}`;
    $('power-bonus').textContent = `＋${rateFormat(state.upgrades.power * D.balance.speedPerLevel)}`;
    $('reward-bonus').textContent = `＋${rateFormat(state.upgrades.reward * D.balance.rewardPerLevel * 100)}%`;
    const boostCost = E.boostCost(state);
    $('boost').textContent = state.boostSeconds > 0 ? `効果中 · 残り${Math.ceil(state.boostSeconds)}秒` : `使用 · ◇ ${money(boostCost)}Rd`;
    $('boost').disabled = blocked() || boostCost <= 0 || !Number.isFinite(boostCost) || state.factors < boostCost || state.boostSeconds > 0;
    setText('boost-cost-rule', `通常DPS ${rateFormat(E.unboostedDps(state))} × ${D.balance.boostCostDpsRatio*100}% → ${money(boostCost)}Rd（端数切り捨て・最低1）`);
    renderMeta();
    const richter = D.characters.find(c => c.id === 'richter'), hired = state.levels.richter > 0;
    if ($('arena').classList.contains('has-richter') !== hired) combatGeometry = null;
    $('arena').classList.toggle('has-richter', hired);
    $('richter-combatant').hidden = !hired;
    $('richter-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('richter-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'richter');
    $('richter-select').disabled = blocked() || !hired;
    $('richter-select').setAttribute('aria-pressed', state.selectedCharacterId === 'richter');
    renderRichterOrbits();
    renderVishunal();
    renderTordeliese();renderMax();
    renderOrbitSpacing();
    for(const [id,key] of Object.entries(displayControls)){
      const control=$(id);
      if(key==='hitEffects')control.value=state.options[key];
      else control.checked=state.options[key];
      control.disabled=blocked();
    }
    $('arena-viewport').dataset.hitEffects=state.options.hitEffects;
  }
  function enemyMotionState() {
    const paused=state.paused || blocked() || document.hidden || reducedMotion.matches;
    $('arena').classList.toggle('enemy-paused', paused);
    $('arena-viewport').classList.toggle('scene-paused', paused);
  }
  function renderFactorRain(income) {
    const count=state.options.showFactorRain?UI.factorRainCount(income):0;
    if(count===shownCrystals)return;
    shownCrystals=count;
    for(const [i,crystal] of Array.from($('factor-rain').children).entries())crystal.hidden=i>=count;
  }
  function showRewardRain(frame) {
    if(!state.options.showRewardDice || document.hidden || reducedMotion.matches || state.paused) return;
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
      const impactId=String(visualHitId);
      node.hidden=false;node.dataset.impactId=impactId;
      deferVisual(()=>{if(node.dataset.impactId===impactId)node.hidden=true;},duration+delay+30);
      remaining--;launched++;
    }
  }
  function renderScene(session) {
    const viewport=$('arena-viewport'),background=session.background||'',night=session.nightBackground||'';
    const key=background+'|'+night;
    if(viewport.dataset.scene!==key){
      viewport.dataset.scene=key;
      viewport.classList.toggle('has-scene',!!background);
      viewport.style.setProperty('--session-background',background?'url("'+background+'")':'none');
      viewport.style.setProperty('--session-night-background',night?'url("'+night+'")':'none');
    }
    const phase=UI.scenePhase(state.sceneSeconds,D.sceneCycle),opacity=night?phase.night.toFixed(3):'0';
    if(viewport.style.getPropertyValue('--night-opacity')!==opacity)viewport.style.setProperty('--night-opacity',opacity);
    $('scene-phase').hidden=!night;
    setText('scene-phase',phase.label);
  }
  function renderQuests() {
    for(const base of D.sessions){
      const quest=E.getSession(state,base.id),cost=E.questCost(state,base.id),available=Number.isFinite(cost);
      const next=available?E.sessionAtLevel(base,quest.level+1):null;
      const selected=state.sessionId===base.id,select=$('quest-select-'+base.id);
      $('quest-card-'+base.id).classList.toggle('current',selected);
      setText('quest-select-'+base.id,selected?'周回中':'このクエストを周回');
      select.disabled=blocked()||selected;select.setAttribute('aria-pressed',String(selected));
      select.setAttribute('aria-label',base.name+(selected?'を周回中':'を周回する'));
      setText('quest-defense-'+base.id,`${UI.fullNumber(quest.defense)} → ${next?UI.fullNumber(next.defense):'—'}`);
      setText('quest-level-'+base.id,`Lv.${UI.fullNumber(quest.level)}`);
      setText('quest-hp-'+base.id,`${UI.fullNumber(quest.hp)} → ${next?UI.fullNumber(next.hp):'—'}`);
      setText('quest-reward-'+base.id,`${money(E.reward(state,quest))} → ${next?money(E.reward(state,next)):'—'} Rd`);
      setText('quest-base-'+base.id,`基礎報酬 ${money(quest.reward)}Rd ＋ クリア報酬増加 ${money(E.reward(state,quest)-quest.reward)}Rd（補正合計が1未満なら＋1） ／ HPはLvごとに×${D.questGrowth.hpGrowth}${base.defenseGrowth?` ／ 防御はLvごとに×${base.defenseGrowth}（累積増分を切り捨て・最低＋1）`:''}`);
      const button=$('quest-buy-'+base.id);
      button.disabled=blocked()||!available||state.factors<cost;
      renderTrades('quest',base.id);
      setText('quest-cost-'+base.id,available?`◇ ${money(cost)}Rd`:'計算範囲外');
      button.setAttribute('aria-label',`${base.name}のクエストを強化（現在Lv.${UI.fullNumber(quest.level)}） · 因子${available?money(cost)+'Rd':'計算範囲外'}`);
    }
  }
  function setEnemyAppearance(node, appearance, role) {
    node.setAttribute('role','img');
    node.setAttribute('aria-label',role+appearance.name);
    node.classList.toggle('animated-enemy',!!appearance.sheet);
    node.classList.toggle('pixel-art',!!appearance.sheet);
    const source=appearance.sheet||appearance.image||'';
    node.classList.toggle('enemy-placeholder',!source);
    node.dataset.placeholderName=source?'':appearance.name;
    node.dataset.defeatStyle=appearance.defeatStyle||'';
    if(appearance.defeatSheet)node.dataset.defeatSheet=appearance.defeatSheet;
    else delete node.dataset.defeatSheet;
    if(node.dataset.appearance===source)return;
    node.dataset.appearance=source;
    let sprite=node.firstElementChild;
    if(!sprite){sprite=document.createElement('span');sprite.className='enemy-sprite';sprite.setAttribute('aria-hidden','true');node.append(sprite);}
    sprite.style.setProperty('--enemy-image',source?'url("'+source+'")':'none');
    sprite.style.setProperty('--foot-shift',((211-(appearance.footY??211))/224*100)+'%');
  }
  function renderEnemy(session, steps = 0) {
    renderScene(session);
    $('enemy-name').hidden = !!session.variants;
    const variants=session.variants||[],formation=UI.enemyFormationSize(session)>1;
    if(enemyVariantSession!==session.id){enemyVariantSession=session.id;enemyQueue=[];}
    enemyQueue=UI.advanceEnemyQueue(enemyQueue,variants.length,steps,Math.random);
    const appearance=variants[enemyQueue[0]]||{...session,name:session.enemy};
    setText('enemy-name',appearance.name);
    setEnemyAppearance($('enemy-art'),appearance,formation?'攻撃対象：':'');
    $('arena').classList.toggle('mohican-line',formation);
    for(let i=1;i<=2;i++){
      const node=$('enemy-next-'+i);node.hidden=!formation;
      if(formation)setEnemyAppearance(node,variants[enemyQueue[i]]||appearance,'後続'+i+'：');
    }
    enemyMotionState();
  }
  function renderOrbitSpacing(width = arenaViewportWidth) {
    arenaViewportWidth = width || $('arena-viewport').clientWidth || 300;
    const options = {metaScale:E.weaponScale(state,'meta'),richterScale:E.weaponScale(state,'richter'),metaCount:state.options.showOrbits?E.sawCount(state).visible:0,richterCount:state.options.showOrbits?E.bombCount(state).visible:0,
      availableHeight:window.matchMedia('(min-width:900px) and (min-height:500px)').matches?$('arena-viewport').clientHeight:null,
      metaHired:state.levels.meta>0,richterHired:state.levels.richter>0,vishunalHired:state.levels.vishunal>0,tordelieseHired:state.levels.tordeliese>0,maxHired:state.levels.max>0,enemyCount:UI.enemyFormationSize(E.getSession(state)),enemyScale:E.getSession(state).enemyScale||1,formationLayout:E.getSession(state).formationLayout,grounded:true,width:arenaViewportWidth,mobile:window.matchMedia('(max-width:600px)').matches};
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
      actor.style.setProperty('--body-foot', `${placement.footOffset || 0}px`);
      orbit.style.setProperty('--orbit-width', `${placement.width}px`);
      orbit.style.setProperty('--orbit-height', `${placement.height}px`);
    }
    $('arena-zoom').hidden = layout.zoom >= .999;
    setText('arena-zoom', `自動ズーム ${Math.round(layout.zoom * 100)}%`);
    const m=layout.max;if(m&&state.levels.max){const a=$('max-combatant');a.style.left=m.x+'px';a.style.top=m.y+'px';a.style.setProperty('--body-foot',(m.footOffset+m.hoverHeight)+'px');a.style.setProperty('--max-size',m.spriteSize+'px');}
    const t=layout.tordeliese;if(t&&state.levels.tordeliese){const actor=$('tordeliese-combatant');actor.style.left=t.x+'px';actor.style.top=t.y+'px';actor.style.setProperty('--body-foot',t.footOffset+'px');actor.style.setProperty('--tordeliese-size',t.spriteSize+'px');tordelieseSpriteScale=t.spriteSize/256;}
    const dog=layout.vishunal;
    if(dog && state.levels.vishunal){const actor=$('vishunal-combatant');actor.style.left=dog.x+'px';actor.style.top=dog.y+'px';actor.style.setProperty('--body-foot',dog.footOffset+'px');vishunalSpriteScale=dog.spriteScale;actor.style.setProperty('--vishunal-scale',vishunalSpriteScale);}
    combatGeometry = null;
  }
  function renderMax() {
    const hired=state.levels.max>0,actor=$('max-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='max');
    $('max-select').disabled=blocked()||!hired;$('max-select').setAttribute('aria-pressed',state.selectedCharacterId==='max');
  }
  function animateMaxAttack(count,volleyCount=count,summarized=false) {
    if(!state.levels.max||reducedMotion.matches||document.hidden)return 0;
    const actor=$('max-combatant'),now=performance.now(),burst=count>1||volleyCount>1||now-lastMaxShot<280;
    lastMaxShot=now;cancelVisual(maxAttackTimer);
    if(burst){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('max-standing'),'max-throw');maxAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),1180);}
    const layer=$('max-tubs'),g=readCombatGeometry(),groups=FX.projectileGroups(count,24-layer.children.length,summarized),windup=burst?80:670;
    groups.forEach((amount,i)=>{const delay=windup+i*45,tub=document.createElement('span');tub.className='max-tub pixel-art';tub.dataset.attackCount=amount;
      tub.style.left=(g.enemyX-28+(i%3-1)*12)+'px';tub.style.top=(g.enemyY-120)+'px';tub.style.animationDelay=delay+'ms';layer.append(tub);deferVisual(()=>tub.remove(),delay+360);
    });return windup+Math.max(0,groups.length-1)*45;
  }
  function renderTordeliese() {
    const hired=state.levels.tordeliese>0,actor=$('tordeliese-combatant');
    actor.hidden=!hired;actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='tordeliese');
    $('tordeliese-select').disabled=blocked()||!hired;$('tordeliese-select').setAttribute('aria-pressed',state.selectedCharacterId==='tordeliese');
  }
  function renderVishunal() {
    const hired=state.levels.vishunal>0,actor=$('vishunal-combatant');
    actor.hidden=!hired;actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='vishunal');
    $('vishunal-select').disabled=blocked()||!hired;$('vishunal-select').setAttribute('aria-pressed',state.selectedCharacterId==='vishunal');
  }
  function renderRichterOrbits() {
    const count = E.bombCount(state), orbits = $('richter-orbits');
    if (!state.options.showOrbits) count.visible = 0;
    orbits.hidden = !state.options.showOrbits;
    orbits.style.setProperty('--weapon-scale', E.weaponScale(state, 'richter'));
    orbits.title = `行動力強化Lv.${format(state.actionLevels.richter)} / 浮遊数${format(count.total)}（表示${count.visible}）`;
    const scale=E.weaponScale(state,'richter'),mobile=window.matchMedia('(max-width: 600px)').matches;
    const key=[count.visible,scale,mobile].join('|');
    if (shownBombs === key) return;
    shownBombs = key;
    orbits.replaceChildren(); orbits.classList.toggle('dense', count.visible > 12);
    const rings=UI.creatureOrbit(count.visible,scale,mobile).rings;
    rings.forEach(([amount, radius], ringIndex) => {
      const ring = document.createElement('span'); ring.className = 'creature-ring';
      ring.style.setProperty('--orbit-duration', `${14 + ringIndex * 4}s`);
      ring.style.setProperty('--orbit-direction', ringIndex % 2 ? 'reverse' : 'normal');
      for (let i = 0; i < amount; i++) {
        const angle = i / amount * Math.PI * 2 - Math.PI / 2 + ringIndex * .18;
        const slot = document.createElement('span'); slot.className = 'creature-slot';
        slot.style.left = `${50 + Math.cos(angle) * radius}%`;
        slot.style.top = `${50 + Math.sin(angle) * radius}%`;
        // Counter-rotate the wrapper; each creature can sway and breathe locally.
        // Assign phases only when building the orbit, not on every game tick.
        const facing = document.createElement('span'); facing.className = 'creature-facing';
        const phase = ringIndex * 20 + i;
        const img = document.createElement('span'); img.setAttribute('aria-hidden','true'); img.className = 'richter-creature pixel-art';
        img.style.setProperty('--creature-idle-duration', `${(1.2 + phase % 5 * .12).toFixed(2)}s`);
        img.style.setProperty('--creature-idle-delay', `${(-phase * .71).toFixed(2)}s`);
        facing.append(img); slot.append(facing); ring.append(slot);
      }
      orbits.append(ring);
    });
  }
  function renderMeta() {
    const count = E.sawCount(state);
    if (!state.options.showOrbits) count.visible = 0;
    $('meta-orbits').hidden = !state.options.showOrbits;
    $('meta-orbits').style.setProperty('--weapon-scale', E.weaponScale(state, 'meta'));
    $('meta-orbits').title = `行動力強化Lv.${format(state.actionLevels.meta)} / 浮遊数${format(count.total)}（表示${count.visible}）`;
    $('meta-combatant').classList.toggle('unhired', count.total === 0);
    $('meta-combatant').hidden = !state.levels.meta;
    $('meta-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('meta-select').disabled = blocked() || !state.levels.meta;
    $('meta-select').setAttribute('aria-pressed', state.selectedCharacterId === 'meta');
    $('meta-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'meta');
    // Each ring moves as one layer; rebuild only when the visible count changes.
    if (shownSaws !== count.visible) {
      shownSaws = count.visible;
      $('meta-orbits').replaceChildren();
      $('meta-orbits').classList.toggle('dense', count.visible > 12);
      const rings = count.visible === 0 ? [] : count.visible <= 12 ? [[count.visible, 44]] : count.visible <= 32
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
        vishunalX:state.levels.vishunal?$('vishunal-combatant').offsetLeft:0,vishunalY:state.levels.vishunal?$('vishunal-combatant').offsetTop:0,
        tordelieseX:state.levels.tordeliese?$('tordeliese-combatant').offsetLeft:0,tordelieseY:state.levels.tordeliese?$('tordeliese-combatant').offsetTop:0,
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
  function animateVishunalAttack(count,volleyCount=count,summarized=false) {
    if(!state.levels.vishunal||reducedMotion.matches||document.hidden)return 0;
    const actor=$('vishunal-combatant'),layer=$('vishunal-projectiles'),now=performance.now();
    const burst=volleyCount>1||now-lastVishunalShot<280;lastVishunalShot=now;
    if(burst||actor.classList.contains('bursting')){if(!actor.classList.contains('bursting'))vishunalMotionStarted=now;actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{vishunalMotionStarted=now;actor.classList.add('attacking');restartAnimation($('vishunal-standing'),'vishunal-fire');}
    cancelVisual(vishunalAttackTimer);
    const delay=actor.classList.contains('bursting')?80:200;
    if(!actor.classList.contains('bursting'))vishunalAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),560);
    const groups=FX.projectileGroups(count,FX.MAX_PROJECTILES-layer.children.length,summarized),g=readCombatGeometry();
    if(!groups.length&&layer.lastElementChild)labelProjectile(layer.lastElementChild,Number(layer.lastElementChild.dataset.attackCount)+count);
    groups.forEach((amount,index)=>{
      const flight=document.createElement('span');flight.className='vishunal-projectile';
      if(!muzzleOrder.length)muzzleOrder=UI.shuffledPorts(8,Math.random);
      const port=muzzleOrder.pop(),rapid=actor.classList.contains('bursting');
      const elapsed=now+delay-vishunalMotionStarted;
      const pose=rapid?4+Math.floor(elapsed/70)%4:elapsed<196?2:elapsed<476?3:0;
      const [mx,my]=D.vishunalVisual.muzzles[pose][port];
      const startX=g.vishunalX+(mx-112)*vishunalSpriteScale,startY=g.vishunalY+(my-112)*vishunalSpriteScale;
      flight.dataset.muzzle=String(port);
      flight.style.left=startX+'px';flight.style.top=startY+'px';
      flight.style.setProperty('--travel',g.enemyX-startX+'px');flight.style.setProperty('--rise',g.enemyY-startY+'px');
      flight.style.setProperty('--missile-angle',Math.atan2(g.enemyY-startY,g.enemyX-startX)*180/Math.PI+'deg');
      flight.style.setProperty('--flight-duration',FX.PROJECTILE_FLIGHT_MS+'ms');flight.style.setProperty('--launch-delay',delay+'ms');
      flight.style.setProperty('--weapon-scale',E.weaponScale(state,'vishunal')*vishunalSpriteScale);flight.style.setProperty('--lane',(index%3-1)*12+'px');
      const img=document.createElement('img');img.src=D.vishunalVisual.missile;img.alt='';img.className='pixel-art';flight.append(img);
      labelProjectile(flight,amount);layer.append(flight);deferVisual(()=>flight.remove(),delay+FX.PROJECTILE_FLIGHT_MS+80);
      const flash=document.createElement('span');flash.className='vishunal-muzzle';flash.dataset.muzzle=String(port);
      flash.style.left=mx+'px';flash.style.top=my+'px';flash.style.setProperty('--launch-delay',delay+'ms');
      $('vishunal-muzzles').append(flash);deferVisual(()=>flash.remove(),delay+160);
    });
    return delay;
  }
  function animateTordelieseAttack(count,volleyCount=count,summarized=false){
    if(!state.levels.tordeliese||reducedMotion.matches||document.hidden)return 0;
    const actor=$('tordeliese-combatant'),now=performance.now(),burst=volleyCount>1||count>1||now-lastTordelieseShot<280;
    lastTordelieseShot=now;cancelVisual(tordelieseAttackTimer);
    if(burst||actor.classList.contains('bursting')){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('tordeliese-standing'),'tordeliese-strike');tordelieseAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),800);}
    const layer=$('tordeliese-tendrils'),groups=FX.projectileGroups(count,24-layer.children.length,summarized),g=readCombatGeometry();
    let last=0;
    groups.forEach((amount,index)=>{
      const limbIndex=tordelieseLashIndex++,delay=index*45,rootX=g.tordelieseX-12*tordelieseSpriteScale;
      // Crouching lowers the attached limb root with her torso.
      const rootY=g.tordelieseY+(actor.classList.contains('bursting')?48:32)*tordelieseSpriteScale;
      const dx=g.enemyX-rootX,dy=g.enemyY-rootY+(limbIndex%5-2)*13;
      const lash=document.createElement('span');lash.className='tordeliese-tendril pixel-art';lash.dataset.attackCount=amount;lash.dataset.attached='true';
      lash.style.left=rootX+'px';lash.style.top=rootY+'px';
      lash.style.setProperty('--tendril-length',Math.max(80,Math.hypot(dx,dy))+'px');
      lash.style.setProperty('--tendril-angle',Math.atan2(dy,dx)*180/Math.PI+'deg');
      lash.style.setProperty('--tendril-delay',delay+'ms');lash.style.setProperty('--tendril-mirror',limbIndex%2?-1:1);
      layer.append(lash);deferVisual(()=>lash.remove(),delay+820);last=delay;
    });
    // The attached limb reaches its strike pose at 520ms, then retracts.
    return last+520;
  }
  function resetCombatVisuals(resetRoll = false) {
    playback.reset();
    if (battleRender !== null) cancelAnimationFrame(battleRender); battleRender = null;
    for (const id of visualTimers) clearTimeout(id); visualTimers.clear();
    clearTimeout(metaAttackTimer);
    $('max-combatant').classList.remove('attacking','bursting');$('max-tubs').replaceChildren();lastMaxShot=-Infinity;
    $('tordeliese-combatant').classList.remove('attacking','bursting');$('tordeliese-tendrils').replaceChildren();lastTordelieseShot=-Infinity;tordelieseLashIndex=0;
    displayedHP = null; lastRichterShot = -Infinity; visualHitId++;
    lastMetaAttack = -Infinity; lastMetaShot = -Infinity;
    $('arena').classList.remove('enemy-down', 'enemy-spawning', 'clear', 'hit', 'combat-playing');
    $('enemy-defeats').replaceChildren();
    $('meta-combatant').classList.remove('attacking', 'bursting');
    $('saw-projectiles').replaceChildren(); $('damage-floats').replaceChildren();
    $('richter-combatant').classList.remove('attacking', 'bursting');
    $('richter-projectiles').replaceChildren(); $('explosions').replaceChildren();
    $('hit-effects').replaceChildren();
    $('vishunal-combatant').classList.remove('attacking','bursting');$('vishunal-projectiles').replaceChildren();$('vishunal-muzzles').replaceChildren();lastVishunalShot=-Infinity;muzzleOrder=[];
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
    const groundedDefeat=['kneel','dissolve'].includes(ghost.dataset.defeatStyle);
    const fallMs = groundedDefeat ? 1100 : motion.fallMs + (hasDefeatSheet ? 240 : 0);
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
    ghost.style.marginLeft = `${groundedDefeat?0:motion.x * .25}px`;
    let label=null;
    layer.append(ghost);
    if(state.options.showDefeatLabels){
      label = document.createElement('span'); label.className = 'enemy-down-label defeat-label';
      label.textContent = frame.knockouts === frame.clears ? '気絶！' : 'DOWN';
      if (frame.overkills) label.textContent += ` / OVERKILL ＋${money(frame.overkillBonus)}Rd`;
      if (frame.clears > 1) label.textContent += ` ×${format(frame.clears)}`;
      label.style.marginLeft = `${motion.x}px`;
      label.style.marginTop = `${motion.y}px`;
      label.style.setProperty('--label-drift', `${motion.fallX * .25}px`);
      label.style.setProperty('--fall-duration', `${fallMs}ms`);
      layer.append(label);
    }
    renderEnemy(E.getSession(state), frame.clears);
    deferVisual(() => { ghost.remove(); label?.remove(); }, fallMs + 20);
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
    const vishunal=frame.vishunalAttacks?animateVishunalAttack(frame.vishunalAttacks,frame.volleyVishunalCount,frame.approximate):0;
    const tordeliese=frame.tordelieseAttacks?animateTordelieseAttack(frame.tordelieseAttacks,frame.volleyTordelieseCount,frame.approximate):0;
    const max=frame.maxAttacks?animateMaxAttack(frame.maxAttacks,frame.volleyMaxCount,frame.approximate):0;
    const continuation = frame.continuation ? (continuousBurst(frame.actorId||'richter') ? 80 : 200) : 0;
    return {meta,richter,vishunal,tordeliese,max,impact:frame.poisonTick?FX.PROJECTILE_FLIGHT_MS:Math.max(frame.maxAttacks?max+320:0,frame.tordelieseAttacks?tordeliese:0,(frame.metaAttacks||frame.richterAttacks||frame.vishunalAttacks||frame.continuation||!frame.actorId)?Math.max(meta||0,richter||0,vishunal||0,continuation)+FX.PROJECTILE_FLIGHT_MS:0)};
  }
  function showImpact(frame) {
    visualHitId++;
    const motion = FX.impactMotion();
    const hitMode=state.options.hitEffects;
    if(hitMode!=='off'){
      const sparks=$('hit-effects');
      while(sparks.children.length>=32)sparks.firstElementChild.remove();
      const spark=document.createElement('span');spark.className=`hit-spark${hitMode==='simple'?' simple-hit':''}${frame.poisonTick?' poison-hit':''}`;spark.dataset.impactId=visualHitId;
      spark.style.marginLeft=motion.x+'px';spark.style.marginTop=motion.y+'px';
      spark.style.setProperty('--spark-angle',motion.recoilAngle*3+'deg');
      sparks.append(spark);deferVisual(()=>spark.remove(),320);
    }
    if ((hitMode==='normal'||hitMode==='translucent') && (frame.actorId === 'richter' || frame.richterAttacks || frame.actorId === 'vishunal' || frame.vishunalAttacks)) {
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
    const details=[];
    if(frame.continuation&&state.options.showOverflowLabels)details.push('巻き込み');
    if(frame.knockoutRoll&&state.options.showDefeatLabels)details.push(`気絶判定 ${frame.knockoutRoll}：${frame.knockedOut?'気絶':'回避'}`);
    else if(frame.count>1&&state.options.showDamageNumbers)details.push(`${format(frame.count)}${frame.continuation?'体':'回'}`);
    if(state.options.showDamageNumbers||details.length){
      const floating = document.createElement('span'); floating.className = 'damage-float';
      if(frame.poisonTick)floating.classList.add('poison-damage');
      floating.dataset.attackCount = frame.count;
      floating.dataset.impactId = visualHitId;
      if(state.options.showDamageNumbers)floating.textContent = `${frame.poisonTick?'猛毒 ':''}${frame.approximate ? '合計 ' : ''}${format(frame.damage)}`;
      floating.style.marginLeft = `${motion.x}px`; floating.style.marginTop = `${motion.y}px`;
      floating.style.setProperty('--float-drift', `${motion.driftX}px`);
      floating.style.setProperty('--float-rise', `${-motion.floatRise}px`);
      if (details.length) {
        const detail = document.createElement('small');
        detail.textContent = details.join(' ');
        floating.append(detail);
      }
      while ($('damage-floats').children.length >= FX.MAX_STEPS) $('damage-floats').firstElementChild.remove();
      $('damage-floats').append(floating);
      deferVisual(() => floating.remove(), 850);
    }
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
    if (attacks.length && !document.hidden && !reducedMotion.matches) playback.enqueue(events,{sustainedActors:automatic ? ['meta','richter','vishunal','tordeliese','max'].filter(continuousBurst) : []});
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
  function switchManager(id) {
    managerTab = id;
    for (const tab of managerTabs) {
      const selected=tab===id;
      $('tab-'+tab).setAttribute('aria-selected',selected);
      $('tab-'+tab).tabIndex=selected?0:-1;
      $('panel-'+tab).hidden=!selected;
    }
  }
  function inspectCharacter(id, select = false) {
    inspectedCharacter=id;
    for (const c of D.characters) {
      const selected=c.id===id;
      $('inspect-'+c.id).setAttribute('aria-selected',selected);
      $('inspect-'+c.id).tabIndex=selected?0:-1;
      $('card-'+c.id).hidden=!selected;
    }
    if(select && state.levels[id] && !blocked()) {sync();E.selectCharacter(state,id);save();render();}
  }
  function bindTabs(ids, prefix, activate) {
    ids.forEach((id,index)=>{
      $(prefix+id).addEventListener('click',()=>activate(id));
      $(prefix+id).addEventListener('keydown',event=>{
        let next=event.key==='ArrowRight'?(index+1)%ids.length:event.key==='ArrowLeft'?(index+ids.length-1)%ids.length:event.key==='Home'?0:event.key==='End'?ids.length-1:null;
        if(next===null)return;
        event.preventDefault();activate(ids[next]);$(prefix+ids[next]).focus();
      });
    });
  }
  function bind() {
    switchManager(managerTab);inspectCharacter(inspectedCharacter);
    bindTabs(managerTabs,'tab-',switchManager);
    bindTabs(D.characters.map(c=>c.id),'inspect-',id=>inspectCharacter(id,true));
    for(const [id,key] of Object.entries(displayControls))$(id).addEventListener('change',()=>{
      if(blocked())return;
      const value=key==='hitEffects'?$(id).value:$(id).checked;
      if(key==='hitEffects'&&!D.hitEffectModes.includes(value))return;
      sync();state.options[key]=value;
      // Apply immediately to existing visuals, without interrupting attack playback.
      if(key==='hitEffects'){$('hit-effects').replaceChildren();$('explosions').replaceChildren();}
      if(key==='showRewardDice'&&!value)for(const die of $('reward-rain').children)die.hidden=true;
      if(['showDamageNumbers','showOverflowLabels','showDefeatLabels'].includes(key))$('damage-floats').replaceChildren();
      if(key==='showDefeatLabels'&&!value)for(const node of Array.from($('enemy-defeats').children))if(node.classList.contains('defeat-label'))node.remove();
      save();render();
    });
    $('option-save').addEventListener('click',()=>$('save-dialog').showModal());
    $('option-help').addEventListener('click',()=>$('help-dialog').showModal());
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
    $('vishunal-select').addEventListener('click', () => chooseCharacter('vishunal'));
    $('max-select').addEventListener('click',()=>chooseCharacter('max'));
    $('tordeliese-select').addEventListener('click', () => chooseCharacter('tordeliese'));
    $('select-self').addEventListener('click', () => chooseCharacter(null));
    $('character-list').addEventListener('click', event => {
      if(handleTrade(event))return;
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
        if (E.buyAction(state, c.id)) { for(const p of E.perks(state,c))if(p.levelType==='action'&&p.level===state.actionLevels[c.id])notice(`${c.name}：特性【${p.name}】が購入可能になりました。`); log(`${c.name}の行動力を${rateFormat(E.actionPower(state, c))}に強化。`); save(); render(); }
        return;
      }
      if (E.hire(state, button.dataset.hire)) {
        const c = D.characters.find(c => c.id === button.dataset.hire);
        log(`${c.name} ${state.levels[c.id] === 1 ? 'が参加しました。' : `の威力をLv.${state.levels[c.id]}に強化。`}`);
        for (const p of c.perks || []) if (p.levelType!=='action' && p.level === state.levels[c.id]) {
          const text = `${c.name}：特性【${p.name}】が購入可能になりました。因子${money(p.cost)}Rdで解放できます。`;
          log(text); notice(text);
        }
        save(); render();
      }
    });
    $('upgrade-list').addEventListener('click', event => {
      if(handleTrade(event))return;
      const button = event.target.closest('[data-upgrade]');
      if (!button || blocked()) return;
      sync();
      if (E.buyUpgrade(state, button.dataset.upgrade)) { log(`${D.upgrades.find(u => u.id === button.dataset.upgrade).name}を強化。`); save(); render(); }
    });
    $('quest-list').addEventListener('click',event=>{
      if(handleTrade(event))return;
      const choose=event.target.closest('[data-session]');
      if(choose&&choose.dataset.session){
        if(choose.disabled||blocked())return;
        sync();
        if(E.selectSession(state,choose.dataset.session)){resetCombatVisuals(true);log(E.getSession(state).name+'の周回を開始。');save();render();}
        return;
      }
      const button=event.target.closest('[data-quest]');
      if(!button||button.disabled||blocked())return;
      sync();
      if(E.buyQuest(state,button.dataset.quest)){
        if(state.sessionId===button.dataset.quest)resetCombatVisuals();
        const quest=E.getSession(state,button.dataset.quest);
        log(`${quest.name}をLv.${UI.fullNumber(quest.level)}に強化。`);
        save();render();
      }
    });
    $('option-cache').addEventListener('click',async()=>{
      if(maintenanceBusy)return;
      if(!blocked()&&!save()){notice('進行を保存できないため、更新を中止しました。セーブを書き出してから再試行してください。',true);return;}
      maintenanceBusy=true;resetCombatVisuals();render();
      setText('maintenance-status','画像・スクリプトを再取得しています…');
      try{
        const documents=[location.href,...Array.from(document.querySelectorAll('script[src],link[rel="stylesheet"]')).map(n=>n.src||n.href)];
        const urls=M.assetUrls(D,documents,location.href);
        const result=await M.refresh(urls,(url,options)=>fetch(url,options));
        if(!result.ok)throw Error('取得できないファイルがあります。接続を確認して再試行してください。');
        const target=new URL(location.href);target.searchParams.set('_yggRefresh',Date.now());
        location.replace(target.href);
      }catch(error){maintenanceBusy=false;lastTime=Date.now();render();setText('maintenance-status','更新できませんでした。'+error.message);}
    });
    $('option-delete').addEventListener('click',()=>{if(readOnly||maintenanceBusy)return;$('delete-dialog').showModal();$('delete-cancel').focus();});
    $('delete-cancel').addEventListener('click',()=>$('delete-dialog').close());
    $('delete-backup').addEventListener('click',()=>{$('delete-dialog').close();$('save-dialog').showModal();});
    $('delete-confirm').addEventListener('click',()=>{
      if(readOnly||maintenanceBusy)return;
      maintenanceBusy=true;resetCombatVisuals();
      const result=M.erase(storage);
      if(!result.ok){maintenanceBusy=false;render();setText('delete-message',result.error);return;}
      state=E.createState();importCandidate=null;importBackup=null;corruptSave=false;storageError=false;
      $('save-text').value='';$('import-preview').hidden=true;message('');
      $('activity-log').replaceChildren();lastTime=Date.now();lastSave=lastTime;controlsKey='';
      maintenanceBusy=false;inspectedCharacter='meta';switchManager('options');inspectCharacter('meta');
      resetCombatVisuals(true);render();$('delete-dialog').close();
      setText('delete-message','');setText('save-status','初期状態 · 次回の自動保存を待機');
      setText('maintenance-status','進行データとバックアップを削除しました。最初から開始します。');
      log('データを削除し、初期因子0Rdから開始。');
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
