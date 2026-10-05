import {
  AnyObstacle,
  BumperObstacle,
  FragileWallObstacle,
  LaserEmitterObstacle,
  LaserRay,
  LinkedGateObstacle,
  MirrorObstacle,
  ObstacleType,
  OneWayGateObstacle,
  Particle,
  PhaseBarrierObstacle,
  PhysicsWorldState,
  PortalObstacle,
  PressurePlateObstacle,
  RippleEffect,
  SlidingBlockObstacle,
  ThemeMode
} from './types';
import { emitterBeamDir, isPhaseBarrierSolid, mirrorSurfaceSegment } from './physics';
import { CLASSIC_SKIN_ID, ensureSkinImagesLoaded, getSelectedSkinId, getSkinImage } from './skins';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: ThemeMode;
  visualRotation: number; // Current visual camera angle (radians)
  /** Impact camera shake offset in screen px (applied to the arena camera, not the backdrop). */
  shakeX?: number;
  shakeY?: number;
}

// ---------------------------------------------------------------------------
// Obstacle render registry
// ---------------------------------------------------------------------------
// Every obstacle type maps to one or more { layer, draw } entries. The
// pipeline is flattened and depth-sorted once at module load; adding a new
// mechanism only requires registering a draw entry here.

type ObstacleDrawFn = (
  ctx: CanvasRenderingContext2D,
  obs: AnyObstacle,
  state: PhysicsWorldState,
  isDark: boolean,
  time: number
) => void;

interface RenderEntry {
  layer: number;
  draw: ObstacleDrawFn;
}

const OBSTACLE_RENDERERS: Partial<Record<ObstacleType, RenderEntry[]>> = {
  anti_gravity: [
    {
      layer: 0,
      draw: (ctx, obs, _s, isDark, time) =>
        drawAntiGravityWell(ctx, obs.x, obs.y, obs.width, obs.height, isDark, time)
    }
  ],
  sliding_block: [
    { layer: 1, draw: (ctx, obs, _s, isDark) => drawSlidingRail(ctx, obs as SlidingBlockObstacle, isDark) },
    { layer: 5, draw: (ctx, obs, _s, isDark) => drawSlidingBlock(ctx, obs as SlidingBlockObstacle, isDark) }
  ],
  portal: [
    { layer: 2, draw: (ctx, obs, _s, isDark, time) => drawPortal(ctx, obs as PortalObstacle, isDark, time) }
  ],
  pressure_plate: [
    { layer: 2.5, draw: (ctx, obs, _s, isDark, time) => drawPressurePlate(ctx, obs as PressurePlateObstacle, isDark, time) }
  ],
  phase_barrier: [
    {
      layer: 4,
      draw: (ctx, obs, state, isDark, time) => {
        const pb = obs as PhaseBarrierObstacle;
        drawPhaseBarrier(ctx, pb, isPhaseBarrierSolid(pb, state.gravityAngle), isDark, time);
      }
    }
  ],
  bumper: [
    { layer: 5, draw: (ctx, obs, _s, isDark, time) => drawBumper(ctx, obs as BumperObstacle, isDark, time) }
  ],
  one_way_gate: [
    { layer: 5, draw: (ctx, obs, state, isDark, time) => drawOneWayGate(ctx, obs as OneWayGateObstacle, state, isDark, time) }
  ],
  mirror: [
    { layer: 5, draw: (ctx, obs, _s, isDark, time) => drawMirror(ctx, obs as MirrorObstacle, isDark, time) }
  ],
  wall: [
    { layer: 6, draw: (ctx, obs, _s, isDark) => drawWall(ctx, obs.x, obs.y, obs.width, obs.height, isDark) }
  ],
  fragile_wall: [
    { layer: 6, draw: (ctx, obs, _s, isDark, time) => drawFragileWall(ctx, obs as FragileWallObstacle, isDark, time) }
  ],
  linked_gate: [
    { layer: 6, draw: (ctx, obs, _s, isDark, time) => drawLinkedGate(ctx, obs as LinkedGateObstacle, isDark, time) }
  ],
  // Annihilation field: lethal on touch (physics.ts hazard behavior). Without
  // this entry the zone is completely invisible — instant deaths with no tell.
  // laser_emitter is intentionally absent: beams are drawn by drawLasers().
  hazard: [
    { layer: 5, draw: (ctx, obs, _s, isDark, time) => drawHazard(ctx, obs.x, obs.y, obs.width, obs.height, isDark, time) }
  ]
};

const UNDERLAY_CUTOFF = 3; // layers < cutoff draw beneath exit/stars/lasers

const RENDER_PIPELINE: Array<RenderEntry & { type: ObstacleType }> = Object.entries(
  OBSTACLE_RENDERERS
)
  .flatMap(([type, entries]) =>
    (entries || []).map(entry => ({ type: type as ObstacleType, ...entry }))
  )
  .sort((a, b) => a.layer - b.layer);

function runRenderPipeline(
  ctx: CanvasRenderingContext2D,
  state: PhysicsWorldState,
  isDark: boolean,
  time: number,
  belowCutoff: boolean
) {
  for (const entry of RENDER_PIPELINE) {
    const inRange = belowCutoff ? entry.layer < UNDERLAY_CUTOFF : entry.layer >= UNDERLAY_CUTOFF;
    if (!inRange) continue;
    for (const obs of state.obstacles) {
      if (obs.type !== entry.type) continue;
      if (obs.type === 'fragile_wall' && (obs as FragileWallObstacle).broken) continue;
      entry.draw(ctx, obs, state, isDark, time);
    }
  }
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

  ctx.translate(centerX + (rCtx.shakeX ?? 0), centerY + (rCtx.shakeY ?? 0));
  // Rotate arena so "down" relative to gravity is aligned, or smooth rotation.
  // Physics gravity is (sin θ, cos θ); rotating by +θ maps it back to screen-down:
  //   R(a)·(sinθ, cosθ) = (sin(θ−a), cos(θ−a)) → a = θ ⟹ (0, 1). A minus sign
  //   here makes 90°/270° flips and gyro/360° modes fall towards the ceiling.
  ctx.rotate(visualRotation);
  ctx.scale(scale, scale);
  ctx.translate(-arenaWidth / 2, -arenaHeight / 2);

  const time = state.elapsedTime;

  // 1. Draw Geometric Drafting Grid & Celestial Compass Rings
  drawBackgroundGrid(ctx, arenaWidth, arenaHeight, isDark, time);

  // 2. Underlay obstacle layers (anti-gravity wells, rails, portals, plates)
  runRenderPipeline(ctx, state, isDark, time, true);

  // 3. Draw Exit Gate (Monolith)
  drawExitGate(ctx, state.exit, isDark, time);

  // 4. Draw Stars (Celestial Cores)
  for (const star of state.stars) {
    if (!star.collected) {
      drawStar(ctx, star.x, star.y, star.radius, isDark, time + star.pulsePhase);
    }
  }

  // 5. Draw Lasers & Emitters
  drawLasers(ctx, state.lasers, state.obstacles, isDark, time);

  // 6. Overlay obstacle layers (phase barriers, blocks, walls, mechanisms)
  runRenderPipeline(ctx, state, isDark, time, false);

  // 7. Draw Ball (Protagonist)
  if (!state.ball.dead) {
    drawBall(ctx, state, isDark);
  }

  // 8. Draw Ripples and Particles
  drawRipples(ctx, state.ripples);
  drawParticles(ctx, state.particles);

  // 9. Draw Arena Outer Bounding Frame
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

// Annihilation field: pulsing crimson slab with warning cross-hatch.
// Mirrors the editor's visual language (editorCanvas.ts 'hazard' palette) so
// players recognise the lethal zone in-game.
function drawHazard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDark: boolean,
  time: number
) {
  ctx.save();

  // Pulsing danger fill
  const pulse = 0.5 + Math.sin(time * 3) * 0.5;
  ctx.fillStyle = isDark
    ? `rgba(239, 68, 68, ${0.14 + pulse * 0.08})`
    : `rgba(220, 38, 38, ${0.14 + pulse * 0.08})`;
  ctx.fillRect(x, y, w, h);

  // Cross hatch (both diagonals) clipped to the zone
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = isDark ? 'rgba(239, 68, 68, 0.55)' : 'rgba(185, 28, 28, 0.55)';
  ctx.lineWidth = 1.5;
  const step = 14;
  ctx.beginPath();
  for (let d = -h; d < w + h; d += step) {
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d + h, y + h);
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
  }
  ctx.stroke();
  ctx.restore();

  // Crisp warning border (unclipped)
  ctx.save();
  ctx.strokeStyle = isDark ? '#ef4444' : '#b91c1c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
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
    // Slope-1 hatch: exit through the bottom edge (run = h) or, for the last
    // few lines, through the right edge (run = w - offset). Never beyond.
    const y2 = y + Math.min(h, w - offset);
    if (x1 < x + w && y1 < y + h) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// New mechanism renderers
// ---------------------------------------------------------------------------

function drawBumper(
  ctx: CanvasRenderingContext2D,
  bp: BumperObstacle,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const base = isDark ? '#34d399' : '#059669';
  const horizontal = bp.width >= bp.height;

  // Base pad
  ctx.fillStyle = isDark ? 'rgba(52, 211, 153, 0.16)' : 'rgba(5, 150, 105, 0.14)';
  ctx.fillRect(bp.x, bp.y, bp.width, bp.height);
  ctx.strokeStyle = base;
  ctx.lineWidth = 2;
  ctx.strokeRect(bp.x, bp.y, bp.width, bp.height);

  // Animated chevrons pointing along the boost direction
  const spacing = 16;
  const offset = (time * 40) % spacing;
  ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.75)' : 'rgba(5, 150, 105, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const len = horizontal ? bp.width : bp.height;
  for (let d = offset; d < len; d += spacing) {
    if (bp.direction === 'right') {
      const x = bp.x + d;
      ctx.moveTo(x - 4, bp.y + 3);
      ctx.lineTo(x + 2, bp.y + bp.height / 2);
      ctx.lineTo(x - 4, bp.y + bp.height - 3);
    } else if (bp.direction === 'left') {
      const x = bp.x + bp.width - d;
      ctx.moveTo(x + 4, bp.y + 3);
      ctx.lineTo(x - 2, bp.y + bp.height / 2);
      ctx.lineTo(x + 4, bp.y + bp.height - 3);
    } else if (bp.direction === 'down') {
      const y = bp.y + d;
      ctx.moveTo(bp.x + 3, y - 4);
      ctx.lineTo(bp.x + bp.width / 2, y + 2);
      ctx.lineTo(bp.x + bp.width - 3, y - 4);
    } else {
      const y = bp.y + bp.height - d;
      ctx.moveTo(bp.x + 3, y + 4);
      ctx.lineTo(bp.x + bp.width / 2, y - 2);
      ctx.lineTo(bp.x + bp.width - 3, y + 4);
    }
  }
  ctx.stroke();

  // Pulse aura
  const pulse = 0.10 + Math.sin(time * 5) * 0.05;
  ctx.fillStyle = isDark ? `rgba(52, 211, 153, ${pulse})` : `rgba(5, 150, 105, ${pulse})`;
  ctx.fillRect(bp.x - 2, bp.y - 2, bp.width + 4, bp.height + 4);

  ctx.restore();
}

function drawOneWayGate(
  ctx: CanvasRenderingContext2D,
  gate: OneWayGateObstacle,
  state: PhysicsWorldState,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const horizontal = gate.width >= gate.height;
  const dirSign =
    gate.passDirection === 'right' || gate.passDirection === 'down' ? 1 : -1;

  const vel = horizontal ? state.ball.vx : state.ball.vy;
  const tol = gate.tolerance ?? 30;
  const permeable = vel * dirSign > tol;

  const solidColor = isDark ? 'rgba(148, 163, 184, 0.9)' : 'rgba(71, 85, 105, 0.85)';
  const fillColor = isDark ? 'rgba(51, 65, 85, 0.9)' : 'rgba(148, 163, 184, 0.6)';

  if (permeable) {
    // Ethereal dashed outline
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(71, 85, 105, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = fillColor;
    ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
    ctx.strokeStyle = solidColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
  }

  // Animated flow arrows along pass direction (always visible for readability)
  const spacing = 14;
  const offset = (time * 26) % spacing;
  ctx.strokeStyle = permeable
    ? (isDark ? 'rgba(56, 189, 248, 0.85)' : 'rgba(2, 132, 199, 0.8)')
    : (isDark ? 'rgba(226, 232, 240, 0.7)' : 'rgba(241, 245, 249, 0.9)');
  ctx.lineWidth = 1.6;
  ctx.beginPath();

  const len = horizontal ? gate.width : gate.height;
  for (let d = offset; d < len; d += spacing) {
    if (horizontal) {
      const x = dirSign > 0 ? gate.x + d : gate.x + gate.width - d;
      if (dirSign > 0) {
        ctx.moveTo(x - 3, gate.y + 2);
        ctx.lineTo(x + 2, gate.y + gate.height / 2);
        ctx.lineTo(x - 3, gate.y + gate.height - 2);
      } else {
        ctx.moveTo(x + 3, gate.y + 2);
        ctx.lineTo(x - 2, gate.y + gate.height / 2);
        ctx.lineTo(x + 3, gate.y + gate.height - 2);
      }
    } else {
      const y = dirSign > 0 ? gate.y + d : gate.y + gate.height - d;
      if (dirSign > 0) {
        ctx.moveTo(gate.x + 2, y - 3);
        ctx.lineTo(gate.x + gate.width / 2, y + 2);
        ctx.lineTo(gate.x + gate.width - 2, y - 3);
      } else {
        ctx.moveTo(gate.x + 2, y + 3);
        ctx.lineTo(gate.x + gate.width / 2, y - 2);
        ctx.lineTo(gate.x + gate.width - 2, y + 3);
      }
    }
  }
  ctx.stroke();

  ctx.restore();
}

function drawFragileWall(
  ctx: CanvasRenderingContext2D,
  fw: FragileWallObstacle,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const maxHp = fw.maxHp || fw.hp;
  const damage = 1 - Math.max(0, Math.min(1, fw.hp / maxHp));

  // Amber-tinted masonry
  ctx.fillStyle = isDark ? `rgba(120, 88, 40, ${0.9 - damage * 0.25})` : `rgba(217, 164, 84, ${0.85 - damage * 0.2})`;
  ctx.fillRect(fw.x, fw.y, fw.width, fw.height);

  ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(180, 121, 18, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fw.x, fw.y, fw.width, fw.height);

  // Masonry brick joints
  ctx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(120, 78, 12, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const brickH = 10;
  if (fw.height >= fw.width) {
    for (let by = brickH; by < fw.height; by += brickH) {
      ctx.moveTo(fw.x, fw.y + by);
      ctx.lineTo(fw.x + fw.width, fw.y + by);
    }
  } else {
    for (let bx = brickH * 2; bx < fw.width; bx += brickH * 2) {
      ctx.moveTo(fw.x + bx, fw.y);
      ctx.lineTo(fw.x + bx, fw.y + fw.height);
    }
  }
  ctx.stroke();

  // Damage cracks: deterministic jagged polylines, denser with damage
  if (damage > 0.01) {
    ctx.strokeStyle = isDark ? 'rgba(253, 230, 138, 0.8)' : 'rgba(120, 66, 6, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const crackCount = Math.ceil(damage * 5);
    const horizontal = fw.width >= fw.height;
    for (let c = 0; c < crackCount; c++) {
      const seed = (fw.x * 31 + fw.y * 17 + c * 977) % 100;
      if (horizontal) {
        let cx = fw.x + ((seed / 100) * fw.width);
        let cy = fw.y + 2;
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 4; s++) {
          cx += ((seed * (s + 3)) % 11) - 5;
          cy += (fw.height - 4) / 4;
          ctx.lineTo(cx, cy);
        }
      } else {
        let cx = fw.x + 2;
        let cy = fw.y + ((seed / 100) * fw.height);
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 4; s++) {
          cx += (fw.width - 4) / 4;
          cy += ((seed * (s + 5)) % 11) - 5;
          ctx.lineTo(cx, cy);
        }
      }
    }
    ctx.stroke();
  }

  // Faint life shimmer when close to breaking
  if (fw.hp === 1) {
    const pulse = 0.12 + Math.sin(time * 8) * 0.08;
    ctx.fillStyle = `rgba(248, 113, 113, ${pulse})`;
    ctx.fillRect(fw.x, fw.y, fw.width, fw.height);
  }

  ctx.restore();
}

function drawPressurePlate(
  ctx: CanvasRenderingContext2D,
  plate: PressurePlateObstacle,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const pressed = !!plate.pressed;
  const accent = isDark ? '#a78bfa' : '#7c3aed';

  // Recessed slot
  ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(15, 23, 42, 0.12)';
  ctx.fillRect(plate.x, plate.y, plate.width, plate.height);
  ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(124, 58, 237, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(plate.x, plate.y, plate.width, plate.height);

  // Cap: sinks when pressed
  const inset = pressed ? 5 : 2.5;
  ctx.fillStyle = pressed
    ? (isDark ? 'rgba(167, 139, 250, 0.45)' : 'rgba(124, 58, 237, 0.4)')
    : (isDark ? 'rgba(88, 74, 141, 0.85)' : 'rgba(160, 140, 220, 0.8)');
  ctx.fillRect(plate.x + inset, plate.y + inset, plate.width - inset * 2, plate.height - inset * 2);

  ctx.strokeStyle = accent;
  ctx.lineWidth = pressed ? 2 : 1.5;
  ctx.strokeRect(plate.x + inset, plate.y + inset, plate.width - inset * 2, plate.height - inset * 2);

  // Signal glyph: latch plates show a diamond, momentary show a dot
  const cx = plate.x + plate.width / 2;
  const cy = plate.y + plate.height / 2;
  ctx.fillStyle = pressed ? '#f5f3ff' : accent;
  if (plate.latch) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft glow when pressed
  if (pressed) {
    const glow = 0.15 + Math.sin(time * 6) * 0.06;
    ctx.fillStyle = isDark ? `rgba(167, 139, 250, ${glow})` : `rgba(124, 58, 237, ${glow})`;
    ctx.fillRect(plate.x - 3, plate.y - 3, plate.width + 6, plate.height + 6);
  }

  ctx.restore();
}

function drawLinkedGate(
  ctx: CanvasRenderingContext2D,
  gate: LinkedGateObstacle,
  isDark: boolean,
  time: number
) {
  ctx.save();
  const open = !!gate.open;
  const accent = isDark ? '#a78bfa' : '#7c3aed';

  if (open) {
    // Retracted: faint dashed ghost + passage arrows
    ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(124, 58, 237, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 6]);
    ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
    ctx.setLineDash([]);

    const horizontal = gate.width >= gate.height;
    const offset = (time * 30) % 18;
    ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.5)' : 'rgba(124, 58, 237, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (horizontal) {
      for (let x = gate.x + offset; x < gate.x + gate.width; x += 18) {
        ctx.moveTo(x, gate.y + gate.height / 2 - 3);
        ctx.lineTo(x + 5, gate.y + gate.height / 2);
        ctx.lineTo(x, gate.y + gate.height / 2 + 3);
      }
    } else {
      for (let y = gate.y + offset; y < gate.y + gate.height; y += 18) {
        ctx.moveTo(gate.x + gate.width / 2 - 3, y);
        ctx.lineTo(gate.x + gate.width / 2, y + 5);
        ctx.lineTo(gate.x + gate.width / 2 + 3, y);
      }
    }
    ctx.stroke();
  } else {
    // Closed: violet energy slab with hazard chevrons
    ctx.fillStyle = isDark ? 'rgba(58, 46, 99, 0.95)' : 'rgba(124, 108, 180, 0.75)';
    ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);

    ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.4)' : 'rgba(240, 235, 255, 0.5)';
    ctx.lineWidth = 1.5;
    const step = 14;
    ctx.beginPath();
    for (let offset = -gate.height; offset < gate.width; offset += step) {
      const x1 = Math.max(gate.x, gate.x + offset);
      const y1 = gate.y + Math.max(0, -offset);
      const x2 = Math.min(gate.x + gate.width, gate.x + offset + gate.height);
      // Exit run is min(height, width - offset) so slope-1 hatches stay 45°.
      const y2 = gate.y + Math.min(gate.height, gate.width - offset);
      if (x1 < gate.x + gate.width && y2 > gate.y) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();

    // Lock core
    const cx = gate.x + gate.width / 2;
    const cy = gate.y + gate.height / 2;
    const pulse = 0.5 + Math.sin(time * 4) * 0.2;
    ctx.fillStyle = isDark ? `rgba(233, 213, 255, ${pulse})` : `rgba(255, 255, 255, ${pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Legacy / shared draw functions
// ---------------------------------------------------------------------------

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

function drawMirror(
  ctx: CanvasRenderingContext2D,
  m: MirrorObstacle,
  isDark: boolean,
  time: number
) {
  const seg = mirrorSurfaceSegment(m);

  ctx.save();

  // Faint housing box so the editable volume stays legible
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m.x, m.y, m.width, m.height);

  // Subtle aura behind the reflective face
  ctx.shadowBlur = 10 + Math.sin(time * 2.2) * 3;
  ctx.shadowColor = isDark ? 'rgba(165, 243, 252, 0.5)' : 'rgba(14, 165, 233, 0.35)';

  // Reflective surface: metallic gradient stroke
  const grad = ctx.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2);
  grad.addColorStop(0, isDark ? 'rgba(226, 232, 240, 0.9)' : 'rgba(71, 85, 105, 0.85)');
  grad.addColorStop(0.5, isDark ? '#a5f3fc' : '#0ea5e9');
  grad.addColorStop(1, isDark ? 'rgba(226, 232, 240, 0.9)' : 'rgba(71, 85, 105, 0.85)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(seg.x1, seg.y1);
  ctx.lineTo(seg.x2, seg.y2);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Travelling shimmer pulse along the surface
  const shimmerT = ((time * 0.35) % 1 + 1) % 1;
  const shX = seg.x1 + (seg.x2 - seg.x1) * shimmerT;
  const shY = seg.y1 + (seg.y2 - seg.y1) * shimmerT;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(shX, shY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // End mounts
  ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
  for (const [px, py] of [[seg.x1, seg.y1], [seg.x2, seg.y2]] as const) {
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Half-silvered (one-way) mirror: mark the silvered side with parallel
  // accent ticks and the glass side with a faint dashed backing line.
  const side = m.reflectSide ?? 'both';
  if (side !== 'both') {
    const rad = (m.angle * Math.PI) / 180;
    const nx = -Math.sin(rad);
    const ny = Math.cos(rad);
    const sign = side === 'front' ? 1 : -1;
    const offX = nx * sign * 7;
    const offY = ny * sign * 7;

    // Silvered side: short accent ticks parallel to the surface
    ctx.shadowBlur = 6;
    ctx.shadowColor = isDark ? 'rgba(165, 243, 252, 0.7)' : 'rgba(14, 165, 233, 0.5)';
    ctx.strokeStyle = isDark ? 'rgba(165, 243, 252, 0.75)' : 'rgba(14, 165, 233, 0.6)';
    ctx.lineWidth = 1.5;
    const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    const ux = (seg.x2 - seg.x1) / len;
    const uy = (seg.y2 - seg.y1) / len;
    const tickCount = Math.max(2, Math.floor(len / 26));
    for (let i = 0; i <= tickCount; i++) {
      const t = (i + 0.5) / (tickCount + 1);
      const bx = seg.x1 + (seg.x2 - seg.x1) * t;
      const by = seg.y1 + (seg.y2 - seg.y1) * t;
      const half = 5;
      ctx.beginPath();
      ctx.moveTo(bx - ux * half + offX, by - uy * half + offY);
      ctx.lineTo(bx + ux * half + offX, by + uy * half + offY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Glass side: faint dashed line so the pass-through direction reads clearly
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(seg.x1 - offX, seg.y1 - offY);
    ctx.lineTo(seg.x2 - offX, seg.y2 - offY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawLasers(
  ctx: CanvasRenderingContext2D,
  lasers: LaserRay[],
  obstacles: import('./types').AnyObstacle[],
  isDark: boolean,
  time: number
) {
  // Draw emitters: base housing + rotated barrel indicating beam direction
  for (const obs of obstacles) {
    if (obs.type !== 'laser_emitter') continue;
    const emitter = obs as LaserEmitterObstacle;
    const { dx, dy } = emitterBeamDir(emitter);

    ctx.save();
    ctx.fillStyle = isDark ? '#e11d48' : '#be123c';
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.strokeStyle = isDark ? '#fda4af' : '#ffe4e6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

    ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = isDark ? '#fb7185' : '#f43f5e';
    ctx.fillRect(0, -3, Math.max(obs.width, obs.height) * 0.75, 6);
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.arc(Math.max(obs.width, obs.height) * 0.75, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  // 3.5 Skinned sphere sprite (showcase designs). Falls back to the classic
  //     procedural star-core below while the sprite loads or when classic is
  //     selected. Skin is cosmetic only — physics/radius untouched.
  ensureSkinImagesLoaded();
  const skinId = getSelectedSkinId();
  const skinImg = skinId === CLASSIC_SKIN_ID ? null : getSkinImage(skinId);
  if (skinImg) {
    // Design circle sits at r≈90 within the 110 half-viewBox, so this size
    // lands the visible skin edge at ≈1.02× ball radius.
    const size = ball.radius * 2.5;
    ctx.save();
    ctx.rotate(state.elapsedTime * 0.35); // slow ceremonial spin
    ctx.drawImage(skinImg, -size / 2, -size / 2, size, size);
    ctx.restore();
    ctx.restore();
    return;
  }

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
