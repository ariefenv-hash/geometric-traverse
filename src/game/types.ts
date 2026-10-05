export type ThemeMode = 'dark' | 'light';

export type ControlMode = 'compass' | 'gyro' | 'swipe' | 'buttons';

/**
 * Explicit game state machine.
 * playing: normal simulation
 * dying: death explosion playing, respawn timer running (handled inside physics loop)
 * won: level complete, only effects update
 */
export type GameStatus = 'playing' | 'dying' | 'won';

/**
 * Runtime-tunable physics constants.
 * Resolved per-level from LevelConfig.physics with sandbox overrides on top,
 * then stored in PhysicsWorldState so the engine never reads hard-coded globals.
 */
export interface PhysicsParams {
  gravityScale: number;  // multiplier on base GRAVITY_MAGNITUDE
  restitution: number;   // bounciness 0..1
  friction: number;      // per-substep velocity damping
  maxVelocity: number;   // px/s cap
}

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
  | 'hazard'
  | 'bumper'
  | 'one_way_gate'
  | 'fragile_wall'
  | 'pressure_plate'
  | 'linked_gate'
  | 'mirror';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

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
  /** Free-angle beam direction in degrees (0 = right, 90 = down, clockwise).
   *  Overrides `direction` when defined; kept optional for legacy levels. */
  angle?: number;
}

/**
 * Reflective light element: bends laser beams according to the angle of incidence.
 * The reflective surface is a line through the box center at `angle` degrees
 * (0 = horizontal surface, 90 = vertical). Non-solid to the ball — light only.
 *
 * `reflectSide` turns the mirror into a half-silvered (one-way) mirror:
 * the surface normal is n = (-sin(angle), cos(angle)); beams arriving from
 * the +n side ("front") reflect when reflectSide is 'front', beams from the
 * -n side ("back") reflect when it is 'back'. Beams from the non-silvered
 * side pass straight through. Default 'both' reflects from either side.
 */
export interface MirrorObstacle extends BaseObstacle {
  type: 'mirror';
  angle: number;
  reflectSide?: 'both' | 'front' | 'back';
}

export interface AntiGravityObstacle extends BaseObstacle {
  type: 'anti_gravity';
  force: number;
  direction?: 'up' | 'down' | 'left' | 'right'; // If undefined, directly opposes global gravity
}

export interface HazardObstacle extends BaseObstacle {
  type: 'hazard';
}

/** Directional launch pad: flings the ball along `direction` at `strength` px/s on contact. */
export interface BumperObstacle extends BaseObstacle {
  type: 'bumper';
  direction: CardinalDirection; // fixed in arena space, unaffected by gravity rotation
  strength: number;             // exit speed along direction (px/s)
}

/**
 * Valve gate: solid unless the ball is moving along `passDirection`
 * faster than `tolerance` px/s. Classic check-point / current mechanic.
 */
export interface OneWayGateObstacle extends BaseObstacle {
  type: 'one_way_gate';
  passDirection: CardinalDirection;
  tolerance?: number; // min along-axis speed (px/s) to permeate, default 30
}

/**
 * Breakable wall: each impact above `impactThreshold` px/s removes 1 hp.
 * At hp <= 0 the wall shatters (broken = true) and stops colliding / occluding.
 */
export interface FragileWallObstacle extends BaseObstacle {
  type: 'fragile_wall';
  hp: number;
  maxHp: number;
  impactThreshold?: number; // default 220 px/s
  broken?: boolean;
  color?: string;
}

/**
 * Sensor pad: `pressed` while the ball overlaps (or latched forever after first
 * touch when `latch` is set). Drives linked gates that share its `linkId`.
 */
export interface PressurePlateObstacle extends BaseObstacle {
  type: 'pressure_plate';
  linkId: string;   // id of the LinkedGateObstacle this plate controls
  latch?: boolean;  // once pressed, stays pressed
  pressed?: boolean;
}

/** Door controlled by pressure plates: solid while closed, passable while open. */
export interface LinkedGateObstacle extends BaseObstacle {
  type: 'linked_gate';
  open?: boolean;
  color?: string;
}

export type AnyObstacle = 
  | WallObstacle 
  | PhaseBarrierObstacle 
  | SlidingBlockObstacle 
  | PortalObstacle 
  | LaserEmitterObstacle 
  | AntiGravityObstacle 
  | HazardObstacle
  | BumperObstacle
  | OneWayGateObstacle
  | FragileWallObstacle
  | PressurePlateObstacle
  | LinkedGateObstacle
  | MirrorObstacle;

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
  physics?: Partial<PhysicsParams>; // per-level physics overrides
  /** Beginner coaching hints rendered in a collapsible on-level card (early campaign levels). */
  hints?: string[];
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
  status: GameStatus;      // explicit state machine driving simulation & respawn
  deathTimer: number;      // seconds since death explosion started
  ballStart: Vector2D;     // respawn anchor, owned by the world state
  params: PhysicsParams;   // resolved runtime physics parameters
  /** Camera shake: decays over time, GameCanvas samples it for draw offset. */
  shake: CameraShake;
}

/** Decaying impact camera shake (magnitude in px, duration in seconds). */
export interface CameraShake {
  magnitude: number;
  duration: number;
  elapsed: number;
}
