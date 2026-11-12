'use strict';
(() => {
 const sheetIds=new WeakMap(), rowIds=new WeakMap();let seq=0;
 const idFor=(map,node)=>{if(!map.has(node))map.set(node,String(++seq));return map.get(node);};
 const visible=e=>e.isConnected&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 const ownCells=row=>Array.from(row.children).filter(n=>n.classList?.contains('table-cell'));
 const intValue=value=>/^-?\d+$/.test(String(value).trim())&&Number.isSafeInteger(Number(value))?Number(value):null;
 function readSheet(targetId){
  const sheets=Array.from(document.querySelectorAll('game-character-sheet')).filter(visible);
  if(!targetId&&sheets.length!==1)throw Error(sheets.length?'キャラクターシートを一つだけ開いてください。':'リコリス側で対象コマのキャラクターシートを開いてください。');
  const sheet=targetId?sheets.find(s=>idFor(sheetIds,s)===targetId):sheets[0],rows=[],fields=[];
  if(!sheet)throw Error('対象コマのシートが閉じられました。もう一度選んでください。');
  for(const row of sheet.querySelectorAll('[game-data-element],game-data-element')){
   if(!visible(row))continue;const cells=ownCells(row);if(cells.length<2)continue;
   const nameCell=cells[cells.length-2],valueCell=cells[cells.length-1];
   const labelInput=nameCell.querySelector('input:not([type=checkbox]):not([type=number]):not([type=range])');
   const label=(labelInput?labelInput.value:nameCell.textContent).trim();if(!label)continue;
   const numberInputs=Array.from(valueCell.querySelectorAll('input[type=number]')).filter(visible);
   const textInputs=Array.from(valueCell.querySelectorAll('input:not([type]),input[type=text]')).filter(visible);
   const input=numberInputs[0]||textInputs[0]||valueCell.querySelector('textarea');if(!input)continue;
   fields.push({id:idFor(rowIds,row),label,raw:String(input.value)});
   if(input.disabled||input.readOnly)continue;
   const value=label==='情報'?String(input.value):intValue(input.value);if(value===null)continue;
   rows.push({id:idFor(rowIds,row),label,value,input,row});
  }
  const nameRow=Array.from(sheet.querySelectorAll('[game-data-element],game-data-element')).map(row=>{
   const cells=ownCells(row);if(cells.length<2)return null;
   const a=cells[cells.length-2],b=cells[cells.length-1],n=a.querySelector('input:not([type=checkbox]):not([type=number]):not([type=range])');
   const label=(n?n.value:a.textContent).trim();const v=b.querySelector('input:not([type=checkbox]):not([type=range])');
   return label.toLowerCase()==='name'&&v?v.value.trim():null;
  }).find(Boolean)||'';
  return {id:idFor(sheetIds,sheet),name:nameRow,rows,fields};
 }
 function publicView(s){return {id:s.id,name:s.name,rows:s.rows.map(({id,label,value})=>({id,label,value}))};}
 async function apply(msg){
  const s=readSheet();if(!s.name||s.name!==msg.sheetName||s.id!==msg.sheetId)throw Error('対象コマのシートが変わりました。もう一度読み込んでください。');
  if(!Array.isArray(msg.changes)||!msg.changes.length||msg.changes.length>6)throw Error('反映項目が不正です。');
  const used=new Set(),edits=[];
  for(const change of msg.changes){
   if(used.has(change.id))throw Error('同じ項目が複数選択されています。');used.add(change.id);
   const row=s.rows.find(r=>r.id===change.id);
   if(!row||row.label!==change.label||row.value!==change.before)throw Error('コマの値または項目が変更されました。再読込して確認してください。');
   if(row.label==='情報'?typeof change.after!=='string'||change.after.length>20000:!Number.isSafeInteger(change.after))throw Error('整数のみ反映できます。');
   edits.push({row,after:change.after});
  }
  for(const {row,after} of edits){
   const setter=Object.getOwnPropertyDescriptor(row.input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(row.input,String(after));
   row.input.dispatchEvent(new Event('input',{bubbles:true}));row.input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  await new Promise(resolve=>setTimeout(resolve,250));
  const after=readSheet();if(after.id!==s.id)throw Error('書き込み途中に対象が変わりました。リコリス側の値を確認してください。');
  for(const e of edits){const row=after.rows.find(r=>r.id===idFor(rowIds,e.row.row));if(!row||row.value!==e.after)throw Error('一部の値を確認できません。リコリス側を確認してください。');}
  return publicView(after);
 }
 browser.runtime.onMessage.addListener(msg=>{
  if(!msg||msg.channel!=='ulfhamr-lycoris-v1')return;
  if(msg.type==='list-sheets'||msg.type==='read-opponent')return Promise.resolve().then(()=>{
   const ids=msg.type==='read-opponent'?[msg.sheetId]:Array.from(document.querySelectorAll('game-character-sheet')).filter(visible).map(s=>idFor(sheetIds,s));
   return ids.map(id=>{const s=readSheet(id);return {id:s.id,name:s.name,fields:s.fields};});
  }).then(data=>({ok:true,data}),error=>({ok:false,error:error.message}));
  if(msg.type==='scan')return Promise.resolve().then(()=>publicView(readSheet())).then(data=>({ok:true,data}),error=>({ok:false,error:error.message}));
  if(msg.type==='apply')return apply(msg).then(data=>({ok:true,data}),error=>({ok:false,error:error.message}));
 });
})();
