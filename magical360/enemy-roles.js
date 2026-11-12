/* Each chapter teaches a different response. Aiming is locked during warnings. */
(function(){const P=Miload.Game.prototype,{clamp}=Miload,library=P.stepLibraryEnemy;
function clock(e,dt){e.aiState??='rest';e.aiTimer=(e.aiTimer??(1+(e.id%3)*.25))-dt;e.telegraph=0;}
function aim(e,p){e.aimX=p.x+p.w/2;e.aimY=p.y+p.h/2;e.chargeDir=Math.sign(e.aimX-e.x-e.w/2)||1;}
function next(e,state,time){e.aiState=state;e.aiTimer=time;}
P.stepTownEnemy=function(e,dt){const p=this.player,dx=p.x-e.x,near=Math.abs(dx)<420&&Math.abs(p.y-e.y)<210;clock(e,dt);e.townClock=(e.townClock||0)+dt;
 if(e.townKind==='wafer'){
  if(e.aiState==='wind'){e.telegraph=1;if(e.aiTimer<=0)next(e,'swoop',.65);}
  else if(e.aiState==='swoop'){e.x+=e.chargeDir*205*dt;e.y+=clamp(e.aimY-e.y,-85*dt,85*dt);if(e.aiTimer<=0)next(e,'return',1.2);}
  else if(e.aiState==='return'||e.aiState==='recover'){e.x+=clamp(e.baseX-e.x,-115*dt,115*dt);e.y+=clamp(e.baseY-e.y,-95*dt,95*dt);if(e.aiTimer<=0)next(e,'rest',1.1);}
  else{e.x=e.baseX+Math.sin(e.t*.95)*40;e.y=e.baseY+Math.sin(e.t*2)*18;if(near&&e.aiTimer<=0){aim(e,p);next(e,'wind',.5);}}
  e.x=clamp(e.x,e.baseX-170,e.baseX+170);e.dir=e.chargeDir||1;return;
 }
 this.physics(e,dt);
 if(e.townKind==='tin'){
  e.townShot=Math.max(0,(e.townShot||0)-dt);
  if(e.aiState==='wind'){e.telegraph=1;if(e.aiTimer<=0){const sx=e.x+16,sy=e.y+10,gravity=420,flight=Math.max(.45,Math.min(1.25,Math.abs(e.aimX-sx)/180));this.enemyShot(sx,sy,e.aimX,e.aimY,1);Object.assign(this.hostile.at(-1),{vx:(e.aimX-sx)/flight,vy:(e.aimY-sy)/flight-gravity*flight/2,gravity,life:2.3,townCrumb:true});e.townShot=.3;next(e,'recover',2.8);}}
  else if(near&&e.aiTimer<=0){aim(e,p);next(e,'wind',.65);}return;
 }
 const left=e.patrolLeft??e.baseX-125,right=e.patrolRight??e.baseX+145;
 if(e.aiState==='wind'){e.telegraph=1;if(e.aiTimer<=0)next(e,'rush',.45);}
 else if(e.aiState==='rush'){const before=e.x;this.libraryMove(e,clamp(e.x+e.chargeDir*175*dt,left,right)-e.x);if(e.aiTimer<=0||e.x===before)next(e,'recover',1.1);}
 else if(e.aiState==='recover'){if(e.aiTimer<=0)next(e,'rest',.6);}
 else{if(e.x<=left)e.dir=1;if(e.x>=right)e.dir=-1;this.libraryMove(e,clamp(e.x+e.dir*42*dt,left,right)-e.x);if(near&&Math.abs(dx)<230&&e.aiTimer<=0){aim(e,p);e.dir=e.chargeDir;next(e,'wind',.45);}}
};
P.stepLibraryEnemy=function(e,dt){if(e.libraryKind==='mille'||e.libraryKind==='grimoire')return library.call(this,e,dt);const p=this.player,dx=p.x-e.x,near=Math.abs(dx)<510&&Math.abs(p.y-e.y)<270;clock(e,dt);e.dir=dx<0?-1:1;
 if(e.libraryKind==='moth'){
  if(e.aiState==='wind'){e.telegraph=1;if(e.aiTimer<=0){const a=Math.atan2(e.aimY-e.y-16,e.aimX-e.x-16);for(const spread of [-.25,0,.25])this.libraryShot(e.x+16,e.y+16,e.x+16+Math.cos(a+spread)*200,e.y+16+Math.sin(a+spread)*200,195);next(e,'relocate',1.25);e.relocateX=clamp(e.x-e.chargeDir*110,e.baseX-150,e.baseX+150);}}
  else if(e.aiState==='relocate'||e.aiState==='recover'){e.x+=clamp((e.relocateX??e.baseX)-e.x,-90*dt,90*dt);e.y+=clamp(e.baseY-e.y,-50*dt,50*dt);if(e.aiTimer<=0)next(e,'rest',1.3);}
  else{e.y=e.baseY+Math.sin(e.t*2)*14;if(near&&e.aiTimer<=0){aim(e,p);next(e,'wind',.7);}}return;
 }
 this.physics(e,dt);
 if(e.libraryKind==='macaron'){
  if(e.aiState==='wind'){e.telegraph=1;if(e.aiTimer<=0){e.volley=3;next(e,'volley',0);}}
  else if(e.aiState==='volley'){if(e.aiTimer<=0){this.libraryShot(e.x+18,e.y+12,e.aimX,e.aimY,225);e.volley--;next(e,e.volley?'volley':'recover',e.volley?.22:2.2);}}
  else if(near&&e.aiTimer<=0){aim(e,p);next(e,'wind',.6);}return;
 }
 // Biscuits feint backwards, then lunge on the ground; they never copy the farm hopper.
 if(e.aiState==='wind'){e.telegraph=1;if(e.aiTimer<=0)next(e,'lunge',.48);}
 else if(e.aiState==='lunge'){const moved=this.libraryMove(e,e.chargeDir*230*dt);if(e.aiTimer<=0||Math.abs(moved)<.01)next(e,'recover',.95);}
 else if(e.aiState==='backstep'){this.libraryMove(e,-e.chargeDir*110*dt);if(e.aiTimer<=0)next(e,'wind',.45);}
 else if(e.aiState==='recover'){if(e.aiTimer<=0)next(e,'rest',.45);}
 else if(near){if(Math.abs(dx)>170)this.libraryMove(e,e.dir*105*dt);if(Math.abs(dx)<250&&e.aiTimer<=0){aim(e,p);next(e,Math.abs(dx)<115?'backstep':'wind',Math.abs(dx)<115?.3:.45);}}
 e.x=clamp(e.x,(e.spawnX??e.baseX)-250,(e.spawnX??e.baseX)+250);
};
})();
