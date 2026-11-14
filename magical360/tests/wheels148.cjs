const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.join(__dirname,'..');
for(const [,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g))if(f!=='game.js')vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const g=new Miload.Game(1,{chapter:3,story:false});g.stage=2;g.loadStage();
assert.equal(g.wheels.length,4);assert.equal(g.platforms.filter(p=>p.wheel).length,8);
g.levers.forEach(l=>l.on=true);g.waterLevel=318;
for(const wheel of g.wheels){assert.equal(wheel.pads.length,2);const [a,b]=wheel.pads;assert.ok(g.platforms.includes(b));Object.assign(g.player,{x:b.x+20,y:b.y-g.player.h,grounded:true});const previous=b.x;g.updateChapterThree(.1);assert.notEqual(b.x,previous);assert.ok(Math.abs(g.player.y+g.player.h-b.y)<1e-8);assert.ok(Math.abs((a.x+b.x)/2+42-wheel.cx)<1e-8);assert.ok(Math.abs((a.y+b.y)/2-wheel.cy)<1e-8);}
const guard=g.enemies.find(e=>e.wheelPad);assert.equal(guard.wheelPad,g.wheels[2].pads[0]);assert.equal(guard.y+guard.h,guard.wheelPad.y);
g.loadStage();assert.equal(g.platforms.filter(p=>p.wheel).length,8,'reload does not duplicate pads');
for(const stage of [0,1,3]){g.stage=stage;g.loadStage();assert.ok(g.wheels.every(w=>w.pads.length===4),'other stages unchanged');}
console.log('PASS all four final-canal wheels have two opposite rotating pads, added-pad rider, guard and reload');
