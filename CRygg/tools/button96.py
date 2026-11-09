from pathlib import Path
import wave,numpy as np
r=44100;root=Path('assets/audio')
def read(n):
 with wave.open(str(root/n),'rb') as w:
  x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,w.getnchannels())/32768;return x.mean(axis=1)
x=np.zeros(int(.8*r));eye=read('eye-glint-v94.wav');x[:len(eye)]+=eye*.8
metal=read('slash-impact-v62.wav');n=min(len(metal),len(x));x[:n]+=metal[:n]*.48
t=np.arange(len(x))/r
for f,g in [(1174,.18),(1480,.15),(1760,.13),(2349,.08)]:
 phase=2*np.pi*(f*t+50*.02*(1-np.exp(-t/.02)));x+=g*np.sin(phase)*np.exp(-t/.19)*np.minimum(t/.002,1)
x=np.tanh(x*1.2);x*=.94/max(.94,np.max(abs(x)));x[-4410:]*=np.linspace(1,0,4410)
y=np.column_stack([x,x]);d=int(.029*r);y[d:,1]+=.09*x[:-d];y*=.95/max(.95,np.max(abs(y)))
with wave.open(str(root/'button-arrival-v96.wav'),'wb') as w:w.setparams((2,2,r,0,'NONE',''));w.writeframes((y*32767).astype('<i2').tobytes())
print('bright arrival peak',np.max(abs(y)))
