/* A former file:// index.html may have its own storage partition. Keep it accessible. */
(()=>{
 if(location.protocol!=='file:')return;
 let raw;try{raw=localStorage.getItem('ygg-round-v1');if(!JSON.parse(raw)?.characters?.length)return;}catch{return;}
 const section=document.getElementById('local-backup');if(!section)return;
 section.hidden=false;
 const heading=document.createElement('h2');heading.textContent='以前のローカル版のデータがあります';
 const text=document.createElement('p');text.textContent='ブラウザ版のファイル名が app.html に変わりました。下のボタンで既存データを書き出し、ブラウザ版の「復元」から取り込めます。元の保存データはそのまま残ります。';
 const button=document.createElement('button');button.type='button';button.className='button primary';button.textContent='既存キャラのバックアップを書き出す';
 button.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.download='Ulfhamr-Backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
 section.append(heading,text,button);
})();
