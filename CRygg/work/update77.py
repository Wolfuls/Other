from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8')
pos=s.index('let recoveryInput=null;')
s=s[:pos]+'''function showYakumono(){
 if($('lcd').querySelector('.yakumono-front'))return;
 const prop=document.createElement('div');prop.className='yakumono-front';prop.setAttribute('aria-hidden','true');
 const art=document.createElement('img');art.src='assets/images/effects/jackpot-yakumono-v76.png';art.alt='';prop.append(art);$('lcd').append(prop);
}
function clearYakumono(){ $('lcd').querySelectorAll('.yakumono-front').forEach(el=>el.remove()); }
function startRainbow(){
 $('lcd').style.setProperty('--rainbow-phase',(-performance.now()/1000)+'s');
 $('lcd').classList.add('rainbow-active');
}
'''+s[pos:]
s=s.replace("$('lcd').classList.add('recovery-quake');", "showYakumono();$('lcd').classList.add('recovery-quake');")
s=s.replace("$('lcd').classList.add('recovery-success');sound", "$('lcd').classList.add('recovery-success');startRainbow();sound")
s=s.replace("clearReelCutins();return true;", "clearReelCutins();if(!h.hit)clearYakumono();return true;")
s=s.replace("function clearJackpot(){", "function clearJackpot(){ clearYakumono();$('lcd').classList.remove('rainbow-active','yakumono-leaving');")
s=s.replace(" const prop=document.createElement('img');prop.className='jackpot-yakumono';prop.src='assets/images/effects/jackpot-yakumono-v76.png';prop.alt='';scene.append(prop);",'')
s=s.replace("scene.className='jackpot-scene burst';", "showYakumono();if(!$('lcd').classList.contains('rainbow-active'))startRainbow();scene.className='jackpot-scene burst';")
s=s.replace("scene.className='jackpot-scene crown leaving';", "$('lcd').classList.add('yakumono-leaving');scene.className='jackpot-scene crown leaving';")
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.76','v0.77').replace('game.js?v=76','game.js?v=77').replace('style.css?v=72','style.css?v=77');p.write_text(s,encoding='utf-8')
