(function (root) {
  'use strict';
  const tracks = [
    { id: 'action', name: '行動力', base: '基礎行動力' },
    { id: 'accuracy', name: '命中強度', base: '命中力' },
    { id: 'evasion', name: '回避強度', base: '回避力' },
    { id: 'power', name: '攻撃強度', base: '攻撃力' },
    { id: 'vitality', name: 'HP強度', base: '基礎HP' },
    { id: 'armor', name: '防御強度', base: '防御 / 抵抗' }
  ];

  // Both dialogs share this geometry; only the values and optional controls differ.
  function rows({ baseCell, valueCell, controls = () => '', hp = '', ss, enemy = false }) {
    return tracks.map(track => {
      const row = '<section class="ability-row ability-' + track.id + '"><div class="ability-base"><span>' + track.base + '</span>' + baseCell(track) + '</div><div class="ability-main"><div class="ability-label"><span>' + track.name + '</span></div>' + valueCell(track) + (track.id === 'vitality' ? hp : '') + '</div>' + controls(track) + '</section>';
      if (track.id === 'accuracy') return '<div class="ability-judgments' + (enemy ? ' enemy-judgments' : '') + '">' + row + '<div class="ability-base ss-cell"><span>SS</span>' + ss + '</div>';
      return row + (track.id === 'evasion' ? '</div>' : '');
    }).join('');
  }
  // Display units only. Combat continues to use the engine's strength values.
  const strengthLevel = (strength, config) => Math.min(1e100, Math.max(0, 1 + (strength / config.strengthBase - 1) / config.personalGrowth));
  const api = { tracks, rows, strengthLevel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggAbilityView = api;
})(typeof window !== 'undefined' ? window : globalThis);
