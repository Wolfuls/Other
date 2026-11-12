/* Ducking changes the damage box, not the body's support/terrain geometry. */
(function(){const {Game}=Miload,P=Game.prototype,step=P.step,clear=P.clearCombatTransient;
P.canCrouch=function(){const p=this.player;return this.state==='playing'&&!this.messagePaused()&&this.hitStop<=0&&p.grounded&&p.hurt<=0&&!(p.meteorLock>0)&&!(p.airDash>0);};
P.playerHurtbox=function(){const p=this.player;return p.crouching?{x:p.x,y:p.y+p.h-28,w:p.w,h:28}:p;};
P.clearCombatTransient=function(...args){this.player.crouching=false;return clear.apply(this,args);};
P.step=function(dt,input={}){const p=this.player;
 if(this.state==='playing'&&this.hitStop<=0&&!this.messagePaused()){
  p.crouching=!!input.crouch&&this.canCrouch();
  if(p.crouching){Object.assign(p,{vx:0,dashing:false,dashInv:0,jumpBuffer:0,jumpRising:false,attack:0,eat:0,aimActive:false});this.channel=null;input={crouch:true};}
 }else if(this.state!=='paused'&&this.hitStop<=0)p.crouching=false;
 const result=step.call(this,dt,input);
 if(!p.grounded||p.hurt>0||!['playing','paused'].includes(this.state))p.crouching=false;
 return result;
};
for(const name of ['shoot','switchWand','interact','enterDoor','canEnterDoor','openReadingDesk','toggleShelf','toggleWater','collectSweet','guardShot']){const old=P[name];if(old)P[name]=function(...args){if(this.player.crouching)return false;return old.apply(this,args);};}
for(const name of ['loadStage','loadTutorial']){const old=P[name];P[name]=function(...args){if(this.player)this.player.crouching=false;return old.apply(this,args);};}
})();
