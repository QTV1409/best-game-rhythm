// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), the
// music scheduler follows the song time, and the renderer paints what is
// there. The game moves between four screens: title, play, paused and
// game over (win or lose).
//
// ?seed=N fixes the chart. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LANE_X0, LANE_WIDTH, LANE_GAP, LANES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_MISS, EVENT_OVER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

// Map a logical (x, y) click to a lane, or null when it is not on a lane.
function laneAt(x, y) {
  if (y < 150 || y > 660) return null;
  for (let lane = 0; lane < LANES; lane += 1) {
    const lx = LANE_X0 + lane * (LANE_WIDTH + LANE_GAP);
    if (x >= lx && x <= lx + LANE_WIDTH) return lane;
  }
  return null;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, {
      noteY: (note) => world.noteY(note),
      visibleNotes: () => world.visibleNotes(),
      accuracy: () => world.accuracy(),
      rank: () => world.rank(),
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, laneAt);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let flashLane = -1;
  let flashTime = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.start();
    announce(`Playing Neon Encore. ${world.state.lives} lives. Hit the notes with D F J K or click a lane.`);
  }

  function endGame(won) {
    screen = SCREEN_OVER;
    audio.stop();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `You win! Score ${world.state.score}. Rank ${world.rank()}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Music muted.' : 'Music on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stop();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      audio.start();
      announce('Playing.');
    }
  }

  function handleLaneHits() {
    for (const lane of input.takeLaneHits()) {
      if (screen !== SCREEN_PLAY) {
        if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
        continue;
      }
      flashLane = lane;
      flashTime = 0;
      const judge = world.hitLane(lane);
      if (judge === 'perfect' || judge === 'good') audio.hit(judge === 'perfect');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const events = world.step(STEP);
    audio.update(world.state.time);
    if (events & EVENT_MISS) audio.miss();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_HIT) {
      // Hit announcements are handled by the judgement popup in the HUD.
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleLaneHits();
    if (flashTime < 0.12) flashTime += 1 / 60;
    else flashLane = -1;
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, {
      noteY: (note) => world.noteY(note),
      visibleNotes: () => world.visibleNotes(),
      accuracy: () => world.accuracy(),
      rank: () => world.rank(),
      flashLane,
      muted: audio.muted,
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stop();
      announce('Paused.');
    }
  });

  announce('Neon Encore. Press Space or click to start. D F J K hit the notes.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
