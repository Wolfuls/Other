(function () {
  'use strict';
  const D = window.YggData, E = window.YggEngine, S = window.YggSave, FX = window.YggCombatEffects, UI = window.YggDisplay, M=window.YggMaintenance;
  // Temporary UI feature gate. Engine/save support remains available for re-enabling.
  const BATTLE_SPEED_ENABLED=false;
  function availableState(next){if(!BATTLE_SPEED_ENABLED)next.battleSpeed=1;return next;}
  const charactersByHireCost=[...D.characters].sort((a,b)=>a.cost-b.cost);
  const elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, document.getElementById(id)); return elements.get(id); };
  const setText = (id, value) => { const node = $(id), text = String(value); if (node.textContent !== text) node.textContent = text; };
  let maintenanceBusy=false,recoveryBusy=false,recoveryGeneration=0;
  const warmedImages=new Map();
  function warmQuest(q){for(const src of [q.background,q.sheet,q.attackSheet,q.defeatSheet,q.summon?.sheet,...(q.members||[]).flatMap(m=>[m.sheet,m.attackSheet,m.waveSheet,m.defeatSheet]),...(q.variants||[]).flatMap(v=>[v.sheet,v.defeatSheet])].filter(Boolean)){if(warmedImages.has(src))continue;const img=new Image();warmedImages.set(src,img);img.onerror=()=>warmedImages.delete(src);img.src=src;}}
  let renderScheduled=false,uiReady=false,summaryKey='',summaryValues=null;
  const incomeHistory=new window.YggIncomeHistory(Date.now());let incomeWindow=300;
  E.observeIncome((quest,amount)=>{if(uiReady&&!recoveryBusy&&!abilityEdit)incomeHistory.add(quest,amount,Date.now());});
  window.YggActualIncome=()=>incomeHistory.read(incomeWindow,Date.now());
  const detailKeys=new Map(),quoteCache=new Map();
  let lastScheduledRender=-Infinity,lastControlsRender=-Infinity;
  let controlsKey = '', battleRender = null, combatGeometry = null;
  let managerTab = 'characters', inspectedCharacter = 'meta', noticeTimer;
  let formationQuestId=null,formationDraft=[],formationRowsDraft={};
  let abilityEdit=null,enemyInfoQuestId=null;
  const questInputDrafts=new Map();
  const shownPoison=new Map(),pendingCloudBirths=new Set(),pendingEnemyDefeats=new Set();
  const managerTabs = ['characters','quests','upgrades','stats','options'];
  const displayControls = {'option-simple-numbers':'simplifiedNumbers','option-hit-effects':'hitEffects',
    'option-factor-rain':'showFactorRain','option-reward-dice':'showRewardDice',
    'option-damage-numbers':'showDamageNumbers','option-overflow-labels':'showOverflowLabels','option-defeat-labels':'showDefeatLabels'};
  let enemyVariantSession = '', revivalTarget=null;
  const enemyAttackVisuals=new Map();
  const enemyAppearances=new Map();
  let battleLayoutKey = '', arenaViewportWidth = 0;
  let shownCrystals = -1;
  let rewardDieIndex = 0;
  const PRE_IMPORT = 'yggclicker.before-import';
  const RICHTER_EXPLOSION_MS = 640;
  let sinInspection=false;
  let state = E.createState(), storage, readOnly = false, corruptSave = false;
  let importCandidate = null, lastTime = Date.now(), lastSave = Date.now(), initialized = false;
  let storageError = false, importBackup = null, saveErrorMessage = '';
  let metaAttackTimer, lastMetaAttack = -Infinity, lastMetaShot = -Infinity;
  let displayedHP = null, visualHitId = 0, spawnTimer;
  const hitTimers=new Map();
  let richterAttackTimer, lastRichterShot = -Infinity;
  let jewelAttackTimer,lastJewelShot=-Infinity;
  let mitsuruAttackTimer,lastMitsuruShot=-Infinity;
  let queenAttackTimer,lastQueenShot=-Infinity;
  let meguminAttackTimer,meguminCastMagic=0;
  let wakuAttackTimer,lastWakuShot=-Infinity;
  let maxAttackTimer,lastMaxShot=-Infinity;
  let lastTordelieseShot=-Infinity,tordelieseAttackTimer,tordelieseLashIndex=0,tordelieseSpriteScale=1;
  let vishunalAttackTimer, lastVishunalShot = -Infinity, vishunalMotionStarted = 0, muzzleOrder = [], vishunalSpriteScale=.5;
  const visualTimers = new Map();let visualSequence=0,visualRate=1;
  function changeVisualRate(rate){
    const now=performance.now(),old=visualRate;visualRate=rate;
    if(old!==rate)for(const [id,t]of visualTimers){clearTimeout(t.timer);t.remaining=Math.max(0,t.remaining-(now-t.started)*old);t.started=now;t.timer=setTimeout(()=>{visualTimers.delete(id);t.callback();},t.remaining/rate);}
    for(const node of [$('enemy-art'),$('enemy-next-1'),$('enemy-next-2')])node.dataset.battleSpeed=String(rate);
    for(const animation of $('arena').getAnimations({subtree:true}))if(animation.playbackRate!==rate)animation.playbackRate=rate;
  }
  const playback = FX.createPlayback({ schedule:deferVisual,cancel:cancelVisual,onLaunch:showLaunch, onImpact:showImpact, onActorIdle:finishBurst, onIdle:() => {
    const hitId = visualHitId;
    deferVisual(() => { if (!playback.pending && hitId === visualHitId) { displayedHP = null; pendingEnemyDefeats.clear(); $('arena').classList.remove('combat-playing'); requestBattleRender(); } }, 200);
  } });
  if(typeof MutationObserver!=='undefined'){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;changeVisualRate(E.battleSpeed(state));});}).observe($('arena'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  window.YggDuoView?.setScheduler?.(deferVisual);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const money = n=>UI.currencyNumber(n,state.options.simplifiedNumbers?(state.options.numberUnit||'western'):false);
  const fullNumber=n=>UI.fullNumber(n,state.options.simplifiedNumbers?(state.options.numberUnit||'western'):false),incomeNumber=n=>UI.incomeNumber(n,state.options.simplifiedNumbers?(state.options.numberUnit||'western'):false);
  const format = fullNumber;
  const strengthNumber=n=>UI.strengthNumber(n,state.options.simplifiedNumbers?(state.options.numberUnit||'western'):false);
  const rateFormat = incomeNumber;

  const rollText=s=>s?fullNumber(s.flat||0)+'＋'+fullNumber(s.dice||0)+'D'+(s.sides||6):'—';
  const signed=n=>(n>=0?'+':'')+rateFormat(n);
  const pressureNumber=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:6});
  const pressureText=n=>pressureNumber.format(Math.abs(n)<1e-12?0:n);
  function renderPressureBreakdown(c){
    const b=E.runawayPressureBreakdown(state,c),minute=n=>pressureText(n*60),signedMinute=n=>(n>0?'+':'')+minute(n);
    setText('pressure-summary-'+c.id,'差引 '+signedMinute(b.net)+' / 分');
    if(b.medicalOverride){$('pressure-content-'+c.id).innerHTML='<p class="pressure-caption">死神の宿に滞在中：暴走圧・鎮静圧とすべての倍率を無視し、暴走率 −10% / 分に置換します。</p>';return;}
    const trainingNames={level:'レベル',power:'攻撃',action:'行動',accuracy:'命中',evasion:'回避',vitality:'HP',armor:'防御'};
    const trainingParts=b.trainingLevels.map(t=>trainingNames[t.id]+' '+fullNumber(t.level)).join(' ＋ ');
    const perkRows=b.perkEntries.map(p=>'<div class="'+(!p.enabled||!p.eligible?'pressure-inactive':'')+'"><dt>'+p.name+' <small>'+(!p.eligible?'Lv不足':p.enabled?'ON':'OFF')+'</small></dt><dd>'+minute(p.configured)+(!p.enabled||!p.eligible?' × 0':'')+' ＝ '+minute(p.pressure)+'</dd></div>').join('');
    const calmingRows=b.calmingEntries.map(u=>'<div><dt>'+u.name+'</dt><dd>'+minute(u.perLevel)+(u.source==='perk'?'（部隊効果）':' × Lv.'+fullNumber(u.level))+' ＝ '+minute(u.pressure)+'</dd></div>').join('');
    const status=b.active?(state.paused?'一時停止中・再開時の計算':'部隊参加中'):({collapsed:'暴走ダウン中',down:'戦闘不能',undeployed:'未編成'}[b.inactiveReason]+'：暴走圧は停止、鎮静のみ適用');
    const equation='（'+[b.base,b.training,b.perkPressure,b.temporary].map(minute).join(' ＋ ')+'）× '+pressureText(b.recoveryMultiplier)+' × '+pressureText(b.seedPressureMultiplier)+(b.active?'':' × 0')+' − '+minute(b.calming)+' ＝ 約 '+signedMinute(b.net)+' / 分';
    const html='<p class="pressure-caption">'+status+'<span>単位：暴走率のポイント / 分</span></p>'+
      '<div class="pressure-columns"><section><h4>暴走圧</h4><dl class="pressure-values">'+
      '<div><dt>基礎暴走圧</dt><dd>'+minute(b.base)+'</dd></div>'+
      '<div><dt>育成暴走圧</dt><dd>'+minute(b.trainingScale)+' × log₂(1 ＋ '+fullNumber(b.trainingTotal)+')<br>＝ 約 '+minute(b.training)+'</dd></div></dl>'+
      '<p class="pressure-training">配分済みCP合計：'+trainingParts+' ＝ '+fullNumber(b.trainingTotal)+'<small>未使用CPは含まない</small></p>'+
      '<dl class="pressure-values"><div><dt>パーク合計</dt><dd>'+minute(b.perkPressure)+'</dd></div><div><dt>一時補正</dt><dd>'+minute(b.temporary)+'</dd></div>'+
      '<div><dt>回復型活性</dt><dd>×（1 − '+b.recoveryStacks+'段階 × '+pressureText(b.recoveryReduction)+'）<br>＝ ×'+pressureText(b.recoveryMultiplier)+'</dd></div><div><dt>怠惰の種</dt><dd>発生量 ×'+pressureText(b.seedPressureMultiplier)+'</dd></div>'+
      '<div class="pressure-subtotal"><dt>適用する暴走圧</dt><dd>約 '+minute(b.generated)+'</dd></div></dl></section>'+
      '<section class="pressure-perk-panel"><h4>パークの暴走圧</h4><dl class="pressure-values">'+perkRows+'</dl></section>'+
      '<section class="pressure-calming-panel"><h4>鎮静圧</h4><dl class="pressure-values">'+calmingRows+'<div class="pressure-subtotal"><dt>鎮静圧の合計</dt><dd>'+minute(b.calming)+'</dd></div></dl></section></div>'+
      '<div class="pressure-equation"><strong>（基礎 ＋ 育成 ＋ パーク ＋ 一時補正）× 活性補正 − 鎮静圧</strong><p>'+equation+'</p><small>1秒当たり：約 '+(b.net>0?'+':'')+pressureText(b.net)+' ポイント'+(b.criticalReserve>0?' ／ 臨界余力 '+pressureText(b.criticalReserve)+' が正の増加を先に受け持ちます。':'')+'</small></div>';
    const node=$('pressure-content-'+c.id);if(node.innerHTML!==html)node.innerHTML=html;
  }
  function renderStrengthPreview(c,ctx){
    const enemy=ctx.enemies?.find(e=>e.id===ctx.focusedEnemyId&&e.hp>0)||ctx.enemies?.find(e=>e.hp>0),p=E.attackProfile(ctx,c),hit=E.T.hit(p.accuracy,E.targetEvasion(p,enemy),p.hitLogRatio),damage=E.T.damage({dice:p.dice,flat:p.flat+p.bonus,resultScale:p.resultScale},E.targetDefense(p,enemy),p.damageLogRatio,p.damageScaleLog||0);
    const node=$('strength-preview-'+c.id);const html='<h4>現在の対象への見込み</h4><dl class="strength-target"><div><dt>命中補正</dt><dd>'+signed(hit.correction)+'</dd></div><div><dt>推定命中率</dt><dd>'+((p.autoHitChance+(1-p.autoHitChance)*hit.chance)*100).toFixed(1)+'%</dd></div><div><dt>ダメージ補正</dt><dd>'+signed(damage.correction)+'</dd></div><div><dt>'+(p.apAttack?'行動低下の換算前威力':'通常命中の平均ダメージ')+'</dt><dd>'+(p.hiddenAttack&&!p.apAttack?'？？？':rateFormat(p.areaAttack&&!p.noAreaPenalty?Math.max(1,Math.floor(damage.mean/2)):damage.mean))+'</dd></div></dl>';
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
    return (profile.apAttack?'行動値を低下させる精神攻撃：':'')+text;
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
    $('formula-'+id+'-result').textContent='通常命中の平均 '+rateFormat(match.mean)+(profile.apAttack?'（行動低下の換算前威力）':' ダメージ')+(profile.ignoreDefense?'（防御力・防御強度を無視）':'');
    if(profile.areaAttack)$('formula-'+id+'-result').textContent+=profile.noAreaPenalty?' → 半減せず全体へ適用':' → 半減して全体に適用（各最低1）';
    renderLevelNote(`formula-${id}-note`,profile);
  }
  const blocked = () => readOnly || corruptSave || maintenanceBusy || recoveryBusy;
  const battleHUD=window.YggBattleHUD.create({get:$,setText,format:fullNumber});
  const sceneView=window.YggSceneView.create({get:$,setText,data:D,engine:E,display:UI,money,reducedMotion,blocked,startNextRun,schedule:setTimeout,cancel:clearTimeout});
  const questView=window.YggQuestView.create({get:$,setText,data:D,engine:E,matchup:window.YggMatchup,money,fullNumber,rateFormat,incomeNumber,strengthNumber,blocked,tradeControls,renderTrades,questInputDrafts,
    actualIncome:()=>window.YggActualIncome(),renderEnemyInfoIfOpen:(ctx,id)=>{if(enemyInfoQuestId===id&&$('enemy-info-dialog').open)renderEnemyInfo(ctx,$('enemy-info-content'));}
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
      if(c.placeholder){let actor=document.getElementById(c.id+'-combatant');if(!actor){actor=document.createElement('div');actor.id=c.id+'-combatant';actor.className='combatant cherry-combatant';const button=document.createElement('button');button.id=c.id+'-select';button.className='cherry-placeholder';button.textContent=c.shortName;actor.append(button);$('arena').append(actor);}battleHUD.mount(c,actor,document);continue;}
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
    $('richter-standing').style.setProperty('--richter-sheet', `url("${D.richterVisual.sheet}")`);
    $('richter-standing').style.setProperty('--richter-burst-sheet', `url("${D.richterVisual.burstSheet}")`);
    $('vishunal-standing').style.setProperty('--vishunal-sheet', `url("${D.vishunalVisual.sheet}")`);
    $('tordeliese-standing').style.setProperty('--tordeliese-sheet',`url("${D.tordelieseVisual.sheet}")`);
    D.tordelieseVisual.tendrilFrames.forEach((src,i)=>$('tordeliese-tendrils').style.setProperty(`--tendril-${i}`,`url("${src}")`));
    $('explosions').style.setProperty('--explosion-sheet', `url("${D.richterVisual.explosionSheet}")`);
    $('explosions').style.setProperty('--blast-duration', `${RICHTER_EXPLOSION_MS}ms`);
    $('party-capacity').textContent = `/ ${E.MAX_PARTY_SIZE}`;
    $('manual-formula').innerHTML = formulaPanel('manual', true);
    $('character-picker').innerHTML = charactersByHireCost.map(c=>`<div class="picker-entry"><button id="inspect-${c.id}" type="button" role="tab" aria-controls="card-${c.id}" aria-selected="false" tabindex="-1"><span class="picker-icon" aria-hidden="true">${c.placeholder?`<span>${c.initials}</span>`:c.portraitSheet?`<span class="${c.portraitClass||'vishunal-avatar'} pixel-art" style="background-image:url('${c.portrait}')"></span>`:`<img class="pixel-art" src="${c.portrait}" alt="">`}</span><span class="picker-copy"><span class="picker-name" id="picker-name-${c.id}"></span><span class="picker-level" id="picker-level-${c.id}"></span><span class="picker-hp" id="picker-hp-${c.id}"></span><span class="picker-runaway" id="picker-runaway-${c.id}"></span></span></button><button type="button" class="suppress-button" id="suppress-${c.id}" data-suppress="${c.id}"><span>暴走抑制</span><small id="suppress-cost-${c.id}"></small></button></div>`).join('');
    warmQuest(E.getSession(state));
    $('character-list').innerHTML = charactersByHireCost.map(c => `<article class="character-card compact-character" id="card-${c.id}" role="tabpanel" aria-labelledby="inspect-${c.id}" style="--char-color:${c.color}">
      <button class="character-select" data-select-character="${c.id}" aria-label="${c.name}を手動攻撃に選択" aria-pressed="false" title="クリックで手動攻撃の担当に選択"><span class="avatar ${c.portrait ? 'sprite-avatar' : ''}" aria-hidden="true">${c.portraitSheet ? `<span class="${c.portraitClass||'vishunal-avatar'} pixel-art" style="background-image:url('${c.portrait}')"></span>` : c.portrait ? `<img class="pixel-art" src="${c.portrait}" alt="">` : c.initials}</span><strong class="character-identity" id="identity-${c.id}">${c.name}</strong></button>
      <div class="character-vitals" id="vitals-${c.id}"><span id="health-${c.id}"></span><button class="button secondary revive-button" id="revive-${c.id}" data-revive="${c.id}"></button></div>
      <button class="button secondary ability-open" id="ability-open-${c.id}" data-ability="${c.id}">能力値レベルアップ</button>${abilityDialog(c)}
      <p class="current-attack"><span>攻撃力の現在式</span><strong id="stats-${c.id}"></strong><small class="level-correction-note" id="stats-note-${c.id}" hidden></small></p></article>`).join('');

    questView.build();
    sceneView.mount();
    $('upgrade-list').innerHTML = D.upgrades.map(u => `<article class="upgrade-card"><span class="upgrade-icon" aria-hidden="true">${u.icon}</span><span class="upgrade-level" id="upgrade-level-${u.id}">Lv.0</span><h3>${u.name}</h3><p>${u.label}</p><div class="upgrade-purchase"><button class="button secondary" data-upgrade="${u.id}" aria-label="${u.name}を購入"><span id="upgrade-cost-${u.id}"></span></button></div>${tradeControls('upgrade',u.id,u.max!==1)}</article>`).join('');
  }
  const rangeText=range=>range[0]===range[1]?String(range[0]):range.join('～');
  function perkPanel(c){
    return '<section class="ability-perks" aria-labelledby="perk-title-'+c.id+'"><div class="ability-section-heading"><h3 id="perk-title-'+c.id+'">パーク</h3><span id="perk-summary-'+c.id+'"></span></div><div class="ability-perk-grid">'+(c.perks||[]).map(p=>'<div class="perk" id="perk-'+c.id+'-'+p.id+'"><div><span>'+ (p.common?'共通パーク':p.awakeningLevel?'覚醒Lv.'+p.awakeningLevel:p.initial?'初期パーク':'Lv.'+p.level)+'</span><span class="perk-pressure">暴走圧 '+pressureText((p.runawayPressure||0)*60)+'%/分</span><strong>'+(p.struckPrefix?'<s>'+p.struckPrefix+'</s>':'')+p.name+'</strong><span class="perk-status"></span></div><p>'+(p.awakeningLevel?'【暴走率'+(p.minRunaway??[50,60,70][p.awakeningLevel-1])+'%以上でON】<br>':'')+((p.attackRange||p.effectRange)?'['+(p.attackRange?'攻撃':'付加')+'：'+rangeText(p.attackRange||p.effectRange)+'] ':'')+p.description+'</p><button class="button secondary perk-buy" data-perk-character="'+c.id+'" data-perk="'+p.id+'"></button></div>').join('')+'</div></section>';
  }
  function focusControls(c,track){
    return '<div class="allocation-controls"><button type="button" data-focus="'+c.id+'" data-focus-stat="'+track+'" data-step="-1" aria-label="'+c.name+'の'+D.concentration.find(t=>t.id===track).name+'配分を減らす">−</button><input type="number" min="0" step="1" id="focus-'+track+'-'+c.id+'" data-focus-input="'+c.id+'" data-focus-stat="'+track+'" aria-label="'+c.name+'の'+D.concentration.find(t=>t.id===track).name+'配分"><button type="button" data-focus="'+c.id+'" data-focus-stat="'+track+'" data-step="1" aria-label="'+c.name+'の'+D.concentration.find(t=>t.id===track).name+'配分を増やす">＋</button><small id="focus-bonus-'+track+'-'+c.id+'"></small></div>';
  }
  function abilityDialog(c){
    const rows=window.YggAbilityView.rows({
      baseCell:t=>'<strong id="ability-base-'+t.id+'-'+c.id+'"></strong>'+(t.id==='power'?'<small class="base-attack-range">基本射程 '+(c.id==='waku'?'剣 1 ／ 発砲 2～3':rangeText(c.attackRange))+(c.attackElements?.length?' ／ [攻撃：'+c.attackElements.map(x=>E.elementNames[x]).join('・')+']':'')+'</small>':'')+(c.statFlavor?'<small class="stat-flavor">'+(t.id==='armor'?'防御：'+c.statFlavor.defense+'<br>抵抗：'+c.statFlavor.resistance:c.statFlavor[t.id]||'')+'</small>':''),
      valueCell:t=>'<strong id="ability-value-'+t.id+'-'+c.id+'"></strong>',
      controls:t=>D.concentration.some(x=>x.id===t.id)?focusControls(c,t.id):'',
      hp:'<small class="ability-hp" id="ability-maxhp-'+c.id+'"></small>',
      ss:'<strong id="ability-base-ss-'+c.id+'"></strong>'+(c.statFlavor?'<small class="stat-flavor">'+c.statFlavor.ss+'</small>':'')
    });
    return '<dialog class="ability-dialog" id="ability-dialog-'+c.id+'" aria-labelledby="ability-title-'+c.id+'"><div class="ability-head ability-training-head"><div class="ability-identity"><small>能力・パーク</small><h2 id="ability-title-'+c.id+'">'+c.name+'</h2><strong class="ability-header-level" id="character-level-'+c.id+'"></strong></div><div class="ability-actions"><button class="button secondary" data-hire="'+c.id+'"><span id="hire-label-'+c.id+'">+1</span><small id="hire-cost-'+c.id+'"></small></button>'+tradeControls('level',c.id,true,true).replace('10回購入','+10').replace('1Lv売却','−1')+'</div><button class="button secondary ability-close" data-ability-close="'+c.id+'" aria-label="変更を取り消して閉じる">×</button></div><div class="ability-content"><div class="focus-heading"><div><h3>コンセントレイション</h3><p>未使用CPを配分できます。振り直しは有料です。</p></div><strong id="focus-remaining-'+c.id+'"></strong><button class="button secondary" id="focus-reset-'+c.id+'" data-focus-reset="'+c.id+'">振り直す</button></div><div class="ability-rows">'+rows+'</div>'+(c.magicPower?'<p class="magic-summary" id="magic-summary-'+c.id+'"></p>':'')+'<details class="pressure-breakdown" id="pressure-breakdown-'+c.id+'"><summary>暴走圧・鎮静圧の計算 <span id="pressure-summary-'+c.id+'"></span></summary><div id="pressure-content-'+c.id+'"></div></details>'+perkPanel(c)+'<section class="strength-preview" id="strength-preview-'+c.id+'"></section></div><div class="ability-footer" role="group" aria-label="変更内容の確定"><span id="ability-changes-'+c.id+'"></span><div class="ability-confirm"><p id="ability-factors-'+c.id+'"></p><button class="button" data-ability-confirm="'+c.id+'">確定</button></div></div></dialog>';
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
    if(!sync())return;save();resetCombatVisuals();abilityEdit={id,original:state,cache:new Map(),focusReset:false,returnTab:managerTab,returnCharacter:inspectedCharacter};switchManager("characters");inspectCharacter(id);state=structuredClone(state);controlsKey='';render();$('ability-dialog-'+id).showModal();controlsKey='';render();
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
    if(abilityEdit?.id!==c.id)return;
    const detailKey=JSON.stringify([E.dpsKey(ctx),state.options,blocked(),abilityEdit?.focusReset,state.factors>=E.concentrationResetCost(state,c.id)]);
    if(detailKeys.get(c.id)===detailKey)return;detailKeys.set(c.id,detailKey);
    renderStrengthPreview(c,ctx);
    renderPressureBreakdown(c);
    const dice=spec=>fullNumber(spec.flat)+'＋'+fullNumber(spec.dice)+'D6';
    const support=E.isDeployed(ctx,c.id)?E.activeCharacters(ctx).flatMap(a=>E.perks(ctx,a).filter(p=>p.unlocked)):[];
    const act=E.activation(ctx,c),ownAction=E.ownActionBonus(ctx,c);
    const actionSpec={flat:c.actionDice.flat+act.action+ownAction+support.reduce((n,p)=>n+(p.partyAction||0),0),dice:c.actionDice.dice+act.dice+support.reduce((n,p)=>n+(p.partyActionDice||0),0)};
    const allocation=E.concentration(state,c.id),total=E.concentrationPoints(state,c.id),used=Object.values(allocation).reduce((n,v)=>n+v,0);
    const cpMultipliers=Object.fromEntries(D.concentration.map(t=>[t.id,E.T.focusMultiplier(allocation[t.id],total,t.id)]));
    const values=Object.fromEntries(window.YggAbilityView.tracks.map(t=>[t.id,t.id==='action'?E.actionPower(ctx,c,c.action,true):window.YggAbilityView.strengthLevel(E.strengthValue(state,c,t.id),D.strength,t.id)]));
    if(c.magicPower){const m=E.magicState(ctx,c);setText('magic-summary-'+c.id,'魔力 Lv.'+displayedMagic(ctx,c).current+' / '+m.maximum+' · 攻撃力・命中力 ＋'+(m.current*c.magicPower)+(m.current<m.maximum?' · あと'+(m.maximum-m.current)+'手番詠唱、その次に攻撃':' · 次の行動で攻撃'));}
    setText('ability-maxhp-'+c.id,'最大HP '+fullNumber(E.maxHP(state,c)));
    const base={power:c.hiddenAttack?'？？？':dice({dice:profile.dice,flat:profile.flat+profile.bonus}),action:dice(actionSpec),vitality:fullNumber(c.maxHP),armor:fullNumber(E.armor(ctx,c))+' / '+fullNumber(E.armor(ctx,c,true)),accuracy:dice(E.accuracySpec(ctx,c,false)),evasion:dice(E.evasionSpec(ctx,c))};
    setText('ability-base-ss-'+c.id,dice(c.ss));setText('character-level-'+c.id,'Lv.'+fullNumber(level));
    setText('focus-remaining-'+c.id,'残り '+fullNumber(total-used)+' / '+fullNumber(total)+' CP');
    for(const t of window.YggAbilityView.tracks){
      setText('ability-base-'+t.id+'-'+c.id,base[t.id]);setText('ability-value-'+t.id+'-'+c.id,t.id==='action'?fullNumber(values[t.id]):t.id==='power'?strengthNumber(values[t.id]):incomeNumber(values[t.id]));
      if(!D.concentration.some(x=>x.id===t.id))continue;
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
  function cachedQuote(type,kind,id){
    const key=JSON.stringify([type,kind,id,state.levels,state.questLevels,state.upgrades,state.seedLevels,state.questUnlocks]);
    if(quoteCache.has(key))return quoteCache.get(key);
    const q=type==='buy'?E.purchaseQuote(state,kind,id,10):E.saleQuote(state,kind,id);
    if(quoteCache.size>=64)quoteCache.delete(quoteCache.keys().next().value);quoteCache.set(key,q);return q;
  }
  function renderTrades(kind,id,ten=true,hide=false) {
    $('trade-controls-'+kind+'-'+id).hidden=hide;
    if(ten){const b=$('buy10-'+kind+'-'+id),q=cachedQuote('buy',kind,id);b.disabled=blocked()||!q.valid||state.factors<q.cost;b.querySelector('small').textContent=q.valid?money(q.cost)+' Rd':'購入不可';b.title=q.valid?'10回購入 · '+money(q.cost)+'Rd':'購入不可';b.setAttribute('aria-label',b.title);}
    const b=$('sell-'+kind+'-'+id),q=cachedQuote('sell',kind,id);b.disabled=blocked()||!q.valid;b.querySelector('small').textContent=q.valid?'返還 '+money(q.refund)+' Rd':'売却不可';b.title=q.valid?'1Lv売却 · '+money(q.refund)+'Rd返還':'売却不可';b.setAttribute('aria-label',b.title);
  }
  function handleTrade(event) {
    const button=event.target.closest('[data-trade]');if(!button?.dataset.trade)return false;
    if(button.disabled||blocked())return true;if(!sync())return true;
    const {kind,id,trade}=button.dataset;
    const count=trade==='sell'?Number(button.dataset.count||1):10;
    const ok=trade==='sell'?E.sell(state,kind,id,count):E.buyMany(state,kind,id,10);
    if(ok){if(kind==='quest')questInputDrafts.delete(id);if(kind!=='quest'||!E.questChangePending(state,id))resetCombatVisuals();const c=D.characters.find(c=>c.id===id),u=D.upgrades.find(u=>u.id===id),q=D.sessions.find(q=>q.id===id);
      log(`${c?.name||u?.name||q?.name}：${trade==='sell'?count+'段階売却しました。':'10段階購入しました。'}`);save();render();}
    return true;
  }
  function manualReady(){if(state.viewingMemories||(state.timeline?.manualAttacks?.length||0)>=32)return false;const selected=E.selectedCharacter(state);return selected?E.canAct(state,selected.id)&&!E.isStunned(state,selected.id)&&E.hasReachableTarget(state,selected):true;}
  function displayedMagic(ctx,c){const magic=E.magicState(ctx,c);return {...magic,current:c?.id==='megumin'&&E.isDeployed(state,c.id)&&$('megumin-combatant').classList.contains('spell-casting')?meguminCastMagic:Math.max(0,magic.current-1)};}
  function renderHealth(){
    const contexts=new Map(),turnViews=new Map();
    for(const c of D.characters){
      const h=E.healthOf(state,c.id),runaway=E.runawayOf(state,c.id),hpDown=h.status!=='active',collapsed=runaway.runawayCollapsed,down=hpDown||collapsed;
      const actor=$(c.id+'-combatant'),status=collapsed?'暴走ダウン':h.status==='dying'?'瀕死':hpDown?'気絶':'戦闘可能';
      const hired=state.levels[c.id]>0,maxHP=E.maxHP(state,c);
      const owner=E.formationOwner(state,c.id);
      if(!contexts.has(owner))contexts.set(owner,owner?E.battleContext(state,owner):state);
      const ctx=contexts.get(owner);
      if(!turnViews.has(owner))turnViews.set(owner,E.timelineView(ctx,0));
      const turn=turnViews.get(owner).units.find(u=>u.key==='a:'+c.id),action=turn?.weight??E.actionPower(ctx,c,c.action,true)*(h.turnSlowSeconds>0?1-h.turnSlowRate:1),share=turn?.share||0;
      if(managerTab==='characters'){
      setText('picker-hp-'+c.id,hired?'HP '+fullNumber(h.hp)+' / '+fullNumber(maxHP):'未雇用');
      setText('picker-runaway-'+c.id,hired?'暴走 '+fullNumber(runaway.runawayRate)+'%'+(runaway.runawayCollapsed?'・暴走ダウン':''):'');
      }
      actor.classList.toggle('downed',down);actor.classList.toggle('stunned',E.isStunned(state,c.id));actor.classList.toggle('charging',!E.getSession(ctx).medical&&!down&&!E.isStunned(state,c.id)&&E.magicState(ctx,c).current>0);
      if(c.id==='megumin'){
        const magic=actor.classList.contains('spell-casting')?meguminCastMagic:down||E.isStunned(state,c.id)?0:E.magicState(ctx,c).current;
        for(const [i,ring] of Array.from($('megumin-charge-axis').children).entries())ring.hidden=E.getSession(ctx).medical||i>=magic;
      }
      const selector=$(c.id+'-select');
      selector.setAttribute('aria-label',c.name+(collapsed?'：暴走ダウン中':hpDown?'の復活バーストを選択':'を手動攻撃に選択'));
      selector.title=collapsed?'暴走率100%未満で復帰。仲間タブの暴走抑制や因子安定化で鎮静できます。':hpDown?'クリックして復活バーストを選択':'クリックして手動攻撃の担当にする';
      if(down)actor.classList.remove('attacking','bursting','spell-casting');
      if(managerTab==='characters'){
      const quote=E.suppressionQuote(state,c.id),suppress=$('suppress-'+c.id);
      suppress.hidden=!hired;suppress.disabled=blocked()||!!abilityEdit||!quote.valid||state.factors<quote.cost;
      setText('suppress-cost-'+c.id,money(quote.cost)+' Rd');suppress.setAttribute('aria-label',c.name+'の暴走率を10抑制 · '+money(quote.cost)+'Rd');
      }
      battleHUD.render(c.id,{row:E.formationRow(state,c.id),waiting:!E.getSession(ctx).medical&&!down&&!E.hasReachableTarget(ctx,c),hp:h.hp,maxHP,actionValue:action,turnShare:share,runawayRate:runaway.runawayRate,status:[down?status:E.isStunned(state,c.id)?'スタン '+h.stunTurns+'R':'',runaway.runawaySymptom?symptomName(runaway.runawaySymptom):'',h.turnSlowSeconds>0?'行動低下 '+Math.round(h.turnSlowRate*100)+'%':'' ].filter(Boolean).join(' · '),deployed:E.isDeployed(state,c.id),magic:c.magicPower?displayedMagic(ctx,c):null});
      if(managerTab==='characters'&&inspectedCharacter===c.id||abilityEdit?.id===c.id){
      const ev=E.evasionSpec(ctx,c),ss=E.evasionSpec(ctx,c,true);
      $('vitals-'+c.id).hidden=!state.levels[c.id];
      setText('health-'+c.id,'HP '+fullNumber(h.hp)+' / '+fullNumber(maxHP)+' · 防御 '+E.armor(ctx,c)+' / 抵抗 '+E.armor(ctx,c,true)+' · 行動 '+rateFormat(action)+' · 理論手番 '+(share*100).toFixed(1)+'%'+' · 命中 '+E.accuracySpec(ctx,c,false).flat+'＋'+E.accuracySpec(ctx,c,false).dice+'D6 '+' · 回避 '+ev.flat+'＋'+ev.dice+'D6 · SS '+ss.flat+'＋'+ss.dice+'D6'+(down?' · '+status+(collapsed?'（暴走率100%未満で復帰）':'（全回復で復帰）'):E.isStunned(state,c.id)?' · スタン '+h.stunTurns+'R':'')+(c.magicPower?' · 魔力 Lv.'+displayedMagic(ctx,c).current+' / '+E.magicState(ctx,c).maximum:'')+(c.id==='jewel'?' · 所持因子 '+money(state.factors)+'Rd'+(ctx.rainbowTurns?' · 虹の装甲 '+ctx.rainbowTurns+'R':''):''));
      const revive=$('revive-'+c.id);revive.hidden=!hpDown;
      if(hpDown){const cost=E.revivalCost(state,c.id);revive.disabled=blocked()||!Number.isFinite(cost)||state.factors<cost;setText('revive-'+c.id,'復活バースト · '+(Number.isFinite(cost)?money(cost)+'Rd':'計算範囲外'));}
      }
      if(managerTab==='characters')$('inspect-'+c.id).classList.toggle('downed',down);
    }
    if(managerTab==='characters'){const all=E.suppressionQuote(state);$('suppress-all').disabled=blocked()||!!abilityEdit||!all.valid||state.factors<all.cost;
    setText('suppress-all-cost',money(all.cost)+' Rd');setText('suppression-party',E.getSession(state).enemy+'の部隊');
    }
    renderPomBombs();
    const enemies=E.ensureEnemies(state),enemyTurns=E.timelineView(state,0);
    for(const id of shownPoison.keys())if(!enemies.some(e=>e.id===id))shownPoison.delete(id);
    for(let i=0;i<3;i++){
      const node=$(i?'enemy-next-'+i:'enemy-art'),e=enemies[i],bar=node.querySelector('.enemy-health');
      let flame=node.querySelector('.cherry-burning');if(!flame){flame=document.createElement('span');flame.className='cherry-burning cherry-fire-sprite';flame.setAttribute('aria-hidden','true');node.append(flame);}
      flame.hidden=!(e?.burnDamage&&e.hp>0&&!e.respawnSeconds)||state.options.hitEffects==='off';flame.style.animationPlayState=state.paused||blocked()||document.hidden?'paused':'running';
      const max=e?E.enemyMaxHP(state,e):1;
      const duo=!!E.getSession(state).members&&!E.getSession(state).independentRespawns;
      node.classList.toggle('duo-down',duo&&e?.hp<=0);
      node.classList.toggle('enemy-absent',!duo&&!!e?.respawnSeconds&&!pendingEnemyDefeats.has(e.id));
      if(e?.kind==='kogumo')node.hidden=(e.hp<=0&&!pendingEnemyDefeats.has(e.id))||pendingCloudBirths.has(e.id);
      node.classList.toggle('focused-enemy',!!e&&state.focusedEnemyId===e.id);
      const button=node.querySelector('.enemy-target');
      if(button){button.disabled=!e||e.hp<=0||!!e.respawnSeconds||blocked();button.setAttribute('aria-pressed',String(!!e&&state.focusedEnemyId===e.id));}
      if(e&&!playback.pending)shownPoison.set(e.id,e.poisonDamage);
      if(bar){bar.hidden=!e;if(e){const text=e.respawnSeconds?(duo?(enemies.some(x=>x.hp>0)?'ダウン': '起き上がるまで '+e.respawnSeconds.toFixed(1)+'秒'):'再出現 '+e.respawnSeconds.toFixed(1)+'秒'):(duo?E.enemySpec(state,e).enemy+' · ':'')+'HP '+window.YggBattleHUD.hpPercent(e.hp,max)+' · '+(e.pendingAttack?'準備中':'理論 '+((enemyTurns.units.find(u=>u.key==='e:'+e.id)?.share||0)*100).toFixed(1)+'%');if(bar.textContent!==text)bar.textContent=text;bar.style.setProperty('--hp-ratio',e.hp/max*100+'%');}}
      const conditions=node.querySelector('.enemy-status');
      if(conditions){
        const labels=!e||e.hp<=0||e.respawnSeconds?[]:[
          (shownPoison.get(e.id)??e.poisonDamage)?'猛毒':'',
          e.summonDelaySeconds>0?'召喚待機 '+e.summonDelaySeconds.toFixed(1)+'秒':'',
          e.wardSeconds>0?'防御＋5 '+e.wardSeconds.toFixed(1)+'秒':'',
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
  function stopEnemyAttack(id,immediate=false){
    const visual=enemyAttackVisuals.get(id);if(!visual)return;
    if(visual.node.classList.contains('enemy-absorbing'))$('arena').classList.remove('clouds-sucking');
    if(visual.node.dataset.attackKind==='discharge')for(const node of Array.from($('arena').children))if(node.classList.contains('plant-charge'))node.remove();
    delete visual.node.dataset.duoAttack;delete visual.node.dataset.attackKind;visual.node.classList.remove('enemy-attacking','enemy-absorbing');if(visual.soul?.dataset?.duoEffect)window.YggDuoView.finish(visual.soul,immediate);else visual.soul?.remove();enemyAttackVisuals.delete(id);
  }
  function startEnemyAttack(e){
    if(document.hidden||reducedMotion.matches||state.paused)return;
    if(e.kind==='absorb'&&!E.livingEnemies(state).some(x=>x.kind==='kogumo'))return;
    const node=$(e.targetSlot?'enemy-next-'+e.targetSlot:'enemy-art');
    if(node.dataset.enemyId!==String(e.enemyId))return;
    stopEnemyAttack(e.enemyId,true);
    const elapsed=e.duration-(e.remaining??e.duration);
    node.style.setProperty('--enemy-attack-duration',e.duration+'s');node.style.setProperty('--enemy-attack-delay',-elapsed+'s');
    node.classList.toggle('enemy-absorbing',e.kind==='absorb');
    node.dataset.attackKind=e.kind||'attack';
    if(e.kind==='discharge'&&state.sessionId==='electric-rat')deferVisual(()=>{if(node.dataset.attackKind==='discharge')showPlantElectricity('charge',e.targetSlot,e.remaining??e.duration);},0);
    node.classList.add('enemy-attacking');restartAnimation(node.firstElementChild,node.classList.contains('electric-rat')?'electric-rat-attack':'enemy-attack-frames');
    let soul=null;
    if(node.classList.contains('duo-combatant')){const area=['boulder','blizzard'].includes(e.kind),targets=area?E.enemyTargetCandidates(state,E.ensureEnemies(state)[e.targetSlot]):D.characters.filter(c=>c.id===e.targetId);soul=window.YggDuoView.attack(node,e,$('arena'),targets.map(c=>$(c.id+'-combatant')).filter(Boolean));}
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
    if(state.sessionId==='electric-rat'&&['discharge','thunderstrike','electric-shock','thunder-wave'].includes(e.kind))deferVisual(()=>{
      const visual=enemyAttackVisuals.get(e.enemyId);
      if(visual?.node===node&&node.dataset.attackKind===e.kind)visual.soul=showRatElectricity(e);
    },0);
  }
  let receivedFloatSequence=0;
  function showEnemyAttack(e){
    stopEnemyAttack(e.enemyId);
    if(!E.isDeployed(state,e.targetId)||document.hidden)return;
    const actor=$(e.targetId+'-combatant'),text=document.createElement('span');text.className='damage-float ally-damage';text.textContent=e.hit&&e.elementMultiplier===0?'無効':e.hit?(e.apDamage?'行動 −'+e.damage+'%':e.fightingSpirit?'闘志 · HP1':(e.elementMultiplier>1?'弱点 ':'')+(e.badLuck?'悪運 ':'')+'−'+e.damage):e.nullified?'無効':'回避';
    if(e.hit){const bonuses=[e.doubleHit?'倍差命中':'',e.smashCritical?'スマッシュクリティカル'+(e.smashCritical>1?' ×'+e.smashCritical:''):''].filter(Boolean);if(bonuses.length){const detail=document.createElement('small');detail.textContent=bonuses.join(' / ');text.append(detail);}}
    const lane=receivedFloatSequence++%3-1,head=parseFloat(actor.style.getPropertyValue('--head-offset'))||112;
    text.style.left=(actor.offsetLeft+lane*24)+'px';text.style.top=(actor.offsetTop-head-8-Math.abs(lane)*12)+'px';
    text.style.setProperty('--float-drift',lane*20+'px');text.style.setProperty('--float-rise','-65px');
    if(state.options.showDamageNumbers){while($('damage-floats').children.length>=FX.MAX_STEPS)$('damage-floats').firstElementChild.remove();$('damage-floats').append(text);deferVisual(()=>text.remove(),1150);}
    if(e.hit&&!e.source&&!reducedMotion.matches&&state.sessionId==='ozmorn')cloudImpact(actor,e.apDamage);
    if(e.hit&&!reducedMotion.matches){actor.classList.add('ally-hit');deferVisual(()=>actor.classList.remove('ally-hit'),180);}
    if(e.source){setText('last-roll',D.characters.find(c=>c.id===e.targetId).name+'：'+(e.source==='misfire'?'暴発':'暴走')+' '+e.damage+'ダメージ');return;}
    setText('last-roll',(e.enemyName||E.getSession(state).enemy)+' → '+D.characters.find(c=>c.id===e.targetId).name+(e.mental?' / 精神攻撃 SS ':' / 命中 ')+e.accuracy.total+(e.accuracyReroll?'（逆転）':'')+' 対 '+(e.mental?'SS回避 ':'回避 ')+e.evasion.total+(e.evasionReroll?'（リテイク）':'')+'：'+(e.hit?(e.apDamage?'行動 −'+e.damage+'%':e.damage+' ダメージ'):e.nullified?'無効':'回避'));
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
    setText('revive-hint',h.status==='active'?'すでに復帰しています。':state.factors<cost?'因子が不足しています。自然回復でもHP満タンになると復帰します。':'雇用費＋現在の育成投資額の5%。');
  }
  function openRevivalDialog(id){revivalTarget=id;renderRevivalDialog();$('revive-dialog').showModal();}
  function renderBattleHUD() {
    renderHealth();
    changeVisualRate(E.battleSpeed(state));
    $('battle-speed').hidden=!BATTLE_SPEED_ENABLED;$('battle-speed').disabled=!BATTLE_SPEED_ENABLED;
    setText('battle-speed',E.battleSpeed(state)===2?'倍速 ×2':'倍速');$('battle-speed').setAttribute('aria-pressed',String(E.battleSpeed(state)===2));
    renderTurnOrder();
    const session = E.getSession(state), hp = E.isWaiting(state)?0:state.hp,focused=E.ensureEnemies(state).find(e=>e.id===state.focusedEnemyId)||E.ensureEnemies(state).find(e=>e.hp>0),displayMax=E.enemyMaxHP(state,focused);
    const waiting=E.isWaiting(state);
    $('arena').classList.toggle('is-respawning',waiting);
    $('respawn-notice').hidden=!waiting;
    if(waiting)setText('respawn-notice',(E.getSession(state).reviveInPlace?'起き上がるまで ':'再出現まで ')+state.respawnSeconds.toFixed(1)+' 秒');
    $('attack').disabled=!!E.getSession(state).medical||blocked()||state.paused||waiting||!manualReady()||E.isResting(state);
    if(managerTab==='quests')questView.renderLive(state);
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
  function renderActualIncome(){
    const income=window.YggActualIncome();
    setText('income-rate',incomeNumber(income.rate));
    setText('income-context','直近'+(incomeWindow/60)+'分 / 計測 '+Math.floor(income.elapsed)+'秒');
    renderFactorRain(income.rate);
    if(managerTab==='stats'){
      setText('income-formula',D.sessions.filter(q=>E.isQuestUnlocked(state,q.id)).map(q=>q.name+'：'+incomeNumber(income.quests[q.id]?.rate||0)+'Rd/秒').join(' ／ '));
      setText('income-condition','実獲得額 ÷ 計測時間。支出・返金は対象外。無収入時間も含みます。放置復帰・読み込み後は再計測（1秒単位）。DPSは1手／秒換算の比較用理論値です（演出時間を含みません）。');
    }
  }
  function render(scheduled=false) {
    if(document.hidden)return;renderScheduled=scheduled;
    $('sins-open').hidden=(state.runNumber||1)<2;
    $('karma-income').hidden=(state.runNumber||1)<2;
    const karmaText='罪業 '+fullNumber(state.sinTotal||0)+'：因子獲得量 ×'+E.sinIncomeMultiplier(state).toLocaleString('ja-JP',{maximumFractionDigits:2})+'（＋'+fullNumber(state.sinTotal||0)+'%）';
    setText('karma-income',karmaText);setText('sin-income',karmaText);
    if(renderSinShop())return;
    const now=Date.now();if(scheduled&&now-lastScheduledRender<200)return;lastScheduledRender=now;
    E.refreshQuestUnlocks(state);E.refreshPerkUnlocks(state);
    renderBattleHUD();
    sceneView.render(state,E.getSession(state));
    if(scheduled&&now-lastControlsRender<500)return;lastControlsRender=now;
    // Action-clock fractions and visual HP do not change cards, formulas or prices.
    const forecastSignature=JSON.stringify(D.sessions.filter(q=>E.formationIds(state,q.id).length).map(q=>{const ctx=E.battleContext(state,q.id);return E.dpsKey(ctx);}));
    const key = JSON.stringify([forecastSignature,managerTab,inspectedCharacter,abilityEdit?.id,state.factors, state.sessionId, state.viewingMemories, state.memoriesUnlocked, state.selectedCharacterId,
      state.formations,state.formationRows,state.rainbowTurns,state.focusedEnemyId,state.enemies?.map(e=>[e.id,e.evasionPenaltyTurns]),D.characters.map(c=>E.healthOf(state,c.id).status),Math.ceil(state.respawnSeconds||0),state.levels, state.upgrades, state.purchasedPerks,state.perkEnabled,D.characters.map(c=>[Math.floor(E.runawayOf(state,c.id).runawayRate),E.runawayOf(state,c.id).runawaySymptom,E.runawayOf(state,c.id).runawayCollapsed,E.runawayOf(state,c.id).baseRunawayPressure,E.runawayOf(state,c.id).temporaryRunawayPressure,E.runawayOf(state,c.id).criticalReserve]), state.questLevels,state.questUnlocks,state.concentration,
      state.questActiveLevels, state.paused, state.options, blocked()]);
    renderActualIncome();
    if(managerTab==='quests')for(const q of D.sessions)if(E.isQuestUnlocked(state,q.id))setText('quest-income-'+q.id,'実収益 '+incomeNumber(window.YggActualIncome().quests[q.id]?.rate||0)+'Rd/秒');
    if (key === controlsKey) return;
    controlsKey = key;
    const session = E.getSession(state);warmQuest(session);
    if(summaryKey!==forecastSignature||!summaryValues){summaryValues={dps:E.totalDps(state)};summaryKey=forecastSignature;}
    $('dps').textContent = rateFormat(summaryValues.dps);
    const income = window.YggActualIncome();
    income.sessions=D.sessions.filter(q=>E.formationIds(state,q.id).length||income.quests[q.id]).map(q=>({...q,factorsPerSecond:income.quests[q.id]?.rate||0}));
    income.factorsPerSecond=income.rate;
    $('party-count').textContent = D.characters.filter(c=>E.formationOwner(state,c.id)).length;
    setText('party-capacity','人 / '+income.sessions.length+'セッション');
    renderEnemy(session);
    $('battle-area').textContent = session.area;
    $('session-code').textContent = state.viewingMemories?'追憶':`SESSION ${session.code} / ${session.name} / Lv.${fullNumber(session.level)}`;
    $('session-description').textContent = session.description;
    $('enemy-rules').textContent = session.members?session.members.map(m=>m.name+'：防御'+m.defense+' / 抵抗'+m.resistance).join(' · '):`防御 ${E.enemyDefense(session)} / 属性：${(session.traits || []).map(t => D.enemyTraits[t] || t).join('・') || 'なし'}`;
    $('reward').textContent = session.independentRespawns?`◇ ${money(E.incomeAmount(state,E.reward(state)))}Rd / バッドアス ${money(E.incomeAmount(state,E.reward(state,E.enemySpec(state,{kind:'electric-rat'}))))}Rd`:`◇ ${money(E.incomeAmount(state,E.reward(state)))}Rd`;
    const selected = E.selectedCharacter(state);
    $('manual-actor').textContent = `手動攻撃：${selected ? selected.name : 'あなた'}`;
    $('select-self').hidden = !selected;
    $('select-self').disabled = blocked();
    const magic=E.magicState(state,selected),actionLabel=magic.current<magic.maximum?'詠唱する':'攻撃する';
    setText('attack-action',actionLabel);$('attack').setAttribute('aria-label', `${selected ? selected.name : 'あなた'}で${actionLabel}`);
    const manualProfile = E.attackProfile(state, selected, true);
    $('click-formula').textContent = attackFormula(manualProfile);
    renderLevelNote('click-level-note',manualProfile);
    if(managerTab==='stats')renderFormula('manual', manualProfile);
    $('loop-status').textContent = blocked() ? '● 待機中' : state.paused ? 'Ⅱ 全体一時停止' : E.isWaiting(state)?'● 再出現待ち' : '● 自動周回';
    $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', state.paused ? '全セッションの周回を再開' : '全セッションの周回を一時停止');
    $('pause').disabled = blocked();
    $('attack').disabled = !!E.getSession(state).medical || blocked() || state.paused || E.isWaiting(state) || !manualReady()||E.isResting(state);
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
      setText('picker-level-'+c.id,'Lv.'+fullNumber(level));
      $('picker-level-'+c.id).title='Lv.'+level.toLocaleString('ja-JP');
      $('inspect-'+c.id).classList.toggle('obscured',obscured);
      $('inspect-'+c.id).setAttribute('aria-label',obscured?`未公開の仲間・${money(cost)}Rdの詳細`:`${c.name} Lv.${level.toLocaleString('ja-JP')}の詳細`);
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
      if(!(managerTab==='characters'&&inspectedCharacter===c.id)&&abilityEdit?.id!==c.id)continue;
      const assignedQuest=E.formationOwner(state,c.id),characterState=assignedQuest?E.battleContext(state,assignedQuest):state;
      const characterSession=E.getSession(characterState),profileKey=E.dpsKey(characterState),prior=detailKeys.get('profile-'+c.id);
      const profile=prior?.key===profileKey?prior.value:E.attackProfile(characterState,c);detailKeys.set('profile-'+c.id,{key:profileKey,value:profile});
      $('stats-' + c.id).textContent = attackFormula(profile);
      renderLevelNote('stats-note-'+c.id,profile);
      renderAbility(c,characterState,profile);
      if(abilityEdit?.id!==c.id)continue;
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
    if(managerTab==='quests'||formationQuestId||enemyInfoQuestId)questView.render(state);
    for (const u of managerTab==='upgrades'?D.upgrades:[]) {
      const maxed = u.max != null && state.upgrades[u.id] >= u.max, cost=E.upgradeCost(state,u);
      $('upgrade-level-' + u.id).textContent = u.max === 1 ? (maxed ? '解放済' : '未解放') : `Lv.${state.upgrades[u.id]}`;
      renderTrades('upgrade',u.id,u.max!==1);
      $('upgrade-cost-' + u.id).textContent = maxed ? (u.max === 1 ? '解放済' : 'MAX') : Number.isFinite(cost)?`購入 · ◇ ${money(cost)}Rd`:'計算範囲外';
      document.querySelector(`[data-upgrade="${u.id}"]`).disabled = blocked() || maxed || !Number.isFinite(cost) || !Number.isSafeInteger(state.upgrades[u.id]+1) || state.factors < cost;
    }
    renderMeta();
    const richter = D.characters.find(c => c.id === 'richter'), hired = E.isDeployed(state,'richter');
    if ($('arena').classList.contains('has-richter') !== hired) combatGeometry = null;
    $('arena').classList.toggle('has-richter', hired);
    $('richter-combatant').hidden = !hired;
    $('richter-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('richter-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'richter');
    $('richter-select').disabled = blocked() || !hired;
    $('richter-select').setAttribute('aria-pressed', state.selectedCharacterId === 'richter');
    renderVishunal();
    renderTordeliese();renderMax();renderWaku();renderJewel();renderMitsuru();renderQueen();renderMegumin();$('cherry-combatant').hidden=!E.isDeployed(state,'cherry');$('cherry-select').textContent='';$('cherry-combatant').classList.toggle('is-paused',state.paused||blocked()||document.hidden);$('hit-effects').classList.toggle('cherry-paused',state.paused||blocked()||document.hidden);$('cherry-select').disabled=blocked()||!E.isDeployed(state,'cherry');
    renderBattleLayout();
    for(const [id,key] of Object.entries(displayControls)){
      const control=$(id);
      if(key==='simplifiedNumbers')control.value=state.options[key]?(state.options.numberUnit||'western'):'normal';
      else if(key==='hitEffects')control.value=state.options[key];
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
  let turnOrderKey='';
  function renderTurnOrder(){
    const node=$('turn-order'),status=state.paused?'手番停止中':E.isResting(state)?'自動休憩中':E.isWaiting(state)?'再出現待ち':'';
    const order=status?[]:E.timelineView(state,5).order;
    const key=state.sessionId+'|'+status+'|'+order.map(u=>u.key).join(',');
    if(key===turnOrderKey)return;turnOrderKey=key;
    node.replaceChildren();
    const label=document.createElement('span');label.className='turn-order-label';label.textContent=status||(order.length?'次の手番（理論）':'行動可能なユニットなし');node.append(label);
    const q=E.getSession(state),enemies=E.ensureEnemies(state);
    order.forEach((u,index)=>{
      const ally=u.key.startsWith('a:'),c=ally?D.characters.find(c=>'a:'+c.id===u.key):null,e=ally?null:enemies.find(e=>'e:'+e.id===u.key);
      const appearance=ally?null:enemyAppearances.get(e?.id)||(q.members?q.members.find(m=>m.id===e?.kind):e?.kind==='kogumo'?q.summon:q);
      const icon=document.createElement('span');icon.className='turn-order-icon '+(ally?'turn-ally':'turn-enemy');icon.setAttribute('role','img');
      const title=(index+1)+'手目：'+u.name+'（'+(ally?'味方':'敵')+'）';icon.setAttribute('aria-label',title);icon.title=title;
      const art=document.createElement('span');art.className='turn-order-art pixel-art';
      const source=c?.portrait||appearance?.sheet||appearance?.image;
      if(source){art.style.backgroundImage='url("'+source+'")';art.style.backgroundSize=((c?.portraitSheet?4:appearance?.sheet?(appearance.spriteFrames||4):1)*100)+'% '+(c?.portraitSheet?200:e?.kind==='chikira'?1024/262*100:e?.kind==='eggra'?1024/280*100:100)+'%';}else art.textContent=u.name.slice(0,2);
      icon.append(art);const number=document.createElement('small');number.textContent=String(index+1);icon.append(number);node.append(icon);
    });
  }
  function setEnemyAppearance(node, appearance, role) {
    node.setAttribute('role','img');
    node.setAttribute('aria-label',role+appearance.name);
    node.classList.toggle('animated-enemy',!!appearance.sheet);
    node.classList.toggle('pixel-art',!!appearance.sheet);
    node.classList.toggle('electric-rat',appearance.id==='electric-rat');
    node.classList.toggle('electro-rat',appearance.spriteKind==='electro-rat');
    const source=appearance.sheet||appearance.image||'';
    node.classList.toggle('enemy-placeholder',!source);
    node.dataset.placeholderName=source?'':appearance.name;
    node.dataset.defeatStyle=appearance.defeatStyle||'';
    if(appearance.defeatSheet)node.dataset.defeatSheet=appearance.defeatSheet;
    else delete node.dataset.defeatSheet;
    if(node.dataset.appearance===source)return;
    node.dataset.appearance=source;
    let sprite=node.querySelector('.enemy-sprite');
    if(!sprite){sprite=document.createElement('span');sprite.className='enemy-sprite';sprite.setAttribute('aria-hidden','true');node.prepend(sprite);}
    sprite.style.setProperty('--enemy-image',source?'url("'+source+'")':'none');
    sprite.style.setProperty('--enemy-attack-image',appearance.attackSheet?'url("'+appearance.attackSheet+'")':'none');
    sprite.style.setProperty('--enemy-wave-image',appearance.waveSheet?'url("'+appearance.waveSheet+'")':'none');
    sprite.style.setProperty('--enemy-defeat-image',appearance.defeatSheet?'url("'+appearance.defeatSheet+'")':'none');
    sprite.style.setProperty('--enemy-absorb-image',appearance.absorbSheet?'url("'+appearance.absorbSheet+'")':'none');
    sprite.style.setProperty('--foot-shift',((211-(appearance.footY??211))/224*100)+'%');
  }
  function renderEnemy(session) {
    sceneView.render(state,session);$('arena').classList.toggle('medical-room',!!session.medical);if(session.medical)setText('enemy-name',session.enemy);$('enemy-name').hidden=!!session.variants;
    const enemies=E.ensureEnemies(state),variants=session.variants||[],formation=session.summons?session.traits.includes('swarm'):enemies.length>1;
    if(enemyVariantSession!==session.id){enemyVariantSession=session.id;enemyAppearances.clear();}
    const used=new Set(enemies.map(e=>enemyAppearances.get(e.id)?.variant).filter(v=>v!=null));
    for(const [i,e]of enemies.entries()){
      if(!enemyAppearances.has(e.id)){
        const choices=variants.map((_,i)=>i).filter(i=>!used.has(i)),index=choices.length?choices[Math.floor(Math.random()*choices.length)]:0;
        const appearance=session.members?session.members.find(m=>m.id===e.kind):e.kind==='kogumo'?session.summon:variants[index]||{...session,name:session.enemy};enemyAppearances.set(e.id,{...appearance,variant:index});used.add(index);
      }
      const node=$(i?'enemy-next-'+i:'enemy-art');node.hidden=e.kind==='kogumo'&&((e.hp<=0&&!pendingEnemyDefeats.has(e.id))||pendingCloudBirths.has(e.id));node.classList.toggle('cloud-boss',!!session.summons&&!i);node.classList.toggle('cloud-minion',e.kind==='kogumo');if(node.dataset.enemyId!==String(e.id)){for(const [id,v]of enemyAttackVisuals)if(v.node===node)stopEnemyAttack(id);}node.dataset.enemyId=String(e.id);
      setEnemyAppearance(node,enemyAppearances.get(e.id),'');
      const canvasMember=!!session.members&&['chikira','eggra'].includes(e.kind);
      node.classList.toggle('duo-combatant',canvasMember);
      if(canvasMember)window.YggDuoView.mount(node,e.kind);else node.querySelector('canvas')?.remove();
      node.setAttribute('role','group');
      let button=node.querySelector('.enemy-target');
      if(!button){button=document.createElement('button');button.type='button';button.className='enemy-target';node.append(button);
        button.addEventListener('click',()=>{if(blocked())return;if(!sync())return;const current=E.ensureEnemies(state)[i];if(current&&state.focusedEnemyId===current.id){enemyInfoQuestId=state.sessionId;setText('enemy-info-quest',E.getSession(state).name);renderEnemyInfo(state,$('enemy-info-content'));if(!$('enemy-info-dialog').open)$('enemy-info-dialog').showModal();return;}if(current&&E.selectEnemy(state,current.id)){save();render();}});}
      button.hidden=!formation||e.hp<=0;button.setAttribute('aria-label',enemyAppearances.get(e.id).name+'（'+(i+1)+'体目）を集中狙い');
      if(!node.querySelector('.enemy-status')){const label=document.createElement('span');label.className='enemy-status';label.hidden=true;node.append(label);}
      if(!node.querySelector('.enemy-health')){const bar=document.createElement('span');bar.className='enemy-health';node.append(bar);}
      if(!i)setText('enemy-name',session.members?session.enemy:enemyAppearances.get(e.id).name);
    }
    // Keep a small history for in-flight defeat snapshots, never an unbounded cache.
    while(enemyAppearances.size>256)enemyAppearances.delete(enemyAppearances.keys().next().value);
    for(let i=enemies.length;i<3;i++)$(i?'enemy-next-'+i:'enemy-art').hidden=true;
    $('arena').classList.toggle('cloud-battle',!!session.summons);
    $('arena').classList.toggle('mohican-line',formation);enemyMotionState();renderHealth();
  }
  function renderBattleLayout(width = arenaViewportWidth) {
    arenaViewportWidth = width || $('arena-viewport').clientWidth || 300;
    const options = {metaScale:E.weaponScale(state,'meta'),richterScale:E.weaponScale(state,'richter'),metaCount:0,richterCount:0,
      formationRows:state.formationRows,groundFraction:E.getSession(state).groundFraction||.66,availableHeight:window.matchMedia('(min-width:900px) and (min-height:500px)').matches?$('arena-viewport').clientHeight:null,
      metaHired:E.isDeployed(state,'meta'),richterHired:E.isDeployed(state,'richter'),vishunalHired:E.isDeployed(state,'vishunal'),tordelieseHired:E.isDeployed(state,'tordeliese'),maxHired:E.isDeployed(state,'max'),wakuHired:E.isDeployed(state,'waku'),jewelHired:E.isDeployed(state,'jewel'),mitsuruHired:E.isDeployed(state,'mitsuru'),queenHired:E.isDeployed(state,'queen'),cherryHired:E.isDeployed(state,'cherry'),meguminHired:E.isDeployed(state,'megumin'),enemyCount:E.getSession(state).summons?3:UI.enemyFormationSize(E.getSession(state)),enemyScale:E.getSession(state).enemyScale||1,formationLayout:E.getSession(state).formationLayout,grounded:true,width:arenaViewportWidth,mobile:window.matchMedia('(max-width:600px)').matches};
    const key = JSON.stringify(options);
    if (key === battleLayoutKey) return;
    battleLayoutKey = key;
    const layout = UI.orbitLayout(options), arena = $('arena'), viewport = $('arena-viewport');
    if(E.getSession(state).medical){const ids=E.formationIds(state),spots=ids.length<=3?[[.14,.87],[.34,.88],[.54,.87]]:[[.13,.65],[.34,.65],[.55,.65],[.21,.89],[.46,.89]];ids.forEach((id,i)=>{const p=layout[id];if(p){p.x=layout.width*spots[i][0];p.y=layout.height*spots[i][1]-(p.footOffset||0)-(p.hoverHeight||0);}});}
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
    for(let i=0;i<3;i++){
      const actor=$(i?'enemy-next-'+i:'enemy-art'),scale=layout.enemyScales?.[i]||1;
      actor.style.setProperty('--enemy-width',layout.enemyWidth*scale+'px');
      actor.style.setProperty('--enemy-height',layout.enemyHeight*scale+'px');
      actor.style.setProperty('--enemy-foot',(layout.enemyFoot||0)*scale+'px');
    }
    layout.reserves.forEach((p,i)=>{arena.style.setProperty(`--reserve-${i+1}-x`,`${p.x}px`);arena.style.setProperty(`--reserve-${i+1}-y`,`${p.y}px`);});
    for (const id of ['meta','richter']) {
      const placement = layout[id], actor = $(`${id}-combatant`);
      actor.style.left = `${placement.x}px`; actor.style.top = `${placement.y}px`;
      actor.style.setProperty('--body-foot', `${placement.footOffset || 0}px`);
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
    const cherry=layout.cherry;if(cherry){const a=$('cherry-combatant');a.style.left=cherry.x+'px';a.style.top=cherry.y+'px';a.style.setProperty('--body-foot',cherry.footOffset+'px');}
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
    actor.classList.add('spell-casting','attacking');actor.classList.remove('bursting');renderHealth();
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
  function animateMaxAttack(count,volleyCount=count,summarized=false,projectileCount=count,targetSlot=0,manual=false) {
    if(!E.canAct(state,'max')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('max-combatant'),now=performance.now(),burst=count>1||volleyCount>1||now-lastMaxShot<280;
    lastMaxShot=now;cancelVisual(maxAttackTimer);
    if(burst){actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{actor.classList.add('attacking');restartAnimation($('max-standing'),'max-throw');maxAttackTimer=deferVisual(()=>actor.classList.remove('attacking'),1180);}
    const layer=$('max-tubs'),g=targetedGeometry(targetSlot),groups=FX.projectileGroups(projectileCount,24-layer.children.length,summarized),windup=!manual&&burst?80:670;
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
  function renderMeta() {
    $('meta-combatant').classList.toggle('unhired', !state.levels.meta);
    $('meta-combatant').hidden = !E.isDeployed(state,'meta');
    $('meta-combatant').classList.toggle('is-paused', state.paused || blocked());
    $('meta-select').disabled = blocked() || !E.isDeployed(state,'meta');
    $('meta-select').setAttribute('aria-pressed', state.selectedCharacterId === 'meta');
    $('meta-combatant').classList.toggle('manual-selected', state.selectedCharacterId === 'meta');
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
    const id=++visualSequence,t={callback,remaining:milliseconds,started:performance.now()};t.timer=setTimeout(()=>{visualTimers.delete(id);callback();},milliseconds/visualRate);visualTimers.set(id,t);return id;
  }
  function cancelVisual(id) { const t=visualTimers.get(id);if(t)clearTimeout(t.timer);visualTimers.delete(id); }
  function continuousBurst(actor) { return false; }
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
      cancelVisual(metaAttackTimer);
    } else if (now - lastMetaAttack >= 650) {
      lastMetaAttack = now;
      $('meta-combatant').classList.add('attacking');
      cancelVisual(metaAttackTimer);
      metaAttackTimer = deferVisual(() => $('meta-combatant').classList.remove('attacking'), 620);
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
  function animateRichterAttack(count, volleyCount = count, summarized = false, targetSlot=0,manual=false,pomAssisted=false) {
    if (!E.canAct(state,'richter') || reducedMotion.matches || document.hidden) return;
    const combatant = $('richter-combatant'), layer = $('richter-projectiles');
    const now = performance.now(), burst = pomAssisted || volleyCount > 1 || now - lastRichterShot < 280;
    lastRichterShot = now;
    if (burst || combatant.classList.contains('bursting')) {
      combatant.classList.remove('attacking'); combatant.classList.add('bursting');
    } else {
      combatant.classList.add('attacking');
      restartAnimation($('richter-standing'), 'richter-frames');
      restartAnimation(combatant.querySelector('.meta-body'), 'meta-lunge');
    }
    cancelVisual(richterAttackTimer);
    const throwDelay = !manual&&combatant.classList.contains('bursting') ? 80 : 200;
    if (!combatant.classList.contains('bursting')) {
      richterAttackTimer = deferVisual(() => combatant.classList.remove('attacking'), 620);
    }
    hidePomsForAttack(Math.max(620,throwDelay+FX.PROJECTILE_FLIGHT_MS+80));
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
  function animateVishunalAttack(count,volleyCount=count,summarized=false,targetSlot=0,manual=false) {
    if(!E.canAct(state,'vishunal')||reducedMotion.matches||document.hidden)return 0;
    const actor=$('vishunal-combatant'),layer=$('vishunal-projectiles'),now=performance.now();
    const burst=volleyCount>1||now-lastVishunalShot<280;lastVishunalShot=now;
    if(burst||actor.classList.contains('bursting')){if(!actor.classList.contains('bursting'))vishunalMotionStarted=now;actor.classList.remove('attacking');actor.classList.add('bursting');}
    else{vishunalMotionStarted=now;actor.classList.add('attacking');restartAnimation($('vishunal-standing'),'vishunal-fire');}
    cancelVisual(vishunalAttackTimer);
    const delay=!manual&&actor.classList.contains('bursting')?80:200;
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
    for(const node of Array.from($('arena').children))if(node.classList.contains('plant-electricity'))node.remove();
    for(const id of ['mitsuru','waku','tordeliese'])$(id+'-combatant').classList.remove('range-motion');
    for(const c of D.characters)$('ally-rolls-'+c.id).replaceChildren();
    playback.reset();shownPoison.clear();pendingCloudBirths.clear();pendingEnemyDefeats.clear();
    for(const id of enemyAttackVisuals.keys())stopEnemyAttack(id,true);
    for(const n of Array.from($('arena').children))if(n.classList.contains('duo-impact-fade'))n.remove();
    $('enemy-effects').replaceChildren();
    if (battleRender !== null) cancelAnimationFrame(battleRender); battleRender = null;
    for (const t of visualTimers.values()) clearTimeout(t.timer); visualTimers.clear();
    pomVisibleCount=Infinity;pomRefillTimer=pomSecondTimer=null;renderPomBombs();
    cherryAttackTimer=null;$('cherry-combatant').classList.remove('attacking');
    cancelVisual(metaAttackTimer);
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
    if(E.getSession(state).reviveInPlace){pendingEnemyDefeats.delete(frame.enemyId);renderHealth();return;}
    const layer = $('enemy-defeats');
    while (layer.children.length >= FX.MAX_STEPS * 2) layer.firstElementChild.remove();
    const target=$(frame.targetSlot?'enemy-next-'+frame.targetSlot:'enemy-art'),ghost=target.cloneNode(true);
    const position=readCombatGeometry().enemySlots[frame.targetSlot||0];ghost.style.left=position.x+'px';ghost.style.top=position.y+'px';
    const previous=enemyAppearances.get(frame.enemyId);if(previous)setEnemyAppearance(ghost,previous,'');
    ghost.querySelector('.cherry-burning')?.remove();ghost.querySelector('.enemy-status')?.remove();ghost.querySelector('.enemy-health')?.remove();ghost.querySelector('.enemy-target')?.remove();ghost.classList.remove('enemy-absent','focused-enemy','enemy-attacking','enemy-absorbing','cloud-emerging');ghost.hidden=false;
    ghost.removeAttribute('id'); ghost.removeAttribute('aria-label'); ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('enemy-defeat'); ghost.dataset.clearCount = frame.clears;
    ghost.dataset.reason = frame.knockouts === frame.clears ? 'knockout' : 'hp';
    ghost.dataset.fallDirection = motion.fallDirection;
    ghost.dataset.impactId = visualHitId;
    const hasDefeatSheet = !!ghost.dataset.defeatSheet;
    const groundedDefeat=['kneel','dissolve'].includes(ghost.dataset.defeatStyle);
    const ratDefeat=ghost.classList.contains('electric-rat')||ghost.classList.contains('electro-rat');
    const fallMs = ratDefeat ? 320 : groundedDefeat ? 1100 : motion.fallMs + (hasDefeatSheet ? 240 : 0);
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
  let cherryAttackTimer=null;
  function cherryFlame(x,y,size=100,destination=null){
    if(document.hidden||reducedMotion.matches||state.options.hitEffects==='off')return;
    const layer=$('hit-effects');while(layer.children.length>=32)layer.firstElementChild.remove();
    const node=document.createElement('span'),sprite=document.createElement('span');node.className='cherry-flame'+(destination?' cherry-projectile':'');sprite.className='cherry-fire-sprite';node.setAttribute('aria-hidden','true');
    node.style.left=x+'px';node.style.top=y+'px';node.style.width=node.style.height=size+'px';
    if(destination){node.style.setProperty('--fire-x',(destination.x-x)+'px');node.style.setProperty('--fire-y',(destination.y-y)+'px');}
    node.append(sprite);layer.append(node);deferVisual(()=>node.remove(),destination?330:600);
  }
  function cherryBlazarActive(frame){return frame.actorId==='cherry'&&!['VOLCANO','DISSATISFACTION'].includes(frame.actor)&&E.perks(state,D.characters.find(c=>c.id==='cherry')).some(p=>p.id==='blazar'&&p.unlocked)&&E.inRange([1,3],frame.distance||1);}
  function cherryBlazar(target){
    if(document.hidden||reducedMotion.matches||state.options.hitEffects==='off')return;
    const layer=$('hit-effects');
    const old=layer.querySelectorAll('.cherry-blazar');if(old.length>=6)old[0].remove();
    const node=document.createElement('span');node.className='cherry-blazar';node.setAttribute('aria-hidden','true');node.style.left=target.x+'px';node.style.top=target.y+'px';
    node.style.setProperty('--comet-size',Math.min(440,$('arena').offsetWidth*.7)+'px');
    for(const name of ['halo','echo far','echo near','comet','impact','ring outer','ring inner']){const part=document.createElement('span');part.className='blazar-'+name;node.append(part);}
    const flame=document.createElement('span');flame.className='blazar-bloom';const sprite=document.createElement('span');sprite.className='cherry-fire-sprite';flame.append(sprite);node.append(flame);
    for(let i=0;i<16;i++){const ember=document.createElement('i'),angle=(i*137.508-90)*Math.PI/180,radius=70+(i%5)*23;ember.className='blazar-ember';ember.style.setProperty('--ember-x',Math.cos(angle)*radius+'px');ember.style.setProperty('--ember-y',(Math.sin(angle)*radius*.6-35)+'px');ember.style.setProperty('--ember-delay',(300+i%4*18)+'ms');ember.style.setProperty('--ember-size',(3+i%3*2)+'px');node.append(ember);}
    layer.append(node);deferVisual(()=>node.remove(),1200);
  }
  function animateCherryAttack(frame){
    const actor=$('cherry-combatant');if(actor.classList.contains('downed')||reducedMotion.matches||document.hidden)return 0;
    // Area hits share one casting gesture; the flame remains a separate object.
    if(!actor.classList.contains('attacking')){actor.classList.add('attacking');cancelVisual(cherryAttackTimer);cherryAttackTimer=deferVisual(()=>{actor.classList.remove('attacking');cherryAttackTimer=null;},640);}
    const x=actor.offsetLeft+45,y=actor.offsetTop-12,target=readCombatGeometry().enemySlots[frame.targetSlot||0];
    deferVisual(()=>{if(!actor.classList.contains('downed')){cherryFlame(x,y,60);if(target){if(cherryBlazarActive(frame))cherryBlazar(target);else cherryFlame(x,y,100,target);}}},160);
    return 480;
  }
  function showLaunch(frame) {
    $('arena').classList.add('combat-playing');
    if (displayedHP === null && Number.isFinite(frame.hpBefore)) displayedHP = frame.hpBefore;
    const meta = frame.metaAttacks ? animateMetaAttack(frame.metaAttacks,frame.volleyMetaCount,frame.approximate,frame.targetSlot||0) : 0;
    const richter = frame.richterAttacks ? animateRichterAttack(frame.richterAttacks,frame.volleyRichterCount,frame.approximate,frame.targetSlot||0,frame.manualLaunch,frame.pomAssisted||frame.pomDice>0) : 0;
    const cherry=frame.actorId==='cherry'&&!['VOLCANO','DISSATISFACTION'].includes(frame.actor)?animateCherryAttack(frame):0;
    const vishunal=frame.vishunalAttacks?animateVishunalAttack(frame.vishunalAttacks,frame.volleyVishunalCount,frame.approximate,frame.targetSlot||0,frame.manualLaunch):0;
    const tordeliese=frame.tordelieseAttacks?animateTordelieseAttack(frame.tordelieseAttacks,frame.volleyTordelieseCount,frame.approximate,frame.targetSlot||0,frame.motion):0;
    const mitsuru=frame.mitsuruAttacks?animateMitsuruAttack(frame.mitsuruAttacks,frame.volleyMitsuruCount,frame.targetSlot||0,frame.hit,frame.motion):0;
    const queen=frame.queenAttacks?animateQueenAttack(frame.queenAttacks,frame.volleyQueenCount,frame.targetSlot||0,frame.hit):0;
    const megumin=frame.meguminAttacks?animateMeguminAttack(frame.meguminAttacks,frame.volleyMeguminCount,frame.targetSlot||0,frame.hit,frame.magicLevel):0;
    const jewel=frame.jewelAttacks?animateJewelAttack(frame.jewelAttacks,frame.volleyJewelCount):0;
    const waku=frame.wakuAttacks?animateWakuAttack(frame.wakuAttacks,frame.volleyWakuCount,frame.approximate,frame.targetSlot||0,frame.motion):0;
    const maxActions=(frame.maxAttacks||0)+(frame.maxTransfers||0);
    const max=maxActions?animateMaxAttack(maxActions,frame.volleyMaxCount,frame.approximate,frame.maxAttacks||0,frame.targetSlot||0,frame.manualLaunch):0;
    const continuation = frame.continuation ? (continuousBurst(frame.actorId||'richter') ? 80 : 200) : 0;
    return {meta,richter,vishunal,tordeliese,max,waku,jewel,mitsuru,queen,megumin,impact:frame.poisonTick?FX.PROJECTILE_FLIGHT_MS:Math.max(cherry,frame.meguminAttacks?720:0,frame.queenAttacks?380:0,frame.mitsuruAttacks?380:0,frame.jewelAttacks?260:0,frame.maxAttacks?max+320:0,frame.tordelieseAttacks?tordeliese:0,(frame.metaAttacks||frame.richterAttacks||frame.vishunalAttacks||frame.wakuAttacks||frame.continuation||!frame.actorId)?Math.max(meta||0,richter||0,vishunal||0,waku||0,continuation)+FX.PROJECTILE_FLIGHT_MS:0)};
  }
  function showImpact(frame) {
    if(frame.summons?.length)for(const e of frame.summons)showCloudCreation(e);
    if(frame.poisonAfter!==undefined)shownPoison.set(frame.enemyId,frame.poisonAfter);
    if(frame.supportOnly)return;
    const impactTarget=$(frame.targetSlot?'enemy-next-'+frame.targetSlot:'enemy-art'),position=readCombatGeometry().enemySlots[frame.targetSlot||0],impactX=position.x,impactY=position.y;
    if(frame.hit!==false&&!['VOLCANO','DISSATISFACTION'].includes(frame.actor)&&(frame.actorId==='cherry'||frame.actor==='炎上'))cherryFlame(impactX,impactY,cherryBlazarActive(frame)?260:frame.actor==='VOLCANO'?180:110);
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
      if(frame.actor==='炎上')floating.classList.add('burn-damage');
      floating.style.left=impactX+'px';floating.style.top=impactY+'px';floating.dataset.attackCount = frame.count;
      floating.dataset.impactId = visualHitId;
      if(state.options.showDamageNumbers)floating.textContent = frame.hit===false?'MISS':frame.elementMultiplier===0?'無効':`${frame.elementMultiplier>1?'弱点 ':''}${frame.apDamage?'行動 −':frame.poisonTick?'猛毒 ':frame.actor==='炎上'?'炎上 ':''}${frame.approximate ? '合計 ' : ''}${format(frame.damage)}${frame.apDamage?'%':''}`;
      floating.style.marginLeft = `${motion.x+(frame.actor==='炎上'?48:0)}px`; floating.style.marginTop = `${motion.y-(frame.poisonTick?84:frame.actor==='炎上'?44:0)}px`;
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
    $('last-roll').textContent = `${frame.actor} / ${frame.hit===false?'MISS':frame.elementMultiplier===0?'無効':(frame.elementMultiplier>1?'弱点 ':'')+format(frame.damage)+(frame.apDamage?'% 行動低下':' DMG')}${frame.continuation ? '・全体攻撃' : ''}${frame.count > 1 ? `・${format(frame.count)}${frame.continuation ? '体' : '回'}（合計）` : ''}${frame.knockoutRoll ? ` / 気絶判定${frame.knockoutRoll}：${frame.knockedOut ? '気絶' : '回避'}` : ''}`;
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
  // Four-frame raster effects keep their aspect ratio; only compact sparks travel.
  function electricSprite(layer,kind,x,y,size,delay=0,travel=null,duration=.55,fullHeight=null){
    const carrier=document.createElement('span');carrier.className='electric-sprite-carrier';
    carrier.style.left=x+'px';carrier.style.top=y+'px';carrier.style.setProperty('--fx-delay',delay+'s');carrier.style.setProperty('--fx-duration',duration+'s');
    if(travel){carrier.classList.add('electric-travel');carrier.style.setProperty('--fx-x',travel.x-x+'px');carrier.style.setProperty('--fx-y',travel.y-y+'px');}
    const sprite=document.createElement('span');sprite.className='electric-sprite fx-'+kind;
    sprite.style.width=size+'px';sprite.style.height=(fullHeight?fullHeight*1.3:size*.75)+'px';if(fullHeight)carrier.style.top=fullHeight/2+'px';carrier.append(sprite);layer.append(carrier);
  }
  function ratEffectOrigin(slot=0){
    const p=readCombatGeometry().enemySlots[slot],actor=$(slot?'enemy-next-'+slot:'enemy-art');
    return actor.classList.contains('electric-rat')?{x:p.x+actor.offsetWidth*.12,y:p.y+actor.offsetHeight*.2}:p;
  }
  function reactorEffectOrigin(){
    const arena=$('arena'),viewport=$('arena-viewport'),a=arena.getBoundingClientRect(),v=viewport.getBoundingClientRect();
    const scale=a.width/arena.clientWidth||1,cover=Math.max(viewport.clientWidth/1536,viewport.clientHeight/1024);
    return {x:(v.left+viewport.clientWidth/2+(999-768)*cover-a.left)/scale,y:(v.top+viewport.clientHeight/2+(342-512)*cover-a.top)/scale,cover:cover/scale};
  }
  function showRatElectricity(e){
    if(document.hidden||reducedMotion.matches||state.paused)return null;
    const arena=$('arena'),source=ratEffectOrigin(e.targetSlot||0),node=document.createElement('span');
    node.className='rat-electricity';node.dataset.kind=e.kind;node.setAttribute('aria-hidden','true');
    const seconds=Math.max(.1,e.remaining??e.duration),enemy=E.ensureEnemies(state)[e.targetSlot||0];
    const targets=e.kind==='discharge'?E.enemyTargetCandidates(state,enemy):D.characters.filter(c=>c.id===e.targetId);
    if(e.kind!=='discharge')electricSprite(node,e.kind,source.x,source.y,e.kind==='discharge'?210:130,0,null,seconds);if(e.kind!=='discharge')node.lastElementChild.classList.add('rat-aura');
    if(e.kind==='discharge')for(const [slot,rat]of E.ensureEnemies(state).entries()){
      if(rat.hp<=0||rat.respawnSeconds)continue;
      const actor=$(slot?'enemy-next-'+slot:'enemy-art'),p=ratEffectOrigin(slot);
      electricSprite(node,'discharge',p.x,p.y,actor.offsetWidth*.95,0,null,seconds);
      node.lastElementChild.classList.add('rat-aura');
    }
    for(const c of targets){
      const actor=$(c.id+'-combatant');if(!actor||actor.hidden)continue;
      const target={x:actor.offsetLeft,y:actor.offsetTop};
      electricSprite(node,e.kind==='thunder-wave'?'thunder-wave':'electric-shock',source.x,source.y,e.kind==='thunder-wave'?110:75,0,target,seconds*.7);
      electricSprite(node,e.kind,target.x,target.y,e.kind==='thunderstrike'?200:e.kind==='discharge'?150:115,seconds*.55,null,seconds*.45,e.kind==='thunderstrike'?arena.clientHeight:null);
    }
    arena.append(node);return node;
  }
  function showPlantElectricity(phase,slot=0,seconds=.9){
    if(document.hidden||reducedMotion.matches||state.paused||state.sessionId!=='electric-rat')return;
    const arena=$('arena');for(const previous of Array.from(arena.children))if(previous.classList.contains('plant-electricity'))previous.remove();
    const source=ratEffectOrigin(slot),core=reactorEffectOrigin(),cover=core.cover;
    const node=document.createElement('span');node.className='plant-electricity '+(phase==='charge'?'plant-charge':'plant-field');node.setAttribute('aria-hidden','true');
    if(phase==='charge')electricSprite(node,'electric-shock',source.x,source.y,90,0,core,seconds);
    else{
      electricSprite(node,'discharge',core.x,core.y,320*cover,0,null,seconds);
      for(const [i,f]of [.18,.5,.85].entries()){
        const target={x:arena.clientWidth*f,y:arena.clientHeight*.76};
        electricSprite(node,'electric-shock',core.x,core.y,110,.08+i*.04,target,.4);
        electricSprite(node,'discharge',target.x,target.y,240,.4+i*.04,null,.4);
      }
    }
    arena.append(node);deferVisual(()=>node.remove(),Math.max(.1,seconds)*1000);
  }
  let pomVisibleCount=Infinity,pomRefillTimer=null,pomSecondTimer=null;
  function hidePomsForAttack(duration=700){
    cancelVisual(pomRefillTimer);cancelVisual(pomSecondTimer);
    pomVisibleCount=0;renderPomBombs();
    pomRefillTimer=deferVisual(()=>{
      pomVisibleCount=1;renderPomBombs();
      pomSecondTimer=deferVisual(()=>{pomVisibleCount=Infinity;renderPomBombs();},220);
    },duration);
  }
  function pomPosition(i,count){
    const actor=$('richter-combatant'),head=parseFloat(actor.style.getPropertyValue('--head-offset'))||112;
    return {x:actor.offsetLeft+(i-(count-1)/2)*56,y:actor.offsetTop-head-34};
  }
  function renderPomBombs(){let layer=$('pom-bombs');if(!layer){layer=document.createElement('div');layer.id='pom-bombs';elements.set('pom-bombs',layer);$('arena').append(layer);}const bombs=E.pomUnits(state),key=JSON.stringify(bombs);if(layer.dataset.units!==key){layer.dataset.units=key;layer.replaceChildren();for(const b of bombs){const n=document.createElement('button');n.type='button';n.className='pom-unit';n.setAttribute('aria-label','ポムポムボムのステータスを表示');n.setAttribute('aria-haspopup','dialog');n.addEventListener('click',()=>{const current=E.pomUnits(state).find(p=>p.id===b.id);if(!current||n.hidden)return;const rows=[['HP',fullNumber(current.hp)+' / '+fullNumber(current.maxHP)],['攻撃力',current.dice+'D6＋'+current.flat],['回避力','10＋0D6'],['回避強度',fullNumber(Math.floor(current.power))],['SS','10＋0D6'],['防御 / 抵抗','0 / 0'],['行動','手番なし']];$('pom-info-content').innerHTML='<dl class="quest-values">'+rows.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('')+'</dl><p>単体攻撃の対象外。全体攻撃には巻き込まれます。</p><p>表示はクリック時点の能力です。</p>';$('pom-info-dialog').showModal();});n.dataset.id=b.id;const img=document.createElement('span');img.className='pom-idle-sprite';img.style.backgroundImage='url("'+D.richterVisual.idleSheet+'")';img.setAttribute('role','img');img.setAttribute('aria-label','ポムポムボム');const hp=document.createElement('small');hp.textContent='HP '+Math.round(b.hp/b.maxHP*100)+'%';n.title='ポムポムボム：HP '+b.hp+'/'+b.maxHP+'・攻撃 '+b.dice+'D6＋'+b.flat;n.append(img,hp);layer.append(n);}}const actor=$('richter-combatant');for(const [i,n]of Array.from(layer.children).entries()){const p=pomPosition(i,bombs.length);n.style.left=p.x+'px';n.style.top=p.y+'px';n.hidden=i>=pomVisibleCount;n.querySelector('.pom-idle-sprite').style.animationPlayState=state.paused||blocked()||document.hidden?'paused':'running';n.style.setProperty('--pom-delay',(-i*.65)+'s');}}
  function cherrySpread(kind,targetSlot=0){
    if(document.hidden||reducedMotion.matches||state.options.hitEffects==='off')return;
    const layer=$('hit-effects'),groups=Array.from(layer.children).filter(n=>n.classList.contains('cherry-spread'));
    while(groups.length>=4)groups.shift().remove();
    const group=document.createElement('div');group.className='cherry-spread '+(kind==='VOLCANO'?'volcano':'dissatisfaction');group.dataset.skill=kind;group.setAttribute('aria-hidden','true');layer.append(group);
    const caster=$('cherry-combatant'),launch={x:caster.offsetLeft+45,y:caster.offsetTop-12},targets=[];
    const impact=readCombatGeometry().enemySlots[targetSlot]||readCombatGeometry().enemySlots[0],origin={x:impact.x,y:impact.y,id:'impact'};
    for(const c of D.characters){const actor=$(c.id+'-combatant');if(E.isDeployed(state,c.id)&&!actor.hidden)targets.push({x:actor.offsetLeft,y:actor.offsetTop+(parseFloat(actor.style.getPropertyValue('--body-foot'))||60),id:c.id});}
    const geometry=readCombatGeometry();for(const [i,e] of E.ensureEnemies(state).entries()){if(e.respawnSeconds)continue;const p=geometry.enemySlots[i];if(p)targets.push({x:p.x,y:p.y+60,id:e.id});}
    for(const [i,b]of E.pomUnits(state).entries()){targets.push({...pomPosition(i,E.pomUnits(state).length),id:b.id});}
    targets.sort((a,b)=>Math.abs(a.x-origin.x)-Math.abs(b.x-origin.x));
    const add=(className,p,size,delay,target)=>{const carrier=document.createElement('span'),sprite=document.createElement('span');carrier.className=className;carrier.dataset.target=p.id||'cherry';carrier.style.left=p.x+'px';carrier.style.top=p.y+'px';carrier.style.setProperty('--spread-delay',delay+'s');if(size){carrier.style.width=size+'px';carrier.style.height=size+'px';}if(target){carrier.style.setProperty('--fire-x',(target.x-p.x)+'px');carrier.style.setProperty('--fire-y',(target.y-p.y)+'px');}sprite.className='cherry-fire-sprite';carrier.append(sprite);group.append(carrier);};
    add('cherry-spread-travel cherry-spread-initial',launch,130,0,origin);
    add('cherry-spread-flame cherry-spread-burst',origin,220,.38);
    targets.forEach((p,i)=>{const delay=.55+i*.055;
      add('cherry-spread-travel',{...origin,id:p.id},kind==='VOLCANO'?75:115,delay,p);
      add('cherry-spread-flame',p,0,delay+.32);
      if(kind==='VOLCANO'&&state.options.hitEffects!=='simple')for(const side of [-1,1])add('cherry-spread-flame',{...p,x:p.x+side*30},80,delay+.4);
    });
    deferVisual(()=>group.remove(),2100+targets.length*55);
  }
  function showEvents(events, automatic = false) {
    changeVisualRate(E.battleSpeed(state));
    if(state.viewingMemories)return;
    const otherClears=events.filter(e=>e.type==='clear'&&e.sessionId&&e.sessionId!==state.sessionId);
    if(otherClears.length)log('別セッションで '+fullNumber(otherClears.reduce((n,e)=>n+(e.count||1),0))+'周。因子 +'+money(otherClears.reduce((n,e)=>n+e.reward,0))+'Rd');
    events=events.filter(e=>!e.sessionId||e.sessionId===state.sessionId);
    if(events.some(e=>e.type==='timelineTurn'&&e.actorId==='richter')&&!document.hidden&&!reducedMotion.matches)hidePomsForAttack(FX.turnDuration(events)===.25?250:700);
    const fireSkills=new Set(events.map(e=>e.actor||e.source).filter(name=>['VOLCANO','DISSATISFACTION'].includes(name)));for(const kind of fireSkills){const impact=events.find(e=>e.actor===kind&&Number.isInteger(e.targetSlot));cherrySpread(kind,impact?.targetSlot||0);}
    for(const launch of events.filter(e=>e.type==='manualLaunch'&&!e.charging))if(!document.hidden&&!reducedMotion.matches){
      const frame=FX.plan([{...launch,type:'attack',manualLaunch:true}])[0];if(!frame)continue;
      deferVisual(()=>{if(!playback.pending&&!(state.timeline?.manualAttacks?.length)){displayedHP=null;$('arena').classList.remove('combat-playing');requestBattleRender();}},FX.manualImpactSeconds(frame.actorId,frame.motion)*1000+1000);
      const timing=showLaunch(frame);for(const c of D.characters)if(frame[c.id+'Attacks'])deferVisual(()=>{if(!(state.timeline?.manualAttacks||[]).some(p=>p.actorId===c.id))finishBurst(c.id);},Math.max(timing[c.id]||0,FX.manualImpactSeconds(c.id,frame.motion)*1000)+100);
    }
    events=events.filter(e=>e.type!=='manualLaunch');
    if(FX.turnDuration(events)===.25){
      const turn=events.find(e=>e.type==='timelineTurn'),actor=turn?.actorId&&$(turn.actorId+'-combatant');
      if(actor){actor.classList.add('status-turn');deferVisual(()=>actor.classList.remove('status-turn'),250);}
    }
    if(!document.hidden&&!reducedMotion.matches)for(const event of events)if(event.type==='clear'||event.type==='enemyRemoved')pendingEnemyDefeats.add(event.enemyId);
    for(const event of events){
      if(event.type==='queenIntercept'){animateQueenAttack(1,1,event.targetSlot,event.hit);if(event.hit)log('クイーン：「この無礼者」 — 攻撃を中断させた');}
      else if(event.type==='enemyCharmEnd')stopEnemyAttack(event.enemyId);
      else if(event.type==='enemyCharm'){setText('last-roll',event.kind==='ward'?'防御のおまじない：防御＋5（10秒）':event.success?'蘇生のおまじない：チキーラがHP50%で復活':'蘇生のおまじない：失敗');renderEnemy(E.getSession(state));}
      else if(event.type==='enemyWindup')startEnemyAttack(event);
      else if(event.type==='enemyAttack')showEnemyAttack(event);
      else if(event.type==='electricField')showPlantElectricity('field',event.targetSlot);
      else if(event.type==='enemyAbsorb')showCloudAbsorb(event);
      else if(event.type==='enemySummon'){if(event.created&&!document.hidden&&!reducedMotion.matches)pendingCloudBirths.add(event.enemyId);}
      else if(event.type==='enemyRemoved')renderEnemy(E.getSession(state));
      else if(event.type==='runawayDamage')showEnemyAttack({...event,hit:true,mental:true});
      else if(event.type==='runawayThreshold')log(D.characters.find(c=>c.id===event.actorId).name+'：暴走率'+event.threshold+'%');
      else if(event.type==='runawaySymptom'){showRunawayResult(event,symptomName(event.symptom));log(D.characters.find(c=>c.id===event.actorId).name+'：'+symptomName(event.symptom));}
      else if(event.type==='runawayRoll')showRunawayResult(event,{selfDamage:'自傷',rise:'高揚',chain:'連鎖',control:'自制',misfire:'暴発',criticalRecovery:'臨界回復'}[event.outcome]);
      else if(event.type==='perkIncome')log(event.perk+'：因子 +'+money(event.amount)+'Rd');
      else if(event.type==='enemyCancel')stopEnemyAttack(event.enemyId,true);
      else if(event.type==='enemyRespawn'){renderEnemy(E.getSession(state));if(E.getSession(state).reviveInPlace){const n=$(event.targetSlot?'enemy-next-'+event.targetSlot:'enemy-art');n.dataset.riseUntil=String(performance.now()+650);}}
      else if(event.type==='enemyDown')renderHealth();
    }
    for(const event of events)if(event.type==='attack'&&event.poisonBefore!==undefined&&!shownPoison.has(event.enemyId))shownPoison.set(event.enemyId,event.poisonBefore);
    const attacks = events.filter(e => e.type === 'attack'), clears = events.filter(e => e.type === 'clear');
    if ((attacks.length || events.some(e=>e.type==='support')) && !document.hidden && !reducedMotion.matches) {const immediate=events.filter(e=>e.manualImpact),deferred=events.filter(e=>!e.manualImpact);for(const frame of FX.plan(immediate))showImpact(frame);if(immediate.length)deferVisual(()=>{if(!playback.pending){displayedHP=null;pendingEnemyDefeats.clear();$('arena').classList.remove('combat-playing');requestBattleRender();}},200);playback.enqueue(deferred,{sustainedActors:automatic ? ['meta','richter','vishunal','tordeliese','max','waku','jewel','mitsuru','queen','megumin'].filter(continuousBurst) : []});}
    else if (attacks.length) {
      const last = attacks[attacks.length - 1];
      const totalAttacks = attacks.reduce((sum, e) => sum + (e.count || 1), 0);
      const totalDamage = attacks.reduce((sum, e) => sum + (e.apDamage?0:e.damage), 0);
      const totalAP = Math.max(0,...attacks.filter(e=>e.apDamage).map(e=>e.damage));
      const results = [attacks.some(e=>!e.apDamage)?`${format(totalDamage)} DMG`:null,attacks.some(e=>e.apDamage)?`最大${format(totalAP)}% 行動低下`:null].filter(Boolean).join(' / ');
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
  function renderSinShop(){
    const dialog=$('sin-shop');
    if(!state.dreamShop&&!sinInspection){if(dialog.open)dialog.close();return false;}
    const inspecting=!state.dreamShop;dialog.classList.toggle('sin-inspection',inspecting);dialog.setAttribute('aria-label',inspecting?'大罪の補正':'大罪の購入');
    $('sin-finish').hidden=inspecting;$('sin-reset').hidden=inspecting;$('sin-close').hidden=!inspecting;
    setText('sin-total',fullNumber(state.sinTotal));setText('sin-balance',fullNumber(state.sinBalance));setText('sin-gain','+'+fullNumber(state.dreamGain));
    for(const id of Object.keys(D.seedSystem.effects)){
      const level=state.seedLevels[id]||0,cost=E.seedCost(state,id),button=$('sin-buy-'+id);
      setText('sin-level-'+id,'Lv.'+level);
      const names={pride:'傲慢',vanity:'虚栄',envy:'嫉妬',wrath:'憤怒',sloth:'怠惰',greed:'強欲',gluttony:'暴食',lust:'愛欲'};
      const label=names[id]+' Lv.'+level+' — '+(Number.isFinite(cost)?fullNumber(cost)+'大罪でレベルを上げる':'上限');
      button.title=inspecting?names[id]+' Lv.'+level:label+' ／ ホイール上：購入・下：今回の購入を1Lv撤回';button.setAttribute('aria-label',button.title);
      const effect=id==='sloth'?.95**level:id==='greed'?1+.2*level:E.seedMultiplier(state,id);
      setText('sin-effect-'+id,'現在 ×'+(effect<.01?effect.toExponential(2):effect.toLocaleString('ja-JP',{maximumFractionDigits:3})));
      button.disabled=inspecting||blocked()||!Number.isFinite(cost)||state.sinBalance<cost;
    }
    $('sin-finish').disabled=blocked();$('sin-reset').disabled=blocked()||!Object.keys(state.dreamPurchases||{}).length;
    if(!dialog.open)dialog.showModal();return !!state.dreamShop;
  }
  function persistDream(next){
    next.savedAt=Date.now();const result=storage?S.persist(storage,next):{ok:false,error:'保存できないため夢を進められません。'};
    if(!result.ok){notice(result.error,true);setText('sin-message',result.error);return false;}
    state=next;lastTime=lastSave=Date.now();storageError=false;controlsKey='';return true;
  }
  function startNextRun(){
    if(blocked()||abilityEdit)return false;
    const next=structuredClone(state);if(!E.beginDream(next)||!persistDream(next))return false;
    resetCombatVisuals();incomeHistory.reset(Date.now());render();return true;
  }
  function finishNextRun(){
    if(blocked()||abilityEdit)return false;
    const next=E.nextRun(state,Date.now());if(!next)return false;
    // Persist the complete replacement before releasing the previous in-memory run.
    const result=storage?S.persist(storage,next):{ok:false,error:'保存できないため周回を開始できません。'};
    if(!result.ok){notice(result.error,true);if(state.dreamShop)setText('sin-message',result.error);return false;}
    state=next;lastTime=lastSave=Date.now();storageError=false;
    questInputDrafts.clear();formationQuestId=null;formationDraft=[];revivalTarget=null;enemyInfoQuestId=null;
    incomeHistory.reset(Date.now());controlsKey='';battleRender=null;battleLayoutKey='';inspectedCharacter='meta';
    $('activity-log').replaceChildren();resetCombatVisuals(true);
    switchManager('characters');inspectCharacter('meta');render();
    setText('save-status','保存済み');log('第'+state.runNumber+'周を開始しました。');return true;
  }
  async function recoverState(now,offline){
    if(recoveryBusy||readOnly)return {seconds:0,kills:0,factors:0};
    const started=state,seconds=Math.max(0,Math.min(D.maxOfflineSeconds,(now-(offline?state.savedAt:lastTime))/1000)),oldKills=state.kills,oldFactors=state.factors,generation=++recoveryGeneration;
    recoveryBusy=true;resetCombatVisuals();enemyMotionState();
    let dialog=document.getElementById('recovery-progress');if(!dialog){dialog=document.createElement('dialog');dialog.id='recovery-progress';dialog.setAttribute('aria-label','放置進行を計算中');dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);}dialog.textContent='放置進行を計算しています。完了後に操作を再開できます。';dialog.showModal();
    try{const next=await window.YggRecovery.run(E,state,seconds,{offline,progress:p=>{dialog.textContent='放置進行を計算中 '+Math.floor(p*100)+'% — 完了後に操作できます';}});
      if(readOnly||generation!==recoveryGeneration||state!==started)return {seconds:0,kills:0,factors:0};
      state=next;state.savedAt=now;lastTime=now;controlsKey='';incomeHistory.reset(Date.now());
      return {seconds,kills:state.kills-oldKills,factors:state.factors-oldFactors};
    }catch(error){notice('放置計算を完了できませんでした。元のセーブは保持しています。再読み込みして再試行してください。',true);readOnly=true;throw error;}
    finally{recoveryBusy=false;dialog.close();enemyMotionState();render();}
  }
  function sync() {
    if(recoveryBusy)return false;
    const now = Date.now();
    if (!blocked()&&!abilityEdit&&!sceneView.transitioning) {
      const elapsed = Math.max(0, (now - lastTime) / 1000);
      if(elapsed>5&&window.YggRecovery){
        recoverState(now,false).then(report=>{if(report.kills)log(`離席中に${fullNumber(report.kills)}周。因子 +${money(report.factors)}Rd`);if(!readOnly)save();}).catch(()=>{});return false;
      }
      if (elapsed > 5) {
        const before = state.factors, oldKills = state.kills;
        E.observeIncome(null);E.advance(state, elapsed, Math.random, false);incomeHistory.reset(now);E.observeIncome((quest,amount)=>{if(uiReady&&!recoveryBusy&&!abilityEdit)incomeHistory.add(quest,amount,Date.now());});
        if (state.kills > oldKills) log(`離席中に${fullNumber(state.kills - oldKills)}周。因子 +${money(state.factors - before)}Rd`);
      } else showEvents(E.advance(state, elapsed), true);
      state.savedAt = now;
    }
    lastTime = now;return true;
  }
  function save() {
    if (blocked()) return false;
    if(!sync())return;
    const saving=abilityEdit?abilityEdit.original:state;saving.savedAt=Date.now();
    const result = storage ? S.persist(storage, saving) : { ok: false, error: 'ブラウザへの保存を利用できません。セーブを書き出してください。' };
    lastSave = Date.now();
    storageError = !result.ok;
    $('save-status').textContent = result.ok ? `保存済み ${new Date(lastSave).toLocaleTimeString('ja-JP')}` : '自動保存不可 · 書き出しで保存してください';
    if (!result.ok) {saveErrorMessage=result.error;notice(result.error,true);}
    else {if(saveErrorMessage&&$('notice').textContent===saveErrorMessage)notice('自動保存が復旧しました。');saveErrorMessage='';}
    return result.ok;
  }
  function exportText() { if(!sync())return null; return S.encode(state); }
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
  $('income-window').addEventListener('change',()=>{incomeWindow=[60,300,1800].includes(Number($('income-window').value))?Number($('income-window').value):300;controlsKey='';render();});
  function switchManager(id) {
    managerTab = id;controlsKey='';
    for (const tab of managerTabs) {
      const selected=tab===id;
      $('tab-'+tab).setAttribute('aria-selected',selected);
      $('tab-'+tab).tabIndex=selected?0:-1;
      $('panel-'+tab).hidden=!selected;
    }
    if(uiReady)render();
  }
  function inspectCharacter(id) {
    inspectedCharacter=id;controlsKey='';
    for (const c of D.characters) {
      const selected=c.id===id;
      $('inspect-'+c.id).setAttribute('aria-selected',selected);
      $('inspect-'+c.id).tabIndex=selected?0:-1;
      $('card-'+c.id).hidden=!selected;
    }
    if(uiReady)render();
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
    const encounter=E.getSession(ctx);
    if(encounter.members){
      const html=encounter.members.map(member=>{
        const q=E.enemySpec(ctx,{kind:member.id}),strength=kind=>{const value=window.YggAbilityView.strengthLevel(E.enemyStrength(q,kind),D.strength);return kind==='power'?strengthNumber(value):incomeNumber(value);};
        const bases={action:q.actionDice?rollText(q.actionDice):fullNumber(q.action),accuracy:rollText(q.accuracy),evasion:rollText(q.evasion),power:rollText(q.attack),vitality:fullNumber(q.baseHP),armor:fullNumber(q.defense)+' / '+fullNumber(q.resistance)};
        return '<div class="enemy-info-heading"><h4>'+q.enemy+'</h4><small>挑戦Lv.'+q.level+'</small></div><div class="enemy-ability-rows">'+window.YggAbilityView.rows({enemy:true,baseCell:t=>'<strong>'+bases[t.id]+'</strong>',valueCell:t=>'<strong>'+(t.id==='action'?fullNumber(E.enemyActionValue(q)):t.id==='vitality'?incomeNumber(window.YggAbilityView.strengthLevel(q.hpStrength,D.strength,'vitality')):strength(t.id))+'</strong>',hp:'<small class="ability-hp">最大HP '+fullNumber(q.hp)+'</small>',ss:'<strong>'+rollText(q.ss)+'</strong>'})+'</div><p>'+q.attacks.map(a=>a.name+'［射程'+rangeText(a.range)+'・'+(a.area?'全体':'単体')+'］').join(' / ')+'</p>'+(q.combatRules?'<p>'+q.combatRules+'</p>':'')+'<p>'+E.attributeSummary(q)+'</p>';
      }).join('')+(encounter.independentRespawns?'<p>1体倒すごとに報酬を獲得し、倒した枠へ次の個体が乱入します。'+encounter.members.map(member=>member.name+' '+money(E.incomeAmount(ctx,E.reward(ctx,E.enemySpec(ctx,{kind:member.id})) ))+' Rd').join(' / ')+'</p>':'<p>'+encounter.members.length+'体すべて倒すと報酬 '+money(E.reward(ctx))+' Rd。先に倒した相手はダウンしたまま待機し、討伐後に全員が復帰します。</p>');
      if(node.innerHTML!==html)node.innerHTML=html;return;
    }
    const F=window.YggMatchup,q=E.getSession(ctx),forecast=F.party(ctx),attack=E.enemyAttackSpec(forecast.state);
    const strength=kind=>{const value=window.YggAbilityView.strengthLevel(E.enemyStrength(q,kind),D.strength);return kind==='power'?strengthNumber(value):incomeNumber(value);},action={...q.actionDice,dice:q.actionDice?.dice||0,flat:q.actionDice?.flat??q.action??0};
    const bases={action:rollText(action),accuracy:rollText(q.accuracy),evasion:rollText(q.evasion),power:rollText(attack),vitality:fullNumber(q.baseHP),armor:fullNumber(q.defense)+' / '+fullNumber(q.resistance)};
    const stats='<div class="enemy-ability-rows">'+window.YggAbilityView.rows({
      enemy:true,baseCell:t=>'<strong>'+bases[t.id]+'</strong>'+(t.id==='power'?'<small class="base-attack-range">基本射程 '+rangeText(q.attackRange||[1,3])+(q.attackElements?.length?' ／ [攻撃：'+q.attackElements.map(x=>E.elementNames[x]).join('・')+']':'')+'</small>':''),
      valueCell:t=>'<strong>'+(t.id==='action'?fullNumber(E.enemyActionValue(q)):t.id==='vitality'?incomeNumber(window.YggAbilityView.strengthLevel(q.hpStrength,D.strength,'vitality')):strength(t.id))+'</strong>',
      hp:'<small class="ability-hp">最大HP '+fullNumber(q.hp)+'</small>',ss:'<strong>'+rollText(q.ss)+'</strong>'
    })+'</div>';
    const percent=v=>(v*100).toFixed(1)+'%',finite=v=>Number.isFinite(v)?'約'+rateFormat(v)+'回':'—';
    const rows=forecast.rows.map(r=>'<tr><th scope="row">'+r.name+'</th><td class="matchup-hit">'+(r.reachable?'約'+percent(r.hitRate):'射程外')+'</td><td>'+(r.passive?'—':'約'+percent(r.evadeRate))+'</td><td>'+ (r.passive?'—':rateFormat(r.damageOnHit))+'</td><td>'+signed(r.hitCorrection)+' / '+signed(r.damageCorrection)+'</td><td>'+(r.apAttack?'換算前 '+rateFormat(r.averageAPDamage):rateFormat(r.averageDamage))+'</td><td>'+signed(r.enemyHitCorrection)+' / '+signed(r.enemyDamageCorrection)+'</td><td class="matchup-endurance">'+(r.passive?'攻撃なし':!r.enemyReachable?'敵の射程外':finite(r.endurance))+'</td></tr>').join('');
    const html=(q.combatRules?'<p>'+q.combatRules+'</p>':'')+'<p>'+E.attributeSummary(q)+(q.summons?'（コグモも同じ）':'')+'</p><div class="enemy-info-heading"><div><small>ENEMY / Lv.'+q.level+'</small><h4>'+q.enemy+'</h4></div><span>'+ (q.attackType==='mental'?'精神攻撃':q.ignoreDefense?'防御貫通':'物理攻撃')+'</span></div>'+stats+'<h5>部隊との相性 <small>挑戦中 Lv.'+q.level+'</small></h5>'+(rows?'<div class="matchup-scroll"><table class="matchup-table"><thead><tr><th>キャラクター</th><th>命中率</th><th>回避率</th><th>平均被ダメージ<small>被弾1回</small></th><th>味方の補正<small>命中 / ダメージ</small></th><th>平均与ダメージ<small>1回の攻撃</small></th><th>敵の補正<small>命中 / ダメージ</small></th><th>耐久目安<small>敵の攻撃回数</small></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="option-note">部隊を編成すると、仲間ごとの相性が表示されます。</p>')+'<p class="matchup-note">補正は通常命中時。平均与ダメージはMISSと命中ボーナス込み。耐久は満HPからの概算（回復・気絶等を除く）。'+(q.summons?'オズモーン本体との比較。':'')+'</p>';
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
    setText('formation-preview','編成時のDPS '+rateFormat(E.dps(draft))+'（攻撃中の理論値）');
  }
  function openFormation(id){
    if(blocked()||!D.sessions.some(q=>q.id===id))return;
    const rest=E.restOf(state,id);$('auto-rest-enabled').checked=rest.enabled;$('auto-rest-kills').value=rest.kills;$('auto-rest-minutes').value=rest.minutes;$('auto-rest-duration').value=rest.restMinutes;setText('auto-rest-error','');
    formationQuestId=id;formationDraft=[...E.formationIds(state,id)];formationRowsDraft={...state.formationRows};renderFormationDraft();$('formation-dialog').showModal();
  }
  function applySuppression(id=null){
    if(blocked()||abilityEdit)return;if(!sync())return;
    if(E.suppressRunaway(state,id)){log(id?D.characters.find(c=>c.id===id).name+'の暴走率を抑制しました。':'部隊全体の暴走率を抑制しました。');save();controlsKey='';render();}
    else notice('抑制対象がいないか、因子が不足しています。');
  }
  function chooseQuest(id){
    if(blocked())return;
    if(!sync())return;
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
      const selected=key==='simplifiedNumbers'?$(id).value:null;
      if(key==='simplifiedNumbers'&&!['normal','western','japanese'].includes(selected))return;
      const value=key==='simplifiedNumbers'?selected!=='normal':key==='hitEffects'?$(id).value:$(id).checked;
      if(key==='hitEffects'&&!D.hitEffectModes.includes(value))return;
      if(!sync())return;state.options[key]=value;if(key==='simplifiedNumbers'&&selected!=='normal')state.options.numberUnit=selected;
      // Apply immediately to existing visuals, without interrupting attack playback.
      if(key==='hitEffects'){$('hit-effects').replaceChildren();$('explosions').replaceChildren();}
      if(key==='showRewardDice'&&!value)for(const die of $('reward-rain').children)die.hidden=true;
      if(['showDamageNumbers','showOverflowLabels','showDefeatLabels'].includes(key))$('damage-floats').replaceChildren();
      if(key==='showDefeatLabels'&&!value)for(const node of Array.from($('enemy-defeats').children))if(node.classList.contains('defeat-label'))node.remove();
      save();render();
    });

    $('option-save').addEventListener('click',()=>$('save-dialog').showModal());
    $('option-help').addEventListener('click',()=>$('help-dialog').showModal());
    window.addEventListener('resize', () => { combatGeometry = null; renderBattleLayout($('arena-viewport').clientWidth); });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(entries => {
      renderBattleLayout(entries[0].contentRect.width);
    }).observe($('arena-viewport'));
    $('clear-focus').addEventListener('click',()=>{if(!sync())return;E.selectEnemy(state,null);save();render();});
    $('cancel-revive').addEventListener('click',()=>$('revive-dialog').close());
    $('confirm-revive').addEventListener('click',()=>{if(blocked())return;if(!sync())return;if(E.revive(state,revivalTarget)){log(D.characters.find(c=>c.id===revivalTarget).name+'：復活バーストで全回復。');$('revive-dialog').close();save();render();}else renderRevivalDialog();});
    $('attack').addEventListener('click', () => { if(!sync())return; showEvents(E.queueManualAttack(state)); render(); });
    $('battle-speed').addEventListener('click',()=>{if(!BATTLE_SPEED_ENABLED||blocked()||!sync())return;state.battleSpeed=E.battleSpeed(state)===2?1:2;changeVisualRate(state.battleSpeed);save();render();});
    $('sins-open').addEventListener('click',()=>{if(abilityEdit||(state.runNumber||1)<2)return;sinInspection=true;setText('sin-message','');render();});
    $('sin-close').addEventListener('click',()=>{sinInspection=false;render();});
    $('sin-shop').addEventListener('cancel',e=>{e.preventDefault();if(!state.dreamShop){sinInspection=false;render();}});
    $('sin-reset').addEventListener('click',()=>{
      if(blocked()||!state.dreamShop)return;const next=structuredClone(state);
      if(E.resetDreamPurchases(next)&&persistDream(next)){setText('sin-message','');render();}
    });
    $('sin-finish').addEventListener('click',()=>{if(!blocked()&&state.dreamShop)finishNextRun();});
    for(const id of Object.keys(D.seedSystem.effects)){
    const changeSeed=refund=>{
      if(blocked()||!state.dreamShop)return;const next=structuredClone(state);
      if(!(refund?E.refundSeed(next,id):E.buySeed(next,id))||!persistDream(next))return;
      const card=$('sin-buy-'+id).closest('.sin-card');card?.classList.remove('sin-purchased');if(card){void card.offsetWidth;card.classList.add('sin-purchased');}
      setText('sin-message','');render();
    };
    const button=$('sin-buy-'+id),surface=button.closest('.sin-card')||button;let wheelSum=0,lastWheel=0;
    button.addEventListener('click',()=>changeSeed(false));
    surface.addEventListener('wheel',event=>{
      if(!state.dreamShop||blocked()||event.ctrlKey||!event.deltaY)return;
      event.preventDefault();const now=Date.now(),delta=event.deltaY*(event.deltaMode===1?40:event.deltaMode===2?100:1);
      if(now-lastWheel>300||Math.sign(delta)!==Math.sign(wheelSum))wheelSum=0;
      lastWheel=now;wheelSum+=delta;
      if(Math.abs(wheelSum)>=80){changeSeed(wheelSum>0);wheelSum=0;}
    },{passive:false});
    }
    $('pause').addEventListener('click', () => { if(!sync())return; state.paused = !state.paused; if (state.paused) resetCombatVisuals(); save(); render(); log(state.paused ? '周回を一時停止しました。' : '周回を再開しました。'); });
    const chooseCharacter = id => {
      if (blocked()) return;
      if(!sync())return;
      if(id&&E.healthOf(state,id).status!=='active'){openRevivalDialog(id);return;}
      if(id&&E.runawayOf(state,id).runawayCollapsed){notice('暴走ダウン中です。暴走率100%未満で復帰します。');return;}
      if(id&&state.selectedCharacterId===id){openAbility(id);return;}
      if (E.selectCharacter(state, id)) { save(); render(); }
    };
    for(const c of D.characters)$(c.id+'-select').addEventListener('click',()=>chooseCharacter(c.id));
    $('select-self').addEventListener('click', () => chooseCharacter(null));
    $('character-list').addEventListener('click', event => {
      const close=event.target.closest('[data-ability-close]');if(close){finishAbility(false);return;}
      const confirm=event.target.closest('[data-ability-confirm]');if(confirm){finishAbility(true);return;}
      const open=event.target.closest('[data-ability]');if(open){
        if(blocked()||open.disabled)return;if(!sync())return;const id=open.dataset.ability;
        if(!state.levels[id]){if(E.hire(state,id)){save();render();}}else openAbility(id);return;
      }
      if(adjustTraining(event))return;
      const focus=event.target.closest('[data-focus]');if(focus){if(!focus.disabled)changeFocus(focus.dataset.focus,focus.dataset.focusStat,E.concentration(state,focus.dataset.focus)[focus.dataset.focusStat]+Number(focus.dataset.step));return;}
      const reset=event.target.closest('[data-focus-reset]');if(reset&&abilityEdit?.id===reset.dataset.focusReset){if(reset.disabled)return;
        if(!abilityEdit.focusReset&&Object.values(E.concentration(abilityEdit.original,abilityEdit.id)).some(n=>n>0)){if(!E.resetConcentration(state,abilityEdit.id))return;abilityEdit.focusReset=true;}
        else E.setConcentration(state,abilityEdit.id,Object.fromEntries(D.concentration.map(t=>[t.id,0])));
        state.health[abilityEdit.id]=structuredClone(abilityEdit.original.health[abilityEdit.id]);E.clampHealth(state,abilityEdit.id);abilityEdit.cache.clear();controlsKey='';render();return;}
      const revive=event.target.closest('[data-revive]');
      if(revive?.dataset.revive){if(revive.disabled||blocked())return;if(!sync())return;openRevivalDialog(revive.dataset.revive);return;}
      if(handleTrade(event))return;
      const perkButton = event.target.closest('[data-perk]');
      if (perkButton) {
        if (blocked() || perkButton.disabled) return;
        if(!sync())return;
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
      if(!sync())return;
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
      if(!sync())return;
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
      if(blocked())return;if(!sync())return;
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
      const fold=event.target.closest('[data-quest-collapse]');if(fold){const card=$('quest-card-'+fold.dataset.questCollapse),collapsed=card.classList.toggle('quest-collapsed');fold.setAttribute('aria-expanded',String(!collapsed));fold.textContent=collapsed?'情報を開く':'折りたたむ';return;}
      const memories=event.target.closest('[data-memories]');if(memories){if(!memories.disabled)chooseQuest('memories');return;}
      const info=event.target.closest('[data-enemy-info]');
      if(info&&!info.disabled){enemyInfoQuestId=info.dataset.enemyInfo;const ctx=E.battleContext(state,enemyInfoQuestId);setText('enemy-info-quest',E.getSession(ctx).name);renderEnemyInfo(ctx,$('enemy-info-content'));if(!$('enemy-info-dialog').open)$('enemy-info-dialog').showModal();return;}
      const member=event.target.closest('[data-quest-member]');
      if(member){questView.selectMember(state,member.dataset.questMember,Number(member.dataset.memberIndex));return;}
      const details=event.target.closest('[data-quest-details]');
      if(details?.dataset.questDetails){
        if(details.disabled||blocked())return;
        const panel=$('quest-enhancement-'+details.dataset.questDetails);panel.hidden=!panel.hidden;details.setAttribute('aria-expanded',String(!panel.hidden));return;
      }
      const challenge=event.target.closest('[data-quest-level]');
      if(challenge?.dataset.questLevel){
        if(challenge.disabled||blocked())return;if(!sync())return;
        const id=challenge.dataset.questLevel,level=Number($('quest-active-'+id).value);
        if(E.setQuestLevel(state,id,level)){questInputDrafts.delete(id);if(state.sessionId===id&&!E.questChangePending(state,id))resetCombatVisuals(true);if(E.questChangePending(state,id))notice('挑戦Q '+level+' を予約しました。現在の行動終了後に切り替わります。');save();render();}
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
      if(!sync())return;
      if(E.buyQuest(state,button.dataset.quest)){
        if(state.sessionId===button.dataset.quest&&!E.questChangePending(state,button.dataset.quest))resetCombatVisuals();
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
      incomeHistory.reset(Date.now());$('activity-log').replaceChildren();lastTime=Date.now();lastSave=lastTime;controlsKey='';
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
    $('save-now').addEventListener('click', () => {const ok=save();if(recoveryBusy){message('復帰計算の完了後に保存できます。');return;}message(ok ? 'ブラウザに保存しました。' : '自動保存できません。ファイルに書き出して保存してください。', storageError);});
    $('show-export').addEventListener('click', () => {
      const text=exportText();if(text===null)return;
      $('save-text').value = text; $('save-text').select(); importCandidate = null;
      $('import-preview').hidden = true; message('表示したデータをコピーして保管できます。');
    });
    $('export').addEventListener('click', () => {
      const text = exportText();if(text===null)return;const blob = new Blob([text], { type: 'application/json' });
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
    $('confirm-import').addEventListener('click', async () => {
      if (!importCandidate || readOnly) return;
      if(!sync())return;
      const previous = S.encode(state);
      // Always keep a recoverable pre-import copy; this key is not rotated by autosave.
      importBackup = previous;
      try { if (storage) storage.setItem(PRE_IMPORT, previous); } catch { /* Memory backup and export remain usable. */ }
      incomeHistory.reset(Date.now());detailKeys.clear();state = availableState(S.decode(S.encode(importCandidate)));questInputDrafts.clear();
      resetCombatVisuals(true);
      const result = window.YggRecovery&&Date.now()-state.savedAt>5000?await recoverState(Date.now(),true).catch(()=>null):E.catchUp(state);if(!result)return;incomeHistory.reset(Date.now());
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
    document.addEventListener('visibilitychange', () => { sceneView.setMotionPaused(document.hidden); enemyMotionState(); if (document.hidden) { save(); resetCombatVisuals(); } else { if(!sync())return; render(); } });
    reducedMotion.addEventListener('change', () => { resetCombatVisuals(); enemyMotionState(); render(); });
    window.addEventListener('pagehide', save);
    window.addEventListener('storage', event => {
      if ((event.key === S.KEY || event.key === null) && !readOnly) {
        readOnly = true; resetCombatVisuals(); notice('別のタブでセーブが更新・削除されました。競合を防ぐため停止しました。このタブを再読み込みして続けてください。', true); render();
      }
    });
  }
  async function initialize(hasLock) {
    if (initialized) return;
    initialized = true; readOnly = !hasLock;
    try { storage = window.localStorage; } catch { storage = null; }
    const loaded = storage ? S.load(storage) : { state: null, unavailable: true, warning: 'ブラウザへの保存を利用できません。セーブを書き出して保存してください。' };
    if (loaded.state) state = availableState(loaded.state);
    corruptSave = !!loaded.blocked;
    build(); bind();
    if (readOnly) notice('別のタブでYggClickerが起動中です。二重進行を防ぐため待機しています。もう一方を閉じ、このタブを再読み込みしてください。', true);
    else if (loaded.warning) notice(loaded.warning, !!(loaded.blocked || loaded.unavailable));
    if (!blocked()) {
      const report = window.YggRecovery&&Date.now()-state.savedAt>5000?await recoverState(Date.now(),true).catch(()=>null):E.catchUp(state);if(!report)return;incomeHistory.reset(Date.now());
      if (report.kills) { log(`離席中に${fullNumber(report.kills)}周。因子 +${money(report.factors)}Rd`); if (!loaded.warning) notice(`おかえりなさい。離席中に${fullNumber(report.kills)}周クリアし、因子を${money(report.factors)}Rd獲得しました。（最大8時間）`); }
      save();
    } else $('save-status').textContent = '保存を停止しています';
    incomeHistory.reset(Date.now());uiReady=true;render();
    setInterval(() => { if(!sync())return; render(true); if (Date.now() - lastSave >= 10000 && !blocked()) save(); }, 100);
  }
  if (navigator.locks && navigator.locks.request) {
    navigator.locks.request('yggclicker.writer', { ifAvailable: true }, lock => {
      initialize(!!lock);
      if (lock) return new Promise(() => {}); // Browser releases this lock when the tab closes.
    }).catch(() => initialize(true));
  } else initialize(true);
})();
