/* Pixel-rasterized nocturnal beast: small horned head, mane, torso and four articulated legs. */
(function(root){
function build(canvas){canvas.width=1152;canvas.height=80;const c=canvas.getContext('2d');
for(let f=0;f<12;f++){
const O='#242839',dark='#394451',hide='#667b80',lit='#95a3a0',mane='#49435e',violet='#71627e',ivory='#c3bba1',eye='#e8bc76';
const crouch=f===2?5:f===7?8:f===10?9:f===11?3:0,rise=f===8?-5:f===9?-2:0,dy=crouch+rise;
const P=(pts,col)=>{c.fillStyle=col;const ys=pts.map(p=>p[1]);for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<Math.min(80,Math.ceil(Math.max(...ys)));y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2){const l=Math.max(0,Math.ceil(xs[i])),r=Math.min(96,Math.ceil(xs[i+1]));if(r>l)c.fillRect(f*96+l,y,r-l,1);}}};
const R=(x,y,w,h,col)=>P([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],col);
const B=(pts,col)=>P(pts.map(([x,y])=>[x,y+dy]),col);


// Velvet mantle and fur collar, behind the rounded king.
B([[29,26],[19,31],[10,47],[2,69],[24,72],[41,58],[44,35]],'#4d2234');B([[27,29],[20,35],[14,48],[6,66],[23,67],[36,54],[39,35]],'#a63842');B([[9,62],[5,69],[23,72],[37,60],[35,56],[22,65]],'#efd6bd');
// Low broad toad, bumpy back and folded hindquarters. No upright neck or tail.
const cast=f===3||f===4,air=f===8||f===9;
B([[13,49],[16,36],[28,27],[45,24],[61,28],[73,37],[81,49],[77,65],[62,71],[29,71],[13,63]],O);
B([[17,48],[20,37],[32,30],[46,28],[59,31],[70,39],[75,50],[71,62],[59,67],[30,67],[18,60]],'#b97443');
B([[25,38],[34,32],[48,31],[60,35],[64,39],[46,37],[30,43]],'#d4965f');
B([[35,53],[55,46],[72,50],[73,60],[61,67],[36,68],[26,61]],'#f0c78c');
for(const [x,y]of [[25,41],[31,34],[39,29],[47,29],[56,33],[20,48],[35,44],[44,40],[54,42]]){R(x,y+dy,5,3,'#874c38');R(x+1,y-1+dy,3,2,'#dba474');}
// Broad folded thighs are almost as large as the torso.
B([[14,46],[27,43],[36,50],[38,61],[30,70],[11,70],[5,62],[6,53]],O);
B([[15,49],[25,47],[32,52],[34,60],[27,66],[13,66],[9,61],[10,55]],'#a5603c');
B([[14,52],[22,49],[28,53],[30,58],[25,61],[17,57]],'#d18d52');
P([[12,65+dy],[22,66+dy],[16,72],[30,73],[31,77],[7,77],[5,73]],O);
R(9,73,19,3,'#8d8878');R(9,74,2,3,ivory);R(16,74,2,3,ivory);R(24,74,2,3,ivory);
// Small forearms splay out onto the ground.
for(const x of [52,73]){B([[x,53],[x+6,52],[x+8,62],[x+3,69],[x-1,65]],O);P([[x+2,57+dy],[x+4,57+dy],[x+4,66],[x+1,72],[x+11,73],[x+13,77],[x-4,77],[x-3,72]],'#aa673f');R(x+3,74,2,3,ivory);R(x+8,74,2,3,ivory);}
// Flattened amphibian head merges into the shoulders; eyes sit on low ridges.
B([[49,39],[54,31],[61,30],[65,34],[74,30],[80,33],[83,40],[90,44],[90,50],[80,57],[60,57],[49,50]],O);
B([[53,40],[57,34],[61,34],[64,39],[74,34],[79,36],[80,42],[86,45],[86,49],[78,53],[61,53],[53,48]],'#c08047');
R(55,31+dy,12,13,O);R(57,32+dy,9,10,'#f6d478');R(62,33+dy,3,7,O);R(58,33+dy,3,3,'#fff4d2');R(75,32+dy,10,12,O);R(77,33+dy,7,9,'#f6d478');R(81,34+dy,3,6,O);R(83,44+dy,2,1,O);
B([[57,48],[69,49],[85,47],[82,50],[68,52],[58,51]],O);
if(cast){B([[60,52],[80,52],[83,60],[78,67],[62,66],[56,59]],'#c0b796');R(66,52+dy,12,5,O);R(68,53+dy,8,2,'#9b83ab');}
// Short crown-like bony ridges, rather than long mammalian antlers.
B([[52,30],[48,14],[58,20],[64,8],[71,20],[82,14],[79,30]],'#724227');B([[55,27],[53,19],[59,24],[64,14],[70,24],[78,19],[76,27]],'#efbf4d');R(54,26+dy,24,4,'#d99832');R(63,23+dy,7,7,'#a63749');R(64,24+dy,3,3,'#ffe4cd');
}return canvas;}
let atlas=null;if(typeof Image!=='undefined'){const img=new Image();img.onload=()=>atlas=img;img.src='assets/night-sweets-king-v103.png?v=104';}
function frame(e,g){const attack=g.storyScene?.kingAttack;if(attack&&!attack.done)return attack.t<.15?8:attack.t<.55?9:attack.t<.8?10:11;if(e.kingLand>0)return e.kingLand>.14?10:11;if(e.kingCast>0)return e.kingCast>.16?3:4;if(e.phase==='skyRise')return 8;if(e.phase==='skyAim'||e.phase==='skyFall')return 9;if(e.phase==='dash'){const q=((e.hopClock||0)%.475)/.475;return q<.12?7:q<.5?8:q<.88?9:10;}if(g.bossAwake&&e.phaseTime<.18&&e.nextMove==='dash')return 2;if(g.bossAwake&&e.phaseTime<.18&&e.nextMove==='sky')return 7;return Math.floor(e.t*3)%2;}

function draw(ctx,g,e){if(!atlas)atlas=build(document.createElement('canvas'));const f=frame(e,g);ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(e.x-g.camera+e.w/2),Math.round(e.y+e.h));if((e.chargeDir||-1)<0)ctx.scale(-1,1);ctx.drawImage(atlas,f*96,0,96,80,-66,-106,132,110);ctx.restore();}
const api={build,frame,draw};root.MiloadKingArt=api;if(typeof module!=='undefined')module.exports=api;})(globalThis);
