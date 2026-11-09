from pathlib import Path
s=Path('work/events77.cjs').read_text(encoding='utf-8')
s=s[:s.index('(async()=>{const file=')]
s=s.replace('let js = html;', "let js = html.replace('function showYakumono(){', 'function showYakumono(){window.propDrops=(window.propDrops||0)+1;return;').replace('function showSlash(){', 'function showSlash(){return;');")
s=s.replace('bonus:()=>jackpotSequence(token)', 'drops:()=>sandboxNeverUsed, bonus:()=>jackpotSequence(token)') if False else s
s=s.replace('cue:reelRecovery,','drops:()=>window.propDrops||0, cue:h=>reelRecovery(h,0,4),')
s+='''
(async()=>{
 for(const hit of [false,true]){
  const e=load('assets/js/game.js');let done=false;let error;
  e.test.cue({hit,number:9,displayed:[9,9,2]}).then(v=>done=v).catch(x=>error=x);
  for(let i=0;i<100&&!done&&!error;i++){const p=e.pending.shift();if(p)p.fn();await Promise.resolve();await Promise.resolve();}
  if(error)throw error;assert(done);assert.equal(e.test.drops(),hit?1:0);
  console.log('PASS recovery',hit?'success: one drop':'failure: no drop');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
'''
Path('work/recovery81.cjs').write_text(s,encoding='utf-8')
