// Breakwater — render: everything drawn on the canvas. The sea and the path,
// the lantern, pads and towers, enemies and projectiles, particles and
// floating numbers, the HUD and side panel, and the title / victory / defeat
// screens. Pure drawing: it reads state, never mutates it.

import {
  VIEW_W, VIEW_H, PATH, LANTERN, TOWER_TYPES, TOWER_ORDER, PALETTE,
  MAX_TOWER_LEVEL, BUILD_PHASE_SECONDS,
} from './config.js';
import { towerStats, upgradeCost, sellValue } from './towers.js';
import { enemiesRemaining } from './state.js';

export function render(ctx, state) {
  ctx.save();
  if (state.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawSea(ctx, state);
  drawPath(ctx);
  drawLantern(ctx, state);
  drawPads(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawParticles(ctx, state);
  drawFloats(ctx, state);
  drawHud(ctx, state);
  drawPanel(ctx, state);
  if (state.messageTimer > 0 && state.message) drawBanner(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'victory') drawEnd(ctx, state, true);
  if (state.screen === 'defeat') drawEnd(ctx, state, false);
  if (state.paused) drawPaused(ctx);
  ctx.restore();
}

function drawSea(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, PALETTE.seaDeep);
  g.addColorStop(0.6, PALETTE.sea);
  g.addColorStop(1, '#0a2f4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Gentle wave lines, drifting with time.
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = 60 + i * 96;
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W; x += 20) {
      const yy = y + Math.sin(x / 90 + state.time * 0.7 + i * 1.7) * 7;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // Sandy shore along the bottom where the lantern stands.
  ctx.fillStyle = 'rgba(232, 213, 163, 0.16)';
  ctx.beginPath();
  ctx.moveTo(880, VIEW_H);
  ctx.lineTo(930, 600);
  ctx.lineTo(1040, 600);
  ctx.lineTo(1040, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawPath(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = 52;
  ctx.beginPath();
  PATH.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = 44;
  ctx.beginPath();
  PATH.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  // Flow dashes to show the direction of the tide.
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 18]);
  ctx.beginPath();
  PATH.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLantern(ctx, state) {
  const { x, y } = LANTERN;
  const hpFrac = state.lanternHp / state.lanternMax;
  const pulse = 0.75 + Math.sin(state.time * 2.2) * 0.25;
  // Glow.
  const glow = ctx.createRadialGradient(x, y - 18, 4, x, y - 18, 90 * pulse);
  glow.addColorStop(0, 'rgba(253, 230, 138, 0.55)');
  glow.addColorStop(1, 'rgba(253, 230, 138, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - 18, 90 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Stone base and tower.
  ctx.fillStyle = '#475569';
  ctx.fillRect(x - 26, y - 6, 52, 14);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x - 16, y - 58, 32, 54);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(x - 16, y - 40, 32, 8);
  // Lamp room.
  ctx.fillStyle = hpFrac > 0.35 ? '#fde68a' : '#f87171';
  ctx.fillRect(x - 12, y - 78, 24, 20);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - 15, y - 84, 30, 6);
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 84);
  ctx.lineTo(x, y - 98);
  ctx.lineTo(x + 15, y - 84);
  ctx.closePath();
  ctx.fill();
  // HP bar above the lantern.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 30, y - 112, 60, 8);
  ctx.fillStyle = hpFrac > 0.35 ? PALETTE.ok : PALETTE.danger;
  ctx.fillRect(x - 29, y - 111, 58 * hpFrac, 6);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`LANTERN ${state.lanternHp}`, x, y + 26);
}

function drawPads(ctx, state) {
  for (const pad of state.pads) {
    const hasTower = pad.towerId !== null;
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = hasTower ? 'rgba(51, 65, 85, 0.9)' : 'rgba(148, 163, 184, 0.28)';
    ctx.fill();
    ctx.strokeStyle = state.hoverPad === pad && !hasTower ? '#fde68a' : 'rgba(226, 232, 240, 0.5)';
    ctx.lineWidth = state.hoverPad === pad ? 3 : 1.5;
    ctx.stroke();
    if (!hasTower) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', pad.x, pad.y);
      ctx.textBaseline = 'alphabetic';
    }
  }
  // Range preview for the tower type about to be placed.
  if (state.hoverPad && state.hoverPad.towerId === null && state.mouse.inside
    && (state.screen === 'build' || state.screen === 'wave')) {
    const def = TOWER_TYPES[state.selectedType];
    ctx.beginPath();
    ctx.arc(state.hoverPad.x, state.hoverPad.y, def.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(253, 230, 138, 0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawTowers(ctx, state) {
  for (const tower of state.towers) {
    const def = TOWER_TYPES[tower.type];
    const stats = towerStats(tower.type, tower.level);
    // Range ring for the selected tower.
    if (state.selectedTower === tower.id) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 10, stats.range, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(253, 230, 138, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Base.
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
    ctx.fill();
    // Barrel / head, rotated toward the target.
    ctx.save();
    ctx.translate(tower.x, tower.y - 10);
    ctx.rotate(tower.angle);
    if (tower.type === 'harpoon') {
      ctx.fillStyle = def.color;
      ctx.fillRect(0, -3, 26, 6);
      ctx.beginPath();
      ctx.moveTo(26, -6); ctx.lineTo(36, 0); ctx.lineTo(26, 6);
      ctx.closePath();
      ctx.fill();
    } else if (tower.type === 'cannon') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -6, 24, 12);
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(24, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(16, 0); ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Crystal / dome on top.
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 10, tower.type === 'frost' ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    // Level pips.
    for (let i = 0; i < tower.level; i++) {
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(tower.x - 10 + i * 10, tower.y + 16, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Selection ring.
    if (state.selectedTower === tower.id) {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const wob = Math.sin(state.time * 6 + e.wobble) * 2;
    const x = e.x;
    const y = e.y + wob;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, e.y + e.radius * 0.8, e.radius, e.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: a tide-creature blob with eyes.
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(x - e.radius * 0.3, y - e.radius * 0.3, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Eyes look toward the lantern (direction of travel).
    const dir = Math.atan2(PATH[Math.min(e.waypoint, PATH.length - 1)].y - e.y,
      PATH[Math.min(e.waypoint, PATH.length - 1)].x - e.x);
    const ex = Math.cos(dir) * e.radius * 0.35;
    const ey = Math.sin(dir) * e.radius * 0.35;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x + ex - 4, y + ey - 3, 2.6, 0, Math.PI * 2);
    ctx.arc(x + ex + 4, y + ey - 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // Boss crown.
    if (e.type === 'boss') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(x - 14, y - e.radius + 4);
      ctx.lineTo(x - 7, y - e.radius - 10);
      ctx.lineTo(x, y - e.radius + 2);
      ctx.lineTo(x + 7, y - e.radius - 10);
      ctx.lineTo(x + 14, y - e.radius + 4);
      ctx.closePath();
      ctx.fill();
    }
    // Slowed tint.
    if (state.time < e.slowUntil) {
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, e.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Hit flash.
    if (e.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(x, y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // HP bar.
    if (e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - w / 2, y - e.radius - 10, w, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.4 ? PALETTE.ok : PALETTE.danger;
      ctx.fillRect(x - w / 2 + 1, y - e.radius - 9, (w - 2) * (e.hp / e.maxHp), 3);
    }
  }
}

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.kind === 'cannon' ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, state) {
  ctx.textAlign = 'center';
  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
    ctx.font = `bold ${f.size}px sans-serif`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, state) {
  // Top bar.
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🌊 BREAKWATER', 16, 34);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`🪙 ${state.gold} gold`, 240, 33);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`Wave ${Math.max(1, state.wave)} / 10`, 400, 33);
  ctx.fillStyle = state.lanternHp <= 5 ? PALETTE.danger : PALETTE.text;
  ctx.fillText(`🏮 Lantern ${state.lanternHp}/${state.lanternMax}`, 540, 33);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`⭐ Score ${state.score}`, 740, 33);
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Enemies left: ${enemiesRemaining(state)}`, 900, 33);
  ctx.fillText(state.fastForward ? '⏩ 2x' : '1x', 1120, 33);
  ctx.fillText(state.muted ? '🔇' : '🔊', 1170, 33);
  ctx.fillText(state.paused ? '⏸ Paused' : '', 1210, 33);
}

function drawPanel(ctx, state) {
  if (state.screen === 'title' || state.screen === 'victory' || state.screen === 'defeat') return;
  // Right column panel: tower shop + selected tower.
  const x0 = 1056;
  ctx.fillStyle = 'rgba(4, 20, 34, 0.78)';
  ctx.fillRect(x0, 60, 208, 640);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Build  [1/2/3]', x0 + 12, 86);
  let y = 108;
  for (const key of TOWER_ORDER) {
    const def = TOWER_TYPES[key];
    const selected = state.selectedType === key && state.selectedTower === null;
    const afford = state.gold >= def.cost;
    ctx.fillStyle = selected ? 'rgba(253, 230, 138, 0.25)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(x0 + 8, y, 192, 64);
    if (selected) {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 8, y, 192, 64);
    }
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(x0 + 28, y + 24, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(def.name, x0 + 48, y + 20);
    ctx.fillStyle = afford ? PALETTE.gold : PALETTE.danger;
    ctx.font = '13px sans-serif';
    ctx.fillText(`${def.cost}g  ·  ${TOWER_ORDER.indexOf(key) + 1}`, x0 + 48, y + 40);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '11px sans-serif';
    ctx.fillText(def.desc, x0 + 12, y + 56);
    y += 74;
  }
  // Selected tower: upgrade / sell.
  const tower = state.towers.find((t) => t.id === state.selectedTower);
  if (tower) {
    const def = TOWER_TYPES[tower.type];
    const stats = towerStats(tower.type, tower.level);
    const cost = upgradeCost(tower);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${def.name}  Lv ${tower.level}`, x0 + 12, y + 18);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '12px sans-serif';
    ctx.fillText(`Damage ${Math.round(stats.damage)}  ·  Range ${Math.round(stats.range)}`, x0 + 12, y + 38);
    ctx.fillText(`Kills ${tower.kills}  ·  Invested ${tower.invested}g`, x0 + 12, y + 56);
    // Upgrade button.
    ctx.fillStyle = cost !== null && state.gold >= cost ? '#166534' : '#334155';
    ctx.fillRect(x0 + 8, y + 66, 192, 32);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cost !== null ? `Upgrade — ${cost}g` : 'MAX LEVEL', x0 + 104, y + 87);
    // Sell button.
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x0 + 8, y + 106, 192, 32);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Sell — ${sellValue(tower)}g`, x0 + 104, y + 127);
    ctx.textAlign = 'left';
  }
  // Start wave button during build phase.
  if (state.screen === 'build') {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x0 + 8, 560, 192, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`▶ Start Wave ${state.wave + 1}`, x0 + 104, 585);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '12px sans-serif';
    ctx.fillText(`Auto-starts in ${Math.ceil(state.buildTimer)}s`, x0 + 104, 616);
    ctx.textAlign = 'left';
  }
  // Controls footer.
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('Space: wave / 2x   P: pause', x0 + 12, 660);
  ctx.fillText('R: restart   M: mute   Esc: deselect', x0 + 12, 678);
}

function drawBanner(ctx, state) {
  ctx.globalAlpha = Math.min(1, state.messageTimer);
  ctx.fillStyle = 'rgba(4, 20, 34, 0.8)';
  const w = ctx.measureText(state.message).width + 48;
  ctx.fillRect((VIEW_W - w) / 2, 64, w, 40);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, VIEW_W / 2, 91);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(3, 15, 28, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('BREAKWATER', VIEW_W / 2, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '26px Georgia, serif';
  ctx.fillText('Defend the harbor lantern from the rising tide.', VIEW_W / 2, 268);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Tide-creatures walk the channel to your lantern. Build harpoons, frost spires', VIEW_W / 2, 330);
  ctx.fillText('and cannons on the stone pads. Kill them for gold, upgrade your towers,', VIEW_W / 2, 356);
  ctx.fillText('and hold the light through all 10 waves — the Tide King comes last.', VIEW_W / 2, 382);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Click a pad to build  ·  1/2/3 pick a tower  ·  Space starts a wave  ·  P pauses', VIEW_W / 2, 430);
  // Start button.
  ctx.fillStyle = '#166534';
  ctx.fillRect(VIEW_W / 2 - 130, 470, 260, 56);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.strokeRect(VIEW_W / 2 - 130, 470, 260, 56);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('▶  START GAME', VIEW_W / 2, 507);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '14px sans-serif';
  ctx.fillText('10 waves · 3 towers · 1 lantern — hold the light.', VIEW_W / 2, 570);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(6, 40, 20, 0.78)' : 'rgba(40, 6, 12, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#fde68a' : '#f87171';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.fillText(won ? 'THE LIGHT HOLDS!' : 'THE LIGHT GOES OUT', VIEW_W / 2, 240);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '24px sans-serif';
  ctx.fillText(
    won
      ? 'The Tide King is beaten. The harbor lantern burns on.'
      : 'The tide took the lantern. The harbor waits for another keeper.',
    VIEW_W / 2, 296,
  );
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`Score ${state.score}   ·   Waves cleared ${won ? 10 : state.wave - 1} / 10`, VIEW_W / 2, 350);
  ctx.fillText(`Enemies sunk ${state.kills}   ·   Leaks ${state.leaks}`, VIEW_W / 2, 384);
  ctx.fillText(`Towers built ${state.stats.placed}   ·   Shots fired ${state.stats.shots}`, VIEW_W / 2, 414);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Press R or click anywhere to play again', VIEW_W / 2, 440);
  ctx.fillStyle = '#166534';
  ctx.fillRect(VIEW_W / 2 - 110, 470, 220, 52);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('↻  PLAY AGAIN', VIEW_W / 2, 503);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3, 15, 28, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⏸  PAUSED', VIEW_W / 2, VIEW_H / 2);
  ctx.font = '18px sans-serif';
  ctx.fillText('Press P to resume', VIEW_W / 2, VIEW_H / 2 + 40);
  ctx.textAlign = 'left';
}
