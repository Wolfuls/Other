(function(__YggBig){
(function (root) {
  'use strict';
  const MAX_PROJECTILES = 120;
  const MAX_STEPS = 120, FLIGHT_MS = 320;
  const PROJECTILE_FLIGHT_MS = 560;
  // Pure visual variation; values never enter HP, dice, rewards or action points.
  function impactMotion(random = Math.random) {
    const between = (min, max) => (__YggBig.add(min,(__YggBig.mul((__YggBig.sub(max,min)),random()))));
    const direction = [(__YggBig.neg(1)), 0, 1][(__YggBig.min(2,(__YggBig.floor((__YggBig.mul(random(),3))))))];
    const spin = direction || ((__YggBig.lt(random(),.5)) ? (__YggBig.neg(1)) : 1);
    return {
      x:between((__YggBig.neg(22)), 22), y:between((__YggBig.neg(14)), 14),
      recoilX:(__YggBig.mul(spin,between(7, 17))), recoilY:between((__YggBig.neg(9)), (__YggBig.neg(3))), recoilAngle:(__YggBig.mul(spin,between(3, 8))),
      driftX:between((__YggBig.neg(20)), 20), floatRise:between(48, 72),
      fallDirection:(__YggBig.lt(direction,0)) ? 'left' : (__YggBig.gt(direction,0)) ? 'right' : 'down',
      fallX:direction ? (__YggBig.mul(direction,between(42, 88))) : between((__YggBig.neg(12)), 12),
      fallY:between(65, 105), popY:between((__YggBig.neg(26)), (__YggBig.neg(10))),
      fallAngle:(__YggBig.mul(spin,between(direction ? 32 : 8, direction ? 82 : 24))),
      fallScale:between(.65, .85), fallMs:(__YggBig.round(between(420, 620)))
    };
  }
  function metaAttackCount(events) {
    return events.reduce((sum, e) => (__YggBig.add(sum,e.type !== 'attack'||e.continuation||e.poisonTick ? 0 : e.actorId === 'meta' ? (e.count || 1) : (e.metaAttacks || 0))), 0);
  }
  // One sprite per attack normally. Extreme rates share up to 12 labelled
  // sprites, preserving the whole count without allocating millions of nodes.
  function projectileGroups(count, available = MAX_PROJECTILES, summarized = false) {
    if (!(__YggBig.isFinite(count)) || (__YggBig.lt(count,1)) || (__YggBig.lt(available,1))) return [];
    count = (__YggBig.floor(count));
    const slots = (__YggBig.min(MAX_PROJECTILES,(__YggBig.floor(available))));
    // A planned summary already represents one of at most 12 visual steps.
    // Do not expand every summary into another 12 projectiles (12 × 12).
    if (summarized) return slots ? [count] : [];
    const size = (__YggBig.le(count,slots)) ? count : (__YggBig.min(12,slots));
    const base = (__YggBig.floor((__YggBig.div(count,size)))), remainder = (__YggBig.sub(count,(__YggBig.mul(base,size))));
    return Array.from({ length: size }, (_, i) => (__YggBig.add(base,(__YggBig.lt(i,remainder)) ? 1 : 0)));
  }
  const actorReleases=(frame,id)=>(__YggBig.add(frame[(__YggBig.add(id,'Attacks'))]||0,id==='max'?(frame.maxTransfers||0):0));
  const volleySpan = count => (__YggBig.min(720,(__YggBig.mul((__YggBig.max(0,(__YggBig.sub(count,1)))),120))));
  function mergeFrames(frames) {
    const first = frames[0], last = frames[(__YggBig.sub(frames.length,1))];
    const merged = { ...last, pomAssisted:frames.some(f=>f.pomAssisted||(__YggBig.gt(f.pomDice,0))), magicLevel:(__YggBig.max(0,...frames.map(f=>f.magicLevel||0))), summons:frames.flatMap(f=>f.summons||[]), hit:frames.some(f=>f.hit!==false),doubleHit:frames.some(f=>f.doubleHit),smashCritical:frames.reduce((n,f)=>(__YggBig.add(n,f.smashCritical||0)),0),poisonBefore:first.poisonBefore, hpBefore:first.hpBefore, approximate:true, knockoutRoll:null, supportOnly:frames.every(f=>f.supportOnly),poisonTick:frames.every(f=>f.poisonTick) };
    for (const field of ['count', 'damage', 'metaAttacks', 'richterAttacks', 'vishunalAttacks', 'maxAttacks','wakuAttacks','jewelAttacks','mitsuruAttacks','queenAttacks','meguminAttacks','maxTransfers', 'clears', 'knockouts', 'overkills', 'overkillBonus', 'reward']) merged[field] = frames.reduce((n, f) => (__YggBig.add(n,f[field]||0)), 0);
    if(frames.every(f=>f.actionSlow))merged.damage=(__YggBig.max(0,...frames.map(f=>f.damage||0)));
    merged.actor = frames.every(f => (__YggBig.eq(f.actor,first.actor))) ? first.actor : 'パーティ';
    merged.volleyMetaCount = (__YggBig.max(merged.metaAttacks,...frames.map(f => f.volleyMetaCount)));
    merged.volleyRichterCount = (__YggBig.max(merged.richterAttacks,...frames.map(f => f.volleyRichterCount)));
    merged.volleyVishunalCount = (__YggBig.max(merged.vishunalAttacks,...frames.map(f => f.volleyVishunalCount)));
    merged.volleyMitsuruCount=(__YggBig.max(actorReleases(merged,'mitsuru'),...frames.map(f=>f.volleyMitsuruCount||0)));
    merged.volleyQueenCount=(__YggBig.max(actorReleases(merged,'queen'),...frames.map(f=>f.volleyQueenCount||0)));
    merged.volleyMeguminCount=(__YggBig.max(actorReleases(merged,'megumin'),...frames.map(f=>f.volleyMeguminCount||0)));
    merged.volleyJewelCount=(__YggBig.max(actorReleases(merged,'jewel'),...frames.map(f=>f.volleyJewelCount||0)));
    merged.volleyWakuCount=(__YggBig.max(actorReleases(merged,'waku'),...frames.map(f=>f.volleyWakuCount||0)));
    merged.volleyMaxCount=(__YggBig.max(actorReleases(merged,'max'),...frames.map(f=>f.volleyMaxCount||0)));
    return merged;
  }
  function compact(frames) {
    if ((__YggBig.le(frames.length,MAX_STEPS))) return frames;
    // HP damage and action debuffs are distinct effects, even when a very fast party shares a
    // visual summary. Keep at most two summaries per chunk, in arrival order.
    return Array.from({length:12}, (_, i) => {
      const chunk=frames.slice((__YggBig.floor((__YggBig.div((__YggBig.mul(i,frames.length)),12)))),(__YggBig.floor((__YggBig.div((__YggBig.mul((__YggBig.add(i,1)),frames.length)),12)))));
      const kind=frame=>(__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add((__YggBig.add(frame.actor==='炎上'?'burn':frame.poisonTick?'poison':'direct',':')),String(!!frame.apDamage))),':')),frame.hit===false?'miss':frame.elementMultiplier??1)),':')),['stab','shoot','spark','kick'].includes(frame.motion)?frame.motion:'normal'));
      const kinds=[...new Set(chunk.map(kind))];
      return kinds.map(key=>mergeFrames(chunk.filter(frame=>(__YggBig.eq(kind(frame),key)))));
    }).flat();
  }
  function plan(events, { sustainedActors = [] } = {}) {
    const raw = [], volleyMetaCount = metaAttackCount(events);
    const volleyRichterCount = events.reduce((n,e) => (__YggBig.add(n,e.type !== 'attack' || e.continuation ? 0 : e.actorId === 'richter' ? (e.count || 1) : (e.richterAttacks || 0))), 0);
    const volleyVishunalCount = events.reduce((n,e)=>(__YggBig.add(n,e.type!=='attack'||e.continuation?0:e.actorId==='vishunal'?(e.count||1):(e.vishunalAttacks||0))),0);
    const volleyMitsuruCount=events.reduce((n,e)=>(__YggBig.add(n,e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='mitsuru'?(e.count||1):(e.mitsuruAttacks||0))),0);
    const volleyQueenCount=events.reduce((n,e)=>(__YggBig.add(n,e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='queen'?(e.count||1):(e.queenAttacks||0))),0);
    const volleyMeguminCount=events.reduce((n,e)=>(__YggBig.add(n,e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='megumin'?(e.count||1):(e.meguminAttacks||0))),0);
    const volleyJewelCount=events.reduce((n,e)=>(__YggBig.add(n,e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='jewel'?(e.count||1):(e.jewelAttacks||0))),0);
    const volleyWakuCount=events.reduce((n,e)=>(__YggBig.add(n,e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='waku'?(e.count||1):(e.wakuAttacks||0))),0);
    const volleyMaxCount=events.reduce((n,e)=>(__YggBig.add((__YggBig.add(n,e.maxTransfers||0)),e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='max'?(e.count||1):(e.maxAttacks||0))),0);
    for (const e of events) {
      if (e.type === 'attack' || e.type === 'support') raw.push({ ...e, supportOnly:e.type==='support',damage:e.damage||0,maxTransfers:e.maxTransfers||0,count:e.count || 1, metaAttacks:e.continuation||e.poisonTick?0:e.actorId === 'meta' ? (e.count || 1) : (e.metaAttacks || 0),
        richterAttacks:e.continuation ? 0 : e.actorId === 'richter' ? (e.count || 1) : (e.richterAttacks || 0),
        vishunalAttacks:e.continuation ? 0 : e.actorId === 'vishunal' ? (e.count || 1) : (e.vishunalAttacks || 0),
        mitsuruAttacks:e.poisonTick||e.continuation?0:e.actorId==='mitsuru'?(e.count||1):(e.mitsuruAttacks||0),volleyMitsuruCount,
        queenAttacks:e.poisonTick||e.continuation?0:e.actorId==='queen'?(e.count||1):(e.queenAttacks||0),volleyQueenCount,
        meguminAttacks:e.poisonTick||e.continuation?0:e.actorId==='megumin'?(e.count||1):(e.meguminAttacks||0),volleyMeguminCount,
        jewelAttacks:e.poisonTick||e.continuation?0:e.actorId==='jewel'?(e.count||1):(e.jewelAttacks||0),volleyJewelCount,
        wakuAttacks:e.type==='support'||e.poisonTick||e.continuation?0:e.actorId==='waku'?(e.count||1):(e.wakuAttacks||0),volleyWakuCount,
        maxAttacks:e.type==='support'||e.poisonTick||e.continuation?0:e.actorId==='max'?(e.count||1):(e.maxAttacks||0),volleyMaxCount,
        clears:0, knockouts:0, overkills:0, overkillBonus:0, reward:0, volleyMetaCount, volleyRichterCount, volleyVishunalCount, endHP:e.hpAfter });
      else if(e.type==='enemySummon'&&raw.length){(raw[(__YggBig.sub(raw.length,1))].summons??=[]).push(e);}
      else if(e.type==='enemyRemoved'&&raw.length){raw[(__YggBig.sub(raw.length,1))].removed=true;}
      else if (e.type === 'clear' && raw.length) {
        const frame = raw[(__YggBig.sub(raw.length,1))];
        (__YggBig.assign(frame,"clears","add",()=>(e.count || 1))); (__YggBig.assign(frame,"reward","add",()=>(e.reward)));
        (__YggBig.assign(frame,"knockouts","add",()=>(e.reason === 'knockout' ? (e.count || 1) : (e.knockouts || 0))));
        (__YggBig.assign(frame,"overkills","add",()=>(e.overkills || 0)));
        (__YggBig.assign(frame,"overkillBonus","add",()=>(e.overkillBonus || 0)));
        frame.endHP = e.frontHP??e.hpAfter;frame.frontHP=e.frontHP??frame.frontHP;
      }
    }
    let frames = raw.flatMap(frame => {
      // A high-rate HP summary already refers to one individual target.
      // Keep it one labelled projectile instead of expanding each slot again.
      if ((__YggBig.eq(frame.count,1)) || frame.approximate) return [frame];
      const groups = projectileGroups(frame.count), size = groups.length;
      const integers = Object.fromEntries(['metaAttacks','richterAttacks','vishunalAttacks','maxAttacks','wakuAttacks','jewelAttacks','mitsuruAttacks','queenAttacks','meguminAttacks','maxTransfers','clears','knockouts','overkills'].map(key => [key, projectileGroups(frame[key], size)]));
      // Distribute summaries without inventing individual rolls or HP states.
      return groups.map((count, i) => ({ ...frame, summons:(__YggBig.eq(i,(__YggBig.sub(size,1))))?frame.summons:[], count, damage:(__YggBig.div(frame.damage,size)), reward:(__YggBig.div(frame.reward,size)),
        overkillBonus:frame.overkills ? (__YggBig.div((__YggBig.mul(frame.overkillBonus,integers.overkills[i]||0)),frame.overkills)) : 0,
        metaAttacks:integers.metaAttacks[i] || 0, richterAttacks:integers.richterAttacks[i] || 0, vishunalAttacks:integers.vishunalAttacks[i] || 0, maxAttacks:integers.maxAttacks[i] || 0, wakuAttacks:integers.wakuAttacks[i] || 0, jewelAttacks:integers.jewelAttacks[i] || 0, mitsuruAttacks:integers.mitsuruAttacks[i] || 0, queenAttacks:integers.queenAttacks[i] || 0, meguminAttacks:integers.meguminAttacks[i] || 0, maxTransfers:integers.maxTransfers[i] || 0, clears:integers.clears[i] || 0, knockouts:integers.knockouts[i] || 0, overkills:integers.overkills[i]||0,
        hpBefore:(__YggBig.eq(i,0)) ? frame.hpBefore : null, hpAfter:(__YggBig.eq(i,(__YggBig.sub(size,1)))) ? frame.hpAfter : null,
        endHP:(__YggBig.eq(i,(__YggBig.sub(size,1)))) ? frame.endHP : null, approximate:true }));
    });
    frames = compact(frames);
    if(sustainedActors.length){
      // Spread each actor's actual releases over its whole one-second charge
      // interval. Overflow impacts do not steal release slots from that actor.
      const slots=Object.fromEntries(['meta','richter','vishunal','max','waku','jewel','mitsuru','queen','megumin'].map(id=>[id,frames.filter(f=>(__YggBig.gt(actorReleases(f,id),0))).length]));
      const used={meta:0,richter:0,vishunal:0,max:0,waku:0,jewel:0,mitsuru:0,queen:0,megumin:0};let lastOffset=0;
      frames=frames.map((frame,index)=>{
        const actors=['meta','richter','vishunal','max','waku','jewel','mitsuru','queen','megumin'].filter(id=>(__YggBig.gt(actorReleases(frame,id),0)));
        let offset=lastOffset;
        if(actors.length){offset=(__YggBig.min(...actors.map(id=>(__YggBig.mul(used[id],sustainedActors.includes(id)?(__YggBig.div(1000,slots[id])):120)))));actors.forEach(id=>used[id]++);lastOffset=offset;}
        return {...frame,offset,index};
      }).sort((__YggBig.sort((a,b)=>(__YggBig.sub(a.offset,b.offset))||(__YggBig.sub(a.index,b.index)))));
      return frames.map((frame,i)=>({...frame,gap:(__YggBig.lt((__YggBig.add(i,1)),frames.length))?(__YggBig.sub(frames[(__YggBig.add(i,1))].offset,frame.offset)):0}));
    }
    const count = frames.reduce((n, f) => (__YggBig.add(n,f.count)), 0), gap = (__YggBig.gt(frames.length,1)) ? (__YggBig.div(volleySpan(count),(__YggBig.sub(frames.length,1)))) : 120;
    return frames.map(frame => ({ ...frame, gap }));
  }
  // Simulation is immediate; this bounded queue only presents its ordered hits.
  // Independent defeat snapshots let every clear fall while the next target
  // is already arriving, rather than discarding clears during a down animation.
  function createPlayback({ onLaunch, onImpact, onActorIdle = () => {}, onIdle = () => {}, schedule = setTimeout, cancel = clearTimeout }) {
    let queue = [], launchTimer = null, inFlight = 0,sequence=0,nextImpact=0;
    const readyImpacts=new Map();
    const timers = new Set(), releases = { meta:0, richter:0, vishunal:0, max:0,waku:0,jewel:0,mitsuru:0,queen:0,megumin:0 };
    function later(fn, delay) { const id = schedule(() => { timers.delete(id); fn(); }, delay); timers.add(id); return id; }
    function trackReleases(frame, delays) {
      // onLaunch returns the time until each actor's last projectile leaves.
      // End its pose independently of in-flight hits, overflow and other actors.
      for (const actor of ['meta', 'richter', 'vishunal', 'max','waku','jewel','mitsuru','queen','megumin']) {
        if (!actorReleases(frame,actor)) continue;
        releases[actor]++;
        const delay = (__YggBig.isFinite(delays?.[actor])) ? (__YggBig.max(0,delays[actor])) : 0;
        later(() => {
          releases[actor]--;
          if (!releases[actor] && !queue.some(queued => (__YggBig.gt(actorReleases(queued,actor),0)))) onActorIdle(actor);
        }, delay);
      }
    }
    function pump() {
      launchTimer = null;
      if (!queue.length) return;
      if ((__YggBig.ge(inFlight,MAX_STEPS))) { launchTimer = later(pump, 8); return; }
      const frame = queue.shift(),order=sequence++; inFlight++;
      const timing=onLaunch(frame);
      trackReleases(frame, timing);
      later(() => {
        readyImpacts.set(order,frame);
        // A short poison effect may be ready before a longer throw reaches
        // its target. Commit hits in order so DOT never defeats the next enemy.
        while(readyImpacts.has(nextImpact)){const ready=readyImpacts.get(nextImpact);readyImpacts.delete(nextImpact++);inFlight--;onImpact(ready);}
        if(!queue.length&&!inFlight&&launchTimer===null)onIdle();
      }, (__YggBig.isFinite(timing?.impact))?timing.impact:FLIGHT_MS);
      if (queue.length) launchTimer = later(pump, frame.gap);
    }
    return {
      enqueue(events, options) {
        queue.push(...plan(events,options));
        if ((__YggBig.gt(queue.length,MAX_STEPS))) {
          queue = compact(queue);
          const gap = (__YggBig.div(volleySpan(queue.reduce((n,f) => (__YggBig.add(n,f.count)), 0)),(__YggBig.max(1,(__YggBig.sub(queue.length,1))))));
          queue.forEach(frame => { frame.gap = gap; });
        }
        if (queue.length && launchTimer === null) pump();
      },
      reset() { for (const id of timers) cancel(id); timers.clear(); readyImpacts.clear();sequence=nextImpact=0;releases.meta = releases.richter = releases.vishunal = releases.max = releases.waku = releases.jewel = releases.mitsuru = releases.queen = releases.megumin = 0; queue = []; inFlight = 0; launchTimer = null; },
      get pending() { return (__YggBig.add(queue.length,inFlight)); }
    };
  }
  const meguminExplosionSize=magic=>(__YggBig.add(480,(__YggBig.mul((__YggBig.max(0,(__YggBig.min(7,(__YggBig.floor(Number(magic)||0)))))),120))));
  const meguminExplosionY=(targetY,targetHeight)=>(__YggBig.add((__YggBig.add(targetY,(__YggBig.mul(targetHeight,.42)))),40));
  function turnDuration(events){
    const frames=plan(events);let offset=0,end=0;
    for(const f of frames){
      const projectile=(f.metaAttacks||f.richterAttacks||f.vishunalAttacks||f.wakuAttacks||f.continuation||!f.actorId);
      const maxWindup=f.maxAttacks||f.maxTransfers?(__YggBig.add(670,(__YggBig.mul((__YggBig.max(0,(__YggBig.sub((__YggBig.min(24,(__YggBig.add(f.maxAttacks||0,f.maxTransfers||0)))),1)))),45)))):0;
      const impact=(__YggBig.max(['hayato','aniya'].includes(f.actorId)?560:0,f.meguminAttacks?720:0,f.queenAttacks||f.mitsuruAttacks?380:0,f.jewelAttacks?260:0,f.maxAttacks?(__YggBig.add(maxWindup,320)):0,projectile?(__YggBig.add(780,(__YggBig.mul((__YggBig.max(0,(__YggBig.sub((__YggBig.min(24,f.count)),1)))),45)))):0,f.poisonTick?560:0));
      const pose=(__YggBig.max(f.meguminAttacks?1400:0,f.maxTransfers||f.maxAttacks?1180:0,f.wakuAttacks?880:0,800));
      // Include the explosion, down/summon effect and damage text after impact.
      end=(__YggBig.max(end,(__YggBig.add(offset,pose)),(__YggBig.add((__YggBig.add(offset,impact)),f.meguminAttacks?1600:f.clears?1120:850))));(offset=(__YggBig.add(offset,f.gap)));
    }
    for(const e of events){
      if(e.type==='enemyWindup')end=(__YggBig.max(end,(__YggBig.add((__YggBig.mul(e.duration,1000)),1200))));
      if(e.type==='enemyRespawn')end=(__YggBig.max(end,650));
      if(e.type==='runawayRoll'||e.type==='runawaySymptom')end=(__YggBig.max(end,1800));
      if(e.type==='runawayDamage')end=(__YggBig.max(end,1150));
    }
    // One UI tick of slack covers presentation beginning after the engine call.
    return end?(__YggBig.min(30,(__YggBig.add((__YggBig.div(end,1000)),.1)))):events.some(e=>e.type==='timelineTurn')?.25:0;
  }
  // Battle-time impact deadline for one manual attack, independent of visibility.
  const manualImpactSeconds=(id,motion)=>({meta:.62,richter:.76,vishunal:.76,megumin:.72,mitsuru:.38,queen:.38,jewel:.26,waku:.67,max:.99}[id]??.56);
  const api = { manualImpactSeconds, turnDuration, meguminExplosionY, meguminExplosionSize, MAX_PROJECTILES, MAX_STEPS, FLIGHT_MS, PROJECTILE_FLIGHT_MS, impactMotion, metaAttackCount, projectileGroups, volleySpan, plan, createPlayback };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggCombatEffects = api;
})(typeof window !== 'undefined' ? window : globalThis);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
