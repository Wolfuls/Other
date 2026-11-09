from pathlib import Path
p=Path('assets/js/panel.js');s=p.read_text(encoding='utf-8');s=s.replace(' function select(index){', ''' const mobile=matchMedia('(max-width: 900px), (pointer: coarse) and (max-height: 600px)');
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
''');p.write_text(s,encoding='utf-8')
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8').replace('handleStartX=0,','handleStartX=0, handleStartY=0,').replace('handleStartX=e.clientX;','handleStartX=e.clientX;handleStartY=e.clientY;').replace('Math.round((e.clientX-handleStartX)/1.05)',"Math.round((e.pointerType==='touch'?Math.max(e.clientX-handleStartX,handleStartY-e.clientY):e.clientX-handleStartX)/1.05)");p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('width=device-width, initial-scale=1','width=device-width, initial-scale=1, viewport-fit=cover').replace('v0.89','v0.90').replace('?v=89','?v=90').replace('game.js?v=83','game.js?v=90').replace('assets/js/panel.js"','assets/js/panel.js?v=90"');p.write_text(s,encoding='utf-8')
