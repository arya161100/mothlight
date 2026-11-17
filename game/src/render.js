// MOTHLIGHT — render.js
// Everything the player sees. It reads ONLY world.state and config, and it
// never mutates anything: the same state always draws the same picture.
// The only animation input is `t`, seconds of motion, passed in by main.js
// (live: the loop clock; screenshots: a fixed value, so a shot is stable).
//
// The look: a deep-blue night garden. Stars and a low moon above, dark
// terraced ground below, moonflowers glowing in their beds, warm lantern
// pools, and the moths' pale trails stitching it together.

import { FLOWER_KINDS, NIGHTS, UPGRADES, LAYOUT, TUNING, GAME_NAME, GAME_SUBTITLE, VIEW_W, VIEW_H } from './config.js';
import { mulberry32 } from './random.js';
import {
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_PAUSED,
  SCREEN_NIGHT_DONE,
  SCREEN_GAME_OVER,
  SCREEN_RESULTS,
} from './world.js';

const TAU = Math.PI * 2;

// Stars are fixed for the whole game: one seeded scatter, drawn every frame.
const STAR_RNG = mulberry32(20261117);
const STARS = [];
for (let i = 0; i < 130; i += 1) {
  STARS.push({
    x: STAR_RNG() * VIEW_W,
    y: STAR_RNG() * 300,
    r: 0.6 + STAR_RNG() * 1.6,
    tw: STAR_RNG() * TAU,
  });
}
// Fireflies drift over the garden for depth (positions fixed, motion by t).

// Bloom particles for visual impact
const BLOOM_PARTICLES = [];
function spawnBloomParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2;
    BLOOM_PARTICLES.push({
      x, y,
      vx: Math.cos(ang) * (40 + Math.random() * 60),
      vy: Math.sin(ang) * (40 + Math.random() * 60),
      life: 0.8 + Math.random() * 0.4,
      color,
    });
  }
}
function updateAndDrawParticles(ctx, dt) {
  for (let i = BLOOM_PARTICLES.length - 1; i >= 0; i--) {
    const p = BLOOM_PARTICLES[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      BLOOM_PARTICLES.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const FLIES = [];
for (let i = 0; i < 14; i += 1) {
  FLIES.push({
    x: 80 + STAR_RNG() * 1120,
    y: 160 + STAR_RNG() * 420,
    ph: STAR_RNG() * TAU,
    sp: 0.2 + STAR_RNG() * 0.5,
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ff5d7a';
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,93,122,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSky(ctx, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#0b1030');
  grad.addColorStop(0.45, '#16224e');
  grad.addColorStop(0.75, '#1d2f4d');
  grad.addColorStop(1, '#101a33');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars, gently twinkling.
  for (const st of STARS) {
    const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.4 + st.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The moon, low and large, with a soft halo.
  const mx = 1090;
  const my = 92;
  const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 130);
  halo.addColorStop(0, 'rgba(255,244,200,0.55)');
  halo.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - 130, my - 130, 260, 260);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(mx, my, 44, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(214,196,150,0.5)';
  ctx.beginPath();
  ctx.arc(mx - 14, my - 8, 9, 0, TAU);
  ctx.arc(mx + 12, my + 14, 6, 0, TAU);
  ctx.arc(mx + 16, my - 16, 5, 0, TAU);
  ctx.fill();
}

function drawGround(ctx, t) {
  const g = LAYOUT.garden;
  // Terraced garden ground: three dark bands.
  const grad = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
  grad.addColorStop(0, '#1e3a24');
  grad.addColorStop(0.5, '#16291c');
  grad.addColorStop(1, '#0e1d13');
  ctx.fillStyle = grad;
  ctx.fillRect(g.x - 40, g.y - 8, g.w + 80, g.h + 28);
  ctx.strokeStyle = 'rgba(120,180,130,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const y = g.y + 90 + i * 170;
    ctx.beginPath();
    ctx.moveTo(g.x - 40, y);
    ctx.lineTo(g.x + g.w + 40, y);
    ctx.stroke();
  }
  // Fireflies.
  for (const f of FLIES) {
    const fx = f.x + Math.sin(t * f.sp + f.ph) * 26;
    const fy = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 14;
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + f.ph * 3));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(fx, fy, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFlower(ctx, f, t) {
  const sway = Math.sin(t * 1.2 + f.phase) * 3;
  const cx = f.x + sway;
  const cy = f.y;
  // Soil mound.
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 34, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a3624';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13, 28, 7, 0, 0, TAU);
  ctx.fill();
  // Stem.
  ctx.strokeStyle = f.bloomed ? '#7fd08a' : '#4a7a52';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 14);
  ctx.quadraticCurveTo(cx - sway, cy - 8, cx, cy - 22);
  ctx.stroke();
  // Leaves.
  ctx.fillStyle = '#3f6b45';
  ctx.beginPath();
  ctx.ellipse(cx - 9, cy + 2, 10, 5, -0.5, 0, TAU);
  ctx.ellipse(cx + 9, cy + 4, 10, 5, 0.5, 0, TAU);
  ctx.fill();
  const kind = f.kind;
  const petals = 6;
  const pr = f.bloomed ? 15 : 10;
  if (f.bloomed) {
    // Bloomed: a halo of light around the open flower.
    const pulse = 0.75 + 0.25 * Math.sin(t * 2 + f.phase);
    const glow = ctx.createRadialGradient(cx, cy - 26, 4, cx, cy - 26, 64 * pulse);
    glow.addColorStop(0, kind.glow + '');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55 * pulse;
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 64, cy - 90, 128, 128);
    ctx.globalAlpha = 1;
  }
  // Petals: six ellipses around the core. An unbloomed flower still shows
  // its kind's colour, dimmed — a grey bud would read as a dead plant.
  ctx.globalAlpha = f.bloomed ? 1 : 0.55;
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * TAU + f.phase * 0.1;
    const px = cx + Math.cos(a) * pr;
    const py = cy - 26 + Math.sin(a) * pr;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = kind.petal;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Core.
  ctx.fillStyle = f.bloomed ? kind.core : '#3a3f4d';
  ctx.beginPath();
  ctx.arc(cx, cy - 26, f.bloomed ? 7 : 5, 0, TAU);
  ctx.fill();
  // Progress: unbloomed flowers show the visits they still need.
  if (!f.bloomed && f.visits > 0) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 26, 20, -Math.PI / 2, -Math.PI / 2 + TAU * (f.visits / f.need));
    ctx.stroke();
  }
  if (!f.bloomed) {
    text(ctx, `${f.visits}/${f.need}`, cx, cy + 34, 13, 'rgba(230,235,255,0.75)');
  }
}

function drawMoth(ctx, m, t) {
  // Trail: the pale ribbon the moth leaves behind.
  if (m.trail.length > 2) {
    ctx.strokeStyle = 'rgba(255,240,190,0.75)'; ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(m.trail[0].x, m.trail[0].y);
    for (let i = 1; i < m.trail.length; i += 1) {
      ctx.lineTo(m.trail[i].x, m.trail[i].y);
    }
    ctx.stroke();
  }
  const flap = Math.sin(t * 18 + m.id * 1.7) * 0.9;
  const ang = Math.atan2(m.vy, m.vx);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(ang);
  // Glow: wide enough to read at contact-sheet size.
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
  glow.addColorStop(0, 'rgba(255,240,190,0.85)');
  glow.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-24, -24, 48, 48);
  // Wings.
  ctx.fillStyle = 'rgba(240,230,200,0.95)';
  ctx.save();
  ctx.rotate(-0.5 - flap * 0.35);
  ctx.beginPath();
  ctx.ellipse(-2, -8, 11, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(0.5 + flap * 0.35);
  ctx.beginPath();
  ctx.ellipse(-2, 8, 11, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Body.
  ctx.fillStyle = '#2c2417';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBat(ctx, b, t) {
  const flap = Math.sin(t * 14 + b.id * 2.3) * 0.8;
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  ctx.fillStyle = '#1a1426';
  // Wings: wide dark arcs.
  ctx.save();
  ctx.rotate(-0.6 - flap * 0.3);
  ctx.beginPath();
  ctx.ellipse(-4, -12, 15, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(0.6 + flap * 0.3);
  ctx.beginPath();
  ctx.ellipse(-4, 12, 15, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Body and ears.
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -3);
  ctx.lineTo(11, -7);
  ctx.lineTo(11, -1);
  ctx.closePath();
  ctx.moveTo(6, 3);
  ctx.lineTo(11, 7);
  ctx.lineTo(11, 1);
  ctx.closePath();
  ctx.fill();
  // Eyes: two red dots, the only warning a moth gets.
  ctx.fillStyle = '#ff4d5e';
  ctx.beginPath();
  ctx.arc(7, -2, 1.8, 0, TAU);
  ctx.arc(7, 2, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawLantern(ctx, l, selected, t) {
  // The pool of light: warm, soft, and the whole mechanic.
  const pool = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.radius);
  pool.addColorStop(0, 'rgba(255,214,130,0.34)');
  pool.addColorStop(0.6, 'rgba(255,200,110,0.14)');
  pool.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.radius, 0, TAU);
  ctx.fill();
  // Rim of the light, so the radius reads at a glance.
  ctx.strokeStyle = 'rgba(255,220,150,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.radius, 0, TAU);
  ctx.stroke();
  // Selected lantern gets a brighter ring and a key hint.
  if (selected) {
    ctx.strokeStyle = 'rgba(255,240,190,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.radius + 5, 0, TAU);
    ctx.stroke();
  }
  // The lantern itself: brass cap, glass, flame, hanging ring.
  const flick = 0.85 + 0.15 * Math.sin(t * 9 + l.id * 2);
  ctx.fillStyle = '#8a6a2f';
  ctx.beginPath();
  ctx.arc(l.x, l.y - 26, 4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b98a3a';
  roundRect(ctx, l.x - 12, l.y - 24, 24, 7, 3);
  ctx.fill();
  const glass = ctx.createLinearGradient(l.x - 11, l.y - 17, l.x + 11, l.y - 17);
  glass.addColorStop(0, 'rgba(255,230,160,0.95)');
  glass.addColorStop(0.5, 'rgba(255,190,90,0.95)');
  glass.addColorStop(1, 'rgba(255,230,160,0.95)');
  ctx.fillStyle = glass;
  roundRect(ctx, l.x - 11, l.y - 17, 22, 26, 6);
  ctx.fill();
  ctx.fillStyle = `rgba(255,${Math.floor(150 * flick)},40,0.95)`;
  ctx.beginPath();
  ctx.ellipse(l.x, l.y - 4, 4.5, 7 * flick + 2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a6a2f';
  roundRect(ctx, l.x - 13, l.y + 9, 26, 6, 3);
  ctx.fill();
  // Key hint under the lantern.
  text(ctx, `${l.id + 1}`, l.x, l.y + 28, 14, 'rgba(255,240,190,0.85)');
}

function drawHud(ctx, s) {
  const night = NIGHTS[s.night];
  ctx.fillStyle = 'rgba(8,12,28,0.72)';
  ctx.fillRect(0, 0, VIEW_W, 88);
  ctx.fillStyle = 'rgba(255,220,150,0.25)';
  ctx.fillRect(0, 88, VIEW_W, 2);
  text(ctx, `NIGHT ${s.night + 1} / 7`, 120, 30, 26, '#ffe9a8', 'left');
  text(ctx, `Bloom ${s.bloomsThisNight} / ${s.goal}`, 120, 58, 18, '#cfe0ff', 'left');
  // Hearts.
  for (let i = 0; i < TUNING.heartsMax; i += 1) {
    drawHeart(ctx, 330 + i * 30, 30, 20, i < s.hearts);
  }
  text(ctx, 'hearts', 330, 58, 13, 'rgba(207,224,255,0.7)');
  // Score, petals, combo.
  text(ctx, `SCORE ${s.score}`, 640, 30, 26, '#ffffff');
  text(ctx, `Petals ${s.petals}`, 640, 58, 18, '#ffd76a');
  if (s.combo > 1) {
    text(ctx, `COMBO x${s.combo}`, 880, 30, 26, '#ffb3c2');
    text(ctx, `${Math.max(0, s.comboTimer).toFixed(1)}s`, 880, 58, 16, 'rgba(255,179,194,0.8)');
  } else {
    text(ctx, 'COMBO —', 880, 30, 22, 'rgba(207,224,255,0.55)');
  }
  text(ctx, `Moths saved ${s.mothsSaved}   Eaten ${s.mothsEaten}`, 1240, 30, 16, '#cfe0ff', 'right');
  text(ctx, `Night ${s.night + 1}: ${night.flowers} flowers, ${night.moths} moths, ${night.bats} bats`, 1240, 58, 14, 'rgba(207,224,255,0.65)', 'right');
  // Timer bar with the seconds left, so the night's pace reads at a glance.
  const tb = LAYOUT.timerBar;
  const frac = Math.max(0, 1 - s.nightTime / s.nightLength);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, tb.x, tb.y, tb.w, tb.h, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.25 ? '#ffd76a' : '#ff5d7a';
  roundRect(ctx, tb.x, tb.y, tb.w * frac, tb.h, 4);
  ctx.fill();
  // Seconds to dawn, at the left end above the bar — the middle of the HUD
  // already holds the score and petals, and the text must not sit on them.
  const secsLeft = Math.max(0, Math.ceil(s.nightLength - s.nightTime));
  text(ctx, `${secsLeft}s to dawn`, 40, 66, 13, '#ffffff', 'left');
}

function drawMessage(ctx, s) {
  if (s.message.t > 0 && s.message.text) {
    const a = Math.min(1, s.message.t);
    ctx.globalAlpha = a;
    // A dark pill behind the text so it reads over lantern light. The font
    // must be set before measuring, or the pill is the wrong width.
    ctx.font = `bold 26px Georgia, 'Times New Roman', serif`;
    const w = ctx.measureText(s.message.text).width;
    ctx.fillStyle = 'rgba(8,12,28,0.65)';
    roundRect(ctx, 640 - w / 2 - 18, 112, w + 36, 36, 18);
    ctx.fill();
    text(ctx, s.message.text, 640, 130, 26, '#ffe9a8');
    ctx.globalAlpha = 1;
  }
  if (s.burst.t > 0 && s.burst.n > 0) {
    const a = Math.min(1, s.burst.t);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,10,30,0.55)';
    roundRect(ctx, 440, 300, 400, 84, 16);
    ctx.fill();
    text(ctx, `BLOOM BURST x${s.burst.n}!`, 640, 330, 40, '#ffd76a');
    text(ctx, `+${TUNING.burstBonus} points`, 640, 362, 20, '#ffffff');
    ctx.globalAlpha = 1;
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,12,28,0.94)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,150,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, s, t) {
  ctx.fillStyle = 'rgba(6,9,22,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bob = Math.sin(t * 1.1) * 4;
  text(ctx, GAME_NAME, 640, 190 + bob, 96, '#ffe9a8');
  text(ctx, GAME_SUBTITLE, 640, 248 + bob, 26, '#cfe0ff');
  text(ctx, 'Drag your lanterns. The glowmoths follow the light.', 640, 320, 22, '#ffffff');
  text(ctx, 'Lead them across the moonflowers to make them bloom.', 640, 350, 22, '#ffffff');
  text(ctx, 'Bats hunt the moths — but no bat enters lantern light.', 640, 380, 22, '#ffb3c2');
  text(ctx, 'Bloom the night’s goal before dawn, or lose a heart. Seven nights.', 640, 410, 22, '#ffffff');
  text(ctx, 'Mouse: drag a lantern    1/2/3: pick a lantern    WASD / arrows: nudge', 640, 470, 19, '#cfe0ff');
  text(ctx, 'P: pause    R: restart night    M: mute', 640, 500, 19, '#cfe0ff');
  const pulse = 0.7 + 0.3 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER to start', 640, 580, 32, '#ffd76a');
  ctx.globalAlpha = 1;
}

function drawPaused(ctx, s) {
  ctx.fillStyle = 'rgba(6,9,22,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 390, 200, 500, 300);
  text(ctx, 'PAUSED', 640, 250, 48, '#ffe9a8');
  text(ctx, 'Mouse: drag a lantern to lead the moths', 640, 310, 20, '#ffffff');
  text(ctx, '1/2/3: pick a lantern    WASD / arrows: nudge it', 640, 340, 20, '#ffffff');
  text(ctx, 'Bats fear lantern light. Blooms chain a combo.', 640, 370, 20, '#ffffff');
  text(ctx, 'P: resume    R: restart night    M: mute', 640, 430, 20, '#cfe0ff');
  text(ctx, 'Press P to resume', 640, 470, 24, '#ffd76a');
}

function drawNightDone(ctx, s) {
  ctx.fillStyle = 'rgba(6,9,22,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 140, 60, 1000, 600);
  text(ctx, `NIGHT ${s.night + 1} CLEAR`, 640, 110, 44, '#ffe9a8');
  const stars = '★'.repeat(s.nightStars) + '☆'.repeat(3 - s.nightStars);
  text(ctx, stars, 640, 158, 40, '#ffd76a');
  text(ctx, `Bloomed ${s.bloomsThisNight} of ${NIGHTS[s.night].flowers} flowers   •   Score ${s.score}   •   Petals ${s.petals}`, 640, 205, 22, '#ffffff');
  text(ctx, 'The garden keeper offers three gifts — choose one, or skip.', 640, 245, 20, '#cfe0ff');
  for (let i = 0; i < 3; i += 1) {
    const c = LAYOUT.shopCards[i];
    const id = s.shop.offered[i];
    const up = UPGRADES.find((u) => u.id === id);
    const bought = s.shop.bought === id;
    const afford = up && s.petals >= up.cost;
    ctx.fillStyle = bought ? 'rgba(255,215,106,0.25)' : 'rgba(255,255,255,0.07)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 14);
    ctx.fill();
    ctx.strokeStyle = bought ? '#ffd76a' : 'rgba(255,220,150,0.4)';
    ctx.lineWidth = 2;
    roundRect(ctx, c.x, c.y, c.w, c.h, 14);
    ctx.stroke();
    if (!up) continue;
    text(ctx, up.name, c.x + c.w / 2, c.y + 34, 24, '#ffe9a8');
    text(ctx, `${up.cost} petals`, c.x + c.w / 2, c.y + 66, 20, afford ? '#ffd76a' : '#ff8d9a');
    const words = wrapText(up.desc, 26);
    words.forEach((line, li) => {
      text(ctx, line, c.x + c.w / 2, c.y + 102 + li * 22, 17, '#ffffff');
    });
    text(ctx, bought ? 'BOUGHT' : afford ? 'Click to buy' : 'Not enough petals', c.x + c.w / 2, c.y + 170, 17, bought ? '#ffd76a' : 'rgba(207,224,255,0.8)');
  }
  const next = LAYOUT.buttons.nextNight;
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, next.x, next.y, next.w, next.h, 12);
  ctx.fill();
  text(ctx, 'NEXT NIGHT', 640, next.y + 33, 28, '#1a1426');
  const skip = LAYOUT.buttons.skipShop;
  text(ctx, 'SKIP SHOP', 640, skip.y + 22, 20, '#cfe0ff');
}

function wrapText(str, maxChars) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line += ' ' + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 3);
}

function drawGameOver(ctx, s) {
  ctx.fillStyle = 'rgba(6,9,22,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 290, 170, 700, 360);
  text(ctx, 'THE GARDEN WENT DARK', 640, 230, 44, '#ff8d9a');
  text(ctx, `The last heart faded on night ${s.night + 1}.`, 640, 290, 22, '#ffffff');
  text(ctx, `Score ${s.score}   •   Blooms ${s.totalBlooms}   •   Moths saved ${s.mothsSaved}`, 640, 330, 20, '#cfe0ff');
  text(ctx, 'The moon will rise again. Try the night once more.', 640, 370, 20, '#cfe0ff');
  const b = LAYOUT.buttons.tryAgain;
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  text(ctx, 'TRY AGAIN (R)', 640, b.y + 33, 26, '#1a1426');
}

function drawResults(ctx, s) {
  ctx.fillStyle = 'rgba(6,9,22,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 240, 110, 800, 470);
  text(ctx, 'THE GARDEN BLOOMS', 640, 170, 48, '#ffe9a8');
  text(ctx, 'Seven nights, and the moon garden lives.', 640, 220, 22, '#cfe0ff');
  text(ctx, `Final score  ${s.score}`, 640, 280, 32, '#ffffff');
  text(ctx, `Flowers bloomed  ${s.totalBlooms}`, 640, 325, 22, '#ffffff');
  text(ctx, `Moths saved  ${s.mothsSaved}    •    Moths eaten  ${s.mothsEaten}`, 640, 360, 22, '#ffffff');
  text(ctx, `Best combo  x${s.bestCombo}    •    Bloom bursts  ${s.stats.bursts}    •    Perfect nights  ${s.stats.perfectNights}`, 640, 395, 22, '#ffffff');
  text(ctx, `Hearts left  ${s.hearts}`, 640, 430, 22, '#ff8d9a');
  const b = LAYOUT.buttons.playAgain;
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  text(ctx, 'PLAY AGAIN (R)', 640, b.y + 33, 26, '#1a1426');
}

export function drawWorld(ctx, world, t = 0) {
  const s = world.state;
  drawSky(ctx, t);
  drawGround(ctx, t);
  // Flowers first (under the moths), then bats, moths, lanterns on top.
  for (const f of s.flowers) drawFlower(ctx, f, t);
  for (const b of s.bats) drawBat(ctx, b, t);
  for (const m of s.moths) drawMoth(ctx, m, t);
  s.lanterns.forEach((l, i) => drawLantern(ctx, l, i === s.selectedLantern && s.screen === SCREEN_PLAY, t));
  if (s.screen === SCREEN_PLAY || s.screen === SCREEN_PAUSED) drawHud(ctx, s);
  if (s.screen === SCREEN_PLAY) drawMessage(ctx, s);
  if (s.screen === SCREEN_TITLE) drawTitle(ctx, s, t);
  if (s.screen === SCREEN_PAUSED) drawPaused(ctx, s);
  if (s.screen === SCREEN_NIGHT_DONE) drawNightDone(ctx, s);
  if (s.screen === SCREEN_GAME_OVER) drawGameOver(ctx, s);
  if (s.screen === SCREEN_RESULTS) drawResults(ctx, s);
  if (s.muted) {
    text(ctx, 'MUTED (M)', 1240, 700, 14, 'rgba(207,224,255,0.6)', 'right');
  }
}
