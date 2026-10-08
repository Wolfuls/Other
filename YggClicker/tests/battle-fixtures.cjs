'use strict';
// Historical target conditions keep armor/reward regression tests meaningful.
// Swarm tags explicitly enable historical spillover scenarios.
// These exist only in the isolated test process; the shipped game has three different quests.
module.exports=function installBattleFixtures(){
 const D=require('../js/data.js');
 if(D.sessions.some(s=>s.id==='practice'))return;
 D.sessions.unshift(
  {id:'practice',code:'01',name:'起動訓練',enemy:'テスト標的',hp:10,defense:0,traits:['swarm'],reward:2,evasion:{flat:0,dice:0},ss:{flat:0,dice:0},accuracy:{flat:0,dice:0},attack:{flat:0,dice:0}},
  {id:'patrol',code:'02',name:'通路の巡回',enemy:'テスト装甲2',hp:40,defense:2,traits:['swarm'],reward:10,evasion:{flat:0,dice:0},ss:{flat:0,dice:0},accuracy:{flat:0,dice:0},attack:{flat:0,dice:0}},
  {id:'heavy',code:'03',name:'重装甲試験',enemy:'テスト装甲4',hp:150,defense:4,traits:['swarm'],reward:45,evasion:{flat:0,dice:0},ss:{flat:0,dice:0},accuracy:{flat:0,dice:0},attack:{flat:0,dice:0}}
 );
};
