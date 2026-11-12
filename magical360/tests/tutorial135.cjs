const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.join(__dirname,'..');
for(const [,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^?]+)\?/g)){if(file!=='game.js')vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));}
const make=()=>new Miload.Game(1,{tutorial:true,story:true});
const fade=g=>{for(let i=0;i<80&&g.state==='sceneFade';i++)g.step(1/120,{});};
// Completing a lesson must not impose the overworld's 3.6-second silence.
{const g=make();g.tickStory(0);assert.equal(g.story.id,'home-start');g.finishStory();assert.equal(g.storyGap,0);g.room=1;g.loadTutorial();g.tickStory(0);assert.equal(g.story.id,'home-step');}
{const g=make();g.room=2;g.loadTutorial();g.finishedStories.add('home-step');g.tickStory(0);assert.equal(g.story.id,'first-encounter');g.finishStory();fade(g);assert.equal(g.state,'encounter');g.finishEncounter();fade(g);assert.equal(g.story.id,'first-defense');g.finishStory();g.storySignals.add('firstHit');g.tickStory(0);assert.equal(g.story.id,'first-hit');g.storySignals.add('firstRestored');g.finishStory();g.tickStory(0);assert.equal(g.story.id,'cookie-restored');g.storySignals.add('firstEaten');g.finishStory();g.tickStory(0);assert.equal(g.story.id,'cookie-eaten');}
// Discover placed sweets at the viewport edge, with the garden-clear prerequisite intact.
{const g=make();g.area=1;g.loadTutorial();g.seenStories.add('garden-arrival');g.finishedStories.add('garden-arrival');g.camera=1940-Miload.CFG.width;g.tickStory(0);assert.equal(g.story,null);g.finishedStories.add('garden-after');g.seenStories.add('garden-after');g.camera-=1;g.tickStory(0);assert.equal(g.story,null);g.camera++;g.tickStory(0);assert.equal(g.story.id,'placed-find');g.finishStory();g.tickStory(0);assert.equal(g.story,null);g.storySignals.add('placedEaten');g.tickStory(0);assert.equal(g.story.id,'placed-eaten');}
{const g=make();g.storyGap=3.6;g.loadTutorial();assert.equal(g.storyGap,0);}
// Main chapters also start eligible dialogue without an artificial pause.
for(const chapter of [1,2,3,4]){const g=new Miload.Game(1,{chapter,story:true});g.story={id:'timing-test',blocking:false};g.finishStory();assert.equal(g.storyGap,0);}
console.log('PASS tutorial immediate lesson reactions, visible-object cues, prerequisites and main-chapter immediate reactions');
