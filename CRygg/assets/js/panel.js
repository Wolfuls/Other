(() => {
 const tabs=[document.getElementById('playTab'),document.getElementById('optionsTab')];
 const mobile=matchMedia('(max-width: 900px), (pointer: coarse) and (max-height: 600px)');
 const panel=document.querySelector('.panel');
 const close=document.createElement('button');close.className='mobile-panel-close';close.type='button';close.textContent='盤面に戻る';
 document.querySelector('.panel-tabs').append(close);
 function dismiss(){panel.classList.remove('mobile-open');tabs.forEach(t=>t.setAttribute('aria-expanded','false'));}
 close.addEventListener('click',dismiss);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});
 mobile.addEventListener('change',dismiss);
 function select(index){
 const wasOpen=panel.classList.contains('mobile-open')&&tabs[index].getAttribute('aria-selected')==='true';
 if(mobile.matches){panel.classList.toggle('mobile-open',!wasOpen);tabs.forEach((t,i)=>t.setAttribute('aria-expanded',String(!wasOpen&&i===index)));}
tabs.forEach((tab,i)=>{
  const selected=i===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
  document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;
 })}
 tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>select(i));
  tab.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-i;select(next);tabs[next].focus();
  });
 });
})();
