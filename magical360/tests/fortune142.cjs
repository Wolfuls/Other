const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.join(__dirname,'..');
for(const [,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g))if(f!=='game.js')vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const {Game,WANDS,shotCost,shotInterval}=Miload;
function make(){const g=new Game(4,{chapter:1,story:false});g.enemies=[];g.sweets=[];g.inventory=['fortune'];g.happiness=99;g.platforms=[{x:0,y:458,w:6000,h:100,ground:true}];Object.assign(g.player,{x:100,y:402,grounded:true,inv:999});return g;}
assert.equal(shotCost('fortune',0),10);assert.ok(Math.abs(shotCost('fortune',99)-2.16)<1e-9);
for(let h=0;h<=99;h++){const cost=shotCost('fortune',h);assert.ok(cost>0&&cost<=10);assert.ok(cost/shotInterval('fortune',h)<=36+1e-8);if(h)assert.ok(cost<=shotCost('fortune',h-1));}
{const g=make();g.energy=2.16;assert.ok(g.shoot());assert.ok(g.energy<1e-8);g.player.fire=0;g.energy=2.15;assert.equal(g.shoot(),false);assert.equal(g.energy,2.15);g.happiness=0;g.energy=9.99;assert.equal(g.shoot(),false);g.energy=10;assert.ok(g.shoot());assert.equal(g.energy,0);}
{const g=make();g.energy=100;let n=0;while(g.shoot()){n++;g.player.fire=0;}assert.equal(n,46);assert.ok(g.energy>=0);}
// Long held-fire simulation starts empty: no initial full-tank advantage in the comparison.
for(const focus of [0,1]){const result=[];for(const rate of [Infinity,36]){WANDS.fortune.manaPerSecond=rate;const g=make();g.upgrades={training:3,focus};g.energy=0;let shots=0;for(let i=0;i<120*120;i++){g.step(1/120,{fire:true});shots+=g.events.filter(e=>e.type==='shoot').length;g.events=[];}result.push(shots*2/120);}assert.ok(result[1]>result[0]*2.2);assert.ok(result[1]>16&&result[1]<24);console.log(`fortune sustained simulation focus=${focus}: ${result.map(n=>n.toFixed(2)).join(' -> ')} DPS`);}
WANDS.fortune.manaPerSecond=36;
for(const k of Object.keys(WANDS).filter(k=>k!=='fortune'))assert.equal(shotCost(k,99),WANDS[k].cost);
console.log('PASS happiness-dependent cost, drain cap, fractional affordability, tank capacity and sustained damage improvement');
