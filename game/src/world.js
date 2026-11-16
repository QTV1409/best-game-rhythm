// The game's rules and state, with no drawing and no browser in it: the
// chart, the falling notes, hit judgement, combo, score, lives and the
// win/lose end. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns
// (notes are pre-allocated from the chart).

import { FIELD, HIT_Y, LANES, LANE_X0, LANE_WIDTH, LANE_GAP, LIVES, SCORE, SONG, WINDOW } from './config.js';

export const EVENT_HIT = 1; // a note was hit (perfect or good)
export const EVENT_MISS = 2; // a note was missed (loses a life)
export const EVENT_OVER = 4; // lives ran out
export const EVENT_WIN = 8; // song finished with lives left

export const JUDGE_PERFECT = 'perfect';
export const JUDGE_GOOD = 'good';
export const JUDGE_MISS = 'miss';

function laneX(lane) {
  return LANE_X0 + lane * (LANE_WIDTH + LANE_GAP);
}

// Build the chart from a seed. Notes land on the beat grid; density grows
// across three sections (verse 0-24s, chorus 24-48s, finale 48-72s).
// Sections: verse = mostly single notes on beats, chorus = off-beat notes
// and occasional doubles, finale = doubles and fast runs.
export function buildChart(random) {
  const chart = [];
  const beats = Math.floor(SONG.length / SONG.beat);
  let lastLane = -1;
  for (let b = 0; b < beats; b += 1) {
    const t = 2 + b * SONG.beat; // first note 2 s in, after the count-in
    const section = t < 24 ? 0 : t < 48 ? 1 : 2;
    const r = random();
    const density = section === 0 ? 0.55 : section === 1 ? 0.8 : 0.95;
    if (r > density) continue;
    // Pick a lane that is not the same as the last one twice in a row.
    let lane = Math.floor(random() * LANES);
    if (lane === lastLane && random() < 0.7) lane = (lane + 1 + Math.floor(random() * 3)) % LANES;
    lastLane = lane;
    chart.push({ lane, time: t, judged: false, result: null });
    // Off-beat extra in chorus/finale, and doubles in the finale.
    if (section >= 1 && random() < 0.35) {
      const lane2 = (lane + 1 + Math.floor(random() * (LANES - 1))) % LANES;
      chart.push({ lane: lane2, time: t + SONG.beat / 2, judged: false, result: null });
    }
    if (section === 2 && random() < 0.22) {
      const lane3 = (lane + 2) % LANES;
      chart.push({ lane: lane3, time: t, judged: false, result: null });
    }
  }
  chart.sort((a, b) => a.time - b.time || a.lane - b.lane);
  return chart;
}

export function createWorld(random) {
  const chart = buildChart(random);
  const state = {
    chart,
    time: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    lives: LIVES,
    perfect: 0,
    good: 0,
    miss: 0,
    total: chart.length,
    lastJudge: null,
    lastJudgeTime: -99,
    section: 0,
    over: false,
    won: false,
    // Visual hit effects, filled by hitNote(); the renderer reads them.
    effects: [],
  };
  // Pre-allocated effect pool (12 slots).
  for (let i = 0; i < 12; i += 1) state.effects.push({ active: false, lane: 0, time: 0, kind: 'perfect' });

  function reset() {
    for (const note of chart) { note.judged = false; note.result = null; }
    state.time = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.lives = LIVES;
    state.perfect = 0;
    state.good = 0;
    state.miss = 0;
    state.lastJudge = null;
    state.lastJudgeTime = -99;
    state.section = 0;
    state.over = false;
    state.won = false;
    for (const e of state.effects) e.active = false;
  }

  function addEffect(lane, kind) {
    for (const e of state.effects) {
      if (!e.active) { e.active = true; e.lane = lane; e.time = 0; e.kind = kind; return; }
    }
  }

  function judgeNote(note, dt) {
    const adt = Math.abs(dt);
    if (adt <= WINDOW.perfect) return JUDGE_PERFECT;
    if (adt <= WINDOW.good) return JUDGE_GOOD;
    return null;
  }

  // Hit the nearest unjudged note in `lane` within the good window.
  // Returns the judgement string, or null when there is nothing to hit.
  function hitLane(lane) {
    if (state.over) return null;
    let best = null;
    let bestDt = Infinity;
    for (const note of chart) {
      if (note.judged || note.lane !== lane) continue;
      const dt = state.time - note.time;
      if (Math.abs(dt) > WINDOW.good) continue;
      if (Math.abs(dt) < bestDt) { best = note; bestDt = Math.abs(dt); }
    }
    if (!best) return null;
    const judge = judgeNote(best, state.time - best.time);
    best.judged = true;
    best.result = judge;
    state.lastJudge = judge;
    state.lastJudgeTime = state.time;
    state.combo += 1;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    if (judge === JUDGE_PERFECT) {
      state.perfect += 1;
      state.score += SCORE.perfect + state.combo * SCORE.comboBonus;
    } else {
      state.good += 1;
      state.score += SCORE.good + state.combo * SCORE.comboBonus;
    }
    addEffect(lane, judge);
    return judge;
  }

  function step(dt) {
    if (state.over) return 0;
    let events = 0;
    state.time += dt;
    state.section = state.time < 24 ? 0 : state.time < 48 ? 1 : 2;
    for (const e of state.effects) {
      if (e.active) { e.time += dt; if (e.time > 0.5) e.active = false; }
    }
    // Misses: any note whose good window has passed unjudged.
    for (const note of chart) {
      if (note.judged) continue;
      if (state.time - note.time > WINDOW.good) {
        note.judged = true;
        note.result = JUDGE_MISS;
        state.miss += 1;
        state.combo = 0;
        state.lives -= 1;
        state.lastJudge = JUDGE_MISS;
        state.lastJudgeTime = state.time;
        events |= EVENT_MISS;
        if (state.lives <= 0) {
          state.lives = 0;
          state.over = true;
          state.won = false;
          events |= EVENT_OVER;
          return events;
        }
      }
    }
    if (state.time >= SONG.length + 1.5) {
      state.over = true;
      state.won = true;
      events |= EVENT_WIN;
    }
    return events;
  }

  // Notes currently on screen: not yet judged, within the fall window.
  function visibleNotes() {
    const out = [];
    for (const note of state.chart) {
      if (note.judged) continue;
      const dt = note.time - state.time;
      if (dt < SONG.fallTime && dt > -0.2) out.push(note);
    }
    return out;
  }

  function noteY(note) {
    // Linear fall: note spawns at LANE_TOP, reaches HIT_Y at its time.
    const progress = 1 - (note.time - state.time) / SONG.fallTime;
    return 150 + progress * (HIT_Y - 150);
  }

  function accuracy() {
    const judged = state.perfect + state.good + state.miss;
    if (judged === 0) return 100;
    return Math.round(((state.perfect + state.good * 0.5) / judged) * 1000) / 10;
  }

  function rank() {
    const acc = accuracy();
    if (acc >= 97 && state.miss === 0) return 'S';
    if (acc >= 92) return 'A';
    if (acc >= 80) return 'B';
    return 'C';
  }

  reset();
  return {
    state, reset, step, hitLane, visibleNotes, noteY, accuracy, rank,
    laneX, fieldWidth: FIELD.width,
  };
}
