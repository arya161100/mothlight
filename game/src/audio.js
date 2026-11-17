// MOTHLIGHT — audio.js
// Every sound is synthesised with WebAudio: no audio files, no network.
// A gentle pad hums under the night; blooms chime, moths flutter, bats
// thud, and a burst rings out. The context is created lazily on the first
// user gesture (browsers forbid audio before one) and every method is a
// safe no-op when audio is unavailable.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicNodes = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      return true;
    } catch (e) {
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.musicNodes) {
      this.musicNodes.gain.gain.value = this.muted ? 0 : 0.05;
    }
    return this.muted;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A soft chime: the flower opening.
  bloom() {
    this.tone(523.25, 0.5, 'sine', 0.16);
    this.tone(783.99, 0.7, 'sine', 0.12, 0.07);
    this.tone(1046.5, 0.9, 'sine', 0.08, 0.14);
  }

  // A short flutter: a moth feeding.
  pollinate() {
    this.tone(880, 0.12, 'triangle', 0.07, 0, 1320);
    this.tone(1174.66, 0.1, 'triangle', 0.05, 0.05);
  }

  // A low thud: a bat's catch.
  eat() {
    this.tone(220, 0.25, 'sawtooth', 0.1, 0, 70);
    this.tone(110, 0.35, 'sine', 0.14, 0.02, 55);
  }

  // A bright arpeggio: several blooms at once.
  burst() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((f, i) => this.tone(f, 0.8, 'sine', 0.13, i * 0.06));
  }

  // A soft tick: a moth flying home.
  mothLeave() {
    this.tone(659.25, 0.18, 'sine', 0.05, 0, 988);
  }

  click() {
    this.tone(740, 0.07, 'square', 0.04);
  }

  buy() {
    this.tone(587.33, 0.15, 'triangle', 0.09);
    this.tone(880, 0.25, 'triangle', 0.08, 0.08);
  }

  nightDone() {
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => this.tone(f, 0.6, 'sine', 0.11, i * 0.11));
  }

  nightFail() {
    this.tone(330, 0.5, 'sine', 0.1, 0, 220);
    this.tone(262, 0.7, 'sine', 0.1, 0.2, 175);
  }

  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, 0.9, 'sine', 0.11, i * 0.22));
  }

  // A slow two-note pad that hums under the garden. Two detuned triangle
  // oscillators through a low gain; started once, stopped on demand.
  startMusic() {
    if (!this.ctx || this.musicNodes) return;
    const gain = this.ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.05;
    gain.connect(this.ctx.destination);
    const oscs = [];
    for (const f of [110, 164.81, 220]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (f === 164.81 ? 4 : -3);
      osc.connect(gain);
      osc.start();
      oscs.push(osc);
    }
    // A slow breathing on the pad: gain swells and falls.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    this.musicNodes = { gain, oscs, lfo };
  }

  stopMusic() {
    if (!this.musicNodes) return;
    try {
      for (const o of this.musicNodes.oscs) o.stop();
      this.musicNodes.lfo.stop();
    } catch (e) {
      // Already stopped; nothing to do.
    }
    this.musicNodes = null;
  }
}
