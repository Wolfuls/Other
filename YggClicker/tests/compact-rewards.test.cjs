'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../js/engine.js'),D=require('../js/data.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');
const active=h=>h.get('reward-rain').children.filter(n=>!n.hidden);

test('manual clears trigger fast dice at impact even with no party income; ordinary hits do not',()=>{
 const s=E.createState(1000);s.hp=10;const h=harness(s);const pool=[...h.get('reward-rain').children];
 assert.equal(pool.length,48);h.click('attack');h.advance(560);assert.equal(active(h).length,0);
 h.click('attack');h.advance(559);assert.equal(active(h).length,0);h.advance(1);assert.equal(active(h).length,3);
 assert.ok(h.get('factor-rain').children.every(n=>n.hidden),'slow income rain is independent');
 for(const die of active(h))assert.ok(parseInt(die.style.getPropertyValue('--reward-duration'))<=900);
 h.advance(1200);assert.equal(active(h).length,0);assert.deepEqual(h.get('reward-rain').children,pool);
});

test('high-rate overflow uses a bounded reward pool, never interrupts active falls, and resets on pause/hidden/reduced motion',()=>{
 const s=E.createState(1000);s.levels.richter=50;s.actionLevels.richter=1000000;s.purchasedPerks.richter=['bom-ber'];s.sessionId='mohicans';s.hp=10;
 const h=harness(s),pool=[...h.get('reward-rain').children];h.advance(1900);assert.ok(active(h).length>0);
 const die=active(h)[0],impact=die.dataset.impactId;h.advance(50);assert.equal(die.dataset.impactId,impact);
 h.advance(2200);assert.ok(active(h).length<=48);assert.deepEqual(h.get('reward-rain').children,pool);
 h.click('pause');assert.equal(active(h).length,0);h.advance(1500);assert.equal(active(h).length,0);
 h.click('pause');h.advance(2200);assert.ok(active(h).length>0);h.visible(false);assert.equal(active(h).length,0);
 h.advance(2000);h.visible(true);h.media.matches=true;h.media.change();h.advance(2200);assert.equal(active(h).length,0);
});

test('compact cards show current independent levels and absolute values and purchases still update prices and formulas',()=>{
 const s=E.createState(1000);s.paused=true;s.factors=100000;s.levels.meta=20;s.actionLevels.meta=10;s.purchasedPerks.meta=['attack-plus'];
 const h=harness(s),html=h.get('character-list').innerHTML;
 assert.doesNotMatch(html,/action-charge|damage-growth|selection-label|damage-breakdown|meta-growth/);
 assert.ok(html.indexOf('perk-list')<html.indexOf('current-attack'));
 assert.equal(h.get('hire-label-meta').textContent,'攻撃力を強化（Lv.20）');assert.equal(h.get('damage-bonus-meta').textContent,'31.42');
 assert.equal(h.get('action-label-meta').textContent,'行動力＋5（Lv.10）');assert.equal(h.get('action-bonus-meta').textContent,'100');
 assert.match(h.get('stats-meta').textContent,/2D6 \+ 4.*×2\.9/);
 const buy=dataset=>h.get('character-list').listeners.get('click')({target:{closest:selector=>selector==='[data-hire], [data-action]'?{dataset,disabled:false}:null}});
 buy({hire:'meta'});assert.equal(h.get('hire-label-meta').textContent,'攻撃力を強化（Lv.21）');assert.equal(h.get('damage-bonus-meta').textContent,'33');
 const formula=h.get('stats-meta').textContent;buy({action:'meta'});assert.equal(h.get('action-bonus-meta').textContent,'105');assert.equal(h.get('stats-meta').textContent,formula);
 assert.equal(h.saved().levels.meta,21);assert.equal(h.saved().actionLevels.meta,11);
});

test('every runtime image reference exists and archived images are no longer referenced',()=>{
 const root=path.join(__dirname,'..'),codeFiles=['index.html','style.css','meta.css','party.css',...fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')).map(f=>'js/'+f)];
 const refs=new Set(codeFiles.filter(f=>fs.existsSync(path.join(root,f))).flatMap(f=>[...fs.readFileSync(path.join(root,f),'utf8').matchAll(/(?:\.\/)?img\/([\w/-]+\.png)/g)].map(m=>m[1])));
 assert.ok(refs.size>=30);for(const ref of refs){assert.ok(!ref.startsWith('old/'));assert.ok(fs.existsSync(path.join(root,'img',ref)),ref);}
 const archived=fs.readdirSync(path.join(root,'img/old')).filter(f=>f.endsWith('.png'));assert.ok(archived.length>0);
 for(const name of archived){assert.ok(!refs.has(name));assert.ok(!fs.existsSync(path.join(root,'img',name)));}
 for(const s of D.sessions)for(const v of s.variants||[])assert.ok(v.sheet&&v.defeatSheet);
});
