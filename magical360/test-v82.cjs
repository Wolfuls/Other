const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');for(const f of ['content','chapter2-content','engine','chapter2','presentation','sfx','continues','chapter3-content','chapter3'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,f+'.js'),'utf8'));
function game(){const g=new Miload.Game(1,{chapter:1,story:false});g.enemies=[];g.upgrades.exercise=1;g.player.inv=0;g.step(1/120,{right:true,dash:true});return g;}
{const g=game();assert.ok(g.player.dashInv>0);assert.equal(g.hurt(200),true);assert.equal(g.life,2);}
{const g=game();const p=g.player;g.hostile=[{x:p.x,y:p.y,w:24,h:56,vx:0,vy:0,life:1}];g.step(1/120,{});assert.equal(g.life,3);for(let i=0;i<30;i++)g.step(1/120,{});assert.equal(g.life,2);}
for(const nextMove of [0,1]){const g=new Miload.Game(1,{chapter:3,story:false});g.stage=3;g.loadStage();const e=g.enemies.find(e=>e.species==='keeper');e.timer=0;e.nextMove=nextMove;g.stepFarmBoss(e,.01);assert.ok(g.hostile.length);assert.ok(g.hostile.every(b=>b.keeper));}
console.log('PASS exercise blocks bullets only, expires; keeper volleys use dedicated projectile');
