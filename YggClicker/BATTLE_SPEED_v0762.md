## v0.76.2 — 戦闘倍速・演出待機

- 周囲の浮遊シンボルをオミット。表示切替を撤去し、既存セーブのON設定もOFFへ移行。
- 戦闘画面に「倍速」ボタンを追加。全クエスト共通の1倍/2倍切替を保存。
- 手番・準備動作・攻撃演出・戦闘効果・再出現は戦闘速度で進行。自動休憩の分数、HPの定期回復、暴走の時間変化、臨時収入、放置8時間上限は実時間を維持。
- 有限の攻撃・着弾・爆発・ダウン等の演出が終了するまで、各戦場の次の自動手番と優先度加算を保留。通常の待機・背景アニメーションは手番を止めない。
- 演出中の手動攻撃ボタンも待機。手動攻撃自体は自動優先度を消費しない。

## 検証

全551テスト成功。追加7件は倍速の最大手番数、実時間の休憩、演出待ち中の優先度停止、敵の準備と残留効果、途中の速度変更、セーブ互換、手動攻撃後の待機、8時間の同期/分割計算一致、ボタン保存を検証。

旧テストの更新：演出待ちを経ずに次の手番を強制する単体テストは、能力の検証前に演出待ちだけをクリア。実戦のテストは観測時間を延長。浮遊シンボルの旧ON描画テストは、旧ONセーブからのOFF移行テストへ置換。

実ブラウザのプレビューで倍速ボタンと浮遊シンボルのDOM生成ゼロ、エラーなしを確認。演出待ちにより従来の毎秒攻撃より実際の攻撃間隔は長くなる。倍速でも手番枠を待つため収入が必ず厳密に2倍になるわけではない。能力値・ダメージ式・報酬式は変更していない。

軽量化：静止した5手アイコンの再利用を継続。演出待機は各戦場の秒数1個で管理し、描画イベント待ちの大量キューを作らない。新たな常駐描画ループなし。CPU・メモリの厳密な新旧ベンチマークは今回未実施。

ブラウザWorkerの600.7秒・倍速・複数戦場テスト：Worker完了 true、全状態一致 true（手番401/別戦場308）。実ブラウザ390px幅でも操作欄の横はみ出しなし。

## 変更ファイル

- `animations.html`
- `ARCHITECTURE.md`
- `battle-speed-preview.png`
- `BATTLE_SPEED_v0762.md`
- `CHANGELOG.md`
- `duo-preview.html`
- `index.html`
- `js/app.js`
- `js/combat-effects.js`
- `js/data.js`
- `js/duo-view.js`
- `js/engine.js`
- `js/recovery-worker.js`
- `js/save.js`
- `package.json`
- `party.css`
- `README.md`
- `tests/actual-income-v0751.test.cjs`
- `tests/app-performance.test.cjs`
- `tests/battle-speed-v0762.test.cjs`
- `tests/creature-animation.test.cjs`
- `tests/enemy-curves-v0720.test.cjs`
- `tests/grounded-layout.test.cjs`
- `tests/megumin-v0660.test.cjs`
- `tests/ozmorn-v0560.test.cjs`
- `tests/perks-current.test.cjs`
- `tests/range-v0700.test.cjs`
- `tests/runaway-actions.test.cjs`
- `tests/timeline-v0760.test.cjs`
- `tools/timeline-worker-test.html`
