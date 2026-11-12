/* Insert walkable breathing room without stretching jumps, moving machinery or arenas. */
(function(){const {Game,CFG}=Miload,C=MiloadContent,P=Game.prototype,load=P.loadStage;
P.routeX=function(x){return x+(this.routeCuts||[]).filter(c=>x>=c).length*(this.routeStride||240);};
P.loadStage=function(...args){this.routeCuts=[];this.routeStride=240;this.libraryResearchReady=false;load.apply(this,args);if(this.chapter===0)return;
const width=this.worldWidth,limit=this.arenaStart>0?this.arenaStart-350:width-350,ground=this.platforms.filter(p=>p.ground);
const safe=x=>ground.some(p=>x>p.x+100&&x<p.x+p.w-100)&&!this.platforms.some(p=>(p.solid&&!p.ground||p.moving||p.bookshelf)&&x>Math.min(p.left??p.x,p.min??p.x)-180&&x<Math.max((p.right??p.x)+p.w,(p.max??p.x)+p.w)+180)&&!(this.water||[]).some(w=>x>w.x-220&&x<w.end+220)&&!(this.wheels||[]).some(w=>Math.abs(x-w.cx)<w.r+200)&&!this.enemies.some(e=>Math.abs(x-e.x)<110)&&(!this.platforms.some(p=>!p.ground&&Math.abs(p.x-x)<200)||this.platforms.some(p=>!p.ground&&!p.solid&&!p.moving&&x>p.x+20&&x<p.x+p.w-20));
for(const target of [limit*.28,limit*.55,limit*.8]){const candidates=[];for(let x=220;x<limit;x+=20)if(safe(x)&&this.routeCuts.every(c=>Math.abs(c-x)>500))candidates.push(x);candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));if(candidates.length)this.routeCuts.push(candidates[0]);}if(!this.routeCuts.length)this.routeCuts=[180];this.routeCuts.sort((a,b)=>a-b);this.routeStride=720/this.routeCuts.length;
const X=x=>this.routeX(x),seen=new Set(),move=o=>{if(!o||seen.has(o))return;seen.add(o);const oldX=o.x;if(o.w!=null&&this.platforms.includes(o))o.w=X(oldX+o.w)-X(oldX);for(const key of ['x','baseX','spawnX','patrolLeft','patrolRight','left','right','cx'])if(Number.isFinite(o[key]))o[key]=X(o[key]);if(o.axis==='x'){o.min=X(o.min);o.max=X(o.max);}if(Number.isFinite(o.end))o.end=X(o.end);};
for(const list of [this.platforms,this.enemies,this.sweets,this.drops,this.water,this.levers,this.wheels,this.cargoDecor])for(const o of list||[])move(o);move(this.exit);move(this.gardenCarrier);this.worldWidth=X(width);if(this.arenaStart)this.arenaStart=X(this.arenaStart);
const catalogue=[null,C.chapterOne,C.chapterTwo,C.chapterThree,C.chapterFour][this.chapter];for(const e of catalogue||[]){if(e.stage!=null&&e.stage!==this.stage+1)continue;if(e.x>0){e.routeOriginalX??=e.x;e.x=X(e.routeOriginalX);}}
if(this.chapter===1)for(const p of C.chapterOneProps[this.stage]||[]){p.routeOriginalX??=p.x;p.x=X(p.routeOriginalX);}
this.readingDesks=[];if(this.chapter===4){for(const item of this.libraryReadings().filter(d=>d.stage===this.stage+1)){let x=X(item.x);for(let n=0;n<40&&this.platforms.some(p=>p.solid&&!p.ground&&x+65>(p.bookshelf?Math.min(p.left,p.right):p.x)&&x-10<(p.bookshelf?Math.max(p.left,p.right):p.x)+p.w);n++)x+=25;this.readingDesks.push({...item,x});}}
};
})();

