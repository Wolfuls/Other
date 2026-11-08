from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8')
s=s.replace(" const art=document.createElement('img');art.src='assets/images/effects/jackpot-yakumono-v76.png';art.alt='';prop.append(art);$('lcd').append(prop);", " for(let i=0;i<7;i++){const art=document.createElement('img');art.src='assets/images/effects/jackpot-yakumono-v76.png';art.alt='';art.style.setProperty('--band',i);prop.append(art);}\n $('lcd').append(prop);\n const impactToken=token;setTimeout(()=>{if(impactToken!==token||!prop.isConnected)return;sound('yakumonoImpact');$('lcd').classList.add('yakumono-impact');setTimeout(()=>{if(impactToken===token)$('lcd').classList.remove('yakumono-impact')},550)},360);")
s=s.replace("function clearYakumono(){", "function clearYakumono(){ $('lcd').classList.remove('yakumono-impact');")
p.write_text(s,encoding='utf-8')
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace('const paths={',"const paths={yakumonoImpact:'yakumono-impact-v79.wav',");p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.78','v0.79').replace('?v=78','?v=79').replace('audio.js?v=72','audio.js?v=79');p.write_text(s,encoding='utf-8')
