const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../js/engine'),D=require('../js/data'),R=require('../js/recovery'),{ready}=require('./current-fixtures.cjs');
test('yielded offline continuation preserves every random draw and fractional timer',async()=>{
 const original=ready(['meta','megumin'],'mohicans');original.levels.meta=260;original.levels.megumin=260;original.actionClock=.37;original.health.megumin.stunTurns=5;original.runaway.meta.runawayRate=69.99;original.runaway.meta.baseRunawayPressure=.2;E.ensureEnemies(original);original.enemies[0].pendingAttack={targetId:'meta',remaining:.123};
 const a=structuredClone(original),b=structuredClone(original);let na=0,nb=0;const ra=R.seeded(42),rb=R.seeded(42);E.advance(a,600.7,()=>{na++;return ra();},false,true);let yields=0;await R.runLocal(E,b,600.7,{random:()=>{nb++;return rb();},budget:0,schedule:fn=>{yields++;setImmediate(fn);}});assert.ok(yields>500);assert.equal(na,nb);assert.deepEqual(b,a);
});
test('fallback works on a private clone and honors the same maximum duration',async()=>{
 const s=ready([]),before=structuredClone(s);s.paused=true;const result=await R.run(E,s,D.maxOfflineSeconds*2,{seed:12});assert.deepEqual(s,{...before,paused:true});assert.deepEqual(result,s);
});
test('DPS cache matches uncached character totals through wounds, party, Q, perks and funds changes',()=>{
 const s=ready(['meta','jewel'],'mohicans');s.levels.meta=260;s.levels.jewel=260;
 for(const mutate of [()=>{},()=>s.factors=1e15,()=>s.health.meta.status='unconscious',()=>s.levels.jewel++,()=>s.upgrades.reward++,()=>s.concentration.jewel.power=1,()=>E.setQuestLevel(s,'mohicans',1)]){mutate();const expected=D.sessions.reduce((n,q)=>{const c=E.battleContext(s,q.id);return n+D.characters.reduce((v,ch)=>v+E.characterDps(c,ch),0);},0);assert.equal(E.totalDps(s),expected);assert.equal(E.totalDps(s),expected);}
});
test('wallet-dependent Jewel forecast invalidates even within the same current armor step',()=>{
 const s=ready(['jewel']);s.levels.jewel=1000;E.refreshPerkUnlocks(s);const c=D.characters.find(c=>c.id==='jewel'),p=c.perks.find(p=>p.investmentArmor);E.togglePerk(s,'jewel',p.id,true);s.factors=1.1e12;const a=E.combatKey(s);s.factors+=100;assert.notEqual(E.combatKey(s),a);
});
test('app recovery owns one job, blocks mutation and saving, then commits elapsed time once',async()=>{
 const {harness}=require('./app-harness.cjs');const s=ready(['meta']);s.levels.meta=260;let finish,jobs=0,expected;
 const h=harness(s,undefined,{recovery:{run(engine,state,seconds,{offline}){jobs++;assert.equal(seconds,10);assert.equal(offline,false);expected=structuredClone(state);engine.advance(expected,seconds,R.seeded(17),false,false);return new Promise(resolve=>finish=()=>resolve(expected));}}});
 const saved=h.saved();h.stall(10000);assert.equal(jobs,1);assert.equal(h.get('recovery-progress').open,true);h.click('attack');h.click('pause');h.click('save-now');h.visible(false);assert.deepEqual(h.saved(),saved);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.get('recovery-progress').open,false);assert.equal(jobs,1);const actual=h.saved();assert.equal(actual.kills,expected.kills);assert.equal(actual.factors,expected.factors);assert.equal(actual.savedAt,h.now);h.visible(true);assert.equal(jobs,1);assert.equal(h.saved().factors,actual.factors);
});
test('another writer during recovery prevents committing its stale result',async()=>{
 const {harness}=require('./app-harness.cjs'),S=require('../js/save');let finish;const h=harness(ready(['meta']),undefined,{recovery:{run(_engine,state){return new Promise(resolve=>finish=()=>resolve({...state,factors:123}));}}});const before=h.saved();h.stall(10000);h.storageEvent({key:S.KEY});finish();await new Promise(resolve=>setImmediate(resolve));h.click('save-now');assert.deepEqual(h.saved(),before);assert.equal(h.get('recovery-progress').open,false);
});
test('worker failure retries from untouched snapshot with the same seed',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),context={Worker:class{},structuredClone,setTimeout,clearTimeout,performance};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/recovery.js'),'utf8'),context);
 const s=ready(['meta']),expected=structuredClone(s),seed=19;E.advance(expected,60,R.seeded(seed),false,true);let terminated=false;
 const actual=await context.YggRecovery.run(E,s,60,{seed,workerFactory:()=>{const w={terminate(){terminated=true;},postMessage(){setImmediate(()=>w.onerror());}};setImmediate(()=>w.onmessage({data:{type:'ready'}}));return w;}});assert.ok(terminated);assert.deepEqual(actual,expected);assert.notEqual(s.actionClock,undefined);
});
