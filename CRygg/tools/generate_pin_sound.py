"""Short inharmonic steel contact; numpy required."""
from pathlib import Path
import numpy as np
import wave
rate=44100
t=np.arange(int(rate*.085))/rate
rng=np.random.default_rng(45)
# Irregular resonant modes and a rough impact transient, no pitched melody.
x=np.zeros(len(t))
for f,a,d in [(2873,.13,.007),(4361,.10,.005),(6197,.06,.0035),(8311,.035,.002)]:
    x+=a*np.sin(2*np.pi*f*t+rng.uniform(-.3,.3))*np.exp(-t/d)
x+=rng.normal(0,.10,len(t))*np.exp(-t/.0014)
x*=np.minimum(1,t/.0001)*np.minimum(1,(.085-t)/.008)
with wave.open(str(Path(__file__).resolve().parents[1]/'assets/audio/pin-hit.wav'),'wb') as f:
    f.setparams((1,2,rate,0,'NONE','not compressed'))
    f.writeframes((x*32767).astype('<i2').tobytes())
