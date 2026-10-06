'use strict';
// Isolate pre-existing outgoing-combat, economy and visual tests from incoming attacks.
// Enemy AI, survival and simultaneous sessions are covered by combat-v0450.test.cjs.
for(const q of require('../js/data.js').sessions){q.action=0;delete q.actionDice;}
