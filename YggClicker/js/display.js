(function (root) {
  'use strict';
  const integers = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:0 });
  const rates = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:3 });
  const currency = new Intl.NumberFormat('ja-JP', { notation:'standard', maximumFractionDigits:2 });
  const fullNumber = value => integers.format(Math.floor(value));
  const currencyNumber = value => currency.format(value);
  const incomeNumber = value => rates.format(value);
  // Grow the orbit and its inter-ring distances with the weapon, not the body.
  // Preserve world-space spacing, then fit the complete scene into its viewport.
  function orbitLayout({ metaScale=1, richterScale=1, richterHired=false, width=500, mobile=false, enemyCount=1, grounded=false,metaCount=60,richterCount=60 }) {
    const orbit = (w,h,size,scale) => ({width:w*scale,height:h*scale,footprint:(Math.max(w,h)+size)*scale});
    const meta=orbit(mobile?180:210,mobile?180:210,mobile?24:28,metaScale);
    const richter=orbit(mobile?204:220,mobile?214:230,mobile?38:42,richterScale);
    meta.footprint=Math.max(224,meta.footprint);richter.footprint=Math.max(240,richter.footprint);
    if (grounded) return groundLayout({meta:visibleOrbit('meta',meta,metaCount,metaScale,mobile),richter:visibleOrbit('richter',richter,richterCount,richterScale,mobile),richterHired,width,mobile,enemyCount});
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
  // Fit actual visible orbits. Cover cropping determines the pavement line
  // without forcing empty space into a fixed 3:2 canvas.
  function groundLayout({meta,richter,richterHired,width,mobile,enemyCount}) {
    const metaFoot=72,richterFoot=mobile?93:99;
    const enemyWidth=mobile?144:176,enemyHeight=enemyWidth*224/192;
    const partyWidth=meta.footprint+(richterHired?32+richter.footprint:0);
    const groupWidth=enemyWidth*(enemyCount>1?1.95:1),edge=24,gap=56;
    const belowFeet=Math.max(meta.extentY/2-metaFoot,richterHired?richter.extentY/2-richterFoot:0)+76;
    const canvasWidth=Math.max(width,partyWidth+groupWidth+gap+edge*2);
    // A centered 3:2 cover image has its safe ground line at the larger of
    // .66H and .5H + (.16 * 2/3)W. Solve bottom clearance before zooming.
    const height=Math.max(360,(belowFeet+40)/.34,canvasWidth*(.32*2/3)+2*(belowFeet+40),
      (meta.extentY/2+metaFoot-8)/.66,richterHired?(richter.extentY/2+richterFoot-8)/.66:0);
    const groundY=height/2+.16*Math.max(height,canvasWidth/1.5),feetY=groundY+24;
    meta.x=edge+meta.footprint/2;meta.y=feetY-metaFoot;meta.footOffset=metaFoot;
    richter.x=edge+meta.footprint+32+richter.footprint/2;richter.y=feetY-richterFoot;richter.footOffset=richterFoot;
    const enemyFoot=enemyHeight*99/224;
    const floorDepth=height-groundY;
    const enemyX=canvasWidth-edge-groupWidth+enemyWidth/2,enemyY=groundY+floorDepth*.45-enemyFoot;
    const heightLimit=mobile?560:700;
    const zoom=Math.min(1,width/canvasWidth,heightLimit/height);
    return {meta,richter,width:canvasWidth,height,groundY,enemyX,enemyY,enemyWidth,enemyHeight,enemyFoot,
      reserves:enemyCount>1?[{x:enemyWidth*.95,y:-floorDepth*.25},{x:enemyWidth*.95,y:floorDepth*.33}]:[],
      zoom,viewWidth:canvasWidth*zoom,viewHeight:height*zoom,offsetX:(width-canvasWidth*zoom)/2,heightLimit};
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
  const api={fullNumber,currencyNumber,incomeNumber,orbitLayout,MAX_FACTOR_CRYSTALS,factorRainCount,factorDieAppearance,MAX_REWARD_DICE,rewardDiceCount};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.YggDisplay=api;
})(typeof window !== 'undefined' ? window : globalThis);
