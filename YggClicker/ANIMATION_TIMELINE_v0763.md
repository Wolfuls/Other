# v0.76.3：演出完了による手番進行

- 固定の1秒／0.5秒の自動手番枠を廃止。クエスト別 `timeline.busySeconds` の期限、敵の攻撃予約、再出現・休憩終了を境界として進める。優先度は演出中には加算しない。
- 攻撃後のダメージ表示・爆発・ダウン・暴走結果も有限の待機期間に含める。表示開始と100ms更新のずれに対して100msの余裕を維持する。待機・呼吸・背景などの繰り返しアニメーションは手番を止めない。
- 攻撃演出のないスタン消費・魔力チャージなどの手番は、250msの短い状態表示。即時連鎖による無限処理を防ぐ。追加攻撃と行動譲渡の上限は変更しない。
- 戦闘だけの倍速、休憩の実時間、周期的な回復・暴走・臨時収入、最大8時間、共有SWRR、召喚5秒待ちを維持。戦闘回数・収入は演出長によって従来から変化する。
- 非表示戦場・Workerでも同じ演出時間モデルを使用。DOMの有無で戦闘速度は変わらない。セーブの形式と既存の残り演出時間を維持。
- 浮遊シンボルのDOM、生成・更新呼び出し、専用CSSとキーフレームを削除。戦闘時に飛ぶ武器は残す。旧セーブの `showOrbits` は互換性のためOFFに正規化するだけで、UIから参照しない。レイアウトの純粋な旧計算ユーティリティは互換テスト用に残るが、実画面では個数0の早期returnにより周回配置計算を実行しない。
- 理論DPSは以前からの1手／秒換算の比較指標である旨を明記。実時間の収益は引き続き実獲得額を集計する。

## 検証

端数秒での手番開始、演出中の優先度保持、短い状態手番、倍速切替、セーブ往復、手動攻撃、複数戦場、召喚待ち、休憩をテスト。8時間の固定シード計算は同期処理と分割継続処理で全状態が一致することを確認。

旧テストの「1秒進めると必ず1手」という仮定は廃止し、能力の単独手番テストは10msだけ進める。魔力・スタン・行動譲渡・挑発・射程・セーブに関する既存アサーションは維持。

全559テスト成功（Node実測13.55秒）。ブラウザの確認用戦闘画面で5手アイコン、通常／倍速の操作、浮遊シンボルDOMが0個であることを確認。

変更ファイル：
- `animations.html`
- `ANIMATION_TIMELINE_v0763.md`
- `ARCHITECTURE.md`
- `dashboard.css`
- `duo-preview.html`
- `index.html`
- `js/app.js`
- `js/combat-effects.js`
- `js/data.js`
- `js/display.js`
- `js/engine.js`
- `meta.css`
- `package.json`
- `party.css`
- `tests/animation-timeline-v0763.test.cjs`
- `tests/app-performance.test.cjs`
- `tests/battle-speed-v0762.test.cjs`
- `tests/charms-v0747.test.cjs`
- `tests/megumin-v0660.test.cjs`
- `tests/mitsuru-v0640.test.cjs`
- `tests/range-v0700.test.cjs`
- `tests/runaway-actions.test.cjs`
- `tests/sessions-current.test.cjs`
- `tests/timeline-v0760.test.cjs`
