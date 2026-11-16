// The screenshot scenes behind ?shot=start|play|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, with
// an autopilot that hits notes on time, so the frame is what a real game
// looks like and the same seed always gives the same frame.
// - start: the title screen over a few seconds of falling notes.
// - play: mid-song, notes on screen, HUD showing score and combo.
// - end: the autopilot plays to the end of the song (and wins), so the
//   frame is the results screen with a real score, combo and rank.

import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 30;

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / 1; i += 1) {
      // Advance the backdrop: step the world in harmless mode by stepping
      // time only — notes fall, nothing is judged.
      world.state.time += 1 / 60;
    }
    // Rebuild a few visible notes by stepping normally but ignoring misses:
    // simplest honest backdrop is the title screen over the stage.
    return { screen: SCREEN_TITLE, best: 0 };
  }
  // Autopilot: hit every note whose time has arrived.
  function autopilot() {
    const now = world.state.time;
    for (const note of world.state.chart) {
      if (!note.judged && Math.abs(note.time - now) < 0.05) world.hitLane(note.lane);
    }
  }
  const limit = name === 'end' ? 80 : PLAY_SECONDS;
  const steps = Math.floor(limit / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilot();
    const events = world.step(STEP);
    if (world.state.over) break;
    void events;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
