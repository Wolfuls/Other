'use strict';
const E=require('../js/engine');
// Explicit fresh/focused targets for arithmetic tests. Runtime combat never
// resets enemies this way; full per-slot lifecycles have their own tests.
function freshTarget(s,hp=E.getSession(s).hp){s.enemies=null;s.hp=hp;s.poisonDamage=0;s.respawnSeconds=0;s.focusedEnemyId=null;const es=E.ensureEnemies(s);E.selectEnemy(s,es[0].id);return es;}
module.exports={freshTarget};
