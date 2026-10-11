const combatFixture=require('./combat-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const UI=require('../js/display.js'),E=require('../js/engine.js'),{harness}=require('./app-harness.cjs');
test('sprite sheet has four cells and compact orbit chords and ring gaps clear the opaque body',()=>{
 const png=fs.readFileSync(path.join(__dirname,'../img/richter-creature-idle-v1.png'));assert.equal(png.readUInt32BE(16),384);assert.equal(png.readUInt32BE(20),96);
 for(const mobile of [false,true])for(const count of [1,12,32,60])for(const scale of [1,2.15]){
  const l=UI.creatureOrbit(count,scale,mobile);assert.equal(l.rings.reduce((n,r)=>n+r[0],0),count);let previous=0;
  for(const[amount,percentage]of l.rings){const radius=l.width*percentage/100;if(amount>1)assert.ok(2*radius*Math.sin(Math.PI/amount)>=l.size*.9);if(previous)assert.ok(radius-previous>=l.size*.9);previous=radius;}
 }
});
test('floating symbols remain omitted after loading an old ON preference',()=>{const s=combatFixture(1000);s.paused=true;s.levels.richter=33;s.options.showOrbits=true;const h=harness(s);assert.equal(h.get('richter-orbits').children.length,0);assert.equal(h.get('meta-orbits').children.length,0);h.advance(200);assert.equal(h.get('richter-orbits').children.length,0);});
