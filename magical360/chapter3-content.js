(function(root){'use strict';const C=root.MiloadContent;
C.chapterThreeStages=['静まり返った麦畑','眠らない水車小屋','街道の大集荷場'].map(name=>({name,areas:[name]}));C.chapters.push({id:3,name:'星明かりの穀倉地帯',stages:C.chapterThreeStages.map((s,i)=>({id:i+1,...s}))});
const text=[
'車輪の跡……。こっちに続いてる','ずいぶん遠くまで来ちゃったわね','いた……！','今度は、どこへ運んでるのか見届けないと',
'この荷台も、空っぽ……','ちゃんと収穫してあるのに。中身だけ持っていかれたの？','あれ、野菜……？　果物まで？','お菓子だけじゃなくて、食べ物なら何でも集めてるのかしら','あっちにも、同じ袋を持った魔物がいる……',
'上からなら、少し先まで見えそうね','……やっぱり。みんな、あの水車小屋へ向かってる','あの足場……水車と一緒に回ってる','上がってきたところに乗れば、向こうへ渡れそう','ぷはっ……！　見た目より流れが速いのね','今度は、足場が近づくまで待ちましょう……',
'すみませーん。誰かいませんか？','……いるのは、そっちなのね','お邪魔します。ちょっと調べさせてもらうわよ',
'ここも魔物から避難したのね。機械は動いたまま……','勝手に入り込んだだけ、って感じでもないわね','こっちの水車は止まってるのね','水の流れを変えられれば、動くかしら？','よし、動いた！','あの足場で、上まで行けそうね',
'この袋、さっきの農場の名前じゃない……','こっちは、また別の村？','こんなに離れた場所からも、運んできてるのね','この杖……魔力が、細く真っすぐに集まってる','向こうの魔物まで当たった！','並んだところを狙えば、まとめて相手にできそうね',
'また、あの印……','袋を替えて、そのまま運び出してる','こんなに食べ物があるのに、誰も食べようとしないのね……','あら。水の下に、こんな道があったのね','ちょっとだけ、覗いていこうかしら',
'あそこに集めてるんだ……','待って。あっちの道からも来てる？','……一度、全部確かめた方がよさそうね','街のお店の箱まである……','畑のものも、村のものも、ここへ集めてたのね',
'もう、そんなところから……！','そこなら、こっちの魔法も届くわ！','入り口は別々なのに、出ていく方は同じ……','ただ盗んでるんじゃない。ちゃんと、行き先が決まってるんだ','……今の音、何？',
'……その大きさで、ただの荷物ってわけじゃないわよね','やっぱり！','そこを通して。荷物の行き先を、確かめたいの','……通してくれる気は、なさそうね','足元に来る……！','今度は上から！？','ちょっと、こっちに倒れないでよ！','効いてる……。もう少し！','わ……！　大きなバウムクーヘン！','見とれてる場合じゃなかった……！',
'……うん。しっとりしてて、おいしい！','……っと。行き先を調べるんだった','この街に、この村……。さっき袋に書いてあった名前だわ','ここで集めて、それから、もっと先へ……','魔物が勝手に持ち歩いてたんじゃない','誰かが、いろんな場所から食料を集めさせてるんだ','この印……行き先の目印なのかしら','ずいぶん古い書き方……。何て書いてあるんだろう','古い記録なら、学術都市の図書館に何かあるかもしれない','こんなに食べ物を持っていって、何をするつもりなのか……','……ちゃんと、確かめなくちゃ',
'……落ち着いて。急いで倒れたら、追いかけられないわ','……ふぅ。甘いものがあると、ほっとするわね','まだ……確かめてないのに……'];
const ev=(id,stage,x,first,last,extra={})=>({id:'c3-'+id,chapter:3,stage,area:0,x,priority:20,lines:text.slice(first-1,last).map((t,i)=>({id:'C3-M'+String(first+i).padStart(3,'0'),speaker:'ミロード',text:t,expression:[3,17,47,51,54].includes(first+i)?'shock':[23,29,56,68].includes(first+i)?'happy':'thinking'})),...extra});
const scene={blocking:true,scene:'farm',priority:90},reaction=signal=>({signal,reaction:true,ttl:4,priority:30});
C.chapterThree=[ev('opening',1,85,1,4,scene),ev('harvest',1,500,5,6),ev('produce',1,1250,7,9),ev('roof',1,1800,10,11,{condition:'farmUpper'}),ev('wheel',1,2450,12,13),ev('wet',null,0,14,15,reaction('farmWet')),ev('mill-door',1,4050,16,18,{...scene,direct:true}),
ev('machines',2,150,19,20),ev('gate',2,780,21,22,{condition:'waterStopped'}),ev('gate-on',2,0,23,24,reaction('waterOn')),ev('labels',2,1820,25,27),ev('wand',null,0,28,28,{signal:'farmWand',priority:25}),ev('pierce',null,0,29,30,reaction('farmPierce')),ev('sorting',2,2700,31,33),ev('secret',2,0,34,35,reaction('waterLow')),ev('mill-exit',2,4050,36,38,{...scene,direct:true}),
ev('depot',3,100,39,40),ev('high-enemy',3,1450,41,41),ev('fallen-enemy',3,0,42,42,reaction('farmEnemyFall')),ev('routes',3,2650,43,45),ev('boss',3,3350,46,49,scene),ev('roll',3,0,50,50,reaction('farmRoll')),ev('rain',3,0,51,51,reaction('farmRain')),ev('slam',3,0,52,52,reaction('farmSlam')),ev('half',3,0,53,53,{...reaction('bossHalf'),priority:50}),ev('cake',3,0,54,54,{...reaction('bossCake'),condition:'farmCandy'}),ev('revived',3,0,55,55,{...reaction('bossRevived'),condition:'farmAlive'}),ev('feast',3,0,56,57,{blocking:true,direct:true}),ev('ending',3,0,58,66,{...scene,direct:true}),ev('danger',null,0,67,67,reaction('lowLife')),ev('heal',null,0,68,68,reaction('heal')),ev('death',null,0,69,69,{blocking:true,direct:true})];
C.farmMaps=[
{width:4300,ledges:[[650,394,180],[1010,335,210],[1700,392,180],[1920,305,250],[2850,262,250],[3220,350,190],[3590,390,210]],wheels:[[2660,365,96,false]],water:[[2500,2820]],lever:[],crates:[],enemies:[['mouse',560,458],['mill',710,394],['carrier',1320,458],['moth',1450,290],['mouse',1740,392],['moth',2250,300],['mouse',3070,458],['mill',3280,350],['carrier',3780,458]],drops:[['spread',900,428],['guide',2050,275]],heart:[1980,278]},
{width:4300,ledges:[[540,392,170],[1350,266,260],[1800,330,260],[2310,390,220],[2800,315,300],[3330,390,220],[3690,330,230]],wheels:[[1120,365,105,true]],water:[[970,1330],[3190,3370]],lever:[[820,430],[3020,430]],crates:[[2200,394,64,64]],enemies:[['hopper',440,458],['mill',590,392],['moth',1490,210],['hopper',1850,330],['mouse',2100,458],['mouse',2170,458],['mouse',2340,458],['carrier',2700,458],['mill',2870,315],['hopper',3460,458],['mill',3750,330]],drops:[['comet',1820,300],['sugar',3300,428]]},
{width:4600,ledges:[[550,390,180],[900,320,230],[1280,390,160],[2100,300,220],[2520,380,250],[3490,375,140],[4140,375,140]],wheels:[[1950,365,100,false]],water:[[1800,2080]],lever:[],crates:[[1510,266,80,192,true],[1590,266,80,192,true]],enemies:[['carrier',420,458],['mill',600,390],['moth',1040,245],['hopper',1300,390],['mill',1530,266],['mouse',2290,458],['hopper',2570,380],['carrier',2850,458],['keeper',4040,458]],drops:[],arena:3350}];

C.chapterThree=C.chapterThree.filter(e=>e.id!=='c3-mill-door');
for(const e of C.chapterThree)if(e.stage===3)e.stage=4;
C.chapterThree.find(e=>e.id==='c3-machines').x=450;
C.chapterThree.push({id:'c3-welcome',chapter:3,stage:2,area:0,x:85,priority:25,lines:[{id:'C3-WELCOME',speaker:'ミロード',expression:'thinking',text:'お邪魔しまーす。少し調べさせてもらうわよ'}]});
C.chapterThreeStages.splice(2,0,{name:'分水路の調整場',areas:['水車と排水路']});
C.chapters.find(c=>c.id===3).stages=C.chapterThreeStages.map((s,i)=>({id:i+1,...s}));
C.farmMaps.splice(2,0,{width:3900,puzzle:true,ledges:[[470,390,180],[1500,330,220],[1750,310,240],[2760,320,280],[3100,390,170]],wheels:[[1225,360,140,true],[2430,350,165,true]],water:[[980,1470],[2140,2720]],lever:[[730,430],[1830,282],[2910,292],[3200,430,1]],crates:[],enemies:[['mouse',430,458],['mill',520,390],['moth',1510,225],['hopper',1810,310],['carrier',2030,458],['moth',2780,240],['mill',2990,320],['mouse',3320,458]],drops:[]});
const hint=(id,x,text)=>({id:'c3-'+id,chapter:3,stage:3,area:0,x,priority:20,lines:[{id:'C3-'+id,speaker:'ミロード',expression:'thinking',text}]});
C.chapterThree.push(hint('supply',530,'水の送り先を変えるのね。離れたスイッチにも魔法が届きそう'),hint('divert',1660,'こっちへ流すと、手前の水車が止まる……。渡ってから切り替えましょう'),hint('drain',2840,'出口の水が引かない……。流れ込む方も止めないと'));

Object.assign(C.farmMaps[2],{wheels:[],lever:[[730,430],[1830,282],[2910,292]],water:[[980,1470],[2140,2720],[3100,3470]]});
C.chapterThree.find(e=>e.id==='c3-supply').lines[0].text='水門を閉めたら、水が溜まってきた……。浮き足場も上がるのね';C.chapterThree.find(e=>e.id==='c3-supply').signal='levelRaised';
C.chapterThree.find(e=>e.id==='c3-divert').lines[0].text='こっちの水門も閉めれば、もう少し高くできそう';
C.chapterThree.find(e=>e.id==='c3-drain').lines[0].text='あの高い出口まで、浮き足場を上げてみましょう';

C.chapterThree=C.chapterThree.filter(e=>e.id!=='c3-mill-exit');
const opening=C.chapterThree.find(e=>e.id==='c3-opening');opening.blocking=false;delete opening.scene;opening.lines=opening.lines.slice(0,2);opening.lines[0].text='車輪の跡……ここまで続いてる';opening.lines[1].text='随分遠くまで来ちゃったわね';
Object.assign(C.farmMaps[2],{bankY:290,ledges:[[470,224,180],[1750,220,240],[2760,220,240]],lever:[[730,262],[1830,192],[2910,192],[3040,262]],wheels:[[3290,300,110,true]],enemies:[['mouse',430,290],['mill',520,224],['moth',1510,140],['hopper',1810,220],['carrier',2030,290],['moth',2780,140],['mill',2840,220],['mouse',3620,290]]});
C.chapterThree.find(e=>e.id==='c3-drain').lines[0].text='溜めた水を水車へ流せば、あの高い出口まで上がれそうね';
C.farmMaps[1].lever=C.farmMaps[1].lever.slice(0,1);C.chapterThree=C.chapterThree.filter(e=>e.id!=='c3-secret');
})(typeof globalThis!=='undefined'?globalThis:this);
