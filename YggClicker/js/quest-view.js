(function(root){
  'use strict';
  const interactive='button,input,select,textarea,a,label,summary,[contenteditable="true"]';
  function cardSelection(event){
    if(event.defaultPrevented)return null;
    const card=event.target.closest('[data-quest-card]');
    if(!card||card.getAttribute('aria-disabled')==='true')return null;
    if(event.type==='keydown'){
      if(event.target!==card||!['Enter',' '].includes(event.key))return null;
      event.preventDefault();
    }else if(event.target.closest(interactive))return null;
    return card.dataset.questCard;
  }
  function create({data:D,engine:E,matchup:F,get:$,setText,money,fullNumber,rateFormat,incomeNumber,blocked,tradeControls,renderTrades,questInputDrafts,renderEnemyInfoIfOpen}){
    const A=typeof module!=='undefined'&&module.exports?require('./ability-view.js'):root.YggAbilityView;
    function build(){
    $('quest-list').innerHTML = D.sessions.map(s=>`<article class="quest-card" id="quest-card-${s.id}" data-quest-card="${s.id}" tabindex="0" aria-label="${s.name}">
      <div class="quest-title">
      <h3>
      <small class="quest-number">No.${Number(s.code)}</small> ${s.name}</h3>
      </div>
      <p class="quest-lock" id="quest-lock-${s.id}" hidden>
      </p>
      <div class="quest-actions">
      <button type="button" class="button secondary quest-select" id="quest-select-${s.id}" data-session="${s.id}">
      </button>
      <button type="button" class="button secondary enemy-info-toggle" data-enemy-info="${s.id}" id="enemy-info-toggle-${s.id}" aria-haspopup="dialog" aria-controls="enemy-info-dialog">敵の能力</button>
      <button type="button" class="button secondary formation-open" id="formation-open-${s.id}" data-formation-open="${s.id}">部隊編成</button>
      <button type="button" class="button secondary quest-enhance-toggle" id="quest-enhance-toggle-${s.id}" data-quest-details="${s.id}" aria-expanded="false" aria-controls="quest-enhancement-${s.id}">クエスト強化</button>
      </div>
      <div class="quest-progress">
      <p class="quest-live-status" id="quest-live-${s.id}">
      </p>
      <p class="quest-live-income" id="quest-income-${s.id}">
      </p>
      </div>
      <section class="quest-enhancement" id="quest-enhancement-${s.id}" hidden>
      <strong id="quest-level-${s.id}">
      </strong>
      <div class="quest-level-choice">
      <label for="quest-active-${s.id}">挑戦Lv<input id="quest-active-${s.id}" type="number" min="1" step="1" inputmode="numeric">
      </label>
      <button type="button" class="button secondary" data-quest-level="${s.id}" id="quest-apply-${s.id}">このLvで挑戦</button>
      </div>
      <div class="quest-columns">
      <span>能力の期待値</span>
      <span id="quest-preview-${s.id}">現在挑戦中のLv</span>
      </div>
      <dl class="quest-values">
      <div>
      <dt>攻撃強度</dt>
      <dd id="quest-strength-${s.id}">
      </dd>
      </div>
      <div><dt>防御・抵抗強度</dt><dd id="quest-armor-strength-${s.id}"></dd></div>
      <div><dt>命中・回避強度</dt><dd id="quest-check-strength-${s.id}"></dd></div>
      <div>
      <dt>HP強度</dt>
      <dd id="quest-hp-strength-${s.id}">
      </dd>
      </div>
      <div>
      <dt>エネミーHP</dt>
      <dd id="quest-hp-${s.id}">
      </dd>
      </div>
      <div>
      <dt>防御</dt>
      <dd id="quest-defense-${s.id}">
      </dd>
      </div>
      <div>
      <dt>抵抗</dt>
      <dd id="quest-resistance-${s.id}">
      </dd>
      </div>
      <div>
      <dt>攻撃力</dt>
      <dd id="quest-damage-${s.id}">
      </dd>
      </div>
      <div>
      <dt>命中判定</dt>
      <dd id="quest-accuracy-${s.id}">
      </dd>
      </div>
      <div>
      <dt>回避判定</dt>
      <dd id="quest-evasion-${s.id}">
      </dd>
      </div>
      <div>
      <dt>SS</dt>
      <dd id="quest-ss-${s.id}">
      </dd>
      </div>
      <div>
      <dt>行動力</dt>
      <dd id="quest-action-${s.id}">
      </dd>
      </div>
      <div>
      <dt>クリア報酬</dt>
      <dd id="quest-reward-${s.id}">
      </dd>
      </div>
      </dl>
      <button type="button" class="button quest-buy" id="quest-buy-${s.id}" data-quest="${s.id}">
      <span>クエストを強化</span>
      <strong id="quest-cost-${s.id}">
      </strong>
      </button>${tradeControls('quest',s.id)}</section>
      </article>`).join('');
    $('quest-list').innerHTML+='<article class="quest-card memory-quest" id="quest-card-memories" data-quest-card="memories" tabindex="0" aria-label="追憶"><div class="quest-title"><h3><small class="quest-number">SPECIAL</small> 追憶</h3></div><div class="quest-actions"><button type="button" class="button secondary quest-select" id="quest-select-memories" data-memories>追憶へ</button></div></article>';
    }
  function render(state) {
    const available=E.isMemoriesUnlocked(state);$('quest-card-memories').hidden=!available;
    const memory=$('quest-select-memories');memory.textContent=state.viewingMemories?'表示中':'追憶へ';memory.disabled=blocked()||!available||state.viewingMemories;memory.setAttribute('aria-pressed',String(!!state.viewingMemories));$('quest-card-memories').classList.toggle('current',!!state.viewingMemories);
    $('quest-card-memories').setAttribute('aria-current',String(!!state.viewingMemories));
    $('quest-card-memories').setAttribute('aria-disabled',String(blocked()||!available));
    $('quest-card-memories').tabIndex=blocked()||!available?-1:0;
    for(const base of D.sessions){
      const unlocked=E.isQuestUnlocked(state,base.id);
      const quest=E.getSession(state,base.id),cost=E.questCost(state,base.id),available=Number.isFinite(cost);
      const owned=state.questLevels[base.id];
      const input=$('quest-active-'+base.id);input.max=owned;input.disabled=blocked()||!unlocked;
      if(!questInputDrafts.has(base.id))input.value=quest.level;
      $('quest-apply-'+base.id).disabled=blocked()||!unlocked;
      const selected=!state.viewingMemories&&state.sessionId===base.id,select=$('quest-select-'+base.id);
      setText('formation-open-'+base.id,'部隊編成 '+E.formationIds(state,base.id).length+' / '+E.MAX_PARTY_SIZE+'人');
      $('formation-open-'+base.id).disabled=blocked()||!unlocked;
      $('quest-enhance-toggle-'+base.id).disabled=blocked()||!unlocked;
      $('quest-lock-'+base.id).hidden=unlocked;
      setText('quest-lock-'+base.id,'解放条件：所持因子 '+money(base.unlockFactors||0)+' Rd（一度達成すると解放を維持）');
      const card=$('quest-card-'+base.id);
      card.classList.toggle('locked',!unlocked);
      card.setAttribute('aria-disabled',String(blocked()||!unlocked));
      card.tabIndex=blocked()||!unlocked?-1:0;
      card.setAttribute('aria-current',String(selected));
      $('quest-income-'+base.id).hidden=!unlocked;
      $('quest-live-'+base.id).hidden=!unlocked;
      $('quest-card-'+base.id).classList.toggle('current',selected);
      setText('quest-select-'+base.id,!unlocked?'未解放':selected?'表示中':'戦闘を表示');
      select.disabled=blocked()||selected||!unlocked;select.setAttribute('aria-pressed',String(selected));
      select.setAttribute('aria-label',base.name+(selected?'を表示中':'の戦闘を表示'));
      const ctx=E.battleContext(state,base.id),income=E.expectedIncome(ctx);
      setText('quest-income-'+base.id,'DPS '+rateFormat(E.dps(ctx))+' · 因子 約'+incomeNumber(income.factorsPerSecond)+'Rd/秒'+(E.respawnDelay(ctx)?'（再出現待ち5秒込み）':''));
      setText('quest-level-'+base.id,`購入済み Lv.${fullNumber(owned)} ／ 挑戦中 Lv.${fullNumber(quest.level)}`);
      renderPreview(state,base.id);
      $('enemy-info-toggle-'+base.id).disabled=!unlocked;
      renderEnemyInfoIfOpen(ctx,base.id);
      const button=$('quest-buy-'+base.id);
      button.disabled=blocked()||!unlocked||!available||state.factors<cost;
      renderTrades('quest',base.id);
      setText('quest-cost-'+base.id,available?`◇ ${money(cost)}Rd`:'計算範囲外');
      button.setAttribute('aria-label',`${base.name}のクエストを強化（購入済みLv.${fullNumber(owned)}） · 因子${available?money(cost)+'Rd':'計算範囲外'}`);
    }
  }


    function renderPreview(state,id){
      const base=D.sessions.find(q=>q.id===id);if(!base)return;
      const current=E.getSession(state,id),owned=state.questLevels[id],draft=questInputDrafts.get(id),level=Number(draft);
      const valid=draft!==undefined&&String(draft).trim()!==''&&Number.isSafeInteger(level)&&level>=1&&level<=owned;
      const quest=valid?E.sessionAtLevel(base,level):current;
      setText('quest-preview-'+id,valid&&level!==current.level?'プレビュー Lv.'+fullNumber(level)+'（未適用）':'挑戦中 Lv.'+fullNumber(current.level)+(draft!==undefined&&!valid?'（入力は1〜購入済みLvの整数）':''));
      setText('quest-strength-'+base.id,incomeNumber(A.strengthLevel(E.enemyStrength(quest),D.strength)));
      setText('quest-armor-strength-'+base.id,incomeNumber(A.strengthLevel(E.enemyStrength(quest,'armor'),D.strength)));
      setText('quest-check-strength-'+base.id,incomeNumber(A.strengthLevel(E.enemyStrength(quest,'accuracy'),D.strength)));
      setText('quest-defense-'+base.id,fullNumber(quest.defense));

      setText('quest-hp-'+base.id,fullNumber(quest.hp));
      setText('quest-hp-strength-'+base.id,incomeNumber(A.strengthLevel(quest.hpStrength,D.strength)));
      setText('quest-reward-'+base.id,`${money(E.reward(state,quest))} Rd`);

      const ownedStats=quest;
      setText('quest-resistance-'+base.id,fullNumber(ownedStats.resistance));
      for(const [label,key]of [['damage','attack'],['accuracy','accuracy'],['evasion','evasion'],['ss','ss']])setText('quest-'+label+'-'+base.id,rateFormat(F.expectedRoll(ownedStats[key],key!=='attack')));
      const actionMean=q=>E.enemyActionValue(q);
      setText('quest-action-'+base.id,rateFormat(actionMean(quest)));

    }
    function renderLive(state){
    for(const q of D.sessions){
      const ctx=E.battleContext(state,q.id),members=E.formationIds(state,q.id).length;
      setText('quest-live-'+q.id,(state.paused?'全体一時停止':members?'自動周回中':'部隊未編成')+' · '+members+'/5人 · '+(E.isWaiting(ctx)?'再出現まで '+ctx.respawnSeconds.toFixed(1)+'秒':'HP '+fullNumber(ctx.hp)+' / '+fullNumber(E.getSession(ctx).hp)));
    }
    }
    return {build,render,renderLive,renderPreview};
  }
  const api={create,cardSelection};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggQuestView=api;
})(typeof window!=='undefined'?window:globalThis);
