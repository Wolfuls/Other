import numpy as np
import wave

from pathlib import Path
S=44100
rng=np.random.default_rng(110)
out=Path(__file__).resolve().parents[1]/'assets/audio'
def noise(n,lo,hi):
 f=np.fft.rfftfreq(n,1/S); shape=(f/lo)**2/(1+(f/lo)**2)/(1+(f/hi)**4); return np.fft.irfft(np.fft.rfft(rng.normal(size=n))*shape,n)
def save(name,x):
 x=np.tanh(x*1.5);x-=x.mean();x*=np.minimum(np.arange(len(x))/(S*.008),1)*np.minimum(np.arange(len(x))[::-1]/(S*.06),1)
 x=x/max(abs(x).max(),.01)*.86
 with wave.open(str(out/('manga-'+name+'-v110.wav')),'wb') as w: w.setparams((1,2,S,0,'NONE','not compressed')); w.writeframes((x*32767).astype('<i2').tobytes())
def sweep(name,d,lo,hi):
 t=np.arange(int(S*d))/S;env=np.sin(np.pi*t/d)**1.5
 save(name,noise(len(t),lo,hi)*env*3)
sweep('windup',1.05,60,1200)
sweep('dodge',.32,350,6500)
sweep('swing',.45,100,5500)
t=np.arange(int(S*1.9))/S
save('impact',np.sin(2*np.pi*(42*t+30*(1-np.exp(-t*14))/14))*np.exp(-t*3)*1.4+noise(len(t),50,2600)*np.exp(-t*7)*3+noise(len(t),90,600)*np.exp(-t*1.9))
t=np.arange(int(S*.8))/S;x=np.zeros(len(t))
for start in [.0,.16,.33,.52]:
 u=np.maximum(0,t-start);e=(t>=start)*np.exp(-u*35)
 x+=e*(noise(len(t),700,7000)*2+np.sin(2*np.pi*1367*u)*.24)
save('transform',x)
# Uneven combustion pulses, exhaust and chain tooth rattle, with two throttle surges.
t=np.arange(int(S*3.5))/S
rpm=58+65*(1-np.exp(-t*3))+30*np.sin(np.pi*np.clip((t-.9)/1.8,0,1))**2
phase=np.cumsum(rpm*(1+.025*noise(len(t),5,25)))/S
pulse=np.exp(-((phase%1)/.10)**2);pulse-=pulse.mean()
engine=np.fft.irfft(np.fft.rfft(pulse)/(1+(np.fft.rfftfreq(len(t),1/S)/2600)**4),len(t))
grit=noise(len(t),650,7000)*(.25+.75*pulse.clip(0))*1.1
exhaust=noise(len(t),70,550)*.7
chain=noise(len(t),1800,10000)*(.25+.25*np.sin(2*np.pi*phase*6))
env=np.minimum(t/.18,1)*np.minimum((3.5-t)/.35,1)
save('chainsaw',(engine*2.6+grit+exhaust+chain)*env)
t=np.arange(int(S*.72))/S
save('cut',noise(len(t),250,9500)*np.exp(-t*5)*2+noise(len(t),70,600)*np.exp(-t*10))
t=np.arange(int(S*2.7))/S;x=noise(len(t),60,700)*np.exp(-t*1.3)*.5
for start in rng.uniform(0,2.3,35):
 u=np.maximum(0,t-start);x+=noise(len(t),250,5000)*np.exp(-u*rng.uniform(25,65))*(t>=start)*rng.uniform(.4,1.3)
save('collapse',x)
print('Created 8 dedicated manga sound files')

