from pathlib import Path
s=Path('work/events77.cjs').read_text(encoding='utf-8');s=s[:s.index('(async()=>{const file=')];s+="for(const p of [45,55,65])console.log(JSON.stringify(run(process.argv[2],p,'normal',500)));";Path('work/physics92.cjs').write_text(s,encoding='utf-8')
