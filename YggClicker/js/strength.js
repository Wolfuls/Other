(function(root){
  'use strict';
  const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.YggData;
  const N=typeof module!=='undefined'&&module.exports?require('./numbers.js'):root.YggNumbers;
  const enemyValue=level=>N.curveValue(D.strength.strengthBase,level,D.questGrowth.enemyCurve);
  const enemyDurability=(level,kind)=>{
    if(level<=0)return D.strength.strengthBase;
    const c=D.questGrowth.durability,x=Math.max(0,level),exponent=kind==='vitality'?c.hpExponent:kind==='power'?-c.attackExponent:c.defenseExponent;
    return Math.min(1e100,Math.exp(Math.min(Math.log(1e100),Math.log(D.strength.strengthBase)+N.curveLog(x,D.questGrowth.enemyCurve)+exponent*Math.log1p(x/c.transition))));
  };
  // Continuous growth stage (Q - 1), inferred from authored starting HP.
  // Return the upper bound to avoid rounding a target integer HP down by one.
  function enemyStageForHP(baseHP,initialHP){
    if(!(baseHP>0)||!(initialHP>baseHP))return 0;
    const target=Math.min(1e100,initialHP/baseHP*D.strength.strengthBase);
    let low=0,high=1;
    while(enemyDurability(high,'vitality')<target)high*=2;
    for(let i=0;i<80;i++){const mid=(low+high)/2;if(enemyDurability(mid,'vitality')<target)low=mid;else high=mid;}
    return high;
  }
  const caches={distribution:new Map(),pair:new Map(),hit:new Map(),damage:new Map(),outcomes:new Map()};
  const memo=(cache,key,fn)=>{if(cache.has(key))return cache.get(key);const value=fn();if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
  const config=()=>D.strength;
  const cap=x=>Math.max(-1e100,Math.min(1e100,x));
  const value=level=>Math.min(1e100,Math.exp(Math.min(Math.log(1e100),Math.log(config().strengthBase)+level*Math.log(config().strengthGrowth))));
  const logRatio=(left=0,right=0,other=0)=>(left-right)*Math.log(config().strengthGrowth)+other;
  const scaleLog=(left=0,right=0)=>((left+right)/2)*Math.log(config().strengthGrowth);
  const focusLog=(points,total=0)=>total>0?Math.log(config().focusGrowth)*Math.max(0,points)/(1+config().focusDiminishing*Math.max(0,points)/total):0;
  const effectiveCP=(points,total=0)=>total>0?Math.max(0,points)/(1+config().focusDiminishing*Math.max(0,points)/total):0;
  const focusMultiplier=(points,total=0,kind='power')=>kind==='action'?1+.08*effectiveCP(points,total):Math.exp(Math.min(Math.log(1e100),focusLog(points,total)));
  const personalValue=(level,points=0,total=level,kind='power')=>{const linear=config().strengthBase*(1+config().personalGrowth*Math.max(0,level)),focus=kind==='action'?Math.log(focusMultiplier(points,total,kind)):focusLog(points,total);return Math.log(linear)+focus>=Math.log(1e100)?1e100:linear*Math.exp(focus);};
  const relativeLog=(left,right)=>Math.log(left)-Math.log(right);
  const absoluteLog=(left,right)=>(Math.log(left/config().strengthBase)+Math.log(right/config().strengthBase))/2;
  const transform=(v,s)=>Math.floor(v*(s.resultScale??1));
  // Enumerate rather than sample. The omitted exploding tail is bounded by
  // 6^-22 per die, below double-precision probability resolution. A critical
  // continuation cannot fumble; a fumble's penalty die cannot explode.
  function distribution(spec={},judgment=true,criticals=false){
    const key=JSON.stringify([spec,judgment,criticals]);
    return memo(caches.distribution,key,()=>{
      const faces=[];
      if(judgment){
        for(let p=1;p<=6;p++)faces.push([1-p,0,1/36]);
        for(let f=2;f<=5;f++)faces.push([f,0,1/6]);
        for(let n=1;n<=22;n++)for(let f=1;f<=5;f++)faces.push([n*6+f,criticals?n:0,6**(-n-1)]);
      }else for(let f=1;f<=(spec.sides||6);f++)faces.push([f,0,1/(spec.sides||6)]);
      let pmf=new Map([['0,0',1]]);
      for(let i=0;i<(spec.dice||0);i++){
        const next=new Map();for(const [key,p]of pmf){const [a,k]=key.split(',').map(Number);for(const [b,j,q]of faces){if(p*q<1e-18)continue;const id=(a+b)+','+(k+j);next.set(id,(next.get(id)||0)+p*q);}}pmf=next;
      }
      const weight=[...pmf.values()].reduce((a,b)=>a+b,0);
      return [...pmf].map(([key,p])=>{const [a,k]=key.split(',').map(Number);return [transform(a+(spec.flat||0),spec),k,p/weight];});
    });
  }
  function nearest(fn,target,low,high){
    if(fn(0)===target)return 0;
    low=low??-1;high=high??1;
    while(fn(low)>target&&low>-1e100)low=Math.max(-1e100,low*2);
    while(fn(high)<target&&high<1e100)high=Math.min(1e100,high*2);
    // First integer whose function value is >= the target.
    for(let i=0;i<700&&high-low>1;i++){
      const mid=Math.floor(low+(high-low)/2);if(mid===low||mid===high)break;
      if(fn(mid)>=target)high=mid;else low=mid;
    }
    // Include 0 and plateau edges, so flat regions prefer the smallest |b|.
    const candidates=new Set([low,high,0]);
    for(const b of [low,high])if(b<0){const y=fn(b);let l=b,r=0;for(let i=0;i<700&&r-l>1;i++){const m=Math.ceil(l+(r-l)/2);if(m===l||m===r)break;if(fn(m)===y)l=m;else r=m;}candidates.add(fn(r)===y?r:l);}
    return [...candidates].sort((a,b)=>{const delta=Math.abs(fn(a)-target)-Math.abs(fn(b)-target);return Math.abs(delta)>1e-14*Math.max(1,Math.abs(target))?delta:Math.abs(a)-Math.abs(b)||a-b;})[0];
  }
  function hit(accuracy,evasion,ratio=0){
    if(!accuracy||!evasion)return {base:1,target:1,chance:1,correction:0};
    const key=JSON.stringify([accuracy,evasion,ratio,config()]);
    return memo(caches.hit,key,()=>{
      const {ordered,cdf}=memo(caches.pair,JSON.stringify([accuracy,evasion]),()=>{
        const h=distribution(accuracy),e=distribution(evasion),diff=new Map();
        for(const [a,,p]of h)for(const [b,,q]of e)diff.set(b-a,(diff.get(b-a)||0)+p*q);
        const ordered=[...diff].sort((a,b)=>a[0]-b[0]);let sum=0;return {ordered,cdf:ordered.map(([d,p])=>[d,sum+=p])};
      });
      const chance=b=>{let l=0,r=cdf.length;while(l<r){const m=(l+r)>>1;if(cdf[m][0]<b)l=m+1;else r=m;}return Math.max(0,Math.min(1,l?cdf[l-1][1]:0));};
      const base=chance(0),eps=config().probabilityEpsilon,p=Math.max(eps,Math.min(1-eps,base));
      const z=Math.log(p)-Math.log1p(-p)+ratio*config().hitStrengthExponent;
      const target=z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
      const correction=ratio===0?0:nearest(chance,target,Math.min(-1,Math.floor(ordered[0][0])-1),Math.max(1,Math.ceil(ordered.at(-1)[0])+1));
      return {base,target,chance:chance(correction),correction};
    });
  }
  function damage(spec,defense=0,ratio=0,scaleLog=0){
    const key=JSON.stringify([spec,defense,ratio,scaleLog,config()]);
    return memo(caches.damage,key,()=>{
      const pmf=distribution(spec,false),mean=b=>pmf.reduce((n,[a,,p])=>n+Math.max(1,cap(a+b-defense))*p,0);
      const base=mean(0),target=Math.min(1e100,Math.exp(Math.min(Math.log(1e100),Math.max(0,Math.log(base)+scaleLog+ratio*config().damageStrengthExponent))));
      const correction=ratio===0&&scaleLog===0?0:nearest(mean,target,Math.min(-1,Math.floor(defense-Math.max(...pmf.map(x=>x[0])))),Math.max(1,Math.ceil(target+defense-Math.min(...pmf.map(x=>x[0])))));
      return {base,target,mean:mean(correction),correction};
    });
  }
  function outcomes(accuracy,evasion,ratio=0){
    if(!accuracy||!evasion)return {chance:1,bonuses:[[0,1]],conditional:[[0,0,1]]};
    const key=JSON.stringify([accuracy,evasion,ratio,config()]);
    return memo(caches.outcomes,key,()=>{
      const correction=hit(accuracy,evasion,ratio).correction,bonuses=new Map(),conditional=new Map();let chance=0;
      const left=distribution(accuracy,true,true),right=distribution(evasion).slice().sort((a,b)=>a[0]-b[0]);
      let cumulative=0;const cdf=right.map(([v,,p])=>[v,cumulative+=p]);
      const below=(value,inclusive=false)=>{let l=0,r=cdf.length;while(l<r){const m=(l+r)>>1;if(inclusive?cdf[m][0]<=value:cdf[m][0]<value)l=m+1;else r=m;}return l?cdf[l-1][1]:0;};
      for(const [raw,k,p]of left){const a=raw+correction,win=below(a),doubleWin=Math.min(win,below(a/2,true));
        for(const [double,q]of [[0,win-doubleWin],[1,doubleWin]]){const n=double+Math.floor(k/2),w=p*q;if(!w)continue;chance+=w;bonuses.set(n,(bonuses.get(n)||0)+w);const id=n+','+double;conditional.set(id,(conditional.get(id)||0)+w);}
      }
      return {chance,bonuses:[...bonuses],conditional:[...conditional].map(([k,p])=>[...k.split(',').map(Number),p])};
    });
  }
  const api={enemyStageForHP,enemyDurability,enemyValue,value,personalValue,focusLog,effectiveCP,focusMultiplier,relativeLog,absoluteLog,logRatio,scaleLog,hit,damage,outcomes,distribution,nearest,cap};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggStrength=api;
})(typeof window!=='undefined'?window:globalThis);
