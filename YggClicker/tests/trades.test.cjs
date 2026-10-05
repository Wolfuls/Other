'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/data.js'),E=require('../js/engine.js'),S=require('../js/save.js'),UI=require('../js/display.js'),{harness}=require('./app-harness.cjs');
const tracks=[['power','meta'],['action','richter'],['quest','scarecrow'],['upgrade','power']];
function funded(){const s=E.createState(1000);s.factors=1e9;s.levels.meta=1;s.levels.richter=1;return s;}
test('all actors gain exactly 5 per personal level and 1 per global speed level',()=>{
 const s=funded();for(const c of D.characters){s.levels[c.id]=1;for(const level of [0,1,10,50,500]){s.actionLevels[c.id]=level;s.upgrades.power=17;assert.equal(E.actionPower(s,c),c.action+level*5+17);}}
});
test('ten-purchase quotes equal ten single purchases including independently floored prices',()=>{
 const functions={power:E.hire,action:E.buyAction,quest:E.buyQuest,upgrade:E.buyUpgrade};
 for(const [kind,id]of tracks){const s=funded(),single=structuredClone(s),q=E.purchaseQuote(s,kind,id,10);for(let i=0;i<10;i++)assert.ok(functions[kind](single,id));assert.equal(q.cost,s.factors-single.factors);assert.ok(E.buyMany(s,kind,id));assert.deepEqual(s,single);}
 const s=E.createState();s.factors=1e6;assert.ok(E.buyMany(s,'power','max'));assert.equal(s.levels.max,10);
});
test('bulk transactions fail atomically on funds, caps, locked actions or invalid quantities',()=>{
 for(const [kind,id]of tracks){const s=funded();s.factors=E.purchaseQuote(s,kind,id).cost-1;const before=structuredClone(s);assert.equal(E.buyMany(s,kind,id),false);assert.deepEqual(s,before);}
 const s=funded();s.levels.meta=195;const before=structuredClone(s);assert.equal(E.buyMany(s,'power','meta'),false);assert.equal(E.buyMany(s,'action','max'),false);assert.equal(E.buyMany(s,'upgrade','overkill'),false);assert.equal(E.buyMany(s,'quest','unknown'),false);assert.equal(E.buyMany(s,'power','richter',-1),false);assert.deepEqual(s,before);
});
test('sales refund half the last price without inflating earned factors or permitting profit loops',()=>{
 const functions={power:E.hire,action:E.buyAction,quest:E.buyQuest,upgrade:E.buyUpgrade};
 for(const [kind,id]of tracks){const s=funded(),start=s.factors;const q=E.purchaseQuote(s,kind,id,1);assert.ok(functions[kind](s,id));const sale=E.saleQuote(s,kind,id);assert.equal(sale.refund,Math.max(1,Math.floor(q.cost/2)));assert.ok(E.sell(s,kind,id));assert.equal(s.factors,start-q.cost+sale.refund);assert.equal(s.earned,0);assert.equal(E.sell(s,kind,id),false);}
 const s=funded();assert.ok(E.buyUpgrade(s,'overkill'));assert.equal(E.saleQuote(s,'upgrade','overkill').refund,100);assert.ok(E.sell(s,'upgrade','overkill'));assert.equal(E.overkillBonus(s),0);assert.ok(E.buyUpgrade(s,'overkill'));
});
test('selling levels suspends owned power and action perks; save/load and re-purchase restore them once',()=>{
 const s=funded();s.levels.meta=10;s.purchasedPerks.meta=['attack-plus'];assert.ok(E.sell(s,'power','meta'));
 const meta=D.characters.find(c=>c.id==='meta');assert.equal(E.stats(s,meta).flat,0);assert.ok(E.perks(s,meta)[0].owned);assert.equal(E.perks(s,meta)[0].unlocked,false);assert.equal(E.buyPerk(s,'meta','attack-plus'),false);assert.deepEqual(S.decode(S.encode(s)),s);
 assert.ok(E.hire(s,'meta'));assert.equal(E.stats(s,meta).flat,4);assert.equal(E.buyPerk(s,'meta','attack-plus'),false);assert.deepEqual(s.purchasedPerks.meta,['attack-plus']);
 s.levels.max=1;s.actionLevels.max=50;s.purchasedPerks.max=['golden-rule'];assert.equal(E.actionPower(s,meta),65);E.sell(s,'action','max');assert.equal(E.actionPower(s,meta),50);assert.deepEqual(S.decode(S.encode(s)),s);E.buyAction(s,'max');assert.equal(E.actionPower(s,meta),65);
});
test('quest sale preserves remaining HP proportion and never grants a clear; other quest sale leaves combat unchanged',()=>{
 const s=funded();E.buyQuest(s,'mohicans');s.hp=10;s.batchHpFraction=.4;s.poisonDamage=4;const kills=s.kills;assert.ok(E.sell(s,'quest','mohicans'));assert.equal(s.hp,8);assert.equal(s.batchHpFraction,0);assert.equal(s.kills,kills);assert.equal(s.poisonDamage,4);
 E.buyQuest(s,'scarecrow');const hp=s.hp;E.sell(s,'quest','scarecrow');assert.equal(s.hp,hp);assert.equal(E.sell(s,'quest','mohicans'),false);
});
test('new UI trade controls buy ten, sell one and show parked perks',()=>{
 const s=funded();s.paused=true;const h=harness(s);
 const click=(container,kind,id,trade)=>h.get(container).listeners.get('click')({target:{closest:sel=>sel==='[data-trade]'?{dataset:{kind,id,trade},disabled:false}:null}});
 click('character-list','power','meta','buy');assert.equal(h.saved().levels.meta,11);click('character-list','power','meta','sell');assert.equal(h.saved().levels.meta,10);
 click('quest-list','quest','mohicans','buy');assert.equal(h.saved().questLevels.mohicans,11);click('quest-list','quest','mohicans','sell');assert.equal(h.saved().questLevels.mohicans,10);
 click('upgrade-list','upgrade','power','buy');assert.equal(h.saved().upgrades.power,10);assert.equal(h.get('power-bonus').textContent,'＋10');click('upgrade-list','upgrade','power','sell');assert.equal(h.saved().upgrades.power,9);
});
test('front enemy shares the player ground line for all sessions and the boost overlay is inside its viewport',()=>{
 for(const q of D.sessions)for(const mobile of [false,true]){const l=UI.orbitLayout({width:800,mobile,grounded:true,enemyCount:UI.enemyFormationSize(q),enemyScale:q.enemyScale||1,metaCount:0,richterCount:0});assert.ok(Math.abs(l.enemyY+l.enemyFoot-l.meta.y-l.meta.footOffset)<1e-8);for(const r of l.reserves)assert.ok(Math.abs(r.y)<=14);for(const r of [{x:0,y:0},...l.reserves]){assert.ok(l.enemyY+r.y-l.enemyHeight/2>=0);assert.ok(l.enemyY+r.y+l.enemyHeight/2<=l.height);assert.ok(l.enemyX+r.x+l.enemyWidth/2<=l.width);}}
 assert.equal(D.sessions.find(q=>q.id==='dementor').name,'旧き看守');const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../dashboard.css'),'utf8');assert.ok(html.indexOf('id="limit-break-overlay"')>html.indexOf('id="arena-viewport"'));assert.match(css,/\.limit-break-overlay\{position:absolute/);assert.doesNotMatch(css,/\.limit-break-overlay\{position:fixed/);
});
