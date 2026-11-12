const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
for(const f of ['content','chapter2-content','engine','chapter2','presentation','sfx','continues','chapter3-content','chapter3','chapter4-content','chapter4','progression'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f+'.js'),'utf8'));
const {Game,controlsFor}=Miload,held=new Set(['KeyD','ShiftLeft']);
for(const mode of ['shift','both']){const i=controlsFor(held,new Set(['ShiftLeft']),false,0,mode,1);assert.equal(i.dash,true);assert.equal(i.airDash,1);assert.equal(controlsFor(held,new Set(),false,0,mode).airDash,0);}
assert.equal(controlsFor(held,new Set(['ShiftLeft']),false,0,'double').dash,false);
assert.equal(controlsFor(new Set(['KeyD']),new Set(['KeyD']),false,1,'shift').dash,false);
assert.equal(controlsFor(new Set(['KeyD']),new Set(['KeyD']),false,1,'both').airDash,1);
assert.equal(controlsFor(new Set(['ShiftRight']),new Set(['ShiftRight']),false,0,'shift',-1).airDash,-1);
for(const [first,second] of [['arrow','blade'],['arrow','comet'],['twin','echo']]){const g=new Game(1,{chapter:1,story:false});g.state='upgrade';assert.equal(g.chooseReward('wands',second),false);assert.equal(g.chooseReward('wands',first),true);g.rewardPicks=null;assert.equal(g.chooseReward('wands',second),true);}
{const g=new Game(1,{chapter:1,story:false});assert.equal(g.canUnlockWand('sugar'),true);assert.equal(g.canUnlockWand('guide'),false);g.unlockedWands.push('twin','echo');assert.equal(g.canUnlockWand('guide'),true);assert.ok(Miload.WANDS.arrow.damage>Miload.WANDS.star.damage);g.inventory=['arrow'];g.enemies=[];assert.ok(g.shoot());assert.equal(g.bullets[0].damage,3);}
for(let stage=0;stage<3;stage++){const g=new Game(1,{chapter:2,story:false});g.stage=stage;g.loadStage();for(const e of g.enemies){if(e.type==='naniwa'){assert.equal(e.townKind,undefined);continue;}assert.ok(['bun','wafer','tin'].includes(e.townKind));g.stepTownEnemy(e,1/60);assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y));g.transform(e,'star');assert.equal(e.state,'candy');}}
console.log('PASS dash modes, edge-triggered Shift air dash, branch prerequisites, town enemies and candy');
