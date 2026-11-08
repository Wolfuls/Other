from pathlib import Path
old=Path('C:/Users/user/Documents/Codex/2026-11-07/new-chat-2/work')
s=(old/'events66.cjs').read_text(encoding='utf-8').replace('work/crygg-v66/assets/js/game.js','assets/js/game.js').replace('document:{getElementById:element,','document:{querySelector:element,getElementById:element,')
Path('work/events68.cjs').write_text(s,encoding='utf-8')
s=Path('assets/js/game.js').read_text(encoding='utf-8');end=s.rfind('})();');s=s[:end]+"window.testBonus=()=>jackpotSequence(token);window.testReset=()=>{window.confirm=()=>true;resetGame()};"+s[end:]
Path('work/game68-test.js').write_text(s,encoding='utf-8')
s=Path('index.html').read_text(encoding='utf-8').replace('<head>','<head><base href="../">').replace('assets/js/game.js?v=68','work/game68-test.js')
Path('work/test68.html').write_text(s,encoding='utf-8')
