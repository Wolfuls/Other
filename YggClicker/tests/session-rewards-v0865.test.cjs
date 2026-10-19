const {test}=require('node:test'),assert=require('node:assert/strict');
const {D,E,ready,roundTrip}=require('./current-fixtures.cjs');
function kill(s,slot=0){const e=s.enemies[slot];e.hp=1;E.selectEnemy(s,e.id);return E.click(s,()=>.5);}
test('fixed rewards for each session, including training',()=>{
 for(const [id,c,p]of [['mohican-solo',100,0],['mohicans',150,0],['scarecrow',0,0],['ozmorn',100000,2],['dementor',12000,3]]){const s=ready([],id);kill(s);assert.equal(s.credits,c,id);assert.equal(s.prestige,p,id);assert.doesNotThrow(()=>roundTrip(s));}
});
test('rat rewards are per enemy, fixed despite quest level and income bonuses',()=>{
 for(const slot of [0,1,2]){const s=ready([],'electric-rat');s.sinTotal=100;s.seedLevels.greed=5;s.questLevels['electric-rat']=s.questActiveLevels['electric-rat']=10;s.enemies=null;E.ensureEnemies(s);const ev=kill(s,slot).find(e=>e.type==='clear');assert.ok(ev);assert.equal(s.credits,slot===0?2625:1050);assert.equal(s.prestige,slot===0?1:0);assert.equal(ev.credits,s.credits);}
});
test('duo pays once after both defeated and preserves upgrade cost',()=>{
 const s=ready([],'egg-or-chicken'),before=s.factors;assert.equal(E.questCost(s),2000000000);kill(s,0);assert.equal(s.credits,0);assert.equal(s.prestige,0);kill(s,1);assert.equal(s.factors-before,1000);assert.equal(s.credits,1000000);assert.equal(s.prestige,50);assert.doesNotThrow(()=>roundTrip(s));
});
test('offscreen clears accumulate currencies on the shared state',()=>{
 const s=ready(['meta'],'mohican-solo');s.enemies[0].hp=1;E.selectSession(s,'scarecrow');const events=E.advance(s,60,()=>.5);const clears=events.filter(e=>e.type==='clear');assert.ok(clears.some(e=>e.sessionId==='mohican-solo'));assert.equal(s.credits,clears.reduce((n,e)=>n+(e.credits||0),0));assert.equal(s.prestige,clears.reduce((n,e)=>n+(e.prestige||0),0));assert.doesNotThrow(()=>roundTrip(s));
});
