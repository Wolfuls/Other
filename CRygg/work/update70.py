from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8')
s=s.replace("prompt.textContent='SPACE を押せ！';", "prompt.setAttribute('aria-label','ボタンを押せ！ Enter');const art=document.createElement('img');art.src='assets/images/ui/recovery-button-v70.png';art.alt='ボタンを押せ！ ENTER';prompt.append(art);")
s=s.replace("e.code==='Space'&&recoveryInput", "e.code==='Enter'&&recoveryInput")
s=s.replace("showReelCutin(1);sound('stop1');\n $('reel2')", "showReelCutin(1);sound('stop1');\n if(!await wait(800))return false;\n $('reel2')")
s=s.replace("$('reel2').classList.add('recovery-impact');showSlash();", "$('lcd').classList.add('recovery-quake');$('reel2').classList.add('recovery-impact');showSlash();")
s=s.replace("function clearReelCutins(){\n", "function clearReelCutins(){\n $('lcd').classList.remove('recovery-quake');\n")
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.69','v0.70').replace('?v=69','?v=70');p.write_text(s,encoding='utf-8')
