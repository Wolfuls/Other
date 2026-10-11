const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,D,ready,character}=require('./current-fixtures.cjs');
const UI=require('../js/display'),A=require('../js/ability-view'),{harness}=require('./app-harness.cjs');

test('strength labels equal character level without CP and leave HP/action as actual values',()=>{
 for(const level of [1,201]){
  const s=ready(['meta']);s.levels.meta=level;s.paused=true;const c=character('meta'),before=E.attackProfile(s,c),h=harness(s);h.openAbility('meta');
  for(const stat of ['power','accuracy','evasion','vitality','armor'])assert.equal(h.get('ability-value-'+stat+'-meta').textContent,String(level));
  assert.equal(h.get('ability-value-action-meta').textContent,UI.fullNumber(E.actionPower(s,c,c.action,true)));
  assert.equal(h.get('ability-maxhp-meta').textContent,'最大HP '+UI.fullNumber(E.maxHP(s,c)));assert.deepEqual(E.attackProfile(s,c),before);
 }
});

test('each strength label includes its own CP multiplier, uses shared display units and caps safely',()=>{
 const s=ready(['meta']);s.levels.meta=201;s.paused=true;assert.equal(E.setConcentration(s,'meta',{action:0,power:20,accuracy:8,evasion:0,vitality:12,armor:0}),true);
 const c=character('meta'),hp=E.maxHP(s,c),h=harness(s),cp=E.concentration(s,'meta');h.openAbility('meta');
 for(const stat of ['power','accuracy','evasion','vitality','armor']){
  const multiplier=Math.exp(E.T.focusLog(cp[stat],200));if(cp[stat]>0)assert.ok(multiplier>1);assert.equal(h.get('ability-value-'+stat+'-meta').textContent,UI.incomeNumber(1+(E.strengthValue(s,c,stat)/100-1)/.02));
 }
 assert.equal(h.get('ability-maxhp-meta').textContent,'最大HP '+hp);assert.equal(A.strengthLevel(500,D.strength),201);assert.equal(A.strengthLevel(0,D.strength),0);assert.equal(A.strengthLevel(1e100,D.strength),5e99);
});

test('quest strength comparison and enemy abilities display equivalent ally levels without changing actual HP',()=>{
 const s=ready(['meta'],'mohican-solo');s.paused=true;s.questLevels['mohican-solo']=101;E.setQuestLevel(s,'mohican-solo',101);const h=harness(s);
 h.closeAbility();h.click('tab-quests');const q=E.getSession(s),next=E.sessionAtLevel(D.sessions.find(q=>q.id==='mohican-solo'),102),value=UI.incomeNumber(A.strengthLevel(E.enemyStrength(q),D.strength)),expected=value;
 assert.equal(h.get('quest-strength-mohican-solo').textContent,expected);assert.equal(h.get('quest-hp-strength-mohican-solo').textContent,UI.incomeNumber(A.strengthLevel(q.hpStrength,D.strength)));
 const button={disabled:false,dataset:{enemyInfo:'mohican-solo'}};
 h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-enemy-info]'?button:null}});
 const html=h.get('enemy-info-content').innerHTML;assert.equal(html.split('<strong>'+value+'</strong>').length-1,1);
 assert.ok(html.includes('最大HP '+UI.fullNumber(E.getSession(s).hp)));assert.ok(E.enemyStrength(E.getSession(s))>101);
});

test('common scale maps identical internal strengths equally and follows changed enemy curves',()=>{
 assert.equal(A.strengthLevel(100,D.strength),1);assert.equal(A.strengthLevel(300,D.strength),101);assert.equal(A.strengthLevel(600,D.strength),251);
 const old=D.questGrowth.enemyCurve;try{D.questGrowth.enemyCurve={initial:1.03,terminal:1.02,transition:50};const q=E.sessionAtLevel(D.sessions[0],101);assert.equal(A.strengthLevel(q.strength,D.strength),1+(q.strength/100-1)/.02);assert.notEqual(A.strengthLevel(q.strength,D.strength),350.26128228188635);}finally{D.questGrowth.enemyCurve=old;}
});
