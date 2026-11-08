from pathlib import Path
import wave,numpy as np
root=Path(__file__).resolve().parents[1];r=44100
def read(name):
 with wave.open(str(root/'assets/audio'/name),'rb') as w:return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,w.getnchannels())/32768.
def save(name,x):
 x=np.tanh(x);x*=.94/max(.94,np.max(abs(x)));n=4410;x[-n:]*=np.linspace(1,0,n)[:,None]
 with wave.open(str(root/'assets/audio'/name),'wb') as w:w.setparams((2,2,r,0,'NONE',''));w.writeframes((x*32767).astype('<i2').tobytes())
 print(name,'peak',np.max(abs(x)),'RMS',np.sqrt(np.mean(x*x)))
a=read('jackpot-v71.wav');b=read('jackpot-v68.wav');n=min(len(a),len(b));a[:n]=a[:n]*.85+b[:n]*.52;save('jackpot-v72.wav',a)
t=np.arange(len(a))/r;roll=np.zeros(len(t));rng=np.random.default_rng(72)
# Accelerating mechanical drum roll, low pressure hits and bright metallic cracks.
for at in np.arange(0,3.9,.075):
 u=t-at;v=np.maximum(u,0);env=(u>=0)*np.minimum(v/.0015,1)
 roll+=env*(.65*np.sin(2*np.pi*(78*v+2*(1-np.exp(-v/.012))))*np.exp(-v/.045)+.23*rng.normal(0,1,len(t))*np.exp(-v/.012)+.16*np.sin(2*np.pi*1379*v)*np.exp(-v/.022))
x=np.column_stack([roll,roll]);delay=int(.023*r);x[delay:,1]+=.22*roll[:-delay];save('jackpot-roll-v72.wav',x)
for file in ['assets/js/audio.js','assets/js/game.js','index.html']:
 p=root/file;s=p.read_text(encoding='utf-8')
 if file.endswith('audio.js'):s=s.replace("win:'jackpot-v71.wav'","win:'jackpot-v72.wav',winRoll:'jackpot-roll-v72.wav'").replace('const gains={','const gains={win:.8,winRoll:.55,')
 if file.endswith('game.js'):
  s=s.replace("sound('win');", "sound('win');sound('winRoll');")
  # Keep both sound layers inside the existing success-audio guard.
  s=s.replace("if(!$('lcd').classList.contains('recovery-success'))sound('win');sound('winRoll');", "if(!$('lcd').classList.contains('recovery-success')){sound('win');sound('winRoll');}")
  s=s.replace("const title=document.createElement('div');title.className='jackpot-title';", "const prop=document.createElement('img');prop.className='jackpot-yakumono';prop.src='assets/images/effects/jackpot-yakumono-v72.png';prop.alt='';scene.append(prop);\n const title=document.createElement('div');title.className='jackpot-title';")
 s=s.replace('v0.71','v0.72').replace('?v=71','?v=72');p.write_text(s,encoding='utf-8')
