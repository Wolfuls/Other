(async()=>{'use strict';
 document.addEventListener('pointerdown',()=>{if(window.parent!==window)window.parent.postMessage({channel:'ulfhamr-panel-focus'},'https://udonarium-lycoris.ddns.net');},true);
 const host=payload=>browser.runtime.sendMessage({channel:'ulfhamr-host',...payload});
 try{
  const loaded=await host({type:'load'});if(!loaded?.values)throw Error('保存データを読み込めませんでした。');
  const values={...loaded.values};let queue=Promise.resolve(),failed='';
  window.UlfStorage={getItem:key=>values[key]??null,setItem(key,value){if(failed)throw Error(failed);value=String(value);const before=values[key]??null;values[key]=value;queue=queue.then(async()=>{if(failed)return;try{const r=await host({type:'write',key,value,before});if(!r?.ok)throw Error(r?.error||'保存できませんでした。');}catch(e){failed=e.message;window.dispatchEvent(new CustomEvent('ulfhamr-storage-error',{detail:failed}));}});}};
  window.UlfStorage.flush=()=>queue.then(()=>!failed);
  window.UlfHost={currentTab:()=>host({type:'context'})};
  for(const file of ['app.js','lycoris-sidebar.js','lycoris-opponent.js','lycoris-create.js'])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=browser.runtime.getURL(file);s.onload=resolve;s.onerror=()=>reject(Error(file+'を読み込めませんでした。'));document.head.append(s);});
 }catch(e){const el=document.getElementById('app');el.textContent='ウールヴハムを開けませんでした。'+e.message;el.style.padding='20px';}
})();
