(function(__YggBig){
(function (root) {
  'use strict';

  const hpPercent=(hp,maxHP)=>{const n=(__YggBig.gt(maxHP,0))?(__YggBig.max(0,(__YggBig.min(100,(__YggBig.mul((__YggBig.div(hp,maxHP)),100)))))):0;return (__YggBig.gt(n,0))&&(__YggBig.lt(n,.1))?'<0.1%':(__YggBig.add(Number((__YggBig.toFixed(n,1))),'%'));};
  function create({ get, setText, format }) {
    const attribute = (node, key, value) => { if ((__YggBig.ne(node.getAttribute(key),value))) node.setAttribute(key, value); };
    const style = (node, key, value) => { if ((__YggBig.ne(node.style.getPropertyValue(key),value))) node.style.setProperty(key, value); };
    function mount(character, actor, document) {
      const vitals = document.createElement('div');
      vitals.className = 'ally-vitals';
      for (const [kind, className] of [['hp', 'ally-health'], ['runaway', 'ally-runaway']]) {
        const cell = document.createElement('span');
        cell.id = (__YggBig.add((__YggBig.add((__YggBig.add('ally-',kind)),'-')),character.id));
        cell.className = className;
        vitals.append(cell);
      }
      if(character.magicPower){const cell=document.createElement('span');cell.id=(__YggBig.add('ally-magic-',character.id));cell.className='ally-magic';actor.append(cell);}
      actor.append(vitals);
      const status = document.createElement('span');
      status.id = (__YggBig.add('ally-status-',character.id));
      status.className = 'ally-status';
      status.hidden = true;
      actor.append(status);
      const rolls = document.createElement('div');
      rolls.id = (__YggBig.add('ally-rolls-',character.id));
      rolls.className = 'ally-rolls';
      rolls.setAttribute('aria-live', 'polite');
      actor.append(rolls);
    }

    function render(id, { hp, maxHP, actionValue, turnShare, runawayRate, status, deployed, magic, row, waiting }) {
      const hpCell = get((__YggBig.add('ally-hp-',id))), runawayCell = get((__YggBig.add('ally-runaway-',id)));
      for (const cell of [hpCell, runawayCell]) cell.hidden = !deployed;
      const statusText = [status, waiting ? '射程外' : ''].filter(Boolean).join(' · ');
      get((__YggBig.add('ally-status-',id))).hidden = !deployed || !statusText;
      get((__YggBig.add('ally-rolls-',id))).hidden = !deployed;
      setText((__YggBig.add('ally-status-',id)), statusText);
      setText((__YggBig.add('ally-hp-',id)), (__YggBig.add((__YggBig.add(row?(row==='rear'?'後衛 ':'前衛 '):'','HP ')),hpPercent(hp,maxHP))));
      style(hpCell, '--hp-ratio', (__YggBig.add((__YggBig.mul((__YggBig.max(0,(__YggBig.min(1,(__YggBig.div(hp,maxHP)))))),100)),'%')));
      if(magic){const cell=get((__YggBig.add('ally-magic-',id)));cell.hidden=!deployed;setText((__YggBig.add('ally-magic-',id)),(__YggBig.add((__YggBig.add((__YggBig.add('魔力 Lv.',magic.current)),' / ')),magic.maximum)));}
      setText((__YggBig.add('ally-runaway-',id)), (__YggBig.add((__YggBig.add('暴走率 ',format(runawayRate))),'%')));
      runawayCell.classList.toggle('critical', (__YggBig.ge(runawayRate,100)));
    }
    return { mount, render };
  }
  const api = { create, hpPercent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggBattleHUD = api;
})(typeof window !== 'undefined' ? window : globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
