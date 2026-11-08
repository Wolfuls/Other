from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8').replace("scene.className='jackpot-scene crown';", "scene.className='jackpot-scene crown';$('lcd').classList.add('yakumono-leaving');");p.write_text(s,encoding='utf-8')
p=Path('assets/js/monitor.js');s=p.read_text(encoding='utf-8').replace("const skip=name=>", "if(root){const phase=from.style.getPropertyValue('--rainbow-phase');if(phase)to.style.setProperty('--rainbow-phase',phase);else to.style.removeProperty('--rainbow-phase');}\n  const skip=name=>");p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.77','v0.78').replace('?v=77','?v=78').replace('assets/js/monitor.js"','assets/js/monitor.js?v=78"');p.write_text(s,encoding='utf-8')
