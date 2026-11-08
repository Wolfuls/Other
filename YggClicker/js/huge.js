(function(root){
  'use strict';
  // Ordinary values stay native Numbers. Large finite values are immutable,
  // JSON/structuredClone-safe scientific numbers with ~15 significant digits.
  const isBig=x=>!!x&&typeof x==='object'&&x.__huge===1&&Object.keys(x).length===3&&Number.isFinite(x.m)&&Math.abs(x.m)>=1&&Math.abs(x.m)<10&&Number.isSafeInteger(x.e)&&x.e>300;
  const parts=x=>isBig(x)?[x.m,x.e]:x===0?[0,0]:(()=>{if(Math.abs(x)<1e-300){const [m,e]=x.toExponential().split('e');return [Number(m),Number(e)];}const e=Math.floor(Math.log10(Math.abs(x)));return [x/10**e,e];})();
  function make(m,e){if(!m)return 0;if(!Number.isFinite(m)||!Number.isFinite(e))return NaN;const shift=Math.floor(Math.log10(Math.abs(m)));m/=10**shift;e+=shift;if(e<=300)return m*10**e;if(!Number.isSafeInteger(e))throw Error('巨大数の指数が表現範囲を超えました');return Object.freeze({__huge:1,m,e});}
  const finite=x=>typeof x==='number'?Number.isFinite(x):isBig(x);
  const log10=x=>isBig(x)?x.m<0?NaN:x.e+Math.log10(x.m):Math.log10(x);
  const sign=x=>isBig(x)?Math.sign(x.m):Math.sign(x);
  const abs=x=>isBig(x)?make(Math.abs(x.m),x.e):Math.abs(x);
  const neg=x=>isBig(x)?make(-x.m,x.e):-x;
  function cmp(a,b){if(!isBig(a)&&!isBig(b))return a<b?-1:a>b?1:a===b?0:NaN;if(a===Infinity||b===-Infinity)return 1;if(a===-Infinity||b===Infinity)return -1;if(!finite(a)||!finite(b))return NaN;const sa=sign(a),sb=sign(b);if(sa!==sb)return sa<sb?-1:1;if(!sa)return 0;const [am,ae]=parts(a),[bm,be]=parts(b);return ae!==be?(ae<be?-sa:sa):am<bm?-1:am>bm?1:0;}
  function format(x){if(!isBig(x))return String(x);let m=Number(x.m.toPrecision(5)),e=x.e;if(Math.abs(m)>=10){m/=10;e++;}return m+'×10^'+e;}
  function add(a,b){if(typeof a==='string'||typeof b==='string')return (isBig(a)?format(a):a)+(isBig(b)?format(b):b);if(!isBig(a)&&!isBig(b)){const n=a+b;if(Number.isFinite(n)||!finite(a)||!finite(b))return n;}if(!finite(a)||!finite(b))return a===Infinity||b===Infinity?(a===-Infinity||b===-Infinity?NaN:Infinity):-Infinity;let [am,ae]=parts(a),[bm,be]=parts(b);if(!am)return b;if(!bm)return a;if(ae<be){[am,bm]=[bm,am];[ae,be]=[be,ae];}return make(am+(ae-be>18?0:bm*10**(be-ae)),ae);}
  const sub=(a,b)=>!isBig(a)&&!isBig(b)&&Number.isFinite(a-b)?a-b:add(a,neg(b));
  function mul(a,b){if(!isBig(a)&&!isBig(b)){const n=a*b;if(Number.isFinite(n)||!finite(a)||!finite(b))return n;}if(!finite(a)||!finite(b))return sign(a)*sign(b)*Infinity;const [am,ae]=parts(a),[bm,be]=parts(b);return make(am*bm,ae+be);}
  function div(a,b){if(!isBig(a)&&!isBig(b)){const n=a/b;if(Number.isFinite(n)||!finite(a)||!finite(b)||b===0)return n;}if(!finite(a)||!finite(b))return !finite(a)&&!finite(b)?NaN:!finite(b)?0:sign(a)*sign(b)*Infinity;if(!sign(b))return sign(a)*Infinity;const [am,ae]=parts(a),[bm,be]=parts(b);return make(am/bm,ae-be);}
  function fromLog10(v){if(v===-Infinity)return 0;if(!Number.isFinite(v))return v===Infinity?Infinity:NaN;const e=Math.floor(v);return make(10**(v-e),e);}
  function pow(a,b){if(!isBig(a)&&!isBig(b)){const n=Math.pow(a,b);if(Number.isFinite(n)||!finite(a)||!finite(b)||a<0&&!Number.isInteger(b))return n;}if(!finite(b)||isBig(b))throw Error('指数に巨大数は指定できません');const n=fromLog10(log10(abs(a))*b);return sign(a)<0&&b%2?neg(n):n;}
  const exp=x=>{const n=Math.exp(x);return Number.isFinite(n)||!Number.isFinite(x)?n:fromLog10(x/Math.LN10);};
  const min=(...xs)=>xs.every(x=>typeof x==='number')?Math.min(...xs):xs.reduce((a,b)=>Number.isNaN(cmp(a,b))?NaN:cmp(a,b)<=0?a:b,Infinity);
  const max=(...xs)=>xs.every(x=>typeof x==='number')?Math.max(...xs):xs.reduce((a,b)=>Number.isNaN(cmp(a,b))?NaN:cmp(a,b)>=0?a:b,-Infinity);
  const integer=x=>isBig(x)||Number.isInteger(x);
  const rounder=fn=>x=>isBig(x)?x:Math[fn](x);
  const eq=(a,b)=>isBig(a)||isBig(b)?finite(a)&&finite(b)&&cmp(a,b)===0:a===b;
  const api={isBig,make,parts,fromLog10,format,cmp,add,sub,mul,div,pow,neg,abs,sign,min,max,exp,
    lt:(a,b)=>isBig(a)||isBig(b)?cmp(a,b)<0:a<b,le:(a,b)=>isBig(a)||isBig(b)?cmp(a,b)<=0:a<=b,gt:(a,b)=>isBig(a)||isBig(b)?cmp(a,b)>0:a>b,ge:(a,b)=>isBig(a)||isBig(b)?cmp(a,b)>=0:a>=b,eq,ne:(a,b)=>!eq(a,b),
    floor:rounder('floor'),ceil:rounder('ceil'),round:rounder('round'),trunc:rounder('trunc'),sqrt:x=>pow(x,.5),log:x=>isBig(x)?log10(x)*Math.LN10:Math.log(x),log10,log2:x=>isBig(x)?log10(x)/Math.LOG10E/Math.LN2:Math.log2(x),log1p:x=>isBig(x)?log10(x)*Math.LN10:Math.log1p(x),
    isFinite:finite,isInteger:integer,text:x=>isBig(x)?format(x):x,
    toFixed:(x,...a)=>isBig(x)?format(x):x.toFixed(...a),toExponential:(x,...a)=>isBig(x)?format(x):x.toExponential(...a),toPrecision:(x,...a)=>isBig(x)?format(x):x.toPrecision(...a),
    sort:fn=>(a,b)=>{const r=fn(a,b);return isBig(r)?sign(r):r;},
    assign:(obj,key,op,right)=>{const left=obj[key];return obj[key]=api[op](left,right());}
  };
  root.YggHuge=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
