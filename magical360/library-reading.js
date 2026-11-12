(function(){const P=Miload.Game.prototype,C=MiloadContent,begin=P.beginStory,activate=P.activateStory,finish=P.finishStory,valid=P.storyValid;
const index=C.chapterFour.find(e=>e.id==='c4-index'),entrance=C.chapterFour.find(e=>e.id==='c4-entrance'),archive=C.chapterFour.find(e=>e.id==='c4-archive');
const readings=[{id:'library-guide',stage:2,x:1220,title:'資料室の案内',lines:[entrance.lines.pop()]},{id:'library-index',stage:2,x:3580,title:'境界標の索引',lines:index.lines},{id:'library-archive',stage:4,x:600,title:'資料棚の案内',lines:[archive.lines.pop()]}];
readings[0].lines=[{id:'C4-R01',speaker:'館内案内',text:'古地名と境界標の資料は、閲覧棟の索引より旧資料庫を参照。'},...readings[0].lines];
readings[1].lines=[{id:'C4-R02',speaker:'境界標の索引',text:'境界標：土地の境を示す標。古い街道・水路の図版は、旧資料庫に収蔵。'},...readings[1].lines];
readings[2].lines=[{id:'C4-R03',speaker:'旧資料庫の案内',text:'街道・水路の図版は、同じ分類印の棚へ。古い記録は奥の閲覧机で確認のこと。'},...readings[2].lines];

const note=(id,stage,x,title,texts)=>({id,stage,x,title,lines:texts.map(([speaker,text],i)=>({id:id+'-'+i,speaker,text,expression:speaker==='ミロード'?'thinking':undefined}))});
readings.push(
 note('library-evacuation',1,300,'閉館のお知らせ',[
 ['臨時掲示','市内で魔物が確認されたため、当館は臨時閉館します。職員・利用者は避難所へ。返却期限は延長します。'],
 ['ミロード','誰もいないと思ったら、避難してたのね。……本を返す心配までしてくれるんだ。'],
 ['ミロード','早く安心して戻ってこられるように、私も調べなきゃ。']]),
 note('library-cargo',1,2200,'商いと荷札',[
 ['運送の手引き','荷札には、荷主の印と行き先の印を分けて記す。同じ荷でも、積み替えの際に袋や箱を替えることがある。'],
 ['ミロード','袋を替えても、行き先の印は同じ……。水車小屋で見たのも、そういうこと？'],
 ['ミロード','でも、誰の指図で運んでるかまでは分からないわね。']]),
 note('library-tea',2,400,'閲覧室のお願い',[
 ['閲覧室のお願い','本の上にお茶やお菓子を置かないでください。茶色い丸い跡は、古代の紋章ではありません。'],
 ['ミロード','これ、わざわざ書くほど間違えた人がいるの……？'],
 ['欄外の書き込み','追記：しおりの代わりに薄焼き菓子を挟むのも禁止。'],
 ['ミロード','そっちは、ちょっと分かる……。いや、やらないけど。']]),
 note('library-waterlog',2,2400,'水番の日誌',[
 ['水番の日誌','収穫月十二日。上流の水門を閉じて点検。隣の水車まで止まったので、粉屋へ詫びに行く。帰りにパンをもらった。'],
 ['ミロード','水って、ずっと先までつながってるのね。……あの水車も誰かが面倒を見てたんだ。'],
 ['ミロード','みんなが戻ってきたら、また粉をひいて、パンを焼けるといいな。']]),
 note('library-shelfcare',3,700,'書架整備の記録',[
 ['書架整備の記録','重量のある書架はレールに沿って移動する。作業後は通路を確保し、歯車に布や紙片を残さぬこと。'],
 ['欄外の注意','天板に乗って高い棚へ手を伸ばす者あり。梯子を使うこと。'],
 ['ミロード','……先に読んでおけばよかった。せめて、傷をつけないようにしよう。']]),
 note('library-recipe',3,2700,'夜の読書会・献立帳',[
 ['読書会の献立帳','今夜は焼きりんご。砂糖を振って、芯を抜いた穴にバターをひとかけ。読みながら焼くと、たいてい焦げる。'],
 ['ミロード','最後だけ、急に経験談ね。'],
 ['ミロード','帰ったら作ろうかな。本は……焼き上がってからにしよう。']]),
 note('library-mapnotes',4,1800,'古い地図の読み方',[
 ['図版を読むために','川筋も地名も、時とともに変わる。一枚の地図だけで場所を決めず、別の年代の記録とも照合すること。'],
 ['ミロード','昔の名前が、今もそのままとは限らないのね。印が似てるだけで決めつけちゃだめか。'],
 ['ミロード','荷札を持ってきてよかった。細かいところまで比べてみよう。']]),
 note('library-mending',4,2800,'補修係の覚え書き',[
 ['補修係の覚え書き','欠けた文字を想像で書き足さないこと。読めない箇所は、読めないまま残す。次に読む人のために。'],
 ['ミロード','分からないって残すのも、大事な仕事なのね。'],
 ['補修係の覚え書き','追記：糊の壺と蜂蜜の壺は別の棚に置くこと。'],
 ['ミロード','……その二つが同じ部屋にある時点で、ちょっと危ないと思う。']])
);
P.libraryReadings=()=>readings;
P.storyValid=function(e){if(e.id==='c4-index')return false;return valid.call(this,e);};
P.readingDeskNear=function(){if(this.chapter!==4||this.state!=='playing'||!this.player.grounded)return null;return this.readingDesks?.find(d=>(!d.final||this.libraryResearchReady)&&Math.abs(this.player.x+12-d.x-27)<72&&Math.abs(this.player.y+this.player.h-458)<12);};
P.openReadingDesk=function(){const d=this.readingDeskNear();if(!d)return false;if(this.story){if(this.story.blocking)return false;this.finishStory(true);}const source=d.final?this.chapterEvent('c4-ending'):{id:d.id,lines:d.lines};this.activateStory({...source,reading:true,blocking:true,scene:null,index:0,elapsed:undefined});return true;};

P.activateStory=function(e){activate.call(this,e);if(e.reading){this.libraryAction=null;this.libraryPose='read';this.player.vx=0;}};
P.finishStory=function(skipped=false){const reading=this.story?.reading,id=this.story?.id;finish.call(this,skipped);if(reading){(this.readBooks??=new Set()).add(id);this.libraryPose=null;}};
const draw=MiloadLibraryArt.props;MiloadLibraryArt.props=function(c,g,t){draw(c,g,t);for(const d of g.readingDesks||[]){const x=Math.round(d.x-g.camera);if(x< -80||x>1020)continue;const read=g.readBooks?.has(d.id);c.save();if(!read){c.shadowColor='#ffd96a';c.shadowBlur=14+5*Math.sin(t*3);c.fillStyle='#ffe591';c.fillRect(x+1,406,52,12);}c.restore();c.save();c.textAlign='center';c.font='bold 14px sans-serif';c.fillStyle=read?'#a5d8be':'#ffe69a';c.fillText(read?'✓ 既読':'◆ 調べる',x+27,379);c.restore();const R=(a,b,w,h,col)=>{c.fillStyle=col;c.fillRect(x+a,b,w,h);};R(21,420,9,38,'#72523c');R(9,453,34,5,'#a38151');R(0,414,55,8,'#4b3740');R(3,408,24,9,'#eedab0');R(28,408,24,9,'#d5ba87');R(26,406,2,13,'#9d6f4b');for(let i=0;i<3;i++){R(7,410+i*2,15,1,'#ad936e');R(33,410+i*2,13,1,'#ad936e');}R(40,408,3,12,read?'#71b99b':'#efbd4d');if(g.readingDeskNear()===d){c.fillStyle='#f7dfa1';c.font='13px sans-serif';c.textAlign='center';c.fillText(read?'E / Space：読み直す':'E / Space：読む',x+27,396);}}};
})();
