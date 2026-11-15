// Breakwater — input: mouse clicks on pads and towers, hover tracking, and
// the keyboard shortcuts. All input funnels through here into state so the
// game loop stays pure simulation + render.

import { TOWER_ORDER, TOWER_TYPES } from './config.js';
import { placeTower, upgradeTower, sellTower } from './towers.js';
import { startWave } from './waves.js';
import { resetState } from './state.js';
import { ensureAudio, setMuted, sfx } from './audio.js';

export function attachInput(canvas, state, actions) {
  const toGame = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1280,
      y: ((e.clientY - rect.top) / rect.height) * 720,
    };
  };

  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    state.mouse.x = p.x;
    state.mouse.y = p.y;
    state.mouse.inside = true;
    state.hoverPad = padAt(state, p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => { state.mouse.inside = false; state.hoverPad = null; });

  canvas.addEventListener('click', (e) => {
    ensureAudio(state.muted);
    const p = toGame(e);
    handleClick(state, p.x, p.y, actions);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === '2' || k === '3') {
      state.selectedType = TOWER_ORDER[Number(k) - 1];
      state.selectedTower = null;
      sfx.click();
    } else if (k === ' ') {
      e.preventDefault();
      if (state.screen === 'title') actions.startGame();
      else if (state.screen === 'build') startWave(state);
      else if (state.screen === 'wave') state.fastForward = !state.fastForward;
      else if (state.screen === 'victory' || state.screen === 'defeat') actions.startGame();
    } else if (k === 'p') {
      if (state.screen === 'wave' || state.screen === 'build') {
        state.paused = !state.paused;
        sfx.click();
      }
    } else if (k === 'r') {
      if (state.screen !== 'title') actions.startGame();
    } else if (k === 'm') {
      state.muted = !state.muted;
      setMuted(state.muted);
    } else if (k === 'escape') {
      state.selectedTower = null;
    } else if (k === 'enter') {
      if (state.screen === 'title' || state.screen === 'victory' || state.screen === 'defeat') actions.startGame();
      else if (state.screen === 'build') startWave(state);
    }
  });
}

export function padAt(state, x, y) {
  for (const pad of state.pads) {
    if (Math.hypot(pad.x - x, pad.y - y) <= 26) return pad;
  }
  return null;
}

export function towerAt(state, x, y) {
  for (const t of state.towers) {
    if (Math.hypot(t.x - x, t.y - 10) <= 26) return t;
  }
  return null;
}

export function handleClick(state, x, y, actions) {
  if (state.screen === 'title') { actions.startGame(); return; }
  if (state.screen === 'victory' || state.screen === 'defeat') { actions.startGame(); return; }
  if (state.screen !== 'build' && state.screen !== 'wave') return;
  if (state.paused) return;

  // Buttons drawn on the canvas first (upgrade / sell / start wave).
  const btn = buttonAt(state, x, y);
  if (btn) { btn(); return; }

  const tower = towerAt(state, x, y);
  if (tower) {
    state.selectedTower = tower.id;
    state.selectedType = tower.type;
    sfx.click();
    return;
  }
  const pad = padAt(state, x, y);
  if (pad) {
    if (pad.towerId !== null) {
      const t = state.towers.find((tw) => tw.id === pad.towerId);
      if (t) state.selectedTower = t.id;
      return;
    }
    const res = placeTower(state, pad, state.selectedType);
    if (!res.ok) {
      state.message = res.reason;
      state.messageTimer = 1.4;
      sfx.error();
    }
    return;
  }
  state.selectedTower = null;
}

// Buttons are drawn by render.js in the side panel; this mirrors their
// rectangles so clicks land. Kept in one place to avoid drift.
export function buttonAt(state, x, y) {
  // Panel buttons live at x 1064..1256 in the right column.
  const inX = x >= 1064 && x <= 1256;
  if (!inX) return null;
  // Start-wave button (build screen): y 560..600.
  if (state.screen === 'build' && y >= 560 && y <= 600) return () => startWave(state);
  // Selected-tower panel: the shop is 3 rows of 74px from y 108, so the
  // tower panel starts at y 330; upgrade rect y 396..428, sell y 436..468.
  if (state.selectedTower !== null) {
    const tower = state.towers.find((t) => t.id === state.selectedTower);
    if (!tower) return null;
    if (y >= 396 && y <= 428) {
      return () => {
        const res = upgradeTower(state, tower);
        if (!res.ok) { state.message = res.reason; state.messageTimer = 1.4; sfx.error(); }
      };
    }
    if (y >= 436 && y <= 468) {
      return () => { sellTower(state, tower); };
    }
  }
  return null;
}

export function startNewGame(state) {
  resetState(state);
  state.screen = 'build';
  state.buildTimer = 20;
  ensureAudio(state.muted);
  sfx.waveStart();
}
