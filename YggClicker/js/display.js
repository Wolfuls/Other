(function(__YggBig){
(function (root) {
  'use strict';
  const integers = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0 });
  const rates = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:3 });
  const currency = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0,roundingMode:'trunc' });
  const largeUnits=['million','billion','trillion','quadrillion','quintillion','sextillion','septillion','octillion','nonillion','decillion','undecillion','duodecillion','tredecillion','quattuordecillion','quindecillion','sexdecillion','septendecillion','octodecillion','novemdecillion','vigintillion'];
  const japaneseUnits=['万','億','兆','京','垓','秭','穣','溝','澗','正','載','極','恒河沙','阿僧祇','那由他','不可思議','無量大数'];
  function compactNumber(value,style=true,integer=false){
    if(__YggBig.isBig(value))return __YggBig.format(value);
    if(style==='japanese'){
      const absolute=(__YggBig.abs(value));if(!(__YggBig.isFinite(value))||(__YggBig.lt(absolute,1e4)))return null;
      let power=(__YggBig.mul((__YggBig.floor((__YggBig.div((__YggBig.log10(absolute)),4)))),4)),scaled=(__YggBig.div(value,(__YggBig.pow(10,power))));
      if((__YggBig.ge((__YggBig.abs(integer?(__YggBig.floor(scaled)):Number((__YggBig.toFixed(scaled,3))))),10000))){(power=(__YggBig.add(power,4)));scaled=(__YggBig.div(value,(__YggBig.pow(10,power))));}
      return (__YggBig.add(integer?integers.format((__YggBig.floor(scaled))):rates.format(scaled),japaneseUnits[(__YggBig.sub((__YggBig.div(power,4)),1))]||(__YggBig.add('×10^',power))));
    }
    const absolute=(__YggBig.abs(value));if(!(__YggBig.isFinite(value))||(__YggBig.lt(absolute,1e6)))return null;
    let power=(__YggBig.mul((__YggBig.floor((__YggBig.div((__YggBig.log10(absolute)),3)))),3)),scaled=(__YggBig.div(value,(__YggBig.pow(10,power))));
    if((__YggBig.ge((__YggBig.abs(integer?(__YggBig.floor(scaled)):Number((__YggBig.toFixed(scaled,3))))),1000))){(power=(__YggBig.add(power,3)));scaled=(__YggBig.div(value,(__YggBig.pow(10,power))));}
    return (__YggBig.add((__YggBig.add(integer?integers.format((__YggBig.floor(scaled))):rates.format(scaled),' ')),largeUnits[(__YggBig.sub((__YggBig.div(power,3)),2))]||(__YggBig.add('×10^',power))));
  }
  const strengthNumber=(value,simplified=false)=>__YggBig.isBig(value)?__YggBig.format(value):simplified&&compactNumber(value,simplified,true)||integers.format((__YggBig.floor((__YggBig.add(value,(__YggBig.min(1e-7,(__YggBig.mul((__YggBig.mul(Number.EPSILON,(__YggBig.max(1,(__YggBig.abs(value)))))),8)))))))));
  const fullNumber = (value,simplified=false) => __YggBig.isBig(value)?__YggBig.format(value):simplified&&compactNumber((__YggBig.floor(value)),simplified)||integers.format((__YggBig.floor(value)));
  const currencyNumber = (value,simplified=false) => __YggBig.isBig(value)?__YggBig.format(value):simplified&&compactNumber(value,simplified)||currency.format(value);
  const incomeNumber = (value,simplified=false) => __YggBig.isBig(value)?__YggBig.format(value):simplified&&compactNumber(value,simplified)||rates.format(value);
  function scenePhase(seconds,cycle) {
    const time=((__YggBig.add((seconds||0)%cycle.seconds,cycle.seconds)))%cycle.seconds,half=(__YggBig.div(cycle.seconds,2)),fade=cycle.transitionSeconds;
    const smooth=t=>(__YggBig.mul((__YggBig.mul(t,t)),(__YggBig.sub(3,(__YggBig.mul(2,t))))));
    if((__YggBig.lt(time,(__YggBig.sub(half,fade)))))return {label:'昼',night:0};
    if((__YggBig.lt(time,half)))return {label:'夕暮れ',night:smooth((__YggBig.div((__YggBig.add((__YggBig.sub(time,half)),fade)),fade)))};
    if((__YggBig.lt(time,(__YggBig.sub(cycle.seconds,fade)))))return {label:'夜',night:1};
    return {label:'夜明け',night:(__YggBig.sub(1,smooth((__YggBig.div((__YggBig.add((__YggBig.sub(time,cycle.seconds)),fade)),fade)))))};
  }
  function outdoorPhase(seconds,cycle){
    const time=((__YggBig.add((seconds||0)%cycle.seconds,cycle.seconds)))%cycle.seconds;
    const stages=[['dawn','朝焼け',.15],['day','昼',.5],['dusk','夕方',.65],['night','夜',1]];
    const i=stages.findIndex(s=>(__YggBig.lt(time,(__YggBig.mul(s[2],cycle.seconds))))),current=stages[i],next=stages[((__YggBig.add(i,1)))%4];
    const end=(__YggBig.mul(current[2],cycle.seconds)),fade=(__YggBig.min(cycle.transitionSeconds,(__YggBig.mul(cycle.seconds,.1))));
    const t=(__YggBig.max(0,(__YggBig.min(1,(__YggBig.div((__YggBig.add((__YggBig.sub(time,end)),fade)),fade)))))),blend=(__YggBig.mul((__YggBig.mul(t,t)),(__YggBig.sub(3,(__YggBig.mul(2,t))))));
    return {from:current[0],to:next[0],blend,label:current[1]};
  }
  // Grow the orbit and its inter-ring distances with the weapon, not the body.
  // Preserve world-space spacing, then fit the complete scene into its viewport.
  function orbitLayout({ metaScale=1, richterScale=1, metaHired=true, richterHired=false, vishunalHired=false, maxHired=false, wakuHired=false, jewelHired=false, mitsuruHired=false,queenHired=false,meguminHired=false,aniyaHired=false,hayatoHired=false,pineHired=false,cherryHired=false, width=500, mobile=false, enemyCount=1,enemyScale=1,formationLayout='column',groundFraction=.66, grounded=false,metaCount=60,richterCount=60,availableHeight=null,formationRows={} }) {
    const orbit = (w,h,size,scale) => ({width:(__YggBig.mul(w,scale)),height:(__YggBig.mul(h,scale)),footprint:(__YggBig.mul((__YggBig.add((__YggBig.max(w,h)),size)),scale))});
    const meta=orbit(mobile?180:210,mobile?180:210,mobile?24:28,metaScale);
    const richter=orbit(mobile?204:220,mobile?214:230,mobile?38:42,richterScale);
    meta.footprint=(__YggBig.max(224,meta.footprint));richter.footprint=(__YggBig.max(240,richter.footprint));
    if (grounded || vishunalHired || maxHired || wakuHired || jewelHired || mitsuruHired || queenHired || meguminHired || cherryHired || pineHired || hayatoHired) return groundLayout({meta:visibleOrbit('meta',meta,metaCount,metaScale,mobile),richter:visibleOrbit('richter',richter,richterCount,richterScale,mobile),metaHired,richterHired,vishunalHired,maxHired,wakuHired,jewelHired,mitsuruHired,queenHired,meguminHired,aniyaHired,hayatoHired,pineHired,cherryHired,width,mobile,enemyCount,enemyScale,formationLayout,groundFraction,availableHeight,formationRows});
    const partyWidth=(__YggBig.max(meta.footprint,richterHired?richter.footprint:0)),enemyWidth=mobile?144:((__YggBig.gt(enemyCount,1))?176:200);
    const enemyHeight=(__YggBig.gt(enemyCount,1))?(__YggBig.div((__YggBig.mul(enemyWidth,224)),192)):(mobile?154:162);
    const enemyGroupWidth=(__YggBig.mul(enemyWidth,(__YggBig.gt(enemyCount,1))?1.9:1));
    const canvasWidth=(__YggBig.max(width,(__YggBig.add((__YggBig.add(partyWidth,enemyGroupWidth)),64)))),partyX=(__YggBig.add(16,(__YggBig.div(partyWidth,2))));
    meta.x=partyX;meta.y=(__YggBig.add(16,(__YggBig.div(meta.footprint,2))));
    richter.x=partyX;richter.y=(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(16,meta.footprint)),64)),24)),(__YggBig.div(richter.footprint,2))));
    const height=(__YggBig.max(380,(__YggBig.gt(enemyCount,1))?(__YggBig.add((__YggBig.add((__YggBig.mul(enemyWidth,1.6)),enemyHeight)),32)):0,(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(16,meta.footprint)),64)),richterHired?(__YggBig.add((__YggBig.add(24,richter.footprint)),64)):0)),16))));
    const heightLimit=richterHired?(mobile?560:700):(mobile?340:380);
    const zoom=(__YggBig.min(1,(__YggBig.div(width,canvasWidth)),(__YggBig.div(heightLimit,height))));
    return {meta,richter,width:canvasWidth,height,enemyX:(__YggBig.sub((__YggBig.add((__YggBig.sub(canvasWidth,enemyGroupWidth)),(__YggBig.div(enemyWidth,2)))),16)),enemyY:(__YggBig.div(height,2)),enemyWidth,enemyHeight,
      reserves:(__YggBig.gt(enemyCount,1))?[{x:(__YggBig.mul(enemyWidth,.78)),y:(__YggBig.mul((__YggBig.neg(enemyWidth)),.8))},{x:(__YggBig.mul(enemyWidth,.9)),y:(__YggBig.mul(enemyWidth,.8))}]:[],
      zoom,viewWidth:(__YggBig.mul(canvasWidth,zoom)),viewHeight:(__YggBig.mul(height,zoom)),offsetX:(__YggBig.div((__YggBig.sub(width,(__YggBig.mul(canvasWidth,zoom)))),2)),heightLimit};
  }
  function visibleOrbit(id,orbit,count,scale,mobile) {
    if(!count)return {width:0,height:0,footprint:210,extentY:id==='meta'?160:mobile?210:224};
    if(id==='richter')return creatureOrbit(count,scale,mobile);
    const meta=id==='meta',bodyHeight=meta?160:mobile?210:224;
    const size=(__YggBig.mul(meta?(mobile?24:28):(mobile?38:42),scale));
    const density=(__YggBig.add(.5,(__YggBig.mul(.5,(__YggBig.sqrt((__YggBig.div((__YggBig.min(60,(__YggBig.max(0,count)))),60))))))));
    const width=count?(__YggBig.max(meta?160:200,(__YggBig.mul(orbit.width,density)))):0;
    const height=count?(__YggBig.max(meta?160:210,(__YggBig.mul(orbit.height,density)))):0;
    // The rotating slots occupy 44–46% of the box radius; reserve their
    // swept bounds, including the weapon itself, rather than the empty box.
    const radius=meta?((__YggBig.le(count,32))?.44:.45):((__YggBig.le(count,12))?.44:(__YggBig.le(count,32))?.45:.46);
    const diameter=count?(__YggBig.add((__YggBig.mul((__YggBig.mul((__YggBig.max(width,height)),radius)),2)),size)):0;
    return {width,height,footprint:(__YggBig.max(210,diameter)),extentY:(__YggBig.max(bodyHeight,diameter))};
  }
  // Keep opaque bodies apart while letting transparent margins overlap.
  // Chord spacing and ring gaps grow with the sprite, without excessive spread.
  function creatureOrbit(count,scale=1,mobile=false){
    const size=(__YggBig.mul(mobile?38:42,scale)),gap=(__YggBig.add((__YggBig.mul(size,.92)),(__YggBig.mul(2,scale)))),rings=[];
    let remaining=(__YggBig.min(60,(__YggBig.max(0,count)))),radius=(__YggBig.max(78,(__YggBig.mul(size,1.15))));
    while((__YggBig.gt(remaining,0))){
      const capacity=(__YggBig.max(1,(__YggBig.floor((__YggBig.div(Math.PI,Math.asin((__YggBig.min(1,(__YggBig.div(gap,(__YggBig.mul(2,radius)))))))))))));
      const amount=(__YggBig.min(remaining,capacity));rings.push({amount,radius});(remaining=(__YggBig.sub(remaining,amount)));(radius=(__YggBig.add(radius,gap)));
    }
    const width=rings.length?(__YggBig.mul(rings.at((__YggBig.neg(1))).radius,2)):0,extent=(__YggBig.add(width,size));
    return {width,height:width,size,rings:rings.map(r=>[r.amount,(__YggBig.mul((__YggBig.div(r.radius,width)),100))]),footprint:(__YggBig.max(210,count?extent:0)),extentY:(__YggBig.max(mobile?210:224,count?extent:0))};
  }
  // Fit actual visible orbits. Cover cropping determines the pavement line
  // without forcing empty space into a fixed 3:2 canvas.
  function groundLayout({meta,richter,metaHired,richterHired,vishunalHired,maxHired,wakuHired,jewelHired,mitsuruHired,queenHired,meguminHired,aniyaHired,hayatoHired,pineHired,cherryHired,width,mobile,enemyCount,enemyScale,formationLayout,groundFraction,availableHeight,formationRows={}}) {
    const floorFraction=(__YggBig.eq(groundFraction,.66))?.34:(__YggBig.sub(1,groundFraction)),groundDelta=(__YggBig.eq(groundFraction,.66))?.16:(__YggBig.sub(groundFraction,.5));
    const metaFoot=72,richterFoot=mobile?93:99;
    const enemyWidth=(__YggBig.mul(mobile?144:176,enemyScale)),enemyHeight=(__YggBig.div((__YggBig.mul(enemyWidth,224)),192)),enemyFoot=(__YggBig.div((__YggBig.mul(enemyHeight,99)),224));
    const spriteScale=mobile?(__YggBig.div(105,224)):.5;
    const vishunal={width:0,height:0,footprint:(__YggBig.mul(224,spriteScale)),extentY:(__YggBig.mul(224,spriteScale)),footOffset:(__YggBig.mul(90,spriteScale)),spriteScale};
    // Reduce the body by about 10%, preserving its foot anchor and limb scale.
    const waku={width:224,height:224,footprint:210,extentY:224,footOffset:72,spriteSize:224};
    const mitsuru={width:224,height:224,footprint:210,extentY:256,footOffset:96,spriteSize:224};
    // About 152 cm; use the registered shoe baseline at source Y=360.
    const queenSize=mobile?196:208;
    const queen={width:queenSize,height:queenSize,footprint:(__YggBig.mul(queenSize,.94)),extentY:queenSize,footOffset:(__YggBig.mul((__YggBig.sub((__YggBig.div(360,384)),.5)),queenSize)),spriteSize:queenSize};
    // Roughly 150 cm beside Meta (140 cm); include the hat.
    const meguminSize=mobile?188:200;
    // Reserve forward space for the horizontal staff and six charge circles.
    const megumin={width:meguminSize,height:meguminSize,footprint:(__YggBig.mul(meguminSize,1.68)),anchorX:(__YggBig.mul(meguminSize,.475)),extentY:meguminSize,footOffset:(__YggBig.mul((__YggBig.sub((__YggBig.div(360,384)),.5)),meguminSize)),spriteSize:meguminSize};
    const aniya={width:300,height:275,footprint:212.5,extentY:275,footOffset:118.75,spriteSize:300};
    const hayato={width:240,height:220,footprint:170,extentY:220,footOffset:95,spriteSize:240};
    const pine={width:220,height:220,footprint:180,extentY:220,footOffset:104,spriteSize:220};
    const cherry={width:150,height:150,footprint:150,extentY:150,footOffset:65.625,spriteSize:150};
    const jewel={width:224,height:224,footprint:210,extentY:224,footOffset:101.5,spriteSize:224};
    const maxSize=180;
    const max={width:maxSize,height:maxSize,footprint:maxSize,extentY:maxSize,footOffset:(__YggBig.div((__YggBig.mul(100,maxSize)),224)),spriteSize:maxSize,hoverHeight:mobile?88:100};
    const party=[...(aniyaHired?[aniya]:[]),...(hayatoHired?[hayato]:[]),...(pineHired?[pine]:[]),...(cherryHired?[cherry]:[]),...(maxHired?[max]:[]),...(metaHired?[meta]:[]),...(mitsuruHired?[mitsuru]:[]),...(meguminHired?[megumin]:[]),...(richterHired?[richter]:[]),...(vishunalHired?[vishunal]:[]),...(wakuHired?[waku]:[]),...(jewelHired?[jewel]:[]),...(queenHired?[queen]:[])];
    const actors={aniya,hayato,pine,cherry,max,meta,mitsuru,megumin,richter,vishunal,waku,jewel,queen};
    party.sort((__YggBig.sort((a,b)=>(__YggBig.sub(Number(formationRows[Object.keys(actors).find(id=>(__YggBig.eq(actors[id],a)))]!=='rear'),Number(formationRows[Object.keys(actors).find(id=>(__YggBig.eq(actors[id],b)))]!=='rear'))))));
    const partyWidth=(__YggBig.add(party.reduce((sum,p)=>(__YggBig.add(sum,p.footprint)),0),(__YggBig.mul((__YggBig.max(0,(__YggBig.sub(party.length,1)))),32))));
    const surround=formationLayout==='surround',groupWidth=(__YggBig.mul(enemyWidth,surround?2.8:(__YggBig.gt(enemyCount,1))?2.45:1)),edge=24,gap=56;
    const belowFeet=(__YggBig.max(meguminHired?(__YggBig.sub((__YggBig.div(megumin.extentY,2)),megumin.footOffset)):0,queenHired?(__YggBig.sub((__YggBig.div(queen.extentY,2)),queen.footOffset)):0,mitsuruHired?(__YggBig.sub((__YggBig.div(mitsuru.extentY,2)),mitsuru.footOffset)):0,metaHired?(__YggBig.sub((__YggBig.div(meta.extentY,2)),metaFoot)):0,richterHired?(__YggBig.sub((__YggBig.div(richter.extentY,2)),richterFoot)):0,vishunalHired?(__YggBig.sub((__YggBig.div(vishunal.extentY,2)),vishunal.footOffset)):0,maxHired?12:0,wakuHired?(__YggBig.sub((__YggBig.div(waku.extentY,2)),waku.footOffset)):0,jewelHired?(__YggBig.sub((__YggBig.div(jewel.extentY,2)),jewel.footOffset)):0));
    const canvasWidth=(__YggBig.max(width,(__YggBig.add((__YggBig.add((__YggBig.add(partyWidth,groupWidth)),gap)),(__YggBig.mul(edge,2))))));
    // A centered 3:2 cover image has its safe ground line at the larger of
    // .66H and .5H + (.16 * 2/3)W. Solve bottom clearance before zooming.
    // The frontmost reserve has only 22% of the floor left below its feet.
    const enemyBottomSpace=(__YggBig.div((__YggBig.add((__YggBig.sub((__YggBig.div(enemyHeight,2)),enemyFoot)),8)),(__YggBig.gt(enemyCount,1))?.22:.55));
    const floorNeeded=(__YggBig.max((__YggBig.add(belowFeet,40)),enemyBottomSpace));
    const minimumHeight=(__YggBig.max(meguminHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(megumin.extentY,2)),megumin.footOffset)),8)),groundFraction)):0,queenHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(queen.extentY,2)),queen.footOffset)),8)),groundFraction)):0,mitsuruHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(mitsuru.extentY,2)),mitsuru.footOffset)),8)),groundFraction)):0,360,(__YggBig.div((__YggBig.add((__YggBig.mul((__YggBig.add((__YggBig.div(enemyHeight,2)),enemyFoot)),surround?1.5:1)),16)),(__YggBig.gt(enemyCount,1))?.728:.8)),(__YggBig.div(floorNeeded,floorFraction)),(__YggBig.add((__YggBig.mul(canvasWidth,(__YggBig.div((__YggBig.mul((__YggBig.mul(groundDelta,2)),2)),3)))),(__YggBig.mul(2,floorNeeded)))),metaHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(meta.extentY,2)),metaFoot)),8)),groundFraction)):0,richterHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(richter.extentY,2)),richterFoot)),8)),groundFraction)):0,jewelHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(jewel.extentY,2)),jewel.footOffset)),8)),groundFraction)):0,wakuHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.div(waku.extentY,2)),waku.footOffset)),8)),groundFraction)):0,maxHired?(__YggBig.div((__YggBig.sub((__YggBig.add((__YggBig.add((__YggBig.div(max.extentY,2)),max.footOffset)),max.hoverHeight)),12)),groundFraction)):0));
    // The outer window stays fixed through purchases. Only the world inside
    // scales when actual sprite/orbit bounds no longer fit the available area.
    const heightLimit=(__YggBig.gt(availableHeight,0))?(__YggBig.max(80,availableHeight)):(mobile?484:560);
    const zoom=(__YggBig.min(1,(__YggBig.div(width,canvasWidth)),(__YggBig.div(heightLimit,minimumHeight))));
    const height=(__YggBig.div(heightLimit,zoom));
    const groundY=(__YggBig.add((__YggBig.div(height,2)),(__YggBig.mul(groundDelta,(__YggBig.max(height,(__YggBig.div(canvasWidth,1.5)))))))),feetY=(__YggBig.add(groundY,24));
    let partyLeft=edge;
    for(const p of [...party,...Object.values(actors).filter(p=>!party.includes(p))]){p.x=(__YggBig.add(partyLeft,p.anchorX??(__YggBig.div(p.footprint,2))));if(party.includes(p))(partyLeft=(__YggBig.add(partyLeft,(__YggBig.add(p.footprint,32)))));}
    aniya.y=(__YggBig.sub(feetY,aniya.footOffset));
    hayato.y=(__YggBig.sub(feetY,hayato.footOffset));
    pine.y=(__YggBig.sub(feetY,pine.footOffset));
    cherry.y=(__YggBig.sub(feetY,cherry.footOffset));
    meta.y=(__YggBig.sub(feetY,metaFoot));meta.footOffset=metaFoot;
    richter.y=(__YggBig.sub(feetY,richterFoot));richter.footOffset=richterFoot;
    vishunal.y=(__YggBig.sub(feetY,vishunal.footOffset));
    mitsuru.y=(__YggBig.sub(feetY,mitsuru.footOffset));queen.y=(__YggBig.sub(feetY,queen.footOffset));megumin.y=(__YggBig.sub(feetY,megumin.footOffset));
    waku.y=(__YggBig.sub(feetY,waku.footOffset));jewel.y=(__YggBig.sub(feetY,jewel.footOffset));
    max.y=(__YggBig.sub((__YggBig.sub(feetY,max.footOffset)),max.hoverHeight));
    const floorDepth=(__YggBig.sub(height,groundY));
    const enemyX=(__YggBig.add((__YggBig.sub((__YggBig.sub(canvasWidth,edge)),groupWidth)),surround?(__YggBig.div(groupWidth,2)):(__YggBig.div(enemyWidth,2)))),enemyY=(__YggBig.sub(feetY,(__YggBig.mul(enemyFoot,surround?1.5:1))));
    return {aniya,hayato,pine,cherry,meta,richter,vishunal,max,waku,jewel,mitsuru,queen,megumin,width:canvasWidth,height,groundY,enemyX,enemyY,enemyWidth,enemyHeight,enemyFoot,
      enemyScales:surround?[1.5,.75,.75]:[1,1,1],
      reserves:surround?[{x:(__YggBig.mul((__YggBig.neg(enemyWidth)),.85)),y:(__YggBig.add((__YggBig.mul(enemyFoot,.75)),12))},{x:(__YggBig.mul(enemyWidth,.85)),y:(__YggBig.sub((__YggBig.mul(enemyFoot,.75)),12))}]:(__YggBig.gt(enemyCount,1))?[{x:(__YggBig.mul(enemyWidth,.7)),y:(__YggBig.neg((__YggBig.min(14,(__YggBig.mul(floorDepth,.04))))))},{x:(__YggBig.mul(enemyWidth,1.4)),y:(__YggBig.min(14,(__YggBig.mul(floorDepth,.04))))}]:[],
      zoom,viewWidth:(__YggBig.mul(canvasWidth,zoom)),viewHeight:heightLimit,offsetX:(__YggBig.div((__YggBig.sub(width,(__YggBig.mul(canvasWidth,zoom)))),2)),heightLimit};
  }
  // Formation size is independent of whether the enemies share one sprite.
  const enemyFormationSize=session=>session.formationCount??(session.traits?.includes('swarm')?3:1);
  // Keep the two visible reserves in order, randomize each new arrival, and
  // avoid duplicate appearances in the three currently visible slots.
  function advanceEnemyQueue(queue, variantCount, steps=0, rng=Math.random) {
    const size=(__YggBig.min(3,variantCount));
    if (!size) return [];
    let next=queue.slice(0,size);
    if((__YggBig.ne(next.length,size)) || (__YggBig.ge(steps,size))) next=[];
    else next=next.slice((__YggBig.max(0,(__YggBig.floor(steps)))));
    while((__YggBig.lt(next.length,size))) {
      const choices=Array.from({length:variantCount},(_,i)=>i).filter(i=>!next.includes(i));
      next.push(choices[(__YggBig.min((__YggBig.sub(choices.length,1)),(__YggBig.floor((__YggBig.mul(rng(),choices.length))))))]);
    }
    return next;
  }
  // A shuffled cycle reaches every muzzle without repeating only two ports.
  function shuffledPorts(count, rng=Math.random) {
    const ports=Array.from({length:count},(_,i)=>i);
    for(let i=(__YggBig.sub(ports.length,1));(__YggBig.gt(i,0));i--){const j=(__YggBig.min(i,(__YggBig.floor((__YggBig.mul(rng(),(__YggBig.add(i,1))))))));[ports[i],ports[j]]=[ports[j],ports[i]];}
    return ports;
  }
  // Decoration grows slowly with income and never grows the DOM without bound.
  const MAX_FACTOR_CRYSTALS = 24;
  const factorRainCount = income => (__YggBig.gt(income,0)) ? (__YggBig.min(MAX_FACTOR_CRYSTALS,(__YggBig.add(3,(__YggBig.floor((__YggBig.mul(3,(__YggBig.log10((__YggBig.add(1,income)))))))))))) : 0;
  const MAX_REWARD_DICE = 48;
  const rewardDiceCount = clears => (__YggBig.gt(clears,0)) ? (__YggBig.min(8,(__YggBig.add(3,(__YggBig.floor((__YggBig.log2((__YggBig.max(1,clears)))))))))) : 0;
  const dieFaces=[[[50,50]],[[28,28],[72,72]],[[28,28],[50,50],[72,72]],[[28,28],[72,28],[28,72],[72,72]],[[28,28],[72,28],[50,50],[28,72],[72,72]],[[28,25],[72,25],[28,50],[72,50],[28,75],[72,75]]];
  const factorDieAppearance = index => {
    const face=(__YggBig.add(index%6,1)),size=[8,20,40,12,28,10,16,34][index%8];
    return {face,size,pips:dieFaces[(__YggBig.sub(face,1))].map(([x,y])=>`radial-gradient(circle at ${x}% ${y}%,#1d4b40 0 8%,transparent 9%)`).join(',')};
  };
  const cloudFormation=(x,y)=>[{x:(__YggBig.add(x,180)),y:(__YggBig.sub(y,55))},{x,y:(__YggBig.sub(y,120))},{x:(__YggBig.add(x,5)),y:(__YggBig.add(y,55))}];
  const api={strengthNumber,cloudFormation,fullNumber,currencyNumber,incomeNumber,scenePhase,outdoorPhase,orbitLayout,creatureOrbit,enemyFormationSize,advanceEnemyQueue,shuffledPorts,MAX_FACTOR_CRYSTALS,factorRainCount,factorDieAppearance,MAX_REWARD_DICE,rewardDiceCount};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.YggDisplay=api;
})(typeof window !== 'undefined' ? window : globalThis);


})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
