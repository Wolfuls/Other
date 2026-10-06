const combatFixture=require('./combat-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../js/maintenance.js'),E=require('../js/engine.js'),S=require('../js/save.js'),{harness}=require('./app-harness.cjs');
test('data deletion removes only this game and all three of its backup slots',()=>{
 const values=new Map(M.SAVE_KEYS.map(key=>[key,'progress']));values.set('another-game','safe');const storage={getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem:(k,v)=>values.set(k,v)};
 assert.deepEqual(M.erase(storage),{ok:true});assert.deepEqual([...values],[['another-game','safe']]);assert.equal(M.erase(null).ok,false);
});
test('failed deletion restores removed keys and does not falsely claim completion',()=>{
 const values=new Map(M.SAVE_KEYS.map(key=>[key,key])),before=[...values];let count=0;
 const storage={getItem:k=>values.get(k)??null,removeItem:k=>{if(++count===2)throw Error('denied');values.delete(k);},setItem:(k,v)=>values.set(k,v)};
 assert.equal(M.erase(storage).ok,false);for(const[k,v]of before)assert.equal(values.get(k),v);
});
test('cache refresh is scoped to this directory, fetches with reload, and limits parallel requests',async()=>{
 const urls=M.assetUrls({image:'./img/a.png',bad:'./img/../../other/a.png',nested:{img:'./img/b.png'}},['./index.html','./js/app.js','https://other.test/x.js'],'https://example.test/games/ygg/index.html');
 assert.deepEqual(urls,['https://example.test/games/ygg/index.html','https://example.test/games/ygg/js/app.js','https://example.test/games/ygg/img/a.png','https://example.test/games/ygg/img/b.png']);
 let running=0,peak=0,requests=0;const result=await M.refresh([...urls,...urls],async(url,options)=>{assert.equal(options.cache,'reload');requests++;peak=Math.max(peak,++running);await Promise.resolve();running--;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};});
 assert.equal(result.ok,true);assert.equal(requests,4);assert.ok(peak<=4);assert.equal((await M.refresh(urls,async()=>({ok:false}))).ok,false);
});
test('delete UI defaults to cancel, cancellation preserves save, and confirmation cannot resurrect old backups',()=>{
 const s=combatFixture(1000);s.paused=true;s.factors=1234;s.levels.meta=5;const h=harness(s);h.click('option-delete');assert.equal(h.document.activeElement.id,'delete-cancel');h.click('delete-cancel');assert.deepEqual(h.saved(),s);
 const imported={...s,factors:6789};h.get('save-text').value=S.encode(imported);h.click('preview-import');h.click('confirm-import');
 h.click('option-delete');h.click('delete-confirm');assert.equal(h.get('factors').textContent,'0');assert.equal(h.get('save-text').value,'');h.advance(10001);const clean=h.saved();assert.equal(clean.factors,0);assert.equal(clean.levels.meta,0);h.click('restore-import');assert.match(h.get('save-message').textContent,/まだありません/);
});
