(function(root){
  'use strict';
  const mohicanVariants = [
  {
    "name": "モヒカン（鉄パイプ）",
    "footY": 199,
    "sheet": "./img/enemy-mohican-red-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-red-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-red-defeat-v1.png"
  },
  {
    "name": "モヒカン（ボウガン）",
    "sheet": "./img/enemy-mohican-blue-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-blue-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-blue-defeat-v1.png"
  },
  {
    "name": "モヒカン（ケンカ屋）",
    "footY": 204,
    "sheet": "./img/enemy-mohican-green-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-green-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-green-defeat-v1.png"
  },
  {
    "name": "ハゲ（ハンマー）",
    "sheet": "./img/enemy-bald-hammer-idle-v1.png",
    "attackSheet": "./img/enemy-bald-hammer-attack-v1.png",
    "defeatSheet": "./img/enemy-bald-hammer-defeat-v1.png"
  },
  {
    "name": "ハゲ（ナックル）",
    "footY": 210,
    "sheet": "./img/enemy-bald-knuckles-idle-v1.png",
    "attackSheet": "./img/enemy-bald-knuckles-attack-v1.png",
    "defeatSheet": "./img/enemy-bald-knuckles-defeat-v1.png"
  },
  {
    "name": "モヒカン（チェーン）",
    "sheet": "./img/enemy-mohican-yellow-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-yellow-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-yellow-defeat-v1.png"
  },
  {
    "name": "モヒカン女（警棒）",
    "sheet": "./img/enemy-mohican-female-magenta-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-female-magenta-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-female-magenta-defeat-v1.png"
  },
  {
    "name": "モヒカン女（レンチ）",
    "sheet": "./img/enemy-mohican-female-white-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-female-white-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-female-white-defeat-v1.png"
  },
  {
    "name": "モヒカン女（バット）",
    "sheet": "./img/enemy-mohican-female-cyan-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-female-cyan-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-female-cyan-defeat-v1.png"
  },
  {
    "name": "モヒカン（鉄斧）",
    "sheet": "./img/enemy-mohican-male-orange-idle-v1.png",
    "attackSheet": "./img/enemy-mohican-male-orange-attack-v1.png",
    "defeatSheet": "./img/enemy-mohican-male-orange-defeat-v1.png"
  }
];
  const quests = [
  {
    "id": "mohican-solo",
    "code": "01",
    "unlockFactors": 0,
    "formationCount": 1,
    "name": "今日も今日とてモヒカン日和",
    "area": "中層 / ウトガルド工業地帯",
    "enemy": "モヒカン",
    "attack": {
      "dice": 2,
      "flat": 0
    },
    "accuracy": {
      "flat": 10,
      "dice": 1
    },
    "ss": {
      "flat": 6,
      "dice": 1
    },
    "actionDice": {
      "flat": 4,
      "dice": 2
    },
    "attackSeconds": 0.72,
    "hp": 20,
    "defense": 0,
    "defenseGrowth": 1.1,
    "traits": [
      "mohican"
    ],
    "reward": 2,
    "description": "工業地帯でモヒカンと一対一。倒した敵は5秒後に再出現する。",
    "background": "./img/utgard-industrial-v1.png",
    "nightBackground": "./img/utgard-industrial-night-v1.png",
    "evasion": {
      "flat": 10,
      "dice": 1
    },
    "resistance": 2,
    "action": 11
  },
  {
    "id": "scarecrow",
    "code": "02",
    "name": "バスターライラック内模擬戦闘訓練",
    "area": "バスターライラック",
    "enemy": "D・S・スケアクロウ",
    "attack": {
      "dice": 3,
      "flat": 1
    },
    "accuracy": {
      "flat": 20,
      "dice": 1
    },
    "ss": {
      "flat": 7,
      "dice": 1
    },
    "action": 0,
    "hp": 35,
    "defense": 35,
    "defenseGrowth": 1.1,
    "traits": [
      "penetrationImmune"
    ],
    "reward": 10,
    "description": "貫通無効の甲冑型ロボとの模擬戦闘訓練。",
    "background": "./img/buster-training-v1.png",
    "sheet": "./img/enemy-scarecrow-idle-v1.png",
    "defeatSheet": "./img/enemy-scarecrow-defeat-v1.png",
    "enemyScale": 1.09,
    "defeatStyle": "kneel",
    "evasion": {
      "flat": 2,
      "dice": 1
    },
    "resistance": 30
  },
  {
    "id": "mohicans",
    "code": "03",
    "unlockFactors": 100,
    "formationCount": 3,
    "name": "YDF密着24分 101匹モヒちゃん大暴れ！",
    "area": "中層 / ウトガルド工業地帯",
    "enemy": "モヒカン",
    "attack": {
      "dice": 2,
      "flat": 0
    },
    "accuracy": {
      "flat": 10,
      "dice": 1
    },
    "ss": {
      "flat": 6,
      "dice": 1
    },
    "actionDice": {
      "flat": 4,
      "dice": 2
    },
    "attackSeconds": 0.72,
    "hp": 20,
    "defense": 0,
    "defenseGrowth": 1.1,
    "traits": [
      "mohican",
      "swarm"
    ],
    "reward": 2,
    "description": "倒しても次々に現れる、世紀末ファッションの雑魚たち。",
    "background": "./img/utgard-industrial-v1.png",
    "nightBackground": "./img/utgard-industrial-night-v1.png",
    "evasion": {
      "flat": 10,
      "dice": 1
    },
    "resistance": 2,
    "action": 11
  },
  {
    "id": "dementor",
    "code": "04",
    "unlockFactors": 2500,
    "name": "旧き看守",
    "area": "下層 / ヘルヘイム・緊急封鎖区画（屋外）",
    "enemy": "ディメンター",
    "attack": {
      "dice": 4,
      "flat": 5
    },
    "accuracy": {
      "flat": 10,
      "dice": 1
    },
    "ss": {
      "flat": 17,
      "dice": 1
    },
    "attackType": "mental",
    "attackSeconds": 1.2,
    "hp": 100,
    "defense": 3,
    "defenseGrowth": 1.1,
    "formationCount": 3,
    "formationLayout": "staggered",
    "traits": [
      "swarm"
    ],
    "reward": 70,
    "description": "非常事態宣言下のヘルヘイム、その封鎖された屋外を漂う幽鬼の群れ。",
    "background": "./img/lower-lockdown-v2.png",
    "sheet": "./img/enemy-dementor-idle-v1.png",
    "attackSheet": "./img/enemy-dementor-attack-v1.png",
    "defeatSheet": "./img/enemy-dementor-defeat-v1.png",
    "enemyScale": 1.68,
    "defeatStyle": "dissolve",
    "evasion": {
      "flat": 14,
      "dice": 1
    },
    "resistance": 4,
    "action": 7
  },
  {
    "id": "ozmorn",
    "code": "05",
    "name": "ところにより雷が伴う見込みです",
    "unlockFactors": 1000,
    "area": "廃ビルの屋上",
    "enemy": "オズモーン",
    "hp": 130,
    "defense": 0,
    "resistance": 0,
    "defenseGrowth": 1.1,
    "attack": {
      "dice": 3,
      "flat": 3
    },
    "ignoreDefense": true,
    "accuracy": {
      "flat": 15,
      "dice": 1
    },
    "evasion": {
      "flat": 9,
      "dice": 1
    },
    "ss": {
      "flat": 16,
      "dice": 1
    },
    "actionDice": {
      "flat": 7,
      "dice": 2
    },
    "action": 14,
    "attackSeconds": 1.1,
    "formationCount": 1,
    "summons": true,
    "traits": [],
    "reward": 45,
    "enemyScale": 1.7,
    "defeatStyle": "dissolve",
    "defeatSheet": "./img/enemy-ozmorn-defeat-v1.png",
    "description": "雷を操る巨雲。被弾するとコグモを生み、時には吸い込んで回復する。",
    "background": "./img/rooftop-overcast-day-v1.png",
    "nightBackground": "./img/rooftop-overcast-night-v1.png",
    "dawnBackground": "./img/rooftop-overcast-dawn-v1.png",
    "duskBackground": "./img/rooftop-overcast-dusk-v1.png",
    "sheet": "./img/enemy-ozmorn-idle-v1.png",
    "attackSheet": "./img/enemy-ozmorn-attack-v1.png",
    "absorbSheet": "./img/enemy-ozmorn-absorb-v1.png",
    "summon": {
      "name": "コグモ",
      "sheet": "./img/enemy-kogumo-idle-v1.png",
      "attackSheet": "./img/enemy-kogumo-attack-v1.png",
      "defeatStyle": "dissolve",
      "attack": {
        "dice": 3,
        "flat": 3
      },
      "actionDice": {
        "flat": 10,
        "dice": 1
      },
      "defense": 0,
      "resistance": 0,
      "apAttack": true
    }
  }
];
  quests.sort((a,b)=>['mohican-solo','scarecrow','mohicans','ozmorn','dementor'].indexOf(a.id)-['mohican-solo','scarecrow','mohicans','ozmorn','dementor'].indexOf(b.id));
  quests.forEach((q,i)=>q.code=String(i+1).padStart(2,'0'));
  for(const quest of quests){quest.row='front';quest.attackRange=['mohicans','mohican-solo'].includes(quest.id)?[1,1]:[1,3];}
  for(const quest of quests)if(quest.id==='mohicans'||quest.id==='mohican-solo')quest.variants=mohicanVariants;
  if(typeof module!=='undefined'&&module.exports)module.exports=quests;
  else root.YggQuests=quests;
})(typeof window!=='undefined'?window:globalThis);
