(function (root) {
  'use strict';
  // IDs are save-data identifiers. Keep them stable when names or folders change.
  const data = {
    gameId: 'yggclicker', version: '0.28.0', maxOfflineSeconds: 8 * 60 * 60,
    richterVisual: { standing: './img/richter-standing-v7.png', sheet: './img/richter-poses-v7.png', burstSheet: './img/richter-burst-v8.png', bomb: './img/richter-creature-v3.png', explosionSheet: './img/richter-explosion-v1.png', maxVisibleBombs: 60 },
    metaVisual: { standing: './img/meta-standing-v3.png', sheet: './img/meta-poses-v3.png', burstSheet: './img/meta-burst-v6.png', saw: './img/meta-saw.png', maxVisibleSaws: 60 },
    balance: { initialFactors: 5, manualDice: 1, manualFlat: 0, manualFlatPerLevel: 1, characterDamagePerLevel: .1, weaponSizePerDoubling: .15, upgradeDamagePerLevel: .25, boostDamageBonus: 1, knockoutHP: 4, actionThreshold: 100, actionPerLevel: .1, purchaseCostGrowth: 1.15, upgradeCostGrowth: 1.25, rewardPerLevel: .25, boostCostDpsRatio: 1, boostDuration: 30 },
    enemyTraits: { mohican: 'モヒカン' },
    characters: [
      { id: 'meta', name: '鋼音メタ', initials: 'MT', title: '丸鋸使い', role: '防御無視・モヒカン特効', cost: 10, powerCost: 5, actionCost: 6, dice: 2, flat: 0, action: 100 / 1.8, color: '#ee929e', portrait: './img/meta-standing-v3.png', description: '赤髪の丸鋸使い。行動力で丸鋸の数、攻撃力Lvで丸鋸の大きさが増す。', source: 'ユーザー提供のキャラクター設定・参考画像', perks: [
        { id: 'metal-blade', level: 10, cost: 10, name: 'メタルブレード', ignoreDefense: true, description: 'メタのダメージ判定が相手の防御を無視する。' },
        { id: 'attack-plus', level: 20, cost: 50, name: 'アタックプラス', flat: 4, description: '攻撃力の固定値＋4。' },
        { id: 'mohican-slayer', level: 30, cost: 100, name: 'モヒカン死すべし、慈悲はない', targetTrait: 'mohican', damageBonus: 15, description: '[モヒカン]属性の敵へのダメージ判定＋15。倍率を掛ける前に加算。' },
        { id: 'full-metal-burst', level: 40, cost: 250, name: 'フルメタルバースト', flat: 8, description: '攻撃力の固定値＋8。' },
        { id: 'metal-man', level: 50, cost: 800, name: 'メタルマン', baseAttack: { dice: 4, flat: 5 }, description: '基礎攻撃力が4D6＋5になる。他の購入済みパークは引き続き加算。' }
      ] },
      { id: 'richter', name: 'ゲルハムト・リヒター', initials: 'GR', title: 'BoM-BeR', role: '爆弾投球・後続への巻き込み', cost: 100, powerCost: 12, actionCost: 15, dice: 5, flat: 0, action: 25, color: '#e5ae83', portrait: './img/richter-standing-v7.png', description: '行動力で数、攻撃力Lvで大きさが増す爆弾クリーチャーを投げる。攻撃力の節目で特性を購入でき、BoM-BeRで後続の敵を巻き込む。', source: 'ユーザー提供のキャラクター設定・参考画像', perks: [
        { id: 'z-bom', level: 10, cost: 40, name: 'Z-BoM.', diceEvery: 10, description: '攻撃力Lv.10につき＋1D6。購入後は10Lvごとに増加。' },
        { id: 'dx-bom', level: 20, cost: 150, name: 'DX-BoM.', flat: 8, description: '攻撃力の固定値＋8。' },
        { id: 'vx-bom', level: 30, cost: 350, name: 'VX-BoM.', flat: 16, description: '攻撃力の固定値＋16。' },
        { id: 'ex-bom', level: 40, cost: 700, name: 'EX-BoM.', flat: 24, description: '攻撃力の固定値＋24。' },
        { id: 'bom-ber', level: 50, cost: 1600, name: 'BoM-BeR', overflow: true, description: '余剰ダメージで後続の敵を連鎖して巻き込む。巻き込み先ごとに防御を適用。' }
      ] }
    ],
    sessions: [
      { id: 'mohicans', code: '04', name: 'チーム世紀末覇者', area: '中層 / ウトガルド工業地帯', enemy: 'モヒカン', hp: 10, defense: 0, traits: ['mohican'], reward: 2, description: '倒しても次々に現れる、世紀末ファッションの雑魚たち。', background: './img/utgard-industrial-v1.png', variants: [
        {name:'モヒカン（鉄パイプ）',footY:199,sheet:'./img/enemy-mohican-red-idle-v1.png',defeatSheet:'./img/enemy-mohican-red-defeat-v1.png'},
        {name:'モヒカン（ボウガン）',sheet:'./img/enemy-mohican-blue-idle-v1.png',defeatSheet:'./img/enemy-mohican-blue-defeat-v1.png'},
        {name:'モヒカン（ケンカ屋）',footY:204,sheet:'./img/enemy-mohican-green-idle-v1.png',defeatSheet:'./img/enemy-mohican-green-defeat-v1.png'},
        {name:'ハゲ（ハンマー）',sheet:'./img/enemy-bald-hammer-idle-v1.png',defeatSheet:'./img/enemy-bald-hammer-defeat-v1.png'},
        {name:'ハゲ（ナックル）',footY:210,sheet:'./img/enemy-bald-knuckles-idle-v1.png',defeatSheet:'./img/enemy-bald-knuckles-defeat-v1.png'},
        {name:'モヒカン（チェーン）',sheet:'./img/enemy-mohican-yellow-idle-v1.png',defeatSheet:'./img/enemy-mohican-yellow-defeat-v1.png'},
        {name:'モヒカン女（警棒）',sheet:'./img/enemy-mohican-female-magenta-idle-v1.png',defeatSheet:'./img/enemy-mohican-female-magenta-defeat-v1.png'},
        {name:'モヒカン女（レンチ）',sheet:'./img/enemy-mohican-female-white-idle-v1.png',defeatSheet:'./img/enemy-mohican-female-white-defeat-v1.png'},
        {name:'モヒカン女（バット）',sheet:'./img/enemy-mohican-female-cyan-idle-v1.png',defeatSheet:'./img/enemy-mohican-female-cyan-defeat-v1.png'},
        {name:'モヒカン（鉄斧）',sheet:'./img/enemy-mohican-male-orange-idle-v1.png',defeatSheet:'./img/enemy-mohican-male-orange-defeat-v1.png'}
      ] }
    ],
    upgrades: [
      { id: 'click', name: '手動攻撃の訓練', label: '固定値＋1 / Lv', description: '手動攻撃の固定ダメージを1Lvごとに＋1。倍率を掛ける前に加算。', cost: 5, max: null, icon: '↗' },
      { id: 'power', name: '連携戦術', label: '全攻撃 ＋25% / Lv', description: '参加中の全員と手動攻撃を強化。', cost: 30, max: null, icon: '⌘' },
      { id: 'reward', name: 'クリア報酬増加', label: '基礎クリア報酬 ＋25% / Lv', description: '基礎報酬に1Lvごとに25%加算。全セッションに同じ倍率を適用。', cost: 100, max: null, icon: '◇' },
      { id: 'overkill', name: 'オーバーキルボーナス', label: '撃破時のHPが−20以下なら報酬＋1Rd', description: '1回購入で解放。防御適用後、残りHPを20点以上超える攻撃で撃破すると＋1Rd。報酬倍率とは別に加算。', cost: 200, max: 1, icon: '✦', threshold: 20, bonus: 1 }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.YggData = data;
})(typeof window !== 'undefined' ? window : globalThis);



