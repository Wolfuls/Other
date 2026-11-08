(() => {
 const paths={launch:'launch-v66.wav',pocket:'pocket-v67.wav',electric:'electric-v67.wav',slash:'slash-impact-v62.wav',pin:'pin-contact.wav',start:'spin-start.wav',stop0:'reel-stop.mp3',stop1:'reel-stop.mp3',stop2:'reel-stop.mp3',reach:'reach.wav',alert:'city-alert.wav',win:'jackpot.wav',rush:'rush.wav'};
 const gains={launch:.22,pocket:.65,electric:.65};
 const pools=new Map();
 for(const [name,file] of Object.entries(paths)){
  pools.set(name,Array.from({length:2},()=>{const a=new Audio('assets/audio/'+file);a.preload='auto';return a}));
 }
 window.YggAudio={
  play(name,volume=.5){
   const pool=pools.get(name);if(!pool)return;
   const a=pool.find(a=>a.paused||a.ended)||pool[0];
   a.pause();a.currentTime=0;a.volume=Math.max(0,Math.min(1,volume*(gains[name]||1)));
   // A browser may refuse playback until the first user interaction.
   const result=a.play();if(result)result.catch(()=>{});
  },
  stop(){for(const pool of pools.values())for(const a of pool){a.pause();a.currentTime=0}},
  volume(value){for(const [name,pool] of pools)for(const a of pool)a.volume=Math.max(0,Math.min(1,value*(name==='pin'?.12:(gains[name]||1))))}
 };
})();


