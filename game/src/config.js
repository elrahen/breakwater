// Breakwater — configuration: the field, the tide path, towers, enemies, waves.
// One place for every number the game tunes on, so balancing never means
// hunting through the simulation code.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// The tide path: waypoints the enemies walk, from the open sea (left edge)
// to the harbor lantern (bottom right). Pads are placed off this path.
// The playfield is x 0..1040; x 1056..1264 is the side panel, so the path
// and the lantern stay left of it.
export const PATH = [
  { x: -20, y: 130 },
  { x: 760, y: 130 },
  { x: 760, y: 320 },
  { x: 190, y: 320 },
  { x: 190, y: 530 },
  { x: 900, y: 530 },
  { x: 900, y: 640 },
  { x: 1000, y: 640 },
];

export const LANTERN = { x: 1000, y: 640 };

// Build pads: circles the player can click to place a tower. Every pad sits
// at least 50px from the path's centreline so pads never overlap the road.
export const PADS = [
  { x: 120, y: 230 }, { x: 300, y: 230 }, { x: 480, y: 230 }, { x: 620, y: 230 },
  { x: 860, y: 220 }, { x: 1000, y: 220 }, { x: 860, y: 420 },
  { x: 620, y: 430 }, { x: 480, y: 430 }, { x: 330, y: 430 },
  { x: 330, y: 630 }, { x: 520, y: 630 }, { x: 720, y: 630 }, { x: 960, y: 430 },
];

export const TOWER_TYPES = {
  harpoon: {
    key: 'harpoon', name: 'Harpoon', short: 'Harpoon',
    cost: 50, range: 115, damage: 12, rate: 2.0, // shots per second
    color: '#ffd166', desc: 'Cheap, fast, single target.',
  },
  frost: {
    key: 'frost', name: 'Frost Spire', short: 'Frost',
    cost: 75, range: 105, damage: 5, rate: 1.0,
    slowPct: 0.45, slowTime: 1.6, splash: 95,
    color: '#7dd3fc', desc: 'Chills a whole cluster, slowing it.',
  },
  cannon: {
    key: 'cannon', name: 'Cannon', short: 'Cannon',
    cost: 120, range: 150, damage: 34, rate: 0.55,
    splash: 70,
    color: '#fb923c', desc: 'Slow shots, splash damage.',
  },
};

export const TOWER_ORDER = ['harpoon', 'frost', 'cannon'];

// Upgrade: each level multiplies damage by 1.45 and range by 1.08.
// Cost is 80% of the base cost, times the level being bought.
export const MAX_TOWER_LEVEL = 3;
export const UPGRADE_COST_FACTOR = 0.8;
export const SELL_RATE = 0.7;

export const ENEMY_TYPES = {
  drifter: {
    key: 'drifter', name: 'Drifter', hp: 46, speed: 42, reward: 8,
    leak: 1, radius: 13, color: '#38bdf8', score: 10,
  },
  swift: {
    key: 'swift', name: 'Swift', hp: 26, speed: 88, reward: 10,
    leak: 1, radius: 10, color: '#f472b6', score: 15,
  },
  hulk: {
    key: 'hulk', name: 'Hulk', hp: 210, speed: 26, reward: 26,
    leak: 2, radius: 19, color: '#a78bfa', score: 30,
  },
  boss: {
    key: 'boss', name: 'Tide King', hp: 2600, speed: 22, reward: 200,
    leak: 5, radius: 30, color: '#f43f5e', score: 500,
  },
};

// Waves: count and mix grow, health and speed scale with the wave number.
// hpMul and speedMul are applied on top of the base enemy stats.
export const WAVE_COUNT = 10;
export function waveComp(wave) {
  // Returns an array of enemy type keys in spawn order for wave (1-based).
  const list = [];
  const drifters = 5 + wave * 2;
  const swifts = wave >= 2 ? 2 + wave : 0;
  const hulks = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
  for (let i = 0; i < drifters; i++) list.push('drifter');
  for (let i = 0; i < swifts; i++) {
    list.splice(2 + i * 2, 0, 'swift');
  }
  for (let i = 0; i < hulks; i++) list.push('hulk');
  if (wave === WAVE_COUNT) list.push('boss');
  return list;
}
export const WAVE_HP_MUL = (wave) => 1 + (wave - 1) * 0.32;
export const WAVE_SPEED_MUL = (wave) => 1 + (wave - 1) * 0.045;
export const SPAWN_GAP = 0.85; // seconds between spawns in a wave
export const WAVE_CLEAR_BONUS = (wave) => 40 + wave * 20;
export const BUILD_PHASE_SECONDS = 20;

export const START_GOLD = 200;
export const START_LANTERN_HP = 20;

export const PALETTE = {
  seaDeep: '#0b2239',
  sea: '#0e3a5c',
  seaLight: '#155e86',
  sand: '#e8d5a3',
  rock: '#334155',
  path: '#1d4e6e',
  pathEdge: '#2b6b8f',
  lanternGlow: '#fde68a',
  hudBg: 'rgba(4, 20, 34, 0.82)',
  text: '#e0f2fe',
  textDim: '#94a3b8',
  gold: '#fbbf24',
  danger: '#f87171',
  ok: '#4ade80',
};
