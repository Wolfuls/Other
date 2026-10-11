const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('landed rock remains for one second; cancellation removes it immediately',()=>{
 let delay,done;const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/duo-view.js'),'utf8'),{window,matchMedia:()=>({matches:false}),setTimeout:(fn,ms)=>{done=fn;delay=ms;}});
 let removed=0,fade=false;const rock={dataset:{duoEffect:'boulder'},classList:{add:()=>fade=true},remove:()=>removed++};
 window.YggDuoView.finish(rock);assert.equal(removed,0);assert.equal(fade,true);assert.equal(delay,1000);done();assert.equal(removed,1);
 window.YggDuoView.finish(rock,true);assert.equal(removed,2);
});
test('locked quest names and accessibility labels reveal only after unlock',()=>{
 const {harness}=require('./app-harness.cjs'),E=require('../js/engine.js');const s=E.createState();const h=harness(s);h.click('tab-quests');
 assert.equal(h.get('quest-name-egg-or-chicken').textContent,'？？？');assert.equal(h.get('quest-card-egg-or-chicken').getAttribute('aria-label'),'？？？');
 const unlocked=E.createState();unlocked.factors=10000000;E.refreshQuestUnlocks(unlocked);const shown=harness(unlocked);shown.click('tab-quests');assert.equal(shown.get('quest-name-egg-or-chicken').textContent,'卵が先か鶏が先か');
});
