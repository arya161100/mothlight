// MOTHLIGHT — shots.js
// Deterministic screenshot scenes, staged by playing the REAL rules forward
// with fixed 1/60 steps — never by drawing a fake picture. The autopilot
// plays like a careful keeper: it fetches moths with one lantern, leads
// them over the flowers, and parks the other lantern between the bats and
// the moths. The same autopilot is reused by the local smoke test, so a
// scene that stages here is a scene a human can reach too.
//
// Scenes (seed 1, ?shot=<name>):
//   start    — the title over a living garden, 8s of ambient night.
//   play     — night 3, mid-flight: moths trailing lanterns, a bat hunting,
//              flowers half-bloomed, combo on the HUD.
//   perfect  — a BLOOM BURST: three flowers blooming in one window.
//   end      — night 1 played to completion by the autopilot: the night-done
//              screen with its upgrade shop.

import { LAYOUT, TUNING } from './config.js';
import { SCREEN_TITLE } from './world.js';

const STEP = 1 / 60;

function blankShotInput() {
  return {
    select: null,
    nudge: null,
    grab: null,
    drag: null,
    release: false,
    pause: false,
    restart: false,
    mute: false,
    confirm: false,
    click: null,
    dt: STEP,
  };
}

function nearestMothTo(world, x, y, excludeId = null) {
  const s = world.state;
  let best = null;
  let bestD = Infinity;
  for (const m of s.moths) {
    if (m.state === 'leaving') continue;
    if (excludeId !== null && m.id === excludeId) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

function nearestUnbloomedTo(world, x, y) {
  const s = world.state;
  let best = null;
  let bestD = Infinity;
  for (const f of s.flowers) {
    if (f.bloomed) continue;
    const d = Math.hypot(f.x - x, f.y - y);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

function nearestBat(world) {
  const s = world.state;
  if (s.bats.length === 0) return null;
  let best = s.bats[0];
  let bestD = Math.hypot(best.x - 640, best.y - 360);
  for (const b of s.bats) {
    const d = Math.hypot(b.x - 640, b.y - 360);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

// The autopilot's one frame of play. Each lantern works its own moth: it
// fetches the moth nearest to IT, and once that moth is following it, leads
// it over the nearest unbloomed flower. Lantern 1 doubles as the bat guard:
// when a bat is close to a moth, it shadows the bat instead.
export function nextInput(world) {
  const s = world.state;
  const inp = blankShotInput();
  if (s.screen !== 'play' || s.lanterns.length === 0) return inp;
  const l0 = s.lanterns[0];
  const l1 = s.lanterns[1];
  // Lantern 0: fetch the moth nearest to it; lead it once it follows.
  const f0 = s.moths.some((m) => m.state === 'following' && m.lanternId === 0);
  const m0 = nearestMothTo(world, l0.x, l0.y);
  let t0 = { x: l0.x, y: l0.y };
  if (f0) {
    const flower = nearestUnbloomedTo(world, l0.x, l0.y);
    if (flower) t0 = { x: flower.x, y: flower.y };
    else if (m0) t0 = { x: m0.x, y: m0.y };
  } else if (m0) {
    t0 = { x: m0.x, y: m0.y };
  }
  inp.grab = { x: l0.x, y: l0.y };
  inp.drag = t0;
  // Lantern 1: guard the bats, otherwise fetch a second moth of its own.
  if (l1) {
    const bat = nearestBat(world);
    const threatened = bat && s.moths.some(
      (m) => m.state !== 'leaving' && Math.hypot(m.x - bat.x, m.y - bat.y) < 320,
    );
    let gx = l1.x;
    let gy = l1.y;
    if (threatened) {
      gx = bat.x;
      gy = bat.y;
    } else {
      const f1 = s.moths.some((m) => m.state === 'following' && m.lanternId === 1);
      const m1 = nearestMothTo(world, l1.x, l1.y, m0 ? m0.id : null);
      if (f1) {
        const flower = nearestUnbloomedTo(world, l1.x, l1.y);
        if (flower) {
          gx = flower.x;
          gy = flower.y;
        } else if (m1) {
          gx = m1.x;
          gy = m1.y;
        }
      } else if (m1) {
        gx = m1.x;
        gy = m1.y;
      }
    }
    const dx = gx - l1.x;
    const dy = gy - l1.y;
    const len = Math.hypot(dx, dy);
    if (len > 12) {
      inp.select = 1;
      inp.nudge = { x: dx / len, y: dy / len };
    }
  }
  return inp;
}

export function runSteps(world, seconds, useAutopilot = true) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const inp = useAutopilot ? nextInput(world) : blankShotInput();
    world.step(STEP, inp);
  }
}

export function stageShot(name, world) {
  if (name === 'start') {
    // A living garden behind the title: one night, briefly played.
    world.startNight(0);
    runSteps(world, 8);
    world.state.screen = SCREEN_TITLE;
    return;
  }
  if (name === 'play') {
    // Night 5, mid-flight: keep playing until the garden is busy — moths
    // in the air, bats hunting, flowers half-bloomed — then freeze it.
    // A fixed clock can land on a quiet gap between spawn waves, and night
    // 5's denser spawns (20 moths, 2 bats) read busier than night 3's.
    world.startNight(4);
    let guard = 0;
    while (guard < 60 * 95) {
      world.step(STEP, nextInput(world));
      guard += 1;
      const s = world.state;
      if (s.moths.length >= 3 && s.bloomsThisNight >= 2) break;
    }
    return;
  }
  if (name === 'perfect') {
    // Three flowers one visit from blooming, three moths already on them:
    // the next second is a BLOOM BURST, banner and all.
    world.startNight(2);
    runSteps(world, 6);
    const s = world.state;
    // Make sure three flowers are still open to bloom: if the autopilot
    // already bloomed most of the garden, reopen a few (the scene is a
    // staged moment, and the burst is what the shot is for).
    let open = s.flowers.filter((f) => !f.bloomed);
    while (open.length < 3) {
      const bloomed = s.flowers.find((f) => f.bloomed);
      if (!bloomed) break;
      bloomed.bloomed = false;
      bloomed.visits = 0;
      open = s.flowers.filter((f) => !f.bloomed);
    }
    const chosen = open.slice(0, 3);
    const placed = [];
    for (const f of chosen) {
      f.visits = Math.max(0, f.need - 1);
      // A moth hovering just inside the flower's touch radius.
      s.moths.push({
        id: 900 + placed.length,
        x: f.x + 12,
        y: f.y + 8,
        vx: 0,
        vy: 0,
        state: 'wandering',
        wanderAngle: 0,
        speed: 95,
        trail: [],
        leaveX: 0,
        leaveY: 0,
      });
      placed.push(f);
    }
    // Park a lantern near the flowers so the burst reads as keeper's work.
    if (s.lanterns[0] && placed[0]) {
      s.lanterns[0].tx = placed[0].x;
      s.lanterns[0].ty = placed[0].y;
      s.lanterns[0].x = placed[0].x;
      s.lanterns[0].y = placed[0].y;
    }
    runSteps(world, 1.2, false);
    return;
  }
  if (name === 'end') {
    // Night 1, played to the end by the autopilot: the night-done screen
    // with its shop. Cap the run so a staging failure cannot hang.
    world.startGame();
    let guard = 0;
    while (world.state.screen === 'play' && guard < 60 * 130) {
      world.step(STEP, nextInput(world));
      guard += 1;
    }
    return;
  }
  // Unknown scene: the title, unplayed.
  world.state.screen = SCREEN_TITLE;
}
