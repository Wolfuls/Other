const {test}=require('node:test'),assert=require('node:assert/strict');const {D,E,ready,character}=require('./current-fixtures.cjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function damage(p){return E.T.damage({dice:p.dice,flat:p.flat+(p.bonus||0)},p.defense,p.damageLogRatio,p.damageScaleLog).mean;}
test('Lv360 Ozmorn takes identical Waku damage with penetration on and off, including hit bonuses',()=>{
 const s=ready(['waku'],'ozmorn'),c=character('waku');s.levels.waku=232;s.concentration.waku.power=100;s.concentration.waku.action=100;s.questLevels.ozmorn=s.questActiveLevels.ozmorn=360;
 const perk=c.perks.find(p=>p.ignoreDefense);E.togglePerk(s,'waku',perk.id,true);const on=E.attackProfile(s,c);E.togglePerk(s,'waku',perk.id,false);const off=E.attackProfile(s,c);
 assert.ok(on.ignoreDefense);assert.equal(off.ignoreDefense,false);assert.equal(on.damageLogRatio,off.damageLogRatio);assert.equal(on.damageScaleLog,off.damageScaleLog);
 for(let extra=0;extra<=3;extra++)near(damage({...on,dice:on.dice+extra}),damage({...off,dice:off.dice+extra}));assert.ok(damage(on)<2119&&damage(on)>1);assert.ok(damage({...on,dice:on.dice+2})<E.getSession(s).hp);
});
test('removing base defense scales its benefit with combat strength, without changing strength logs',()=>{
 const s=ready(['meta'],'dementor'),c=character('meta');s.levels.meta=75;const q={...E.getSession(s),strength:10000,defense:10,traits:[]};E.togglePerk(s,'meta','metal-blade',true);const on=E.attackProfile(s,c,false,q);E.togglePerk(s,'meta','metal-blade',false);const off=E.attackProfile(s,c,false,q);assert.equal(on.defense,0);assert.equal(off.defense,10);assert.equal(on.damageLogRatio,off.damageLogRatio);assert.equal(on.damageScaleLog,off.damageScaleLog);
 const spec={dice:0,flat:30},ratio=0,scale=Math.log(100);near(E.T.damage(spec,0,ratio,scale).mean,3000);near(E.T.damage(spec,10,ratio,scale).mean,2000);
 const immune=E.attackProfile(s,c,false,{...q,traits:['penetrationImmune']});E.togglePerk(s,'meta','metal-blade',true);const blocked=E.attackProfile(s,c,false,{...q,traits:['penetrationImmune']});assert.ok(blocked.penetrationBlocked);near(damage(blocked),damage(immune));
});
test('enemy penetration preserves target strength and equals a zero-armor attack',()=>{
 const s=ready(['meta'],'ozmorn');s.levels.meta=101;s.concentration.meta.armor=40;const c={...character('meta'),defense:0,resistance:0,perks:[]},enemy=s.enemies[0];const on=E.enemyHitProfile(s,enemy,c),off=E.enemyHitProfile(s,enemy,{...c,traits:['penetrationImmune']});assert.equal(on.reduction,off.reduction);assert.equal(on.damageLogRatio,off.damageLogRatio);assert.equal(on.damageScaleLog,off.damageScaleLog);
});
