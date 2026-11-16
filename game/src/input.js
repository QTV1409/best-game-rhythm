// Keyboard and pointer input. Lane keys (D/F/J/K) are one-shot hits and are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Clicking/tapping a lane
// receptor hits that lane. Space/Enter confirms (start/restart), P pauses,
// M toggles the music.

import { LANES, LANE_KEYS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas, onLaneHit) {
  let actions = 0;
  const laneHits = [];
  for (let i = 0; i < LANES; i += 1) laneHits.push(false);

  window.addEventListener('keydown', (event) => {
    const lane = LANE_KEYS.indexOf(event.code);
    if (lane !== -1) {
      if (!event.repeat) laneHits[lane] = true;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });

  // Mouse / touch: clicking a lane's receptor (or anywhere in its column
  // below the stage) hits that lane; clicking a panel confirms.
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    // Convert device pixels back to the 1280x720 logical field.
    const scale = Math.min(canvas.width / 1280, canvas.height / 720);
    const lx = (x - (canvas.width - 1280 * scale) / 2) / scale;
    const ly = (y - (canvas.height - 720 * scale) / 2) / scale;
    if (typeof onLaneHit === 'function') {
      const lane = onLaneHit(lx, ly);
      if (lane !== null && lane !== undefined && lane >= 0) {
        laneHits[lane] = true;
        return;
      }
    }
    actions |= ACTION_CONFIRM;
  });

  return {
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Lanes hit since the last call (array of lane indexes). */
    takeLaneHits() {
      const hits = [];
      for (let i = 0; i < LANES; i += 1) {
        if (laneHits[i]) { hits.push(i); laneHits[i] = false; }
      }
      return hits;
    },
  };
}
