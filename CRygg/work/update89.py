from pathlib import Path
p=Path('assets/js/yakumono.js');s=p.read_text(encoding='utf-8')
s=s.replace(" const colors=['#ff235a','#ffd93e','#3cff8e','#29d6ff','#984fff','#ff235a'];", " const rainbowSpec={colors:['#ff235a','#ffd93e','#3cff8e','#29d6ff','#984fff','#ff235a'],angle:35,period:1000};\n const colors=rainbowSpec.colors;\n document.documentElement.style.setProperty('--monitor-rainbow',`conic-gradient(from ${rainbowSpec.angle}deg at 50% 50%,${colors.join(',')})`);\n const reduced=matchMedia('(prefers-reduced-motion: reduce)');")
s=s.replace(' function frame(){', " function frame(now=0){\n  // One clock for both monitors and every foreground object, regardless of mount time.\n  document.documentElement.style.setProperty('--monitor-rainbow-hue',((reduced.matches?0:now%rainbowSpec.period/rainbowSpec.period*360))+'deg');")
s=s.replace('(35-90)*Math.PI/180','(rainbowSpec.angle-90)*Math.PI/180');p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.88','v0.89').replace('?v=88','?v=89');p.write_text(s,encoding='utf-8')
