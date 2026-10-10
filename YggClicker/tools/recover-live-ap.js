// Open the still-running game's DevTools Console and paste this entire file.
// It repairs only fractional AP in the next saved copy; it never resets progress.
(() => {
  const save = window.YggSave;
  if (!save || save.apRecoveryInstalled) return;
  const persist = save.persist;
  save.persist = (storage, state, options) => {
    const copy = structuredClone(state);
    for (const id of Object.keys(copy.actionPoints || {})) {
      if (Number.isFinite(copy.actionPoints[id]) && copy.actionPoints[id] >= 0)
        copy.actionPoints[id] = Math.floor(copy.actionPoints[id]);
    }
    for (const battle of [copy, ...Object.values(copy.sessionStates || {})]) {
      for (const enemy of battle?.enemies || []) {
        if (Number.isFinite(enemy.actionPoints) && enemy.actionPoints >= 0)
          enemy.actionPoints = Math.floor(enemy.actionPoints);
      }
    }
    try { save.encode(copy); }
    catch (error) { console.error('保存できない原因：', error.message); }
    const result = persist(storage, copy, options);
    if (result.ok) {
      console.info('未保存の進行を保存しました。v0.70.2への再読み込みが可能です。');
      const banner = document.getElementById('notice');
      if (banner) {
        banner.textContent = '未保存の進行を保存しました。画面を再読み込みしてv0.70.2へ更新できます。';
        banner.hidden = false;
        banner.classList.remove('error');
      }
    }
    return result;
  };
  save.apRecoveryInstalled = true;
  console.info('AP保存の復旧処理を設定しました。次の自動保存まで最大10秒お待ちください。');
})();
