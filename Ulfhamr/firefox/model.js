(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const labels={hp:'HP',pp:'PP',rage:'暴走率',factor:'因子',spent:'総消費PP',hit:'命中',dodge:'回避',ss:'SS',melee:'格闘',weapon:'武器',power:'能力',defense:'防御',resist:'抵抗',initiative:'行動値',precision:'精度',spec:'スペック'};
const skillNames=['力技','威圧','観察眼','察知','知識','技術','隠密','俊敏','話術','読心','閃き','幸運'];
const phases={IN:'イニシアティブ',AC:'アクション',RE:'リアクション',EN:'エンド',EX:'探索'};
const all=['IN','AC','RE','EN','EX'];
const action=(id,name,pp,phases,note,extra={})=>({id,name,pp,hp:0,factor:0,rage:0,phases,note,group:'AE',...extra});
const catalog=[
action('melee','格闘攻撃',0,['AC'],'格闘攻撃力で攻撃。',{group:'基本行動',main:true,attack:'melee'}),
action('weapon','武器攻撃',0,['AC'],'武器攻撃力で攻撃。',{group:'基本行動',main:true,attack:'weapon'}),
action('dodge','通常回避',0,['RE'],'回避判定を行う。',{group:'基本行動'}),
action('sense','精神回避',0,['RE'],'SSで対抗判定を行う。',{group:'基本行動'}),
...skillNames.map((name,i)=>action('explore-skill-'+i,name,0,['EX'],'探索技能の判定。必要に応じてAEやバーストを組み合わせます。',{group:'基本行動',explorationSkill:name})),
action('explore-precision','能力精度',0,['EX'],'能力精度による探索判定。使用の可否はGMと相談します。',{group:'基本行動',explorationSkill:'能力精度'}),
action('con','コンセントレイション',1,['IN','AC','RE','EX'],'1Lvにつき固定値+1。合計10Lv、装甲は5Lvまで。',{level:true,max:10,target:'hit',targets:['hit','dodge','ss','damage','initiative','defense','resist','skill']}),
action('boost','ブースト',3,['AC','RE','EX'],'1Lvにつき判定+1D6。ダメージ・行動値・装甲には不可。',{level:true,target:'hit',targets:['hit','dodge','ss','skill']}),
action('yell','エール',3,['AC','RE','EX'],'他者の判定に+1D6。重ね掛け不可。'),
action('heavy','重撃',1,['AC'],'異能者専用。通常攻撃と応用技を併用。攻撃発動とは併用不可。'),
action('head','ヘッドショット',2,['AC'],'命中固定値を半減、ダメージ+1D6。精神発動・全体攻撃とは併用不可。'),
action('ko','ノックアウト',3,['AC'],'NPCのHP条件を満たす攻撃で気絶判定を発生させる。'),
action('mercy','手加減',1,['AC'],'装甲を適用する前のダメージを半減。'),
action('hold','ホールド',3,['AC'],'ホールドを付与。通常攻撃・攻撃発動とは併用不可。',{main:true}),
action('squeeze','締め付け',1,['AC'],'ホールド対象へ格闘攻撃。威力半減。',{main:true,attack:'melee'}),
action('throw','投げ飛ばし',1,['AC'],'ホールド対象を含む1〜2人に格闘攻撃。その後ホールド解除。',{main:true,attack:'melee'}),
action('overclock','オーバークロック',0,['AC'],'対応する特殊武装を強化。使用後の故障ロールを行う。'),
action('abandonDodge','回避放棄',0,['RE'],'このリアクションの回避を自動失敗する。'),
action('cover','カバーリング',1,['RE'],'他者への物理攻撃を肩代わり。自身の回避不可。'),
action('counter','カウンター',1,['RE'],'倍差回避に成功した場合のみ。攻撃の消費を別途追加する。'),
action('painful','ペインフル',4,['RE'],'回避放棄またはカバー後、HP1以上で宣言。1バトル1回。',{limit:'battle'}),
action('scan','強度感知',1,['IN','AC','EX'],'観察眼または察知で対象のステータスを確認。'),
action('wait','待機',0,['IN','AC'],'行動順を最後へ。最遅ユニットは宣言不可。1R1回。',{limit:'round'}),
action('leave','離脱',0,['AC'],'バトルから離脱。攻撃行動とは併用不可。',{main:true}),
action('join','参戦',0,['IN'],'バトルに途中参加する。'),
action('joinAttack','参戦攻撃',3,['AC'],'参戦ラウンドに他者を対象とした行動をする場合。'),
action('skip','行動放棄',0,['AC'],'HP・PPを1回復。次ラウンドの行動値+4。他行動と併用不可。',{main:true,recoverHP:1,recoverPP:1}),
action('focus','集束',0,['IN','AC','RE'],'応用技との併用必須。空き枠分だけ精度上昇。1R1回。',{limit:'round'}),
action('supply','供給',1,['AC'],'マスター専用。消費PP分だけクリーチャーHP回復。',{level:true}),
action('surprise','不意打ち',2,['EX'],'隠密対察知。物理防御半減。戦闘開始前のみ。',{main:true}),
action('instant','瞬殺',3,['EX'],'力技または技術。成否・目標値はGM判断。',{main:true}),
action('aid','応急処置',1,['EX'],'知識または技術。達成値に応じた回復量を手動調整で登録。',{main:true}),
action('revive','蘇生',3,['EX'],'知識または技術で判定。成功後の2D6回復を手動調整で登録。',{main:true}),
...['怪力乱心','臥薪嘗胆','才気煥発','明鏡止水','画竜点睛','電光石火','運否天賦'].map((name,i)=>action('replace'+i,name,0,['AC','RE','EX'],'残PP÷2（切捨て）。固定値を対応パラメータで置換。合計2回/セッション。残PP3以下は不可。',{replace:i,limit:'session2'})),
action('hpB','HP回復バースト',0,['AC','RE','EN','EX'],'1因子につきHPを1D6回復。実際の出目を入力して登録。',{group:'バースト',factor:1,level:true,roll:'hp',rollDice:1}),
action('ppB','PP回復バースト',0,['AC','RE','EN','EX'],'1因子につきPPを1D6回復。PP回復は総消費を減らさない。',{group:'バースト',factor:1,level:true,roll:'pp',rollDice:1}),
action('suppressB','抑制バースト',0,['EN','EX'],'2因子につき暴走率を1D6減少。',{group:'バースト',factor:2,level:true,roll:'rageDown',rollDice:1}),
action('rageB','暴走バースト',0,['IN','EX'],'1因子につき暴走率を2D6上昇。',{group:'バースト',factor:1,level:true,roll:'rage',rollDice:2}),
action('checkB','判定バースト',0,['AC','RE','EX'],'1因子につき判定+1D6。',{group:'バースト',factor:1,level:true,target:'hit',targets:['hit','dodge','ss','skill']}),
action('releaseB','解除バースト',0,all,'1因子につき対象の応用技効果を1つ強制解除。',{group:'バースト',factor:1,level:true}),
action('awakeB','気絶復活バースト',0,all.filter(p=>p!=='RE'),'現在HPに2D6を加算。気絶状態を解除。',{group:'バースト',factor:2,roll:'hp',rollDice:2}),
action('dyingB','瀕死復活バースト',0,all.filter(p=>p!=='RE'),'HPを0に戻した後、2D6回復。',{group:'バースト',factor:3,roll:'revive',rollDice:2}),
action('deathB','即死復活バースト',0,all.filter(p=>p!=='RE'),'HPを0に戻した後、2D6回復。回復B併用不可。',{group:'バースト',factor:4,roll:'revive',rollDice:2}),
action('activateB','発動バースト',0,['AC','RE'],'AE併用不可。効果の無視は補正欄の有効/無効で管理。',{group:'バースト',factor:1}),
action('linkB','連携バースト',0,['AC','RE'],'味方への1アクション。攻撃等の禁止行動に注意。別途その行動を追加。',{group:'バースト',factor:1})
];
// AC permits only check and activation bursts; keep other timings unchanged.
for(const a of catalog)if(a.group==='バースト'&&!['checkB','activateB'].includes(a.id))a.phases=a.phases.filter(p=>p!=='AC');
function emptyCharacter(name='新しいキャラクター'){
 const stats={hpMax:30,ppMax:30,hit:10,hitDice:1,dodge:10,dodgeDice:1,ss:8,ssDice:1,melee:2,meleeFlat:0,weapon:2,weaponFlat:0,power:3,powerFlat:0,defense:3,resist:3,initiative:6,precision:6,spec:3,params:[6,6,6,6,6,6,6],skills:Object.fromEntries(skillNames.map(x=>[x,6]))};
 const state={hp:30,pp:30,rage:30,factor:0,spent:0,hpMax:30,ppMax:30,round:1,phase:'AC',buffs:[],usage:{},mainUsed:false,opponent:{name:'比較対象',fixed:10,dice:1,defense:3,resist:3,hp:30,rage:0},pending:[]};
 return {id:id(),name,activation:'反応型',stats,actions:[],source:'手動作成',state,initial:clone(state),history:[]};
}
function fromCells(sheets,filename,mode='progress'){
 const sheet=sheets['キャラシート'];if(!sheet)throw Error('「キャラシート」タブがありません。RW v0.3pre6.3形式の.xlsxを選んでください。');
 const val=(s,a)=>{let x=s?.[a];return x&&typeof x==='object'&&'v'in x?x.v:x;};
 const missing=[];const num=(s,a,required=true,fallback=0)=>{const x=val(s,a);if(x==null||x===''||!Number.isFinite(Number(x))){if(required)missing.push(a);return fallback;}return Number(x);};
 const c=emptyCharacter(String(val(sheet,'B3')||filename.replace(/\.xlsx$/i,'')));c.source=filename;c.activation=String(val(sheet,'F13')||'－');
 const maps={hpMax:'D17',ppMax:'D19',hit:'C33',hitDice:'D33',dodge:'C35',dodgeDice:'D35',ss:'C31',ssDice:'D31',melee:'G31',meleeFlat:'H31',weapon:'G33',weaponFlat:'H33',power:'G35',powerFlat:'H35',defense:'D23',resist:'D25',initiative:'D27',precision:'H25',spec:'H27'};
 for(const [k,a]of Object.entries(maps))c.stats[k]=num(sheet,a);
 c.stats.params=Array.from({length:7},(_,i)=>num(sheet,'AA'+(10+i)));
 const detection=detectBPSheet(sheet,c);c.state.bp=detection.config;c.bpDetection=detection;c.bpSourceFlag=detection.flag;
 c.stats.skills=Object.fromEntries(skillNames.map((s,i)=>[s,num(sheet,'P'+(15+i),false)+num(sheet,'Q'+(15+i),false)]));
 const p=sheets['進行表'];
 if(mode==='progress'&&p){for(const[k,a]of Object.entries({hp:'A20',pp:'C20',rage:'F20',spent:'C22',factor:'D22',hpMax:'B20',ppMax:'D20'}))c.state[k]=num(p,a);}
 else {c.state.hp=c.state.hpMax=c.stats.hpMax;c.state.pp=c.state.ppMax=c.stats.ppMax;c.state.rage=num(sheet,'D21');c.state.factor=num(sheet,'P4',false);}
 const a=sheets['応用技'];
 for(let i=0;i<8;i++){const r=9+11*i;const name=val(a,'B'+r);if(name&&String(name).trim()&&!/^[－\-0]$/.test(name)){
  const effects=['B','C','D','E','F','G','H','I','J'].flatMap(col=>[val(a,col+(r+3)),val(a,col+(r+4))]).filter(x=>x&&!/^[－\-]$/.test(x));
  const readCost=(address,unit)=>{const raw=val(a,address);if(raw==null)return null;const text=String(raw).normalize('NFKC').trim().replace(/[−–—]/g,'-');const match=text.match(unit==='pp'?/^(\d+)\s*(?:pp|p|点)?$/i:/^(-?\d+)\s*(?:sp|spec|点)?$/i);return match?Number(match[1]):null;};
  let cost=readCost('I'+r,'pp');const spec=readCost('J'+r,'spec');const note=String(val(a,'B'+(r+6))||'');
  const text=String(val(a,'I'+r)??'').normalize('NFKC').trim();
  const range=text.match(/^(\d+)\s*(?:PP)?\s*[～〜~－—–-]\s*(\d+)\s*(?:PP|P|点)?$/i);
  const creationRange=range&&Number(range[1])>=1&&Number(range[2])-Number(range[1])===9;
  const creation=creationRange||effects.some(x=>String(x).includes('創造'));
  if(creation){
   cost=creationRange?Number(range[1])-1:null;
   if(cost===null){const calc=sheets['計算用'],rule=String(val(sheet,'I3')||'').toUpperCase(),start=(rule==='RW'?9:rule==='バニラ'||rule==='VANILLA'?3:null);
    if(start!==null){const parts=[0,1,2].map(j=>val(calc,'C'+(start+12*i+j)));if(parts.every(x=>x!==null&&x!==undefined&&x!==''&&Number.isInteger(Number(x))&&Number(x)>=0))cost=parts.reduce((sum,x)=>sum+Number(x),0);}
    if(cost===null&&effects.length&&effects.every(x=>/^創造(?:系)?$/.test(String(x).trim())))cost=0;
   }
  }
  const importMissing=[];if(cost===null)importMissing.push({field:'pp',cell:'応用技!I'+r,raw:val(a,'I'+r)??''});if(spec===null)importMissing.push({field:'spec',cell:'応用技!J'+r,raw:val(a,'J'+r)??''});
  c.actions.push(action(id(),String(name),cost,['AC','RE'],effects.join(' / ')+(note?'：'+note:''),{group:'応用技',spec,importMissing,main:false,attack:effects.some(x=>String(x).includes('攻撃'))?'power':null,effects,...(creation?{ppMode:'creation'}:{})}));
 }}
 if(missing.length)throw Error('数式の保存済み計算結果がないセルがあります：'+[...new Set(missing)].join('、')+'。ExcelまたはLibreOfficeで再計算して保存し直してください。');
 // The standard sheet already subtracts technique pressure in X59. Restore
 // that part of the input before applying the current technique list below.
 const sheetPressure=Number(val(sheet,'X59')),pressureFormula=String(sheet.X59?.f||'').replace(/[$'\s]/g,'');
 const included=Number.isFinite(sheetPressure)&&sheetPressure<0&&pressureFormula==='応用技!G5+応用技!J5'&&Number(val(sheet,'AA59'))===c.stats.spec;
 c.specImport={pressureIncluded:included?-sheetPressure:0};
 if(included)c.stats.spec-=sheetPressure;
 api.importSession(c,sheets,mode);setBP(c,c.state.bp,{initial:true,previousPPBonus:0});c.importMode=mode;c.importedAt=new Date().toISOString();return c;
}
// Inspect cached results and known allocation relationships; never execute workbook formulas.
function detectBPSheet(sheet,c){
 const value=a=>{const x=sheet[a];return x&&typeof x==='object'?x.v:x;};
 const formula=a=>String(sheet[a]?.f||'').normalize('NFKC').toUpperCase().replace(/[\s$]/g,'').replace(/^=/,'');
 const number=(a,blank=null)=>{const v=value(a);if(v==null||v==='')return sheet[a]?.f?null:blank;if(/^[―－—-]$/.test(String(v)))return blank;return Number.isFinite(Number(v))?Number(v):null;};
 const sum=row=>{let total=0;for(const col of ['U','V','W','X','Y','Z']){const n=number(col+row,0);if(n===null)return null;total+=n;}return total;};
 const flag=String(value('T43')||'').normalize('NFKC').trim().toUpperCase();
 const [str,end,intel,,,agi]=c.stats.params,items=[];
 const add=(key,label,included,reason)=>items.push({key,label,included,reason});
 const config={enabled:flag==='ON',statsIncluded:flag==='ON',damageIncluded:false,defenseIncluded:null,ppIncluded:null};
 for(const [key,label,row,normal,extra]of [
  ['hit','命中',56,c.stats.params[4]+Math.floor(end/2),Math.floor(str/3)],
  ['dodge','回避',57,agi+Math.floor(intel/2),Math.floor(str/3)],
  ['initiative','行動値',54,Math.floor(intel/3)+Math.floor(agi/2),agi-Math.floor(agi/2)]]){
  const base=number('U'+row);let included=null,reason='基礎値・補正内訳と一致せず、入力値を保持';
  if(base!==null&&sum(row)===c.stats[key]){
   if(base===normal+extra){included=extra===0?flag==='ON':true;reason='基礎値と補正内訳からBP反映済みと判定';}
   else if(base===normal){included=false;reason='基礎値と補正内訳からBP未反映と判定';}
  }
  config[key+'Included']=included;add(key+'Included',label,included,reason);
 }
 if(flag!=='ON'&&flag!=='OFF'){
  const distinguishable=['hit','dodge','initiative'].filter(k=>k==='initiative'?agi-Math.floor(agi/2)!==0:Math.floor(str/3)!==0);
  config.enabled=distinguishable.length>0&&distinguishable.every(k=>config[k+'Included']===true);
 }
 for(const [key,label,row,param,threshold,bonus]of [['defense','防御',52,str,18,1],['pp','PP',50,end,18,3]]){
  let included=null,reason='特化補正の内訳を確認できず、入力値を保持';
  if(param<threshold){included=true;reason='パラメータが条件未満（追加なし）';}
  else if(sum(row)===c.stats[key==='pp'?'ppMax':key]){
   if(number('V'+row)===bonus){included=true;reason='特化補正欄の＋'+bonus+'を反映済み';}
   else if(number('V'+row)===0){included=false;reason='特化補正欄が0のため、BP採用時に＋'+bonus;}
  }
  config[key+'Included']=included;add(key+'Included',label,included,reason);
 }
 for(const [key,label,row,out]of [['melee','格闘',38,'G31'],['weapon','武器',39,'G33'],['power','能力',40,'G35']]){
  let included=null,reason='追加ダイスの由来を特定できず、入力値を保持';
  const dice=number('V'+row,0),flat=number('W'+row,0),budget=number('AA'+row),final=number(out),f=formula(out);
  const valid=[dice,flat,budget,final].every(x=>x!==null&&Number.isInteger(x)&&x>=0);
  if(str<14){included=false;reason='筋力14未満（追加なし）';}
  else if(valid){
   const base='V'+row,used=3*dice+flat;
   const strengthIf=['IF(AA10>=14,1,0)','IF(AA10<14,0,1)','IF(H17>=14,1,0)','IF(H17<14,0,1)'];
   // Match only explicit strength/BP conditions, not arbitrary +1.
   const explicit=strengthIf.some(x=>f===base+'+'+x)||
    ['IF(AND(T43="ON",AA10>=14),1,0)','IF(T43="ON",IF(AA10<14,0,1),0)'].some(x=>f===base+'+'+x);
   if(used===budget&&explicit&&final===dice+(f.includes('T43')?Number(flag==='ON'):1)){
    included=final===dice+1;reason='筋力条件付きの数式を照合（BPダイス'+(included?'反映済み':'未反映')+'）';
   }else if((f===base||f==='SUM('+base+')')&&final===dice){
    if(used===budget){included=false;reason='取得点を通常ダイス・固定値で全消費。BPの＋1D6は未反映';}
    else if(config.enabled&&dice>=1&&used===budget+3){included=true;reason='BP採用・取得点との照合で、通常取得分に＋1D6を含むと判定';}
   }
  }
  config[key+'Included']=included;add(key+'Included',label+'ダメージ',included,reason);
 }
 config.statsIncluded=['hit','dodge','initiative'].every(k=>config[k+'Included']===true);
 config.damageIncluded=['melee','weapon','power'].every(k=>config[k+'Included']===true);
 return{version:1,flag:['ON','OFF'].includes(flag)?flag:'未判定',config,items};
}
function activation(c,state=c.state){const lv=Math.max(0,Math.min(3,Math.floor((state.rage-40)/10)));return{lv,dice:state.rage>=90?2:state.rage>=80?1:0};}
function bpConfig(state){return{enabled:false,statsIncluded:false,damageIncluded:false,defenseIncluded:true,ppIncluded:true,...state.bp};}
function bpIncluded(b,key){return b[key+'Included']!==undefined?b[key+'Included']:['hit','dodge','initiative'].includes(key)?b.statsIncluded:b.damageIncluded;}
function bpBonuses(c,state=c.state){
 const b=bpConfig(state),strength=c.stats.params[0],endurance=c.stats.params[1],agility=c.stats.params[5];
 const delta=key=>bpIncluded(b,key)===null?0:Number(b.enabled)-Number(bpIncluded(b,key));
 const attack=Object.fromEntries(['melee','weapon','power'].map(k=>[k+'Dice',delta(k)*(strength>=14?1:0)]));
 return{hit:delta('hit')*Math.floor(strength/3),dodge:delta('dodge')*Math.floor(strength/3),initiative:delta('initiative')*(agility-Math.floor(agility/2)),...attack,
 damageDice:attack.meleeDice===attack.weaponDice&&attack.meleeDice===attack.powerDice?attack.meleeDice:0,
 defense:b.enabled&&b.defenseIncluded===false&&strength>=18?1:0,
 ppMax:b.enabled&&b.ppIncluded===false&&endurance>=18?3:0,
 stunImmune:b.enabled&&endurance>=18};
}
function setBP(c,config,{initial=false,previousPPBonus=bpBonuses(c).ppMax}={}){
 const s=clone(c.state);s.bp=bpConfig({bp:config});const delta=bpBonuses(c,s).ppMax-previousPPBonus;
 if(delta!==0){s.ppMax=Math.max(0,s.ppMax+delta);s.pp=Math.min(s.ppMax,Math.max(0,s.pp+delta));}
 if(initial){c.state=s;c.initial=clone(s);return;}
 return record(c,'Better Parameter設定を更新',s,{bp:s.bp},'settings');
}
function damageReduction(c,state=c.state){return c.activation==='増強型'?activation(c,state).lv:0;}
function reduceDamage(raw,armor=0,reduction=0,minimum=0){
 if(raw<=0)return Math.max(minimum,0);
 const reduced=reduction>0?Math.max(1,raw-reduction):raw;
 return Math.max(minimum,reduced-armor);
}
function damageTaken(c,raw,kind='physical'){
 if(!Number.isInteger(raw)||raw<0)throw Error('ダメージは0以上の整数で入力してください');
 if(!['physical','mental','ignore'].includes(kind))throw Error('ダメージ種別が不正です');
 const armor=kind==='ignore'?0:effective(c,kind==='mental'?'resist':'defense').fixed;
 const reduction=damageReduction(c),damage=reduceDamage(raw,armor,reduction);
 return{raw,armor,reduction,damage,afterHP:c.state.hp-damage,kind};
}
function takeDamage(c,raw,kind,note=''){
 const result=damageTaken(c,raw,kind),s=clone(c.state);s.hp=result.afterHP;
 return record(c,'被ダメージ '+result.damage,s,{...result,note},'damage');
}
function modifiers(c,key,target='self',state=c.state){let flat=0,dice=0,mult=1;for(const group of state.buffs){for(const effect of (group.effects||[group])){const b={...group,...effect};if(b.active!==false&&(b.target===target||b.target==='both')&&(b.stat===key||b.stat==='allChecks'&&['hit','dodge','ss','skill'].includes(key)||b.stat==='damage'&&['melee','weapon','power','damage'].includes(key))){flat+=Number(b.flat)||0;dice+=Number(b.dice)||0;mult*=Number(b.mult??1);}}}return{flat,dice,mult};}
function specPressure(c){return c.actions.reduce((sum,a)=>sum+(Number.isFinite(a.spec)&&a.spec<0?-a.spec:0),0);}
function effective(c,key,state=c.state){const a=activation(c,state),bp=bpBonuses(c,state),m=modifiers(c,key,'self',state);let flat=(c.stats[key]||0)+(bp[key]||0),dice=c.stats[key+'Dice']||0;const attack=['melee','weapon','power'].includes(key);
 if(attack){dice=(c.stats[key]||0)+bp[key+'Dice'];flat=c.stats[key+'Flat']||0;if(c.activation==='増強型')flat+=a.lv;}
 if(['hit','dodge','ss'].includes(key)){dice+=a.dice;if(c.activation==='反応型')flat+=a.lv;}
 if(key==='spec'&&c.activation==='覚醒型')flat+=a.lv;
 if(key==='initiative'&&c.activation==='感覚型')flat+=a.lv;
 return{fixed:Math.floor((flat+m.flat)*m.mult)-(key==='spec'?specPressure(c):0),dice:Math.max(0,dice+m.dice)};
}
function techniqueEffects(a){return (Array.isArray(a.effects)?a.effects.join(' / '):String(a.note||'').split('：')[0]).normalize('NFKC');}
function hasCharge(a){return a.group==='応用技'&&!a.chargeStep&&/チャージ/.test(techniqueEffects(a));}
function chargeActions(c){
 if(!c.actions.some(hasCharge)&&!c.state.charge)return [];
 const current=c.state.charge,source=current?.source;
 return ['count','release'].map(step=>({id:'charge-'+step,name:step==='count'?'チャージカウント':'チャージ完了',group:'応用技',phases:['AC','EX'],pp:0,hp:0,factor:0,rage:0,spec:0,main:true,chargeStep:step,chargeToken:current?.id||null,chargeSourceName:source?.name||'',
  ...(step==='release'?{attack:source?.attack||'power',mental:source?isMental(source):false,chargeCount:current?.count||0,effects:source?.effects||[]}:{}),
  note:step==='count'?'チャージカウントを1進めます。PPの追加消費はありません。':'蓄積カウント×3Dを命中・威力へ加えて攻撃し、チャージを終了します。'}));
}
function allActions(c){return [...c.actions,...catalog,...chargeActions(c)];}
function resolveDeclarationRows(c,rows){return api.resolveOwnedRows(c,rows).map(r=>r.action.chargeStep?{...r,action:chargeActions(c).find(a=>a.id===r.action.id)||r.action}:r);}
function chargeReason(c,a){
 const current=c.state.charge;
 if(hasCharge(a)&&current)return 'チャージ中です。完了または解除してから開始してください';
 if(!a.chargeStep)return '';
 if(!current)return '先にチャージを含む応用技を宣言・登録してください';
 if(a.chargeToken!==current.id)return 'チャージの状態が変わりました。選び直してください';
 if(a.chargeStep==='count'&&current.count>=current.level)return '宣言したチャージLvまで蓄積済みです';
 if(a.chargeStep==='release'&&current.count<current.level)return 'チャージカウントが不足しています（'+current.count+'/'+current.level+'）';
 return '';
}
function applyCharge(c,rows,after,errors){
 const operations=rows.filter(r=>hasCharge(r.action)||r.action.chargeStep);
 if(operations.length>1){errors.push('チャージの開始・カウント・完了は1つずつ宣言してください');return;}
 const row=operations[0];if(!row)return;
 if(rows.some(r=>r!==row&&r.action.attack))errors.push('チャージの宣言は他の攻撃行動と併用できません');
 const a=row.action,why=chargeReason(c,a);if(why){errors.push(why);return;}
 if(hasCharge(a))after.charge={id:a.id+'-charge-'+(c.history.length+1),source:clone(a),level:row.chargeLevel??1,count:1};
 else if(a.chargeStep==='count')after.charge={...clone(c.state.charge),count:c.state.charge.count+1};
 else after.charge=null;
}
function cancelCharge(c){if(!c.state.charge)return null;const s=clone(c.state);s.charge=null;return record(c,'チャージ解除',s,{},'charge');}
function techniqueBonuses(c,row,rows=[]){
 const a=row.action,precision=declaredValue(c,'precision',rows).fixed,unit=Math.floor(precision/3),items=[],notes=[];
 if(a.group!=='応用技'||a.chargeStep==='count')return {precision,unit,items,notes,effects:[]};
 const effects=(Array.isArray(a.effects)?a.effects:techniqueEffects(a).split('/')).flatMap(s=>String(s).normalize('NFKC').split(/[/／]/)).map(s=>s.replace(/\s+/g,''));
 const names={命:'hit',命中:'hit',命中力:'hit',回:'dodge',回避:'dodge',回避力:'dodge',攻:'damage',攻撃:'damage',攻撃力:'damage',防:'defense',防御:'defense',防御力:'defense',抵:'resist',抵抗:'resist',抵抗力:'resist',行:'initiative',行動値:'initiative',解:'release',解除:'release',解除判定:'release'};
 for(const text of effects){
  const m=text.match(/^(強化|減衰|追加)(?:系)?(?:【([^】]+)】|\[([^\]]+)\]|\(([^)]+)\))?(?:[×x*](\d+))?$/i);
  if(m){
   const kind=m[1],target=m[2]||m[3]||m[4]||'',count=Number(m[5]||1);if(!Number.isSafeInteger(count)||count<1||count>100){notes.push(text+'：重複数を確認してください');continue;}
   const stat=names[target]||(skillNames.includes(target)?'skill:'+target:null),flat=kind==='追加'?0:(kind==='減衰'?-1:1)*unit*count,dice=kind==='追加'?count:0;
   const key=kind+':'+(stat||target),existing=items.find(v=>v.key===key);
   if(existing){existing.flat+=flat;existing.dice+=dice;existing.count+=count;}
   else items.push({key,kind,stat,label:stat?(labels[stat]||({damage:'全攻撃の威力',release:'解除判定'})[stat]||target):target==='技'?'探索技能（対象を指定）':target||'補正項目を指定',flat,dice,mult:1,count});
  }else if(/^(拡張|制限)(?:系)?$/.test(text)){
   const kind=text.startsWith('拡張')?'拡張':'制限',flat=kind==='拡張'?1:-1;
   for(const label of ['各種判定','発動スペック']){const key=kind+':'+label,old=items.find(v=>v.key===key);if(old){old.flat+=flat;old.count++;}else items.push({key,kind,stat:null,label,flat,dice:0,mult:1,count:1});}
   notes.push('拡張・制限はリザルト以降に適用。判定結果への補正は適用する判定ごとに登録してください');
  }else if(/性質|晩成|限定|複製|縮小|衰弱/.test(text))notes.push(text+'：条件や固有処理は手動で確認してください');
 }
 if(items.some(v=>!v.stat))notes.push('対象が未指定の項目は、盤面の補正へ登録する際に指定してください');
 if(hasCharge(a))notes.push('チャージ開始時には効果を適用しません。チャージ完了の攻撃時に使用してください');
 return {precision,unit,items,notes:[...new Set(notes)],effects:items.filter(v=>v.stat).map(({stat,flat,dice,mult})=>({stat,flat,dice,mult}))};
}
function explorationInputs(c,rows=[]){
 const saved=c.state.explorationCheck||{},key=declarationKeys(rows).find(k=>k.startsWith('skill:')||['hit','dodge','ss'].includes(k)),value=key?declaredValue(c,key,rows):{fixed:null,dice:null};
 return {ownFixed:saved.ownFixed??value.fixed,ownDice:saved.ownDice??value.dice,targetFixed:Object.hasOwn(saved,'targetFixed')?saved.targetFixed:8,targetDice:Object.hasOwn(saved,'targetDice')?saved.targetDice:0,key,manual:saved.ownFixed!=null||saved.ownDice!=null};
}
function ppBudget(c,rows,desperate=0){
 rows=resolveDeclarationRows(c,rows);const total=rows.reduce((n,r)=>n+(declaredPP(r,c.state)||0),0),limit=desperateLimit(c,rows),credit=Math.min(Math.max(0,Number(desperate)||0),limit),actual=total-credit;
 const required=Math.max(Number(desperate)||0,total-c.state.pp,0);
 return {total,actual,limit,required,canFund:required<=limit,error:actual>c.state.pp?'実消費PP '+actual+' / 現在PP '+c.state.pp+'（'+(actual-c.state.pp)+'不足）':''};
}
function declarationLevelLimit(c,rows,row,field,desperate=0){
 const other=rows.filter(r=>r!==row),available=c.state.pp+Math.max(0,Number(desperate)||0)-other.reduce((n,r)=>n+(declaredPP(r,c.state)||0),0),a=row.action;
 if(field==='chargeLevel')return Math.max(0,Math.floor((available-(declaredPP({...row,chargeLevel:1},c.state)||0))/2)+1);
 if(field==='creationPP')return Math.max(0,Math.min(10,available-(declaredPP({...row,creationPP:1},c.state)||0)+1));
 return a.pp>0&&!a.owned&&a.replace===undefined?Math.max(0,Math.min(a.max||100,Math.floor((available-(hasCharge(a)?2*((row.chargeLevel??1)-1):0))/a.pp))):a.max||100;
}
function isMental(a){return a.mental===true||a.attack==='mental'||/精神/.test(techniqueEffects(a));}
function declarationInputError(row){
 const a=row.action;
 if(a.level&&(!Number.isInteger(row.level)||row.level<1||row.level>(a.max||100)))return (a.consumable?'使用個数':'宣言Lv')+'は1〜'+(a.max||100)+'の整数で指定してください';
 if(a.ppMode==='creation'&&(!Number.isInteger(row.creationPP)||row.creationPP<1||row.creationPP>10))return '創造PPを1〜10から選んでください';
 if(hasCharge(a)&&(!Number.isSafeInteger(row.chargeLevel===undefined?1:row.chargeLevel)||(row.chargeLevel===undefined?1:row.chargeLevel)<1))return 'チャージLvは1以上の整数で指定してください';
 if(a.targets&&!a.targets.includes(row.target))return '補正先を選んでください';
 if(a.id==='con'&&['defense','resist'].includes(row.target)&&row.level>5)return '装甲コンセはLv5までです';
 return '';
}
function declarationKeys(rows){
 const keys=new Set();
 for(const {action:a,target} of rows){
  if(hasCharge(a)||a.chargeStep==='count')continue;
  const effects=(a.effects||[]).join(' / '),mental=a.mental===true||a.attack==='mental'||/精神/.test(effects)||(!effects&&/精神(?:攻撃|発動)/.test(a.note||''));
  if(a.attack){keys.add(mental?'ss':'hit');keys.add(a.attack==='mental'?'power':a.attack);}
  if(a.id==='dodge')keys.add('dodge');if(a.id==='sense')keys.add('ss');
  if(a.explorationSkill)keys.add('skill:'+a.explorationSkill);
  if(a.id==='scan'){keys.add('skill:観察眼');keys.add('skill:察知');}
  if(a.id==='surprise')keys.add('skill:隠密');
  if(['aid','revive'].includes(a.id)){keys.add('skill:知識');keys.add('skill:技術');}
  if(a.id==='instant'){keys.add('skill:力技');keys.add('skill:技術');}
  if(a.id==='hold')keys.add('hit');
  if(a.id==='con'&&['initiative','defense','resist'].includes(target))keys.add(target);
 }
 return [...keys];
}
function declaredValue(c,key,rows=[],extra={}){
 rows=resolveDeclarationRows(c,rows);
 const skill=key.startsWith('skill:'),attack=['melee','weapon','power'].includes(key);
 let value;
 if(skill){const name=key.slice(6),m=modifiers(c,'skill'),a=activation(c);const specific=modifiers(c,key);m.flat+=specific.flat;m.dice+=specific.dice;m.mult*=specific.mult;const base=name==='能力精度'?c.stats.precision:c.stats.skills[name]||0;value={fixed:Math.floor((base+(c.activation==='感覚型'?a.lv:0)+m.flat)*m.mult),dice:Math.max(0,1+a.dice+m.dice)};}
 else value=effective(c,key);
 value.fixed+=Number(extra.fixed||0);value.dice+=Number(extra.dice||0);
 for(const r of rows){const a=r.action,target=attack?'damage':skill?'skill':key;const applies=r.target===target||key==='ss'&&r.target==='hit';if(applies&&a.id==='con')value.fixed+=Number(r.level||1);if(applies&&['boost','checkB'].includes(a.id))value.dice+=Number(r.level||1);}
 if(rows.some(r=>r.action.id==='head')){if(['hit','ss'].includes(key))value.fixed=Math.floor(value.fixed/2);if(attack)value.dice++;}
 const replace=rows.find(r=>r.action.replace!==undefined);if(replace&&['hit','ss'].includes(key))value.fixed=c.stats.params[replace.action.replace];
 const release=rows.find(r=>r.action.chargeStep==='release');
 if(release&&c.state.charge&&!chargeReason(c,release.action)){
  const a=release.action;if(key===(isMental(a)?'ss':'hit')||key===(a.attack==='mental'?'power':a.attack))value.dice+=3*c.state.charge.count;
 }
 if(key==='precision'&&rows.some(r=>r.action.id==='focus'))value.fixed+=Math.max(0,8-c.actions.filter(a=>a.group==='応用技').length);
 return value;
}
function comparisonContext(rows=[],selection='auto'){
 const choices={melee:{ownKey:'hit',enemyKey:'dodge',attack:'melee'},weapon:{ownKey:'hit',enemyKey:'dodge',attack:'weapon'},power:{ownKey:'hit',enemyKey:'dodge',attack:'power'},mental:{ownKey:'ss',enemyKey:'ss',attack:'power'},dodge:{ownKey:'dodge',enemyKey:'hit',defending:true},sense:{ownKey:'ss',enemyKey:'ss',defending:true}};
 let value=choices[selection],inferred=false;
 if(!value){
  const defense=rows.find(r=>['dodge','sense'].includes(r.action.id));
  const attack=rows.find(r=>r.action.attack&&!hasCharge(r.action)),hold=rows.some(r=>r.action.id==='hold');
  if(defense)value=choices[defense.action.id];
  else if(attack)value=isMental(attack.action)?choices.mental:choices[attack.action.attack];
  else if(hold)value={ownKey:'hit',enemyKey:'dodge'};
  inferred=!!value;
 }
 return {...(value||choices.weapon),mental:value?.ownKey==='ss',defending:!!value?.defending,ready:!!value,inferred};
}
function opponentCheck(opponent,key){
 const checks=opponent.checks||{};
 if(Object.prototype.hasOwnProperty.call(checks,key))return checks[key];
 if((opponent.checkKey||'dodge')===key)return {fixed:opponent.fixed,dice:opponent.dice};
 return {fixed:null,dice:null};
}
function withOpponentCheck(opponent,key,part,value){
 const next=clone(opponent),checks={...next.checks};
 const oldKey=next.checkKey||'dodge';if(!checks[oldKey])checks[oldKey]={fixed:next.fixed,dice:next.dice};
 checks[key]={...opponentCheck(next,key),[part]:value};next.checks=checks;next.checkKey=key;
 // Keep legacy numeric fields for older backups; null in checks means not entered.
 for(const field of ['fixed','dice'])next[field]=checks[key][field]??0;
 return next;
}
function validOpponentChecks(checks){
 return !!checks&&typeof checks==='object'&&!Array.isArray(checks)&&Object.entries(checks).every(([key,v])=>['hit','dodge','ss'].includes(key)&&v&&['fixed','dice'].every(part=>v[part]===null||Number.isSafeInteger(v[part])&&(part!=='dice'||v[part]>=0&&v[part]<=20)));
}
function declaredPP(row,state){
 if(row.action.owned)row=api.resolveOwnedRows({state},[row])[0];const a=row.action;
 const charge=hasCharge(a)?(row.chargeLevel===undefined?1:row.chargeLevel):1;if(!Number.isSafeInteger(charge)||charge<1)return null;
 let base;if(a.ppMode==='creation'){const v=row.creationPP;if(typeof v!=='number'||!Number.isInteger(v)||v<1||v>10||!Number.isInteger(a.pp)||a.pp<0)return null;base=a.pp+v;}
 else base=a.replace!==undefined?Math.floor(state.pp/2):Number(a.pp||0)*Number(row.level||1);
 const pp=base+2*(charge-1);return Number.isSafeInteger(pp)?pp:null;
}
function desperateLimit(c,rows){
 let pp=0,hp=0;for(const r of api.resolveOwnedRows(c,rows)){pp+=declaredPP(r,c.state)||0;hp+=(r.action.hp||0)*Number(r.level||1);}
 return Math.max(0,Math.min(pp,Math.floor((c.state.hp-hp)/2)));
}
function costLabel(a){return a.ppMode==='creation'?(a.pp===null?'固定追加PP未確認':(a.pp+1)+'〜'+(a.pp+10)+' PP（創造）'):a.replace!==undefined?'残PP ÷ 2':a.factor?a.factor+' Rd'+(a.level?' / Lv':''):a.pp?a.pp+' PP'+(a.level?' / Lv':''):'消費なし';}
function isBattle(state){return state.phase!=='EX';}
function phaseAllowed(a,state,rows=[]){
 const phase=state.phase,reactive=/オート|トラップ/.test(techniqueEffects(a));
 if(a.chargeStep)return ['AC','EX'].includes(phase);
 if(a.group==='応用技'&&phase==='RE')return reactive||rows.some(r=>r.action.id==='linkB');
 if(a.group==='応用技'&&phase==='EN')return reactive;
 if(a.group==='特殊武装'&&phase==='RE')return ['トラップボム','毒電波発生装置','アーマー','ワイヤートラップ','ブラックボックス'].includes(String(a.ownedName||a.name).normalize('NFKC').replace(/^特殊武装[/／]/,''));
 if(phase==='RE'&&['overclock','supply','heavy'].includes(a.id))return false;
 if(a.group==='バースト'){
  if(phase==='RE')return ['checkB','activateB','linkB'].includes(a.id);
  if(phase==='IN')return a.id==='rageB';
  if(phase==='AC')return ['checkB','activateB'].includes(a.id);
 }
 return a.phases.includes(phase)||!isBattle(state)&&a.group==='応用技';
}
function sameAction(a,b){return a.id===b.id||a.group===b.group&&['AE','応用技'].includes(a.group)&&a.name.normalize('NFKC').trim()===b.name.normalize('NFKC').trim();}
function actionMatches(a,query){const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase();const text=normalize([a.name,a.note,a.group,...(a.effects||[])].join(' '));return normalize(query).trim().split(/\s+/).every(term=>text.includes(term));}
function setMode(c,mode){if(!['battle','exploration'].includes(mode))throw Error('進行モードが不正です');const s=clone(c.state),battle=mode==='battle';if(battle===isBattle(s))return null;if(battle)s.phase=s.battlePhase||'AC';else{s.battlePhase=s.phase;s.phase='EX';}return record(c,battle?'バトル中に切替':'探索中に切替',s,{},'mode');}
function available(c,a,rows=[]){const charging=chargeReason(c,a);if(charging)return charging;if(a.spec<0)return '常時効果（'+(-a.spec)+' SP圧迫・宣言不要）';const owned=api.ownedReason(c,a);if(owned)return owned;if(a.pp===null||a.spec===null)return a.ppMode==='creation'?'固定追加PP・必要スペックを確認してください':'消費PP・必要スペックを確認してください';if(!phaseAllowed(a,c.state,rows))return 'このフェイズでは宣言不可';if(['AC','RE'].includes(c.state.phase)&&a.group==='基本行動'&&rows.some(r=>r.action.group==='基本行動'&&!sameAction(r.action,a)))return '基本行動は1つの宣言に1つまで';if(isBattle(c.state)&&(a.main||a.group==='応用技'&&c.state.phase==='AC')&&c.state.mainUsed)return 'このラウンドは行動済み';const u=c.state.usage;
 if(a.limit==='round'&&u[a.id+'@'+c.state.round])return 'このラウンドで使用済み';if(a.limit==='battle'&&u[a.id])return 'このバトルで使用済み';if(a.limit==='session2'&&(u.replacement||0)>=2)return '置き換えAEを2回使用済み';if(a.replace!==undefined&&c.state.pp<=3)return '残PP4以上が必要';if(a.spec>effective(c,'spec').fixed)return '必要スペック不足（SO発動はカスタム行動で登録）';return '';}
function preview(c,rows,desperate=0){const originalRows=rows;rows=resolveDeclarationRows(c,rows);const s=c.state;let freeRagePP=0;let hp=0,pp=0,factor=0,rage=0,rhp=0,rpp=0,spent=0;let errors=[],warnings=[];const names=rows.map(r=>r.action.id);let cons=0;const seen=new Set();
 for(const r of originalRows){const why=chargeReason(c,r.action);if(why)errors.push(why);}
 for(const r of rows){const a=r.action,l=Number(r.level||1);if(!Number.isInteger(l)||l<1||l>(a.max||100))errors.push(a.name+'：Lvが範囲外');const why=available(c,a,rows)||declarationInputError(r);if(why)errors.push(a.name+'：'+why);
 if([...seen].some(previous=>sameAction(previous,a)))errors.push(a.name+'：同じ行動は1つの宣言に1回だけ追加できます');seen.add(a);
 if(a.id==='con'){cons+=l;if(['defense','resist'].includes(r.target)&&l>5)errors.push('装甲コンセはLv5まで');}
 const chosen=declaredPP(r,s),p=chosen??0;
 if(chosen===null&&a.ppMode!=='creation')errors.push(a.name+'：消費PPを計算できません。宣言Lvを確認してください');
 if(a.ppMode==='creation'){if(chosen===null)errors.push(a.name+'：創造PPを1〜10の整数で選んでください');if(l!==1)errors.push(a.name+'：創造PPはLvとは別に指定してください');}
 if(![p,a.hp||0,a.factor||0,a.rage||0].every(x=>Number.isFinite(x)&&x>=0))errors.push(a.name+'：コストは0以上の数値で指定');
 if(a.noRagePP)freeRagePP+=p;pp+=p;hp+=(a.hp||0)*l;factor+=(a.factor||0)*l;rage+=(a.rage||0)*l;spent+=a.noSpent?0:p;rhp+=(a.recoverHP||0)*l;rpp+=(a.recoverPP||0)*l;
 if(a.roll){const n=a.rollDice*l;const v=Number(r.result);if(r.result==null||r.result===''||!Number.isInteger(v)||v<n||v>6*n)errors.push(a.name+'：'+n+'D6の実際の出目（'+n+'〜'+(6*n)+'）を入力');else if(a.roll==='hp')rhp+=v;else if(a.roll==='pp')rpp+=v;else if(a.roll==='revive')rhp+=v-s.hp;else if(a.roll==='rageDown')rage-=v;else rage+=v;}
 }
 if(cons>10)errors.push('コンセントレイションの合計はLv10まで');
 if(names.includes('skip')&&(rows.length>1||desperate>0))errors.push('行動放棄は他の宣言と併用不可');
 if(names.includes('activateB')&&rows.some(r=>r.action.group==='AE'))errors.push('発動バーストはAEと併用不可');
 if(names.includes('deathB')&&names.some(x=>['hpB','ppB'].includes(x)))errors.push('即死復活Bと回復Bは併用不可');
 if(names.includes('head')&&rows.some(r=>r.action.replace!==undefined))errors.push('置き換えAEとヘッドショットは併用不可');
 if(rows.filter(r=>r.action.replace!==undefined).length>1)errors.push('置き換えAEは1つずつ宣言してください');
 const conByTarget={};for(const r of rows.filter(r=>r.action.id==='con'))conByTarget[r.target]=(conByTarget[r.target]||0)+r.level;
 if((conByTarget.defense||0)>5||(conByTarget.resist||0)>5)errors.push('同じ装甲へのコンセは合計Lv5まで');
 if(names.includes('hold')&&rows.some(r=>r.action.attack))errors.push('ホールドと攻撃は併用不可');
 if(names.includes('leave')&&rows.some(r=>r.action.attack))errors.push('離脱と攻撃は併用不可');
 if(names.includes('focus')&&!rows.some(r=>r.action.group==='応用技'))errors.push('集束には応用技が必要');
 if(names.includes('heavy')&&rows.some(r=>r.action.attack==='power'))errors.push('重撃と攻撃発動は併用不可');
 if(rows.filter(r=>r.action.main).length>1)errors.push('メイン行動は1つずつ登録してください');
 if(['AC','RE'].includes(s.phase)&&rows.filter(r=>r.action.group==='基本行動').length>1)errors.push('基本行動は1つの宣言に1つまで');
 if(!Number.isInteger(desperate)||desperate<0||desperate>pp)errors.push('死力Lvは0〜消費PP以内');
 if(desperate>0&&hp+2*desperate>s.hp)errors.push('死力のHP消費は現在HP以内です（HP0ちょうどは可）');
 rage+=pp-freeRagePP+desperate;hp+=2*desperate;pp-=desperate;
 if(pp>s.pp)errors.push('PPが'+(pp-s.pp)+'不足しています');
 if(hp>s.hp)warnings.push('HP消費によってHPが0未満になります');
 const gained=Math.floor((s.spent+spent)/5)-Math.floor(s.spent/5);
 const after={...clone(s),hp:Math.min(s.hpMax,s.hp-hp+rhp),pp:Math.min(s.ppMax,s.pp-pp+rpp),rage:Math.max(0,s.rage+rage),spent:s.spent+spent,factor:s.factor-factor+gained};
 api.applyOwnedState(c,rows,after,errors,warnings);
 applyCharge(c,rows,after,errors);
 if(after.factor<0)warnings.push('因子の前借り：残り'+after.factor+' Rd');
 const thresholds=[50,60,70,80,90,100,110,120,130,140,150].filter(x=>s.rage<x&&after.rage>=x);
 for(const x of thresholds)warnings.push(x+'%到達'+([50,70,90,110,120,130,140].includes(x)?'：暴走・臨界処理を確認':'')+(x===150?'：因子崩壊':''));
 return{hp,pp,factor,rage,spent,gained,rhp,rpp,after,errors:[...new Set(errors)],warnings,thresholds};
}
function record(c,title,next,detail={},type='action'){const before=clone(c.state);const event={id:id(),time:new Date().toISOString(),type,title,round:before.round,phase:before.phase,before,after:clone(next),detail:clone(detail)};c.state=clone(next);c.history.push(event);return event;}
function commit(c,rows,desperate=0,note=''){const p=preview(c,rows,desperate);if(!rows.length)throw Error('行動を選んでください');if(p.errors.length)throw Error(p.errors.join('\n'));rows=resolveDeclarationRows(c,rows);const next=p.after;
 for(const r of rows){const a=r.action;if(isBattle(c.state)&&(a.main||a.group==='応用技'&&c.state.phase==='AC'))next.mainUsed=true;if(a.limit==='round')next.usage[a.id+'@'+next.round]=true;if(a.limit==='battle')next.usage[a.id]=true;if(a.replace!==undefined)next.usage.replacement=(next.usage.replacement||0)+1;if(a.id==='skip')next.buffs.push({id:id(),name:'行動放棄：次ラウンドIN +4',target:'self',stat:'initiative',flat:4,dice:0,mult:1,active:false,startRound:next.round+1,endRound:next.round+1});}
 next.pending=[...(next.pending||[]),...p.thresholds.map(x=>x+'%到達：活性・暴走・臨界処理')];
 const resolved=rows.map(r=>({...clone(r),declaredPP:declaredPP(r,c.state)}));
 return record(c,rows.map(r=>r.action.name+(r.action.ppMode==='creation'?'〔創造'+r.creationPP+'PP＋固定追加'+r.action.pp+'PP〕':r.level>1?' Lv'+r.level:'')+(hasCharge(r.action)?'〔チャージLv'+(r.chargeLevel??1)+'〕':'')+(r.action.chargeStep==='release'?'〔'+r.action.chargeCount+'カウント・命中/威力+'+(3*r.action.chargeCount)+'D〕':'')).join(' ＋ '),next,{...p,after:undefined,rows:resolved,note,desperate});}
function declarationActionCopy(row){
 const a=row.action,details=[],level=Number(row.level||1);
 if(a.level)details.push(a.consumable?'使用個数 '+level:'Lv'+level);
 if(a.targets)details.push('補正先 '+(labels[row.target]||({damage:'ダメージ',skill:'技能・解除'})[row.target]||row.target||'未選択'));
 if(a.ppMode==='creation')details.push('創造PP '+(row.creationPP??'未選択'));
 if(hasCharge(a))details.push('チャージLv'+(row.chargeLevel===undefined?1:row.chargeLevel));
 if(a.chargeStep&&a.chargeSourceName)details.push(a.chargeSourceName);
 if(a.chargeStep==='release')details.push((a.chargeCount||0)+'カウント・命中/威力+'+(3*(a.chargeCount||0))+'D');
 if(a.itemTarget)details.push('対象 '+(row.itemTarget==='other'?'他者':'自分'));
 return String(a.name??'').replace(/\r\n?/g,'\n').trim()+(details.length?'（'+details.join('・')+'）':'');
}
function declarationCopy(c,rows,desperate=0,note=''){
 if(!rows.length)return '';
 const lines=rows.map(declarationActionCopy);
 if(desperate)lines.push('死力 Lv'+desperate);
 if(String(note).trim())lines.push(String(note).replace(/\r\n?/g,'\n'));
 return lines.join('\n');
}
function rollback(c,eventId){const e=c.history.find(e=>e.id===eventId);const next=eventId==='initial'?c.initial:e?.after;if(!next)throw Error('履歴が見つかりません');return record(c,'巻き戻し：'+(e?.title||'読み込み時'),next,{target:eventId},'rollback');}
function nextRound(c){if(!isBattle(c.state))throw Error('探索中はラウンドを進めません');const s=clone(c.state);s.round++;s.phase='IN';s.mainUsed=false;for(const b of s.buffs){if(b.startRound&&s.round>=b.startRound)b.active=true;if(b.endRound&&s.round>b.endRound)b.active=false;}return record(c,'ラウンド '+s.round+' 開始',s,{},'round');}
// Joint PMF of signed die contribution and critical count; infinite tail < 1e-10.
const cache=new Map();
function checkDistribution(fixed,n,mode='cf'){
 if(!Number.isInteger(n)||n<0||n>100||!Number.isFinite(fixed)||Math.abs(fixed)>10000)throw Error('判定ダイスは0〜100、固定値は±10000の範囲です');
 const key=n+':'+mode;let d=cache.get(key);
 if(!d){let one=[];if(mode==='normal'){for(let v=1;v<=6;v++)one.push([v,0,1/6]);}else{
  for(let v=1;v<=6;v++)one.push([1-v,0,1/36]);for(let v=2;v<=5;v++)one.push([v,0,1/6]);
  for(let k=1;k<=14;k++)for(let v=1;v<=5;v++)one.push([6*k+v,k,Math.pow(1/6,k+1)]);
 }
 d=new Map([['0,0',1]]);for(let i=0;i<n;i++){const nd=new Map();for(const [k,p]of d){const[v,c]=k.split(',').map(Number);for(const[w,e,q]of one){const prob=p*q;if(prob<1e-16)continue;const key=(v+w)+','+(c+e);nd.set(key,(nd.get(key)||0)+prob);}}d=nd;}cache.set(key,d);}
 const joint=[],pmf=new Map();let mean=0,mass=0;for(const[k,p]of d){const[v,c]=k.split(',').map(Number);const score=Math.max(1,fixed+v);joint.push({score,crits:c,p});pmf.set(score,(pmf.get(score)||0)+p);mean+=score*p;mass+=p;}return{joint,pmf,mean,mass};
}
const damageCache=new Map();
function damageMean(n,flat,armor,half=false,minimum=0,reduction=0){const key=[n,flat,armor,half,minimum,reduction].join(':');if(damageCache.has(key))return damageCache.get(key);let d=new Map([[0,1]]);for(let i=0;i<n;i++){let nd=new Map();for(const[v,p]of d)for(let k=1;k<=6;k++)nd.set(v+k,(nd.get(v+k)||0)+p/6);d=nd;}let ev=0;for(const[v,p]of d){let raw=Math.max(1,v+flat);if(half)raw=Math.floor(raw/2);ev+=reduceDamage(raw,armor,reduction,minimum)*p;}damageCache.set(key,ev);return ev;}
function compare(opts){const{ownFixed,ownDice,enemyFixed,enemyDice,damageDice=0,damageFlat=0,armor=0,mode='cf',tie='reroll',half=false,minimum=0,reduction=0}=opts;
 const a=checkDistribution(ownFixed,ownDice,mode),b=checkDistribution(enemyFixed,enemyDice,mode);let win=0,equal=0,double=0,ev=0;const tieWeight=tie==='attacker'?1:tie==='defender'?0:.5;
 for(const x of a.joint){let low=0,eq=0,dbl=0;for(const[y,p]of b.pmf){if(x.score>y){low+=p;if(x.score>=2*y)dbl+=p;}else if(x.score===y)eq+=p;}
  const hit=low+eq*tieWeight;win+=x.p*hit;equal+=x.p*eq;double+=x.p*dbl;
  const smash=mode==='cf'?Math.floor(x.crits/2):0;ev+=x.p*((hit-dbl)*damageMean(damageDice+smash,damageFlat,armor,half,minimum,reduction)+dbl*damageMean(damageDice+smash+1,damageFlat,armor,half,minimum,reduction));
 }
 return{win,equal,double,damage:ev,onHit:win?ev/win:0,ownMean:a.mean,enemyMean:b.mean,own:a.pmf,enemy:b.pmf,tail:Math.max(0,1-a.mass*b.mass)};
}
function validateDatabase(data){
 const fail=()=>{throw Error('バックアップのデータ形式が不正です');};
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9-]+$/.test(x);
 const state=s=>{api.validateSession(s,fail);if(!s||!Array.isArray(s.buffs)||!s.opponent||!s.usage)fail();for(const k of ['hp','pp','rage','factor','spent','hpMax','ppMax','round'])if(!finite(s[k]))fail();if(s.charge!=null){const q=s.charge;if(!q||!validId(q.id)||!q.source||!validId(q.source.id)||typeof q.source.name!=='string'||!hasCharge(q.source)||!Number.isSafeInteger(q.level)||q.level<1||!Number.isSafeInteger(q.count)||q.count<1||q.count>q.level)fail();}if(s.explorationCheck!==undefined){const q=s.explorationCheck;if(!q||typeof q!=='object'||Array.isArray(q))fail();for(const k of ['ownFixed','ownDice','targetFixed','targetDice'])if(q[k]!=null&&(!Number.isInteger(q[k])||Math.abs(q[k])>10000||(k.endsWith('Dice')&&(q[k]<0||q[k]>100))))fail();}if(s.info!==undefined&&typeof s.info!=='string')fail();if(s.spent<0||s.round<1||!phases[s.phase])fail();if(s.battlePhase!==undefined&&!['IN','AC','RE','EN'].includes(s.battlePhase))fail();if(s.bp!==undefined){if(!s.bp||typeof s.bp!=='object'||Array.isArray(s.bp))fail();if(s.bp.enabled!==undefined&&typeof s.bp.enabled!=='boolean')fail();for(const k of ['statsIncluded','damageIncluded','defenseIncluded','ppIncluded','hitIncluded','dodgeIncluded','initiativeIncluded','meleeIncluded','weaponIncluded','powerIncluded'])if(s.bp[k]!==undefined&&s.bp[k]!==null&&typeof s.bp[k]!=='boolean')fail();}if(s.opponent.checkKey!==undefined&&!['hit','dodge','ss'].includes(s.opponent.checkKey))fail();if(s.opponent.checks!==undefined&&!validOpponentChecks(s.opponent.checks))fail();if(s.opponent.rage!==undefined&&!finite(s.opponent.rage))fail();if(s.opponent.activation!==undefined&&typeof s.opponent.activation!=='string')fail();for(const b of s.buffs){if(!validId(b.id)||typeof b.name!=='string'||!['self','enemy','both'].includes(b.target)||!finite(b.flat)||!finite(b.dice)||!finite(b.mult))fail();if(b.effects!==undefined){if(!Array.isArray(b.effects)||!b.effects.length)fail();for(const e of b.effects)if(typeof e.stat!=='string'||!finite(e.flat)||!finite(e.dice)||!finite(e.mult))fail();}}for(const k of['fixed','dice','defense','resist','hp'])if(!finite(s.opponent[k]))fail();};
 if(data?.version!==1||!Array.isArray(data.characters)||data.characters.length>200)fail();
 for(const c of data.characters){if(!validId(c.id)||typeof c.name!=='string'||!c.stats||!Array.isArray(c.history)||!Array.isArray(c.actions)||!c.initial)fail();state(c.state);state(c.initial);if(!Array.isArray(c.stats.params)||c.stats.params.length!==7||!c.stats.params.every(finite)||!c.stats.skills)fail();for(const[k,v]of Object.entries(c.stats)){if(!['params','skills'].includes(k)&&!finite(v))fail();}for(const e of c.history){if(!validId(e.id)||typeof e.title!=='string'||!finite(e.round)||!phases[e.phase])fail();state(e.before);state(e.after);}for(const a of c.actions){if(!validId(a.id)||typeof a.name!=='string'||!Array.isArray(a.phases)||!a.phases.every(p=>phases[p])||!finite(a.pp))fail();if(a.ppMode!==undefined&&!['fixed','creation'].includes(a.ppMode))fail();if(a.ppMode==='creation'&&(!Number.isInteger(a.pp)||a.pp<0||a.level))fail();}}
 for(const c of data.characters)api.upgradeOwned(c);
 return data;
}
const api={chargeActions,allActions,resolveDeclarationRows,chargeReason,cancelCharge,ppBudget,declarationLevelLimit,techniqueBonuses,explorationInputs,hasCharge,techniqueEffects,isMental,desperateLimit,comparisonContext,opponentCheck,withOpponentCheck,validOpponentChecks,declarationInputError,declarationKeys,declaredValue,clone,id,labels,skillNames,phases,catalog,emptyCharacter,fromCells,detectBPSheet,activation,bpConfig,bpIncluded,bpBonuses,setBP,damageReduction,reduceDamage,damageTaken,takeDamage,modifiers,specPressure,effective,declaredPP,costLabel,isBattle,phaseAllowed,sameAction,actionMatches,setMode,available,preview,record,commit,declarationActionCopy,declarationCopy,rollback,nextRound,checkDistribution,damageMean,compare,validateDatabase};
Object.assign(api,(root.YggSessionModel||(typeof require==='function'?require('./session-model.js'):null))(api,root.YggOwnedCatalog||(typeof require==='function'?require('./owned-catalog.js'):[])));
if(typeof module!=='undefined')module.exports=api;root.Ygg=api;
})(globalThis);
