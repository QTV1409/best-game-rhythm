// Neon Encore — an original anime band rhythm game.
// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

// The song: 120 BPM, one beat every 0.5 s, three sections that get denser.
export const SONG = {
  title: 'Neon Encore',
  band: 'LUMEN PULSE',
  bpm: 120,
  beat: 0.5,
  length: 72, // seconds of chart (plus a short outro)
  fallTime: 1.7, // seconds a note takes to travel to the hit line
};

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LANES = 4;
export const LANE_KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
export const LANE_LABELS = ['D', 'F', 'J', 'K'];
export const LANE_NAMES = ['Aria', 'Kira', 'Mika', 'Sora'];
// One colour per lane / band member.
export const LANE_COLORS = ['#ff5fa2', '#4fc3f7', '#ffd23e', '#7dff6a'];
export const LANE_DARK = ['#8a1f4d', '#145a7d', '#8a6d00', '#1f7a2e'];

// Hit line and lane geometry (logical coordinates).
export const HIT_Y = 600;
export const LANE_TOP = 150;
export const LANE_WIDTH = 110;
export const LANE_GAP = 14;
export const LANE_X0 = (FIELD.width - (LANE_WIDTH * LANES + LANE_GAP * (LANES - 1))) / 2;

export const LIVES = 3;
export const SCORE = { perfect: 300, good: 100, comboBonus: 2 };
export const WINDOW = { perfect: 0.09, good: 0.18 }; // seconds around a note

export const BEST_KEY = 'neon-encore.best';

export const PALETTE = {
  backdrop: '#0b0716',
  stageTop: '#1c0f38',
  stageBottom: '#0b0716',
  floor: '#17102b',
  panel: '#1d1433',
  panelEdge: '#3d2a6b',
  text: '#f5f0ff',
  muted: '#b9a8e0',
  gold: '#ffd23e',
  pink: '#ff5fa2',
  cyan: '#4fc3f7',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Original band members (drawn in code, no copied art): name, role, colour,
// hair colour and instrument, in lane order.
export const BAND = [
  { name: 'Aria', role: 'Vocals', color: '#ff5fa2', hair: '#ff8fc0', instrument: 'mic' },
  { name: 'Kira', role: 'Guitar', color: '#4fc3f7', hair: '#7fd4ff', instrument: 'guitar' },
  { name: 'Mika', role: 'Drums', color: '#ffd23e', hair: '#ffe27a', instrument: 'drums' },
  { name: 'Sora', role: 'Bass', color: '#7dff6a', hair: '#a5f2a0', instrument: 'bass' },
];
