from pathlib import Path
import wave,numpy as np
r=44100;t=np.arange(int(.58*r))/r;rng=np.random.default_rng(93)
# Compact metallic arrival: rising air, solid low hit and bright chime tail.
phase=2*np.pi*(105*t+3*(1-np.exp(-t/.025)))
x=.75*np.sin(phase)*np.exp(-t/.085)
for f,a,d in [(735,.24,.15),(1483,.18,.20),(2517,.09,.12)]:x+=a*np.sin(2*np.pi*f*t)*np.exp(-t/d)
x+=rng.normal(0,1,len(t))*.15*np.exp(-t/.018)
x*=np.minimum(t/.002,1);x=np.tanh(x*1.3);x*=.9/np.max(abs(x));x[-4410:]*=np.linspace(1,0,4410)
y=np.column_stack([x,x]);n=int(.021*r);y[n:,1]+=.1*x[:-n];y*=.94/max(.94,np.max(abs(y)))
with wave.open('assets/audio/button-arrival-v93.wav','wb') as w:w.setparams((2,2,r,0,'NONE',''));w.writeframes((y*32767).astype('<i2').tobytes())
print('arrival duration',len(y)/r,'peak',np.max(abs(y)))
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8').replace("prompt.type='button';$('lcd').append(prompt);", "prompt.type='button';\n  const burst=document.createElement('span');burst.className='button-arrival-burst';burst.setAttribute('aria-hidden','true');\n  for(let i=0;i<12;i++){const spark=document.createElement('i');spark.style.setProperty('--spark-angle',(i*30)+'deg');spark.style.setProperty('--spark-distance',(55+(i%3)*12)+'px');burst.append(spark);}\n  prompt.append(burst);$('lcd').append(prompt);sound('buttonArrival');")
p.write_text(s,encoding='utf-8')
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace('const paths={',"const paths={buttonArrival:'button-arrival-v93.wav',").replace('const gains={','const gains={buttonArrival:.8,');p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.92','v0.93').replace('?v=92','?v=93');p.write_text(s,encoding='utf-8')
