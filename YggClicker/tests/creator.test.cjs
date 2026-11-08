const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready}=require('./current-fixtures.cjs');
test('blessing threshold latches, exact purchase unlocks, high balances survive saving',()=>{
 const s=E.createState();s.factors=1e299;E.refreshQuestUnlocks(s);assert.equal(s.creatorAccess.seen,false);assert.equal(E.buyUpgrade(s,'blessing'),false);
 s.factors=1e300;E.refreshQuestUnlocks(s);assert.equal(s.creatorAccess.seen,true);assert.equal(S.decode(S.encode(s)).factors,1e300);
 s.factors=0;assert.equal(S.decode(S.encode(s)).creatorAccess.seen,true);assert.equal(E.isQuestUnlocked(s,'creator'),false);
 s.factors=1e300;assert.ok(E.buyUpgrade(s,'blessing'));assert.equal(s.factors,0);assert.ok(E.isQuestUnlocked(s,'creator'));assert.equal(E.buyUpgrade(s,'blessing'),false);
 assert.ok(E.isQuestUnlocked(S.decode(S.encode(s)),'creator'));
});
test('fixed level and deterministic fourth-turn physical area attack',()=>{
 const s=ready(['meta'],'creator'),q=E.getSession(s);assert.equal(q.level,65535);assert.equal(E.setQuestLevel(s,'creator',1),false);assert.equal(E.buyQuest(s,'creator'),false);assert.equal(E.sessionAtLevel(D.sessions.find(q=>q.id==='creator'),1).level,65535);
 const e=s.enemies[0];for(let n=0;n<8;n++){e.creatorTurns=n;const p=E.enemyAttackChoices(s,e,D.characters[0])[0];assert.equal(p.id,n%4===3?'genesis':'judgment');assert.equal(!!p.area,n%4===3);}e.creatorPattern='genesis';assert.equal(E.enemyHitProfile(s,e,D.characters[0]).mental,false);e.creatorPattern='judgment';assert.equal(E.enemyHitProfile(s,e,D.characters[0]).mental,true);
 assert.equal(S.decode(S.encode(s)).enemies[0].creatorTurns,7);
});
test('first clear doubles factor income once and survives saves and new runs',()=>{
 const s=ready([],'creator'),before=E.incomeAmount(s,100);s.enemies[0].hp=1;s.enemies[0].creatorTurns=1;E.click(s,()=>.5);assert.ok(s.creatorAccess.defeated);assert.equal(E.incomeAmount(s,100),before*2);assert.equal(E.incomeAmount(s,100,'refund'),100);
 const t=S.decode(S.encode(s));assert.ok(t.creatorAccess.defeated);t.factors=1e50;t.dreamShop=true;t.viewingMemories=true;assert.ok(E.nextRun(t).creatorAccess.defeated);
});
