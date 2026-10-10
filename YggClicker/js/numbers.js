(function(root){
  'use strict';
  // Round computed values, allowing only floating-point representation noise.
  const floor=value=>Math.floor(value+Math.min(1e-7,Math.abs(value)*Number.EPSILON*4));
  const delta=value=>value===0?0:Math.sign(value)*Math.max(1,floor(Math.abs(value)));
  // Evaluate the CURRENT total bonus, then grant a minimum of 1 once.
  // Do not accumulate that minimum separately for each purchased level.
  const linear=(base,rate,levels)=>floor(base)+delta(base*rate*levels);
  // Historical training curve, used only to migrate old saves.
  const training=(base,rate,levels)=>floor(base)+Math.max(levels,floor(base*rate*levels));
  const geometric=(base,growth,levels)=>floor(base)+delta(base*(growth**levels-1));
  // Log-space evaluation of a curve whose growth eases toward terminal.
  const curveLog=(levels,curve)=>{
    const x=Math.max(0,levels);
    return x*Math.log(curve.terminal)+curve.transition*Math.log(curve.initial/curve.terminal)*Math.log1p(x/curve.transition);
  };
  const curveValue=(base,levels,curve)=>base===0?0:levels<=0?base:Math.min(1e100,Math.exp(Math.min(Math.log(1e100),Math.log(base)+curveLog(levels,curve))));
  const damage=(amount,multiplier,minimumLevelBonus=0,preLevelMultiplier=1)=>Math.max(floor(amount*multiplier),floor(amount*preLevelMultiplier)+minimumLevelBonus);
  const mitigate=(amount,defense)=>Math.max(1,floor(amount-defense));
  const api={curveLog,curveValue,floor,delta,linear,training,geometric,damage,mitigate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggNumbers=api;
})(typeof window!=='undefined'?window:globalThis);
