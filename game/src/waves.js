// Breakwater — waves: building the spawn queue for a wave, starting it,
// and what happens when a wave is cleared (bonus gold, score, victory).

import { waveComp, SPAWN_GAP, WAVE_CLEAR_BONUS, WAVE_COUNT, BUILD_PHASE_SECONDS } from './config.js';
import { spawnEnemy } from './enemies.js';
import { sfx } from './audio.js';

export function startWave(state) {
  if (state.wave >= WAVE_COUNT) return false;
  state.wave++;
  state.spawnQueue = waveComp(state.wave);
  state.spawnTimer = 0.5;
  state.waveActive = true;
  state.screen = 'wave';
  state.buildTimer = BUILD_PHASE_SECONDS;
  state.message = `Wave ${state.wave} — the tide comes in!`;
  state.messageTimer = 2.2;
  sfx.waveStart();
  return true;
}

export function updateSpawning(state, dt) {
  if (!state.waveActive || state.spawnQueue.length === 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const type = state.spawnQueue.shift();
    spawnEnemy(state, type, state.wave);
    state.spawnTimer = SPAWN_GAP;
  }
}

export function checkWaveCleared(state) {
  if (!state.waveActive) return;
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    const bonus = WAVE_CLEAR_BONUS(state.wave);
    state.gold += bonus;
    state.score += bonus;
    if (state.wave >= WAVE_COUNT) {
      state.screen = 'victory';
      state.message = '';
      sfx.victory();
      return;
    }
    state.screen = 'build';
    state.buildTimer = BUILD_PHASE_SECONDS;
    state.message = `Wave ${state.wave} cleared! +${bonus}g bonus`;
    state.messageTimer = 2.5;
    sfx.waveClear();
  }
}

export function tickBuildTimer(state, dt) {
  if (state.screen !== 'build') return;
  state.buildTimer -= dt;
  if (state.buildTimer <= 0) startWave(state);
}
