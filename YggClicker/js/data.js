(function (root) {
  'use strict';
  // IDs are save-data identifiers. Keep them stable when names or folders change.
  const data = {
    gameId: 'yggclicker', version: '0.57.5', maxOfflineSeconds: 8 * 60 * 60,
    incomeTypes:['questReward','overkillReward','secondaryIncome','jewelSideIncome','jewelDoubleHitIncome','jewelDamageIncome','refund','migrationRefund','prestigeReward'],
    secondaryIncomeTypes:['secondaryIncome','jewelSideIncome','jewelDoubleHitIncome','jewelDamageIncome'],
    strength:{strengthBase:100,strengthGrowth:1.10,hitStrengthExponent:1,damageStrengthExponent:1,probabilityEpsilon:1e-6},
    runtimeBalance:{jewelSideIncomeMeanIntervalSeconds:1800,jewelSideIncomeRate:.01,trainingPressureScale:.01,recoverySpeedBonusPerStack:.20,runawayPressureReductionPerStack:.10,basePressures:{normal:.02,slightlyLow:.01,low:.005},criticalRewardRate:0,overloadDamageRate:1},
    runawayThresholds:[50,70,90,110,120,130,140,150],
    runawaySymptoms:['control','overload','hearing','vision','body','ability','language','memory','mind','oblivion'],
    seedSystem:{enabled:false,effects:{pride:'action',vanity:'evasionStrength',envy:'hitStrength',wrath:'attackStrength',melancholy:'sedation',greed:'secondaryIncome',gluttony:'maxHP',lust:'defenseStrength'},karmaEffects:{}},
    tordelieseVisual: {
      sheet:'./img/tordeliese-animation-v13.png',
      tendrilFrames:Array.from({length:6},(_,i)=>`./img/tordeliese-tendril-${i+1}-v6.png`)
    },
    questGrowth: { cost:100, costGrowth:1.15, hpGrowth:1.1, statGrowth:1.1, combatGrowth:1.05, rewardGrowth:1.25 },
    statUpgrades:[
      {id:'vitality',field:'vitalityLevels',name:'最大HP'},
      {id:'armor',field:'armorLevels',name:'防御＆抵抗'},
      {id:'accuracy',field:'accuracyLevels',name:'命中判定'},
      {id:'evasion',field:'evasionLevels',name:'回避判定'}
    ],
    displayDefaults: { showOrbits:true, hitEffects:'normal', showFactorRain:true, showRewardDice:true, showDamageNumbers:true, showOverflowLabels:true, showDefeatLabels:true },
    hitEffectModes: ['normal','translucent','simple','off'],
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
    wakuVisual:{attackSheet:'./img/waku-fire-v3.png',sheet:'./img/waku-idle-v1.png',burstSheet:'./img/waku-burst-v3.png'},
    metaVisual: { standing: './img/meta-standing-v7.png', sheet: './img/meta-poses-v7.png', burstSheet: './img/meta-burst-v11.png', saw: './img/meta-saw.png', maxVisibleSaws: 60 },
    balance: { initialFactors: 0, manualDice: 1, manualFlat: 0, characterDamagePerLevel: .1, weaponSizePerDoubling: .15, knockoutHP: 4, actionThreshold: 100, actionPerLevel: .05, purchaseCostGrowth: 1.125, upgradeCostGrowth: 1.25, rewardPerLevel: .1, recoverySeconds: 6 },
    enemyTraits: { mohican: 'モヒカン', swarm:'群れ', penetrationImmune:'貫通無効' },
    characters: [
      { id: 'meta', defense:2, resistance:6, maxHP:20, evasion:{flat:9,dice:1}, ss:{flat:12,dice:1}, downSprite:'./img/meta-down-v1.png', name: '鋼音メタ', initials: 'MT', title: '丸鋸使い', role: '防御無視・モヒカン特効', cost: 10, powerCost: 8, actionCost: 10, dice: 2, flat: 0, action: 50, color: '#ee929e', portrait: './img/meta-standing-v7.png', description: '赤髪の丸鋸使い。行動力で丸鋸の数、攻撃力Lvで丸鋸の大きさが増す。', source: 'ユーザー提供のキャラクター設定・参考画像', perks: [
  {
    "id": "attack-plus",
    "level": 10,
    "cost": 50,
    "name": "アタックプラス",
    "flat": 4,
    "description": "攻撃力の固定値＋4。"
  },
  {
    "id": "mohican-slayer",
    "level": 25,
    "cost": 1000,
    "name": "モヒカン死すべし、慈悲はない",
    "targetTrait": "mohican",
    "damageBonus": 15,
    "description": "[モヒカン]へのダメージ＋15。"
  },
  {
    "id": "metal-blade",
    "level": 50,
    "cost": 50000,
    "name": "レアメタル・ブレード",
    "ignoreDefense": true,
    "description": "基礎攻撃力を4D6＋5に変更。防御を無視する（貫通無効を除く）。",
    "baseAttack": {
      "dice": 4,
      "flat": 5
    }
  },
  {
    "id": "metal-storm",
    "level": 75,
    "cost": 30000,
    "name": "メタルストーム",
    "areaAttack": true,
    "areaTrait": "swarm",
    "description": "[群れ]の3体に全体攻撃。防御計算後のダメージを半減。"
  },
  {
    "id": "full-metal-burst",
    "level": 100,
    "cost": 30000000,
    "name": "フルメタルバースト",
    "flat": 8,
    "description": "攻撃力＋8、命中＋8。",
    "accuracyBonus": 8
  },
  {
    "id": "lock-plus",
    "name": "ロックプラス",
    "levelType": "accuracy",
    "level": 10,
    "cost": 50,
    "accuracyBonus": 4,
    "description": "命中＋4。"
  },
  {
    "id": "spinning-rush",
    "name": "三＠三＠三＠",
    "levelType": "action",
    "level": 50,
    "cost": 50000,
    "extraAttackChance": 0.25,
    "description": "攻撃時25%で追加攻撃。連続発動する。"
  },
  {
    "id": "metal-shield",
    "name": "メタルシールド",
    "levelType": "armor",
    "level": 25,
    "cost": 1000,
    "normalHitDefense": 6,
    "description": "倍差命中以外の被弾時、その攻撃への防御＋6。"
  }
] },
      { id: 'richter', defense:1, resistance:6, maxHP:24, evasion:{flat:9,dice:1}, ss:{flat:12,dice:1}, downSprite:'./img/richter-down-v1.png', name: 'ゲルハムト・リヒター', initials: 'GR', title: 'BoM-BeR', role: '爆弾投球・群れへの全体攻撃', cost: 100, powerCost: 20, actionCost: 25, dice: 5, flat: 0, action: 35, color: '#e5ae83', portrait: './img/richter-standing-v11.png', description: '行動力で数、攻撃力Lvで大きさが増す爆弾クリーチャーを投げる。攻撃力の節目で特性が解放され、BoM-BeRで群れの3体へ全体攻撃する。', source: 'ユーザー提供のキャラクター設定・参考画像', perks: [
        {"id":"z-bom","level":10,"cost":100,"name":"Z-BoM.","diceEvery":10,"description":"攻撃力Lv10ごとに攻撃力＋1D6。"},
        {"id":"dx-bom","level":25,"cost":1000,"name":"DX-BoM.","flat":8,"description":"攻撃力の固定値＋8。"},
        {"id":"bom-ber","level":50,"cost":10000,"name":"BoM-BeR","areaAttack":true,"description":"[群れ]の3体に全体攻撃。防御計算後のダメージを半減。","areaTrait":"swarm"},
        {"id":"vx-bom","level":75,"cost":3000000,"name":"VX-BoM.","flat":16,"description":"攻撃力の固定値＋16。"},
        {"id":"ex-bom","level":100,"cost":100000000,"name":"EX-BoM.","flat":24,"description":"攻撃力の固定値＋24。"}
      ] },
      { id:'vishunal', defense:4, resistance:1, maxHP:36, evasion:{flat:14,dice:1}, ss:{flat:9,dice:1}, downSprite:'./img/vishunal-down-v1.png', name:'右藤ビシュナル', initials:'UV', title:'合法ランチャー', role:'ミサイル・群れへの全体攻撃', cost:1000, powerCost:200, actionCost:250, dice:10, flat:0, action:60, color:'#a6b8ef', portrait:'./img/vishunal-poses-v2.png', portraitSheet:true, description:'ミサイルランチャーを背負った犬。かわいらしく、表情は読めない。', source:'ユーザー提供のキャラクター設定・参考画像', perks: [
        {"id":"legal-launcher","level":10,"cost":15000,"name":"合法ランチャー","struckPrefix":"違","diceBonus":10,"description":"基礎攻撃力に＋10D6。"},
        {"id":"mad-dog","level":25,"cost":150000,"name":"狂犬","description":"[群れ]の3体に全体攻撃。防御計算後のダメージを半減。","areaAttack":true,"areaTrait":"swarm"},
        {"id":"missile-missile","level":50,"cost":3000000,"name":"ミサイルミサイルミサイルミサ……","description":"攻撃力に＋10D6。","diceBonus":10}
      ] },
      {id:'tordeliese', defense:0, resistance:2, maxHP:15, evasion:{flat:12,dice:1}, ss:{flat:12,dice:1}, downSprite:'./img/tordeliese-down-v2.png',name:'トルデリーゼ・トルンヴァルト',initials:'TT',title:'ムカデの触手',role:'猛毒・連鎖する追加攻撃',cost:2500,powerCost:500,actionCost:625,dice:3,flat:1,action:80,color:'#e59bab',portrait:'./img/tordeliese-standing-v7.png',description:'ムカデ型の触手で攻撃し、猛毒で仲間の攻撃にも持続ダメージを添える。',source:'ユーザー提供のキャラクター設定・参考画像',perks:[
  {
    "id": "greedy-gale",
    "level": 10,
    "cost": 30000,
    "name": "貪戻の凩",
    "inflictPoison": true,
    "poisonDamage": 4,
    "description": "攻撃で猛毒を付与。被弾ごとに防御を無視する4ダメージ。"
  },
  {
    "id": "retreating-wind",
    "level": 25,
    "cost": 300000,
    "name": "退嬰の風",
    "extraAttackChance": 0.3,
    "description": "攻撃時、30%で追加攻撃。連続発動する。"
  },
  {
    "id": "severing-storm",
    "level": 50,
    "cost": 3000000,
    "name": "断ち切る颶",
    "flat": 12,
    "poisonDamage": 8,
    "description": "攻撃力＋12。猛毒ダメージを8に強化。"
  },
  {
    "id": "demonic-hammer",
    "level": 100,
    "cost": 100000000,
    "name": "天魔の鉄槌",
    "ignoreDefense": true,
    "description": "防御を無視する（貫通無効を除く）。"
  },
  {
    "id": "annihilation",
    "level": 150,
    "cost": 1000000000,
    "name": "染滅",
    "description": "倍差命中時、ダメージ判定＋40。",
    "doubleHitDamage": 40
  },
  {
    "id": "folding-gale",
    "name": "畳なわる颯",
    "levelType": "accuracy",
    "level": 25,
    "cost": 300000,
    "accuracyBonus": 12,
    "poisonBonus": 4,
    "description": "命中判定＋12、猛毒ダメージ＋4。"
  },
  {
    "id": "for-whom-the-storm",
    "name": "誰が為の颶",
    "levelType": "action",
    "level": 100,
    "cost": 100000000,
    "actionBonus": 12,
    "poisonBonus": 4,
    "description": "行動力＋12、猛毒ダメージ＋4。"
  }
]}
      ,{"id":"max", defense:1, resistance:2, maxHP:22, evasion:{flat:16,dice:2}, ss:{flat:16,dice:2}, downSprite:'./img/max-down-v2.png',"name":"マックス","initials":"MX","title":"GM","role":"味方の行動支援・運命操作","cost":12000,"powerCost":2400,"actionCost":3000,"dice":1,"flat":6,"action":50,"color":"#cbd0f4","portrait":"./img/gamer-throne-standing-v7.png","description":"玉座型の飛行ヴィークルに座る少年。ゲームを操り、敵へタライを落とす。","source":"ユーザー提供の設定・既存スプライト","perks":[
  {
    "id": "gm",
    "level": 0,
    "initial": true,
    "levelType": "action",
    "cost": 0,
    "name": "GM",
    "transferAction": true,
    "description": "自動行動を仲間に譲る。手動攻撃の選択対象が優先。譲れる仲間がいなければ自分で攻撃。"
  },
  {
    "id": "western-munchkin",
    "level": 10,
    "cost": 100000,
    "name": "洋マンチ",
    "sharePowerLevel": true,
    "description": "GMの対象の攻撃力Lvに、自身の攻撃力Lvを加算。"
  },
  {
    "id": "handout",
    "level": 25,
    "levelType": "action",
    "cost": 1000000,
    "name": "ハンドアウト",
    "selectedActionRate": 0.2,
    "description": "手動攻撃に選択中のキャラクターの行動力＋20%。"
  },
  {
    "id": "plot-armor",
    "level": 50,
    "levelType": "armor",
    "cost": 10000000,
    "name": "プロットアーマー",
    "enemyDamageSides": 4,
    "description": "部隊全体の行動力＋1D6。敵のダメージダイスをD4に変更。",
    "partyActionDice": 1
  },
  {
    "id": "mouth-wrestling",
    "level": 75,
    "levelType": "action",
    "cost": 100000000,
    "name": "口プロレス",
    "partyEvasionDice": 2,
    "description": "部隊全体の回避力＋2D6。"
  },
  {
    "id": "named-npc",
    "level": 100,
    "levelType": "action",
    "cost": 1000000000,
    "name": "ネームドNPC",
    "freeActionChance": 0.5,
    "description": "手動攻撃に選択中の仲間は、50%の確率でAPを消費せず自動攻撃する。"
  }
]}
      ,{"id":"waku","maxHP":20,"defense":1,"resistance":3,"evasion":{"flat":16,"dice":1},"ss":{"flat":9,"dice":1},"downSprite":"./img/waku-down-v1.png","name":"元加 枠","initials":"WK","title":"フレーム使い","role":"木刀と拳銃・敵の弱体化","cost":4000,"powerCost":800,"actionCost":1000,"dice":4,"flat":0,"action":75,"color":"#83c7e1","portrait":"./img/waku-standing-v3.png","description":"木刀と拳銃で戦う少年。敵の判定を崩し、仲間を守る。","source":"ユーザー提供の設定・スプライト・参考画像","perks":[
  {
    "id": "expanded-hurtbox",
    "level": 10,
    "cost": 50000,
    "name": "食らい判定拡大",
    "defenseReduction": 3,
    "description": "攻撃した敵の防御力−3。重複しない。"
  },
  {
    "id": "invisible-wall",
    "level": 25,
    "cost": 500000,
    "name": "見えない壁",
    "apReductionRate": 0.01,
    "description": "攻撃するたび、対象の現在APを1%減らす。"
  },
  {
    "id": "monado-smash",
    "level": 50,
    "cost": 5000000,
    "name": "モナドスマッシュ",
    "ignoreDefense": true,
    "description": "防御を無視する（貫通無効を除く）。"
  },
  {
    "id": "next-frame",
    "level": 100,
    "cost": 500000000,
    "name": "nextFrame",
    "diceBonus": 2,
    "description": "攻撃力＋2D6。命中時10%で、対象の次の回避判定を自動失敗にする。",
    "evasionFailureChance": 0.1
  },
  {
    "id": "deceptive-hitbox",
    "levelType": "action",
    "level": 10,
    "cost": 50000,
    "name": "詐欺判定",
    "partyEvasionBonus": 3,
    "description": "部隊全体の回避判定＋3。"
  },
  {
    "id": "floor-clip",
    "levelType": "action",
    "level": 25,
    "cost": 500000,
    "name": "地面めり込みバグ",
    "protectLowestHP": true,
    "description": "現在HPが最も低い仲間1人を保護。10秒ごとに対象を更新。最後の1人を除く。"
  },
  {
    "id": "vanishing-hurtbox",
    "levelType": "action",
    "level": 50,
    "cost": 5000000,
    "name": "当たり判定消失",
    "nullifyChance": 0.2,
    "description": "自身への攻撃を20%の確率で無効にする。"
  },
  {
    "id": "vanishing-hitbox",
    "levelType": "action",
    "level": 100,
    "cost": 500000000,
    "name": "攻撃判定消失",
    "accuracyPenaltyChance": 0.05,
    "accuracyPenalty": 15,
    "description": "攻撃時5%で、対象の次の攻撃の命中判定−15。重複しない。"
  },
  {
    "id": "full-screen-hurtbox",
    "name": "全画面食らい判定",
    "levelType": "accuracy",
    "level": 100,
    "cost": 500000000,
    "autoHitChance": 0.15,
    "description": "攻撃時15%で自動命中。"
  }
]}
    ],
    sessions: [
      { id: 'mohicans', code: '03', unlockFactors:1000, formationCount:3, name: 'YDF密着24分 101匹モヒちゃん大暴れ！', area: '中層 / ウトガルド工業地帯', enemy: 'モヒカン', attack:{dice:2,flat:0}, accuracy:{flat:10,dice:1}, ss:{flat:6,dice:1}, actionDice:{dice:10,flat:0}, attackSeconds:.72, hp: 20, defense: 0, defenseGrowth:1.1, traits: ['mohican','swarm'], reward: 3, description: '倒しても次々に現れる、世紀末ファッションの雑魚たち。', background: './img/utgard-industrial-v1.png', nightBackground: './img/utgard-industrial-night-v1.png', variants: [
        {name:'モヒカン（鉄パイプ）',footY:199,sheet:'./img/enemy-mohican-red-idle-v1.png',attackSheet:'./img/enemy-mohican-red-attack-v1.png',defeatSheet:'./img/enemy-mohican-red-defeat-v1.png'},
        {name:'モヒカン（ボウガン）',sheet:'./img/enemy-mohican-blue-idle-v1.png',attackSheet:'./img/enemy-mohican-blue-attack-v1.png',defeatSheet:'./img/enemy-mohican-blue-defeat-v1.png'},
        {name:'モヒカン（ケンカ屋）',footY:204,sheet:'./img/enemy-mohican-green-idle-v1.png',attackSheet:'./img/enemy-mohican-green-attack-v1.png',defeatSheet:'./img/enemy-mohican-green-defeat-v1.png'},
        {name:'ハゲ（ハンマー）',sheet:'./img/enemy-bald-hammer-idle-v1.png',attackSheet:'./img/enemy-bald-hammer-attack-v1.png',defeatSheet:'./img/enemy-bald-hammer-defeat-v1.png'},
        {name:'ハゲ（ナックル）',footY:210,sheet:'./img/enemy-bald-knuckles-idle-v1.png',attackSheet:'./img/enemy-bald-knuckles-attack-v1.png',defeatSheet:'./img/enemy-bald-knuckles-defeat-v1.png'},
        {name:'モヒカン（チェーン）',sheet:'./img/enemy-mohican-yellow-idle-v1.png',attackSheet:'./img/enemy-mohican-yellow-attack-v1.png',defeatSheet:'./img/enemy-mohican-yellow-defeat-v1.png'},
        {name:'モヒカン女（警棒）',sheet:'./img/enemy-mohican-female-magenta-idle-v1.png',attackSheet:'./img/enemy-mohican-female-magenta-attack-v1.png',defeatSheet:'./img/enemy-mohican-female-magenta-defeat-v1.png'},
        {name:'モヒカン女（レンチ）',sheet:'./img/enemy-mohican-female-white-idle-v1.png',attackSheet:'./img/enemy-mohican-female-white-attack-v1.png',defeatSheet:'./img/enemy-mohican-female-white-defeat-v1.png'},
        {name:'モヒカン女（バット）',sheet:'./img/enemy-mohican-female-cyan-idle-v1.png',attackSheet:'./img/enemy-mohican-female-cyan-attack-v1.png',defeatSheet:'./img/enemy-mohican-female-cyan-defeat-v1.png'},
        {name:'モヒカン（鉄斧）',sheet:'./img/enemy-mohican-male-orange-idle-v1.png',attackSheet:'./img/enemy-mohican-male-orange-attack-v1.png',defeatSheet:'./img/enemy-mohican-male-orange-defeat-v1.png'}
      ] },
      {id:'scarecrow',code:'02',name:'バスターライラック内模擬戦闘訓練',area:'バスターライラック',enemy:'D・S・スケアクロウ',attack:{dice:3,flat:1},accuracy:{flat:20,dice:1},ss:{flat:7,dice:1},action:0,hp:35,defense:35,defenseGrowth:1.1,traits:['penetrationImmune'],reward:10,description:'貫通無効の甲冑型ロボとの模擬戦闘訓練。',background:'./img/buster-training-v1.png',sheet:'./img/enemy-scarecrow-idle-v1.png',defeatSheet:'./img/enemy-scarecrow-defeat-v1.png',enemyScale:1.09,defeatStyle:'kneel'},
      {id:'dementor',code:'04',unlockFactors:100000,name:'旧き看守',area:'下層 / ヘルヘイム・緊急封鎖区画（屋外）',enemy:'ディメンター',attack:{dice:4,flat:5},accuracy:{flat:10,dice:1},ss:{flat:17,dice:1},attackType:'mental',actionDice:{dice:8,flat:5},attackSeconds:1.2,hp:100,defense:3,defenseGrowth:1.1,formationCount:3,formationLayout:'staggered',traits:['swarm'],reward:10,description:'非常事態宣言下のヘルヘイム、その封鎖された屋外を漂う幽鬼の群れ。',background:'./img/lower-lockdown-v2.png',sheet:'./img/enemy-dementor-idle-v1.png',attackSheet:'./img/enemy-dementor-attack-v1.png',defeatSheet:'./img/enemy-dementor-defeat-v1.png',enemyScale:1.68,defeatStyle:'dissolve'}
    ],
    concentration: [
      {id:'attack',name:'攻撃',max:10,effect:'攻撃力＋1 / 点'},
      {id:'defense',name:'防御',max:5,effect:'被ダメージ−1 / 点（最低1）'},
      {id:'reaction',name:'反応',max:10,effect:'回避・SS回避判定＋1 / 点'},
      {id:'action',name:'行動',max:10,effect:'行動力＋10% / 点'}
    ],
    upgrades: [
      {id:'stabilization',name:'因子安定化',label:'全味方の鎮静圧＋0.1 / 分 / Lv',description:'時間経過による暴走率の鎮静を促す。',cost:20000,costGrowth:1.5,max:null,pressure:.1/60,icon:'◈'},
      {id:'retake',name:'リテイク',label:'回避のファンブルを1度だけ振り直す',description:"回避判定のファンブルを1度だけ振り直す。",cost:500000,max:1,icon:'↶'},
      {id:'reversal',name:'逆転',label:'敵の命中クリティカルを1度だけ振り直す',description:"敵の命中判定のクリティカルを1度だけ振り直す。",cost:500000,max:1,icon:'⇄'},
      {id:'fightingSpirit',name:'闘志',label:'致死ダメージ時、30%でHP1に踏みとどまる',description:"致死ダメージ時、30%でHP1に踏みとどまる。",cost:500000,max:1,icon:'◆'},
      {id:'badLuck',name:'悪運',label:'致死ダメージ時、30%でダメージ半減',description:"致死ダメージ時、30%でダメージを半減する。",cost:500000,max:1,icon:'⚄'},
      { id: 'reward', name: 'クリア報酬増加', label: '基礎クリア報酬＋10% / Lv', description: '基礎クリア報酬に1Lvごとに10%加算。', cost: 100, max: null, icon: '◇' },
      { id: 'overkill', name: 'オーバーキルボーナス', label: '撃破時のHPが−20以下なら報酬＋25%', description: "残りHPを20以上超えて倒すと、クリア報酬＋25%。", cost: 200, max: 1, icon: '✦', threshold: 20, bonusRate: .25 }
    ]
  };
  data.characters.push({"id":"jewel","name":"ジュエル","initials":"JW","title":"宝石の拳","role":"高い防御・因子の獲得","cost":12000,"powerCost":2400,"actionCost":3000,"dice":3,"flat":5,"action":11,"accuracy":{"flat":16,"dice":1},"actionDice":{"flat":4,"dice":2},"evasion":{"flat":6,"dice":1},"ss":{"flat":10,"dice":1},"maxHP":36,"defense":7,"resistance":4,"color":"#df91d8","portrait":"./img/jewel-standing-v6.png","downSprite":"./img/jewel-down-v3.png","description":"宝石を身に着けた拳闘家。因子の蓄えを力と収入に変える。","source":"ユーザー提供の設定・参考画像","perks":[{"id":"side-income","initial":true,"level":0,"cost":0,"name":"臨時収入","sideIncome":true,"description":"部隊参加中、まれに所持因子の1%を獲得。"},{"id":"crimson-fist","level":10,"cost":100000,"name":"紅の拳","doubleHitIncome":true,"description":"倍差命中時、与ダメージ分の因子を獲得。"},{"id":"adamant-fist","level":25,"cost":1000000,"name":"金剛の剛拳","flat":3,"defenseBonus":4,"description":"攻撃力＋3、防御＋4。"},{"id":"rainbow-armor","level":100,"cost":1000000000,"name":"虹の装甲","rainbowArmor":true,"description":"倍差命中時、その攻撃から3R、攻撃力・防御＋15。"},{"id":"crystal-radiance","levelType":"accuracy","level":50,"cost":10000000,"name":"水晶の煌","evasionReduction":6,"description":"攻撃命中時、対象の回避を2Rの間−6。"},{"id":"yellow-glow","levelType":"armor","level":10,"cost":100000,"name":"黄の発光","defenseBonus":4,"allyTargetWeight":0.5,"description":"防御＋4。他の味方の狙われやすさを半減。"},{"id":"iolite-shield","levelType":"armor","level":50,"cost":10000000,"name":"菫青の大盾","defenseBonus":8,"damageIncome":true,"description":"防御＋8。受けたダメージ分の因子を獲得。"},{"id":"black-egg","levelType":"armor","level":100,"cost":1000000000,"name":"黒蛋の魂","investmentArmor":true,"description":"プレイヤーの所持因子が1兆Rdを超えると防御＋10。以降、倍増するごとにさらに＋3。"}]});
  data.jewelVisual={sheet:'./img/jewel-animation-v6.png'};
  const allyCombat={meta:[14,1,8],richter:[14,1,7],vishunal:[12,1,10],tordeliese:[20,1,6],waku:[14,1,14],max:[4,2,12],jewel:[16,1,4]};
  for(const c of data.characters){
    const [flat,dice,actionFlat]=allyCombat[c.id];
    c.accuracy={flat,dice};c.actionDice={flat:actionFlat,dice:2};c.action=actionFlat+7;
    if(c.id==='max')c.attackType='mental';
  }
  const enemyCombat={mohicans:[10,2],scarecrow:[2,30],dementor:[14,4]};
  for(const q of data.sessions){
    const [flat,resistance]=enemyCombat[q.id];q.evasion={flat,dice:1};q.resistance=resistance;
    if(q.id==='mohicans'){q.actionDice={flat:4,dice:2};q.action=11;}
    else if(q.id==='dementor'){delete q.actionDice;q.action=7;}
  }
  // Keep the original swarm ID so existing levels, rosters and combat state survive.
  const max=data.characters.find(c=>c.id==='max');max.perks.sort((a,b)=>(!!b.initial)-(!!a.initial)||a.level-b.level);
  const contacts={meta:[255,256,221],richter:[244,256,243],vishunal:[237,256,202],tordeliese:[252,256,236],max:[256,251,242],waku:[256,256,240],jewel:[256,256,240]};
  for(const c of data.characters){const [width,height,bottom]=contacts[c.id];c.downContact={width,height,bottom};}
  const swarm=data.sessions.find(q=>q.id==='mohicans');
  const solo={...swarm,id:'mohican-solo',code:'01',name:'今日も今日とてモヒカン日和',unlockFactors:0,formationCount:1,traits:['mohican'],reward:2,description:'工業地帯でモヒカンと一対一。倒した敵は5秒後に再出現する。'};
  data.sessions=[solo,data.sessions.find(q=>q.id==='scarecrow'),swarm,data.sessions.find(q=>q.id==='dementor')];
  data.sessions.push({id:'ozmorn',code:'05',name:'ところにより雷が伴う見込みです',unlockFactors:1000000,
    area:'廃ビルの屋上',enemy:'オズモーン',hp:130,defense:0,resistance:0,defenseGrowth:1.1,
    attack:{dice:3,flat:3},ignoreDefense:true,accuracy:{flat:15,dice:1},evasion:{flat:9,dice:1},ss:{flat:16,dice:1},actionDice:{flat:7,dice:2},action:14,
    attackSeconds:1.1,formationCount:1,summons:true,traits:[],reward:45,enemyScale:1.7,defeatStyle:'dissolve',defeatSheet:'./img/enemy-ozmorn-defeat-v1.png',
    description:'雷を操る巨雲。被弾するとコグモを生み、時には吸い込んで回復する。',
    background:'./img/rooftop-overcast-day-v1.png',nightBackground:'./img/rooftop-overcast-night-v1.png',
    dawnBackground:'./img/rooftop-overcast-dawn-v1.png',duskBackground:'./img/rooftop-overcast-dusk-v1.png',
    sheet:'./img/enemy-ozmorn-idle-v1.png',attackSheet:'./img/enemy-ozmorn-attack-v1.png',absorbSheet:'./img/enemy-ozmorn-absorb-v1.png',
    summon:{name:'コグモ',sheet:'./img/enemy-kogumo-idle-v1.png',attackSheet:'./img/enemy-kogumo-attack-v1.png',defeatStyle:'dissolve',attack:{dice:3,flat:3},actionDice:{flat:10,dice:1},defense:0,resistance:0,apAttack:true}});
  for(const c of data.characters){const type={meta:'awakening',richter:'awakening',jewel:'awakening',vishunal:'reaction',waku:'reaction',tordeliese:'recovery',max:'recovery'}[c.id];c.activationType=type;c.baseRunawayPressure=data.runtimeBalance.basePressures[type==='awakening'?'normal':type==='reaction'?'slightlyLow':'low'];for(const p of c.perks||[]){p.runawayPressure??=0;p.effectClass??=(p.transferAction||p.partyActionDice||p.partyEvasionDice||p.sharePowerLevel||p.selectedActionRate||p.freeActionChance||p.protectLowestHP)?'support':'special';}}
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.YggData = data;
})(typeof window !== 'undefined' ? window : globalThis);
