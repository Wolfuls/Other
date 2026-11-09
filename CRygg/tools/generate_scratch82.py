from pathlib import Path
import subprocess,wave,numpy as np
root=Path(__file__).resolve().parents[1];r=44100
ff='C:/Users/user/Documents/Codex/2026-10-25/ob/work/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
src=np.frombuffer(subprocess.check_output([ff,'-v','error','-i',str(root/'assets/audio/sources/kyuin-reference.mp3'),'-f','f32le','-ar',str(r),'-ac','1','-']),dtype='<f4').copy()
def fade(a,attack=.003,release=.014):
 a=a.copy();n=min(len(a),int(attack*r));m=min(len(a),int(release*r));a[:n]*=np.linspace(0,1,n);a[-m:]*=np.linspace(1,0,m);return a
def speed(a,ratio):return np.interp(np.arange(0,len(a)-1,ratio),np.arange(len(a)),a)
x=np.zeros(int(4.05*r))
def add(a,at,gain=1):
 k=int(at*r);n=min(len(a),len(x)-k);x[k:k+n]+=a[:n]*gain
# Fast retriggers with alternating pitch pulls, increasingly tight spacing.
onsets=[0,.22,.425,.615,.79,.955,1.11,1.255,1.39,1.515]
for i,at in enumerate(onsets):
 a=src[:int(.26*r)];ratio=1.10+(i%3)*.07
 a=speed(a,ratio)[:int((.18-i*.005)*r)]
 add(fade(a),at,.95)
 # Tiny backwards pull before the next forward scratch, without hard clicks.
 if i<9:add(fade(speed(src[int(.16*r):int(.205*r)][::-1],1.25),.002,.008),at+.16-i*.005,.25)
# Final sustained KYUIIIN: source attack, overlapped steady ringing grains, tail.
start=1.68;add(fade(src[:int(.30*r)],.003,.04),start)
grain=src[int(.24*r):int(.40*r)].copy()*np.hanning(int(.16*r))[:len(src[int(.24*r):int(.40*r)])]
for at in np.arange(start+.20,3.55,.08):add(grain,at,1.05)
add(fade(src[int(.38*r):int(.65*r)],.03,.09),3.53,.9)
stereo=np.column_stack([x,x]);n=int(.037*r);stereo[n:,1]+=.13*x[:-n];n=int(.061*r);stereo[n:,0]+=.1*x[:-n]
stereo=np.tanh(stereo*1.3);stereo*=.94/np.max(abs(stereo));stereo[-4410:]*=np.linspace(1,0,4410)[:,None]
with wave.open(str(root/'assets/audio/jackpot-scratch-v82.wav'),'wb') as w:w.setparams((2,2,r,0,'NONE',''));w.writeframes((stereo*32767).astype('<i2').tobytes())
print('10 retriggers + sustained finish;',len(stereo)/r,'s; peak',np.max(abs(stereo)),'RMS',np.sqrt(np.mean(stereo*stereo)))
p=root/'assets/js/audio.js';s=p.read_text(encoding='utf-8').replace('const paths={',"const paths={winScratch:'jackpot-scratch-v82.wav',").replace('const gains={','const gains={winScratch:.75,');p.write_text(s,encoding='utf-8')
p=root/'assets/js/game.js';s=p.read_text(encoding='utf-8').replace("sound('winRoll');","sound('winRoll');sound('winScratch');");p.write_text(s,encoding='utf-8')
p=root/'index.html';s=p.read_text(encoding='utf-8').replace('v0.81','v0.82').replace('?v=81','?v=82');p.write_text(s,encoding='utf-8')
