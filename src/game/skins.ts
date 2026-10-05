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
    desc: '正二十面体与星形四面体嵌套，包含完美比例对偶线。'
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
    desc: '钟表齿圈驱动的八瓣切线旋转遮光叶片系统。'
  },
  {
    id: 'voronoi', num: '10', en: 'VORONOI', type: 'Cellular',
    name: '泰森多边形有机球', accent: '#b388ff',
    desc: '依曲率向边缘紧缩的自然仿生多胞网格结构。'
  }
];

/** Metadata for a persisted id; unknown ids resolve to null (caller falls back). */
export function getSkinMeta(id: string): BallSkinInfo | null {
  return BALL_SKINS.find(s => s.id === id) ?? null;
}

/** Raw SVG source for a skin id (used by the picker previews). */
export function getSkinSvg(id: string): string | null {
  const idx = BALL_SKINS.findIndex(s => s.id === id);
  return idx >= 0 ? SKIN_ART[idx] : null;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Read the persisted skin id; corrupted / unknown / missing → classic. */
export function getSelectedSkinId(): string {
  if (typeof localStorage === 'undefined') return CLASSIC_SKIN_ID;
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    if (!raw) return CLASSIC_SKIN_ID;
    const id = JSON.parse(raw);
    return typeof id === 'string' && getSkinMeta(id) ? id : CLASSIC_SKIN_ID;
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
  BALL_SKINS.forEach((skin, i) => {
    const img = new Image();
    img.onload = () => { spriteCache.set(skin.id, img); };
    img.src = toDataUri(SKIN_ART[i]);
  });
}

/** Loaded sprite for a skin id, or null if not (yet) available. */
export function getSkinImage(id: string): HTMLImageElement | null {
  return spriteCache.get(id) ?? null;
}
