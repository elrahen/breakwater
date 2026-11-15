// Breakwater — enemies: tide-creatures that walk the path to the lantern.
// Spawning, movement along the waypoints, slowing, and what happens when one
// leaks through (lantern damage) or is killed (gold and score).

import { PATH, ENEMY_TYPES, WAVE_HP_MUL, WAVE_SPEED_MUL } from './config.js';
import { sfx } from './audio.js';

let enemyId = 1;

export function spawnEnemy(state, typeKey, wave) {
  const def = ENEMY_TYPES[typeKey];
  const hp = Math.round(def.hp * WAVE_HP_MUL(wave));
  const start = PATH[0];
  const enemy = {
    id: enemyId++,
    type: typeKey,
    name: def.name,
    x: start.x,
    y: start.y,
    hp,
    maxHp: hp,
    speed: def.speed * WAVE_SPEED_MUL(wave),
    baseSpeed: def.speed * WAVE_SPEED_MUL(wave),
    slowUntil: 0,
    slowPct: 0,
    waypoint: 1,
    dist: 0, // distance travelled along the path (for targeting: furthest first)
    reward: def.reward,
    leak: def.leak,
    radius: def.radius,
    color: def.color,
    score: def.score,
    flash: 0, // hit flash timer
    wobble: Math.random() * Math.PI * 2,
  };
  state.enemies.push(enemy);
  return enemy;
}

export function updateEnemies(state, dt) {
  const now = state.time;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.flash > 0) e.flash -= dt;
    let speed = e.baseSpeed;
    if (now < e.slowUntil) speed *= (1 - e.slowPct);
    let remaining = speed * dt;
    while (remaining > 0 && e.waypoint < PATH.length) {
      const wp = PATH[e.waypoint];
      const dx = wp.x - e.x;
      const dy = wp.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= remaining) {
        e.x = wp.x;
        e.y = wp.y;
        e.dist += d;
        remaining -= d;
        e.waypoint++;
      } else {
        e.x += (dx / d) * remaining;
        e.y += (dy / d) * remaining;
        e.dist += remaining;
        remaining = 0;
      }
    }
    if (e.waypoint >= PATH.length) {
      // Leaked: it reached the lantern.
      state.enemies.splice(i, 1);
      state.lanternHp -= e.leak;
      state.leaks++;
      state.shake = Math.max(state.shake, 10);
      state.floats.push({
        x: e.x - 20, y: e.y - 30, text: `-${e.leak} LANTERN`, life: 1.2, color: '#f87171', size: 18,
      });
      sfx.leak();
      if (state.lanternHp <= 0) {
        state.lanternHp = 0;
        state.screen = 'defeat';
        sfx.defeat();
      }
    }
  }
}

export function damageEnemy(state, enemy, amount, killer = null) {
  enemy.hp -= amount;
  enemy.flash = 0.08;
  state.floats.push({
    x: enemy.x + (Math.random() * 16 - 8),
    y: enemy.y - enemy.radius - 4,
    text: String(Math.round(amount)),
    life: 0.6, color: '#fef08a', size: 13,
  });
  spawnHitParticles(state, enemy.x, enemy.y, enemy.color, 4);
  if (enemy.hp <= 0) killEnemy(state, enemy, killer);
}

export function killEnemy(state, enemy, killer = null) {
  const idx = state.enemies.indexOf(enemy);
  if (idx === -1) return;
  state.enemies.splice(idx, 1);
  state.gold += enemy.reward;
  state.score += enemy.score;
  state.kills++;
  if (killer) killer.kills++;
  spawnHitParticles(state, enemy.x, enemy.y, enemy.color, 14);
  state.floats.push({
    x: enemy.x, y: enemy.y - enemy.radius - 12,
    text: `+${enemy.reward}g`, life: 0.9, color: '#fbbf24', size: 14,
  });
  sfx.coin();
}

export function spawnHitParticles(state, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 90;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.3, maxLife: 0.7,
      size: 2 + Math.random() * 3, color,
    });
  }
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.y -= 28 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
}
