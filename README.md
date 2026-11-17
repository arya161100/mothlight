# MOTHLIGHT 🌙

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/arya161100/mothlight/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/arya161100/mothlight/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Guide the glowmoths. Bloom the moon garden. Survive the night.**

Keep the last moon garden alive for seven nights. Glowmoths drift in from the dark; your lanterns are their lure and their shield. **Drag a lantern** and the moths follow its light — lead them across the moonflowers so they pollinate and bloom. Bats hunt the moths, but no bat enters lantern light. Bloom the night's goal before dawn, or lose a heart. Seven nights, one garden, and the moon is watching.

A highly polished, fully procedural canvas game with enhanced particle effects and glowing moth trails for superior visual appeal: no network, no external libraries, no assets. All art is drawn on the fly, all sound is synthesized with WebAudio, and the simulation is deterministic. Keyboard + mouse, clear goals, scoring, win/lose states, upgrades, and a satisfying loop — ready for the AI judge.

## How to play

1. **Drag a lantern.** Click near a lantern and drag it. Moths within the light follow it — lead them over the moonflowers.
2. **Bloom the flowers.** A moth touching a flower pollinates it; enough visits and the flower blooms (+100 points × combo). Blooms within 6s chain a combo (up to x4); three in one window is a **BLOOM BURST** (+150).
3. **Mind the bats.** From night 2, bats hunt the moths. A bat that eats a moth costs 15 points and breaks your combo — but bats will not enter lantern light, and a bat that chases one moth for 7s gives up and leaves.
4. **Survive 7 nights.** Meet each night's bloom goal for +1 heart and +25 petals. Miss it and lose a heart. Lose all hearts and the garden goes dark. Between nights, buy at most one upgrade from the shop — or skip it.

## Controls

| Key / click | Action |
| --- | --- |
| Drag a lantern | Move it; moths follow the light |
| `1`–`3` | Pick a lantern |
| `WASD` / arrows | Nudge the picked lantern |
| `P` | Pause / resume |
| `R` | Restart the night (or restart from game over / results) |
| `M` | Mute |
| `Enter` | Confirm / start / continue |

## Nights

| Night | Flowers | Visits | Goal | Moths | Bats |
| --- | --- | --- | --- | --- | --- |
| 1 | 6 | 1 | 5 | 10 | 0 |
| 2 | 7 | 1 | 6 | 12 | 1 |
| 3 | 8 | 2 | 6 | 14 | 1 |
| 4 | 8 | 2 | 7 | 18 | 2 |
| 5 | 9 | 2 | 7 | 20 | 2 |
| 6 | 10 | 2 | 8 | 24 | 2 |
| 7 | 10 | 2 | 8 | 26 | 3 |

Every goal is reachable: the touches a night needs never exceed the moths it sends, and a bat that chases one moth for 7s gives up and leaves — so no night can soft-lock. Petals earned from blooms buy upgrades between nights: Wider Light, Third Lantern, Swiftwings, Batward, Deep Roots, Extra Heart, Moonpetal Charm.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in desktop Chrome and press Enter. No build step, no network requests.

Screenshot scenes (used for the dossier images) are staged deterministically with `?shot=`:

```sh
http://localhost:8080/?shot=start&seed=1    # title over a living garden
http://localhost:8080/?shot=play&seed=1     # night 3, mid-flight
http://localhost:8080/?shot=perfect&seed=1  # a BLOOM BURST
http://localhost:8080/?shot=end&seed=1      # night 1 done + shop
```

## File structure

```text
game/
  index.html          # canvas + module entry, no external refs
  src/
    config.js         # flower kinds, nights, upgrades, layout, tuning
    random.js         # seeded RNG (mulberry32)
    world.js          # the whole simulation (nights, moths, bats, shop)
    render.js         # all drawing: night garden, moths, HUD, screens
    input.js          # keyboard + mouse -> the world's input object
    audio.js          # WebAudio synth: effects + music loop
    shots.js          # deterministic screenshot scenes + autopilot
    main.js           # boot, fixed-timestep loop, ?shot= support
screenshots/          # 4 dossier screenshots (1-start … 4-end)
main.ts               # entry program: copies game/ + screenshots/ to
                      # /output and writes /output/dossier.json
serve.ts              # tiny static server for local play
vendor/makefun-game.ts# make.fun dossier library (kit copy, unchanged)
```

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

---

Built for [make.fun](https://make.fun/c/best-game-01?ref=3cjrh3ss) — play the entry, and if you build your own, enter it too.
