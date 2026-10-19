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
    "rewardTransition": 100,
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
    "rewardTransition": 100,
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
    "rewardTransition": 98,
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
    "rewardTransition": 108,
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
    "rewardTransition": 100,
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
    "reward": 50,
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
  const members=[
    {id:'chikira',name:'チキーラ',enemy:'チキーラ',hp:120,initialHP:3200,attack:{dice:6,flat:0},defense:2,resistance:1,action:9,accuracy:{flat:24,dice:1},evasion:{flat:20,dice:1},ss:{flat:1,dice:1},sheet:'./img/chikira-actions-v2.png',spriteFrames:6,attackSeconds:2,
      attacks:[{id:'fists',name:'拳の連打',range:[1,1],frame:1},{id:'boulder',name:'大岩投げ',range:[1,3],area:true,frame:3}]},
    {id:'eggra',name:'エッグラ',enemy:'エッグラ',hp:90,initialHP:2800,attack:{dice:3,flat:5},defense:5,resistance:5,action:5,accuracy:{flat:21,dice:2},evasion:{flat:11,dice:2},ss:{flat:15,dice:2},sheet:'./img/eggra-actions-v2.png',spriteFrames:6,attackSeconds:1.4,
      attacks:[{id:'slash',name:'曲剣斬り',range:[1,1],frame:1},{id:'boomerang',name:'曲剣投げ',range:[2,3],frame:2},{id:'ward',name:'防御のおまじない',range:[1,3],attackSeconds:4,support:true,frame:4},{id:'revive',name:'蘇生のおまじない',range:[1,3],attackSeconds:4,support:true,frame:4},{id:'blizzard',attackSeconds:3.2,name:'吹雪のブレス',range:[1,3],area:true,frame:3}]}
  ];
  quests.push({...members[0],id:'egg-or-chicken',rewardTransition:100,code:'06',name:'卵が先か鶏が先か',enemy:'チキーラ＆エッグラ',area:'中層 / 畜産プラント',description:'鶏と卵があふれる畜産プラントで待ち構える二人組。二人とも倒すと討伐完了。',unlockFactors:10000000,reward:1000,costRewardBase:100000000,formationCount:2,formationLayout:'staggered',members,sharedHP:false,reviveInPlace:true,traits:['swarm'],row:'front',attackRange:[1,3],background:'./img/poultry-plant-v2.png',enemyScale:1.4});
  const ozmorn=quests.find(q=>q.id==='ozmorn');
  Object.assign(ozmorn,{attackElements:['shock'],resistances:['shock'],weaknesses:['blast']});
  Object.assign(ozmorn.summon,{attackElements:[],resistances:['shock'],weaknesses:['blast']});
  quests.push({id:'electric-rat',sheet:'./img/enemy-electric-rat-idle-v1.png',spriteFrames:3,attackSheet:'./img/enemy-electric-rat-attack-v1.png',defeatSheet:'./img/enemy-electric-rat-defeat-v2.png',combatRules:'ほうでん［射程1～3・全体］：使用時にエレキフィールドが発動。参加者全員に4点の感電・非接触ダメージ（攻撃強度倍率の0.75乗で増加）。らいげき［射程1～3・単体］：命中時、対象の行動値を5秒間50%低下。',code:'07',name:'ユグドラ民は電気鼠の夢を見るか',enemy:'バッドアスエレクトロラット',area:'中層 / 動力プラント【 ニザヴェリール 】',description:'ユグドラシル全土の約60％の動力を担う最大の動力プラント。増設を重ねた巨大施設にはパイプラインが複雑に絡み合う。管理権限は上層のグングニルが持つ。',unlockFactors:1000,unlockByEarned:true,hp:25,defense:3,resistance:2,ss:{flat:8,dice:1},accuracy:{flat:13,dice:1},evasion:{flat:14,dice:1},action:14,actionDice:{flat:7,dice:2},attack:{dice:2,flat:6},attackElements:['shock'],resistances:['shock'],resistanceLabel:'無効',weaknesses:[],reward:30,rewardTransition:100,row:'front',attackRange:[1,3],formationCount:1,traits:[],attackSeconds:.72,attacks:[{id:'discharge',name:'ほうでん',range:[1,3],area:true,electricField:true},{id:'thunderstrike',name:'らいげき',range:[1,3],actionSlowRate:.5}]});
  quests.pending=[];
  const electricEncounter=quests.find(q=>q.id==='electric-rat');
  const electroRat={name:'エレクトロラット',enemy:'エレクトロラット',spriteKind:'electro-rat',hp:15,ss:{flat:5,dice:1},accuracy:{flat:10,dice:1},evasion:{flat:11,dice:1},defense:2,resistance:1,action:13,actionDice:{flat:6,dice:2},attack:{dice:1,flat:6},attackElements:['shock'],resistances:['shock'],resistanceLabel:'無効',weaknesses:[],row:'front',attackRange:[1,3],attackSeconds:.72,sheet:'./img/enemy-electro-rat-idle-v1.png',spriteFrames:4,attackSheet:'./img/enemy-electro-rat-shock-v1.png',waveSheet:'./img/enemy-electro-rat-wave-v1.png',defeatSheet:'./img/enemy-electro-rat-defeat-v1.png',combatRules:'でんきショック［射程1～3・単体］：1d6＋6の感電攻撃。でんじは［射程1～3・単体］：ダメージなし。命中時、対象の行動力を5秒間50%低下。',attacks:[{id:'electric-shock',name:'でんきショック',range:[1,3]},{id:'thunder-wave',name:'でんじは',range:[1,3],noDamage:true,actionSlowRate:.5}]};
  electricEncounter.members=[{...electricEncounter,name:electricEncounter.enemy},{...electroRat,id:'electro-rat-a'},{...electroRat,id:'electro-rat-b'}];
  Object.assign(electricEncounter,{formationCount:3,sharedHP:false,independentRespawns:true,reviveInPlace:false,reward:8,formationLayout:'surround',groundFraction:.72,background:'./img/nidavellir-reactor-v3.png',traits:['swarm']});
  electricEncounter.members.forEach((member,index)=>{member.reward=index===0?5:2;});
  // Session numbers are display metadata; keep persistent quest IDs unchanged.
  for(const q of quests){
    q.code=q.id==='electric-rat'?'04':String(Number(q.code)>=4?Number(q.code)+1:Number(q.code)).padStart(2,'0');
    if(q.members)for(const member of q.members)if(member.id===q.id)member.code=q.code;
  }
  quests.sort((a,b)=>Number(a.code)-Number(b.code));
  quests.push({id:'infirmary',code:'00',name:'死神の宿',enemy:'トキ',medical:true,background:'img/infirmary-background-v2.png',description:'敵のいない休養用クエスト。参加者は2秒ごとに最大HPの1%を回復する。暴走圧・鎮静圧は無視し、暴走率−10%/分に置換する。',hp:1,reward:0,action:0,attack:{dice:0,flat:0},accuracy:{dice:0,flat:0},evasion:{dice:0,flat:0},ss:{dice:0,flat:0},defense:0,resistance:0,traits:[],unlockFactors:0});
  for(const [id,value]of Object.entries({'electric-rat':2,ozmorn:30,dementor:60})){const q=quests.find(x=>x.id===id);q.costRewardBase??=q.reward;q.reward=value;}
  Object.assign(quests.find(q=>q.id==='dementor'),{attackElements:['break'],combatRules:'ブレイク：受けたダメージの最大HPに対する割合（%）÷3だけ暴走率が上昇する。オーバーキル分も含む（上限150%）。'});
  // Fixed C/Ps rewards are independent of quest level and Rd income modifiers.
  const fixedRewards={'mohican-solo':[100,0],mohicans:[150,0],'electric-rat':[1000,0],ozmorn:[10000,2],dementor:[12000,3],'egg-or-chicken':[1000000,50]};
  for(const q of quests){const [creditsReward,prestigeReward]=fixedRewards[q.id]||[0,0];Object.assign(q,{creditsReward,prestigeReward});}
  electricEncounter.members.forEach((m,i)=>Object.assign(m,{creditsReward:i===0?2500:1000,prestigeReward:i===0?1:0}));
  const access={'mohican-solo':{resource:'factors',amount:0},scarecrow:{resource:'factors',amount:0},mohicans:{resource:'mohicanDefeats',amount:51},'electric-rat':{resource:'prestige',amount:1000},ozmorn:{resource:'factors',amount:1500},dementor:{resource:'factors',amount:5000}};
  for(const q of quests){if(access[q.id]){q.unlockRequirement=access[q.id];delete q.unlockByEarned;}if(['mohican-solo','mohicans'].includes(q.id)){q.costRewardBase??=q.reward;q.reward=1;}}
  if(typeof module!=='undefined'&&module.exports)module.exports=quests;
  else root.YggQuests=quests;
})(typeof window!=='undefined'?window:globalThis);
