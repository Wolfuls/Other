import subprocess,numpy as np
ff='C:/Users/user/Documents/Codex/2026-10-25/ob/work/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
p='C:/Users/user/Downloads/nc460361_【効果音】キュイーン・当たり・パチスロ.mp3'
x=np.frombuffer(subprocess.check_output([ff,'-v','error','-i',p,'-f','f32le','-ar','44100','-ac','1','-']),dtype='<f4')
print('duration',len(x)/44100,'peak',max(abs(x)))
for t in np.arange(0,len(x)/44100,.2):
 a=x[int(t*44100):int((t+.2)*44100)];f=np.fft.rfftfreq(len(a),1/44100);sp=abs(np.fft.rfft(a*np.hanning(len(a))));print(round(t,2),round(float(np.sqrt(np.mean(a*a))),3),round(float(f[np.argmax(sp)])))
