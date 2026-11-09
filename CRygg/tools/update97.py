from pathlib import Path
import numpy as np,wave
root=Path('assets/audio');r=44100
x=np.zeros((int(.95*r),2))
for name,gain in [('button-arrival-v96.wav',.85),('yakumono-impact-v79.wav',.95)]:
 with wave.open(str(root/name),'rb') as w:a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,w.getnchannels())/32768
 if a.shape[1]==1:a=np.repeat(a,2,axis=1)
 n=min(len(x),len(a));x[:n]+=a[:n]*gain
x=np.tanh(x*1.3);x*=.95/max(.95,np.max(abs(x)));x[-4410:]*=np.linspace(1,0,4410)[:,None]
with wave.open(str(root/'winning-line-v97.wav'),'wb') as w:w.setparams((2,2,r,0,'NONE',''));w.writeframes((x*32767).astype('<i2').tobytes())
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace('const paths={',"const paths={winningLine:'winning-line-v97.wav',");p.write_text(s,encoding='utf-8')
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8').replace("'jackpot-reveal','recovery-success'","'jackpot-reveal','jackpot-lock','recovery-success'")
s=s.replace("$('lcd').classList.add('jackpot-reveal');sound('stop2');\n await pause(4200);if(id!==token)return false;", "$('lcd').classList.add('jackpot-reveal');\n // Third card settles after .7s motion plus .2s stagger.\n await pause(900);if(id!==token)return false;\n $('lcd').classList.add('jackpot-lock');sound('winningLine');\n await pause(330);if(id!==token)return false;\n $('lcd').classList.remove('jackpot-lock');\n await pause(3870);if(id!==token)return false;")
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.96','v0.97').replace('?v=96','?v=97');p.write_text(s,encoding='utf-8')
