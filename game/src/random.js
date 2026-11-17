// MOTHLIGHT — random.js
// The only randomness in the game. A small seeded generator (mulberry32)
// wrapped in a class the world owns, so a seed plus an input sequence
// replays a night exactly the same way twice.
//
// The simulation never calls Math.random or Date.now. Audio scheduling may
// use the audio clock, but that never feeds back into the world.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) {
    this.nextFn = mulberry32(seed);
  }

  // A float in [0, 1).
  next() {
    return this.nextFn();
  }

  // A float in [min, max).
  range(min, max) {
    return min + this.nextFn() * (max - min);
  }

  // An integer in [min, max] inclusive.
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // One element of a non-empty array, uniformly.
  pick(arr) {
    return arr[Math.floor(this.nextFn() * arr.length)];
  }

  // True with probability p (0..1).
  chance(p) {
    return this.nextFn() < p;
  }

  // A shuffled copy of an array (Fisher-Yates, driven by this RNG).
  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.nextFn() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
}
