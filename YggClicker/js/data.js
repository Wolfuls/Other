(function (root) {
  'use strict';
  // IDs are save-data identifiers. Keep them stable when names or folders change.
  const data = {
    gameId: 'yggclicker', version: '0.37.0', maxOfflineSeconds: 8 * 60 * 60,
    questGrowth: { cost:100, costGrowth:1.25, hpGrowth:1.2, rewardGrowth:1.25 },
    sceneCycle: { seconds:600, transitionSeconds:20 },
    vishunalVisual: { sheet:'./img/vishunal-poses-v2.png', missile:'./img/vishunal-missile-v1.png',
      // Pixel centers in each 224px frame: back 2x2, side 2x2.
      muzzles:[
        [[98,71],[119,70],[99,91],[120,90],[78,160],[88,160],[78,170],[88,170]],
        [[97,71],[118,70],[98,91],[119,90],[77,160],[87,160],[77,170],[87,170]],
        [[104,74],[125,73],[105,94],[126,93],[79,163],[89,163],[79,173],[89,173]],
        [[105,72],[126,71],[106,92],[127,91],[78,160],[88,160],[78,170],[88,170]],
        [[98,70],[119,69],[99,90],[120,89],[78,161],[88,161],[78,171],[88,171]],
        [[99,68],[120,67],[100,88],[121,87],[77,155],[87,155],[77,165],[87,165]],
        [[98,71],[119,70],[99,91],[120,90],[79,161],[89,161],[79,171],[89,171]],
        [[100,69],[121,68],[101,89],[122,88],[79,160],[89,160],[79,170],[89,170]]
      ] },
    richterVisual: { standing: './img/richter-standing-v11.png', sheet: './img/richter-poses-v11.png', burstSheet: './img/richter-burst-v23.png', bomb: './img/richter-creature-v3.png', idleSheet: './img/richter-creature-idle-v1.png', explosionSheet: './img/richter-explosion-v1.png', maxVisibleBombs: 60 },
    metaVisual: { standing: './img/meta-standing-v5.png', sheet: './img/meta-poses-v5.png', burstSheet: './img/meta-burst-v8.png', saw: './img/meta-saw.png', maxVisibleSaws: 60 },
    balance: { initialFactors: 0, manualDice: 1, manualFlat: 0, concentrationPerLevel: 1, characterDamagePerLevel: .1, weaponSizePerDoubling: .15, speedPerLevel: .01, boostDamageBonus: 1, knockoutHP: 4, actionThreshold: 100, actionPerLevel: .1, purchaseCostGrowth: 1.15, upgradeCostGrowth: 1.25, rewardPerLevel: .1, boostCostDpsRatio: 1, boostDuration: 30 },
    enemyTraits: { mohican: 'モヒカン', swarm:'群れ', penetrationImmune:'貫通無効' },
    characters: [
      { id: 'meta', name: '鋼音メタ', initials: 'MT', title: '丸鋸使い', role: '防御無視・モヒカン特効', cost: 10, powerCost: 5, actionCost: 6, dice: 2, flat: 0, action: 50, color: '#ee929e', portrait: './img/meta-standing-v5.png', description: '赤髪の丸鋸使い。行動力で丸鋸の数、攻撃力Lvで丸鋸の大きさが増す。', source: 'ユーザー提供のキャラクター設定・参考画像', perks: [
        {"id":"attack-plus","level":10,"cost":50,"name":"アタックプラス","flat":4,"description":"攻撃力の固定値＋4。"},
        {"id":"mohican-slayer","level":25,"cost":100,"name":"モヒカン死すべし、慈悲はない","targetTrait":"mohican","damageBonus":15,"description":"[モヒカン]属性の敵へのダメージ判定＋15。倍率を掛ける前に加算。"},
        {"id":"metal-blade","level":50,"cost":800,"name":"レアメタル・ブレード","ignoreDefense":true,"description":"基礎攻撃力を4D6＋5に変更し、巻き込み先も含めて防御を無視する。他のパーク補正は加算。[貫通無効]には防御無視が無効。","baseAttack":{"dice":4,"flat":5}},
        {"id":"metal-storm","level":75,"cost":1600,"name":"メタル・ストーム","overflow":true,"overflowTrait":"swarm","description":"[群れ]の敵と戦闘する際、余剰ダメージで後続の敵を巻き込む。通常は巻き込み先ごとに防御を適用。レアメタル・ブレード解放後は巻き込み分も防御無視（[貫通無効]を除く）。"},
        {"id":"full-metal-burst","level":100,"cost":250,"name":"フルメタルバースト","flat":8,"description":"攻撃力の固定値＋8。"}
      ] },
      { id: 'richter', name: 'ゲルハムト・リヒター', initials: 'GR', title: 'BoM-BeR', role: '爆弾投球・後続への巻き込み', cost: 100, powerCost: 12, actionCost: 15, dice: 5, flat: 0, action: 50, color: '#e5ae83', portrait: './img/richter-standing-v11.png', description: '行動力で数、攻撃力Lvで大きさが増す爆弾クリーチャーを投げる。攻撃力の節目で特性を購入でき、BoM-BeRで後続の敵を巻き込む。', source: 'ユーザー提供のキャラクター設定・参考画像', perks: [
        {"id":"z-bom","level":10,"cost":40,"name":"Z-BoM.","diceEvery":10,"description":"攻撃力Lv.10につき＋1D6。購入後は10Lvごとに増加。"},
        {"id":"dx-bom","level":25,"cost":150,"name":"DX-BoM.","flat":8,"description":"攻撃力の固定値＋8。"},
        {"id":"bom-ber","level":50,"cost":1600,"name":"BoM-BeR","overflow":true,"description":"[群れ]の敵と戦闘する際、余剰ダメージで後続の敵を巻き込む。巻き込み先ごとに防御を適用。","overflowTrait":"swarm"},
        {"id":"vx-bom","level":75,"cost":350,"name":"VX-BoM.","flat":16,"description":"攻撃力の固定値＋16。"},
        {"id":"ex-bom","level":100,"cost":700,"name":"EX-BoM.","flat":24,"description":"攻撃力の固定値＋24。"}
      ] },
      { id:'vishunal', name:'右藤ビシュナル', initials:'UV', title:'合法ランチャー', role:'ミサイル・群れへの巻き込み', cost:1000, powerCost:120, actionCost:150, dice:10, flat:0, action:50, color:'#a6b8ef', portrait:'./img/vishunal-poses-v2.png', portraitSheet:true, description:'ミサイルランチャーを背負った犬。かわいらしく、表情は読めない。', source:'ユーザー提供のキャラクター設定・参考画像', perks: [
        {"id":"legal-launcher","level":10,"cost":400,"name":"合法ランチャー","struckPrefix":"違","diceBonus":10,"description":"基礎攻撃力に＋10D6。"},
        {"id":"mad-dog","level":25,"cost":1500,"name":"狂犬","description":"[群れ]の敵と戦闘する際、余剰ダメージで後続の敵を巻き込む。巻き込み先ごとに防御を適用。","overflow":true,"overflowTrait":"swarm"},
        {"id":"missile-missile","level":50,"cost":16000,"name":"ミサイルミサイルミサイルミサ……","description":"攻撃力に＋10D6。","diceBonus":10}
      ] }
    ],
    sessions: [
      { id: 'mohicans', code: '04', name: '今日も今日とてモヒカン日和', area: '中層 / ウトガルド工業地帯', enemy: 'モヒカン', hp: 20, defense: 0, defensePerLevel: 1, traits: ['mohican','swarm'], reward: 2, description: '倒しても次々に現れる、世紀末ファッションの雑魚たち。', background: './img/utgard-industrial-v1.png', nightBackground: './img/utgard-industrial-night-v1.png', variants: [
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
      ] },
      {id:'scarecrow',code:'05',name:'バスターライラック内模擬戦闘訓練',area:'バスターライラック',enemy:'D・S・スケアクロウ',hp:40,defense:35,defenseGrowth:1.01,traits:['penetrationImmune'],reward:8,description:'貫通無効の甲冑型ロボとの模擬戦闘訓練。',background:'./img/buster-training-v1.png',sheet:'./img/enemy-scarecrow-idle-v1.png',defeatSheet:'./img/enemy-scarecrow-defeat-v1.png',enemyScale:1.09,defeatStyle:'kneel'},
      {id:'dementor',code:'06',name:'古き看守',area:'下層 / ヘルヘイム・緊急封鎖区画（屋外）',enemy:'ディメンター',hp:100,defense:3,defenseGrowth:1.01,formationCount:3,formationLayout:'staggered',traits:['swarm'],reward:4,description:'非常事態宣言下のヘルヘイム、その封鎖された屋外を漂う幽鬼の群れ。',background:'./img/lower-lockdown-v2.png',sheet:'./img/enemy-dementor-idle-v1.png',defeatSheet:'./img/enemy-dementor-defeat-v1.png',enemyScale:1.68,defeatStyle:'dissolve'}
    ],
    // The click/power save IDs retain purchased levels from the previous lineup.
    upgrades: [
      { id: 'click', name: 'コンセントレイション', label: 'ダメージ固定値＋1 / Lv', description: '全キャラと手動攻撃のダメージ固定値を1Lvごとに＋1。倍率を掛ける前に加算。', cost: 5, max: null, icon: '↗' },
      { id: 'power', name: 'スピードアップ', label: '行動力＋1% / Lv', description: 'キャラ固有の強化後の行動力に、1Lvごとに基礎比＋1%の全体倍率を掛ける。', cost: 30, max: null, icon: '⌘' },
      { id: 'reward', name: 'クリア報酬増加', label: '基礎クリア報酬＋10% / Lv', description: '基礎クリア報酬に1Lvごとに10%加算。', cost: 100, max: null, icon: '◇' },
      { id: 'overkill', name: 'オーバーキルボーナス', label: '撃破時のHPが−20以下なら報酬＋25%', description: '1回購入で解放。防御適用後、残りHPを20点以上超える攻撃で撃破すると、クリア報酬増加を適用した報酬に25%上乗せ。', cost: 200, max: 1, icon: '✦', threshold: 20, bonusRate: .25 }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.YggData = data;
})(typeof window !== 'undefined' ? window : globalThis);
