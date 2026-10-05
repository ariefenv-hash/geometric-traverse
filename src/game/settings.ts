/**
 * settings.ts — persisted user preferences (assist mode, theme, mute).
 *
 * Small bare-localStorage helpers following the project convention
 * (try/catch guards so the module also works under Bun smoke tests).
 *
 * Keys registered here MUST also appear in purge.ts KNOWN_STORAGE_KEYS.
 */

import { ThemeMode } from './types';

export const ASSIST_STORAGE_KEY = 'gt_assist_v1';
export const THEME_STORAGE_KEY = 'gt_theme_v1';
export const MUTE_STORAGE_KEY = 'gt_mute_v1';

export interface AssistPrefs {
  /** 0.7× gravity — floatier falls, gentler landings. */
  lowGravity: boolean;
  /** Lethal lasers & annihilation fields knock the ball away instead of killing. */
  safeHazards: boolean;
}

export const DEFAULT_ASSIST: AssistPrefs = { lowGravity: false, safeHazards: false };

export function loadAssist(): AssistPrefs {
  try {
    const raw = localStorage.getItem(ASSIST_STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        lowGravity: !!obj.lowGravity,
        safeHazards: !!obj.safeHazards
      };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_ASSIST };
}

export function saveAssist(prefs: AssistPrefs): void {
  try {
    localStorage.setItem(ASSIST_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable — assist still applies for this session
  }
}

export function loadTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}
