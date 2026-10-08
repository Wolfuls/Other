'use strict';
const D=require('../js/data'),E=require('../js/engine'),S=require('../js/save');
const character=id=>D.characters.find(c=>c.id===id);
const rng=(seed=17429)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const faces=(...v)=>()=>((v.shift()??4)-.5)/6;
function ready(ids=['meta'],quest='scarecrow'){
 const s=E.createState(1000);s.factors=1e15;s.questActiveLevels=Object.fromEntries(D.sessions.map(q=>[q.id,1]));
 for(const id of ids)s.levels[id]=1;
 E.refreshQuestUnlocks(s);E.setFormation(s,quest,ids);E.selectSession(s,quest);E.ensureEnemies(s);s.selectedCharacterId=ids[0]||null;
 return s;
}
function enable(s,id,...ids){const c=character(id);for(const name of ids){const p=c.perks.find(p=>p.id===name);if(!p)throw Error(name);const field=p.levelType?p.levelType+'Levels':'levels';s[field][id]=Math.max(s[field][id]||0,p.level);E.togglePerk(s,id,name,true);}return s;}
function neutralHealth(s,hp=100000){for(const id of E.formationIds(s)){const c=character(id);s.vitalityLevels[id]=Math.ceil(hp/(c.maxHP*.1));s.health[id]={hp:E.maxHP(s,c),status:'active',regenSeconds:0};}return s;}
const roundTrip=s=>S.decode(S.encode(s));
module.exports={D,E,S,character,rng,faces,ready,enable,neutralHealth,roundTrip};
