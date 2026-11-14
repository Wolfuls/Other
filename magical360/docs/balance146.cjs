// Reproducible design-cycle comparison. Run: node docs/balance146.cjs
const fs=require('fs'),path=require('path'),vm=require('vm'),root=path.join(__dirname,'..');
for(const [,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g))if(f!=='game.js')vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const A=Miload,W=A.WANDS,ms=[100,150,200,250,300,350,450,600],rows=[];
function shot(id,hits=1,label=W[id].name,h=0){const w=W[id],d=w.damage*hits,c=A.shotCost(id,h),t=A.shotInterval(id,h);rows.push({label,calc:(m,r)=>m<c?null:d/(t+c/r)});}
shot('star');shot('arrow');shot('twin',2);shot('sugar');shot('blade');shot('comet');shot('echo',1,'反響（1命中）');shot('echo',5,'反響（5命中・理論）');shot('spread',1.5,'三日月（平均1.5）');shot('spread',3,'三日月（3命中・理論）');
for(const h of [0,50,80,90,99])shot('fortune',1,'幸福（'+h+'）',h);
shot('guide');shot('ray',1.5,'光条（平均1.5）');shot('ray',3,'光条（3命中・理論）');
rows.push({label:'チェーンソー（全量継続）',calc:(m,r)=>m<225?null:Math.floor((m/100+1e-9)/.12)*15/(m/100+m/r)});
rows.push({label:'業火（容量内最大溜め）',calc:(m,r)=>{if(m<225)return null;const c=Math.min(m,275);return A.infernoStats(c).damage/((c-225)/65+.65+c/r);}});
rows.push({label:'聖杭（追撃命中）',calc:(m,r)=>m<350?null:420/(2.4+.18+350/r)});
rows.push({label:'威光（全量継続・単体）',calc:(m,r)=>m<350?null:Math.floor(((m-100)/200+1e-9)/.12)*24/((m-100)/200+m/r)});
const fmt=n=>n==null?'不可':n.toFixed(2);
let out='v0.146 全杖・最大魔力別 持続DPS比較\n\n';
out+='前提：最大魔力M=100+50×修行回数。章自動成長なし。回復R=M×0.18（精神統一あり0.27）。射撃待ち/チャージ/継続攻撃中は回復停止。\n単発式=1射の命中ダメージ÷(発射間隔+消費/R)。初期満タンの有利を除く長時間平均。回避・移動・弾の飛翔・命中率・オーバーキルは含めない。120Hz入力刻みは連射率を丸めるため実測は少し下がり得る。\n双頭2命中、三日月/光条平均1.5命中。反響5命中は同一ボスに5回当たる保証のない理論上限。範囲攻撃も単体比較。\nチェーンソーは先払い225を含め魔力全量を消費し、0.12秒刻みの完了ヒットのみ計上。中断すると未使用先払い分を失う。\n威光は開始100を消費し残量を毎秒200で使い切る（開始には350必要）。12方向を単体へ重複加算しない。回転中も各刻みで命中する上限であり、細い敵への実効値は低い。\n業火は最大魔力225なら60、250なら180、275以上なら330。敵弾相殺による減衰なし。聖杭は追撃のヒットストップ0.18秒を周期に加算。\n\n';
for(const focus of [false,true]){out+=(focus?'精神統一あり':'精神統一なし')+'\n杖 | '+ms.map(m=>'魔力'+m).join(' | ')+'\n';for(const row of rows)out+=row.label+' | '+ms.map(m=>fmt(row.calc(m,m*(focus?.27:.18)))).join(' | ')+'\n';out+='\n';}
out+='幸福の杖：威力2、毎秒発射数=1/0.18+(1/0.06−1/0.18)×(幸福度/99)^2。消費=min(10,36×間隔)。全域で設計上36魔力/秒。99の性能は維持。\n幸福度 | 間隔 | 発/秒 | 消費/発 | 射撃DPS | M100持続 無/有 | M250持続 無/有\n';
for(const h of [0,50,80,90,99]){const t=A.shotInterval('fortune',h),c=A.shotCost('fortune',h);out+=[h,t.toFixed(4),(1/t).toFixed(2),c.toFixed(2),(2/t).toFixed(2),[18,27].map(r=>(2/(t+c/r)).toFixed(2)).join('/'),[45,67.5].map(r=>(2/(t+c/r)).toFixed(2)).join('/')].join(' | ')+'\n';}
out+='\n判断：\n・幸福0は最大魔力100で3.70/4.76 DPS、双頭2.65/3.51より約40%/36%高い。照準ブレを含めた実戦命中率では差は縮む。Lv1を少し上回る下限とし、99/0の火力差は約41.7倍から3倍へ縮小。\n・魔刃が双頭を上回る境界：最大魔力278（精神統一186）。三日月平均1.5は445（297）、雷鳴は556（371）。離散的な修行+50では各境界を超える次の50刻みで逆転。\n・半々育成Ch7想定の最大250では、精神統一なしの魔刃・雷鳴・三日月平均1.5の単体持続火力は双頭より低い。魔刃/雷鳴は貫通、三日月は3命中の上振れを持つが、平均1.5基準でのLv2復権は遅い。幸福は低魔力から強く、反響も複数回命中すれば双頭を上回る。\n・Lv3は一射/開始225の容量制約を越えるとLv1を大きく上回る。導き星と幸福99の逆転は最大魔力約288.4（精神統一約192.2だが導き星には225必要）。\n・Lv4も聖杭は350到達時から高火力。一方威光は開始費用・回転命中率のため、単体持続DPSでは必ずしもLv3を上回らない。これは全方位範囲攻撃とのトレードオフ。\n・最大魔力を増やすだけでは、Lv2全体が適切な時期に復権する設計にはなっていない。次の調整候補はLv2のダメージ/魔力効率（特に三日月・雷鳴）。低魔力時の切り札という位置付けを維持するなら消費を下げるより威力を上げる方が合うが、初弾火力/複数命中/範囲総ダメージも同時評価が必要。今回は幸福以外の数値変更なし。\n';
fs.writeFileSync(path.join(__dirname,'balance-v146.txt'),out);console.log(out);
