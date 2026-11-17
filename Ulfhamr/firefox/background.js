'use strict';

const LY='https://udonarium-lycoris.ddns.net',KEYS=['ygg-round-v1','ulfhamr-theme-v2','ulfhamr-theme-v1'];
const allowed=url=>{try{return new URL(url).origin===LY;}catch{return false;}};
browser.action.onClicked.addListener(async tab=>{
 try{if(!allowed(tab.url)){await browser.tabs.create({url:LY+'/'});return;}await browser.tabs.sendMessage(tab.id,{channel:'ulfhamr-panel',type:'toggle'},{frameId:0});}
 catch(e){console.error('ウールヴハム：リコリスを再読み込みしてください。',e);}
});
// Keep the original sidebar storage origin; iframe storage may be partitioned.
browser.runtime.onMessage.addListener((m,sender)=>{
 if(m?.channel!=='ulfhamr-host'||sender.id!==browser.runtime.id||!sender.url?.startsWith(browser.runtime.getURL('index.html')))return;
 if(m.type==='load')return Promise.resolve({values:Object.fromEntries(KEYS.map(k=>[k,localStorage.getItem(k)]))});
 if(m.type==='write'){
  if(!KEYS.includes(m.key)||typeof m.value!=='string'||m.value.length>35*1024*1024)return Promise.resolve({error:'保存内容が不正です。'});
  if(localStorage.getItem(m.key)!==m.before)return Promise.resolve({error:'別のウールヴハム画面でデータが更新されました。この画面をバックアップしてからリコリスを再読み込みしてください。'});
  try{localStorage.setItem(m.key,m.value);return Promise.resolve({ok:true});}catch(e){return Promise.resolve({error:'データを保存できませんでした：'+e.message});}
 }
 if(m.type==='context')return Promise.resolve().then(async()=>{if(!sender.tab?.id)throw Error('リコリスの画面内でウールヴハムを開いてください。');const tab=await browser.tabs.get(sender.tab.id);if(!allowed(tab.url))throw Error('リコリスのタブではありません。');return{id:tab.id,url:tab.url};});
});

// Only the explicit launcher URL is navigated after this extension is ready.
const launcherUrl=LY+'/?ulfhamr-launch=1';
const finishLaunch=tab=>{if(tab.url===launcherUrl)browser.tabs.update(tab.id,{url:LY+'/'}).catch(console.error);};
browser.tabs.onUpdated.addListener((id,change,tab)=>{if(change.url===launcherUrl)finishLaunch(tab);});
browser.tabs.query({url:LY+'/*'}).then(tabs=>tabs.forEach(finishLaunch)).catch(console.error);
