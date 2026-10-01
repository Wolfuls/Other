ラタトスク・シリーズ素材　第13版（軽量化）

ZIPの内容を ratatoskr フォルダへ配置し、直下の index.html をブラウザで開いてください。
HTMLと画像を更新しているため、index.html、shared/、episodes/を合わせて上書きしてください。
ZIPには余分な外側のフォルダを付けていません。

配置例：
  D:\マイドキュメント\GitHub\Other\ratatoskr\index.html
  D:\マイドキュメント\GitHub\Other\ratatoskr\README.txt
  D:\マイドキュメント\GitHub\Other\ratatoskr\shared\
  D:\マイドキュメント\GitHub\Other\ratatoskr\episodes\

画像は別ファイルです。この位置関係を保ってください。
画面の「HTMLを保存」で保存したファイルも、元のindex.htmlと同じフォルダに置くと画像を読み込めます。

今回の変更
・画面外の投稿のレイアウト・描画を、表示が必要になるまで後回しにしました。
・画像も画面付近へ近付いた時に読み込みます。
・シジマとニーベルングの表示用アイコンを314×314pxのWebPへ縮小。
  元の絵を縮小・圧縮したもので、描き直しはしていません。
  合計3,260,629 bytesだった2枚は、表示用では合計47,740 bytesになっています。
・TLのラベルを選択言語で直接生成し、翻訳処理の全画面走査からTLを除外。
・翻訳パターンと結果を再利用し、初期データの二重読み込みを解消。
・使われていない旧描画関数と、別エピソード用の更新履歴を削除。
・ブックマーク等の操作では変更した投稿だけを差し替え、読みかけの位置を維持。
・過去の造花編の保存データを更新する処理と、JSON入出力、HTML保存は維持。

台本と表示設定
台本は第12稿の全301投稿・44アカウントのままです。本文・発言者・返信先は変更していません。
朝の雑談から時刻順に表示。本文は日英切り替えに対応します。
タブは「未フォローも含む」「フォロー中だけ」の順で、初期状態は前者です。
全投稿は301件、フォロー中だけでは230件です。
「ニーベルング報道」「ヘルヘイム・生活連絡」「ミズガルズ・街の話」は公式スレッド。
「部屋と修理」「起きてる人の雑談」「夜更かし対戦会」は未フォロー。
シジマのアカウント制限表示を維持しています。

ファイル
index.html                  この配置で使うメインのHTML。
shared/accounts.json        共通アカウント情報。
shared/avatars/             表示用アイコン44点と、シジマ・ニーベルングの元の高解像度PNG。
shared/ui/                  ラタトスクのロゴ。
shared/sheets/              アイコン制作に用いた4×4シート。
shared/avatar-provenance-v10.json 第10稿で追加したアイコンの切り出し位置。

episodes/zouka/index.html    エピソードフォルダ内で開く場合の互換コピー。
episodes/zouka/images/       添付画像2点。
episodes/zouka/台本・全体.txt 第12稿の全体台本。
episodes/zouka/台本・*.txt    各会話の抜粋。
episodes/zouka/draft-ja.json 日本語台本データ。
episodes/zouka/translations-en.json 英語本文。
episodes/zouka/display-settings.json 表示設定。
episodes/zouka/assets.json   シリーズルート基準の画像対応表。
episodes/zouka/revision-13-changes.json 今回の変更とファイル容量。
episodes/zouka/revision-13-browser-verification.json 操作確認の記録。
episodes/zouka/revision-13-performance.json 起動時間の比較。
episodes/zouka/previews/v13-*.png 今回の表示確認画像。

revision-12以前の番号の記録、番号のないverification.json、browser-verification.json、
html-verification.json、およびv13-で始まらないプレビューは過去の版の記録です。
高解像度PNG、原画シート、過去の確認画像は資料として残していますが、起動時には読み込みません。

今後の回はepisodes/の下に別フォルダを追加し、共通アカウント・アイコンを参照できます。
今回更新したPNG版アイコンのパスも残しているため、旧版HTMLからの参照を壊しません。
日英本文・画像参照・返信関係はHTMLのscene-dataへ組み込んでいます。
draft-ja.jsonはscene-dataそのものではありません。

確認環境
ブラウザでの確認と性能比較は、ローカルHTTP配信のChromiumで実施しました。
確認環境ではfile://が管理ポリシーで禁止されているため、直接ファイルを開く確認はできていません。
外部サービス、外部ライブラリ、画像取得APIを必要としない構成です。
画面外描画の延期に未対応のブラウザでは、従来どおり全件を描画します。
