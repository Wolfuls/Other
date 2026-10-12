const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,S,D,ready,character}=require('./current-fixtures.cjs'),A=require('../js/ability-view');
test('HP and action grow four percent while other strengths retain two percent',()=>{
 const s=ready(['meta']),c=character('meta');s.levels.meta=101;
 assert.equal(E.strengthValue(s,c,'action'),500);assert.equal(E.strengthValue(s,c,'vitality'),500);assert.equal(E.maxHP(s,c),100);
 for(const kind of ['power','armor','accuracy','evasion'])assert.equal(E.strengthValue(s,c,kind),300);
 assert.equal(A.strengthLevel(500,D.strength,'vitality'),101);
 assert.deepEqual(A.tracks.map(t=>t.id),['action','vitality','power','armor','accuracy','evasion']);
});
test('previous two-percent saves load with health and progression intact',()=>{
 for(const [hp,status]of [[60,'active'],[17,'active'],[1,'unconscious'],[-5,'dying']]){
 const s=ready(['meta']);s.levels.meta=101;s.health.meta={hp,status,regenSeconds:0};
 const loaded=S.decode(JSON.stringify({gameId:D.gameId,schemaVersion:59,state:s}));
 assert.deepEqual(loaded.health.meta,s.health.meta);assert.equal(loaded.factors,s.factors);assert.deepEqual(loaded.levels,s.levels);assert.equal(E.maxHP(loaded,character('meta')),100);
 }
});
