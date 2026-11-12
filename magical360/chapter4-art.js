/* Code-native pixel art. World-anchored masonry and cached enemy animation cells. */
(function(root){'use strict';
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
function P(c,pts,col){c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
const colors=['#8c5966','#657b78','#8c7955','#70658b','#a0795d'];
function books(c,x,y,w,h,seed=0){for(let i=0,dx=0;dx<w-8;i++){const bw=7+(i+seed)%4*2,bh=h-((i*7+seed)%9);R(c,x+dx,y+h-bh,bw,bh,'#252735');R(c,x+dx+1,y+h-bh+1,bw-2,bh-2,colors[(i+seed)%5]);R(c,x+dx+2,y+h-bh+4,bw-4,2,'#bca578');R(c,x+dx+2,y+h-5,bw-4,1,'#bca578');dx+=bw+2;}}
function arch(c,x,y,w,h){R(c,x,y+20,w,h-20,'#161f32');P(c,[[x,y+20],[x+w/2,y],[x+w,y+20]],'#161f32');R(c,x+7,y+25,w-14,h-30,'#354863');P(c,[[x+7,y+25],[x+w/2,y+9],[x+w-7,y+25]],'#354863');R(c,x+w/2-2,y+12,4,h-12,'#9c957f');R(c,x+6,y+h/2,w-12,4,'#9c957f');R(c,x-5,y+h,w+10,7,'#a69a83');R(c,x+10,y+28,3,h/2-20,'#65818b');}
function seal(c,x,y,size=18){const scale=Math.max(1,Math.floor(size/6));MiloadFarmArt.cargoMark(c,Math.round(x-6*scale),Math.round(y-6*scale),scale);}
function background(c,g,t){
 R(c,0,0,960,540,g.stage===0?'#141e31':'#222435');
 if(g.stage===0){for(let i=0;i<70;i++)R(c,(i*137-g.camera*.04+9000)%1000,i*37%220,1,1,'#a7b7b8');for(let y=-24;y<=24;y+=3){const w=Math.floor(Math.sqrt(576-y*y)/3)*3;R(c,762-g.camera*.02-w,85+y,w*2,3,'#bdc9be');}R(c,751-g.camera*.02,72,8,6,'#92a7aa');R(c,768-g.camera*.02,91,10,8,'#92a7aa');
  for(let i=Math.floor(g.camera*.25/260)-1;i<(g.camera*.25+1200)/260;i++){const x=i*260-g.camera*.25;R(c,x,180,235,280,'#2e3546');P(c,[[x-8,180],[x+115,105],[x+243,180]],'#3c384d');for(let k=0;k<3;k++)arch(c,x+26+k*68,212,43,96);R(c,x+14,345,210,8,'#6f6a69');for(let k=0;k<4;k++){R(c,x+12+k*68,183,8,270,'#4f5260');R(c,x+14+k*68,188,2,261,'#898178');}for(let row=0;row<5;row++)for(let k=row;k<11-row;k++)R(c,x+k*22,172-row*11,18,2,'#62586b');}
 }else{
  for(let i=Math.floor(g.camera*.3/300)-1;i<(g.camera*.3+1100)/300;i++){const x=i*300-g.camera*.3;R(c,x,70,280,385,'#383644');arch(c,x+86,98,104,180);for(let j=0;j<4;j++){R(c,x+15,292+j*38,252,5,'#846b55');books(c,x+22,267+j*38,238,25,i+j+10);}R(c,x,70,12,390,'#77706e');R(c,x+3,72,3,385,'#a39681');P(c,[[x+12,70],[x+140,12],[x+268,70],[x+259,78],[x+140,28],[x+21,78]],'#696472');}
 }
 for(let i=Math.floor(g.camera/360)-1;i<(g.camera+1100)/360;i++){const x=i*360-g.camera;
  if(g.stage===0){R(c,x,312,302,146,'#5c5558');P(c,[[x-8,312],[x+145,249],[x+310,312]],'#4c455b');for(let y=320;y<454;y+=22)for(let k=0;k<7;k++)R(c,x+k*43+(y%44?0:20),y,39,18,'#696168');arch(c,x+28,333,52,80);arch(c,x+210,333,52,80);R(c,x+116,357,70,101,'#292d3e');R(c,x+120,361,62,3,'#b19b79');R(c,x+162,406,6,4,'#dfc18b');for(let row=0;row<5;row++)for(let k=row;k<14-row;k++)R(c,x+k*22,306-row*10,18,2,'#786775');for(const dx of [5,97,193,291]){R(c,x+dx,314,6,144,'#8d8278');R(c,x+dx+1,317,2,137,'#b1a18a');}R(c,x+105,350,92,5,'#b6a084');for(let k=0;k<5;k++)R(c,x+119+k*13,320,8,18,'#9b8980');}
  else{R(c,x+5,49,14,409,'#4b4553');R(c,x+7,51,3,405,'#93826c');R(c,x-2,48,28,8,'#b69d77');R(c,x-3,441,30,17,'#81735f');R(c,x+28,52,300,6,'#796750');for(let j=0;j<8;j++)R(c,x+40+j*37,62,3,8,'#ac9270');}
 }
 if(g.stage===0){const x=g.routeX(1730)-g.camera;R(c,x,335,95,12,'#806047');R(c,x+4,347,8,111,'#514139');R(c,x+82,347,8,111,'#514139');for(let i=0;i<6;i++){R(c,x+8+i*13,328,10,7,'#d4a76a');R(c,x+10+i*13,329,2,2,'#72513e');}R(c,x+105,350,58,108,'#635c58');R(c,x+112,369,44,57,'#282935');R(c,x+117,414,34,5,'#b17b4d');}
 else{for(const x of [180,1660,2780,3750].map(x=>g.routeX(x))){R(c,x-g.camera,290,66,24,'#c6b58e');seal(c,x+33-g.camera,302,9);}}
}
function platform(c,g,p){const x=p.x-g.camera;if(p.bookshelf){R(c,x-3,p.y-4,p.w+6,p.h+4,'#292638');R(c,x,p.y,p.w,p.h,'#685043');for(let y=p.y+12,i=0;y<458-12;y+=34,i++){books(c,x+9,y,p.w-18,24,i+2);R(c,x+5,y+26,p.w-10,5,'#b28d5d');}R(c,x-4,p.y-5,p.w+8,5,'#efd19a');R(c,x,p.y,p.w,3,'#9f7954');R(c,x+3,p.y+4,5,p.h-10,'#b08a60');R(c,x+p.w-8,p.y+4,5,p.h-10,'#a47d55');R(c,x+10,453,14,7,'#35333d');R(c,x+p.w-24,453,14,7,'#35333d');return;}
 if(p.libraryWall){R(c,x,p.y,p.w,p.h,'#3d343c');for(let y=p.y+12,i=0;y<p.y+p.h-15;y+=34,i++){books(c,x+10,y,p.w-20,24,i+4);R(c,x+5,y+27,p.w-10,5,'#856c53');}R(c,x,p.y,p.w,5,'#c7b394');for(const dx of [2,p.w/2,p.w-8])R(c,x+dx,p.y+5,6,p.h-5,'#8d7962');return;}R(c,x,p.y,p.w,p.h,p.ground?'#353c48':p.libraryWall?'#504651':'#6a5345');R(c,x,p.y,p.w,4,'#c5b393');
 if(p.ground||p.libraryWall){c.save();c.beginPath();c.rect(Math.round(x),p.y+5,p.w,p.h);c.clip();for(let y=p.y+9;y<p.y+p.h;y+=22)for(let xx=Math.floor((Math.max(p.x,g.camera-50))/44)*44;xx<Math.min(p.x+p.w,g.camera+1010);xx+=44){R(c,xx-g.camera,y,41,19,p.libraryWall?'#655b62':'#4b535d');R(c,xx-g.camera+1,y+1,38,2,'#787d80');}c.restore();}else{R(c,x+5,p.y+6,p.w-10,3,'#a18865');for(let dx=14;dx<p.w;dx+=35)R(c,x+dx,p.y+10,4,7,'#39323a');}}
function props(c,g,t){for(const s of g.libraryShelves||[]){if(s.fixed)continue;if(s.right<g.camera-200||s.left>g.camera+1100)continue;R(c,s.left-g.camera-8,455,s.right-s.left+s.w+16,3,'#b4a388');R(c,s.left-g.camera-8,461,s.right-s.left+s.w+16,2,'#57535c');for(const end of [s.left,s.right]){R(c,end-g.camera,452,5,11,'#ebcf8e');R(c,end+s.w-g.camera-5,452,5,11,'#ebcf8e');}
  for(const y of [s.y+13,431]){const x=s.x+s.w/2-g.camera;c.strokeStyle=s.blocked?'#db9b82':'#dbbb76';c.lineWidth=3;c.beginPath();c.arc(x,y,10,0,7);c.stroke();const a=s.x*.08;c.beginPath();c.moveTo(x-Math.cos(a)*9,y-Math.sin(a)*9);c.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);c.stroke();R(c,x-2,y-2,4,4,'#f4ddb1');}
  if(g.shelfNear()===s){const x=s.x+s.w/2-g.camera;R(c,x-72,s.y-34,144,22,'#1b2537');c.font='12px sans-serif';c.textAlign='center';c.fillStyle='#ffe0a0';c.fillText('E / Space　'+(s.on?'←':'→'),x,s.y-18);}}
 for(const b of g.libraryBooks||[]){c.save();c.translate(b.x-g.camera,b.y);c.rotate(b.t*4);R(c,-8,-11,16,22,'#423247');R(c,-6,-9,12,18,'#b28683');R(c,-4,-7,9,15,'#dfcc9f');R(c,-7,-10,3,20,'#806679');c.restore();}
 if(g.stage===3){const x=g.routeX(5105)-g.camera;R(c,x-34,396,95,8,'#aa8459');R(c,x-27,403,6,55,'#6b5142');R(c,x+46,403,6,55,'#6b5142');R(c,x-12,373,40,23,'#cbb78a');R(c,x+7,373,2,23,'#695143');
  if(g.story?.id==='c4-ending'&&!g.libraryAction){const idx=g.story.index,map=/^C4-M0(49|5[0-5])$/.test(g.story.lines[idx]?.id);c.save();c.translate(0,95);R(c,265,65,430,270,'#262336');R(c,270,70,420,260,'#ccb98f');R(c,274,74,412,3,'#e9d7af');R(c,477,80,3,239,'#8a7054');seal(c,365,165,32);if(idx>=2&&!map)seal(c,585,165,32);for(let y=235;y<300;y+=14){R(c,296,y,155,2,'#9b825e');if(!map)R(c,506,y,155,2,'#9b825e');}c.font='13px sans-serif';c.fillStyle='#4d4044';c.textAlign='center';c.fillText('古い記録',365,112);c.fillText(map?'街道の地図':'持ってきた荷札',585,112);
   if(map){c.strokeStyle='#78654c';c.lineWidth=3;c.beginPath();c.moveTo(522,273);c.lineTo(555,241);c.lineTo(552,210);c.lineTo(608,177);c.lineTo(623,148);c.stroke();for(let i=0;i<6;i++)R(c,571+i*12,196+i%2*9,3,17,'#829779');R(c,514,264,16,13,'#805e43');c.font='12px sans-serif';c.fillStyle='#4d4044';c.fillText('集荷場',551,292);c.fillText('旧街道',526,232);c.fillText('霧の湿原',624,230);seal(c,624,149,16);c.fillText('同じ印',628,130);}c.restore();}}
}
function hermit(c,f){
 const o='#302936',wood='#755445',rim='#c39b69',cream='#e4c596',body='#bb8553',dark='#80543d';
 const stride=[-3,0,3,0,-2,4,-4,0][f],crouch=f===4?4:0;
 // Six jointed legs, behind the carried shell. Feet stay on the same baseline.
 for(let i=0;i<3;i++){
  const x=24+i*16,s=(i%2?stride:-stride);
  P(c,[[x,68],[x-12+s,78],[x-17+s,90],[x-10+s,90],[x-6+s,81],[x+9,74]],o);
  P(c,[[x,72],[x-8+s,80],[x-12+s,88],[x-9+s,88],[x-3+s,81],[x+7,74]],body);
  R(c,x-8+s,79,4,3,cream);
 }
 // Wafer abdomen under the shell, with a small head at its front.
 P(c,[[30,63],[55,58],[78,65],[79,76],[65,82],[32,79],[22,72]],o);
 P(c,[[33,66],[54,62],[75,68],[75,74],[64,78],[33,75],[27,71]],body);
 for(let i=0;i<4;i++){R(c,34+i*8,67,3,9,dark);R(c,35+i*8,68,2,4,cream);}
 c.save();c.translate(f===5?3:0,crouch);
 // The asymmetric wooden bookcase is the crab's shell, rather than its face.
 P(c,[[12,22],[20,12],[52,10],[65,21],[66,62],[59,72],[12,69],[7,59],[7,31]],o);
 P(c,[[14,23],[23,16],[51,14],[61,23],[61,63],[56,67],[13,64],[11,57],[11,31]],wood);
 P(c,[[51,15],[61,23],[61,63],[54,67],[53,22]],'#503d3d');
 R(c,15,24,37,36,'#252a37');
 books(c,18,27,32,14,1);books(c,18,46,32,13,4);
 R(c,13,21,42,5,rim);R(c,13,42,42,4,rim);R(c,13,60,42,5,rim);
 R(c,12,25,5,38,rim);R(c,50,25,5,38,rim);
 for(const y of [24,44,62]){R(c,14,y,3,2,cream);R(c,50,y,3,2,cream);}
 R(c,21,65,31,4,dark);R(c,31,14,5,52,'#a18058');R(c,31,33,5,8,'#d1b079');R(c,32,35,3,4,'#604741');
 P(c,[[16,17],[23,10],[43,7],[54,12],[52,16],[28,16],[22,20]],rim);
 R(c,24,10,17,2,cream);R(c,18,18,9,2,'#edd4a1');
 // Loose scroll and stacked volumes tied to the top.
 R(c,28,7,24,5,'#3d3542');R(c,29,6,22,3,'#b78e65');R(c,31,4,18,2,'#e8d8b2');R(c,34,2,13,2,'#596e70');
 if(f===3||f===7){R(c,18,27,30,2,'#a3dce1');R(c,18,46,30,2,'#c4c8f5');for(let i=0;i<4;i++)R(c,20+i*8,17-i%2*7,2,4,'#cfe8dc');}
 c.restore();
 // Narrow eyestalks and two separate pincers keep the animal readable at game scale.
 R(c,65,56+crouch,3,14,dark);R(c,76,53+crouch,3,16,dark);
 R(c,63,53+crouch,7,6,o);R(c,74,50+crouch,7,6,o);
 R(c,65,54+crouch,3,3,'#f8e4a9');R(c,76,51+crouch,3,3,'#f8e4a9');
 R(c,68,72,7,2,dark);

 // One massive articulated claw with an arcane core between the jaws.
 P(c,[[57,72],[65,59],[74,57],[81,65],[74,77],[63,81]],o);
 P(c,[[61,71],[68,63],[74,62],[77,66],[71,73],[64,76]],body);
 const opening=[2,2,9,6,3,5,4,10][f];
 P(c,[[67,61],[62,48],[66,33-opening/2],[77,27-opening/2],[91,30-opening/2],[95,37-opening/2],[83,35],[77,44],[80,51],[92,48],[95,53],[90,62],[79,68]],o);
 P(c,[[70,59],[66,48],[70,36-opening/2],[79,31-opening/2],[89,33-opening/2],[78,39],[73,47],[77,55],[88,53],[87,59],[78,63]],'#b99065');
 P(c,[[68,63],[77,60],[88,63+opening],[95,60+opening],[92,70+opening],[80,76],[68,73]],o);
 P(c,[[71,65],[77,64],[86,67+opening],[91,66+opening],[87,71+opening/2],[79,72],[71,70]],'#ccaa77');
 R(c,69,38-opening/2,4,10,cream);R(c,72,34-opening/2,8,3,cream);
 if(f===2||f===7){P(c,[[83,49],[89,54],[84,60],[78,55]],'#7798bd');R(c,82,52,5,5,'#d6f7eb');R(c,84,50,2,9,'#fff4d6');}

}
function biscuitBeetle(c,f){
 const o='#302936',s=[-3,0,3,0,-3,0,3,0][f];
 for(let i=0;i<3;i++){const x=29+i*13,q=i%2?s:-s;P(c,[[x,62],[x-7+q,72],[x-9+q,78],[x-3+q,78],[x+2,68]],o);R(c,x-5+q,72,5,2,'#c6a171');}
 P(c,[[19,57],[23,44],[34,37],[52,37],[65,46],[67,62],[57,70],[29,69]],o);
 P(c,[[24,56],[27,46],[36,41],[51,41],[60,48],[62,61],[54,66],[31,65]],'#bc8d57');
 R(c,40,40,3,25,'#76513b');for(const [x,y]of [[30,48],[48,46],[53,56],[32,59]])R(c,x,y,4,3,'#6f4838');R(c,30,43,8,3,'#edce96');
 P(c,[[62,54],[71,51],[79,56],[80,65],[70,69],[63,64]],o);R(c,67,55,10,9,'#d5aa71');R(c,74,56,3,4,o);R(c,69,48,2,6,o);R(c,78,49,2,7,o);R(c,67,47,4,3,'#dac08a');R(c,77,48,4,3,'#dac08a');
}
function macaronSentry(c,f){
 const o='#302936',step=f%4===0?1:0;
 for(const [x,dx]of [[34,-9],[48,0],[59,10]]){P(c,[[x,63],[x+dx,78],[x+dx+7,78],[x+5,62]],o);R(c,x+dx+2,75,5,2,'#b7aa8c');}
 P(c,[[26,43],[34,37],[60,37],[70,44],[70,59],[60,66],[33,66],[25,58]],o);
 R(c,30,43,36,18,'#967590');R(c,34,39,27,5,'#c3a0b4');R(c,28,51,40,7,'#e8d4b0');R(c,33,60,29,3,'#b68b9c');
 // A little masked head and a long wafer staff, separate from the macaron body.
 R(c,48,27,12,12,o);R(c,50,29,9,7,'#c7b38f');R(c,55,30,3,3,o);R(c,51,38,7,5,'#756251');
 R(c,63,49+step,12,4,o);R(c,66,50+step,8,2,'#cbb79a');R(c,76,32,3,42,'#5b4440');R(c,77,33,1,39,'#c6a679');
 P(c,[[77,24],[83,31],[77,38],[71,31]],o);P(c,[[77,27],[80,31],[77,35],[74,31]],'#b4d4cf');R(c,76,29,2,3,'#f4eac5');
}
function grimoire(c,f){
 const flap=[-3,-1,1,3,3,1,-1,-3][f],o='#302936';
 P(c,[[47,40],[28,34+flap],[20,41+flap],[23,62],[46,70],[69,62],[73,41-flap],[65,34-flap]],o);
 P(c,[[45,43],[29,38+flap],[24,43+flap],[26,59],[45,65]],'#809a9d');P(c,[[49,43],[64,38-flap],[69,43-flap],[66,59],[49,65]],'#8c759c');
 P(c,[[44,44],[29,41+flap],[28,57],[44,61]],'#eadbb7');P(c,[[50,44],[64,41-flap],[64,57],[50,61]],'#d7caa5');
 for(let i=0;i<4;i++){R(c,31,46+i*3+flap*.3,10,1,'#8e7970');R(c,53,46+i*3-flap*.3,9,1,'#8e7970');}
 R(c,46,42,3,26,'#544656');R(c,46,46,2,15,'#c6e5e2');
 P(c,[[47,26],[52,31],[47,36],[42,31]],'#a8d9e3');R(c,46,29,3,5,'#fff2c8');
}

const kinds=['biscuit','moth','macaron','mille','grimoire'];let atlas;if(typeof Image!=='undefined'){const img=new Image();img.onload=()=>atlas=img;img.src='assets/chapter4-monsters-v102.png';}
function build(canvas){canvas.width=768;canvas.height=480;const c=canvas.getContext('2d');
 for(let row=0;row<5;row++)for(let f=0;f<8;f++){c.save();c.translate(f*96,row*96);const step=[-4,0,4,0,-4,0,4,0][f],o='#302936';
  if(row===0)biscuitBeetle(c,f);
  if(row===1){const spread=f%4<2?0:8;P(c,[[46,50],[24-spread,32],[17,44],[26,62],[43,61]],o);P(c,[[50,50],[73+spread,30],[83,45],[71,64],[53,62]],o);P(c,[[44,50],[25-spread,37],[21,44],[29,58],[43,57]],'#c8bcab');P(c,[[52,50],[73+spread,35],[78,46],[69,59],[54,58]],'#c8bcab');R(c,43,43,12,25,'#937c66');R(c,45,39,8,10,'#deb782');R(c,45,47,3,4,o);R(c,51,47,3,4,o);R(c,47,58,4,6,'#e6d2a7');}
  if(row===2)macaronSentry(c,f);
  if(row===3)hermit(c,f);
  if(row===4)grimoire(c,f);
  c.restore();}
 return canvas;
}
let raiderAtlas=null;if(typeof Image!=='undefined'){const img=new Image();img.onload=()=>raiderAtlas=img;img.src='assets/library-raider-v104.png';}
function raiderFrame(e){return e.phase==='summon'?5:e.phase==='lob'?(e.timer>.18?2:3):e.phase==='wind'?(e.timer>.32?3:2):e.phase==='fan'?3+Math.floor(e.t*10)%2:e.phase==='leap'?6:e.phase==='charge'?3:e.phase==='recover'&&e.timer>1.95?7:Math.floor(e.t*5)%2;}
function enemy(c,g,e){if(e.libraryKind==='mille'&&e.state==='alive'&&raiderAtlas){const f=raiderFrame(e);c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(e.x+e.w/2-g.camera),Math.round(e.y+e.h));if(e.dir<0)c.scale(-1,1);if(e.flash>0)c.globalAlpha=.45;c.drawImage(raiderAtlas,f*96,0,96,96,-72,-141,144,144);c.restore();return;}if(e.state!=='alive')return;if(!atlas)atlas=build(document.createElement('canvas'));const row=kinds.indexOf(e.libraryKind),boss=row===3,size=boss?116:62;let f=Math.floor(e.t*8)%8;if(boss)f=(e.phase==='summon'||e.phase==='lob')?7:e.phase==='wind'?4:e.phase==='charge'?5+Math.floor(e.t*12)%2:e.phase==='leap'?6:e.phase==='fan'?2:Math.floor(e.t*4)%2;c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(e.x+e.w/2-g.camera),Math.round(e.y+e.h));if(e.dir<0)c.scale(-1,1);if(e.flash>0)c.globalAlpha=.45;c.drawImage(atlas,f*96,row*96,96,96,-size/2,-size*91/96,size,size);c.restore();if(!boss&&e.hp<e.maxHp){R(c,e.x-g.camera,e.y-8,e.w,3,'#252737');R(c,e.x-g.camera,e.y-8,e.w*e.hp/e.maxHp,3,'#e1a5bf');}}
function cake(c,x,y,w,h){R(c,x+4,y+h-9,w-8,9,'#9f8068');for(let i=0;i<4;i++){const yy=y+12+i*(h-19)/4;R(c,x+4,yy,w-8,12,'#8c5c3d');R(c,x+6,yy+1,w-12,4,'#eac18a');R(c,x+5,yy+12,w-10,7,'#f5ddb1');for(let k=9;k<w-8;k+=10)R(c,x+k,yy+7,5,2,'#c09260');}R(c,x+6,y+7,w-12,8,'#f5ead0');for(let k=10;k<w-12;k+=9)R(c,x+k,y+5+(k%3),4,3,'#fff7e4');}
function projectile(c,x,y,arcane=false){if(arcane){P(c,[[x+5,y-4],[x+13,y+5],[x+5,y+14],[x-3,y+5]],'#4d4774');P(c,[[x+5,y-1],[x+10,y+5],[x+5,y+11],[x,y+5]],'#a9dbe4');R(c,x+4,y+2,3,6,'#fff0ce');return;}R(c,x-2,y,18,7,'#47303a');R(c,x,y+1,14,3,'#e4ba7a');R(c,x+1,y+4,12,2,'#fff0be');}
root.MiloadLibraryArt={background,platform,props,enemy,cake,projectile,build,raiderFrame};
})(typeof globalThis!=='undefined'?globalThis:this);


