"""Render cinematic percussion effects. Requires numpy; reel-stop.mp3 is user supplied and untouched."""
from pathlib import Path
import wave
import numpy as np

RATE = 44100
ROOT = Path(__file__).resolve().parents[1] / 'assets/audio'
rng = np.random.default_rng(40)

def impact(length, weight=1):
    t = np.arange(int(length*RATE))/RATE
    noise = rng.normal(0, 1, len(t))
    low = np.convolve(noise, np.ones(100)/100, mode='same')
    body = np.sin(2*np.pi*(42*t+18*.06*(1-np.exp(-t/.06))))*np.exp(-t/.45)
    crack = noise*np.exp(-t/.025)*.23
    metal = sum(np.sin(2*np.pi*f*t+rng.random()*6)*np.exp(-t/d)*a for f,d,a in [(179,.6,.16),(293,.4,.10),(487,.25,.07),(827,.18,.04)])
    return (body*.8+low*3*np.exp(-t/.8)+crack+metal)*weight*np.minimum(t/.001,1)

def render(name, seconds, hits, swell=0):
    x = np.zeros(int(seconds*RATE))
    for at, weight in hits:
        start=int(at*RATE); z=impact(min(2.5,seconds-at),weight); z=z[:len(x)-start]; x[start:start+len(z)]+=z
    if swell:
        n=int(swell*RATE); t=np.arange(n)/RATE
        wind=np.convolve(rng.normal(0,1,n),np.ones(14)/14,mode='same')
        x[:n]+=wind*(t/swell)**2*1.3
    stereo=np.stack([x,x],axis=1)
    # Early reflections and a dense decaying tail, not a melodic oscillator sequence.
    for channel in range(2):
        for delay in np.arange(.061+channel*.017,1.65,.037):
            offset=int(delay*RATE)
            stereo[offset:,channel]+=x[:-offset]*np.exp(-delay*2.7)*.085*rng.choice([-1,1])
    stereo=np.tanh(stereo*1.1)
    stereo*=.93/max(.93,np.max(np.abs(stereo)))
    fade=min(int(.15*RATE),len(x)); stereo[-fade:]*=np.linspace(1,0,fade)[:,None]
    with wave.open(str(ROOT/(name+'.wav')),'wb') as f:
        f.setparams((2,2,RATE,0,'NONE','not compressed')); f.writeframes((stereo*32767).astype('<i2').tobytes())

if __name__=='__main__':
    render('spin-start',1.2,[(.12,.8)],.12)
    render('reach',2.8,[(.0,.65),(.48,1.3)],.48)
    render('pre-alert',2.5,[(0,1.4),(.23,.8),(.46,1.2)])
    render('jackpot',4.5,[(0,1.5),(.24,.8),(.48,.9),(.96,1.25),(1.44,1.0),(1.92,1.6)],.18)
    render('rush',2.3,[(.0,.7),(.22,.9),(.44,1.3)],.44)

