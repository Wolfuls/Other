const fs=require('fs'),path=require('path'),vm=require('vm'),root=path.join(__dirname,'..');
for(const [,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g))if(f!=='game.js')vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const A=Miload,ms=[100,150,200,250,300,350];
const rows=[['arrow',1],['twin',2],['sugar',1],['blade',1],['comet',1],['echo',1],['echo',2],['echo',5],['spread',1.5],['spread',3],['fortune',1,0],['fortune',1,99]];
function dps(id,hits,m,focus,h=0){const w=A.WANDS[id],c=A.shotCost(id,h);return m<c?null:w.damage*hits/(A.shotInterval(id,h)+c/(m*(focus?.27:.18)));}
let out='v0.147 Lv2威力調整と持続DPS\n\n魔刃9→10、雷鳴24→30、三日月1本8→10、反響1命中4→5。幸福は据え置き。消費・発射間隔・Lv1/Lv3/Lv4・敵HPは変更なし。\n';
out+='持続DPS=1射の命中ダメージ÷(発射間隔+消費魔力/回復速度)。回復速度は最大魔力の毎秒18%、精神統一で27%。射撃待ち中の回復停止を含む長期平均。初期満タンの有利・飛翔時間・回避・オーバーキルを除く。実際は120Hz刻みによる差あり。\n双頭2命中、三日月平均1.5命中。反響は反射2命中を調整基準とし1・5命中も併記（5は理論上限、地形反射も5回制限を消費）。範囲攻撃の総ダメージは加算せず単体比較。\n\n';
out+='杖 | 威力 | 消費 | 間隔\n';for(const id of ['blade','comet','spread','echo','fortune']){const w=A.WANDS[id];out+=`${w.name} | ${w.damage}${id==='spread'?'×3':''} | ${id==='fortune'?'6.48〜2.16':w.cost} | ${id==='fortune'?'0.18〜0.06':w.cooldown}秒\n`;}
for(const focus of [false,true]){out+='\n'+(focus?'精神統一あり':'精神統一なし')+'\n杖/命中 | '+ms.map(m=>'最大魔力'+m).join(' | ')+'\n';for(const [id,hits,h]of rows)out+=A.WANDS[id].name+(id==='fortune'?'（幸福'+h+'）':`（${hits}命中）`)+' | '+ms.map(m=>{const d=dps(id,hits,m,focus,h);return d===null?'不可':d.toFixed(2);}).join(' | ')+'\n';}
out+='\n双頭（Lv1内の単体DPS上位、2命中）との比較：\n';
for(const [id,hits]of [['blade',1],['comet',1],['spread',1.5],['echo',2]]){out+=A.WANDS[id].name+': ';for(const focus of [false,true]){const r=[100,150,200,250,300].find(m=>dps(id,hits,m,focus)>dps('twin',2,m,focus));out+=(focus?'精神統一あり':'なし')+' '+r+'から上回る。';}out+='\n';}
out+='精神統一なしの魔刃/雷鳴は最大200で双頭を約0.2%だけ上回るほぼ互角の境界（更新刻みや命中率で逆転し得る）。250では魔刃約7%、雷鳴約5%、三日月約8%、反響2命中約10%上回る。\n精神統一は回復を1.5倍にするので、魔刃・三日月・反響2命中は最大150から逆転する。雷鳴は開始消費200の容量制限を維持。\n反響は1命中だけだとLv1未満。多重反射の使いどころを保つため、1命中でLv1を上回る威力10にはしない。幸福も低幸福度から既に条件を満たしており据え置き。\n低容量でLv1、高容量でLv2という傾向を保ちつつ、特殊条件（精神統一・多重命中・高幸福度）では逆転が早まる設計。\n';
fs.writeFileSync(path.join(__dirname,'balance-v147.txt'),out);console.log(out);
