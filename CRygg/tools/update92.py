from pathlib import Path
import numpy as np,wave
r=44100;t=np.arange(int(.62*r))/r
f=1100+2250*(1-np.exp(-t/.025))-650*t
phase=2*np.pi*np.cumsum(f)/r
env=np.minimum(t/.003,1)*np.exp(-t/.16)
x=(np.sin(phase)+.22*np.sin(phase*2.01)+.13*np.sin(phase*3.97))*env
x+=.25*np.sin(2*np.pi*4320*t)*np.exp(-t/.10)
x=np.tanh(x);x*=.88/max(abs(x));x[-2205:]*=np.linspace(1,0,2205)
y=np.column_stack([x,x]);n=int(.025*r);y[n:,1]+=.1*x[:-n];y*=.92/max(.92,np.max(abs(y)))
with wave.open('assets/audio/eye-glint-v92.wav','wb') as w:w.setparams((2,2,r,0,'NONE',''));w.writeframes((y*32767).astype('<i2').tobytes())
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace('const paths={',"const paths={eyeGlint:'eye-glint-v92.wav',");p.write_text(s,encoding='utf-8')
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8').replace(" setTimeout(()=>{if(serial===eyeAlertSerial)clearEyeAlert()},1200);", " setTimeout(()=>{if(serial===eyeAlertSerial)sound('eyeGlint')},220);\n setTimeout(()=>{if(serial===eyeAlertSerial)clearEyeAlert()},1200);")
s=s.replace(" await cutinReady;if(id!==token)return false;showReelCutin(0);", " if(h.number===9){showEyeAlert();await pause(1200);if(id!==token)return false;}\n await cutinReady;if(id!==token)return false;showReelCutin(0);")
s=s.replace('b.x>63&&b.x<75&&b.vx>-20','b.x>63.5&&b.x<74.5&&b.vx>-20');p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.91','v0.92').replace('?v=91','?v=92').replace('audio.js?v=83','audio.js?v=92');p.write_text(s,encoding='utf-8')
