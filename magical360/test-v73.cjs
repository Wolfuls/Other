const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
for(const f of ['content','chapter2-content','engine','chapter2','presentation','sfx','continues','chapter3-content','chapter3'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,f+'.js'),'utf8'));
function make(){const g=new Miload.Game(1,{chapter:3,story:false});g.stage=1;g.loadStage();g.player.inv=999;return g;}
assert.equal(MiloadContent.farmMaps[1].lever.length,1);
assert.ok(!MiloadContent.chapterThree.some(e=>e.id==='c3-secret'));
for(const type of ['slime','bat']){const g=make();g.enemies=[];const e=g.spawnEnemy(type,300,458);e.hp=1;e.y=600;g.step(1/120,{});assert.equal(e.state,'respawning');for(let i=0;i<120;i++)g.step(1/120,{});assert.equal(e.state,'respawning');for(let i=0;i<122;i++)g.step(1/120,{});assert.equal(e.state,'alive');assert.ok(e.returning);assert.equal(e.x,300);assert.ok(e.y<0);assert.equal(e.hp,1);for(let i=0;i<120;i++)g.step(1/120,{});assert.equal(e.returning,false);assert.ok(e.y<458);}
{const g=make();g.enemies=[];const e=g.spawnEnemy('slime',300,458);e.state='alive';e.returning=true;e.y=600;g.step(1/120,{});assert.equal(e.state,'respawning');}
{const g=make();g.enemies=[];const p=g.player;p.x=300;p.y=402;p.grounded=true;g.platforms.push({x:300+p.w,y:350,w:30,h:108,solid:true});for(let i=0;i<120;i++)g.step(1/120,{right:true});assert.equal(p.x,300);assert.equal(p.vx,0);assert.equal(p.walkPhase,0);assert.equal(p.runPhase,0);assert.equal(p.dashing,false);g.step(1/60,{left:true});assert.ok(p.x<300);}
console.log('PASS delayed falling respawn, retained HP, lost support retry, wall idle and removed pudding lever');
