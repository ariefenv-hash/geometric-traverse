/**
 * skins.ts — ball skin system: registry, persistence, canvas sprite preloader.
 *
 * 11 choices = 1 classic procedural star-core (the original renderer look)
 *            + 10 showcase sphere designs (skinArt.ts, SVG → Image sprites).
 *
 * Storage follows the project convention: bare localStorage + try/catch so the
 * module works in both the browser and the Bun smoke-test stub. Image loading
 * is browser-only and degrades to null in non-browser runtimes — the renderer
 * then falls back to the classic procedural ball.
 */

import { SKIN_ART } from './skinArt';
import { LevelProgress } from './types';

export const SKIN_STORAGE_KEY = 'gt_ball_skin_v1';

export interface BallSkinInfo {
  /** Stable id persisted in localStorage. */
  id: string;
  /** Two-digit showcase index, e.g. '01'. */
  num: string;
  /** Uppercase latin badge, e.g. 'GEODIC'. */
  en: string;
  /** Small category label, e.g. 'Tessellation'. */
  type: string;
  /** Chinese display name. */
  name: string;
  /** One-line flavor description. */
  desc: string;
  /** Accent color used for selection highlights in the picker. */
  accent: string;
  /** Achievement gate: when present, the skin unlocks only after `test` passes. */
  unlock?: SkinUnlock;
}

/** Campaign stats aggregate used to evaluate skin unlock predicates. */
export interface UnlockStats {
  /** Sum of starsEarned across all official levels. */
  totalStars: number;
  /** Sum of stars obtainable across all official levels. */
  maxTotalStars: number;
  /** Number of levels whose bestRating === 'S'. */
  sRatings: number;
  /** Number of completed official levels. */
  completedCount: number;
  /** Total official levels. */
  totalLevels: number;
}

export interface SkinUnlock {
  /** Short label shown on the locked card, e.g. '星核共鸣 18'. */
  label: string;
  /** Longer condition explanation shown in the picker footer / unlock toast. */
  hint: string;
  test: (stats: UnlockStats) => boolean;
}

/** The original procedural ball (renderer steps 4-7). Always available. */
export const CLASSIC_SKIN_ID = 'classic';

export const BALL_SKINS: BallSkinInfo[] = [
  {
    id: 'geodesic', num: '01', en: 'GEODIC', type: 'Tessellation',
    name: '测地线三角网格球', accent: '#4ef2d2',
    desc: '富勒烯球体拓扑细分构型，微透光三角面与节点强化。'
  },
  {
    id: 'armillary', num: '02', en: 'ARMILLARY', type: 'Astrolabe',
    name: '浑天仪天体环绕球', accent: '#f3c969',
    desc: '多重交叠黄赤道坐标圈、极轴与行星导轨构造。'
  },
  {
    id: 'isometric', num: '03', en: 'ISOMETRIC', type: 'Voxel Cube',
    name: '等轴测体素聚合球', accent: '#64b5f6',
    desc: '将高维三维立方像素约束于球形边界内的空间雕塑。'
  },
  {
    id: 'phyllotaxis', num: '04', en: 'PHYLLOTAXIS', type: 'Fibonacci',
    name: '斐波那契点阵晶体球', accent: '#4ef2d2',
    desc: '以 137.5° 黄金发散角向外扩张的球面粒子晶格。'
  },
  {
    id: 'sacred', num: '05', en: 'SACRED', type: 'Merkaba',
    name: '梅卡巴神圣几何球', accent: '#b388ff',
    desc: '正二十面体与星形四面体嵌套，包含完美比例对偶线。',
    unlock: {
      label: '星核共鸣 18',
      hint: '累计搜集 18 颗星核后解锁',
      test: s => s.totalStars >= 18
    }
  },
  {
    id: 'stratum', num: '06', en: 'STRATUM', type: 'Contour Slice',
    name: '断层等高线层积球', accent: '#4ef2d2',
    desc: '三维断层扫描截面构成，展现水平层叠与空间体量感。'
  },
  {
    id: 'lissajous', num: '07', en: 'LISSAJOUS', type: 'Knot Curve',
    name: '利萨如三维流线球', accent: '#f3c969',
    desc: '由数学正弦谐振方程环绕构成的单边莫比乌斯扭结笼。'
  },
  {
    id: 'hudcore', num: '08', en: 'HUD CORE', type: 'Sci-Fi Vector',
    name: '赛博全息测控球', accent: '#4ef2d2',
    desc: '数字化航电 HUD 瞄准环、断续雷达圆弧与陀螺罗盘。'
  },
  {
    id: 'aperture', num: '09', en: 'APERTURE', type: 'Mechanical',
    name: '精密机械光圈叶球', accent: '#f3c969',
    desc: '钟表齿圈驱动的八瓣切线旋转遮光叶片系统。',
    unlock: {
      label: '棱镜评级 S × 5',
      hint: '在任意 5 个维度取得 S 级棱镜评级后解锁',
      test: s => s.sRatings >= 5
    }
  },
  {
    id: 'voronoi', num: '10', en: 'VORONOI', type: 'Cellular',
    name: '泰森多边形有机球', accent: '#b388ff',
    desc: '依曲率向边缘紧缩的自然仿生多胞网格结构。',
    unlock: {
      label: '贯穿全部维度',
      hint: '通关全部 17 个官方维度后解锁',
      test: s => s.completedCount >= s.totalLevels
    }
  }
];

/** Aggregate campaign stats from a progress map (tolerates missing entries). */
export function getUnlockStats(
  progress: Record<number, LevelProgress>,
  maxTotalStars: number,
  totalLevels: number
): UnlockStats {
  let totalStars = 0;
  let sRatings = 0;
  let completedCount = 0;
  for (const key of Object.keys(progress)) {
    const p = progress[Number(key)];
    if (!p) continue;
    totalStars += p.starsEarned || 0;
    if (p.bestRating === 'S') sRatings += 1;
    if (p.completed) completedCount += 1;
  }
  return { totalStars, maxTotalStars, sRatings, completedCount, totalLevels };
}

/** A skin is usable when it has no unlock gate or the gate predicate passes. */
export function isSkinUnlocked(skin: BallSkinInfo, stats: UnlockStats): boolean {
  return !skin.unlock || skin.unlock.test(stats);
}

/** Skins whose unlock predicate turns true for the given stats. */
export function getUnlockedSkinIds(stats: UnlockStats): string[] {
  return BALL_SKINS.filter(s => isSkinUnlocked(s, stats)).map(s => s.id);
}

/** Metadata for a persisted id; unknown ids resolve to null (caller falls back). */
export function getSkinMeta(id: string): BallSkinInfo | null {
  return BALL_SKINS.find(s => s.id === id) ?? null;
}

/** Raw SVG source for a skin id (used by the picker previews). */
export function getSkinSvg(id: string): string | null {
  const idx = BALL_SKINS.findIndex(s => s.id === id);
  return idx >= 0 ? SKIN_ART[idx] ?? null : null;
}

/** Classic procedural ball's halo accent (the original sky-400 look). */
export const CLASSIC_ACCENT = '#38bdf8';

/**
 * Accent color of the currently selected skin, for unifying the ball's aura,
 * trail and satellite glow with the equipped artwork. Falls back to the
 * classic sky tone for the procedural ball or unknown ids.
 */
export function getSelectedSkinAccent(): string {
  const id = getSelectedSkinId();
  if (id === CLASSIC_SKIN_ID) return CLASSIC_ACCENT;
  return getSkinMeta(id)?.accent ?? CLASSIC_ACCENT;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

// drawBall calls getSelectedSkinId() every frame; hitting localStorage +
// JSON.parse 60×/s is pure waste. The id only changes through
// setSelectedSkinId(), so a tiny write-through cache is enough.
let cachedSkinId: string | null = null;

/** Read the persisted skin id; corrupted / unknown / missing → classic. */
export function getSelectedSkinId(): string {
  if (cachedSkinId) return cachedSkinId;
  if (typeof localStorage === 'undefined') return CLASSIC_SKIN_ID;
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    if (!raw) return CLASSIC_SKIN_ID;
    const id = JSON.parse(raw);
    const resolved = typeof id === 'string' && getSkinMeta(id) ? id : CLASSIC_SKIN_ID;
    cachedSkinId = resolved;
    return resolved;
  } catch {
    return CLASSIC_SKIN_ID;
  }
}

/** Persist a skin id; unknown ids are rejected silently (defensive). */
export function setSelectedSkinId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (id !== CLASSIC_SKIN_ID && !getSkinMeta(id)) return;
    localStorage.setItem(SKIN_STORAGE_KEY, JSON.stringify(id));
    cachedSkinId = id;
  } catch {
    /* storage full / disabled — cosmetic preference, ignore */
  }
}

// ---------------------------------------------------------------------------
// Canvas sprite preloader (browser only)
// ---------------------------------------------------------------------------

const spriteCache = new Map<string, HTMLImageElement>();
let preloadStarted = false;

function toDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Kick off one-time async loading of all skin sprites. Safe to call repeatedly
 * and in non-browser runtimes (no-op there — renderer falls back to classic).
 */
export function ensureSkinImagesLoaded(): void {
  if (preloadStarted || typeof Image === 'undefined') return;
  preloadStarted = true;
  // The sprite list is index-aligned with BALL_SKINS; fail loudly in dev if
  // the two registries ever drift apart (previously a shorter SKIN_ART
  // silently produced broken "…undefined" data URIs).
  console.assert(
    SKIN_ART.length === BALL_SKINS.length,
    '[skins] SKIN_ART entries (%s) out of sync with BALL_SKINS (%s)',
    SKIN_ART.length,
    BALL_SKINS.length
  );
  BALL_SKINS.forEach((skin, i) => {
    const svg = SKIN_ART[i];
    if (!svg) return;
    const img = new Image();
    img.onload = () => { spriteCache.set(skin.id, img); };
    img.src = toDataUri(svg);
  });
}

/** Loaded sprite for a skin id, or null if not (yet) available. */
export function getSkinImage(id: string): HTMLImageElement | null {
  return spriteCache.get(id) ?? null;
}
