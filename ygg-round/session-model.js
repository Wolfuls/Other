(function(root){
'use strict';
function install(Y,catalog){
const normalize=s=>String(s??'').normalize('NFKC').replace(/[\s【】\[\]]/g,'').toLowerCase();
const groups=['特殊武装','SPE','カルマ','消費アイテム'];
function ownedFromCells(sheet){
 const value=k=>{const v=sheet[k];return v&&typeof v==='object'?v.v:v;};
 const slots=[['C13','SPE'],['J6','カルマ'],...Array.from({length:12},(_,i)=>['B'+(40+i),'特殊武装']),...Array.from({length:12},(_,i)=>['E'+(40+i),'消費アイテム'])];
 const result=[];
 for(const [cell,group] of slots){
  const raw=String(value(cell)??'').normalize('NFKC').trim();if(!raw||/^[-―ー—0]+$/.test(raw))continue;
  for(const part of raw.split(/[\n、,;；]+/).filter(Boolean)){
   const amount=part.match(/(?:[×x*]\s*(\d+)|\s+(\d+)\s*(?:個|つ|本|枚))\s*$/i);
   const quantity=amount?Number(amount[1]||amount[2]):1;
   const text=normalize(amount?part.slice(0,amount.index):part);
   const matches=catalog.filter(a=>a.group===group&&(normalize(a.ownedName)===text||text===normalize(group)+normalize(a.ownedName)||text.startsWith(normalize(a.ownedName)+'(')));
   const entries=matches.length?matches:[{name:part.trim(),ownedName:part.trim(),group,owned:true,pp:0,hp:0,factor:0,rage:0,spec:0,phases:['IN','AC','RE','EN','EX'],needsReview:true,note:'シートから読み込んだ名称です。効果・使用コスト・条件を編集で確認してください。',...(group==='消費アイテム'?{consumable:true,level:true,max:99}:{})}];
   for(const entry of entries){const prior=result.find(a=>a.name===entry.name&&a.group===group);if(prior){if(entry.consumable||group==='特殊武装')prior.quantity+=quantity;continue;}result.push({...Y.clone(entry),id:Y.id(),quantity,sourceCell:'キャラシート!'+cell});}
  }
 }
 return result;
}
function mergeOwned(c,entries,{initial=false}={}){
 const s=Y.clone(c.state);s.ownedStock=s.ownedStock||{};s.ownedUses=s.ownedUses||{};let added=0;
 for(const a of entries){if(c.actions.some(b=>b.owned&&b.group===a.group&&normalize(b.name)===normalize(a.name)))continue;c.actions.push(Y.clone(a));if(a.consumable)s.ownedStock[a.id]=a.quantity||0;added++;}
 if(initial)c.state=s;else Y.record(c,'所持品を読込：'+added+'件追加',s,{},'inventory');
 return added;
}
function importSession(c,sheets,mode){
 mergeOwned(c,ownedFromCells(sheets['キャラシート']||{}),{initial:true});
 if(mode!=='progress'||!sheets['進行表'])return;
 const p=sheets['進行表'],num=k=>{const v=p[k]?.v??p[k];return v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;};
 const hp=num('L24'),pp=num('L26'),dh=c.state.hpMax-c.stats.hpMax,dp=c.state.ppMax-c.stats.ppMax;
 const direct=hp!==null&&pp!==null&&hp===dh&&pp===dp;
 if(dh>0||dp>0)c.state.condition={hp:Math.max(0,dh),pp:Math.max(0,dp),weaponBonus:null,source:direct?'sheet':'maxima',applied:true};
}
function weaponBonus(c){return c.actions.filter(a=>a.owned&&a.group==='特殊武装').reduce((sum,a)=>sum+(a.pressure||0)*(a.quantity||1)*3,0);}
function applyCondition(c,{hpRoll,ppRoll,bonus=weaponBonus(c),reroll=false,maximumId=null}){
 for(const v of [hpRoll,ppRoll])if(!Number.isInteger(v)||v<2||v>12)throw Error('HP・PPの2D6の出目は2〜12の整数で入力してください');
 if(!Number.isInteger(bonus)||bonus<0||bonus>300)throw Error('武装によるHPボーナスを確認してください');
 const s=Y.clone(c.state),old=s.condition||{hp:0,pp:0};
 if(reroll&&!s.condition?.applied)throw Error('先に初回のコンディションを登録してください');
 if(maximumId){const item=c.actions.find(a=>a.id===maximumId&&a.conditionItem);if(!item||ownedRemaining(c,item)<1)throw Error('マキシマムを所持していません');if(s.condition?.applied)throw Error('マキシマムはセッション開始時に使用します');hpRoll=ppRoll=10;s.ownedStock=s.ownedStock||{};s.ownedStock[maximumId]=ownedRemaining(c,item)-1;}
 const hp=hpRoll+bonus,pp=ppRoll,dh=hp-old.hp,dp=pp-old.pp;
 if(s.hpMax+dh<1||s.ppMax+dp<0)throw Error('セッション最大値が不正になります');
 s.hpMax+=dh;s.ppMax+=dp;s.hp=Math.min(s.hpMax,s.hp+dh);s.pp=Math.max(0,Math.min(s.ppMax,s.pp+dp));s.rage=Math.max(0,s.rage+dp);if(reroll)s.factor--;
 s.condition={hp,pp,hpRoll,ppRoll,weaponBonus:bonus,source:'tool',applied:true};
 for(const x of [50,60,70,80,90,100,110,120,130,140,150])if(c.state.rage<x&&s.rage>=x)s.pending.push(x+'%到達：活性・暴走・臨界処理');
 return Y.record(c,reroll?'コンディションを振り直し（1 Rd）':old.hp||old.pp?'コンディションを訂正':'コンディションロール',s,{note:'HP '+hpRoll+' + 武装 '+bonus+' / PP '+ppRoll+'、暴走率 '+(dp>=0?'+':'')+dp+'%',factor:reroll?1:0},'condition');
}
function useKey(a,s){return a.id+(a.usePeriod==='round'?'@'+s.round:a.usePeriod==='battle'?'@battle'+(s.battleSerial||1):'');}
function ownedRemaining(c,a){return a.consumable?(c.state.ownedStock?.[a.id]??0):a.useLimit?Math.max(0,a.useLimit-(c.state.ownedUses?.[useKey(a,c.state)]||0)):null;}
function ownedReason(c,a){
 if(!a.owned)return '';
 if(a.needsReview)return '効果とコストの確認が必要です（編集）';
 if(a.passive)return '常時効果：宣言不要。読込済みの能力値に重ねて加算しません';
 if(a.conditionItem)return 'コンディション欄から使用してください';
 if(ownedRemaining(c,a)===0)return a.consumable?'残数がありません':'使用回数の上限です';
 return '';
}
function resolveOwnedRows(c,rows){return rows.map(r=>{
 if(!r.action.owned)return r;
 const row=Y.clone(r),a=row.action;
 if(a.dynamicPP==='remainingMinusOne')a.pp=Math.max(0,c.state.pp-1);
 for(const key of a.variableCosts||[]){const v=r['owned-'+key];if(!Number.isInteger(v)||v<0)a.missingOwnedCost=true;a[key]=Number.isInteger(v)&&v>=0?v:0;}
 if(a.itemTarget&&r.itemTarget==='other'){delete a.roll;a.main=Y.isBattle(c.state)&&c.state.phase==='AC';a.manualEffect=true;}
 return row;
});}
function applyOwnedState(c,rows,after,errors,warnings){
 after.ownedUses=after.ownedUses||{};after.ownedStock=after.ownedStock||{};
 for(const r of rows){const a=r.action;if(!a.owned)continue;const quantity=Number(r.level||1),remaining=ownedRemaining(c,a);
  if(remaining!==null&&quantity>remaining)errors.push(a.name+'：残数・使用回数が不足しています');
  if(a.missingOwnedCost)errors.push(a.name+'：今回のコストを0以上の整数で入力してください');
  if(a.main&&Y.isBattle(c.state))after.mainUsed=true;
  if(a.consumable)after.ownedStock[a.id]=(remaining||0)-quantity;
  if(a.useLimit){const key=useKey(a,c.state);after.ownedUses[key]=(after.ownedUses[key]||0)+quantity;}
  if(a.manualEffect){warnings.push(a.name+'：効果・反動・対象への処理は登録後に確認してください');after.pending=[...(after.pending||[]),a.name+'：効果・反動を処理'];}
 }
 if(rows.some(r=>r.action.owned&&r.action.damageAction)&&rows.filter(r=>r.action.damageAction||r.action.attack).length>1)errors.push('特殊武装のダメージアクションは、他のダメージアクションと併用できません');
}
function changePhase(c,phase){if(!['IN','AC','RE','EN'].includes(phase))throw Error('フェイズが不正です');const s=Y.clone(c.state);s.phase=phase;return Y.record(c,'フェイズ変更：'+Y.phases[phase],s,{},'phase');}
function validateSession(s,fail){
 if(!s){fail();return;}
 for(const prop of ['ownedStock','ownedUses'])if(s[prop]!==undefined){if(!s[prop]||typeof s[prop]!=='object'||Array.isArray(s[prop]))fail();for(const n of Object.values(s[prop]))if(!Number.isInteger(n)||n<0)fail();}
 if(s.condition!==undefined){const x=s.condition;if(!x||typeof x!=='object'||!Number.isInteger(x.hp)||x.hp<0||!Number.isInteger(x.pp)||x.pp<0)fail();}
}
return {ownedCatalog:catalog,ownedGroups:groups,ownedFromCells,mergeOwned,importSession,weaponBonus,applyCondition,ownedRemaining,ownedReason,resolveOwnedRows,applyOwnedState,changePhase,validateSession,ownedUseKey:useKey};
}
if(typeof module!=='undefined')module.exports=install;root.YggSessionModel=install;
})(globalThis);
