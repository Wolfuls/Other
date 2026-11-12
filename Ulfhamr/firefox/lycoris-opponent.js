(function(root){
'use strict';
const normalize=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').toLowerCase().replace(/[−–—]/g,'-');
function parse(raw,key){
 const s=normalize(raw).replace(/%$/,'');
 if(/^-?\d+$/.test(s))return Number.isSafeInteger(Number(s))?Number(s):null;
 const front=s.match(/^(\d+)d6?([+-]\d+)?$/),back=s.match(/^(-?\d+)\+(\d+)d6?$/);
 if(!['fixed','dice'].includes(key)||!front&&!back)return null;
 return front?(key==='dice'?Number(front[1]):Number(front[2]||0)):(key==='dice'?Number(back[2]):Number(back[1]));
}
if(typeof module!=='undefined')module.exports={parse,normalize};
if(typeof document==='undefined')return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={hp:'相手HP',fixed:'判定の固定値',dice:'判定ダイス数',defense:'防御力',resist:'抵抗力',rage:'暴走率'};
let candidates=[],selected=null,context=null,tabId=null,busy=false;
const panel=()=>document.getElementById('lyc-opponent-picker');
async function activeTab(){const [tab]=await browser.tabs.query({active:true,currentWindow:true});if(!tab?.url?.startsWith('https://udonarium-lycoris.ddns.net/'))throw Error('リコリスのタブを選択してください。');return tab;}
async function send(payload){const r=await browser.tabs.sendMessage(tabId,{channel:'ulfhamr-lycoris-v1',...payload});if(!r?.ok)throw Error(r?.error||'コマを読み込めませんでした。');return r.data;}
function aliases(key){return ({hp:['hp','体力'],fixed:context.compareMental?['ss','ss固定値']:['回避','回避力','回避固定値'],dice:context.compareMental?['ssダイス','ss判定ダイス']:['回避ダイス','回避判定ダイス'],defense:['防御','防御力'],resist:['抵抗','抵抗力'],rage:['暴走率','暴走']})[key];}
function automatic(key){const hits=selected.fields.filter(f=>aliases(key).includes(normalize(f.label))&&parse(f.raw,key)!==null);if(hits.length===1)return hits[0];
 if(key==='dice'){const combined=selected.fields.filter(f=>aliases('fixed').includes(normalize(f.label))&&/d/i.test(f.raw)&&parse(f.raw,'dice')!==null);if(combined.length===1)return combined[0];}return null;}
function draw(){
 const p=panel();if(!p)return;
 p.innerHTML='<div class="row wrap"><label>開いている相手コマ<select id="lyc-opponent-select">'+candidates.map(s=>'<option value="'+esc(s.id)+'" '+(selected?.id===s.id?'selected':'')+'>'+esc(s.name||'名称なし')+'</option>').join('')+'</select></label><button type="button" data-lyc-opponent="scan">一覧を更新</button></div>';
 if(!selected)return;
 const activation=selected.fields.find(f=>['活性','活性タイプ'].includes(normalize(f.label)))?.raw||'－';
 p.innerHTML+='<p class="usage-note">'+(context.compareMental?'SS 対 SS':'命中 対 回避')+'。コマの値を読み込みました。未取得の項目は入力してください。判定値はBP・活性込みの値を指定します。相手コマ自体は変更しません。</p><div class="lyc-opponent-fields">'+Object.entries(labels).map(([key,label])=>{
  const found=automatic(key);return '<label>'+label+'<select data-lyc-source="'+key+'"><option value="">手入力</option>'+selected.fields.filter(f=>parse(f.raw,key)!==null).map(f=>'<option value="'+esc(f.id)+'" '+(f.id===found?.id?'selected':'')+'>'+esc(f.label)+'：'+esc(f.raw)+'</option>').join('')+'</select><input type="number" step="1" data-lyc-value="'+key+'" aria-label="読込後の'+label+'" value="'+(found?parse(found.raw,key):'')+'" placeholder="未取得・手入力"></label>';
 }).join('')+'<label>活性タイプ<select id="lyc-opponent-activation">'+['－','覚醒型','増強型','反応型','感覚型','回復型'].map(v=>'<option '+(v===activation?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div><button type="button" data-lyc-opponent="apply">この相手を期待値計算に反映</button><p role="status" id="lyc-opponent-message"></p>';
}
async function scan(){
 context=root.UlfhamrLycoris.snapshot();if(!context)throw Error('先にキャラクターを選択してください。');tabId=(await activeTab()).id;
 candidates=await send({type:'list-sheets'});if(!candidates.length)throw Error('リコリスで比較したいコマのキャラクターシートを開いてください。');
 selected=candidates.find(s=>s.name!==context.name)||candidates[0];draw();
}
async function apply(){
 if(!selected)throw Error('相手コマを選んでください。');if((await activeTab()).id!==tabId)throw Error('対象タブが変わりました。一覧を更新してください。');
 const [fresh]=await send({type:'read-opponent',sheetId:selected.id});if(!fresh||fresh.name!==selected.name||JSON.stringify(fresh.fields)!==JSON.stringify(selected.fields))throw Error('相手コマの値が変わりました。一覧を更新してください。');
 const values={name:selected.name,activation:panel().querySelector('#lyc-opponent-activation').value};
 for(const key of Object.keys(labels)){const raw=panel().querySelector('[data-lyc-value="'+key+'"]').value;if(!raw.trim())throw Error(labels[key]+'を入力してください。');values[key]=Number(raw);}
 root.UlfhamrLycoris.importOpponent(context.id,context.compareMental,values);
}
document.addEventListener('change',e=>{
 if(e.target.id==='lyc-opponent-select'){selected=candidates.find(s=>s.id===e.target.value);draw();}
 const key=e.target.dataset.lycSource;if(key){const f=selected?.fields.find(f=>f.id===e.target.value);if(f)panel().querySelector('[data-lyc-value="'+key+'"]').value=parse(f.raw,key);}
});
document.addEventListener('click',async e=>{
 const operation=e.target.dataset.lycOpponent;if(!operation||busy)return;busy=true;
 try{if(operation==='scan')await scan();else if(operation==='apply')await apply();}
 catch(error){const p=panel();if(p){let el=p.querySelector('#lyc-opponent-message');if(!el){el=document.createElement('p');el.id='lyc-opponent-message';el.setAttribute('role','status');p.append(el);}el.className='lyc-error';el.textContent=/receiving end|Could not establish/i.test(error.message)?'リコリスを再読み込みしてから、一覧を更新してください。':error.message;}}
 finally{busy=false;}
});
})(globalThis);
