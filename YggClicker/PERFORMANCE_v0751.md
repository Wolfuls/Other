# v0.75.1 実収益表示・非表示UI軽量化

## 仕様と変更

120秒の模擬戦闘を使うexpectedIncome、totalIncomeと専用キャッシュを削除しました。因子の実付与をgrantIncomeで観測し、討伐・超過・パーク等の実際に加算された額をクエスト別に集計します。支出を差し引かず、売却返金・移行返金を除外します。表示専用の記録はゲームstateとセーブに入れません。

1秒ごとのクエスト別バケットを固定1801枠で保持。直近1/5/30分を選択でき、初期値は5分。集計期間未満の起動直後は実計測秒数で割り、ヘッダーに秒数を表示します。収入のない時間も分母に含みます。窓境界は1秒単位です。初回読み込み・インポート・新周回・長時間復帰後は計測を再開し、時刻別に復元できない復帰報酬を直近収益へ混入させません。履歴と期間選択は永続化しません。

DPSは模擬戦闘から再出現待ち等の稼働率を推定する依存を外し、攻撃中の理論DPSとして維持しました。表示値の定義変更であり、戦闘のダメージ・AP・行動頻度は変更していません。

非表示キャラの攻撃詳細・能力ダイアログ・育成費一覧、非表示クエスト一覧・更新欄・手動攻撃内訳の描画を停止。表示時は最新状態を反映します。購入見積りは最大64件、DPSは最大32件。能力/攻撃表示とクエスト能力プレビューは関連条件で再計算し、残高のみの変化で価格や無関係な能力全体を再計算しません。ジュエルの残高依存を保持します。

## 負荷比較

実ブラウザ、同じ739×956ウィンドウ・卵と鶏表示・固定戦闘乱数の各約20秒。計測ラッパーによる同期処理の経過時間でありOSのCPU使用率ではありません。親関数は子関数時間を含み、合算不可。単回測定のばらつきがあります。

| 項目 | v0.75.0 | v0.75.1 |
|---|---:|---:|
| render累計 | 720.2ms | 278.6ms |
| render最大 | 206.6ms | 114ms |
| render入口呼出 | 198回 | 199回 |
| DPS集計累計 | 189.7ms | 121.1ms |
| 非表示育成・購入欄処理 | 45回 | 0回 |
| 非表示クエスト一覧描画 | 1回 | 0回 |
| expectedIncome公開呼出 | 6回 | 0回 |
| totalIncome公開呼出 | 29回 | 0回 |
| 最長Long Task | 225ms | 133ms |
| Long Task件数 | 1 | 2 |
| JSヒープ観測値 | 13.99MB | 17.58MB |

旧版expectedIncomeの内部呼び出しは公開関数ラッパーでは全件計測できません。新版は関数とシミュレーションそのものを削除しており0です。描画入口の周期と戦闘の100ms同期は維持しています。Long Task件数とヒープは単一標本で改善を主張しません。Canvas/GPU負荷は今回変更していません。

Nodeの同一10秒UIハーネス（モヒカン群れ）では、処理142.69→100.73ms、テキスト書込977→551回、詳細式書込70→0回。ウォームDPS50回は3.86→3.76msで、ここはすでにキャッシュが有効なためほぼ同等です。模擬DOMでありブラウザ描画時間ではありません。

## 検証

- 519テスト成功、失敗0。既存UIテストは、非表示内容を直接読む前提から実際にタブ・能力画面を開く手順へ移行しました。
- 旧v0.75.0との4条件（単一・複数・高Lv・卵と鶏）×10分/1時間/8時間で、旧同期・新同期・新分割処理の全ゲーム状態が一致。
- 32シードの複数部隊10分も全状態・獲得因子一致。旧セーブの読み込み結果も一致。
- 実収益とearned差分、返金除外、無収入中の平均低下、希少なボス報酬、30分での失効、固定長履歴、復帰後0から再計測をテスト。
- 閉じた育成一覧の購入見積りが起動時・戦闘/残高変化時とも0回、開くと計算、変更がなければ再利用されることを確認。
- 実ブラウザで期間切替、計測経過秒数、クエスト別内訳の表示を確認。コンソールエラーなし。

## 残る負荷

DPSの初回期待ダメージ分布計算（今回最大約96ms）は残ります。実戦闘・HUD・Canvasも継続します。ゲーム進行を間引く対策は行っていません。file://直接確認と長時間メモリ/モバイル実機計測は今回未実施です。

## 変更ファイル

- animations.html
- dashboard.css
- duo-preview.html
- index.html
- js/app.js
- js/data.js
- js/engine.js
- js/income-history.js
- js/quest-view.js
- package.json
- PERFORMANCE_v0751.json
- REGRESSION_v0751.json
- tests/ability-v0531.test.cjs
- tests/action-cp-v0712.test.cjs
- tests/actual-income-v0751.test.cjs
- tests/app-harness.cjs
- tests/cp-pressure-v0709.test.cjs
- tests/dream-preview-v0631.test.cjs
- tests/duo-fade-v0740.test.cjs
- tests/enemy-curves-v0720.test.cjs
- tests/hp-strength-v0580.test.cjs
- tests/megumin-v0660.test.cjs
- tests/pressure-breakdown-v0574.test.cjs
- tests/queen-v0650.test.cjs
- tests/quest-combo-v0713.test.cjs
- tests/quest-preview-v0714.test.cjs
- tests/recovery-performance.test.cjs
- tests/runaway-down-v0690.test.cjs
- tests/strength-display-v0651.test.cjs
- tests/ui-v0571.test.cjs
- tests/unified-level-v0590.test.cjs
- tests/utgard-scene.test.cjs
- tests/visual-options.test.cjs
- tests/visual-polish.test.cjs
- tools/performance-bench.cjs

本報告書、PERFORMANCE_v0751.json、REGRESSION_v0751.jsonも追加。主な実装はjs/engine.js、js/app.js、js/quest-view.js、新規js/income-history.jsです。save.js、報酬/能力データ、Worker計算経路は変更していません。
