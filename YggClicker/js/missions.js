(function(root){'use strict';
const catalogue=[
  {
    "id": "sorting",
    "name": "配送センターの荷物仕分け",
    "minutes": 15,
    "people": 1,
    "rd": 1,
    "credits": 6000,
    "prestige": 0,
    "description": "能力による仕分け可。ただし荷物の中身を変化させないこと"
  },
  {
    "id": "moving",
    "name": "引っ越しの手伝い",
    "minutes": 30,
    "people": 2,
    "rd": 2,
    "credits": 18000,
    "prestige": 1,
    "description": "家具は窓から搬入しても構いません。窓を広げるのは禁止です"
  },
  {
    "id": "cleaning",
    "name": "町内の清掃活動",
    "minutes": 45,
    "people": 2,
    "rd": 2,
    "credits": 5000,
    "prestige": 12,
    "description": ""
  },
  {
    "id": "shopping",
    "name": "富裕層の買い物代行",
    "minutes": 45,
    "people": 1,
    "rd": 1,
    "credits": 25000,
    "prestige": 0,
    "description": "依頼人の名前と購入品について、口外しないこと"
  },
  {
    "id": "kitchen",
    "name": "炊き出しの手伝い",
    "minutes": 60,
    "people": 3,
    "rd": 2,
    "credits": 3000,
    "prestige": 30,
    "description": ""
  },
  {
    "id": "animals",
    "name": "逃げ出した実験動物の回収",
    "minutes": 60,
    "people": 2,
    "rd": 8,
    "credits": 18000,
    "prestige": 3,
    "description": "捕獲用の檻を貸し出します。檻に入らない大きさになっていた場合はご連絡ください"
  },
  {
    "id": "protection",
    "name": "暴走能力者の保護",
    "minutes": 75,
    "people": 3,
    "rd": 12,
    "credits": 20000,
    "prestige": 25,
    "description": "討伐ではなく、周囲を守りながら本人を落ち着かせる依頼。"
  },
  {
    "id": "patrol",
    "name": "商店街の夜間巡回",
    "minutes": 120,
    "people": 2,
    "rd": 5,
    "credits": 55000,
    "prestige": 10,
    "description": "シャッターを下ろした店の中から音がしても、まず店主に確認してください"
  },
  {
    "id": "pet",
    "name": "ペット探しの依頼",
    "minutes": 30,
    "people": 1,
    "rd": 2,
    "credits": 10000,
    "prestige": 1,
    "description": ""
  },
  {
    "id": "wall",
    "name": "外壁の補修",
    "minutes": 60,
    "people": 2,
    "rd": 2,
    "credits": 30000,
    "prestige": 10,
    "description": ""
  },
  {
    "id": "rescue",
    "name": "救助作業",
    "minutes": 80,
    "people": 2,
    "rd": 10,
    "credits": 50000,
    "prestige": 50,
    "description": ""
  },
  {
    "id": "muffin",
    "name": "マフィン屋の手伝い",
    "minutes": 30,
    "people": 1,
    "rd": 2,
    "credits": 500,
    "prestige": 1,
    "description": "クリアごとに全報酬が10%上昇。10%の確率で倒産し、成長が初期値に戻る。"
  }
];
function recordUnlocks(state){const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.YggEngine;E?.refreshQuestUnlocks?.(state);}
// All C income shares one multiplier and current-run acquisition counter.
const creditAmount=(state,amount)=>Math.max(0,Math.min(1e100,Math.floor(amount*(1+(state.seedLevels?.greed||0)*.01))));
const grantCredits=(state,amount)=>grantCreditAmount(state,creditAmount(state,amount));
function grantCreditAmount(state,amount){const gain=Math.min(amount,Math.max(0,1e100-(state.credits||0)),Math.max(0,1e100-(state.creditsEarned||0)));state.credits=(state.credits||0)+gain;state.creditsEarned=(state.creditsEarned||0)+gain;recordUnlocks(state);return gain;}
const busy=(state,id)=>Object.values(state.missions||{}).some(m=>m.members.includes(id));
const reward=(state,id)=>{const m=catalogue.find(m=>m.id===id);if(!m)return null;const scale=id==='muffin'?Math.pow(1.1,Math.min(2000,state.muffinLevel||0)):1;return Object.fromEntries(['rd','credits','prestige'].map(k=>[k,Math.floor(Math.min(1e100,m[k]*scale*(k==='credits'?1+(state.seedLevels?.greed||0)*.01:1)))]));};
function start(state,id,members,E){const m=catalogue.find(m=>m.id===id);if(!m||state.paused||state.dreamShop||state.missions?.[id]||!Array.isArray(members)||members.length!==m.people||new Set(members).size!==m.people||members.some(id=>!state.levels[id]||busy(state,id)||E.healthOf(state,id).status!=='active'||E.runawayOf(state,id).runawayCollapsed))return false;
// Freeze implicit recruit rosters before dispatch, so mission members never auto-join battles.
state.formations=Object.fromEntries(Object.keys(state.formations).map(q=>[q,E.formationIds(state,q)]));
for(const [q,roster] of Object.entries(state.formations))if(roster.some(id=>members.includes(id)))E.setFormation(state,q,roster.filter(id=>!members.includes(id)));
state.missions||={};state.missions[id]={members:[...members],remaining:m.minutes*60};return true;}
function advance(state,seconds){for(const m of Object.values(state.missions||{}))m.remaining=Math.max(0,m.remaining-seconds);}
function claim(state,id,random=Math.random){const m=state.missions?.[id];if(!m||m.remaining>1e-7||state.paused||state.dreamShop)return null;const r=reward(state,id);r.credits=grantCreditAmount(state,r.credits);for(const [k,v]of Object.entries({factors:r.rd,earned:r.rd,prestige:r.prestige}))state[k]=Math.min(1e100,(state[k]||0)+v);delete state.missions[id];const bankrupt=id==='muffin'&&random()<.1;if(id==='muffin')state.muffinLevel=bankrupt?0:Math.min(2000,(state.muffinLevel||0)+1);recordUnlocks(state);return {...r,bankrupt};}
function cancel(state,id){if(!state.missions?.[id]||state.paused||state.dreamShop)return false;delete state.missions[id];return true;}
function validate(raw,state,E){const value=raw.missions??{};if(!value||typeof value!=='object'||Array.isArray(value))throw Error('ミッションの状態が正しくありません。');const used=new Set();const result={};for(const [id,m]of Object.entries(value)){const base=catalogue.find(x=>x.id===id);if(!base||!m||!Array.isArray(m.members)||m.members.length!==base.people||!Number.isFinite(m.remaining)||m.remaining<0||m.remaining>base.minutes*60)throw Error('ミッションの状態が正しくありません。');for(const id of m.members){if(!state.levels[id]||used.has(id)||E.formationOwner(state,id))throw Error('ミッションの参加者が重複しているか、未雇用です。');used.add(id);}result[id]={members:[...m.members],remaining:m.remaining};}const level=raw.muffinLevel??0;if(!Number.isInteger(level)||level<0||level>2000)throw Error('マフィン屋のレベルが正しくありません。');state.missions=result;state.muffinLevel=level;}
const api={creditAmount,grantCredits,catalogue,busy,reward,start,advance,claim,cancel,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggMissions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
