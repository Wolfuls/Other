(function (root) {
  'use strict';
  const integers = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0 });
  const rates = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:3 });
  const currency = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0,roundingMode:'trunc' });
  const largeUnits=['million','billion','trillion','quadrillion','quintillion','sextillion','septillion','octillion','nonillion','decillion','undecillion','duodecillion','tredecillion','quattuordecillion','quindecillion','sexdecillion','septendecillion','octodecillion','novemdecillion','vigintillion'];
  const japaneseUnits=['万','億','兆','京','垓','秭','穣','溝','澗','正','載','極','恒河沙','阿僧祇','那由他','不可思議','無量大数'];
  function compactNumber(value,style=true){
    if(style==='japanese'){
      const absolute=Math.abs(value);if(!Number.isFinite(value)||absolute<1e4)return null;
      let power=Math.floor(Math.log10(absolute)/4)*4,scaled=value/10**power;
      if(Math.abs(Number(scaled.toFixed(3)))>=10000){power+=4;scaled=value/10**power;}
      return rates.format(scaled)+(japaneseUnits[power/4-1]||'×10^'+power);
    }
    const absolute=Math.abs(value);if(!Number.isFinite(value)||absolute<1e6)return null;
    let power=Math.floor(Math.log10(absolute)/3)*3,scaled=value/10**power;
    if(Math.abs(Number(scaled.toFixed(3)))>=1000){power+=3;scaled=value/10**power;}
    return rates.format(scaled)+' '+(largeUnits[power/3-2]||'×10^'+power);
  }
  const fullNumber = (value,simplified=false) => simplified&&compactNumber(Math.floor(value),simplified)||integers.format(Math.floor(value));
  const currencyNumber = (value,simplified=false) => simplified&&compactNumber(value,simplified)||currency.format(value);
  const incomeNumber = (value,simplified=false) => simplified&&compactNumber(value,simplified)||rates.format(value);
  function scenePhase(seconds,cycle) {
    const time=((seconds||0)%cycle.seconds+cycle.seconds)%cycle.seconds,half=cycle.seconds/2,fade=cycle.transitionSeconds;
    const smooth=t=>t*t*(3-2*t);
    if(time<half-fade)return {label:'昼',night:0};
    if(time<half)return {label:'夕暮れ',night:smooth((time-half+fade)/fade)};
    if(time<cycle.seconds-fade)return {label:'夜',night:1};
    return {label:'夜明け',night:1-smooth((time-cycle.seconds+fade)/fade)};
  }
  function outdoorPhase(seconds,cycle){
    const time=((seconds||0)%cycle.seconds+cycle.seconds)%cycle.seconds;
    const stages=[['dawn','朝焼け',.15],['day','昼',.5],['dusk','夕方',.65],['night','夜',1]];
    const i=stages.findIndex(s=>time<s[2]*cycle.seconds),current=stages[i],next=stages[(i+1)%4];
    const end=current[2]*cycle.seconds,fade=Math.min(cycle.transitionSeconds,cycle.seconds*.1);
    const t=Math.max(0,Math.min(1,(time-end+fade)/fade)),blend=t*t*(3-2*t);
    return {from:current[0],to:next[0],blend,label:current[1]};
  }
  // Grow the orbit and its inter-ring distances with the weapon, not the body.
  // Preserve world-space spacing, then fit the complete scene into its viewport.
  function orbitLayout({ metaScale=1, richterScale=1, metaHired=true, richterHired=false, vishunalHired=false, tordelieseHired=false, maxHired=false, wakuHired=false, jewelHired=false, mitsuruHired=false,queenHired=false,meguminHired=false, width=500, mobile=false, enemyCount=1,enemyScale=1,formationLayout='column', grounded=false,metaCount=60,richterCount=60,availableHeight=null,formationRows={} }) {
    const orbit = (w,h,size,scale) => ({width:w*scale,height:h*scale,footprint:(Math.max(w,h)+size)*scale});
    const meta=orbit(mobile?180:210,mobile?180:210,mobile?24:28,metaScale);
    const richter=orbit(mobile?204:220,mobile?214:230,mobile?38:42,richterScale);
    meta.footprint=Math.max(224,meta.footprint);richter.footprint=Math.max(240,richter.footprint);
    if (grounded || vishunalHired || tordelieseHired || maxHired || wakuHired || jewelHired || mitsuruHired || queenHired || meguminHired) return groundLayout({meta:visibleOrbit('meta',meta,metaCount,metaScale,mobile),richter:visibleOrbit('richter',richter,richterCount,richterScale,mobile),metaHired,richterHired,vishunalHired,tordelieseHired,maxHired,wakuHired,jewelHired,mitsuruHired,queenHired,meguminHired,width,mobile,enemyCount,enemyScale,formationLayout,availableHeight,formationRows});
    const partyWidth=Math.max(meta.footprint,richterHired?richter.footprint:0),enemyWidth=mobile?144:(enemyCount>1?176:200);
    const enemyHeight=enemyCount>1?enemyWidth*224/192:(mobile?154:162);
    const enemyGroupWidth=enemyWidth*(enemyCount>1?1.9:1);
    const canvasWidth=Math.max(width,partyWidth+enemyGroupWidth+64),partyX=16+partyWidth/2;
    meta.x=partyX;meta.y=16+meta.footprint/2;
    richter.x=partyX;richter.y=16+meta.footprint+64+24+richter.footprint/2;
    const height=Math.max(380,enemyCount>1?enemyWidth*1.6+enemyHeight+32:0,16+meta.footprint+64+(richterHired?24+richter.footprint+64:0)+16);
    const heightLimit=richterHired?(mobile?560:700):(mobile?340:380);
    const zoom=Math.min(1,width/canvasWidth,heightLimit/height);
    return {meta,richter,width:canvasWidth,height,enemyX:canvasWidth-enemyGroupWidth+enemyWidth/2-16,enemyY:height/2,enemyWidth,enemyHeight,
      reserves:enemyCount>1?[{x:enemyWidth*.78,y:-enemyWidth*.8},{x:enemyWidth*.9,y:enemyWidth*.8}]:[],
      zoom,viewWidth:canvasWidth*zoom,viewHeight:height*zoom,offsetX:(width-canvasWidth*zoom)/2,heightLimit};
  }
  function visibleOrbit(id,orbit,count,scale,mobile) {
    if(id==='richter')return creatureOrbit(count,scale,mobile);
    const meta=id==='meta',bodyHeight=meta?160:mobile?210:224;
    const size=(meta?(mobile?24:28):(mobile?38:42))*scale;
    const density=.5+.5*Math.sqrt(Math.min(60,Math.max(0,count))/60);
    const width=count?Math.max(meta?160:200,orbit.width*density):0;
    const height=count?Math.max(meta?160:210,orbit.height*density):0;
    // The rotating slots occupy 44–46% of the box radius; reserve their
    // swept bounds, including the weapon itself, rather than the empty box.
    const radius=meta?(count<=32?.44:.45):(count<=12?.44:count<=32?.45:.46);
    const diameter=count?Math.max(width,height)*radius*2+size:0;
    return {width,height,footprint:Math.max(210,diameter),extentY:Math.max(bodyHeight,diameter)};
  }
  // Keep opaque bodies apart while letting transparent margins overlap.
  // Chord spacing and ring gaps grow with the sprite, without excessive spread.
  function creatureOrbit(count,scale=1,mobile=false){
    const size=(mobile?38:42)*scale,gap=size*.92+2*scale,rings=[];
    let remaining=Math.min(60,Math.max(0,count)),radius=Math.max(78,size*1.15);
    while(remaining>0){
      const capacity=Math.max(1,Math.floor(Math.PI/Math.asin(Math.min(1,gap/(2*radius)))));
      const amount=Math.min(remaining,capacity);rings.push({amount,radius});remaining-=amount;radius+=gap;
    }
    const width=rings.length?rings.at(-1).radius*2:0,extent=width+size;
    return {width,height:width,size,rings:rings.map(r=>[r.amount,r.radius/width*100]),footprint:Math.max(210,count?extent:0),extentY:Math.max(mobile?210:224,count?extent:0)};
  }
  // Fit actual visible orbits. Cover cropping determines the pavement line
  // without forcing empty space into a fixed 3:2 canvas.
  function groundLayout({meta,richter,metaHired,richterHired,vishunalHired,tordelieseHired,maxHired,wakuHired,jewelHired,mitsuruHired,queenHired,meguminHired,width,mobile,enemyCount,enemyScale,formationLayout,availableHeight,formationRows={}}) {
    const metaFoot=72,richterFoot=mobile?93:99;
    const enemyWidth=(mobile?144:176)*enemyScale,enemyHeight=enemyWidth*224/192,enemyFoot=enemyHeight*99/224;
    const spriteScale=mobile?105/224:.5;
    const vishunal={width:0,height:0,footprint:224*spriteScale,extentY:224*spriteScale,footOffset:90*spriteScale,spriteScale};
    // Reduce the body by about 10%, preserving its foot anchor and limb scale.
    const tordelieseSize=mobile?216:230;
    const tordeliese={width:tordelieseSize,height:tordelieseSize,footprint:tordelieseSize,extentY:tordelieseSize,footOffset:(360/384-.5)*tordelieseSize,spriteSize:tordelieseSize};
    const waku={width:224,height:224,footprint:210,extentY:224,footOffset:72,spriteSize:224};
    const mitsuru={width:224,height:224,footprint:210,extentY:256,footOffset:96,spriteSize:224};
    // About 152 cm; use the registered shoe baseline at source Y=360.
    const queenSize=mobile?196:208;
    const queen={width:queenSize,height:queenSize,footprint:queenSize*.94,extentY:queenSize,footOffset:(360/384-.5)*queenSize,spriteSize:queenSize};
    // Roughly 150 cm beside Meta (140 cm) and Tordeliese (165 cm); include the hat.
    const meguminSize=mobile?188:200;
    // Reserve forward space for the horizontal staff and six charge circles.
    const megumin={width:meguminSize,height:meguminSize,footprint:meguminSize*1.68,anchorX:meguminSize*.475,extentY:meguminSize,footOffset:(360/384-.5)*meguminSize,spriteSize:meguminSize};
    const jewel={width:224,height:224,footprint:210,extentY:224,footOffset:101.5,spriteSize:224};
    const maxSize=180;
    const max={width:maxSize,height:maxSize,footprint:maxSize,extentY:maxSize,footOffset:100*maxSize/224,spriteSize:maxSize,hoverHeight:mobile?88:100};
    const party=[...(maxHired?[max]:[]),...(metaHired?[meta]:[]),...(mitsuruHired?[mitsuru]:[]),...(meguminHired?[megumin]:[]),...(richterHired?[richter]:[]),...(vishunalHired?[vishunal]:[]),...(tordelieseHired?[tordeliese]:[]),...(wakuHired?[waku]:[]),...(jewelHired?[jewel]:[]),...(queenHired?[queen]:[])];
    const actors={max,meta,mitsuru,megumin,richter,vishunal,tordeliese,waku,jewel,queen};
    party.sort((a,b)=>Number(formationRows[Object.keys(actors).find(id=>actors[id]===a)]!=='rear')-Number(formationRows[Object.keys(actors).find(id=>actors[id]===b)]!=='rear'));
    const partyWidth=party.reduce((sum,p)=>sum+p.footprint,0)+Math.max(0,party.length-1)*32;
    const groupWidth=enemyWidth*(enemyCount>1?2.45:1),edge=24,gap=56;
    const belowFeet=Math.max(meguminHired?megumin.extentY/2-megumin.footOffset:0,queenHired?queen.extentY/2-queen.footOffset:0,mitsuruHired?mitsuru.extentY/2-mitsuru.footOffset:0,metaHired?meta.extentY/2-metaFoot:0,richterHired?richter.extentY/2-richterFoot:0,vishunalHired?vishunal.extentY/2-vishunal.footOffset:0,tordelieseHired?tordeliese.extentY/2-tordeliese.footOffset:0,maxHired?12:0,wakuHired?waku.extentY/2-waku.footOffset:0,jewelHired?jewel.extentY/2-jewel.footOffset:0);
    const canvasWidth=Math.max(width,partyWidth+groupWidth+gap+edge*2);
    // A centered 3:2 cover image has its safe ground line at the larger of
    // .66H and .5H + (.16 * 2/3)W. Solve bottom clearance before zooming.
    // The frontmost reserve has only 22% of the floor left below its feet.
    const enemyBottomSpace=(enemyHeight/2-enemyFoot+8)/(enemyCount>1?.22:.55);
    const floorNeeded=Math.max(belowFeet+40,enemyBottomSpace);
    const minimumHeight=Math.max(meguminHired?(megumin.extentY/2+megumin.footOffset-8)/.66:0,queenHired?(queen.extentY/2+queen.footOffset-8)/.66:0,mitsuruHired?(mitsuru.extentY/2+mitsuru.footOffset-8)/.66:0,360,(enemyHeight/2+enemyFoot+16)/(enemyCount>1?.728:.8),floorNeeded/.34,canvasWidth*(.32*2/3)+2*floorNeeded,
      metaHired?(meta.extentY/2+metaFoot-8)/.66:0,richterHired?(richter.extentY/2+richterFoot-8)/.66:0,tordelieseHired?(tordeliese.extentY/2+tordeliese.footOffset-8)/.66:0,
      jewelHired?(jewel.extentY/2+jewel.footOffset-8)/.66:0,wakuHired?(waku.extentY/2+waku.footOffset-8)/.66:0,maxHired?(max.extentY/2+max.footOffset+max.hoverHeight-12)/.66:0);
    // The outer window stays fixed through purchases. Only the world inside
    // scales when actual sprite/orbit bounds no longer fit the available area.
    const heightLimit=availableHeight>0?Math.max(80,availableHeight):(mobile?360:480);
    const zoom=Math.min(1,width/canvasWidth,heightLimit/minimumHeight);
    const height=heightLimit/zoom;
    const groundY=height/2+.16*Math.max(height,canvasWidth/1.5),feetY=groundY+24;
    let partyLeft=edge;
    for(const p of [...party,...Object.values(actors).filter(p=>!party.includes(p))]){p.x=partyLeft+(p.anchorX??p.footprint/2);if(party.includes(p))partyLeft+=p.footprint+32;}
    meta.y=feetY-metaFoot;meta.footOffset=metaFoot;
    richter.y=feetY-richterFoot;richter.footOffset=richterFoot;
    vishunal.y=feetY-vishunal.footOffset;
    mitsuru.y=feetY-mitsuru.footOffset;queen.y=feetY-queen.footOffset;megumin.y=feetY-megumin.footOffset;
    waku.y=feetY-waku.footOffset;jewel.y=feetY-jewel.footOffset;
    tordeliese.y=feetY-tordeliese.footOffset;max.y=feetY-max.footOffset-max.hoverHeight;
    const floorDepth=height-groundY;
    const enemyX=canvasWidth-edge-groupWidth+enemyWidth/2,enemyY=feetY-enemyFoot;
    return {meta,richter,vishunal,tordeliese,max,waku,jewel,mitsuru,queen,megumin,width:canvasWidth,height,groundY,enemyX,enemyY,enemyWidth,enemyHeight,enemyFoot,
      reserves:enemyCount>1?[{x:enemyWidth*.7,y:-Math.min(14,floorDepth*.04)},{x:enemyWidth*1.4,y:Math.min(14,floorDepth*.04)}]:[],
      zoom,viewWidth:canvasWidth*zoom,viewHeight:heightLimit,offsetX:(width-canvasWidth*zoom)/2,heightLimit};
  }
  // Formation size is independent of whether the enemies share one sprite.
  const enemyFormationSize=session=>session.formationCount??(session.traits?.includes('swarm')?3:1);
  // Keep the two visible reserves in order, randomize each new arrival, and
  // avoid duplicate appearances in the three currently visible slots.
  function advanceEnemyQueue(queue, variantCount, steps=0, rng=Math.random) {
    const size=Math.min(3,variantCount);
    if (!size) return [];
    let next=queue.slice(0,size);
    if(next.length!==size || steps>=size) next=[];
    else next=next.slice(Math.max(0,Math.floor(steps)));
    while(next.length<size) {
      const choices=Array.from({length:variantCount},(_,i)=>i).filter(i=>!next.includes(i));
      next.push(choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))]);
    }
    return next;
  }
  // A shuffled cycle reaches every muzzle without repeating only two ports.
  function shuffledPorts(count, rng=Math.random) {
    const ports=Array.from({length:count},(_,i)=>i);
    for(let i=ports.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[ports[i],ports[j]]=[ports[j],ports[i]];}
    return ports;
  }
  // Decoration grows slowly with income and never grows the DOM without bound.
  const MAX_FACTOR_CRYSTALS = 24;
  const factorRainCount = income => income > 0 ? Math.min(MAX_FACTOR_CRYSTALS, 3 + Math.floor(3 * Math.log10(1 + income))) : 0;
  const MAX_REWARD_DICE = 48;
  const rewardDiceCount = clears => clears > 0 ? Math.min(8, 3 + Math.floor(Math.log2(Math.max(1,clears)))) : 0;
  const dieFaces=[[[50,50]],[[28,28],[72,72]],[[28,28],[50,50],[72,72]],[[28,28],[72,28],[28,72],[72,72]],[[28,28],[72,28],[50,50],[28,72],[72,72]],[[28,25],[72,25],[28,50],[72,50],[28,75],[72,75]]];
  const factorDieAppearance = index => {
    const face=index%6+1,size=[8,20,40,12,28,10,16,34][index%8];
    return {face,size,pips:dieFaces[face-1].map(([x,y])=>`radial-gradient(circle at ${x}% ${y}%,#1d4b40 0 8%,transparent 9%)`).join(',')};
  };
  const cloudFormation=(x,y)=>[{x:x+180,y:y-55},{x,y:y-120},{x:x+5,y:y+55}];
  const api={cloudFormation,fullNumber,currencyNumber,incomeNumber,scenePhase,outdoorPhase,orbitLayout,creatureOrbit,enemyFormationSize,advanceEnemyQueue,shuffledPorts,MAX_FACTOR_CRYSTALS,factorRainCount,factorDieAppearance,MAX_REWARD_DICE,rewardDiceCount};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.YggDisplay=api;
})(typeof window !== 'undefined' ? window : globalThis);

