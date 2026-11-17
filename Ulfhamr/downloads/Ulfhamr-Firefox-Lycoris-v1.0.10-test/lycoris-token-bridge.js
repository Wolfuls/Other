/* Uses Lycoris's native file import; no page globals or privileged callbacks are exposed.
 * Format/entry point: oron1208/udonarium-lycoris, core/file-storage/file-archiver.ts.
 * Firefox page-realm constructors: MDN /Sharing_objects_with_page_scripts.
 */
(() => {
'use strict';
const requests=new Map();let active=null;
const board=()=>document.querySelector('#app-game-table');
const tokenNodes=()=>Array.from(document.querySelectorAll('game-character'));
function matches(node,name){
 return Array.from(node.querySelectorAll('.flat-character-name-text,.simple-character-name .has-length-limit,.name-tag .has-length-limit,.topdown-name-tag .has-length-limit')).some(el=>{
  const label=el.cloneNode(true);for(const mark of label.querySelectorAll('.memo-mark'))mark.remove();return label.textContent.trim()===name.trim();
 });
}
function validate(m){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(m.requestId||''))throw Error('追加要求が不正です。');
 if(typeof m.name!=='string'||!m.name.trim()||m.name.length>500)throw Error('キャラクター名を確認してください。');
 if(typeof m.archive!=='string'||m.archive.length>2000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(m.archive))throw Error('コマデータが不正です。');
 if(location.origin!=='https://udonarium-lycoris.ddns.net')throw Error('リコリスのページで操作してください。');
 if(!board()||document.querySelector('.bundle-loading-overlay'))throw Error('リコリスの盤面を開き、読み込みが完了してから追加してください。');
}
function create(m){
 validate(m);
 if(requests.has(m.requestId))return requests.get(m.requestId);
 if(active)throw Error('別のコマを追加中です。完了してから操作してください。');
 const before=new Set(tokenNodes());
 const bytes=Uint8Array.from(atob(m.archive),x=>x.charCodeAt(0));
 if(bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)throw Error('コマZIPの形式が不正です。');
 // Construct DOM objects through the Xrayed page window so Firefox page code can read them.
 const transfer=new window.DataTransfer();
 const file=new window.File([bytes],'Ulfhamr-Token.zip',{type:'application/zip'});
 transfer.items.add(file);
 if(transfer.files.length!==1)throw Error('リコリスへ渡すデータを準備できませんでした。');
 active=m.requestId;
 const task=new Promise(resolve=>{
  let ended=false,timer;
  const finish=status=>{if(ended)return;ended=true;observer.disconnect();clearTimeout(timer);active=null;resolve({status,name:m.name});};
  const inspect=()=>{if(tokenNodes().some(n=>!before.has(n)&&matches(n,m.name)))finish('created');};
  const observer=new MutationObserver(inspect);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  timer=setTimeout(()=>finish('unconfirmed'),15000);
  try{
   // Drop on body to avoid unrelated per-token palette drop handlers.
   document.body.dispatchEvent(new window.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
   inspect();
  }catch(e){finish('unconfirmed');}
 });
 requests.set(m.requestId,task);if(requests.size>30)requests.delete(requests.keys().next().value);
 return task;
}
browser.runtime.onMessage.addListener((m,sender)=>{
 if(m?.channel!=='ulfhamr-lycoris-v1'||m.type!=='create-token')return;
 if(sender?.id!==browser.runtime.id)return Promise.resolve({ok:false,error:'拡張機能からの要求だけを受け付けます。'});
 return Promise.resolve().then(()=>create(m)).then(data=>({ok:true,data}),error=>({ok:false,error:error.message}));
});
})();
