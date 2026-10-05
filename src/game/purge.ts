/**
 * Thorough cache purge — pure logic, UI-agnostic.
 *
 * "Thorough" means every persistence layer the game (and this page) can touch:
 *  1. localStorage   — all known game keys (enumerated below for the footprint
 *                      preview), then a full clear() for anything untracked.
 *  2. sessionStorage — full clear().
 *  3. Cache Storage  — every named cache deleted (PWA/HTTP asset caches).
 *  4. Service Workers — unregistered, so stale workers cannot re-serve content.
 *
 * The caller (CachePurgeModal) reloads the page afterwards, which also drains
 * in-memory state (theme, mute, playtest draft, editor history).
 */

export interface StorageKeyInfo {
  key: string;
  /** Human label shown in the purge preview. */
  label: string;
}

/** Every localStorage key this game has ever written. */
export const KNOWN_STORAGE_KEYS: StorageKeyInfo[] = [
  { key: 'geometrix_traverse_progress_v1', label: '关卡进度（解锁 / 星核 / 最佳纪录）' },
  { key: 'geometrix_traverse_user_levels_v1', label: '我的关卡库（自制关卡与分享码草稿）' },
  { key: 'gt_tutorial_done_v1', label: '新手引导完成记录' },
  { key: 'gt_seen_mechanics_v1', label: '机关首见提示记录' },
  { key: 'gt_shake_enabled_v1', label: '震感开关偏好' },
  { key: 'gt_ball_skin_v1', label: '星核皮肤偏好' }
];

export interface StorageFootprint {
  /** Known keys that currently exist, with their byte size. */
  present: { key: string; label: string; bytes: number }[];
  /** Number of ALL localStorage keys on this origin (game + anything else). */
  localStorageCount: number;
  /** Number of ALL sessionStorage keys on this origin. */
  sessionStorageCount: number;
  /** Human-readable total size of the known keys. */
  knownBytes: number;
}

function storageSafe(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

/** Snapshot of everything the purge will remove — used by the confirm dialog. */
export function collectStorageFootprint(): StorageFootprint {
  const present: StorageFootprint['present'] = [];
  let knownBytes = 0;

  const local = storageSafe('local');
  for (const { key, label } of KNOWN_STORAGE_KEYS) {
    const raw = local?.getItem(key);
    if (raw != null) {
      const bytes = new Blob([raw]).size;
      knownBytes += bytes;
      present.push({ key, label, bytes });
    }
  }

  return {
    present,
    localStorageCount: local ? local.length : 0,
    sessionStorageCount: storageSafe('session')?.length ?? 0,
    knownBytes
  };
}

export interface PurgeReport {
  localStorageCleared: number;
  sessionStorageCleared: number;
  cachesDeleted: string[];
  serviceWorkersUnregistered: number;
}

/**
 * Execute the full purge. Environments without Cache Storage / Service Worker
 * (older browsers, non-secure contexts, test runtimes) simply contribute zeros.
 */
export async function purgeAllCaches(): Promise<PurgeReport> {
  const report: PurgeReport = {
    localStorageCleared: 0,
    sessionStorageCleared: 0,
    cachesDeleted: [],
    serviceWorkersUnregistered: 0
  };

  // 1+2. Web storage (count everything, then wipe — thorough means thorough).
  const local = storageSafe('local');
  if (local) {
    report.localStorageCleared = local.length;
    local.clear();
  }
  const session = storageSafe('session');
  if (session) {
    report.sessionStorageCleared = session.length;
    session.clear();
  }

  // 3. Cache Storage (asset/PWA caches). Guarded for non-secure contexts.
  const cacheScope = globalThis as unknown as {
    caches?: { keys: () => Promise<string[]>; delete: (k: string) => Promise<boolean> };
  };
  if (cacheScope.caches) {
    try {
      const names = await cacheScope.caches.keys();
      for (const name of names) {
        if (await cacheScope.caches.delete(name)) report.cachesDeleted.push(name);
      }
    } catch {
      // Cache API unavailable or hostile — web storage purge already succeeded.
    }
  }

  // 4. Service workers (none registered today, but future-proof the purge).
  const swScope = globalThis as unknown as {
    navigator?: {
      serviceWorker?: {
        getRegistrations: () => Promise<{ unregister: () => Promise<boolean> }[]>;
      };
    };
  };
  const sw = swScope.navigator?.serviceWorker;
  if (sw) {
    try {
      const regs = await sw.getRegistrations();
      for (const reg of regs) {
        if (await reg.unregister()) report.serviceWorkersUnregistered += 1;
      }
    } catch {
      // SW API unavailable — nothing to do.
    }
  }

  return report;
}
