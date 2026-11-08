from pathlib import Path
import numpy as np
import wave,subprocess
root=Path(__file__).resolve().parents[1]; rate=44100
ff='C:/Users/user/Documents/Codex/2026-10-25/ob/work/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
def read(name):
 b=subprocess.check_output([ff,'-v','error','-i',str(root/'assets/audio'/name),'-f','f32le','-ar',str(rate),'-ac','2','-'])
 return np.frombuffer(b,dtype='<f4').reshape(-1,2)
x=np.zeros((int(4.15*rate),2));rng=np.random.default_rng(68)
def add(a,at,gain=1):
 start=int(at*rate);n=min(len(a),len(x)-start)
 if n>0:x[start:start+n]+=a[:n]*gain
add(read('jackpot.wav'),0,.7)
clang=read('reel-stop.mp3')[:int(.7*rate)]
clang=clang.copy();clang[-4410:]*=np.linspace(1,0,4410)[:,None]
for at,gain in [(0,1),(.18,.65),(.36,.8),(.6,1.2),(1.25,.8),(1.9,.9),(2.55,1.0),(3.2,1.15)]:
 add(clang,at,gain)
 t=np.arange(int(.8*rate))/rate
 boom=np.sin(2*np.pi*(47*t+2.1*(1-np.exp(-t/.035))))*np.exp(-t/.22)
 boom*=np.minimum(t/.003,1)
 add(np.column_stack([boom,boom]),at,.65*gain)
# Stereo reflected metallic decay gives size without a beep melody.
for delay,gain in [(.071,.14),(.113,.11),(.193,.08)]:
 n=int(delay*rate);x[n:]+=x[:-n,::-1]*gain
x=np.tanh(x*1.35);x*=.96/max(.96,np.max(np.abs(x)))
x[-int(.4*rate):]*=np.linspace(1,0,int(.4*rate))[:,None]
with wave.open(str(root/'assets/audio/jackpot-v68.wav'),'wb') as w:
 w.setparams((2,2,rate,0,'NONE','not compressed'));w.writeframes((x*32767).astype('<i2').tobytes())
print('duration',len(x)/rate,'peak',np.max(abs(x)),'RMS',np.sqrt(np.mean(x*x)))
