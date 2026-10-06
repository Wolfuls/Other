'use strict';
// Minimal DOM/timer harness for app scheduling. Layout and pixels are checked in the browser.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),FX=require('../js/combat-effects.js');
function harness(state,source=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8'),options={}){
  let visualSeed=81423;
  const visualRandom=options.visualRandom||(()=>((visualSeed=(Math.imul(1664525,visualSeed)+1013904223)>>>0)/4294967296));
  let now=state.savedAt,next=0;const timers=new Map(),ids=new Map(),selectors=new Map();
  const metrics={text:0,formulas:0,controls:0,layout:0},windowEvents=new Map(),documentEvents=new Map();
  const schedule=(fn,delay=0,repeat=0)=>{const id=++next;timers.set(id,{fn,at:now+delay,repeat});return id;};
  class Element{
    constructor(tag='div',id=''){this.createdAt=now;this.tagName=tag;this.id=id;this.children=[];this.dataset={};this.attrs=new Map();this.listeners=new Map();this.selectors=new Map();this.classes=new Set();this._text='';
      this.style={setProperty(name,v){this[name]=String(v);},getPropertyValue(name){return this[name]||'';}};
      this.classList={add:(...names)=>names.forEach(x=>this.classes.add(x)),remove:(...names)=>names.forEach(x=>this.classes.delete(x)),contains:name=>this.classes.has(name),toggle:(name,force)=>{const on=force??!this.classes.has(name);on?this.classes.add(name):this.classes.delete(name);return on;}};
    }
    set className(v){this.classes=new Set(v.split(/\s+/).filter(Boolean));}get className(){return [...this.classes].join(' ');}
    set textContent(v){this._text=String(v);metrics.text++;if(this.id.startsWith('formula-'))metrics.formulas++;if(this.id==='dps')metrics.controls++;}get textContent(){return this._text;}
    set innerHTML(v){this.html=v;}get innerHTML(){return this.html||'';}
    get offsetLeft(){metrics.layout++;return this.id==='enemy-art'?400:140;}
    get offsetTop(){metrics.layout++;return this.id==='richter-combatant'?450:150;}
    get offsetHeight(){metrics.layout++;return 224;}get offsetWidth(){metrics.layout++;return 200;}
    setAttribute(k,v){this.attrs.set(k,String(v));}getAttribute(k){return this.attrs.get(k)??null;}removeAttribute(k){this.attrs.delete(k);}
    append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;}}prepend(n){this.children.unshift(n);n.parent=this;}
    remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
    replaceChildren(...nodes){this.children.forEach(n=>n.parent=null);this.children=[];this.append(...nodes);}
    get firstElementChild(){return this.children[0];}get lastElementChild(){return this.children.at(-1);}
    querySelector(sel){if(['.projectile-count','.enemy-target','.enemy-health'].includes(sel))return this.children.find(n=>n.classList.contains(sel.slice(1)))||null;if(!this.selectors.has(sel))this.selectors.set(sel,new Element());return this.selectors.get(sel);}
    addEventListener(type,fn){this.listeners.set(type,fn);}click(){this.listeners.get('click')?.({target:this});}
    getAnimations(){return [];}
    cloneNode(deep=false){const copy=new Element(this.tagName);copy.className=this.className;copy.dataset={...this.dataset};copy.attrs=new Map(this.attrs);copy._text=this._text;for(const[k,v]of Object.entries(this.style))if(typeof v==='string')copy.style[k]=v;if(deep)copy.append(...this.children.map(n=>n.cloneNode(true)));return copy;}
    focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;}select(){}
  }
  const get=id=>{if(!ids.has(id))ids.set(id,new Element('div',id));return ids.get(id);};
  const document={hidden:false,getElementById:get,createElement:tag=>new Element(tag),body:new Element('body'),
    querySelector(sel){if(!selectors.has(sel))selectors.set(sel,new Element());return selectors.get(sel);},addEventListener:(type,fn)=>documentEvents.set(type,fn)};
  const data=new Map([[S.KEY,S.encode(state)]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const media={matches:false,addEventListener(type,fn){this.change=fn;}};
  const fakeDate=class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
  const context={document,navigator:{},Date:fakeDate,performance:{now:()=>now},Math:Object.assign(Object.create(Math),{random:visualRandom}),
    setTimeout:(fn,delay)=>schedule(fn,delay),clearTimeout:id=>timers.delete(id),setInterval:(fn,delay)=>schedule(fn,delay,delay),
    requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:id=>timers.delete(id),Image:class{},ResizeObserver:class{observe(){}},
    addEventListener:(type,fn)=>windowEvents.set(type,fn),matchMedia:()=>media,localStorage:storage,
    YggData:D,YggNumbers:require('../js/numbers.js'),YggMaintenance:require('../js/maintenance.js'),YggEngine:{...E,catchUp:s=>E.catchUp(s,now),click:(s,rng=options.combatRandom||(()=>.999))=>E.click(s,rng),advance:(s,seconds,rng=options.combatRandom||(()=>.999),collect=true)=>E.advance(s,seconds,rng,collect)},YggSave:S,YggDisplay:require('../js/display.js'),YggCombatEffects:{...FX,createPlayback:options=>FX.createPlayback({...options,schedule:(fn,ms)=>schedule(fn,ms),cancel:id=>timers.delete(id)})}};
  context.window=context;vm.runInNewContext(source,context);
  function runTo(until,late=false){let budget=100000;while(timers.size){const [id,t]=[...timers].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(t.at>until)break;if(!--budget)throw Error('Timer loop');now=late?until:t.at;timers.delete(id);t.fn();if(t.repeat)timers.set(id,{...t,at:now+t.repeat});}now=until;}
  const resetMetrics=()=>{for(const k in metrics)metrics[k]=0;};resetMetrics();
  return {get,metrics,resetMetrics,media,document,get now(){return now;},advance:ms=>runTo(now+ms),stall:ms=>runTo(now+ms,true),resize:()=>windowEvents.get('resize')?.(),
    click:id=>get(id).click(),visible:value=>{document.hidden=!value;documentEvents.get('visibilitychange')?.();},
    saved:()=>S.decode(storage.getItem(S.KEY)),pending:()=>timers.size};
}
module.exports={harness};
