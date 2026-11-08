/* Layered, cached sound effects. Music remains an independent HTML audio track. */
(function(root){'use strict';
const rates={shoot:.045,naniwaShoot:.07,enemyShoot:.07,eat:.06,hit:.045,naniwaHit:.045};
const lengths={airDash:.4,naniwaDefeated:.85,messageType:.045,cloth:.24,footLand:.15,wandDrop:.3,cartRoll:.24,messageNext:.12,dashStart:.3,cookieRattle:.4,shoot:.28,naniwaShoot:.32,enemyShoot:.3,magicClash:.65,eat:.32,jump:.24,hurt:.4,transform:.7,revive:.65,pickup:.65,hit:.28,naniwaHit:.28,heal:.9,heartUpgrade:1,switch:.23,won:1.35,lost:1.1,thud:.4,rustle:.7};
function samples(kind,sr=44100){if(!lengths[kind])return null;const out=new Float32Array(Math.ceil(lengths[kind]*sr));let seed=37123;
function tone(f,d,amp,at=0,end=f,brightness=.2){let phase=0;const n=Math.floor(d*sr),start=Math.floor(at*sr);for(let i=0;i<n&&i+start<out.length;i++){const u=i/n,t=i/sr;phase+=2*Math.PI*f*Math.pow(end/f,u)/sr;const env=Math.min(1,t/.004)*Math.pow(1-u,2.2);out[start+i]+=amp*env*(Math.sin(phase)+brightness*Math.sin(phase*2+.2)+brightness*.4*Math.sin(phase*3)) ;}}
function noise(d,amp,at=0,bright=.15){let low=0;const n=Math.floor(d*sr),start=Math.floor(at*sr);for(let i=0;i<n&&i+start<out.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low+=bright*(white-low);const env=Math.min(1,i/(sr*.003))*Math.pow(1-i/n,2);out[start+i]+=amp*env*low;}}
function chime(notes,step=.06,amp=.16){notes.forEach((f,i)=>{tone(f,.3,amp,i*step,f,.08);tone(f*2.76,.16,amp*.2,i*step);});}
switch(kind){
case'airDash':noise(.32,.5,0,.3);tone(330,.28,.15,0,660,.1);break;
case'naniwaDefeated':noise(.2,.8,0,.6);tone(190,.35,.45,0,55,.5);chime([1046,784,523],.09,.2);break;
case'messageType':tone(780,.03,.035,0,680,.05);break;
case'cloth':noise(.22,.22,0,.2);break;
case'footLand':noise(.08,.23,0,.18);tone(105,.11,.09,0,70,.15);break;
case'wandDrop':noise(.045,.2,0,.5);tone(970,.17,.12,0,730,.25);tone(550,.12,.07,.08);break;
case'cartRoll':noise(.2,.18,0,.15);for(let i=0;i<3;i++)tone(120,.04,.06,i*.055,95,.2);break;
case'messageNext':tone(930,.065,.085,0,1150,.08);tone(1500,.07,.035,.025);break;
case'dashStart':noise(.23,.7,0,.09);noise(.12,.23,.025,.35);tone(170,.18,.1,0,310,.05);break;
case'cookieRattle':for(let j=0;j<4;j++){noise(.03,.22,j*.065,.7);tone(1700+j%2*300,.055,.065,j*.065);tone(730,.055,.05,j*.065);}break;
case'shoot':tone(700,.12,.15,0,480,.35);tone(1450,.15,.07,.012,1200,.08);noise(.07,.18,0,.55);break;
case'naniwaShoot':case'enemyShoot':tone(490,.16,.17,0,310,.5);tone(1180,.18,.09,.008,820,.2);noise(.1,.23,0,.3);break;
case'magicClash':noise(.22,.6,0,.6);tone(165,.22,.22,0,70,.25);chime([1400,1900,2350],.025,.13);break;
case'eat':noise(.055,.5,0,.7);noise(.045,.3,.055,.65);tone(530,.11,.15,.015,350,.3);chime([1046,1568],.06,.1);break;
case'jump':noise(.12,.19,0,.12);tone(270,.18,.15,0,530,.15);tone(540,.13,.05,.025,760,.05);break;
case'hurt':noise(.16,.55,0,.28);tone(135,.3,.27,0,62,.5);tone(310,.16,.13,.01,170,.2);break;
case'hit':case'naniwaHit':noise(.09,.5,0,.55);tone(230,.18,.18,0,95,.3);tone(1250,.13,.08,.01,800,.15);break;
case'transform':noise(.23,.22,0,.12);chime([659,988,1319,1976],.055,.15);tone(220,.25,.11,0,600,.1);break;
case'revive':chime([1319,988,659,330],.065,.14);noise(.28,.28,.05,.15);break;
case'pickup':chime([784,988,1175,1568],.055,.16);break;
case'heal':case'heartUpgrade':chime([523,659,784,1046,1319],.085,.18);tone(262,.5,.08,.1);break;
case'switch':noise(.045,.2,0,.4);chime([880,1320],.04,.12);break;
case'won':chime([523,659,784,1046],.12,.19);[523,659,784].forEach(f=>tone(f,.65,.08,.45));break;
case'lost':chime([523,440,349,262],.15,.16);tone(131,.6,.12,.3);break;
case'thud':noise(.12,.42,0,.1);tone(95,.32,.28,0,42,.2);break;
case'rustle':for(let i=0;i<4;i++)noise(.17,.3,i*.14,.55);break;
}
// Short early reflections add space without smearing rapid fire or crunchy impacts.
const dry=out.slice(),wet=['shoot','naniwaShoot','naniwaHit','eat','hurt','thud'].includes(kind)?.08:.16;
for(const [delay,gain]of [[.037,wet],[.073,wet*.45]]){const offset=Math.floor(delay*sr);for(let i=offset;i<out.length;i++)out[i]+=dry[i-offset]*gain;}
for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i]*1.35)*.85*Math.min(1,(out.length-1-i)/(sr*.012));
return out;}
class SoundBank{
constructor(context){this.context=context;this.cache=new Map();this.last=new Map();this.voices=new Set();this.bus=context.createGain();this.bus.gain.value=.9;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;this.bus.connect(limiter);limiter.connect(context.destination);}
play(kind){if(!lengths[kind])return;const c=this.context,t=c.currentTime;if(t-(this.last.get(kind)??-Infinity)<(rates[kind]||.025))return;this.last.set(kind,t);let b=this.cache.get(kind);if(!b){const data=samples(kind,c.sampleRate);b=c.createBuffer(1,data.length,c.sampleRate);b.copyToChannel(data,0);this.cache.set(kind,b);}if(this.voices.size>=24){const old=this.voices.values().next().value;old.stop();this.voices.delete(old);}const source=c.createBufferSource();source.buffer=b;source.connect(this.bus);source.onended=()=>{source.disconnect();this.voices.delete(source);};this.voices.add(source);source.start();}
}
root.MiloadSfx={SoundBank,samples,lengths};if(typeof module!=='undefined')module.exports=root.MiloadSfx;
})(typeof globalThis!=='undefined'?globalThis:this);

