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
 const s=ready(['meta']);s.levels.meta=201;s.paused=true;assert.equal(E.setConcentration(s,'meta',{power:20,accuracy:8,evasion:0,armor:12}),true);
 const c=character('meta'),hp=E.maxHP(s,c),h=harness(s),cp=E.concentration(s,'meta');h.openAbility('meta');
 for(const stat of ['power','accuracy','evasion','vitality','armor']){
  const multiplier=Math.exp(E.T.focusLog(cp[stat],200));if(cp[stat]>0)assert.ok(multiplier>1);assert.equal(h.get('ability-value-'+stat+'-meta').textContent,UI.strengthNumber(A.strengthLevel(E.strengthValue(s,c,stat),D.strength,stat)));
 }
 assert.equal(h.get('ability-maxhp-meta').textContent,'最大HP '+hp);assert.equal(A.strengthLevel(500,D.strength),201);assert.equal(A.strengthLevel(0,D.strength),0);assert.equal(A.strengthLevel(1e100,D.strength),5e99);
});

test('quest strength comparison and enemy abilities display equivalent ally levels without changing actual HP',()=>{
 const s=ready(['meta'],'mohican-solo');s.paused=true;s.questLevels['mohican-solo']=101;E.setQuestLevel(s,'mohican-solo',101);const h=harness(s);
 h.closeAbility();h.click('tab-quests');const q=E.getSession(s),next=E.sessionAtLevel(D.sessions.find(q=>q.id==='mohican-solo'),102),value=UI.fullNumber(Math.floor(A.strengthLevel(E.enemyStrength(q),D.strength))),expected=value;
 assert.equal(h.get('quest-strength-mohican-solo').textContent,expected);assert.equal(h.get('quest-hp-strength-mohican-solo').textContent,UI.strengthNumber(A.strengthLevel(q.hpStrength,D.strength,'vitality')));
 const button={disabled:false,dataset:{enemyInfo:'mohican-solo'}};
 h.get('quest-list').listeners.get('click')({target:{closest:selector=>selector==='[data-enemy-info]'?button:null}});
 const html=h.get('enemy-info-content').innerHTML;assert.ok(html.includes('<strong>'+value+'</strong>'));
 assert.ok(html.includes('最大HP '+UI.fullNumber(E.getSession(s).hp)));assert.ok(E.enemyStrength(E.getSession(s))>101);
});

test('common scale maps identical internal strengths equally and follows changed enemy curves',()=>{
 assert.equal(A.strengthLevel(100,D.strength),1);assert.equal(A.strengthLevel(300,D.strength),101);assert.equal(A.strengthLevel(600,D.strength),251);
 const old=D.questGrowth.enemyCurve;try{D.questGrowth.enemyCurve={initial:1.03,terminal:1.02,transition:50};const q=E.sessionAtLevel(D.sessions[0],101);assert.equal(A.strengthLevel(q.strength,D.strength),1+(q.strength/100-1)/.02);assert.notEqual(A.strengthLevel(q.strength,D.strength),350.26128228188635);}finally{D.questGrowth.enemyCurve=old;}
});

test('attack strength truncates compact mantissas in the actual ally detail renderer',()=>{for(const style of [false,'japanese','western']){const s=ready(['meta']);s.paused=true;s.levels.meta=201;s.concentration.meta.power=100;s.seedLevels.wrath=200;s.options.simplifiedNumbers=!!style;s.options.numberUnit=style||'western';const c=character('meta'),before=E.attackProfile(s,c),h=harness(s);h.openAbility('meta');const text=h.get('ability-value-power-meta').textContent;assert.ok(!text.includes('.'),text);assert.equal(text,UI.strengthNumber(A.strengthLevel(E.strengthValue(s,c,'power'),D.strength),style));assert.deepEqual(E.attackProfile(s,c),before);}assert.equal(UI.strengthNumber(19999.999,'japanese'),'1万');assert.equal(UI.strengthNumber(1999999.999,'western'),'1 million');assert.equal(UI.strengthNumber(123.999), '123');});

test('all ally strength labels truncate fractions with seeds and preserve runtime values',()=>{
 for(const style of [false,'japanese','western']){
  const s=ready(['meta']);s.paused=true;s.levels.meta=201;for(const key of Object.keys(s.seedLevels))s.seedLevels[key]=100;for(const ally of D.characters)s.health[ally.id]={hp:E.maxHP(s,ally),status:"active",regenSeconds:0};s.options.simplifiedNumbers=!!style;s.options.numberUnit=style||'western';
  const c=character('meta'),before=E.attackProfile(s,c),hp=E.maxHP(s,c),h=harness(s);h.openAbility('meta');
  for(const stat of ['vitality','power','armor','accuracy','evasion']){
   const text=h.get('ability-value-'+stat+'-meta').textContent;
   assert.ok(!text.includes('.'),stat+': '+text);
   assert.equal(text,UI.strengthNumber(A.strengthLevel(E.strengthValue(s,c,stat),D.strength,stat),style));

  }
  assert.deepEqual(E.attackProfile(s,c),before);assert.equal(E.maxHP(s,c),hp);
 }
});
