from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8')
s=s.replace('function clearReelCutins(){', '''let recoveryInput=null;
function waitRecoveryInput(){
 return new Promise(resolve=>{
  const prompt=document.createElement('button');prompt.className='recovery-input';prompt.textContent='SPACE を押せ！';
  prompt.type='button';$('lcd').append(prompt);
  let timer;
  const finish=()=>{clearTimeout(timer);prompt.remove();recoveryInput=null;resolve()};
  recoveryInput=finish;prompt.addEventListener('click',finish);timer=setTimeout(finish,3000);
 });
}
window.addEventListener('keydown',e=>{
 if(e.code==='Space'&&recoveryInput){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)recoveryInput();}
},true);
function clearReelCutins(){
 if(recoveryInput)recoveryInput();
 $('reel2').classList.remove('recovery-target','recovery-impact');''')
s=s.replace("if(!await wait(600))return false;\n showSlash();h.slashPlayed=true;", "$('reel2').classList.add('recovery-target');\n await waitRecoveryInput();if(id!==token)return false;\n $('reel2').classList.add('recovery-impact');showSlash();h.slashPlayed=true;")
s=s.replace("await pause(100);if(id!==token)return false;\n if(h.hit)setReel(2,h.number);", "await pause(320);if(id!==token)return false;\n if(h.hit){setReel(2,h.number);$('lcd').classList.add('recovery-success');sound('win');}\n $('reel2').classList.remove('recovery-target','recovery-impact');")
s=s.replace("classList.remove('jackpot-running');", "classList.remove('jackpot-running','recovery-success');")
s=s.replace("classList.add('jackpot-lit');sound('win');", "classList.add('jackpot-lit');if(!$('lcd').classList.contains('recovery-success'))sound('win');")
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.68','v0.69').replace('?v=68','?v=69');p.write_text(s,encoding='utf-8')
