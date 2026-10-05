import {
  AnyObstacle,
  CardinalDirection,
  MirrorObstacle,
  ThemeMode
} from './types';
import { EditorDraft } from './editorDraft';
import { computeLaserSegments, emitterBeamDir, mirrorSurfaceSegment } from './physics';

// ---------------------------------------------------------------------------
// Editor canvas engine — schematic (blueprint-style) rendering + hit testing.
// Pure functions over <canvas>, no React. Reuses the arena coordinate system
// (top-left origin, px units) so what you place is what the physics sees.
// ---------------------------------------------------------------------------

export interface ArenaTransform {
  scale: number;
  ox: number; // screen offset of arena origin
  oy: number;
}

export type HitKind = 'obstacle' | 'star' | 'exit' | 'ballstart';

export interface HitTarget {
  kind: HitKind;
  id: string;      // obstacle id / star id / 'exit' / 'ballstart'
  index: number;   // index inside its array
}

const CANVAS_PAD = 28;

export function computeArenaTransform(
  width: number,
  height: number,
  arenaW: number,
  arenaH: number
): ArenaTransform {
  const scale = Math.max(
    0.05,
    Math.min((width - CANVAS_PAD * 2) / arenaW, (height - CANVAS_PAD * 2) / arenaH)
  );
  return {
    scale,
    ox: (width - arenaW * scale) / 2,
    oy: (height - arenaH * scale) / 2
  };
}

export function screenToArena(tf: ArenaTransform, sx: number, sy: number) {
  return { x: (sx - tf.ox) / tf.scale, y: (sy - tf.oy) / tf.scale };
}

export function arenaToScreen(tf: ArenaTransform, ax: number, ay: number) {
  return { x: tf.ox + ax * tf.scale, y: tf.oy + ay * tf.scale };
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

export function hitTest(draft: EditorDraft, ax: number, ay: number): HitTarget | null {
  // Obstacles first (they are the bulk of editing), reverse for topmost
  for (let i = draft.obstacles.length - 1; i >= 0; i--) {
    const o = draft.obstacles[i];
    if (ax >= o.x && ax <= o.x + o.width && ay >= o.y && ay <= o.y + o.height) {
      return { kind: 'obstacle', id: o.id, index: i };
    }
  }
  for (let i = 0; i < draft.stars.length; i++) {
    const s = draft.stars[i];
    if (Math.hypot(ax - s.x, ay - s.y) <= s.radius + 10) {
      return { kind: 'star', id: s.id, index: i };
    }
  }
  if (Math.hypot(ax - draft.exit.x, ay - draft.exit.y) <= draft.exit.radius + 10) {
    return { kind: 'exit', id: 'exit', index: 0 };
  }
  if (Math.hypot(ax - draft.ballStart.x, ay - draft.ballStart.y) <= 18) {
    return { kind: 'ballstart', id: 'ballstart', index: 0 };
  }
  return null;
}

/** Resize handle sits at the obstacle's bottom-right corner (screen space hit, 12px). */
export function hitResizeHandle(
  draft: EditorDraft,
  tf: ArenaTransform,
  selectedId: string | null,
  sx: number,
  sy: number
): boolean {
  if (!selectedId) return false;
  const o = draft.obstacles.find(ob => ob.id === selectedId);
  if (!o) return false;
  const p = arenaToScreen(tf, o.x + o.width, o.y + o.height);
  return Math.hypot(sx - p.x, sy - p.y) <= 12;
}

// ---------------------------------------------------------------------------
// Schematic drawing
// ---------------------------------------------------------------------------

interface Palette {
  body: string;
  edge: string;
  text: string;
}

const TYPE_COLORS: Record<string, Palette> = {
  wall: { body: 'rgba(148,163,184,0.45)', edge: '#94a3b8', text: '#e2e8f0' },
  phase_barrier: { body: 'rgba(56,189,248,0.14)', edge: '#38bdf8', text: '#7dd3fc' },
  sliding_block: { body: 'rgba(168,162,158,0.4)', edge: '#a8a29e', text: '#e7e5e4' },
  portal: { body: 'rgba(192,132,252,0.16)', edge: '#c084fc', text: '#e9d5ff' },
  laser_emitter: { body: 'rgba(248,113,113,0.35)', edge: '#f87171', text: '#fecaca' },
  anti_gravity: { body: 'rgba(34,211,238,0.10)', edge: '#22d3ee', text: '#a5f3fc' },
  hazard: { body: 'rgba(239,68,68,0.14)', edge: '#ef4444', text: '#fca5a5' },
  bumper: { body: 'rgba(52,211,153,0.30)', edge: '#34d399', text: '#d1fae5' },
  one_way_gate: { body: 'rgba(251,191,36,0.22)', edge: '#fbbf24', text: '#fde68a' },
  fragile_wall: { body: 'rgba(217,119,6,0.30)', edge: '#d97706', text: '#fde68a' },
  pressure_plate: { body: 'rgba(167,139,250,0.30)', edge: '#a78bfa', text: '#ede9fe' },
  linked_gate: { body: 'rgba(139,92,246,0.35)', edge: '#8b5cf6', text: '#ddd6fe' },
  mirror: { body: 'rgba(165,243,252,0.10)', edge: '#a5f3fc', text: '#cffafe' }
};

const TYPE_GLYPH: Record<string, string> = {
  wall: '墙',
  phase_barrier: '相',
  sliding_block: '滑',
  portal: '折',
  laser_emitter: '激',
  anti_gravity: '浮',
  hazard: '险',
  bumper: '弹',
  one_way_gate: '阀',
  fragile_wall: '脆',
  pressure_plate: '板',
  linked_gate: '锁',
  mirror: '镜'
};

const DIR_VEC: Record<CardinalDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: CardinalDirection,
  len: number,
  color: string,
  lw: number
) {
  const { dx, dy } = DIR_VEC[dir];
  const half = len / 2;
  const x0 = cx - dx * half;
  const y0 = cy - dy * half;
  const x1 = cx + dx * half;
  const y1 = cy + dy * half;
  const head = Math.min(10, len * 0.36);
  const px = -dy;
  const py = dx;

  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x1 - dx * head + px * head * 0.6, y1 - dy * head + py * head * 0.6);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - dx * head - px * head * 0.6, y1 - dy * head - py * head * 0.6);
  ctx.stroke();
}

function center(o: AnyObstacle) {
  return { cx: o.x + o.width / 2, cy: o.y + o.height / 2 };
}

/** Links & beams drawn beneath obstacle bodies. */
function drawLinkLayer(
  ctx: CanvasRenderingContext2D,
  draft: EditorDraft,
  lw: (px: number) => number,
  time: number
) {
  // Portal -> portal links
  for (const p of draft.obstacles) {
    if (p.type !== 'portal' || !p.targetPortalId) continue;
    const t = draft.obstacles.find(o => o.id === p.targetPortalId && o.type === 'portal');
    if (!t) continue;
    const a = center(p);
    const b = center(t);
    ctx.save();
    ctx.strokeStyle = 'rgba(192,132,252,0.75)';
    ctx.lineWidth = lw(1.5);
    ctx.setLineDash([lw(6), lw(5)]);
    ctx.lineDashOffset = -time * 24;
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
    // arrowhead at target
    const ang = Math.atan2(b.cy - a.cy, b.cx - a.cx);
    const hx = b.cx - Math.cos(ang) * (t.width / 2 + 6);
    const hy = b.cy - Math.sin(ang) * (t.height / 2 + 6);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(ang - 0.5) * 10, hy - Math.sin(ang - 0.5) * 10);
    ctx.lineTo(hx - Math.cos(ang + 0.5) * 10, hy - Math.sin(ang + 0.5) * 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192,132,252,0.85)';
    ctx.fill();
    ctx.restore();
  }

  // Plate -> gate links
  for (const plate of draft.obstacles) {
    if (plate.type !== 'pressure_plate' || !plate.linkId) continue;
    const gate = draft.obstacles.find(o => o.id === plate.linkId && o.type === 'linked_gate');
    if (!gate) continue;
    const a = center(plate);
    const b = center(gate);
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.6)';
    ctx.lineWidth = lw(1.2);
    ctx.setLineDash([lw(3), lw(4)]);
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
    ctx.restore();
  }

  // Laser beams — live multi-bounce optics preview (mirrors included)
  const beams = computeLaserSegments(draft.obstacles, draft.arenaWidth, draft.arenaHeight);
  ctx.save();
  ctx.strokeStyle = 'rgba(248,113,113,0.55)';
  ctx.lineWidth = lw(2);
  ctx.setLineDash([lw(10), lw(7)]);
  ctx.lineDashOffset = -time * 40;
  for (const b of beams) {
    ctx.beginPath();
    ctx.moveTo(b.startX, b.startY);
    ctx.lineTo(b.endX, b.endY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacleBody(
  ctx: CanvasRenderingContext2D,
  o: AnyObstacle,
  lw: (px: number) => number,
  time: number,
  /** arena→screen scale (EXCLUDING dpr). The old getTransform().a read
   *  dpr×scale, which inverted the visibility threshold under zoom and
   *  halved glyph sizes on HiDPI displays. */
  scale: number
) {
  const pal = TYPE_COLORS[o.type] || TYPE_COLORS.wall;
  const { cx, cy } = center(o);

  ctx.save();
  ctx.fillStyle = pal.body;
  ctx.strokeStyle = pal.edge;
  ctx.lineWidth = lw(1.5);

  switch (o.type) {
    case 'wall':
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      break;

    case 'phase_barrier': {
      // translucent slab + dashed outline (permeable feel)
      ctx.setLineDash([lw(5), lw(4)]);
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      ctx.setLineDash([]);
      // solid edges per orientation: 0 down, 1 right, 2 up, 3 left
      const solids: number[] = (o as { solidOrientations: number[] }).solidOrientations || [];
      ctx.lineWidth = lw(3.5);
      ctx.beginPath();
      if (solids.includes(0)) { ctx.moveTo(o.x, o.y + o.height); ctx.lineTo(o.x + o.width, o.y + o.height); }
      if (solids.includes(2)) { ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.width, o.y); }
      if (solids.includes(3)) { ctx.moveTo(o.x, o.y); ctx.lineTo(o.x, o.y + o.height); }
      if (solids.includes(1)) { ctx.moveTo(o.x + o.width, o.y); ctx.lineTo(o.x + o.width, o.y + o.height); }
      ctx.stroke();
      break;
    }

    case 'sliding_block': {
      const sb = o as Extract<AnyObstacle, { type: 'sliding_block' }>;
      // rails
      ctx.save();
      ctx.strokeStyle = 'rgba(168,162,158,0.4)';
      ctx.setLineDash([lw(4), lw(4)]);
      ctx.lineWidth = lw(1);
      if (sb.maxX > sb.minX) {
        const ry = sb.y + sb.height / 2;
        ctx.beginPath();
        ctx.moveTo(sb.minX, ry);
        ctx.lineTo(sb.maxX + sb.width, ry);
        ctx.stroke();
      }
      if (sb.maxY > sb.minY) {
        const rx = sb.x + sb.width / 2;
        ctx.beginPath();
        ctx.moveTo(rx, sb.minY);
        ctx.lineTo(rx, sb.maxY + sb.height);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      break;
    }

    case 'portal': {
      const r = Math.min(o.width, o.height) / 2 - 2;
      ctx.lineWidth = lw(2);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55 + Math.sin(time * 3) * lw(1.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pal.edge;
      ctx.beginPath();
      ctx.arc(cx, cy, lw(2.5), 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'laser_emitter': {
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      // Rotated barrel reflects the free-angle beam direction
      const { dx: ldx, dy: ldy } = emitterBeamDir(o);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(ldy, ldx));
      ctx.strokeStyle = '#fef2f2';
      ctx.lineWidth = lw(2.4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.min(o.width, o.height) * 0.9, 0);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'mirror': {
      const m = o as MirrorObstacle;
      const seg = mirrorSurfaceSegment(m);
      // Housing box (faint) + bright reflective surface line
      ctx.globalAlpha = 0.4;
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.edge;
      ctx.lineWidth = lw(3);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (const [px, py] of [[seg.x1, seg.y1], [seg.x2, seg.y2]] as const) {
        ctx.beginPath();
        ctx.arc(px, py, lw(2), 0, Math.PI * 2);
        ctx.fill();
      }
      // Half-silvered mirror: arrow marks the silvered side; the glass side
      // gets a dashed backing line (light passes through there).
      const side = m.reflectSide ?? 'both';
      if (side !== 'both') {
        const rad = (m.angle * Math.PI) / 180;
        const nx = -Math.sin(rad);
        const ny = Math.cos(rad);
        const sign = side === 'front' ? 1 : -1;
        const midX = (seg.x1 + seg.x2) / 2;
        const midY = (seg.y1 + seg.y2) / 2;
        const off = lw(10);
        // Arrow head on the silvered side
        ctx.fillStyle = pal.edge;
        ctx.beginPath();
        ctx.moveTo(midX + nx * sign * off * 1.6, midY + ny * sign * off * 1.6);
        ctx.lineTo(midX + ny * sign * off * 0.7, midY - nx * sign * off * 0.7);
        ctx.lineTo(midX - ny * sign * off * 0.7, midY + nx * sign * off * 0.7);
        ctx.closePath();
        ctx.fill();
        // Glass side dashed backing
        ctx.strokeStyle = 'rgba(148,163,184,0.55)';
        ctx.lineWidth = lw(1);
        ctx.setLineDash([lw(3), lw(4)]);
        ctx.beginPath();
        ctx.moveTo(seg.x1 - nx * sign * off, seg.y1 - ny * sign * off);
        ctx.lineTo(seg.x2 - nx * sign * off, seg.y2 - ny * sign * off);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    }

    case 'anti_gravity': {
      ctx.setLineDash([lw(6), lw(4)]);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      ctx.setLineDash([]);
      const ag = o as Extract<AnyObstacle, { type: 'anti_gravity' }>;
      const dir: CardinalDirection = ag.direction === 'down' ? 'down' : 'up';
      const { dx: adx, dy: ady } = DIR_VEC[dir];
      for (let k = -1; k <= 1; k++) {
        // chevrons spread along the axis perpendicular to the push direction
        const px = cx + -ady * k * (o.width / 4.2);
        const py = cy + adx * k * (o.height / 4.2);
        drawArrow(ctx, px, py, dir, Math.min(o.width, o.height) * 0.34, pal.edge, lw(1.6));
      }
      break;
    }

    case 'hazard': {
      ctx.fillRect(o.x, o.y, o.width, o.height);
      // cross hatch
      ctx.save();
      ctx.beginPath();
      ctx.rect(o.x, o.y, o.width, o.height);
      ctx.clip();
      ctx.strokeStyle = pal.edge;
      ctx.lineWidth = lw(1);
      const step = 14;
      for (let d = -o.height; d < o.width + o.height; d += step) {
        ctx.beginPath();
        ctx.moveTo(o.x + d, o.y);
        ctx.lineTo(o.x + d + o.height, o.y + o.height);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      break;
    }

    case 'bumper': {
      const bp = o as Extract<AnyObstacle, { type: 'bumper' }>;
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      drawArrow(ctx, cx, cy, bp.direction, Math.min(o.width, o.height) * 0.85, '#ecfdf5', lw(2));
      break;
    }

    case 'one_way_gate': {
      const og = o as Extract<AnyObstacle, { type: 'one_way_gate' }>;
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      drawArrow(ctx, cx, cy, og.passDirection, Math.min(o.width, o.height) * 0.85, '#fffbeb', lw(2));
      break;
    }

    case 'fragile_wall': {
      const fw = o as Extract<AnyObstacle, { type: 'fragile_wall' }>;
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      // hp pips
      const hp = Math.max(1, Math.min(6, fw.hp || 1));
      const pipW = Math.min(10, (o.width - 8) / hp);
      for (let i = 0; i < hp; i++) {
        ctx.fillStyle = pal.edge;
        ctx.fillRect(o.x + 4 + i * (pipW + 3), o.y + o.height - 6, pipW, 2.5);
      }
      // crack marks
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = lw(1);
      ctx.beginPath();
      ctx.moveTo(o.x + o.width * 0.3, o.y + 2);
      ctx.lineTo(o.x + o.width * 0.42, o.y + o.height * 0.55);
      ctx.lineTo(o.x + o.width * 0.34, o.y + o.height - 2);
      ctx.stroke();
      break;
    }

    case 'pressure_plate': {
      const pp = o as Extract<AnyObstacle, { type: 'pressure_plate' }>;
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      if (pp.latch) {
        ctx.setLineDash([lw(2), lw(2)]);
        ctx.strokeRect(o.x + 3, o.y + 3, o.width - 6, o.height - 6);
        ctx.setLineDash([]);
      }
      break;
    }

    case 'linked_gate': {
      const lg = o as Extract<AnyObstacle, { type: 'linked_gate' }>;
      // closed = solid body; open ghost = dashed
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      if (lg.open) {
        ctx.setLineDash([lw(4), lw(4)]);
        ctx.strokeRect(o.x - 3, o.y - 3, o.width + 6, o.height + 6);
        ctx.setLineDash([]);
      }
      break;
    }
  }

  // Type glyph (skip if the rect is too small on screen)
  const scrW = o.width * scale;
  const scrH = o.height * scale;
  if (scrW > 20 && scrH > 14) {
    ctx.fillStyle = pal.text;
    ctx.font = `${11 / (scale || 1)}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TYPE_GLYPH[o.type] || '?', cx, cy - (o.type === 'fragile_wall' ? 3 : 0));
  }
  ctx.restore();
}

export interface EditorView {
  width: number;
  height: number;
  theme: ThemeMode;
}

export interface EditorUIState {
  selectedId: string | null;
  selectedKind: HitKind | null;
  time: number;
}

export function drawEditorScene(
  ctx: CanvasRenderingContext2D,
  draft: EditorDraft,
  view: EditorView,
  ui: EditorUIState
) {
  const { width, height, theme } = view;
  const isDark = theme === 'dark';

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isDark ? '#06070b' : '#eef2f7';
  ctx.fillRect(0, 0, width, height);

  const tf = computeArenaTransform(width, height, draft.arenaWidth, draft.arenaHeight);
  const s = tf.scale;
  const W = draft.arenaWidth;
  const H = draft.arenaHeight;

  ctx.save();
  ctx.translate(tf.ox, tf.oy);
  ctx.scale(s, s);
  const L = (px: number) => px / s;

  // Arena surface
  ctx.fillStyle = isDark ? '#0a0c12' : '#fbfdff';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.10)' : 'rgba(71,85,105,0.12)';
  ctx.lineWidth = L(1);
  ctx.beginPath();
  for (let gx = 0; gx <= W; gx += 40) {
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
  }
  for (let gy = 0; gy <= H; gy += 40) {
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
  }
  ctx.stroke();

  // Arena border
  ctx.strokeStyle = isDark ? 'rgba(56,189,248,0.35)' : 'rgba(14,116,144,0.45)';
  ctx.lineWidth = L(2);
  ctx.strokeRect(0, 0, W, H);

  // Links & beams beneath bodies
  drawLinkLayer(ctx, draft, L, ui.time);

  // Obstacle bodies
  for (const o of draft.obstacles) {
    drawObstacleBody(ctx, o, L, ui.time, s);
  }

  // Stars
  for (const st of draft.stars) {
    ctx.save();
    const pulse = 1 + Math.sin(ui.time * 2.4 + st.pulsePhase) * 0.08;
    ctx.fillStyle = 'rgba(251,191,36,0.18)';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.radius * 1.9 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = L(1.4);
    ctx.beginPath();
    ctx.moveTo(st.x - st.radius * 1.5, st.y);
    ctx.lineTo(st.x + st.radius * 1.5, st.y);
    ctx.moveTo(st.x, st.y - st.radius * 1.5);
    ctx.lineTo(st.x, st.y + st.radius * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  // Exit gate
  ctx.save();
  ctx.strokeStyle = isDark ? '#7dd3fc' : '#0ea5e9';
  ctx.lineWidth = L(2.5);
  ctx.beginPath();
  ctx.arc(draft.exit.x, draft.exit.y, draft.exit.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([L(4), L(4)]);
  ctx.lineWidth = L(1.2);
  ctx.beginPath();
  ctx.arc(draft.exit.x, draft.exit.y, draft.exit.radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = isDark ? '#7dd3fc' : '#0ea5e9';
  ctx.font = `${L(11)}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('归元', draft.exit.x, draft.exit.y);
  ctx.restore();

  // Ball start
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.fillStyle = 'rgba(56,189,248,0.2)';
  ctx.lineWidth = L(1.8);
  ctx.beginPath();
  ctx.arc(draft.ballStart.x, draft.ballStart.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(draft.ballStart.x - 20, draft.ballStart.y);
  ctx.lineTo(draft.ballStart.x + 20, draft.ballStart.y);
  ctx.moveTo(draft.ballStart.x, draft.ballStart.y - 20);
  ctx.lineTo(draft.ballStart.x, draft.ballStart.y + 20);
  ctx.stroke();
  ctx.restore();

  // Selection highlight
  if (ui.selectedId && ui.selectedKind) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = L(2);
    ctx.setLineDash([L(6), L(4)]);
    ctx.lineDashOffset = -ui.time * 30;
    if (ui.selectedKind === 'obstacle') {
      const o = draft.obstacles.find(ob => ob.id === ui.selectedId);
      if (o) ctx.strokeRect(o.x - 3, o.y - 3, o.width + 6, o.height + 6);
    } else if (ui.selectedKind === 'star') {
      const st = draft.stars.find(x => x.id === ui.selectedId);
      if (st) {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (ui.selectedKind === 'exit') {
      ctx.beginPath();
      ctx.arc(draft.exit.x, draft.exit.y, draft.exit.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(draft.ballStart.x, draft.ballStart.y, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();

  // Resize handle (screen space) for selected obstacle
  if (ui.selectedKind === 'obstacle' && ui.selectedId) {
    const o = draft.obstacles.find(ob => ob.id === ui.selectedId);
    if (o) {
      const p = arenaToScreen(tf, o.x + o.width, o.y + o.height);
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(p.x - 5, p.y - 5, 10, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Draft name watermark
  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.25)' : 'rgba(51,65,85,0.3)';
  ctx.font = '11px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `${draft.code} · ${W}×${H}`,
    tf.ox + 6,
    tf.oy + 6
  );
  ctx.restore();
}
