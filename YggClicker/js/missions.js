(function(__YggBig){
(function(root){'use strict';
const catalogue=[
  {
    "id": "sorting",
    "name": "配送センターの荷物仕分け",
    "minutes": 15,
    "people": 1,
    "rd": 1,
    "credits": 6000,
    "description": "能力による仕分け可。ただし荷物の中身を変化させないこと"
  },
  {
    "id": "moving",
    "name": "引っ越しの手伝い",
    "minutes": 30,
    "people": 2,
    "rd": 2,
    "credits": 18000,
    "description": "家具は窓から搬入しても構いません。窓を広げるのは禁止です"
  },
  {
    "id": "cleaning",
    "name": "町内の清掃活動",
    "minutes": 45,
    "people": 2,
    "rd": 2,
    "credits": 5000,
    "description": ""
  },
  {
    "id": "shopping",
    "name": "富裕層の買い物代行",
    "minutes": 45,
    "people": 1,
    "rd": 1,
    "credits": 25000,
    "description": "依頼人の名前と購入品について、口外しないこと"
  },
  {
    "id": "kitchen",
    "name": "炊き出しの手伝い",
    "minutes": 60,
    "people": 3,
    "rd": 2,
    "credits": 3000,
    "description": ""
  },
  {
    "id": "animals",
    "name": "逃げ出した実験動物の回収",
    "minutes": 60,
    "people": 2,
    "rd": 8,
    "credits": 18000,
    "description": "捕獲用の檻を貸し出します。檻に入らない大きさになっていた場合はご連絡ください"
  },
  {
    "id": "protection",
    "name": "暴走能力者の保護",
    "minutes": 75,
    "people": 3,
    "rd": 12,
    "credits": 20000,
    "description": "討伐ではなく、周囲を守りながら本人を落ち着かせる依頼。"
  },
  {
    "id": "patrol",
    "name": "商店街の夜間巡回",
    "minutes": 120,
    "people": 2,
    "rd": 5,
    "credits": 55000,
    "description": "シャッターを下ろした店の中から音がしても、まず店主に確認してください"
  },
  {
    "id": "pet",
    "name": "ペット探しの依頼",
    "minutes": 30,
    "people": 1,
    "rd": 2,
    "credits": 10000,
    "description": ""
  },
  {
    "id": "wall",
    "name": "外壁の補修",
    "minutes": 60,
    "people": 2,
    "rd": 2,
    "credits": 30000,
    "description": ""
  },
  {
    "id": "rescue",
    "name": "救助作業",
    "minutes": 80,
    "people": 2,
    "rd": 10,
    "credits": 50000,
    "description": ""
  },
  {
    "id": "muffin",
    "name": "マフィン屋の手伝い",
    "minutes": 30,
    "people": 1,
    "rd": 2,
    "credits": 500,
    "description": "クリアごとに全報酬が10%上昇。10%の確率で倒産し、成長が初期値に戻る。"
  }
];
function recordUnlocks(state){const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.YggEngine;E?.refreshQuestUnlocks?.(state);}
// All C income shares one multiplier and current-run acquisition counter.
const creditAmount=(state,amount)=>(__YggBig.max(0,(__YggBig.min(Infinity,(__YggBig.floor((__YggBig.mul(amount,(__YggBig.add(1,(__YggBig.mul(state.seedLevels?.greed||0,.01))))))))))));
const grantCredits=(state,amount)=>grantCreditAmount(state,creditAmount(state,amount));
function grantCreditAmount(state,amount){const gain=(__YggBig.min(amount,(__YggBig.max(0,(__YggBig.sub(Infinity,state.credits||0)))),(__YggBig.max(0,(__YggBig.sub(Infinity,state.creditsEarned||0))))));state.credits=(__YggBig.add(state.credits||0,gain));state.creditsEarned=(__YggBig.add(state.creditsEarned||0,gain));recordUnlocks(state);return gain;}
const activeRewards={pet:[3,12000],patrol:[15,80000],rescue:[50,30000],muffin:[3,3000]};
for(const m of catalogue){if(activeRewards[m.id]){[m.rd,m.credits]=activeRewards[m.id];}else m.retired=true;}
const available=state=>catalogue.filter(m=>!m.retired||state.missions?.[m.id]);
const busy=(state,id)=>Object.values(state.missions||{}).some(m=>m.members.includes(id));
const reward=(state,id)=>{const m=catalogue.find(m=>(__YggBig.eq(m.id,id)));if(!m)return null;const scale=id==='muffin'?(__YggBig.pow(1.1,(__YggBig.min(2000,state.muffinLevel||0)))):1;return Object.fromEntries(['rd','credits'].map(k=>[k,(__YggBig.floor((__YggBig.min(Infinity,(__YggBig.mul((__YggBig.mul(m[k],scale)),k==='credits'?(__YggBig.add(1,(__YggBig.mul(state.seedLevels?.greed||0,.01)))):1))))))]));};
function start(state,id,members,E){const m=catalogue.find(m=>(__YggBig.eq(m.id,id)));if(!m||m.retired||state.paused||state.dreamShop||state.missions?.[id]||!Array.isArray(members)||(__YggBig.ne(members.length,m.people))||(__YggBig.ne(new Set(members).size,m.people))||members.some(id=>!state.levels[id]||busy(state,id)||E.healthOf(state,id).status!=='active'||E.runawayOf(state,id).runawayCollapsed))return false;
// Freeze implicit recruit rosters before dispatch, so mission members never auto-join battles.
state.formations=Object.fromEntries(Object.keys(state.formations).map(q=>[q,E.formationIds(state,q)]));
for(const [q,roster] of Object.entries(state.formations))if(roster.some(id=>members.includes(id)))E.setFormation(state,q,roster.filter(id=>!members.includes(id)));
state.missions||={};state.missions[id]={members:[...members],remaining:(__YggBig.mul(m.minutes,60))};return true;}
function advance(state,seconds){for(const m of Object.values(state.missions||{}))m.remaining=(__YggBig.max(0,(__YggBig.sub(m.remaining,seconds))));}
function claim(state,id,random=Math.random){const m=state.missions?.[id];if(!m||(__YggBig.gt(m.remaining,1e-7))||state.paused||state.dreamShop)return null;const r=reward(state,id);r.credits=grantCreditAmount(state,r.credits);for(const [k,v]of Object.entries({factors:r.rd,earned:r.rd}))state[k]=(__YggBig.min(Infinity,(__YggBig.add(state[k]||0,v))));delete state.missions[id];const bankrupt=id==='muffin'&&(__YggBig.lt(random(),.1));if(id==='muffin')state.muffinLevel=bankrupt?0:(__YggBig.min(2000,(__YggBig.add(state.muffinLevel||0,1))));recordUnlocks(state);return {...r,bankrupt};}
function cancel(state,id){if(!state.missions?.[id]||state.paused||state.dreamShop)return false;delete state.missions[id];return true;}
function validate(raw,state,E){const value=raw.missions??{};if(!value||typeof value!=='object'||Array.isArray(value))throw Error('ミッションの状態が正しくありません。');const used=new Set();const result={};for(const [id,m]of Object.entries(value)){const base=catalogue.find(x=>(__YggBig.eq(x.id,id)));if(!base||!m||!Array.isArray(m.members)||(__YggBig.ne(m.members.length,base.people))||!(__YggBig.isFinite(m.remaining))||(__YggBig.lt(m.remaining,0))||(__YggBig.gt(m.remaining,(__YggBig.mul(base.minutes,60)))))throw Error('ミッションの状態が正しくありません。');for(const id of m.members){if(!state.levels[id]||used.has(id)||E.formationOwner(state,id))throw Error('ミッションの参加者が重複しているか、未雇用です。');used.add(id);}result[id]={members:[...m.members],remaining:m.remaining};}const level=raw.muffinLevel??0;if(!(__YggBig.isInteger(level))||(__YggBig.lt(level,0))||(__YggBig.gt(level,2000)))throw Error('マフィン屋のレベルが正しくありません。');state.missions=result;state.muffinLevel=level;}
const api={creditAmount,grantCredits,available,catalogue,busy,reward,start,advance,claim,cancel,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggMissions=api;
})(typeof globalThis!=='undefined'?globalThis:this);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
