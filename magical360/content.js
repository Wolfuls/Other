/* Authored fixed stages and dialogue; no external dependencies. */
(function(root){const content={
  "plannedChapters": 12,
  "chapters": [
    {
      "id": 0,
      "name": "魔女の家",
      "stages": [
        {
          "id": 1,
          "areas": [
            "house",
            "backyard"
          ]
        }
      ],
      "endingEvent": "forest-gate"
    },
    {
      "id": 1,
      "name": "チャプター1",
      "stages": [
        {
          "id": 1,
          "areas": [
            "woods"
          ]
        },
        {
          "id": 2,
          "areas": [
            "garden"
          ]
        },
        {
          "id": 3,
          "areas": [
            "old-castle"
          ],
          "boss": "夜菓子の王さま"
        }
      ]
    }
  ],
  "openingLines": [
    {
      "id": "M-001",
      "at": 0.5,
      "duration": 4,
      "expression": "happy",
      "text": "ふぅ……今日も一日、よく働いたわ"
    },
    {
      "id": "M-002",
      "at": 5,
      "duration": 4.8,
      "expression": "happy",
      "text": "さてと。楽しみに取っておいたクッキーでも……"
    },
    {
      "id": "M-003",
      "at": 10.8,
      "duration": 2.4,
      "expression": "thinking",
      "text": "……ん？"
    },
    {
      "id": "M-004",
      "at": 14,
      "duration": 3.6,
      "expression": "worried",
      "text": "……今、動いた？"
    },
    {
      "id": "M-005",
      "at": 18.6,
      "duration": 2.4,
      "expression": "shock",
      "text": "わっ！　………"
    },
    {
      "id": "M-006",
      "at": 21.4,
      "duration": 3.4,
      "expression": "shock",
      "text": "……えっ、スライム？"
    },
    {
      "id": "M-007",
      "at": 25.2,
      "duration": 5.8,
      "expression": "angry",
      "text": "いやいやいや！ なんでクッキーがスライムになるのよ!?"
    },
    {
      "id": "M-008",
      "at": 32,
      "duration": 4,
      "expression": "shock",
      "text": "あっ！　ちょ、ちょっと！ どこ行くの！？"
    }
  ],
  "layouts": [
    [
      0,
      4,
      1,
      3,
      2,
      0,
      3
    ],
    [
      1,
      3,
      0,
      2,
      4,
      1,
      3
    ],
    [
      3,
      1,
      2,
      0,
      4,
      2
    ]
  ],
  "story": [
    {
      "id": "home-start",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 10,
      "lines": [
        {
          "id": "M-009",
          "speaker": "ミロード",
          "text": "まったく、どうなってるの……",
          "expression": "thinking"
        },
        {
          "speaker": "SYSTEM",
          "text": "左右に移動して、スライムを追いかけよう！"
        }
      ],
      "room": 0
    },
    {
      "id": "home-step",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 280,
      "blocking": false,
      "priority": 10,
      "lines": [
        {
          "id": "M-011",
          "speaker": "ミロード",
          "text": "ああもう、こんなときに限って散らかってるんだから……",
          "expression": "worried"
        },
        {
          "speaker": "SYSTEM",
          "text": "ジャンプで段差を飛び越えよう！"
        }
      ],
      "after": "home-start",
      "room": 1
    },
    {
      "id": "first-encounter",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 50,
      "lines": [
        {
          "id": "M-012",
          "speaker": "ミロード",
          "text": "いた！",
          "expression": "shock"
        },
        {
          "id": "M-013",
          "speaker": "ミロード",
          "text": "コラー、待てー！　私のクッキー！",
          "expression": "angry"
        }
      ],
      "after": "home-step",
      "room": 2,
      "signal": "slimeDiscovered"
    },
    {
      "id": "first-defense",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 50,
      "lines": [
        {
          "id": "M-014",
          "speaker": "ミロード",
          "text": "……大人しく捕まるつもりはないみたいね",
          "expression": "worried"
        },
        {
          "id": "M-015",
          "speaker": "ミロード",
          "text": "こうなったら、魔法でおとなしくさせるしかないわね！",
          "expression": "angry"
        },
        {
          "speaker": "SYSTEM",
          "text": "魔法の杖で敵を攻撃しよう！"
        }
      ],
      "after": "first-encounter",
      "room": 2,
      "signal": "dodgeComplete"
    },
    {
      "id": "first-hit",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 30,
      "lines": [
        {
          "id": "M-016",
          "speaker": "ミロード",
          "text": "よし、効いてる！",
          "expression": "happy"
        }
      ],
      "signal": "firstHit",
      "after": "first-defense",
      "room": 2
    },
    {
      "id": "cookie-restored",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 40,
      "lines": [
        {
          "id": "M-017",
          "speaker": "ミロード",
          "text": "……あれ？",
          "expression": "shock"
        },
        {
          "id": "M-018",
          "speaker": "ミロード",
          "text": "クッキーに戻った……？",
          "expression": "worried"
        },
        {
          "id": "M-019",
          "speaker": "ミロード",
          "text": "もしかして、魔法で弱らせれば元に戻せるのかしら？",
          "expression": "thinking"
        },
        {
          "speaker": "SYSTEM",
          "text": "敵のHPを0にすると、お菓子に戻る！"
        },
        {
          "speaker": "SYSTEM",
          "text": "お菓子に触れると自動で食べられる！"
        }
      ],
      "signal": "firstRestored",
      "after": "first-hit",
      "room": 2
    },
    {
      "id": "cookie-revived",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 80,
      "lines": [
        {
          "id": "M-026",
          "speaker": "ミロード",
          "text": "えっ！？ またスライムに戻った！？",
          "expression": "shock"
        },
        {
          "id": "M-028",
          "speaker": "ミロード",
          "text": "……なるほど。食べるまで安心できないってことね",
          "expression": "thinking"
        },
        {
          "speaker": "SYSTEM",
          "text": "復活した魔物はHPが全回復する！"
        }
      ],
      "signal": "firstRevived",
      "after": "cookie-restored",
      "room": 2
    },
    {
      "id": "cookie-eaten",
      "chapter": 0,
      "stage": 1,
      "area": 0,
      "x": 0,
      "blocking": false,
      "priority": 60,
      "lines": [
        {
          "id": "M-021",
          "speaker": "ミロード",
          "text": "……うん。普通においしい",
          "expression": "delicious"
        },
        {
          "id": "M-022",
          "speaker": "ミロード",
          "text": "さっきまでスライムだったのに……",
          "expression": "worried"
        },
        {
          "id": "M-023",
          "speaker": "ミロード",
          "text": "……でも、もう魔物の気配はしないわね",
          "expression": "thinking"
        },
        {
          "id": "M-024",
          "speaker": "ミロード",
          "text": "つまり、魔法で元に戻して、そのまま食べちゃえばいい……ってことね",
          "expression": "thinking"
        },
        {
          "id": "M-025",
          "speaker": "ミロード",
          "text": "……自分で言ってて心配になる解決方法ね",
          "expression": "worried"
        },
        {
          "speaker": "SYSTEM",
          "text": "お菓子を食べると敵を完全に撃破できる！"
        },
        {
          "speaker": "SYSTEM",
          "text": "食べないまま時間が経つと、魔物に戻ってしまうので注意！"
        }
      ],
      "signal": "firstEaten",
      "after": "cookie-restored",
      "room": 2
    },
    {
      "id": "garden-arrival",
      "chapter": 0,
      "stage": 1,
      "area": 1,
      "x": 0,
      "blocking": false,
      "priority": 10,
      "lines": [
        {
          "id": "M-032",
          "speaker": "ミロード",
          "text": "はぁ!?　なんでこんなに魔物がいるのよ！",
          "expression": "shock"
        },
        {
          "id": "M-033",
          "speaker": "ミロード",
          "text": "これ、うちのお菓子だけの問題じゃないわよね……",
          "expression": "worried"
        },
        {
          "id": "M-034",
          "speaker": "ミロード",
          "text": "と、とにかく！ まずはここを片付けないと！",
          "expression": "angry"
        }
      ]
    },
    {
      "id": "garden-after",
      "chapter": 0,
      "stage": 1,
      "area": 1,
      "x": 0,
      "blocking": false,
      "priority": 10,
      "lines": [
        {
          "id": "M-035",
          "speaker": "ミロード",
          "text": "みんな、お菓子に戻るのね……",
          "expression": "thinking"
        },
        {
          "id": "M-036",
          "speaker": "ミロード",
          "text": "いったい何が起こってるんだろう……",
          "expression": "worried"
        }
      ],
      "signal": "gardenCleared",
      "after": "garden-arrival"
    },
    {
      "id": "placed-find",
      "chapter": 0,
      "stage": 1,
      "area": 1,
      "x": 1670,
      "blocking": false,
      "priority": 10,
      "lines": [
        {
          "id": "M-037",
          "speaker": "ミロード",
          "text": "あれ、こんなところにもお菓子が……",
          "expression": "shock"
        },
        {
          "id": "M-038",
          "speaker": "ミロード",
          "text": "これは魔物になってないみたいだけど……",
          "expression": "worried"
        },
        {
          "speaker": "SYSTEM",
          "text": "ステージには最初からお菓子が落ちていることもある！"
        }
      ],
      "after": "garden-after"
    },
    {
      "id": "placed-eaten",
      "chapter": 0,
      "stage": 1,
      "area": 1,
      "x": 0,
      "blocking": false,
      "priority": 10,
      "lines": [
        {
          "id": "M-039",
          "speaker": "ミロード",
          "text": "……うん。こっちは何ともないみたい",
          "expression": "delicious"
        },
        {
          "id": "M-040",
          "speaker": "ミロード",
          "text": "でも、普通のお菓子まで置きっぱなしになってるなんて……変ね",
          "expression": "worried"
        },
        {
          "speaker": "SYSTEM",
          "text": "お菓子を食べると幸福度が上昇する！"
        },
        {
          "speaker": "SYSTEM",
          "text": "幸福度が100%になるとハートが1つ回復！"
        },
        {
          "speaker": "SYSTEM",
          "text": "ハートが満タンの間は、幸福度は99%まで溜まる！"
        }
      ],
      "signal": "placedEaten",
      "after": "placed-find"
    },
    {
      "id": "first-damage",
      "chapter": 0,
      "stage": 1,
      "area": null,
      "x": 0,
      "blocking": false,
      "priority": 90,
      "lines": [
        {
          "id": "M-041",
          "speaker": "ミロード",
          "text": "いたっ！",
          "expression": "shock"
        },
        {
          "id": "M-042",
          "speaker": "ミロード",
          "text": "元はお菓子だけど、攻撃は容赦ないわね……",
          "expression": "angry"
        },
        {
          "speaker": "SYSTEM",
          "text": "敵の攻撃を受けるとハートが減少する！"
        },
        {
          "speaker": "SYSTEM",
          "text": "ハートが0になるとゲームオーバー！"
        }
      ],
      "signal": "hurt"
    },
    {
      "id": "first-heal",
      "chapter": 0,
      "stage": 1,
      "area": null,
      "x": 0,
      "blocking": false,
      "priority": 85,
      "lines": [
        {
          "id": "M-043",
          "speaker": "ミロード",
          "text": "うーん……♥　お菓子ってどうしてこんなに美味しいのかしら♩",
          "expression": "delicious"
        },
        {
          "id": "M-044",
          "speaker": "ミロード",
          "text": "この美味しさなら疲れも吹っ飛ぶわ、まだまだ戦えそう！",
          "expression": "happy"
        }
      ],
      "signal": "heal"
    }
  ],
  "farewell": {
    "id": "departure",
    "chapter": 0,
    "stage": 1,
    "blocking": true,
    "auto": false,
    "lines": [
      {
        "id": "M-046",
        "speaker": "ミロード",
        "text": "ふぅ……これで全部かな",
        "expression": "happy"
      },
      {
        "id": "M-047",
        "speaker": "ミロード",
        "text": "……ん？",
        "expression": "shock",
        "se": "rustle"
      },
      {
        "id": "M-048",
        "speaker": "ミロード",
        "text": "今の音、森の方から……？",
        "expression": "worried"
      },
      {
        "id": "M-049",
        "speaker": "ミロード",
        "text": "まさか、あっちにも魔物がいるんじゃ……",
        "expression": "worried"
      },
      {
        "id": "M-050",
        "speaker": "ミロード",
        "text": "……やっぱり、調べに行かないとだめよね",
        "expression": "thinking"
      },
      {
        "id": "M-051",
        "speaker": "ミロード",
        "text": "こんな変なこと、放っておけないもの",
        "expression": "thinking"
      },
      {
        "id": "M-052",
        "speaker": "ミロード",
        "text": "……お菓子が魔物になるなんて、聞いたこともないわ",
        "expression": "thinking"
      },
      {
        "id": "M-053",
        "speaker": "ミロード",
        "text": "誰かの魔法なのか、それとも別の何かなのか……",
        "expression": "thinking"
      },
      {
        "id": "M-054",
        "speaker": "ミロード",
        "text": "まあ、考えてるだけじゃ分からないわね",
        "expression": "thinking"
      },
      {
        "id": "M-055",
        "speaker": "ミロード",
        "text": "まずは森の様子を見に行きましょう",
        "expression": "happy"
      },
      {
        "id": "M-056",
        "speaker": "ミロード",
        "text": "……あ",
        "expression": "shock"
      },
      {
        "id": "M-057",
        "speaker": "ミロード",
        "text": "せっかく淹れた紅茶、飲み損ねちゃった……",
        "expression": "worried"
      },
      {
        "id": "M-058",
        "speaker": "ミロード",
        "text": "……帰ってきたら、また淹れればいいか",
        "expression": "happy"
      },
      {
        "id": "M-059",
        "speaker": "ミロード",
        "text": "それじゃ、行ってきます！",
        "expression": "happy"
      }
    ]
  },
  "death": {
    "id": "tutorial-death",
    "blocking": true,
    "auto": true,
    "lines": [
      {
        "id": "M-060",
        "speaker": "ミロード",
        "text": "うそっ、こんなところで……！",
        "expression": "shock"
      }
    ]
  },
  "tutorialRooms": [
    "居間",
    "物置",
    "奥の部屋"
  ]
};if(typeof module!=='undefined'&&module.exports)module.exports=content;root.MiloadContent=content;})(typeof globalThis!=='undefined'?globalThis:this);
