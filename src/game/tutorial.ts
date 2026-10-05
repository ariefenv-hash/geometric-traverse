/**
 * Beginner onboarding system — pure logic, no UI.
 *
 * Three cooperating pieces:
 *  1. MECHANISM_TIPS  : per-obstacle-type beginner explanation (first-seen toasts)
 *  2. Seen-mechanics  : localStorage set of obstacle types the player already met,
 *                       so each mechanism is explained exactly once, in context.
 *  3. Tutorial flag   : "done" marker for the first-launch onboarding modal.
 */
import { AnyObstacle, LevelConfig, ObstacleType } from './types';

/** Beginner-friendly copy shown when a mechanism appears for the first time. */
export interface MechanismTipInfo {
  /** Display name of the mechanism. */
  name: string;
  /** 1-2 sentence beginner explanation, concrete and actionable. */
  detail: string;
  /** Tailwind text color class for the accent dot / border. */
  accent: string;
}

/** Every non-wall obstacle type gets exactly one contextual tip. */
export const MECHANISM_TIPS: Record<Exclude<ObstacleType, 'wall'>, MechanismTipInfo> = {
  phase_barrier: {
    name: '透光相界',
    detail: '虚线状态的相界可以自由穿过；但当重力方向与它"对齐"时会凝固成实体。卡住了就试试旋转 90°。',
    accent: 'text-purple-400'
  },
  sliding_block: {
    name: '动量滑块',
    detail: '悬空巨石会顺着重力沿导轨滑行。它既能挡路，也能架成桥，甚至替你挡住致命激光。',
    accent: 'text-rose-400'
  },
  portal: {
    name: '相位传送门',
    detail: '进入一扇门会从配对的另一扇射出，并保留飞行势头——出口朝向就是你的加速方向。',
    accent: 'text-indigo-400'
  },
  laser_emitter: {
    name: '激光发射器',
    detail: '触碰光束会立刻湮灭。先观察光路，再用滑块挡光或趁光束转向的间隙通过。',
    accent: 'text-red-400'
  },
  anti_gravity: {
    name: '引力涌泉',
    detail: '蓝色区域会持续把小球托向箭头方向。把它当作电梯：落进去，让涌泉带你升井。',
    accent: 'text-sky-400'
  },
  hazard: {
    name: '湮灭场',
    detail: '红色区域是致命的，掉进去会立刻湮灭。别紧张——小球会在起点自动重生，随时可以再来。',
    accent: 'text-orange-400'
  },
  bumper: {
    name: '弹力垫',
    detail: '翠色垫子会把小球沿箭头方向高速弹射。弹射方向固定在场地空间中，不随重力旋转而改变。',
    accent: 'text-emerald-400'
  },
  one_way_gate: {
    name: '单向涡流闸',
    detail: '只允许小球沿箭头方向通过，逆行时它会凝固成实体。漏摘的星核往往要绕另一条走廊回来。',
    accent: 'text-cyan-400'
  },
  fragile_wall: {
    name: '碎裂墙',
    detail: '赭色墙体积攒着裂纹。用足够快的速度反复撞击，耗尽耐久后它就会碎裂让路。',
    accent: 'text-amber-400'
  },
  pressure_plate: {
    name: '压力板',
    detail: '紫色感应板：小球压上时，同编号的联动闸门随之开启。带菱形纹的板子一经触发将永久锁存。',
    accent: 'text-violet-400'
  },
  linked_gate: {
    name: '联动闸门',
    detail: '由压力板驱动的能量门：压板时化作虚影可穿行，离开后重新凝固。找找与它编号对应的压力板在哪。',
    accent: 'text-fuchsia-400'
  },
  mirror: {
    name: '反射镜',
    detail: '只对光有效的银色镜面：激光会按入射角折返。半透镜只有一侧镀银，另一侧的光会径直穿过。读懂光路才能活下来。',
    accent: 'text-teal-300'
  }
};

const SEEN_KEY = 'gt_seen_mechanics_v1';
const TUTORIAL_KEY = 'gt_tutorial_done_v1';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode etc.) — onboarding just re-runs, harmless.
  }
}

/** Types the player has already been introduced to. */
export function loadSeenMechanics(): Set<ObstacleType> {
  const raw = safeGet(SEEN_KEY);
  const out = new Set<ObstacleType>();
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const t of parsed) {
        if (typeof t === 'string' && t !== 'wall' && t in MECHANISM_TIPS) {
          out.add(t as Exclude<ObstacleType, 'wall'>);
        }
      }
    }
  } catch {
    // Corrupted payload: treat as never seen.
  }
  return out;
}

export function markMechanicSeen(type: ObstacleType): void {
  if (type === 'wall') return;
  const seen = loadSeenMechanics();
  seen.add(type);
  safeSet(SEEN_KEY, JSON.stringify(Array.from(seen)));
}

export function isMechanicSeen(type: ObstacleType): boolean {
  return loadSeenMechanics().has(type);
}

/** First-launch tutorial modal marker. */
export function isTutorialDone(): boolean {
  return safeGet(TUTORIAL_KEY) === '1';
}

export function markTutorialDone(): void {
  safeSet(TUTORIAL_KEY, '1');
}

/**
 * Mechanism types appearing in `level` that the player has not seen yet,
 * deduplicated, in obstacle declaration order. Walls are trivial and skipped.
 */
export function getUnseenMechanics(level: LevelConfig, seen?: Set<ObstacleType>): ObstacleType[] {
  const known = seen ?? loadSeenMechanics();
  const result: ObstacleType[] = [];
  const push = (t: ObstacleType) => {
    if (t === 'wall' || known.has(t) || result.includes(t)) return;
    result.push(t);
  };
  for (const o of level.obstacles as AnyObstacle[]) push(o.type);
  return result;
}

/** Union of non-wall mechanism types across the whole official campaign. */
export function campaignMechanismCoverage(levels: LevelConfig[]): Set<ObstacleType> {
  const out = new Set<ObstacleType>();
  for (const lvl of levels) {
    for (const o of lvl.obstacles as AnyObstacle[]) {
      if (o.type !== 'wall') out.add(o.type);
    }
  }
  return out;
}
