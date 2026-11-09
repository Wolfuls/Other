from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8')
s=s.replace("const finish=()=>{clearTimeout(timer);prompt.remove();recoveryInput=null;resolve()};", "const finish=(cancel=false)=>{if(!recoveryInput)return;clearTimeout(timer);recoveryInput=null;if(cancel===true){prompt.remove();resolve();return;}sound('buttonPress');prompt.classList.add('pressed');setTimeout(()=>{prompt.remove();resolve()},130)};")
s=s.replace('if(recoveryInput)recoveryInput();','if(recoveryInput)recoveryInput(true);')
s=s.replace(" const tree=document.createElement('img');tree.className='jackpot-tree';tree.src='assets/images/effects/jackpot-tree-v66.png';tree.alt='';scene.append(tree);",'')
s=s.replace(" const title=document.createElement('div');title.className='jackpot-title';title.textContent='大当たり';scene.append(title);",'')
p.write_text(s,encoding='utf-8')
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace("buttonArrival:'button-arrival-v93.wav'","buttonArrival:'button-arrival-v95.wav',buttonPress:'button-press-v95.wav'");p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.94','v0.95').replace('?v=94','?v=95').replace('?v=93','?v=95');p.write_text(s,encoding='utf-8')
