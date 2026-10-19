(function(root){
  'use strict';
  // Current character definitions. Legacy prices are retained in save migrations.
  const characters = [
{
  "id": "megumin",
  "name": "江間 愛",
  "shortName": "めぐみん",
  "initials": "MG",
  "title": "爆裂魔法使い",
  "role": "魔力詠唱・全体攻撃",
  "cost": 500,
  "powerCost": 100,
  "actionCost": 125,
  "dice": 4,
  "flat": 1,
  "action": 13,
  "actionDice": {
    "flat": 6,
    "dice": 2
  },
  "accuracy": {
    "flat": 13,
    "dice": 1
  },
  "evasion": {
    "flat": 8,
    "dice": 1
  },
  "ss": {
    "flat": 14,
    "dice": 1
  },
  "maxHP": 18,
  "defense": 1,
  "resistance": 6,
  "activationType": "awakening",
  "baseRunawayPressure": 0.03,
  "color": "#f5673d",
  "portrait": "./img/megumin-standing-v1.png",
  "downSprite": "./img/megumin-down-v1.png",
  "downContact": {
    "width": 384,
    "height": 384,
    "bottom": 360
  },
  "description": "爆裂魔法にすべてを注ぐ魔法使い。一撃の後は力を使い果たして倒れ込む。",
  "source": "ユーザー提供のキャラクター設定・参考画像",
  "perks": [
    {
      "id": "explosion-girl",
      "name": "頭のおかしい爆裂娘",
      "level": 0,
      "runawayPressure": 0.016666666666666666,
      "cost": 0,
      "description": "魔力1から開始し、各魔力パークの到達値も＋1。手番ごとに魔力を1段階高め、最高値に達した次の手番に攻撃。魔力パークがなければ魔力1で攻撃する。攻撃後は魔力1に戻り、1手番スタンして回避も自動失敗する。",
      "initial": true,
      "afterAttackStun": 1,
      "magicCharge": true
    },
    {
      "id": "wide-explosion",
      "name": "広域爆発",
      "level": 0,
      "runawayPressure": 0,
      "cost": 0,
      "description": "攻撃が全体攻撃となる。",
      "awakeningLevel": 1,
      "areaAttack": true
    },
    {
      "id": "blast-barrier",
      "name": "過剰魔力",
      "level": 0,
      "runawayPressure": 0,
      "cost": 0,
      "description": "魔力1点あたりの攻撃力・命中力補正が、めぐみんのLv10ごとにさらに＋1。",
      "awakeningLevel": 3,
      "magicBonusLevelStep": 10
    },
    {
      "id": "quick-chant",
      "name": "高速詠唱",
      "level": 0,
      "cost": 0,
      "runawayPressure": 0,
      "awakeningLevel": 2,
      "runawayActionStep": 10,
      "description": "暴走率10%につき行動力＋1。"
    },
    {
      "id": "crimson-flame",
      "name": "紅き黒炎",
      "level": 10,
      "runawayPressure": 0.0016666666666666668,
      "cost": 0,
      "description": "魔力をLv2まで高められるようになる（頭のおかしい爆裂娘の＋1込み）。最高Lvに達した次の手番に攻撃する。",
      "magicLevel": 1
    },
    {
      "id": "king-of-worlds",
      "name": "万界の王",
      "level": 25,
      "runawayPressure": 0.005,
      "cost": 0,
      "description": "魔力をLv3まで高められるようになる（頭のおかしい爆裂娘の＋1込み）。最高Lvに達した次の手番に攻撃する。",
      "magicLevel": 2
    },
    {
      "id": "laws-of-heaven",
      "name": "天地の法を敷衍すれど",
      "level": 50,
      "runawayPressure": 0.008333333333333333,
      "cost": 0,
      "description": "魔力をLv4まで高められるようになる（頭のおかしい爆裂娘の＋1込み）。最高Lvに達した次の手番に攻撃する。",
      "magicLevel": 3
    },
    {
      "id": "rising-heat",
      "name": "我は万象昇温の理",
      "level": 100,
      "runawayPressure": 0.011666666666666665,
      "cost": 0,
      "description": "魔力をLv5まで高められるようになる（頭のおかしい爆裂娘の＋1込み）。最高Lvに達した次の手番に攻撃する。",
      "magicLevel": 4
    },
    {
      "id": "destruction",
      "name": "崩壊破壊の別名なり",
      "level": 150,
      "runawayPressure": 0.015000000000000001,
      "cost": 0,
      "description": "魔力をLv6まで高められるようになる（頭のおかしい爆裂娘の＋1込み）。最高Lvに達した次の手番に攻撃する。",
      "magicLevel": 5
    },
    {
      "id": "eternal-hammer",
      "name": "永劫の鉄槌は我がもとに下れ",
      "level": 200,
      "runawayPressure": 0.018333333333333333,
      "cost": 0,
      "description": "魔力をLv7まで高められるようになる（頭のおかしい爆裂娘の＋1込み）。最高Lvに達した次の手番に攻撃する。",
      "magicLevel": 6
    }
  ],
  "magicPower": 11
},
{
  "id": "queen",
  "name": "クイーン・ガーランド",
  "shortName": "クイーン",
  "initials": "QN",
  "title": "女王",
  "role": "精神攻撃・行動妨害",
  "cost": 50000,
  "powerCost": 6000,
  "actionCost": 7500,
  "dice": 1,
  "flat": 0,
  "action": 10,
  "actionDice": {
    "flat": 3,
    "dice": 2
  },
  "accuracy": {
    "flat": 8,
    "dice": 2
  },
  "evasion": {
    "flat": 4,
    "dice": 2
  },
  "ss": {
    "flat": 17,
    "dice": 2
  },
  "maxHP": 15,
  "defense": 0,
  "resistance": 8,
  "activationType": "reaction",
  "baseRunawayPressure": 0.03,
  "color": "#aca0f1",
  "portrait": "./img/queen-standing-v3.png",
  "downSprite": "./img/queen-down-v2.png",
  "downContact": {
    "width": 384,
    "height": 384,
    "bottom": 360
  },
  "hiddenAttack": true,
  "statFlavor": {
    "action": "忙しなく動く必要などない",
    "power": "計り知れない",
    "accuracy": "手加減をしている？",
    "evasion": "躱すまでもない",
    "ss": "強い！",
    "vitality": "一見すると華奢だが……",
    "defense": "謙遜甚だしい",
    "resistance": "高い！"
  },
  "description": "不敵な笑みで戦場を見守る女王。その足元がわずかに震えているのは……。",
  "source": "ユーザー提供のキャラクター設定・参考画像",
  "perks": [
    {
      "id": "queens-bless",
      "name": "QUEEN's BLESS",
      "level": 0,
      "initial": true,
      "baseAttack": {
        "dice": 4,
        "flat": 0
      },
      "attackType": "mental",
      "apAttack": true,
      "description": "このキャラクターが本気を出せば戦闘など一瞬でカタがついてしまうが、それでは面白くないので、代わりにHPではなく行動値を低下させる4D6威力の精神攻撃を行う。低下率は換算後威力÷（対象最大HP＋換算後威力）、最大50%・5秒。重ねがけは最大値を維持して時間を更新する。",
      "runawayPressure": 0,
      "cost": 0,
      "effectClass": "special"
    },
    {
      "id": "royal-presence",
      "name": "女王の貫禄",
      "level": 25,
      "partyAccuracyBonus": 4,
      "description": "クイーンが見守ってくれている。その絶大な安心感が味方全体の命中判定を＋4する。",
      "runawayPressure": 0.006666666666666667,
      "cost": 0,
      "effectClass": "support"
    },
    {
      "id": "royal-blessing",
      "name": "女王の祝福",
      "level": 50,
      "partyCalming": 0.0016666666666666668,
      "description": "クイーンの圧倒的な武勇への信頼が、部隊の鎮静圧を毎分＋0.1する。",
      "runawayPressure": 0.005,
      "cost": 0,
      "effectClass": "support"
    },
    {
      "id": "royal-intimidation",
      "name": "女王の威圧",
      "level": 75,
      "enemyActionReduction": 0.1,
      "description": "クイーンの鋭い眼光は標的の魂を砕く。敵全体の行動値が−10%されるが、眼光だけでこれなら実際に武器を取れば果たしてどうなってしまうものか、想像だに恐ろしい。",
      "runawayPressure": 0.013333333333333334,
      "cost": 0,
      "effectClass": "support"
    },
    {
      "id": "insolent",
      "name": "「この無礼者」",
      "level": 100,
      "interceptAttack": true,
      "description": "クイーンに刃を向ける事はそれだけで圧倒的な恐怖が伴う。自身を攻撃する敵へ精神攻撃を行い、命中したなら攻撃をキャンセルする。次の手番も遅らせる（参加者の行動値合計の50%→37.5%→25%→12.5%を優先度から減算）。同じ敵へ4回成功すると無効。優先度の下限は合計行動値の−2倍。",
      "runawayPressure": 0.025,
      "cost": 0,
      "effectClass": "special"
    },
    {
      "id": "killer-queen",
      "name": "KILLER QUEEN",
      "level": 150,
      "apDiceBonus": 2,
      "description": "その絶大な気迫がさらに増幅し、《QUEEN's BLESS》による行動低下の換算前威力が＋2D6される。恐ろしくも頼もしい彼女の潜在能力は、未だ底が見えない。",
      "runawayPressure": 0.016666666666666666,
      "cost": 0,
      "effectClass": "special"
    }
  ]
},
{
  "id": "mitsuru",
  "name": "オオイシ・ミツル",
  "shortName": "ミツル",
  "initials": "OM",
  "title": "ワイヤー使い",
  "role": "電撃ケーブル・挑発",
  "cost": 100,
  "powerCost": 20,
  "actionCost": 25,
  "dice": 4,
  "flat": 1,
  "action": 9,
  "actionDice": {
    "flat": 2,
    "dice": 2
  },
  "accuracy": {
    "flat": 13,
    "dice": 1
  },
  "evasion": {
    "flat": 6,
    "dice": 1
  },
  "ss": {
    "flat": 5,
    "dice": 1
  },
  "maxHP": 32,
  "defense": 7,
  "resistance": 1,
  "activationType": "recovery",
  "baseRunawayPressure": 0.02,
  "color": "#74dce4",
  "portrait": "./img/mitsuru-standing-v1.png",
  "downSprite": "./img/mitsuru-down-v1.png",
  "downContact": {
    "width": 384,
    "height": 384,
    "bottom": 360
  },
  "description": "表情豊かな白い機械の身体。電気を帯びたケーブルを操り、仲間を守る。",
  "source": "ユーザー提供のキャラクター設定・参考画像",
  "perks": [
    {
      "id": "wire-self",
      "name": "ワイヤーセルフ",
      "level": 0,
      "initial": true,
      "taunt": true,
      "description": "命中時、対象の次の攻撃を自身に引きつける。",
      "cost": 0,
      "runawayPressure": 0.0033333333333333335
    },
    {
      "id": "spark-shot",
      "name": "スパークショット",
      "level": 10,
      "apReduction": 4,
      "description": "命中時、威力4を対象の耐久力で換算した行動値低下（5秒、合計最大50%）。",
      "cost": 0,
      "runawayPressure": 0.008333333333333333
    },
    {
      "id": "wire-action",
      "name": "ワイヤーアクション",
      "level": 25,
      "actionBonus": 4,
      "description": "行動力＋4。",
      "cost": 0,
      "runawayPressure": 0.008333333333333333
    },
    {
      "id": "tour-de-france",
      "name": "ツール・ド・フランス",
      "level": 50,
      "accuracyBonus": 13,
      "description": "命中力＋13。",
      "cost": 0,
      "runawayPressure": 0.0033333333333333335
    },
    {
      "id": "spaghetti-code",
      "name": "スパゲッティコード",
      "level": 75,
      "retaliationSlow": 4,
      "description": "被弾時、攻撃した敵の行動力を5秒間−4。",
      "cost": 0,
      "runawayPressure": 0.01
    },
    {
      "id": "cat-cradle",
      "name": "綾取り",
      "level": 100,
      "defenseBonus": 10,
      "description": "防御＋10。",
      "cost": 0,
      "runawayPressure": 0.006666666666666667
    },
    {
      "id": "radioactivity",
      "name": "レディオアクティビティ",
      "level": 150,
      "diceBonus": 4,
      "flat": 1,
      "ignoreDefense": true,
      "description": "攻撃力＋4D6＋1。攻撃が防御貫通を得る。",
      "cost": 0,
      "runawayPressure": 0.025
    }
  ]
},
  {
    "id": "meta",
    "defense": 2,
    "resistance": 6,
    "maxHP": 20,
    "evasion": {
      "flat": 9,
      "dice": 1
    },
    "ss": {
      "flat": 12,
      "dice": 1
    },
    "downSprite": "./img/meta-down-v1.png",
    "name": "鋼音メタ",
    "initials": "MT",
    "title": "丸鋸使い",
    "role": "防御無視・モヒカン特効",
    "cost": 10,
    "powerCost": 8,
    "actionCost": 10,
    "dice": 3,
    "flat": 5,
    "action": 15,
    "color": "#ee929e",
    "portrait": "./img/meta-standing-v7.png",
    "description": "赤髪の丸鋸使い。Lvに応じて丸鋸の数と大きさが増す。",
    "source": "ユーザー提供のキャラクター設定・参考画像",
    "perks": [
      {
        "id": "mohican-slayer",
        "level": 0,
        "cost": 0,
        "name": "モヒカン死すべし、慈悲はない",
        "targetTrait": "mohican",
        "damageBonus": 15,
        "description": "[モヒカン]へのダメージ＋15。",
        "runawayPressure": 0,
        "initial": true
      },
      {
        "id": "attack-plus",
        "level": 10,
        "cost": 50,
        "name": "アタックプラス",
        "flat": 4,
        "description": "攻撃力＋4。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "lock-plus",
        "name": "ロックプラス",
        "levelType": "accuracy",
        "level": 25,
        "cost": 50,
        "accuracyBonus": 4,
        "description": "命中力＋4。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "metal-shield",
        "name": "メタルシールド",
        "levelType": "armor",
        "level": 50,
        "cost": 1000,
        "normalHitDefense": 6,
        "description": "倍差命中以外の被弾時、その攻撃への防御＋6。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "metal-blade",
        "level": 75,
        "cost": 50000,
        "name": "レアメタル・ブレード",
        "ignoreDefense": true,
        "description": "攻撃が防御貫通を得る。",
        "runawayPressure": 0.005
      },
      {
        "id": "spinning-rush",
        "name": "三＠三＠三＠",
        "levelType": "action",
        "level": 100,
        "cost": 50000,
        "extraAttackChance": 0.25,
        "description": "攻撃時25%で追加攻撃。連続発動する。",
        "runawayPressure": 0.005
      },
      {
        "id": "metal-storm",
        "level": 125,
        "cost": 30000,
        "name": "メタルストーム",
        "areaAttack": true,
        "areaTrait": "swarm",
        "description": "[群れ]に対して全体攻撃を行う。",
        "runawayPressure": 0.008333333333333333
      },
      {
        "id": "full-metal-burst",
        "level": 150,
        "cost": 30000000,
        "name": "フルメタルバースト",
        "flat": 8,
        "description": "攻撃力＋8、命中力＋8。",
        "accuracyBonus": 8,
        "runawayPressure": 0.015000000000000001
      }
    ],
    "accuracy": {
      "flat": 14,
      "dice": 1
    },
    "actionDice": {
      "flat": 8,
      "dice": 2
    },
    "downContact": {
      "width": 255,
      "height": 256,
      "bottom": 221
    },
    "activationType": "awakening"
  },
  {
    "id": "richter",
    "defense": 1,
    "resistance": 6,
    "maxHP": 24,
    "evasion": {
      "flat": 9,
      "dice": 1
    },
    "ss": {
      "flat": 12,
      "dice": 1
    },
    "downSprite": "./img/richter-down-v1.png",
    "name": "ゲルハムト・リヒター",
    "initials": "GR",
    "title": "BoM-BeR",
    "role": "爆弾投球・群れへの全体攻撃",
    "cost": 2500,
    "powerCost": 20,
    "actionCost": 25,
    "dice": 5,
    "flat": 0,
    "action": 14,
    "color": "#e5ae83",
    "portrait": "./img/richter-standing-v11.png",
    "description": "Lvに応じて数と大きさが増す爆弾クリーチャーを投げる。Lvの節目で特性が解放され、BoM-BeRで群れの3体へ全体攻撃する。",
    "source": "ユーザー提供のキャラクター設定・参考画像",
    "perks": [
      {
        "id": "z-bom",
        "level": 0,
        "cost": 0,
        "name": "Z-BoM.",
        "diceEvery": 10,
        "description": "Lv10ごとに攻撃力＋1D6。",
        "runawayPressure": 0.0033333333333333335,
        "initial": true
      },
      {
        "id": "dx-bom",
        "level": 10,
        "cost": 1000,
        "name": "DX-BoM.",
        "flat": 8,
        "description": "攻撃力の固定値＋8。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "bom-ber",
        "level": 25,
        "cost": 10000,
        "name": "BoM-BeR",
        "areaAttack": true,
        "description": "[群れ]に対して全体攻撃を行う。",
        "areaTrait": "swarm",
        "runawayPressure": 0.005
      },
      {
        "id": "gx-bom",
        "name": "GX-BoM.",
        "level": 50,
        "cost": 0,
        "runawayPressure": 0.008333333333333333,
        "extraAttackChance": 0.25,
        "description": "攻撃時25%で追加攻撃。連続発動する。"
      },
      {
        "id": "vx-bom",
        "level": 75,
        "cost": 3000000,
        "name": "VX-BoM.",
        "flat": 16,
        "description": "攻撃力の固定値＋16。",
        "runawayPressure": 0.011666666666666665
      },
      {
        "id": "ex-bom",
        "level": 100,
        "cost": 100000000,
        "name": "EX-BoM.",
        "flat": 24,
        "description": "攻撃力の固定値＋24。",
        "runawayPressure": 0.015000000000000001
      }
    ],
    "accuracy": {
      "flat": 14,
      "dice": 1
    },
    "actionDice": {
      "flat": 7,
      "dice": 2
    },
    "downContact": {
      "width": 244,
      "height": 256,
      "bottom": 243
    },
    "activationType": "awakening"
  },
  {
    "id": "vishunal",
    "defense": 4,
    "resistance": 1,
    "maxHP": 36,
    "evasion": {
      "flat": 14,
      "dice": 1
    },
    "ss": {
      "flat": 9,
      "dice": 1
    },
    "downSprite": "./img/vishunal-down-v2.png",
    "name": "右藤ビシュナル",
    "initials": "UV",
    "title": "合法ランチャー",
    "role": "ミサイル・群れへの全体攻撃",
    "cost": 1000,
    "powerCost": 200,
    "actionCost": 250,
    "dice": 10,
    "flat": 0,
    "action": 17,
    "color": "#a6b8ef",
    "portrait": "./img/vishunal-poses-v2.png",
    "portraitSheet": true,
    "description": "ミサイルランチャーを背負った犬。かわいらしく、表情は読めない。",
    "source": "ユーザー提供のキャラクター設定・参考画像",
    "perks": [
      {
        "id": "mad-dog",
        "level": 0,
        "cost": 0,
        "name": "番犬",
        "description": "[群れ]の3体に全体攻撃。防御計算後のダメージを半減。",
        "areaAttack": true,
        "areaTrait": "swarm",
        "runawayPressure": 0.016666666666666666,
        "initial": true
      },
      {
        "id": "legal-launcher",
        "level": 25,
        "cost": 15000,
        "name": "合法ランチャー",
        "struckPrefix": "違",
        "diceBonus": 10,
        "description": "基礎攻撃力に＋10D6。",
        "runawayPressure": 0.016666666666666666
      },
      {
        "id": "missile-missile",
        "level": 75,
        "cost": 3000000,
        "name": "ミサイルミサイルミサイルミサ…",
        "description": "攻撃力に＋10D6。",
        "diceBonus": 10,
        "runawayPressure": 0.016666666666666666
      },
      {
        "id": "rabid-dog",
        "name": "狂犬",
        "level": 100,
        "cost": 0,
        "runawayPressure": 0,
        "runawayAsMisfire": true,
        "misfireSelfAttack": {
          "dice": 2,
          "flat": 0
        },
        "effectClass": "special",
        "description": "暴走ロールをすべて暴発に変更。この暴発で自身に当たる場合、攻撃力を2D6＋0として扱う。"
      }
    ],
    "accuracy": {
      "flat": 12,
      "dice": 1
    },
    "actionDice": {
      "flat": 10,
      "dice": 2
    },
    "downContact": {
      "width": 237,
      "height": 256,
      "bottom": 202
    },
    "activationType": "reaction"
  },
  {
    "id": "tordeliese",
    "defense": 0,
    "resistance": 2,
    "maxHP": 15,
    "evasion": {
      "flat": 12,
      "dice": 1
    },
    "ss": {
      "flat": 12,
      "dice": 1
    },
    "downSprite": "./img/tordeliese-down-v2.png",
    "name": "トルデリーゼ・トルンヴァルト",
    "initials": "TT",
    "title": "ムカデの触手",
    "role": "猛毒・連鎖する追加攻撃",
    "cost": 2500,
    "powerCost": 500,
    "actionCost": 625,
    "dice": 3,
    "flat": 1,
    "action": 13,
    "color": "#e59bab",
    "portrait": "./img/tordeliese-standing-v7.png",
    "description": "ムカデ型の触手で攻撃し、猛毒で仲間の攻撃にも持続ダメージを添える。",
    "source": "ユーザー提供のキャラクター設定・参考画像",
    "perks": [
      {
        "id": "greedy-gale",
        "level": 0,
        "cost": 0,
        "name": "貪戻の凩",
        "inflictPoison": true,
        "poisonDamage": 4,
        "poisonStrengthExponent": 0.5,
        "description": "攻撃命中時に猛毒を付与。猛毒状態の敵は被弾ごとに4点の非接触ダメージ。攻撃強度に応じて猛毒ダメージも上昇する。",
        "runawayPressure": 0.005,
        "initial": true
      },
      {
        "id": "retreating-wind",
        "level": 25,
        "cost": 300000,
        "name": "退嬰の風",
        "extraAttackChance": 0.3,
        "description": "攻撃時、30%で追加攻撃。連続発動する。",
        "runawayPressure": 0.005
      },
      {
        "id": "folding-gale",
        "name": "畳なわる颯",
        "levelType": "accuracy",
        "level": 50,
        "cost": 300000,
        "accuracyBonus": 12,
        "poisonBonus": 4,
        "description": "命中判定＋12、猛毒ダメージ＋4。",
        "runawayPressure": 0.008333333333333333
      },
      {
        "id": "severing-storm",
        "level": 75,
        "cost": 3000000,
        "name": "断ち切る颶",
        "flat": 12,
        "poisonDamage": 8,
        "description": "攻撃力＋12。猛毒ダメージを8に強化。",
        "runawayPressure": 0.008333333333333333
      },
      {
        "id": "demonic-hammer",
        "level": 100,
        "cost": 100000000,
        "name": "天魔の鉄槌",
        "ignoreDefense": true,
        "description": "防御を無視する（貫通無効を除く）。",
        "runawayPressure": 0.008333333333333333
      },
      {
        "id": "for-whom-the-storm",
        "name": "誰が為の颶",
        "levelType": "action",
        "level": 125,
        "cost": 100000000,
        "actionBonus": 12,
        "poisonBonus": 4,
        "description": "行動力＋12、猛毒ダメージ＋4。",
        "runawayPressure": 0.013333333333333334
      },
      {
        "id": "annihilation",
        "level": 150,
        "cost": 1000000000,
        "name": "染滅",
        "description": "倍差命中時、ダメージ判定＋40。",
        "doubleHitDamage": 40,
        "runawayPressure": 0.03333333333333333
      }
    ],
    "accuracy": {
      "flat": 20,
      "dice": 1
    },
    "actionDice": {
      "flat": 6,
      "dice": 2
    },
    "downContact": {
      "width": 252,
      "height": 256,
      "bottom": 236
    },
    "activationType": "recovery"
  },
  {
    "id": "max",
    "defense": 1,
    "resistance": 2,
    "maxHP": 22,
    "evasion": {
      "flat": 16,
      "dice": 2
    },
    "ss": {
      "flat": 16,
      "dice": 2
    },
    "downSprite": "./img/max-down-v2.png",
    "name": "ゲイリー・R・I・マクスウェル",
    "shortName": "マックス",
    "initials": "MX",
    "title": "GM",
    "role": "味方の行動支援・運命操作",
    "cost": 12000,
    "powerCost": 2400,
    "actionCost": 3000,
    "dice": 1,
    "flat": 6,
    "action": 19,
    "color": "#cbd0f4",
    "portrait": "./img/gamer-throne-standing-v7.png",
    "description": "玉座型の飛行ヴィークルに座る少年。ゲームを操り、敵へタライを落とす。",
    "source": "ユーザー提供の設定・既存スプライト",
    "perks": [
      {
        "id": "gm",
        "level": 0,
        "initial": true,
        "levelType": "action",
        "cost": 0,
        "name": "GM",
        "transferAction": true,
        "description": "自動行動を仲間に譲る。手動攻撃の選択対象が優先。譲れる仲間がいなければ自分で攻撃。",
        "runawayPressure": 0.0033333333333333335
      },
      {
        "id": "handout",
        "level": 25,
        "levelType": "action",
        "cost": 1000000,
        "name": "ハンドアウト",
        "selectedActionRate": 0.2,
        "description": "手動攻撃に選択中のキャラクターの行動値＋20%。",
        "runawayPressure": 0.008333333333333333
      },
      {
        "id": "plot-armor",
        "level": 50,
        "levelType": "armor",
        "cost": 10000000,
        "name": "プロットアーマー",
        "enemyDamageSides": 4,
        "description": "部隊全体の行動値＋1D6。敵のダメージダイスをD4に変更。",
        "partyActionDice": 1,
        "runawayPressure": 0.008333333333333333
      },
      {
        "id": "mouth-wrestling",
        "level": 75,
        "levelType": "action",
        "cost": 100000000,
        "name": "口プロレス",
        "partyEvasionDice": 2,
        "description": "部隊全体の回避力＋2D6。",
        "runawayPressure": 0.013333333333333334
      },
      {
        "id": "named-npc",
        "level": 100,
        "levelType": "action",
        "cost": 1000000000,
        "name": "ネームドNPC",
        "freeActionChance": 0.5,
        "description": "手動攻撃に選択中の仲間は、50%の確率で同一手番内に追加行動（最大8行動）。",
        "runawayPressure": 0.016666666666666666
      }
    ],
    "accuracy": {
      "flat": 4,
      "dice": 2
    },
    "actionDice": {
      "flat": 12,
      "dice": 2
    },
    "attackType": "mental",
    "downContact": {
      "width": 256,
      "height": 251,
      "bottom": 242
    },
    "activationType": "recovery"
  },
  {
    "id": "waku",
    "maxHP": 20,
    "defense": 1,
    "resistance": 3,
    "evasion": {
      "flat": 16,
      "dice": 1
    },
    "ss": {
      "flat": 9,
      "dice": 1
    },
    "downSprite": "./img/waku-down-v1.png",
    "name": "元加 枠",
    "initials": "WK",
    "title": "フレーム使い",
    "role": "木刀と拳銃・敵の弱体化",
    "cost": 4000,
    "powerCost": 800,
    "actionCost": 1000,
    "dice": 4,
    "flat": 0,
    "action": 21,
    "color": "#83c7e1",
    "portrait": "./img/waku-standing-v3.png",
    "description": "木刀と拳銃で戦う少年。敵の判定を崩し、仲間を守る。",
    "source": "ユーザー提供の設定・スプライト・参考画像",
    "perks": [
      {
        "id": "deceptive-hitbox",
        "levelType": "action",
        "level": 0,
        "cost": 0,
        "name": "詐欺判定有効",
        "partyEvasionBonus": 3,
        "description": "部隊全体の回避判定＋3。",
        "runawayPressure": 0.0016666666666666668,
        "initial": true
      },
      {
        "id": "expanded-hurtbox",
        "level": 10,
        "cost": 50000,
        "name": "食らい判定拡大",
        "defenseReduction": 3,
        "description": "攻撃した敵の防御力−3。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "floor-clip",
        "levelType": "action",
        "level": 25,
        "cost": 500000,
        "name": "地面めり込みバグ",
        "protectLowestHP": true,
        "description": "現在HPが最も低い仲間1人を保護。10秒ごとに対象を更新。自身のみの場合は無効。",
        "runawayPressure": 0.0033333333333333335
      },
      {
        "id": "monado-smash",
        "level": 50,
        "cost": 5000000,
        "name": "モナドスマッシュ",
        "ignoreDefense": true,
        "description": "防御を無視する。",
        "runawayPressure": 0.005
      },
      {
        "id": "invisible-wall",
        "level": 75,
        "cost": 500000,
        "name": "見えない壁",
        "apReductionRate": 0.05,
        "description": "攻撃した相手の行動値−5%（5秒）。",
        "runawayPressure": 0.005
      },
      {
        "id": "vanishing-hurtbox",
        "levelType": "action",
        "level": 100,
        "cost": 5000000,
        "name": "当たり判定消失",
        "nullifyChance": 0.2,
        "description": "自身への攻撃を20%の確率で無効にする。",
        "runawayPressure": 0.013333333333333334
      },
      {
        "id": "vanishing-hitbox",
        "levelType": "action",
        "level": 125,
        "cost": 500000000,
        "name": "攻撃判定消失",
        "accuracyPenaltyChance": 0.05,
        "accuracyPenalty": 15,
        "description": "命中時5%で、攻撃した相手の次の攻撃の命中判定−15。",
        "runawayPressure": 0.015000000000000001
      },
      {
        "id": "full-screen-hurtbox",
        "name": "全画面食らい判定",
        "levelType": "accuracy",
        "level": 150,
        "cost": 500000000,
        "autoHitChance": 0.15,
        "description": "攻撃が15%の確率で自動命中する。",
        "runawayPressure": 0.015000000000000001
      },
      {
        "id": "next-frame",
        "level": 200,
        "cost": 500000000,
        "name": "nextFrame",
        "diceBonus": 2,
        "description": "攻撃力＋2D6。命中時、攻撃した相手の次の回避判定を自動失敗にする。",
        "evasionFailureChance": 1,
        "runawayPressure": 0.025
      }
    ],
    "accuracy": {
      "flat": 14,
      "dice": 1
    },
    "actionDice": {
      "flat": 14,
      "dice": 2
    },
    "downContact": {
      "width": 256,
      "height": 256,
      "bottom": 240
    },
    "activationType": "reaction"
  },
  {
    "id": "jewel",
    "name": "豪雀朱院・Ｊ・鳳世輝",
    "shortName": "ジュエル",
    "initials": "JW",
    "title": "宝石の拳",
    "role": "高い防御・クレジットの獲得",
    "cost": 12000,
    "powerCost": 2400,
    "actionCost": 3000,
    "dice": 3,
    "flat": 5,
    "action": 11,
    "accuracy": {
      "flat": 16,
      "dice": 1
    },
    "actionDice": {
      "flat": 4,
      "dice": 2
    },
    "evasion": {
      "flat": 6,
      "dice": 1
    },
    "ss": {
      "flat": 10,
      "dice": 1
    },
    "maxHP": 36,
    "defense": 7,
    "resistance": 4,
    "color": "#df91d8",
    "portrait": "./img/jewel-standing-v8.png",
    "downSprite": "./img/jewel-down-v8.png",
    "description": "宝石を身に着けた拳闘家。クレジットの蓄えを力と収入に変える。",
    "source": "ユーザー提供の設定・参考画像",
    "perks": [
      {
        "id": "side-income",
        "initial": true,
        "level": 0,
        "cost": 0,
        "name": "臨時収入",
        "sideIncome": true,
        "description": "部隊参加中、まれに所持Cの1%を獲得。",
        "runawayPressure": 0
      },
      {
        "id": "yellow-glow",
        "levelType": "armor",
        "level": 10,
        "cost": 100000,
        "name": "黄の発光",
        "defenseBonus": 4,
        "allyTargetWeight": 0.5,
        "description": "防御＋4。他の味方の狙われやすさを半減。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "crimson-fist",
        "level": 25,
        "cost": 100000,
        "name": "紅の拳",
        "doubleHitIncome": true,
        "description": "倍差命中時、実際に減らしたHP分のCを獲得（残りHPを超えた分は除く）。",
        "runawayPressure": 0.0016666666666666668
      },
      {
        "id": "crystal-radiance",
        "levelType": "accuracy",
        "level": 50,
        "cost": 10000000,
        "name": "水晶の煌",
        "evasionReduction": 6,
        "description": "攻撃命中時、対象の回避を2Rの間−6。",
        "runawayPressure": 0.005
      },
      {
        "id": "iolite-shield",
        "levelType": "armor",
        "level": 75,
        "cost": 10000000,
        "name": "菫青の大盾",
        "defenseBonus": 8,
        "damageIncome": true,
        "description": "防御＋8。受けたダメージ分のCを獲得。",
        "runawayPressure": 0.006666666666666667
      },
      {
        "id": "adamant-fist",
        "level": 100,
        "cost": 1000000,
        "name": "金剛の剛拳",
        "flat": 3,
        "defenseBonus": 4,
        "description": "攻撃力＋3、防御＋4。",
        "runawayPressure": 0.01
      },
      {
        "id": "rainbow-armor",
        "level": 125,
        "cost": 1000000000,
        "name": "虹の装甲",
        "rainbowArmor": true,
        "description": "倍差命中時、その攻撃から3R、攻撃力・防御＋15。",
        "runawayPressure": 0.016666666666666666
      },
      {
        "id": "black-egg",
        "levelType": "armor",
        "level": 150,
        "cost": 1000000000,
        "name": "黒蛋の魂",
        "investmentArmor": true,
        "description": "プレイヤーの所持金が10億C以上になると防御＋10。以降、倍増するごとにさらに＋3。",
        "runawayPressure": 0.02
      }
    ],
    "downContact": {
      "width": 384,
      "height": 384,
      "bottom": 360
    },
    "activationType": "awakening"
  }
];
  characters.push({"id":"cherry","name":"チエリ・チヨコリィート","shortName":"チェリー","initials":"CH","cost":8000,"dice":3,"flat":5,"action":15,"actionDice":{"flat":8,"dice":2},"accuracy":{"flat":21,"dice":1},"evasion":{"flat":13,"dice":1},"ss":{"flat":10,"dice":1},"maxHP":15,"defense":1,"resistance":2,"activationType":"augment","baseRunawayPressure":0.005,"attackRange":[1,3],"perks":[{"id":"assert-dominance","name":"ASSERT DOMINANCE!","level":0,"initial":true,"runawayPressure":0.01,"description":"耐性：火炎、弱点：風を得る。他者の火炎攻撃を受けるたび、次の自身の攻撃の攻撃力・命中力＋4。重複可能で、攻撃後に蓄積を消費する。","dominance":true,"cost":0},{"id":"burning","name":"BURNING","level":25,"runawayPressure":0.006666666666666667,"effectRange":[1,3],"description":"命中時、火炎の炎上を付与。炎上中の敵は被弾ごとに4点の非接触ダメージ。攻撃強度の平方根に比例して増加。対象またはチェリーがダウンするまで持続する。","burning":true,"cost":0},{"id":"volcano","name":"VOLCANO","level":50,"runawayPressure":0.01,"attackRange":[1,3],"description":"自身の手番ごとに自身を含む敵味方全員へ、火炎の非接触ダメージ4点。攻撃強度の平方根に比例して増加する。","volcano":true,"cost":0},{"id":"incinerate-them","name":"INCINERATE THEM!","level":75,"runawayPressure":0.011666666666666665,"effectRange":[1,3],"areaAttack":true,"description":"攻撃が全体攻撃になる。","cost":0},{"id":"dissatisfaction","name":"DISSATISFACTION","level":100,"runawayPressure":0.008333333333333333,"effectRange":[1,3],"description":"攻撃時25%で、自身を含む敵味方全員へ通常攻撃と同じ威力の火炎追加攻撃。","fireExtra":true,"cost":0},{"id":"extinguisher","name":"EXTINGUISHER","level":125,"runawayPressure":0.02,"description":"自身以外の味方全体が耐性：火炎を得る。","fireCover":true,"cost":0},{"id":"blazar","name":"BLAZAR","level":150,"effectRange":[1,3],"runawayPressure":0.016666666666666666,"flat":10,"blazar":true,"cost":0,"description":"[付加：1～3] 攻撃力＋10。彗星のような巨大な火球を相手へ叩き落とす。"}],"powerCost":500,"actionCost":625,"title":"炎上の支配者","role":"炎上・敵味方への火炎攻撃","color":"#eb626b","description":"火炎を受けて次の攻撃を強化し、敵味方を巻き込む炎を放つ。","portrait":"./img/cherry-idle-frame-0-v2.png","downSprite":"./img/cherry-down-frame-3-v2.png","downContact":{"width":384,"height":384,"bottom":360}});
  characters.push({"id":"pine","name":"パイン・アップル","shortName":"パイン","initials":"PN","cost":16000,"powerCost":1600,"actionCost":2000,"dice":4,"flat":2,"action":3,"actionDice":{"flat":3,"dice":2},"accuracy":{"flat":12,"dice":1},"evasion":{"flat":7,"dice":1},"ss":{"flat":4,"dice":1},"maxHP":65,"defense":5,"resistance":2,"activationType":"augment","baseRunawayPressure":0.02,"color":"#e6cf28","title":"パイナップルの仮面ヒーロー","role":"怪力・自己回復","description":"反動をものともしない怪力と、グミによる自己回復で戦う。","portrait":"./img/pine-pixel-v14.png","portraitSheet":true,"portraitClass":"pine-avatar","portraitColumns":4,"portraitRows":4,"downSprite":"./img/pine-pixel-v14.png","downContact":{"width":360,"height":360,"bottom":345},"source":"ユーザー提供のキャラクター設定・参考画像","perks":[{"id":"strength","name":"ストレングス","level":0,"cost":0,"runawayPressure":0.008333333333333333,"description":"攻撃強度＋10%。","initial":true,"strengthBonus":{"power":0.1}},{"id":"apple-gummy","name":"アップルグミ","level":10,"cost":0,"runawayPressure":0.016666666666666666,"description":"まれに自身の最大HPの30%を回復する（平均10分に1回）。","gummyHeal":0.3},{"id":"strongman","name":"力自慢","level":25,"cost":0,"runawayPressure":0.005,"description":"攻撃力+1D6。たまに反動ダメージを受ける。","diceBonus":1,"recoilDice":1,"recoilChance":0.08},{"id":"bulk-up","name":"バルクアップ","level":50,"cost":0,"runawayPressure":0.008333333333333333,"description":"HP強度＋20%。","strengthBonus":{"vitality":0.2}},{"id":"unrivaled-strength","name":"怪力無双","level":75,"cost":0,"runawayPressure":0.005,"description":"攻撃力+1D6。たまに反動ダメージを受ける。","diceBonus":1,"recoilDice":1,"recoilChance":0.08},{"id":"pine-gummy","name":"パイングミ","level":100,"cost":0,"runawayPressure":0.016666666666666666,"description":"アップルグミの回復量をさらに最大HPの30%増やす。","gummyBonus":0.3},{"id":"power-is-power","name":"力こそパワー","level":125,"cost":0,"runawayPressure":0.016666666666666666,"description":"攻撃強度＋10%。","strengthBonus":{"power":0.1}},{"id":"wonderful-curiosity","name":"すてきな好奇心","level":150,"cost":0,"runawayPressure":0.016666666666666666,"description":"命中力・回避力＋6、行動力＋3。","accuracyBonus":6,"evasionBonus":6,"actionBonus":3}]});
  characters.find(c=>c.id==='jewel').unlockCreditsEarned=1000000;
  const bomber=characters.find(c=>c.id==='richter');bomber.perks=[{"id":"g-bom","name":"G-BoM.","level":0,"initial":true,"runawayPressure":0.008333333333333333,"pomSummon":true,"description":"自身の行動後、ポムポムボムを1体召喚。次の自身の手番で消滅し、この手番の最初の攻撃のダメージ判定へ合体する。","cost":0},{"id":"awaken-x-bom","name":"X-BoM.","level":0,"awakeningLevel":1,"minRunaway":50,"runawayPressure":0,"pomDice":1,"description":"ポムポムボムの攻撃力＋1D6。","cost":0},{"id":"awaken-y-bom","name":"Y-BoM.","level":0,"awakeningLevel":1,"minRunaway":60,"runawayPressure":0,"pomDice":1,"description":"ポムポムボムの攻撃力＋1D6。","cost":0},{"id":"awaken-z-bom","name":"Z-BoM.","level":0,"awakeningLevel":1,"minRunaway":70,"runawayPressure":0,"pomDice":1,"description":"ポムポムボムの攻撃力＋1D6。","cost":0},{"id":"dx-bom","name":"DX-BoM.","level":10,"runawayPressure":0.0016666666666666668,"flat":8,"effectRange":[1,3],"description":"攻撃力＋8。","cost":0},{"id":"bom-ber","name":"BoM-BeR","level":25,"runawayPressure":0.005,"areaAttack":true,"areaTrait":"swarm","effectRange":[1,3],"description":"[群れ]に対して全体攻撃を行う。","cost":0},{"id":"v-bom","name":"V-BoM.","level":50,"runawayPressure":0.008333333333333333,"pomFlat":8,"effectRange":[1,3],"description":"ポムポムボムの攻撃力＋8。","cost":0},{"id":"gx-bom","name":"GX-BoM.","level":75,"runawayPressure":0.008333333333333333,"extraAttackChance":0.25,"effectRange":[1,3],"description":"攻撃時25%で追加攻撃。連続発動する。追加攻撃にポムポムボムの補正は乗らない。","cost":0},{"id":"gx-bom-double","name":"GX-BoM.","level":100,"runawayPressure":0.008333333333333333,"pomCount":2,"description":"ポムポムボムの召喚数が1体から2体に増加。","cost":0},{"id":"vx-bom","name":"VX-BoM.","level":125,"runawayPressure":0.011666666666666665,"flat":16,"effectRange":[1,3],"description":"攻撃力の固定値＋16。","cost":0},{"id":"ex-bom","name":"EX-BoM.","level":150,"runawayPressure":0.015000000000000001,"flat":24,"effectRange":[1,3],"description":"攻撃力の固定値＋24。","cost":0}];bomber.description='ポムポムボムを召喚し、次の攻撃で合体する爆破使い。';
  for(const c of characters){
    c.attackElements=['megumin','vishunal','richter'].includes(c.id)?['blast']:[];
    c.resistances=[];c.weaknesses=[];
    if(c.id==='mitsuru')for(const p of c.perks){
      if(['spark-shot','radioactivity'].includes(p.id))p.attackElements=['shock'];
      if(p.id==='spark-shot')p.effectElements={apReduction:['shock']};
      if(p.id==='spaghetti-code')p.effectElements={retaliationSlow:['shock']};
      if(['spark-shot','radioactivity'].includes(p.id))p.description='[攻撃：感電] '+p.description;
      if(['spark-shot','spaghetti-code'].includes(p.id))p.description='[付加：感電] '+p.description;
    }
  }
  const basic={pine:[1,1],cherry:[1,3],meta:[1,3],mitsuru:[1,2],megumin:[1,3],richter:[1,3],vishunal:[1,3],tordeliese:[1,2],waku:[1,3],max:[1,3],jewel:[1,1],queen:[1,1]};
  const ranges={meta:{'metal-blade':['attackRange',1,3],'spinning-rush':['effectRange',2,3]},mitsuru:{'spark-shot':['attackRange',3,3],'spaghetti-code':['attackRange',1,1],'radioactivity':['effectRange',1,2]},richter:{'bom-ber':['effectRange',1,3],'gx-bom':['effectRange',1,3]},tordeliese:{'retreating-wind':['effectRange',1,2],'demonic-hammer':['attackRange',1,1],'annihilation':['effectRange',1,1]},waku:{'expanded-hurtbox':['effectRange',1,1],'monado-smash':['effectRange',1,1],'invisible-wall':['effectRange',1,1],'vanishing-hitbox':['effectRange',1,1],'full-screen-hurtbox':['effectRange',1,3],'next-frame':['effectRange',1,1]},jewel:{'crimson-fist':['effectRange',1,1],'crystal-radiance':['effectRange',1,3],'adamant-fist':['effectRange',1,1],'rainbow-armor':['effectRange',1,1]},queen:{'queens-bless':['attackRange',1,3],'insolent':['attackRange',1,3],'killer-queen':['effectRange',1,3]}};
  for(const c of characters){c.attackRange=basic[c.id];for(const p of c.perks){const r=ranges[c.id]?.[p.id];if(r)p[r[0]]=r.slice(1);if(p.id==='metal-blade')p.name='レアメタルブレード';}}
  for(const c of characters)c.perks.push({id:'covering',name:'カバーリング',level:1,common:true,covering:true,cost:0,runawayPressure:0,description:'前衛時のみ有効。後衛への物理攻撃を自身の防御で肩代わりし、回避せず自動命中となる。'});
  for(const c of characters)c.perks.push({id:'revival-burst',name:'復活バースト',level:1,common:true,autoRevive:true,cost:0,runawayPressure:0,description:'ON時、戦闘クエスト参加中にHPでダウンすると、因子を支払い、所属セッションの敵味方合計10手後（手番が進まない場合は10秒後）にHP全回復で自動復帰する。'});
  const recruitment={meta:['kills',1,'credits',500],megumin:['factors',50,'credits',5000],mitsuru:['prestige',10,'prestige',10],vishunal:['prestige',100,'prestige',100],tordeliese:['prestige',50,'credits',25000],waku:['prestige',10,'credits',20000],cherry:['credits',25000,'credits',10000],jewel:['credits',1000000,'credits',300000],max:['prestige',100,'credits',500000],queen:['prestige',1000000,'prestige',1000000]};
  for(const c of characters)if(recruitment[c.id]){const [resource,amount,currency,price]=recruitment[c.id];c.recruitUnlock={resource,amount};c.hireCurrency=currency;c.hirePrice=price;delete c.unlockEarned;delete c.unlockCreditsEarned;}
  if(typeof module!=='undefined'&&module.exports)module.exports=characters;else root.YggCharacters=characters;
})(typeof window!=='undefined'?window:globalThis);

