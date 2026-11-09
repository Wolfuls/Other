from pathlib import Path
import wave,numpy as np
root=Path(__file__).resolve().parents[1]
def read(n):
 with wave.open(str(root/'assets/audio'/n),'rb') as w:return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,w.getnchannels())/32768
roll=read('jackpot-roll-v72.wav');metal=read('jackpot-v68.wav');n=min(len(roll),len(metal))
x=roll*1.7;x[:n]+=metal[:n]*.7
x=np.tanh(x*1.35);x*=.95/max(.95,np.max(abs(x)));x[-4410:]*=np.linspace(1,0,4410)[:,None]
with wave.open(str(root/'assets/audio/jackpot-roll-v81.wav'),'wb') as w:w.setparams((2,2,44100,0,'NONE',''));w.writeframes((x*32767).astype('<i2').tobytes())
print('Percussion RMS:',np.sqrt(np.mean(roll**2)),'->',np.sqrt(np.mean(x**2)),'peak',np.max(abs(x)))
p=root/'assets/js/audio.js';s=p.read_text(encoding='utf-8').replace('jackpot-roll-v72.wav','jackpot-roll-v81.wav').replace('winRoll:.55','winRoll:.9');p.write_text(s,encoding='utf-8')
p=root/'assets/js/game.js';s=p.read_text(encoding='utf-8')
s=s.replace(" showYakumono();$('lcd').classList.add('recovery-quake');", " if(h.hit)showYakumono();$('lcd').classList.add('recovery-quake');")
pos=s.index('function setReels(')
s=s[:pos]+'''const reelJolts=new WeakMap();
function joltReel(i){
 const el=$('reel'+i),stamp={};reelJolts.set(el,stamp);
 el.classList.remove('reel-jolt');void el.offsetWidth;el.classList.add('reel-jolt');
 el.dataset.jolt=String(Number(el.dataset.jolt||0)+1);
 setTimeout(()=>{if(reelJolts.get(el)===stamp)el.classList.remove('reel-jolt')},280);
}
'''+s[pos:]
s=s.replace("sound('stop2');\n // Let", "sound('stop2');joltReel(2);\n // Let")
s=s.replace("showReelCutin(0);sound('stop0');", "showReelCutin(0);sound('stop0');joltReel(0);").replace("showReelCutin(1);sound('stop1');", "showReelCutin(1);sound('stop1');joltReel(1);")
s=s.replace("if(h.hit){setReel(2,h.number);", "if(h.hit){setReel(2,h.number);joltReel(2);")
s=s.replace("if(!(i===2&&h.slashPlayed))sound('stop'+i);", "if(!(i===2&&h.slashPlayed)){sound('stop'+i);joltReel(i);}")
s=s.replace("'cutin-one','cutin-two','cutin-slash','cutin-fade'", "'cutin-one','cutin-two','cutin-slash','cutin-fade','reel-jolt'")
p.write_text(s,encoding='utf-8')
p=root/'assets/js/monitor.js';s=p.read_text(encoding='utf-8').replace("const skip=name=>", "if(from.dataset.jolt!==to.dataset.jolt&&from.classList.contains('reel-jolt')){to.classList.remove('reel-jolt');void to.offsetWidth;}\n  const skip=name=>");p.write_text(s,encoding='utf-8')
p=root/'index.html';s=p.read_text(encoding='utf-8').replace('v0.80','v0.81').replace('?v=80','?v=81');p.write_text(s,encoding='utf-8')
