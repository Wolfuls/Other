(function(__YggBig){
(function(root){
  'use strict';
  const interactive='button,input,select,textarea,a,label,summary,[contenteditable="true"]';
  function cardSelection(event){
    if(event.defaultPrevented)return null;
    const card=event.target.closest('[data-quest-card]');
    if(!card||card.getAttribute('aria-disabled')==='true')return null;
    if(event.type==='keydown'){
      if((__YggBig.ne(event.target,card))||!['Enter',' '].includes(event.key))return null;
      event.preventDefault();
    }else if(event.target.closest(interactive))return null;
    return card.dataset.questCard;
  }
  function create({data:D,engine:E,matchup:F,get:$,setText,money,fullNumber,rateFormat,incomeNumber,strengthNumber,blocked,tradeControls,renderTrades,questInputDrafts,renderEnemyInfoIfOpen,actualIncome=()=>null}){
    const A=typeof module!=='undefined'&&module.exports?require('./ability-view.js'):root.YggAbilityView;
    const rewardBadge=(value,unit,kind,icon)=>(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('<span class="reward-badge"><span class="resource-icon ',kind)),'-icon" aria-hidden="true">')),icon)),'</span><span>')),money(value))),' ')),unit)),'</span></span>'));
    const rewardHTML=(state,q)=>(__YggBig.add(rewardBadge(E.incomeAmount(state,E.reward(state,q)),'Rd','factor','◆'),rewardBadge(E.creditAmount(state,q.creditsReward||0),'C','credit','◉')));
    const renderRewards=(state,base,quest,specs=[])=>{const node=$((__YggBig.add('quest-reward-',base.id)));if(!node)return;node.classList.add('session-rewards');if(base.id==='creator'){node.textContent=state.creatorAccess?.defeated?'創造者の加護：因子報酬＋100%（獲得済み）':'初回撃破：因子報酬＋100%（恒久）';return;}node.innerHTML=base.independentRespawns?specs.map(q=>(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('<div class="member-rewards"><strong>',q.name)),'</strong><div class="activity-reward">')),rewardHTML(state,q))),'</div></div>'))).join(''):rewardHTML(state,quest);};
    const memberSelections=new Map();
    const memberTypes=base=>(base.members||[]).filter((m,i,a)=>(__YggBig.eq(a.findIndex(x=>(__YggBig.eq(x.name,m.name))),i)));
    function selectMember(state,id,index){const base=D.sessions.find(q=>(__YggBig.eq(q.id,id)));if(!base||!memberTypes(base)[index])return;memberSelections.set(id,index);renderPreview(state,id);}
    function build(){
    $('quest-list').innerHTML = [...D.sessions].sort((__YggBig.sort((a,b)=>(__YggBig.sub(Number(a.code),Number(b.code)))))).map(s=>`<article class="quest-card" ${s.hiddenUntilUnlocked?'hidden':''} id="quest-card-${s.id}" data-quest-card="${s.id}" tabindex="0" aria-label="？？？">
      <div class="quest-title">
      <h3>
      <small class="quest-number">No.${(__YggBig.isFinite(Number(s.code)))?Number(s.code):s.code}</small> <span id="quest-name-${s.id}">？？？</span></h3><button type="button" class="button secondary quest-collapse" data-quest-collapse="${s.id}" aria-expanded="true">折りたたむ</button>
      </div>
      <p class="quest-lock" id="quest-lock-${s.id}" hidden>
      </p>
      <div class="quest-actions">

      <button type="button" class="button secondary enemy-info-toggle" data-enemy-info="${s.id}" id="enemy-info-toggle-${s.id}" aria-haspopup="dialog" aria-controls="enemy-info-dialog">敵の能力</button>
      <button type="button" class="button secondary formation-open" id="formation-open-${s.id}" data-formation-open="${s.id}">部隊編成</button>
      <button type="button" class="button secondary quest-enhance-toggle" id="quest-enhance-toggle-${s.id}" data-quest-details="${s.id}" aria-expanded="false" aria-controls="quest-enhancement-${s.id}">クエスト強化</button>
      </div>
      <div class="quest-progress">
      <div class="quest-live-status quest-list-rewards" id="quest-live-${s.id}">
      </div>
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
      
      ${s.members?(__YggBig.add((__YggBig.add('<div class="quest-member-tabs" role="tablist" aria-label="敵別の能力">',memberTypes(s).map((m,i)=>(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('<button type="button" role="tab" id="quest-member-',s.id)),'-')),i)),'" data-quest-member="')),s.id)),'" data-member-index="')),i)),'" aria-selected="')),(__YggBig.eq(i,0)))),'" aria-controls="quest-values-')),s.id)),'">')),m.name)),'</button>'))).join(''))),'</div><p class="option-note">強化Lvと売買はクエスト全体で共通です。</p>')):''}
      <dl class="quest-values" id="quest-values-${s.id}" ${s.members?'role="tabpanel"':''}>
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
    (__YggBig.assign($('quest-list'),"innerHTML","add",()=>('<article class="quest-card memory-quest" id="quest-card-memories" data-quest-card="memories" tabindex="0" aria-label="追憶"><div class="quest-title"><h3><small class="quest-number">SPECIAL</small> 追憶</h3></div></article>')));
    }
  function render(state) {
    const available=E.isMemoriesUnlocked(state);$('quest-card-memories').hidden=!available;
    $('quest-card-memories').classList.toggle('current',!!state.viewingMemories);
    $('quest-card-memories').setAttribute('aria-current',String(!!state.viewingMemories));
    $('quest-card-memories').setAttribute('aria-disabled',String(blocked()||!available));
    $('quest-card-memories').tabIndex=blocked()||!available?(__YggBig.neg(1)):0;
    for(const base of D.sessions){
      const unlocked=E.isQuestUnlocked(state,base.id);$((__YggBig.add('quest-card-',base.id))).hidden=!!base.hiddenUntilUnlocked&&!unlocked;
      setText((__YggBig.add('quest-name-',base.id)),unlocked?base.name:'？？？');
      $((__YggBig.add('quest-card-',base.id))).setAttribute('aria-label',unlocked?base.name:'？？？');
      const quest=E.getSession(state,base.id),cost=E.questCost(state,base.id),available=(__YggBig.isFinite(cost));
      const owned=state.questLevels[base.id];
      const input=$((__YggBig.add('quest-active-',base.id)));input.max=owned;input.disabled=blocked()||!unlocked;
      if(!questInputDrafts.has(base.id))input.value=quest.level;
      $((__YggBig.add('quest-apply-',base.id))).disabled=blocked()||!unlocked;
      const selected=!state.viewingMemories&&(__YggBig.eq(state.sessionId,base.id));
      setText((__YggBig.add('formation-open-',base.id)),(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('部隊編成 ',E.formationIds(state,base.id).length)),' / ')),E.partyCapacity(base.id))),'人')));
      $((__YggBig.add('formation-open-',base.id))).disabled=blocked()||!unlocked;
      $((__YggBig.add('quest-enhance-toggle-',base.id))).hidden=!!base.fixedLevel;if(base.fixedLevel)$((__YggBig.add('quest-enhancement-',base.id))).hidden=true;
      $((__YggBig.add('quest-enhance-toggle-',base.id))).disabled=blocked()||!unlocked;
      $((__YggBig.add('quest-lock-',base.id))).hidden=unlocked;
      setText((__YggBig.add('quest-lock-',base.id)),(__YggBig.add((__YggBig.add('解放条件：',base.unlockRequirement?.pending?'調整中':base.unlockRequirement?(base.unlockRequirement.resource==='clears:mohicans'?'《YDF密着24分 101匹モヒちゃん大暴れ！》を10回クリア':base.unlockRequirement.resource==='mohicanDefeats'?'モヒカン討伐数50体を突破':(__YggBig.add((__YggBig.add('所持因子 ',money(base.unlockRequirement.amount))),' Rd'))):(__YggBig.add((__YggBig.add(base.unlockByEarned?'今周回の累計獲得因子 ':'所持因子 ',money(base.unlockFactors||0))),' Rd')))),'（一度達成すると解放を維持）')));
      const card=$((__YggBig.add('quest-card-',base.id)));
      card.classList.toggle('locked',!unlocked);
      card.setAttribute('aria-disabled',String(blocked()||!unlocked));
      card.tabIndex=blocked()||!unlocked?(__YggBig.neg(1)):0;
      card.setAttribute('aria-current',String(selected));
      $((__YggBig.add('quest-income-',base.id))).hidden=!base.medical||!unlocked;
      $((__YggBig.add('quest-live-',base.id))).hidden=!unlocked;
      $((__YggBig.add('quest-card-',base.id))).classList.toggle('current',selected);
      const ctx=E.battleContext(state,base.id),income=actualIncome();
      setText((__YggBig.add('quest-income-',base.id)),'');
      setText((__YggBig.add('quest-level-',base.id)),base.fixedLevel?`固定 Lv.${fullNumber(base.fixedLevel)}（強化不可）`:`購入済み Lv.${fullNumber(owned)} ／ 挑戦中 Lv.${fullNumber(quest.level)}`);
      if(base.medical){setText((__YggBig.add('quest-income-',base.id)),'2秒ごとにHP1%回復 · 暴走率−10%/分');setText((__YggBig.add('quest-level-',base.id)),'敵なし・クリア報酬なし');$((__YggBig.add('enemy-info-toggle-',base.id))).hidden=true;$((__YggBig.add('quest-enhance-toggle-',base.id))).hidden=true;$((__YggBig.add('quest-enhancement-',base.id))).hidden=true;continue;}
      renderPreview(state,base.id);
      $((__YggBig.add('enemy-info-toggle-',base.id))).disabled=!unlocked;
      renderEnemyInfoIfOpen(ctx,base.id);
      const button=$((__YggBig.add('quest-buy-',base.id)));
      button.disabled=blocked()||!unlocked||!available||(__YggBig.lt(state.factors,cost));
      renderTrades('quest',base.id);
      setText((__YggBig.add('quest-cost-',base.id)),available?`◇ ${money(cost)}Rd`:'計算範囲外');
      button.setAttribute('aria-label',`${base.name}のクエストを強化（購入済みLv.${fullNumber(owned)}） · 因子${available?(__YggBig.add(money(cost),'Rd')):'計算範囲外'}`);
    }
  }


    const previewKeys=new Map();
    function renderPreview(state,id){
      const key=JSON.stringify([memberSelections.get(id)||0,state.questLevels[id],state.questActiveLevels[id],questInputDrafts.get(id),state.upgrades.reward,state.sinTotal,state.seedLevels?.greed,state.options]);
      if((__YggBig.eq(previewKeys.get(id),key)))return;previewKeys.set(id,key);
      const base=D.sessions.find(q=>(__YggBig.eq(q.id,id)));if(!base)return;
      const current=E.getSession(state,id),owned=state.questLevels[id],draft=questInputDrafts.get(id),level=Number(draft);
      const valid=(__YggBig.ne(draft,undefined))&&String(draft).trim()!==''&&Number.isSafeInteger(level)&&(__YggBig.ge(level,1))&&(__YggBig.le(level,owned));
      const quest=valid?E.sessionAtLevel(base,level):current;
      if(base.members){
        const members=memberTypes(base),index=memberSelections.get(id)||0;
        members.forEach((m,i)=>$((__YggBig.add((__YggBig.add((__YggBig.add('quest-member-',id)),'-')),i))).setAttribute('aria-selected',String((__YggBig.eq(i,index)))));
        $((__YggBig.add('quest-values-',id))).setAttribute('aria-labelledby',(__YggBig.add((__YggBig.add((__YggBig.add('quest-member-',id)),'-')),index)));
        const specs=[E.sessionAtLevel({...base,...members[index]},quest.level)];
        const set=(key,fn)=>setText((__YggBig.add((__YggBig.add((__YggBig.add('quest-',key)),'-')),base.id)),specs.map(q=>fn(q)).join(' / '));
        setText((__YggBig.add('quest-preview-',id)),valid&&(__YggBig.ne(level,current.level))?(__YggBig.add((__YggBig.add('プレビュー Lv.',fullNumber(level))),'（未適用）')):(__YggBig.add('挑戦中 Lv.',fullNumber(current.level))));
        for(const [key,kind]of [['strength','power'],['armor-strength','armor'],['check-strength','accuracy']])set(key,q=>{const value=A.strengthLevel(E.enemyStrength(q,kind),D.strength);return strengthNumber(value);});
        set('hp-strength',q=>strengthNumber(A.strengthLevel(q.hpStrength,D.strength,'vitality')));set('hp',q=>fullNumber(q.hp));set('defense',q=>fullNumber(q.defense));set('resistance',q=>fullNumber(q.resistance));set('action',q=>rateFormat(E.enemyActionValue(q)));
        for(const [key,stat]of [['damage','attack'],['accuracy','accuracy'],['evasion','evasion'],['ss','ss']])set(key,q=>rateFormat(F.expectedRoll(q[stat],stat!=='attack')));
        renderRewards(state,base,quest,specs);return;
      }
      setText((__YggBig.add('quest-preview-',id)),valid&&(__YggBig.ne(level,current.level))?(__YggBig.add((__YggBig.add('プレビュー Lv.',fullNumber(level))),'（未適用）')):(__YggBig.add((__YggBig.add('挑戦中 Lv.',fullNumber(current.level))),(__YggBig.ne(draft,undefined))&&!valid?'（入力は1〜購入済みLvの整数）':'')));
      setText((__YggBig.add('quest-strength-',base.id)),strengthNumber(A.strengthLevel(E.enemyStrength(quest),D.strength)));
      setText((__YggBig.add('quest-armor-strength-',base.id)),strengthNumber(A.strengthLevel(E.enemyStrength(quest,'armor'),D.strength)));
      setText((__YggBig.add('quest-check-strength-',base.id)),strengthNumber(A.strengthLevel(E.enemyStrength(quest,'accuracy'),D.strength)));
      setText((__YggBig.add('quest-defense-',base.id)),fullNumber(quest.defense));

      setText((__YggBig.add('quest-hp-',base.id)),fullNumber(quest.hp));
      setText((__YggBig.add('quest-hp-strength-',base.id)),strengthNumber(A.strengthLevel(quest.hpStrength,D.strength,'vitality')));
      renderRewards(state,base,quest);

      const ownedStats=quest;
      setText((__YggBig.add('quest-resistance-',base.id)),fullNumber(ownedStats.resistance));
      for(const [label,key]of [['damage','attack'],['accuracy','accuracy'],['evasion','evasion'],['ss','ss']])setText((__YggBig.add((__YggBig.add((__YggBig.add('quest-',label)),'-')),base.id)),rateFormat(F.expectedRoll(ownedStats[key],key!=='attack')));
      const actionMean=q=>E.enemyActionValue(q);
      setText((__YggBig.add('quest-action-',base.id)),rateFormat(actionMean(quest)));

    }
    function renderLive(state){
      for(const base of D.sessions){
        const node=$((__YggBig.add('quest-live-',base.id))),quest=E.getSession(state,base.id);
        const html=base.medical?'<span class="reward-caption">クリア報酬なし</span>':base.independentRespawns?memberTypes(base).map(m=>(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('<div class="quest-list-reward-row"><span class="reward-caption">',m.name)),'・1体</span><div class="activity-reward">')),rewardHTML(state,E.sessionAtLevel({...base,...m},quest.level)))),'</div></div>'))).join(''):(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add('<span class="reward-caption">',base.members?'全員撃破':'1体撃破')),'</span><div class="activity-reward">')),rewardHTML(state,quest))),'</div>'));
        if((__YggBig.ne(node.innerHTML,html)))node.innerHTML=html;
      }
    }
    return {build,render,renderLive,renderPreview,selectMember};
  }
  const api={create,cardSelection};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggQuestView=api;
})(typeof window!=='undefined'?window:globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
