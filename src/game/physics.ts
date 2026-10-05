import { sound } from './audio';
import { PERF } from './perf';
import {
  AnyObstacle,
  Ball,
  BumperObstacle,
  CameraShake,
  CardinalDirection,
  FragileWallObstacle,
  LaserEmitterObstacle,
  LaserRay,
  LevelConfig,
  LinkedGateObstacle,
  MirrorObstacle,
  ObstacleType,
  OneWayGateObstacle,
  Particle,
  PhaseBarrierObstacle,
  PhysicsParams,
  PhysicsWorldState,
  PortalObstacle,
  PressurePlateObstacle,
  SlidingBlockObstacle,
  StarItem,
  Vector2D,
  AntiGravityObstacle
} from './types';

export type { PhysicsWorldState };

// ---------------------------------------------------------------------------
// Base physics constants (defaults for PhysicsParams resolution)
// ---------------------------------------------------------------------------
export const BALL_RADIUS = 14;
export const GRAVITY_MAGNITUDE = 1200; // px/s^2
export const MAX_VELOCITY = 1500;
export const RESTITUTION = 0.45; // Bounciness
export const FRICTION = 0.988; // Air/surface damping

export const DEFAULT_PHYSICS_PARAMS: PhysicsParams = {
  gravityScale: 1,
  restitution: RESTITUTION,
  friction: FRICTION,
  maxVelocity: MAX_VELOCITY
};

/** Seconds the death explosion plays before the ball respawns. */
const DEATH_RESPAWN_DELAY = 0.9;

/**
 * Resolve the runtime physics parameter set:
 * sandbox overrides > per-level config > engine defaults.
 */
export function resolvePhysicsParams(
  levelParams?: Partial<PhysicsParams> | null,
  overrides?: Partial<PhysicsParams> | null
): PhysicsParams {
  return {
    gravityScale:
      overrides?.gravityScale ?? levelParams?.gravityScale ?? DEFAULT_PHYSICS_PARAMS.gravityScale,
    restitution:
      overrides?.restitution ?? levelParams?.restitution ?? DEFAULT_PHYSICS_PARAMS.restitution,
    friction: overrides?.friction ?? levelParams?.friction ?? DEFAULT_PHYSICS_PARAMS.friction,
    maxVelocity:
      overrides?.maxVelocity ?? levelParams?.maxVelocity ?? DEFAULT_PHYSICS_PARAMS.maxVelocity
  };
}

export function createInitialBall(start: Vector2D): Ball {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    trail: [],
    isPhasing: false,
    dead: false,
    pulsePhase: 0
  };
}

/**
 * Build a fresh mutable world state from a level config.
 * Single source of truth used by App on init / level switch / sandbox apply.
 */
export function createWorldState(
  level: LevelConfig,
  paramOverrides?: Partial<PhysicsParams>
): PhysicsWorldState {
  return {
    ball: createInitialBall(level.ballStart),
    obstacles: JSON.parse(JSON.stringify(level.obstacles)),
    stars: JSON.parse(JSON.stringify(level.stars)),
    exit: JSON.parse(JSON.stringify(level.exit)),
    gravityAngle: 0,
    targetAngle: 0,
    particles: [],
    ripples: [],
    lasers: [],
    portalCooldown: 0,
    movesCount: 0,
    elapsedTime: 0,
    isWon: false,
    status: 'playing',
    deathTimer: 0,
    ballStart: { x: level.ballStart.x, y: level.ballStart.y },
    params: resolvePhysicsParams(level.physics, paramOverrides),
    shake: { magnitude: 0, duration: 0, elapsed: 0 }
  };
}

const DIRECTION_VECTORS: Record<CardinalDirection, Vector2D> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

/**
 * Fire a camera shake. Overlapping shakes do NOT stack — the stronger
 * request wins (and refreshes the timer), so rapid multi-impacts stay
 * punchy without turning into motion sickness soup.
 */
export function addShake(state: PhysicsWorldState, magnitude: number, duration: number): void {
  const s = state.shake;
  if (magnitude >= s.magnitude) {
    s.magnitude = magnitude;
    s.duration = duration;
    s.elapsed = 0;
  }
}

/** Current shake offset in px (0,0 when idle). Sampled once per frame by the renderer host. */
export function sampleShakeOffset(shake: CameraShake): { x: number; y: number } {
  const remain = shake.duration - shake.elapsed;
  if (remain <= 0 || shake.magnitude <= 0 || PERF.shakeScale <= 0) return { x: 0, y: 0 };
  // Ease-out envelope so the last frames settle instead of cutting off
  const amp = shake.magnitude * (remain / shake.duration) * PERF.shakeScale;
  return {
    x: (Math.random() * 2 - 1) * amp,
    y: (Math.random() * 2 - 1) * amp
  };
}

/**
 * Determine if a phase barrier is currently solid given the gravity angle.
 * Orientation: 0 = Down (0 rad / 360 deg), 1 = Right (PI/2), 2 = Up (PI), 3 = Left (3*PI/2)
 */
export function isPhaseBarrierSolid(barrier: PhaseBarrierObstacle, gravityAngle: number): boolean {
  // Normalize angle to [0, 2PI)
  let norm = gravityAngle % (Math.PI * 2);
  if (norm < 0) norm += Math.PI * 2;

  // Approximate to nearest quadrant (0, 1, 2, 3)
  const quadrant = Math.round(norm / (Math.PI / 2)) % 4;
  return barrier.solidOrientations.includes(quadrant);
}

/**
 * Circle to AABB Box Collision and Resolution
 * `friction` damps the tangential velocity component on impact (defaults to
 * the engine constant so legacy call sites keep their feel; level/sandbox
 * overrides like ice or mud now apply to collision bounces too).
 */
function resolveCircleBoxCollision(
  cx: number, cy: number, r: number,
  vx: number, vy: number,
  bx: number, by: number, bw: number, bh: number,
  restitution: number,
  friction: number = FRICTION
): { x: number; y: number; vx: number; vy: number; hit: boolean; impactSpeed: number } {
  // Find closest point on box to circle
  const closestX = Math.max(bx, Math.min(cx, bx + bw));
  const closestY = Math.max(by, Math.min(cy, by + bh));

  const distX = cx - closestX;
  const distY = cy - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < r * r && distSq > 0.00001) {
    const dist = Math.sqrt(distSq);
    const nx = distX / dist;
    const ny = distY / dist;
    const overlap = r - dist;

    // Push out along normal
    const resolvedX = cx + nx * overlap;
    const resolvedY = cy + ny * overlap;

    // Normal velocity
    const dot = vx * nx + vy * ny;
    let newVx = vx;
    let newVy = vy;
    let impactSpeed = 0;

    if (dot < 0) {
      impactSpeed = Math.abs(dot);
      // Split velocity into normal + tangential parts: restitution flips the
      // normal component, friction damps only the tangential one.
      const vnx = dot * nx;
      const vny = dot * ny;
      const vtx = vx - vnx;
      const vty = vy - vny;
      const bounce = -restitution * dot; // positive outgoing normal speed
      newVx = vtx * friction + bounce * nx;
      newVy = vty * friction + bounce * ny;
    }

    return { x: resolvedX, y: resolvedY, vx: newVx, vy: newVy, hit: true, impactSpeed };
  } else if (distSq <= 0.00001) {
    // Circle center is inside box: push toward nearest edge
    const dLeft = Math.abs(cx - bx);
    const dRight = Math.abs(cx - (bx + bw));
    const dTop = Math.abs(cy - by);
    const dBottom = Math.abs(cy - (by + bh));
    const minD = Math.min(dLeft, dRight, dTop, dBottom);

    let nx = 0, ny = 0;
    if (minD === dLeft) nx = -1;
    else if (minD === dRight) nx = 1;
    else if (minD === dTop) ny = -1;
    else ny = 1;

    // Eject along the nearest-edge normal. Keep the tangential velocity
    // (previously it was wiped out whenever the eject normal was axis-aligned)
    // and flip the normal component outward with restitution.
    const vn = vx * nx + vy * ny;
    const vtx = vx - vn * nx;
    const vty = vy - vn * ny;
    const outN = Math.abs(vn) * restitution;

    return {
      x: cx + nx * (r + 1),
      y: cy + ny * (r + 1),
      vx: vtx + nx * outN,
      vy: vty + ny * outN,
      hit: true,
      impactSpeed: Math.abs(vn)
    };
  }

  return { x: cx, y: cy, vx, vy, hit: false, impactSpeed: 0 };
}

/** Simple circle-AABB overlap probe (sensor zones, plates, bumpers). */
function circleBoxOverlap(
  cx: number, cy: number, r: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  const closestX = Math.max(bx, Math.min(cx, bx + bw));
  const closestY = Math.max(by, Math.min(cy, by + bh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

/** Standard solid-wall resolution against the ball, applying result in place. */
function collideBallAsWall(
  state: PhysicsWorldState,
  bx: number, by: number, bw: number, bh: number,
  restitution: number,
  playSound = true
): { hit: boolean; impactSpeed: number } {
  const col = resolveCircleBoxCollision(
    state.ball.x, state.ball.y, state.ball.radius,
    state.ball.vx, state.ball.vy,
    bx, by, bw, bh,
    restitution,
    state.params.friction
  );
  if (col.hit) {
    state.ball.x = col.x;
    state.ball.y = col.y;
    state.ball.vx = col.vx;
    state.ball.vy = col.vy;
    if (playSound && col.impactSpeed > 25) {
      sound.playImpact(col.impactSpeed);
      spawnImpactParticles(state, state.ball.x, state.ball.y, 4);
    }
  }
  return col;
}

/**
 * Segment intersection test for lasers
 */
function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): { hit: boolean; x: number; y: number; dist: number } {
  // Check 4 segments of rectangle
  const segments = [
    { p1: { x: rx, y: ry }, p2: { x: rx + rw, y: ry } }, // Top
    { p1: { x: rx + rw, y: ry }, p2: { x: rx + rw, y: ry + rh } }, // Right
    { p1: { x: rx, y: ry + rh }, p2: { x: rx + rw, y: ry + rh } }, // Bottom
    { p1: { x: rx, y: ry }, p2: { x: rx, y: ry + rh } }, // Left
  ];

  let nearestDist = Infinity;
  let hitPoint = { x: x2, y: y2 };
  let hit = false;

  for (const seg of segments) {
    const inter = getLineIntersection(
      x1, y1, x2, y2,
      seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y
    );
    if (inter) {
      const d = Math.hypot(inter.x - x1, inter.y - y1);
      if (d < nearestDist) {
        nearestDist = d;
        hitPoint = inter;
        hit = true;
      }
    }
  }

  return { hit, x: hitPoint.x, y: hitPoint.y, dist: nearestDist };
}

function getLineIntersection(
  p0_x: number, p0_y: number, p1_x: number, p1_y: number,
  p2_x: number, p2_y: number, p3_x: number, p3_y: number
): { x: number; y: number } | null {
  const s1_x = p1_x - p0_x;
  const s1_y = p1_y - p0_y;
  const s2_x = p3_x - p2_x;
  const s2_y = p3_y - p2_y;

  const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
  const t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    return {
      x: p0_x + (t * s1_x),
      y: p0_y + (t * s1_y)
    };
  }
  return null;
}

/**
 * Check if a laser ray hits the ball
 */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// ---------------------------------------------------------------------------
// Obstacle behavior registry
// ---------------------------------------------------------------------------
// Each obstacle type registers one per-substep interaction handler. Adding a
// new mechanism = adding a new entry here + a renderer entry + (optional) UI
// tool. No more scattered if-else chains.

interface BehaviorContext {
  subDt: number;
  gx: number;
  gy: number;
  arenaWidth: number;
  arenaHeight: number;
  phasing: boolean; // shared flag: ball is inside a permeable volume this substep
}

type ObstacleBehavior = (state: PhysicsWorldState, obs: AnyObstacle, bctx: BehaviorContext) => void;

const OBSTACLE_BEHAVIORS: Partial<Record<ObstacleType, ObstacleBehavior>> = {
  wall: (state, obs) => {
    collideBallAsWall(state, obs.x, obs.y, obs.width, obs.height, state.params.restitution);
  },

  // NOTE: sliding-block *kinetics* run in the pre-integration pass below;
  // this entry only handles the ball <-> block collision response.
  sliding_block: (state, obs) => {
    const sb = obs as SlidingBlockObstacle;
    // Resolve using the RELATIVE velocity (ball seen from the block frame).
    const relVx = state.ball.vx - sb.vx;
    const relVy = state.ball.vy - sb.vy;
    const col = resolveCircleBoxCollision(
      state.ball.x, state.ball.y, state.ball.radius,
      relVx, relVy,
      sb.x, sb.y, sb.width, sb.height,
      state.params.restitution,
      state.params.friction
    );
    if (col.hit) {
      state.ball.x = col.x;
      state.ball.y = col.y;
      state.ball.vx = col.vx + sb.vx;
      state.ball.vy = col.vy + sb.vy;
      // Momentum transfer: the block receives the opposite of the ball's
      // collision impulse (change of relative velocity), scaled by the mass
      // ratio. The previous code used the POST-collision ball velocity —
      // which includes the block's own velocity — so blocks self-accelerated
      // (+15% per contact substep) and drifted TOWARDS the ball.
      const dvx = col.vx - relVx;
      const dvy = col.vy - relVy;
      const transfer = 0.35 / Math.max(1, sb.mass);
      sb.vx -= dvx * transfer;
      sb.vy -= dvy * transfer;
      if (col.impactSpeed > 30) {
        sound.playImpact(col.impactSpeed);
      }
    }
  },

  phase_barrier: (state, obs, bctx) => {
    const pb = obs as PhaseBarrierObstacle;
    const isSolid = isPhaseBarrierSolid(pb, state.gravityAngle);

    if (isSolid) {
      const col = resolveCircleBoxCollision(
        state.ball.x, state.ball.y, state.ball.radius,
        state.ball.vx, state.ball.vy,
        pb.x, pb.y, pb.width, pb.height,
        state.params.restitution * 0.8,
        state.params.friction
      );
      if (col.hit) {
        state.ball.x = col.x;
        state.ball.y = col.y;
        state.ball.vx = col.vx;
        state.ball.vy = col.vy;
        if (col.impactSpeed > 30) {
          sound.playImpact(col.impactSpeed);
        }
      }
    } else if (circleBoxOverlap(
      state.ball.x, state.ball.y, state.ball.radius,
      pb.x, pb.y, pb.width, pb.height
    )) {
      bctx.phasing = true;
      if (!state.ball.isPhasing) {
        sound.playPhasePass();
      }
    }
  },

  portal: (state, obs) => {
    const port = obs as PortalObstacle;
    const triggerR = port.radius || 24;
    const pCenterX = port.x + port.width / 2;
    const pCenterY = port.y + port.height / 2;
    const dist = Math.hypot(state.ball.x - pCenterX, state.ball.y - pCenterY);

    // Anti ping-pong: a portal disarms itself on arrival and only re-arms
    // once the ball has FULLY left its trigger zone. Without this, a ball
    // resting inside a ground-level portal teleports back and forth forever
    // once the 0.45s cooldown expires.
    if (dist > triggerR + state.ball.radius) {
      port.armed = true;
      return;
    }
    if (port.armed === false) return;
    if (state.portalCooldown > 0) return;

    if (dist < triggerR) {
      // Find target portal
      const target = state.obstacles.find(
        o => o.id === port.targetPortalId && o.type === 'portal'
      ) as PortalObstacle | undefined;
      if (target) {
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;

        state.ball.x = targetCenterX;
        state.ball.y = targetCenterY;
        state.portalCooldown = 0.45; // prevent immediate re-entry
        target.armed = false; // disarm destination until the ball exits it

        // Momentum redirection: rotate exit velocity by outAngleOffset (radians)
        if (port.outAngleOffset) {
          const cos = Math.cos(port.outAngleOffset);
          const sin = Math.sin(port.outAngleOffset);
          const nvx = state.ball.vx * cos - state.ball.vy * sin;
          const nvy = state.ball.vx * sin + state.ball.vy * cos;
          state.ball.vx = nvx;
          state.ball.vy = nvy;
        }

        sound.playPortal();
        state.ripples.push({
          x: targetCenterX,
          y: targetCenterY,
          radius: 4,
          maxRadius: 48,
          alpha: 1,
          color: 'rgba(192, 132, 252, 0.9)',
          lineWidth: 2.5
        });
      }
    }
  },

  hazard: (state, obs) => {
    if (circleBoxOverlap(
      state.ball.x, state.ball.y, state.ball.radius,
      obs.x, obs.y, obs.width, obs.height
    )) {
      triggerDeath(state);
    }
  },

  // Anti-gravity surge: continuous lift field inside the zone. Without a
  // `direction`, the force directly opposes the current global gravity (so
  // the "fountain" always pushes "up" however the arena is rotated).
  anti_gravity: (state, obs, bctx) => {
    const ag = obs as AntiGravityObstacle;
    if (!circleBoxOverlap(
      state.ball.x, state.ball.y, state.ball.radius,
      ag.x, ag.y, ag.width, ag.height
    )) return;

    let ax: number, ay: number;
    if (ag.direction) {
      const d = DIRECTION_VECTORS[ag.direction];
      ax = d.x;
      ay = d.y;
    } else {
      const gl = Math.hypot(bctx.gx, bctx.gy);
      if (gl > 0.0001) {
        ax = -bctx.gx / gl;
        ay = -bctx.gy / gl;
      } else {
        ax = 0;
        ay = -1;
      }
    }
    // `force` is a multiplier of the effective gravity magnitude (LV-06/09
    // use 2.2–2.4: a net lift of ~1.2–1.4× g inside the field).
    const accel = ag.force * GRAVITY_MAGNITUDE * state.params.gravityScale * bctx.subDt;
    state.ball.vx += ax * accel;
    state.ball.vy += ay * accel;
  },

  bumper: (state, obs) => {
    const bp = obs as BumperObstacle;
    const r = state.ball.radius;
    if (!circleBoxOverlap(state.ball.x, state.ball.y, r, bp.x, bp.y, bp.width, bp.height)) return;

    const dir = DIRECTION_VECTORS[bp.direction];
    const strength = bp.strength || 900;
    const perpX = -dir.y;
    const perpY = dir.x;
    const along = state.ball.vx * dir.x + state.ball.vy * dir.y;
    const perp = (state.ball.vx * perpX + state.ball.vy * perpY) * 0.85;

    // Launch: set along-axis speed to strength, dampen the perpendicular part
    state.ball.vx = dir.x * strength + perpX * perp;
    state.ball.vy = dir.y * strength + perpY * perp;

    // Eject the ball to the pad edge along the boost direction to avoid sticking
    if (bp.direction === 'up') state.ball.y = Math.min(state.ball.y, bp.y - r - 0.5);
    else if (bp.direction === 'down') state.ball.y = Math.max(state.ball.y, bp.y + bp.height + r + 0.5);
    else if (bp.direction === 'left') state.ball.x = Math.min(state.ball.x, bp.x - r - 0.5);
    else state.ball.x = Math.max(state.ball.x, bp.x + bp.width + r + 0.5);

    sound.playBumper();
    addShake(state, 3, 0.16);

    for (let i = 0; i < 8; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const a = Math.atan2(dir.y, dir.x) + spread;
      const sp = 60 + Math.random() * 120;
      pushParticle(state, {
        x: state.ball.x,
        y: state.ball.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3,
        maxLife: 0.3,
        size: 2.5,
        color: 'rgba(52, 211, 153, 0.85)',
        shape: 'circle'
      });
    }
    state.ripples.push({
      x: state.ball.x,
      y: state.ball.y,
      radius: 6,
      maxRadius: 42,
      alpha: 0.9,
      color: 'rgba(52, 211, 153, 0.8)',
      lineWidth: 2
    });
  },

  one_way_gate: (state, obs, bctx) => {
    const gate = obs as OneWayGateObstacle;
    const dir = DIRECTION_VECTORS[gate.passDirection];
    const tol = gate.tolerance ?? 30;
    const along = state.ball.vx * dir.x + state.ball.vy * dir.y;

    if (along > tol) {
      // Moving through in the allowed direction: permeable
      bctx.phasing = true;
      return;
    }
    collideBallAsWall(state, gate.x, gate.y, gate.width, gate.height, state.params.restitution);
  },

  fragile_wall: (state, obs) => {
    const fw = obs as FragileWallObstacle;
    if (fw.broken) return;
    if (!fw.maxHp) fw.maxHp = fw.hp;

    const col = collideBallAsWall(
      state, fw.x, fw.y, fw.width, fw.height,
      state.params.restitution,
      false // custom sound handling below
    );
    if (!col.hit) return;

    const threshold = fw.impactThreshold ?? 220;
    if (col.impactSpeed > threshold) {
      fw.hp -= 1;
      spawnDebrisParticles(state, fw, 6, false);
      sound.playCrack();

      if (fw.hp <= 0) {
        fw.broken = true;
        sound.playBreak();
        addShake(state, 5, 0.28);
        spawnDebrisParticles(state, fw, 22, true);
        state.ripples.push({
          x: fw.x + fw.width / 2,
          y: fw.y + fw.height / 2,
          radius: 8,
          maxRadius: Math.max(fw.width, fw.height) * 0.9,
          alpha: 1,
          color: 'rgba(251, 191, 36, 0.9)',
          lineWidth: 2.5
        });
      }
    } else if (col.impactSpeed > 25) {
      sound.playImpact(col.impactSpeed);
    }
  },

  // pressure_plate state is driven by updateLinkages() pre-pass, no direct behavior
  linked_gate: (state, obs) => {
    const gate = obs as LinkedGateObstacle;
    if (gate.open) return;
    collideBallAsWall(state, gate.x, gate.y, gate.width, gate.height, state.params.restitution);
  }
};

/**
 * Pressure plate -> linked gate linkage resolution.
 * Runs every substep before obstacle behaviors so gates react instantly.
 * A plate is pressed while the ball overlaps it; latched plates stay pressed
 * forever after first touch.
 */
function updateLinkages(state: PhysicsWorldState) {
  const plates: PressurePlateObstacle[] = [];
  for (const o of state.obstacles) {
    if (o.type === 'pressure_plate') plates.push(o);
  }
  if (plates.length === 0) return;

  for (const p of plates) {
    if (p.pressed && p.latch) continue; // latched: stays pressed
    p.pressed = circleBoxOverlap(
      state.ball.x, state.ball.y, state.ball.radius,
      p.x, p.y, p.width, p.height
    );
  }

  for (const o of state.obstacles) {
    if (o.type !== 'linked_gate') continue;
    const gate = o as LinkedGateObstacle;
    const wasOpen = gate.open;
    gate.open = plates.some(pl => pl.pressed && pl.linkId === gate.id);
    if (!wasOpen && gate.open) {
      sound.playPlate();
      state.ripples.push({
        x: gate.x + gate.width / 2,
        y: gate.y + gate.height / 2,
        radius: 4,
        maxRadius: 36,
        alpha: 0.9,
        color: 'rgba(167, 139, 250, 0.85)',
        lineWidth: 2
      });
    }
  }
}

/**
 * Laser beam occluders: solid bodies block light.
 */
function occludesLaser(obs: AnyObstacle): boolean {
  if (obs.type === 'wall' || obs.type === 'sliding_block') return true;
  if (obs.type === 'fragile_wall') return !(obs as FragileWallObstacle).broken;
  if (obs.type === 'linked_gate') return !(obs as LinkedGateObstacle).open;
  return false;
}

// ---------------------------------------------------------------------------
// Laser optics: free-angle emitters + mirror reflections
// ---------------------------------------------------------------------------

/** Resolve a laser emitter's beam direction (unit vector) from `angle` (deg)
 *  or the legacy 4-way `direction` fallback. */
export function emitterBeamDir(emitter: LaserEmitterObstacle): { dx: number; dy: number } {
  if (typeof emitter.angle === 'number' && Number.isFinite(emitter.angle)) {
    const rad = (emitter.angle * Math.PI) / 180;
    return { dx: Math.cos(rad), dy: Math.sin(rad) };
  }
  switch (emitter.direction) {
    case 'right': return { dx: 1, dy: 0 };
    case 'left': return { dx: -1, dy: 0 };
    case 'down': return { dx: 0, dy: 1 };
    case 'up':
    default: return { dx: 0, dy: -1 };
  }
}

/** The reflective surface of a mirror: a line through the box center at
 *  `angle` degrees, half-length = max(width, height) / 2. */
export function mirrorSurfaceSegment(m: MirrorObstacle): {
  x1: number; y1: number; x2: number; y2: number;
} {
  const cx = m.x + m.width / 2;
  const cy = m.y + m.height / 2;
  const half = Math.max(m.width, m.height) / 2;
  const rad = (m.angle * Math.PI) / 180;
  const dx = Math.cos(rad) * half;
  const dy = Math.sin(rad) * half;
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy };
}

/** Hard cap on folds per beam; prevents pathological mirror hailies. */
const MAX_LASER_BOUNCES = 8;

/**
 * Cast all laser beams: free-angle emitters, solid occluders stop the ray,
 * mirrors reflect it (angle of incidence = angle of reflection).
 * Pure — shared by the physics loop and the editor's live beam preview.
 */
export function computeLaserSegments(
  obstacles: AnyObstacle[],
  arenaWidth: number,
  arenaHeight: number
): LaserRay[] {
  const segments: LaserRay[] = [];

  for (const obs of obstacles) {
    if (obs.type !== 'laser_emitter') continue;
    const emitter = obs as LaserEmitterObstacle;
    if (!emitter.active) continue;

    const originX = emitter.x + emitter.width / 2;
    const originY = emitter.y + emitter.height / 2;
    const start = emitterBeamDir(emitter);

    let curX = originX;
    let curY = originY;
    let dirX = start.dx;
    let dirY = start.dy;
    let lastMirrorId: string | null = null;

    for (let bounce = 0; bounce <= MAX_LASER_BOUNCES; bounce++) {
      // Boundary exit via parametric clip (the origin always stays inside)
      let tMax = Infinity;
      if (dirX > 1e-9) tMax = Math.min(tMax, (arenaWidth - curX) / dirX);
      else if (dirX < -1e-9) tMax = Math.min(tMax, -curX / dirX);
      if (dirY > 1e-9) tMax = Math.min(tMax, (arenaHeight - curY) / dirY);
      else if (dirY < -1e-9) tMax = Math.min(tMax, -curY / dirY);
      if (!Number.isFinite(tMax) || tMax < 0) tMax = 0;

      const farX = curX + dirX * tMax;
      const farY = curY + dirY * tMax;

      // Nearest hit among solid occluders and mirror surfaces
      let bestDist = tMax;
      let hitX = farX;
      let hitY = farY;
      let hitMirror: MirrorObstacle | null = null;

      for (const target of obstacles) {
        if (target.id === emitter.id) continue;
        if (target.type === 'mirror') {
          if (lastMirrorId && target.id === lastMirrorId) continue;
          const seg = mirrorSurfaceSegment(target as MirrorObstacle);
          const inter = getLineIntersection(curX, curY, farX, farY, seg.x1, seg.y1, seg.x2, seg.y2);
          if (inter) {
            const d = Math.hypot(inter.x - curX, inter.y - curY);
            if (d > 1e-6 && d < bestDist) {
              bestDist = d;
              hitX = inter.x;
              hitY = inter.y;
              hitMirror = target as MirrorObstacle;
            }
          }
        } else if (occludesLaser(target)) {
          const hit = lineIntersectsRect(
            curX, curY, farX, farY,
            target.x, target.y, target.width, target.height
          );
          if (hit.hit && hit.dist > 1e-6 && hit.dist < bestDist) {
            bestDist = hit.dist;
            hitX = hit.x;
            hitY = hit.y;
            hitMirror = null;
          }
        }
      }

      segments.push({
        startX: curX,
        startY: curY,
        endX: hitX,
        endY: hitY,
        active: true
      });

      if (!hitMirror || bounce === MAX_LASER_BOUNCES) break;

      // Reflect about the mirror surface, then step off to avoid re-hitting.
      // Half-silvered mirrors: only beams arriving from the silvered side
      // reflect; beams from the glass side pass straight through.
      const rad = (hitMirror.angle * Math.PI) / 180;
      const nx = -Math.sin(rad);
      const ny = Math.cos(rad);
      const dot = dirX * nx + dirY * ny;
      // dot < 0 → beam came from the +normal ("front") side, dot > 0 → back side
      const arrivedFromFront = dot < 0;
      const side = hitMirror.reflectSide ?? 'both';
      const silveredSideMatch =
        side === 'both' ||
        (side === 'front' && arrivedFromFront) ||
        (side === 'back' && !arrivedFromFront);

      if (!silveredSideMatch) {
        // Pass through: keep direction, advance just past the surface line
        curX = hitX + dirX * 0.01;
        curY = hitY + dirY * 0.01;
        lastMirrorId = null;
        continue;
      }

      dirX -= 2 * dot * nx;
      dirY -= 2 * dot * ny;
      curX = hitX + dirX * 0.01;
      curY = hitY + dirY * 0.01;
      lastMirrorId = hitMirror.id;
    }
  }

  return segments;
}

/**
 * Physics update loop with sub-stepping.
 * Driven by the explicit status machine: playing / dying / won.
 */
export function updatePhysics(
  state: PhysicsWorldState,
  dt: number,
  arenaWidth: number,
  arenaHeight: number
): void {
  // Death explosion: let effects play, then respawn deterministically
  if (state.status === 'dying') {
    state.deathTimer += dt;
    updateEffects(state, dt);
    if (state.deathTimer >= DEATH_RESPAWN_DELAY) {
      respawnBall(state);
    }
    return;
  }

  // Won: freeze simulation, keep ambient effects alive
  if (state.status === 'won') {
    updateEffects(state, dt);
    state.ball.pulsePhase = (state.ball.pulsePhase + dt * 3) % (Math.PI * 2);
    return;
  }

  const params = state.params;
  const subSteps = 4;
  const subDt = dt / subSteps;

  state.elapsedTime += dt;
  if (state.portalCooldown > 0) {
    state.portalCooldown -= dt;
  }

  // Calculate gravity vector based on current gravity angle
  // 0 rad: gravity down (x: 0, y: +g)
  // PI/2: gravity right (x: +g, y: 0)
  // PI: gravity up (x: 0, y: -g)
  // 3*PI/2: gravity left (x: -g, y: 0)
  const g = GRAVITY_MAGNITUDE * params.gravityScale;
  const gx = g * Math.sin(state.gravityAngle);
  const gy = g * Math.cos(state.gravityAngle);

  const bctx: BehaviorContext = {
    subDt,
    gx,
    gy,
    arenaWidth,
    arenaHeight,
    phasing: false
  };

  // Laser beams depend only on emitter/solid geometry (not on the ball), so
  // compute them once per frame — but sweep the ball against them EVERY
  // SUBSTEP. A single end-of-frame check let fast balls fly straight through
  // lethal beams (25–75 px per frame vs an ~11 px hit threshold).
  state.lasers = computeLaserSegments(state.obstacles, arenaWidth, arenaHeight);

  const sweepLaserInterception = (): boolean => {
    for (const laser of state.lasers) {
      const ballDist = distToSegment(
        state.ball.x, state.ball.y,
        laser.startX, laser.startY,
        laser.endX, laser.endY
      );
      if (ballDist < state.ball.radius * 0.8) {
        triggerDeath(state);
        return true;
      }
    }
    return false;
  };

  for (let step = 0; step < subSteps; step++) {
    // 0. Linkage pre-pass (pressure plates -> linked gates)
    updateLinkages(state);

    // 1. Kinetic obstacles: sliding blocks ride their rails
    for (const obs of state.obstacles) {
      if (obs.type === 'sliding_block') {
        const sb = obs as SlidingBlockObstacle;
        sb.vx += (gx / sb.mass) * subDt;
        sb.vy += (gy / sb.mass) * subDt;
        sb.vx *= 0.96;
        sb.vy *= 0.96;

        sb.x += sb.vx * subDt;
        sb.y += sb.vy * subDt;

        // Clamp to allowed track
        if (sb.x < sb.minX) { sb.x = sb.minX; sb.vx = 0; }
        if (sb.x + sb.width > sb.maxX) { sb.x = sb.maxX - sb.width; sb.vx = 0; }
        if (sb.y < sb.minY) { sb.y = sb.minY; sb.vy = 0; }
        if (sb.y + sb.height > sb.maxY) { sb.y = sb.maxY - sb.height; sb.vy = 0; }
      }
    }

    // 2. Integrate Ball Velocity & Position
    state.ball.vx += gx * subDt;
    state.ball.vy += gy * subDt;

    // Apply friction
    state.ball.vx *= params.friction;
    state.ball.vy *= params.friction;

    // Cap velocity
    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    if (speed > params.maxVelocity) {
      state.ball.vx = (state.ball.vx / speed) * params.maxVelocity;
      state.ball.vy = (state.ball.vy / speed) * params.maxVelocity;
    }

    state.ball.x += state.ball.vx * subDt;
    state.ball.y += state.ball.vy * subDt;

    // 3. Arena Boundary Collisions
    if (state.ball.x - state.ball.radius < 0) {
      state.ball.x = state.ball.radius;
      if (state.ball.vx < 0) {
        sound.playImpact(Math.abs(state.ball.vx));
        state.ball.vx = -state.ball.vx * params.restitution;
      }
    } else if (state.ball.x + state.ball.radius > arenaWidth) {
      state.ball.x = arenaWidth - state.ball.radius;
      if (state.ball.vx > 0) {
        sound.playImpact(Math.abs(state.ball.vx));
        state.ball.vx = -state.ball.vx * params.restitution;
      }
    }

    if (state.ball.y - state.ball.radius < 0) {
      state.ball.y = state.ball.radius;
      if (state.ball.vy < 0) {
        sound.playImpact(Math.abs(state.ball.vy));
        state.ball.vy = -state.ball.vy * params.restitution;
      }
    } else if (state.ball.y + state.ball.radius > arenaHeight) {
      state.ball.y = arenaHeight - state.ball.radius;
      if (state.ball.vy > 0) {
        sound.playImpact(Math.abs(state.ball.vy));
        state.ball.vy = -state.ball.vy * params.restitution;
      }
    }

    // 4. Obstacle interactions via behavior registry
    bctx.phasing = false;
    for (const obs of state.obstacles) {
      if (state.status !== 'playing') return; // death may have been triggered mid-step
      const behavior = OBSTACLE_BEHAVIORS[obs.type];
      if (behavior) behavior(state, obs, bctx);
    }
    state.ball.isPhasing = bctx.phasing;

    // 5. Laser interception sweep (substep-granular, see note above)
    if (sweepLaserInterception()) return;
  }

  // 6. Check Star Collection
  for (const star of state.stars) {
    if (!star.collected) {
      const dist = Math.hypot(state.ball.x - star.x, state.ball.y - star.y);
      if (dist < state.ball.radius + star.radius + 4) {
        star.collected = true;
        const count = state.stars.filter(s => s.collected).length;
        sound.playStarCollect(count);

        // Spawn sparkling burst
        spawnStarParticles(state, star.x, star.y);

        state.ripples.push({
          x: star.x,
          y: star.y,
          radius: star.radius,
          maxRadius: 50,
          alpha: 1,
          color: 'rgba(251, 191, 36, 0.9)',
          lineWidth: 2
        });

        // Check if all required stars collected to unlock exit
        if (count >= state.exit.requiredStars) {
          state.exit.unlocked = true;
        }
      }
    }
  }

  // 7. Check Exit Monolith
  if (state.exit.unlocked) {
    const exitDist = Math.hypot(state.ball.x - state.exit.x, state.ball.y - state.exit.y);
    if (exitDist < state.ball.radius + state.exit.radius - 2) {
      state.isWon = true;
      state.status = 'won';
      sound.playVictory();
      state.ripples.push({
        x: state.exit.x,
        y: state.exit.y,
        radius: 10,
        maxRadius: 90,
        alpha: 1,
        color: 'rgba(56, 189, 248, 1)',
        lineWidth: 3
      });
      return;
    }
  }

  // 8. Update Trail
  state.ball.trail.push({ x: state.ball.x, y: state.ball.y, alpha: 0.6 });
  if (state.ball.trail.length > PERF.trailLength) {
    state.ball.trail.shift();
  }
  for (const t of state.ball.trail) {
    t.alpha *= 0.85;
  }

  // 9. Update Particles & Ripples
  updateEffects(state, dt);

  state.ball.pulsePhase = (state.ball.pulsePhase + dt * 3) % (Math.PI * 2);
}

function updateEffects(state: PhysicsWorldState, dt: number) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const r = state.ripples[i];
    r.radius += (r.maxRadius - r.radius) * 7 * dt;
    r.alpha -= 1.8 * dt;
    if (r.alpha <= 0 || r.radius >= r.maxRadius - 2) {
      state.ripples.splice(i, 1);
    }
  }

  // Camera shake decay
  if (state.shake.duration > 0) {
    state.shake.elapsed += dt;
    if (state.shake.elapsed >= state.shake.duration) {
      state.shake.magnitude = 0;
      state.shake.duration = 0;
      state.shake.elapsed = 0;
    }
  }
}

/** Deterministic respawn owned by the physics loop (no external timers). */
function respawnBall(state: PhysicsWorldState) {
  state.ball = createInitialBall(state.ballStart);
  state.status = 'playing';
  state.deathTimer = 0;
}

/**
 * Particle spawn funnel. Once the perf-tier cap is live, new spawns are
 * dropped (oldest sparks are the ones already on screen — keep them).
 */
function pushParticle(state: PhysicsWorldState, p: Particle): void {
  if (state.particles.length >= PERF.particleCap) return;
  state.particles.push(p);
}

function spawnImpactParticles(state: PhysicsWorldState, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    pushParticle(state, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.25,
      maxLife: 0.25,
      size: 2,
      color: 'rgba(255, 255, 255, 0.6)',
      shape: 'square'
    });
  }
}

function spawnStarParticles(state: PhysicsWorldState, x: number, y: number) {
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const speed = 70 + Math.random() * 90;
    pushParticle(state, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.3,
      maxLife: 0.9,
      size: 3,
      color: 'rgba(251, 191, 36, 0.95)',
      shape: 'square'
    });
  }
}

function spawnDebrisParticles(
  state: PhysicsWorldState,
  fw: FragileWallObstacle,
  count: number,
  big: boolean
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (big ? 90 : 40) + Math.random() * (big ? 170 : 80);
    pushParticle(state, {
      x: fw.x + Math.random() * fw.width,
      y: fw.y + Math.random() * fw.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: (big ? 0.5 : 0.3) + Math.random() * 0.3,
      maxLife: big ? 0.8 : 0.6,
      size: big ? 3.5 : 2.5,
      color: big ? 'rgba(251, 191, 36, 0.95)' : 'rgba(251, 191, 36, 0.7)',
      shape: 'square'
    });
  }
}

export function triggerDeath(state: PhysicsWorldState) {
  if (state.status !== 'playing') return;
  state.status = 'dying';
  state.deathTimer = 0;
  state.ball.dead = true;
  sound.playLaserHit();
  addShake(state, 7, 0.4);

  // Geometric explosion
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const speed = 100 + Math.random() * 140;
    pushParticle(state, {
      x: state.ball.x,
      y: state.ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7,
      maxLife: 0.7,
      size: 3.5,
      color: 'rgba(239, 68, 68, 0.9)',
      shape: 'line',
      angle
    });
  }

  state.ripples.push({
    x: state.ball.x,
    y: state.ball.y,
    radius: 10,
    maxRadius: 60,
    alpha: 1,
    color: 'rgba(239, 68, 68, 0.9)',
    lineWidth: 3
  });
}
