const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,character}=require('./current-fixtures.cjs');
const {harness}=require('./app-harness.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const click=(h,selector,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s===selector?{disabled:false,dataset}:null}});

test('pressure breakdown accounts for training, enabled perks, temporary pressure, recovery and factor stabilization',()=>{
 const s=ready(['max']),original=character('max'),c={...original,perks:original.perks.map(p=>({...p,runawayPressure:p.initial?.03:0}))};
 s.actionLevels.max=31;s.runaway.max.runawayRate=70;s.runaway.max.temporaryRunawayPressure=.015;s.upgrades.stabilization=15;
 const b=E.runawayPressureBreakdown(s,c);
 assert.equal(b.trainingTotal,31);near(b.training,.05);near(b.perkPressure,.03);near(b.source,.1);near(b.recoveryMultiplier,.7);near(b.generated,.07);near(b.calming,.025);near(b.net,.045);near(E.runawayPressure(s,c),.045);
 assert.deepEqual(b.calmingEntries.map(x=>[x.id,x.level]),[['stabilization',15]]);
 const gm=b.perkEntries.find(p=>p.id===original.perks.find(p=>p.initial).id);assert.equal(gm.enabled,true);assert.equal(gm.eligible,true);
});

test('OFF and level-ineligible perks keep inspectable values but add no pressure',()=>{
 const s=ready(['meta']),c={...character('meta'),perks:character('meta').perks.map(p=>({...p,runawayPressure:.02}))},p=c.perks.find(p=>!p.initial&&p.level===10);
 s.levels.meta=10;E.refreshPerkUnlocks(s);E.togglePerk(s,'meta',p.id,true);near(E.runawayPressureBreakdown(s,c).perkPressure,.02);
 E.togglePerk(s,'meta',p.id,false);let entry=E.runawayPressureBreakdown(s,c).perkEntries.find(x=>x.id===p.id);assert.equal(entry.configured,.02);assert.equal(entry.enabled,false);assert.equal(entry.pressure,0);
 E.togglePerk(s,'meta',p.id,true);s.levels.meta=1;entry=E.runawayPressureBreakdown(s,c).perkEntries.find(x=>x.id===p.id);assert.equal(entry.enabled,true);assert.equal(entry.eligible,false);assert.equal(entry.pressure,0);
});

test('all six actual training tracks contribute and an ally in another session still generates pressure',()=>{
 const s=ready(['meta','max']);s.levels.meta=11;s.actionLevels.meta=7;s.vitalityLevels.meta=3;s.armorLevels.meta=4;s.accuracyLevels.meta=5;s.evasionLevels.meta=6;
 const c=character('meta'),b=E.runawayPressureBreakdown(s,c);assert.equal(b.trainingTotal,35);near(b.training,.01*Math.log2(36));near(b.training,E.trainingRunawayPressure(s,c));
 E.setFormation(s,'mohicans',['meta']);assert.equal(E.runawayPressureBreakdown(s,c).active,true);near(E.runawayPressure(s,c),b.net);
});

test('benched, incapacitated and collapsed allies apply calming only without hiding their sources',()=>{
 for(const reason of ['undeployed','down','collapsed']){
  const s=ready(['max']);s.actionLevels.max=31;s.runaway.max.runawayRate=70;s.runaway.max.temporaryRunawayPressure=.015;s.upgrades.stabilization=15;
  if(reason==='undeployed')E.setFormation(s,s.sessionId,[]);if(reason==='down')s.health.max.status='unconscious';if(reason==='collapsed')s.runaway.max.runawayCollapsed=true;
  const b=E.runawayPressureBreakdown(s,character('max'));assert.equal(b.inactiveReason,reason);assert.equal(b.active,false);assert.equal(b.generated,0);near(b.net,-.025);near(b.source,.07);
 }
});

test('the shown pressure is the runtime increment; critical reserve absorbs the same positive pressure',()=>{
 const s=ready(['max']);s.actionLevels.max=31;s.runaway.max.runawayRate=70;s.upgrades.stabilization=15;
 const c=character('max'),b=E.runawayPressureBreakdown(s,c);s.runaway.max.criticalReserve=.005;
 E.advance(s,1,()=>.5);near(s.runaway.max.runawayRate,70+b.net-.005);assert.equal(s.runaway.max.criticalReserve,0);
});

test('ability pressure reflects draft levels and perk switches, cancels cleanly and commits together',()=>{
 const c=character('meta'),p=c.perks.find(p=>p.level===10),old=p.runawayPressure;p.runawayPressure=.02;
 try{
  const s=ready(['meta']);s.levels.meta=10;s.paused=true;s.upgrades.stabilization=15;E.refreshPerkUnlocks(s);
  const h=harness(s),original=h.get('pressure-summary-meta').textContent;
  click(h,'[data-ability]',{ability:'meta'});click(h,'[data-perk]',{perkCharacter:'meta',perk:p.id});
  const withPerk=h.get('pressure-summary-meta').textContent;assert.notEqual(withPerk,original);
  click(h,'[data-trade]',{trade:'buy',kind:'action',id:'meta'});assert.notEqual(h.get('pressure-summary-meta').textContent,withPerk);
  const html=h.get('pressure-content-meta').innerHTML;assert.match(html,/log₂/);assert.match(html,/因子安定化/);assert.match(html,/0.1 × Lv.15 ＝ 1.5/);assert.doesNotMatch(html,/鎮静調律/);assert.match(html,/パーク合計/);
  click(h,'[data-ability-close]',{abilityClose:'meta'});assert.equal(h.get('pressure-summary-meta').textContent,original);assert.equal(h.saved().actionLevels.meta,0);
  click(h,'[data-ability]',{ability:'meta'});click(h,'[data-perk]',{perkCharacter:'meta',perk:p.id});click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});
  assert.equal(h.get('pressure-summary-meta').textContent,withPerk);assert.equal(h.saved().perkEnabled.meta[p.id],true);
 }finally{p.runawayPressure=old;}
});
