/* Ducking changes the damage box, not the body's support/terrain geometry. */
(function(){const {Game}=Miload,P=Game.prototype,step=P.step,clear=P.clearCombatTransient;
P.canCrouch=function(){const p=this.player;return this.state==='playing'&&!this.messagePaused()&&this.hitStop<=0&&p.grounded&&p.hurt<=0&&!(p.meteorLock>0)&&!(p.airDash>0);};
P.dropThroughFloor=function(){if(!this.canCrouch())return false;const p=this.player,support=this.platforms.filter(f=>!f.broken&&p.x+p.w>f.x&&p.x<f.x+f.w&&Math.abs(p.y+p.h-f.y)<3);if(!support.length||support.some(f=>f.solid||f.ground||f.crate||f.bookshelf))return false;Object.assign(p,{dropPlatforms:support,dropTime:.5,dropAnim:.42,crouching:false,grounded:false,y:p.y+4,vy:-145,vx:0,coyote:0,jumpBuffer:0,jumpRising:false,dashing:false,dashInv:0,attack:0,eat:0});this.channel=null;this.emit('dropThrough');this.emit('cloth');return true;};
P.playerHurtbox=function(){const p=this.player;return p.crouching?{x:p.x,y:p.y+p.h-28,w:p.w,h:28}:p;};
P.clearCombatTransient=function(...args){this.player.crouching=false;this.player.dropPlatforms=null;this.player.dropAnim=0;return clear.apply(this,args);};
P.step=function(dt,input={}){const p=this.player;
 if(this.state==='playing'&&this.hitStop<=0&&!this.messagePaused()){
  p.dropAnim=Math.max(0,(p.dropAnim||0)-Math.min(dt,1/30));if(p.dropPlatforms){p.dropTime-=Math.min(dt,1/30);p.dropPlatforms=p.dropTime>0?p.dropPlatforms.filter(f=>p.y<f.y+(f.h||0)+2):null;}if(input.dropThrough&&this.dropThroughFloor())input={};
  p.crouching=!!input.crouch&&this.canCrouch();
  if(p.crouching){Object.assign(p,{vx:0,dashing:false,dashInv:0,jumpBuffer:0,jumpRising:false,attack:0,eat:0,aimActive:false});this.channel=null;input={crouch:true};}
 }else if(this.state!=='paused'&&this.hitStop<=0)p.crouching=false;
 const result=step.call(this,dt,input);
 if(p.grounded||p.hurt>0||p.attack>0||p.airDash>0||!['playing','paused'].includes(this.state))p.dropAnim=0;if(!p.grounded||p.hurt>0||!['playing','paused'].includes(this.state))p.crouching=false;
 return result;
};
for(const name of ['shoot','switchWand','interact','enterDoor','canEnterDoor','openReadingDesk','toggleShelf','toggleWater','collectSweet','guardShot']){const old=P[name];if(old)P[name]=function(...args){if(this.player.crouching)return false;return old.apply(this,args);};}
for(const name of ['loadStage','loadTutorial']){const old=P[name];P[name]=function(...args){if(this.player){this.player.crouching=false;this.player.dropPlatforms=null;this.player.dropAnim=0;}return old.apply(this,args);};}
})();
