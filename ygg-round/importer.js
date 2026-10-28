(function(){
'use strict';
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('Excel内部のXMLを読み取れません');return d;};
const elements=(n,name)=>Array.from(n.getElementsByTagNameNS('*',name));
window.readCharacterXlsx=async function(file,mode){
 if(file.size>20*1024*1024)throw Error('20MB以下の.xlsxファイルを選んでください');
 if(!/\.xlsx$/i.test(file.name))throw Error('.xlsx形式を選んでください（.xlsには未対応）');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const read=async p=>{const f=zip.file(p);if(!f)throw Error('Excelの必須ファイルがありません：'+p);return xml(await f.async('string'));};
 const wb=await read('xl/workbook.xml'),rel=await read('xl/_rels/workbook.xml.rels');
 const relations=Object.fromEntries(elements(rel,'Relationship').map(e=>[e.getAttribute('Id'),e.getAttribute('Target')]));
 let strings=[];if(zip.file('xl/sharedStrings.xml')){const d=await read('xl/sharedStrings.xml');strings=elements(d,'si').map(si=>elements(si,'t').filter(t=>t.parentElement.localName!=='rPh').map(t=>t.textContent).join(''));}
 const sheets={};
 for(const s of elements(wb,'sheet')){const name=s.getAttribute('name');if(!['キャラシート','進行表','応用技','計算用'].includes(name))continue;const rid=s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');let target=relations[rid];if(!target)continue;target=target.startsWith('/')?target.slice(1):'xl/'+target;const d=await read(target);const cells={};
 for(const c of elements(d,'c')){const a=c.getAttribute('r'),type=c.getAttribute('t');let value=elements(c,'v')[0]?.textContent;
 if(type==='s')value=strings[Number(value)];else if(type==='inlineStr')value=elements(c,'t').map(x=>x.textContent).join('');
 if(type==='e')value=null;cells[a]={v:value,f:elements(c,'f')[0]?.textContent};}
 sheets[name]=cells;}
 return Ygg.fromCells(sheets,file.name,mode);
};
})();
