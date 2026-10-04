const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const UI=require('../js/display.js'),E=require('../js/engine.js'),{harness}=require('./app-harness.cjs');
test('sprite sheet has four cells and compact orbit chords and ring gaps clear the opaque body',()=>{
 const png=fs.readFileSync(path.join(__dirname,'../img/richter-creature-idle-v1.png'));assert.equal(png.readUInt32BE(16),384);assert.equal(png.readUInt32BE(20),96);
 for(const mobile of [false,true])for(const count of [1,12,32,60])for(const scale of [1,2.15]){
  const l=UI.creatureOrbit(count,scale,mobile);assert.equal(l.rings.reduce((n,r)=>n+r[0],0),count);let previous=0;
  for(const[amount,percentage]of l.rings){const radius=l.width*percentage/100;if(amount>1)assert.ok(2*radius*Math.sin(Math.PI/amount)>=l.size*.9);if(previous)assert.ok(radius-previous>=l.size*.9);previous=radius;}
 }
});
test('four-frame sprites keep independent phases, survive ordinary ticks, and disappear with orbit option',()=>{
 const s=E.createState(1000);s.paused=true;s.levels.richter=2;s.actionLevels.richter=32;const h=harness(s),orbits=h.get('richter-orbits');
 const slots=orbits.children.flatMap(r=>r.children),sprites=slots.map(s=>s.firstElementChild.firstElementChild);assert.equal(sprites.length,33);assert.ok(sprites.every(s=>s.className.includes('richter-creature')));
 assert.ok(new Set(sprites.map(s=>s.style.getPropertyValue('--creature-idle-delay'))).size>4);h.advance(200);assert.equal(orbits.firstElementChild.children[0],slots[0]);
 h.get('option-orbits').checked=false;h.get('option-orbits').listeners.get('change')();assert.equal(orbits.children.length,0);
});
