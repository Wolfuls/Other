/* Chapter/boss retry stocks. Failed attempts remain part of the cumulative timer. */
(function(root){'use strict';
const {Game,CFG}=root.Miload,P=Game.prototype;
const old={reset:P.reset,loadStage:P.loadStage,step:P.step,enterDoor:P.enterDoor,completeChapter:P.completeChapter};
P.reset=function(...args){this.stocks=2;this.stockRewards=new Set();this.retryCheckpoint=null;this.restoringCheckpoint=false;old.reset.apply(this,args);};
P.saveRetryCheckpoint=function(boss=false){
 const fields=['chapter','stage','area','room','maxLife','happiness','slot','eaten','defeated','gardenKills'];
 const c={boss,inventory:[...this.inventory],values:{},sets:{}};
 for(const k of fields)c.values[k]=this[k];
 for(const k of ['collectedHearts','seenStories','finishedStories','storySignals','tutorialSeen'])c.sets[k]=[...this[k]];
 c.heartAreas=[...this.heartAreas];this.retryCheckpoint=c;
};
P.loadStage=function(...args){old.loadStage.apply(this,args);if(!this.restoringCheckpoint&&(!this.retryCheckpoint||this.retryCheckpoint.values.chapter!==this.chapter))this.saveRetryCheckpoint(false);};
P.step=function(dt,input){
 if(this.bossAwake&&!this.retryCheckpoint?.boss)this.saveRetryCheckpoint(true);
 old.step.call(this,dt,input);
 if(this.bossAwake&&!this.retryCheckpoint?.boss)this.saveRetryCheckpoint(true);
};
P.rewardStageStock=function(){const key=this.chapter+':'+this.stage;if(this.chapter<1||this.stockRewards.has(key))return;this.stockRewards.add(key);this.stocks++;};
P.enterDoor=function(){const chapter=this.chapter,stage=this.stage,ok=old.enterDoor.call(this);if(ok&&chapter>0){const key=chapter+':'+stage;if(!this.stockRewards.has(key)){this.stockRewards.add(key);this.stocks++;}}return ok;};
P.completeChapter=function(){this.rewardStageStock();old.completeChapter.call(this);};
P.canContinue=function(){return this.state==='lost'&&this.stocks>0&&!!this.retryCheckpoint;};
P.continueFromCheckpoint=function(){
 if(!this.canContinue())return false;
 const c=this.retryCheckpoint;this.stocks--;Object.assign(this,c.values);this.inventory=[...c.inventory];
 for(const [k,v]of Object.entries(c.sets))this[k]=new Set(v);
 this.heartAreas=new Map(c.heartAreas);this.signalTimes={};this.state='playing';this.defeat=null;this.deathVisual=null;this.deathMessage=null;this.sceneFade=null;this.naniwaDefeat=null;this.clearFade=0;this.transition=null;this.celebration=null;this.events=[];
 this.restoringCheckpoint=true;this.loadStage();this.restoringCheckpoint=false;this.retryCheckpoint=c;
 this.life=this.maxLife;this.energy=CFG.maxEnergy;
 Object.assign(this.player,{inv:1.5,damageBlink:0,airDash:0,airDashAnim:0,airDashCooldown:0,jumpRising:false,hurt:0,fire:0,eat:0,deathPose:0,defeatFrame:0});
 if(c.boss){
  this.enemies=this.enemies.filter(e=>e.type==='boss'||e.type==='naniwa');this.sweets=[];this.drops=[];this.story=null;this.storyQueue=[];
  const event=this.chapter===2?'c2-challenge':'c1-king';this.seenStories.add(event);this.finishedStories.add(event);
  this.bossAwake=true;this.arenaLocked=true;this.player.x=this.arenaStart+180;this.player.y=CFG.ground-this.player.h;this.player.grounded=true;this.player.vx=this.player.vy=0;this.camera=Math.max(0,Math.min(this.worldWidth-CFG.width,this.player.x-335));
 }
 this.beginEntrance();return true;
};
})(typeof window!=='undefined'?window:globalThis);
