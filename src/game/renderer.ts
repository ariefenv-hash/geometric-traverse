import {
  LaserRay,
  Particle,
  PhaseBarrierObstacle,
  PhysicsWorldState,
  PortalObstacle,
  RippleEffect,
  SlidingBlockObstacle,
  ThemeMode
} from './types';
import { isPhaseBarrierSolid } from './physics';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: ThemeMode;
  visualRotation: number; // Current visual camera angle (radians)
}

export function renderGame(
  rCtx: RenderContext,
  state: PhysicsWorldState,
  arenaWidth: number,
  arenaHeight: number
) {
  const { ctx, width, height, theme, visualRotation } = rCtx;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Background
  const isDark = theme === 'dark';
  ctx.fillStyle = isDark ? '#080a0f' : '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Camera Transformation: Center and rotate the arena smoothly
  const centerX = width / 2;
  const centerY = height / 2;

  // Compute zoom scale to fit arena cleanly within viewport with margin
  const margin = Math.min(width, height) < 600 ? 24 : 48;
  const scale = Math.min((width - margin) / arenaWidth, (height - margin) / arenaHeight);

  ctx.translate(centerX, centerY);
  // Rotate arena so "down" relative to gravity is aligned, or smooth rotation
  ctx.rotate(-visualRotation);
  ctx.scale(scale, scale);
  ctx.translate(-arenaWidth / 2, -arenaHeight / 2);

  // 1. Draw Geometric Drafting Grid & Celestial Compass Rings
  drawBackgroundGrid(ctx, arenaWidth, arenaHeight, isDark, state.elapsedTime);

  // 2. Draw Anti-Gravity Wells
  for (const obs of state.obstacles) {
    if (obs.type === 'anti_gravity') {
      drawAntiGravityWell(ctx, obs.x, obs.y, obs.width, obs.height, isDark, state.elapsedTime);
    }
  }

  // 3. Draw Sliding Block Rail Slots
  for (const obs of state.obstacles) {
    if (obs.type === 'sliding_block') {
      const sb = obs as SlidingBlockObstacle;
      drawSlidingRail(ctx, sb, isDark);
    }
  }

  // 4. Draw Portals
  for (const obs of state.obstacles) {
    if (obs.type === 'portal') {
      const p = obs as PortalObstacle;
      drawPortal(ctx, p, isDark, state.elapsedTime);
    }
  }

  // 5. Draw Exit Gate (Monolith)
  drawExitGate(ctx, state.exit, isDark, state.elapsedTime);

  // 6. Draw Stars (Celestial Cores)
  for (const star of state.stars) {
    if (!star.collected) {
      drawStar(ctx, star.x, star.y, star.radius, isDark, state.elapsedTime + star.pulsePhase);
    }
  }

  // 7. Draw Lasers & Emitters
  drawLasers(ctx, state.lasers, state.obstacles, isDark, state.elapsedTime);

  // 8. Draw Phase Barriers
  for (const obs of state.obstacles) {
    if (obs.type === 'phase_barrier') {
      const pb = obs as PhaseBarrierObstacle;
      const isSolid = isPhaseBarrierSolid(pb, state.gravityAngle);
      drawPhaseBarrier(ctx, pb, isSolid, isDark, state.elapsedTime);
    }
  }

  // 9. Draw Sliding Blocks
  for (const obs of state.obstacles) {
    if (obs.type === 'sliding_block') {
      const sb = obs as SlidingBlockObstacle;
      drawSlidingBlock(ctx, sb, isDark);
    }
  }

  // 10. Draw Solid Walls
  for (const obs of state.obstacles) {
    if (obs.type === 'wall') {
      drawWall(ctx, obs.x, obs.y, obs.width, obs.height, isDark);
    }
  }

  // 11. Draw Ball (Protagonist)
  if (!state.ball.dead) {
    drawBall(ctx, state, isDark);
  }

  // 12. Draw Ripples and Particles
  drawRipples(ctx, state.ripples);
  drawParticles(ctx, state.particles);

  // 13. Draw Arena Outer Bounding Frame
  drawArenaBorder(ctx, arenaWidth, arenaHeight, isDark);

  ctx.restore();
}

function drawBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const gridStep = 40;
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.028)' : 'rgba(15, 23, 42, 0.035)';
  const axisColor = isDark ? 'rgba(56, 189, 248, 0.09)' : 'rgba(14, 116, 144, 0.07)';

  // 1. Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = 0; x <= w; x += gridStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += gridStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // 2. Subtle central cross & circular orbits (Sacred Geometry)
  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.18, 0, Math.PI * 2);
  ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2);
  ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Degree graduation marks around circle
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 116, 144, 0.12)';
  ctx.lineWidth = 1;
  const orbitR = w * 0.32;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    ctx.moveTo(cx + cosA * (orbitR - 4), cy + sinA * (orbitR - 4));
    ctx.lineTo(cx + cosA * (orbitR + 4), cy + sinA * (orbitR + 4));
  }
  ctx.stroke();

  // Axis cross marks
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();

  // 3. Floating celestial stardust particles (deterministic procedural dust)
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)';
  for (let i = 0; i < 36; i++) {
    const seed = i * 9973;
    const bx = (seed % (w - 60)) + 30;
    const by = ((seed * 37) % (h - 60)) + 30;
    const driftX = Math.sin(time * 0.6 + i) * 6;
    const driftY = Math.cos(time * 0.5 + i * 1.5) * 6;
    const sz = (i % 3 === 0) ? 1.8 : 1.2;
    const alpha = 0.15 + Math.sin(time * 2 + i) * 0.1;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillRect(bx + driftX, by + driftY, sz, sz);
  }
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

function drawArenaBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isDark: boolean
) {
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, w, h);

  // Geometric corner accents
  const cornerSize = 14;
  ctx.fillStyle = isDark ? '#38bdf8' : '#0f172a';
  
  // Top-left
  ctx.fillRect(-2, -2, cornerSize, 3);
  ctx.fillRect(-2, -2, 3, cornerSize);
  // Top-right
  ctx.fillRect(w - cornerSize + 2, -2, cornerSize, 3);
  ctx.fillRect(w - 1, -2, 3, cornerSize);
  // Bottom-left
  ctx.fillRect(-2, h - 1, cornerSize, 3);
  ctx.fillRect(-2, h - cornerSize + 2, 3, cornerSize);
  // Bottom-right
  ctx.fillRect(w - cornerSize + 2, h - 1, cornerSize, 3);
  ctx.fillRect(w - 1, h - cornerSize + 2, 3, cornerSize);

  ctx.restore();
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDark: boolean
) {
  ctx.save();
  // Fill
  ctx.fillStyle = isDark ? '#141824' : '#e2e8f0';
  ctx.fillRect(x, y, w, h);

  // Outer Crisp Stroke
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Subtle interior architectural hatch lines
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.05)';
  ctx.lineWidth = 1;
  const step = 16;
  ctx.beginPath();
  for (let offset = -h; offset < w; offset += step) {
    const x1 = Math.max(x, x + offset);
    const y1 = Math.max(y, y - offset);
    const x2 = Math.min(x + w, x + offset + h);
    const y2 = Math.min(y + h, y + h);
    if (x1 < x + w && y1 < y + h) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  ctx.stroke();

  ctx.restore();
}

function drawPhaseBarrier(
  ctx: CanvasRenderingContext2D,
  pb: PhaseBarrierObstacle,
  isSolid: boolean,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const { x, y, width: w, height: h } = pb;

  if (isSolid) {
    // Solid active barrier: Luminous cyan crystal with dense glow
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(14, 116, 144, 0.18)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Glowing chevron hashes
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(2, 132, 199, 0.4)';
    ctx.lineWidth = 1.5;
    const spacing = 14;
    ctx.beginPath();
    const count = Math.floor((w > h ? w : h) / spacing);
    for (let i = 0; i <= count; i++) {
      if (w > h) {
        ctx.moveTo(x + i * spacing, y);
        ctx.lineTo(x + i * spacing + 6, y + h);
      } else {
        ctx.moveTo(x, y + i * spacing);
        ctx.lineTo(x + w, y + i * spacing + 6);
      }
    }
    ctx.stroke();
  } else {
    // Permeable / Phased state: Ethereal dotted wireframe with drifting light particles
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 116, 144, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Moving translucent pulse indicator
    const pulseAlpha = 0.08 + Math.sin(time * 4) * 0.04;
    ctx.fillStyle = isDark ? `rgba(56, 189, 248, ${pulseAlpha})` : `rgba(14, 116, 144, ${pulseAlpha})`;
    ctx.fillRect(x, y, w, h);

    // Subtle drift arrows
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(14, 116, 144, 0.5)';
    const dotSpacing = 24;
    const offset = (time * 30) % dotSpacing;
    if (w > h) {
      for (let dx = offset; dx < w; dx += dotSpacing) {
        ctx.fillRect(x + dx, y + h / 2 - 1, 2, 2);
      }
    } else {
      for (let dy = offset; dy < h; dy += dotSpacing) {
        ctx.fillRect(x + w / 2 - 1, y + dy, 2, 2);
      }
    }
  }

  ctx.restore();
}

function drawSlidingRail(
  ctx: CanvasRenderingContext2D,
  sb: SlidingBlockObstacle,
  isDark: boolean
) {
  ctx.save();
  const isHorizontal = (sb.maxX - sb.minX) > (sb.maxY - sb.minY);

  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.1)';
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 4]);

  if (isHorizontal) {
    const railY = sb.y + sb.height / 2;
    ctx.beginPath();
    ctx.moveTo(sb.minX, railY);
    ctx.lineTo(sb.maxX, railY);
    ctx.stroke();

    // End stops
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.3)';
    ctx.fillRect(sb.minX - 2, railY - 6, 4, 12);
    ctx.fillRect(sb.maxX - 2, railY - 6, 4, 12);
  } else {
    const railX = sb.x + sb.width / 2;
    ctx.beginPath();
    ctx.moveTo(railX, sb.minY);
    ctx.lineTo(railX, sb.maxY);
    ctx.stroke();

    // End stops
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.3)';
    ctx.fillRect(railX - 6, sb.minY - 2, 12, 4);
    ctx.fillRect(railX - 6, sb.maxY - 2, 12, 4);
  }

  ctx.restore();
}

function drawSlidingBlock(
  ctx: CanvasRenderingContext2D,
  sb: SlidingBlockObstacle,
  isDark: boolean
) {
  ctx.save();
  ctx.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
  ctx.fillRect(sb.x, sb.y, sb.width, sb.height);

  ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(sb.x, sb.y, sb.width, sb.height);

  // Central grip indentations
  const cx = sb.x + sb.width / 2;
  const cy = sb.y + sb.height / 2;
  ctx.fillStyle = isDark ? '#0f172a' : '#64748b';
  
  if (sb.width >= sb.height) {
    ctx.fillRect(cx - 14, cy - 3, 28, 6);
  } else {
    ctx.fillRect(cx - 3, cy - 14, 6, 28);
  }

  ctx.restore();
}

function drawAntiGravityWell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDark: boolean,
  time: number
) {
  ctx.save();
  // Translucent glowing field
  const grad = ctx.createLinearGradient(x, y + h, x, y);
  grad.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.04)' : 'rgba(2, 132, 199, 0.04)');
  grad.addColorStop(1, isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.14)');

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Upward floating waves
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.35)';
  ctx.lineWidth = 1.5;
  const waveSpacing = 36;
  const waveOffset = (time * 45) % waveSpacing;

  for (let wy = y + h - waveOffset; wy > y; wy -= waveSpacing) {
    ctx.beginPath();
    ctx.moveTo(x + 10, wy);
    ctx.quadraticCurveTo(x + w / 2, wy - 10, x + w - 10, wy);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  port: PortalObstacle,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const cx = port.x + port.width / 2;
  const cy = port.y + port.height / 2;
  const r = port.radius || 24;

  ctx.translate(cx, cy);

  // Outer rotating octagon
  ctx.rotate(time * 0.8);
  ctx.strokeStyle = isDark ? '#c084fc' : '#7c3aed';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner counter-rotating diamond
  ctx.rotate(-time * 1.6);
  ctx.strokeStyle = isDark ? '#f472b6' : '#db2777';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const px = Math.cos(a) * (r * 0.65);
    const py = Math.sin(a) * (r * 0.65);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Core glow
  ctx.fillStyle = isDark ? 'rgba(192, 132, 252, 0.4)' : 'rgba(124, 58, 237, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawExitGate(
  ctx: CanvasRenderingContext2D,
  exit: import('./types').ExitGate,
  isDark: boolean,
  time: number
) {
  ctx.save();
  ctx.translate(exit.x, exit.y);

  const r = exit.radius;
  const isUnlocked = exit.unlocked;

  if (isUnlocked) {
    // Unlocked: Luminous rotating celestial hexagon vortex
    ctx.rotate(time * 1.2);

    // Glowing halo
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6);
    grad.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(2, 132, 199, 0.4)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Outer hexagon
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner triangle
    ctx.rotate(-time * 2.2);
    ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const px = Math.cos(a) * (r * 0.55);
      const py = Math.sin(a) * (r * 0.55);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    // Locked: Dim monolithic lock ring
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lock glyph (square)
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(-6, -6, 12, 12);
  }

  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  isDark: boolean,
  time: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Bobbing animation
  const bob = Math.sin(time * 3) * 3;
  ctx.translate(0, bob);

  // Outer radiant star aura
  const auraR = radius * (1.6 + Math.sin(time * 4) * 0.2);
  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, auraR);
  grad.addColorStop(0, isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(217, 119, 6, 0.45)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Spinning 8-point geometric star with luminous bloom
  ctx.shadowBlur = 12;
  ctx.shadowColor = isDark ? 'rgba(251, 191, 36, 0.7)' : 'rgba(217, 119, 6, 0.6)';

  ctx.rotate(time * 1.5);
  ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
  ctx.beginPath();
  const points = 8;
  const innerR = radius * 0.45;
  const outerR = radius * 1.15;

  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (points * 2)) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pure white center spark
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLasers(
  ctx: CanvasRenderingContext2D,
  lasers: LaserRay[],
  obstacles: import('./types').AnyObstacle[],
  isDark: boolean,
  time: number
) {
  // Draw emitters
  for (const obs of obstacles) {
    if (obs.type === 'laser_emitter') {
      ctx.save();
      ctx.fillStyle = isDark ? '#e11d48' : '#be123c';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = isDark ? '#fda4af' : '#ffe4e6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      ctx.restore();
    }
  }

  // Draw beams
  for (const laser of lasers) {
    if (!laser.active) continue;
    ctx.save();

    // Outer glow
    ctx.strokeStyle = isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(225, 29, 72, 0.28)';
    ctx.lineWidth = 8 + Math.sin(time * 15) * 2;
    ctx.beginPath();
    ctx.moveTo(laser.startX, laser.startY);
    ctx.lineTo(laser.endX, laser.endY);
    ctx.stroke();

    // Sharp central core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(laser.startX, laser.startY);
    ctx.lineTo(laser.endX, laser.endY);
    ctx.stroke();

    // Laser terminal spark
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(laser.endX, laser.endY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  state: PhysicsWorldState,
  isDark: boolean
) {
  const { ball } = state;
  ctx.save();

  // 1. Trail
  for (let i = 0; i < ball.trail.length; i++) {
    const t = ball.trail[i];
    const r = ball.radius * (0.3 + (i / ball.trail.length) * 0.7);
    ctx.fillStyle = isDark
      ? `rgba(56, 189, 248, ${t.alpha * 0.4})`
      : `rgba(37, 99, 235, ${t.alpha * 0.35})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(ball.x, ball.y);

  // 2. Phasing effect (if ball is passing through permeable gate)
  if (ball.isPhasing) {
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.8)' : 'rgba(37, 99, 235, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 3. Ambient ball aura
  const auraR = ball.radius * (1.3 + Math.sin(ball.pulsePhase) * 0.1);
  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, auraR);
  grad.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.3)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 4. Solid sphere core with soft bloom
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 250) {
    ctx.shadowBlur = Math.min((speed - 250) * 0.05, 14);
    ctx.shadowColor = isDark ? '#38bdf8' : '#2563eb';
  }

  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 5. High-contrast inner rim
  ctx.strokeStyle = isDark ? '#38bdf8' : '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius - 1, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Central gem accent
  ctx.fillStyle = isDark ? '#38bdf8' : '#60a5fa';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // 7. Orbiting celestial satellite rings (sacred geometry halo)
  ctx.save();
  ctx.rotate(state.elapsedTime * 1.8);
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, ball.radius * 1.75, ball.radius * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Micro satellites on orbit
  const satAngle1 = state.elapsedTime * 3.2;
  const satX1 = Math.cos(satAngle1) * (ball.radius * 1.75);
  const satY1 = Math.sin(satAngle1) * (ball.radius * 0.7);
  ctx.fillStyle = isDark ? '#38bdf8' : '#2563eb';
  ctx.beginPath();
  ctx.arc(satX1, satY1, 2, 0, Math.PI * 2);
  ctx.fill();

  const satAngle2 = satAngle1 + Math.PI;
  const satX2 = Math.cos(satAngle2) * (ball.radius * 1.75);
  const satY2 = Math.sin(satAngle2) * (ball.radius * 0.7);
  ctx.beginPath();
  ctx.arc(satX2, satY2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawRipples(ctx: CanvasRenderingContext2D, ripples: RippleEffect[]) {
  for (const r of ripples) {
    ctx.save();
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, r.alpha));
    ctx.lineWidth = r.lineWidth || 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    const progress = p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, progress);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    if (p.shape === 'line' && p.angle !== undefined) {
      ctx.lineWidth = p.size;
      const len = 12 * progress;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * len, p.y + Math.sin(p.angle) * len);
      ctx.stroke();
    } else if (p.shape === 'square') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
