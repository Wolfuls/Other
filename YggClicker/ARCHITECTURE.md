# YggClicker 構成

## 定義と計算

- `js/characters.js`: 仲間とパークの現在値。二重定義や後付け上書きをしない。
- `js/quests.js`: クエスト・敵の現在値。モヒカンの外見定義は単体／群れで共有。
- `js/data.js`: 共通設定・素材参照。両カタログに共通の既定値を付けて公開。
- `js/strength.js`: 強度、命中確率、ダメージ分布。戦闘と見込みは同じ計算を使う。
- `js/engine.js`: 純粋なゲーム状態の更新。DOMを参照しない。全セッションの時間進行、売買、パーク、暴走率を扱う。
- `js/save.js`: スキーマ47の検証・旧セーブ移行。旧仕様の式や価格は移行専用なので削除しない。

## 表示

- `js/scene-view.js`: クエスト背景・時刻遷移・追憶。画面を隠したときのモーション停止も所有。
- `js/quest-view.js`: クエストカード、購入済みLv比較、周回状況。カード選択では内側の入力・操作ボタンを除外。
- `js/battle-hud.js`: 味方のHP／AP／暴走率。戦闘状態の変更は行わない。
- `js/ability-view.js`: 仲間／敵に共通する能力セルとSSセルの配置。
- `js/display.js`: 数値整形・位置計算。描画とは独立。
- `js/combat-effects.js`: 攻撃の再生スケジュール。戦闘結果を再計算しない。
- `js/app.js`: 起動・保存・各画面の調停・入力と個別キャラクター演出。

ブラウザとNodeテストの両方で同じモジュールを読み込む。ロード順はindex.htmlに記載。
操作で状態を変える窓口はengineに集約し、表示用の値は状態へ書き戻さない。

## 検証

`npm test`で戦闘、旧セーブ移行、同時セッション、描画スケジューラ、入力操作を検証。
見た目・実ブラウザのヒット領域・レスポンシブ表示は隔離したプレビューで確認する。
今回の整理前後で全設定値の一致と、ブラウザ／Node双方の初期状態の一致を確認。

## 成長と周回記録

- `numbers.curveLog/curveValue`は数値上限1e100の対数評価。敵強度と報酬で同じ曲線形式を使い、係数はdata.questGrowthに集約。
- `strength.enemyValue`は現行の敵強度。旧セーブ移行用の`value`（1.1指数）と混同しない。基礎ロール値は変えず、強度の比率・絶対規模へ適用する。
- `earned`は今回の周回、`previousRunsEarned`は終了済み周回の獲得合計。`incomeRecord`が累計を導出するため、同時セッションの収入を二重加算しない。
- `nextRun`は確認された追憶からのみ新規状態を生成する。`incomeRecord().allRuns`、`runNumber + 1`、optionsだけを引き継ぎ、入力状態を直接変更しない。appは保存が成功した場合だけ新状態へ切り替える。セーブ削除は周回記録を含む全削除のまま。

## パークとダメージ

- 各パークのrunawayPressureは秒単位。指定・表示は毎分なので60で変換する。OFF・必要Lv未満・戦闘不能では適用しない。
- 個々のパークIDとON／OFFを保存し、解放Lv変更時も既存選択を保つ。schema40／41移行は新しい初期パークを補い、削除されたパークの設定だけを取り除く。
- attackDamageとprofileAverageは、全体攻撃の通常時は防御後半減、倍差時は追加ダイスを付けず半減解除とする。スマッシュの追加ダイスは残す。
- manual profileのfixedDamageは1。強度差や防御、倍率から独立して戦闘と見込みの双方で使う。
- 仲間カタログは雇用費順で公開。既存の編成配列を並べ替えない。

- 狂犬は50・70・90%の閾値処理のみを暴発へ置換。自分への攻撃ロールだけ2D6+0へ差し替え、強度・防御・命中は共通計算を使用する。
- 各セッションの暴走イベントは通常のイベント配列で解決し、表示先を付与して集約。撃破数・総ダメージ・収入を同じ差分同期で反映する。
- 洋マンチは廃止。行動譲渡・直接攻撃・見込みはいずれも受け手自身のattackProfileを使用する。

## 追憶の解放と周回移行

- engine.isMemoriesUnlockedは現在所持因子が100万を超えたか、保存済みのmemoriesUnlockedを参照。refreshQuestUnlocksで解放を保持する。累計獲得因子は解放判定に使わない。
- scene-viewが確認ダイアログとフェードを所有し、暗転中にappのstartNextRunを1回だけ呼ぶ。appの戦闘時間は演出中に停止する。Escや非表示化では確認済みの移行を完了し、二重加算しない。
- 演出中はモーダルで入力を遮り、タイマー完了・Esc・タブ非表示時に解放する。減動設定ではぼかしを省略した短いフェードを使う。

## ミツルの対象効果

- 命中時効果は共通applyHitEffectsへ登録。tauntIdは次の攻撃予約時に消費し、連続手番では最初の1回だけを固定する。吸収は攻撃ではないため消費しない。
- actionPenalty/slowSecondsは各敵が保持。基礎行動値を減らしてから敵の行動倍率を適用し、秒経過・撃破・挑戦Lv変更で解除。被弾時は残り5秒へ更新する。
- 回復型と基礎暴走圧の組み合わせは独立。dataのタイプ別基礎圧は未指定時だけの既定値。
- img/mitsuru-v1.jsonとmitsuru-v1-prompt.txtに生成元・プロンプト・コマの足元合わせを記録。通常画像とダウン画像で身体の画素スケールを共有。

## クイーンとAP攻撃

- 攻撃プロフィールの`apAttack`で適用先だけを分け、判定・ダメージ分布は共通にする。HP、撃破・収入記録、HP被弾による状態効果をAP攻撃から更新しない。
- `queenCancels`は敵個体の状態。`pendingAttack.apCost`はその行動で消費したAPで、迎撃後の還元に使用する。
- 部隊支援は既存の有効パーク列挙を使い、別セッションや戦闘不能の提供者を混ぜない。

## 強度の表示単位

能力セルの強度はability-view.strengthLevelでLv×CP倍率へ変換する。敵は対応するstrengthLevel／hpStrengthLevelに1を加えたLv単位。engine.strengthValueやstrength.jsの実計算値とは分離し、表示値を戦闘・HP・保存へ書き戻さない。

## 覚醒パークと手番状態

- awakeningLevelを持つパークは既存の覚醒段階（50/60/70%）から自動発動し、通常のON/OFF購入操作の対象外。魔力上限は有効なmagicLevelの最大値であり、加算しない。
- health.magicLevelは蓄積済みの魔力。prepareMagicActionを通常・手動・GM譲渡・暴発の共通入口に置き、上限未満なら1増加して攻撃を行わない。上限到達後の次の行動で通常の命中・ダメージ処理へ進み、finishMagicAttackで魔力を0に戻してスタンと障壁を付与する。
- 攻撃力・命中力の現在値はmagicStateの現在魔力を使う。attackForecastProfileは元状態を変更せず最大魔力の攻撃を導出し、平均ダメージ・命中見込みと同じ計算に通す。effectiveAttackRateは詠唱・攻撃・休止の周期を含む。
- health.stunTurnsは残りの有料手番数。手動入力では消費せず、自動の有料手番だけで1減らす。スタン中はGMの譲渡候補から除外し、無消費行動の連鎖でも休止を消費しない。
- blastTurnsとblastEvasionは次の自身の手番終了までの一回効果。攻撃時の魔力×5を1回分だけ保持し、回避判定または期限到来で消費。全体攻撃で加算せず、全て外れた場合もダメージロールを行い同じ障壁を付与する。敵の予約攻撃の解決時は最新のスタン・障壁を参照する。
- 高速詠唱の固定行動力補正はownActionBonusから計算し、戦闘・基礎値表示で共有する。旧爆風ダメージ軽減は廃止し、schema46移行で残存状態を除去。
- めぐみんの行動は大量AP時も手番単位で処理し、既存の1秒120手番上限を使って残りAPを繰り越す。平均ダメージによる一括処理で詠唱・休止回数を失わない。

## 魔法の演出とスプライト登録

- 攻撃イベントの `magicLevel` は実際に使用した魔力を保持する。攻撃終了後の現在魔力を演出側から読み直さない。演出の集約では最大の使用魔力を引き継ぐ。
- `combat-effects.meguminExplosionSize` が魔力と爆発サイズの対応を所有する。appは発射姿勢と魔法陣を着弾後まで保持し、終了・一時停止・画面切替で解除する。
- 各スプライトのセル寸法・足元座標は画像に隣接するJSONへ保存。クイーンは傘を含む外接矩形ではなく靴の接地点を基準にする。
- v0.68.0の新規画像・生成プロンプトの一覧は `img/visual-v0680.json` に記録。

### Front / rear and attack reach (v0.70.0)

Character and perk reach lives in characters.js; quest reach in quests.js. formationRows preserves the assigned row independently from temporary down status. engine.js owns combatDistance, canReach and rangedPerks. General activePerks remains unfiltered for pressure and passive defenses. Both manual/automatic targeting and enemy targeting check reach before paying an action; pending attacks retain their chosen target. Area hits scope offensive perks for each target. Range-dependent motions travel in attack events through combat-effects.js to app.js. Save schema48 defaults old formations/enemies to front. The new six-frame atlases are registered at source foot (192,360), with generation provenance in img/range-sprites-v0700.json.

### Head status and runaway results (v0.70.1)

`battle-hud.js` mounts status and transient result layers beside the three vital gauges. The app derives persistent head labels from current health/runaway state and shows transient results only from engine events. `runawayRoll` adds no random draws; symptom rolls retain their existing event and dice. Result nodes expire via the visual timer manager and clear on combat reset. Enemy conditions have a separate head label and are omitted from defeat ghosts. Megumin rests for the configured five paid turns; save validation accepts up to five without extending existing saved rests.

### AP persistence (v0.70.2)

Expected action power may be fractional; actionThreshold floors the final doubled median to keep paid AP integral. Save validation accepts finite nonnegative fractional legacy AP, then floors it on the saved copy, including offscreen sessions. Invalid saves never replace a healthy primary. The app tracks the exact last persistence notice and clears it only after a successful save. tools/recover-live-ap.js wraps persist on a still-running old page without changing live progress.
