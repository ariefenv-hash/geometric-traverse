export type ThemeMode = 'dark' | 'light';

export type ControlMode = 'compass' | 'gyro' | 'swipe' | 'buttons';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape?: 'square' | 'line' | 'circle';
  angle?: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth?: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
  isPhasing: boolean;
  dead: boolean;
  pulsePhase: number;
}

export type ObstacleType = 
  | 'wall' 
  | 'phase_barrier' 
  | 'sliding_block' 
  | 'portal' 
  | 'laser_emitter' 
  | 'anti_gravity' 
  | 'hazard';

export interface BaseObstacle {
  id: string;
  type: ObstacleType;
  x: number; // Center or Top-Left depending on shape
  y: number;
  width: number;
  height: number;
}

export interface WallObstacle extends BaseObstacle {
  type: 'wall';
  color?: string;
}

/**
 * Phase Barrier is solid in certain gravity angles (e.g. 0° and 180°),
 * but permeable (transparent wireframe) in other angles (e.g. 90° and 270°).
 */
export interface PhaseBarrierObstacle extends BaseObstacle {
  type: 'phase_barrier';
  solidOrientations: number[]; // 0: down, 1: right, 2: up, 3: left (multiples of 90 deg)
}

export interface SlidingBlockObstacle extends BaseObstacle {
  type: 'sliding_block';
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  mass: number;
}

export interface PortalObstacle extends BaseObstacle {
  type: 'portal';
  targetPortalId: string;
  radius: number;
  outAngleOffset?: number; // radians offset for momentum redirection
}

export interface LaserEmitterObstacle extends BaseObstacle {
  type: 'laser_emitter';
  direction: 'up' | 'down' | 'left' | 'right';
  active: boolean;
}

export interface AntiGravityObstacle extends BaseObstacle {
  type: 'anti_gravity';
  force: number;
  direction?: 'up' | 'down' | 'left' | 'right'; // If undefined, directly opposes global gravity
}

export interface HazardObstacle extends BaseObstacle {
  type: 'hazard';
}

export type AnyObstacle = 
  | WallObstacle 
  | PhaseBarrierObstacle 
  | SlidingBlockObstacle 
  | PortalObstacle 
  | LaserEmitterObstacle 
  | AntiGravityObstacle 
  | HazardObstacle;

export interface StarItem {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulsePhase: number;
}

export interface ExitGate {
  x: number;
  y: number;
  radius: number;
  unlocked: boolean;
  requiredStars: number;
}

export interface LaserRay {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

export interface LevelConfig {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  instruction: string;
  poem?: string; // Artistic epigraph
  arenaWidth: number;
  arenaHeight: number;
  ballStart: Vector2D;
  exit: ExitGate;
  stars: StarItem[];
  obstacles: AnyObstacle[];
  parRotations: number;
  parTime: number; // seconds
}

export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  starsEarned: number;
  bestRotations: number;
  bestTime: number;
}

export interface PhysicsWorldState {
  ball: Ball;
  obstacles: AnyObstacle[];
  stars: StarItem[];
  exit: ExitGate;
  gravityAngle: number;
  targetAngle: number;
  particles: Particle[];
  ripples: RippleEffect[];
  lasers: LaserRay[];
  portalCooldown: number;
  movesCount: number;
  elapsedTime: number;
  isWon: boolean;
}
