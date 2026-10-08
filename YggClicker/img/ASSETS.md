# 鋼音メタの画像素材

制作：内蔵ImageGen。ユーザー提供の鋼音メタ参考画像を立ち絵の外見の参照として使用。
透過背景を指定して生成し、最近傍リサイズとPNGパレット圧縮でゲーム用に調整しました。
背景の追加・立ち絵への丸鋸の描き込みは行わず、丸鋸は独立画像として画面で配置・回転します。

| 素材 | ファイル | 寸法 |
| --- | --- | --- |
| 鋼音メタの立ち絵 | `meta-standing.png` | 128×160 |
| 通常・瞬き・構え・攻撃の4コマ | `meta-poses.png` | 512×160 |
| 丸鋸 | `meta-saw.png` | 48×48 |

すべて透過PNG。HTMLへ埋め込まず相対パスから読み込みます。
キャラの攻撃性能・丸鋸の増加ルールはこのゲームの仮設定です。

v0.5では笑顔の第2コマを再生対象から外しています。PNG自体は維持し、第1・3・4コマの通常・構え・攻撃だけをCSSで再生します。

## v0.4：3頭身・アニメーションの最終生成プロンプト

内蔵ImageGenで旧立ち絵を参照して4ポーズを生成。2×2の素材を透過部分で切り分け、共通縮尺・足元の高さを合わせて横4コマへ配置しました。最近傍リサイズ・128色パレット圧縮。背景の塗りつぶしやアルファ削除はしていません。

Use case: style-transfer. Asset type: production transparent PNG animation sprite sheet for a Japanese 16-bit incremental browser game. Image 1 is the existing 鋼音メタ sprite to redesign; preserve her red bob haircut, straight bangs, red eyes, black sailor uniform with pale collar piping, long red necktie, black pleated skirt, dark socks and black shoes. PRIMARY CHANGE: make her unmistakably super-deformed CHIBI, exactly THREE HEADS TALL. Enlarge her round head to one third of her total height; tiny torso, very short compact legs and arms, cute round face. No long limbs. Create FOUR full-body animation frames of the SAME character in a precise 2 columns by 2 rows grid of equal square cells, transparent gutters, no drawn grid. Each character has the same proportions, same scale and same planted shoe baseline within its cell, fully inside its cell with wide clear margin. Read in order: top left = idle, open eyes, relaxed arms slightly out; top right = idle blink, closed eyes, slight head tilt and tiny shoulder lift, same feet; bottom left = attack anticipation, determined open eyes, hands raised near chest, body leans slightly back; bottom right = attack release, facing slightly right with right arm extended directing floating saw blades, other arm out, small forward lean and bent knees. No blades in the image; they are separate game assets. Pixel-art sprites with hard square pixel clusters, limited palette, dark outlines, stepped highlights, about 64 by 80 logical pixels per sprite. All four characters face three-quarter front slightly right. Opaque character pixels with actual transparent alpha background everywhere else. No checkerboard, labels, text, arrows, floor, cast shadows, scenery, border, motion trails, extra characters or objects. Clothing modest and unchanged. Prioritize 3-head-tall chibi proportions and visibly distinct animation poses.

## v0.3：参照に使用した旧立ち絵の生成プロンプト

Use case: stylized-concept. Asset type: transparent PNG full-body pixel-art standing character sprite for a Japanese incremental browser game. Input image 1 is the visual identity reference, not a background to copy. Create ONE isolated sprite of 鋼音メタ. Preserve the defining appearance: red bob haircut ending at jaw/neck, straight bangs, red eyes, black long-sleeved Japanese sailor school uniform with pale collar stripes and a clearly red long necktie, black pleated skirt. Add simple dark socks and black shoes so the entire body is visible. Calm determined face, modest natural upright pose, hands slightly lifted at waist as if telekinetically controlling circular saw blades, three-quarter front facing slightly right. Age-appropriate nonsexual game character. Classic 16-bit JRPG pixel art, approximately 64 by 96 logical pixels, crisp large square pixels, limited palette, dark pixel outline, simple clusters and stepped highlights, compact 3-head-tall proportions. Full body including shoes, centered with margin, no cropping. Completely transparent alpha background. No backdrop, no floor, no shadows outside sprite, no saws, no gears, no text, no border, no lettering, no extra characters. The character will be displayed about 150 pixels tall in game; prioritize a readable red hair silhouette, black sailor collar, red necktie. Do not use smooth anime illustration, soft airbrush, gradients or antialiased vector edges.

## 丸鋸の最終生成プロンプト

Use case: stylized-concept. Asset type: one transparent PNG pixel-art weapon icon for a 16-bit JRPG browser game. Create ONE isolated circular saw blade, viewed straight-on, perfectly round centered silvery steel disc with 16 pronounced sharp saw teeth pointing consistently clockwise, a small dark central axle hole and a red metal inner ring. Clearly a circular SAW BLADE with cutting teeth, not a gear with rectangular teeth. Crisp chunky square pixel art at approximately 32 by 32 logical pixels, limited palette of charcoal outline, dark steel, medium gray, silver highlight and a tiny muted red hub accent. Readable at 28-40 display pixels. Uniformly spaced teeth, symmetrical circular silhouette. Entire blade within frame with transparent margin. Actual fully transparent alpha background. No background, no text, no floor, no scene, no hand, no handle, no character, no glow or blur, no multiple sprites. Flat frontal sprite, no perspective. Hard square pixel clusters, no photorealism.


## v0.8：白い三日月目の連続投擲・2コマ

内蔵ImageGen。既存のメタ立ち絵・4コマを外見と画風、ユーザー提供の連続斬撃スプライトを動作の参考に使用。新たな2ポーズを透過背景で生成。ゲーム実装用に透明な余白で切り分け、共通縮尺の最近傍リサイズ・足元揃え・横2コマ配置・128色PNG圧縮のみ適用。生成されたアルファを保持。

保存先：img/old/meta-burst.png。416×160、1コマ208×160。通常の立ち絵とは別ファイルで保持します。

Generated with the built-in ImageGen tool. Transparent background enabled.

Use case: style-transfer. Asset type: a production transparent PNG TWO-FRAME horizontal pixel-art sprite sheet, for the existing 鋼音メタ browser game character. Input 1 is the existing character identity and pixel-art style reference. Input 2 shows her existing pose sheet; keep its identity and compact three-head-tall chibi proportions. Input 3 is MOTION INSPIRATION ONLY: frenetic repeated alternating arm throws with broad sweeping action like this tiny game sprite. Do not copy its blue-haired character or blue background. Create exactly TWO full-body keyframes side by side in equal cells (one row, two columns), same scale, same feet baseline, clear transparent gutter, no cell borders. Prefer a 1024 x 640 canvas with each cell 512 x 640, composition ready to display each frame at 128 x 160. Character: red jaw-length bob haircut and straight bangs, black long-sleeve sailor school uniform, pale collar stripes, long RED necktie, black pleated skirt, dark socks and black shoes. Same chunky 16-bit pixel clusters, dark outlines and palette as the identity reference. THREE HEADS TALL, tiny limbs. She faces three-quarter front toward the RIGHT, wildly and comically flinging circular saw blades at enemies on her right. Frame A: forward crouch with spread planted feet, one arm forcefully thrust to the right at shoulder height, opposite arm pulled back low preparing the next throw; hair and red necktie swing right. Frame B: exchange the throwing arms dramatically, other arm sweeps forward low toward the right while first arm recoils high, torso rocks and hair/tie swing back. Make A and B visibly different alternating throws, same character size and stable ground level; poses fit entirely in their own cells. MOST IMPORTANT FACE: in BOTH frames her eyes are exaggerated manga gag-style WHITE CRESCENT-SHAPED BLANK EYES, solid white crescent wedges with dark outlines, no iris and no pupil at all, comically fierce manic focus. NOT her usual red eyes, not black closed smiling eye lines. Tiny straight or exertion mouth, NOT a happy smile. Thin short pale curved motion accents beside the throwing arms are okay. No detached flying saws or extra floating objects baked into these frames, because the game independently launches the exact number of saw sprites. Character and all clothing opaque, all background pixels genuinely transparent alpha. No background, checkerboard, floor, shadow plane, labels, text, frame numbers, border, extra frames, other characters. Keep the entire head, hands, feet visible with margin. Prioritize recognizable Meta, WHITE CRESCENT GAG EYES, and a readable frantic two-pose saw-throwing loop.


## v0.9：叫び顔・両腕の残像・3コマ

内蔵ImageGenで既存2コマと立ち絵を参照し、口を大きく開けて叫ぶ顔・両腕の激しい残像を持つ3ポーズへ変更。追加の生成でコマ間の余白だけを修正しました。通常の立ち絵は変更していません。

保存先：img/old/meta-burst-v2.png。672×192、横3コマ（1コマ224×192）。旧2コマPNGは維持。ゲーム用調整は透明余白での切り分け、共通縮尺の最近傍リサイズ、頭頂と足元を基準とした位置合わせ、128色PNG圧縮です。透過アルファと両腕の半透明残像を保持しています。

Built-in ImageGen, transparent background enabled for both calls.

Initial three-frame revision:
Use case: style-transfer. Asset type: production transparent PNG THREE-FRAME horizontal sprite sheet for the existing pixel-art character 鋼音メタ. Image 1 is the current two-frame rapid-throw animation to REVISE; image 2 is her idle appearance reference. Preserve her red chin-length bob, blunt bangs, black long-sleeve sailor uniform with pale collar piping, long RED necktie, black pleated skirt, dark socks and black shoes; identical chunky three-head-tall 16-bit chibi style. PRIMARY REVISION: the current pose is too restrained. She must be SHOUTING with her mouth WIDE OPEN, frantically windmilling BOTH arms at extreme speed to fling circular saws. Exactly THREE full-body keyframes in one horizontal row of equal square cells, same body scale and feet baseline, transparent gutters, no labels or grid. Keep her head, torso and planted wide-apart feet coherent and readable, facing three-quarter front toward the RIGHT. Eyes in ALL THREE frames are the existing manga-gag WHITE CRESCENT-SHAPED BLANK EYES with black outlines, no iris/pupil. Mouth in ALL THREE frames is a large dark OPEN SHOUTING mouth, vertical rounded trapezoid/oval, dark interior, little red tongue and short upper white tooth line; NOT a closed frown, not a smile. BOTH arms must be in frantic motion in EVERY frame, largely depicted as bold sweeping black-sleeve and flesh-tone AFTERIMAGE SMEARS instead of clean still hands. Use two or three overlapping translucent motion trails per arm, curved broad fan shapes, strong pale speed arcs. No arm may hang idle or rest at her side. Frame A: one arm whips high toward the enemy while the other slashes low across her front, high-right and low-left diagonals. Frame B: both arms sweep across the front at chest height in opposing intersecting arcs, widest forward-reaching fan of hand/sleeve afterimages, torso leans forward. Frame C: the high/low diagonals reverse, first arm whips low-right while other whips up-left, transitioning naturally back to A. Make silhouettes VERY DIFFERENT between frames, like an over-the-top comedy manga berserk flurry, much more energetic than the two input poses. The extra hands are visibly fading motion afterimages, never extra anatomical arms. Main body opaque; afterimages may be partially transparent. Hair, skirt and necktie swing with the movement. Head must stay readable and approximately at the same height in all frames; all hand trails fit in their own cell and do not rise above the top of the head. Character feet stay at a stable common baseline. Full head, shoes and complete motion trails visible inside generous transparent margin. No detached flying saws baked in: game renders counted saw projectiles separately. No background, floor, cast shadow plane, checkerboard, text, lettering, watermark, extra characters, additional frames or cell borders. Real transparent alpha background. Hard square pixel clusters and limited palette. Prioritize a plainly visible WIDE OPEN SHOUTING MOUTH, white crescent eyes, and furious BOTH-ARM AFTERIMAGE THROWING in a three-frame loop.

Final layout repair:
Use case: precise-object-edit. This is an animation-sprite-sheet LAYOUT REPAIR only. Keep the exact same three red-bob chibi girl poses, white crescent blank eyes, wide-open shouting mouths, black sailor uniforms with red neckties, both-arm motion afterimages, pixel art and colors from the supplied image. All three figures must remain unchanged in identity and pose. The motion trails of the middle and right figures currently touch. Separate them cleanly. Repack the THREE poses into EXACTLY THREE equal-width cells in ONE HORIZONTAL ROW, using a substantially wider transparent canvas. Leave a completely empty transparent vertical gutter of at least 12 percent of one cell width between every pair of characters, including every faint afterimage. Add clear outer margins, including above the raised arm trails and below the shoes. Keep the same body scale, same head height and same foot baseline in all three cells. Fit each entire character AND all their existing arm-afterimage trails comfortably inside its own cell without cropping, contact, overlap, or copied fragments of another pose. Do not simplify or remove the energetic both-arm smears. Do not close any mouths. Do not add frames, numbers, labels, borders, scenery, shadows, solid backgrounds or checkered backgrounds. Real transparent alpha everywhere outside the characters and their motion trails. Preserve the THREE distinct poses and open-mouth shouting expression. This is only spacing/layout repair.


## v0.9.1：鋭い白い軌跡と薄い腕のブレ

内蔵ImageGenでv0.9の3コマとユーザー提供の斬撃スプライトを参照。三日月の白目・叫び顔を維持し、先端の尖った白い弧・斬線を描画。続く修正で腕・手の実体を消し、肩口から薄い灰色のブレだけを残しました。

保存先：img/old/meta-burst-v3.png。672×224、横3コマ（1コマ224×224）。過去の素材は維持。ゲーム用の処理は透明余白での切り分け、共通縮尺の最近傍リサイズ、身体の大きさ・足元合わせ、128色PNG圧縮。透過アルファを保持しています。

Built-in ImageGen. Transparent background enabled.

First pass: sharp trajectories.

Use case: precise-object-edit. Asset type: transparent PNG horizontal THREE-frame pixel-art animation sheet. Image 1 is the EXISTING 鋼音メタ three-frame sprite sheet to edit. Image 2 is a visual reference ONLY for the SHARP WHITE ATTACK TRAJECTORIES. Preserve Image 1's red-bob three-head-tall chibi girl, black sailor uniform, red necktie, black skirt, dark socks and shoes, white crescent blank eyes, and WIDE OPEN SHOUTING MOUTH in all three frames. Preserve the three energetic arm poses and planted foot baseline. CHANGE ONLY the visual treatment of moving arms and their trails: REMOVE ALL translucent copies of hands/forearms, all flesh-colored smears, all broad blurry black sleeve fans, all soft motion blur. In their place draw CRISP, NARROW, KNIFE-SHARP WHITE SWOOSH TRAJECTORIES like Image 2. These are stylized thin curved slashing lines with hard edges and long pointed needle tips, not blurred limbs. Each arm leaves one main narrow white crescent slash and at most one or two very thin secondary speed lines, in cool white and pale silver only. At the final 160-pixel-tall character size, the main trail's thickest part should be about 3 to 5 pixels and taper to a single pixel. No broad fan-shaped bands, no peach/pink/skin-colored motion trails, no multiple ghost hands, no soft feathered edges, no glow clouds. Both arms move strongly in every frame, but depict only one current solid hand per arm, or let the fast hand terminate in a pointed white motion stroke. Frame 1: opposing diagonal sharp arcs, upper-right and lower-left. Frame 2: two crisp intersecting horizontal/diagonal crescents in front of the torso, face unobstructed. Frame 3: reverse diagonal sharp arcs, upper-left and lower-right. Keep the shouting head clear and the costume legible. EXACTLY THREE complete isolated sprites in ONE ROW of equal-width cells, common character scale and foot baseline. Each entire character and all sharp trails stay inside its own cell. Wide totally transparent gutters between cells and outer margins, no clipping or overlap. True transparent alpha background. Retain the original chunky pixel-art rendering and limited palette, hard square pixel clusters. No additional characters, frames, saws, scenery, floor, shadow plane, words, numbers, grid, border, checkerboard or background color. The key correction is clean pointed WHITE SLASH-LINE ARCS, never limb afterimages.

Final pass: make moving arms and hands nearly invisible.
Use case: precise-object-edit. Edit the supplied THREE-frame pixel-art sprite sheet. Preserve all three poses' positions, scale, planted legs, red bob hair, sailor collar, black uniform torso, red necktie, white crescent blank eyes, WIDE OPEN SHOUTING mouths, and especially the existing CRISP POINTED WHITE CRESCENT ATTACK TRAJECTORIES. Change ONLY the rendering of the actual moving arms and hands. The user wants the arms to move so fast that they almost disappear. REMOVE every recognizable skin-colored fist, hand, wrist and forearm from ALL THREE frames. REMOVE the solid extended black sleeves and clearly outlined upper arms as well. Keep only a tiny sleeve opening at each shoulder and a FEW faint thin dark gray/black speed streaks tapering from it toward the white motion arcs; the rest of each arm is visually absent, transparent negative space, as if the limbs are moving too fast to resolve. Do not render still straight arms, visible fists, anatomical ghost copies, duplicated skin-colored hands, broad flesh-toned smears, solid black sleeve fans or cloud-shaped blur. Do not cover or erase any face, torso, skirt, legs, or hair. Do not draw amputation ends, exposed anatomy, gore or wounds; this is a playful manga speed-motion convention, not injury. Leave the white slash arcs clean, thin, sharp-edged and needle-tipped, exactly the same strength and direction as now. Behind them any residual arm motion should be very faint short charcoal streaks, approximately 15 percent opacity, not a readable limb. The visual priority is an intact shouting chibi body with invisible extremely fast arms and clearly visible sharp white trajectories. Same THREE equal cells in ONE row with generous transparent gutters. Entire figures and arcs within each cell; no clipping or overlap. Actual transparent alpha background everywhere else, no colored background, checkerboard, text, numbers or borders. Retain pixel-art palette and edges. Make the arms and hands visibly much less present than in the input, while preserving the pointed white trajectories.


## v0.9.2：鞭のようにしなる腕とドットの粒度

内蔵ImageGenで通常の立ち絵・直前の3コマを参照し、ドット絵として描き直し。その後、ユーザーの補足に合わせて腕をしなる曲線へ変更し、細さ・半透明度を調整しました。最後に通常立ち絵を基準として頭と胴体の比率を調整し、叫ぶ口の白い上歯と残像の先の肌色を追加。袖の色が見える残像、鋭い白い斬線、三日月の白目を使用します。

保存先：img/old/meta-burst-v4.png。672×224、横3コマ（1コマ224×224）。ゲーム用の処理は透明余白での切り分け・身体の大きさと足元を共通化・各コマ112×112への最近傍縮小・PNG共通パレット圧縮・最近傍2倍拡大です。出力のすべての2×2ブロックでRGBAが一致することを確認済み。パレットは透過色を含む256色。生成された半透明アルファを保持します。旧素材は残しています。

Built-in ImageGen. Transparent background enabled for every pass.

Pixel-style revision:
Use case: style-transfer. Asset type: a TRUE LOW-RESOLUTION PIXEL-ART THREE-frame transparent PNG battle sprite sheet. Image 1 is the existing idle sprite and is the PRIMARY STYLE and character identity reference. Image 2 shows the current shouting three-frame attack and is a POSE / EXPRESSION / SHARP WHITE TRAJECTORY reference only. The user says Image 2 has become too smooth and its arms are too invisible. REDRAW the animation to match Image 1's real pixel art. Exactly THREE equal square cells in ONE horizontal row with wide fully transparent gutters. Same character scale, same head height, same planted foot baseline. Red bob and blunt bangs, black long-sleeve sailor uniform with pale trim, long red necktie, black skirt, dark socks/shoes; compact THREE-HEAD-TALL chibi proportions. Keep WHITE CRESCENT blank gag eyes and a WIDE OPEN SHOUTING mouth in all three frames. Maintain the three alternating diagonal / crossing-forward / reverse-diagonal attacks. BOTH MOVING ARMS MUST LEAVE A VISIBLE PIXEL AFTERIMAGE, NOT vanish: show 2 or 3 short overlapping CHARCOAL SLEEVE-SHAPED PIXEL STREAKS from each shoulder, about 40-60 percent opacity, with tiny subdued skin-colored pixel clusters at the moving hand ends. Their shape is visibly broken up by motion; no clean solid stationary arm. These restrained sleeve/hand streaks must remain readable against a dark teal game background, but never form huge fleshy fans or many fully drawn ghost hands. KEEP the long thin SHARP WHITE ARC trajectories, pointed tips and clean edges as in Image 2, drawn in pixel stairs. One main white slash per arm, a few pale silver pixels; no fluffy glow. CRITICAL PIXEL TECHNIQUE: treat each cell as a logical 112x112-pixel sprite (the body about 72 pixels high) then enlarge with nearest-neighbor. Every visible edge must use obvious square stair-step pixel clusters. Use a shared palette of roughly 32-48 colors, flat color clusters with at most 3-4 tones per material, clear dark single-pixel outlines. Pixel-perfect hard edges for hair, hands, white arcs AND translucent arm streaks. Convey motion blur with discrete offset PIXEL CLUSTERS and flat semitransparent ghost shapes, NEVER Gaussian blur or smooth continuous shading. No antialiasing, no airbrush, no gradients, no smooth vector curves, no high-resolution anime illustration, no noisy speckles. The face should remain expressive at game size, and the pixel grid equally coarse across character and effects. Preserve the reference identity, outfit and shouting face. Whole sprites and all arcs inside their cells with generous margins; never touch adjacent sprites. Real transparent alpha background. No checkered backdrop, solid color background, floor, labels, numbers, borders, text, saws or extra characters. Prioritize clearly VISIBLE but soft-in-opacity pixel-arm streaks plus AUTHENTIC CHUNKY PIXEL ART, while preserving sharp white trajectories.

Whip-like motion revision:
Use case: precise-object-edit. Asset type: THREE-frame low-resolution pixel-art attack animation on a transparent PNG sheet. Image 1 is the existing three-frame sprite sheet to revise; image 2 is the original idle sprite for identity. KEEP the red-bob three-head-tall chibi, black sailor uniform, red necktie, black skirt, dark shoes, WHITE CRESCENT blank gag eyes and WIDE OPEN SHOUTING mouth. Keep the three cells, same body scale and planted feet. IMPORTANT CORRECTION FROM THE USER: the moving arms must feel LIKE WHIPS. Replace each ordinary straight arm / repeated ghost-arm shape with ONE LONG, FLEXIBLE, SLEEVE-COLORED S-CURVE SMEAR extending from the shoulder. The arms are whipping and flexing in smooth dramatic curves, like fabric ribbons during an impossibly fast windmill; they are NOT static arms, detached transparent gaps, or multiple hands. Each motion smear begins thick at the shoulder, bends along a pronounced S or sweeping C curve, then tapers to a very fine tip. Draw the curves as dark charcoal/plum pixel ribbons with a muted gray highlight, clearly visible at about 60 percent opacity over a dark teal game background. Arms must feel elastic and fluid, with no visible rigid elbow or clenched fist. Use at most one fine offset echo-line beside each curve. These are animation smears of the existing sleeves and arms, NOT actual handheld whips, not tentacles, no handles or extra weapons. Frame A: one arm whips up in an S-curve above/right of the head and forward, the other sweeps low across the waist toward the right. Frame B: BOTH arm-ribbons sweep forward in intersecting bowed curves across the torso, without covering the face. Frame C: reverse the upper/lower sweeps to continue the windmilling loop. Make the S-curves substantially different between all three frames. Preserve sharp pointed WHITE SLASH TRAJECTORIES as thin accents along the OUTER EDGE / END of these arm motions; they must have crisp tapered ends, not giant detached blades. The sleeve-colored whip-like moving-arm curves must remain visible, not disappear. Genuine chunky pixel art: logical 112x112 pixels per cell, shared small palette about 32-48 colors, hard square stair-step edges, flat 2-3-tone color clusters, clear dark outlines. Render semitransparency as uniformly faded pixel clusters; NO Gaussian blur, airbrush, antialiasing, smooth gradients, photoreal or vector edges. Every effect uses the same coarse pixel grid as the body. Entire characters plus complete curves within THREE equal square cells in ONE ROW, generous transparent gutters and all outer margins; no clipping or touching. True alpha background, no checkerboard or solid backdrop, text, borders, labels, floors, saws or extra characters. Main priority: readable WHIP-LIKE S-SHAPED ARM MOTION, shouting face, white sharp accents, and crisp pixel-art texture.

Final thinner, partially transparent arm-motion revision:
Use case: precise-object-edit. Refine ONLY the moving-arm smear effects in this THREE-frame sprite sheet. Keep the entire character body, red hair, shouting mouth, white crescent eyes, sailor uniform, legs, scale, three poses and transparent sheet layout unchanged. The curved arms currently look like thick solid tentacles. The desired effect is a THIN, SEMITRANSPARENT, WHIP-LIKE ARM MOTION AFTERIMAGE. Keep the exact graceful sweeping C/S paths, but REDUCE THE WIDTH of every dark arm-ribbon to about ONE THIRD of its current width. These are slender speed strokes, widest only at the shoulder, tapering to a sharp point. They must remain visible but faded, uniform approximately 50-60 percent ALPHA OPACITY (actual semitransparent pixels, not opaque gray), with empty space visible through and around them. A thin lighter gray pixel edge may suggest cloth motion. No thick rounded tubes, muscles, forearms, fists, tentacle bodies, big filled ribbon bands or separate handheld whips. Each arm is a thin sleeve-colored curve as a motion smear, not a new appendage. Narrow the existing white crescent accents to slender needle-ended strokes as well, maximum 2-3 logical pixels wide when body height is72 pixels. Both charcoal arm trails and sharp white accents should stay distinct and connected to the motion. Retain authentic coarse PIXEL ART and exact stepped edges; uniformly faded square pixel clusters, no soft airbrush, Gaussian blur, anti-aliasing, gradients or smooth vector rendering. Keep all three full-body frames with transparent gutters, unchanged scale, fixed ground baseline and clear face. True transparent alpha outside the art; no backdrop, labels or grid. Main correction: THIN + PARTIALLY TRANSPARENT curved WHIP-LIKE ARM SMEARS, not thick solid curved arms. No other changes.


Final correction: idle proportions, white upper teeth, skin-colored trail tips.
Use case: precise-object-edit. THREE-frame transparent pixel-art animation for 鋼音メタ. INPUT 1 (idle sprite) is the MANDATORY anatomy/proportion reference. INPUT 2 is ONLY a reference for the three whip-shaped arm smear paths. Correct THREE specific defects: missing teeth, missing flesh-colored trail tips, and body proportions drifting away from the idle sprite.
1. PROPORTIONS: Reuse the idle sprite's exact big red-bob head size, face silhouette, tiny torso, short legs, skirt length and overall head/body ratio. Every frame must look like that SAME idle sprite entering an attack, not an older/taller differently proportioned redraw. Keep the original large head and compact lower body: at final display scale a head-to-shoe height about144px, head INCLUDING the bob hair about80px tall and96px wide, lower body below the chin only about64px. Use the SAME short legs and almost the same planted foot positions as the idle sprite, with only slight torso rocking. No longer legs or shrunken head. Preserve red bob/blunt bangs, black sailor uniform with white piping, long red necktie, black skirt, dark socks and shoes.
2. FACE: In ALL THREE frames keep white crescent blank manga-gag eyes, no pupils, and an ANGRY OPEN SHOUTING MOUTH. CLEARLY SHOW A SOLID WHITE BAND OF UPPER TEETH across the top of the open mouth: at logical sprite size at least5 pixels wide and1-2 pixels high. Mouth interior very dark red/black with a small muted red tongue below. Vertically open box/trapezoid mouth, stern downturned corners, NOT a smile, grin or toothless red circle. The teeth must remain visible at actual game size.
3. ARMS: Arms are visible partially transparent CHARCOAL SLEEVE-COLORED WHIP-LIKE curved motion smears, slender sweeping C/S curves from each shoulder, about50-60 percent opacity, not rigid elbows or multiple hands. At the FREE TIP of EACH arm smear add a CLEAR small peach/tan SKIN-COLORED STREAK, using the same skin palette as her face. Approximately3-5 logical pixels, tapered and lightly ghosted, as a fleeting hand trace, not an outlined fist. White pointed slash accent may run beside it but must not hide the peach tip. Both tips must visibly contain skin color in each of the three frames. Do not completely erase arms.
Frame A: upper-right and low-forward arm curves. Frame B: two bowed crossing curves across her torso, below the face. Frame C: reverse the upper/lower curves. Sharp white needle-ended arcs remain thin outer-edge accents.
GENUINE CHUNKY PIXEL ART, matching Input1. Logical112x112 per frame, body72 pixels tall (head about40 pixels tall), hard square pixels and stair-step outlines, flat limited color clusters. No Gaussian blur, smooth gradients, airbrush, antialiased edges or vector curves. Make all semitransparent trails from crisp pixel clusters. EXACTLY THREE equal square cells in ONE HORIZONTAL ROW, same head height, body scale and shoe baseline, wide completely transparent gutters and outer margins. Entire figures and trails fit without overlap or clipping. True transparent alpha background. No background color, checkerboard, text, numbers, grid, floor or extra objects. The idle character proportions, visible WHITE UPPER TEETH, and PEACH ARM-TRAIL TIPS are the highest priorities.


## v0.9.3：脚と靴の調整・通常モーションのドット粒度を統一

内蔵ImageGenで連続攻撃の太もも・足首・靴を細く小さく調整。白い上歯、三日月状の白目、鞭状の腕の残像と先端の肌色を維持しました。通常側も同じ粗さのドット絵に変更し、待機・未使用の無表情まばたき・構え・単発射出の4コマを制作。カード用立ち絵は待機コマを使用します。

保存先：img/old/meta-burst-v5.png（672×224、横3コマ）、img/old/meta-poses-v2.png（512×160、横4コマ）、img/old/meta-standing-v2.png（128×160）。従来の素材も保持。

技術処理は透過余白での切り分け、頭頂と足元による共通縮尺への調整、通常64×80・連続攻撃112×112の論理ピクセルへの最近傍縮小、各シート256色以内のPNG圧縮、最近傍2倍拡大です。両者とも実画像の2×2ピクセルを同じRGBAで揃えています。顔・脚・背景の絵柄修正は内蔵ImageGenで実施しています。

Built-in ImageGen. True transparent background requested in all passes.

Leg/shoe correction:
Use case: precise-object-edit.
Asset: transparent PNG three-frame pixel-art attack animation for 鋼音メタ.
Input 1 is the EXISTING THREE-FRAME ATTACK sheet to edit. Input 2 is her four-frame NORMAL animation, used ONLY as a reference for the slim legs and small shoes.
Primary request: correct ONLY the overly thick legs and oversized shoes in all three attack frames. Narrow each exposed thigh, knee and sock/ankle to about 60-65 percent of its current width, matching the petite legs in input 2. Shrink the width/volume of each heavy boot-like shoe to about 70 percent of its current width so they are small plain school shoes, not chunky boots. Keep the same short leg LENGTH, head-to-foot height, feet baseline, spread planted stance and poses; do not lengthen her legs or make her taller.
STRICT INVARIANTS: preserve the exact huge red-bob head, face scale and silhouette, tiny torso, black sailor uniform, red necktie, black skirt, WHITE CRESCENT blank gag eyes, and WIDE OPEN SHOUTING mouth with a clearly visible white UPPER TEETH BAND in every frame. Preserve the two curved whip-like CHARCOAL semitransparent arm smears, their small PEACH SKIN-COLORED tips, and thin sharp white slashing arcs in all frames. These must not disappear or change. Do not redraw the upper body. Maintain the existing coarse square pixel grid, flat color clusters and stepped edges, no smoothing or blur.
Keep exactly three equal square cells in one horizontal row, same scale and baseline, completely transparent gutters and outer margins, all trails intact. True transparent alpha background, including the space revealed where legs/shoes become thinner. No backdrop, text, checkerboard, extra objects or frames. Change ONLY leg/shoe thickness; everything above the skirt is locked.

Normal animation pixel style:
Use case: style-transfer.
Asset: transparent PNG horizontal FOUR-frame normal animation sheet for 鋼音メタ.
Input 1 is the EXACT existing four-frame normal animation to edit. Input 2 is the burst sheet used ONLY as a reference for coarse pixel size and limited-color clusters.
Primary request: make Input 1's pixel grid coarser, matching the chunky two-display-pixels-per-logical-pixel style of Input 2, while preserving Input 1's character and anatomy. This should look like a careful low-resolution reduction of the original four poses, NOT a new redesign.
Keep EXACTLY the same large red-bob head, bangs, red eyes, face silhouette, neutral mouth, compact torso, narrow thighs and ankles, small shoes, short leg length, black sailor uniform with pale collar trim, long red necktie, black pleated skirt, colors, pose sequence, alignment and overall body proportions from Input 1. DO NOT use Input 2's shouting face, white eyes, spread wide stance, thicker legs, arm smears, or action effects.
Frame 1: same calm idle standing pose with open red eyes and neutral closed mouth. Frame 2: same idle with a neutral closed-eye blink and neutral closed mouth, no smile. Frame 3: same attack preparation pose with hands raised, open red eyes and focused neutral mouth. Frame 4: same single-throw/release pose with both hands extended, open red eyes and focused neutral mouth.
Genuine low-res pixel art: each frame is a LOGICAL 64x80-pixel sprite, with character crown-to-shoe height72 logical pixels, shown enlarged with nearest-neighbor only. Consistent SQUARE pixel blocks, clean one-logical-pixel dark contours, flat small color clusters; hair highlights and facial detail simplified enough to read at64x80. Keep eye/face identity recognizable. No tiny mixed-resolution detail, smoothing, airbrush, antialiasing, gradients, blur or vector curves.
Exactly FOUR equal portrait-shaped cells in ONE HORIZONTAL ROW, identical character scale, generous completely transparent gutters and outer margins, shoes at one common baseline. Entire hands/hair/shoes fit their cells. Real transparent alpha background. No labels, text, grids, backdrop, floor or new objects. Priority: original SLENDER LEGS AND SMALL SHOES, exact original head/body proportions, and coarser square pixel clusters matching the attack animation.

Preserve upper teeth:
Use case: precise-object-edit. Edit this three-frame transparent pixel-art sprite sheet with ONE tiny change only: restore CLEAR WHITE UPPER TEETH inside the open shouting mouths in ALL THREE frames.
In every mouth, place a bright ivory-white horizontal band directly beneath the black upper lip, about two coarse logical pixels tall and spanning nearly the entire mouth width (about five to six logical pixels wide). The white teeth must be conspicuous at tiny game-sprite size. Leave the lower interior black/dark red with its small red tongue. It is a wide-open shouting mouth, not a grin or smile; keep its existing open vertical shape and fierce white crescent eyes.
Lock EVERYTHING else exactly: current newly SLIMMED legs and small shoes, leg length and wide stance, black socks, head/body proportions, face position, red bob hair, black sailor uniform, red tie/skirt, slender curved charcoal arm-motion smears, PEACH SKIN-COLORED smear tips, sharp white arc accents, 3 poses and all spacing. Do not enlarge legs or shoes. Do not move or redraw the character. Preserve coarse SQUARE pixel art and actual transparent background. No smoothing or extra pixel noise. Exactly the same three cells in one horizontal row. This is solely painting the missing white upper-teeth strip inside each existing mouth; no other change.

Normal animation transparent-gutter cleanup:
Use case: precise-object-edit. Transparent four-frame pixel-art sprite sheet cleanup only.
Keep all FOUR existing character poses, proportions, slender legs, small shoes, neutral face/open red eyes or neutral blink, red hair, black sailor outfit, red tie, colors, scale and coarse square pixel grid EXACTLY unchanged.
Remove only stray disconnected dark pixel specks in the TRANSPARENT GUTTERS around the characters, especially the two tiny specks to the lower-left of the THIRD character near hand/skirt height. All negative space outside the connected character silhouettes must be completely transparent. Do not erase any real hair tips, fingers, shoes or outfit details. Do not smooth, sharpen, recolor or redraw the sprites, and do not thicken legs or enlarge feet.
Same one-row FOUR-frame arrangement, isolated poses and common baseline, real transparent alpha background. This is a tiny transparent-background cleanup, no other changes.


## v0.9.4：細かいドットと全モーションの画風・頭身の統一

内蔵ImageGenで通常・まばたき・構え・単発射出・連続投擲3コマを同一原画上で描き直しました。最初の通常立ち絵を頭身と衣装の基準、直前の連続攻撃を白目・歯を見せた叫び顔・肌色を含む鞭状の残像の基準としています。通常時は赤い目と無表情を維持。脚・靴、輪郭線、髪と衣装の陰影を揃えています。

保存先：img/meta-standing-v3.png（128×160）、img/meta-poses-v3.png（512×160、横4コマ）、img/meta-burst-v6.png（672×224、横3コマ）。カード立ち絵は待機コマをそのまま使用。旧素材も保持しています。

生成原画から透過の余白で各コマを切り出し、頭頂と足元を基準に縮尺・位置を揃えました。通常128×160、連続攻撃224×224へ最近傍リサイズし、従来の2倍ブロック化は廃止。出力時は使用する7コマを一度まとめて256色以内に量子化し、共通の色から各ゲーム用PNGを抽出。描画・顔や体型の修正は内蔵ImageGenによるものです。原画の8番目に生成した通常姿は検討用で、ゲームには使用していません。

Built-in ImageGen. One unified master sheet, transparent background enabled.

Use case: style-transfer.
Asset: ONE unified production pixel-art character animation MASTER SHEET, true transparent PNG, exactly 4 columns x 2 rows of EIGHT equal square cells.
References: Image 1 is 鋼音メタ's original finer-detail NORMAL animation (identity, proportions, slim legs, small school shoes). Image 2 is the current RAPID-THROW animation (motion and gag expression ONLY).
Primary request: redraw ALL states together in a single coherent FINER-RESOLUTION pixel-art style. The coarse current version has too-large pixel blocks and the states look like different artists. Use one consistent character model, identical head dimensions, torso and skirt length, narrow leg thickness, small shoe size, palette, outline weight and shading method across all eight cells. The SAME character model changes pose; no individual cell may look older, taller, more muscular, thicker-legged or differently rendered.
Character: petite chibi girl, red jaw-length bob with blunt bangs, red eyes normally, black sailor school uniform with thin ivory collar stripes, long red necktie, black pleated skirt, short narrow legs, dark socks and small plain black school shoes. No smile. Match Image 1's large-head / compact-body proportions closely. Suggested at final display: crown-to-shoe height144 pixels; bob-hair head about70 pixels high and94 pixels wide, compact torso/skirt about46 pixels, legs below skirt about28 pixels. Thighs and ankles only8-10px wide, shoes approximately14px wide. Keep these ratios in every pose.
FINE PIXEL ART: treat each square cell as a logical224x224-pixel game canvas, character height144px, with genuinely SINGLE-PIXEL contours and fine deliberate square clusters. About twice the linear detail of Image 2. Refined 32-bit-era sprite craftsmanship, legible red-eye pixels, separated hair locks, precise collar trim and cloth folds. Flat organized color clusters, 3-4 shades per material, crisp stepped outlines. Do not use enlarged 2x2 chunky blocks. Absolutely no smooth anime painting, antialiasing, airbrush, Gaussian blur, gradients or glossy 3D shading. Hair, clothes, face AND motion effects share the SAME fine pixel density, palette and line treatment.
TOP ROW left-to-right:
1) calm IDLE, arms lightly away from body, red eyes open, tiny neutral closed mouth.
2) same IDLE with neutral CLOSED-EYE BLINK, unchanged closed mouth, not smiling.
3) SINGLE-ATTACK PREPARATION, short arms raised near chest, slight lean, red eyes and determined neutral mouth.
4) SINGLE-ATTACK RELEASE, hands extended toward the right, small stance shift, red eyes and neutral mouth.
BOTTOM ROW left-to-right:
5) rapid throw A, upper-right and lower-forward opposing curved arm smears.
6) rapid throw B, two bowed arm smears crossing below the face.
7) rapid throw C, reverse the upper/lower curves.
8) EXACT repeat of the top-left calm IDLE, at the same size, used to check model consistency between rows.
In cells5-7 ONLY: eyes are WHITE CRESCENT blank manga gag eyes, no pupils. Mouth is a vertically WIDE-OPEN SHOUT, with a CLEAR BRIGHT WHITE UPPER TEETH BAND at least2 fine pixels high across the mouth, dark lower interior and small red tongue; not a smile. Arms appear as slender WHIP-LIKE charcoal/plum curved C/S motion smears, partially transparent, with peach SKIN-COLORED tips and narrow sharp WHITE arcs. Both arms sweep vigorously in every frame, with tiny offset echoes, no rigid still arm, thick tentacles, broad flesh fans or multiple outlined fists. The slim legs/shoes and whole head/body model remain exactly as in the top row.
Layout: exactly4x2 equal square cells, ONE consistent scale for all8sprites, same crown height and planted shoe baseline within each row, bodies centered. Generous completely transparent gutters horizontally AND vertically. Full hands, hair, shoes and every curved trail fit their cell, no touching/overlap/clipping. A roughly2:1 wide overall sheet. True transparent alpha outside sprites, no background, floor, shadows, checkerboard, grid, separators, text, labels, numbers or extra objects. Do not draw saws; the game adds them separately. Top priority: FINER genuine pixel art with PERFECTLY UNIFIED character design and proportions across ALL STATES.



## リヒターの4コマ（v0.11）

- 制作：内蔵ImageGen。ユーザー提供の Mr.jpg と ba8f58d21d37fe7524160fd34102b716.webp をキャラデザイン、meta-poses-v3.png を画風・頭身の参考に使用。元の参考画像はゲームに同梱していません。
- 原画：exec-e3b76abe-1262-4664-a6fd-7936a94ff82d.png、2172×724、透過。
- 配布PNG：richter-poses-v1.png（512×160）、richter-standing-v1.png（128×160）。同じ倍率で最近傍縮小し、足元を152pxにそろえ、128色パレットに整理。待機・構え・射出・戻しの4ポーズ。
- 各素材はimgフォルダの外部PNG。画面の弾と爆発はCSSの軽量な演出。

生成プロンプト：

```text
Use case: stylized-concept
Asset type: transparent PNG pixel-art animation sprite sheet for the local idle game YggClicker.
Primary request: create Gerhamt Richter (ゲルハムト・リヒター) from references 1 and 2 as a chibi party member, with exactly the same fine pixel-art treatment, outline weight, small pixel clusters, shading detail and approximately three-head proportions as the red-haired girl's sprite sheet in reference 3. Reference 3 is STYLE AND SCALE ONLY: do not depict the girl.
Subject: adult man with dark brown skin, dense short black spiky hair, narrow burgundy sunglasses with silver frames, a small white cross-shaped bandage on his left cheek, confident stern mouth, dark reddish brown ankle-length high-collared coat with ochre edging, white squared number 5 motif on chest and lower hem, pink pleated cravat / high-neck undershirt, brown trousers and dark brown shoes. Preserve distinctive clothing from the full-body reference, adapting the long coat to a readable three-head chibi.
Composition: ONE horizontal row of FOUR evenly spaced full-body animation frames on actual transparent background, all facing slightly screen-right, identical character height/head size/feet baseline, roomy transparent gaps. Frame 1 idle, hands in coat pockets. Frame 2 slight anticipation, right hand raised near chest preparing to flick. Frame 3 attacking, right arm extended to screen-right, fingers snapping/flicking an explosive pellet, coat tail shifting. Frame 4 attack follow-through, arm slightly lowered and coat settling. No projectile or explosion in this sheet; those are separate game effects.
Style/medium: crisp detailed Japanese 2D game pixel sprites. Fine resolution like a 128x160 sprite per frame, sharp nearest-neighbor-style pixel edges, limited shaded palette, confident dark outlines, no smooth painted gradients. Body height and scale remain consistent between all four frames; chibi adult character reads in the same party as reference 3.
Constraints: exactly four complete sprites in one horizontal row, transparent background, no ground/shadow/background scenery, no labels or frame borders, no extra people, no girl, no watermark, no guns or saws. Maintain the same outfit in every frame.

```


## リヒターの身長差・厚い唇・爆弾投球（v0.12）

内蔵ImageGenで既存4コマを修正。厚い上下の唇、全コマから絆創膏を除去、振りかぶり・オーバースロー・振り抜きに変更。原画 exec-d2d18d18-0802-4f26-b71f-32e962c6d53e.png（2170×725）。爆弾は原画の手持ち爆弾を参照に内蔵ImageGenで単独素材化：exec-9b17a7c0-3ce4-403b-aad4-787fc181b4d2.png。

richter-poses-v2.png（768×224、1コマ192×224）とrichter-standing-v2.png（192×224）は最近傍縮小・128色。身長比140:180をメタの身体高144pxに対して185pxで表現。足元212pxに統一。richter-bomb.pngは28×28・48色の透過PNG。顔・投球の内容はImageGenで作成し、sharpは切り出し・整列・縮小・PNG圧縮にのみ使用。

最終生成指示：

```text
SPRITE SHEET — built-in ImageGen
Use case: identity-preserve
Asset type: transparent PNG pixel-art animation sprite sheet for YggClicker.
Input images: Image 1 is the EXISTING Richter sprite sheet to revise, preserving character identity, outfit, shading and fine-pixel technique. Image 2 is the character reference specifically for his THICK FULL LIPS and face/outfit. Image 3 is the existing Meta sprite, a style reference only; do not draw her.
Primary request: redraw Richter's four frames with (1) conspicuous thick full pinkish-brown upper AND lower lips ("tarako lips"), not a tiny line, and (2) completely clean cheeks, remove the white adhesive bandage in EVERY frame, (3) replace finger flicking with a real overhand bomb throwing animation. The character is an adult 180cm man, stylized around three-head chibi. We will display him 9/7 the height of 140cm Meta. Maintain the fine pixel-art look; no smooth painted gradients.
Preserve: tall spiky black hair, dark burgundy sunglasses with pale metal frames, tan/brown skin, dark reddish-brown ankle-length coat with ochre edges and white block number 5 on chest/hem, pink pleated cravat, brown trousers/shoes. Serious calm/confident expression, same exaggerated full lips in all poses. No bandage or white cross on cheeks. No smile.
Composition: four equally sized square cells in one HORIZONTAL ROW, full-body, ample transparent gaps, all bodies facing screen-right and same head scale and foot baseline. Frame 1 neutral standing, one hand resting by side with a small round charcoal bomb with short fuse visible. Frame 2 classic pitching WINDUP: throwing arm raised and bent BEHIND head holding the black round bomb, opposite arm aiming forward, body leaning backward. Frame 3 strong overhand RELEASE: torso rotates forward, long-coat hem follows, throwing arm reaches high FORWARD toward screen-right, hand open after letting go (bomb no longer in hand). Frame 4 FOLLOW THROUGH: throwing arm sweeps downward across front of torso, upper body leans forward, coat swings then settles. Entire upper arm, bent elbow and hand should clearly articulate throwing; not a pointing or finger-gun pose.
Actual transparent background. Crisp detailed pixel clusters at the equivalent of a ~180px tall character, dark sharp outlines, consistent fine pixel density. Face including thick lips must be readable at game scale. All four complete figures entirely inside their own cells, no cropping, no text labels, no borders, no scenery, no ground shadows, no second character. No separate airborne bombs in this sheet; projectile is a separate game asset.

BOMB PROJECTILE — built-in ImageGen
Use case: background-extraction
Asset type: transparent PNG pixel-art bomb projectile for a browser game.
Input image: a crop of the bomb held by Richter. Extract/recreate ONLY the small round charcoal-black bomb with short curved beige burning fuse and one small muted grey highlight, keeping its dark purple-black pixel-art shading. Remove the hand, fingers, arm, coat, and all other material completely. A single complete spherical bomb with fuse, centered on genuinely transparent background. Crisp fine-pixel Japanese game sprite suitable for downscaling to 28x28 pixels; no text, labels, backdrop or shadows. Preserve bomb's dark round appearance and short fuse. No person, no hand or skin pixels.

```


## v0.13 爆弾クリーチャー・リヒター連続投球

内蔵ImageGenで生成・編集。透過PNGとして、最近傍でリサイズし、各コマを足元212pxにそろえてパレット化しました。HTML埋め込みはありません。

- `richter-standing-v3.png`: 192×224、待機
- `richter-poses-v3.png`: 768×224、192×224の通常投球4コマ
- `richter-burst-v1.png`: 672×224、224×224の連続投球3コマ
- `richter-creature-v1.png`: 48×48、浮遊・投射共用

Generated with built-in ImageGen. Transparent PNGs; nearest-neighbor packing and palette conversion only.

Creature

A single small fantasy creature as a transparent-background pixel-art RPG sprite. Its body is round and magenta-pink, with two tall pointed ears, tiny angry white eyes with dark pupils, and a large distinctive golden-yellow wavy double-lipped mouth. Two little arms stick out to the sides. A curved pink tail curls behind its right side. On its belly is a charcoal-gray circular target marking, a pink ring and dark center. A little rounded foot at the bottom. Face forward, entire creature visible including tail, generous transparent padding, no floor. Polished crisp outlined Japanese RPG pixel art with a limited palette, designed for a 48-by-48-pixel game icon. One isolated creature only, no lettering, no multiple views.

Normal poses

Use case: precise-object-edit. Edit the FIRST image, an existing FOUR-FRAME pixel-art character animation sheet. Replace ONLY the black spherical bombs held in frame 1 (idle) and frame 2 (overhand windup) with small pink creatures based on image 2: magenta round body, pointed ears, yellow wavy double lips, dark circular belly marking, small arms and tail. Keep frame 3 (release) and frame 4 (followthrough) empty-handed. Preserve ALL character design, head/body proportions, body size, baseline, clothes, poses and frame count of image 1. Spiky black hair, sunglasses, thick full pinkish-brown lips, NO bandage, brown coat with gold trim and white 5 patches, pink cravat, brown boots. Keep clean pixel art style at exactly the original sprite resolution / detail. FOUR evenly spaced frames in ONE HORIZONTAL ROW, transparent background. Full bodies unclipped. No text labels, no new effects, no additional characters. Image 2 is only the creature design reference; render the small held creature in the same pixel scale as the man, roughly palm-sized.

Burst poses

Use case: identity-preserve. Make a new THREE-FRAME rapid-throwing animation sprite sheet for the SAME character in the provided game sprite sheet. Three evenly spaced full-body frames in a SINGLE HORIZONTAL ROW, all same scale, same baseline and head/body proportions, transparent background. Preserve the existing polished pixel-art style: spiky black hair, burgundy sunglasses, thick full brownish pink lips, tan skin, brown long coat with gold edging and white number 5 patches, pink neck scarf, brown boots. NO cheek bandage. Character faces right. Rapid overhand pitching action with vigorous torso twist and expressive arm movement: frame 1 winding right arm far behind and up, frame 2 right arm whipping forward while left arm reaches behind for the next projectile, frame 3 left arm whipping forward and right arm already pulling back. Thin sharp pixel streaks emphasize speed, keep legs and head readable and consistent. He throws small round PINK fantasy creatures instead of black spherical bombs: each has pointed ears, a yellow wavy mouth and dark circular belly marking. Show a pink creature in the winding hand of each frame. Do not draw loose flying projectiles or explosions; those are separate game effects. Keep full lips and serious determined expression throughout. Exactly 3 equally spaced frames, no words or labels. Transparent background.

Burst creature refinement

Use case: precise-object-edit. Edit ONLY the small pink creatures held in the THREE animation frames of image 1 so their design matches image 2. Keep image 1's three full-body character poses, body size, pixel art, face, thick lips, clothing, motion streaks, transparent background and layout unchanged. The small held creatures must have the round magenta body, large distinctive YELLOW WAVY DOUBLE LIPS, angry white eyes, tall pointed ears, and the CHARCOAL BELLY TARGET WITH A PINK RING from image 2. Keep them small enough to fit the existing hands. They should not look like smiling cats. Exactly the same three frames in one row; no new loose creatures or objects. Preserve true transparency.



## v0.13.1：短い耳・ヒレ・幽霊状の裾

ユーザー指定の形状修正を内蔵ImageGenで反映。透過PNGとして最近傍で縮小し、立ち絵の身体高約185px・足元212pxを維持。

- `richter-creature-v2.png`: 48×48、浮遊・投射共用
- `richter-standing-v4.png`: 192×224、通常待機
- `richter-poses-v4.png`: 768×224、192×224の4コマ
- `richter-burst-v2.png`: 672×224、224×224の3コマ

Built-in ImageGen was used for these transparent PNG edits. Packing uses nearest-neighbor resizing and palette conversion.

Creature

Edit this pixel-art fantasy creature sprite. Replace its oversized rabbit-like ears with two SMALL short triangular ear tips, each only one eighth of the round torso height. Replace its hands with flat downward-pointing pink FLIPPERS, no fingers. Remove both feet entirely: the lower body tapers smoothly into a short curled GHOST WISP, floating without legs. Keep the pink round body, angry eyes, broad golden-yellow wavy double lips, and charcoal circular belly marking with a pink ring. Crisp outlined pixel art for a 48x48 game sprite. One creature centered, entire body visible, transparent background, no floor or text.

Normal poses

Use case: precise-object-edit. Image 1 is the edit target: an existing FOUR-FRAME horizontal pixel-art game character animation sheet. Image 2 is the corrected creature design. Change ONLY the two little creatures held in frames 1 and 2 to match image 2: SHORT SMALL triangular ears, broad downward pink FLIPPERS instead of hands, and a tapered floating GHOST WISP lower body with NO legs or feet. Preserve the round pink body, yellow wavy double lips, angry white eyes, and circular gray/pink belly marking. Keep the creature palm-sized. Frames 3 and 4 remain empty-handed. Keep the HUMAN CHARACTER and all other pixels/design as faithful as possible to image 1: same spiky black hair, sunglasses, thick full lips, no cheek bandage, pink scarf, brown coat, white number 5 patches, same body and head proportions, all four poses, feet baseline, scale and spacing. Do not redesign the man. Exactly 4 complete full-body frames on one horizontal row. Crisp pixel-art texture; transparent background. No words, no new effects or detached creatures.

Burst poses

Use case: precise-object-edit. Image 1 is a THREE-FRAME rapid-throwing pixel-art animation sheet. Change ONLY the small pink creatures held in these 3 frames to the corrected creature in image 2. Each held creature has tiny SHORT triangular ear tips, broad downward-pointing FLIPPERS (no hands/fingers), and a floating GHOST WISP lower body with no legs or feet. Keep its round magenta torso, yellow wavy DOUBLE LIPS, angry eyes, and dark circular belly marking with pink ring. Preserve the human character, the original three vigorous throwing poses, motion streaks, thick full lips, sunglasses, spiky black hair, pink scarf, brown coat and white 5 patches. No bandage. Keep the same head and body proportions and consistent body size across frames. Exactly 3 evenly spaced full-body frames in one horizontal row, transparent background, no new projectiles or text. Preserve crisp pixel-art style. The human character must not be redesigned; the requested correction is to the small held creatures.



## v0.13.2：曲がった腕と丸い先端・小さく離れた目

提供された2枚の参考画像を元に内蔵ImageGenで編集。短い耳と幽霊状の尻尾を維持し、三角形のヒレを曲がった腕と丸い3つの先端へ変更。小さな目の左右間隔を広げています。透過PNG、最近傍で縮小・パレット化・コマ配置。

- `richter-creature-v3.png`: 96×96、浮遊・投射共用（表示サイズは従来どおり）
- `richter-standing-v5.png`: 192×224、待機
- `richter-poses-v5.png`: 768×224、192×224の4コマ
- `richter-burst-v3.png`: 720×224、240×224の3コマ。身体高約185px・足元212px、モバイル225×210

Transparent PNG edits generated with built-in ImageGen. Nearest-neighbor resize, palette conversion and sprite-sheet packing.

Arms and eye spacing

Use case: precise-object-edit. Image 1 is the existing transparent PIXEL SPRITE to edit. Images 2 and 3 are design references for the ARMS AND EYE SPACING ONLY. Make these two corrections: 1) Replace the straight triangular flippers with short fleshy bent arms like the reference: a rounded shoulder extending sideways, an elbow bent upward, then a drooping small hand angled diagonally down/out, ending in THREE soft rounded elongated lobes/digits separated by two dark grooves. These are little webbed drooping hands, not sharp flat triangles or fins. Clearly show the bend and rounded finger-like tips. 2) Make the eyes SMALLER, ROUND and WIDELY SPACED, with their centers at roughly 27% and 73% across the round torso's width. Small white circles with tiny black pupils and subtle angry upper edges, lots of pink forehead between the eyes. Do not use large close-set anime eyes. KEEP image 1's short small triangular ears, round magenta body, yellow wavy double-lipped mouth, dark circular belly marking with a pink ring, and especially the EXACT APPROVED CURLED GHOST TAIL at the bottom. No legs or feet. Do not copy the references' old lower-body shape or side tail. Preserve pixel art style, limited palette and clear dark outline. Single full-body creature on transparent background with margin, designed for 48x48 pixels. No floor, text or extra objects.

Preserve short ears and curved ghost tail

Edit this transparent pixel-art sprite in only two places: shrink both ears to small triangular nubs one quarter their current height; replace the rounded bottom bump with a narrow curved pink ghost tail that curls down-right and then back left at its tip. Keep the body round. Preserve the widely separated small eyes, bent drooping three-fingered arms, yellow wavy mouth, circular belly marking, and all remaining design exactly. No legs or feet. Crisp pixel art. Full creature visible on a transparent background.

Normal poses

Use case: precise-object-edit. IMAGE 1 is an existing FOUR-FRAME character animation sprite sheet; IMAGE 2 is the corrected small creature design. Update ONLY the two held pink creatures in frames 1 and 2 to match image 2. They must have short bent arms with rounded shoulders/elbows and drooping three-lobed little hands, NOT straight triangular flippers; SMALL round white eyes set far apart across the forehead; short ear tips; yellow wavy double lips; dark circular belly target with pink ring; curled ghost tail and no feet. Keep their scale palm-sized. Preserve every feature of the HUMAN CHARACTER from image 1: same head proportions, body proportions, spiky black hair, red sunglasses, thick lips, no bandage, pink scarf, brown coat with white 5 marks, boots, poses and spacing. Frames 3 and 4 stay empty-handed and unchanged. Exactly four complete full-body poses in one horizontal row on a transparent background, same baseline and scale. Crisp outlined pixel art matching image 1, not smooth illustration. No added effects, extra characters or text.

Burst poses

Use case: precise-object-edit. IMAGE 1 is the edit target, a THREE-FRAME rapid throwing sprite sheet. IMAGE 2 is the corrected creature design. Replace ONLY the three held pink creatures with the design in image 2. The creatures have short BENT arms ending in drooping rounded three-lobed hands, not sharp triangular flippers; SMALL ROUND eyes with a wide pink gap between them; tiny short ear tips; yellow wavy double lips; circular charcoal and pink belly marking; the curled ghost tail. No creature feet. Preserve the human character and the exact three throwing poses: spiky black hair, red sunglasses, thick full lips, pink scarf, brown coat with white 5 patches, no bandage, same head/body proportions, body scale, foot baseline, arm motion streaks and frame spacing. Do not redraw or redesign the human features. Exactly three complete sprites in one horizontal row on transparent background. Crisp pixel art matching image 1, no background or labels. Held creatures remain palm-sized.



## v0.14：連続投擲4コマ・爆発6コマ

内蔵ImageGenで4コマ目の右投擲と爆発6コマを制作。

- `richter-burst-v4.png`: 960×224、240×224の横4コマ。既存`richter-burst-v3.png`の最初の3コマのRGBA画素をそのまま配置し、新しい4コマ目を追加。追加コマは身体高185px・足元212pxに合わせています。
- `richter-explosion-v1.png`: 768×128、128×128の横6コマ。元の3列×2行の512pxセルを、各セル共通の倍率・中心で縮小して順番に配置。点火から膨張・煙・消失への大きさの変化を維持しています。

透過PNG。最近傍の縮小・パレット化・コマ配置で保存し、HTMLへ埋め込みません。

Built-in ImageGen was used. Transparent PNGs; nearest-neighbor resizing and sprite-sheet packing.

Fourth throwing pose

Use case: identity-preserve. Create ONE new animation frame for this existing pixel-art RPG character. Image 1 is his approved THREE-frame rapid throwing sheet; image 2 is his normal design; image 3 is the little projectile creature. This is the FOURTH frame to complete a LEFT THROW -> RIGHT THROW -> LEFT THROW -> RIGHT THROW loop. Draw a distinct vigorous RIGHT-HAND throw follow-through toward screen RIGHT. His right shoulder is driven forward, RIGHT arm swings across his chest and extends toward lower-right after releasing, left arm retracts with the next pink creature near his left hip. Torso twists opposite to frame 3, coat hem kicks back, legs remain planted at the same stance and baseline. Thin sharp pink motion streaks around the throwing arm, within the body height. Preserve the EXACT same chibi head/body proportions, pixel density, spiky black hair, red sunglasses, thick full lips, no bandage, pink scarf, brown long coat with gold trim and white 5 marks, brown boots. Keep the creature from image 3: wide-spaced tiny round eyes, bent drooping rounded hands, short ears, yellow wavy lips, circular belly mark, curled ghost tail. Transparent background. ONE full-body sprite only, centered with generous transparent margins, no spritesheet, no captions, no detached projectiles. It must fit beside image 1's existing frames at the same 185px body height and 240x224 cell size. Crisp pixel art, no soft painting.

Six-frame explosion

A production pixel-art EXPLOSION ANIMATION SPRITE SHEET for a retro Japanese RPG. EXACTLY SIX frames arranged in a precise 3 COLUMNS by 2 ROWS grid of identical square cells, read left-to-right top row then bottom row. Transparent background throughout, no panel borders or labels, no ground, no characters. Each cell's explosion originates at the SAME CENTER POINT, with ample transparent margins and consistent scale between cells. Frame 1: compact brilliant cream-white ignition flash with a few yellow sparks. Frame 2: expanding yellow-white hot core wrapped in orange and red lobes of fire. Frame 3: large round billowing orange fireball, white hot inner lobes, dark red outer edges, forceful eruption, a few outward pixel sparks. Frame 4: flame breaks into several puffs, dark brown and charcoal smoke develops around the orange center. Frame 5: mostly gray-brown smoke puffs with a few glowing orange embers, rising slightly from the common center. Frame 6: sparse separated small smoke puffs and dim embers dissipating, much less opaque area. Clear sequence of ignition -> FIREBALL -> SMOKE -> dissipation. Shape must feel like a volumetric fiery detonation, not a star-shaped hit marker. Sharp square pixel edges and clean clusters, limited warm palette, detailed but readable at 128x128 pixels per frame. No gradients or soft blur. Keep the FULL effect in each cell, without touching neighboring cells.

## v0.15：うねった毛先・笑顔・スカーフの修正

内蔵ImageGenでユーザー提供の元画像（Mr.jpg、全身参考）と既存スプライトを参照し、通常4コマ・連続4コマを編集。

- richter-poses-v6.png：768×224、192×224の通常4コマ。閉じた厚い唇の通常表情、毛先をS字状に修正。
- richter-standing-v6.png：通常1コマ目の192×224切り出し。カードと立ち絵に使用。
- richter-burst-v5.png：960×224、240×224の連続4コマ。全コマ開口した笑顔、毛先を通常と統一。4コマ目は背面のピンク布を除き、前の襟元だけにスカーフを配置。
- 身体高約185px・足元212px。透明背景、最近傍縮小・128色PNG。sharpは切り出し、整列、縮小、パレット化、プレビュー合成のみに使用。元の生成画像を保存し、旧素材も履歴として維持。

生成プロンプト：
Built-in ImageGen was used. Transparent background, local image references. Nearest-neighbor resize and sprite packing only with sharp.

BURST SPRITE
Edit the first reference, an existing FOUR-FRAME pixel-art sprite sheet for a browser game. Output ONE transparent PNG sheet, exactly four full-body frames side by side, same baseline, scale, chibi proportions (about three heads tall), same brown long coat, white 5 badges, sunglasses, little pink creature bombs, same alternating left/right throwing poses as reference 1. Preserve crisp medium-fine pixel clusters and the existing sprite look. No labels, no scenery, no ground or shadows.
Make these specific corrections in ALL four frames:
1. Mouth is OPEN in an excited, high-energy laughing smile, with clearly readable thick pinkish upper and lower lips, white upper teeth, dark mouth interior and small tongue. Delighted manic bomb throwing, not angry or pursed closed lips. Keep red-lens silver sunglasses and tan skin. No cheek bandage.
2. Hair remains black and big, but its silhouette has distinct irregular WAVY S-shaped, curling, undulating tips like the original character in references 2 and 3. Replace rigid straight triangular hedgehog spikes with wiggly locks, especially top and rear tips. Keep comparable overall hair height and volume, not a round afro.
3. Fourth (rightmost) frame: fix the pink neck scarf. It is a small FRONT cravat tucked into the FRONT chest of the brown coat. Absolutely NO pink cloth on back, shoulder blade, rear neck or outside behind the shoulder. Visible back/shoulder is uninterrupted BROWN coat with brown high collar. Pink trails from thrown creatures can remain distant from the neck, but no pink triangular panel behind head or on back. Keep fourth frame a right-hand release facing screen right, with a coherent twisting torso.
Keep the creatures matching first sheet: small ears, widely separated small white circular eyes, yellow wavy lips, round dark belly emblem, pink body, drooping fingerlike hands, curling ghost tail. Every frame fully visible with a transparent gap to its neighbors. The second and third references are ONLY to understand original wavy black hair and lips; keep the game pixel art and character design from the first.

NORMAL SPRITE
Edit reference 1, the existing four-frame NORMAL standing and single-throw pixel sprite sheet. Output four whole-body poses in one horizontal strip on genuine transparent background, no floor or text. Preserve the first reference's exact poses, expressions, clothing, creature design, baseline, medium-fine pixel-art style, three-head chibi proportions and body sizes. Frame 1 is idle, 2 wind-up, 3 throw, 4 follow-through.
ONLY revise the black hair silhouette to match the wavy S-curved irregular curled hair tips in reference 2 (the newly approved burst sprite) and the original character in reference 3. The tips should be noticeably wavy, not stiff straight triangular spikes. Same approximate size and volume as the first reference, with a high forehead. Keep the red silver-rim sunglasses. Keep the NORMAL expression neutral/serious with CLOSED mouth and distinct thick pinkish lips (the open laughing smile is only for the burst animation in reference 2). No cheek bandage. The pink cravat stays ONLY tucked into FRONT collar/chest, never on the back or rear shoulder. Coat is brown with white numeral 5 patches. Little pink ghost creature keeps SMALL ears, WIDELY SPACED small round white eyes, yellow double-wavy mouth, belly ring, short drooping finger hands, curled ghost tail.
Clean coherent pixel clusters, no smooth vector lines. Each pose in its own equal-width area, full hair, feet and hands visible; clear transparent gaps between poses.


## v0.16：厚い唇と反対腕の4コマ目

- 内蔵ImageGenで連続投擲の開口した笑顔に、厚い赤紫色の上下の唇を追加。元画像Mr.jpgを参照。
- 3・4コマ目の投げる手を区別するため、4コマ目は胸の前を横切る反対腕の投擲へ修正。1〜3コマ目は唇修正の生成画像から、4コマ目だけ追加修正の生成画像から切り出し。
- `richter-burst-v6.png`：960×224、240×224の4コマ。身体高184〜185px、足元212px。透過PNG・160色。画像編集はImageGenを使用。sharpは切り出し・最近傍縮小・整列・PNG圧縮・プレビュー合成のみに使用。
- 通常立ち絵／通常投球はv6を維持。連続攻撃の終了判定と爆発演出も維持。

生成プロンプト：
Built-in ImageGen was used. Edit targets and supporting reference images were inspected locally. Transparent PNG; nearest-neighbor resize, pixel palette, frame packing only with sharp.

Final asset: richter-burst-v6.png (960 x 224, four 240 x 224 frames).
Body height about 185 pixels, foot baseline 212. First three frames use the lips revision; only frame four is replaced by the opposite-arm revision.

LIPS REVISION
Use case: precise-object-edit. Edit target: image 1, the approved FOUR-frame pixel-art rapid throwing sprite sheet. Image 2 is reference for the original character's very thick full upper AND lower lips (Japanese tarako-kuchibiru).
Change ONLY the mouth of the human character in ALL FOUR frames. Preserve the cheerful high-energy WIDE OPEN LAUGHING SMILE, white upper teeth, dark open mouth interior, tiny tongue. Add unmistakably thick fleshy mauve/rose-pink upper lip and lower lip bordering the open mouth. Both lips need visible colored thickness, NOT thin black lines, NOT only teeth, NOT just a tongue, NOT a beard or moustache. The lips must read clearly at the final 185px-tall sprite scale: strong clean pinkish pixel clusters, distinct from tan cheeks and from white teeth. An expressive joyful full-lipped smile matching the identity of reference 2.
Preserve EVERY other approved element of image 1: four alternating throwing poses in one horizontal row, wavy black hair tips, sunglasses, tan skin, brown coat, front-only pink cravat, white 5 patches, creature bombs, sharp pink trails, body proportions, identical sprite scale and feet baseline, pixel-art style. No bandage. No scarf on back. Genuine transparent background, full bodies unclipped, transparent gap between all frames, no ground, no text, no panel borders. Do not redesign the character or make his head bigger.

OPPOSITE-ARM FOURTH FRAME REVISION
Use case: precise-object-edit. Edit this FOUR-frame sprite sheet. It must read LEFT-ARM THROW, RIGHT-ARM THROW, LEFT-ARM THROW, RIGHT-ARM THROW, facing screen RIGHT. The current 3rd and 4th frames wrongly look like the SAME arm is throwing. Correct the FOURTH (rightmost) frame only to clearly throw with the OPPOSITE arm from frame 3.
Frame 3 is a LEFT-arm throw with his right hand holding a pink creature up behind him at screen-left. Keep frame 3 unchanged.
Frame 4 MUST have the RIGHT arm swinging from the screen-LEFT shoulder diagonally ACROSS THE FRONT OF HIS CHEST to a fully extended hand at upper screen-right, clearly tracing one continuous brown sleeve from the screen-left shoulder across his torso to that hand. His opposite LEFT hand holds the NEXT pink creature down BESIDE HIS SCREEN-RIGHT HIP, below the extended throwing arm. MOVE the held creature from the old screen-left hip to the SCREEN-RIGHT HIP so the swap of hands is unmistakable. Torso counter-rotates with the right shoulder driven forward, follow-through energy. Exactly two arms, anatomically coherent. No pink cloth on back: pink cravat only on front chest. Sharp magenta throw streak behind the extended RIGHT arm, contained within frame.
Keep the FOUR open-mouth exuberant smiling faces with THICK MAUVE-PINK UPPER AND LOWER LIPS visible around white teeth and dark mouth. Keep wavy black hair, sunglasses, proportions, brown coat, 5 badges, creature design, palette and crisp pixel art. Preserve first THREE poses. Match baseline and body height of the sheet. Four full-body frames in one horizontal strip with clear transparent gaps, no borders/text, genuine transparent background. Do NOT leave fourth pose as a copy of the third.



## v0.17：ユーザーの塗り直しを反映

- ユーザー提供の修正画像を基準に、2・4コマ目の茶色い上半身を背面の襟・肩・コートとしてドット絵に整えました。塗りつぶされた位置に前面のスカーフ・襟合わせ・胸の記章を戻していません。
- `richter-burst-v7.png`：960×224、240×224の4コマ。身体高185px、足元212px、透過PNG・160色。通常立ち絵・投球はv6のまま。
- 笑顔・厚い上下の唇・毛先のうねり・4コマの姿勢を維持。sharpは画像の切り出し・最近傍縮小・整列・パレット圧縮・プレビュー合成のみに使用。

生成プロンプト：
Built-in ImageGen; user paint-over used as the sole reference.
Reference: C:/Users/user/Downloads/ChatGPT 画像 2026年10月4日 02_34_42.png
Generated master: exec-6cc3e1ae-41f5-4462-9913-b25eec48b624.png
Final: richter-burst-v7.png, transparent 960x224, four 240x224 frames. Body height 185 px, feet baseline 212. Sharp used only for cropping, nearest-neighbor resizing, packing, 160-color palette and preview composition.

Use case: precise-object-edit. Edit the attached USER-PAINTED FOUR-FRAME sprite sheet. This paint-over is the authoritative corrected design. Produce a clean, consistent pixel-art game sprite sheet on a genuinely transparent background.
Only refine the user's brown overpaint in the SECOND and FOURTH frames into finished pixel-art coat fabric: stepped pixel outlines, restrained matching brown shadow clusters, natural shoulder/back folds and collar seam. In these two frames the upper torso shows the BACK / outside of the coat as he twists to throw while his face turns over his shoulder. KEEP THE PAINTED-OVER AREAS BROWN. Absolutely do NOT restore a pink necktie/cravat triangle, front-chest opening, front lapel V, or chest numeral patch in those brown upper-back areas. The FOURTH frame's rounded brown back collar is intentional; finish it with crisp brown pixel shading. The SECOND frame's continuous brown shoulder and upper back is intentional. Lower coat white 5 patches remain.
Preserve the user's poses, arm origins and silhouettes, exact four-frame left/right alternating rhythm, black wavy hair, sunglasses, excited OPEN SMILE with conspicuous thick pinkish upper AND lower lips and visible teeth, creature bombs and pink throw trails. Do not change hands, rotate figures, add limbs or rearrange creatures. Frames ONE and THREE still show the front with their pink cravat and front coat details; leave those intact. Keep same three-head chibi proportions and consistent full-body size/baseline across all four frames. Crisp detailed pixel art suitable for 240x224 pixels per frame after nearest-neighbor reduction, no smooth painting or vector curves in the corrected areas. Exactly four complete full-body frames in one horizontal row, ample transparent separation, no labels, no panel lines, no ground, no background pixels. Do not reinterpret or undo the user's paint-over.


## v0.17.1：全モーションの画風と肌色の統一

通常4コマと連続投擲4コマを同じ原画で描き直し、共通160色パレット・身体高185px・足元212pxへ整理。肌・コート・輪郭・陰影の描き方を統一し、通常の閉口表情と連続攻撃の厚い唇を持つ笑顔を維持しました。ユーザー修正済みの背面の襟・肩を引き継いでいます。カードの立ち絵は通常シートの先頭コマと同一です。

Built-in ImageGen was used (not the CLI).
Inputs: normal master exec-2d68c313-d6da-4c24-a29a-af7d2c920e0e.png and approved burst paint-over master exec-6cc3e1ae-41f5-4462-9913-b25eec48b624.png.
Generated master: exec-bf6998aa-b5dd-456d-b936-7c2432b6c682.png.
Assets: richter-standing-v7.png (192x224), richter-poses-v7.png (768x224, four192x224 frames), richter-burst-v8.png (960x224, four240x224 frames).
All eight poses were generated together. Cutouts are mechanically separated along transparent gaps, nearest-neighbor resized to185px crown-to-feet, foot baseline212, then quantized together to a shared160-color palette. No poses, faces or clothing were painted by script. Standing portrait is the identical first normal frame.

FINAL PROMPT
Use case: style-transfer / identity-preserve.
Edit targets: image 1 is the four NORMAL game poses (idle, wind-up, throw, follow-through); image 2 is the four approved RAPID-THROW poses. The user says these two sheets have mismatched art style and skin color. Harmonize them into ONE coherent PIXEL ART sprite sheet, exactly EIGHT full-body poses in a FOUR-COLUMN by TWO-ROW grid. TOP ROW = the exact four poses from image 1 in order. BOTTOM ROW = the exact four poses from image 2 in order. Actual transparent background with generous transparent gutters between all eight characters, no labels or grid lines. Do not omit, duplicate, or invent a pose.
Create one consistent fine pixel-art treatment for ALL eight: identical warm medium peach-tan skin base, same limited 3-tone skin palette, identical palette on face AND hands, same light direction, same brown coat palette, same outline thickness, same restrained stepped pixel shading and pixel-cluster size. No gradient skin, no smooth painterly shading, no blurry antialiasing. Do not make the rapid poses paler or brighter. Make these clearly the SAME CHARACTER by the same sprite artist in one production pass. Final game body height is about185px so preserve detailed, readable pixels, not coarse blocky low-res tiles.
Keep chibi proportions about three heads tall and IDENTICAL head size, torso/leg proportions, standing body height and foot baseline in every pose. Wavy black hair with curling S-shaped tips, high forehead, red silver-rim sunglasses, thick fleshy mauve-pink upper AND lower lips. Top row retains serious/neutral CLOSED mouth; bottom row retains exuberant OPEN high-energy smile with THICK lips around white teeth and dark mouth. No bandage.
Preserve exact approved anatomy, sleeve paths, hand locations, creatures, throw streaks and coat shapes from each image. The second and fourth BOTTOM poses intentionally show continuous BROWN back/outer shoulder as the face turns toward the viewer: NO pink scarf, front V opening, front lapels or chest badge in these brown upper-back areas. Bottom frame4's rounded BROWN rear collar is intentional. Bottom frames1/3 keep front pink cravat and chest badge. Keep the same 4 alternating throwing poses.
Pink ghost bombs retain small ears, wide-set small white eyes, yellow wavy lips, belly ring, drooping finger hands and ghost tail exactly as supplied. Brown coat with white 5 patches, boots, pink front cravat only when front is visible. No new costume parts. All figures and motion trails fully within their cells, nothing clipped. Uniform crisp sprite style across both rows is the primary objective.



## v0.22.0: チーム世紀末覇者のモヒカン3種

Built-in ImageGen was used, not the CLI. All three calls used transparent_background=true.
Each generated master was mechanically trimmed (threshold 12) and fitted to a transparent 192x224 canvas with nearest-neighbor resizing using sharp. No drawing, recoloring or style edits were done by script.

RED
Game asset: D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-red-v1.png
Preview: C:/Users/user/Documents/Codex/2026-10-03/new-chat/outputs/enemy-mohican-red-v1.png
Generated master: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-dad83423-d7d3-42cf-96bd-70845e25e5cd.png
Final prompt:
Use case: stylized-concept. Asset type: transparent PNG enemy sprite for a Japanese browser idle game. Draw exactly ONE anonymous ordinary punk thug of Team Apocalyptic Warlord, NOT a boss. He has a clearly shaved-sided mohawk, exaggerated cocky expression, shoulder pads, street gang scrap clothing. Polished Japanese 16-bit RPG pixel art, 3-head-tall chibi proportions, chunky readable individual square pixels, restrained 3-4-tone shading per material, dark clean pixel outlines. Match a party with a red bob-haired chibi sailor-uniform girl and a spiky-haired sunglasses man in brown coat. Full body, facing LEFT toward player party, three-quarter view, feet on a single baseline. Small readable game sprite designed to be displayed around 150px tall. Entire subject visible, ample transparent margin around hair, weapon and feet. No text, labels, logo, scenery, floor shadow, border, gradient backdrop or extra characters. True transparent background.
Red mohawk, dark sleeveless vest, one battered spiked shoulder pad, grey iron pipe held diagonally, broad stocky body.

BLUE
Game asset: D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-blue-v1.png
Preview: C:/Users/user/Documents/Codex/2026-10-03/new-chat/outputs/enemy-mohican-blue-v1.png
Generated master: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-c6db5fb5-e7b9-47ad-b83f-b20edd831394.png
Final prompt:
Use case: stylized-concept. Asset type: transparent PNG enemy sprite for a Japanese browser idle game. Draw exactly ONE anonymous ordinary punk thug of Team Apocalyptic Warlord, NOT a boss. He has a clearly shaved-sided mohawk, exaggerated cocky expression, shoulder pads, street gang scrap clothing. Polished Japanese 16-bit RPG pixel art, 3-head-tall chibi proportions, chunky readable individual square pixels, restrained 3-4-tone shading per material, dark clean pixel outlines. Match a party with a red bob-haired chibi sailor-uniform girl and a spiky-haired sunglasses man in brown coat. Full body, facing LEFT toward player party, three-quarter view, feet on a single baseline. Small readable game sprite designed to be displayed around 150px tall. Entire subject visible, ample transparent margin around hair, weapon and feet. No text, labels, logo, scenery, floor shadow, border, gradient backdrop or extra characters. True transparent background.
Blue mohawk, worn sleeveless denim jacket and knee pads, small improvised crossbow held low, lean lanky body.

GREEN
Game asset: D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-green-v1.png
Preview: C:/Users/user/Documents/Codex/2026-10-03/new-chat/outputs/enemy-mohican-green-v1.png
Generated master: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-a155afff-9883-4e0f-af79-f6639cc8da1a.png
Final prompt:
Use case: stylized-concept. Asset type: transparent PNG enemy sprite for a Japanese browser idle game. Draw exactly ONE anonymous ordinary punk thug of Team Apocalyptic Warlord, NOT a boss. He has a clearly shaved-sided mohawk, exaggerated cocky expression, shoulder pads, street gang scrap clothing. Polished Japanese 16-bit RPG pixel art, 3-head-tall chibi proportions, chunky readable individual square pixels, restrained 3-4-tone shading per material, dark clean pixel outlines. Match a party with a red bob-haired chibi sailor-uniform girl and a spiky-haired sunglasses man in brown coat. Full body, facing LEFT toward player party, three-quarter view, feet on a single baseline. Small readable game sprite designed to be displayed around 150px tall. Entire subject visible, ample transparent margin around hair, weapon and feet. No text, labels, logo, scenery, floor shadow, border, gradient backdrop or extra characters. True transparent background.
Green mohawk, dark red cropped biker jacket, fingerless gloves, both fists raised in a scrappy boxer stance, compact muscular body.


## v0.23.0：モヒカン待機4コマ

YggClicker v0.23.0 — モヒカン待機アニメーション

内蔵 ImageGen を使用（CLIは不使用）。transparent_background=true。
既存の各モヒカン1枚絵を参照し、4コマを生成。
生成画像を4等分し、各コマを同一倍率の最近傍補間で192×224へ配置。
1コマごとの輪郭に合わせた拡縮はせず、呼吸の高さの差と足元を保持。
完成PNGは各768×224。画像の描き足しや塗り直しはスクリプトで行っていません。

[red]
参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-red-v1.png
生成原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-4696353a-5941-4d05-939d-08993394d640.png
ゲーム内保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-red-idle-v1.png
プレビュー: C:/Users/user/Documents/Codex/2026-10-03/new-chat/outputs/enemy-mohican-red-idle-v1.png

[blue]
参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-blue-v1.png
生成原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-65390358-4d35-4013-9615-d0a8c1843972.png
ゲーム内保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-blue-idle-v1.png
プレビュー: C:/Users/user/Documents/Codex/2026-10-03/new-chat/outputs/enemy-mohican-blue-idle-v1.png

[green]
参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-green-v1.png
生成原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-36b91758-5617-4cab-b699-445addce4fd5.png
ゲーム内保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
プレビュー: C:/Users/user/Documents/Codex/2026-10-03/new-chat/outputs/enemy-mohican-green-idle-v1.png

3種類共通の最終プロンプト（各回に対応する1枚だけを参照）:
Use case: identity-preserve. Asset type: pixel-art idle animation sprite sheet for a Japanese RPG browser game.
Edit target/reference: the attached approved single enemy sprite. Create exactly FOUR animation frames of THIS SAME enemy in one horizontal row, no other characters. This is an idle combat-ready loop facing screen LEFT. Frame 1 neutral ready stance; frame 2 slightly lower knees and shoulders, arms/weapon pulled in by a few pixels; frame 3 straighten slightly, chest breathing up and weapon/forearms relaxed outward; frame 4 settle halfway back to frame 1. The movements should be modest but visibly different, a lively cocky thug waiting to fight, NOT walking or attacking. Feet planted, same body proportions and same head size in all frames.
Preserve the original mohawk color, shaved sides, grinning face, clothing, shoulder pads, equipment, skin tone, outline and detailed crisp square-pixel shading. Same sprite artist and palette, no smooth rendering, no new accessories, no glow, no trails, no text. Full body with weapon unclipped. Four equal-size cells with large transparent separation; identical scale and foot baseline. Genuine alpha transparent background, no painted checkerboard, no floor shadows, no labels, no panel borders. Wide sheet. Designed for final 192x224-pixel frames; clear matching pixel detail.

YggClicker v0.24.0 — 敵6種の待機・やられアニメーション

内蔵ImageGenを使用（CLIは不使用）、全呼出し transparent_background=true。
原画は保持。ゲーム用は透過PNGをimg/に保存。
機械処理はコマの切り出し・最近傍での統一縮小・共通足元への配置・PNG圧縮のみ。画像の描き足しや塗り直しは行っていません。
待機: 768×224（192×224を4枚）、やられ:1024×224（256×224を4枚）。
元の生成画像の透明な隙間を境界にして切り出し、隣のコマの手足が混ざらないよう調整。
既存3種は待機の体高182/206/193pxに対応、新3種は185/190/200px。各個体のアニメーション内では同じ倍率を使用。

[mohican-red / defeat]
参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-red-idle-v1.png
原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-6183a3b0-bd8e-426a-b226-24d89d6bedc3.png
保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-red-defeat-v1.png
最終プロンプト:
Use case: identity-preserve. Asset type: four-frame defeat sprite sheet for a Japanese pixel-art RPG.
The attached image is the approved four-frame IDLE sheet of ONE ordinary enemy. Keep exactly that character, clothing, weapon, face proportions, skin and palette. Draw a NEW FOUR-FRAME DEFEAT animation in one horizontal row, four equally sized cells, left-to-right order:
1. Freshly hit from screen LEFT: shocked open mouth, eyes squeezed shut, chest recoils, knees buckle, arms loosen their weapon. Body still upright and same size as the reference.
2. Knocked backward toward screen RIGHT: torso leaning back hard, feet lifting, arms thrown outward, startled goofy hurt expression.
3. Falling onto his side/back: body almost horizontal, knees bent, weapon dropping beside him.
4. Fully defeated on his side/back, slumped and motionless, eyes shut or tiny cartoon X eyes, weapon resting beside him. Clearly NOT smiling, NOT standing.
Crisp detailed square-pixel sprite art matching the reference, three-head-tall proportions, clean dark outlines, limited stepped shading, same character scale across frames. Full head, arms, legs and equipment inside EACH cell with generous margin; allow width for the horizontal fallen pose. Equal cell dimensions and shared imagined floor baseline. No blood, no gore, no impact text, no stars, no damage numbers, no trails, no panel lines or labels. Actual alpha transparent background, no ground shadow. Exactly four frames, no idle row, no extra character variants.

[mohican-blue / defeat]
参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-blue-idle-v1.png
原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-3c6d3f42-8d22-4ba8-9514-cb824a049cb6.png
保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-blue-defeat-v1.png
最終プロンプト:
Use case: identity-preserve. Asset type: four-frame defeat sprite sheet for a Japanese pixel-art RPG.
The attached image is the approved four-frame IDLE sheet of ONE ordinary enemy. Keep exactly that character, clothing, weapon, face proportions, skin and palette. Draw a NEW FOUR-FRAME DEFEAT animation in one horizontal row, four equally sized cells, left-to-right order:
1. Freshly hit from screen LEFT: shocked open mouth, eyes squeezed shut, chest recoils, knees buckle, arms loosen their weapon. Body still upright and same size as the reference.
2. Knocked backward toward screen RIGHT: torso leaning back hard, feet lifting, arms thrown outward, startled goofy hurt expression.
3. Falling onto his side/back: body almost horizontal, knees bent, weapon dropping beside him.
4. Fully defeated on his side/back, slumped and motionless, eyes shut or tiny cartoon X eyes, weapon resting beside him. Clearly NOT smiling, NOT standing.
Crisp detailed square-pixel sprite art matching the reference, three-head-tall proportions, clean dark outlines, limited stepped shading, same character scale across frames. Full head, arms, legs and equipment inside EACH cell with generous margin; allow width for the horizontal fallen pose. Equal cell dimensions and shared imagined floor baseline. No blood, no gore, no impact text, no stars, no damage numbers, no trails, no panel lines or labels. Actual alpha transparent background, no ground shadow. Exactly four frames, no idle row, no extra character variants.

[mohican-green / defeat]
参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-439c83cb-85fa-4d65-b50b-4adb1a99d904.png
保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-defeat-v1.png
最終プロンプト:
Use case: identity-preserve. Asset type: four-frame defeat sprite sheet for a Japanese pixel-art RPG.
The attached image is the approved four-frame IDLE sheet of ONE ordinary enemy. Keep exactly that character, clothing, weapon, face proportions, skin and palette. Draw a NEW FOUR-FRAME DEFEAT animation in one horizontal row, four equally sized cells, left-to-right order:
1. Freshly hit from screen LEFT: shocked open mouth, eyes squeezed shut, chest recoils, knees buckle, arms loosen their weapon. Body still upright and same size as the reference.
2. Knocked backward toward screen RIGHT: torso leaning back hard, feet lifting, arms thrown outward, startled goofy hurt expression.
3. Falling onto his side/back: body almost horizontal, knees bent, weapon dropping beside him.
4. Fully defeated on his side/back, slumped and motionless, eyes shut or tiny cartoon X eyes, weapon resting beside him. Clearly NOT smiling, NOT standing.
Crisp detailed square-pixel sprite art matching the reference, three-head-tall proportions, clean dark outlines, limited stepped shading, same character scale across frames. Full head, arms, legs and equipment inside EACH cell with generous margin; allow width for the horizontal fallen pose. Equal cell dimensions and shared imagined floor baseline. No blood, no gore, no impact text, no stars, no damage numbers, no trails, no panel lines or labels. Actual alpha transparent background, no ground shadow. Exactly four frames, no idle row, no extra character variants.

[bald-hammer / idle + defeat]
画風参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
初回原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-fa2cd1a9-7d86-4579-a187-634c16b94e42.png
最終原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-9aec665a-8969-40ed-9944-aaea8134ea7f.png
保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-bald-hammer-idle-v1.png / enemy-bald-hammer-defeat-v1.png / enemy-bald-hammer-v1.png
生成プロンプト:
Use case: stylized-concept. Asset type: eight-frame enemy animation sheet for a Japanese pixel-art RPG. Supporting style reference: attached image is an existing enemy's four-frame idle sheet. Create ONE NEW ordinary street-gang punk enemy in the SAME detailed pixel-art style, same three-head-tall chibi proportions, clean square pixels, dark pixel outline and stepped shading. Facing LEFT toward the player party. Not a boss.
Exactly EIGHT full-body poses in a 4-COLUMN x 2-ROW grid. Four equal cells per row with generous alpha-transparent gaps, same scale in every pose, no text, no grid lines, no numbers.
TOP ROW: four-frame combat-ready IDLE loop: 1 neutral menacing ready stance; 2 bend knees and lower chest slightly; 3 breathe up and lift forearms/weapon slightly; 4 settle halfway back to frame 1. Feet planted.
BOTTOM ROW: four-frame DEFEAT: 1 hit from LEFT, shocked open mouth, eyes shut, knees buckle; 2 knocked back toward RIGHT with feet lifting and arms thrown outward; 3 falling onto side/back with body almost horizontal; 4 fully slumped motionless on side/back with eyes shut or tiny cartoon X eyes, equipment beside him. No smiling in defeat. No blood or gore.
Full bodies and equipment unclipped in every cell, including the horizontal fallen pose. Transparent background, no floor shadow, no scenery, no motion effects. Same costume, face, skin and scale across all eight frames. Pixel detail suitable for about 190px character height after resizing.
NEW DESIGN: stocky muscular completely BALD skinhead with shiny bare scalp (absolutely no mohawk and no hair), thick dark moustache and short chin beard, dark sleeveless brown biker vest, one steel shoulder pad, olive cargo pants, heavy boots, short-handled heavy sledgehammer held in both hands. Warm tan skin. Scrappy ordinary thug, not oversized compared with the reference.

上の初回原画を編集対象にした最終透過調整プロンプト:
Use case: background-extraction. Edit target is the supplied EIGHT-frame pixel-art sprite sheet (4 columns x 2 rows). Remove the entire dark brown/black glowing background around and BETWEEN all characters, leaving genuine transparent alpha pixels. Preserve all EIGHT characters, their positions, poses, pixel outlines, skin, clothing, weapons, colors and scale exactly. Do not redraw, resize, crop or move any pose. No backdrop at all, no glow, no floor shadows, no checkerboard painted into the image. Final must be a transparent PNG with only character/equipment pixels; keep sharp pixel edges. Remove background visible through gaps between arms, legs, weapon and body too.

[bald-knuckles / idle + defeat]
画風参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
初回原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-cf776e64-07ae-44a3-bf35-4f1a31992cb4.png
最終原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-59824ceb-3235-4435-9cba-121a0518a086.png
保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-bald-knuckles-idle-v1.png / enemy-bald-knuckles-defeat-v1.png / enemy-bald-knuckles-v1.png
生成プロンプト:
Use case: stylized-concept. Asset type: eight-frame enemy animation sheet for a Japanese pixel-art RPG. Supporting style reference: attached image is an existing enemy's four-frame idle sheet. Create ONE NEW ordinary street-gang punk enemy in the SAME detailed pixel-art style, same three-head-tall chibi proportions, clean square pixels, dark pixel outline and stepped shading. Facing LEFT toward the player party. Not a boss.
Exactly EIGHT full-body poses in a 4-COLUMN x 2-ROW grid. Four equal cells per row with generous alpha-transparent gaps, same scale in every pose, no text, no grid lines, no numbers.
TOP ROW: four-frame combat-ready IDLE loop: 1 neutral menacing ready stance; 2 bend knees and lower chest slightly; 3 breathe up and lift forearms/weapon slightly; 4 settle halfway back to frame 1. Feet planted.
BOTTOM ROW: four-frame DEFEAT: 1 hit from LEFT, shocked open mouth, eyes shut, knees buckle; 2 knocked back toward RIGHT with feet lifting and arms thrown outward; 3 falling onto side/back with body almost horizontal; 4 fully slumped motionless on side/back with eyes shut or tiny cartoon X eyes, equipment beside him. No smiling in defeat. No blood or gore.
Full bodies and equipment unclipped in every cell, including the horizontal fallen pose. Transparent background, no floor shadow, no scenery, no motion effects. Same costume, face, skin and scale across all eight frames. Pixel detail suitable for about 190px character height after resizing.
NEW DESIGN: lean wiry completely BALD skinhead with bare scalp (absolutely no mohawk or hair), small black eyepatch over one eye, no beard, sleeveless purple biker vest, fingerless gloves and brass knuckles, ragged grey pants, black boots, metal knee pad. Arms raised like a boxer. Medium brown skin, cocky toothy face. Ordinary gang mook.

上の初回原画を編集対象にした最終透過調整プロンプト:
Use case: background-extraction. Edit target is the supplied EIGHT-frame pixel-art sprite sheet (4 columns x 2 rows). Remove the entire dark brown/black glowing background around and BETWEEN all characters, leaving genuine transparent alpha pixels. Preserve all EIGHT characters, their positions, poses, pixel outlines, skin, clothing, weapons, colors and scale exactly. Do not redraw, resize, crop or move any pose. No backdrop at all, no glow, no floor shadows, no checkerboard painted into the image. Final must be a transparent PNG with only character/equipment pixels; keep sharp pixel edges. Remove background visible through gaps between arms, legs, weapon and body too.

[mohican-yellow / idle + defeat]
画風参照: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
初回原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-b013f868-3d82-49b8-bfdf-6095cefd2ade.png
最終原画: C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-83fabea4-1a04-4f27-8e02-c73e8e51b83a.png
保存先: D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-yellow-idle-v1.png / enemy-mohican-yellow-defeat-v1.png / enemy-mohican-yellow-v1.png
生成プロンプト:
Use case: stylized-concept. Asset type: eight-frame enemy animation sheet for a Japanese pixel-art RPG. Supporting style reference: attached image is an existing enemy's four-frame idle sheet. Create ONE NEW ordinary street-gang punk enemy in the SAME detailed pixel-art style, same three-head-tall chibi proportions, clean square pixels, dark pixel outline and stepped shading. Facing LEFT toward the player party. Not a boss.
Exactly EIGHT full-body poses in a 4-COLUMN x 2-ROW grid. Four equal cells per row with generous alpha-transparent gaps, same scale in every pose, no text, no grid lines, no numbers.
TOP ROW: four-frame combat-ready IDLE loop: 1 neutral menacing ready stance; 2 bend knees and lower chest slightly; 3 breathe up and lift forearms/weapon slightly; 4 settle halfway back to frame 1. Feet planted.
BOTTOM ROW: four-frame DEFEAT: 1 hit from LEFT, shocked open mouth, eyes shut, knees buckle; 2 knocked back toward RIGHT with feet lifting and arms thrown outward; 3 falling onto side/back with body almost horizontal; 4 fully slumped motionless on side/back with eyes shut or tiny cartoon X eyes, equipment beside him. No smiling in defeat. No blood or gore.
Full bodies and equipment unclipped in every cell, including the horizontal fallen pose. Transparent background, no floor shadow, no scenery, no motion effects. Same costume, face, skin and scale across all eight frames. Pixel detail suitable for about 190px character height after resizing.
NEW DESIGN: bright YELLOW tall narrow mohawk with shaved sides, pale peach skin, cocky face, dark teal sleeveless biker jacket, spiked shoulder pad, black trousers with red belt, boots. A short iron chain held between gloved hands, kept within his cell. Ordinary gang mook with the same chibi body scale as reference.

上の初回原画を編集対象にした最終透過調整プロンプト:
Use case: background-extraction. Edit target is the supplied EIGHT-frame pixel-art sprite sheet (4 columns x 2 rows). Remove the entire dark brown/black glowing background around and BETWEEN all characters, leaving genuine transparent alpha pixels. Preserve all EIGHT characters, their positions, poses, pixel outlines, skin, clothing, weapons, colors and scale exactly. Do not redraw, resize, crop or move any pose. No backdrop at all, no glow, no floor shadows, no checkerboard painted into the image. Final must be a transparent PNG with only character/equipment pixels; keep sharp pixel edges. Remove background visible through gaps between arms, legs, weapon and body too.





## v0.25.0：ウトガルド背景・追加モヒカン4種類

YggClicker v0.25.0 — ウトガルド工業地帯・追加モヒカン4種類

生成方法：内蔵ImageGen（CLIは不使用）。スプライトは透明背景、背景画は不透明。
生成原画は保存したまま、コマの切り出し・全コマ共通倍率の最近傍リサイズ・PNG圧縮を行ってゲームへ配置。
待機4コマ：768×224（1コマ192×224）。やられ4コマ：1024×224（1コマ256×224）。
初期立ち姿の体高：女性3種190px、男性185px。共通の足元を210pxに配置。
ピンク髪のやられ原画は2コマ目と3コマ目の間の透明な隙間で切り分け、隣の髪が混ざらないよう調整。
背景は1152×768へ最近傍縮小し、PNG 256色・ディザなしで保存。外部PNG参照、HTML埋め込みなし。
因子の結晶は単純な多角形とグラデーションをCSSで描画。最大24個の固定プール、CSS移動・透明度で落下。

[モヒカン女（警棒）]
画風参照：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
生成原画：C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-91059682-3ad8-49f1-bc81-73136a994f4c.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-female-magenta-idle-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-female-magenta-defeat-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-female-magenta-v1.png
最終プロンプト：
Use case: stylized-concept.
Asset type: EIGHT-frame transparent pixel-art enemy sprite sheet, FOUR columns and TWO rows, for Japanese browser idle RPG.
Input image: style and pixel detail reference ONLY (an existing male green-mohawk thug). Create the new enemy described below; do not copy his face, hair, or colors.
Match the same polished square-pixel JRPG sprite style, 3-head-tall chibi body, dark pixel outlines, stepped limited-palette shadows, no smooth paint or anti-aliased glow. Facing screen LEFT, toward player party.
Top row: FOUR combat idle frames, standing feet planted on the SAME baseline. Neutral ready stance, small knee bend, small breathing rise, settle. Only a FEW pixels of movement, no dramatic squat. Facial expression is cocky and menacing.
Bottom row: FOUR defeat frames for this SAME enemy: 1 recoil on being hit from LEFT, knees buckle, mouth opens in hurt surprise; 2 knocked backward towards RIGHT, leaning back, feet lifting; 3 falling on side/back almost horizontal; 4 fully slumped on side/back, eyes closed or tiny cartoon X eyes, weapon beside body. No smiling when defeated, no gore.
EXACT same character, clothing, head and body scale and palette across all eight frames. All full bodies and equipment entirely INSIDE their OWN equal cells; give every cell at least 30 pixels of genuinely empty transparent margin so hands, hair or fallen feet NEVER cross a cell edge. Equal 4x2 grid, ample transparent space BETWEEN ROWS, no overlapping poses. Same implied floor across a row. True alpha transparent PNG, no colored backdrop, no glow, no ground shadows, no labels or grid lines, no numbers or text. Final sprites will be about 190px tall.

NEW DESIGN: Adult WOMAN punk with a clearly feminine angular face, MAGENTA upright mohawk and shaved sides, silver hoop earring, dark purple sleeveless biker vest over a plain black shirt, fitted dark cargo trousers, chunky boots, short metal baton. Lean athletic ordinary street thug, nonsexual outfit, no exaggerated chest.

[モヒカン女（レンチ）]
画風参照：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
生成原画：C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-fa75c792-effd-40fd-aa75-eca76b21f9e9.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-female-white-idle-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-female-white-defeat-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-female-white-v1.png
最終プロンプト：
Use case: stylized-concept.
Asset type: EIGHT-frame transparent pixel-art enemy sprite sheet, FOUR columns and TWO rows, for Japanese browser idle RPG.
Input image: style and pixel detail reference ONLY (an existing male green-mohawk thug). Create the new enemy described below; do not copy his face, hair, or colors.
Match the same polished square-pixel JRPG sprite style, 3-head-tall chibi body, dark pixel outlines, stepped limited-palette shadows, no smooth paint or anti-aliased glow. Facing screen LEFT, toward player party.
Top row: FOUR combat idle frames, standing feet planted on the SAME baseline. Neutral ready stance, small knee bend, small breathing rise, settle. Only a FEW pixels of movement, no dramatic squat. Facial expression is cocky and menacing.
Bottom row: FOUR defeat frames for this SAME enemy: 1 recoil on being hit from LEFT, knees buckle, mouth opens in hurt surprise; 2 knocked backward towards RIGHT, leaning back, feet lifting; 3 falling on side/back almost horizontal; 4 fully slumped on side/back, eyes closed or tiny cartoon X eyes, weapon beside body. No smiling when defeated, no gore.
EXACT same character, clothing, head and body scale and palette across all eight frames. All full bodies and equipment entirely INSIDE their OWN equal cells; give every cell at least 30 pixels of genuinely empty transparent margin so hands, hair or fallen feet NEVER cross a cell edge. Equal 4x2 grid, ample transparent space BETWEEN ROWS, no overlapping poses. Same implied floor across a row. True alpha transparent PNG, no colored backdrop, no glow, no ground shadows, no labels or grid lines, no numbers or text. Final sprites will be about 190px tall.

NEW DESIGN: Adult WOMAN punk with a clearly feminine face and WHITE swept spiky mohawk, shaved dark sides, dark brown skin, strong stocky build, orange industrial work vest over a charcoal shirt, olive cargo trousers, knee pads and heavy boots, holds a big steel mechanic wrench. Practical nonsexual full outfit, no exaggerated chest.

[モヒカン女（バット）]
画風参照：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
生成原画：C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-1c55f688-e04d-488a-8fa1-4d5f02513cb6.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-female-cyan-idle-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-female-cyan-defeat-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-female-cyan-v1.png
最終プロンプト：
Use case: stylized-concept.
Asset type: EIGHT-frame transparent pixel-art enemy sprite sheet, FOUR columns and TWO rows, for Japanese browser idle RPG.
Input image: style and pixel detail reference ONLY (an existing male green-mohawk thug). Create the new enemy described below; do not copy his face, hair, or colors.
Match the same polished square-pixel JRPG sprite style, 3-head-tall chibi body, dark pixel outlines, stepped limited-palette shadows, no smooth paint or anti-aliased glow. Facing screen LEFT, toward player party.
Top row: FOUR combat idle frames, standing feet planted on the SAME baseline. Neutral ready stance, small knee bend, small breathing rise, settle. Only a FEW pixels of movement, no dramatic squat. Facial expression is cocky and menacing.
Bottom row: FOUR defeat frames for this SAME enemy: 1 recoil on being hit from LEFT, knees buckle, mouth opens in hurt surprise; 2 knocked backward towards RIGHT, leaning back, feet lifting; 3 falling on side/back almost horizontal; 4 fully slumped on side/back, eyes closed or tiny cartoon X eyes, weapon beside body. No smiling when defeated, no gore.
EXACT same character, clothing, head and body scale and palette across all eight frames. All full bodies and equipment entirely INSIDE their OWN equal cells; give every cell at least 30 pixels of genuinely empty transparent margin so hands, hair or fallen feet NEVER cross a cell edge. Equal 4x2 grid, ample transparent space BETWEEN ROWS, no overlapping poses. Same implied floor across a row. True alpha transparent PNG, no colored backdrop, no glow, no ground shadows, no labels or grid lines, no numbers or text. Final sprites will be about 190px tall.

NEW DESIGN: Adult WOMAN punk with a clearly feminine face, CYAN short mohawk and shaved sides, tan skin, small nose ring, sleeveless dark red biker jacket over a grey shirt, blue-grey trousers and black boots, holds a baseball bat low across her body. Wiry athletic ordinary thug. Nonsexual full outfit, no exaggerated chest.

[モヒカン（鉄斧）]
画風参照：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-green-idle-v1.png
生成原画：C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-5ceb1ac3-068f-4fc8-be52-0cdb1cd9b565.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-male-orange-idle-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/enemy-mohican-male-orange-defeat-v1.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/old/enemy-mohican-male-orange-v1.png
最終プロンプト：
Use case: stylized-concept.
Asset type: EIGHT-frame transparent pixel-art enemy sprite sheet, FOUR columns and TWO rows, for Japanese browser idle RPG.
Input image: style and pixel detail reference ONLY (an existing male green-mohawk thug). Create the new enemy described below; do not copy his face, hair, or colors.
Match the same polished square-pixel JRPG sprite style, 3-head-tall chibi body, dark pixel outlines, stepped limited-palette shadows, no smooth paint or anti-aliased glow. Facing screen LEFT, toward player party.
Top row: FOUR combat idle frames, standing feet planted on the SAME baseline. Neutral ready stance, small knee bend, small breathing rise, settle. Only a FEW pixels of movement, no dramatic squat. Facial expression is cocky and menacing.
Bottom row: FOUR defeat frames for this SAME enemy: 1 recoil on being hit from LEFT, knees buckle, mouth opens in hurt surprise; 2 knocked backward towards RIGHT, leaning back, feet lifting; 3 falling on side/back almost horizontal; 4 fully slumped on side/back, eyes closed or tiny cartoon X eyes, weapon beside body. No smiling when defeated, no gore.
EXACT same character, clothing, head and body scale and palette across all eight frames. All full bodies and equipment entirely INSIDE their OWN equal cells; give every cell at least 30 pixels of genuinely empty transparent margin so hands, hair or fallen feet NEVER cross a cell edge. Equal 4x2 grid, ample transparent space BETWEEN ROWS, no overlapping poses. Same implied floor across a row. True alpha transparent PNG, no colored backdrop, no glow, no ground shadows, no labels or grid lines, no numbers or text. Final sprites will be about 190px tall.

NEW DESIGN: Adult MAN punk with ORANGE tall mohawk and shaved sides, dark stubble on his chin, broad jaw, scar across one eyebrow, bulky olive biker vest over a grey shirt, dark blue work trousers, black boots and leather bracers, holds a short heavy scrap-metal axe. Stocky ordinary thug, not a boss.

[ウトガルド工業地帯 背景]
世界設定の参照：D:/マイドキュメント/GitHub/YggRW/rw-lore-ygg-midgard.html のウトガルド工場地帯。
生成原画：C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-4ebec108-bf9d-49f1-a4cf-3be002af8eed.png
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/utgard-industrial-v1.png
最終プロンプト：
Use case: stylized-concept.
Asset type: opaque PNG battle backdrop for a Japanese pixel-art idle RPG, wide landscape 3:2 composition.
Primary request: UTGARD INDUSTRIAL DISTRICT inside the middle layer of the enormous artificial city-island Yggdrasill. Lore: tightly stacked factory tower buildings stretch up toward the layer's immense metal CEILING, like a city of giants. Industrial production and exports, labyrinthine alleys and criminal gang territory. This is an enclosed city district, NOT open sky.
Scene: broad worn concrete loading yard in the foreground, densely layered factory towers beyond, immense overhead pipes, ventilation ducts, crisscross steel catwalks, gantry beams, a few chain-link fences and stacked metal crates at the edges, small warm furnace windows and industrial warning lamps. A glimpse of the enormous overhead support lattice / ceiling in the smoky depth. No visible people or enemies.
Style: detailed crisp JRPG pixel-art background with clean square pixels and restrained stepped shading, compatible with 3-head-tall pixel character sprites. No photorealism, no painted blur.
Composition: usable battle backdrop for characters standing at several depths; lower HALF is mostly quiet open factory-yard ground with subtle cracks and recessed panels, keep middle LEFT and middle RIGHT uncluttered for characters and attacks. Buildings concentrated toward top and outer edges. Broad readable silhouettes, dense industrial scale in the distance, no huge foreground objects. Works when center-cropped into a portrait battle viewport too.
Colors: dark desaturated steel teal, blue grey, weathered charcoal, restrained rust, sparse amber-orange lights. Atmospheric but NOT pitch black; visibly readable structure. No text, signage lettering, UI, logos, watermarks, borders. No particles or crystal rain baked into image; those are animated separately in game.



## v0.28：旧セッション素材の保管

起動訓練・通路の巡回・重装甲試験の削除に伴い、enemy-drone.png・enemy-guard.png・enemy-heavy.png を img/old/ へ移動。PNGの内容は変更せず保管。汎用ヒット火花はCSSで描画し、画像素材は追加していません。

## 右藤ビシュナル：素材制作記録（v0.29.0）

生成：内蔵 image_gen ツール（transparent_background:true）。外部API用CLIは使用していません。
参照：ユーザー提供画像 codex-clipboard-82fe869b-d919-4a6e-9b90-5e09244140f8.png（キャラクターデザイン）、img/meta-poses-v3.png（ドットの画風）。

保存先：
- D:/マイドキュメント/GitHub/Other/YggClicker/img/vishunal-poses-v1.png — 896×448、4列×2行、1コマ224×224。
- D:/マイドキュメント/GitHub/Other/YggClicker/img/vishunal-missile-v1.png — 64×27。

生成原画：exec-bdbdf2a2-302f-4793-8928-bca38e314657.png、exec-b783e7ac-fbb9-4cd2-9f41-9864c678c588.png。
組込み処理：最近傍縮小、各コマの足元をY=202へ整列、透過PNGのパレット最適化。手描きによる加筆・デザイン変更なし。

最終生成プロンプト（スプライト）

Use case: stylized-concept. Asset: transparent PNG pixel-art animation sprite sheet for an existing Japanese idle RPG. Input 1 is the CHARACTER DESIGN reference; Input 2 is the PIXEL ART STYLE reference only. Create new companion Uto Vishunal (右藤ビシュナル), a cute small chubby brown-and-tan DOG mascot wearing a blue collar with a small gold square tag and carrying a bulky blue-grey six-tube missile launcher with lilac-purple tube interiors on its back, plus one small matching side launcher. Match the first image's big rounded muzzle, tiny unreadable black bead eyes, two small tan eyebrows, pointy triangular ears, short legs and rotund body. An adorable but inscrutable face; keep mouth closed and tiny, no manic grinning or angry brows. Face RIGHT in a three-quarter game battle view so muzzle and launch tubes point toward enemies on the RIGHT. Convert to the same crisp, fine square-pixel, dark outline, restrained stepped shading style as input2, NOT smooth 3D, painting, or blurry antialiasing. One consistent character/palette/proportions throughout. Exact FOUR COLUMNS by TWO ROWS with EIGHT equal cells. Upper row: 4 normal/attack frames: 1 idle standing grounded on all four paws, 2 subtle breathing idle, 3 slight body brace and launcher tilting forward to aim, 4 single shot with a small yellow-white muzzle flash at one tube, small recoil while paws stay planted. Lower row: FOUR consecutive rapid missile firing frames: alternating tube muzzle flashes and small yellow-orange exhaust puffs, launcher kicking/tilting a few pixels, dog's ears and body jiggling with recoil but face remains cute inscrutable and mouth closed. Clear frame-to-frame differences, same size and shared floor baseline in every cell. Do not draw flying missiles outside the tubes; projectiles are separate game objects. Draw dog plus launcher about the same combined height as the character in style reference but wide and stocky, dog itself much shorter than a human. Keep ALL pixels of each pose/flashes inside its OWN equal cell with ample transparent padding on all four sides; equal cell spacing, no overlaps. True transparent alpha background. No floor, shadow ellipse, background, frame dividers, letters, text labels, watermark. Use simple tiny geometric marks on launcher sides; omit lettering.

最終生成プロンプト（ミサイル）

Use case: stylized-concept. Asset: single transparent PNG pixel-art projectile sprite for a cute Japanese idle RPG. Draw ONE small stubby blue-grey missile flying horizontally toward the RIGHT, with a pale silver cylindrical body, short rounded violet-purple nose cone pointing right, two tiny blue-grey fins near the back and a short yellow-white/orange pixel flame extending from the left rear. True crisp square-pixel art, dark navy outline, stepped limited palette shading. Readable compact silhouette at 48x24 game pixels. Side view, perfectly horizontal RIGHTWARD orientation, entire projectile and exhaust inside frame with generous transparent padding. Center one missile only, no duplicates or multi-frame sheet, no scenery, no smoke cloud, no shadow, no text, no watermark, genuinely transparent background.


## v0.30.0：目・首輪と動的な砲口

ビシュナル表示修正（v0.30.0）
生成方法：内蔵 image_gen ツール（transparent_background:true）。
保存先：D:/マイドキュメント/GitHub/Other/YggClicker/img/vishunal-poses-v2.png
画像仕様：896×448、4列×2行、各224×224、透過PNG。
変更：白い瞳と大きな黒い瞳孔、黄色い五芒星と中央の青い球、固定の発射光を除去。
原画：C:/Users/user/.codex/generated_images/01a10130-349c-7870-a623-2dc6018f4d46/exec-21fd8478-2f3d-46a1-b8a9-5e96f6ebbc98.png
参照：現行v1スプライト（編集対象）、C:/Users/user/Downloads/a1.png（目のみ参考）。
組み込み：最近傍で224×224へ縮小、8コマの足元Y=202に統一、PNGパレット最適化。旧v1画像は保持。
発射光：ゲーム側の小さなピクセル状CSSエフェクトとして、ミサイルと同じ砲口・同じ遅延で表示。

最終プロンプト：
Use case: precise-object-edit. Edit target: Image 1 is an existing transparent pixel-art game animation sprite sheet (4 columns x 2 rows, eight dog poses). Reference only: Image 2 old dog portrait is ONLY a reference for eye anatomy, NOT fur, pose, proportions, or style.
Make only these surgical edits throughout all eight frames:
1. Replace the tiny black bead eyes with clearly visible white sclera crescents around large black pupils as in reference 2. Keep the same cute unreadable neutral expression, existing brown/tan dog design, face silhouette, head direction, eyebrows and tiny mouth. Pixel-art eyes, not shiny dots.
2. Collar pendant must be a distinct yellow FIVE-POINT STAR, with a BLUE spherical gem at its center. Keep the current blue collar.
3. Remove all yellow/orange missile muzzle flashes from the sprite sheet, restore clean purple muzzle openings behind them; the game will overlay dynamic flashes at every individual port. Keep each of the eight existing body/recoil poses, including the four lower-row rapid-fire poses. Visible large back launcher has FOUR ports in a 2x2 arrangement, small side launcher has FOUR ports in a 2x2 arrangement. Preserve the hardware and ports consistently.
Strict invariants: keep ONLY this same small four-legged brown/tan dog with blue collar, grey-blue/purple launchers, same eight silhouettes, same frame placement/padding/foot baseline, same pixel resolution and clean pixel edges, same palette/shading everywhere except edited eyes and pendant. Do NOT adopt the old black-fur portrait, do not redesign anything, no new background/text/items. Output transparent PNG, exact 4x2 equally spaced atlas preferably 896x448, no cropped paws or overlapping cells.


## v0.39.0：トルデリーゼ・トルンヴァルト

ユーザー提供の立ち絵を参照し、内蔵 image_gen.imagegen で制作。待機・通常攻撃・連続攻撃を各4コマにし、技術的な切り出しと最近傍拡縮で足元と倍率を統一。

- tordeliese-poses-v1.png：1664×1248、4列×3行、各416×416。
- tordeliese-standing-v1.png：待機の先頭1コマ。
- tordeliese-tendril-v1.png：512×512、2列×2行、各256×256。根元をキャラに固定する別レイヤーの伸縮モーション。
- tordeliese-v1.json：コマ定義、生成プロンプト、参照情報。

すべて外部の透過PNG。既存キャラの画像は変更していません。


## v0.39.1：トルデリーゼの頭身・表情・コマ分離

内蔵 image_gen.imagegen で全12コマを描き直し、ユーザーの追加参考画像に合わせて親しみのある顔へ調整。頭身を高め、165cm対180cmの身長比でゲルハムトと表示を統一。

- tordeliese-{idle,attack,burst}-{1..4}-v2.png：各416×416、実際の再生に使う独立した透過PNG。
- tordeliese-standing-v2.png：新しい待機先頭コマ。
- tordeliese-poses-v2.png：1664×1248の閲覧用一覧。
- tordeliese-tendril-{1..4}-v2.png：各256×256、旧触手シートを独立画像に分離。
- tordeliese-v2.json：生成ツール・全プロンプト・参考画像・切り出し位置・表示寸法の記録。

透明領域の境界から切り出し、共通倍率と足元で配置。各フレームを別画像として切り替えるため隣のコマが映り込まない。旧画像は保持。


## v0.39.2：トルデリーゼ v3

内蔵 image_gen.imagegen で描き直し。メタ・ゲルハムトを画風の参照にし、待機・通常攻撃・連続攻撃と伸縮触手を各6コマ化。すべて256×256の外部透過PNG。tordeliese-poses-v3.png は6列×3行の確認用一覧、tordeliese-tendril-v3.png は3列×2行。実際の再生は各コマの独立PNG。旧画像は保持。全プロンプト・切り出し・倍率・再生時間は tordeliese-v3.json に記録。


## v0.39.3：トルデリーゼ v4

内蔵 image_gen.imagegen による輪郭と色境界の明瞭化。待機・攻撃・連続攻撃・触手を各6コマ、256×256の独立透過PNGで保存。v3の動き、頭身、再生時間を継続。tordeliese-poses-v4.png は6列×3行、tordeliese-tendril-v4.png は3列×2行の閲覧用一覧。全プロンプトと切り出し情報は tordeliese-v4.json に記録。


## v0.39.4：トルデリーゼ v5

内蔵 image_gen.imagegen で中密度の細かいドットへ調整。輪郭の明瞭さを維持しつつ、眼鏡・顔・髪・指先と触手の細部を整理。各モーション6コマ、各384×384の外部透過PNG。身体の表示高約171pxと、足元・触手の根元・再生速度は維持。確認用一覧は tordeliese-poses-v5.png（2304×1152）、tordeliese-tendril-v5.png（1152×768）。実際は各コマを独立PNGで再生。旧版は保持。プロンプト、切り出しと倍率は tordeliese-v5.json に記録。


## v0.39.5：トルデリーゼ v6

内蔵 image_gen.imagegen による表情・連続攻撃姿勢の更新。待機・通常攻撃は快活で表情豊かに。連続攻撃は指差しをやめ、膝を曲げて低く踏ん張る姿勢と集中した攻撃的な顔へ。各6コマ、384×384の独立透過PNG。通常立ち絵の身長比と共通倍率を維持し、しゃがみを縮尺で引き伸ばさない。tordeliese-poses-v6.png は2304×1152の確認用一覧。伸びる触手はv5画像を再利用。全プロンプトと配置は tordeliese-v6.json に記録。


## v0.45.0

- `meta-down-v1.png`, `richter-down-v1.png`, `vishunal-down-v1.png`, `tordeliese-down-v1.png`, `max-down-v1.png`: built-in ImageGen, existing character designs as references; transparent down poses. Prompt and source records: `ally-down-v1.json`.
- `tordeliese-animation-v8.png`: lossless arrangement of existing v6 idle/attack and v7 burst frames into a 6 × 3 atlas (384 px cells). No repaint or palette change.
## v0.46.0 enemy attacks

- Eleven transparent four-frame attack sheets: ten weapon-specific Mohican variants and Dementor soul drain, created with built-in ImageGen using the existing idle sprite sheets as identity/style references.
- Files: `enemy-*-attack-v1.png`. Layout: 1280 × 280, four 320 × 280 cells. Source frames are separated at transparent gutters, uniformly resized with nearest-neighbor sampling and registered to a common foot baseline. No frame overlaps.
- Full prompts, source paths, reference assets and export metadata: `enemy-attacks-v1.json`.

## v0.51.0：今回の採用素材

内蔵 image_gen による画像編集。足元の位置合わせ・アトラスへの格納はSharpで行い、同一モーション内は共通の縮尺。

| 素材 | アトラス寸法 | コマ数 | 原寸での足元アンカー |
| --- | --- | --- | --- |
| meta-poses-v7.png | 1280×320 | 横4 | (160,304) |
| meta-burst-v10.png | 1792×448 | 横4 | (224,368) |
| waku-poses-v2.png | 1792×448 | 横4 | (224,368) |
| waku-burst-v2.png | 2816×512 | 横4 | (352,400) |
| tordeliese-animation-v9.png | 2304×1152 | 6列×3行 | (166,360) |
| tordeliese-tendril-1〜6-v6.png | 各384×384 | 各1 | 根元(24,192) |

実表示でメタと枠の足元は、通常・連続とも画像中心より72px下。トルデリーゼの元画像アンカーは既存の影の位置43.359375%を維持。整数画素へ丸めるため水平中心の差は原寸0.5px以内。接地線の縦ずれは0px、全40コマの外周に不透明な画素なし。

メタは身体の前を通る腕、枠は複数の剣閃、トルデリーゼは右腕の小さな変化を中心に作成。触手の小爪は金色、先端は青。旧版は復旧可能な別名のまま保持。

## v0.52.0：提供ひな形からの調整

内蔵image_genで編集。メタはユーザー提供の4コマを同順で調整（meta-burst-v11.png、1792×448）。枠は6コマの2〜5を軸に4コマ化し、通常時の服装に合わせる（waku-burst-v3.png、2816×512）。通常時と同じ足元で登録。
トルデリーゼは連続攻撃4コマ目のみ触手の向きを変更（tordeliese-animation-v10.png、2304×1152）。残る17コマは既存RGBA画素をそのまま保持。

## v0.57.2：ジュエルの顎

内蔵 image_gen の編集モードを使用。編集指示：既存のジュエルの紫髪・ピンクスーツ・表情・姿勢・頭身・配色を保ち、顎をはっきりした割れ顎（ケツアゴ）に変更する。待機・通常攻撃・連続攻撃・ダウンで一致させ、背景は透明にする。

採用素材：jewel-animation-v4.png（2688×1792、672×448の4列4行）、jewel-standing-v4.png（576×384）、jewel-down-v2.png（256×256）。生成画像から顎の描画部分だけを切り出し、既存の各コマに格納。透明度と顎以外の画素は旧版と同一、接地位置・タイミング・コマ間隔は変更なし。


## v0.57.3：ジュエルのユーザー編集版

ユーザー提供「苦悶する紫髪のピンクスーツ男(1).png」「ピンクスーツの格闘家スプライトシート.png」を使用。1枚目を細部の基準とし、built-in imagegen の edit モードで黒背景を透過、シートの装飾・色を統一。元のポーズ構成を保ち、nearest-neighborで共通縮尺に変換して足元を登録しました。

- jewel-animation-v5.png：2688×1792、672×448の4列4行。待機4／通常攻撃4／連続攻撃8コマ。全コマの足元は（336, 430）。
- jewel-standing-v5.png：576×384、待機先頭コマの一覧表示用。
- jewel-down-v3.png：256×256、接地端 y=240。
- jewel-v5.json：編集プロンプト、入力画像、生成結果、切り出し座標、登録位置。


### ジュエル 顔の比率調整（v0.57.5）

- jewel-animation-v6.png / jewel-standing-v6.png：built-in imagegen編集。元イラストとダウン絵を参照し、通常・攻撃コマの長い顔を短く幅のある比率へ調整。
- 生成した頭部のみ元シートに合成し、身体・靴・攻撃軌跡と全16コマの接地位置を維持。セルは672×448、接地アンカーは(336,430)。
- jewel-down-v3.png：画像は変更せず、ゲーム内の表示幅を160pxから240pxへ拡大。
- 編集プロンプト・元画像・合成範囲・配置情報：jewel-v6.json。
