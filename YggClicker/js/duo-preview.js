// Isolated preview: it never reads or writes the user's browser save.
(function(){
 const E=YggEngine,D=YggData,s=E.createState();s.factors=10000000000;
 const ids=['meta','waku','mitsuru','jewel','queen'];
 for(const id of ids){s.levels[id]=151;s.concentration[id]={...s.concentration[id],power:45,vitality:60,accuracy:30,action:15};}
 E.refreshQuestUnlocks(s);E.refreshPerkUnlocks(s);E.setFormation(s,'egg-or-chicken',ids);E.selectSession(s,'egg-or-chicken');E.ensureEnemies(s);
 for(const id of ids){const c=D.characters.find(c=>c.id===id);s.health[id]={hp:E.maxHP(s,c),status:'active',regenSeconds:0};}
 s.formationRows.waku='rear';s.formationRows.queen='rear';s.selectedCharacterId='meta';s.paused=true;
 YggSave.load=()=>({state:s,warning:'確認用プレビューです。進行は保存しません。'});YggSave.persist=()=>({ok:true});
 window.duoPreviewState=s;
})();
