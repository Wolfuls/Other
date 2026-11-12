/* Final authored Chapter 3 maps and dialogue. No runtime migration or superseded drafts. */
(function(root){'use strict';
const C=root.MiloadContent||(typeof require!=='undefined'?require('./content.js'):null);
const M=(id,text,expression,beat)=>({id,speaker:'ミロード',text,expression,...beat?{beat}:{}});
C.chapterThreeStages = [
  {name: "静まり返った麦畑", areas: ["静まり返った麦畑"]},
  {name: "眠らない水車小屋", areas: ["眠らない水車小屋"]},
  {name: "分水路の調整場", areas: ["水車と排水路"]},
  {name: "街道の大集荷場", areas: ["街道の大集荷場"]}
];

C.farmMaps = [
  {
    width: 4300,
    ledges: [[650, 394, 180], [1010, 335, 210], [1700, 392, 180], [1920, 305, 250], [2850, 262, 250], [3220, 350, 190], [3590, 390, 210]],
    wheels: [[2660, 365, 96, false]],
    water: [[2500, 2820]],
    lever: [],
    crates: [],
    enemies: [
      ["mouse", 560, 458],
      ["mill", 710, 394],
      ["carrier", 1320, 458],
      ["moth", 1450, 290],
      ["mouse", 1740, 392],
      ["moth", 2250, 300],
      ["mouse", 3070, 458],
      ["mill", 3280, 350],
      ["carrier", 3780, 458]
    ],
    drops: [["spread", 900, 428], ["guide", 2050, 275]],
    heart: [1980, 278]
  },
  {
    width: 4300,
    ledges: [[540, 392, 170], [1350, 266, 260], [1800, 330, 260], [2310, 390, 220], [2800, 315, 300], [3330, 390, 220], [3690, 330, 230]],
    wheels: [[1120, 365, 105, true]],
    water: [[970, 1330], [3190, 3370]],
    lever: [[820, 430]],
    crates: [[2200, 394, 64, 64]],
    enemies: [
      ["hopper", 440, 458],
      ["mill", 590, 392],
      ["moth", 1490, 210],
      ["hopper", 1850, 330],
      ["mouse", 2100, 458],
      ["mouse", 2500, 458],
      ["mouse", 2980, 458],
      ["carrier", 2700, 458],
      ["mill", 2870, 315],
      ["hopper", 3460, 458],
      ["mill", 3750, 330]
    ],
    drops: [["comet", 1820, 300], ["sugar", 3300, 428]]
  },
  {
    width: 5100,
    puzzle: true,
    ledges: [[470, 224, 180], [1750, 220, 240], [2760, 220, 240]],
    wheels: [[3290, 300, 110, true],[3690,300,110,true],[4090,300,110,true],[4490,300,110,true]],
    water: [[980, 1470], [2140, 2720], [3100, 4670]],
    lever: [[730, 262], [1830, 192], [2910, 192], [3040, 262]],
    crates: [],
    enemies: [
      ["mouse", 430, 290],
      ["mill", 520, 224],
      ["moth", 1510, 140],
      ["hopper", 1810, 220],
      ["carrier", 2030, 290],
      ["moth", 2780, 140],
      ["mill", 2840, 220],
      ["mouse", 4820, 290]
    ],
    drops: [],
    bankY: 290
  },
  {
    width: 4600,
    ledges: [[550, 390, 180], [900, 320, 230], [1280, 390, 160], [2100, 300, 220], [2520, 380, 250], [3490, 375, 140], [4140, 375, 140]],
    wheels: [[1950, 365, 100, false]],
    water: [[1800, 2080]],
    lever: [],
    crates: [[1510, 266, 80, 192, true], [1590, 266, 80, 192, true]],
    enemies: [
      ["carrier", 420, 458],
      ["mill", 600, 390],
      ["moth", 1040, 245],
      ["hopper", 1300, 390],
      ["mill", 1530, 266],
      ["mouse", 2290, 458],
      ["hopper", 2570, 380],
      ["carrier", 2850, 458],
      ["keeper", 4040, 458]
    ],
    drops: [],
    arena: 3350
  }
];

C.chapterThree = [
  {
    id: "c3-opening",
    chapter: 3,
    stage: 1,
    area: 0,
    x: 85,
    priority: 90,
    lines: [M("C3-M001", "車輪の跡……ここまで続いてる", "thinking"), M("C3-M002", "随分遠くまで来ちゃったわね", "thinking")],
    blocking: false
  },
  {
    id: "c3-harvest",
    chapter: 3,
    stage: 1,
    area: 0,
    x: 500,
    priority: 20,
    lines: [M("C3-M005", "この荷台も、空っぽ……", "thinking"), M("C3-M006", "ちゃんと収穫してあるのに。中身だけ持っていかれたの？", "thinking")]
  },
  {
    id: "c3-produce",
    chapter: 3,
    stage: 1,
    area: 0,
    x: 1250,
    priority: 20,
    lines: [
      M("C3-M007", "あれ、野菜……？　果物まで？", "thinking"),
      M("C3-M008", "お菓子だけじゃなくて、食べ物なら何でも集めてるのかしら", "thinking"),
      M("C3-M009", "あっちにも、同じ袋を持った魔物がいる……", "thinking")
    ]
  },
  {
    id: "c3-roof",
    chapter: 3,
    stage: 1,
    area: 0,
    x: 1800,
    priority: 20,
    lines: [M("C3-M010", "上からなら、少し先まで見えそうね", "thinking"), M("C3-M011", "……やっぱり。みんな、あの水車小屋へ向かってる", "thinking")],
    condition: "farmUpper"
  },
  {
    id: "c3-wheel",
    chapter: 3,
    stage: 1,
    area: 0,
    x: 2450,
    priority: 20,
    lines: [M("C3-M012", "あの足場……水車と一緒に回ってる", "thinking"), M("C3-M013", "上がってきたところに乗れば、向こうへ渡れそう", "thinking")]
  },
  {
    id: "c3-wet",
    chapter: 3,
    stage: null,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M014", "ぷはっ……！　見た目より流れが速いのね", "thinking"), M("C3-M015", "今度は、足場が近づくまで待ちましょう……", "thinking")],
    signal: "farmWet",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-machines",
    chapter: 3,
    stage: 2,
    area: 0,
    x: 450,
    priority: 20,
    lines: [M("C3-M019", "ここも魔物から避難したのね。機械は動いたまま……", "thinking"), M("C3-M020", "勝手に入り込んだだけ、って感じでもないわね", "thinking")]
  },
  {
    id: "c3-gate",
    chapter: 3,
    stage: 2,
    area: 0,
    x: 780,
    priority: 20,
    lines: [M("C3-M021", "こっちの水車は止まってるのね", "thinking"), M("C3-M022", "水の流れを変えられれば、動くかしら？", "thinking")],
    condition: "waterStopped"
  },
  {
    id: "c3-gate-on",
    chapter: 3,
    stage: 2,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M023", "よし、動いた！", "happy"), M("C3-M024", "あの足場で、上まで行けそうね", "thinking")],
    signal: "waterOn",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-labels",
    chapter: 3,
    stage: 2,
    area: 0,
    x: 1820,
    priority: 20,
    lines: [
      M("C3-M025", "この袋、さっきの農場の名前じゃない……", "thinking"),
      M("C3-M026", "こっちは、また別の村？", "thinking"),
      M("C3-M027", "こんなに離れた場所からも、運んできてるのね", "thinking")
    ]
  },
  {
    id: "c3-wand",
    chapter: 3,
    stage: null,
    area: 0,
    x: 0,
    priority: 25,
    lines: [M("C3-M028", "この杖……魔力が、細く真っすぐに集まってる", "thinking")],
    signal: "farmWand"
  },
  {
    id: "c3-pierce",
    chapter: 3,
    stage: null,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M029", "向こうの魔物まで当たった！", "happy"), M("C3-M030", "並んだところを狙えば、まとめて相手にできそうね", "thinking")],
    signal: "farmPierce",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-sorting",
    chapter: 3,
    stage: 2,
    area: 0,
    x: 2700,
    priority: 20,
    lines: [
      M("C3-M031", "また、あの印……", "thinking"),
      M("C3-M032", "袋を替えて、そのまま運び出してる", "thinking"),
      M("C3-M033", "こんなに食べ物があるのに、誰も食べようとしないのね……", "thinking")
    ]
  },
  {
    id: "c3-depot",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 100,
    priority: 20,
    lines: [M("C3-M039", "街のお店の箱まである……", "thinking"), M("C3-M040", "畑のものも、村のものも、ここへ集めてたのね", "thinking")]
  },
  {id: "c3-high-enemy", chapter: 3, stage: 4, area: 0, x: 1450, priority: 20, lines: [M("C3-M041", "もう、そんなところから……！", "thinking")]},
  {
    id: "c3-fallen-enemy",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M042", "そこなら、こっちの魔法も届くわ！", "thinking")],
    signal: "farmEnemyFall",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-routes",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 2650,
    priority: 20,
    lines: [
      M("C3-M043", "入り口は別々なのに、出ていく方は同じ……", "thinking"),
      M("C3-M044", "ただ盗んでるんじゃない。ちゃんと、行き先が決まってるんだ", "thinking"),
      M("C3-M045", "……今の音、何？", "thinking")
    ]
  },
  {
    id: "c3-boss",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 3350,
    priority: 90,
    lines: [
      M("C3-M046", "……その大きさで、ただの荷物ってわけじゃないわよね", "thinking"),
      M("C3-M047", "やっぱり！", "shock"),
      M("C3-M048", "そこを通して。荷物の行き先を、確かめたいの", "thinking"),
      M("C3-M049", "……通してくれる気は、なさそうね", "thinking")
    ],
    blocking: true,
    scene: "farm"
  },
  {
    id: "c3-roll",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M050", "足元に来る……！", "thinking")],
    signal: "farmRoll",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-rain",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M051", "今度は上から！？", "shock")],
    signal: "farmRain",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-slam",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M052", "ちょっと、こっちに倒れないでよ！", "thinking")],
    signal: "farmSlam",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-half",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 50,
    lines: [M("C3-M053", "効いてる……。もう少し！", "thinking")],
    signal: "bossHalf",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-cake",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M054", "わ……！　大きなバウムクーヘン！", "shock")],
    signal: "bossCake",
    reaction: true,
    ttl: 4,
    condition: "farmCandy"
  },
  {
    id: "c3-revived",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M055", "見とれてる場合じゃなかった……！", "thinking")],
    signal: "bossRevived",
    reaction: true,
    ttl: 4,
    condition: "farmAlive"
  },
  {
    id: "c3-feast",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 20,
    lines: [M("C3-M056", "……うん。しっとりしてて、おいしい！", "happy"), M("C3-M057", "……っと。行き先を調べるんだった", "thinking")],
    blocking: true,
    direct: true
  },
  {
    id: "c3-ending",
    chapter: 3,
    stage: 4,
    area: 0,
    x: 0,
    priority: 90,
    lines: [
      M("C3-M058", "この街に、この村……。さっき袋に書いてあった名前だわ", "thinking"),
      M("C3-M059", "ここで集めて、それから、もっと先へ……", "thinking"),
      M("C3-M060", "魔物が勝手に持ち歩いてたんじゃない", "thinking"),
      M("C3-M061", "誰かが、いろんな場所から食料を集めさせてるんだ", "thinking"),
      M("C3-M062", "この印……行き先の目印なのかしら", "thinking"),
      M("C3-M063", "見たことのない印ね……。どこのものなんだろう", "thinking"),
      M("C3-M064", "土地の印を調べるなら、学術都市の図書館に何かあるかもしれない", "thinking"),
      M("C3-M065", "こんなに食べ物を持っていって、何をするつもりなのか……", "thinking"),
      M("C3-M066", "……ちゃんと、確かめなくちゃ", "thinking")
    ],
    blocking: true,
    scene: "farm",
    direct: true
  },
  {
    id: "c3-danger",
    chapter: 3,
    stage: null,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M067", "……落ち着いて。急いで倒れたら、追いかけられないわ", "thinking")],
    signal: "lowLife",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-heal",
    chapter: 3,
    stage: null,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C3-M068", "……ふぅ。甘いものがあると、ほっとするわね", "happy")],
    signal: "heal",
    reaction: true,
    ttl: 4
  },
  {
    id: "c3-death",
    chapter: 3,
    stage: null,
    area: 0,
    x: 0,
    priority: 20,
    lines: [M("C3-M069", "まだ……確かめてないのに……", "thinking")],
    blocking: true,
    direct: true
  },
  {
    id: "c3-welcome",
    chapter: 3,
    stage: 2,
    area: 0,
    x: 85,
    priority: 25,
    lines: [M("C3-WELCOME", "お邪魔しまーす。少し調べさせてもらうわよ", "thinking")]
  },
  {
    id: "c3-supply",
    chapter: 3,
    stage: 3,
    area: 0,
    x: 530,
    priority: 20,
    lines: [M("C3-supply", "水門を閉めたら、水が溜まってきた……。浮き足場も上がるのね", "thinking")],
    signal: "levelRaised"
  },
  {
    id: "c3-divert",
    chapter: 3,
    stage: 3,
    area: 0,
    x: 1660,
    priority: 20,
    lines: [M("C3-divert", "こっちの水門も閉めれば、もう少し高くできそう", "thinking")]
  },
  {
    id: "c3-drain",
    chapter: 3,
    stage: 3,
    area: 0,
    x: 2840,
    priority: 20,
    lines: [M("C3-drain", "溜めた水を水車へ流せば、あの高い出口まで上がれそうね", "thinking")]
  }
];

C.chapters.push({id:3,name:'星明かりの穀倉地帯',stages:C.chapterThreeStages.map((s,i)=>({id:i+1,...s}))});
if(typeof module!=='undefined')module.exports=C;
})(typeof globalThis!=='undefined'?globalThis:this);
