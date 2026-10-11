const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),E=require('../js/engine'),UI=require('../js/display'),{harness}=require('./app-harness.cjs');
const click=(h,selector,dataset)=>h.get('character-list').listeners.get('click')({target:{closest:s=>s===selector?{disabled:false,dataset}:null}});
function ready(){const s=E.createState();s.levels.meta=10;s.factors=1e8;s.paused=true;E.refreshPerkUnlocks(s);return s;}
test('perk edits survive draft repricing and commit together; closing restores both',()=>{
 const s=ready(),p=D.characters.find(c=>c.id==='meta').perks.find(p=>p.name==='アタックプラス'),h=harness(s);
 click(h,'[data-ability]',{ability:'meta'});click(h,'[data-perk]',{perkCharacter:'meta',perk:p.id});
 click(h,'[data-trade]',{trade:'buy',kind:'power',id:'meta'});
 assert.equal(h.get('perk-meta-'+p.id).querySelector('[data-perk]').getAttribute('aria-pressed'),'true');
 h.visible(false);assert.equal(h.saved().perkEnabled.meta[p.id],false);h.visible(true);
 click(h,'[data-ability-close]',{abilityClose:'meta'});assert.equal(h.saved().levels.meta,10);assert.equal(h.saved().perkEnabled.meta[p.id],false);assert.equal(h.saved().factors,s.factors);
 click(h,'[data-ability]',{ability:'meta'});click(h,'[data-perk]',{perkCharacter:'meta',perk:p.id});click(h,'[data-trade]',{trade:'buy',kind:'level',id:'meta'});
 click(h,'[data-ability-confirm]',{abilityConfirm:'meta'});assert.equal(h.saved().perkEnabled.meta[p.id],true);assert.equal(h.saved().levels.meta,20);assert.ok(h.saved().factors<s.factors);
});
test('picker and battle labels reflect current HP and runaway, including downed units',()=>{
 const s=ready();E.setFormation(s,s.sessionId,['meta']);s.health.meta.hp=-3;s.health.meta.status='dying';s.runaway.meta.runawayRate=108.75;
 const h=harness(s);h.openAbility('meta');assert.equal(h.get('picker-hp-meta').textContent,'HP -3 / 23');assert.equal(h.get('picker-runaway-meta').textContent,'暴走 108%');assert.equal(h.get('ally-runaway-meta').textContent,'暴走率 108%');assert.equal(h.get('ally-runaway-meta').hidden,false);assert.equal(h.get('ally-runaway-meta').classList.contains('critical'),true);assert.equal(h.get('ally-runaway-max').hidden,true);
 const c=D.characters.find(c=>c.id==='meta');assert.equal(h.get('ability-value-action-meta').textContent,UI.fullNumber(E.actionPower(s,c,c.action,true)));
});
test('cloud targeting and CSS positions put boss behind both minions',()=>{
 const s=ready();E.setFormation(s,'ozmorn',['meta']);E.selectSession(s,'ozmorn');const h=harness(s),style=h.get('arena').style;h.openAbility('meta');
 const points=UI.cloudFormation(parseFloat(style.getPropertyValue('--enemy-x')),parseFloat(style.getPropertyValue('--enemy-y')));
 assert.ok(points[0].x>points[1].x);assert.ok(points[0].x>points[2].x);
 for(let i=0;i<3;i++){assert.equal(style.getPropertyValue('--cloud-'+i+'-x'),points[i].x+'px');assert.equal(style.getPropertyValue('--cloud-'+i+'-y'),points[i].y+'px');}
});
