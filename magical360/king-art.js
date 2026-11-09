/* Hand-rasterized pixel art: baked layers, cream mantle, caramel crown. */
(function(root){
function build(canvas){canvas.width=768;canvas.height=80;const c=canvas.getContext('2d');for(let f=0;f<12;f++){const sy=[1,.98,.88,1,1.02,.96,.94,.84,1.06,1.04,.82,.95][f],sx=[1,1.02,1.08,1,1,1,1.03,1.08,.93,.94,1.12,1.05][f],lean=f===5||f===6?.12:0;
const pt=([x,y])=>[Math.round(32+(x-32)*sx+(y-74)*lean),Math.round(74+(y-74)*sy)];
const poly=(points,col)=>{const pts=points.map(pt);c.fillStyle=col;const lo=Math.max(0,Math.min(...pts.map(p=>p[1]))),hi=Math.min(79,Math.max(...pts.map(p=>p[1])));for(let y=lo;y<=hi;y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2){const l=Math.max(0,Math.ceil(xs[i])),r=Math.min(64,Math.ceil(xs[i+1]));c.fillRect(f*64+l,y,r-l,1);}}};
const R=(x,y,w,h,col)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],col),O='#392c40',cream='#fff0ce',shade='#c4a68f',gold='#e7b761';
// Broad layered sponge body with a scalloped cream mantle.
poly([[11,28],[16,24],[48,24],[54,29],[58,42],[59,70],[54,76],[10,76],[5,70],[6,42]],O);
R(9,38,46,31,'#c18a58');R(11,39,41,5,'#f2cb83');R(10,47,44,4,'#80394f');R(10,51,44,4,'#ed9b9e');R(10,55,44,7,'#f3cf8c');R(10,64,44,4,'#833b52');R(11,68,42,4,'#dba66a');
for(const [x,y]of [[13,41],[21,43],[45,41],[14,57],[43,59],[49,57],[29,69]])R(x,y,2,1,'#a3704c');
poly([[11,30],[18,25],[46,25],[53,30],[55,40],[52,47],[47,45],[43,49],[37,45],[31,48],[25,44],[19,47],[14,43],[9,44]],shade);
poly([[13,29],[19,26],[45,26],[51,29],[52,36],[49,42],[45,40],[41,45],[36,40],[31,44],[25,40],[20,43],[15,39],[11,41]],cream);
R(19,27,27,2,'#fffbed');R(12,70,40,3,cream);R(14+(f%2),74,10,3,O);R(40-(f%2),74,10,3,O);
// Chocolate face and piped brows. The mouth opens for the five-way spell.
R(17,43,10,2,O);R(19,45,7,7,O);R(37,43,10,2,O);R(38,45,7,7,O);R(20,45,3,3,'#f9d875');R(39,45,3,3,'#f9d875');
const mh=(f===3||f===4)?10:f===8||f===9?6:3;R(27,54,11,mh,O);if(mh>5){R(29,55,7,2,cream);R(30,54+mh-2,5,2,'#cf7186');}else{R(25,53,2,2,O);R(38,53,2,2,O);}
// Caramel crown rises from cream rosettes, with a single ruby jelly jewel.
for(const x of [16,26,36,46]){R(x-3,24,7,4,shade);R(x-2,21,5,5,cream);R(x,19,2,3,'#fffbed');}
poly([[16,23],[12,8],[22,13],[26,5],[32,12],[39,5],[43,13],[52,8],[48,23]],O);
poly([[19,21],[16,12],[23,16],[27,9],[32,16],[38,9],[42,16],[48,12],[45,21]],gold);
R(20,19,25,4,'#bf7d48');R(20,19,25,2,'#ffe4a1');R(29,18,7,6,'#873c58');R(30,18,4,4,'#eb91a4');R(30,18,2,2,'#ffe6c9');
// Candy buttons and small cream fists retain a royal silhouette.
R(6,50,7,10,O);R(7,50,5,7,cream);R(51,50,7,10,O);R(52,50,5,7,cream);R(29,67,6,4,gold);R(30,67,2,2,cream);
}return canvas;}
let atlas=null;if(typeof Image!=='undefined'){const img=new Image();img.onload=()=>atlas=img;img.src='assets/night-sweets-king-v82.png';}
function frame(e,g){const attack=g.storyScene?.kingAttack;if(attack&&!attack.done)return attack.t<.15?8:attack.t<.55?9:attack.t<.8?10:11;if(e.kingLand>0)return e.kingLand>.14?10:11;if(e.kingCast>0)return e.kingCast>.16?3:4;if(e.phase==='skyRise')return 8;if(e.phase==='skyAim'||e.phase==='skyFall')return 9;if(e.phase==='dash')return 5+Math.floor(e.t*12)%2;if(g.bossAwake&&e.phaseTime<.18&&e.nextMove==='dash')return 2;if(g.bossAwake&&e.phaseTime<.18&&e.nextMove==='sky')return 7;return Math.floor(e.t*3)%2;}

function draw(ctx,g,e){if(!atlas)atlas=build(document.createElement('canvas'));const f=frame(e,g);ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(e.x-g.camera+e.w/2),Math.round(e.y+e.h));if((e.chargeDir||-1)<0)ctx.scale(-1,1);ctx.drawImage(atlas,f*64,0,64,80,-32,-77,64,80);ctx.restore();}
const api={build,frame,draw};root.MiloadKingArt=api;if(typeof module!=='undefined')module.exports=api;})(globalThis);