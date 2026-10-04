import { sound } from './audio';
import {
  AnyObstacle,
  Ball,
  ExitGate,
  LaserEmitterObstacle,
  LaserRay,
  Particle,
  PhaseBarrierObstacle,
  PortalObstacle,
  RippleEffect,
  SlidingBlockObstacle,
  StarItem,
  Vector2D,
  PhysicsWorldState
} from './types';

export type { PhysicsWorldState };

// Constants
export const BALL_RADIUS = 14;
export const GRAVITY_MAGNITUDE = 1200; // px/s^2
export const MAX_VELOCITY = 1500;
export const RESTITUTION = 0.45; // Bounciness
export const FRICTION = 0.988; // Air/surface damping

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
 */
function resolveCircleBoxCollision(
  cx: number, cy: number, r: number,
  vx: number, vy: number,
  bx: number, by: number, bw: number, bh: number,
  restitution: number
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
      // Reflect velocity along normal
      newVx = (vx - (1 + restitution) * dot * nx) * FRICTION;
      newVy = (vy - (1 + restitution) * dot * ny) * FRICTION;
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

    return {
      x: cx + nx * (r + 1),
      y: cy + ny * (r + 1),
      vx: nx * Math.abs(vx) * restitution,
      vy: ny * Math.abs(vy) * restitution,
      hit: true,
      impactSpeed: Math.hypot(vx, vy)
    };
  }

  return { x: cx, y: cy, vx, vy, hit: false, impactSpeed: 0 };
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

/**
 * Physics update loop with sub-stepping
 */
export function updatePhysics(
  state: PhysicsWorldState,
  dt: number,
  arenaWidth: number,
  arenaHeight: number
): void {
  if (state.ball.dead || state.isWon) return;

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
  const gx = GRAVITY_MAGNITUDE * Math.sin(state.gravityAngle);
  const gy = GRAVITY_MAGNITUDE * Math.cos(state.gravityAngle);

  for (let step = 0; step < subSteps; step++) {
    // 1. Update sliding blocks
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

    // 2. Anti-gravity zones
    for (const obs of state.obstacles) {
      if (obs.type === 'anti_gravity') {
        if (
          state.ball.x >= obs.x &&
          state.ball.x <= obs.x + obs.width &&
          state.ball.y >= obs.y &&
          state.ball.y <= obs.y + obs.height
        ) {
          // Counteract current gravity and push upward relative to gravity
          const ag = obs as import('./types').AntiGravityObstacle;
          state.ball.vx -= gx * (ag.force || 1.8) * subDt;
          state.ball.vy -= gy * (ag.force || 1.8) * subDt;
          // Spawn upward particles
          if (Math.random() < 0.3) {
            state.particles.push({
              x: state.ball.x + (Math.random() - 0.5) * 16,
              y: state.ball.y + (Math.random() - 0.5) * 16,
              vx: -gx * 0.05 + (Math.random() - 0.5) * 40,
              vy: -gy * 0.05 + (Math.random() - 0.5) * 40,
              life: 0.3,
              maxLife: 0.3,
              size: 2.5,
              color: 'rgba(56, 189, 248, 0.7)',
              shape: 'circle'
            });
          }
        }
      }
    }

    // 3. Integrate Ball Velocity & Position
    state.ball.vx += gx * subDt;
    state.ball.vy += gy * subDt;

    // Apply friction
    state.ball.vx *= FRICTION;
    state.ball.vy *= FRICTION;

    // Cap velocity
    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    if (speed > MAX_VELOCITY) {
      state.ball.vx = (state.ball.vx / speed) * MAX_VELOCITY;
      state.ball.vy = (state.ball.vy / speed) * MAX_VELOCITY;
    }

    state.ball.x += state.ball.vx * subDt;
    state.ball.y += state.ball.vy * subDt;

    // 4. Arena Boundary Collisions
    if (state.ball.x - state.ball.radius < 0) {
      state.ball.x = state.ball.radius;
      if (state.ball.vx < 0) {
        sound.playImpact(Math.abs(state.ball.vx));
        state.ball.vx = -state.ball.vx * RESTITUTION;
      }
    } else if (state.ball.x + state.ball.radius > arenaWidth) {
      state.ball.x = arenaWidth - state.ball.radius;
      if (state.ball.vx > 0) {
        sound.playImpact(Math.abs(state.ball.vx));
        state.ball.vx = -state.ball.vx * RESTITUTION;
      }
    }

    if (state.ball.y - state.ball.radius < 0) {
      state.ball.y = state.ball.radius;
      if (state.ball.vy < 0) {
        sound.playImpact(Math.abs(state.ball.vy));
        state.ball.vy = -state.ball.vy * RESTITUTION;
      }
    } else if (state.ball.y + state.ball.radius > arenaHeight) {
      state.ball.y = arenaHeight - state.ball.radius;
      if (state.ball.vy > 0) {
        sound.playImpact(Math.abs(state.ball.vy));
        state.ball.vy = -state.ball.vy * RESTITUTION;
      }
    }

    // 5. Obstacle Collisions
    let currentPhasing = false;
    for (const obs of state.obstacles) {
      if (obs.type === 'wall') {
        const col = resolveCircleBoxCollision(
          state.ball.x, state.ball.y, state.ball.radius,
          state.ball.vx, state.ball.vy,
          obs.x, obs.y, obs.width, obs.height,
          RESTITUTION
        );
        if (col.hit) {
          state.ball.x = col.x;
          state.ball.y = col.y;
          state.ball.vx = col.vx;
          state.ball.vy = col.vy;
          if (col.impactSpeed > 25) {
            sound.playImpact(col.impactSpeed);
            spawnImpactParticles(state, state.ball.x, state.ball.y, 4);
          }
        }
      } else if (obs.type === 'sliding_block') {
        const sb = obs as SlidingBlockObstacle;
        const col = resolveCircleBoxCollision(
          state.ball.x, state.ball.y, state.ball.radius,
          state.ball.vx - sb.vx, state.ball.vy - sb.vy,
          sb.x, sb.y, sb.width, sb.height,
          RESTITUTION
        );
        if (col.hit) {
          state.ball.x = col.x;
          state.ball.y = col.y;
          state.ball.vx = col.vx + sb.vx;
          state.ball.vy = col.vy + sb.vy;
          // Transfer momentum to block
          sb.vx += (state.ball.vx * 0.15);
          sb.vy += (state.ball.vy * 0.15);
          if (col.impactSpeed > 30) {
            sound.playImpact(col.impactSpeed);
          }
        }
      } else if (obs.type === 'phase_barrier') {
        const pb = obs as PhaseBarrierObstacle;
        const isSolid = isPhaseBarrierSolid(pb, state.gravityAngle);

        if (isSolid) {
          const col = resolveCircleBoxCollision(
            state.ball.x, state.ball.y, state.ball.radius,
            state.ball.vx, state.ball.vy,
            pb.x, pb.y, pb.width, pb.height,
            RESTITUTION * 0.8
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
        } else {
          // Check if ball is inside or passing through permeable barrier
          const inBarrier = (
            state.ball.x >= pb.x - state.ball.radius &&
            state.ball.x <= pb.x + pb.width + state.ball.radius &&
            state.ball.y >= pb.y - state.ball.radius &&
            state.ball.y <= pb.y + pb.height + state.ball.radius
          );
          if (inBarrier) {
            currentPhasing = true;
            if (!state.ball.isPhasing) {
              sound.playPhasePass();
            }
          }
        }
      } else if (obs.type === 'portal' && state.portalCooldown <= 0) {
        const port = obs as PortalObstacle;
        const pCenterX = port.x + port.width / 2;
        const pCenterY = port.y + port.height / 2;
        const dist = Math.hypot(state.ball.x - pCenterX, state.ball.y - pCenterY);

        if (dist < (port.radius || 24)) {
          // Find target portal
          const target = state.obstacles.find(o => o.id === port.targetPortalId && o.type === 'portal') as PortalObstacle;
          if (target) {
            const targetCenterX = target.x + target.width / 2;
            const targetCenterY = target.y + target.height / 2;

            state.ball.x = targetCenterX;
            state.ball.y = targetCenterY;
            state.portalCooldown = 0.45; // prevent immediate re-entry

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
      } else if (obs.type === 'hazard') {
        const col = resolveCircleBoxCollision(
          state.ball.x, state.ball.y, state.ball.radius,
          state.ball.vx, state.ball.vy,
          obs.x, obs.y, obs.width, obs.height,
          0
        );
        if (col.hit) {
          triggerDeath(state);
          return;
        }
      }
    }
    state.ball.isPhasing = currentPhasing;
  }

  // 6. Recalculate Laser Beams and Check Interceptions
  state.lasers = [];
  for (const obs of state.obstacles) {
    if (obs.type === 'laser_emitter') {
      const emitter = obs as LaserEmitterObstacle;
      if (!emitter.active) continue;

      const originX = emitter.x + emitter.width / 2;
      const originY = emitter.y + emitter.height / 2;

      let rayEndX = originX;
      let rayEndY = originY;

      const maxRayDist = Math.max(arenaWidth, arenaHeight);

      if (emitter.direction === 'right') rayEndX = arenaWidth;
      else if (emitter.direction === 'left') rayEndX = 0;
      else if (emitter.direction === 'down') rayEndY = arenaHeight;
      else if (emitter.direction === 'up') rayEndY = 0;

      // Check occlusion by solid walls or sliding blocks
      let closestX = rayEndX;
      let closestY = rayEndY;
      let minRayDist = Math.hypot(rayEndX - originX, rayEndY - originY);

      for (const targetObs of state.obstacles) {
        if (targetObs.id === emitter.id) continue;
        if (targetObs.type === 'wall' || targetObs.type === 'sliding_block') {
          const hit = lineIntersectsRect(
            originX, originY, rayEndX, rayEndY,
            targetObs.x, targetObs.y, targetObs.width, targetObs.height
          );
          if (hit.hit && hit.dist < minRayDist) {
            minRayDist = hit.dist;
            closestX = hit.x;
            closestY = hit.y;
          }
        }
      }

      state.lasers.push({
        startX: originX,
        startY: originY,
        endX: closestX,
        endY: closestY,
        active: true
      });

      // Check if ball intersects this active laser beam
      const ballDist = distToSegment(
        state.ball.x, state.ball.y,
        originX, originY,
        closestX, closestY
      );

      if (ballDist < state.ball.radius * 0.8) {
        triggerDeath(state);
        return;
      }
    }
  }

  // 7. Check Star Collection
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

  // 8. Check Exit Monolith
  if (state.exit.unlocked) {
    const exitDist = Math.hypot(state.ball.x - state.exit.x, state.ball.y - state.exit.y);
    if (exitDist < state.ball.radius + state.exit.radius - 2) {
      state.isWon = true;
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

  // 9. Update Trail
  state.ball.trail.push({ x: state.ball.x, y: state.ball.y, alpha: 0.6 });
  if (state.ball.trail.length > 12) {
    state.ball.trail.shift();
  }
  for (const t of state.ball.trail) {
    t.alpha *= 0.85;
  }

  // 10. Update Particles & Ripples
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

  state.ball.pulsePhase = (state.ball.pulsePhase + dt * 3) % (Math.PI * 2);
}

function spawnImpactParticles(state: PhysicsWorldState, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    state.particles.push({
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
    state.particles.push({
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

export function triggerDeath(state: PhysicsWorldState) {
  state.ball.dead = true;
  sound.playLaserHit();

  // Geometric explosion
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const speed = 100 + Math.random() * 140;
    state.particles.push({
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
