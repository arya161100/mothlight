// MOTHLIGHT — main.js
// Boot and the game loop. Fixed timestep (1/60) with an accumulator, so the
// simulation advances the same way on any display. Input is read, the world
// steps, then the input's discrete flags are cleared — in that order, so a
// press is never eaten before the world sees it and never applied twice.
//
// ?shot=<name>&seed=<n> stages one screenshot scene, draws a single frame
// and stops: window.__shotReady tells the screenshot tool the frame is done.

import { MothlightWorld } from './world.js';
import { drawWorld } from './render.js';
import { createInput } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;

function seedFromQuery() {
  const q = new URLSearchParams(window.location.search);
  const seed = Number(q.get('seed'));
  return Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 1;
}

function shotFromQuery() {
  const q = new URLSearchParams(window.location.search);
  return q.get('shot');
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const world = new MothlightWorld(seedFromQuery());
const inputModule = createInput(canvas);
const audio = new SoundBank();
inputModule.attach();
window.__mothlight = { world };

// Sound for what the world did. The world records events; this drains them
// once per frame so each event sounds exactly once.
function drainEvents() {
  for (const e of world.events) {
    if (e === 'bloom') audio.bloom();
    else if (e === 'pollinate') audio.pollinate();
    else if (e === 'leave') audio.mothLeave();
    else if (e === 'eat') audio.eat();
    else if (e === 'burst') audio.burst();
    else if (e === 'buy') audio.buy();
    else if (e === 'click' || e === 'restart') audio.click();
    else if (e === 'nightDone' || e === 'results') audio.nightDone();
    else if (e === 'nightFail') audio.nightFail();
    else if (e === 'gameOver') audio.gameOver();
    else if (e === 'start') {
      audio.ensure();
      audio.startMusic();
    }
  }
  world.events.length = 0;
  // Mute is owned by the world; the sound bank follows it.
  if (audio.muted !== world.state.muted) audio.toggleMute();
}

// First gesture unlocks audio (browsers require one before any sound).
function unlockAudio() {
  if (audio.ensure()) audio.startMusic();
}
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

const shot = shotFromQuery();
if (shot) {
  // Screenshot mode: stage, draw one frame, stop. No loop, no audio.
  stageShot(shot, world);
  drawWorld(ctx, world, world.state.nightTime);
  window.__shotReady = true;
} else {
  // Live mode: the loop.
  let last = performance.now();
  let acc = 0;
  let clock = 0;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += dt;
    let stepped = false;
    while (acc >= STEP) {
      world.step(STEP, inputModule.input);
      inputModule.consume(STEP);
      acc -= STEP;
      stepped = true;
    }
    if (stepped) drainEvents();
    clock += dt;
    drawWorld(ctx, world, clock);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
