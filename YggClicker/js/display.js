(function (root) {
  'use strict';
  const integers = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0 });
  const rates = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:3 });
  const currency = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0,roundingMode:'trunc' });
  const fullNumber = value => integers.format(Math.floor(value));
  const currencyNumber = value => currency.format(value);
  const incomeNumber = value => rates.format(value);
  function scenePhase(seconds,cycle) {
    const time=((seconds||0)%cycle.seconds+cycle.seconds)%cycle.seconds,half=cycle.seconds/2,fade=cycle.transitionSeconds;
    const smooth=t=>t*t*(3-2*t);
    if(time<half-fade)return {label:'昼',night:0};
    if(time<half)return {label:'夕暮れ',night:smooth((time-half+fade)/fade)};
    if(time<cycle.seconds-fade)return {label:'夜',night:1};
    return {label:'夜明け',night:1-smooth((time-cycle.seconds+fade)/fade)};
  }
  // Grow the orbit and its inter-ring distances with the weapon, not the body.
  // Preserve world-space spacing, then fit the complete scene into its viewport.
  function orbitLayout({ metaScale=1, richterScale=1, metaHired=true, richterHired=false, vishunalHired=false, width=500, mobile=false, enemyCount=1,enemyScale=1,formationLayout='column', grounded=false,metaCount=60,richterCount=60,availableHeight=null }) {
    const orbit = (w,h,size,scale) => ({width:w*scale,height:h*scale,footprint:(Math.max(w,h)+size)*scale});
    const meta=orbit(mobile?180:210,mobile?180:210,mobile?24:28,metaScale);
    const richter=orbit(mobile?204:220,mobile?214:230,mobile?38:42,richterScale);
    meta.footprint=Math.max(224,meta.footprint);richter.footprint=Math.max(240,richter.footprint);
    if (grounded || vishunalHired) return groundLayout({meta:visibleOrbit('meta',meta,metaCount,metaScale,mobile),richter:visibleOrbit('richter',richter,richterCount,richterScale,mobile),metaHired,richterHired,vishunalHired,width,mobile,enemyCount,enemyScale,formationLayout,availableHeight});
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
  function groundLayout({meta,richter,metaHired,richterHired,vishunalHired,width,mobile,enemyCount,enemyScale,formationLayout,availableHeight}) {
    const metaFoot=72,richterFoot=mobile?93:99;
    const enemyWidth=(mobile?144:176)*enemyScale,enemyHeight=enemyWidth*224/192,enemyFoot=enemyHeight*99/224;
    const spriteScale=mobile?105/224:.5;
    const vishunal={width:0,height:0,footprint:224*spriteScale,extentY:224*spriteScale,footOffset:90*spriteScale,spriteScale};
    const party=[...(metaHired?[meta]:[]),...(richterHired?[richter]:[]),...(vishunalHired?[vishunal]:[])];
    const partyWidth=party.reduce((sum,p)=>sum+p.footprint,0)+Math.max(0,party.length-1)*32;
    const groupWidth=enemyWidth*(enemyCount>1?1.95:1),edge=24,gap=56;
    const belowFeet=Math.max(metaHired?meta.extentY/2-metaFoot:0,richterHired?richter.extentY/2-richterFoot:0,vishunalHired?vishunal.extentY/2-vishunal.footOffset:0);
    const canvasWidth=Math.max(width,partyWidth+groupWidth+gap+edge*2);
    // A centered 3:2 cover image has its safe ground line at the larger of
    // .66H and .5H + (.16 * 2/3)W. Solve bottom clearance before zooming.
    // The frontmost reserve has only 22% of the floor left below its feet.
    const enemyBottomSpace=(enemyHeight/2-enemyFoot+8)/(enemyCount>1?.22:.55);
    const floorNeeded=Math.max(belowFeet+40,enemyBottomSpace);
    const minimumHeight=Math.max(360,(enemyHeight/2+enemyFoot+16)/(enemyCount>1?.728:.8),floorNeeded/.34,canvasWidth*(.32*2/3)+2*floorNeeded,
      metaHired?(meta.extentY/2+metaFoot-8)/.66:0,richterHired?(richter.extentY/2+richterFoot-8)/.66:0);
    // The outer window stays fixed through purchases. Only the world inside
    // scales when actual sprite/orbit bounds no longer fit the available area.
    const heightLimit=availableHeight>0?Math.max(80,availableHeight):(mobile?360:480);
    const zoom=Math.min(1,width/canvasWidth,heightLimit/minimumHeight);
    const height=heightLimit/zoom;
    const groundY=height/2+.16*Math.max(height,canvasWidth/1.5),feetY=groundY+24;
    let partyLeft=edge;
    for(const p of [meta,richter,vishunal]){p.x=partyLeft+p.footprint/2;if(party.includes(p))partyLeft+=p.footprint+32;}
    meta.y=feetY-metaFoot;meta.footOffset=metaFoot;
    richter.y=feetY-richterFoot;richter.footOffset=richterFoot;
    vishunal.y=feetY-vishunal.footOffset;
    const floorDepth=height-groundY;
    const enemyX=canvasWidth-edge-groupWidth+enemyWidth/2,enemyY=groundY+floorDepth*.45-enemyFoot;
    return {meta,richter,vishunal,width:canvasWidth,height,groundY,enemyX,enemyY,enemyWidth,enemyHeight,enemyFoot,
      reserves:enemyCount>1?[{x:enemyWidth*.95,y:-floorDepth*.25},{x:enemyWidth*(formationLayout==='staggered'?.6:.95),y:floorDepth*.33}]:[],
      zoom,viewWidth:canvasWidth*zoom,viewHeight:heightLimit,offsetX:(width-canvasWidth*zoom)/2,heightLimit};
  }
  // Formation size is independent of whether the enemies share one sprite.
  const enemyFormationSize=session=>session.formationCount===3||(session.variants||[]).length>=3?3:1;
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
  const api={fullNumber,currencyNumber,incomeNumber,scenePhase,orbitLayout,creatureOrbit,enemyFormationSize,advanceEnemyQueue,shuffledPorts,MAX_FACTOR_CRYSTALS,factorRainCount,factorDieAppearance,MAX_REWARD_DICE,rewardDiceCount};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.YggDisplay=api;
})(typeof window !== 'undefined' ? window : globalThis);
