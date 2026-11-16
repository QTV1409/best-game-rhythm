// Synthesised music with the Web Audio API only — no audio files, no
// network. A cheerful 120 BPM loop: a bass line on the beat and a bright
// lead arpeggio, both from a pentatonic scale, plus a short blip on every
// hit. Music starts on the player's first gesture (the start button),
// so browsers allow it. M toggles it.

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const ROOT = 220; // A3

function freq(semitones) {
  return ROOT * Math.pow(2, semitones / 12);
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let started = false;
  let nextBeat = 0;
  let beatIndex = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(at, duration, frequency, type, volume) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  // Schedule the loop ahead of the current song time.
  function schedule(songTime) {
    if (!ctx || !started || muted) return;
    const beat = 0.5;
    while (nextBeat < songTime + 0.4) {
      const at = ctx.currentTime + Math.max(0, nextBeat - songTime);
      const i = beatIndex;
      // Bass on every beat, root / fifth alternating by bar.
      const bassNote = [0, 0, 7, 0, 5, 0, 7, 10][i % 8] - 12;
      tone(at, 0.42, freq(bassNote), 'triangle', 0.5);
      // Lead arpeggio on off-beats in the chorus/finale feel.
      const leadIdx = [0, 4, 2, 6, 3, 7, 5, 9][i % 8];
      tone(at + beat / 2, 0.22, freq(SCALE[leadIdx % SCALE.length]), 'square', 0.12);
      if (i % 4 === 3) tone(at + beat / 2, 0.3, freq(24), 'sine', 0.25);
      nextBeat += beat;
      beatIndex += 1;
    }
  }

  return {
    start() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      started = true;
      nextBeat = 0;
      beatIndex = 0;
    },
    stop() { started = false; },
    update(songTime) { schedule(songTime); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    get muted() { return muted; },
    hit(perfect) {
      if (!ctx || !started || muted) return;
      tone(ctx.currentTime, 0.12, perfect ? 880 : 660, 'sine', 0.3);
    },
    miss() {
      if (!ctx || !started || muted) return;
      tone(ctx.currentTime, 0.2, 110, 'sawtooth', 0.15);
    },
  };
}
