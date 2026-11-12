const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
for(const f of ['content','chapter2-content','engine','chapter2','presentation','sfx','continues','chapter3-content','chapter3','chapter4-content','chapter4'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f+'.js'),'utf8'));
for(const m of MiloadContent.libraryMaps)for(const [wand]of m.drops)assert.ok(Miload.WANDS[wand],wand);
const make=(stage=0,story=false)=>{const g=new Miload.Game(123,{chapter:4,story,debug:true});g.stage=stage;g.loadStage();return g;};
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(1/120,input);};
for(let stage=0;stage<3;stage++){const g=make(stage);g.player.x=g.exit.x;g.player.y=402;assert.ok(g.enterDoor());tick(g,300);assert.equal(g.stage,stage+1);assert.equal(g.stocks,2);}
{
 const g=make(1),s=g.libraryShelves[0];g.enemies=[];Object.assign(g.player,{x:s.x+30,y:s.y-56,grounded:true});assert.equal(g.shelfNear(),s);assert.ok(g.toggleShelf());const px=g.player.x;tick(g,120);assert.ok(g.player.x>px+80);assert.equal(g.player.y,s.y-56);tick(g,360);assert.equal(s.x,s.right);g.toggleShelf();tick(g,600);assert.equal(s.x,s.left);
 Object.assign(g.player,{x:s.x+s.w+15,y:402,grounded:true});g.toggleShelf();tick(g,180);assert.ok(s.blocked);assert.ok(!Miload.overlap(g.player,s));g.toggleShelf();tick(g,180);assert.equal(s.x,s.left);
 const bullet={x:s.x+20,y:s.y+20,w:12,h:8,life:2};assert.ok(g.libraryBlockShot(bullet));assert.equal(bullet.life,0);
}
// Each mandatory wall is reachable via its bookcase with the ordinary jump, without an upgrade or broom.
for(let stage=0;stage<4;stage++){
 const g=make(stage);g.enemies=[];g.storyEnabled=false;
 for(const s of g.libraryShelves.filter(s=>!s.fixed&&s.y!==382&&s.left!==3870&&s.left!==250&&s.left!==1160&&s.left!==4500)){
  s.x=s.right;s.on=true;Object.assign(g.player,{x:s.x+s.w-40,y:s.y-56,vx:0,vy:0,grounded:true});
  const wall=g.platforms.find(p=>p.libraryWall&&p.x>s.x&&p.x<s.x+s.w+150)||g.platforms.find(p=>!p.ground&&!p.bookshelf&&p.x>s.x&&p.x<s.x+s.w+150);assert.ok(wall);
  g.step(1/120,{jump:true,jumpHeld:true,right:true});tick(g,90,{jumpHeld:true,right:true});
  assert.ok(g.player.x>=wall.x,`wall entry ${stage} ${wall.x}`);assert.equal(g.player.y+g.player.h,wall.y);
 }
}
{
 const g=make(3,true);g.player.x=4385;g.player.inv=999;tick(g,300);assert.equal(g.story.id,'c4-boss');assert.equal(g.libraryAction,null);const time=g.time;
 g.story.revealed=true;g.advanceStory();g.story.revealed=true;g.advanceStory();assert.equal(g.libraryAction.kind,'attack');tick(g,220);assert.equal(g.story.index,2);assert.equal(g.time,time);g.skipStory();assert.ok(g.bossAwake&&g.arenaLocked);assert.equal(g.libraryAction,null);
 const b=g.enemies.find(e=>e.type==='boss');g.player.inv=999;const phases=new Set();for(let i=0;i<1600;i++){g.step(1/120,{});phases.add(b.phase);}assert.ok(phases.has('wind')&&phases.has('recover')&&phases.has('fan'));
 g.transform(b,'star');assert.equal(g.hitStop,.5);assert.equal(g.clearMusic,false);g.hitStop=0;g.collectSweet(b.sweet);tick(g,120);assert.equal(g.story.id,'c4-feast');g.skipStory();tick(g,500);assert.equal(g.story.id,'c4-ending');tick(g,1300);assert.equal(g.libraryAction,null);assert.ok(Math.abs(g.player.x-5070)<3);assert.ok(g.player.grounded);const recordTime=g.time;tick(g,200);assert.equal(g.time,recordTime);g.skipStory();tick(g,650);assert.equal(g.state,'upgrade');g.chooseUpgrade('training');assert.equal(g.state,'won');
 g.state='lost';assert.ok(g.continueFromCheckpoint());tick(g,300);assert.ok(g.bossAwake);assert.equal(g.life,g.maxLife);
}
{
 const g=new Miload.Game(7,{chapter:3,story:false});g.completeChapter();g.chooseUpgrade('training');tick(g,300);assert.equal(g.chapter,4);assert.equal(g.maxEnergy,150);assert.ok(g.libraryShelves.length);
 const h=make(1);h.player.x=h.drops.find(d=>d.type==='heart').x;h.player.y=h.drops.find(d=>d.type==='heart').y;h.interact();assert.ok(h.collectedHearts.has('4'));h.loadStage();assert.ok(!h.drops.some(d=>d.type==='heart'));
}
console.log('PASS Ch4 progression, shelves/carry/crush prevention/shielding, ordinary-jump routes, intro action/timer, all boss patterns, cake/ending/reward, retry and Ch3 carryover');
