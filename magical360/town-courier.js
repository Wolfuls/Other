(function(){const P=Miload.Game.prototype,activate=P.activateStory,line=P.setStoryLine,tick=P.tickStory,finish=P.finishStory,advance=P.advanceStory,load=P.loadStage;
P.loadStage=function(...args){this.townCourier=null;return load.apply(this,args);};
P.activateStory=function(s){if(s.id==='c2-arrival'){this.townCourier={x:this.camera+1000,start:this.camera+1000,target:this.player.x+260,t:0,visible:false,lineT:0};this.player.vx=0;}return activate.call(this,s);};
P.setStoryLine=function(){line.call(this);if(this.story?.id==='c2-arrival'&&this.townCourier){const c=this.townCourier;c.lineT=0;if(this.story.index===2){c.visible=true;this.emit('rustle');}if(this.story.index===4)this.emit('dashStart');}};
P.tickStory=function(dt){const c=this.townCourier;if(c&&this.story?.id==='c2-arrival'){c.t+=dt;c.lineT+=dt;const before=c.x;if(this.story.index===2)c.x=c.start+(c.target-c.start)*Math.min(c.lineT/1.5,1);if(this.story.index>=4)c.x+=250*dt;c.moving=Math.abs(c.x-before)>.01;}return tick.call(this,dt);};
P.advanceStory=function(manual=false){if(this.story?.id==='c2-arrival'&&this.storyText()===this.story.lines[this.story.index].text&&this.townCourier){const c=this.townCourier;if(this.story.index===2&&c.lineT<1.5)return;if(this.story.index===4&&c.x<this.camera+1000)return;}return advance.call(this,manual);};
P.finishStory=function(skipped=false){const id=this.story?.id,result=finish.call(this,skipped);if(id==='c2-arrival')this.townCourier=null;return result;};
})();

