from pathlib import Path
import subprocess,wave,numpy as np
root=Path(__file__).resolve().parents[1];rate=44100
ff='C:/Users/user/Documents/Codex/2026-10-25/ob/work/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
def decode(p):
 return np.frombuffer(subprocess.check_output([ff,'-v','error','-i',str(p),'-f','f32le','-ar',str(rate),'-ac','1','-']),dtype='<f4').copy()
def envelope(a,attack=.002,tail=.08):
 a=a.copy();n=min(len(a),int(attack*rate));m=min(len(a),int(tail*rate));a[:n]*=np.linspace(0,1,n);a[-m:]*=np.linspace(1,0,m);return a
# A real rising cue supplies an irregular metallic texture instead of pure sine beeps.
src=decode(root/'assets/audio/sources/kyuin-reference.mp3')[:int(.60*rate)]
idx=np.arange(0,len(src)-1,1.55);sweep=np.interp(idx,np.arange(len(src)),src)
sweep=envelope(sweep,.002,.12)
metal=decode(root/'assets/audio/slash-impact-v62.wav')[:int(.24*rate)]
metal=envelope(metal,.001,.10)
x=np.zeros(int(.57*rate));x[:len(sweep)]+=sweep*1.25;x[:len(metal)]+=metal*.36
# Small lower octave body under the acute rising glint.
body=np.interp(np.arange(0,len(src)-1,1.05),np.arange(len(src)),src)
body=envelope(body,.002,.17);n=min(len(body),len(x));x[:n]+=body[:n]*.18
out=np.column_stack([x,x]);d=int(.018*rate);out[d:,1]+=.12*x[:-d]
out=np.tanh(out*1.15);out*=.92/np.max(abs(out));out[-2205:]*=np.linspace(1,0,2205)[:,None]
with wave.open(str(root/'assets/audio/eye-glint-v94.wav'),'wb') as w:
 w.setparams((2,2,rate,0,'NONE',''));w.writeframes((out*32767).astype('<i2').tobytes())
print('eye cue:',len(out)/rate,'seconds; peak',np.max(abs(out)),'RMS',np.sqrt(np.mean(out*out)))
