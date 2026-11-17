# MOTHLIGHT — v4 spec (best-game-01, NEW GAME, not a SHUTTERWILD upgrade)

## Decision (evidence-based)
- v2 SHUTTERWILD: judge 775017, rank 453/7096. Core verb = waiting (pan, wait, shoot).
- v3 EMBERWOK: judge 759103, rank 737/7551 — WORSE than v2. Its verb (work stations
  with Space, manage tickets/patience) is a management loop with indirect,
  menu-like input; the play screenshot reads busy/cluttered at contact-sheet size.
  Lesson: a new game must have a DIRECT, SPATIAL, constantly-meaningful verb and
  screenshots that read at a glance at 768x432.
- Top-10 pattern (verified 17 Nov): explicit multi-night/day progression (7-10),
  a distinct core verb needing constant meaningful input, a progression system
  (relics/workshop/upgrades), a rich theme, polished visuals. Winners: SUNDERING
  LOOM (weave wires), Lamplight Tide (bend beam), LANTERNWAKE, HEFT (herding),
  MARGINALIA (draw ink loops), SUNWRIGHT (mirror TD), VOLCANO HAVEN (steer lava),
  SYZYGY (line up moons).
- Cutoff top 10 now ~930557; gap from v3 ~171k. Payout is top-10-only, so a fresh
  high-ceiling draw is rational. Force_Last risk is acceptable (v3 earns $0 anyway).

## Concept
MOTHLIGHT — keep the last moon garden alive for seven nights. Glowmoths drift
in from the dark; your lanterns are their lure. Drag a lantern and the moths
follow its light; lead them across the moonflowers so they pollinate and bloom.
Bats hunt the moths — but bats will not enter lantern light, so every lantern
is both lure and shield. Bloom enough flowers each night or lose a heart.
Night 7 ends the garden's trial; the results screen tells the garden's fate.

## Why this verb wins where v3 lost
- DIRECT: the mouse IS the game — drag lanterns, moths trail behind in real time.
  Every second of dragging is a meaningful choice (which moth, which flower,
  which bat to block). No waiting, no station queues, no ticket menus.
- READABLE: one glowing garden, 2-3 lanterns, moth trails, flowers. At small
  size the play shot is still obvious: light pools + moths + blooms.
- TENSION: lanterns do double duty (lure + shield). Bats force constant
  repositioning; combos reward chaining blooms.

## Hard constraints (from the parent task + v3 experience)
- Static files under game/, game/index.html opens in desktop Chrome with NO
  network request. Every script/image/font is a file under game/ or a data: URI.
  NO external libraries (plain JS + Canvas 2D only, no vendor libs).
- All art drawn procedurally on canvas; all sound synthesised with WebAudio.
- Deterministic: seeded RNG; same seed -> same world. No Date.now()/Math.random()
  in simulation.
- Canvas logical size 1280x720. System fonts only.
- NEVER copy files from best-game-01-v2/, best-game-01-v3/ or the kit starter:
  write every file fresh with the write/edit tools in THIS session. The only
  exception is vendor/makefun-game.ts, copied from the kit UNCHANGED.
- Revise each file at least twice (write, then at least one real edit pass).
- Work ONLY inside /home/hatch/workspace/makefun/best-game-01-v4.
- The game must be genuinely playable start to finish by a human: every night
  completable, no soft-locks (a moth can always be led to a flower; bats can
  never make a night unwinnable; the night always ends at timer 0).
- Do NOT submit. The parent verifies and submits.

## Game design (exact numbers live in config.js)
- Nights: 7. Night length 75s (night 1) growing to 105s (night 7).
- Flowers: beds at seeded positions in the garden (min distance apart).
  Night 1: 6 flowers, 1 visit each, goal 5 blooms. Night 7: 10 flowers,
  2 visits each, goal 8 blooms. Moth counts are set so every goal is
  reachable: the touches a night needs never exceed the moths it sends
  (a lesson from the first tuning pass, where nights 6-7 were impossible).
  Kinds (petal colours): moonwhite, starblue, emberrose, goldpetal.
- Moths: spawn on a seeded schedule from the garden edges (10-18 per night).
  Wander (seeded) until inside a lantern's light radius, then steer toward
  that lantern (speed slightly below lantern drag speed, so the player leads).
  Touching an unbloomed flower pollinates it (+1 visit); the moth then flies
  off the nearest edge (+10 pts) and despawns. A flower reaching its visits
  blooms: +100 pts x combo, sparkle burst, chime.
- Combo: blooms within 6s chain the combo (x1, x2, x3, x4 cap). 3+ blooms in
  one 6s window = BLOOM BURST (+150 bonus, banner).
- Bats: from night 2 (1 bat, up to 4 by night 7). A bat hunts the nearest moth;
  inside lantern light it is repelled (flees from the lantern). Touching a moth
  eats it: moth removed, -15 pts, combo reset, puff. Eaten moths shrink the
  pollinator pool, which is how bats threaten the night goal.
- Lanterns: 2 (3 with the Third Lantern upgrade). Drag with the mouse
  (click near a lantern to grab it; it follows the pointer with smoothing).
  Keys 1/2/3 select a lantern, WASD/arrows nudge the selected one.
  Light radius 130 (upgrade 170). Lanterns are the only control: no energy,
  no cooldown — the skill is positioning.
- Hearts: start 3, max 5. Missing a night's bloom goal = -1 heart. Meeting
  the goal = +1 heart (max 5) and +25 petals. Hearts 0 -> GAME OVER.
  Finish night 7 -> RESULTS screen (total score, blooms, best combo,
  moths saved, nights cleared, PLAY AGAIN).
- Petals (currency): blooms earn 10 petals each; night-clear bonus 25.
  Between nights, the shop offers 3 upgrades; buy at most 1 per night, or skip.
- Upgrades (one-time): Wider Light 25 (radius +30%), Third Lantern 40,
  Swiftwings 30 (moth speed +20%), Batward 30 (bats repelled at 1.5x radius,
  bat speed -15%), Deep Roots 25 (flowers need 1 fewer visit, min 1),
  Extra Heart 35 (+1 heart, max 5), Moonpetal Charm 20 (+2 petals per bloom).
- Night flow: timer runs; moths stop spawning at 0; the night ends at timer 0
  (remaining moths fly off, no extra penalty). Night-done screen: blooms,
  score, stars (1-3 by blooms vs goal), shop -> "NEXT NIGHT" button.
- Screens: TITLE, PLAY, PAUSED, NIGHT_DONE, GAME_OVER, RESULTS. Title shows
  the name, how to play, controls, "Press ENTER to start". Pause (P) overlays
  controls + resume. R restarts the current night. M mutes.

## Module contract (same shape as v3, fresh code)
Files under game/src/ (one job each):
- config.js — exports: FLOWER_KINDS, NIGHTS, UPGRADES, LAYOUT, TUNING.
  LAYOUT (1280x720 coords): garden rect, HUD rects, lantern start positions,
  shop card rects, button rects. Render AND world both import LAYOUT.
- random.js — exports: mulberry32(seed), RNG class {next(), range(a,b), pick(arr)}.
- world.js — exports: class MothlightWorld + event consts. Constructor (seed=1).
  State (all on `this.state`): screen, night (0-based), nightTime, nightLength,
  score, petals, totalBlooms, goal, bloomsThisNight, hearts, combo, comboTimer,
  bestCombo, mothsSaved, mothsEaten, flowers[], moths[], bats[], lanterns[],
  spawnQueue, spawnTimer, message {text, t}, burst {n, t}, shop {offered, bought},
  stats {}.
  Moth: {id, x, y, vx, vy, state:'wandering'|'following'|'leaving'|'eaten',
  wanderAngle, speed, trail:[{x,y}]}. Bat: {id, x, y, vx, vy, state:'hunting'|
  'fleeing', targetId}. Flower: {id, x, y, visits, need, bloomed, kind, phase}.
  Lantern: {id, x, y, radius, grabbed}.
  Methods: startGame(), startNight(n), step(dt, input), selectLantern(i),
  nudgeSelected(dx, dy), grabLanternAt(x, y), dragTo(x, y), releaseLantern(),
  buyUpgrade(id), skipShop(), nextNight(), restartNight(), toResults().
  Input object: {select, nudge:{x,y}, grab:{x,y}|null, drag:{x,y}|null,
  release, pause, restart, mute, confirm, click:{x,y}|null, dt}.
  step(dt, input) applies ONE frame: discrete actions first, then simulation
  (spawns, moth steering, bat hunting, pollination, blooms, combo timer,
  night end). All screen transitions inside world. Deterministic given
  (seed, input sequence).
- render.js — exports: drawWorld(ctx, world), SCREEN_* consts. Reads ONLY
  world.state + config. Never mutates. Must draw: night sky (gradient, stars,
  moon), garden ground + beds, flowers (petals, glow when bloomed), moths
  (glow + wings + trails), lanterns (brass + warm radial light pool), bats,
  HUD (night, timer bar, blooms/goal, hearts, score, combo, petals), floating
  message + BLOOM BURST banner, and each screen (title / paused / nightDone+shop
  / gameOver / results) with buttons labelled exactly: title "Press ENTER to
  start", nightDone "NEXT NIGHT" + "SKIP SHOP", gameOver "TRY AGAIN (R)",
  results "PLAY AGAIN (R)". Text legible at 768x432.
- input.js — exports: createInput(canvas) returning {input, attach(), detach()}:
  tracks keys + mouse (drag lanterns, click buttons), canvas coords scaled to
  1280x720, clears discrete flags after each frame. Key map: 1-3 select lantern,
  WASD/arrows nudge, P pause, R restart, M mute, Enter confirm.
- audio.js — exports: class SoundBank {ensure(), toggleMute(), bloom(),
  pollinate(), eat(), click(), burst(), nightDone(), gameOver(), mothLeave(),
  startMusic(), stopMusic()} — all WebAudio synth, no assets, lazy AudioContext
  on first user gesture; safe no-op if audio unavailable.
- shots.js — exports: stageShot(name, world). Scenes (deterministic, seed 1):
  'start': fresh world, 8s ambient on title screen. 'play': night 5 (index 4)
  mid-flight — the autopilot plays until 3+ moths are in the air and 2+
  flowers have bloomed, with bats hunting and the HUD full. 'perfect': a
  BLOOM BURST moment (3 blooms in one window, banner + combo x3). 'end':
  night 1 played to completion by autopilot -> NIGHT_DONE screen with shop. Autopilot: nextInput(world): drag the nearest
  lantern toward the nearest wandering moth, then lead it over the nearest
  unbloomed flower; keep the second lantern between bats and moths. Scenes play
  the REAL rules forward with STEP=1/60 fixed steps (no Math.random; use world rng).
- main.js — boot: canvas setup, world = new MothlightWorld(seed from ?seed= or 1),
  input wiring, rAF loop with fixed STEP=1/60 accumulator, pause/mute handling,
  ?shot=name support: if present, stageShot(name, world), draw ONE frame, set
  window.__shotReady=true, do NOT run the loop. Expose window.__mothlight = {world}.
- game/index.html — <canvas id="game" width=1280 height=720>, title MOTHLIGHT,
  <script type="module" src="./src/main.js">, minimal CSS (dark page, centered
  canvas), no external refs of any kind.
- shots.json (coordinator writes) — 4 scenes: 1-start.jpg ?shot=start&seed=1,
  2-play.jpg ?shot=play&seed=1, 3-perfect.jpg ?shot=perfect&seed=1,
  4-end.jpg ?shot=end&seed=1.

## Quality bar
- Genuinely playable start to finish by a human: every night completable,
  no soft-locks (moths always spawn; a flower is always reachable; the night
  always ends at timer 0; bats can never block all progress).
- Screenshots must read at a glance: big flower blooms, big numbers, clear
  lantern light pools, obvious moth trails.
- Before handing off: run `node --check` on every JS file, a headless smoke
  test (serve + headless chromium screenshots), and a scripted autopilot run
  of night 1 to prove it completes. Report any failure honestly with the
  exact error.
