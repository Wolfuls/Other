from pathlib import Path
import wave,numpy as np,subprocess
root=Path(__file__).resolve().parents[1];r=44100
ff='C:/Users/user/Documents/Codex/2026-10-25/ob/work/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
a=np.frombuffer(subprocess.check_output([ff,'-v','error','-i',str(root/'assets/audio/reel-stop.mp3'),'-f','f32le','-ar',str(r),'-ac','1','-']),dtype='<f4')
for name,dur,speed in [('button-arrival',.64,.72),('button-press',.30,.88)]:
 t=np.arange(int(dur*r))/r;x=np.zeros(len(t));hit=np.interp(np.arange(0,len(a)-1,speed),np.arange(len(a)),a);n=min(len(hit),len(x));x[:n]+=hit[:n]*.85
 x+=.65*np.sin(2*np.pi*(55*t+2*(1-np.exp(-t/.018))))*np.exp(-t/.105)
 x*=np.minimum(t/.0015,1);x=np.tanh(x*1.5);x[-int(.10*r):]*=np.linspace(1,0,int(.10*r));x*=.93/max(.93,np.max(abs(x)))
 with wave.open(str(root/'assets/audio'/f'{name}-v95.wav'),'wb') as w:w.setparams((1,2,r,0,'NONE',''));w.writeframes((x*32767).astype('<i2').tobytes())
 print(name,dur,'peak',np.max(abs(x)))
