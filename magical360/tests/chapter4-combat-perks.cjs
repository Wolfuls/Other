const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
for(const f of ['content','chapter2-content','engine','chapter2','presentation','sfx','continues','chapter3-content','chapter3','chapter4-content','chapter4'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f+'.js'),'utf8'));
const make=(stage=0,debug=true)=>{const g=new Miload.Game(123,{chapter:4,story:false,debug});g.stage=stage;g.loadStage();return g;};
{
 const g=make(),stocks=g.stocks;g.state='paused';g.life=1;assert.ok(g.grantDebugUpgrade('grit'));assert.equal(g.maxLife,4);assert.equal(g.life,4);assert.equal(g.stocks,stocks);assert.ok(g.grantDebugUpgrade('grit'));assert.equal(g.maxLife,5);
 for(const id of ['meal','broom','exercise','manners']){assert.ok(g.grantDebugUpgrade(id));assert.equal(g.grantDebugUpgrade(id),false);}
 assert.ok(g.grantDebugUpgrade('training'));assert.ok(g.grantDebugUpgrade('training'));assert.equal(g.maxEnergy,200);assert.equal(g.upgradeChapters.size,0);
 g.state='lost';g.continueFromCheckpoint();assert.equal(g.maxLife,5);assert.equal(g.life,5);assert.equal(g.maxEnergy,200);
 g.state='playing';assert.equal(g.grantDebugUpgrade('grit'),false);const normal=make(0,false);normal.state='paused';assert.equal(normal.grantDebugUpgrade('grit'),false);g.chapter=0;g.state='paused';assert.equal(g.grantDebugUpgrade('grit'),false);
}
{
 const g=make(3),b=g.enemies.find(e=>e.type==='boss');g.bossAwake=true;g.player.x=4400;Object.assign(b,{hp:63,timer:0,grounded:true});g.stepLibraryBoss(b,.01);assert.equal(b.phase,'summon');g.stepLibraryBoss(b,.7);
 const books=()=>g.enemies.filter(e=>e.summoned);assert.equal(books().length,2);g.summonLibraryBooks(b);assert.equal(books().length,2);
 const book=books()[0];g.stepGrimoire(book,2);assert.ok(g.hostile.some(s=>s.arcane&&s.bookOwner===b.id));g.transform(book,'star');assert.equal(book.state,'candy');g.summonLibraryBooks(b);assert.equal(books().length,2);
 g.transform(b,'star');assert.equal(books().length,0);assert.ok(!g.sweets.some(s=>s.enemy?.summoned));assert.equal(g.hostile.length,0);
}
// Aimed ground volleys cross the shelf before reaching the player; roof shots clear the shelf.
{
 const g=make(1),s=g.libraryShelves[0],e=g.enemies.find(e=>e.barrage);g.enemies=[e];Object.assign(g.player,{x:230,y:402,inv:0});g.stepLibraryEnemy(e,2);const shot=g.hostile[0];assert.ok(shot);let blocked=false;
 for(let i=0;i<500&&shot.x>g.player.x;i++){shot.x+=shot.vx/120;shot.y+=shot.vy/120;if(g.libraryBlockShot(shot)){blocked=true;break;}}assert.ok(blocked,'shelf blocks a real aimed volley');
 const start={x:s.x+s.w-25,y:s.y-30},end={x:e.x+18,y:e.y+16};let roofBlocked=false;
 for(let i=0;i<=200;i++){const t=i/200,b={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,w:5,h:5,life:1};if(g.libraryBlockShot(b)){roofBlocked=true;break;}}assert.equal(roofBlocked,false,'roof-to-caster firing line');
}
console.log('PASS debug perk guards/repeats/retry, half-HP book summon/cap/projectiles/cleanup, ground cover and roof counterattack');
