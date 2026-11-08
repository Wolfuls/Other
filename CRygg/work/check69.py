from pathlib import Path
p=Path('work/events68.cjs');s=p.read_text(encoding='utf-8').replace('classList:{add(){},remove(){},toggle(){}}','classList:{add(){},remove(){},toggle(){},contains(){return false}}');Path('work/events69.cjs').write_text(s,encoding='utf-8')
