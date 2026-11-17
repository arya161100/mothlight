// MOTHLIGHT — world.js
// The whole simulation: seven nights in the moon garden. The world owns the
// state and every rule; render.js only draws it, input.js only feeds it.
// A night is deterministic given (seed, input sequence): all randomness comes
// from the world's own RNG, never from Math.random or the clock.
//
// The loop, in one sentence: glowmoths drift in from the dark, follow the
// lanterns you drag, and pollinate the moonflowers they touch; bats hunt the
// moths but will not enter lantern light; bloom enough flowers before the
// night ends or lose a heart.

import { FLOWER_KINDS, NIGHTS, UPGRADES, LAYOUT, TUNING, defaultUpgrades, starsFor } from './config.js';
import { RNG } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_NIGHT_DONE = 'nightDone';
export const SCREEN_GAME_OVER = 'gameOver';
export const SCREEN_RESULTS = 'results';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export class MothlightWorld {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.events = [];
    this.state = this.freshState();
  }

  freshState() {
    return {
      screen: SCREEN_TITLE,
      night: 0,
      nightTime: 0,
      nightLength: NIGHTS[0].length,
      score: 0,
      petals: 0,
      totalBlooms: 0,
      goal: NIGHTS[0].goal,
      bloomsThisNight: 0,
      hearts: TUNING.heartsStart,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      mothsSaved: 0,
      mothsEaten: 0,
      flowers: [],
      moths: [],
      bats: [],
      lanterns: [],
      spawnQueue: [],
      message: { text: '', t: 0 },
      burst: { n: 0, t: 0 },
      chainBlooms: 0,
      burstAwarded: false,
      shop: { offered: [], bought: null },
      shopBoughtIds: [],
      upgrades: defaultUpgrades(),
      selectedLantern: 0,
      muted: false,
      nightStars: 0,
      stats: { blooms: 0, perfectNights: 0, bursts: 0 },
    };
  }

  // -- lifecycle ------------------------------------------------------------

  startGame() {
    const muted = this.state.muted;
    this.rng = new RNG(this.seed);
    this.state = this.freshState();
    this.state.muted = muted;
    this.startNight(0);
    this.events.push('start');
  }

  startNight(n) {
    const s = this.state;
    const night = NIGHTS[n];
    s.night = n;
    s.nightTime = 0;
    s.nightLength = night.length;
    s.goal = night.goal;
    s.bloomsThisNight = 0;
    s.combo = 0;
    s.comboTimer = 0;
    s.chainBlooms = 0;
    s.burstAwarded = false;
    s.burst = { n: 0, t: 0 };
    s.flowers = [];
    s.moths = [];
    s.bats = [];
    s.spawnQueue = [];
    s.shop = { offered: [], bought: null };
    s.screen = SCREEN_PLAY;
    this.nightStartSnapshot = {
      score: s.score,
      petals: s.petals,
      hearts: s.hearts,
      totalBlooms: s.totalBlooms,
      mothsSaved: s.mothsSaved,
      mothsEaten: s.mothsEaten,
    };
    this.plantFlowers(night);
    this.placeLanterns();
    this.scheduleSpawns(night);
    s.message = { text: `Night ${n + 1} — bloom ${night.goal} of ${night.flowers} flowers`, t: 3 };
  }

  restartNight() {
    const snap = this.nightStartSnapshot;
    if (!snap) {
      this.startGame();
      return;
    }
    const s = this.state;
    s.score = snap.score;
    s.petals = snap.petals;
    s.hearts = snap.hearts;
    s.totalBlooms = snap.totalBlooms;
    s.mothsSaved = snap.mothsSaved;
    s.mothsEaten = snap.mothsEaten;
    this.startNight(s.night);
    this.events.push('restart');
  }

  // Retry after game over: the failed night again, with one heart to stand on.
  tryAgain() {
    const s = this.state;
    const snap = this.nightStartSnapshot;
    if (snap) {
      s.score = snap.score;
      s.petals = snap.petals;
      s.totalBlooms = snap.totalBlooms;
      s.mothsSaved = snap.mothsSaved;
      s.mothsEaten = snap.mothsEaten;
    }
    s.hearts = 1;
    this.startNight(s.night);
    this.events.push('restart');
  }

  toResults() {
    this.state.screen = SCREEN_RESULTS;
    this.events.push('results');
  }

  // -- setup ----------------------------------------------------------------

  plantFlowers(night) {
    const s = this.state;
    const g = LAYOUT.garden;
    const need = Math.max(1, night.visits - s.upgrades.visitReduction);
    let placed = 0;
    let guard = 0;
    while (placed < night.flowers && guard < 400) {
      guard += 1;
      const x = this.rng.range(g.x + 70, g.x + g.w - 70);
      const y = this.rng.range(g.y + 70, g.y + g.h - 90);
      let ok = true;
      for (const f of s.flowers) {
        if (dist(x, y, f.x, f.y) < TUNING.flowerMinGap) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      s.flowers.push({
        id: placed,
        x,
        y,
        visits: 0,
        need,
        bloomed: false,
        kind: this.rng.pick(FLOWER_KINDS),
        phase: this.rng.range(0, TAU),
      });
      placed += 1;
    }
  }

  placeLanterns() {
    const s = this.state;
    const count = 2 + s.upgrades.extraLanterns;
    const radius = TUNING.lanternRadius * s.upgrades.lightRadiusMul;
    s.lanterns = [];
    for (let i = 0; i < count; i += 1) {
      const start = LAYOUT.lanternStarts[i] || { x: 640, y: 600 };
      s.lanterns.push({ id: i, x: start.x, y: start.y, radius, grabbed: false, tx: start.x, ty: start.y });
    }
    s.selectedLantern = 0;
  }

  scheduleSpawns(night) {
    const s = this.state;
    const queue = [];
    // Moths drift in across the whole night, a little jittered.
    for (let i = 0; i < night.moths; i += 1) {
      const t = 1 + (i / night.moths) * (night.length - 8) + this.rng.range(-1.5, 1.5);
      queue.push({ t: Math.max(0.5, t), kind: 'moth' });
    }
    // Bats arrive once the night is under way, spread across the dark.
    for (let i = 0; i < night.bats; i += 1) {
      const t = 14 + (i / Math.max(1, night.bats)) * (night.length - 30) + this.rng.range(-2, 2);
      queue.push({ t: Math.max(10, t), kind: 'bat' });
    }
    queue.sort((a, b) => a.t - b.t);
    s.spawnQueue = queue;
  }

  // -- input ----------------------------------------------------------------

  selectLantern(i) {
    const s = this.state;
    if (i >= 0 && i < s.lanterns.length) s.selectedLantern = i;
  }

  nudgeSelected(dx, dy, dt) {
    const s = this.state;
    if (s.screen !== SCREEN_PLAY) return;
    const l = s.lanterns[s.selectedLantern];
    if (!l) return;
    const g = LAYOUT.garden;
    l.tx = clamp(l.tx + dx * TUNING.lanternNudgeSpeed * dt, g.x + 20, g.x + g.w - 20);
    l.ty = clamp(l.ty + dy * TUNING.lanternNudgeSpeed * dt, g.y + 20, g.y + g.h - 20);
  }

  grabLanternAt(x, y) {
    const s = this.state;
    if (s.screen !== SCREEN_PLAY) return false;
    let best = null;
    let bestD = TUNING.lanternGrabRadius + 30;
    for (const l of s.lanterns) {
      const d = dist(x, y, l.x, l.y);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    if (best) {
      best.grabbed = true;
      s.selectedLantern = best.id;
      best.tx = best.x;
      best.ty = best.y;
      return true;
    }
    return false;
  }

  dragTo(x, y) {
    const s = this.state;
    const g = LAYOUT.garden;
    for (const l of s.lanterns) {
      if (l.grabbed) {
        l.tx = clamp(x, g.x + 20, g.x + g.w - 20);
        l.ty = clamp(y, g.y + 20, g.y + g.h - 20);
      }
    }
  }

  releaseLantern() {
    for (const l of this.state.lanterns) l.grabbed = false;
  }

  // -- shop -----------------------------------------------------------------

  offerShop() {
    const s = this.state;
    const owned = new Set(s.shopBoughtIds || []);
    const available = UPGRADES.filter((u) => !owned.has(u.id));
    const shuffled = this.rng.shuffle(available);
    s.shop.offered = shuffled.slice(0, 3).map((u) => u.id);
    s.shop.bought = null;
  }

  buyUpgrade(id) {
    const s = this.state;
    if (s.screen !== SCREEN_NIGHT_DONE) return false;
    if (s.shop.bought) return false;
    if (!s.shop.offered.includes(id)) return false;
    const up = UPGRADES.find((u) => u.id === id);
    if (!up || s.petals < up.cost) return false;
    s.petals -= up.cost;
    up.apply(s.upgrades);
    s.shop.bought = id;
    s.shopBoughtIds.push(id);
    // The Extra Heart upgrade heals the garden at once.
    if (id === 'extra-heart') {
      s.hearts = Math.min(TUNING.heartsMax, s.hearts + 1);
    }
    this.events.push('buy');
    return true;
  }

  skipShop() {
    const s = this.state;
    if (s.screen !== SCREEN_NIGHT_DONE) return;
    s.shop.bought = 'skipped';
    this.events.push('click');
  }

  nextNight() {
    const s = this.state;
    if (s.screen !== SCREEN_NIGHT_DONE) return;
    if (s.night + 1 >= NIGHTS.length) {
      this.toResults();
      return;
    }
    this.startNight(s.night + 1);
  }

  // -- the frame ------------------------------------------------------------

  step(dt, input) {
    const s = this.state;
    this.handleDiscrete(input, dt);
    if (s.screen !== SCREEN_PLAY) {
      if (s.message.t > 0) s.message.t -= dt;
      if (s.burst.t > 0) s.burst.t -= dt;
      return;
    }
    this.simulate(dt);
  }

  handleDiscrete(input, dt) {
    const s = this.state;
    if (!input) return;
    if (input.mute) {
      s.muted = !s.muted;
      this.events.push('mute');
    }
    if (input.pause && (s.screen === SCREEN_PLAY || s.screen === SCREEN_PAUSED)) {
      s.screen = s.screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      this.events.push('click');
      return;
    }
    if (input.restart && (s.screen === SCREEN_PLAY || s.screen === SCREEN_PAUSED)) {
      this.restartNight();
      return;
    }
    if (input.confirm) {
      if (s.screen === SCREEN_TITLE) {
        this.startGame();
        return;
      }
      if (s.screen === SCREEN_NIGHT_DONE) {
        this.nextNight();
        return;
      }
      if (s.screen === SCREEN_GAME_OVER) {
        this.tryAgain();
        return;
      }
      if (s.screen === SCREEN_RESULTS) {
        this.startGame();
        return;
      }
    }
    if (input.select !== null && input.select !== undefined) this.selectLantern(input.select);
    if (input.nudge) this.nudgeSelected(input.nudge.x, input.nudge.y, dt);
    if (input.grab) this.grabLanternAt(input.grab.x, input.grab.y);
    if (input.drag) this.dragTo(input.drag.x, input.drag.y);
    if (input.release) this.releaseLantern();
    if (input.click) this.handleClick(input.click.x, input.click.y);
  }

  handleClick(x, y) {
    const s = this.state;
    if (s.screen === SCREEN_NIGHT_DONE) {
      for (let i = 0; i < LAYOUT.shopCards.length; i += 1) {
        const c = LAYOUT.shopCards[i];
        const id = s.shop.offered[i];
        if (id && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          this.buyUpgrade(id);
          return;
        }
      }
      const next = LAYOUT.buttons.nextNight;
      if (x >= next.x && x <= next.x + next.w && y >= next.y && y <= next.y + next.h) {
        this.nextNight();
        return;
      }
      const skip = LAYOUT.buttons.skipShop;
      if (x >= skip.x && x <= skip.x + skip.w && y >= skip.y && y <= skip.y + skip.h) {
        this.skipShop();
      }
      return;
    }
    if (s.screen === SCREEN_GAME_OVER) {
      const b = LAYOUT.buttons.tryAgain;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this.tryAgain();
      return;
    }
    if (s.screen === SCREEN_RESULTS) {
      const b = LAYOUT.buttons.playAgain;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this.startGame();
    }
  }

  simulate(dt) {
    const s = this.state;
    s.nightTime += dt;
    if (s.message.t > 0) s.message.t -= dt;
    if (s.burst.t > 0) s.burst.t -= dt;
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) {
        s.combo = 0;
        s.chainBlooms = 0;
        s.burstAwarded = false;
      }
    }
    // Lanterns glide toward their targets (pointer or keyboard nudge) at a
    // capped speed — never a teleporting lerp. Leading moths is slow work:
    // while a moth follows a lantern, that lantern moves no faster than its
    // followers can fly, or the trail would be lost every drag.
    for (const l of s.lanterns) {
      const dx = l.tx - l.x;
      const dy = l.ty - l.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) continue;
      const hasFollower = s.moths.some(
        (m) => m.state === 'following' && m.lanternId === l.id && dist(m.x, m.y, l.x, l.y) < 260,
      );
      const maxSpeed = hasFollower ? TUNING.lanternLeadSpeed : TUNING.lanternSpeed;
      const stepLen = Math.min(d, maxSpeed * dt);
      l.x += (dx / d) * stepLen;
      l.y += (dy / d) * stepLen;
    }
    // Spawn what the schedule says is due.
    while (s.spawnQueue.length > 0 && s.spawnQueue[0].t <= s.nightTime) {
      const job = s.spawnQueue.shift();
      if (job.kind === 'moth') this.spawnMoth();
      else this.spawnBat();
    }
    this.updateMoths(dt);
    this.updateBats(dt);
    // The night ends when the clock runs out; stragglers simply fly home.
    if (s.nightTime >= s.nightLength) this.endNight();
  }

  spawnMoth() {
    const s = this.state;
    const g = LAYOUT.garden;
    const edge = this.rng.int(0, 3);
    let x = g.x + 40;
    let y = g.y + 40;
    if (edge === 0) {
      x = this.rng.range(g.x + 30, g.x + g.w - 30);
      y = g.y + TUNING.spawnEdgeMargin;
    } else if (edge === 1) {
      x = this.rng.range(g.x + 30, g.x + g.w - 30);
      y = g.y + g.h - TUNING.spawnEdgeMargin;
    } else if (edge === 2) {
      x = g.x + TUNING.spawnEdgeMargin;
      y = this.rng.range(g.y + 30, g.y + g.h - 30);
    } else {
      x = g.x + g.w - TUNING.spawnEdgeMargin;
      y = this.rng.range(g.y + 30, g.y + g.h - 30);
    }
    s.moths.push({
      id: s.moths.length + s.mothsSaved + s.mothsEaten + 1,
      x,
      y,
      vx: 0,
      vy: 0,
      state: 'wandering',
      lanternId: null,
      wanderAngle: this.rng.range(0, TAU),
      speed: TUNING.mothSpeed * s.upgrades.mothSpeedMul,
      trail: [],
      leaveX: 0,
      leaveY: 0,
    });
  }

  spawnBat() {
    const s = this.state;
    const g = LAYOUT.garden;
    const fromLeft = this.rng.chance(0.5);
    s.bats.push({
      id: s.bats.length + 1,
      x: fromLeft ? g.x + 10 : g.x + g.w - 10,
      y: this.rng.range(g.y + 60, g.y + g.h - 120),
      vx: 0,
      vy: 0,
      state: 'hunting',
      targetId: null,
      huntTime: 0,
    });
  }

  nearestLantern(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const l of this.state.lanterns) {
      const d = dist(x, y, l.x, l.y);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    return { lantern: best, d: bestD };
  }

  updateMoths(dt) {
    const s = this.state;
    const g = LAYOUT.garden;
    for (const m of s.moths) {
      // Remember the trail for the renderer (last 14 positions).
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 14) m.trail.shift();
      if (m.state === 'leaving') {
        const d = dist(m.x, m.y, m.leaveX, m.leaveY);
        if (d < 8) {
          m.gone = true;
          this.events.push('leave');
          continue;
        }
        const vx = ((m.leaveX - m.x) / d) * TUNING.mothLeaveSpeed;
        const vy = ((m.leaveY - m.y) / d) * TUNING.mothLeaveSpeed;
        m.x += vx * dt;
        m.y += vy * dt;
        continue;
      }
      const near = this.nearestLantern(m.x, m.y);
      // A moth notices a lantern a little beyond the edge of its light:
      // the light pool is the lure, so the reach grows with the lantern.
      const attract = near.lantern ? near.lantern.radius + TUNING.attractBonus : 0;
      if (near.lantern && near.d < attract) {
        // Follow the light: steer toward the lantern, fast enough to keep
        // up with a lantern that is leading (see the speed cap above).
        m.state = 'following';
        m.lanternId = near.lantern.id;
        const d = Math.max(1, near.d);
        const sp = m.speed;
        m.vx = ((near.lantern.x - m.x) / d) * sp;
        m.vy = ((near.lantern.y - m.y) / d) * sp;
      } else {
        m.state = 'wandering';
        m.lanternId = null;
        m.wanderAngle += this.rng.range(-1.4, 1.4) * dt;
        m.vx = Math.cos(m.wanderAngle) * TUNING.mothWanderSpeed;
        m.vy = Math.sin(m.wanderAngle) * TUNING.mothWanderSpeed;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      // The garden holds its moths: soft walls, never a trap.
      m.x = clamp(m.x, g.x + 12, g.x + g.w - 12);
      m.y = clamp(m.y, g.y + 12, g.y + g.h - 12);
      // Pollination: touching an unbloomed flower feeds it one visit.
      for (const f of s.flowers) {
        if (f.bloomed) continue;
        if (dist(m.x, m.y, f.x, f.y) < TUNING.mothFlowerRadius) {
          this.pollinate(m, f);
          break;
        }
      }
    }
    s.moths = s.moths.filter((m) => !m.gone);
  }

  pollinate(m, f) {
    const s = this.state;
    f.visits += 1;
    this.events.push('pollinate');
    if (f.visits >= f.need) {
      this.bloomFlower(f);
    }
    // The moth's work is done: it flies home over the nearest garden edge.
    m.state = 'leaving';
    const g = LAYOUT.garden;
    const dl = m.x - g.x;
    const dr = g.x + g.w - m.x;
    const dtp = m.y - g.y;
    const db = g.y + g.h - m.y;
    const min = Math.min(dl, dr, dtp, db);
    if (min === dl) {
      m.leaveX = g.x - 20;
      m.leaveY = m.y;
    } else if (min === dr) {
      m.leaveX = g.x + g.w + 20;
      m.leaveY = m.y;
    } else if (min === dtp) {
      m.leaveX = m.x;
      m.leaveY = g.y - 20;
    } else {
      m.leaveX = m.x;
      m.leaveY = g.y + g.h + 20;
    }
    s.mothsSaved += 1;
    s.score += TUNING.mothLeavePoints;
  }

  bloomFlower(f) {
    const s = this.state;
    f.bloomed = true;
    s.bloomsThisNight += 1;
    s.totalBlooms += 1;
    s.stats.blooms += 1;
    if (s.comboTimer > 0) s.combo = Math.min(s.combo + 1, TUNING.comboMax);
    else s.combo = 1;
    s.comboTimer = TUNING.comboWindow;
    s.chainBlooms += 1;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
    const gained = TUNING.bloomPoints * s.combo;
    s.score += gained;
    s.petals += s.upgrades.petalsPerBloom;
    if (s.chainBlooms >= 3 && !s.burstAwarded) {
      s.burstAwarded = true;
      s.burst = { n: s.chainBlooms, t: 1.8 };
      s.score += TUNING.burstBonus;
      s.stats.bursts += 1;
      this.events.push('burst');
      s.message = { text: `BLOOM BURST x${s.chainBlooms}! +${TUNING.burstBonus}`, t: 2 };
    } else {
      this.events.push('bloom');
    }
  }

  updateBats(dt) {
    const s = this.state;
    const g = LAYOUT.garden;
    for (const b of s.bats) {
      // A lantern's light drives a bat off: it flees the nearest lantern.
      // The ward reaches a little beyond the light pool itself.
      const near = this.nearestLantern(b.x, b.y);
      const repel = near.lantern
        ? near.lantern.radius * s.upgrades.batRepelMul + TUNING.batRepelBonus
        : 0;
      if (near.lantern && near.d < repel) {
        b.state = 'fleeing';
        const d = Math.max(1, near.d);
        const sp = TUNING.batSpeed * s.upgrades.batSpeedMul;
        b.vx = ((b.x - near.lantern.x) / d) * sp;
        b.vy = ((b.y - near.lantern.y) / d) * sp;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      } else {
        b.state = 'hunting';
        // Hunt the nearest moth that is still in the garden.
        let target = null;
        let bestD = Infinity;
        for (const m of s.moths) {
          if (m.state === 'leaving') continue;
          const d = dist(b.x, b.y, m.x, m.y);
          if (d < bestD) {
            bestD = d;
            target = m;
          }
        }
        if (target) {
          // A bat that chases one moth for too long gives up and leaves:
          // the keeper can always save a moth by keeping it moving.
          if (b.targetId !== target.id) {
            b.targetId = target.id;
            b.huntTime = 0;
          }
          b.huntTime += dt;
          if (b.huntTime > 7) {
            b.gone = true;
            continue;
          }
          const sp = TUNING.batSpeed * s.upgrades.batSpeedMul;
          b.vx = ((target.x - b.x) / bestD) * sp;
          b.vy = ((target.y - b.y) / bestD) * sp;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (bestD < TUNING.batEatRadius) {
            this.eatMoth(target);
          }
        } else {
          // No moth to hunt: drift slowly across the garden.
          b.x += Math.sin(b.y * 0.01) * 20 * dt;
          b.y += 12 * dt;
        }
      }
      b.x = clamp(b.x, g.x - 30, g.x + g.w + 30);
      b.y = clamp(b.y, g.y - 20, g.y + g.h + 20);
    }
    s.bats = s.bats.filter((b) => !b.gone);
  }

  eatMoth(m) {
    const s = this.state;
    m.gone = true;
    s.mothsEaten += 1;
    s.score = Math.max(0, s.score - TUNING.eatPenalty);
    s.combo = 0;
    s.comboTimer = 0;
    s.chainBlooms = 0;
    s.burstAwarded = false;
    s.message = { text: 'A bat snatched a moth!', t: 2 };
    this.events.push('eat');
  }

  endNight() {
    const s = this.state;
    const night = NIGHTS[s.night];
    const met = s.bloomsThisNight >= s.goal;
    s.nightStars = starsFor(s.night, s.bloomsThisNight);
    if (met) {
      // Clearing a night restores one heart (never above the maximum).
      s.hearts = Math.min(TUNING.heartsMax, s.hearts + 1);
      s.petals += TUNING.nightClearPetals;
      if (s.bloomsThisNight >= night.flowers) s.stats.perfectNights += 1;
      s.message = { text: `Night ${s.night + 1} clear! +${TUNING.nightClearPetals} petals`, t: 3 };
    } else {
      s.hearts -= 1;
      s.message = { text: `Night ${s.night + 1} fell short — the garden dims.`, t: 3 };
    }
    this.events.push(met ? 'nightDone' : 'nightFail');
    // The last night ends the trial, whatever happened.
    if (s.night + 1 >= NIGHTS.length) {
      if (s.hearts <= 0) {
        s.screen = SCREEN_GAME_OVER;
        this.events.push('gameOver');
      } else {
        this.toResults();
      }
      return;
    }
    if (s.hearts <= 0) {
      s.screen = SCREEN_GAME_OVER;
      this.events.push('gameOver');
      return;
    }
    s.screen = SCREEN_NIGHT_DONE;
    this.offerShop();
  }
}
