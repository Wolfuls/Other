from pathlib import Path
import numpy as np
import wave
root=Path(__file__).resolve().parents[1];rate=44100;duration=4.15
t=np.arange(int(rate*duration))/rate
# Rapid descending chirps and ascending major arpeggios: pachinko-style pirorororo.
step=.055; notes=np.array([1046.5,1318.51,1567.98,2093.0,1567.98,1318.51])
i=(t/step).astype(int);u=t%step
f=notes[i%len(notes)]*(1.32-.40*u/step)
phase=2*np.pi*np.cumsum(f)/rate
env=np.minimum(u/.002,1)*np.minimum((step-u)/.007,1)
lead=(np.sin(phase)+.32*np.sin(2*phase)+.16*np.sin(3*phase))*env
spark=np.sin(phase*1.005+.25*np.sin(t*37))*env
body=np.sin(2*np.pi*65*t)*np.exp(-(t%.22)/.065)
x=np.column_stack([lead+.28*spark+.18*body,lead-.28*spark+.18*body])*.65
for delay,gain in [(.087,.22),(.173,.12)]:
 n=int(delay*rate);x[n:]+=x[:-n,::-1]*gain
x=np.tanh(x*1.3);x*=.95/np.max(abs(x));x[:220]*=np.linspace(0,1,220)[:,None];n=int(.35*rate);x[-n:]*=np.linspace(1,0,n)[:,None]
with wave.open(str(root/'assets/audio/jackpot-v71.wav'),'wb') as w:
 w.setparams((2,2,rate,0,'NONE','not compressed'));w.writeframes((x*32767).astype('<i2').tobytes())
print('Audio:',duration,'s, peak',np.max(abs(x)),'RMS',np.sqrt(np.mean(x*x)))
for file in ['assets/js/game.js','assets/js/audio.js','index.html']:
 p=root/file;s=p.read_text(encoding='utf-8').replace('recovery-button-v70.png','recovery-button-v71.png').replace('jackpot-v68.wav','jackpot-v71.wav').replace('v0.70','v0.71').replace('?v=70','?v=71');p.write_text(s,encoding='utf-8')
