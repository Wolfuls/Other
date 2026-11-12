(() => {
'use strict';
let busy=false,last=null;
const buttons=()=>document.querySelectorAll('[data-do="create-token"]');
const label=()=>{for(const b of buttons()){b.disabled=busy;b.textContent=busy?'盤面へ追加中…':'リコリスの盤面へ追加';}};
async function add(){
 if(busy)return;busy=true;label();
 const output=document.querySelector('#token-result');
 const say=text=>{if(output)output.textContent=text;};
 try{
  const [tab]=await browser.tabs.query({active:true,currentWindow:true});
  if(!tab?.url||new URL(tab.url).origin!=='https://udonarium-lycoris.ddns.net')throw Error('リコリスのタブを開いた状態で追加してください。');
  const snapshot=window.UlfhamrLycoris.tokenSnapshot();if(!snapshot)throw Error('先にキャラクターを選択してください。');
  const signature=JSON.stringify(snapshot),now=Date.now();
  const requestId=last?.tabId===tab.id&&last.signature===signature&&now-last.time<2000?last.requestId:crypto.randomUUID();
  last={tabId:tab.id,signature,time:now,requestId};
  say('「'+snapshot.name+'」を盤面へ追加しています…');
  const bytes=await UlfToken.archive(snapshot,Ygg,JSZip,UlfTokenImage);
  const chunks=[];for(let i=0;i<bytes.length;i+=8192)chunks.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  const [current]=await browser.tabs.query({active:true,currentWindow:true});
  if(current?.id!==tab.id||new URL(current.url).origin!=='https://udonarium-lycoris.ddns.net')throw Error('操作するタブが変わりました。リコリスを選び直してください。');
  const reply=await browser.tabs.sendMessage(tab.id,{channel:'ulfhamr-lycoris-v1',type:'create-token',requestId,name:snapshot.name,archive:btoa(chunks.join(''))});
  if(!reply?.ok)throw Error(reply?.error||'リコリスへ追加できませんでした。');
  say(reply.data.status==='created'?'「'+snapshot.name+'」を盤面に追加しました。コマの「詳細を表示」を開くと、比較相手として選べます。':'データは送信しましたが、盤面への追加を確認できませんでした。再度追加する前に盤面を確認してください。');
 }catch(e){say(/receiving end|Could not establish/i.test(e.message)?'リコリスを再読み込みしてから、もう一度追加してください。':e.message);}
 finally{busy=false;label();}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-do="create-token"]'))add();});
})();
