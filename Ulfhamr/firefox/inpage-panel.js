(()=>{'use strict';
 if(window.top!==window||document.getElementById('ulfhamr-panel-host'))return;
 const host=document.createElement('div');host.id='ulfhamr-panel-host';host.classList.add('draggable-panel');host.style.zIndex='9000';const shadow=host.attachShadow({mode:'closed'});
 shadow.innerHTML=`<style>
 :host{all:initial;position:fixed;inset:0;pointer-events:none;z-index:9000;font-family:system-ui,sans-serif;color:#edf4ef;font-size:13px}
 *{box-sizing:border-box}button{font:inherit;cursor:pointer;border:1px solid #6b927f;background:#203f32;color:#fff;border-radius:5px;padding:6px 10px}button:hover,button:focus-visible{background:#3b7055;outline:2px solid #a0ccaa;outline-offset:1px}
 .bookmark{pointer-events:auto;position:absolute;right:0;top:90px;writing-mode:vertical-rl;border-radius:7px 0 0 7px;padding:12px 8px;letter-spacing:2px;box-shadow:0 2px 12px #0005}
 .panel{pointer-events:auto;position:absolute;display:flex;flex-direction:column;background:#f4f5f0;border:1px solid #44705a;border-radius:9px;box-shadow:0 6px 32px #0006;overflow:hidden}
 .panel[hidden],.bookmark[hidden]{display:none}.bar{display:flex;gap:6px;align-items:center;background:#193b2d;padding:5px;flex:none}.grip{flex:1;text-align:left;cursor:move;touch-action:none;border:0;background:transparent;font-weight:700}.bar img{width:19px;height:19px;vertical-align:middle;margin-right:6px}
 iframe{width:100%;height:100%;border:0;flex:1;min-height:0;background:#f4f5f0}.resize{position:absolute;right:0;bottom:0;width:20px;height:20px;padding:0;cursor:nwse-resize;touch-action:none;border-radius:5px 0 0 0}.shield{display:none;position:absolute;inset:40px 0 0}.moving .shield{display:block}
 </style><button class="bookmark" aria-label="ウールヴハムを開く">ウールヴハム</button><section class="panel" hidden aria-label="情報拡張装置【ウールヴハム】"><header class="bar"><button class="grip" title="ドラッグまたは矢印キーで移動"><img alt="">ウールヴハム</button><button class="reset" title="位置とサイズを元に戻す">整列</button><button class="fold" aria-label="ウールヴハムを畳む">畳む</button></header><div class="shield"></div><button class="resize" aria-label="パネルのサイズ変更" title="ドラッグまたは矢印キーでサイズ変更">◢</button></section>`;
 document.body.append(host);
 for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','wheel','keydown','keyup'])host.addEventListener(type,e=>e.stopPropagation());
 const q=s=>shadow.querySelector(s),panel=q('.panel'),bookmark=q('.bookmark');q('img').src=browser.runtime.getURL('Ulfhamr.svg');
 let box={x:Math.max(8,innerWidth-620),y:60,w:600,h:Math.min(820,innerHeight-80)},frame,opened=false,interacted=false;
 function raise(){UlfPanelStack.raise(host,document.querySelectorAll('.draggable-panel'));}
 host.addEventListener('pointerdown',raise,true);
 window.addEventListener('message',e=>{if(frame&&opened&&e.source===frame.contentWindow&&e.origin===new URL(browser.runtime.getURL('/')).origin&&e.data?.channel==='ulfhamr-panel-focus')raise();});
 function layout(){box.w=Math.max(Math.min(320,innerWidth-16),Math.min(box.w,innerWidth-16));box.h=Math.max(Math.min(240,innerHeight-16),Math.min(box.h,innerHeight-16));box.x=Math.max(8,Math.min(box.x,innerWidth-box.w-8));box.y=Math.max(8,Math.min(box.y,innerHeight-box.h-8));Object.assign(panel.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});}
 function persist(){browser.storage.local.set({ulfhamrPanelBox:box}).catch(()=>{});}
 function toggle(force){interacted=true;opened=force??!opened;if(opened&&!frame){frame=document.createElement('iframe');frame.title='情報拡張装置【ウールヴハム】';frame.src=browser.runtime.getURL('index.html');panel.insertBefore(frame,q('.shield'));}panel.hidden=!opened;bookmark.hidden=opened;layout();if(opened)raise();else bookmark.focus();}
 bookmark.onclick=()=>toggle(true);q('.fold').onclick=()=>toggle(false);q('.reset').onclick=()=>{box={x:Math.max(8,innerWidth-620),y:60,w:600,h:Math.min(820,innerHeight-80)};layout();persist();};
 function drag(handle,size){let start;
  handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();interacted=true;start={px:e.clientX,py:e.clientY,...box};handle.setPointerCapture(e.pointerId);panel.classList.add('moving');});
  handle.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.px,dy=e.clientY-start.py;if(size){box.w=start.w+dx;box.h=start.h+dy;}else{box.x=start.x+dx;box.y=start.y+dy;}layout();});
  const end=()=>{if(!start)return;start=null;panel.classList.remove('moving');persist();};handle.addEventListener('pointerup',end);handle.addEventListener('lostpointercapture',end);
  handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const d=e.shiftKey?40:10;if(e.key==='ArrowLeft')box[size?'w':'x']-=d;if(e.key==='ArrowRight')box[size?'w':'x']+=d;if(e.key==='ArrowUp')box[size?'h':'y']-=d;if(e.key==='ArrowDown')box[size?'h':'y']+=d;layout();persist();});
 }
 drag(q('.grip'),false);drag(q('.resize'),true);window.addEventListener('resize',layout);
 browser.storage.local.get('ulfhamrPanelBox').then(v=>{const b=v.ulfhamrPanelBox;if(!interacted&&b&&['x','y','w','h'].every(k=>Number.isFinite(b[k]))){box=b;layout();}}).catch(()=>{});
 browser.runtime.onMessage.addListener(m=>{if(m?.channel==='ulfhamr-panel'&&m.type==='toggle'){toggle();return Promise.resolve({ok:true});}});layout();
})();
