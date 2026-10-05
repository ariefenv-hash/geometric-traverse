import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Play,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  MousePointer2,
  Eraser,
  Star,
  Circle,
  Flag,
  Layers,
  Eye,
  Shield,
  Zap,
  Sparkles,
  DoorOpen,
  DoorClosed,
  BrickWall,
  Target,
  CircleDashed,
  Skull,
  ChevronUp,
  Slash,
  Library,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Undo2,
  Redo2
} from 'lucide-react';
import {
  AnyObstacle,
  LevelConfig,
  ObstacleType,
  ThemeMode
} from '../game/types';
import {
  EditorDraft,
  createEmptyDraft,
  createDefaultObstacle,
  draftFromLevelConfig,
  draftToLevelConfig,
  validateDraft,
  snap,
  clampArenaValue,
  uniqueStarId,
  userLevelCode,
  USER_LEVEL_ID_BASE,
  MAX_STARS,
  MIN_OBSTACLE_SIZE,
  EDITOR_SNAP
} from '../game/editorDraft';
import {
  StoredUserLevel,
  loadUserLevels,
  upsertUserLevel,
  deleteUserLevel,
  makeUserLevelKey,
  nextUserLevelNumericId
} from '../game/userLevels';
import {
  drawEditorScene,
  computeArenaTransform,
  screenToArena,
  hitTest,
  hitResizeHandle,
  HitTarget
} from '../game/editorCanvas';
import { encodeLevelShareCode, decodeLevelShareCode } from '../game/levels';

// ---------------------------------------------------------------------------
// Level editor — full visual editor with library persistence + playtest.
// Layout: [palette | canvas | inspector+meta+library], desktop-first.
// ---------------------------------------------------------------------------

type Tool = 'select' | 'erase' | 'ballstart' | 'exit' | 'star' | ObstacleType;

interface DragState {
  mode: 'move-obstacle' | 'move-star' | 'move-exit' | 'move-ballstart' | 'resize';
  id?: string;
  index?: number;
  grabDX: number;
  grabDY: number;
  /** History snapshot is taken lazily on the FIRST real move of the drag. */
  snapshot?: boolean;
}

const PALETTE: { tool: Tool; label: string; icon: React.ReactNode }[] = [
  { tool: 'select', label: '选择移动', icon: <MousePointer2 className="w-4 h-4" /> },
  { tool: 'erase', label: '擦除', icon: <Eraser className="w-4 h-4" /> },
  { tool: 'ballstart', label: '球起点', icon: <Circle className="w-4 h-4" /> },
  { tool: 'exit', label: '归元门', icon: <Flag className="w-4 h-4" /> },
  { tool: 'star', label: '星核', icon: <Star className="w-4 h-4" /> },
  { tool: 'wall', label: '墙体', icon: <Layers className="w-4 h-4" /> },
  { tool: 'phase_barrier', label: '相界', icon: <Eye className="w-4 h-4" /> },
  { tool: 'sliding_block', label: '滑块', icon: <Shield className="w-4 h-4" /> },
  { tool: 'laser_emitter', label: '激光', icon: <Zap className="w-4 h-4" /> },
  { tool: 'anti_gravity', label: '反重力', icon: <Sparkles className="w-4 h-4" /> },
  { tool: 'bumper', label: '弹力垫', icon: <ChevronUp className="w-4 h-4" /> },
  { tool: 'one_way_gate', label: '单向阀', icon: <DoorOpen className="w-4 h-4" /> },
  { tool: 'fragile_wall', label: '碎裂墙', icon: <BrickWall className="w-4 h-4" /> },
  { tool: 'pressure_plate', label: '压力板', icon: <Target className="w-4 h-4" /> },
  { tool: 'linked_gate', label: '联动门', icon: <DoorClosed className="w-4 h-4" /> },
  { tool: 'portal', label: '折跃门', icon: <CircleDashed className="w-4 h-4" /> },
  { tool: 'hazard', label: '湮灭场', icon: <Skull className="w-4 h-4" /> },
  { tool: 'mirror', label: '反射镜', icon: <Slash className="w-4 h-4" /> }
];

const TOOL_HINTS: Record<Tool, string> = {
  select: '点击选中对象，拖动移动，右下角方点拉伸尺寸',
  erase: '点击障碍物 / 星核将其移除',
  ballstart: '在画布上点击放置球起点',
  exit: '在画布上点击放置归元之门',
  star: '在画布上点击放置星核',
  wall: '点击放置实体墙，可连续放置',
  phase_barrier: '点击放置透光相界，右侧可勾选实体朝向',
  sliding_block: '点击放置动量滑块，导轨范围在右侧调整',
  laser_emitter: '点击放置激光发射器',
  anti_gravity: '点击放置反重力涌泉',
  bumper: '点击放置定向弹力垫',
  one_way_gate: '点击放置单向闸门',
  fragile_wall: '点击放置碎裂墙',
  pressure_plate: '点击放置压力板，记得在右侧关联联动门',
  linked_gate: '点击放置联动闸门',
  portal: '点击放置折跃门，成对设置目标后生效',
  hazard: '点击放置湮灭场',
  mirror: '点击放置反射镜，右侧可旋转角度与选择反射面；单向镀银镜只折返一侧来光'
};

const DIR_OPTIONS: { value: 'up' | 'down' | 'left' | 'right'; label: string }[] = [
  { value: 'up', label: '↑ 上' },
  { value: 'down', label: '↓ 下' },
  { value: 'left', label: '← 左' },
  { value: 'right', label: '→ 右' }
];

/** Compass label for the mirror's +normal ("front") side at a given angle. */
function mirrorFrontCompass(angleDeg: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  return Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? '左' : '右') : ny < 0 ? '上' : '下';
}

// --- small controlled field components -------------------------------------

const SectionTitle: React.FC<{ children: React.ReactNode; accent?: string }> = ({
  children,
  accent = 'text-sky-400'
}) => (
  <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${accent}`}>
    {children}
  </div>
);

const NumInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}> = ({ label, value, onChange, step = 1, min, max }) => (
  <label className="flex items-center justify-between gap-2 text-[11px]">
    <span className="text-stone-400 dark:text-stone-400 light:text-stone-500 shrink-0">{label}</span>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={e => {
        const v = parseFloat(e.target.value);
        // Clearing the field parses to NaN; writing NaN into the draft used
        // to bypass every downstream clamp (Math.min/max with NaN → NaN) and
        // JSON.stringify turned it into null on save. Ignore non-finite input
        // and keep the previous value instead.
        if (Number.isFinite(v)) onChange(v);
      }}
      className="w-20 px-2 py-1 rounded-lg bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 text-xs font-mono-tabular focus:border-sky-500 focus:outline-none"
    />
  </label>
);

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
}> = ({ label, value, onChange, area }) => (
  <label className="block text-[11px]">
    <span className="text-stone-400 dark:text-stone-400 light:text-stone-500 block mb-1">{label}</span>
    {area ? (
      <textarea
        value={value}
        rows={2}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 text-xs focus:border-sky-500 focus:outline-none resize-none"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 text-xs focus:border-sky-500 focus:outline-none"
      />
    )}
  </label>
);

const DirSelect: React.FC<{
  label: string;
  value: 'up' | 'down' | 'left' | 'right';
  onChange: (v: 'up' | 'down' | 'left' | 'right') => void;
}> = ({ label, value, onChange }) => (
  <label className="flex items-center justify-between gap-2 text-[11px]">
    <span className="text-stone-400 dark:text-stone-400 light:text-stone-500 shrink-0">{label}</span>
    <select
      value={value}
      onChange={e => onChange(e.target.value as 'up' | 'down' | 'left' | 'right')}
      className="w-24 px-1.5 py-1 rounded-lg bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 text-xs focus:border-sky-500 focus:outline-none"
    >
      {DIR_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

const CheckInput: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="accent-sky-400"
    />
    <span className="text-stone-400 dark:text-stone-400 light:text-stone-500">{label}</span>
  </label>
);

// ---------------------------------------------------------------------------

interface LevelEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaytest: (cfg: LevelConfig) => void;
  theme: ThemeMode;
}

export const LevelEditor: React.FC<LevelEditorProps> = ({
  isOpen,
  onClose,
  onPlaytest,
  theme
}) => {
  const [draft, setDraft] = useState<EditorDraft>(createEmptyDraft);
  const [tool, setTool] = useState<Tool>('select');
  const [selected, setSelected] = useState<HitTarget | null>(null);
  const [library, setLibrary] = useState<StoredUserLevel[]>([]);
  // Mobile (<md): palette/inspector become overlay drawers; null = canvas fullscreen
  const [mobilePanel, setMobilePanel] = useState<'tools' | 'props' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number>(0);

  // Refs mirroring state for the render loop / pointer math
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const isDark = theme === 'dark';

  const issues = useMemo(() => validateDraft(draft), [draft]);

  // Load library whenever the editor opens
  useEffect(() => {
    if (isOpen) {
      setLibrary(loadUserLevels());
      setMobilePanel(null);
    }
  }, [isOpen]);

  // Canvas DPI sizing
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dprMedia: MediaQueryList | null = null;
    let dprMediaHandler: (() => void) | null = null;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;

      // Cross-monitor moves change devicePixelRatio without a CSS resize.
      if (dprMedia && dprMediaHandler) {
        dprMedia.removeEventListener('change', dprMediaHandler);
      }
      if (typeof window.matchMedia === 'function') {
        dprMedia = window.matchMedia(`(resolution: ${dpr}dppx)`);
        dprMediaHandler = handleResize;
        dprMedia.addEventListener('change', dprMediaHandler);
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => {
      observer.disconnect();
      if (dprMedia && dprMediaHandler) {
        dprMedia.removeEventListener('change', dprMediaHandler);
      }
    };
  }, [isOpen]);

  // Render loop (hooked once per open; reads latest state via refs)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let mounted = true;
    const loop = (now: number) => {
      if (!mounted) return;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const sel = selectedRef.current;
      ctx.save();
      ctx.scale(dpr, dpr);
      drawEditorScene(
        ctx,
        draftRef.current,
        { width, height, theme: themeRef.current },
        {
          selectedId: sel?.id ?? null,
          selectedKind: sel?.kind ?? null,
          time: now / 1000
        }
      );
      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  // --- editing operations --------------------------------------------------
  // NOTE: removeSelected is defined after pushHistory (below) because it
  // snapshots the undo stack; declaring it earlier would reference a
  // not-yet-initialized const.

  // --- undo / redo ----------------------------------------------------------

  const HISTORY_LIMIT = 60;
  const pastRef = useRef<EditorDraft[]>([]);
  const futureRef = useRef<EditorDraft[]>([]);
  const coalesceRef = useRef<{ tag: string; time: number } | null>(null);
  const [historyInfo, setHistoryInfo] = useState({ canUndo: false, canRedo: false });

  const syncHistoryInfo = useCallback(() => {
    setHistoryInfo({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0
    });
  }, []);

  /**
   * Snapshot the current draft onto the undo stack.
   * Consecutive patches sharing the same tag within 800ms coalesce into a
   * single entry (typing in a field, slider drags) so one Ctrl+Z undoes the
   * whole edit burst. Pass no tag for discrete actions (place/erase/import).
   */
  const pushHistory = useCallback(
    (tag?: string) => {
      const now = Date.now();
      if (tag) {
        const c = coalesceRef.current;
        if (c && c.tag === tag && now - c.time < 800) {
          c.time = now;
          return;
        }
        coalesceRef.current = { tag, time: now };
      } else {
        coalesceRef.current = null;
      }
      pastRef.current = [...pastRef.current, draftRef.current].slice(-HISTORY_LIMIT);
      futureRef.current = [];
      syncHistoryInfo();
    },
    [syncHistoryInfo]
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [draftRef.current, ...futureRef.current].slice(0, HISTORY_LIMIT);
    coalesceRef.current = null;
    draftRef.current = prev; // keep the render-loop ref in sync immediately
    setDraft(prev);
    setSelected(null);
    syncHistoryInfo();
  }, [syncHistoryInfo]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[0];
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, draftRef.current].slice(-HISTORY_LIMIT);
    coalesceRef.current = null;
    draftRef.current = next;
    setDraft(next);
    setSelected(null);
    syncHistoryInfo();
  }, [syncHistoryInfo]);

  // --- editing operations --------------------------------------------------

  const removeSelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    if (sel.kind === 'obstacle') {
      pushHistory(); // deletions must be undoable like erase-tool removals
      setDraft(d => ({ ...d, obstacles: d.obstacles.filter(o => o.id !== sel.id) }));
    } else if (sel.kind === 'star') {
      pushHistory();
      setDraft(d => ({ ...d, stars: d.stars.filter(s => s.id !== sel.id) }));
    } else {
      return; // exit & ballstart are permanent fixtures
    }
    setSelected(null);
  }, [pushHistory]);

  // Keyboard: Ctrl+Z/Ctrl+Y undo/redo, Esc → select tool, Delete/Backspace → remove selection, V/E shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape' || e.key === 'v' || e.key === 'V') {
        setTool('select');
      } else if (e.key === 'e' || e.key === 'E') {
        setTool('erase');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, removeSelected, undo, redo]);

  const getPoint = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const tf = computeArenaTransform(
      rect.width,
      rect.height,
      draftRef.current.arenaWidth,
      draftRef.current.arenaHeight
    );
    return {
      tf,
      arena: screenToArena(tf, e.clientX - rect.left, e.clientY - rect.top),
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top
    };
  }, []);

  const placeAt = useCallback(
    (ax: number, ay: number) => {
      const t = toolRef.current;
      if (t === 'star') {
        pushHistory();
        setDraft(d => {
          if (d.stars.length >= MAX_STARS) return d;
          const st = {
            id: uniqueStarId(d.stars),
            x: snap(ax),
            y: snap(ay),
            radius: 10,
            collected: false,
            pulsePhase: d.stars.length
          };
          return { ...d, stars: [...d.stars, st] };
        });
        return;
      }
      if (t === 'exit') {
        pushHistory();
        setDraft(d => ({ ...d, exit: { ...d.exit, x: snap(ax), y: snap(ay) } }));
        return;
      }
      if (t === 'ballstart') {
        pushHistory();
        setDraft(d => ({ ...d, ballStart: { x: snap(ax), y: snap(ay) } }));
        return;
      }
      if (t === 'select' || t === 'erase') return;
      pushHistory();
      const cur = draftRef.current;
      const obs = createDefaultObstacle(
        t as ObstacleType,
        cur.arenaWidth,
        cur.arenaHeight,
        ax,
        ay,
        cur.nextId
      );
      setDraft(d => ({
        ...d,
        obstacles: [...d.obstacles, obs],
        nextId: d.nextId + 1
      }));
      setSelected({ kind: 'obstacle', id: obs.id, index: cur.obstacles.length });
    },
    [pushHistory]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { tf, arena, sx, sy } = getPoint(e);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);

      if (toolRef.current === 'select') {
        const sel = selectedRef.current;
        if (
          sel?.kind === 'obstacle' &&
          hitResizeHandle(draftRef.current, tf, sel.id, sx, sy)
        ) {
          dragRef.current = { mode: 'resize', id: sel.id, grabDX: 0, grabDY: 0 };
          return;
        }
        const hit = hitTest(draftRef.current, arena.x, arena.y);
        setSelected(hit);
        if (!hit) {
          dragRef.current = null;
          return;
        }
        if (hit.kind === 'obstacle') {
          const o = draftRef.current.obstacles.find(ob => ob.id === hit.id);
          if (!o) return;
          dragRef.current = {
            mode: 'move-obstacle',
            id: hit.id,
            grabDX: arena.x - o.x,
            grabDY: arena.y - o.y
          };
        } else if (hit.kind === 'star') {
          const s = draftRef.current.stars[hit.index];
          dragRef.current = {
            mode: 'move-star',
            index: hit.index,
            grabDX: arena.x - s.x,
            grabDY: arena.y - s.y
          };
        } else if (hit.kind === 'exit') {
          dragRef.current = {
            mode: 'move-exit',
            grabDX: arena.x - draftRef.current.exit.x,
            grabDY: arena.y - draftRef.current.exit.y
          };
        } else {
          dragRef.current = {
            mode: 'move-ballstart',
            grabDX: arena.x - draftRef.current.ballStart.x,
            grabDY: arena.y - draftRef.current.ballStart.y
          };
        }
        return;
      }

      if (toolRef.current === 'erase') {
        const hit = hitTest(draftRef.current, arena.x, arena.y);
        if (!hit) return;
        pushHistory();
        if (hit.kind === 'obstacle') {
          setDraft(d => ({ ...d, obstacles: d.obstacles.filter(o => o.id !== hit.id) }));
        } else if (hit.kind === 'star') {
          setDraft(d => ({ ...d, stars: d.stars.filter(s => s.id !== hit.id) }));
        }
        if (selectedRef.current?.id === hit.id) setSelected(null);
        return;
      }

      placeAt(snap(arena.x), snap(arena.y));
    },
    [getPoint, placeAt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const { arena } = getPoint(e);
      const W = draftRef.current.arenaWidth;
      const H = draftRef.current.arenaHeight;

      // Snapshot once per drag gesture (not per pointermove) so a whole
      // drag is a single undo step; a click without movement costs nothing.
      if (!drag.snapshot) {
        drag.snapshot = true;
        pushHistory();
      }

      if (drag.mode === 'move-obstacle' && drag.id) {
        setDraft(d => ({
          ...d,
          obstacles: d.obstacles.map(o => {
            if (o.id !== drag.id) return o;
            const nx = Math.min(Math.max(0, snap(arena.x - drag.grabDX)), Math.max(0, W - o.width));
            const ny = Math.min(Math.max(0, snap(arena.y - drag.grabDY)), Math.max(0, H - o.height));
            return { ...o, x: nx, y: ny };
          })
        }));
      } else if (drag.mode === 'resize' && drag.id) {
        setDraft(d => ({
          ...d,
          obstacles: d.obstacles.map(o => {
            if (o.id !== drag.id) return o;
            const nw = Math.min(
              Math.max(MIN_OBSTACLE_SIZE, snap(arena.x - o.x, EDITOR_SNAP)),
              Math.max(MIN_OBSTACLE_SIZE, W - o.x)
            );
            const nh = Math.min(
              Math.max(MIN_OBSTACLE_SIZE, snap(arena.y - o.y, EDITOR_SNAP)),
              Math.max(MIN_OBSTACLE_SIZE, H - o.y)
            );
            return { ...o, width: nw, height: nh };
          })
        }));
      } else if (drag.mode === 'move-star' && drag.index !== undefined) {
        const idx = drag.index;
        setDraft(d => ({
          ...d,
          stars: d.stars.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  x: Math.min(Math.max(0, snap(arena.x - drag.grabDX)), W),
                  y: Math.min(Math.max(0, snap(arena.y - drag.grabDY)), H)
                }
              : s
          )
        }));
      } else if (drag.mode === 'move-exit') {
        setDraft(d => ({
          ...d,
          exit: {
            ...d.exit,
            x: Math.min(Math.max(0, snap(arena.x - drag.grabDX)), W),
            y: Math.min(Math.max(0, snap(arena.y - drag.grabDY)), H)
          }
        }));
      } else if (drag.mode === 'move-ballstart') {
        setDraft(d => ({
          ...d,
          ballStart: {
            x: Math.min(Math.max(0, snap(arena.x - drag.grabDX)), W),
            y: Math.min(Math.max(0, snap(arena.y - drag.grabDY)), H)
          }
        }));
      }
    },
    [getPoint, pushHistory]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // --- persistence / share / playtest ---------------------------------------

  const handleSave = useCallback(() => {
    const v = validateDraft(draftRef.current);
    if (v.errors.length) {
      window.alert('无法保存，请先修复以下问题：\n' + v.errors.map(e => `· ${e}`).join('\n'));
      return;
    }
    let working = draftRef.current;
    if (working.numericId < USER_LEVEL_ID_BASE) {
      const nid = nextUserLevelNumericId(library);
      working = { ...working, numericId: nid, code: userLevelCode(nid) };
    }
    const now = Date.now();
    const entryId = working.libraryId ?? makeUserLevelKey();
    const prev = library.find(e => e.id === entryId);
    const entry: StoredUserLevel = {
      id: entryId,
      name: working.name.trim() || working.title || '未命名关卡',
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
      config: draftToLevelConfig(working)
    };
    const { list, ok } = upsertUserLevel(entry);
    setLibrary(list);
    setDraft(d => ({
      ...d,
      libraryId: entry.id,
      numericId: working.numericId,
      code: working.code,
      name: entry.name
    }));
    window.alert(
      ok
        ? `已保存「${entry.name}」到我的关卡库。`
        : `「${entry.name}」保存失败：浏览器存储空间不足或不可用，请清理空间后重试。`
    );
  }, [library]);

  const handlePlaytest = useCallback(() => {
    const v = validateDraft(draftRef.current);
    if (v.errors.length) {
      window.alert('无法试玩，请先修复以下问题：\n' + v.errors.map(e => `· ${e}`).join('\n'));
      return;
    }
    const cfg = draftToLevelConfig(draftRef.current);
    onPlaytest(cfg.id < USER_LEVEL_ID_BASE ? { ...cfg, id: USER_LEVEL_ID_BASE } : cfg);
  }, [onPlaytest]);

  const handleExportCode = useCallback(() => {
    const code = encodeLevelShareCode(draftToLevelConfig(draftRef.current));
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => window.alert('分享码已复制到剪贴板。'),
        () => window.prompt('复制下方分享码：', code)
      );
    } else {
      window.prompt('复制下方分享码：', code);
    }
  }, []);

  const handleImportCode = useCallback(() => {
    const code = window.prompt('粘贴关卡分享码 (GT1....)：');
    if (!code) return;
    const level = decodeLevelShareCode(code);
    if (!level) {
      window.alert('分享码无效，请检查后重试。');
      return;
    }
    pushHistory();
    setDraft(draftFromLevelConfig(level, level.title));
    setSelected(null);
  }, [pushHistory]);

  const handleNew = useCallback(() => {
    if (!window.confirm('新建关卡将清空当前草稿（未保存的修改会丢失），继续？')) return;
    pushHistory();
    setDraft(createEmptyDraft());
    setSelected(null);
    setTool('select');
  }, [pushHistory]);

  const handleLoadEntry = useCallback(
    (entry: StoredUserLevel) => {
      pushHistory();
      setDraft({ ...draftFromLevelConfig(entry.config, entry.name), libraryId: entry.id });
      setSelected(null);
      setTool('select');
    },
    [pushHistory]
  );

  const handlePlayEntry = useCallback(
    (entry: StoredUserLevel) => {
      const v = validateDraft(draftFromLevelConfig(entry.config, entry.name));
      if (v.errors.length) {
        window.alert('该关卡存在未修复的问题：\n' + v.errors.map(e => `· ${e}`).join('\n'));
        return;
      }
      onPlaytest(entry.config.id < USER_LEVEL_ID_BASE ? { ...entry.config, id: USER_LEVEL_ID_BASE } : entry.config);
    },
    [onPlaytest]
  );

  const handleDeleteEntry = useCallback((entry: StoredUserLevel) => {
    if (!window.confirm(`删除「${entry.name}」？该操作不可撤销。`)) return;
    const { list, ok } = deleteUserLevel(entry.id);
    setLibrary(list);
    setDraft(d => (d.libraryId === entry.id ? { ...d, libraryId: null } : d));
    if (!ok) window.alert('删除操作未能写入存储（存储空间不足或不可用），刷新后可能恢复。');
  }, []);

  const patchDraft = useCallback(
    (patch: Partial<EditorDraft>) => {
      pushHistory('patch:' + Object.keys(patch).sort().join(','));
      setDraft(d => ({ ...d, ...patch }));
    },
    [pushHistory]
  );

  const patchObstacle = useCallback(
    (patch: Record<string, unknown>) => {
      const sel = selectedRef.current;
      if (!sel || sel.kind !== 'obstacle') return;
      const id = sel.id;
      pushHistory('obs:' + id + ':' + Object.keys(patch).sort().join(','));
      setDraft(d => ({
        ...d,
        obstacles: d.obstacles.map(o => (o.id === id ? ({ ...o, ...patch } as AnyObstacle) : o))
      }));
    },
    [pushHistory]
  );

  const copyEntryCode = useCallback((entry: StoredUserLevel) => {
    const code = encodeLevelShareCode(entry.config);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => window.alert('分享码已复制到剪贴板。'),
        () => window.prompt('复制下方分享码：', code)
      );
    } else {
      window.prompt('复制下方分享码：', code);
    }
  }, []);

  // --- derived selection ----------------------------------------------------

  const selObstacle =
    selected?.kind === 'obstacle'
      ? draft.obstacles.find(o => o.id === selected.id) ?? null
      : null;
  const selStar =
    selected?.kind === 'star' ? draft.stars.find(s => s.id === selected.id) ?? null : null;

  if (!isOpen) return null;

  const borderCls = isDark ? 'border-stone-800' : 'border-stone-200';
  const selectCls =
    'w-28 px-1.5 py-1 rounded-lg bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 text-xs focus:border-sky-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full h-full max-w-[1500px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* ------- Top bar ------- */}
        <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 border-b ${borderCls} shrink-0 overflow-x-auto`}>
          <div className="shrink-0">
            <div className="font-display font-bold text-sm md:text-base tracking-tight leading-tight">关卡编辑器</div>
            <div className="text-[10px] text-stone-500">几何贯穿 · 用户创作工坊</div>
          </div>

          <input
            value={draft.name}
            onChange={e => patchDraft({ name: e.target.value })}
            placeholder="关卡名称"
            className={`w-28 md:w-44 px-2.5 py-1.5 rounded-xl border text-xs bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border-stone-800 dark:border-stone-800 light:border-stone-300 focus:border-sky-500 focus:outline-none`}
          />
          <span className="px-2 py-1 rounded-full text-[10px] font-mono-tabular bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0">
            {draft.code}
          </span>

          {issues.errors.length > 0 ? (
            <span
              title={issues.errors.join('\n')}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/30 shrink-0"
            >
              <AlertTriangle className="w-3 h-3" /> {issues.errors.length} 项错误
            </span>
          ) : issues.warnings.length > 0 ? (
            <span
              title={issues.warnings.join('\n')}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0"
            >
              <AlertTriangle className="w-3 h-3" /> {issues.warnings.length} 条提示
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> 就绪
            </span>
          )}

          <div className="flex-1 min-w-2" />

          {/* Mobile panel toggles (drawers below md) */}
          <button
            onClick={() => setMobilePanel(p => (p === 'tools' ? null : 'tools'))}
            title="机关工具面板"
            className={`p-2 rounded-lg transition-colors shrink-0 md:hidden ${
              mobilePanel === 'tools'
                ? 'text-sky-300 bg-sky-500/15'
                : 'text-stone-400 hover:bg-stone-800/60 light:hover:bg-stone-100'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobilePanel(p => (p === 'props' ? null : 'props'))}
            title="属性与关卡库"
            className={`p-2 rounded-lg transition-colors shrink-0 md:hidden ${
              mobilePanel === 'props'
                ? 'text-sky-300 bg-sky-500/15'
                : 'text-stone-400 hover:bg-stone-800/60 light:hover:bg-stone-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!historyInfo.canUndo}
            title="撤销 (Ctrl+Z)"
            className={`p-2 rounded-lg transition-colors shrink-0 disabled:opacity-25 disabled:cursor-not-allowed ${
              historyInfo.canUndo
                ? 'text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 light:hover:bg-stone-100'
                : 'text-stone-400'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!historyInfo.canRedo}
            title="重做 (Ctrl+Shift+Z / Ctrl+Y)"
            className={`p-2 rounded-lg transition-colors shrink-0 disabled:opacity-25 disabled:cursor-not-allowed ${
              historyInfo.canRedo
                ? 'text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 light:hover:bg-stone-100'
                : 'text-stone-400'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleNew}
            title="新建空白关卡"
            className={`p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 light:hover:bg-stone-100 transition-colors shrink-0`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleImportCode}
            title="导入分享码到编辑器"
            className={`p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 light:hover:bg-stone-100 transition-colors shrink-0`}
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCode}
            title="导出当前草稿为分享码"
            className={`p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 light:hover:bg-stone-100 transition-colors shrink-0`}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium text-stone-950 bg-sky-400 hover:bg-sky-300 transition-colors shadow-lg shadow-sky-500/20 shrink-0"
          >
            <Save className="w-3.5 h-3.5" /> 保存
          </button>
          <button
            onClick={handlePlaytest}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> 试玩
          </button>
          <button
            onClick={onClose}
            title="关闭编辑器"
            className={`p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 light:hover:bg-stone-100 transition-colors shrink-0`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ------- Body ------- */}
        <div className="relative flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Mobile drawer backdrop */}
          {mobilePanel && (
            <div
              className="md:hidden absolute inset-0 z-10 bg-stone-950/50"
              onClick={() => setMobilePanel(null)}
            />
          )}

          {/* Palette: side rail on md+, left overlay drawer on mobile */}
          <div
            className={`${
              mobilePanel === 'tools'
                ? `absolute inset-y-0 left-0 z-20 w-56 max-w-[78vw] overflow-y-auto p-2 shadow-2xl ${
                    isDark ? 'bg-stone-900' : 'bg-white'
                  }`
                : 'hidden'
              } md:block md:w-44 md:overflow-y-auto p-2 border-b md:border-b-0 md:border-r ${borderCls}`
            }
          >
            <div className="md:hidden flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-xs font-semibold text-stone-400">机关工具</span>
              <button
                onClick={() => setMobilePanel(null)}
                className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800/60 light:hover:bg-stone-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-2 gap-1">
              {PALETTE.map(p => (
                <button
                  key={p.tool}
                  onClick={() => {
                    setTool(p.tool);
                    setMobilePanel(null); // pick-and-return on mobile
                  }}
                  title={TOOL_HINTS[p.tool]}
                  className={`flex md:flex-col xl:flex-row items-center justify-center md:justify-start gap-1 px-2 py-2.5 md:py-1.5 rounded-lg border text-[10px] md:text-[11px] transition-colors ${
                    tool === p.tool
                      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                      : isDark
                        ? 'border-stone-800 hover:border-stone-600 text-stone-400 hover:text-stone-200 bg-stone-950/40'
                        : 'border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-800 bg-stone-50'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="relative flex-1 min-h-[340px]">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 select-none touch-none cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-stone-950/70 border border-stone-800 text-[10px] text-stone-400 pointer-events-none whitespace-nowrap max-w-[92%] overflow-hidden text-ellipsis">
              {TOOL_HINTS[tool]}
            </div>
          </div>

          {/* Right column: inspector + meta + library (right overlay drawer on mobile) */}
          <div
            className={`${
              mobilePanel === 'props'
                ? `absolute inset-y-0 right-0 z-20 w-[320px] max-w-[85vw] overflow-y-auto p-3 shadow-2xl ${
                    isDark ? 'bg-stone-900' : 'bg-white'
                  }`
                : 'hidden'
              } md:block md:w-[320px] md:overflow-y-auto p-3 border-t md:border-t-0 md:border-l ${borderCls}`}
          >
            <div className="md:hidden flex items-center justify-between mb-2 px-0.5">
              <span className="text-xs font-semibold text-stone-400">属性与关卡库</span>
              <button
                onClick={() => setMobilePanel(null)}
                className="p-1.5 rounded-md text-stone-400 hover:bg-stone-800/60 light:hover:bg-stone-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Context-sensitive inspector */}
            {selObstacle && (
              <div className={`space-y-2.5 pb-4 border-b ${borderCls}`}>
                <SectionTitle accent="text-emerald-400">属性 · {selObstacle.id}</SectionTitle>
                <NumInput
                  label="X"
                  value={selObstacle.x}
                  onChange={v => patchObstacle({ x: Math.max(0, Math.min(draft.arenaWidth - selObstacle.width, v)) })}
                />
                <NumInput
                  label="Y"
                  value={selObstacle.y}
                  onChange={v => patchObstacle({ y: Math.max(0, Math.min(draft.arenaHeight - selObstacle.height, v)) })}
                />
                <NumInput
                  label="宽"
                  value={selObstacle.width}
                  onChange={v => patchObstacle({ width: Math.max(MIN_OBSTACLE_SIZE, Math.min(v, draft.arenaWidth)) })}
                />
                <NumInput
                  label="高"
                  value={selObstacle.height}
                  onChange={v => patchObstacle({ height: Math.max(MIN_OBSTACLE_SIZE, Math.min(v, draft.arenaHeight)) })}
                />

                {selObstacle.type === 'phase_barrier' && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-stone-400">实体朝向（其余方向可穿透）：</div>
                    <div className="flex gap-3 flex-wrap">
                      {([[0, '↓'], [1, '→'], [2, '↑'], [3, '←']] as [number, string][]).map(([val, sym]) => (
                        <CheckInput
                          key={val}
                          label={sym}
                          checked={(selObstacle.solidOrientations || []).includes(val)}
                          onChange={c => {
                            const cur = new Set(selObstacle.solidOrientations || []);
                            if (c) cur.add(val);
                            else cur.delete(val);
                            patchObstacle({ solidOrientations: Array.from(cur).sort((a, b) => a - b) });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selObstacle.type === 'sliding_block' && (
                  <>
                    <NumInput label="水平速度" value={selObstacle.vx} onChange={v => patchObstacle({ vx: v })} />
                    <NumInput label="垂直速度" value={selObstacle.vy} onChange={v => patchObstacle({ vy: v })} />
                    <NumInput label="轨道 minX" value={selObstacle.minX} onChange={v => patchObstacle({ minX: v })} />
                    <NumInput label="轨道 maxX" value={selObstacle.maxX} onChange={v => patchObstacle({ maxX: v })} />
                    <NumInput label="轨道 minY" value={selObstacle.minY} onChange={v => patchObstacle({ minY: v })} />
                    <NumInput label="轨道 maxY" value={selObstacle.maxY} onChange={v => patchObstacle({ maxY: v })} />
                    <NumInput label="质量" value={selObstacle.mass} onChange={v => patchObstacle({ mass: Math.max(1, v) })} />
                  </>
                )}

                {selObstacle.type === 'portal' && (
                  <>
                    <label className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-stone-400 shrink-0">目标折跃门</span>
                      <select
                        value={selObstacle.targetPortalId}
                        onChange={e => patchObstacle({ targetPortalId: e.target.value })}
                        className={selectCls}
                      >
                        <option value="">— 未设置 —</option>
                        {draft.obstacles
                          .filter(o => o.type === 'portal' && o.id !== selObstacle.id)
                          .map(o => (
                            <option key={o.id} value={o.id}>
                              {o.id}
                            </option>
                          ))}
                      </select>
                    </label>
                    <NumInput label="半径" value={selObstacle.radius} onChange={v => patchObstacle({ radius: Math.max(10, v) })} />
                    <NumInput
                      label="出射角偏移(°)"
                      value={Math.round(((selObstacle.outAngleOffset ?? 0) * 180) / Math.PI)}
                      onChange={v => patchObstacle({ outAngleOffset: (v * Math.PI) / 180 })}
                      step={15}
                    />
                  </>
                )}

                {selObstacle.type === 'laser_emitter' && (
                  <>
                    <DirSelect label="发射方向" value={selObstacle.direction} onChange={v => patchObstacle({ direction: v })} />
                    <CheckInput label="已激活" checked={selObstacle.active} onChange={v => patchObstacle({ active: v })} />
                    <NumInput
                      label="光束角度(°) 0右/90下"
                      value={selObstacle.angle ?? 0}
                      onChange={v => patchObstacle({ angle: ((Math.round(v) % 360) + 360) % 360 })}
                      step={15}
                    />
                    <div className="text-[10px] text-stone-500">留空或 0-355；设置后覆盖四向发射方向</div>
                  </>
                )}

                {selObstacle.type === 'mirror' && (
                  <>
                    <NumInput
                      label="镜面角度(°) 0水平/90竖直"
                      value={((Math.round(selObstacle.angle) % 360) + 360) % 360}
                      onChange={v => patchObstacle({ angle: ((Math.round(v) % 360) + 360) % 360 })}
                      step={15}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => patchObstacle({ angle: ((Math.round(selObstacle.angle) - 15) % 360 + 360) % 360 })}
                        className="px-2 py-1 rounded-lg border border-stone-700 text-[11px] text-stone-300 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors"
                      >
                        ↺ 15°
                      </button>
                      <button
                        type="button"
                        onClick={() => patchObstacle({ angle: (Math.round(selObstacle.angle) + 15) % 360 })}
                        className="px-2 py-1 rounded-lg border border-stone-700 text-[11px] text-stone-300 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors"
                      >
                        ↻ 15°
                      </button>
                      <button
                        type="button"
                        title="45° 步进：快速切到八向法线（含斜向镜）"
                        onClick={() => patchObstacle({ angle: ((Math.round(selObstacle.angle) - 45) % 360 + 360) % 360 })}
                        className="px-2 py-1 rounded-lg border border-stone-700 text-[11px] text-stone-400 hover:border-violet-500/60 hover:text-violet-300 transition-colors"
                      >
                        ↺ 45°
                      </button>
                      <button
                        type="button"
                        title="45° 步进：快速切到八向法线（含斜向镜）"
                        onClick={() => patchObstacle({ angle: (Math.round(selObstacle.angle) + 45) % 360 })}
                        className="px-2 py-1 rounded-lg border border-stone-700 text-[11px] text-stone-400 hover:border-violet-500/60 hover:text-violet-300 transition-colors"
                      >
                        ↻ 45°
                      </button>
                    </div>
                    <label className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-stone-400 shrink-0">反射面</span>
                      <select
                        value={selObstacle.reflectSide ?? 'both'}
                        onChange={e => patchObstacle({ reflectSide: e.target.value })}
                        className={selectCls}
                      >
                        <option value="both">双向反射</option>
                        <option value="front">单面镀银 · 正面</option>
                        <option value="back">单面镀银 · 背面</option>
                      </select>
                    </label>
                    {(selObstacle.reflectSide ?? 'both') !== 'both' && (
                      <div className="text-[10px] text-stone-500">
                        镜面正面（画布箭头侧）当前朝{mirrorFrontCompass(selObstacle.angle)}；仅镀银侧折返激光，玻璃侧放行
                      </div>
                    )}
                    <div className="text-[10px] text-stone-500">镜面仅作用于激光，对小球无碰撞</div>
                  </>
                )}

                {selObstacle.type === 'anti_gravity' && (
                  <>
                    <NumInput label="力场强度" value={selObstacle.force} onChange={v => patchObstacle({ force: v })} step={0.1} />
                    <label className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-stone-400 shrink-0">推力方向</span>
                      <select
                        value={selObstacle.direction ?? ''}
                        onChange={e => patchObstacle({ direction: e.target.value || undefined })}
                        className={selectCls}
                      >
                        <option value="">自动（逆重力）</option>
                        {DIR_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {selObstacle.type === 'bumper' && (
                  <>
                    <DirSelect label="弹射方向" value={selObstacle.direction} onChange={v => patchObstacle({ direction: v })} />
                    <NumInput label="弹射强度" value={selObstacle.strength} onChange={v => patchObstacle({ strength: Math.max(100, v) })} step={50} />
                  </>
                )}

                {selObstacle.type === 'one_way_gate' && (
                  <>
                    <DirSelect label="允许穿越方向" value={selObstacle.passDirection} onChange={v => patchObstacle({ passDirection: v })} />
                    <NumInput label="穿透速度阈值" value={selObstacle.tolerance ?? 30} onChange={v => patchObstacle({ tolerance: Math.max(0, v) })} step={5} />
                  </>
                )}

                {selObstacle.type === 'fragile_wall' && (
                  <>
                    <NumInput
                      label="耐久 (击打次数)"
                      value={selObstacle.hp}
                      onChange={v => patchObstacle({ hp: Math.max(1, Math.round(v)), maxHp: Math.max(1, Math.round(v)) })}
                    />
                    <NumInput
                      label="破碎冲击阈值"
                      value={selObstacle.impactThreshold ?? 220}
                      onChange={v => patchObstacle({ impactThreshold: Math.max(0, v) })}
                      step={10}
                    />
                  </>
                )}

                {selObstacle.type === 'pressure_plate' && (
                  <>
                    <label className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-stone-400 shrink-0">联动闸门</span>
                      <select
                        value={selObstacle.linkId}
                        onChange={e => patchObstacle({ linkId: e.target.value })}
                        className={selectCls}
                      >
                        <option value="">— 未设置 —</option>
                        {draft.obstacles
                          .filter(o => o.type === 'linked_gate')
                          .map(o => (
                            <option key={o.id} value={o.id}>
                              {o.id}
                            </option>
                          ))}
                      </select>
                    </label>
                    <CheckInput label="首次触发后永久保持" checked={!!selObstacle.latch} onChange={v => patchObstacle({ latch: v })} />
                  </>
                )}

                {selObstacle.type === 'linked_gate' && (
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {draft.obstacles.some(o => o.type === 'pressure_plate' && o.linkId === selObstacle.id)
                      ? '已有压力板控制此门，球体压板时开启。'
                      : '警告：尚无压力板关联此门，它将永远关闭。'}
                  </p>
                )}

                {selObstacle.type === 'hazard' && (
                  <p className="text-[11px] text-stone-500">触碰即碎裂的禁行区域，注意别把球起点放进去。</p>
                )}

                <button
                  onClick={removeSelected}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 删除该机关
                </button>
              </div>
            )}

            {selStar && (
              <div className={`space-y-2.5 pb-4 border-b ${borderCls}`}>
                <SectionTitle accent="text-amber-400">星核 · {selStar.id}</SectionTitle>
                <NumInput
                  label="X"
                  value={selStar.x}
                  onChange={v => patchDraft({ stars: draft.stars.map(s => (s.id === selStar.id ? { ...s, x: v } : s)) })}
                />
                <NumInput
                  label="Y"
                  value={selStar.y}
                  onChange={v => patchDraft({ stars: draft.stars.map(s => (s.id === selStar.id ? { ...s, y: v } : s)) })}
                />
                <button
                  onClick={removeSelected}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 删除该星核
                </button>
              </div>
            )}

            {selected?.kind === 'exit' && (
              <div className={`space-y-2.5 pb-4 border-b ${borderCls}`}>
                <SectionTitle>归元之门</SectionTitle>
                <NumInput label="X" value={draft.exit.x} onChange={v => patchDraft({ exit: { ...draft.exit, x: v } })} />
                <NumInput label="Y" value={draft.exit.y} onChange={v => patchDraft({ exit: { ...draft.exit, y: v } })} />
                <NumInput
                  label="半径"
                  value={draft.exit.radius}
                  onChange={v => patchDraft({ exit: { ...draft.exit, radius: Math.max(12, v) } })}
                />
                <NumInput
                  label="开门所需星核"
                  value={draft.exit.requiredStars}
                  min={1}
                  onChange={v => patchDraft({ exit: { ...draft.exit, requiredStars: Math.max(1, Math.round(v)) } })}
                />
              </div>
            )}

            {selected?.kind === 'ballstart' && (
              <div className={`space-y-2.5 pb-4 border-b ${borderCls}`}>
                <SectionTitle accent="text-cyan-400">球起点</SectionTitle>
                <NumInput label="X" value={draft.ballStart.x} onChange={v => patchDraft({ ballStart: { ...draft.ballStart, x: v } })} />
                <NumInput label="Y" value={draft.ballStart.y} onChange={v => patchDraft({ ballStart: { ...draft.ballStart, y: v } })} />
              </div>
            )}

            {/* Validation detail */}
            <div className={`space-y-1.5 py-4 border-b ${borderCls}`}>
              <SectionTitle accent={issues.errors.length ? 'text-red-400' : 'text-emerald-400'}>校验状态</SectionTitle>
              {issues.errors.length === 0 && issues.warnings.length === 0 && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 一切就绪，可保存或试玩
                </div>
              )}
              {issues.errors.map((e, i) => (
                <div key={`err${i}`} className="text-[11px] text-red-400 flex gap-1.5 leading-relaxed">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
              {issues.warnings.map((w, i) => (
                <div key={`warn${i}`} className="text-[11px] text-amber-400/90 flex gap-1.5 leading-relaxed">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>

            {/* Level meta */}
            <div className={`space-y-2.5 py-4 border-b ${borderCls}`}>
              <SectionTitle>关卡档案</SectionTitle>
              <TextInput label="标题" value={draft.title} onChange={v => patchDraft({ title: v })} />
              <TextInput label="副标题" value={draft.subtitle} onChange={v => patchDraft({ subtitle: v })} />
              <TextInput label="题记诗行" value={draft.poem} onChange={v => patchDraft({ poem: v })} area />
              <TextInput label="玩法说明" value={draft.instruction} onChange={v => patchDraft({ instruction: v })} area />
              {/* parRotations/parTime intentionally not editable here: the
                  move-budget standard was removed from the campaign UI — it
                  is technique-heavy and fixed budgets read as noise. The
                  fields survive in saved level codes for compatibility. */}
            </div>

            {/* Arena size */}
            <div className={`space-y-2.5 py-4 border-b ${borderCls}`}>
              <SectionTitle>竞技场尺寸</SectionTitle>
              <NumInput label="宽度" value={draft.arenaWidth} onChange={v => patchDraft({ arenaWidth: clampArenaValue(v) })} step={40} min={240} max={2000} />
              <NumInput label="高度" value={draft.arenaHeight} onChange={v => patchDraft({ arenaHeight: clampArenaValue(v) })} step={40} min={240} max={2000} />
            </div>

            {/* Physics overrides */}
            <div className={`space-y-3 py-4 border-b ${borderCls}`}>
              <SectionTitle>物理参数覆盖</SectionTitle>
              <div>
                <div className="flex justify-between text-[11px] font-medium mb-1">
                  <span>引力场强系数</span>
                  <span className="font-mono-tabular text-sky-400">{draft.physics.gravityScale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.1"
                  value={draft.physics.gravityScale}
                  onChange={e => patchDraft({ physics: { ...draft.physics, gravityScale: parseFloat(e.target.value) } })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-medium mb-1">
                  <span>弹性系数</span>
                  <span className="font-mono-tabular text-sky-400">{(draft.physics.restitution * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.85"
                  step="0.05"
                  value={draft.physics.restitution}
                  onChange={e => patchDraft({ physics: { ...draft.physics, restitution: parseFloat(e.target.value) } })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>

            {/* User level library */}
            <div className="pt-4 space-y-2">
              <SectionTitle accent="text-violet-400">
                <Library className="w-3.5 h-3.5" /> 我的关卡库 ({library.length})
              </SectionTitle>
              {library.length === 0 && (
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  还没有保存的关卡。编辑完成后点击顶部「保存」，或通过「导入分享码」把他人作品载入编辑器。
                </p>
              )}
              {library.map(entry => (
                <div
                  key={entry.id}
                  className={`p-2.5 rounded-xl border ${isDark ? 'border-stone-800 bg-stone-950/40' : 'border-stone-200 bg-stone-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{entry.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        {entry.config.code} · {entry.config.obstacles.length} 机关 ·{' '}
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button title="载入编辑" onClick={() => handleLoadEntry(entry)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-sky-400 transition-colors">
                        <MousePointer2 className="w-3.5 h-3.5" />
                      </button>
                      <button title="直接试玩" onClick={() => handlePlayEntry(entry)} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-emerald-400 transition-colors">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button title="复制分享码" onClick={() => copyEntryCode(entry)} className="p-1.5 rounded-lg hover:bg-violet-500/15 text-violet-400 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button title="删除" onClick={() => handleDeleteEntry(entry)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={handleImportCode}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-stone-700 dark:border-stone-700 light:border-stone-300 text-[11px] text-stone-400 hover:border-violet-500/50 hover:text-violet-300 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> 导入分享码到编辑器
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
