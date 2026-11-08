(function(__YggBig){
(function(root){
  'use strict';
  // Round computed values, allowing only floating-point representation noise.
  const floor=value=>(__YggBig.floor((__YggBig.add(value,(__YggBig.min(1e-7,(__YggBig.mul((__YggBig.mul((__YggBig.abs(value)),Number.EPSILON)),4))))))));
  const delta=value=>(__YggBig.eq(value,0))?0:(__YggBig.mul((__YggBig.sign(value)),(__YggBig.max(1,floor((__YggBig.abs(value)))))));
  // Evaluate the CURRENT total bonus, then grant a minimum of 1 once.
  // Do not accumulate that minimum separately for each purchased level.
  const linear=(base,rate,levels)=>(__YggBig.add(floor(base),delta((__YggBig.mul((__YggBig.mul(base,rate)),levels)))));
  // Historical training curve, used only to migrate old saves.
  const training=(base,rate,levels)=>(__YggBig.add(floor(base),(__YggBig.max(levels,floor((__YggBig.mul((__YggBig.mul(base,rate)),levels)))))));
  const geometric=(base,growth,levels)=>(__YggBig.add(floor(base),delta((__YggBig.mul(base,(__YggBig.sub((__YggBig.pow(growth,levels)),1)))))));
  // Log-space evaluation of a curve whose growth eases toward terminal.
  const curveLog=(levels,curve)=>{
    const x=(__YggBig.max(0,levels));
    return (__YggBig.add((__YggBig.mul(x,(__YggBig.log(curve.terminal)))),(__YggBig.mul((__YggBig.mul(curve.transition,(__YggBig.log((__YggBig.div(curve.initial,curve.terminal)))))),(__YggBig.log1p((__YggBig.div(x,curve.transition))))))));
  };
  const curveValue=(base,levels,curve)=>(__YggBig.eq(base,0))?0:(__YggBig.le(levels,0))?base:(__YggBig.exp((__YggBig.add((__YggBig.log(base)),curveLog(levels,curve)))));
  const damage=(amount,multiplier,minimumLevelBonus=0,preLevelMultiplier=1)=>(__YggBig.max(floor((__YggBig.mul(amount,multiplier))),(__YggBig.add(floor((__YggBig.mul(amount,preLevelMultiplier))),minimumLevelBonus))));
  const mitigate=(amount,defense)=>(__YggBig.max(1,floor((__YggBig.sub(amount,defense)))));
  const currencyCurve=curveValue;
  const api={currencyCurve,curveLog,curveValue,floor,delta,linear,training,geometric,damage,mitigate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggNumbers=api;
})(typeof window!=='undefined'?window:globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
