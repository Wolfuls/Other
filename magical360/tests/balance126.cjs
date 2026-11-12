const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.join(__dirname,'..');for(const [,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g)){if(file==='game.js')continue;vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));}
const make=k=>{const g=new Miload.Game(1,{chapter:1,story:false});g.inventory=[k];g.enemies=[];g.upgrades.training=20;g.platforms=[];g.player.inv=999;return g;};
for(const energy of [100,349]){const g=make('glory');g.energy=energy;g.step(1/120,{fire:true});assert.equal(g.channel,null);}
{const g=make('glory');g.energy=350;g.step(1/120,{fire:true});assert.equal(g.channel.kind,'glory');assert.ok(Math.abs(g.energy-(350-100-200/120))<1e-6);g.step(1/120,{fire:false});g.step(1/120,{fire:true});assert.equal(g.channel,null);}
{const g=make('stake');g.energy=349;assert.equal(g.shoot(),false);g.energy=350;assert.equal(g.shoot(),true);assert.equal(g.energy,0);}
{const g=make('saw');g.energy=225;g.step(1/120,{fire:true});assert.ok(Math.abs(g.energy-(0))<1e-6);}
console.log('PASS late weapon entry thresholds, upfront costs and tap restart gating');
