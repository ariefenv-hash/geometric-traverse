import type { PrismRating } from './types';
import { LEVELS } from './levels';

/**
 * 每日挑战：日期种子确定性抽取 3 关连续闯关，完成后累计连胜。
 * 存档键 gt_daily_v1（已登记 purge.ts KNOWN_STORAGE_KEYS）。
 */

export const DAILY_LEVEL_COUNT = 3;
const STORAGE_KEY = 'gt_daily_v1';
const HISTORY_KEEP = 60; // 保留最近 60 天战绩

export interface DailyState {
  /** 最近完成日期 'YYYY-MM-DD'（本地时区） */
  lastCompleted: string;
  streak: number;
  bestStreak: number;
  totalCompletes: number;
  /** dateKey -> 当日三关评级 */
  history: Record<string, PrismRating[]>;
}

const EMPTY: DailyState = {
  lastCompleted: '',
  streak: 0,
  bestStreak: 0,
  totalCompletes: 0,
  history: {}
};

/** 本地时区日期键（每日 0 点刷新） */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(d: Date = new Date()): string {
  return todayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
}

/** 'YYYY-MM-DD' -> 本地 Date（零点） */
function parseKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

/** mulberry32 PRNG：小而稳、跨设备确定性一致 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 日期种子抽取当日 3 关（升序呈现，难度大致随 id 递增） */
export function pickDailyLevels(dateKey: string): number[] {
  const rand = mulberry32(hashSeed('gt-daily:' + dateKey));
  const pool = LEVELS.map(l => l.id);
  // Fisher-Yates 洗牌取前 N
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DAILY_LEVEL_COUNT).sort((a, b) => a - b);
}

export function loadDailyState(): DailyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, history: {} };
    const p = JSON.parse(raw) as DailyState;
    if (p && typeof p.streak === 'number' && p.history && typeof p.history === 'object') {
      return {
        lastCompleted: p.lastCompleted ?? '',
        streak: p.streak ?? 0,
        bestStreak: p.bestStreak ?? 0,
        totalCompletes: p.totalCompletes ?? 0,
        history: p.history
      };
    }
  } catch { /* 忽略坏档 */ }
  return { ...EMPTY, history: {} };
}

export function saveDailyState(s: DailyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* 存储不可用时静默（挑战进度属于可丢弃数据） */ }
}

/** 完成当日挑战：连续/首日/断签 三态更新连胜 */
export function registerDailyComplete(
  dateKey: string,
  ratings: PrismRating[],
  prev: DailyState = loadDailyState()
): DailyState {
  if (prev.lastCompleted === dateKey) {
    // 当日重复完成：只保留更优战绩（S>A>B 逐位比较）
    const better = isBetterRun(ratings, prev.history[dateKey]);
    const history = { ...prev.history, [dateKey]: better ? ratings : prev.history[dateKey] };
    const next = { ...prev, history };
    saveDailyState(next);
    return next;
  }
  const consecutive = prev.lastCompleted === yesterdayKey(parseKey(dateKey));
  const streak = consecutive ? prev.streak + 1 : 1;
  // 清理过期历史
  const history: Record<string, PrismRating[]> = { ...prev.history, [dateKey]: ratings };
  const keys = Object.keys(history).sort();
  while (keys.length > HISTORY_KEEP) delete history[keys.shift() as string];
  const next: DailyState = {
    lastCompleted: dateKey,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    totalCompletes: prev.totalCompletes + 1,
    history
  };
  saveDailyState(next);
  return next;
}

function rankOf(r: PrismRating): number {
  return r === 'S' ? 3 : r === 'A' ? 2 : 1;
}

function isBetterRun(a: PrismRating[], b?: PrismRating[]): boolean {
  if (!b || b.length !== a.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (rankOf(a[i]) !== rankOf(b[i])) return rankOf(a[i]) > rankOf(b[i]);
  }
  return false;
}

/** Wordle 式战报文本（复制即分享） */
export function buildShareText(dateKey: string, ratings: PrismRating[], streak: number): string {
  const marks = ratings.map(r => `${r}`).join(' ');
  return [
    `几何贯穿·每日挑战 ${dateKey}`,
    `${marks} 全三星达成`,
    streak > 0 ? `连胜 ${streak} 天，今天也来贯穿引力吧` : '来挑战你的引力操作',
    'https://ariefenv-hash.github.io/geometric-traverse/'
  ].join('\n');
}
