const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,S,ready,rng}=require('./current-fixtures.cjs'),H=require('../js/huge'),N=require('../js/numbers'),UI=require('../js/display');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
test('scientific arithmetic, cancellation, signed comparison, and serialization',()=>{
 const a=H.fromLog10(500),b=H.fromLog10(400);assert.ok(H.gt(a,b));near(H.log10(H.mul(a,b)),900);near(H.log10(H.div(a,b)),100);assert.equal(H.sub(a,a),0);assert.ok(H.lt(H.neg(a),H.neg(b)));near(H.log10(H.add(a,a)),500+Math.log10(2));assert.ok(H.isBig(structuredClone(a)));assert.ok(H.eq(JSON.parse(JSON.stringify(a)),a));assert.equal(H.isBig({__huge:1,m:Infinity,e:500}),false);assert.equal(H.isBig({__huge:1,m:2,e:500,bogus:1}),false);
 near(H.log10(H.div(1e300,1e-100)),400);near(H.log10(H.mul(1e300,1e300)),600);assert.equal(H.div(a,Infinity),0);assert.equal(H.min(a,Infinity),a);
 const r=rng();for(let i=0;i<1000;i++){const x=(r()-.5)*1e9,y=(r()-.5)*1e9;assert.equal(H.add(x,y),x+y);assert.equal(H.sub(x,y),x-y);assert.equal(H.mul(x,y),x*y);assert.equal(H.div(x,y),x/y);assert.equal(H.lt(x,y),x<y);}
});
test('creator uses uncapped level 65535 curves; growth continues after former caps',()=>{
 const s=E.createState(),q=E.getSession(s,'creator');near(H.log10(q.strength),345.095501473);near(H.log10(q.hp),356.955452528);assert.ok(H.gt(q.hp,1e300));assert.ok(H.gt(q.defenseStrength,q.attackStrength));assert.ok(H.gt(E.T.enemyValue(65535),E.T.enemyValue(65534)));assert.ok(H.gt(E.T.personalValue(100000,25000,100000,'power'),1e300));assert.ok(H.gt(E.enemyActionValue(q),1e300));
});
test('large HP, damage, wallets, battle turns and save reload do not become Infinity',()=>{
 const s=ready(['meta','waku'],'creator');s.factors=H.fromLog10(1000);s.credits=H.fromLog10(700);const t=S.decode(S.encode(s));assert.ok(H.eq(s.enemies[0].hp,t.enemies[0].hp));assert.ok(H.eq(s.factors,t.factors));E.advance(t,3,()=>.5);assert.ok(t.health.meta.status!=='active');assert.ok(H.isBig(t.health.meta.hp));assert.ok(H.isFinite(t.health.meta.hp));S.decode(S.encode(t));
 const bad=JSON.parse(S.encode(s));bad.state.factors={__huge:1,m:0,e:500};assert.throws(()=>S.decode(JSON.stringify(bad)));
});
test('huge earnings, prices and purchases stay finite and are persisted',()=>{
 const s=ready(['meta'],'mohican-solo');s.levels.meta=10000;const c=D.characters.find(c=>c.id==='meta'),price=E.hireCost(s,c);assert.ok(H.gt(price,1e300));s.factors=price;assert.ok(E.hire(s,'meta'));assert.equal(s.factors,0);assert.equal(s.levels.meta,10001);
 s.factors=H.fromLog10(500);s.earned=H.fromLog10(500);E.grantIncome(s,H.fromLog10(500),'questReward');near(H.log10(s.factors),500+Math.log10(2));assert.ok(H.isFinite(S.decode(S.encode(s)).factors));
 const q=E.sessionAtLevel(D.sessions.find(q=>q.id==='mohican-solo'),65535);assert.ok(H.gt(q.reward,1e300));assert.ok(H.isFinite(q.reward));
});
test('scientific UI formatting never leaks object or infinity strings',()=>{for(const fn of ['strengthNumber','fullNumber','currencyNumber','incomeNumber'])for(const style of [false,true,'japanese']){const str=UI[fn](H.fromLog10(500.25),style);assert.match(str,/10\^500/);assert.doesNotMatch(str,/NaN|Infinity|Object/);}});

test('schema 69 preserves wounded ally and creator HP ratios',()=>{const s=S.decode(require('node:fs').readFileSync(require('node:path').join(__dirname,'fixtures/huge-v69.json'),'utf8'));near(H.div(s.health.meta.hp,E.maxHP(s,D.characters.find(c=>c.id==='meta'))),.5);near(H.div(s.enemies[0].hp,E.getSession(s,'creator').hp),.5);const again=S.decode(S.encode(s));assert.ok(H.eq(again.health.meta.hp,s.health.meta.hp));assert.ok(H.eq(again.enemies[0].hp,s.enemies[0].hp));});
