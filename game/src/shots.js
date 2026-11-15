// Breakwater — screenshot staging: ?shot=start|play|late|end (+ ?seed=N).
// Each value deterministically plays the REAL game forward from a fresh state
// with a simple autopilot (place towers on sensible pads, start waves, run
// the simulation), so the rendered frame is a genuine state of the real
// game — never a mock scene. The same seed always gives the same frame:
// during staging Math.random is replaced by the state's seeded RNG, so
// enemy wobble, floating numbers and particles replay identically.

import { resetState, rng } from './state.js';
import { placeTower, upgradeTower } from './towers.js';
import { startWave } from './waves.js';
import { stepGame } from './main.js';

// Sensible pads: a mix of early-path and late-path pads.
const AUTOPILOT_BUILDS = [
  { pad: 1, type: 'harpoon' },
  { pad: 3, type: 'harpoon' },
  { pad: 7, type: 'frost' },
  { pad: 9, type: 'cannon' },
  { pad: 11, type: 'harpoon' },
  { pad: 4, type: 'frost' },
  { pad: 12, type: 'cannon' },
  { pad: 0, type: 'harpoon' },
  { pad: 8, type: 'frost' },
  { pad: 13, type: 'harpoon' },
];

function autopilotBuild(state) {
  for (const b of AUTOPILOT_BUILDS) {
    const pad = state.pads[b.pad];
    if (!pad || pad.towerId !== null) continue;
    placeTower(state, pad, b.type);
  }
  // Upgrade the first two towers if gold allows.
  for (const t of state.towers.slice(0, 2)) {
    if (t.level < 2 && state.gold >= 40) upgradeTower(state, t);
  }
}

// runSteps advances the real simulation a fixed number of frames.
function runSteps(state, seconds, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    stepGame(state, dt);
    if (state.screen === 'victory' || state.screen === 'defeat') break;
  }
}

// runUntilBuild steps the simulation in 5s chunks until the current wave
// clears (build screen) or the game ends, so staging never snapshots a
// wave's slow tail: a late hulk can take a minute to walk the whole path.
function runUntilBuild(state, maxSeconds = 180) {
  let spent = 0;
  while (state.screen === 'wave' && spent < maxSeconds) {
    runSteps(state, 5);
    spent += 5;
  }
}

function stageInner(state, shot) {
  if (shot === 'start') {
    state.screen = 'title';
    state.time = 3.0; // let the sea waves settle into a nice frame
    return;
  }

  // Every other shot plays a real game.
  state.screen = 'build';
  state.gold = 400; // a fair staging purse: the autopilot's towers
  autopilotBuild(state);
  if (shot === 'play') {
    // Mid-wave 1: enemies are still walking the path and towers are firing.
    startWave(state);
    runSteps(state, 9);
    state.time = 9;
    return;
  }
  if (shot === 'late') {
    // Clear waves 1..6 for real, then catch wave 7 mid-fight with the
    // field full of enemies and every tower firing.
    for (let w = 1; w <= 6; w++) {
      if (state.screen === 'build') startWave(state);
      runUntilBuild(state);
      autopilotBuild(state);
      if (state.screen === 'victory' || state.screen === 'defeat') break;
    }
    if (state.screen === 'build') startWave(state);
    runSteps(state, 12);
    state.time = 60;
    return;
  }
  if (shot === 'end') {
    // Play to the end: keep building and starting waves until victory or
    // defeat. A strong autopilot usually wins; either end screen is a real
    // result of the real game.
    for (let w = 1; w <= 10; w++) {
      if (state.screen === 'build') startWave(state);
      runUntilBuild(state);
      autopilotBuild(state);
      if (state.screen === 'victory' || state.screen === 'defeat') break;
    }
    state.time = 120;
    return;
  }
  // Unknown ?shot= value: fall back to the title screen.
  state.screen = 'title';
  state.time = 3.0;
}

export function stageShot(state, shot, seed) {
  state.seed = seed;
  resetState(state);
  state.rngState = seed || 1;
  state.muted = true;
  // Seed every random draw the simulation makes, then restore the real
  // Math.random so live play is unaffected.
  const realRandom = Math.random;
  Math.random = () => rng(state);
  try {
    stageInner(state, shot);
  } finally {
    Math.random = realRandom;
  }
  // A leak during staging leaves screen shake; zero it so the frame is
  // exactly reproducible from the seed.
  state.shake = 0;
}
