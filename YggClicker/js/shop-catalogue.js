(function(root){const items=[
  {
    "name": "マグタフ",
    "price": "250 C",
    "fields": [
      {
        "label": "▼効果",
        "text": "対象のHPを最大値の10%（最低1点）回復する。",
        "timing": []
      },
      {
        "label": "▼フレーバーテキスト",
        "text": "正式名称は【マグナムタフネス】。 ユグドラシルにおける栄養ドリンクで、【ＥＸ】【Ｚ】など多数のフレーバー違いが存在する。 ２４時間働けます。",
        "timing": []
      }
    ],
    "cost": 250
  },
  {
    "name": "マグタフEX",
    "price": "250 C",
    "fields": [
      {
        "label": "▼効果",
        "text": "対象のＰＰを【１ｄ】回復する。 他者に使用する場合はメインアクションを消費する。",
        "timing": [
          "AC",
          "EN"
        ]
      },
      {
        "label": "▼フレーバーテキスト",
        "text": "正式名称【マグナムタフネスＥＸ】。通称「エグい方」。 無印に比べてカフェインとB群ビタミンがバカみたいに多い。 長距離トラッカーや夜勤従事者に根強い人気があるが、翌朝の反動がヒドいらしい。",
        "timing": []
      }
    ],
    "cost": 250
  },
  {
    "name": "マグタフZ",
    "price": "500 C",
    "fields": [
      {
        "label": "▼効果",
        "text": "対象の暴走率を10点減少させる。",
        "timing": []
      },
      {
        "label": "▼フレーバーテキスト",
        "text": "正式名称【マグナムタフネスＺ】。 原材料の何が効いているのか不明だが、妙に気分が落ち着くと評判。 他のマグタフと比べてやや割高。",
        "timing": []
      }
    ],
    "cost": 500
  },
  {
    "name": "マグタフ黒",
    "price": "25,000 C",
    "fields": [
      {
        "label": "▼効果",
        "text": "因子の代わりに1個消費して復活バーストを行い、対象のHPを全回復する。",
        "timing": []
      },
      {
        "label": "▼フレーバーテキスト",
        "text": "流通経路不明の危険なドリンク。 ラベルも黒いが、原材料欄も黒塗りになっているのが大変禍々しい。 死んでも２４時間働けます。",
        "timing": []
      }
    ],
    "cost": 25000
  }
];if(typeof module!=='undefined'&&module.exports)module.exports=items;else root.YggShopItems=items;})(typeof globalThis!=='undefined'?globalThis:this);
