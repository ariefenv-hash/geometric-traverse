import {
  AnyObstacle,
  LevelConfig,
  ObstacleType,
  StarItem,
  Vector2D
} from './types';

// ---------------------------------------------------------------------------
// Editor draft model — pure, UI-free, headless-testable.
// A EditorDraft is the editable source of truth inside the level editor.
// It converts to/from LevelConfig for playtest / save / share codes.
// ---------------------------------------------------------------------------

export const EDITOR_GRID = 40;   // visual grid pitch (matches renderer grid)
export const EDITOR_SNAP = 20;   // placement / drag snapping
export const MIN_ARENA = 240;
export const MAX_ARENA = 2000;
export const MIN_OBSTACLE_SIZE = 16;
export const MAX_STARS = 8;
export const DEFAULT_RESTITUTION = 0.45;

/** User levels live in a dedicated numeric id space so they never collide
 *  with official level ids (1..N) nor hijack progress unlock chains. */
export const USER_LEVEL_ID_BASE = 100000;

export interface EditorDraft {
  libraryId: string | null;  // set once saved into the user library
  numericId: number;         // LevelConfig.id (user levels: >= USER_LEVEL_ID_BASE)
  code: string;              // 'UG-01' style chip
  name: string;              // library display name
  title: string;
  subtitle: string;
  poem: string;
  instruction: string;
  arenaWidth: number;
  arenaHeight: number;
  ballStart: Vector2D;
  exit: { x: number; y: number; radius: number; requiredStars: number };
  stars: StarItem[];
  obstacles: AnyObstacle[];
  parRotations: number;
  parTime: number;
  physics: { gravityScale: number; restitution: number };
  nextId: number;            // monotonically increasing obstacle id seed
}

export interface DraftIssues {
  errors: string[];
  warnings: string[];
}

export function clampArenaValue(v: number): number {
  if (!Number.isFinite(v)) return 800;
  return Math.min(MAX_ARENA, Math.max(MIN_ARENA, Math.round(v / EDITOR_GRID) * EDITOR_GRID));
}

export function snap(v: number, step = EDITOR_SNAP): number {
  return Math.round(v / step) * step;
}

/** User level share/lobby code derived from its numeric id. */
export function userLevelCode(numericId: number): string {
  return `UG-${String(Math.max(1, numericId - USER_LEVEL_ID_BASE + 1)).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const OBSTACLE_PREFIX: Record<ObstacleType, string> = {
  wall: 'w',
  phase_barrier: 'pb',
  sliding_block: 'sb',
  portal: 'pt',
  laser_emitter: 'le',
  anti_gravity: 'ag',
  hazard: 'hz',
  bumper: 'bp',
  one_way_gate: 'og',
  fragile_wall: 'fw',
  pressure_plate: 'pp',
  linked_gate: 'lg',
  mirror: 'mr'
};

export function createDefaultObstacle(
  type: ObstacleType,
  arenaWidth: number,
  arenaHeight: number,
  ax: number,
  ay: number,
  seq: number
): AnyObstacle {
  const id = `${OBSTACLE_PREFIX[type]}${seq}`;
  const place = (w: number, h: number) => ({
    id,
    x: Math.min(Math.max(0, snap(ax - w / 2)), Math.max(0, arenaWidth - w)),
    y: Math.min(Math.max(0, snap(ay - h / 2)), Math.max(0, arenaHeight - h)),
    width: w,
    height: h
  });

  switch (type) {
    case 'wall':
      return { ...place(120, 20), type };
    case 'phase_barrier':
      return { ...place(120, 20), type, solidOrientations: [0, 2] };
    case 'sliding_block': {
      const base = place(100, 80);
      return {
        ...base,
        type,
        vx: 0,
        vy: 0,
        minX: Math.max(0, base.x - 160),
        maxX: Math.min(arenaWidth - base.width, base.x + 160),
        minY: base.y,
        maxY: base.y,
        mass: 3
      };
    }
    case 'portal':
      return { ...place(40, 40), type, radius: 24, targetPortalId: '' };
    case 'laser_emitter':
      return { ...place(24, 24), type, direction: 'right', active: true };
    case 'anti_gravity':
      return { ...place(160, 120), type, force: 2.2 };
    case 'hazard':
      return { ...place(80, 40), type };
    case 'bumper':
      return { ...place(100, 20), type, direction: 'up', strength: 900 };
    case 'one_way_gate':
      return { ...place(100, 20), type, passDirection: 'down', tolerance: 30 };
    case 'fragile_wall':
      return { ...place(120, 20), type, hp: 2, maxHp: 2, impactThreshold: 220 };
    case 'pressure_plate':
      return { ...place(80, 20), type, linkId: '', latch: false };
    case 'linked_gate':
      return { ...place(20, 100), type, open: false };
    case 'mirror':
      return { ...place(120, 24), type, angle: 0, reflectSide: 'both' };
  }
}

export function createEmptyDraft(): EditorDraft {
  return {
    libraryId: null,
    numericId: USER_LEVEL_ID_BASE,
    code: 'UG-??',
    name: '未命名关卡',
    title: '无名几何',
    subtitle: 'User Level',
    poem: '',
    instruction: '旋转重力，收集星核并抵达归元之门。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 120 },
    exit: { x: 400, y: 720, radius: 24, requiredStars: 3 },
    stars: [
      { id: 's1', x: 120, y: 400, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 680, y: 400, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 400, y: 400, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [],
    parRotations: 4,
    parTime: 20,
    physics: { gravityScale: 1, restitution: DEFAULT_RESTITUTION },
    nextId: 1
  };
}

export function draftFromLevelConfig(cfg: LevelConfig, name?: string): EditorDraft {
  return {
    libraryId: null,
    numericId: cfg.id,
    code: cfg.code,
    name: name ?? cfg.title,
    title: cfg.title,
    subtitle: cfg.subtitle,
    poem: cfg.poem ?? '',
    instruction: cfg.instruction,
    arenaWidth: cfg.arenaWidth,
    arenaHeight: cfg.arenaHeight,
    ballStart: { ...cfg.ballStart },
    exit: {
      x: cfg.exit.x,
      y: cfg.exit.y,
      radius: cfg.exit.radius,
      requiredStars: cfg.exit.requiredStars
    },
    stars: cfg.stars.map(s => ({ ...s, collected: false })),
    obstacles: cfg.obstacles.map(o => ({ ...(o as object) }) as AnyObstacle),
    parRotations: cfg.parRotations,
    parTime: cfg.parTime,
    physics: {
      gravityScale: cfg.physics?.gravityScale ?? 1,
      restitution: cfg.physics?.restitution ?? DEFAULT_RESTITUTION
    },
    nextId: cfg.obstacles.length + 1
  };
}

/** Strip runtime mutable state so saved levels always restart clean. */
function cloneObstacle(o: AnyObstacle): AnyObstacle {
  const c: Record<string, unknown> = { ...(o as object) };
  if (c.type === 'fragile_wall') delete c.broken;
  if (c.type === 'pressure_plate') delete c.pressed;
  if (c.type === 'linked_gate') delete c.open;
  return c as unknown as AnyObstacle;
}

export function draftToLevelConfig(draft: EditorDraft): LevelConfig {
  return {
    id: draft.numericId,
    code: draft.code,
    title: draft.title.trim() || draft.name || '无名几何',
    subtitle: draft.subtitle.trim() || 'User Level',
    poem: draft.poem.trim() ? draft.poem.trim() : undefined,
    instruction: draft.instruction,
    arenaWidth: Math.round(draft.arenaWidth),
    arenaHeight: Math.round(draft.arenaHeight),
    ballStart: { ...draft.ballStart },
    exit: {
      x: draft.exit.x,
      y: draft.exit.y,
      radius: draft.exit.radius,
      unlocked: false,
      requiredStars: draft.exit.requiredStars
    },
    stars: draft.stars.map((s, i) => ({
      id: s.id || `s${i + 1}`,
      x: s.x,
      y: s.y,
      radius: s.radius,
      collected: false,
      pulsePhase: i
    })),
    obstacles: draft.obstacles.map(cloneObstacle),
    parRotations: draft.parRotations,
    parTime: draft.parTime,
    physics: {
      gravityScale: draft.physics.gravityScale,
      restitution: draft.physics.restitution
    }
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SOLID_RECT_TYPES = new Set<ObstacleType>([
  'wall',
  'fragile_wall',
  'one_way_gate',
  'linked_gate',
  'sliding_block',
  'phase_barrier'
]);

function rectContains(o: AnyObstacle, px: number, py: number): boolean {
  return px >= o.x && px <= o.x + o.width && py >= o.y && py <= o.y + o.height;
}

export function validateDraft(draft: EditorDraft): DraftIssues {
  const errors: string[] = [];
  const warnings: string[] = [];
  const W = draft.arenaWidth;
  const H = draft.arenaHeight;

  // Ball start / exit bounds
  if (
    draft.ballStart.x < 14 || draft.ballStart.x > W - 14 ||
    draft.ballStart.y < 14 || draft.ballStart.y > H - 14
  ) {
    errors.push('球起点位于竞技场边界之外');
  }
  if (
    draft.exit.x < draft.exit.radius || draft.exit.x > W - draft.exit.radius ||
    draft.exit.y < draft.exit.radius || draft.exit.y > H - draft.exit.radius
  ) {
    errors.push('归元之门位于竞技场边界之外');
  }

  // Stars
  if (draft.stars.length === 0) {
    errors.push('至少需要放置 1 颗星核');
  }
  if (draft.exit.requiredStars < 1) {
    errors.push('开门所需星核数至少为 1');
  }
  if (draft.exit.requiredStars > draft.stars.length) {
    errors.push(`开门需要 ${draft.exit.requiredStars} 颗星核，但场上只有 ${draft.stars.length} 颗`);
  }

  // Obstacle bounds
  for (const o of draft.obstacles) {
    if (o.x + o.width < 0 || o.x > W || o.y + o.height < 0 || o.y > H) {
      errors.push(`机关 ${o.id} 完全位于竞技场之外`);
    }
  }

  // Portal wiring
  const portals = draft.obstacles.filter(o => o.type === 'portal');
  const portalIds = new Set(portals.map(p => p.id));
  for (const p of portals) {
    if (p.type !== 'portal') continue;
    if (!p.targetPortalId) {
      errors.push(`折跃门 ${p.id} 尚未设置目标折跃门`);
    } else if (p.targetPortalId === p.id) {
      errors.push(`折跃门 ${p.id} 不能以自己为目标`);
    } else if (!portalIds.has(p.targetPortalId)) {
      errors.push(`折跃门 ${p.id} 的目标 ${p.targetPortalId} 不存在`);
    }
  }
  const targetCounts = new Map<string, number>();
  for (const p of portals) {
    if (p.type !== 'portal' || !p.targetPortalId) continue;
    targetCounts.set(p.targetPortalId, (targetCounts.get(p.targetPortalId) || 0) + 1);
  }
  for (const [tid, n] of targetCounts) {
    if (n > 1) warnings.push(`${n} 个折跃门共同指向 ${tid}，传送将叠加到同一出口`);
  }

  // Plate / gate wiring
  const plates = draft.obstacles.filter(o => o.type === 'pressure_plate');
  const gates = draft.obstacles.filter(o => o.type === 'linked_gate');
  const gateIds = new Set(gates.map(g => g.id));
  for (const plate of plates) {
    if (plate.type !== 'pressure_plate') continue;
    if (!plate.linkId) {
      errors.push(`压力板 ${plate.id} 尚未关联任何联动闸门`);
    } else if (!gateIds.has(plate.linkId)) {
      errors.push(`压力板 ${plate.id} 关联的闸门 ${plate.linkId} 不存在`);
    }
  }
  for (const gate of gates) {
    const referenced = plates.some(p => p.type === 'pressure_plate' && p.linkId === gate.id);
    if (!referenced) {
      warnings.push(`联动闸门 ${gate.id} 没有任何压力板控制，它将永远关闭`);
    }
  }

  // Soft geometric hints
  for (const o of draft.obstacles) {
    if (SOLID_RECT_TYPES.has(o.type) && rectContains(o, draft.ballStart.x, draft.ballStart.y)) {
      warnings.push(`球起点与实体机关 ${o.id} 重叠，小球可能开局即卡死`);
    }
    if (o.type === 'hazard' && rectContains(o, draft.ballStart.x, draft.ballStart.y)) {
      errors.push(`球起点位于湮灭场 ${o.id} 内，开局即刻死亡`);
    }
  }

  if (!draft.instruction.trim()) {
    warnings.push('关卡说明为空，玩家进入关卡时看不到引导文案');
  }

  // Reachability heuristic (free-space flood fill upper bound)
  if (draft.stars.length > 0 && draft.exit.requiredStars >= 1) {
    const reach = checkLevelReachability(draft);
    if (!reach.gateReachable) {
      errors.push('启发式检测：球起点与归元之门被实体完全隔绝，关卡无法通关');
    } else if (reach.fragileWallNeeded) {
      warnings.push('启发式检测：路径上存在必须先击碎的碎裂墙，请确认球有足够的加速空间');
    }
    if (reach.reachableStarCount < draft.exit.requiredStars) {
      errors.push(
        `启发式检测：仅 ${reach.reachableStarCount} 颗星核可达，少于开门所需的 ${draft.exit.requiredStars} 颗`
      );
    }
    for (const id of reach.unreachableStarIds) {
      warnings.push(`星核 ${id} 似乎被实体完全围困，无法收集`);
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Reachability heuristic — coarse flood fill over free space.
// The ball obeys gravity and momentum, so true solvability is undecidable
// here; instead we verify the *upper bound*: if a target cell cannot be
// reached even with free 4-directional movement (plus portal teleports),
// the level is definitely unplayable. Fragile walls get a second pass as
// open space (they can be smashed) and only produce a warning then.
// ---------------------------------------------------------------------------

const REACH_CELL = 10; // flood fill cell size (px); below MIN_OBSTACLE_SIZE

export interface ReachabilityReport {
  gateReachable: boolean;
  reachableStarCount: number;
  unreachableStarIds: string[];
  /** True when pass 1 failed but breaking fragile walls unlocks the path. */
  fragileWallNeeded: boolean;
}

type BlockKind = 0 | 1 | 2; // 0 free, 1 hard solid, 2 fragile (soft) solid

function markRect(
  grid: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: BlockKind
) {
  const c0 = Math.max(0, Math.floor(x / REACH_CELL));
  const c1 = Math.min(cols - 1, Math.floor((x + w) / REACH_CELL));
  const r0 = Math.max(0, Math.floor(y / REACH_CELL));
  const r1 = Math.min(rows - 1, Math.floor((y + h) / REACH_CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      // Center-sample: a cell is blocked when its center falls inside the rect
      const cx = c * REACH_CELL + REACH_CELL / 2;
      const cy = r * REACH_CELL + REACH_CELL / 2;
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
        grid[r * cols + c] = kind;
      }
    }
  }
}

export function checkLevelReachability(draft: EditorDraft): ReachabilityReport {
  const report: ReachabilityReport = {
    gateReachable: false,
    reachableStarCount: 0,
    unreachableStarIds: [],
    fragileWallNeeded: false
  };
  const cols = Math.max(1, Math.ceil(draft.arenaWidth / REACH_CELL));
  const rows = Math.max(1, Math.ceil(draft.arenaHeight / REACH_CELL));
  const cellOf = (px: number, py: number) =>
    Math.min(cols - 1, Math.max(0, Math.floor(px / REACH_CELL))) +
    Math.min(rows - 1, Math.max(0, Math.floor(py / REACH_CELL))) * cols;

  // Build occupancy grid (hard solids only; fragile handled via second pass)
  const buildGrid = (includeFragile: boolean) => {
    const grid = new Uint8Array(cols * rows);
    for (const o of draft.obstacles) {
      // NOTE: sliding_block is treated as open space — it patrols its rail,
      // so its snapshot position says nothing about permanent blockage.
      if (o.type === 'wall') {
        markRect(grid, cols, rows, o.x, o.y, o.width, o.height, 1);
      } else if (o.type === 'fragile_wall' && includeFragile) {
        markRect(grid, cols, rows, o.x, o.y, o.width, o.height, 1);
      } else if (o.type === 'linked_gate') {
        const controlled = draft.obstacles.some(
          p => p.type === 'pressure_plate' && (p as { linkId?: string }).linkId === o.id
        );
        if (!controlled) markRect(grid, cols, rows, o.x, o.y, o.width, o.height, 1);
      }
    }
    return grid;
  };

  // Portal teleport adjacency: portal id → cells inside its rect
  const portals = draft.obstacles.filter(o => o.type === 'portal') as import('./types').PortalObstacle[];
  const portalCells = new Map<string, number[]>();
  for (const p of portals) {
    const cells: number[] = [];
    const c0 = Math.max(0, Math.floor(p.x / REACH_CELL));
    const c1 = Math.min(cols - 1, Math.floor((p.x + p.width) / REACH_CELL));
    const r0 = Math.max(0, Math.floor(p.y / REACH_CELL));
    const r1 = Math.min(rows - 1, Math.floor((p.y + p.height) / REACH_CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) cells.push(r * cols + c);
    }
    portalCells.set(p.id, cells);
  }

  const floodFill = (grid: Uint8Array) => {
    const seen = new Uint8Array(cols * rows);
    const queue: number[] = [cellOf(draft.ballStart.x, draft.ballStart.y)];
    seen[queue[0]] = 1;
    const targets = new Set<number>([cellOf(draft.exit.x, draft.exit.y)]);
    for (const s of draft.stars) targets.add(cellOf(s.x, s.y));

    const hitTargets = new Set<number>();
    while (queue.length > 0) {
      const cur = queue.pop()!;
      if (targets.has(cur)) hitTargets.add(cur);
      // Portal shortcut: stepping onto a portal cell also opens its target
      for (const p of portals) {
        if (!p.targetPortalId) continue;
        const own = portalCells.get(p.id);
        if (own && own.includes(cur)) {
          const dest = portalCells.get(p.targetPortalId);
          if (dest) {
            for (const dc of dest) {
              if (!seen[dc] && grid[dc] === 0) {
                seen[dc] = 1;
                queue.push(dc);
              }
            }
          }
        }
      }
      const c = cur % cols;
      const r = (cur - c) / cols;
      const neighbors = [
        c > 0 ? cur - 1 : -1,
        c < cols - 1 ? cur + 1 : -1,
        r > 0 ? cur - cols : -1,
        r < rows - 1 ? cur + cols : -1
      ];
      for (const n of neighbors) {
        if (n >= 0 && !seen[n] && grid[n] === 0) {
          seen[n] = 1;
          queue.push(n);
        }
      }
    }
    return hitTargets;
  };

  const strictGrid = buildGrid(true);
  const startCell = cellOf(draft.ballStart.x, draft.ballStart.y);
  if (strictGrid[startCell] === 1) {
    // Ball spawns embedded in a solid: nothing is reachable (validator
    // surfaces a dedicated overlap error, so keep the report quiet here).
    report.unreachableStarIds = draft.stars.map(s => s.id);
    return report;
  }

  // Pass 1: fragile walls block
  const strictHits = floodFill(strictGrid);
  const exitCell = cellOf(draft.exit.x, draft.exit.y);
  let gate = strictHits.has(exitCell);
  let unreachable = draft.stars.filter(s => !strictHits.has(cellOf(s.x, s.y)));
  let fragileNeeded = false;

  // Pass 2 (only when something is unreachable): fragile walls count as open
  if (!gate || unreachable.length > 0) {
    const lenientHits = floodFill(buildGrid(false));
    if (!gate && lenientHits.has(exitCell)) {
      gate = true;
      fragileNeeded = true;
    }
    const lenientUnreachable = draft.stars.filter(s => !lenientHits.has(cellOf(s.x, s.y)));
    if (lenientUnreachable.length < unreachable.length) {
      unreachable = lenientUnreachable;
      fragileNeeded = true;
    }
  }

  report.gateReachable = gate;
  report.unreachableStarIds = unreachable.map(s => s.id);
  report.reachableStarCount = draft.stars.length - unreachable.length;
  report.fragileWallNeeded = fragileNeeded;

  return report;
}

/** Unique star id helper for the editor. */
export function uniqueStarId(stars: StarItem[]): string {
  let n = stars.length + 1;
  const taken = new Set(stars.map(s => s.id));
  while (taken.has(`s${n}`)) n++;
  return `s${n}`;
}

/** Cheap re-export so UI layers can talk about directions without extra imports. */
export type DraftDirection = 'up' | 'down' | 'left' | 'right';
