(function(__YggBig){
(function(root){
  'use strict';
  const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.YggData;
  const N=typeof module!=='undefined'&&module.exports?require('./numbers.js'):root.YggNumbers;
  const enemyValue=level=>N.curveValue(D.strength.strengthBase,level,D.questGrowth.enemyCurve);
  const enemyDurability=(level,kind)=>{
    if((__YggBig.le(level,0)))return D.strength.strengthBase;
    const c=D.questGrowth.durability,x=(__YggBig.max(0,level)),exponent=kind==='vitality'?c.hpExponent:kind==='power'?(__YggBig.neg(c.attackExponent)):c.defenseExponent;
    return (__YggBig.min(Infinity,(__YggBig.exp((__YggBig.min((__YggBig.log(Infinity)),(__YggBig.add((__YggBig.add((__YggBig.log(D.strength.strengthBase)),N.curveLog(x,D.questGrowth.enemyCurve))),(__YggBig.mul(exponent,(__YggBig.log1p((__YggBig.div(x,c.transition))))))))))))));
  };
  // Continuous growth stage (Q - 1), inferred from authored starting HP.
  // Return the upper bound to avoid rounding a target integer HP down by one.
  function enemyStageForHP(baseHP,initialHP){
    if(!((__YggBig.gt(baseHP,0)))||!((__YggBig.gt(initialHP,baseHP))))return 0;
    const target=(__YggBig.min(Infinity,(__YggBig.mul((__YggBig.div(initialHP,baseHP)),D.strength.strengthBase))));
    let low=0,high=1;
    while((__YggBig.lt(enemyDurability(high,'vitality'),target)))(high=(__YggBig.mul(high,2)));
    for(let i=0;(__YggBig.lt(i,80));i++){const mid=(__YggBig.div((__YggBig.add(low,high)),2));if((__YggBig.lt(enemyDurability(mid,'vitality'),target)))low=mid;else high=mid;}
    return high;
  }
  const caches={distribution:new Map(),pair:new Map(),hit:new Map(),damage:new Map(),outcomes:new Map()};
  const memo=(cache,key,fn)=>{if(cache.has(key))return cache.get(key);const value=fn();if((__YggBig.ge(cache.size,256)))cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
  const config=()=>D.strength;
  const cap=x=>(__YggBig.max((__YggBig.neg(Infinity)),(__YggBig.min(Infinity,x))));
  const value=level=>(__YggBig.min(Infinity,(__YggBig.exp((__YggBig.min((__YggBig.log(Infinity)),(__YggBig.add((__YggBig.log(config().strengthBase)),(__YggBig.mul(level,(__YggBig.log(config().strengthGrowth))))))))))));
  const logRatio=(left=0,right=0,other=0)=>(__YggBig.add((__YggBig.mul((__YggBig.sub(left,right)),(__YggBig.log(config().strengthGrowth)))),other));
  const scaleLog=(left=0,right=0)=>(__YggBig.mul((__YggBig.div((__YggBig.add(left,right)),2)),(__YggBig.log(config().strengthGrowth))));
  const focusLog=(points,total=0)=>(__YggBig.gt(total,0))?(__YggBig.div((__YggBig.mul((__YggBig.log(config().focusGrowth)),(__YggBig.max(0,points)))),(__YggBig.add(1,(__YggBig.div((__YggBig.mul(config().focusDiminishing,(__YggBig.max(0,points)))),total)))))):0;
  const effectiveCP=(points,total=0)=>(__YggBig.gt(total,0))?(__YggBig.div((__YggBig.max(0,points)),(__YggBig.add(1,(__YggBig.div((__YggBig.mul(config().focusDiminishing,(__YggBig.max(0,points)))),total)))))):0;
  const focusMultiplier=(points,total=0,kind='power')=>kind==='action'?(__YggBig.add(1,(__YggBig.mul(.08,effectiveCP(points,total))))):(__YggBig.exp((__YggBig.min((__YggBig.log(Infinity)),focusLog(points,total)))));
  const personalValue=(level,points=0,total=level,kind='power')=>{const linear=(__YggBig.mul(config().strengthBase,(__YggBig.add(1,(__YggBig.mul(config().personalGrowthByKind?.[kind]??config().personalGrowth,(__YggBig.max(0,level)))))))),focus=kind==='action'?(__YggBig.log(focusMultiplier(points,total,kind))):focusLog(points,total);return (__YggBig.mul(linear,(__YggBig.exp(focus))));};
  const relativeLog=(left,right)=>(__YggBig.sub((__YggBig.log(left)),(__YggBig.log(right))));
  const absoluteLog=(left,right)=>(__YggBig.div((__YggBig.add((__YggBig.log((__YggBig.div(left,config().strengthBase)))),(__YggBig.log((__YggBig.div(right,config().strengthBase)))))),2));
  const transform=(v,s)=>(__YggBig.floor((__YggBig.mul(v,s.resultScale??1))));
  // Enumerate rather than sample. The omitted exploding tail is bounded by
  // 6^-22 per die, below double-precision probability resolution. A critical
  // continuation cannot fumble; a fumble's penalty die cannot explode.
  function distribution(spec={},judgment=true,criticals=false){
    const key=JSON.stringify([spec,judgment,criticals]);
    return memo(caches.distribution,key,()=>{
      const faces=[];
      if(judgment){
        for(let p=1;(__YggBig.le(p,6));p++)faces.push([(__YggBig.sub(1,p)),0,(__YggBig.div(1,36))]);
        for(let f=2;(__YggBig.le(f,5));f++)faces.push([f,0,(__YggBig.div(1,6))]);
        for(let n=1;(__YggBig.le(n,22));n++)for(let f=1;(__YggBig.le(f,5));f++)faces.push([(__YggBig.add((__YggBig.mul(n,6)),f)),criticals?n:0,(__YggBig.pow(6,(__YggBig.sub((__YggBig.neg(n)),1))))]);
      }else for(let f=1;(__YggBig.le(f,spec.sides||6));f++)faces.push([f,0,(__YggBig.div(1,spec.sides||6))]);
      let pmf=new Map([['0,0',1]]);
      for(let i=0;(__YggBig.lt(i,spec.dice||0));i++){
        const next=new Map();for(const [key,p]of pmf){const [a,k]=key.split(',').map(Number);for(const [b,j,q]of faces){if((__YggBig.lt((__YggBig.mul(p,q)),1e-18)))continue;const id=(__YggBig.add((__YggBig.add((__YggBig.add(a,b)),',')),(__YggBig.add(k,j))));next.set(id,(__YggBig.add(next.get(id)||0,(__YggBig.mul(p,q)))));}}pmf=next;
      }
      const weight=[...pmf.values()].reduce((a,b)=>(__YggBig.add(a,b)),0);
      return [...pmf].map(([key,p])=>{const [a,k]=key.split(',').map(Number);return [transform((__YggBig.add(a,spec.flat||0)),spec),k,(__YggBig.div(p,weight))];});
    });
  }
  function nearest(fn,target,low,high){
    if((__YggBig.eq(fn(0),target)))return 0; if(low!=null&&high!=null){if((__YggBig.ge(target,fn(high))))return high;if((__YggBig.le(target,fn(low))))return low;}
    low=low??(__YggBig.neg(1));high=high??1;
    while((__YggBig.gt(fn(low),target))&&(__YggBig.gt(low,(__YggBig.neg(Infinity)))))low=(__YggBig.max((__YggBig.neg(Infinity)),(__YggBig.mul(low,2))));
    while((__YggBig.lt(fn(high),target))&&(__YggBig.lt(high,Infinity)))high=(__YggBig.min(Infinity,(__YggBig.mul(high,2))));
    // First integer whose function value is >= the target.
    for(let i=0;(__YggBig.lt(i,700))&&(__YggBig.gt((__YggBig.sub(high,low)),1));i++){
      const mid=(__YggBig.floor((__YggBig.add(low,(__YggBig.div((__YggBig.sub(high,low)),2))))));if((__YggBig.eq(mid,low))||(__YggBig.eq(mid,high)))break;
      if((__YggBig.ge(fn(mid),target)))high=mid;else low=mid;
    }
    // Include 0 and plateau edges, so flat regions prefer the smallest |b|.
    const candidates=new Set([low,high,0]);
    for(const b of [low,high])if((__YggBig.lt(b,0))){const y=fn(b);let l=b,r=0;for(let i=0;(__YggBig.lt(i,700))&&(__YggBig.gt((__YggBig.sub(r,l)),1));i++){const m=(__YggBig.ceil((__YggBig.add(l,(__YggBig.div((__YggBig.sub(r,l)),2))))));if((__YggBig.eq(m,l))||(__YggBig.eq(m,r)))break;if((__YggBig.eq(fn(m),y)))l=m;else r=m;}candidates.add((__YggBig.eq(fn(r),y))?r:l);}
    return [...candidates].sort((__YggBig.sort((a,b)=>{const delta=(__YggBig.sub((__YggBig.abs((__YggBig.sub(fn(a),target)))),(__YggBig.abs((__YggBig.sub(fn(b),target))))));return (__YggBig.gt((__YggBig.abs(delta)),(__YggBig.mul(1e-14,(__YggBig.max(1,(__YggBig.abs(target))))))))?delta:(__YggBig.sub((__YggBig.abs(a)),(__YggBig.abs(b))))||(__YggBig.sub(a,b));})))[0];
  }
  function hit(accuracy,evasion,ratio=0){
    if(!accuracy||!evasion)return {base:1,target:1,chance:1,correction:0};
    const key=JSON.stringify([accuracy,evasion,ratio,config()]);
    return memo(caches.hit,key,()=>{
      const {ordered,cdf}=memo(caches.pair,JSON.stringify([accuracy,evasion]),()=>{
        const h=distribution(accuracy),e=distribution(evasion),diff=new Map();
        for(const [a,,p]of h)for(const [b,,q]of e)diff.set((__YggBig.sub(b,a)),(__YggBig.add(diff.get((__YggBig.sub(b,a)))||0,(__YggBig.mul(p,q)))));
        const ordered=[...diff].sort((__YggBig.sort((a,b)=>(__YggBig.sub(a[0],b[0])))));let sum=0;return {ordered,cdf:ordered.map(([d,p])=>[d,(sum=(__YggBig.add(sum,p)))])};
      });
      const chance=b=>{let l=0,r=cdf.length;while((__YggBig.lt(l,r))){const m=((__YggBig.add(l,r)))>>1;if((__YggBig.lt(cdf[m][0],b)))l=(__YggBig.add(m,1));else r=m;}return (__YggBig.max(0,(__YggBig.min(1,l?cdf[(__YggBig.sub(l,1))][1]:0))));};
      const base=chance(0),eps=config().probabilityEpsilon,p=(__YggBig.max(eps,(__YggBig.min((__YggBig.sub(1,eps)),base))));
      const z=(__YggBig.add((__YggBig.sub((__YggBig.log(p)),(__YggBig.log1p((__YggBig.neg(p)))))),(__YggBig.mul(ratio,config().hitStrengthExponent))));
      const target=(__YggBig.ge(z,0))?(__YggBig.div(1,(__YggBig.add(1,(__YggBig.exp((__YggBig.neg(z)))))))):(__YggBig.div((__YggBig.exp(z)),(__YggBig.add(1,(__YggBig.exp(z))))));
      const correction=(__YggBig.eq(ratio,0))?0:nearest(chance,target,(__YggBig.min((__YggBig.neg(1)),(__YggBig.sub((__YggBig.floor(ordered[0][0])),1)))),(__YggBig.max(1,(__YggBig.add((__YggBig.ceil(ordered.at((__YggBig.neg(1)))[0])),1)))));
      return {base,target,chance:chance(correction),correction};
    });
  }
  function damage(spec,defense=0,ratio=0,scaleLog=0){
    const key=JSON.stringify([spec,defense,ratio,scaleLog,config()]);
    return memo(caches.damage,key,()=>{
      const pmf=distribution(spec,false),mean=b=>pmf.reduce((n,[a,,p])=>(__YggBig.add(n,(__YggBig.mul((__YggBig.max(1,cap((__YggBig.sub((__YggBig.add(a,b)),defense))))),p)))),0);
      const base=mean(0),target=(__YggBig.min(Infinity,(__YggBig.exp((__YggBig.min((__YggBig.log(Infinity)),(__YggBig.max(0,(__YggBig.add((__YggBig.add((__YggBig.log(base)),scaleLog)),(__YggBig.mul(ratio,config().damageStrengthExponent))))))))))));
      const correction=(__YggBig.eq(ratio,0))&&(__YggBig.eq(scaleLog,0))?0:nearest(mean,target,(__YggBig.min((__YggBig.neg(1)),(__YggBig.floor((__YggBig.sub(defense,(__YggBig.max(...pmf.map(x=>x[0]))))))))),(__YggBig.max(1,(__YggBig.ceil((__YggBig.sub((__YggBig.add(target,defense)),(__YggBig.min(...pmf.map(x=>x[0]))))))))));
      return {base,target,mean:mean(correction),correction};
    });
  }
  function outcomes(accuracy,evasion,ratio=0){
    if(!accuracy||!evasion)return {chance:1,bonuses:[[0,1]],conditional:[[0,0,1]]};
    const key=JSON.stringify([accuracy,evasion,ratio,config()]);
    return memo(caches.outcomes,key,()=>{
      const correction=hit(accuracy,evasion,ratio).correction,bonuses=new Map(),conditional=new Map();let chance=0;
      const left=distribution(accuracy,true,true),right=distribution(evasion).slice().sort((__YggBig.sort((a,b)=>(__YggBig.sub(a[0],b[0])))));
      let cumulative=0;const cdf=right.map(([v,,p])=>[v,(cumulative=(__YggBig.add(cumulative,p)))]);
      const below=(value,inclusive=false)=>{let l=0,r=cdf.length;while((__YggBig.lt(l,r))){const m=((__YggBig.add(l,r)))>>1;if(inclusive?(__YggBig.le(cdf[m][0],value)):(__YggBig.lt(cdf[m][0],value)))l=(__YggBig.add(m,1));else r=m;}return l?cdf[(__YggBig.sub(l,1))][1]:0;};
      for(const [raw,k,p]of left){const a=(__YggBig.add(raw,correction)),win=below(a),doubleWin=(__YggBig.min(win,below((__YggBig.div(a,2)),true)));
        for(const [double,q]of [[0,(__YggBig.sub(win,doubleWin))],[1,doubleWin]]){const n=(__YggBig.add(double,(__YggBig.floor((__YggBig.div(k,2)))))),w=(__YggBig.mul(p,q));if(!w)continue;(chance=(__YggBig.add(chance,w)));bonuses.set(n,(__YggBig.add(bonuses.get(n)||0,w)));const id=(__YggBig.add((__YggBig.add(n,',')),double));conditional.set(id,(__YggBig.add(conditional.get(id)||0,w)));}
      }
      return {chance,bonuses:[...bonuses],conditional:[...conditional].map(([k,p])=>[...k.split(',').map(Number),p])};
    });
  }
  const api={enemyStageForHP,enemyDurability,enemyValue,value,personalValue,focusLog,effectiveCP,focusMultiplier,relativeLog,absoluteLog,logRatio,scaleLog,hit,damage,outcomes,distribution,nearest,cap};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggStrength=api;
})(typeof window!=='undefined'?window:globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
