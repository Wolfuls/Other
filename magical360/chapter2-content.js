/* Final authored Chapter 2 maps and dialogue. No runtime migration or superseded drafts. */
(function(root){'use strict';
const C=root.MiloadContent||(typeof require!=='undefined'?require('./content.js'):null);
const M=(id,text,expression,beat)=>({id,speaker:'ミロード',text,expression,...beat?{beat}:{}});
const N=(id,text,expression,beat,unknown=false)=>({id,speaker:unknown?'？？？':'ナニワ',portrait:'naniwa',text,expression,...beat?{beat}:{}});
C.chapterTwoStages = [{name: "夜の商店街", areas: ["商店街"]}, {name: "倉庫街", areas: ["荷物の通り道"]}, {name: "街外れの搬出場", areas: ["運搬路と対決広場"]}];

C.chapterTwoMaps = [
  {
    width: 4260,
    ledges: [
      [230, 390, 170],
      [510, 322, 200],
      [860, 382, 190],
      [1090, 316, 180],
      [1430, 399, 170],
      [2110, 374, 190],
      [2510, 320, 220],
      [2780, 389, 180],
      [3440, 390, 180],
      [3700, 321, 230]
    ],
    movers: [["cart", 1570, 393, 170, "x", 1480, 1920, 8], ["cart", 2250, 350, 170, "x", 2200, 2500, 7]],
    crates: [[1250, 414, 44, 44], [3950, 414, 44, 44]],
    enemies: [
      ["slime", 430, 458],
      ["sprout", 575, 322],
      ["bat", 1030, 344],
      ["slime", 1140, 316],
      ["slime", 1630, 393, 0],
      ["sprout", 2160, 374],
      ["slime", 2310, 350, 1],
      ["sprout", 2590, 320],
      ["slime", 3500, 390],
      ["sprout", 3780, 321]
    ],
    sweets: [
      [300, 368, "cookie"],
      [640, 300, "mint"],
      [950, 360, "cookie"],
      [1170, 294, "macaron"],
      [1610, 371, "cookie", 0],
      [2350, 328, "macaron", 1],
      [2630, 298, "cake"],
      [2840, 367, "cookie"],
      [3510, 368, "macaron"],
      [3830, 299, "cookie"]
    ],
    drops: [["wand", "spread", 930, 352], ["heart", null, 2670, 290]],
    exit: [4110, 458],
    cargo: [
      [90, 458, "bread"],
      [460, 458, "fruit"],
      [1150, 458, "sack"],
      [1390, 458, "barrel"],
      [2010, 458, "cart"],
      [2450, 458, "fruit"],
      [2850, 458, "stack"],
      [3400, 458, "bread"],
      [3970, 458, "sack"]
    ]
  },
  {
    width: 6700,
    ledges: [
      [240, 394, 180],
      [2910, 328, 170],
      [3310, 383, 160],
      [3520, 315, 200],
      [3890, 394, 190],
      [4430, 234, 280],
      [4750, 365, 170],
      [5110, 310, 190],
      [5440, 383, 190],
      [5990, 316, 180],
      [6190, 246, 510],
      [710, 394, 190],
      [1100, 355, 200],
      [1500, 394, 180],
      [1950, 365, 200],
      [2400, 394, 180]
    ],
    movers: [
      ["lift", 4150, 410, 150, "y", 214, 410, 8],
      ["cart", 4900, 406, 150, "x", 4860, 5170, 7],
      ["lift", 5830, 408, 150, "y", 286, 408, 7]
    ],
    crates: [
      [3090, 170, 96, 288, true],
      [3186, 170, 96, 288, true],
      [5290, 414, 44, 44],
      [5680, 170, 96, 288, "second"],
      [5776, 170, 96, 288, "second"]
    ],
    enemies: [
      ["slime", 300, 394],
      ["sprout", 2980, 328],
      ["slime", 3370, 458],
      ["bat", 3850, 340],
      ["sprout", 4540, 234],
      ["slime", 4800, 365],
      ["sprout", 5180, 310],
      ["slime", 5500, 383],
      ["bat", 5910, 300],
      ["sprout", 6280, 246],
      ["slime", 620, 458],
      ["sprout", 810, 394],
      ["bat", 1050, 350],
      ["slime", 1190, 355],
      ["slime", 1430, 458],
      ["sprout", 1590, 394],
      ["bat", 1840, 340],
      ["slime", 2040, 365],
      ["slime", 2260, 458],
      ["sprout", 2490, 394],
      ["sprout", 5712, 170]
    ],
    sweets: [
      [330, 372, "cookie"],
      [3020, 306, "mint"],
      [3370, 361, "macaron"],
      [3630, 293, "cookie"],
      [4220, 388, "macaron", 0],
      [4610, 212, "cake"],
      [4820, 343, "cookie"],
      [5190, 288, "macaron"],
      [5550, 361, "cookie"],
      [6050, 294, "mint"],
      [6390, 224, "cake"],
      [760, 370, "candy"],
      [1160, 331, "candy"],
      [1560, 370, "cookie"],
      [2010, 341, "candy"]
    ],
    drops: [["wand", "comet", 3600, 285], ["wand", "sugar", 6410, 216]],
    exit: [6540, 246],
    cargo: [
      [110, 458, "stack"],
      [3200, 458, "sack"],
      [3750, 458, "barrel"],
      [4030, 458, "bread"],
      [4690, 458, "crate"],
      [5340, 458, "fruit"],
      [5700, 458, "sort"],
      [6130, 458, "sort"],
      [6500, 458, "stack"],
      [600, 458, "sack"],
      [1020, 458, "bread"],
      [1430, 458, "sort"],
      [1840, 458, "barrel"],
      [2280, 458, "stack"]
    ]
  },
  {
    width: 4520,
    ledges: [
      [240, 391, 180],
      [830, 369, 190],
      [1440, 310, 210],
      [1770, 381, 190],
      [2100, 313, 190],
      [2460, 380, 190],
      [2800, 389, 160],
      [3290, 366, 200],
      [3530, 276, 230],
      [3800, 366, 210],
      [4070, 276, 230]
    ],
    movers: [
      ["cart", 510, 401, 160, "x", 450, 750, 7],
      ["cart", 1140, 344, 175, "x", 1060, 1380, 7],
      ["lift", 2350, 408, 130, "y", 330, 408, 6]
    ],
    crates: [[1940, 370, 64, 88], [2680, 414, 44, 44]],
    enemies: [
      ["slime", 550, 401, 0],
      ["sprout", 900, 369],
      ["slime", 1200, 344, 1],
      ["sprout", 1510, 310],
      ["bat", 1810, 320],
      ["sprout", 2170, 313],
      ["slime", 2540, 380],
      ["guard", 3060, 458]
    ],
    sweets: [
      [310, 369, "cookie"],
      [570, 379, "mint", 0],
      [1240, 322, "macaron", 1],
      [1570, 288, "cake"],
      [1860, 359, "cookie"],
      [2200, 291, "macaron"],
      [2550, 358, "cookie"],
      [2870, 367, "cookie"]
    ],
    drops: [["heart", null, 1600, 282], ["wand", "comet", 2200, 283]],
    exit: null,
    cargo: [
      [90, 458, "sack"],
      [800, 458, "cart"],
      [1430, 458, "fruit"],
      [2000, 458, "stack"],
      [2380, 458, "bread"],
      [2770, 458, "cart"],
      [4450, 458, "sack"]
    ],
    arenaStart: 3190
  }
];

C.chapterTwo = [
  {
    id: "c2-arrival", blocking:true,
    chapter: 2,
    stage: 1,
    area: 0,
    x: 100,
    priority: 20,
    lines: [
      M("C2-M001", "荷札と同じ名前……。このお店から運ばれてきたのね", "thinking"),
      M("C2-M002", "みんな、魔物を怖がって避難しちゃったのね……", "thinking"),
      M("C2-M003", "……って、今、何か出てきた！", "shock"),
      M("C2-M004", "袋いっぱいのパン……！", "shock"),
      M("C2-M005", "ちょっと！　それ、どこへ持っていくの！", "angry")
    ]
  },
  {
    id: "c2-carts",
    chapter: 2,
    stage: 1,
    area: 0,
    x: 1460,
    priority: 20,
    lines: [
      M("C2-M006", "次から次へと……。ずいぶん忙しそうね", "thinking"),
      M("C2-M007", "これに乗れば、向こうへ行けそう", "happy"),
      M("C2-M008", "……お客さんは歓迎してくれないみたいだけど", "worried")
    ]
  },
  {
    id: "c2-cart-candy",
    chapter: 2,
    stage: 1,
    area: 0,
    x: 0,
    priority: 5,
    lines: [M("C2-M009", "あっ、お菓子まで運ばれてる！", "shock")],
    signal: "cartCandy",
    reaction: true,
    ttl: 3
  },
  {
    id: "c2-cameo",
    chapter: 2,
    stage: 1,
    area: 0,
    x: 3090,
    priority: 60,
    lines: [
      N("C2-N001", "今度こそ逃がさへんで！", "determined", "arrive", true),
      M("C2-M010", "今の魔法……！", "shock", "stop-cart"),
      N("C2-N002", "よしっ。これで――", "confident", "climb", true),
      N("C2-N003", "うわっ、ととと……！", "flustered", "slip", true),
      N("C2-N004", "あっ！　こら、待たんかい！", "determined", "chase", true),
      M("C2-M011", "……忙しい子ね", "worried"),
      M("C2-M012", "あの子も、魔物を追いかけてるのかしら", "thinking")
    ],
    blocking: true,
    scene: "naniwa-cameo"
  },
  {
    id: "c2-gathered",
    chapter: 2,
    stage: 1,
    area: 0,
    x: 3770,
    priority: 20,
    lines: [
      M("C2-M013", "こっちは果物……。あっちは小麦粉？", "thinking"),
      M("C2-M014", "一軒のお店から盗んでるわけじゃないのね", "thinking"),
      M("C2-M015", "別々のお店の食べ物を、ここでまとめて……", "thinking"),
      M("C2-M016", "あの大きな倉庫へ運んでる", "thinking"),
      M("C2-M017", "次は、あそこを調べましょう", "happy")
    ]
  },
  {
    id: "c2-warehouse",
    chapter: 2,
    stage: 2,
    area: 0,
    x: 100,
    priority: 20,
    lines: [
      M("C2-M018", "うわ……。ここにもこんなに", "shock"),
      M("C2-M019", "でも、食べ散らかしてる様子はないわね", "thinking"),
      M("C2-M020", "置いたら、また取りに戻っていくんだ……", "thinking"),
      M("C2-M021", "誰かに集めさせられてるのかしら", "thinking")
    ]
  },
  {
    id: "c2-lifts",
    chapter: 2,
    stage: 2,
    area: 0,
    x: 4000,
    priority: 20,
    lines: [
      M("C2-M022", "荷物は上の階へ運んでるのね", "thinking"),
      M("C2-M023", "私も乗せてもらおうかしら", "happy"),
      M("C2-M024", "……上にもいる！", "shock"),
      M("C2-M025", "足元ばかり見てる場合じゃないわね", "worried")
    ]
  },
  {
    id: "c2-crates",
    chapter: 2,
    stage: 2,
    area: 0,
    x: 2900,
    priority: 20,
    lines: [M("C2-M026", "向こうに道があるのに……", "worried"), M("C2-M027", "この箱、魔法で壊せないかしら", "thinking")],
    condition: "cargoBlocked",
    after: "c2-warehouse"
  },
  {
    id: "c2-crate-broken",
    chapter: 2,
    stage: 2,
    area: null,
    x: 0,
    priority: 25,
    lines: [M("C2-M028", "あ、通れた", "happy")],
    signal: "cargoPassageCleared",
    after: "c2-warehouse",
    reaction: true
  },
  {
    id: "c2-side-path",
    chapter: 2,
    stage: 2,
    area: 0,
    x: 6360,
    priority: 5,
    lines: [M("C2-M029", "こんなところにも隙間が……。ちょっと覗いてみようかな", "happy")],
    condition: "upperPath"
  },
  {
    id: "c2-sorting",
    chapter: 2,
    stage: 2,
    area: 0,
    x: 5990,
    priority: 20,
    lines: [
      M("C2-M030", "ここで、袋を詰め直してるのね", "thinking"),
      M("C2-M031", "お店の名前が付いた箱から、同じ印の袋へ……", "thinking"),
      M("C2-M032", "街で集めて、ここでまとめて、それから別の場所へ運ぶ", "thinking"),
      M("C2-M033", "森で見かけた荷物も、こんなふうに運ばれていたのかな", "thinking"),
      M("C2-M034", "あの先……街の外へ続いてる", "thinking"),
      M("C2-M035", "どこまで持っていくつもりなの？", "worried")
    ]
  },
  {
    id: "c2-outbound",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 100,
    priority: 20,
    lines: [
      M("C2-M036", "さっきの印……。ここにつながっていたのね", "thinking"),
      M("C2-M037", "これだけ集めて、全部持っていくつもり？", "worried"),
      M("C2-M038", "あの荷車を追えば、行き先が分かるかもしれない", "thinking"),
      M("C2-M039", "今度こそ、見失わないようにしないと", "angry")
    ]
  },
  {
    id: "c2-guards",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 2250,
    priority: 20,
    lines: [M("C2-M040", "ずいぶん厳重ね……", "worried"), M("C2-M041", "そんなに大事な荷物なの？", "thinking")]
  },
  {
    id: "c2-challenge",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 0,
    priority: 100,
    lines: [
      M("C2-M042", "……ふぅ。これで少しは進めそう", "happy"),
      M("C2-M043", "さて、あの荷車は――", "thinking"),
      N("C2-N005", "そこまでや！", "determined", "confront", true),
      M("C2-M044", "あら。あなた、商店街にいた……", "shock"),
      N("C2-N006", "見つけたで、食料泥棒！", "determined", null, true),
      M("C2-M045", "……私？", "shock"),
      N("C2-N007", "今、食べてたやろ！　人の食べもん、勝手に食べたらあかん！", "determined", null, true),
      M("C2-M046", "違うわよ。今のは、魔物を魔法で――", "worried"),
      N("C2-N008", "魔物が持ってた食べ物やろ？　そこは見てたで！", "determined", null, true),
      M("C2-M047", "最後まで聞いて！", "angry"),
      N("C2-N009", "うちはナニワ！　この騒ぎ、うちが片付けたる！", "confident"),
      M("C2-M048", "私はミロード。私も、この異変を調べているの", "thinking"),
      N("C2-N010", "ほな、まずその杖を置いてもらおか！", "determined"),
      M("C2-M049", "その前に、あなたがこっちに向けてる杖を下ろしてくれない？", "worried"),
      N("C2-N011", "あかん！　その隙に逃げるつもりやろ！", "determined", "warning-shot"),
      M("C2-M050", "もうっ、本当に話を聞かないんだから！", "angry", "counter")
    ],
    signal: "arenaEntered",
    blocking: true,
    scene: "naniwa-challenge"
  },
  {
    id: "c2-fight-start",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 0,
    priority: 45,
    lines: [N("C2-N012", "ほな、いくで！", "determined")],
    signal: "naniwaAwake",
    ttl: 4,
    reaction: true
  },
  {
    id: "c2-fast",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 0,
    priority: 30,
    lines: [M("C2-M051", "……速い。しっかり見てかわさないと！", "angry")],
    signal: "naniwaPattern",
    ttl: 4,
    reaction: true
  },
  {
    id: "c2-half",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 0,
    priority: 50,
    lines: [N("C2-N013", "やるやんか……！　せやけど、まだ終わりちゃうで！", "determined")],
    signal: "naniwaHalf",
    ttl: 5,
    reaction: true
  },
  {
    id: "c2-boss-danger",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 0,
    priority: 60,
    lines: [M("C2-M052", "落ち着いて……。ちゃんと隙はあるはず", "worried")],
    signal: "lowLife",
    ttl: 4,
    reaction: true
  },
  {
    id: "c2-ending",
    chapter: 2,
    stage: 3,
    area: 0,
    x: 0,
    priority: 100,
    lines: [
      N("C2-N014", "うぅ……。なんでそんな強いねん……", "worried", "defeated"),
      M("C2-M053", "少しは落ち着いた？　今度こそ話を――", "thinking", "stalk"),
      M("C2-M054", "ナニワ、後ろ！", "shock", "monster"),
      N("C2-N015", "えっ？", "surprised", "proof"),
      N("C2-N016", "……クッキーになった？", "surprised", "cookie"),
      M("C2-M055", "そう。魔法で弱らせれば、元のお菓子に戻せるの", "thinking", "approach-cookie"),
      N("C2-N017", "戻せる……？", "thinking", "eat"),
      N("C2-N018", "ほな、最初にお菓子を魔物にしたんも、あんたやな！", "determined", "recoil"),
      M("C2-M056", "どうしてそうなるの！？", "shock"),
      N("C2-N019", "食べ物を魔物に変えて運ばせたら、盗んだって気づかれへん……！", "thinking"),
      M("C2-M057", "違う！　今、目の前で戻したでしょう！", "angry"),
      N("C2-N020", "せやから、戻し方も知っとるんやろ！", "determined"),
      M("C2-M058", "……話が一周してるわ", "worried"),
      M("C2-M059", "あっ、荷車が……！", "shock", "outgoing"),
      N("C2-N021", "しまった、行ってまう！", "surprised", "stand"),
      N("C2-N022", "……今は、あの荷物を追う方が先や", "thinking"),
      N("C2-N023", "先に行き先を押さえたら、言い逃れできへん証拠も見つかるはずや！", "determined"),
      M("C2-M060", "待って。私も、その行き先を調べて――", "thinking"),
      N("C2-N024", "そんなこと言うて、先回りして証拠を消すつもりやろ！", "determined"),
      N("C2-N025", "次こそ、ぜったい逃がさへんからな！", "confident", "forget"),
      M("C2-M064", "……その前に、杖", "thinking", "notice"),
      N("C2-N026", "…………", "flustered"),
      N("C2-N027", "わ、忘れたんちゃう！　今、拾うとこや！", "flustered", "retrieve"),
      N("C2-N028", "覚えときや、ミロード！", "determined", "leave"),
      M("C2-M065", "だから、説明を最後まで……。もう行っちゃった", "worried"),
      M("C2-M066", "……私も急ぎましょう。あの荷物を見失う前に", "thinking", "walk-out")
    ],
    direct: true,
    blocking: true,
    scene: "naniwa-ending"
  },
  {
    id: "c2-missed-cart",
    chapter: 2,
    stage: null,
    area: null,
    x: 0,
    priority: 2,
    lines: [M("C2-M067", "……ああ、行っちゃった。次が来るのを待とう", "worried")],
    signal: "missedCart",
    reaction: true,
    ttl: 3
  },
  {
    id: "c2-low-life",
    chapter: 2,
    stage: null,
    area: null,
    x: 0,
    priority: 30,
    lines: [M("C2-M068", "ちょっと無理しすぎたかな……。慎重にいきましょう", "worried")],
    signal: "lowLife",
    condition: "notBoss",
    reaction: true,
    ttl: 3
  },
  {
    id: "c2-heal",
    chapter: 2,
    stage: null,
    area: null,
    x: 0,
    priority: 15,
    lines: [M("C2-M069", "……うん、元気出てきた。もう少し頑張れそう！", "happy")],
    signal: "heal",
    reaction: true,
    ttl: 5
  },
  {
    id: "c2-death",
    chapter: 2,
    stage: null,
    area: null,
    x: 0,
    priority: 20,
    lines: [M("C2-M070", "あと少しで……行き先が分かりそうだったのに……", "worried")],
    direct: true,
    blocking: true
  }
];

C.chapters.push({id:2,name:'夜の街',stages:C.chapterTwoStages.map((s,i)=>({id:i+1,...s,...(i===2?{boss:'ナニワ'}:{})}))});
if(typeof module!=='undefined')module.exports=C;
})(typeof globalThis!=='undefined'?globalThis:this);
