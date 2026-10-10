(function (root) {
  'use strict';

  function actionGauge(points, threshold) {
    const current = Math.max(0, Number.isFinite(points) ? points : 0);
    const maximum = Math.max(1, Number.isFinite(threshold) ? threshold : 1);
    return { current, maximum, percent: Math.min(100, current / maximum * 100) };
  }

  function create({ get, setText, format }) {
    const attribute = (node, key, value) => { if (node.getAttribute(key) !== value) node.setAttribute(key, value); };
    const style = (node, key, value) => { if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value); };
    function mount(character, actor, document) {
      const vitals = document.createElement('div');
      vitals.className = 'ally-vitals';
      for (const [kind, className] of [['hp', 'ally-health'], ['ap', 'ally-ap'], ['runaway', 'ally-runaway']]) {
        const cell = document.createElement('span');
        cell.id = 'ally-' + kind + '-' + character.id;
        cell.className = className;
        if (kind === 'ap') {
          cell.setAttribute('role', 'progressbar');
          cell.setAttribute('aria-label', character.name + 'のAP');
          cell.setAttribute('aria-valuemin', '0');
        }
        vitals.append(cell);
      }
      if(character.magicPower){const cell=document.createElement('span');cell.id='ally-magic-'+character.id;cell.className='ally-magic';actor.append(cell);}
      actor.append(vitals);
      const status = document.createElement('span');
      status.id = 'ally-status-' + character.id;
      status.className = 'ally-status';
      status.hidden = true;
      actor.append(status);
      const rolls = document.createElement('div');
      rolls.id = 'ally-rolls-' + character.id;
      rolls.className = 'ally-rolls';
      rolls.setAttribute('aria-live', 'polite');
      actor.append(rolls);
    }

    function render(id, { hp, maxHP, actionPoints, actionThreshold, runawayRate, status, deployed, magic, row, waiting }) {
      const hpCell = get('ally-hp-' + id), apCell = get('ally-ap-' + id), runawayCell = get('ally-runaway-' + id);
      for (const cell of [hpCell, apCell, runawayCell]) cell.hidden = !deployed;
      const statusText = [status, waiting ? '射程外' : ''].filter(Boolean).join(' · ');
      get('ally-status-' + id).hidden = !deployed || !statusText;
      get('ally-rolls-' + id).hidden = !deployed;
      setText('ally-status-' + id, statusText);
      setText('ally-hp-' + id, (row?(row==='rear'?'後衛 ':'前衛 '):'') + 'HP ' + format(hp) + ' / ' + format(maxHP));
      style(hpCell, '--hp-ratio', Math.max(0, Math.min(1, hp / maxHP)) * 100 + '%');
      const gauge = actionGauge(actionPoints, actionThreshold);
      const text = 'AP ' + format(gauge.current) + ' / ' + format(gauge.maximum);
      setText('ally-ap-' + id, text);
      style(apCell, '--ap-fill', String(gauge.percent / 100));
      attribute(apCell, 'aria-valuemax', String(gauge.maximum));
      attribute(apCell, 'aria-valuenow', String(Math.min(gauge.current, gauge.maximum)));
      attribute(apCell, 'aria-valuetext', text);
      if(magic){const cell=get('ally-magic-'+id);cell.hidden=!deployed;setText('ally-magic-'+id,'魔力 Lv.'+magic.current+' / '+magic.maximum);}
      setText('ally-runaway-' + id, '暴走率 ' + format(runawayRate) + '%');
      runawayCell.classList.toggle('critical', runawayRate >= 100);
    }
    return { mount, render };
  }
  const api = { actionGauge, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggBattleHUD = api;
})(typeof window !== 'undefined' ? window : globalThis);
