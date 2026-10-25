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
  ],
  "chapterOne": [
    {
      "id": "c1-woods",
      "chapter": 1,
      "stage": 1,
      "x": 100,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M001",
          "speaker": "ミロード",
          "text": "……いつもの森なのに、今日はずいぶん騒がしいわね",
          "expression": "thinking"
        },
        {
          "id": "C1-M002",
          "speaker": "ミロード",
          "text": "さっきの物音も、この辺りから聞こえたはずだけど……",
          "expression": "thinking"
        }
      ]
    },
    {
      "id": "c1-sight",
      "chapter": 1,
      "stage": 1,
      "x": 370,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M003",
          "speaker": "ミロード",
          "text": "いた。やっぱり、森にも……",
          "expression": "shock"
        },
        {
          "id": "C1-M004",
          "speaker": "ミロード",
          "text": "うちから逃げたのだけじゃなさそうね",
          "expression": "worried"
        }
      ],
      "after": "c1-woods"
    },
    {
      "id": "c1-meal",
      "chapter": 1,
      "stage": 1,
      "x": 0,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M005",
          "speaker": "ミロード",
          "text": "……こっちも、ちゃんとお菓子に戻るのね",
          "expression": "thinking"
        },
        {
          "id": "C1-M006",
          "speaker": "ミロード",
          "text": "でも、森にこんなにお菓子があるのも変じゃない？",
          "expression": "thinking"
        },
        {
          "id": "C1-M007",
          "speaker": "ミロード",
          "text": "誰かが落とした……にしては、多すぎるわよね",
          "expression": "worried"
        }
      ],
      "after": "c1-sight",
      "signal": "forestMeal"
    },
    {
      "id": "c1-trail",
      "chapter": 1,
      "stage": 1,
      "x": 1450,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M008",
          "speaker": "ミロード",
          "text": "この包み紙……お店で売ってるお菓子のよね",
          "expression": "thinking"
        },
        {
          "id": "C1-M009",
          "speaker": "ミロード",
          "text": "こっちにはパンまで……。誰か、荷物を落としていったのかしら",
          "expression": "thinking"
        },
        {
          "id": "C1-M010",
          "speaker": "ミロード",
          "text": "……ずっと奥まで続いてる",
          "expression": "thinking"
        },
        {
          "id": "C1-M011",
          "speaker": "ミロード",
          "text": "ちょっと、たどってみましょうか",
          "expression": "happy"
        }
      ],
      "after": "c1-sight"
    },
    {
      "id": "c1-hauling",
      "chapter": 1,
      "stage": 1,
      "x": 2600,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M012",
          "speaker": "ミロード",
          "text": "……ん？　今の魔物、何か持ってなかった？",
          "expression": "shock"
        },
        {
          "id": "C1-M013",
          "speaker": "ミロード",
          "text": "袋から落ちたの……パン？",
          "expression": "thinking"
        },
        {
          "id": "C1-M014",
          "speaker": "ミロード",
          "text": "食べるんじゃなくて、持っていくのね……",
          "expression": "thinking"
        },
        {
          "id": "C1-M015",
          "speaker": "ミロード",
          "text": "あの先は、古い庭園だったはず。追いかけてみよう",
          "expression": "happy"
        }
      ],
      "after": "c1-trail",
      "blocking": true,
      "scene": "carrier",
      "minScene": 3
    },
    {
      "id": "c1-garden",
      "chapter": 1,
      "stage": 2,
      "x": 100,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M016",
          "speaker": "ミロード",
          "text": "ここまで来るの、久しぶりだわ",
          "expression": "happy"
        },
        {
          "id": "C1-M017",
          "speaker": "ミロード",
          "text": "きれいな場所なのに……今は、のんびり眺めてる場合じゃないか",
          "expression": "thinking"
        },
        {
          "id": "C1-M018",
          "speaker": "ミロード",
          "text": "あった。さっきの魔物も、こっちを通ったのね",
          "expression": "thinking"
        }
      ]
    },
    {
      "id": "c1-carrier",
      "chapter": 1,
      "stage": 2,
      "x": 920,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M019",
          "speaker": "ミロード",
          "text": "また袋を持ってる……",
          "expression": "thinking"
        },
        {
          "id": "C1-M020",
          "speaker": "ミロード",
          "text": "目の前に食べ物があるのに、見向きもしないのね",
          "expression": "thinking"
        },
        {
          "id": "C1-M021",
          "speaker": "ミロード",
          "text": "……ただ暴れ回ってるだけじゃない、ってこと？",
          "expression": "thinking"
        }
      ],
      "after": "c1-garden",
      "scene": "carrier"
    },
    {
      "id": "c1-stock",
      "chapter": 1,
      "stage": 2,
      "x": 1750,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M022",
          "speaker": "ミロード",
          "text": "こんなところに、食べ物が山積み……",
          "expression": "shock"
        },
        {
          "id": "C1-M023",
          "speaker": "ミロード",
          "text": "お菓子に、パンに、果物まで。誰かのお弁当って量じゃないわね",
          "expression": "thinking"
        },
        {
          "id": "C1-M024",
          "speaker": "ミロード",
          "text": "さっきの魔物たちが、運んできたのかしら",
          "expression": "thinking"
        },
        {
          "id": "C1-M025",
          "speaker": "ミロード",
          "text": "これ、お店の荷札……？",
          "expression": "thinking"
        },
        {
          "id": "C1-M026",
          "speaker": "ミロード",
          "text": "持ち主がいるなら、勝手に食べちゃだめよね。……うん",
          "expression": "happy"
        }
      ],
      "after": "c1-carrier"
    },
    {
      "id": "c1-castle-path",
      "chapter": 1,
      "stage": 2,
      "x": 2630,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M027",
          "speaker": "ミロード",
          "text": "この跡……重いものを引きずったみたい",
          "expression": "thinking"
        },
        {
          "id": "C1-M028",
          "speaker": "ミロード",
          "text": "あの古城まで続いてるのね",
          "expression": "thinking"
        },
        {
          "id": "C1-M029",
          "speaker": "ミロード",
          "text": "誰も住んでないはずだけど……",
          "expression": "worried"
        },
        {
          "id": "C1-M030",
          "speaker": "ミロード",
          "text": "……確かめるしかないか",
          "expression": "happy"
        }
      ],
      "after": "c1-stock"
    },
    {
      "id": "c1-castle",
      "chapter": 1,
      "stage": 3,
      "x": 100,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M031",
          "speaker": "ミロード",
          "text": "……誰も住んでない、はずだったんだけどな",
          "expression": "worried"
        },
        {
          "id": "C1-M032",
          "speaker": "ミロード",
          "text": "足跡も、荷物も……ずいぶん出入りがあるみたい",
          "expression": "thinking"
        },
        {
          "id": "C1-M033",
          "speaker": "ミロード",
          "text": "お邪魔しまーす……って、返事は期待できないか",
          "expression": "happy"
        }
      ]
    },
    {
      "id": "c1-storehouse",
      "chapter": 1,
      "stage": 3,
      "x": 1100,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M034",
          "speaker": "ミロード",
          "text": "ここにも……。庭園にあった分だけじゃなかったのね",
          "expression": "thinking"
        },
        {
          "id": "C1-M035",
          "speaker": "ミロード",
          "text": "こんなに集めて、どうするつもりなの？",
          "expression": "worried"
        },
        {
          "id": "C1-M036",
          "speaker": "ミロード",
          "text": "……今度は、何？",
          "expression": "shock",
          "se": "thud"
        }
      ],
      "after": "c1-castle"
    },
    {
      "id": "c1-king",
      "chapter": 1,
      "stage": 3,
      "x": 2120,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M037",
          "speaker": "ミロード",
          "text": "うわ……大きい",
          "expression": "shock"
        },
        {
          "id": "C1-M038",
          "speaker": "ミロード",
          "text": "その王冠……このお城の王さま、のつもり？",
          "expression": "thinking"
        },
        {
          "id": "C1-M039",
          "speaker": "ミロード",
          "text": "聞きたいことはあるんだけど……",
          "expression": "worried"
        },
        {
          "id": "C1-M040",
          "speaker": "ミロード",
          "text": "……お話ししてくれる雰囲気じゃないわね！",
          "expression": "angry"
        }
      ],
      "after": "c1-storehouse",
      "blocking": true,
      "scene": "king",
      "minScene": 1.5
    },
    {
      "id": "c1-wave",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 35,
      "lines": [
        {
          "id": "C1-M041",
          "speaker": "ミロード",
          "text": "ちょっと！　いきなりそんなに飛ばさないでよ！",
          "expression": "angry"
        }
      ],
      "signal": "bossWave",
      "reaction": true,
      "ttl": 3
    },
    {
      "id": "c1-rush",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 35,
      "lines": [
        {
          "id": "C1-M042",
          "speaker": "ミロード",
          "text": "王さまなら、もう少し落ち着きなさいってば！",
          "expression": "angry"
        }
      ],
      "signal": "bossRush",
      "reaction": true,
      "ttl": 3
    },
    {
      "id": "c1-half",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 50,
      "lines": [
        {
          "id": "C1-M043",
          "speaker": "ミロード",
          "text": "……効いてる。このまま、お菓子に戻してあげる！",
          "expression": "angry"
        }
      ],
      "signal": "bossHalf",
      "reaction": true,
      "ttl": 5
    },
    {
      "id": "c1-cake",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 90,
      "lines": [
        {
          "id": "C1-M044",
          "speaker": "ミロード",
          "text": "……わっ！　大きなケーキ！",
          "expression": "shock"
        }
      ],
      "signal": "bossCake",
      "reaction": true,
      "ttl": 5
    },
    {
      "id": "c1-revived",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 90,
      "lines": [
        {
          "id": "C1-M045",
          "speaker": "ミロード",
          "text": "ああっ！　見とれてる場合じゃなかった！",
          "expression": "shock"
        }
      ],
      "signal": "bossRevived",
      "reaction": true,
      "ttl": 4
    },
    {
      "id": "c1-feast",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M046",
          "speaker": "ミロード",
          "text": "ん〜……！　おいしい……！",
          "expression": "delicious"
        },
        {
          "id": "C1-M047",
          "speaker": "ミロード",
          "text": "クリームも、いちごも……大きいだけじゃないのね",
          "expression": "delicious"
        },
        {
          "id": "C1-M048",
          "speaker": "ミロード",
          "text": "……っと。満足して帰っちゃうところだった",
          "expression": "happy"
        }
      ],
      "direct": true,
      "blocking": true
    },
    {
      "id": "c1-ending",
      "chapter": 1,
      "stage": 3,
      "x": 0,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M049",
          "speaker": "ミロード",
          "text": "あっ……！　まだいたの？",
          "expression": "shock"
        },
        {
          "id": "C1-M050",
          "speaker": "ミロード",
          "text": "今のも、食べ物を持ってた……",
          "expression": "thinking"
        },
        {
          "id": "C1-M051",
          "speaker": "ミロード",
          "text": "あの大きいのを倒しても、運ぶのはやめないのね",
          "expression": "thinking"
        },
        {
          "id": "C1-M052",
          "speaker": "ミロード",
          "text": "こっちの道は……街の方へ続いてる",
          "expression": "thinking"
        },
        {
          "id": "C1-M053",
          "speaker": "ミロード",
          "text": "魔物が食べ物を運んでるのは、間違いなさそうだけど……",
          "expression": "thinking"
        },
        {
          "id": "C1-M054",
          "speaker": "ミロード",
          "text": "どこから持ってきて、どこへ運んでるのかしら",
          "expression": "thinking"
        },
        {
          "id": "C1-M055",
          "speaker": "ミロード",
          "text": "お店の人なら、あの荷札にも心当たりがあるかもしれない",
          "expression": "thinking"
        },
        {
          "id": "C1-M056",
          "speaker": "ミロード",
          "text": "次は、街で聞いてみましょう",
          "expression": "happy"
        }
      ],
      "direct": true,
      "blocking": true,
      "scene": "ending",
      "minScene": 3
    },
    {
      "id": "c1-side-sweet",
      "chapter": 1,
      "stage": null,
      "x": 0,
      "priority": 5,
      "lines": [
        {
          "id": "C1-M057",
          "speaker": "ミロード",
          "text": "こんなところにも。……見つけちゃったら、放っておけないわよね",
          "expression": "happy"
        }
      ],
      "signal": "sideSweet",
      "reaction": true,
      "ttl": 5
    },
    {
      "id": "c1-wand",
      "chapter": 1,
      "stage": null,
      "x": 0,
      "priority": 8,
      "lines": [
        {
          "id": "C1-M058",
          "speaker": "ミロード",
          "text": "あら、この杖……まだ使えそう",
          "expression": "happy"
        },
        {
          "id": "C1-M059",
          "speaker": "ミロード",
          "text": "どんな魔法が出るのかしら。試してみましょう",
          "expression": "happy"
        }
      ],
      "signal": "pickup",
      "reaction": true,
      "ttl": 8,
      "safe": true
    },
    {
      "id": "c1-hurt",
      "chapter": 1,
      "stage": null,
      "x": 0,
      "priority": 10,
      "lines": [
        {
          "id": "C1-M060",
          "speaker": "ミロード",
          "text": "いたっ……！　油断しちゃった",
          "expression": "worried"
        }
      ],
      "signal": "hurt",
      "reaction": true,
      "ttl": 2
    },
    {
      "id": "c1-low-life",
      "chapter": 1,
      "stage": null,
      "x": 0,
      "priority": 25,
      "lines": [
        {
          "id": "C1-M061",
          "speaker": "ミロード",
          "text": "……落ち着いて。次はちゃんと躱さないと",
          "expression": "worried"
        }
      ],
      "signal": "lowLife",
      "reaction": true,
      "ttl": 3
    },
    {
      "id": "c1-heal",
      "chapter": 1,
      "stage": null,
      "x": 0,
      "priority": 15,
      "lines": [
        {
          "id": "C1-M062",
          "speaker": "ミロード",
          "text": "ふぅ……甘いものがあると、元気が出るわね",
          "expression": "happy"
        }
      ],
      "signal": "heal",
      "reaction": true,
      "ttl": 4
    },
    {
      "id": "c1-death",
      "chapter": 1,
      "stage": null,
      "x": 0,
      "priority": 20,
      "lines": [
        {
          "id": "C1-M063",
          "speaker": "ミロード",
          "text": "まだ……何も分かってないのに……",
          "expression": "worried"
        }
      ],
      "direct": true,
      "blocking": true,
      "auto": true
    }
  ],
  "chapterOneExits": [
    "c1-hauling",
    "c1-castle-path"
  ],
  "chapterOneProps": [
    [
      {
        "kind": "trail",
        "x": 1500
      },
      {
        "kind": "trail",
        "x": 1680
      },
      {
        "kind": "trail",
        "x": 1910
      }
    ],
    [
      {
        "kind": "scrap",
        "x": 245
      },
      {
        "kind": "stock",
        "x": 1860
      },
      {
        "kind": "stock",
        "x": 2000
      },
      {
        "kind": "tracks",
        "x": 2740
      },
      {
        "kind": "ruin",
        "x": 2890
      }
    ],
    [
      {
        "kind": "tracks",
        "x": 270
      },
      {
        "kind": "stock",
        "x": 1230
      },
      {
        "kind": "stock",
        "x": 1390
      },
      {
        "kind": "stock",
        "x": 2760
      },
      {
        "kind": "arch",
        "x": 2880
      }
    ]
  ]
};if(typeof module!=='undefined'&&module.exports)module.exports=content;root.MiloadContent=content;})(typeof globalThis!=='undefined'?globalThis:this);
