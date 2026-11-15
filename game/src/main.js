// Breakwater — main: the game loop and the glue. Owns the canvas, the clock,
// and the step function the loop and the screenshot staging share.

import { VIEW_W, VIEW_H } from './config.js';
import { createState } from './state.js';
import { updateEnemies, updateParticles } from './enemies.js';
import { updateTowers, updateProjectiles } from './towers.js';
import { updateSpawning, checkWaveCleared, tickBuildTimer } from './waves.js';
import { render } from './render.js';
import { attachInput, startNewGame } from './input.js';
import { stageShot } from './shots.js';
import { ensureAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createState();

export function stepGame(s, dt) {
  s.time += dt;
  if (s.messageTimer > 0) s.messageTimer -= dt;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 22);
  if (s.screen === 'title' || s.screen === 'victory' || s.screen === 'defeat') {
    updateParticles(s, dt);
    return;
  }
  if (s.paused) return;
  tickBuildTimer(s, dt);
  updateSpawning(s, dt);
  updateTowers(s, dt);
  updateProjectiles(s, dt);
  updateEnemies(s, dt);
  updateParticles(s, dt);
  checkWaveCleared(s);
}

const actions = {
  startGame() {
    startNewGame(state);
  },
};

attachInput(canvas, state, actions);

// Screenshot staging: ?shot=start|play|late|end&seed=7
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') || '7');
  stageShot(state, shot, seed);
  render(ctx, state);
  // Expose the staged state for automated checks.
  window.__breakwater = { state, shot, seed };
} else {
  let last = performance.now();
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const speed = state.fastForward ? 2 : 1;
    stepGame(state, dt * speed);
    render(ctx, state);
    requestAnimationFrame(frame);
  }
  // First user gesture unlocks audio; the Start button calls ensureAudio.
  canvas.addEventListener('pointerdown', () => ensureAudio(state.muted), { once: true });
  requestAnimationFrame(frame);
}

window.__breakwater = window.__breakwater || { state };
