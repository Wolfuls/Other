/* Send through the same visible chat UI used by Lycoris; never retry a send. */
'use strict';
(()=>{
const visible=e=>e.isConnected&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
const requests=new Map();
function chat(){
 const inputs=Array.from(document.querySelectorAll('chat-window chat-input textarea.chat-input')).filter(visible);
 if(inputs.length!==1)throw Error('通知未送信：リコリスのチャット入力欄を一つだけ表示してください。');
 const input=inputs[0],root=input.closest('chat-input'),panel=input.closest('chat-window');
 const selected=panel.querySelector('input[name="chat-tab"]:checked');
 const values=Array.from(root.querySelectorAll('ng-select .ng-value-label')).filter(visible).map(e=>e.textContent.trim());
 const send=Array.from(input.closest('form').querySelectorAll('button')).find(e=>e.textContent.trim()==='SEND');
 if(!selected||values.length<2||!send||send.disabled)throw Error('通知未送信：チャットのタブ・発言者・宛先を確認できません。');
 const label=[selected.closest('label')?.textContent.trim(),...values].join(' / ');
 return {input,send,key:JSON.stringify([selected.value,...values]),label};
}
browser.runtime.onMessage.addListener((msg,sender)=>{
 if(sender.id!==browser.runtime.id||msg?.channel!=='ulfhamr-lycoris-v1'||!['chat-context','history-notify'].includes(msg.type))return;
 if(msg.type==='chat-context')return Promise.resolve().then(()=>{const c=chat();return {ok:true,data:{key:c.key,label:c.label}};}).catch(e=>({ok:false,error:e.message}));
 if(requests.has(msg.requestId))return requests.get(msg.requestId);
 const result=Promise.resolve().then(async()=>{
  if(typeof msg.requestId!=='string'||!msg.requestId||typeof msg.text!=='string'||msg.text.length>12000||!msg.text.startsWith('【ウールヴハム】'))throw Error('通知内容が不正です。');
  const c=chat();if(c.key!==msg.context)throw Error('通知未送信：チャットのタブ・発言者・宛先が変わりました。コマを再確認してください。');
  if(c.input.value.trim())throw Error('通知未送信：チャットに入力中の文章があります。');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(c.input,msg.text);
  c.input.dispatchEvent(new Event('input',{bubbles:true}));
  c.send.click();
  await new Promise(resolve=>setTimeout(resolve,150));
  if(c.input.value)throw Error('通知の送信完了を確認できません。チャットを確認してください。');
  return {ok:true,data:{sent:true}};
 }).catch(e=>({ok:false,error:e.message}));
 requests.set(msg.requestId,result);if(requests.size>200)requests.delete(requests.keys().next().value);return result;
});
})();
