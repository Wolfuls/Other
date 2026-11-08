(() => {
 const tabs=[document.getElementById('playTab'),document.getElementById('optionsTab')];
 function select(index){tabs.forEach((tab,i)=>{
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
