// Breakwater — game state: one plain object the whole game reads and writes.
// Screens: 'title' | 'build' | 'wave' | 'victory' | 'defeat'. The loop in
// main.js moves between them; nothing else mutates the screen directly.

import {
  START_GOLD, START_LANTERN_HP, WAVE_COUNT, BUILD_PHASE_SECONDS, PADS,
} from './config.js';

export function createState() {
  return {
    screen: 'title', // title, build, wave, victory, defeat
    time: 0, // seconds since the game started (title included)
    wave: 0, // current wave number, 1-based once started
    gold: START_GOLD,
    score: 0,
    kills: 0,
    leaks: 0,
    lanternHp: START_LANTERN_HP,
    lanternMax: START_LANTERN_HP,
    enemies: [], // live enemies, each {type, x, y, hp, maxHp, speed, slowUntil, slowPct, waypoint, dist, reward, ...}
    towers: [], // placed towers, each {id, type, pad, level, invested, cooldown, angle, kills}
    projectiles: [], // {x, y, tx, ty, target, damage, splash, speed, color, kind}
    particles: [], // {x, y, vx, vy, life, maxLife, size, color}
    floats: [], // floating text {x, y, text, life, color, size}
    pads: PADS.map((p, i) => ({ ...p, id: i, towerId: null })),
    selectedType: 'harpoon', // tower type the next click places
    selectedTower: null, // tower id selected for upgrade/sell, or null
    hoverPad: null,
    mouse: { x: 0, y: 0, inside: false },
    spawnQueue: [], // enemy type keys waiting to spawn this wave
    spawnTimer: 0,
    waveActive: false,
    buildTimer: BUILD_PHASE_SECONDS,
    fastForward: false,
    paused: false,
    muted: false,
    shake: 0, // screen-shake magnitude, decays to 0
    message: '', // transient banner text (e.g. "Wave 3 cleared!")
    messageTimer: 0,
    stats: { shots: 0, placed: 0, upgraded: 0, sold: 0 },
    seed: 0, // fixed seed when staging screenshots; 0 = unseeded play
    rngState: 1,
  };
}

// Small deterministic RNG so a staged screenshot replays identically.
export function rng(state) {
  // mulberry32
  state.rngState = (state.rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(state.rngState ^ (state.rngState >>> 15), 1 | state.rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function resetState(state) {
  const fresh = createState();
  fresh.seed = state.seed;
  fresh.rngState = state.seed || 1;
  fresh.muted = state.muted;
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
}

export function enemiesRemaining(state) {
  return state.enemies.length + state.spawnQueue.length;
}

export function waveCleared(state) {
  return state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0;
}

export function totalWaves() {
  return WAVE_COUNT;
}
