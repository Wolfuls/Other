(function(root){
  'use strict';
  const SAVE_KEYS=['yggclicker.save','yggclicker.backup','yggclicker.before-import'];
  function erase(storage){
    if(!storage)return {ok:false,error:'ブラウザの保存領域を利用できません。'};
    const previous=new Map();
    try{
      for(const key of SAVE_KEYS)previous.set(key,storage.getItem(key));
      for(const key of SAVE_KEYS)storage.removeItem(key);
      if(SAVE_KEYS.some(key=>storage.getItem(key)!==null))throw Error('残存データ');
      return {ok:true};
    }catch{
      let restored=true;
      for(const [key,value]of previous)try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{restored=false;}
      return {ok:false,error:restored?'削除できませんでした。進行データは保持しています。':'削除を完了できませんでした。保存領域へのアクセスを確認してください。'};
    }
  }
  function assetUrls(data,documentUrls,base){
    const dir=new URL('./',base),result=new Set();
    function add(value){try{const url=new URL(value,dir);if(url.origin===dir.origin&&url.pathname.startsWith(dir.pathname)&&!url.pathname.split('/').includes('old')){url.hash='';result.add(url.href);}}catch{}}
    function visit(value){if(typeof value==='string'&&value.startsWith('./img/'))add(value);else if(value&&typeof value==='object')for(const child of Object.values(value))visit(child);}
    documentUrls.forEach(add);visit(data);return [...result];
  }
  async function refresh(urls,fetchResource){
    const pending=[...new Set(urls)],failed=[];let index=0;
    await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{
      while(index<pending.length){const url=pending[index++];try{const response=await fetchResource(url,{cache:'reload',credentials:'same-origin'});if(!response.ok)throw Error('取得失敗');await response.arrayBuffer();}catch{failed.push(url);}}
    }));
    return {ok:failed.length===0,failed};
  }
  const api={SAVE_KEYS,erase,assetUrls,refresh};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggMaintenance=api;
})(typeof window!=='undefined'?window:globalThis);
