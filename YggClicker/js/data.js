(function(root){
  'use strict';
  const commonJS=typeof module!=='undefined'&&module.exports;
  const data = {
  "gameId": "yggclicker",
  "version": "0.73.2",
  "maxOfflineSeconds": 28800,
  "incomeTypes": [
    "questReward",
    "overkillReward",
    "secondaryIncome",
    "jewelSideIncome",
    "jewelDoubleHitIncome",
    "jewelDamageIncome",
    "refund",
    "migrationRefund",
    "prestigeReward"
  ],
  "secondaryIncomeTypes": [
    "secondaryIncome",
    "jewelSideIncome",
    "jewelDoubleHitIncome",
    "jewelDamageIncome"
  ],
  "strength": {
    "strengthBase": 100,
    "strengthGrowth": 1.1,
    "personalGrowth": 0.02,
    "focusGrowth": 1.08,
    "focusDiminishing": 2.5,
    "hitStrengthExponent": 1,
    "damageStrengthExponent": 1,
    "probabilityEpsilon": 0.000001
  },
  "runtimeBalance": {
    "jewelSideIncomeMeanIntervalSeconds": 1800,
    "jewelSideIncomeRate": 0.01,
    "trainingPressureScale": 0.01,
    "recoverySpeedBonusPerStack": 0.2,
    "runawayPressureReductionPerStack": 0.1,
    "basePressures": {
      "normal": 0.02,
      "slightlyLow": 0.01,
      "low": 0.005
    },
    "criticalRewardRate": 0,
    "overloadDamageRate": 1
  },
  "runawayThresholds": [
    50,
    70,
    90,
    110,
    120,
    130,
    140,
    150
  ],
  "runawaySymptoms": [
    "control",
    "overload",
    "hearing",
    "vision",
    "body",
    "ability",
    "language",
    "memory",
    "mind",
    "oblivion"
  ],
  "seedSystem": {
    "enabled": false,
    "effects": {
      "pride": "action",
      "vanity": "evasionStrength",
      "envy": "hitStrength",
      "wrath": "attackStrength",
      "melancholy": "sedation",
      "greed": "secondaryIncome",
      "gluttony": "maxHP",
      "lust": "defenseStrength"
    },
    "karmaEffects": {}
  },
  "tordelieseVisual": {
    "sheet": "./img/tordeliese-animation-v13.png",
    "tendrilFrames": [
      "./img/tordeliese-tendril-1-v6.png",
      "./img/tordeliese-tendril-2-v6.png",
      "./img/tordeliese-tendril-3-v6.png",
      "./img/tordeliese-tendril-4-v6.png",
      "./img/tordeliese-tendril-5-v6.png",
      "./img/tordeliese-tendril-6-v6.png"
    ]
  },
  "questGrowth": {
    "costRewardMultiplier": 20,
    "costGrowth": 1.15,
    "enemyCurve": { "initial": 1.025, "terminal": 1.012, "transition": 100 },
    "durability": { "transition": 100, "hpExponent": 3.5, "defenseExponent": 1, "attackExponent": 2 },
    "rewardCurve": { "initial": 1.28, "terminal": 1.04, "transition": 100 }
  },
  "statUpgrades": [
    {
      "id": "vitality",
      "field": "vitalityLevels",
      "name": "HP強度"
    },
    {
      "id": "armor",
      "field": "armorLevels",
      "name": "防御＆抵抗"
    },
    {
      "id": "accuracy",
      "field": "accuracyLevels",
      "name": "命中判定"
    },
    {
      "id": "evasion",
      "field": "evasionLevels",
      "name": "回避判定"
    }
  ],
  "displayDefaults": {
    "simplifiedNumbers": false,
    "showOrbits": true,
    "hitEffects": "normal",
    "showFactorRain": true,
    "showRewardDice": true,
    "showDamageNumbers": true,
    "showOverflowLabels": true,
    "showDefeatLabels": true
  },
  "hitEffectModes": [
    "normal",
    "translucent",
    "simple",
    "off"
  ],
  "sceneCycle": {
    "seconds": 600,
    "transitionSeconds": 20
  },
  "memoryQuest": {
    "id": "memories",
    "unlockFactors": 1000000,
    "name": "追憶",
    "background": "./img/memory-nebula-v3.png",
    "monolith": "./img/memory-monolith-v2.png"
  },
  "vishunalVisual": {
    "sheet": "./img/vishunal-poses-v2.png",
    "missile": "./img/vishunal-missile-v1.png",
    "muzzles": [
      [
        [
          98,
          71
        ],
        [
          119,
          70
        ],
        [
          99,
          91
        ],
        [
          120,
          90
        ],
        [
          78,
          160
        ],
        [
          88,
          160
        ],
        [
          78,
          170
        ],
        [
          88,
          170
        ]
      ],
      [
        [
          97,
          71
        ],
        [
          118,
          70
        ],
        [
          98,
          91
        ],
        [
          119,
          90
        ],
        [
          77,
          160
        ],
        [
          87,
          160
        ],
        [
          77,
          170
        ],
        [
          87,
          170
        ]
      ],
      [
        [
          104,
          74
        ],
        [
          125,
          73
        ],
        [
          105,
          94
        ],
        [
          126,
          93
        ],
        [
          79,
          163
        ],
        [
          89,
          163
        ],
        [
          79,
          173
        ],
        [
          89,
          173
        ]
      ],
      [
        [
          105,
          72
        ],
        [
          126,
          71
        ],
        [
          106,
          92
        ],
        [
          127,
          91
        ],
        [
          78,
          160
        ],
        [
          88,
          160
        ],
        [
          78,
          170
        ],
        [
          88,
          170
        ]
      ],
      [
        [
          98,
          70
        ],
        [
          119,
          69
        ],
        [
          99,
          90
        ],
        [
          120,
          89
        ],
        [
          78,
          161
        ],
        [
          88,
          161
        ],
        [
          78,
          171
        ],
        [
          88,
          171
        ]
      ],
      [
        [
          99,
          68
        ],
        [
          120,
          67
        ],
        [
          100,
          88
        ],
        [
          121,
          87
        ],
        [
          77,
          155
        ],
        [
          87,
          155
        ],
        [
          77,
          165
        ],
        [
          87,
          165
        ]
      ],
      [
        [
          98,
          71
        ],
        [
          119,
          70
        ],
        [
          99,
          91
        ],
        [
          120,
          90
        ],
        [
          79,
          161
        ],
        [
          89,
          161
        ],
        [
          79,
          171
        ],
        [
          89,
          171
        ]
      ],
      [
        [
          100,
          69
        ],
        [
          121,
          68
        ],
        [
          101,
          89
        ],
        [
          122,
          88
        ],
        [
          79,
          160
        ],
        [
          89,
          160
        ],
        [
          79,
          170
        ],
        [
          89,
          170
        ]
      ]
    ]
  },
  "richterVisual": {
    "standing": "./img/richter-standing-v11.png",
    "sheet": "./img/richter-poses-v11.png",
    "burstSheet": "./img/richter-burst-v23.png",
    "bomb": "./img/richter-creature-v3.png",
    "idleSheet": "./img/richter-creature-idle-v1.png",
    "explosionSheet": "./img/richter-explosion-v1.png",
    "maxVisibleBombs": 60
  },
  "wakuVisual": {
    "attackSheet": "./img/waku-fire-v3.png",
    "sheet": "./img/waku-idle-v1.png",
    "burstSheet": "./img/waku-burst-v3.png"
  },
  "metaVisual": {
    "standing": "./img/meta-standing-v7.png",
    "sheet": "./img/meta-poses-v7.png",
    "burstSheet": "./img/meta-burst-v11.png",
    "saw": "./img/meta-saw.png",
    "maxVisibleSaws": 60
  },
  "balance": {
    "initialFactors": 0,
    "manualDice": 0,
    "manualFlat": 1,
    "characterDamagePerLevel": 0.1,
    "weaponSizePerDoubling": 0.15,
    "knockoutHP": 4,
    "actionThreshold": 100,
    "purchaseCostGrowth": 1.125,
    "upgradeCostGrowth": 1.25,
    "rewardPerLevel": 0.1,
    "recoverySeconds": 6
  },
  "enemyTraits": {
    "mohican": "モヒカン",
    "swarm": "群れ",
    "penetrationImmune": "貫通無効"
  },
  "concentration": [
    {
      "id": "action",
      "name": "行動"
    },
    {
      "id": "accuracy",
      "name": "命中"
    },
    {
      "id": "evasion",
      "name": "回避"
    },
    {
      "id": "power",
      "name": "攻撃"
    },
    {
      "id": "vitality",
      "name": "HP"
    },
    {
      "id": "armor",
      "name": "防御"
    }
  ],
  "upgrades": [
    {
      "id": "stabilization",
      "name": "因子安定化",
      "label": "全味方の鎮静圧＋0.1 / 分 / Lv",
      "description": "時間経過による暴走率の鎮静を促す。",
      "cost": 20000,
      "costGrowth": 1.5,
      "max": null,
      "pressure": 0.0016666666666666668,
      "icon": "◈"
    },
    {
      "id": "retake",
      "name": "リテイク",
      "label": "回避のファンブルを1度だけ振り直す",
      "description": "回避判定のファンブルを1度だけ振り直す。",
      "cost": 500000,
      "max": 1,
      "icon": "↶"
    },
    {
      "id": "reversal",
      "name": "逆転",
      "label": "敵の命中クリティカルを1度だけ振り直す",
      "description": "敵の命中判定のクリティカルを1度だけ振り直す。",
      "cost": 500000,
      "max": 1,
      "icon": "⇄"
    },
    {
      "id": "fightingSpirit",
      "name": "闘志",
      "label": "致死ダメージ時、30%でHP1に踏みとどまる",
      "description": "致死ダメージ時、30%でHP1に踏みとどまる。",
      "cost": 500000,
      "max": 1,
      "icon": "◆"
    },
    {
      "id": "badLuck",
      "name": "悪運",
      "label": "致死ダメージ時、30%でダメージ半減",
      "description": "致死ダメージ時、30%でダメージを半減する。",
      "cost": 500000,
      "max": 1,
      "icon": "⚄"
    },
    {
      "id": "reward",
      "name": "クリア報酬増加",
      "label": "基礎クリア報酬＋10% / Lv",
      "description": "基礎クリア報酬に1Lvごとに10%加算。",
      "cost": 100,
      "max": null,
      "icon": "◇"
    },
    {
      "id": "overkill",
      "name": "オーバーキルボーナス",
      "label": "撃破時のHPが−20以下なら報酬＋25%",
      "description": "残りHPを20以上超えて倒すと、クリア報酬＋25%。",
      "cost": 200,
      "max": 1,
      "icon": "✦",
      "threshold": 20,
      "bonusRate": 0.25
    }
  ],
  "meguminVisual":{"sheet":"./img/megumin-idle-v2.png","explosion":"./img/megumin-explosion-v1.png","charge":"./img/megumin-charge-v2.png","circle":"./img/megumin-circle-v2.png","staffTip":{"x":368,"y":202},"cellHeight":384},
  "queenVisual":{"sheet":"./img/queen-animation-v3.png"},
  "mitsuruVisual":{"sheet":"./img/mitsuru-animation-v1.png"},
  "jewelVisual": {
    "sheet": "./img/jewel-animation-v11.png"
  }
};
  data.characters=commonJS?require('./characters.js'):root.YggCharacters;
  data.sessions=commonJS?require('./quests.js'):root.YggQuests;
  data.characters.sort((a,b)=>a.cost-b.cost);
  for (const character of data.characters) {
    const pressureBand = { awakening:'normal', reaction:'slightlyLow', recovery:'low' }[character.activationType];
    character.baseRunawayPressure ??= data.runtimeBalance.basePressures[pressureBand];
    for (const perk of character.perks) {
      perk.runawayPressure ??= 0;
      perk.effectClass ??= (perk.transferAction || perk.partyActionDice || perk.partyEvasionDice || perk.selectedActionRate || perk.freeActionChance || perk.protectLowestHP) ? 'support' : 'special';
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=data;
  else root.YggData=data;
})(typeof window!=='undefined'?window:globalThis);
