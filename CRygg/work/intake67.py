from pathlib import Path
import wave
import numpy as np
rate=44100
rng=np.random.default_rng(67)
for name,duration,shift in [('pocket',.245,1.0),('electric',.27,.90)]:
 t=np.arange(int(rate*duration))/rate
 out=np.zeros(len(t))
 # Two damped, hollow pressure pulses, like a ball dropping through a throat.
 for delay,amp,freq,tau in [(0,.85,170,.038),(.074,.62,118,.049)]:
  u=np.maximum(0,t-delay);gate=t>=delay
  f=shift*(freq+110*np.exp(-u/.012)-45*(1-np.exp(-u/.07)))
  phase=2*np.pi*np.cumsum(f)/rate
  env=(1-np.exp(-u/.002))*np.exp(-u/tau)*gate
  out+=amp*env*(np.sin(phase)+.20*np.sin(phase*1.93))
 noise=rng.normal(0,1,len(t))
 # Soft air/water turbulence, without a metallic click or ringing top end.
 noise=np.convolve(noise,np.hanning(101)/np.hanning(101).sum(),'same')
 out+=noise*1.3*(1-np.exp(-t/.006))*np.exp(-t/.065)
 out=np.convolve(out,np.hanning(31)/np.hanning(31).sum(),'same')
 out*=np.minimum(1,np.maximum(0,(duration-t)/.025))
 out=out/max(abs(out))*.72
 target=Path(f'assets/audio/{name}-v67.wav')
 with wave.open(str(target),'wb') as w:
  w.setparams((1,2,rate,0,'NONE',''));w.writeframes((out*32767).astype('<i2').tobytes())
 spectrum=abs(np.fft.rfft(out))**2;freqs=np.fft.rfftfreq(len(out),1/rate)
 print(name, 'duration',duration,'peak',round(max(abs(out)),2),'energy below 500Hz',round(spectrum[freqs<500].sum()/spectrum.sum(),3))
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace('pocket-v66.wav','pocket-v67.wav').replace('electric-v66.wav','electric-v67.wav');p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.66','v0.67').replace('audio.js?v=66','audio.js?v=67');p.write_text(s,encoding='utf-8')
