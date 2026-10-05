import { CameraShake } from './types';

/**
 * Device performance tiering.
 *
 * One cheap detection at module load decides visual budget: particle cap,
 * ball trail length, device-pixel-ratio ceiling and camera-shake amplitude.
 * Physics fidelity (substeps, collision) is NEVER reduced — only cosmetics.
 */

export type PerfTier = 'low' | 'high';

export interface PerfProfile {
  tier: PerfTier;
  /** Hard ceiling on live particles; excess spawns are dropped. */
  particleCap: number;
  /** Ball trail points kept per frame. */
  trailLength: number;
  /** devicePixelRatio ceiling for canvas backing-store resolution. */
  maxDpr: number;
  /** Multiplier on camera shake amplitude (0 = no shake). Mutable via setShakeEnabled. */
  shakeScale: number;
}

const LOW_PROFILE: PerfProfile = {
  tier: 'low',
  particleCap: 140,
  trailLength: 6,
  maxDpr: 1.5,
  shakeScale: 1
};

const HIGH_PROFILE: PerfProfile = {
  tier: 'high',
  particleCap: 500,
  trailLength: 12,
  maxDpr: 2.25,
  shakeScale: 1
};

/** Honors the OS "reduce motion" accessibility preference where available. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Heuristic tier detection. Signals (any hit → low):
 *  - navigator.deviceMemory <= 4 GB (Chromium)
 *  - navigator.hardwareConcurrency <= 4 cores
 *  - coarse pointer AND a small viewport (phones)
 * Unknown signals default to high — better to over-render than under-feel.
 */
export function detectPerfTier(): PerfTier {
  if (typeof navigator === 'undefined') return 'high';

  const nav = navigator as Navigator & { deviceMemory?: number };

  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4) {
    return 'low';
  }
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
    return 'low';
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    Math.min(window.innerWidth, window.innerHeight) < 500
  ) {
    return 'low';
  }
  return 'high';
}

function buildProfile(): PerfProfile {
  const base = detectPerfTier() === 'low' ? LOW_PROFILE : HIGH_PROFILE;
  // Accessibility wins over everything: kill shake if the OS asks for calm UI;
  // then honor the user's in-game shake preference on top.
  const shakeOn = !prefersReducedMotion() && isShakeEnabled();
  return { ...base, shakeScale: shakeOn ? base.shakeScale : 0 };
}

const SHAKE_PREF_KEY = 'gt_shake_enabled_v1';

/** User camera-shake preference (persisted). Defaults to ON. */
export function isShakeEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(SHAKE_PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Flip the shake preference live: mutates PERF.shakeScale and persists. */
export function setShakeEnabled(on: boolean): void {
  // OS reduced-motion still wins — the toggle cannot override accessibility
  PERF.shakeScale = on && !prefersReducedMotion() ? 1 : 0;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SHAKE_PREF_KEY, on ? '1' : '0');
    } catch {
      // private-mode storage: preference is session-only, harmless
    }
  }
}

/**
 * Resolved once at module load. Re-evaluating on resize/battery would add
 * churn for little gain; a page reload naturally re-detects.
 */
export const PERF: PerfProfile = buildProfile();
