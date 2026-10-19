(function(root){
  'use strict';
  const scene=document.getElementById('shop-scene'),viewport=document.getElementById('arena-viewport');
  viewport.append(scene);
  const panel=document.getElementById('battle-panel');
  const heading=document.createElement('header');heading.className='shop-chrome shop-scene-heading';
  heading.innerHTML='<span class="shop-scene-label">SHOP</span><h2 id="shop-merchant-name">公 未未</h2>';
  const info=document.createElement('div');info.className='shop-chrome shop-scene-info';
  info.innerHTML='<div class="shop-wallet"><span>所持クレジット</span><strong><span class="resource-icon" aria-hidden="true">◉</span> <span id="shop-wallet-value">0</span> C</strong></div><div class="shop-stock" aria-label="所持アイテム"></div>';
  panel.append(heading,info);
  const stock=info.querySelector('.shop-stock'),counts=[];
  for(const i of [0,2,3]){const chip=document.createElement('span');chip.className='shop-stock-chip';const name=document.createElement('span');name.textContent=root.YggShopItems[i].name;const count=document.createElement('strong');chip.append(name,count);stock.append(chip);counts.push([i,count]);}
  const merchantName=document.getElementById('shop-merchant-name'),walletValue=document.getElementById('shop-wallet-value');
  let lastCredits;
  function renderInfo(state){
    const name=state.rescue?.completed?'公 未未':'施錠中',credits=Math.floor(state.credits||0);
    if(merchantName.textContent!==name)merchantName.textContent=name;
    if(lastCredits!==credits){lastCredits=credits;walletValue.textContent=credits.toLocaleString('ja-JP');}
    for(const [i,node]of counts){const text=(state.inventory?.[i]||0)+'個';if(node.textContent!==text)node.textContent=text;}
  }
  scene.addEventListener('click',event=>event.stopPropagation());
  let active=false,host=null,canvas,ctx,image,ready=false,timer=0,frame=0;
  const reduced=root.matchMedia('(prefers-reduced-motion: reduce)');
  // Each source rectangle is clipped before its anchored placement is applied.
  // Lower cells start below the upper row's final pixels, preventing row bleed.
  const cels=[
    {x:0,y:0,w:887,h:444,dx:0,dy:0},
    {x:887,y:0,w:887,h:444,dx:16,dy:0},
    {x:0,y:450,w:887,h:437,dx:-1,dy:9},
    {x:887,y:450,w:887,h:437,dx:16,dy:9}
  ];
  function draw(){
    const c=cels[frame];ctx.clearRect(0,0,887,444);
    ctx.drawImage(image,c.x,c.y,c.w,c.h,c.dx,c.dy,c.w,c.h);
    host.dataset.frame=String(frame+1);
  }
  function update(){
    clearInterval(timer);timer=0;
    if(!ready)return;
    if(reduced.matches){frame=0;draw();}
    const playing=active&&!document.hidden&&!reduced.matches;
    host.classList.toggle('sprite-playing',playing);
    if(playing)timer=setInterval(()=>{frame=(frame+1)%cels.length;draw();},1200);
  }
  function setActive(value){
    active=!!value;
    if(active&&!host){
      host=document.querySelector('.shop-merchant');if(!host)return;
      canvas=document.createElement('canvas');canvas.width=887;canvas.height=444;
      canvas.setAttribute('aria-hidden','true');ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      host.setAttribute('role','img');host.setAttribute('aria-label','公 未未：カウンターに手を置いている');
      image=new Image();image.onload=()=>{host.append(canvas);host.classList.add('sprite-ready');ready=true;draw();update();};
      image.src='./img/shop-merchant-cels-v3.png';
    }
    update();
  }
  document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);
  root.YggShopScene={setActive,renderInfo};
})(window);
