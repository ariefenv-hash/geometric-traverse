/**
 * Real-gravity tilt controller ("体感" mode).
 *
 * Replaces the old beta/gamma heuristic with the actual gravity vector
 * projected into the screen plane, derived from the W3C DeviceOrientation
 * Z-X′-Y″ Tait-Bryan rotation: with g_world = (0,0,−1) and
 * R = Rz(α)·Rx(β)·Ry(γ), the device-frame gravity is g_device = Rᵀ·g.
 * The dot product only involves R's third row, so the projection is fully
 * independent of the compass angle α:
 *
 *     gX =  cosβ·sinγ    (device X axis — screen-right at sa=0)
 *     gY = −sinβ         (device Y axis — screen-up at sa=0)
 *
 * Sanity checks against the spec semantics (game frame: y points DOWN):
 *   γ=+90° (right edge sinks)  → gX=+1 → downhill faces right   ✓
 *   β=+90° (screen upright)    → downhill faces screen bottom   ✓
 * Being α-free it cannot hit the Euler gimbal lock that made the old
 * implementation jump wildly when the phone was held upright, and it never
 * needs the compass. "Tilt the device, gravity follows" — literally.
 *
 * Pipeline per sensor event:
 *   1. project gravity into the device plane (α-free, above)
 *   2. rotate into the screen frame via screen.orientation.angle (W3C table)
 *   3. EMA-smooth the projection as a *vector* (no angle-wrap artefacts)
 *   4. hysteresis deadzone (≈18°): a steady/flat hand parks gravity in place
 *   5. subtract the calibration zero and ease the output angle
 *
 * Calibration on attach: whatever tilt the device is held at becomes the
 * neutral pose. If it was flat, the first tilt direction becomes the gravity
 * direction directly; if it was already tilted, gravity stays exactly where
 * it was (zero jump) and tilting is relative from there.
 */

export type TiltStatus = 'active' | 'denied' | 'unavailable';

export interface TiltControllerOptions {
  /** Continuous gravity target, radians, game semantics (0 = screen-down, clockwise+). */
  onAngle: (angleRad: number) => void;
  /** 'denied' (permission refused) or 'unavailable' (no sensor events at all). */
  onStatus: (status: TiltStatus) => void;
}

/** Below this projected magnitude the device counts as held flat. */
const DEADZONE_ENTER = 0.3;
/** Hysteresis: must exceed this to leave the park state (≈18°→22° band). */
const DEADZONE_EXIT = 0.38;
/** Vector EMA factor per sensor event (~60 Hz ⇒ ≈90 ms time constant). */
const SMOOTH_VEC = 0.3;
/** Angular lerp per emitted update — tames residual jitter and wrap steps. */
const SMOOTH_ANG = 0.35;
/** First-event watchdog: desktops simply never fire deviceorientation. */
const FIRST_EVENT_TIMEOUT_MS = 1500;

const TWO_PI = Math.PI * 2;

function readScreenAngleDeg(): number {
  const so = (screen as { orientation?: { angle: number } }).orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  const wo = (window as unknown as { orientation?: number }).orientation;
  return typeof wo === 'number' ? wo : 0;
}

/** Shortest signed difference a→b, wrapped to (−π, π]. */
function shortDelta(a: number, b: number): number {
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d <= -Math.PI) d += TWO_PI;
  return d;
}

/** Pure math core, exported for regression tests. */
export function gravityProjection(
  betaDeg: number,
  gammaDeg: number
): { x: number; y: number; mag: number } {
  const b = (betaDeg * Math.PI) / 180;
  const g = (gammaDeg * Math.PI) / 180;
  const x = Math.cos(b) * Math.sin(g);
  const y = -Math.sin(b);
  return { x, y, mag: Math.hypot(x, y) };
}

/** W3C screen-orientation compensation: device frame → screen frame.
 *  0°:(x,y)  90°:(y,−x)  180°:(−x,−y)  270°:(−y,x) — one rotation form. */
export function toScreenFrame(
  x: number,
  y: number,
  screenAngleDeg: number
): { x: number; y: number } {
  const a = (screenAngleDeg * Math.PI) / 180;
  return {
    x: x * Math.cos(a) + y * Math.sin(a),
    y: -x * Math.sin(a) + y * Math.cos(a)
  };
}

export class TiltController {
  private opts: TiltControllerOptions;
  private handler = (e: DeviceOrientationEvent) => this.onEvent(e);
  private watchdog: number | null = null;
  private attached = false;
  private gotEvent = false;
  /** null until the first event; "was the device flat when attached?" */
  private flatAtAttach: boolean | null = null;
  /** Calibration zero (null until the device first leaves the deadzone). */
  private baseAngle: number | null = null;
  // EMA-filtered projection in the screen frame (unit ≈ g)
  private fx = 0;
  private fy = 0;
  private hasFilter = false;
  private parked = true;
  /** Last emitted output angle (starts at the game's current gravity). */
  private lastOut = 0;

  constructor(opts: TiltControllerOptions) {
    this.opts = opts;
  }

  static supported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  /** iOS 13+ requires an explicit user-gesture permission request. */
  static async requestPermission(): Promise<'granted' | 'denied' | 'implicit'> {
    const D = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (D && typeof D.requestPermission === 'function') {
      try {
        const res = await D.requestPermission();
        return res === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'denied';
      }
    }
    return 'implicit'; // no prompt API — events work or never fire
  }

  /** Seed the output with the game's current gravity angle (no-jump start). */
  setCurrentAngle(angleRad: number): void {
    this.lastOut = ((angleRad % TWO_PI) + TWO_PI) % TWO_PI;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.gotEvent = false;
    this.hasFilter = false;
    this.parked = true;
    this.baseAngle = null;
    this.flatAtAttach = null;
    window.addEventListener('deviceorientation', this.handler, true);
    this.watchdog = window.setTimeout(() => {
      if (!this.gotEvent) this.opts.onStatus('unavailable');
    }, FIRST_EVENT_TIMEOUT_MS);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('deviceorientation', this.handler, true);
    if (this.watchdog !== null) {
      window.clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  /** Pipeline core — also driven by debugInject() for headless testing. */
  private onEvent(e: DeviceOrientationEvent, screenAngleOverride?: number): void {
    if (e.beta === null || e.gamma === null) return;
    if (!this.gotEvent) {
      this.gotEvent = true;
      if (this.watchdog !== null) {
        window.clearTimeout(this.watchdog);
        this.watchdog = null;
      }
    }

    const b = (e.beta * Math.PI) / 180;
    const g = (e.gamma * Math.PI) / 180;
    const dx = Math.cos(b) * Math.sin(g); // α-free projection (module doc)
    const dy = -Math.sin(b);
    const sa =
      ((screenAngleOverride ?? readScreenAngleDeg()) * Math.PI) / 180;
    const sx = dx * Math.cos(sa) + dy * Math.sin(sa);
    const sy = -dx * Math.sin(sa) + dy * Math.cos(sa);

    // Vector EMA before atan2 → no wrap glitches
    if (!this.hasFilter) {
      this.fx = sx;
      this.fy = sy;
      this.hasFilter = true;
    } else {
      this.fx += (sx - this.fx) * SMOOTH_VEC;
      this.fy += (sy - this.fy) * SMOOTH_VEC;
    }
    const mag = Math.hypot(this.fx, this.fy);

    // Remember the attach pose on the very first reading
    if (this.flatAtAttach === null) this.flatAtAttach = mag < DEADZONE_ENTER;

    // Hysteresis deadzone: flat/steady device parks gravity where it was
    if (this.parked) {
      if (mag < DEADZONE_EXIT) return;
      this.parked = false;
    } else if (mag < DEADZONE_ENTER) {
      this.parked = true;
      return;
    }

    // First exit from the deadzone fixes the calibration zero.
    // NOTE the y negation: the projection lives in a Y-up device/screen
    // frame, while the game's 0-angle points along screen-DOWN (y+).
    const raw = Math.atan2(this.fx, -this.fy);
    if (this.baseAngle === null) {
      this.baseAngle = this.flatAtAttach ? 0 : raw - this.lastOut;
    }

    let out = raw - this.baseAngle;
    out = this.lastOut + shortDelta(this.lastOut, out) * SMOOTH_ANG;
    this.lastOut = ((out % TWO_PI) + TWO_PI) % TWO_PI;
    this.opts.onAngle(this.lastOut);
  }

  /**
   * Test/field-debug hook: push a synthetic reading through the full
   * pipeline without a sensor. Exposed on window as __gtTilt by the app.
   */
  debugInject(betaDeg: number, gammaDeg: number, screenAngleOverride?: number): void {
    this.onEvent(
      { beta: betaDeg, gamma: gammaDeg } as DeviceOrientationEvent,
      screenAngleOverride
    );
  }
}
