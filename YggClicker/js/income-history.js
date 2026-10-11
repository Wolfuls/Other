(function(root){
'use strict';
// One aggregate bucket per second, never an unbounded combat event log.
class IncomeHistory {
 constructor(now=Date.now()){this.reset(now);}
 reset(now=Date.now()){this.cached=null;this.started=now;this.buckets=new Array(1801);}
 add(quest,amount,now=Date.now()){
  if(!(amount>0)||now<this.started)return;
  this.cached=null;const second=Math.floor(now/1000),index=((second%1801)+1801)%1801;
  let b=this.buckets[index];if(!b||b.second!==second)b=this.buckets[index]={second,quests:{}};
  b.quests[quest]=(b.quests[quest]||0)+amount;
 }
 read(seconds=300,now=Date.now()){
  if(this.cached?.now===now&&this.cached.seconds===seconds)return this.cached.value;
  const elapsed=Math.max(0,Math.min(seconds,(now-this.started)/1000)),cutoff=Math.floor((now-seconds*1000)/1000),end=Math.floor(now/1000),quests={};
  for(const b of this.buckets)if(b&&b.second>cutoff&&b.second<=end)for(const [id,value] of Object.entries(b.quests))quests[id]=(quests[id]||0)+value;
  const total=Object.values(quests).reduce((a,b)=>a+b,0);
  const value={elapsed,total,rate:elapsed?total/elapsed:0,quests:Object.fromEntries(Object.entries(quests).map(([id,total])=>[id,{total,rate:elapsed?total/elapsed:0}]))};
  this.cached={now,seconds,value};return value;
 }
}
if(typeof module==='object'&&module.exports)module.exports=IncomeHistory;else root.YggIncomeHistory=IncomeHistory;
})(globalThis);

