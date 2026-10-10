'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,character,enable,rng}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
function party(){
 const s=ready(['mitsuru','jewel','max','vishunal','richter']);
 for(const id of E.formationIds(s))s.levels[id]=11;
 enable(s,'max','plot-armor','handout');
 for(const id of E.formationIds(s))s.health[id].hp=E.maxHP(s,character(id));
 return s;
}
test('fractional expected AP from Plot Armor does not become a fractional action cost',()=>{
 const s=party();const values=E.formationIds(s).map(id=>E.actionPower(s,character(id),character(id).action,true));
 assert.ok(values.some(v=>!Number.isInteger(v)));assert.equal(E.actionThreshold(s),49);
 const random=rng(104);
 for(let i=0;i<300;i++){
   E.advance(s,.1,random);
   assert.ok(Object.values(s.actionPoints).every(Number.isInteger));
   assert.ok(s.enemies.every(e=>Number.isInteger(e.actionPoints)));
   assert.doesNotThrow(()=>S.encode(s));
 }
});
test('previous fractional ally/enemy AP is floored on save and load without changing progress or the source state',()=>{
 const s=party();s.actionPoints.mitsuru=21+2/3;s.enemies[0].actionPoints=13.75;
 E.setFormation(s,'mohicans',['jewel']);E.battleContext(s,'mohicans');
 // Round-trip both the visible battle and a stored battle with fractional AP.
 const ctx=E.battleContext(s,'mohicans');E.ensureEnemies(ctx);ctx.enemies[0].actionPoints=7.5;s.sessionStates.mohicans=E.battleSnapshot(ctx);
 const before=structuredClone(s),saved=S.decode(S.encode(s));
 assert.equal(saved.actionPoints.mitsuru,21);assert.equal(saved.enemies[0].actionPoints,13);
 assert.equal(saved.sessionStates.mohicans.enemies[0].actionPoints,7);
 assert.equal(saved.factors,s.factors);assert.deepEqual(saved.levels,s.levels);assert.deepEqual(s,before);
 for(const bad of [-.5,Infinity,NaN]){s.actionPoints.mitsuru=bad;assert.throws(()=>S.encode(s));}
});
test('autosave keeps progressing across multiple intervals with AP dice perks and reload restores it',()=>{
 const h=harness(party());const first=h.saved();h.advance(10100);const second=h.saved();
 assert.ok(second.savedAt>first.savedAt);assert.match(h.get('save-status').textContent,/保存済み/);
 h.advance(10100);const third=h.saved();assert.ok(third.savedAt>second.savedAt);
 const reloaded=harness(third).saved();assert.equal(reloaded.factors,third.factors);assert.deepEqual(reloaded.levels,third.levels);
});
test('save failure includes its cause and never replaces a healthy primary save',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const s=party();assert.ok(S.persist(storage,s).ok);const old=data.get(S.KEY);s.health.mitsuru.hp=Infinity;
 const failed=S.persist(storage,s);assert.equal(failed.ok,false);assert.match(failed.error,/原因：.*味方HP/);assert.equal(data.get(S.KEY),old);
});
test('a successful retry clears the stale save error notice',()=>{
 let fail=false;
 const h=harness(party(),undefined,{beforeStorageWrite(key){if(fail&&key===S.KEY)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});}});
 fail=true;h.advance(10100);assert.match(h.get('notice').textContent,/保存容量/);
 fail=false;h.advance(10100);assert.equal(h.get('notice').textContent,'自動保存が復旧しました。');assert.match(h.get('save-status').textContent,/保存済み/);
});
test('live recovery repairs the next saved copy without touching the running battle',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const s=party();s.actionPoints.mitsuru=12.75;s.enemies[0].actionPoints=8.5;const before=structuredClone(s),data=new Map();
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const legacy={...S,persist(store,value){if(Object.values(value.actionPoints).some(v=>!Number.isInteger(v))||value.enemies.some(e=>!Number.isInteger(e.actionPoints)))return {ok:false};return S.persist(store,value);}};
 const context={window:{YggSave:legacy},structuredClone,console:{info(){},error(){}},document:{getElementById:()=>null}};
 assert.equal(legacy.persist(storage,s).ok,false);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../tools/recover-live-ap.js'),'utf8'),context);
 assert.equal(data.size,0);assert.equal(legacy.persist(storage,s).ok,true);
 const restored=S.load(storage).state;assert.equal(restored.actionPoints.mitsuru,12);assert.equal(restored.enemies[0].actionPoints,8);
 assert.deepEqual(s,before);assert.equal(restored.factors,s.factors);
});
