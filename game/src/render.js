// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the backdrop colour. Flat anime-style shapes, canvas
// text for the HUD and the panels. The band is drawn in code on a stage
// above the lanes: four original chibi members with instruments, spotlights
// and a cheering crowd.

import { BAND, FIELD, FONT, HIT_Y, LANES, LANE_COLORS, LANE_DARK, LANE_LABELS, LANE_NAMES, LANE_WIDTH, LANE_GAP, LANE_X0, LIVES, PALETTE, SONG } from './config.js';
import { JUDGE_GOOD, JUDGE_MISS, JUDGE_PERFECT } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function laneX(lane) {
  return LANE_X0 + lane * (LANE_WIDTH + LANE_GAP);
}
function laneCenter(lane) {
  return laneX(lane) + LANE_WIDTH / 2;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    context.font = `${weight || 400} ${size}px ${FONT}`;
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  // A chibi band member: round head, hair, body, instrument. Drawn flat
  // with thick outlines, anime style.
  function drawMember(member, cx, baseY, scale, bounce) {
    const s = scale;
    const y = baseY - bounce;
    context.lineWidth = 3 * s;
    context.strokeStyle = '#1a0f2e';
    // Body / outfit
    context.fillStyle = member.color;
    roundRect(cx - 16 * s, y - 34 * s, 32 * s, 34 * s, 8 * s);
    context.fill(); context.stroke();
    // Head
    context.fillStyle = '#ffe3c2';
    context.beginPath(); context.arc(cx, y - 48 * s, 17 * s, 0, Math.PI * 2); context.fill(); context.stroke();
    // Hair: a cap of colour over the head, with two side tufts.
    context.fillStyle = member.hair;
    context.beginPath(); context.arc(cx, y - 52 * s, 18 * s, Math.PI, 0); context.fill();
    context.beginPath(); context.arc(cx - 16 * s, y - 44 * s, 7 * s, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(cx + 16 * s, y - 44 * s, 7 * s, 0, Math.PI * 2); context.fill();
    // Eyes
    context.fillStyle = '#1a0f2e';
    context.beginPath(); context.arc(cx - 6 * s, y - 48 * s, 2.2 * s, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(cx + 6 * s, y - 48 * s, 2.2 * s, 0, Math.PI * 2); context.fill();
    // Instrument
    context.strokeStyle = '#f5f0ff';
    context.lineWidth = 4 * s;
    if (member.instrument === 'guitar' || member.instrument === 'bass') {
      context.beginPath(); context.moveTo(cx - 22 * s, y - 18 * s); context.lineTo(cx + 22 * s, y - 34 * s); context.stroke();
      context.fillStyle = member.color;
      context.beginPath(); context.arc(cx - 14 * s, y - 20 * s, 8 * s, 0, Math.PI * 2); context.fill();
    } else if (member.instrument === 'drums') {
      context.fillStyle = '#e8ddff';
      context.beginPath(); context.arc(cx - 20 * s, y - 12 * s, 9 * s, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.arc(cx + 20 * s, y - 12 * s, 9 * s, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.moveTo(cx - 10 * s, y - 40 * s); context.lineTo(cx - 22 * s, y - 16 * s); context.stroke();
      context.beginPath(); context.moveTo(cx + 10 * s, y - 40 * s); context.lineTo(cx + 22 * s, y - 16 * s); context.stroke();
    } else {
      // Mic on a stand
      context.beginPath(); context.moveTo(cx + 18 * s, y - 6 * s); context.lineTo(cx + 18 * s, y - 44 * s); context.stroke();
      context.fillStyle = '#3a3a4a';
      context.beginPath(); context.arc(cx + 18 * s, y - 48 * s, 6 * s, 0, Math.PI * 2); context.fill();
    }
    context.lineWidth = 3 * s;
  }

  function drawStage(state, time) {
    // Night sky + spotlights
    const grad = context.createLinearGradient(0, 0, 0, 170);
    grad.addColorStop(0, PALETTE.stageTop);
    grad.addColorStop(1, PALETTE.stageBottom);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, 170);
    // Spotlights sweeping
    for (let i = 0; i < 3; i += 1) {
      const sx = 300 + i * 340 + Math.sin(time * 0.7 + i * 2) * 90;
      context.fillStyle = `rgba(255, 210, 62, ${0.06 + 0.03 * Math.sin(time * 2 + i)})`;
      context.beginPath();
      context.moveTo(sx - 18, 0); context.lineTo(sx + 18, 0);
      context.lineTo(sx + 90, 170); context.lineTo(sx - 90, 170);
      context.closePath(); context.fill();
    }
    // Stage floor
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 118, FIELD.width, 52);
    context.fillStyle = '#241a40';
    context.fillRect(0, 118, FIELD.width, 4);
    // Band, bouncing to the beat
    const beat = (time % 0.5) / 0.5;
    const bounce = Math.max(0, Math.sin(beat * Math.PI)) * 6;
    BAND.forEach((member, i) => {
      const cx = 340 + i * 200;
      drawMember(member, cx, 168, 1, i === 2 ? bounce * 0.4 : bounce);
      text(member.name, cx, 196, 13, PALETTE.muted, 'center');
    });
    // Crowd silhouettes along the bottom of the stage
    context.fillStyle = '#0a0614';
    for (let x = 20; x < FIELD.width; x += 46) {
      const h = 12 + ((x * 7) % 10);
      context.beginPath(); context.arc(x, 168 - h, 9, 0, Math.PI * 2); context.fill();
      context.fillRect(x - 9, 168 - h, 18, h + 4);
    }
    // Title on the stage backdrop
    text('NEON ENCORE', 40, 48, 30, '#ffffff', 'left', 800);
    text(`LUMEN PULSE  ·  ${SONG.title}`, 40, 76, 16, PALETTE.muted, 'left');
  }

  function drawLanes(state, flashLane) {
    for (let lane = 0; lane < LANES; lane += 1) {
      const x = laneX(lane);
      context.fillStyle = 'rgba(255,255,255,0.05)';
      context.fillRect(x, 150, LANE_WIDTH, HIT_Y - 150 + 44);
      context.strokeStyle = 'rgba(255,255,255,0.14)';
      context.lineWidth = 1;
      context.strokeRect(x, 150, LANE_WIDTH, HIT_Y - 150 + 44);
      // Receptor (hit pad)
      context.fillStyle = flashLane === lane ? LANE_COLORS[lane] : LANE_DARK[lane];
      roundRect(x + 4, HIT_Y - 16, LANE_WIDTH - 8, 32, 8);
      context.fill();
      context.strokeStyle = LANE_COLORS[lane];
      context.lineWidth = 2;
      context.stroke();
      text(LANE_LABELS[lane], x + LANE_WIDTH / 2, HIT_Y + 12, 18, '#ffffff', 'center', 700);
      text(LANE_NAMES[lane], x + LANE_WIDTH / 2, HIT_Y + 62, 12, LANE_COLORS[lane], 'center');
    }
  }

  function drawNotes(state, noteY, visibleNotes) {
    const notes = visibleNotes ? visibleNotes() : [];
    for (const note of notes) {
      const y = noteY(note);
      const x = laneX(note.lane);
      context.fillStyle = LANE_COLORS[note.lane];
      roundRect(x + 8, y - 16, LANE_WIDTH - 16, 32, 10);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.85)';
      roundRect(x + 16, y - 9, LANE_WIDTH - 32, 8, 4);
      context.fill();
    }
    // Hit effects
    for (const e of state.effects) {
      if (!e.active) continue;
      const a = 1 - e.time / 0.5;
      const cx = laneCenter(e.lane);
      context.strokeStyle = e.kind === JUDGE_PERFECT ? '#ffffff' : LANE_COLORS[e.lane];
      context.globalAlpha = a;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(cx, HIT_Y, 20 + e.time * 90, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawHud(state, best, muted) {
    context.textBaseline = 'top';
    text(`SCORE  ${state.score}`, 24, 182, 26, PALETTE.text, 'left', 700);
    text(`COMBO  ${state.combo}`, 24, 214, 20, state.combo >= 20 ? PALETTE.gold : PALETTE.muted, 'left', 700);
    text(`BEST  ${best}`, 24, 240, 16, PALETTE.muted, 'left');
    // Lives as hearts
    for (let i = 0; i < LIVES; i += 1) {
      const x = FIELD.width - 24 - (LIVES - i) * 34;
      context.fillStyle = i < state.lives ? PALETTE.pink : '#3a2a55';
      context.font = '26px ' + FONT;
      context.textAlign = 'center';
      context.fillText('♥', x + 12, 184);
    }
    text(`LIVES ${state.lives}/${LIVES}`, FIELD.width - 24, 214, 16, PALETTE.muted, 'right');
    // Progress bar
    const pw = 260;
    const px = FIELD.width - 24 - pw;
    context.fillStyle = '#2a1e4d';
    context.fillRect(px, 244, pw, 8);
    context.fillStyle = PALETTE.cyan;
    context.fillRect(px, 244, pw * Math.min(1, state.time / SONG.length), 8);
    text(`SONG  ${Math.floor(state.time)}s / ${SONG.length}s`, FIELD.width - 24, 258, 14, PALETTE.muted, 'right');
    const sections = ['VERSE', 'CHORUS', 'FINALE'];
    text(sections[state.section], FIELD.width / 2, 182, 18, PALETTE.gold, 'center', 700);
    if (muted) text('MUTED (M)', FIELD.width / 2, 208, 14, PALETTE.muted, 'center');
    // Last judgement popup
    if (state.lastJudge && state.time - state.lastJudgeTime < 0.6) {
      const label = state.lastJudge === JUDGE_PERFECT ? 'PERFECT!' : state.lastJudge === JUDGE_GOOD ? 'GOOD' : 'MISS';
      const color = state.lastJudge === JUDGE_PERFECT ? PALETTE.gold : state.lastJudge === JUDGE_GOOD ? PALETTE.cyan : PALETTE.pink;
      text(label, FIELD.width / 2, 320, 34, color, 'center', 800);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(5, 2, 14, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 44, accent || PALETTE.text, 'center', 800);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 118 + index * 34, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.gold, 'center', 700);
  }

  function draw(state, screen, best, opts) {
    const o = opts || {};
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const time = state.time || 0;
    drawStage(state, screen === SCREEN_TITLE ? 0 : time);
    drawLanes(state, o.flashLane ?? -1);
    if (screen === SCREEN_TITLE) {
      drawPanel('NEON ENCORE', [
        'LUMEN PULSE live on stage — catch the falling notes on the beat.',
        'D  F  J  K  or click a lane to hit its note.  Miss a note, lose a life.',
        'Survive the whole 72-second song to win.  Best score: ' + best,
        '',
      ], 'Press Space or click to start', PALETTE.pink);
      return;
    }
    drawNotes(state, o.noteY, o.visibleNotes);
    drawHud(state, best, o.muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The band is waiting for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      const won = state.won;
      const acc = o.accuracy ? o.accuracy() : 100;
      const rank = o.rank ? o.rank() : '—';
      const lines = won
        ? [`You finished the song!  Rank ${rank}  ·  Accuracy ${acc}%`, `Score ${state.score}  ·  Max combo ${state.maxCombo}  ·  Perfect ${state.perfect}  ·  Good ${state.good}  ·  Miss ${state.miss}`, `Best ${best}`]
        : [`The crowd goes quiet…  ${state.lives} lives left, song ended at ${Math.floor(state.time)}s`, `Score ${state.score}  ·  Max combo ${state.maxCombo}  ·  Perfect ${state.perfect}  ·  Good ${state.good}  ·  Miss ${state.miss}`, `Best ${best}`];
      drawPanel(won ? 'ENCORE! YOU WIN!' : 'GAME OVER', lines, 'Press Space or click to play again', won ? PALETTE.gold : PALETTE.pink);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, laneX, laneCenter };
}
