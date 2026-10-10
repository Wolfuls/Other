(function (root) {
  'use strict';
  const MAX_PROJECTILES = 120;
  const MAX_STEPS = 120, FLIGHT_MS = 320;
  const PROJECTILE_FLIGHT_MS = 560;
  // Pure visual variation; values never enter HP, dice, rewards or action points.
  function impactMotion(random = Math.random) {
    const between = (min, max) => min + (max - min) * random();
    const direction = [-1, 0, 1][Math.min(2, Math.floor(random() * 3))];
    const spin = direction || (random() < .5 ? -1 : 1);
    return {
      x:between(-22, 22), y:between(-14, 14),
      recoilX:spin * between(7, 17), recoilY:between(-9, -3), recoilAngle:spin * between(3, 8),
      driftX:between(-20, 20), floatRise:between(48, 72),
      fallDirection:direction < 0 ? 'left' : direction > 0 ? 'right' : 'down',
      fallX:direction ? direction * between(42, 88) : between(-12, 12),
      fallY:between(65, 105), popY:between(-26, -10),
      fallAngle:spin * between(direction ? 32 : 8, direction ? 82 : 24),
      fallScale:between(.65, .85), fallMs:Math.round(between(420, 620))
    };
  }
  function metaAttackCount(events) {
    return events.reduce((sum, e) => sum + (e.type !== 'attack'||e.continuation||e.poisonTick ? 0 : e.actorId === 'meta' ? (e.count || 1) : (e.metaAttacks || 0)), 0);
  }
  // One sprite per attack normally. Extreme rates share up to 12 labelled
  // sprites, preserving the whole count without allocating millions of nodes.
  function projectileGroups(count, available = MAX_PROJECTILES, summarized = false) {
    if (!Number.isFinite(count) || count < 1 || available < 1) return [];
    count = Math.floor(count);
    const slots = Math.min(MAX_PROJECTILES, Math.floor(available));
    // A planned summary already represents one of at most 12 visual steps.
    // Do not expand every summary into another 12 projectiles (12 × 12).
    if (summarized) return slots ? [count] : [];
    const size = count <= slots ? count : Math.min(12, slots);
    const base = Math.floor(count / size), remainder = count - base * size;
    return Array.from({ length: size }, (_, i) => base + (i < remainder ? 1 : 0));
  }
  const actorReleases=(frame,id)=>(frame[id+'Attacks']||0)+(id==='max'?(frame.maxTransfers||0):0);
  const volleySpan = count => Math.min(720, Math.max(0, count - 1) * 120);
  function mergeFrames(frames) {
    const first = frames[0], last = frames[frames.length - 1];
    const merged = { ...last, magicLevel:Math.max(0,...frames.map(f=>f.magicLevel||0)), summons:frames.flatMap(f=>f.summons||[]), hit:frames.some(f=>f.hit!==false),doubleHit:frames.some(f=>f.doubleHit),smashCritical:frames.reduce((n,f)=>n+(f.smashCritical||0),0),poisonBefore:first.poisonBefore, hpBefore:first.hpBefore, approximate:true, knockoutRoll:null, supportOnly:frames.every(f=>f.supportOnly),poisonTick:frames.every(f=>f.poisonTick) };
    for (const field of ['count', 'damage', 'metaAttacks', 'richterAttacks', 'vishunalAttacks', 'tordelieseAttacks','maxAttacks','wakuAttacks','jewelAttacks','mitsuruAttacks','queenAttacks','meguminAttacks','maxTransfers', 'clears', 'knockouts', 'overkills', 'overkillBonus', 'reward']) merged[field] = frames.reduce((n, f) => n + (f[field]||0), 0);
    merged.actor = frames.every(f => f.actor === first.actor) ? first.actor : 'パーティ';
    merged.volleyMetaCount = Math.max(merged.metaAttacks, ...frames.map(f => f.volleyMetaCount));
    merged.volleyRichterCount = Math.max(merged.richterAttacks, ...frames.map(f => f.volleyRichterCount));
    merged.volleyVishunalCount = Math.max(merged.vishunalAttacks, ...frames.map(f => f.volleyVishunalCount));
    merged.volleyTordelieseCount = Math.max(merged.tordelieseAttacks, ...frames.map(f => f.volleyTordelieseCount||0));
    merged.volleyMitsuruCount=Math.max(actorReleases(merged,'mitsuru'),...frames.map(f=>f.volleyMitsuruCount||0));
    merged.volleyQueenCount=Math.max(actorReleases(merged,'queen'),...frames.map(f=>f.volleyQueenCount||0));
    merged.volleyMeguminCount=Math.max(actorReleases(merged,'megumin'),...frames.map(f=>f.volleyMeguminCount||0));
    merged.volleyJewelCount=Math.max(actorReleases(merged,'jewel'),...frames.map(f=>f.volleyJewelCount||0));
    merged.volleyWakuCount=Math.max(actorReleases(merged,'waku'),...frames.map(f=>f.volleyWakuCount||0));
    merged.volleyMaxCount=Math.max(actorReleases(merged,'max'),...frames.map(f=>f.volleyMaxCount||0));
    return merged;
  }
  function compact(frames) {
    if (frames.length <= MAX_STEPS) return frames;
    // HP and AP are distinct resources, even when a very fast party shares a
    // visual summary. Keep at most two summaries per chunk, in arrival order.
    return Array.from({length:12}, (_, i) => {
      const chunk=frames.slice(Math.floor(i*frames.length/12),Math.floor((i+1)*frames.length/12));
      const kind=frame=>String(!!frame.apDamage)+':'+(['stab','shoot','spark','kick'].includes(frame.motion)?frame.motion:'normal');
      const kinds=[...new Set(chunk.map(kind))];
      return kinds.map(key=>mergeFrames(chunk.filter(frame=>kind(frame)===key)));
    }).flat();
  }
  function plan(events, { sustainedActors = [] } = {}) {
    const raw = [], volleyMetaCount = metaAttackCount(events);
    const volleyRichterCount = events.reduce((n,e) => n + (e.type !== 'attack' || e.continuation ? 0 : e.actorId === 'richter' ? (e.count || 1) : (e.richterAttacks || 0)), 0);
    const volleyVishunalCount = events.reduce((n,e)=>n+(e.type!=='attack'||e.continuation?0:e.actorId==='vishunal'?(e.count||1):(e.vishunalAttacks||0)),0);
    const volleyTordelieseCount = events.reduce((n,e)=>n+(e.type!=='attack'||e.continuation||e.poisonTick?0:e.actorId==='tordeliese'?(e.count||1):(e.tordelieseAttacks||0)),0);
    const volleyMitsuruCount=events.reduce((n,e)=>n+(e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='mitsuru'?(e.count||1):(e.mitsuruAttacks||0)),0);
    const volleyQueenCount=events.reduce((n,e)=>n+(e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='queen'?(e.count||1):(e.queenAttacks||0)),0);
    const volleyMeguminCount=events.reduce((n,e)=>n+(e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='megumin'?(e.count||1):(e.meguminAttacks||0)),0);
    const volleyJewelCount=events.reduce((n,e)=>n+(e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='jewel'?(e.count||1):(e.jewelAttacks||0)),0);
    const volleyWakuCount=events.reduce((n,e)=>n+(e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='waku'?(e.count||1):(e.wakuAttacks||0)),0);
    const volleyMaxCount=events.reduce((n,e)=>n+(e.maxTransfers||0)+(e.type!=='attack'||e.poisonTick||e.continuation?0:e.actorId==='max'?(e.count||1):(e.maxAttacks||0)),0);
    for (const e of events) {
      if (e.type === 'attack' || e.type === 'support') raw.push({ ...e, supportOnly:e.type==='support',damage:e.damage||0,maxTransfers:e.maxTransfers||0,count:e.count || 1, metaAttacks:e.continuation||e.poisonTick?0:e.actorId === 'meta' ? (e.count || 1) : (e.metaAttacks || 0),
        richterAttacks:e.continuation ? 0 : e.actorId === 'richter' ? (e.count || 1) : (e.richterAttacks || 0),
        vishunalAttacks:e.continuation ? 0 : e.actorId === 'vishunal' ? (e.count || 1) : (e.vishunalAttacks || 0),
        tordelieseAttacks:e.poisonTick||e.continuation?0:e.actorId==='tordeliese'?(e.count||1):(e.tordelieseAttacks||0),
        mitsuruAttacks:e.poisonTick||e.continuation?0:e.actorId==='mitsuru'?(e.count||1):(e.mitsuruAttacks||0),volleyMitsuruCount,
        queenAttacks:e.poisonTick||e.continuation?0:e.actorId==='queen'?(e.count||1):(e.queenAttacks||0),volleyQueenCount,
        meguminAttacks:e.poisonTick||e.continuation?0:e.actorId==='megumin'?(e.count||1):(e.meguminAttacks||0),volleyMeguminCount,
        jewelAttacks:e.poisonTick||e.continuation?0:e.actorId==='jewel'?(e.count||1):(e.jewelAttacks||0),volleyJewelCount,
        wakuAttacks:e.type==='support'||e.poisonTick||e.continuation?0:e.actorId==='waku'?(e.count||1):(e.wakuAttacks||0),volleyWakuCount,
        maxAttacks:e.type==='support'||e.poisonTick||e.continuation?0:e.actorId==='max'?(e.count||1):(e.maxAttacks||0),volleyMaxCount,
        clears:0, knockouts:0, overkills:0, overkillBonus:0, reward:0, volleyMetaCount, volleyRichterCount, volleyVishunalCount, volleyTordelieseCount, endHP:e.hpAfter });
      else if(e.type==='enemySummon'&&raw.length){(raw[raw.length-1].summons??=[]).push(e);}
      else if(e.type==='enemyRemoved'&&raw.length){raw[raw.length-1].removed=true;}
      else if (e.type === 'clear' && raw.length) {
        const frame = raw[raw.length - 1];
        frame.clears += e.count || 1; frame.reward += e.reward;
        frame.knockouts += e.reason === 'knockout' ? (e.count || 1) : (e.knockouts || 0);
        frame.overkills += e.overkills || 0;
        frame.overkillBonus += e.overkillBonus || 0;
        frame.endHP = e.frontHP??e.hpAfter;frame.frontHP=e.frontHP??frame.frontHP;
      }
    }
    let frames = raw.flatMap(frame => {
      // A high-rate HP summary already refers to one individual target.
      // Keep it one labelled projectile instead of expanding each slot again.
      if (frame.count === 1 || frame.approximate) return [frame];
      const groups = projectileGroups(frame.count), size = groups.length;
      const integers = Object.fromEntries(['metaAttacks','richterAttacks','vishunalAttacks','tordelieseAttacks','maxAttacks','wakuAttacks','jewelAttacks','mitsuruAttacks','queenAttacks','meguminAttacks','maxTransfers','clears','knockouts','overkills'].map(key => [key, projectileGroups(frame[key], size)]));
      // Distribute summaries without inventing individual rolls or HP states.
      return groups.map((count, i) => ({ ...frame, summons:i===size-1?frame.summons:[], count, damage:frame.damage / size, reward:frame.reward / size,
        overkillBonus:frame.overkills ? frame.overkillBonus*(integers.overkills[i]||0)/frame.overkills : 0,
        metaAttacks:integers.metaAttacks[i] || 0, richterAttacks:integers.richterAttacks[i] || 0, vishunalAttacks:integers.vishunalAttacks[i] || 0, tordelieseAttacks:integers.tordelieseAttacks[i] || 0, maxAttacks:integers.maxAttacks[i] || 0, wakuAttacks:integers.wakuAttacks[i] || 0, jewelAttacks:integers.jewelAttacks[i] || 0, mitsuruAttacks:integers.mitsuruAttacks[i] || 0, queenAttacks:integers.queenAttacks[i] || 0, meguminAttacks:integers.meguminAttacks[i] || 0, maxTransfers:integers.maxTransfers[i] || 0, clears:integers.clears[i] || 0, knockouts:integers.knockouts[i] || 0, overkills:integers.overkills[i]||0,
        hpBefore:i === 0 ? frame.hpBefore : null, hpAfter:i === size - 1 ? frame.hpAfter : null,
        endHP:i === size - 1 ? frame.endHP : null, approximate:true }));
    });
    frames = compact(frames);
    if(sustainedActors.length){
      // Spread each actor's actual releases over its whole one-second charge
      // interval. Overflow impacts do not steal release slots from that actor.
      const slots=Object.fromEntries(['meta','richter','vishunal','tordeliese','max','waku','jewel','mitsuru','queen','megumin'].map(id=>[id,frames.filter(f=>actorReleases(f,id)>0).length]));
      const used={meta:0,richter:0,vishunal:0,tordeliese:0,max:0,waku:0,jewel:0,mitsuru:0,queen:0,megumin:0};let lastOffset=0;
      frames=frames.map((frame,index)=>{
        const actors=['meta','richter','vishunal','tordeliese','max','waku','jewel','mitsuru','queen','megumin'].filter(id=>actorReleases(frame,id)>0);
        let offset=lastOffset;
        if(actors.length){offset=Math.min(...actors.map(id=>used[id]*(sustainedActors.includes(id)?1000/slots[id]:120)));actors.forEach(id=>used[id]++);lastOffset=offset;}
        return {...frame,offset,index};
      }).sort((a,b)=>a.offset-b.offset||a.index-b.index);
      return frames.map((frame,i)=>({...frame,gap:i+1<frames.length?frames[i+1].offset-frame.offset:0}));
    }
    const count = frames.reduce((n, f) => n + f.count, 0), gap = frames.length > 1 ? volleySpan(count) / (frames.length - 1) : 120;
    return frames.map(frame => ({ ...frame, gap }));
  }
  // Simulation is immediate; this bounded queue only presents its ordered hits.
  // Independent defeat snapshots let every clear fall while the next target
  // is already arriving, rather than discarding clears during a down animation.
  function createPlayback({ onLaunch, onImpact, onActorIdle = () => {}, onIdle = () => {}, schedule = setTimeout, cancel = clearTimeout }) {
    let queue = [], launchTimer = null, inFlight = 0,sequence=0,nextImpact=0;
    const readyImpacts=new Map();
    const timers = new Set(), releases = { meta:0, richter:0, vishunal:0, tordeliese:0,max:0,waku:0,jewel:0,mitsuru:0,queen:0,megumin:0 };
    function later(fn, delay) { const id = schedule(() => { timers.delete(id); fn(); }, delay); timers.add(id); return id; }
    function trackReleases(frame, delays) {
      // onLaunch returns the time until each actor's last projectile leaves.
      // End its pose independently of in-flight hits, overflow and other actors.
      for (const actor of ['meta', 'richter', 'vishunal', 'tordeliese','max','waku','jewel','mitsuru','queen','megumin']) {
        if (!actorReleases(frame,actor)) continue;
        releases[actor]++;
        const delay = Number.isFinite(delays?.[actor]) ? Math.max(0, delays[actor]) : 0;
        later(() => {
          releases[actor]--;
          if (!releases[actor] && !queue.some(queued => actorReleases(queued,actor) > 0)) onActorIdle(actor);
        }, delay);
      }
    }
    function pump() {
      launchTimer = null;
      if (!queue.length) return;
      if (inFlight >= MAX_STEPS) { launchTimer = later(pump, 8); return; }
      const frame = queue.shift(),order=sequence++; inFlight++;
      const timing=onLaunch(frame);
      trackReleases(frame, timing);
      later(() => {
        readyImpacts.set(order,frame);
        // A short poison effect may be ready before a longer throw reaches
        // its target. Commit hits in order so DOT never defeats the next enemy.
        while(readyImpacts.has(nextImpact)){const ready=readyImpacts.get(nextImpact);readyImpacts.delete(nextImpact++);inFlight--;onImpact(ready);}
        if(!queue.length&&!inFlight&&launchTimer===null)onIdle();
      }, Number.isFinite(timing?.impact)?timing.impact:FLIGHT_MS);
      if (queue.length) launchTimer = later(pump, frame.gap);
    }
    return {
      enqueue(events, options) {
        queue.push(...plan(events,options));
        if (queue.length > MAX_STEPS) {
          queue = compact(queue);
          const gap = volleySpan(queue.reduce((n,f) => n + f.count, 0)) / Math.max(1, queue.length - 1);
          queue.forEach(frame => { frame.gap = gap; });
        }
        if (queue.length && launchTimer === null) pump();
      },
      reset() { for (const id of timers) cancel(id); timers.clear(); readyImpacts.clear();sequence=nextImpact=0;releases.meta = releases.richter = releases.vishunal = releases.tordeliese = releases.max = releases.waku = releases.jewel = releases.mitsuru = releases.queen = releases.megumin = 0; queue = []; inFlight = 0; launchTimer = null; },
      get pending() { return queue.length + inFlight; }
    };
  }
  const meguminExplosionSize=magic=>480+Math.max(0,Math.min(7,Math.floor(Number(magic)||0)))*120;
  const meguminExplosionY=(targetY,targetHeight)=>targetY+targetHeight*.42+40;
  const api = { meguminExplosionY, meguminExplosionSize, MAX_PROJECTILES, MAX_STEPS, FLIGHT_MS, PROJECTILE_FLIGHT_MS, impactMotion, metaAttackCount, projectileGroups, volleySpan, plan, createPlayback };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YggCombatEffects = api;
})(typeof window !== 'undefined' ? window : globalThis);

