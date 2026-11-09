from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8').replace("classList.remove('jackpot-running','recovery-success')","classList.remove('jackpot-running','jackpot-reveal','recovery-success')")
s=s.replace("await pause(3100);if(id!==token)return false;", "await pause(3100);if(id!==token)return false;\n $('lcd').classList.add('jackpot-reveal');sound('stop2');\n await pause(4200);if(id!==token)return false;")
p.write_text(s,encoding='utf-8')
p=Path('assets/js/audio.js');s=p.read_text(encoding='utf-8').replace('button-arrival-v95.wav','button-arrival-v96.wav');p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.95','v0.96').replace('?v=95','?v=96');p.write_text(s,encoding='utf-8')
