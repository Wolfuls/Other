const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
for (const file of ['content', 'chapter2-content', 'engine', 'chapter2', 'presentation', 'sfx', 'continues', 'chapter3-content', 'chapter3']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', file + '.js'), 'utf8'));
}
const make = options => new Miload.Game(12622, { story: false, ...options });
const tick = (g, seconds, input = {}) => { for (let i = 0; i < Math.round(seconds * 120); i++) g.step(1 / 120, input); };
{
  const g = make();
  assert.deepEqual([g.life, g.maxLife, g.stocks, g.happiness, g.inventory], [3, 3, 2, 0, ['star']]);
  assert.equal(make({ debug: true }).life, 3);
  assert.deepEqual(g.platforms, new Miload.Game(981, { story: false }).platforms);
  g.happiness = 99;
  g.collectSweet(g.sweet(0, 0, 'cookie', null));
  assert.equal(g.happiness, 99);
  g.player.inv = 0;
  assert.ok(g.hurt(300));
  assert.equal(g.life, 2);
  assert.equal(g.happiness, 99);
  g.collectSweet(g.sweet(0, 0, 'candy', null));
  assert.equal(g.life, 3);
  assert.equal(g.happiness, 0);
}
{
  const g = make();
  const e = g.enemies[0];
  g.transform(e, 'star');
  assert.equal(e.candyTime, 5);
  assert.equal(g.defeated, 0);
  g.player.inv = 999;
  tick(g, 5.1);
  assert.equal(e.state, 'alive');
  assert.equal(e.hp, e.maxHp);
  g.transform(e, 'star');
  g.collectSweet(e.sweet);
  assert.equal(e.state, 'dead');
  assert.equal(g.defeated, 1);
}
{
  const g = make();
  g.life = 1;
  g.maxLife = 10;
  g.drops = [{ type: 'heart', x: g.player.x, y: g.player.y + 10, cooldown: 0 }];
  g.interact();
  assert.equal(g.maxLife, 11);
  assert.equal(g.life, 2);
  g.stage = 1;
  g.loadStage();
  assert.ok(!g.drops.some(d => d.type === 'heart'));
}
{
  for (const chapter of [1, 2]) {
    const g = make({ chapter });
    g.player.x = g.exit.x;
    g.player.y = g.exit.y + g.exit.h - g.player.h;
    assert.ok(g.enterDoor());
    tick(g, 3);
    assert.equal(g.stage, 1);
    assert.equal(g.stocks, 2);
  }
  const g = make({ tutorial: true });
  g.life = 8; g.maxLife = 8; g.happiness = 80; g.inventory = ['sugar', 'homing'];
  g.transition = { t: 0, loaded: false, chapter: 1, stage: 0, area: 0 };
  g.state = 'transition';
  tick(g, 3);
  assert.equal(g.chapter, 1);
  assert.equal(g.state, 'playing');
  assert.deepEqual([g.life, g.maxLife, g.happiness, g.inventory, g.upgrades], [3, 3, 0, ['star'], {}]);
}
console.log('PASS initial lives, debug lives, fixed terrain, healing, candy expiry, uncapped heart containers, stage progress and tutorial reset');

