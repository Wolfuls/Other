(function () {
  'use strict';
  const D = window.YggData, E = window.YggEngine, S = window.YggSave, FX = window.YggCombatEffects, UI = window.YggDisplay, M=window.YggMaintenance;
  const charactersByHireCost=[...D.characters].sort((a,b)=>a.cost-b.cost);
  const elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, document.getElementById(id)); return elements.get(id); };
  const setText = (id, value) => { const node = $(id), text = String(value); if (node.textContent !== text) node.textContent = text; };
  let maintenanceBusy=false;
  let controlsKey = '', battleRender = null, combatGeometry = null;
  let managerTab = 'characters', inspectedCharacter = 'meta', noticeTimer;
  let formationQuestId=null,formationDraft=[],formationRowsDraft={};
  let abilityEdit=null,enemyInfoQuestId=null;
  const questInputDrafts=new Map();
  const shownPoison=new Map(),pendingCloudBirths=new Set(),pendingEnemyDefeats=new Set();
  const managerTabs = ['characters','quests','upgrades','stats','options'];
  const displayControls = {'option-simple-numbers':'simplifiedNumbers','option-orbits':'showOrbits','option-hit-effects':'hitEffects',
    'option-factor-rain':'showFactorRain','option-reward-dice':'showRewardDice',
    'option-damage-numbers':'showDamageNumbers','option-overflow-labels':'showOverflowLabels','option-defeat-labels':'showDefeatLabels'};
  let enemyVariantSession = '', revivalTarget=null;
  const enemyAttackVisuals=new Map();
  const enemyAppearances=new Map();
  let orbitLayoutKey = '', arenaViewportWidth = 0;
  let shownCrystals = -1;
  let rewardDieIndex = 0;
  const PRE_IMPORT = 'yggclicker.before-import';
  const RICHTER_EXPLOSION_MS = 640;
  let state = E.createState(), storage, readOnly = false, corruptSave = false;
  let importCandidate = null, lastTime = Date.now(), lastSave = Date.now(), initialized = false;
  let storageError = false, importBackup = null, saveErrorMessage = '';
  let shownSaws = -1, metaAttackTimer, lastMetaAttack = -Infinity, lastMetaShot = -Infinity;
  let displayedHP = null, visualHitId = 0, spawnTimer;
  const hitTimers=new Map();
  let shownBombs = -1, richterAttackTimer, lastRichterShot = -Infinity;
  let jewelAttackTimer,lastJewelShot=-Infinity;
  let mitsuruAttackTimer,lastMitsuruShot=-Infinity;
  let queenAttackTimer,lastQueenShot=-Infinity;
  let meguminAttackTimer,meguminCastMagic=0;
  let wakuAttackTimer,lastWakuShot=-Infinity;
  let maxAttackTimer,lastMaxShot=-Infinity;
  let lastTordelieseShot=-Infinity,tordelieseAttackTimer,tordelieseLashIndex=0,tordelieseSpriteScale=1;
  let vishunalAttackTimer, lastVishunalShot = -Infinity, vishunalMotionStarted = 0, muzzleOrder = [], vishunalSpriteScale=.5;
  const visualTimers = new Set();
  const playback = FX.createPlayback({ onLaunch:showLaunch, onImpact:showImpact, onActorIdle:finishBurst, onIdle:() => {
    const hitId = visualHitId;
    deferVisual(() => { if (!playback.pending && hitId === visualHitId) { displayedHP = null; pendingEnemyDefeats.clear(); $('arena').classList.remove('combat-playing'); requestBattleRender(); } }, 200);
  } });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const money = n=>UI.currencyNumber(n,state.options.simplifiedNumbers);
  const fullNumber=n=>UI.fullNumber(n,state.options.simplifiedNumbers),incomeNumber=n=>UI.incomeNumber(n,state.options.simplifiedNumbers);
  const format = fullNumber;
  const rateFormat = incomeNumber;

  const rollText=s=>s?fullNumber(s.flat||0)+'＋'+fullNumber(s.dice||0)+'D'+(s.sides||6):'—';
  const signed=n=>(n>=0?'+':'')+rateFormat(n);
  const pressureNumber=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:6});
  const pressureText=n=>pressureNumber.format(Math.abs(n)<1e-12?0:n);
  function renderPressureBreakdown(c){
    const b=E.runawayPressureBreakdown(state,c),minute=n=>pressureText(n*60),signedMinute=n=>(n>0?'+':'')+minute(n);
    setText('pressure-summary-'+c.id,'差引 '+signedMinute(b.net)+' / 分');
    const trainingNames={level:'レベル',power:'攻撃',action:'行動',accuracy:'命中',evasion:'回避',vitality:'HP',armor:'防御'};
    const trainingParts=b.trainingLevels.map(t=>trainingNames[t.id]+' '+fullNumber(t.level)).join(' ＋ ');
    const perkRows=b.perkEntries.map(p=>'<div class="'+(!p.enabled||!p.eligible?'pressure-inactive':'')+'"><dt>'+p.name+' <small>'+(!p.eligible?'Lv不足':p.enabled?'ON':'OFF')+'</small></dt><dd>'+minute(p.configured)+(!p.enabled||!p.eligible?' × 0':'')+' ＝ '+minute(p.pressure)+'</dd></div>').join('');
    const calmingRows=b.calmingEntries.map(u=>'<div><dt>'+u.name+'</dt><dd>'+minute(u.perLevel)+(u.source==='perk'?'（部隊効果）':' × Lv.'+fullNumber(u.level))+' ＝ '+minute(u.pressure)+'</dd></div>').join('');
    const status=b.active?(state.paused?'一時停止中・再開時の計算':'部隊参加中'):({collapsed:'暴走ダウン中',down:'戦闘不能',undeployed:'未編成'}[b.inactiveReason]+'：暴走圧は停止、鎮静のみ適用');
    const equation='（'+[b.base,b.training,b.perkPressure,b.temporary].map(minute).join(' ＋ ')+'）× '+pressureText(b.recoveryMultiplier)+(b.active?'':' × 0')+' − '+minute(b.calming)+' ＝ 約 '+signedMinute(b.net)+' / 分';
    const html='<p class="pressure-caption">'+status+'<span>単位：暴走率のポイント / 分</span></p>'+
      '<div class="pressure-columns"><section><h4>暴走圧</h4><dl class="pressure-values">'+
      '<div><dt>基礎暴走圧</dt><dd>'+minute(b.base)+'</dd></div>'+
      '<div><dt>育成暴走圧</dt><dd>'+minute(b.trainingScale)+' × log₂(1 ＋ '+fullNumber(b.trainingTotal)+')<br>＝ 約 '+minute(b.training)+'</dd></div></dl>'+
      '<p class="pressure-training">配分済みCP合計：'+trainingParts+' ＝ '+fullNumber(b.trainingTotal)+'<small>未使用CPは含まない</small></p>'+
      '<dl class="pressure-values"><div><dt>パーク合計</dt><dd>'+minute(b.perkPressure)+'</dd></div><div><dt>一時補正</dt><dd>'+minute(b.temporary)+'</dd></div>'+
      '<div><dt>回復型活性</dt><dd>×（1 − '+b.recoveryStacks+'段階 × '+pressureText(b.recoveryReduction)+'）<br>＝ ×'+pressureText(b.recoveryMultiplier)+'</dd></div>'+
      '<div class="pressure-subtotal"><dt>適用する暴走圧</dt><dd>約 '+minute(b.generated)+'</dd></div></dl></section>'+
      '<section class="pressure-perk-panel"><h4>パークの暴走圧</h4><dl class="pressure-values">'+perkRows+'</dl></section>'+
      '<section class="pressure-calming-panel"><h4>鎮静圧</h4><dl class="pressure-values">'+calmingRows+'<div class="pressure-subtotal"><dt>鎮静圧の合計</dt><dd>'+minute(b.calming)+'</dd></div></dl></section></div>'+
      '<div class="pressure-equation"><strong>（基礎 ＋ 育成 ＋ パーク ＋ 一時補正）× 活性補正 − 鎮静圧</strong><p>'+equation+'</p><small>1秒当たり：約 '+(b.net>0?'+':'')+pressureText(b.net)+' ポイント'+(b.criticalReserve>0?' ／ 臨界余力 '+pressureText(b.criticalReserve)+' が正の増加を先に受け持ちます。':'')+'</small></div>';
    const node=$('pressure-content-'+c.id);if(node.innerHTML!==html)node.innerHTML=html;
  }
  function renderStrengthPreview(c,ctx){
    const enemy=ctx.enemies?.find(e=>e.id===ctx.focusedEnemyId&&e.hp>0)||ctx.enemies?.find(e=>e.hp>0),p=E.attackProfile(ctx,c),hit=E.T.hit(p.accuracy,E.targetEvasion(p,enemy),p.hitLogRatio),damage=E.T.damage({dice:p.dice,flat:p.flat+p.bonus,resultScale:p.resultScale},E.targetDefense(p,enemy),p.damageLogRatio,p.damageScaleLog||0);
    const node=$('strength-preview-'+c.id);const html='<h4>現在の対象への見込み</h4><dl class="strength-target"><div><dt>命中補正</dt><dd>'+signed(hit.correction)+'</dd></div><div><dt>推定命中率</dt><dd>'+((p.autoHitChance+(1-p.autoHitChance)*hit.chance)*100).toFixed(1)+'%</dd></div><div><dt>ダメージ補正</dt><dd>'+signed(damage.correction)+'</dd></div><div><dt>'+(p.apAttack?'通常命中の平均AP減少':'通常命中の平均ダメージ')+'</dt><dd>'+(p.hiddenAttack&&!p.apAttack?'？？？':rateFormat(p.areaAttack&&!p.noAreaPenalty?Math.max(1,Math.floor(damage.mean/2)):damage.mean))+'</dd></div></dl>';
    if(node.innerHTML!==html)node.innerHTML=html;
  }
  const symptomName=id=>({control:'制御異常',overload:'過負荷',hearing:'聴覚異常',vision:'視覚異常',body:'身体異常',ability:'能力異常',language:'言語異常',memory:'記憶異常',mind:'精神異常',oblivion:'忘我'}[id]||'自制');

  function attackFormula(profile) {
    if(profile.hiddenAttack&&!profile.apAttack)return "？？？";
    let text = `${profile.dice}D6 + ${profile.flat}${profile.bonus ? ` + ${profile.bonus}（特効）` : ''}`;
    const b = profile.breakdown, correction = 1 + b.upgrade.rate;
    if (correction !== 1 || b.levelMultiplier !== 1) {
      text = `(${text})${correction !== 1 ? ` ×${rateFormat(correction)}（補正）` : ''} ×${rateFormat(b.levelMultiplier)}（Lv）`;
    }
    if (profile.ignoreDefense) text += ' / 防御無視';
    else if (profile.defense) text += ` − ${profile.defense}（${profile.mental?'抵抗':'防御'}）`;
    if(profile.extraAttackChance) text += ` / 追加攻撃${rateFormat(profile.extraAttackChance*100)}%`;
    if(profile.poisonDamage) text += ` / 猛毒${profile.poisonDamage}`;
    if(profile.penetrationBlocked) text += ' / 貫通無効';
    if(profile.areaAttack) text += profile.noAreaPenalty?' / 全体攻撃（半減なし）':' / 全体攻撃（防御後1/2）';
    return (profile.apAttack?'APへの精神攻撃：':'')+text;
  }
  function renderLevelNote(id,profile){
    const note=$(id);note.hidden=!profile.minimumLevelBonus;
    setText(id,profile.minimumLevelBonus?'Lv補正は最低＋'+profile.minimumLevelBonus:'');
  }
  function formulaPanel(id, manual = false) {
    return `<details class="damage-breakdown" id="formula-${id}"${manual ? ' open' : ''}><summary>${manual ? '手動攻撃' : '自動攻撃'}の計算式・補正内訳</summary>
      <p class="formula-order">攻撃ロール ＋ 強度補正 − 防御・抵抗</p>
      <dl>${[['base','基礎攻撃力'],['perk','パーク補正'],['upgrade','コンセントレイション'],['level','対象への強度補正']].map(([key,label])=>`<div><dt>${label}</dt><dd id="formula-${id}-${key}"></dd></div>`).join('')}</dl>
      <p class="formula-result" id="formula-${id}-result"></p><small class="level-correction-note" id="formula-${id}-note" hidden></small></details>`;
  }
  function renderFormula(id, profile) {
    const b = profile.breakdown;
    if(profile.hiddenAttack&&!profile.apAttack){for(const key of ['base','perk','upgrade','level','result'])setText('formula-'+id+'-'+key,'？？？');return;}
    $('formula-' + id + '-base').textContent = `${b.base.dice}D6 + ${b.base.flat}${b.base.source ? `（${b.base.source}適用後）` : ''}`;
    const perk = [];
    if (b.perk.dice) perk.push(`${b.perk.dice}D6`);
    if (b.perk.flat) perk.push(`${b.perk.flat}`);
    if (b.perk.conditional) perk.push(`${b.perk.conditional}（対象への特効）`);
    $('formula-' + id + '-perk').textContent = perk.length ? `＋ ${perk.join(' + ')}` : '0';
    const upgrade = [];
    if (b.upgrade.flat) upgrade.push(`${b.upgrade.flat}（コンセントレイション）`);
    $('formula-' + id + '-upgrade').textContent = upgrade.length ? `＋ ${upgrade.join(' + ')}` : '0';
    const match=E.T.damage({dice:profile.dice,flat:profile.flat+profile.bonus,resultScale:profile.resultScale},profile.defense,profile.damageLogRatio||0,profile.damageScaleLog||0);
    $('formula-'+id+'-level').textContent=(match.correction>=0?'＋':'')+rateFormat(match.correction);
    $('formula-'+id+'-result').textContent='通常命中の平均 '+rateFormat(match.mean)+(profile.apAttack?' AP減少':' ダメージ')+(profile.ignoreDefense?'（防御力・防御強度を無視）':'');
    if(profile.areaAttack)$('formula-'+id+'-result').textContent+=profile.noAreaPenalty?' → 半減せず全体へ適用':' → 半減して全体に適用（各最低1）';
    renderLevelNote(`formula-${id}-note`,profile);
  }
  const blocked = () => readOnly || corruptSave || maintenanceBusy;
  const battleHUD=window.YggBattleHUD.create({get:$,setText,format:fullNumber});
  const sceneView=window.YggSceneView.create({get:$,setText,data:D,engine:E,display:UI,money,reducedMotion,blocked,startNextRun,schedule:setTimeout,cancel:clearTimeout});
  const questView=window.YggQuestView.create({get:$,setText,data:D,engine:E,matchup:window.YggMatchup,money,fullNumber,rateFormat,incomeNumber,blocked,tradeControls,renderTrades,questInputDrafts,
    renderEnemyInfoIfOpen:(ctx,id)=>{if(enemyInfoQuestId===id&&$('enemy-info-dialog').open)renderEnemyInfo(ctx,$('enemy-info-content'));}
  });
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
    if(abilityEdit)return;
    const row = document.createElement('li'), time = document.createElement('time'), content = document.createElement('span');
    time.textContent = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    content.textContent = text;
    row.append(time, content);
    $('activity-log').prepend(row);
    while ($('activity-log').children.length > 5) $('activity-log').lastElementChild.remove();
  }
  function build() {
    for(const c of D.characters){
      const actor=$(c.id+'-combatant'),down=document.createElement('img');down.src=c.downSprite;down.alt=c.name+'：ダウン';down.className='ally-down-sprite pixel-art';down.style.setProperty('--down-bottom-gap',((c.downContact.height-c.downContact.bottom)/c.downContact.height*100)+'%');actor.append(down);
      battleHUD.mount(c,actor,document);
    }

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
    $('megumin-standing').style.setProperty('--megumin-sheet',`url("${D.meguminVisual.sheet}")`);
    $('megumin-standing').style.setProperty('--megumin-charge',`url("${D.meguminVisual.charge}")`);
    $('explosions').style.setProperty('--megumin-explosion-sheet',`url("${D.meguminVisual.explosion}")`);
    const chargeAxis=$('megumin-charge-axis');
    for(let i=0;i<7;i++){
      const ring=document.createElement('span'),glyph=document.createElement('img');
      ring.className='megumin-charge-ring';ring.style.setProperty('--ring-index',i);ring.hidden=true;
      glyph.src=D.meguminVisual.circle;glyph.alt='';ring.append(glyph);chargeAxis.append(ring);
    }
    $('queen-standing').style.setProperty('--queen-sheet',`url("${D.queenVisual.sheet}")`);
    $('mitsuru-standing').style.setProperty('--mitsuru-sheet',`url("${D.mitsuruVisual.sheet}")`);
    $('jewel-standing').style.setProperty('--jewel-sheet',`url("${D.jewelVisual.sheet}")`);
    $('meta-standing').style.setProperty('--meta-normal-sheet', `url("${D.metaVisual.sheet}")`);
    $('meta-standing').style.setProperty('--meta-burst-sheet', `url("${D.metaVisual.burstSheet}")`);
    $('waku-standing').style.setProperty('--waku-attack-sheet',`url("${D.wakuVisual.attackSheet}")`);
    $('waku-standing').style.setProperty('--waku-sheet',`url("${D.wakuVisual.sheet}")`);
    $('waku-standing').style.setProperty('--waku-burst-sheet',`url("${D.wakuVisual.burstSheet}")`);
    $('richter-orbits').style.setProperty('--creature-idle-sheet',`url("${D.richterVisual.idleSheet}")`);
    $('richter-standing').style.setProperty('--richter-sheet', `url("${D.richterVisual.sheet}")`);
    $('richter-standing').style.setProperty('--richter-burst-sheet', `url("${D.richterVisual.burstSheet}")`);
    $('vishunal-standing').style.setProperty('--vishunal-sheet', `url("${D.vishunalVisual.sheet}")`);
    $('tordeliese-standing').style.setProperty('--tordeliese-sheet',`url("${D.tordelieseVisual.sheet}")`);
    D.tordelieseVisual.tendrilFrames.forEach((src,i)=>$('tordeliese-tendrils').style.setProperty(`--tendril-${i}`,`url("${src}")`));
    $('explosions').style.setProperty('--explosion-sheet', `url("${D.richterVisual.explosionSheet}")`);
    $('explosions').style.setProperty('--blast-duration', `${RICHTER_EXPLOSION_MS}ms`);
    $('party-capacity').textContent = `/ ${E.MAX_PARTY_SIZE}`;
    $('manual-formula').innerHTML = formulaPanel('manual', true);
    $('character-picker').innerHTML = charactersByHireCost.map(c=>`<div class="picker-entry"><button id="inspect-${c.id}" type="button" role="tab" aria-controls="card-${c.id}" aria-selected="false" tabindex="-1"><span class="picker-icon" aria-hidden="true">${c.portraitSheet?`<span class="${c.portraitClass||'vishunal-avatar'} pixel-art" style="background-image:url('${c.portrait}')"></span>`:`<img class="pixel-art" src="${c.portrait}" alt="">`}</span><span class="picker-copy"><span class="picker-name" id="picker-name-${c.id}"></span><span class="picker-hp" id="picker-hp-${c.id}"></span><span class="picker-runaway" id="picker-runaway-${c.id}"></span></span></button><button type="button" class="suppress-button" id="suppress-${c.id}" data-suppress="${c.id}"><span>暴走抑制</span><small id="suppress-cost-${c.id}"></small></button></div>`).join('');
    for (const src of [D.meguminVisual.sheet,D.meguminVisual.charge,D.meguminVisual.circle,D.meguminVisual.explosion,D.queenVisual.sheet,D.mitsuruVisual.sheet,D.jewelVisual.sheet,'./img/gamer-throne-standing-v7.png','./img/gamer-throne-attack-v7.png','./img/gamer-throne-burst-v7.png','./img/tarai-v1.png',...D.sessions.flatMap(s=>[s.background,s.nightBackground,s.dawnBackground,s.duskBackground,s.sheet,s.attackSheet,s.absorbSheet,s.summon?.sheet,s.summon?.attackSheet,s.defeatSheet].filter(Boolean)),D.tordelieseVisual.sheet,...D.characters.map(c=>c.downSprite),...D.tordelieseVisual.tendrilFrames,D.vishunalVisual.sheet,D.vishunalVisual.missile,D.metaVisual.sheet,D.metaVisual.burstSheet,D.wakuVisual.sheet,D.wakuVisual.attackSheet,D.wakuVisual.burstSheet, D.richterVisual.burstSheet, D.richterVisual.bomb,D.richterVisual.idleSheet, D.richterVisual.explosionSheet,...D.sessions.flatMap(s=>(s.variants||[]).flatMap(v=>[v.sheet||v.image,v.defeatSheet].filter(Boolean)))]) { const preload = new Image(); preload.src = src; }
    $('character-list').innerHTML = charactersByHireCost.map(c => `<article class="character-card compact-character" id="card-${c.id}" role="tabpanel" aria-labelledby="inspect-${c.id}" style="--char-color:${c.color}">
      <button class="character-select" data-select-character="${c.id}" aria-label="${c.name}を手動攻撃に選択" aria-pressed="false" title="クリックで手動攻撃の担当に選択"><span class="avatar ${c.portrait ? 'sprite-avatar' : ''}" aria-hidden="true">${c.portraitSheet ? `<span class="${c.portraitClass||'vishunal-avatar'} pixel-art" style="background-image:url('${c.portrait}')"></span>` : c.portrait ? `<img class="pixel-art" src="${c.portrait}" alt="">` : c.initials}</span><strong class="character-identity" id="identity-${c.id}">${c.name}</strong></button>
      <div class="character-vitals" id="vitals-${c.id}"><span id="health-${c.id}"></span><button class="button secondary revive-button" id="revive-${c.id}" data-revive="${c.id}"></button></div>
      <button class="button secondary ability-open" id="ability-open-${c.id}" data-ability="${c.id}">能力値レベルアップ</button>${abilityDialog(c)}
      <p class="current-attack"><span>攻撃力の現在式</span><strong id="stats-${c.id}"></strong><small class="level-correction-note" id="stats-note-${c.id}" hidden></small></p></article>`).join('');

    questView.build();
    sceneView.mount();
    $('upgrade-list').innerHTML = D.upgrades.map(u => `<article class="upgrade-card"><span class="upgrade-icon" aria-hidden="true">${u.icon}</span><span class="upgrade-level" id="upgrade-level-${u.id}">Lv.0</span><h3>${u.name}</h3><p>${u.label}</p><div class="upgrade-purchase"><button class="button secondary" data-upgrade="${u.id}" aria-label="${u.name}を購入"><span id="upgrade-cost-${u.id}"></span></button>${u.id === 'reward' ? `<span class="enhancement-bonus"><small>報酬補正</small><strong id="${u.id}-bonus"></strong></span>` : ''}</div>${tradeControls('upgrade',u.id,u.max!==1)}</article>`).join('');
  }
  const rangeText=range=>range[0]===range[1]?String(range[0]):range.join('～');
  function perkPanel(c){
    return '<section class="ability-perks" aria-labelledby="perk-title-'+c.id+'"><div class="ability-section-heading"><h3 id="perk-title-'+c.id+'">パーク</h3><span id="perk-summary-'+c.id+'"></span></div><div class="ability-perk-grid">'+(c.perks||[]).map(p=>'<div class="perk" id="perk-'+c.id+'-'+p.id+'"><div><span>'+ (p.awakeningLevel?'覚醒Lv.'+p.awakeningLevel:p.initial?'初期パーク':'Lv.'+p.level)+'</span><span class="perk-pressure">暴走圧 '+pressureText((p.runawayPressure||0)*60)+'%/分</span><strong>'+(p.struckPrefix?'<s>'+p.struckPrefix+'</s>':'')+p.name+'</strong><span class="perk-status"></span></div><p>'+((p.attackRange||p.effectRange)?'['+(p.attackRange?'攻撃':'付加')+'：'+rangeText(p.attackRange||p.effectRange)+'] ':'')+p.description+'</p><button class="button secondary perk-buy" data-perk-character="'+c.id+'" data-perk="'+p.id+'"></button></div>').join('')+'</div></section>';
  }
  function focusControls(c,track){
    return '<div class="allocation-controls"><button type="button" data-focus="'+c.id+'" data-focus-stat="'+track+'" data-step="-1" aria-label="'+c.name+'の'+D.concentration.find(t=>t.id===track).name+'配分を減らす">−</button><input type="number" min="0" step="1" id="focus-'+track+'-'+c.id+'" data-focus-input="'+c.id+'" data-focus-stat="'+track+'" aria-label="'+c.name+'の'+D.concentration.find(t=>t.id===track).name+'配分"><button type="button" data-focus="'+c.id+'" data-focus-stat="'+track+'" data-step="1" aria-label="'+c.name+'の'+D.concentration.find(t=>t.id===track).name+'配分を増やす">＋</button><small id="focus-bonus-'+track+'-'+c.id+'"></small></div>';
  }
  function abilityDialog(c){
    const rows=window.YggAbilityView.rows({
      baseCell:t=>'<strong id="ability-base-'+t.id+'-'+c.id+'"></strong>'+(t.id==='power'?'<small class="base-attack-range">基本射程 '+(c.id==='waku'?'剣 1 ／ 発砲 2～3':rangeText(c.attackRange))+'</small>':'')+(c.statFlavor?'<small class="stat-flavor">'+(t.id==='armor'?'防御：'+c.statFlavor.defense+'<br>抵抗：'+c.statFlavor.resistance:c.statFlavor[t.id]||'')+'</small>':''),
      valueCell:t=>'<strong id="ability-value-'+t.id+'-'+c.id+'"></strong>',
      controls:t=>focusControls(c,t.id),
      hp:'<small class="ability-hp" id="ability-maxhp-'+c.id+'"></small>',
      ss:'<strong id="ability-base-ss-'+c.id+'"></strong>'+(c.statFlavor?'<small class="stat-flavor">'+c.statFlavor.ss+'</small>':'')
    });
    return '<dialog class="ability-dialog" id="ability-dialog-'+c.id+'" aria-labelledby="ability-title-'+c.id+'"><div class="ability-head"><div><small>能力・パーク</small><h2 id="ability-title-'+c.id+'">'+c.name+'</h2></div><button class="button secondary" data-ability-close="'+c.id+'" aria-label="変更を取り消して閉じる">×</button></div><div class="ability-content"><section class="unified-training"><div><small>キャラクターレベル</small><strong id="character-level-'+c.id+'"></strong></div><div class="ability-actions"><button class="button secondary" data-hire="'+c.id+'"><span id="hire-label-'+c.id+'">+1</span><small id="hire-cost-'+c.id+'"></small></button>'+tradeControls('level',c.id,true,true).replace('10回購入','+10').replace('1Lv売却','−1')+'</div></section><div class="focus-heading"><div><h3>コンセントレイション</h3><p>未使用CPを配分できます。振り直しは有料です。</p></div><strong id="focus-remaining-'+c.id+'"></strong><button class="button secondary" id="focus-reset-'+c.id+'" data-focus-reset="'+c.id+'">振り直す</button></div><div class="ability-rows">'+rows+'</div>'+(c.magicPower?'<p class="magic-summary" id="magic-summary-'+c.id+'"></p>':'')+'<details class="pressure-breakdown" id="pressure-breakdown-'+c.id+'"><summary>暴走圧・鎮静圧の計算 <span id="pressure-summary-'+c.id+'"></span></summary><div id="pressure-content-'+c.id+'"></div></details>'+perkPanel(c)+'<section class="strength-preview" id="strength-preview-'+c.id+'"></section></div><div class="ability-footer" role="group" aria-label="変更内容の確定"><span id="ability-changes-'+c.id+'"></span><div class="ability-confirm"><p id="ability-factors-'+c.id+'"></p><button class="button" data-ability-confirm="'+c.id+'">確定</button></div></div></dialog>';
  }
  function focusMinimum(id,track){return abilityEdit?.id===id&&!abilityEdit.focusReset?E.concentration(abilityEdit.original,id)[track]:0;}
  function proposedTraining(step){
    const id=abilityEdit.id,targets={level:state.levels[id]+step},key=JSON.stringify([targets,state.perkEnabled,state.unlockedPerks,state.concentration,abilityEdit.focusReset]);
    if(!abilityEdit.cache.has(key)){
      const base={...abilityEdit.original,perkEnabled:structuredClone(state.perkEnabled),unlockedPerks:structuredClone(state.unlockedPerks)};
      const plan=E.trainingPlan(base,id,targets);
      if(plan.valid){
        if(!E.setConcentration(plan.state,id,E.concentration(state,id)))plan.valid=false;
        if(abilityEdit.focusReset){const fee=E.concentrationResetCost(plan.state,id);if(plan.state.factors<fee)plan.valid=false;else {plan.state.factors-=fee;plan.cost+=fee;}}
        plan.state.health[id].hp=Math.min(abilityEdit.original.health[id].hp,E.maxHP(plan.state,D.characters.find(c=>c.id===id)));E.clampHealth(plan.state,id);
      }
      abilityEdit.cache.set(key,plan);
    }
    return abilityEdit.cache.get(key);
  }
  function openAbility(id){
    sync();save();resetCombatVisuals();abilityEdit={id,original:state,cache:new Map(),focusReset:false,returnTab:managerTab,returnCharacter:inspectedCharacter};switchManager("characters");inspectCharacter(id);state=structuredClone(state);controlsKey='';render();$('ability-dialog-'+id).showModal();
  }
  function finishAbility(confirm=false){
    if(!abilityEdit||confirm&&blocked())return;
    const {id,original,returnTab,returnCharacter}=abilityEdit;if(!confirm)state=original;
    abilityEdit=null;lastTime=Date.now();$('ability-dialog-'+id).close();switchManager(returnTab);inspectCharacter(returnCharacter);controlsKey='';save();render();if(formationQuestId)renderFormationDraft();
  }
  function renderDraftControls(c){
    if(abilityEdit?.id!==c.id)return;
    const current=proposedTraining(0),difference=current.cost-current.refund;
    setText('ability-changes-'+c.id,difference>0?'確定時に '+money(difference)+' Rd消費':difference<0?'確定時に '+money(-difference)+' Rd返還':'因子の増減なし');
    for(const step of [1,10,-1,-10]){
      const button=step===1?document.querySelector('[data-hire="'+c.id+'"]'):$(step===10?'buy10-level-'+c.id:(step===-1?'sell-level-':'sell10-level-')+c.id);
      const plan=proposedTraining(step),delta=plan.valid?(plan.cost-plan.refund)-difference:0;button.disabled=blocked()||!plan.valid;
      const text=plan.valid?(delta<0?'返還 ':'')+money(Math.abs(delta))+' Rd':step>0?'購入不可':'売却不可';
      if(step===1)setText('hire-cost-'+c.id,text);else button.querySelector('small').textContent=text;
      button.setAttribute('aria-label','レベル '+(step>0?'+':'')+step+' · '+text);
      button.title='レベル '+(step>0?'+':'')+step+' · '+text;
    }
  }
  function adjustTraining(event){
    if(!abilityEdit)return false;
    const trade=event.target.closest('[data-trade]'),single=event.target.closest('[data-hire]'),button=trade||single;if(!button)return false;if(button.disabled||blocked())return true;
    const step=trade?(trade.dataset.trade==='sell'?-Number(trade.dataset.count||1):10):1;
    const plan=proposedTraining(step);if(plan.valid){state=structuredClone(plan.state);render();}return true;
  }
  function changeFocus(id,track,value){
    if(blocked()||abilityEdit?.id!==id)return;
    const allocation={...E.concentration(state,id)},total=E.concentrationPoints(state,id),other=Object.entries(allocation).reduce((n,[k,v])=>n+(k===track?0:v),0);
    if(!Number.isSafeInteger(value))return;
    allocation[track]=Math.max(focusMinimum(id,track),Math.min(total-other,value));if(E.setConcentration(state,id,allocation)){state.health[id]=structuredClone(abilityEdit.original.health[id]);E.clampHealth(state,id);abilityEdit.cache.clear();controlsKey='';render();}
  }
  function renderAbility(c,ctx,profile){
    const level=state.levels[c.id],open=$('ability-open-'+c.id),cost=E.hireCost(state,c);
    open.textContent=level?'能力・パーク':'雇用する · ◇ '+money(cost)+'Rd';open.disabled=blocked()||!level&&state.factors<cost;
    setText('ability-factors-'+c.id,(abilityEdit?.id===c.id?'確定後の所持因子 ':'所持因子 ')+money(state.factors)+'Rd');
    renderStrengthPreview(c,ctx);
    renderPressureBreakdown(c);
    const dice=spec=>fullNumber(spec.flat)+'＋'+fullNumber(spec.dice)+'D6';
    const support=E.isDeployed(ctx,c.id)?E.activeCharacters(ctx).flatMap(a=>E.perks(ctx,a).filter(p=>p.unlocked)):[];
    const act=E.activation(ctx,c),ownAction=E.ownActionBonus(ctx,c);
    const actionSpec={flat:c.actionDice.flat+act.action+ownAction+support.reduce((n,p)=>n+(p.partyAction||0),0),dice:c.actionDice.dice+act.dice+support.reduce((n,p)=>n+(p.partyActionDice||0),0)};
    const allocation=E.concentration(state,c.id),total=E.concentrationPoints(state,c.id),used=Object.values(allocation).reduce((n,v)=>n+v,0);
    const cpMultipliers=Object.fromEntries(D.concentration.map(t=>[t.id,E.T.focusMultiplier(allocation[t.id],total,t.id)]));
    const values=Object.fromEntries(D.concentration.map(t=>[t.id,t.id==='action'?E.actionPower(ctx,c,c.action,true):window.YggAbilityView.strengthLevel(E.strengthValue(state,c,t.id),D.strength)]));
    if(c.magicPower){const m=E.magicState(ctx,c);setText('magic-summary-'+c.id,'魔力 Lv.'+m.current+' / '+m.maximum+' · 攻撃力・命中力 ＋'+(m.current*c.magicPower)+(m.current<m.maximum?' · あと'+(m.maximum-m.current)+'手番詠唱、その次に攻撃':' · 次の行動で攻撃'));}
    setText('ability-maxhp-'+c.id,'最大HP '+fullNumber(E.maxHP(state,c)));
    const base={power:c.hiddenAttack?'？？？':dice({dice:profile.dice,flat:profile.flat+profile.bonus}),action:dice(actionSpec),vitality:fullNumber(c.maxHP),armor:fullNumber(E.armor(ctx,c))+' / '+fullNumber(E.armor(ctx,c,true)),accuracy:dice(E.accuracySpec(ctx,c,false)),evasion:dice(E.evasionSpec(ctx,c))};
    setText('ability-base-ss-'+c.id,dice(c.ss));setText('character-level-'+c.id,'Lv.'+fullNumber(level));
    setText('focus-remaining-'+c.id,'残り '+fullNumber(total-used)+' / '+fullNumber(total)+' CP');
    for(const t of D.concentration){
      setText('ability-base-'+t.id+'-'+c.id,base[t.id]);setText('ability-value-'+t.id+'-'+c.id,t.id==='action'?fullNumber(values[t.id]):incomeNumber(values[t.id]));
      const input=$('focus-'+t.id+'-'+c.id);if(document.activeElement!==input)input.value=allocation[t.id];input.min=focusMinimum(c.id,t.id);input.max=total-used+allocation[t.id];input.disabled=blocked()||!level;
      setText('focus-bonus-'+t.id+'-'+c.id,'配分 ×'+incomeNumber(cpMultipliers[t.id]));
      if(t.id!=='action')$('ability-value-'+t.id+'-'+c.id).title='内部強度をCP未配分の味方Lv相当へ換算（小数3桁まで）';
      for(const step of [-1,1]){const button=document.querySelector('[data-focus="'+c.id+'"][data-focus-stat="'+t.id+'"][data-step="'+step+'"]');button.disabled=blocked()||!level||(step<0?allocation[t.id]<=focusMinimum(c.id,t.id):used>=total);}
    }
    const reset=$('focus-reset-'+c.id),paid=abilityEdit?.id===c.id&&abilityEdit.focusReset,committed=abilityEdit?.id===c.id&&Object.values(E.concentration(abilityEdit.original,c.id)).some(n=>n>0),fee=E.concentrationResetCost(state,c.id);
    reset.textContent=paid?'配分をクリア（振り直し代は計上済み）':committed?'振り直す · '+money(fee)+' Rd':'配分をクリア';
    reset.disabled=blocked()||!level||!used||committed&&!paid&&state.factors<fee;
    setText('hire-cost-'+c.id,Number.isFinite(cost)?money(cost)+' Rd':'購入不可');
  }
  function tradeControls(kind,id,ten=true,sellTen=false) {
    return `<div class="trade-controls" id="trade-controls-${kind}-${id}">${ten?`<button type="button" class="trade-button" id="buy10-${kind}-${id}" data-trade="buy" data-kind="${kind}" data-id="${id}"><span>10回購入</span><small></small></button>`:''}<button type="button" class="trade-button sell-button" id="sell-${kind}-${id}" data-trade="sell" data-kind="${kind}" data-id="${id}"><span>1Lv売却</span><small></small></button>${sellTen?`<button type="button" class="trade-button sell-button" id="sell10-${kind}-${id}" data-trade="sell" data-count="10" data-kind="${kind}" data-id="${id}"><span>−10</span><small></small></button>`:''}</div>`;
  }
  function renderTrades(kind,id,ten=true,hide=false) {
    $('trade-controls-'+kind+'-'+id).hidden=hide;
    if(ten){const b=$('buy10-'+kind+'-'+id),q=E.purchaseQuote(state,kind,id,10);b.disabled=blocked()||!q.valid||state.factors<q.cost;b.querySelector('small').textContent=q.valid?money(q.cost)+' Rd':'購入不可';b.title=q.valid?'10回購入 · '+money(q.cost)+'Rd':'購入不可';b.setAttribute('aria-label',b.title);}
    const b=$('sell-'+kind+'-'+id),q=E.saleQuote(state,kind,id);b.disabled=blocked()||!q.valid;b.querySelector('small').textContent=q.valid?'返還 '+money(q.refund)+' Rd':'売却不可';b.title=q.valid?'1Lv売却 · '+money(q.refund)+'Rd返還':'売却不可';b.setAttribute('aria-label',b.title);
  }
  function handleTrade(event) {
    const button=event.target.closest('[data-trade]');if(!button?.dataset.trade)return false;
    if(button.disabled||blocked())return true;sync();
    const {kind,id,trade}=button.dataset;
    const count=trade==='sell'?Number(button.dataset.count||1):10;
    const ok=trade==='sell'?E.sell(state,kind,id,count):E.buyMany(state,kind,id,10);
    if(ok){resetCombatVisuals();const c=D.characters.find(c=>c.id===id),u=D.upgrades.find(u=>u.id===id),q=D.sessions.find(q=>q.id===id);
      log(`${c?.name||u?.name||q?.name}：${trade==='sell'?count+'段階売却しました。':'10段階購入しました。'}`);save();render();}
    return true;
  }
  function manualReady(){if(state.viewingMemories)return false;const selected=E.selectedCharacter(state);return selected?E.canAct(state,selected.id)&&!E.isStunned(state,selected.id)&&E.hasReachableTarget(state,selected):true;}
  function renderHealth(){
    const contexts=new Map(),thresholds=new Map();
    for(const c of D.characters){
      const h=E.healthOf(state,c.id),runaway=E.runawayOf(state,c.id),hpDown=h.status!=='active',collapsed=runaway.runawayCollapsed,down=hpDown||collapsed;
      const actor=$(c.id+'-combatant'),status=collapsed?'暴走ダウン':h.status==='dying'?'瀕死':hpDown?'気絶':'戦闘可能';
      const hired=state.levels[c.id]>0,maxHP=E.maxHP(state,c);
      const owner=E.formationOwner(state,c.id);
      if(!contexts.has(owner))contexts.set(owner,owner?E.battleContext(state,owner):state);
      const ctx=contexts.get(owner),ev=E.evasionSpec(ctx,c),ss=E.evasionSpec(ctx,c,true);
      if(!thresholds.has(owner))thresholds.set(owner,E.actionThreshold(ctx));
      const threshold=thresholds.get(owner);
      setText('picker-hp-'+c.id,hired?'HP '+fullNumber(h.hp)+' / '+fullNumber(maxHP):'未雇用');
      setText('picker-runaway-'+c.id,hired?'暴走 '+fullNumber(runaway.runawayRate)+'%'+(runaway.runawayCollapsed?'・暴走ダウン':''):'');
      actor.classList.toggle('downed',down);actor.classList.toggle('stunned',E.isStunned(state,c.id));actor.classList.toggle('charging',!down&&!E.isStunned(state,c.id)&&E.magicState(ctx,c).current>0);
      if(c.id==='megumin'){
        const magic=actor.classList.contains('spell-casting')?meguminCastMagic:down||E.isStunned(state,c.id)?0:E.magicState(ctx,c).current;
        for(const [i,ring] of Array.from($('megumin-charge-axis').children).entries())ring.hidden=i>=magic;
      }
      const selector=$(c.id+'-select');
      selector.setAttribute('aria-label',c.name+(collapsed?'：暴走ダウン中':hpDown?'の復活バーストを選択':'を手動攻撃に選択'));
      selector.title=collapsed?'暴走率100%未満で復帰。仲間タブの暴走抑制や因子安定化で鎮静できます。':hpDown?'クリックして復活バーストを選択':'クリックして手動攻撃の担当にする';
      if(down)actor.classList.remove('attacking','bursting','spell-casting');
      const quote=E.suppressionQuote(state,c.id),suppress=$('suppress-'+c.id);
      suppress.hidden=!hired;suppress.disabled=blocked()||!!abilityEdit||!quote.valid||state.factors<quote.cost;
      setText('suppress-cost-'+c.id,money(quote.cost)+' Rd');suppress.setAttribute('aria-label',c.name+'の暴走率を10抑制 · '+money(quote.cost)+'Rd');
      battleHUD.render(c.id,{row:E.formationRow(state,c.id),waiting:!down&&!E.hasReachableTarget(ctx,c),hp:h.hp,maxHP,actionPoints:state.actionPoints[c.id]||0,actionThreshold:threshold,runawayRate:runaway.runawayRate,status:[down?status:E.isStunned(state,c.id)?'スタン '+h.stunTurns+'R':'',runaway.runawaySymptom?symptomName(runaway.runawaySymptom):''].filter(Boolean).join(' · '),deployed:E.isDeployed(state,c.id),magic:c.magicPower?E.magicState(ctx,c):null});
      $('vitals-'+c.id).hidden=!state.levels[c.id];
      setText('health-'+c.id,'HP '+fullNumber(h.hp)+' / '+fullNumber(maxHP)+' · 防御 '+E.armor(ctx,c)+' / 抵抗 '+E.armor(ctx,c,true)+' · AP '+fullNumber(state.actionPoints[c.id]||0)+' / '+fullNumber(threshold)+' · 命中 '+E.accuracySpec(ctx,c,false).flat+'＋'+E.accuracySpec(ctx,c,false).dice+'D6 '+' · 回避 '+ev.flat+'＋'+ev.dice+'D6 · SS '+ss.flat+'＋'+ss.dice+'D6'+(down?' · '+status+(collapsed?'（暴走率100%未満で復帰）':'（全回復で復帰）'):E.isStunned(state,c.id)?' · スタン '+h.stunTurns+'R':'')+(c.magicPower?' · 魔力 Lv.'+E.magicState(ctx,c).current+' / '+E.magicState(ctx,c).maximum:'')+(c.id==='jewel'?' · 所持因子 '+money(state.factors)+'Rd'+(ctx.rainbowTurns?' · 虹の装甲 '+ctx.rainbowTurns+'R':''):''));
      const revive=$('revive-'+c.id);revive.hidden=!hpDown;
      if(hpDown){const cost=E.revivalCost(state,c.id);revive.disabled=blocked()||!Number.isFinite(cost)||state.factors<cost;setText('revive-'+c.id,'復活バースト · '+(Number.isFinite(cost)?money(cost)+'Rd':'計算範囲外'));}
      $('inspect-'+c.id).classList.toggle('downed',down);
    }
    const all=E.suppressionQuote(state);$('suppress-all').disabled=blocked()||!!abilityEdit||!all.valid||state.factors<all.cost;
    setText('suppress-all-cost',money(all.cost)+' Rd');setText('suppression-party',E.getSession(state).enemy+'の部隊');
    const enemies=E.ensureEnemies(state);
    for(const id of shownPoison.keys())if(!enemies.some(e=>e.id===id))shownPoison.delete(id);
    for(let i=0;i<3;i++){
      const node=$(i?'enemy-next-'+i:'enemy-art'),e=enemies[i],bar=node.querySelector('.enemy-health');
      const max=e?E.enemyMaxHP(state,e):1;
      node.classList.toggle('enemy-absent',!!e?.respawnSeconds&&!pendingEnemyDefeats.has(e.id));
      if(e?.kind==='kogumo')node.hidden=(e.hp<=0&&!pendingEnemyDefeats.has(e.id))||pendingCloudBirths.has(e.id);
      node.classList.toggle('focused-enemy',!!e&&state.focusedEnemyId===e.id);
      const button=node.querySelector('.enemy-target');
      if(button){button.disabled=!e||e.hp<=0||!!e.respawnSeconds||blocked();button.setAttribute('aria-pressed',String(!!e&&state.focusedEnemyId===e.id));}
      if(e&&!playback.pending)shownPoison.set(e.id,e.poisonDamage);
      if(bar){bar.hidden=!e;if(e){const text=e.respawnSeconds?'再出現 '+e.respawnSeconds.toFixed(1)+'秒':'HP '+fullNumber(e.hp)+' / '+fullNumber(max)+' · AP '+fullNumber(e.actionPoints||0);if(bar.textContent!==text)bar.textContent=text;bar.style.setProperty('--hp-ratio',e.hp/max*100+'%');}}
      const conditions=node.querySelector('.enemy-status');
      if(conditions){
        const labels=!e||e.hp<=0||e.respawnSeconds?[]:[
          (shownPoison.get(e.id)??e.poisonDamage)?'猛毒':'',
          e.defensePenalty?'防御−'+e.defensePenalty:'',e.accuracyPenalty?'次の命中−'+e.accuracyPenalty:'',
          e.evasionPenalty?'回避−6 '+e.evasionPenaltyTurns+'R':'',e.evasionFailure?'次の回避失敗':'',
          e.tauntId?'挑発 ミツル':'',e.slowSeconds?'行動−'+e.actionPenalty+' '+e.slowSeconds.toFixed(1)+'秒':''
        ].filter(Boolean);
        const text=labels.join(' · ');conditions.hidden=!text;if(conditions.textContent!==text)conditions.textContent=text;
      }
      const emptyAbsorb=e?.pendingAttack?.kind==='absorb'&&!enemies.some(x=>x.kind==='kogumo'&&x.hp>0);
      if(emptyAbsorb)stopEnemyAttack(e.id);
      if(e?.pendingAttack&&!emptyAbsorb&&!state.paused&&!enemyAttackVisuals.has(e.id))startEnemyAttack({enemyId:e.id,targetSlot:i,targetId:e.pendingAttack.targetId,duration:E.enemyAttackDuration(state,e),remaining:e.pendingAttack.remaining,kind:e.pendingAttack.kind});
    }
    for(const id of enemyAttackVisuals.keys())if(!enemies.some(e=>e.id===id&&e.pendingAttack))stopEnemyAttack(id);
    const focused=enemies.find(e=>e.id===state.focusedEnemyId);
    $('focus-controls').hidden=E.livingEnemies(state).length<2;
    setText('focus-status',focused?'集中狙い：'+(enemyAppearances.get(focused.id)?.name||E.getSession(state).enemy):'攻撃対象：ランダム');
    $('clear-focus').hidden=!focused;
    if($('revive-dialog').open)renderRevivalDialog();
  }
  function stopEnemyAttack(id){
    const visual=enemyAttackVisuals.get(id);if(!visual)return;
    if(visual.node.classList.contains('enemy-absorbing'))$('arena').classList.remove('clouds-sucking');
    visual.node.classList.remove('enemy-attacking','enemy-absorbing');visual.soul?.remove();enemyAttackVisuals.delete(id);
  }
  function startEnemyAttack(e){
    if(document.hidden||reducedMotion.matches||state.paused)return;
    if(e.kind==='absorb'&&!E.livingEnemies(state).some(x=>x.kind==='kogumo'))return;
    const node=$(e.targetSlot?'enemy-next-'+e.targetSlot:'enemy-art');
    if(node.dataset.enemyId!==String(e.enemyId))return;
    stopEnemyAttack(e.enemyId);
    const elapsed=e.duration-(e.remaining??e.duration);
    node.style.setProperty('--enemy-attack-duration',e.duration+'s');node.style.setProperty('--enemy-attack-delay',-elapsed+'s');
    node.classList.toggle('enemy-absorbing',e.kind==='absorb');
    node.classList.add('enemy-attacking');restartAnimation(node.firstElementChild,'enemy-attack-frames');
    let soul=null;
    if(state.sessionId==='dementor'&&E.isDeployed(state,e.targetId)){
      const actor=$(e.targetId+'-combatant'),c=D.characters.find(c=>c.id===e.targetId),target=readCombatGeometry().enemySlots[e.targetSlot];
      soul=document.createElement('span');soul.className='soul-drain';soul.setAttribute('aria-hidden','true');
      soul.style.left=actor.offsetLeft+'px';soul.style.top=(actor.offsetTop-20)+'px';
      soul.style.setProperty('--soul-x',target.x-actor.offsetLeft+'px');soul.style.setProperty('--soul-y',target.y-node.offsetHeight*.23-actor.offsetTop+20+'px');
      soul.style.setProperty('--soul-duration',e.duration+'s');soul.style.animationDelay=-elapsed+'s';
      const spirit=document.createElement('span');spirit.className='soul-portrait pixel-art';
      spirit.style.backgroundImage='url("'+c.portrait+'")';if(c.portraitSheet)spirit.style.backgroundSize='800% 100%';soul.append(spirit);
      $('enemy-effects').append(soul);
    }
    if(state.sessionId==='ozmorn'&&e.kind==='absorb'){
      $('arena').classList.add('clouds-sucking');
      soul=document.createElement('span');soul.className='cloud-suction';
      const g=readCombatGeometry(),boss=g.enemySlots[0];
      for(const [slot,cloud]of E.ensureEnemies(state).entries())if(cloud.kind==='kogumo'&&cloud.hp>0){
        const mote=document.createElement('span'),p=g.enemySlots[slot];mote.className='cloud-suction-mote pixel-art';
        const source=$('enemy-next-'+slot),w=source.offsetWidth,h=source.offsetHeight;
        mote.style.width=w+'px';mote.style.height=h+'px';mote.style.margin=(-h/2)+'px 0 0 '+(-w/2)+'px';
        mote.style.left=p.x+'px';mote.style.top=p.y+'px';mote.style.setProperty('--suck-x',boss.x-p.x-45+'px');mote.style.setProperty('--suck-y',boss.y-p.y+'px');
        mote.style.animationDuration=e.duration+'s';mote.style.animationDelay=-elapsed+'s';soul.append(mote);
      }
      $('enemy-effects').append(soul);
    }
    enemyAttackVisuals.set(e.enemyId,{node,soul});
  }
  function showEnemyAttack(e){
    stopEnemyAttack(e.enemyId);
    if(!E.isDeployed(state,e.targetId)||document.hidden)return;
    const actor=$(e.targetId+'-combatant'),text=document.createElement('span');text.className='damage-float ally-damage';text.textContent=e.hit?(e.apDamage?'AP −'+e.damage:e.fightingSpirit?'闘志 · HP1':(e.badLuck?'悪運 ':'')+'−'+e.damage):e.nullified?'無効':'回避';
    if(e.hit){const bonuses=[e.doubleHit?'倍差命中':'',e.smashCritical?'スマッシュクリティカル'+(e.smashCritical>1?' ×'+e.smashCritical:''):''].filter(Boolean);if(bonuses.length){const detail=document.createElement('small');detail.textContent=bonuses.join(' / ');text.append(detail);}}
    text.style.left=actor.offsetLeft+'px';text.style.top=actor.offsetTop+'px';
    if(state.options.showDamageNumbers){while($('damage-floats').children.length>=FX.MAX_STEPS)$('damage-floats').firstElementChild.remove();$('damage-floats').append(text);deferVisual(()=>text.remove(),850);}
    if(e.hit&&!e.source&&!reducedMotion.matches&&state.sessionId==='ozmorn')cloudImpact(actor,e.apDamage);
    if(e.hit&&!reducedMotion.matches){actor.classList.add('ally-hit');deferVisual(()=>actor.classList.remove('ally-hit'),180);}
    if(e.source){setText('last-roll',D.characters.find(c=>c.id===e.targetId).name+'：'+(e.source==='misfire'?'暴発':'暴走')+' '+e.damage+'ダメージ');return;}
    setText('last-roll',(e.enemyName||E.getSession(state).enemy)+' → '+D.characters.find(c=>c.id===e.targetId).name+(e.mental?' / 精神攻撃 SS ':' / 命中 ')+e.accuracy.total+(e.accuracyReroll?'（逆転）':'')+' 対 '+(e.mental?'SS回避 ':'回避 ')+e.evasion.total+(e.evasionReroll?'（リテイク）':'')+'：'+(e.hit?(e.apDamage?'AP −'+e.damage:e.damage+' ダメージ'):e.nullified?'無効':'回避'));
  }
  function cloudImpact(actor,flash){
    const effect=document.createElement('span');effect.className=flash?'kogumo-flash':'ozmorn-lightning';effect.setAttribute('aria-hidden','true');
    effect.style.left=actor.offsetLeft+'px';effect.style.top=actor.offsetTop+'px';$('enemy-effects').append(effect);deferVisual(()=>effect.remove(),450);
  }
  function showCloudCreation(e){
    pendingCloudBirths.delete(e.enemyId);
    renderEnemy(E.getSession(state));
    if(!e.created||reducedMotion.matches||document.hidden)return;
    const node=$('enemy-next-'+e.targetSlot);
    if(node.dataset.enemyId!==String(e.enemyId)||node.hidden)return;
    const g=readCombatGeometry(),boss=g.enemySlots[0],p=g.enemySlots[e.targetSlot];
    node.style.setProperty('--birth-x',boss.x-p.x+'px');node.style.setProperty('--birth-y',boss.y-p.y+'px');
    node.classList.add('cloud-emerging');deferVisual(()=>node.classList.remove('cloud-emerging'),360);
  }
  function showCloudAbsorb(e){
    stopEnemyAttack(e.enemyId);renderEnemy(E.getSession(state));
    if(!document.hidden&&state.options.showDamageNumbers){const text=document.createElement('span'),g=readCombatGeometry().enemySlots[0];
      text.className='damage-float cloud-heal';text.textContent='吸収 ＋'+fullNumber(e.amount);text.style.left=g.x+'px';text.style.top=(g.y-60)+'px';$('damage-floats').append(text);deferVisual(()=>text.remove(),950);}
    log('オズモーンがコグモを吸収。HP ＋'+fullNumber(e.amount));
  }
  function renderRevivalDialog(){
    if(!revivalTarget)return;
    const c=D.characters.find(c=>c.id===revivalTarget),h=E.healthOf(state,c.id),cost=E.revivalCost(state,c.id);
    setText('revive-title',c.name+'の復活バースト');
    setText('revive-description','HP '+fullNumber(h.hp)+' / '+fullNumber(E.maxHP(state,c))+' → '+fullNumber(E.maxHP(state,c))+' / '+fullNumber(E.maxHP(state,c))+(E.runawayOf(state,c.id).runawayCollapsed?'。HPを全回復します。暴走ダウンは暴走率100%未満で復帰します。':'。全回復して戦闘へ復帰します。'));
    setText('revive-cost','必要因子 '+(Number.isFinite(cost)?money(cost)+'Rd':'計算範囲外')+' ／ 所持 '+money(state.factors)+'Rd');
    $('confirm-revive').disabled=blocked()||h.status==='active'||!Number.isFinite(cost)||state.factors<cost;
    setText('revive-hint',h.status==='active'?'すでに復帰しています。':state.factors<cost?'因子が不足しています。自然回復でもHP満タンになると復帰します。':'雇用費＋現在の育成投資額の1%。');
  }
  function openRevivalDialog(id){revivalTarget=id;renderRevivalDialog();$('revive-dialog').showModal();}
  function renderBattleHUD() {
    renderHealth();
    const session = E.getSession(state), hp = E.isWaiting(state)?0:state.hp,focused=E.ensureEnemies(state).find(e=>e.id===state.focusedEnemyId)||E.ensureEnemies(state).find(e=>e.hp>0),displayMax=E.enemyMaxHP(state,focused);
    const waiting=E.isWaiting(state);
    $('arena').classList.toggle('is-respawning',waiting);
    $('respawn-notice').hidden=!waiting;
    if(waiting)setText('respawn-notice','再出現まで '+state.respawnSeconds.toFixed(1)+' 秒');
    $('attack').disabled=blocked()||state.paused||waiting||!manualReady();
    questView.renderLive(state);
    const factors = money(state.factors);
    for (const id of ['factors', 'factors-pinned', 'factors-save', 'factors-help','factors-formation']) setText(id, factors);
    setText('kills', fullNumber(state.kills));
    setText('hp-text', `${format(Math.ceil(hp))} / ${format(displayMax)}`);
    const width = `${hp / displayMax * 100}%`;
    if ($('hp-fill').style.width !== width) $('hp-fill').style.width = width;
    for (const [name, value] of [['aria-valuemax', displayMax], ['aria-valuenow', hp]]) {
      if ($('hp-progress').getAttribute(name) !== String(value)) $('hp-progress').setAttribute(name, value);
    }
  }
  function requestBattleRender() {
    if (battleRender !== null || document.hidden) return;
    battleRender = requestAnimationFrame(() => { battleRender = null; renderBattleHUD(); });
  }
  function render() {
    E.refreshQuestUnlocks(state);E.refreshPerkUnlocks(state);
    renderBattleHUD();
    sceneView.render(state,E.getSession(state));
    // Action-clock fractions and visual HP do not change cards, formulas or prices.
    const key = JSON.stringify([state.factors, state.sessionId, state.viewingMemories, state.memoriesUnlocked, state.selectedCharacterId,
      state.formations,state.formationRows,state.rainbowTurns,state.focusedEnemyId,state.enemies?.map(e=>[e.id,e.evasionPenaltyTurns]),D.characters.map(c=>E.healthOf(state,c.id).status),Math.ceil(state.respawnSeconds||0),state.levels, state.upgrades, state.purchasedPerks,state.perkEnabled,D.characters.map(c=>[Math.floor(E.runawayOf(state,c.id).runawayRate),E.runawayOf(state,c.id).runawaySymptom,E.runawayOf(state,c.id).runawayCollapsed,E.runawayOf(state,c.id).baseRunawayPressure,E.runawayOf(state,c.id).temporaryRunawayPressure,E.runawayOf(state,c.id).criticalReserve]), state.questLevels,state.questUnlocks,state.concentration,
      state.questActiveLevels, state.paused, state.options, blocked()]);
    if (key === controlsKey) return;
    controlsKey = key;
    const session = E.getSession(state);
    $('dps').textContent = rateFormat(E.totalDps(state));
    const income = E.totalIncome(state);
    renderFactorRain(income.factorsPerSecond);
    setText('income-rate', incomeNumber(income.factorsPerSecond));
    setText('income-context', `${income.sessions.length}セッション合計 / ${state.paused ? '再開時の見込み' : '同時進行'}`);
    setText('income-formula',income.sessions.map(q=>q.name+'：約'+incomeNumber(q.factorsPerSecond)+'Rd/秒（'+money(q.reward)+'Rd/周）').join(' ＋ ')+' ＝ 約'+incomeNumber(income.factorsPerSecond)+'Rd/秒。単体エネミーは再出現待ち5秒を含む平均値。');
    setText('income-condition','全員回復後の自動戦闘を基準とした目安です。手動攻撃・復活バーストは含みません。');
    $('party-count').textContent = D.characters.filter(c=>E.formationOwner(state,c.id)).length;
    setText('party-capacity','人 / '+income.sessions.length+'セッション');
    renderEnemy(session);
    $('battle-area').textContent = session.area;
    $('session-code').textContent = state.viewingMemories?'追憶':`SESSION ${session.code} / ${session.name} / Lv.${fullNumber(session.level)}`;
    $('session-description').textContent = session.description;
    $('enemy-rules').textContent = `防御 ${E.enemyDefense(session)} / 属性：${(session.traits || []).map(t => D.enemyTraits[t] || t).join('・') || 'なし'}`;
    $('reward').textContent = `◇ ${money(E.reward(state))}Rd`;
    const selected = E.selectedCharacter(state);
    $('manual-actor').textContent = `手動攻撃：${selected ? selected.name : 'あなた'}`;
    $('select-self').hidden = !selected;
    $('select-self').disabled = blocked();
    const magic=E.magicState(state,selected),actionLabel=magic.current<magic.maximum?'詠唱する':'攻撃する';
    setText('attack-action',actionLabel);$('attack').setAttribute('aria-label', `${selected ? selected.name : 'あなた'}で${actionLabel}`);
    const manualProfile = E.attackProfile(state, selected, true);
    $('click-formula').textContent = attackFormula(manualProfile);
    renderLevelNote('click-level-note',manualProfile);
    renderFormula('manual', manualProfile);
    $('loop-status').textContent = blocked() ? '● 待機中' : state.paused ? 'Ⅱ 全体一時停止' : E.isWaiting(state)?'● 再出現待ち' : '● 自動周回';
    $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', state.paused ? '全セッションの周回を再開' : '全セッションの周回を一時停止');
    $('pause').disabled = blocked();
    $('attack').disabled = blocked() || state.paused || E.isWaiting(state) || !manualReady();
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
      setText('picker-name-'+c.id,obscured?'？？？':c.shortName|| (c.id==='meta'?'メタ':c.id==='richter'?'ゲルハムト':c.id==='vishunal'?'ビシュナル':c.id==='tordeliese'?'トルデリーゼ':c.name));
      $('inspect-'+c.id).classList.toggle('obscured',obscured);
      $('inspect-'+c.id).setAttribute('aria-label',obscured?`未公開の仲間・${money(cost)}Rdの詳細`:`${c.name}の詳細`);
      const selectButton = document.querySelector(`[data-select-character="${c.id}"]`);
      selectButton.disabled = blocked() || !E.isDeployed(state,c.id);
      selectButton.setAttribute('aria-pressed', state.selectedCharacterId === c.id);
      selectButton.setAttribute('aria-label',obscured?'未公開の仲間':c.name+(E.healthOf(state,c.id).status!=='active'?'の復活バーストを選択':'を手動攻撃に選択'));
      selectButton.title=obscured?'因子を貯めると公開':!level?'雇用すると編成可能':E.isDeployed(state,c.id)?'手動攻撃・支援の対象に指定':'このクエストでは控えです。部隊に編成すると指定できます。';
      // Unowned cards stay compact until hired, so changing affordability
      // never collapses or expands the surrounding character panel.
      for(const selector of ['.current-attack','.action-button']) {
        const node=card.querySelector(selector);if(node){node.inert=obscured;node.setAttribute('aria-hidden',String(obscured));}
      }
      const assignedQuest=E.formationOwner(state,c.id),characterState=assignedQuest?E.battleContext(state,assignedQuest):state;
      const characterSession=E.getSession(characterState),profile=E.attackProfile(characterState,c);
      $('stats-' + c.id).textContent = attackFormula(profile);
      renderLevelNote('stats-note-'+c.id,profile);
      renderAbility(c,characterState,profile);
      $('hire-label-' + c.id).textContent='+1';
      const button=document.querySelector('[data-hire="'+c.id+'"]');button.disabled=blocked()||!Number.isFinite(cost)||state.factors<cost;
      button.setAttribute('aria-label',c.name+'のレベルを上げる · '+money(cost)+' Rd');
      renderTrades('level',c.id,true,!level);renderDraftControls(c);
      if (c.perks) {
        const perks=E.perks(characterState,c);
        $('perk-summary-'+c.id).textContent=perks.filter(p=>p.enabled&&p.owned).length+' ON / '+perks.filter(p=>p.owned).length+' 解放';
        for(const p of perks){
          const row=$('perk-'+c.id+'-'+p.id),button=row.querySelector('[data-perk]');row.classList.toggle('unlocked',p.unlocked);
          row.querySelector('.perk-status').textContent=p.unlocked?'有効':p.awakeningLevel?'覚醒待機中':p.enabled&&p.owned?'ON・休止中':p.owned?'OFF':'未解放';
          button.hidden=false;button.disabled=blocked()||!p.owned||!!p.awakeningLevel;button.textContent=p.awakeningLevel?(p.unlocked?'覚醒中':'覚醒Lv.'+p.awakeningLevel+'で発動'):p.owned?(p.enabled?'ON':'OFF'):'Lv.'+p.level+'で解放';
          button.setAttribute('aria-pressed',String(p.awakeningLevel?p.unlocked:p.enabled&&p.owned));button.setAttribute('aria-label',c.name+'の'+p.name+(p.awakeningLevel?'：覚醒Lv.'+p.awakeningLevel+'で自動発動':'を'+(p.enabled?'OFF':'ON')));
        }
      }
    }
    questView.render(state);
    for (const u of D.upgrades) {
      const maxed = u.max != null && state.upgrades[u.id] >= u.max, cost=E.upgradeCost(state,u);
      $('upgrade-level-' + u.id).textContent = u.max === 1 ? (maxed ? '解放済' : '未解放') : `Lv.${state.upgrades[u.id]}`;
      renderTrades('upgrade',u.id,u.max!==1);
      $('upgrade-cost-' + u.id).textContent = maxed ? (u.max === 1 ? '解放済' : 'MAX') : Number.isFinite(cost)?`購入 · ◇ ${money(cost)}Rd`:'計算範囲外';
      document.querySelector(`[data-upgrade="${u.id}"]`).disabled = blocked() || maxed || !Number.isFinite(cost) || !Number.isSafeInteger(state.upgrades[u.id]+1) || state.factors < cost;
    }
    $('reward-bonus').textContent = `＋${rateFormat(state.upgrades.reward * D.balance.rewardPerLevel * 100)}%`;
    renderMeta();
    const richter = D.characters.find(c => c.id === 'richter'), hired = E.isDeployed(state,'richter');
    if ($('arena').classList.contains('has-richter') !== hired) combatGeometry = null;
    $('arena').classList.toggle('has-richter', hired);
    $('richter-combatant').hidden = !hired;
    $('richter-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('richter-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'richter');
    $('richter-select').disabled = blocked() || !hired;
    $('richter-select').setAttribute('aria-pressed', state.selectedCharacterId === 'richter');
    renderRichterOrbits();
    renderVishunal();
    renderTordeliese();renderMax();renderWaku();renderJewel();renderMitsuru();renderQueen();renderMegumin();
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
    sprite.style.setProperty('--enemy-attack-image',appearance.attackSheet?'url("'+appearance.attackSheet+'")':'none');
    sprite.style.setProperty('--enemy-absorb-image',appearance.absorbSheet?'url("'+appearance.absorbSheet+'")':'none');
    sprite.style.setProperty('--foot-shift',((211-(appearance.footY??211))/224*100)+'%');
  }
  function renderEnemy(session) {
    sceneView.render(state,session);$('enemy-name').hidden=!!session.variants;
    const enemies=E.ensureEnemies(state),variants=session.variants||[],formation=session.summons?session.traits.includes('swarm'):enemies.length>1;
    if(enemyVariantSession!==session.id){enemyVariantSession=session.id;enemyAppearances.clear();}
    const used=new Set(enemies.map(e=>enemyAppearances.get(e.id)?.variant).filter(v=>v!=null));
    for(const [i,e]of enemies.entries()){
      if(!enemyAppearances.has(e.id)){
        const choices=variants.map((_,i)=>i).filter(i=>!used.has(i)),index=choices.length?choices[Math.floor(Math.random()*choices.length)]:0;
        const appearance=e.kind==='kogumo'?session.summon:variants[index]||{...session,name:session.enemy};enemyAppearances.set(e.id,{...appearance,variant:index});used.add(index);
      }
      const node=$(i?'enemy-next-'+i:'enemy-art');node.hidden=e.kind==='kogumo'&&((e.hp<=0&&!pendingEnemyDefeats.has(e.id))||pendingCloudBirths.has(e.id));node.classList.toggle('cloud-boss',!!session.summons&&!i);node.classList.toggle('cloud-minion',e.kind==='kogumo');if(node.dataset.enemyId!==String(e.id)){for(const [id,v]of enemyAttackVisuals)if(v.node===node)stopEnemyAttack(id);}node.dataset.enemyId=String(e.id);
      setEnemyAppearance(node,enemyAppearances.get(e.id),'');
      node.setAttribute('role','group');
      let button=node.querySelector('.enemy-target');
      if(!button){button=document.createElement('button');button.type='button';button.className='enemy-target';node.append(button);
        button.addEventListener('click',()=>{if(blocked())return;sync();const current=E.ensureEnemies(state)[i];if(current&&E.selectEnemy(state,state.focusedEnemyId===current.id?null:current.id)){save();render();}});}
      button.hidden=!formation||e.hp<=0;button.setAttribute('aria-label',enemyAppearances.get(e.id).name+'（'+(i+1)+'体目）を集中狙い');
      if(!node.querySelector('.enemy-status')){const label=document.createElement('span');label.className='enemy-status';label.hidden=true;node.append(label);}
      if(!node.querySelector('.enemy-health')){const bar=document.createElement('span');bar.className='enemy-health';node.append(bar);}
      if(!i)setText('enemy-name',enemyAppearances.get(e.id).name);
    }
    // Keep a small history for in-flight defeat snapshots, never an unbounded cache.
    while(enemyAppearances.size>256)enemyAppearances.delete(enemyAppearances.keys().next().value);
    for(let i=enemies.length;i<3;i++)$(i?'enemy-next-'+i:'enemy-art').hidden=true;
    $('arena').classList.toggle('cloud-battle',!!session.summons);
    $('arena').classList.toggle('mohican-line',formation);enemyMotionState();renderHealth();
  }
  function renderOrbitSpacing(width = arenaViewportWidth) {
    arenaViewportWidth = width || $('arena-viewport').clientWidth || 300;
    const options = {metaScale:E.weaponScale(state,'meta'),richterScale:E.weaponScale(state,'richter'),metaCount:state.options.showOrbits?E.sawCount(state).visible:0,richterCount:state.options.showOrbits?E.bombCount(state).visible:0,
      formationRows:state.formationRows,availableHeight:window.matchMedia('(min-width:900px) and (min-height:500px)').matches?$('arena-viewport').clientHeight:null,
      metaHired:E.isDeployed(state,'meta'),richterHired:E.isDeployed(state,'richter'),vishunalHired:E.isDeployed(state,'vishunal'),tordelieseHired:E.isDeployed(state,'tordeliese'),maxHired:E.isDeployed(state,'max'),wakuHired:E.isDeployed(state,'waku'),jewelHired:E.isDeployed(state,'jewel'),mitsuruHired:E.isDeployed(state,'mitsuru'),queenHired:E.isDeployed(state,'queen'),meguminHired:E.isDeployed(state,'megumin'),enemyCount:E.getSession(state).summons?3:UI.enemyFormationSize(E.getSession(state)),enemyScale:E.getSession(state).enemyScale||1,formationLayout:E.getSession(state).formationLayout,grounded:true,width:arenaViewportWidth,mobile:window.matchMedia('(max-width:600px)').matches};
    const key = JSON.stringify(options);
    if (key === orbitLayoutKey) return;
    orbitLayoutKey = key;
    const layout = UI.orbitLayout(options), arena = $('arena'), viewport = $('arena-viewport');
    arena.classList.toggle('grounded',options.grounded);
    arena.style.width = `${layout.width}px`; arena.style.height = `${layout.height}px`;
    arena.style.transform = `translateX(${layout.offsetX}px) scale(${layout.zoom})`;
    arena.style.setProperty('--head-ui-scale',String(Math.min(2,1/layout.zoom)));
    viewport.style.height = `${layout.viewHeight}px`;
    viewport.style.setProperty('--scene-width',`${layout.viewWidth}px`);
    viewport.style.setProperty('--rain-distance',`${layout.viewHeight+100}px`);
    arena.style.setProperty('--enemy-x', `${layout.enemyX}px`);
    arena.style.setProperty('--enemy-y', `${layout.enemyY}px`);
    UI.cloudFormation(layout.enemyX,layout.enemyY).forEach((p,i)=>{arena.style.setProperty('--cloud-'+i+'-x',p.x+'px');arena.style.setProperty('--cloud-'+i+'-y',p.y+'px');});
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
    const mit=layout.mitsuru;if(mit&&E.isDeployed(state,'mitsuru')){const a=$('mitsuru-combatant');a.style.left=mit.x+'px';a.style.top=mit.y+'px';a.style.setProperty('--body-foot',mit.footOffset+'px');}
    const que=layout.queen;if(que&&E.isDeployed(state,'queen')){const a=$('queen-combatant');a.style.left=que.x+'px';a.style.top=que.y+'px';a.style.setProperty('--body-foot',que.footOffset+'px');a.style.setProperty('--queen-size',que.spriteSize+'px');}
    const meg=layout.megumin;if(meg&&E.isDeployed(state,'megumin')){
      const a=$('megumin-combatant'),scale=meg.spriteSize/D.meguminVisual.cellHeight;
      a.style.left=meg.x+'px';a.style.top=meg.y+'px';a.style.setProperty('--body-foot',meg.footOffset+'px');
      a.style.setProperty('--megumin-size',meg.spriteSize+'px');
      a.style.setProperty('--staff-x',D.meguminVisual.staffTip.x*scale+'px');
      a.style.setProperty('--staff-y',D.meguminVisual.staffTip.y*scale+'px');
    }
    const j=layout.jewel;if(j&&E.isDeployed(state,'jewel')){const a=$('jewel-combatant');a.style.left=j.x+'px';a.style.top=j.y+'px';a.style.setProperty('--body-foot',j.footOffset+'px');}
    const w=layout.waku;if(w&&E.isDeployed(state,'waku')){const a=$('waku-combatant');a.style.left=w.x+'px';a.style.top=w.y+'px';a.style.setProperty('--body-foot',w.footOffset+'px');}
    const m=layout.max;if(m&&E.isDeployed(state,'max')){const a=$('max-combatant');a.style.left=m.x+'px';a.style.top=m.y+'px';a.style.setProperty('--body-foot',(m.footOffset+m.hoverHeight)+'px');a.style.setProperty('--down-foot',(m.footOffset+m.hoverHeight)+'px');a.style.setProperty('--max-size',m.spriteSize+'px');}
    const t=layout.tordeliese;if(t&&E.isDeployed(state,'tordeliese')){const actor=$('tordeliese-combatant');actor.style.left=t.x+'px';actor.style.top=t.y+'px';actor.style.setProperty('--body-foot',t.footOffset+'px');actor.style.setProperty('--tordeliese-size',t.spriteSize+'px');tordelieseSpriteScale=t.spriteSize/256;}
    const dog=layout.vishunal;
    if(dog && E.isDeployed(state,'vishunal')){const actor=$('vishunal-combatant');actor.style.left=dog.x+'px';actor.style.top=dog.y+'px';actor.style.setProperty('--body-foot',dog.footOffset+'px');vishunalSpriteScale=dog.spriteScale;actor.style.setProperty('--vishunal-scale',vishunalSpriteScale);}
    for(const c of D.characters){const p=layout[c.id];if(p)$(c.id+'-combatant').style.setProperty('--head-offset', ((c.id==='meta'||c.id==='richter')?112:(p.spriteSize||p.extentY||224)/2)+'px');}
    combatGeometry = null;
  }
  function renderMitsuru(){
    const hired=E.isDeployed(state,'mitsuru'),actor=$('mitsuru-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='mitsuru');
    $('mitsuru-select').disabled=blocked()||!hired;$('mitsuru-select').setAttribute('aria-pressed',state.selectedCharacterId==='mitsuru');
  }
  function animateMitsuruAttack(count=1,volley=1,slot=0,hit=true,motion='normal'){
    if(!E.canAct(state,'mitsuru')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('mitsuru-combatant'),now=performance.now(),burst=count>1||volley>1||now-lastMitsuruShot<280;
    lastMitsuruShot=now;cancelVisual(mitsuruAttackTimer);actor.classList.remove('range-motion');
    if(motion==='spark'){
      actor.classList.remove('attacking','bursting');actor.classList.add('range-motion');restartAnimation($('mitsuru-standing'),'range-six');
      mitsuruAttackTimer=deferVisual(()=>actor.classList.remove('range-motion'),800);
      const g=targetedGeometry(slot),layer=$('mitsuru-effects');
      if(layer.children.length<12){const ball=document.createElement('span');ball.className='mitsuru-ball';ball.style.left=(g.mitsuruX+72)+'px';ball.style.top=(g.mitsuruY-30)+'px';ball.style.setProperty('--travel',(g.enemyX-g.mitsuruX-72)+'px');ball.style.setProperty('--rise',(g.enemyY-g.mitsuruY+30)+'px');layer.append(ball);deferVisual(()=>ball.remove(),1000);}
      return 360;
    }
    if(burst||actor.classList.contains('bursting')){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('mitsuru-standing'),'mitsuru-strike');mitsuruAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),640);}
    const g=targetedGeometry(slot),layer=$('mitsuru-effects');
    if(hit!==false&&layer.children.length<12){const spark=document.createElement('span');spark.className='mitsuru-spark';spark.style.left=g.enemyX+'px';spark.style.top=g.enemyY+'px';layer.append(spark);deferVisual(()=>spark.remove(),650);}
    return actor.classList.contains('bursting')?640:560;
  }
  function renderMegumin(){
    const hired=E.isDeployed(state,'megumin'),actor=$('megumin-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='megumin');
    $('megumin-select').disabled=blocked()||!hired;$('megumin-select').setAttribute('aria-pressed',state.selectedCharacterId==='megumin');
  }
  function animateMeguminAttack(count=1,volley=1,slot=0,hit=true,magicLevel=0){
    if(!E.canAct(state,'megumin')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('megumin-combatant');cancelVisual(meguminAttackTimer);
    meguminCastMagic=Math.max(0,Math.min(7,Math.floor(magicLevel)));
    actor.classList.add('spell-casting','attacking');actor.classList.remove('bursting');
    for(const [i,ring]of Array.from($('megumin-charge-axis').children).entries())ring.hidden=i>=meguminCastMagic;
    restartAnimation($('megumin-standing'),'megumin-release');
    restartAnimation($('megumin-charge-axis'),'megumin-circles-release');
    meguminAttackTimer=deferVisual(()=>{actor.classList.remove('spell-casting','attacking','bursting');meguminCastMagic=0;requestBattleRender();},1400);
    return 1400;
  }
  function renderQueen(){
    const hired=E.isDeployed(state,'queen'),actor=$('queen-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='queen');
    $('queen-select').disabled=blocked()||!hired;$('queen-select').setAttribute('aria-pressed',state.selectedCharacterId==='queen');
  }
  function animateQueenAttack(count=1,volley=1,slot=0,hit=true){
    if(!E.canAct(state,'queen')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('queen-combatant'),now=performance.now(),burst=count>1||volley>1||now-lastQueenShot<280;
    lastQueenShot=now;cancelVisual(queenAttackTimer);
    if(burst||actor.classList.contains('bursting')){actor.classList.remove('attacking');actor.classList.add('bursting');queenAttackTimer=deferVisual(()=>actor.classList.remove('bursting'),800);}
    else{actor.classList.add('attacking');restartAnimation($('queen-standing'),'queen-strike');queenAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),800);}
    return actor.classList.contains('bursting')?800:560;
  }
  function renderJewel(){
    const hired=E.isDeployed(state,'jewel'),actor=$('jewel-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='jewel');actor.classList.toggle('rainbow-active',E.rainbowActive(state));
    $('jewel-select').disabled=blocked()||!hired;$('jewel-select').setAttribute('aria-pressed',state.selectedCharacterId==='jewel');
  }
  function animateJewelAttack(count=1,volley=1){
    if(!E.canAct(state,'jewel')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('jewel-combatant'),now=performance.now(),burst=count>1||volley>1||now-lastJewelShot<280;
    lastJewelShot=now;cancelVisual(jewelAttackTimer);
    if(burst||actor.classList.contains('bursting')){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('jewel-standing'),'jewel-punch');jewelAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),560);}
    return actor.classList.contains('bursting')?800:560;
  }
  function renderWaku(){
    const hired=E.isDeployed(state,'waku'),actor=$('waku-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='waku');
    $('waku-select').disabled=blocked()||!hired;$('waku-select').setAttribute('aria-pressed',state.selectedCharacterId==='waku');
  }
  function animateWakuAttack(count=1,volleyCount=1,summarized=false,targetSlot=0,motion='shoot'){
    if(!E.canAct(state,'waku')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('waku-combatant'),now=performance.now(),burst=count>1||volleyCount>1||now-lastWakuShot<280;
    lastWakuShot=now;cancelVisual(wakuAttackTimer);
    if(burst){actor.classList.remove('range-motion','attacking');actor.classList.add('bursting');wakuAttackTimer=deferVisual(()=>actor.classList.remove('bursting'),600);}
    else if(motion==='stab'){actor.classList.remove('bursting','attacking');actor.classList.add('range-motion');restartAnimation($('waku-standing'),'waku-melee');wakuAttackTimer=deferVisual(()=>actor.classList.remove('range-motion'),880);}
    else{actor.classList.remove('range-motion','bursting');actor.classList.add('attacking');restartAnimation($('waku-standing'),'waku-fire');wakuAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),560);}
    const layer=$('waku-projectiles'),g=targetedGeometry(targetSlot),melee=motion==='stab',groups=FX.projectileGroups(count,Math.floor((24-layer.children.length)/(melee?1:2)),summarized);
    groups.forEach((amount,i)=>{const delay=110+i*45,bullet=document.createElement('span');bullet.className=melee?'waku-slash':'waku-bullet';bullet.dataset.attackCount=amount;
      bullet.style.left=(melee?g.enemyX:g.wakuX+82)+'px';bullet.style.top=(melee?g.enemyY:g.wakuY-22)+'px';bullet.style.setProperty('--travel',(g.enemyX-g.wakuX-82)+'px');bullet.style.setProperty('--rise',(g.enemyY-g.wakuY+22)+'px');bullet.style.setProperty('--launch-delay',(delay+(melee?FX.PROJECTILE_FLIGHT_MS-180:0))+'ms');bullet.style.setProperty('--slash-angle',(i%2?40:-35)+'deg');
      layer.append(bullet);deferVisual(()=>bullet.remove(),delay+FX.PROJECTILE_FLIGHT_MS+20);
      if(!melee){const flash=document.createElement('span');flash.className='waku-muzzle';flash.style.left=(g.wakuX+82)+'px';flash.style.top=(g.wakuY-22)+'px';flash.style.setProperty('--launch-delay',delay+'ms');layer.append(flash);deferVisual(()=>flash.remove(),delay+120);}
    });return groups.length?110+(groups.length-1)*45:0;
  }
  function renderMax(){
    const hired=E.isDeployed(state,'max'),actor=$('max-combatant');actor.hidden=!hired;
    actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='max');
    $('max-select').disabled=blocked()||!hired;$('max-select').setAttribute('aria-pressed',state.selectedCharacterId==='max');
  }
  function animateMaxAttack(count,volleyCount=count,summarized=false,projectileCount=count,targetSlot=0) {
    if(!E.canAct(state,'max')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('max-combatant'),now=performance.now(),burst=count>1||volleyCount>1||now-lastMaxShot<280;
    lastMaxShot=now;cancelVisual(maxAttackTimer);
    if(burst){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('max-standing'),'max-throw');maxAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),1180);}
    const layer=$('max-tubs'),g=targetedGeometry(targetSlot),groups=FX.projectileGroups(projectileCount,24-layer.children.length,summarized),windup=burst?80:670;
    groups.forEach((amount,i)=>{const delay=windup+i*45,tub=document.createElement('span');tub.className='max-tub pixel-art';tub.dataset.attackCount=amount;
      tub.style.left=(g.enemyX-38+(i%3-1)*12)+'px';tub.style.top=(g.enemyY-130)+'px';tub.style.animationDelay=delay+'ms';layer.append(tub);deferVisual(()=>tub.remove(),delay+360);
    });return windup+Math.max(0,groups.length-1)*45;
  }
  function renderTordeliese() {
    const hired=E.isDeployed(state,'tordeliese'),actor=$('tordeliese-combatant');
    actor.hidden=!hired;actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='tordeliese');
    $('tordeliese-select').disabled=blocked()||!hired;$('tordeliese-select').setAttribute('aria-pressed',state.selectedCharacterId==='tordeliese');
  }
  function renderVishunal() {
    const hired=E.isDeployed(state,'vishunal'),actor=$('vishunal-combatant');
    actor.hidden=!hired;actor.classList.toggle('is-paused',state.paused||blocked());actor.classList.toggle('manual-selected',state.selectedCharacterId==='vishunal');
    $('vishunal-select').disabled=blocked()||!hired;$('vishunal-select').setAttribute('aria-pressed',state.selectedCharacterId==='vishunal');
  }
  function renderRichterOrbits() {
    const count = E.bombCount(state), orbits = $('richter-orbits');
    if (!state.options.showOrbits) count.visible = 0;
    orbits.hidden = !state.options.showOrbits;
    orbits.style.setProperty('--weapon-scale', E.weaponScale(state, 'richter'));
    orbits.title = `Lv.${format(state.levels.richter)} / 浮遊数${format(count.total)}（表示${count.visible}）`;
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
    $('meta-orbits').title = `Lv.${format(state.levels.meta)} / 浮遊数${format(count.total)}（表示${count.visible}）`;
    $('meta-combatant').classList.toggle('unhired', count.total === 0);
    $('meta-combatant').hidden = !E.isDeployed(state,'meta');
    $('meta-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('meta-select').disabled = blocked() || !E.isDeployed(state,'meta');
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
    return !blocked() && !state.paused && !E.isWaiting(state) && !document.hidden && !reducedMotion.matches &&
      E.isDeployed(state,actor) && (E.isActionDonor(state,character)?E.automaticActionRate(state,character):E.effectiveAttackRate(state,character)) >= 2;
  }
  function readCombatGeometry() {
    if(E.getSession(state).summons)combatGeometry=null;
    if (!combatGeometry) {
      const enemy = $('enemy-art'), meta = $('meta-combatant'), richter = $('richter-combatant');
      combatGeometry = {enemyX:enemy.offsetLeft, enemyY:enemy.offsetTop,
        metaX:meta.offsetLeft, metaY:meta.offsetTop, richterX:richter.offsetLeft, richterY:richter.offsetTop,
        vishunalX:E.isDeployed(state,'vishunal')?$('vishunal-combatant').offsetLeft:0,vishunalY:E.isDeployed(state,'vishunal')?$('vishunal-combatant').offsetTop:0,
        tordelieseX:E.isDeployed(state,'tordeliese')?$('tordeliese-combatant').offsetLeft:0,tordelieseY:E.isDeployed(state,'tordeliese')?$('tordeliese-combatant').offsetTop:0,
        wakuX:E.isDeployed(state,'waku')?$('waku-combatant').offsetLeft:0,wakuY:E.isDeployed(state,'waku')?$('waku-combatant').offsetTop:0,
        richterScale:$('richter-standing').offsetHeight / 224,
        enemySlots:[null,1,2].map(i=>i?{x:$('enemy-next-'+i).offsetLeft,y:$('enemy-next-'+i).offsetTop}:null)};
      combatGeometry.enemySlots[0]={x:combatGeometry.enemyX,y:combatGeometry.enemyY};
      if(E.getSession(state).summons){
        const style=$('arena').style,x=parseFloat(style.getPropertyValue('--enemy-x')),y=parseFloat(style.getPropertyValue('--enemy-y'));
        combatGeometry.enemySlots=UI.cloudFormation(x,y);
        combatGeometry.enemyX=combatGeometry.enemySlots[0].x;combatGeometry.enemyY=combatGeometry.enemySlots[0].y;
      }
    }
    return combatGeometry;
  }
  function targetedGeometry(slot=0){const g=readCombatGeometry(),p=g.enemySlots[slot]||g.enemySlots[0];return {...g,enemyX:p.x,enemyY:p.y};}
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
  function animateMetaAttack(count, volleyCount = count, summarized = false, targetSlot=0) {
    if (!E.canAct(state,'meta') || reducedMotion.matches || document.hidden) return;
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
    const geometry = targetedGeometry(targetSlot);
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
  function animateRichterAttack(count, volleyCount = count, summarized = false, targetSlot=0) {
    if (!E.canAct(state,'richter') || reducedMotion.matches || document.hidden) return;
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
    const geometry = targetedGeometry(targetSlot);
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
  function animateVishunalAttack(count,volleyCount=count,summarized=false,targetSlot=0) {
    if(!E.canAct(state,'vishunal')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('vishunal-combatant'),layer=$('vishunal-projectiles'),now=performance.now();
    const burst=volleyCount>1||now-lastVishunalShot<280;lastVishunalShot=now;
    if(burst||actor.classList.contains('bursting')){if(!actor.classList.contains('bursting'))vishunalMotionStarted=now;actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{vishunalMotionStarted=now;actor.classList.add('attacking');restartAnimation($('vishunal-standing'),'vishunal-fire');}
    cancelVisual(vishunalAttackTimer);
    const delay=actor.classList.contains('bursting')?80:200;
    if(!actor.classList.contains('bursting'))vishunalAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),560);
    const groups=FX.projectileGroups(count,FX.MAX_PROJECTILES-layer.children.length,summarized),g=targetedGeometry(targetSlot);
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
  function animateTordelieseAttack(count,volleyCount=count,summarized=false,targetSlot=0,motion='normal'){
    if(!E.canAct(state,'tordeliese')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('tordeliese-combatant'),now=performance.now(),burst=volleyCount>1||count>1||now-lastTordelieseShot<280;
    lastTordelieseShot=now;cancelVisual(tordelieseAttackTimer);actor.classList.remove('range-motion');
    if(motion==='kick'){actor.classList.remove('attacking','bursting');actor.classList.add('range-motion');restartAnimation($('tordeliese-standing'),'tordeliese-melee');tordelieseAttackTimer=deferVisual(()=>actor.classList.remove('range-motion'),880);return 360;}
    if(burst||actor.classList.contains('bursting')){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('tordeliese-standing'),'tordeliese-strike');tordelieseAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),800);}
    const layer=$('tordeliese-tendrils'),groups=FX.projectileGroups(count,24-layer.children.length,summarized),g=targetedGeometry(targetSlot);
    let last=0;
    groups.forEach((amount,index)=>{
      const limbIndex=tordelieseLashIndex++,delay=index*45,rootX=g.tordelieseX-12*tordelieseSpriteScale;
      // Anchor at her upper back; crouching lowers the torso in burst poses.
      const rootY=g.tordelieseY+(actor.classList.contains('bursting')?16:0)*tordelieseSpriteScale;
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
    for(const id of ['mitsuru','waku','tordeliese'])$(id+'-combatant').classList.remove('range-motion');
    for(const c of D.characters)$('ally-rolls-'+c.id).replaceChildren();
    playback.reset();shownPoison.clear();pendingCloudBirths.clear();pendingEnemyDefeats.clear();
    for(const id of enemyAttackVisuals.keys())stopEnemyAttack(id);
    $('enemy-effects').replaceChildren();
    if (battleRender !== null) cancelAnimationFrame(battleRender); battleRender = null;
    for (const id of visualTimers) clearTimeout(id); visualTimers.clear();
    clearTimeout(metaAttackTimer);
    $('jewel-combatant').classList.remove('attacking','bursting');lastJewelShot=-Infinity;
    $('mitsuru-combatant').classList.remove('attacking','bursting');$('mitsuru-effects').replaceChildren();lastMitsuruShot=-Infinity;
    $('queen-combatant').classList.remove('attacking','bursting');lastQueenShot=-Infinity;
    $('megumin-combatant').classList.remove('attacking','bursting','spell-casting');$('megumin-effects').replaceChildren();meguminCastMagic=0;
    $('waku-combatant').classList.remove('attacking','bursting');$('waku-projectiles').replaceChildren();lastWakuShot=-Infinity;
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
    for(const [target,timer]of hitTimers){cancelVisual(timer);target.classList.remove('enemy-hit');}hitTimers.clear();
    $('hit-effects').replaceChildren();
    $('vishunal-combatant').classList.remove('attacking','bursting');$('vishunal-projectiles').replaceChildren();$('vishunal-muzzles').replaceChildren();lastVishunalShot=-Infinity;muzzleOrder=[];
    for(const die of $('reward-rain').children)die.hidden=true;
    rewardDieIndex=0;
    if (resetRoll) $('last-roll').textContent = '仲間を雇うか、攻撃して開始';
  }
  function animateEnemyDown(frame, motion) {
    const layer = $('enemy-defeats');
    while (layer.children.length >= FX.MAX_STEPS * 2) layer.firstElementChild.remove();
    const target=$(frame.targetSlot?'enemy-next-'+frame.targetSlot:'enemy-art'),ghost=target.cloneNode(true);
    const position=readCombatGeometry().enemySlots[frame.targetSlot||0];ghost.style.left=position.x+'px';ghost.style.top=position.y+'px';
    const previous=enemyAppearances.get(frame.enemyId);if(previous)setEnemyAppearance(ghost,previous,'');
    ghost.querySelector('.enemy-status')?.remove();ghost.querySelector('.enemy-health')?.remove();ghost.querySelector('.enemy-target')?.remove();ghost.classList.remove('enemy-absent','focused-enemy','enemy-attacking','enemy-absorbing','cloud-emerging');ghost.hidden=false;
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
      label.style.left=position.x+'px';label.style.top=position.y+'px';
      label.style.marginLeft = `${motion.x}px`;
      label.style.marginTop = `${motion.y}px`;
      label.style.setProperty('--label-drift', `${motion.fallX * .25}px`);
      label.style.setProperty('--fall-duration', `${fallMs}ms`);
      layer.append(label);
    }
    renderEnemy(E.getSession(state), frame.clears);
    deferVisual(() => { ghost.remove(); label?.remove(); }, fallMs + 20);
  }
  function showLaunch(frame) {
    $('arena').classList.add('combat-playing');
    if (displayedHP === null && Number.isFinite(frame.hpBefore)) displayedHP = frame.hpBefore;
    const meta = frame.metaAttacks ? animateMetaAttack(frame.metaAttacks,frame.volleyMetaCount,frame.approximate,frame.targetSlot||0) : 0;
    const richter = frame.richterAttacks ? animateRichterAttack(frame.richterAttacks,frame.volleyRichterCount,frame.approximate,frame.targetSlot||0) : 0;
    const vishunal=frame.vishunalAttacks?animateVishunalAttack(frame.vishunalAttacks,frame.volleyVishunalCount,frame.approximate,frame.targetSlot||0):0;
    const tordeliese=frame.tordelieseAttacks?animateTordelieseAttack(frame.tordelieseAttacks,frame.volleyTordelieseCount,frame.approximate,frame.targetSlot||0,frame.motion):0;
    const mitsuru=frame.mitsuruAttacks?animateMitsuruAttack(frame.mitsuruAttacks,frame.volleyMitsuruCount,frame.targetSlot||0,frame.hit,frame.motion):0;
    const queen=frame.queenAttacks?animateQueenAttack(frame.queenAttacks,frame.volleyQueenCount,frame.targetSlot||0,frame.hit):0;
    const megumin=frame.meguminAttacks?animateMeguminAttack(frame.meguminAttacks,frame.volleyMeguminCount,frame.targetSlot||0,frame.hit,frame.magicLevel):0;
    const jewel=frame.jewelAttacks?animateJewelAttack(frame.jewelAttacks,frame.volleyJewelCount):0;
    const waku=frame.wakuAttacks?animateWakuAttack(frame.wakuAttacks,frame.volleyWakuCount,frame.approximate,frame.targetSlot||0,frame.motion):0;
    const maxActions=(frame.maxAttacks||0)+(frame.maxTransfers||0);
    const max=maxActions?animateMaxAttack(maxActions,frame.volleyMaxCount,frame.approximate,frame.maxAttacks||0,frame.targetSlot||0):0;
    const continuation = frame.continuation ? (continuousBurst(frame.actorId||'richter') ? 80 : 200) : 0;
    return {meta,richter,vishunal,tordeliese,max,waku,jewel,mitsuru,queen,megumin,impact:frame.poisonTick?FX.PROJECTILE_FLIGHT_MS:Math.max(frame.meguminAttacks?720:0,frame.queenAttacks?380:0,frame.mitsuruAttacks?380:0,frame.jewelAttacks?260:0,frame.maxAttacks?max+320:0,frame.tordelieseAttacks?tordeliese:0,(frame.metaAttacks||frame.richterAttacks||frame.vishunalAttacks||frame.wakuAttacks||frame.continuation||!frame.actorId)?Math.max(meta||0,richter||0,vishunal||0,waku||0,continuation)+FX.PROJECTILE_FLIGHT_MS:0)};
  }
  function showImpact(frame) {
    if(frame.summons?.length)for(const e of frame.summons)showCloudCreation(e);
    if(frame.poisonAfter!==undefined)shownPoison.set(frame.enemyId,frame.poisonAfter);
    if(frame.supportOnly)return;
    const impactTarget=$(frame.targetSlot?'enemy-next-'+frame.targetSlot:'enemy-art'),position=readCombatGeometry().enemySlots[frame.targetSlot||0],impactX=position.x,impactY=position.y;
    visualHitId++;
    const motion = FX.impactMotion();
    const hitMode=frame.apDamage?'off':state.options.hitEffects;
    if(frame.hit!==false&&hitMode!=='off'){
      const sparks=$('hit-effects');
      while(sparks.children.length>=32)sparks.firstElementChild.remove();
      const spark=document.createElement('span');spark.className=`hit-spark${hitMode==='simple'?' simple-hit':''}${frame.poisonTick?' poison-hit':''}`;spark.dataset.impactId=visualHitId;
      spark.style.left=impactX+'px';spark.style.top=impactY+'px';spark.style.marginLeft=motion.x+'px';spark.style.marginTop=motion.y+'px';
      spark.style.setProperty('--spark-angle',motion.recoilAngle*3+'deg');
      sparks.append(spark);deferVisual(()=>spark.remove(),320);
    }
    if (frame.hit!==false && (hitMode==='normal'||hitMode==='translucent') && (frame.actorId === 'richter' || frame.richterAttacks || frame.actorId === 'vishunal' || frame.vishunalAttacks || frame.actorId==='megumin'||frame.meguminAttacks)) {
      const layer = $('explosions');
      // Keep each ordinary impact independent, including overflow targets.
      // At extreme rates bound the number of lingering smoke animations.
      while (layer.children.length >= FX.MAX_STEPS) layer.firstElementChild.remove();
      const blast = document.createElement('span'); blast.className = `richter-explosion${frame.continuation ? ' chain-explosion' : ''}`;
      const isMegumin=frame.actorId==='megumin'||frame.meguminAttacks;
      if(isMegumin){
        blast.className='megumin-explosion';blast.dataset.magicLevel=String(frame.magicLevel||0);
        blast.style.setProperty('--explosion-size',FX.meguminExplosionSize(frame.magicLevel)+'px');
      }
      blast.dataset.impactId = visualHitId;blast.style.left=impactX+'px';blast.style.top=impactY+'px';
      if(isMegumin)blast.style.top=FX.meguminExplosionY(impactY,impactTarget.offsetHeight)+'px';
      blast.style.marginLeft = `${motion.x}px`; blast.style.marginTop = `${motion.y}px`;
      const fireball = document.createElement('span'); fireball.className = isMegumin?'megumin-fireball pixel-art':'blast-fireball pixel-art';
      const sparks = document.createElement('span'); sparks.className = isMegumin?'megumin-shockwave':'blast-sparks';
      blast.append(fireball, sparks);
      layer.append(blast); deferVisual(() => blast.remove(), isMegumin?1600:RICHTER_EXPLOSION_MS);
    }
    if (!frame.apDamage&&Number.isFinite(frame.frontHP)) displayedHP=frame.frontHP;else if(!frame.apDamage&&!frame.targetSlot&&Number.isFinite(frame.hpAfter))displayedHP=frame.hpAfter;
    const details=[];
    if(state.options.showDamageNumbers&&!frame.poisonTick){if(frame.doubleHit)details.push('倍差命中');if(frame.smashCritical)details.push('スマッシュクリティカル'+(frame.smashCritical>1?' ×'+frame.smashCritical:''));}
    if(frame.continuation&&state.options.showOverflowLabels)details.push('全体攻撃');
    if(frame.knockoutRoll&&state.options.showDefeatLabels)details.push(`気絶判定 ${frame.knockoutRoll}：${frame.knockedOut?'気絶':'回避'}`);
    else if(frame.count>1&&state.options.showDamageNumbers)details.push(`${format(frame.count)}${frame.continuation?'体':'回'}`);
    if(state.options.showDamageNumbers||details.length){
      const floating = document.createElement('span'); floating.className = 'damage-float';
      if(frame.poisonTick)floating.classList.add('poison-damage');
      floating.style.left=impactX+'px';floating.style.top=impactY+'px';floating.dataset.attackCount = frame.count;
      floating.dataset.impactId = visualHitId;
      if(state.options.showDamageNumbers)floating.textContent = frame.hit===false?'MISS':`${frame.apDamage?'AP −':frame.poisonTick?'猛毒 ':''}${frame.approximate ? '合計 ' : ''}${format(frame.damage)}`;
      floating.style.marginLeft = `${motion.x}px`; floating.style.marginTop = `${motion.y-(frame.poisonTick?84:0)}px`;
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
    $('last-roll').textContent = `${frame.actor} / ${frame.hit===false?'MISS':format(frame.damage)+(frame.apDamage?' AP減少':' DMG')}${frame.continuation ? '・全体攻撃' : ''}${frame.count > 1 ? `・${format(frame.count)}${frame.continuation ? '体' : '回'}（合計）` : ''}${frame.knockoutRoll ? ` / 気絶判定${frame.knockoutRoll}：${frame.knockedOut ? '気絶' : '回避'}` : ''}`;
    cancelVisual(hitTimers.get(impactTarget));hitTimers.delete(impactTarget);impactTarget.classList.remove('enemy-hit');
    if (frame.hit!==false&&!frame.clears) {
      const target = impactTarget;
      target.style.setProperty('--hit-x', `${motion.recoilX}px`);
      target.style.setProperty('--hit-y', `${motion.recoilY}px`);
      target.style.setProperty('--hit-angle', `${motion.recoilAngle}deg`);
      target.classList.add('enemy-hit');
      restartAnimation(target, 'enemy-impact-varied');
      hitTimers.set(target,deferVisual(()=>{target.classList.remove('enemy-hit');hitTimers.delete(target);},180));
    }
    if (frame.clears||frame.removed) {
      pendingEnemyDefeats.delete(frame.enemyId);
      if(frame.clears)showRewardRain(frame);
      animateEnemyDown(frame.removed?{...frame,clears:1,knockouts:0}:frame, motion);
      const hitId = visualHitId;
      deferVisual(() => { if (hitId === visualHitId && Number.isFinite(frame.endHP)) { displayedHP = frame.endHP; requestBattleRender(); } }, 90);
    }
    requestBattleRender();
  }
  function showRunawayResult(event, result) {
    if (!result || document.hidden || !E.isDeployed(state,event.actorId)) return;
    const layer=$('ally-rolls-'+event.actorId), node=document.createElement('span');
    // Bound catch-up bursts; each displayed result is taken from the engine event.
    while(layer.children.length>=3)layer.firstElementChild.remove();
    node.className='runaway-result'+(reducedMotion.matches?' reduced-motion':'');
    node.textContent='暴走：'+result;
    node.style.setProperty('--roll-slot',String(layer.children.length));
    layer.append(node);deferVisual(()=>node.remove(),1800);
  }
  function showEvents(events, automatic = false) {
    if(state.viewingMemories)return;
    const otherClears=events.filter(e=>e.type==='clear'&&e.sessionId&&e.sessionId!==state.sessionId);
    if(otherClears.length)log('別セッションで '+fullNumber(otherClears.reduce((n,e)=>n+(e.count||1),0))+'周。因子 +'+money(otherClears.reduce((n,e)=>n+e.reward,0))+'Rd');
    events=events.filter(e=>!e.sessionId||e.sessionId===state.sessionId);
    if(!document.hidden&&!reducedMotion.matches)for(const event of events)if(event.type==='clear'||event.type==='enemyRemoved')pendingEnemyDefeats.add(event.enemyId);
    for(const event of events){
      if(event.type==='queenIntercept'){animateQueenAttack(1,1,event.targetSlot,event.hit);if(event.hit)log('クイーン：「この無礼者」 — 攻撃を中断させた');}
      else if(event.type==='enemyWindup')startEnemyAttack(event);
      else if(event.type==='enemyAttack')showEnemyAttack(event);
      else if(event.type==='enemyAbsorb')showCloudAbsorb(event);
      else if(event.type==='enemySummon'){if(event.created&&!document.hidden&&!reducedMotion.matches)pendingCloudBirths.add(event.enemyId);}
      else if(event.type==='enemyRemoved')renderEnemy(E.getSession(state));
      else if(event.type==='runawayDamage')showEnemyAttack({...event,hit:true,mental:true});
      else if(event.type==='runawayThreshold')log(D.characters.find(c=>c.id===event.actorId).name+'：暴走率'+event.threshold+'%');
      else if(event.type==='runawaySymptom'){showRunawayResult(event,symptomName(event.symptom));log(D.characters.find(c=>c.id===event.actorId).name+'：'+symptomName(event.symptom));}
      else if(event.type==='runawayRoll')showRunawayResult(event,{selfDamage:'自傷',rise:'高揚',chain:'連鎖',control:'自制',misfire:'暴発',criticalRecovery:'臨界回復'}[event.outcome]);
      else if(event.type==='perkIncome')log(event.perk+'：因子 +'+money(event.amount)+'Rd');
      else if(event.type==='enemyCancel')stopEnemyAttack(event.enemyId);
      else if(event.type==='enemyRespawn')renderEnemy(E.getSession(state));
    }
    for(const event of events)if(event.type==='attack'&&event.poisonBefore!==undefined&&!shownPoison.has(event.enemyId))shownPoison.set(event.enemyId,event.poisonBefore);
    const attacks = events.filter(e => e.type === 'attack'), clears = events.filter(e => e.type === 'clear');
    if ((attacks.length || events.some(e=>e.type==='support')) && !document.hidden && !reducedMotion.matches) playback.enqueue(events,{sustainedActors:automatic ? ['meta','richter','vishunal','tordeliese','max','waku','jewel','mitsuru','queen','megumin'].filter(continuousBurst) : []});
    else if (attacks.length) {
      const last = attacks[attacks.length - 1];
      const totalAttacks = attacks.reduce((sum, e) => sum + (e.count || 1), 0);
      const totalDamage = attacks.reduce((sum, e) => sum + (e.apDamage?0:e.damage), 0);
      const totalAP = attacks.reduce((sum, e) => sum + (e.apDamage?e.damage:0), 0);
      const results = [attacks.some(e=>!e.apDamage)?`${format(totalDamage)} DMG`:null,attacks.some(e=>e.apDamage)?`${format(totalAP)} AP減少`:null].filter(Boolean).join(' / ');
      const actor = new Set(attacks.map(e => e.actor)).size === 1 ? last.actor : 'パーティ';
      $('last-roll').textContent = `${actor} / ${results}${totalAttacks > 1 ? `・${format(totalAttacks)}回` : ''}`;
    }
    if (clears.length) {
      if(document.hidden||reducedMotion.matches)renderEnemy(E.getSession(state),clears.reduce((n,e)=>n+(e.count||1),0));
      const count = clears.reduce((sum, e) => sum + (e.count || 1), 0);
      const knockouts = clears.reduce((sum,e) => sum + (e.reason === 'knockout' ? (e.count || 1) : (e.knockouts || 0)), 0);
      log(`${E.getSession(state).name} クリア${count > 1 ? ` ×${format(count)}` : ''}${knockouts ? `（気絶 ${format(knockouts)}回）` : ''}。因子 +${money(clears.reduce((n, e) => n + e.reward, 0))}Rd`);
    }
  }
  function startNextRun(){
    if(blocked()||abilityEdit)return false;
    const next=E.nextRun(state,Date.now());if(!next)return false;
    // Persist the complete replacement before releasing the previous in-memory run.
    const result=storage?S.persist(storage,next):{ok:false,error:'保存できないため周回を開始できません。'};
    if(!result.ok){notice(result.error,true);return false;}
    state=next;lastTime=lastSave=Date.now();storageError=false;
    questInputDrafts.clear();formationQuestId=null;formationDraft=[];revivalTarget=null;enemyInfoQuestId=null;
    controlsKey='';battleRender=null;orbitLayoutKey='';inspectedCharacter='meta';
    $('activity-log').replaceChildren();resetCombatVisuals(true);
    switchManager('characters');inspectCharacter('meta');render();
    setText('save-status','保存済み');log('第'+state.runNumber+'周を開始しました。');return true;
  }
  function sync() {
    const now = Date.now();
    if (!blocked()&&!abilityEdit&&!sceneView.transitioning) {
      const elapsed = Math.max(0, (now - lastTime) / 1000);
      if (elapsed > 5) {
        const before = state.factors, oldKills = state.kills;
        E.advance(state, elapsed, Math.random, false);
        if (state.kills > oldKills) log(`離席中に${fullNumber(state.kills - oldKills)}周。因子 +${money(state.factors - before)}Rd`);
      } else showEvents(E.advance(state, elapsed), true);
      state.savedAt = now;
    }
    lastTime = now;
  }
  function save() {
    if (blocked()) return false;
    sync();
    const saving=abilityEdit?abilityEdit.original:state;saving.savedAt=Date.now();
    const result = storage ? S.persist(storage, saving) : { ok: false, error: 'ブラウザへの保存を利用できません。セーブを書き出してください。' };
    lastSave = Date.now();
    storageError = !result.ok;
    $('save-status').textContent = result.ok ? `保存済み ${new Date(lastSave).toLocaleTimeString('ja-JP')}` : '自動保存不可 · 書き出しで保存してください';
    if (!result.ok) {saveErrorMessage=result.error;notice(result.error,true);}
    else {if(saveErrorMessage&&$('notice').textContent===saveErrorMessage)notice('自動保存が復旧しました。');saveErrorMessage='';}
    return result.ok;
  }
  function exportText() { sync(); return S.encode(state); }
  function preview(text) {
    importCandidate = null;
    $('import-preview').hidden = true;
    try {
      const parsed = S.decode(text);
      importCandidate = parsed;
      $('import-summary').textContent = `所持因子 ${money(parsed.factors)}Rd / 累計クリア ${fullNumber(parsed.kills)}\n参加 ${D.characters.filter(c => parsed.levels[c.id]).length}人 / ${E.getSession(parsed).name}\n保存日時 ${new Date(parsed.savedAt).toLocaleString('ja-JP')}\n読み込むと現在の進行を置き換えます。`;
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
  function inspectCharacter(id) {
    inspectedCharacter=id;
    for (const c of D.characters) {
      const selected=c.id===id;
      $('inspect-'+c.id).setAttribute('aria-selected',selected);
      $('inspect-'+c.id).tabIndex=selected?0:-1;
      $('card-'+c.id).hidden=!selected;
    }
  }
  function bindTabs(ids, prefix, activate, clickActivate=activate) {
    ids.forEach((id,index)=>{
      $(prefix+id).addEventListener('click',()=>clickActivate(id));
      $(prefix+id).addEventListener('keydown',event=>{
        let next=event.key==='ArrowRight'?(index+1)%ids.length:event.key==='ArrowLeft'?(index+ids.length-1)%ids.length:event.key==='Home'?0:event.key==='End'?ids.length-1:null;
        if(next===null)return;
        event.preventDefault();activate(ids[next]);$(prefix+ids[next]).focus();
      });
    });
  }
  function renderEnemyInfo(ctx,node){
    const F=window.YggMatchup,q=E.getSession(ctx),forecast=F.party(ctx),attack=E.enemyAttackSpec(forecast.state);
    const strength=kind=>incomeNumber(window.YggAbilityView.strengthLevel(E.enemyStrength(q,kind),D.strength)),action={...q.actionDice,dice:q.actionDice?.dice||0,flat:q.actionDice?.flat??q.action??0};
    const bases={action:rollText(action),accuracy:rollText(q.accuracy),evasion:rollText(q.evasion),power:rollText(attack),vitality:fullNumber(q.baseHP),armor:fullNumber(q.defense)+' / '+fullNumber(q.resistance)};
    const stats='<div class="enemy-ability-rows">'+window.YggAbilityView.rows({
      enemy:true,baseCell:t=>'<strong>'+bases[t.id]+'</strong>'+(t.id==='power'?'<small class="base-attack-range">基本射程 '+rangeText(q.attackRange||[1,3])+'</small>':''),
      valueCell:t=>'<strong>'+(t.id==='action'?fullNumber(E.enemyActionValue(q)):t.id==='vitality'?incomeNumber(window.YggAbilityView.strengthLevel(q.hpStrength,D.strength)):strength(t.id))+'</strong>',
      hp:'<small class="ability-hp">最大HP '+fullNumber(q.hp)+'</small>',ss:'<strong>'+rollText(q.ss)+'</strong>'
    })+'</div>';
    const percent=v=>(v*100).toFixed(1)+'%',finite=v=>Number.isFinite(v)?'約'+rateFormat(v)+'回':'—';
    const rows=forecast.rows.map(r=>'<tr><th scope="row">'+r.name+'</th><td class="matchup-hit">'+(r.reachable?'約'+percent(r.hitRate):'射程外')+'</td><td>'+(r.passive?'—':'約'+percent(r.evadeRate))+'</td><td>'+ (r.passive?'—':rateFormat(r.damageOnHit))+'</td><td>'+signed(r.hitCorrection)+' / '+signed(r.damageCorrection)+'</td><td>'+(r.apAttack?'AP −'+rateFormat(r.averageAPDamage):rateFormat(r.averageDamage))+'</td><td>'+signed(r.enemyHitCorrection)+' / '+signed(r.enemyDamageCorrection)+'</td><td class="matchup-endurance">'+(r.passive?'攻撃なし':!r.enemyReachable?'敵の射程外':finite(r.endurance))+'</td></tr>').join('');
    const html='<div class="enemy-info-heading"><div><small>ENEMY / Lv.'+q.level+'</small><h4>'+q.enemy+'</h4></div><span>'+ (q.attackType==='mental'?'精神攻撃':q.ignoreDefense?'防御貫通':'物理攻撃')+'</span></div>'+stats+'<h5>部隊との相性 <small>挑戦中 Lv.'+q.level+'</small></h5>'+(rows?'<div class="matchup-scroll"><table class="matchup-table"><thead><tr><th>キャラクター</th><th>命中率</th><th>回避率</th><th>平均被ダメージ<small>被弾1回</small></th><th>味方の補正<small>命中 / ダメージ</small></th><th>平均与ダメージ<small>1回の攻撃</small></th><th>敵の補正<small>命中 / ダメージ</small></th><th>耐久目安<small>敵の攻撃回数</small></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="option-note">部隊を編成すると、仲間ごとの相性が表示されます。</p>')+'<p class="matchup-note">補正は通常命中時。平均与ダメージはMISSと命中ボーナス込み。耐久は満HPからの概算（回復・気絶等を除く）。'+(q.summons?'オズモーン本体との比較。':'')+'</p>';
    if(node.innerHTML!==html)node.innerHTML=html;
  }
  function renderFormationDraft(){
    const quest=E.getSession(state,formationQuestId);if(!quest)return;
    setText('formation-title',quest.name+'の部隊編成');
    setText('formation-count',formationDraft.length+' / '+E.MAX_PARTY_SIZE+'人');
    const hired=charactersByHireCost.filter(c=>state.levels[c.id]>0);
    $('formation-members').innerHTML=hired.map(c=>{
      const selected=formationDraft.includes(c.id),owner=E.formationOwner(state,c.id),elsewhere=owner&&owner!==formationQuestId;
      const label=selected?(elsewhere?'移籍予定':'編成中'):elsewhere?E.getSession(state,owner).name+'に所属':'控え';
      const full=!selected&&formationDraft.length>=E.MAX_PARTY_SIZE;
      return '<div class="formation-entry" data-formation-entry="'+c.id+'"><button type="button" class="formation-member" data-formation-member="'+c.id+'" aria-pressed="'+selected+'" '+(full?'disabled':'')+'><span>'+c.name+'</span><small>'+label+(E.runawayOf(state,c.id).runawayCollapsed?' · 暴走ダウン':'')+'</small></button><div class="formation-row-choice" role="group" aria-label="'+c.name+'の配置">'+['front','rear'].map(row=>'<button type="button" data-formation-row="'+row+'" data-formation-character="'+c.id+'" aria-pressed="'+(selected&&(formationRowsDraft[c.id]||'front')===row)+'" '+(full?'disabled':'')+'>'+(row==='front'?'前衛':'後衛')+'</button>').join('')+'</div><small class="formation-range">基本射程 '+rangeText(c.attackRange)+'</small>'+(selected?'<button type="button" class="formation-remove" data-formation-remove="'+c.id+'" aria-label="'+c.name+'を部隊から外す">外す</button>':'')+'</div>';
    }).join('');
    $('formation-empty').hidden=hired.length>0;
    const ctx=E.battleContext(state,formationQuestId);
    const draft={...ctx,formationRows:formationRowsDraft,formations:Object.fromEntries(D.sessions.map(q=>[q.id,q.id===formationQuestId?formationDraft:E.formationIds(state,q.id).filter(id=>!formationDraft.includes(id))])),selectedCharacterId:formationDraft.includes(ctx.selectedCharacterId)?ctx.selectedCharacterId:null};
    renderEnemyInfo(draft,$('formation-enemy-info'));
    setText('formation-preview','編成時のDPS '+rateFormat(E.dps(draft))+' ／ 因子 約'+incomeNumber(E.expectedIncome(draft).factorsPerSecond)+'Rd/秒');
  }
  function openFormation(id){
    if(blocked()||!D.sessions.some(q=>q.id===id))return;
    const rest=E.restOf(state,id);$('auto-rest-enabled').checked=rest.enabled;$('auto-rest-kills').value=rest.kills;$('auto-rest-minutes').value=rest.minutes;$('auto-rest-duration').value=rest.restMinutes;setText('auto-rest-error','');
    formationQuestId=id;formationDraft=[...E.formationIds(state,id)];formationRowsDraft={...state.formationRows};renderFormationDraft();$('formation-dialog').showModal();
  }
  function applySuppression(id=null){
    if(blocked()||abilityEdit)return;sync();
    if(E.suppressRunaway(state,id)){log(id?D.characters.find(c=>c.id===id).name+'の暴走率を抑制しました。':'部隊全体の暴走率を抑制しました。');save();controlsKey='';render();}
    else notice('抑制対象がいないか、因子が不足しています。');
  }
  function chooseQuest(id){
    if(blocked())return;
    sync();
    const changed=id==='memories'?E.selectMemories(state):E.selectSession(state,id);
    if(changed){resetCombatVisuals(true);save();render();}
  }
  function bind() {
    $('character-picker').addEventListener('click',event=>{const button=event.target.closest('[data-suppress]');if(button&&!button.disabled)applySuppression(button.dataset.suppress);});
    $('suppress-all').addEventListener('click',()=>applySuppression());
    $('quest-list').addEventListener('input',event=>{const input=event.target;if(input.id?.startsWith('quest-active-')){const id=input.id.slice('quest-active-'.length);questInputDrafts.set(id,input.value);questView.renderPreview(state,id);}});
    $('enemy-info-close').addEventListener('click',()=>$('enemy-info-dialog').close());
    $('enemy-info-dialog').addEventListener('close',()=>{enemyInfoQuestId=null;});
    for(const c of D.characters){const dialog=$('ability-dialog-'+c.id);dialog.addEventListener('cancel',event=>{event.preventDefault?.();finishAbility(false);});dialog.addEventListener('close',()=>{if(abilityEdit?.id===c.id)finishAbility(false);});}
    switchManager(managerTab);inspectCharacter(inspectedCharacter);
    bindTabs(managerTabs,'tab-',switchManager);
    bindTabs(charactersByHireCost.map(c=>c.id),'inspect-',id=>inspectCharacter(id),id=>{if(id===inspectedCharacter&&state.levels[id]>0&&!blocked())openAbility(id);else inspectCharacter(id);});
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
    $('clear-focus').addEventListener('click',()=>{sync();E.selectEnemy(state,null);save();render();});
    $('cancel-revive').addEventListener('click',()=>$('revive-dialog').close());
    $('confirm-revive').addEventListener('click',()=>{if(blocked())return;sync();if(E.revive(state,revivalTarget)){log(D.characters.find(c=>c.id===revivalTarget).name+'：復活バーストで全回復。');$('revive-dialog').close();save();render();}else renderRevivalDialog();});
    $('attack').addEventListener('click', () => { sync(); showEvents(E.click(state)); render(); });
    $('pause').addEventListener('click', () => { sync(); state.paused = !state.paused; if (state.paused) resetCombatVisuals(); save(); render(); log(state.paused ? '周回を一時停止しました。' : '周回を再開しました。'); });
    const chooseCharacter = id => {
      if (blocked()) return;
      sync();
      if(id&&E.healthOf(state,id).status!=='active'){openRevivalDialog(id);return;}
      if(id&&E.runawayOf(state,id).runawayCollapsed){notice('暴走ダウン中です。暴走率100%未満で復帰します。');return;}
      if (E.selectCharacter(state, id)) { save(); render(); }
    };
    for(const c of D.characters)$(c.id+'-select').addEventListener('click',()=>chooseCharacter(c.id));
    $('select-self').addEventListener('click', () => chooseCharacter(null));
    $('character-list').addEventListener('click', event => {
      const close=event.target.closest('[data-ability-close]');if(close){finishAbility(false);return;}
      const confirm=event.target.closest('[data-ability-confirm]');if(confirm){finishAbility(true);return;}
      const open=event.target.closest('[data-ability]');if(open){
        if(blocked()||open.disabled)return;sync();const id=open.dataset.ability;
        if(!state.levels[id]){if(E.hire(state,id)){save();render();}}else openAbility(id);return;
      }
      if(adjustTraining(event))return;
      const focus=event.target.closest('[data-focus]');if(focus){if(!focus.disabled)changeFocus(focus.dataset.focus,focus.dataset.focusStat,E.concentration(state,focus.dataset.focus)[focus.dataset.focusStat]+Number(focus.dataset.step));return;}
      const reset=event.target.closest('[data-focus-reset]');if(reset&&abilityEdit?.id===reset.dataset.focusReset){if(reset.disabled)return;
        if(!abilityEdit.focusReset&&Object.values(E.concentration(abilityEdit.original,abilityEdit.id)).some(n=>n>0)){if(!E.resetConcentration(state,abilityEdit.id))return;abilityEdit.focusReset=true;}
        else E.setConcentration(state,abilityEdit.id,Object.fromEntries(D.concentration.map(t=>[t.id,0])));
        state.health[abilityEdit.id]=structuredClone(abilityEdit.original.health[abilityEdit.id]);E.clampHealth(state,abilityEdit.id);abilityEdit.cache.clear();controlsKey='';render();return;}
      const revive=event.target.closest('[data-revive]');
      if(revive?.dataset.revive){if(revive.disabled||blocked())return;sync();openRevivalDialog(revive.dataset.revive);return;}
      if(handleTrade(event))return;
      const perkButton = event.target.closest('[data-perk]');
      if (perkButton) {
        if (blocked() || perkButton.disabled) return;
        sync();
        const c = D.characters.find(c => c.id === perkButton.dataset.perkCharacter);
        if (E.buyPerk(state, c.id, perkButton.dataset.perk)) {
          const p = c.perks.find(p => p.id === perkButton.dataset.perk);
          const text=c.name+'：'+p.name+'を'+(E.perks(state,c).find(x=>x.id===p.id).enabled?'ON':'OFF')+'にしました。';
          if(abilityEdit)abilityEdit.cache.clear();else{log(text);notice(text);save();}render();
        }
        return;
      }
      const selectButton = event.target.closest('[data-select-character]');
      if (selectButton) { if (!selectButton.disabled) chooseCharacter(selectButton.dataset.selectCharacter); return; }
      const button = event.target.closest('[data-hire]');
      if (!button) return;
      if (!button || blocked()) return;
      sync();
      if (E.hire(state, button.dataset.hire)) {
        const c = D.characters.find(c => c.id === button.dataset.hire);
        log(`${c.name} ${state.levels[c.id] === 1 ? 'が参加しました。' : `のレベルをLv.${state.levels[c.id]}に強化。`}`);
        for (const p of c.perks || []) if (p.level === state.levels[c.id]) {
          const text = `${c.name}：特性【${p.name}】が解放されました。能力・パーク画面でONにできます。`;
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
    $('formation-members').addEventListener('click',event=>{
      if(blocked())return;
      const remove=event.target.closest('[data-formation-remove]');
      if(remove){formationDraft=formationDraft.filter(id=>id!==remove.dataset.formationRemove);renderFormationDraft();return;}
      const row=event.target.closest('[data-formation-row]'),entry=event.target.closest('[data-formation-entry]');
      const id=row?.dataset.formationCharacter||entry?.dataset.formationEntry;
      if(!id||!D.characters.some(c=>c.id===id&&state.levels[id]>0)||row?.disabled)return;
      const selected=formationDraft.includes(id);
      if(!selected){if(formationDraft.length>=E.MAX_PARTY_SIZE)return;formationDraft.push(id);}
      if(row)formationRowsDraft[id]=row.dataset.formationRow;
      else if(selected){openAbility(id);return;}
      renderFormationDraft();
    });
    for(const id of ['formation-close','formation-cancel'])$(id).addEventListener('click',()=>$('formation-dialog').close());
    $('formation-save').addEventListener('click',()=>{
      if(blocked())return;sync();
      const settings={enabled:$('auto-rest-enabled').checked,kills:Number($('auto-rest-kills').value),minutes:Number($('auto-rest-minutes').value),restMinutes:Number($('auto-rest-duration').value)};
      if(!E.setAutoRest({...state,autoRest:structuredClone(state.autoRest)},formationQuestId,settings)) {setText('auto-rest-error','条件を1つ以上指定し、休憩時間は0より大きい数値を入力してください。');return;}
      if(E.setFormation(state,formationQuestId,formationDraft,formationRowsDraft)){
        E.setAutoRest(state,formationQuestId,settings);
        resetCombatVisuals(true);
        save();render();$('formation-dialog').close();notice(E.getSession(state,formationQuestId).name+'の部隊編成を保存しました。');
      }
    });
    $('formation-dialog').addEventListener('close',()=>{formationQuestId=null;});
    $('character-list').addEventListener('input',event=>{const input=event.target;if(input.dataset.focusInput&&input.value!=='')changeFocus(input.dataset.focusInput,input.dataset.focusStat,Number(input.value));});
    $('character-list').addEventListener('change',event=>{const input=event.target;if(input.dataset.focusInput){changeFocus(input.dataset.focusInput,input.dataset.focusStat,Number(input.value));input.value=E.concentration(state,input.dataset.focusInput)[input.dataset.focusStat];}});
    $('quest-list').addEventListener('keydown',event=>{const id=window.YggQuestView.cardSelection(event);if(id)chooseQuest(id);});
    $('quest-list').addEventListener('click',event=>{
      const memories=event.target.closest('[data-memories]');if(memories){if(!memories.disabled)chooseQuest('memories');return;}
      const info=event.target.closest('[data-enemy-info]');
      if(info&&!info.disabled){enemyInfoQuestId=info.dataset.enemyInfo;const ctx=E.battleContext(state,enemyInfoQuestId);setText('enemy-info-quest',E.getSession(ctx).name);renderEnemyInfo(ctx,$('enemy-info-content'));if(!$('enemy-info-dialog').open)$('enemy-info-dialog').showModal();return;}
      const details=event.target.closest('[data-quest-details]');
      if(details?.dataset.questDetails){
        if(details.disabled||blocked())return;
        const panel=$('quest-enhancement-'+details.dataset.questDetails);panel.hidden=!panel.hidden;details.setAttribute('aria-expanded',String(!panel.hidden));return;
      }
      const challenge=event.target.closest('[data-quest-level]');
      if(challenge?.dataset.questLevel){
        if(challenge.disabled||blocked())return;sync();
        const id=challenge.dataset.questLevel,level=Number($('quest-active-'+id).value);
        if(E.setQuestLevel(state,id,level)){questInputDrafts.delete(id);if(state.sessionId===id)resetCombatVisuals(true);save();render();}
        else notice('購入済みの範囲で、整数のLvを指定してください。');
        return;
      }
      
      const formation=event.target.closest('[data-formation-open]');
      if(formation?.dataset.formationOpen){openFormation(formation.dataset.formationOpen);return;}
      if(handleTrade(event))return;
      const choose=event.target.closest('[data-session]');
      if(choose){if(!choose.disabled)chooseQuest(choose.dataset.session);return;}
      const cardId=window.YggQuestView.cardSelection(event);
      if(cardId){chooseQuest(cardId);return;}
      const button=event.target.closest('[data-quest]');
      if(!button||button.disabled||blocked())return;
      sync();
      if(E.buyQuest(state,button.dataset.quest)){
        if(state.sessionId===button.dataset.quest)resetCombatVisuals();
        const quest=E.getSession(state,button.dataset.quest);
        log(`${quest.name}をLv.${fullNumber(quest.level)}に強化。`);
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
      state = S.decode(S.encode(importCandidate));questInputDrafts.clear();
      resetCombatVisuals(true);
      const result = E.catchUp(state);
      corruptSave = false; importCandidate = null; lastTime = Date.now();
      const persisted = save(); render();
      $('import-preview').hidden = true;
      message(persisted ? 'セーブを読み込みました。移動先でも続きから遊べます。' : '読み込みました。ブラウザに保存できないため、終了前に書き出してください。', !persisted);
      if (persisted) notice('セーブを引き継ぎました。');
      log(`セーブを読み込みました。${result.kills ? `離席中に${fullNumber(result.kills)}周。` : ''}`);
    });
    $('restore-import').addEventListener('click', () => {
      let backup = importBackup;
      try { backup = backup || (storage && storage.getItem(PRE_IMPORT)); } catch { /* Fall back to memory. */ }
      if (!backup) { message('読み込み前のバックアップはまだありません。'); return; }
      $('save-text').value = backup; preview(backup);
    });
    document.addEventListener('visibilitychange', () => { sceneView.setMotionPaused(document.hidden); enemyMotionState(); if (document.hidden) { save(); resetCombatVisuals(); } else { sync(); render(); } });
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
      if (report.kills) { log(`離席中に${fullNumber(report.kills)}周。因子 +${money(report.factors)}Rd`); if (!loaded.warning) notice(`おかえりなさい。離席中に${fullNumber(report.kills)}周クリアし、因子を${money(report.factors)}Rd獲得しました。（最大8時間）`); }
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
