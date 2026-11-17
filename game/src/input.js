// MOTHLIGHT — input.js
// Keyboard + mouse, turned into the world's input object. The world never
// touches the DOM: it only reads the plain object this module builds each
// frame, so the simulation stays testable and deterministic.
//
// Mouse: dragging a lantern is the core verb. Pressing near a lantern grabs
// it; moving the pointer drags it; releasing drops it. A plain click (press
// and release without much movement) is handed to the world as a click, so
// menu buttons and shop cards work with the same hand.
// Keyboard: 1/2/3 pick a lantern, WASD or the arrows nudge the picked one,
// P pauses, R restarts the night, M mutes, Enter confirms / starts.

import { VIEW_W, VIEW_H } from './config.js';

function blankInput() {
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
    dt: 0,
  };
}

export function createInput(canvas) {
  const input = blankInput();
  const keys = new Set();
  let dragging = false;
  let downPos = null;
  let downMoved = false;
  let attached = false;

  function toGameCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === '2' || k === '3') {
      input.select = Number(k) - 1;
    } else if (k === 'p') {
      input.pause = true;
    } else if (k === 'r') {
      input.restart = true;
    } else if (k === 'm') {
      input.mute = true;
    } else if (k === 'enter') {
      input.confirm = true;
    }
    keys.add(k);
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
  }

  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }

  function onMouseDown(e) {
    const p = toGameCoords(e);
    downPos = p;
    downMoved = false;
    dragging = true;
    input.grab = p;
  }

  function onMouseMove(e) {
    const p = toGameCoords(e);
    if (dragging) {
      if (downPos && (Math.abs(p.x - downPos.x) > 6 || Math.abs(p.y - downPos.y) > 6)) {
        downMoved = true;
      }
      input.drag = p;
    }
  }

  function onMouseUp(e) {
    const p = toGameCoords(e);
    if (dragging && downPos && !downMoved) {
      input.click = p;
    }
    dragging = false;
    downPos = null;
    input.release = true;
  }

  function attach() {
    if (attached) return;
    attached = true;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function detach() {
    if (!attached) return;
    attached = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  // Called once per frame by main.js, AFTER the world has read the input:
  // discrete flags are cleared, the held-key nudge is recomputed, and the
  // fresh input object is returned for the next frame. Call order matters:
  // step(dt, input) first, then consume(dt). Clearing before the step would
  // eat the very flags the step was meant to read.
  function consume(dt) {
    const next = blankInput();
    next.dt = dt;
    let nx = 0;
    let ny = 0;
    if (keys.has('a') || keys.has('arrowleft')) nx -= 1;
    if (keys.has('d') || keys.has('arrowright')) nx += 1;
    if (keys.has('w') || keys.has('arrowup')) ny -= 1;
    if (keys.has('s') || keys.has('arrowdown')) ny += 1;
    if (nx !== 0 || ny !== 0) {
      const len = Math.sqrt(nx * nx + ny * ny);
      next.nudge = { x: nx / len, y: ny / len };
    }
    // A held drag keeps reporting its last position so the lantern keeps
    // following the pointer even on frames without a mousemove event.
    if (dragging && input.drag) next.drag = input.drag;
    // Copy the fresh object over the shared one, flag by flag.
    for (const key of Object.keys(next)) input[key] = next[key];
    return input;
  }

  return { input, attach, detach, consume };
}
