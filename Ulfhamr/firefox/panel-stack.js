/* Share Lycoris' normal draggable window stack, below its modal overlays. */
(()=>{'use strict';
 function raise(host,stacks){
  const windows=Array.from(stacks),z=el=>Number.parseInt(el.style.zIndex,10)||9000;
  const bottom=windows.length?Math.min(...windows.map(z)):9000,top=Math.max(9000,...windows.map(z));
  for(const el of windows)el.style.zIndex=String(Math.max(9000,z(el)-bottom+9000));
  host.style.zIndex=String(top-bottom+9001);
 }
 const api={raise};if(typeof module==='object'&&module.exports)module.exports=api;else globalThis.UlfPanelStack=api;
})();
