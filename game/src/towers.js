// Breakwater — towers: placement on pads, targeting, firing, projectiles,
// upgrades and selling. Towers aim at the enemy furthest along the path
// inside their range; frost towers chill a cluster instead of firing a bolt.

import { TOWER_TYPES, MAX_TOWER_LEVEL, UPGRADE_COST_FACTOR, SELL_RATE } from './config.js';
import { damageEnemy, spawnHitParticles } from './enemies.js';
import { sfx } from './audio.js';

let towerId = 1;

export function towerStats(typeKey, level) {
  const def = TOWER_TYPES[typeKey];
  return {
    damage: def.damage * Math.pow(1.45, level - 1),
    range: def.range * Math.pow(1.08, level - 1),
    rate: def.rate,
    splash: def.splash || 0,
    slowPct: def.slowPct || 0,
    slowTime: def.slowTime || 0,
  };
}

export function upgradeCost(tower) {
  if (tower.level >= MAX_TOWER_LEVEL) return null;
  return Math.round(TOWER_TYPES[tower.type].cost * UPGRADE_COST_FACTOR * tower.level);
}

export function sellValue(tower) {
  return Math.floor(tower.invested * SELL_RATE);
}

export function placeTower(state, pad, typeKey) {
  const def = TOWER_TYPES[typeKey];
  if (pad.towerId !== null) return { ok: false, reason: 'Pad already has a tower.' };
  if (state.gold < def.cost) return { ok: false, reason: 'Not enough gold.' };
  state.gold -= def.cost;
  const tower = {
    id: towerId++,
    type: typeKey,
    pad: pad.id,
    level: 1,
    invested: def.cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    kills: 0,
    x: pad.x,
    y: pad.y,
  };
  state.towers.push(tower);
  pad.towerId = tower.id;
  state.stats.placed++;
  spawnHitParticles(state, pad.x, pad.y, def.color, 10);
  sfx.place();
  return { ok: true, tower };
}

export function upgradeTower(state, tower) {
  const cost = upgradeCost(tower);
  if (cost === null) return { ok: false, reason: 'Already at max level.' };
  if (state.gold < cost) return { ok: false, reason: 'Not enough gold.' };
  state.gold -= cost;
  tower.level++;
  tower.invested += cost;
  state.stats.upgraded++;
  spawnHitParticles(state, tower.x, tower.y, '#fde68a', 16);
  sfx.upgrade();
  return { ok: true };
}

export function sellTower(state, tower) {
  const value = sellValue(tower);
  state.gold += value;
  state.towers = state.towers.filter((t) => t.id !== tower.id);
  const pad = state.pads[tower.pad];
  if (pad) pad.towerId = null;
  if (state.selectedTower === tower.id) state.selectedTower = null;
  state.stats.sold++;
  sfx.sell();
  return value;
}

function furthestInRange(state, tower, range) {
  let best = null;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= range + e.radius && (!best || e.dist > best.dist)) best = e;
  }
  return best;
}

function fireProjectile(state, tower, target, stats) {
  const def = TOWER_TYPES[tower.type];
  state.projectiles.push({
    x: tower.x, y: tower.y - 10,
    target,
    tower, // the tower that fired, for kill credit
    tx: target.x, ty: target.y,
    damage: stats.damage,
    splash: stats.splash,
    speed: tower.type === 'cannon' ? 320 : 520,
    color: def.color,
    kind: tower.type,
  });
  state.stats.shots++;
  if (tower.type === 'harpoon') sfx.shoot();
  else if (tower.type === 'cannon') sfx.cannon();
}

function frostBlast(state, tower, stats) {
  const def = TOWER_TYPES[tower.type];
  let hitAny = false;
  for (const e of [...state.enemies]) {
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= stats.splash + e.radius) {
      e.slowUntil = state.time + stats.slowTime;
      e.slowPct = stats.slowPct;
      damageEnemy(state, e, stats.damage, tower);
      hitAny = true;
    }
  }
  if (hitAny) {
    spawnHitParticles(state, tower.x, tower.y - 8, '#bae6fd', 12);
    sfx.frost();
  }
}

export function updateTowers(state, dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    const stats = towerStats(tower.type, tower.level);
    const target = furthestInRange(state, tower, stats.range);
    if (target) {
      tower.angle = Math.atan2(target.y - (tower.y - 10), target.x - tower.x);
    }
    if (tower.cooldown > 0 || !target) continue;
    tower.cooldown = 1 / stats.rate;
    if (tower.type === 'frost') frostBlast(state, tower, stats);
    else fireProjectile(state, tower, target, stats);
  }
}

export function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    // Track the live target; if it died, fly to its last known spot.
    const tx = p.target && state.enemies.includes(p.target) ? p.target.x : p.tx;
    const ty = p.target && state.enemies.includes(p.target) ? p.target.y : p.ty;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 6) {
      state.projectiles.splice(i, 1);
      impact(state, p, tx, ty);
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}

function impact(state, p, x, y) {
  if (p.splash > 0) {
    spawnHitParticles(state, x, y, p.color, 12);
    for (const e of [...state.enemies]) {
      if (Math.hypot(e.x - x, e.y - y) <= p.splash + e.radius) {
        damageEnemy(state, e, p.damage, p.tower);
      }
    }
  } else if (p.target && state.enemies.includes(p.target)) {
    damageEnemy(state, p.target, p.damage, p.tower);
    sfx.hit();
  }
}
