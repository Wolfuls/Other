// Isolated preview: no real progress is read, overwritten or awarded.
(function(){
 const E=YggEngine,s=E.createState();s.factors=1e10;s.earned=1e10;s.memoriesUnlocked=true;s.viewingMemories=true;s.paused=true;
 YggSave.load=()=>({state:s,warning:'追憶から転生を試す確認用です。実際の進行データには保存しません。'});
 YggSave.persist=()=>({ok:true});
})();
