(function (root) {
  'use strict';

  function create({ get, setText, format }) {
    const attribute = (node, key, value) => { if (node.getAttribute(key) !== value) node.setAttribute(key, value); };
    const style = (node, key, value) => { if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value); };
    function mount(character, actor, document) {
      const vitals = document.createElement('div');
      vitals.className = 'ally-vitals';
      for (const [kind, className] of [['hp', 'ally-health'], ['runaway', 'ally-runaway']]) {
        const cell = document.createElement('span');
        cell.id = 'ally-' + kind + '-' + character.id;
        cell.className = className;
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

    function render(id, { hp, maxHP, actionValue, turnShare, runawayRate, status, deployed, magic, row, waiting }) {
      const hpCell = get('ally-hp-' + id), runawayCell = get('ally-runaway-' + id);
      for (const cell of [hpCell, runawayCell]) cell.hidden = !deployed;
      const statusText = [status, waiting ? '射程外' : ''].filter(Boolean).join(' · ');
      get('ally-status-' + id).hidden = !deployed || !statusText;
      get('ally-rolls-' + id).hidden = !deployed;
      setText('ally-status-' + id, statusText);
      setText('ally-hp-' + id, (row?(row==='rear'?'後衛 ':'前衛 '):'') + 'HP ' + format(hp) + ' / ' + format(maxHP));
      style(hpCell, '--hp-ratio', Math.max(0, Math.min(1, hp / maxHP)) * 100 + '%');
      if(magic){const cell=get('ally-magic-'+id);cell.hidden=!deployed;setText('ally-magic-'+id,'魔力 Lv.'+magic.current+' / '+magic.maximum);}
      setText('ally-runaway-' + id, '暴走率 ' + format(runawayRate) + '%');
      runawayCell.classList.toggle('critical', runawayRate >= 100);
    }
    return { mount, render };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggBattleHUD = api;
})(typeof window !== 'undefined' ? window : globalThis);
