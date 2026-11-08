from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8');a=s.index(' for(let i=0;i<7;i++){const art=',s.index('function showYakumono'));b=s.index(" $('lcd').append(prop);",a)
s=s[:a]+" const art=document.createElement('canvas');art.className='yakumono-art';prop.append(art);\n"+s[b:];p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.79','v0.80').replace('?v=79','?v=80');s=s.replace('<script src="assets/js/monitor.js', '<script src="assets/js/yakumono.js?v=80" defer></script>\n<script src="assets/js/monitor.js');p.write_text(s,encoding='utf-8')
