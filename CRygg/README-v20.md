# v0.20 数字サイズ統一
キャラクター画像と数字を分離。1・4・5・7・8は共通の5×7ドット文字を同じviewBox・描画サイズ・左下位置で重ねます。
キャラクター: assets/images/reels/character-番号-v20.png
数字: assets/images/reels/digit-番号.svg
旧画像は保存。数字なし画像は組み込みImageGen、数字は共通規格のSVGで作成。
構文、SVG解析、全数字の描画領域の一致、ファイル参照を確認。ブラウザでの目視確認は未実施。
