const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.join(__dirname,'..');
for(const [,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g))if(f!=='game.js')vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const {Game,shotInterval,shotCost,WANDS}=Miload;
function make(h){const g=new Game(42,{chapter:3,story:false});g.inventory=['fortune'];g.enemies=[];g.platforms=[{x:0,y:458,w:6000,h:100,ground:true}];Object.assign(g.player,{x:100,y:402,grounded:true,aimActive:true,aimX:900,aimY:300});g.happiness=h;return g;}
assert.equal(Miload.wandParents.fortune,'sugar');assert.deepEqual(Miload.wandBranches[2].levels[1],['fortune']);
{const g=make(99);assert.equal(g.canUnlockWand('fortune'),false);g.unlockedWands.push('sugar');assert.equal(g.canUnlockWand('fortune'),true);g.state='upgrade';assert.equal(g.chooseReward('wands','fortune'),true);assert.ok(g.unlockedWands.includes('fortune'));assert.ok(g.setEquipped('fortune',true));}
assert.equal(shotInterval('fortune',0),2.5);assert.ok(Math.abs(shotInterval('fortune',99)-.06)<1e-9);
for(let h=1;h<=99;h++)assert.ok(shotInterval('fortune',h)<shotInterval('fortune',h-1));
for(const h of [0,25,50,80,99]){const g=make(h),angle=Miload.aimFor(g.player).angle,deltas=[];for(let i=0;i<60;i++){g.energy=100;g.player.fire=0;assert.equal(g.shoot(),true);assert.equal(g.energy,100-shotCost('fortune',h));assert.equal(g.happiness,h);assert.ok(Math.abs(g.player.fire-shotInterval('fortune',h))<1e-9);const b=g.bullets.at(-1),d=Math.atan2(b.vy,b.vx)-angle;assert.ok(Math.abs(d)<=.2400001);assert.equal(b.damage,2);deltas.push(d);}assert.ok(Math.min(...deltas)<-.1&&Math.max(...deltas)>.1);}
for(const h of [0,99]){const g=make(h);g.shoot();g.step(1/120,{});assert.equal(g.energy,100-shotCost('fortune',h),'shot recovery blocks regeneration');assert.equal(g.shoot(),false);g.player.fire=0;g.energy=shotCost('fortune',h)-.01;const before=g.energy;assert.equal(g.shoot(),false);assert.equal(g.energy,before);g.step(1/120,{});assert.ok(g.energy>before,'failed shots permit recovery');}
// Real held input: enough mana to measure rate without refills, at the game's 120 Hz step.
for(const [h,min,max]of [[0,1,1],[50,2,2],[99,15,17]]){const g=make(h);g.upgrades.training=10;g.energy=g.maxEnergy;g.events=[];for(let i=0;i<120;i++)g.step(1/120,{fire:true});const n=g.events.filter(e=>e.type==='shoot').length;assert.ok(n>=min&&n<=max,`${h}: ${n}`);}
{const g=make(99);g.shoot();g.player.fire=0;g.happiness=0;g.shoot();assert.equal(g.player.fire,2.5,'life-up happiness reset changes subsequent fire rate');}
assert.ok(MiloadSfx.samples('fortuneShot',8000).some(x=>Math.abs(x)>.01));
for(const k of ['star','sugar','spread','ray'])assert.equal(shotInterval(k,99),WANDS[k].cooldown);
console.log('PASS fortune branch/unlock, nonlinear fire rate, aimed jitter, mana/recovery, held fire and happiness reset');
