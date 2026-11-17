// MOTHLIGHT — config.js
// Every number that tunes the game lives here: flower kinds, the seven
// nights, the upgrade shop, the garden layout and the feel constants.
// world.js reads this file; render.js reads LAYOUT from it too, so the
// hit-tests in the world and the drawing on screen can never disagree.

export const GAME_NAME = 'MOTHLIGHT';
export const GAME_SUBTITLE = 'Guide the glowmoths. Bloom the moon garden.';

// Logical canvas size. The page never scales the simulation, only the
// element that shows it.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// ---------------------------------------------------------------------------
// Flower kinds: four moonflower varieties, each with its own petal colour,
// glow colour and the petals the garden draws for it.
// ---------------------------------------------------------------------------
export const FLOWER_KINDS = [
  { id: 'moonwhite', name: 'Moonwhite', petal: '#f4f1e4', core: '#ffe9a8', glow: '#fff3c4' },
  { id: 'starblue', name: 'Starblue', petal: '#a8c8ff', core: '#d8ecff', glow: '#9db8ff' },
  { id: 'emberrose', name: 'Emberrose', petal: '#ffb3c2', core: '#ffe0a8', glow: '#ff9db0' },
  { id: 'goldpetal', name: 'Goldpetal', petal: '#ffd76a', core: '#fff0b8', glow: '#ffcf4d' },
];

// ---------------------------------------------------------------------------
// Nights: seven nights, each harder than the last. `flowers` is how many
// beds bloom that night, `visits` how many moth touches a flower needs,
// `goal` how many blooms clear the night, `moths` how many glowmoths visit,
// `bats` how many hunters prowl, `length` the night in seconds.
// ---------------------------------------------------------------------------
export const NIGHTS = [
  { flowers: 6, visits: 1, goal: 5, moths: 10, bats: 0, length: 75 },
  { flowers: 7, visits: 1, goal: 6, moths: 12, bats: 1, length: 80 },
  { flowers: 8, visits: 2, goal: 6, moths: 14, bats: 1, length: 85 },
  { flowers: 8, visits: 2, goal: 7, moths: 18, bats: 2, length: 90 },
  { flowers: 9, visits: 2, goal: 7, moths: 20, bats: 2, length: 95 },
  { flowers: 10, visits: 2, goal: 8, moths: 24, bats: 2, length: 100 },
  { flowers: 10, visits: 2, goal: 8, moths: 26, bats: 3, length: 105 },
];

// ---------------------------------------------------------------------------
// Upgrades: the shop offers three of these after each night; the keeper may
// buy at most one. `apply` is a small function the world calls when the
// upgrade is bought; it mutates only the world's `upgrades` record, so the
// numbers stay visible here instead of hiding in world.js.
// ---------------------------------------------------------------------------
export const UPGRADES = [
  {
    id: 'wider-light', name: 'Wider Light', cost: 25,
    desc: 'Lantern light reaches 30% further.',
    apply: (u) => { u.lightRadiusMul *= 1.3; },
  },
  {
    id: 'third-lantern', name: 'Third Lantern', cost: 40,
    desc: 'A third lantern joins the garden.',
    apply: (u) => { u.extraLanterns += 1; },
  },
  {
    id: 'swiftwings', name: 'Swiftwings', cost: 30,
    desc: 'Moths fly 20% faster toward the light.',
    apply: (u) => { u.mothSpeedMul *= 1.2; },
  },
  {
    id: 'batward', name: 'Batward', cost: 30,
    desc: 'Bats are repelled further and fly 15% slower.',
    apply: (u) => { u.batRepelMul *= 1.5; u.batSpeedMul *= 0.85; },
  },
  {
    id: 'deep-roots', name: 'Deep Roots', cost: 25,
    desc: 'Every flower needs one fewer moth visit (min 1).',
    apply: (u) => { u.visitReduction += 1; },
  },
  {
    id: 'extra-heart', name: 'Extra Heart', cost: 35,
    desc: '+1 heart, up to 5. A kinder garden.',
    apply: (u) => { u.extraHearts += 1; },
  },
  {
    id: 'moonpetal-charm', name: 'Moonpetal Charm', cost: 20,
    desc: 'Every bloom earns +2 petals.',
    apply: (u) => { u.petalsPerBloom += 2; },
  },
];

// The starting state of the world's `upgrades` record, before any purchase.
export function defaultUpgrades() {
  return {
    lightRadiusMul: 1,
    extraLanterns: 0,
    mothSpeedMul: 1,
    batRepelMul: 1,
    batSpeedMul: 1,
    visitReduction: 0,
    extraHearts: 0,
    petalsPerBloom: 10,
  };
}

// Stars for a finished night: 1 for meeting the goal, 2 for blooming all
// but one flower, 3 for blooming every flower in the garden.
export function starsFor(night, blooms) {
  const n = NIGHTS[night];
  if (blooms >= n.flowers) return 3;
  if (blooms >= n.flowers - 1) return 2;
  if (blooms >= n.goal) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Layout: every rectangle the game draws and clicks, in 1280x720 space.
// ---------------------------------------------------------------------------
export const LAYOUT = {
  // The garden bed area where flowers grow and moths fly.
  garden: { x: 40, y: 96, w: 1200, h: 520 },
  // The HUD strip across the top.
  hud: { x: 0, y: 0, w: 1280, h: 88 },
  // Timer bar, drawn under the HUD text.
  timerBar: { x: 40, y: 78, w: 1200, h: 8 },
  // Lantern resting spots at the bottom of the garden.
  lanternStarts: [
    { x: 480, y: 620 },
    { x: 800, y: 620 },
    { x: 640, y: 560 },
  ],
  // Night-done shop: three cards in a row.
  shopCards: [
    { x: 190, y: 300, w: 260, h: 190 },
    { x: 510, y: 300, w: 260, h: 190 },
    { x: 830, y: 300, w: 260, h: 190 },
  ],
  // Buttons used on the end screens.
  buttons: {
    nextNight: { x: 490, y: 540, w: 300, h: 64 },
    skipShop: { x: 490, y: 620, w: 300, h: 44 },
    playAgain: { x: 490, y: 540, w: 300, h: 64 },
    tryAgain: { x: 490, y: 540, w: 300, h: 64 },
  },
};

// ---------------------------------------------------------------------------
// Tuning: the feel of the game. Speeds are pixels per second.
// ---------------------------------------------------------------------------
export const TUNING = {
  lanternRadius: 130,
  lanternGrabRadius: 46,
  lanternSpeed: 320, // px/s when no moth is following it
  lanternLeadSpeed: 160, // px/s while leading followers: the lantern waits
  lanternNudgeSpeed: 320, // keyboard nudge, px per second
  mothSpeed: 150, // a following moth must keep up with a leading lantern
  mothWanderSpeed: 42,
  attractBonus: 90, // a moth notices a lantern this far beyond its light
  mothFlowerRadius: 30, // pollination touch distance
  mothLeaveSpeed: 160,
  batSpeed: 64,
  batEatRadius: 22,
  batRepelBonus: 20, // a bat flees this far beyond the lantern's light
  bloomPoints: 100,
  mothLeavePoints: 10,
  eatPenalty: 15,
  burstBonus: 150,
  comboWindow: 6, // seconds in which blooms chain the combo
  comboMax: 4,
  nightClearPetals: 25,
  heartsStart: 3,
  heartsMax: 5,
  flowerMinGap: 150, // flowers never grow closer than this
  spawnEdgeMargin: 24,
};
