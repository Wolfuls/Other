'use strict';
(() => {
 const root=document.getElementById('lycoris-integration'),keys=[['hp','HP',['hp']],['pp','PP',['pp']],['rage','暴走率',['暴走率','暴走']],['factor','因子D',['因子d','因子','因子ダイス','因子rd']],['initiative','行動値',['行動値']],['info','情報',['情報']]];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 let tabId=null,sheet=null,char=null,mapping={},busy=false,savedMaps={},chatContext=null;
 root.innerHTML=`<details class="lyc-panel"><summary>リコリスと連携 <span id="lyc-status">未接続</span></summary><div class="lyc-body"><p>リコリスで対象コマのキャラクターシートを一つだけ開いてください。</p><button id="lyc-scan" type="button">開いているコマを確認</button><div id="lyc-details"></div><label><input id="lyc-notify" type="checkbox" checked>宣言登録・巻き戻しをチャットへ通知</label><p class="lyc-help">コマ確認時のチャットタブ・発言者・宛先へ通知します。入力中の文章がある場合は送信しません。</p><p id="lyc-message" role="status"></p></div></details>`;
 const message=(text,error=false)=>{const el=root.querySelector('#lyc-message');el.textContent=text;el.className=error?'lyc-error':'';};
 async function init(){try{savedMaps=(await browser.storage.local.get('lycorisMappings')).lycorisMappings||{};}catch(e){} }
 const mapKey=()=>char&&sheet?.name?char.id+'|'+sheet.name:'';
 function draw(){
  const out=root.querySelector('#lyc-details');root.querySelector('#lyc-status').textContent=sheet?'確認済み':'未接続';
  if(!sheet||!char){out.innerHTML='';return;}
  out.innerHTML=`<div class="lyc-target"><b>ウールヴハム：</b>${esc(char.name)}<br><b>リコリス：</b>${esc(sheet.name||'名前を取得できません（開いたシートを確認）')}</div><p>項目を対応付け、反映方向を選んでください。</p><div class="lyc-map">${keys.map(([key,label])=>`<label>${label}<select data-map="${key}"><option value="">反映しない</option>${sheet.rows.map(row=>`<option value="${esc(row.id)}" ${mapping[key]===row.id?'selected':''}>${esc(row.label)}（${esc(row.value)}）</option>`).join('')}</select><small>こちら：${esc(char.values[key])}</small></label>`).join('')}</div><div class="lyc-actions"><button id="lyc-import" type="button">コマ → ウールヴハム</button><button id="lyc-export" type="button">ウールヴハム → コマ</button></div><p class="lyc-help">行動値は補正込みの計算値をコマへ反映する項目です（コマからの取込対象外）。反映はボタンを押した時に行います。コマの値が確認後に変わった場合は中止します。</p>`;
 }
 function choices(){const result=[];const used=new Set();for(const [key] of keys){const id=mapping[key];if(!id)continue;if(used.has(id))throw Error('同じコマの項目を複数選択しています。');used.add(id);const row=sheet.rows.find(r=>r.id===id);if(!row)throw Error('項目が変わりました。再確認してください。');result.push({key,row});}if(!result.length)throw Error('反映する項目を一つ以上選んでください。');return result;}
 async function currentTab(){const tabs=await browser.tabs.query({active:true,currentWindow:true});const tab=tabs[0];if(!tab||!tab.url||!tab.url.startsWith('https://udonarium-lycoris.ddns.net/'))throw Error('リコリスのタブを開いた状態で操作してください。');return tab;}
 async function send(id,payload){try{const result=await browser.tabs.sendMessage(id,{channel:'ulfhamr-lycoris-v1',...payload});if(!result?.ok)throw Error(result?.error||'接続できませんでした。');return result.data;}catch(e){if(/receiving end|Could not establish|Receiving end/i.test(e.message))throw Error('リコリスのページを再読み込みしてから、もう一度お試しください。');throw e;}}
 async function scan(){
  const current=window.UlfhamrLycoris.snapshot();if(!current)throw Error('先にウールヴハムでキャラクターを選択してください。');
  const tab=await currentTab(),fresh=await send(tab.id,{type:'scan'});if(!fresh.name)throw Error('対象コマの名前を確認できません。キャラクターシートの基本情報を確認してください。');if(!fresh.rows.length)throw Error('編集可能な数値項目が見つかりません。コマのシートを確認してください。');
  char=current;tabId=tab.id;sheet=fresh;mapping={};const saved=savedMaps[mapKey()]||{};
  for(const [key,,aliases] of keys){const wanted=saved[key]?[norm(saved[key])]:aliases;let matches=fresh.rows.filter(r=>wanted.includes(norm(r.label)));if(!matches.length)matches=fresh.rows.filter(r=>aliases.includes(norm(r.label)));if(matches.length===1)mapping[key]=matches[0].id;}
  try{chatContext=await send(tab.id,{type:'chat-context'});}catch(e){chatContext=null;}draw();message('対象と項目を確認してください。'+(chatContext?' 通知先：'+chatContext.label:' 通知先未確認：リコリスのチャットを開いて再確認してください。'));
 }
 async function storeMapping(){const key=mapKey();if(!key)return;const labels={};for(const [field,id] of Object.entries(mapping)){const row=sheet.rows.find(r=>r.id===id);if(row&&sheet.rows.filter(r=>r.label===row.label).length===1)labels[field]=row.label;}savedMaps[key]=labels;await browser.storage.local.set({lycorisMappings:savedMaps});}
 async function run(type){
  if(!sheet||!char)throw Error('先に開いているコマを確認してください。');const tab=await currentTab();if(tab.id!==tabId)throw Error('対象のタブが変わりました。コマをもう一度確認してください。');
  const selected=choices(),current=window.UlfhamrLycoris.snapshot();if(!current||current.id!==char.id)throw Error('ウールヴハムのキャラクターが変わりました。コマをもう一度確認してください。');
  if(type==='export'){
   const changes=selected.map(({key,row})=>({id:row.id,label:row.label,before:row.value,after:current.values[key]}));
   const refreshed=await send(tabId,{type:'apply',sheetId:sheet.id,sheetName:sheet.name,changes});sheet=refreshed;char=window.UlfhamrLycoris.snapshot();draw();message('リコリス側の入力欄に反映しました。コマの表示を確認してください。');
  }else{
   const live=await send(tabId,{type:'scan'});if(live.id!==sheet.id||live.name!==sheet.name)throw Error('対象コマが変わりました。もう一度確認してください。');
   const values={},expected={};for(const {key,row} of selected){if(key==='initiative')continue;const now=live.rows.find(x=>x.id===row.id&&x.label===row.label);if(!now||now.value!==row.value)throw Error('コマの値または項目が変わりました。再確認してください。');values[key]=now.value;expected[key]=char.values[key];}
   window.UlfhamrLycoris.importValues(char.id,expected,values);char=window.UlfhamrLycoris.snapshot();sheet=live;draw();message('コマの値をウールヴハムに取り込み、履歴に記録しました。');
  }
 }
 root.addEventListener('change',e=>{const key=e.target.dataset.map;if(!key)return;mapping[key]=e.target.value;storeMapping().catch(()=>message('項目の対応付けを保存できませんでした。',true));});
 root.addEventListener('click',async e=>{const id=e.target.id;if(!['lyc-scan','lyc-import','lyc-export'].includes(id)||busy)return;busy=true;try{message('確認中…');if(id==='lyc-scan')await scan();else await run(id==='lyc-import'?'import':'export');}catch(error){message(error.message||String(error),true);}finally{busy=false;}});
 const sent=new Set();let notificationQueue=Promise.resolve();
 window.addEventListener('ulfhamr-history-notify',e=>{const event=e.detail;if(!root.querySelector('#lyc-notify').checked)return;notificationQueue=notificationQueue.then(async()=>{
  try{if(!event||sent.has(event.id))return;if(!sheet||!char||!chatContext||event.characterId!==char.id)throw Error('通知未送信：リコリスのコマとチャットの通知先を確認してください。');const tab=await currentTab();if(tab.id!==tabId)throw Error('通知未送信：リコリスのタブが変わりました。');sent.add(event.id);await send(tabId,{type:'history-notify',requestId:event.id,text:event.text,context:chatContext.key});message('宣言・巻き戻しの通知をチャットへ送信しました。');}
  catch(error){message(error.message+' ウールヴハムの登録は完了しています。自動再送はしません。',true);}
 });});
 init();
})();
