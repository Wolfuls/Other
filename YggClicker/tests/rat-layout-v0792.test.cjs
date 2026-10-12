const test=require('node:test'),assert=require('node:assert/strict'),UI=require('../js/display');
for(const width of [390,1000])test('electric rat surround formation preserves scaled feet and bounds at '+width,()=>{
 const l=UI.orbitLayout({width,mobile:width<600,grounded:true,enemyCount:3,formationLayout:'surround',metaCount:0});
 assert.deepEqual(l.enemyScales,[1.5,.75,.75]);
 assert.ok(l.reserves[0].x<0&&l.reserves[1].x>0);
 const bossFeet=l.enemyY+l.enemyFoot*1.5;
 l.reserves.forEach((p,i)=>{
  assert.ok(Math.abs(l.enemyY+p.y+l.enemyFoot*.75-bossFeet-(i?-12:12))<1e-7);
  const x=l.enemyX+p.x,half=l.enemyWidth*.75/2;
  assert.ok(x-half>=0&&x+half<=l.width);
 });
 assert.ok(l.enemyY-l.enemyHeight*1.5/2>=0);
});
