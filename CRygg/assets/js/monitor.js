(() => {
 const source=document.getElementById('lcd'),view=document.getElementById('monitorView');
 if(!source||!view)return;
 const stage=document.createElement('div');stage.className='playfield';view.append(stage);
 let mirror,queued=false;
 function size(){
  if(!mirror||!view.clientWidth)return;
  const board=source.parentElement.getBoundingClientRect(),lcd=source.getBoundingClientRect();
  if(!lcd.width)return;
  stage.style.width=board.width+'px';stage.style.height=board.height+'px';
  mirror.style.width=lcd.width+'px';mirror.style.height=lcd.height+'px';
  stage.style.transform='scale('+(view.clientWidth/lcd.width)+')';
  view.style.height=(view.clientWidth*lcd.height/lcd.width)+'px';
 }
 function clone(node){
  const copy=node.cloneNode(true);
  if(copy.nodeType===1){
   copy.removeAttribute('id');copy.removeAttribute('aria-live');
   copy.querySelectorAll('[id],[aria-live]').forEach(el=>{el.removeAttribute('id');el.removeAttribute('aria-live')});
  }
  return copy;
 }
 function patch(from,to,root=false){
  if(from.nodeType!==1){if(to.nodeValue!==from.nodeValue)to.nodeValue=from.nodeValue;return}
  // Keep existing animated nodes alive; unrelated updates must not restart FX.
  if(from.dataset.pulse!==to.dataset.pulse&&from.classList.contains('active')){
   to.classList.remove('active');void to.offsetWidth;
  }
  if(root){const phase=from.style.getPropertyValue('--rainbow-phase');if(phase)to.style.setProperty('--rainbow-phase',phase);else to.style.removeProperty('--rainbow-phase');}
  if(from.dataset.jolt!==to.dataset.jolt&&from.classList.contains('reel-jolt')){to.classList.remove('reel-jolt');void to.offsetWidth;}
  const skip=name=>name==='id'||name==='aria-live'||(root&&name==='style');
  for(const attr of [...to.attributes])if(!skip(attr.name)&&!from.hasAttribute(attr.name))to.removeAttribute(attr.name);
  for(const attr of from.attributes)if(!skip(attr.name)&&to.getAttribute(attr.name)!==attr.value)to.setAttribute(attr.name,attr.value);
  const children=[...from.childNodes];
  children.forEach((child,i)=>{
   const current=to.childNodes[i];
   if(!current)to.append(clone(child));
   else if(current.nodeType!==child.nodeType||current.nodeName!==child.nodeName)to.replaceChild(clone(child),current);
   else patch(child,current);
  });
  while(to.childNodes.length>children.length)to.lastChild.remove();
 }
 function sync(){
  queued=false;
  if(!mirror){mirror=clone(source);stage.append(mirror)}else patch(source,mirror,true);
  size();
 }
 const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(sync)}});
 observer.observe(source,{subtree:true,childList:true,attributes:true,characterData:true});
 new ResizeObserver(size).observe(view);new ResizeObserver(size).observe(source.parentElement);
 sync();
})();
