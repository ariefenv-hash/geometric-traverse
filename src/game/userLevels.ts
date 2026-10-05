import { LevelConfig } from './types';
import { USER_LEVEL_ID_BASE } from './editorDraft';

// ---------------------------------------------------------------------------
// User level library — localStorage-backed CRUD for player-made levels.
// Mirrors the defensive style of levels.ts progress persistence.
// ---------------------------------------------------------------------------

export interface StoredUserLevel {
  id: string;         // 'ul_xxx' key, stable across edits
  name: string;       // display name
  createdAt: number;
  updatedAt: number;
  config: LevelConfig;
}

export const USER_LEVELS_STORAGE_KEY = 'geometrix_traverse_user_levels_v1';

export function loadUserLevels(): StoredUserLevel[] {
  try {
    const raw = localStorage.getItem(USER_LEVELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      e =>
        e &&
        typeof e.id === 'string' &&
        typeof e.name === 'string' &&
        e.config &&
        typeof e.config.id === 'number' &&
        // Without these, a half-written entry passes the filter and
        // createWorldState throws on JSON.stringify(undefined) at play time.
        e.config.ballStart &&
        e.config.exit &&
        Array.isArray(e.config.stars) &&
        Array.isArray(e.config.obstacles)
    ) as StoredUserLevel[];
  } catch {
    return [];
  }
}

/** Write through; returns false when storage is full/unavailable so callers
 *  can warn instead of the previous silent data loss on "已保存". */
export function persistUserLevels(list: StoredUserLevel[]): boolean {
  try {
    localStorage.setItem(USER_LEVELS_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Insert or update by entry id. Returns the next full list plus whether the
 *  write actually persisted. */
export function upsertUserLevel(entry: StoredUserLevel): { list: StoredUserLevel[]; ok: boolean } {
  const list = loadUserLevels();
  const idx = list.findIndex(e => e.id === entry.id);
  const next =
    idx === -1
      ? [...list, entry]
      : list.map(e => (e.id === entry.id ? entry : e));
  const ok = persistUserLevels(next);
  return { list: next, ok };
}

export function deleteUserLevel(id: string): { list: StoredUserLevel[]; ok: boolean } {
  const next = loadUserLevels().filter(e => e.id !== id);
  const ok = persistUserLevels(next);
  return { list: next, ok };
}

export function makeUserLevelKey(): string {
  return `ul_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Next free numeric id in the user level id space. */
export function nextUserLevelNumericId(list: StoredUserLevel[]): number {
  const max = list.reduce((m, e) => Math.max(m, e.config.id), USER_LEVEL_ID_BASE - 1);
  return Math.max(max + 1, USER_LEVEL_ID_BASE);
}
