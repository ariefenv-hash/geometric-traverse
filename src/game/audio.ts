/**
 * Procedural Generative Zen Audio Engine using Web Audio API.
 * High-immersion, zero-dependency procedural synthesis for minimalist geometric aesthetics.
 * Inspired by Monument Valley, Rez, and Osmos: interactive pentatonic chimes,
 * binaural harmonic drones, and resonant frequency sweeps.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private droneOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private isDronePlaying: boolean = false;

  // Pentatonic scale frequencies for melodic generative collisions (Eb Minor Pentatonic: Eb, Gb, Ab, Bb, Db)
  private pentatonicScale = [
    155.56, 185.00, 207.65, 233.08, 277.18, // Octave 3
    311.13, 369.99, 415.30, 466.16, 554.37, // Octave 4
    622.25, 739.99, 830.61, 932.33, 1108.73 // Octave 5
  ];
  // Per-sfx throttle stamps. They previously shared ONE field, so a bumper
  // twang would swallow a same-frame impact chime (and vice versa).
  private lastImpactTime: number = 0;
  private lastBumperTime: number = 0;
  private lastPlateTime: number = 0;

  constructor() {
    // Initialized on first user gesture
  }

  private initContext() {
    if (this.ctx) {
      // Any non-running state needs a resume — not just 'suspended'. iOS
      // Safari reports 'interrupted' after a phone call/alarm, and resume()
      // outside a user gesture rejects; swallow that instead of throwing an
      // unhandled rejection from a physics-triggered sound.
      if (this.ctx.state !== 'running') {
        this.ctx.resume().catch(() => {
          /* Needs a user gesture — the unlock listener will retry. */
        });
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isMusicEnabled ? 0.3 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      if (this.isMusicEnabled) {
        this.startDrone();
      }
    } catch {
      // Audio not supported in this environment
    }
  }

  public unlock() {
    this.initContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.75, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.3 : 0, this.ctx.currentTime, 0.1);
    }
    if (enabled && !this.isDronePlaying) {
      this.startDrone();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  /**
   * Generative ambient harmonic drone (Eb ethereal pad with subtle breathing LFO)
   */
  private startDrone() {
    if (!this.ctx || !this.musicGain || this.isDronePlaying) return;
    this.isDronePlaying = true;

    // Eb minor ambient chord layers: Eb2 (77.78), Bb2 (116.54), Gb3 (185.00), Db4 (277.18), F4 (349.23)
    const baseFreqs = [77.78, 116.54, 185.00, 277.18, 349.23];

    baseFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'sine' : idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Subtle slow frequency modulation (chorus/drift)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08 + idx * 0.03, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(1.8, this.ctx.currentTime);
      lfo.connect(osc.frequency);
      lfo.start();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 70, this.ctx.currentTime);

      // Soft envelope
      const baseVol = idx === 0 ? 0.08 : 0.04 / (idx + 0.5);
      gain.gain.setValueAtTime(baseVol, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start();
      this.droneOscillators.push({ osc, gain });
    });
  }

  /**
   * Melodic Pentatonic Impact: Plays an organic crystal glass/marimba tone
   * mapped to harmonic musical notes based on impact velocity.
   */
  public playImpact(speed: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Throttle micro impacts to avoid frequency clutter
    if (now - this.lastImpactTime < 0.06) return;
    this.lastImpactTime = now;

    const clampedSpeed = Math.min(Math.max(speed, 25), 450);
    const normalized = (clampedSpeed - 25) / 425;
    if (normalized < 0.04) return;

    // Pick a pentatonic note based on impact strength
    const noteIdx = Math.min(
      Math.floor(normalized * this.pentatonicScale.length),
      this.pentatonicScale.length - 1
    );
    const freq = this.pentatonicScale[noteIdx];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 0.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.5, now);

    const volume = Math.min(0.06 + normalized * 0.22, 0.28);
    // Soft attack: instant full-amplitude sine starts click audibly
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.38);

    // Subtle harmonic overtone (bell shimmer)
    if (normalized > 0.45) {
      const overtone = this.ctx.createOscillator();
      const overGain = this.ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2.0, now);

      overGain.gain.setValueAtTime(0.0001, now);
      overGain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.005);
      overGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      overtone.connect(overGain);
      overGain.connect(this.sfxGain);

      overtone.start(now);
      overtone.stop(now + 0.2);
    }

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && normalized > 0.4) {
      try {
        navigator.vibrate(Math.min(Math.round(normalized * 16), 25));
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Sound effect for gravity rotation / perspective shift
   */
  public playRotate() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Sub-bass sweep
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.32);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.25, now + 0.005);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.36);

    // Resonant spatial air shimmer
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, now);
    filter.Q.setValueAtTime(3.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Celestial crystal chime arpeggio for star collection
   */
  public playStarCollect(collectedCount: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const chordTones = [
      [622.25, 830.61, 932.33, 1244.50], // Eb5, Ab5, Bb5, Eb6
      [739.99, 932.33, 1108.73, 1479.98], // Gb5, Bb5, Db6, Gb6
      [830.61, 1108.73, 1244.50, 1661.22] // Ab5, Db6, Eb6, Ab6
    ];

    const chord = chordTones[(collectedCount - 1) % chordTones.length];
    const now = this.ctx.currentTime;

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);

      gain.gain.setValueAtTime(0, now + idx * 0.055);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.055 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.055 + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.6);
    });

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 30, 25]);
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Shimmering sound when passing through a phase barrier
   */
  public playPhasePass() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Portal warp sound
   */
  public playPortal() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(311.13, now);
    osc.frequency.linearRampToValueAtTime(830.61, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(207.65, now + 0.28);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Laser interception / ball vaporize
   */
  public playLaserHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 40, 50]);
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Springy launch twang for bumper pads
   */
  public playBumper() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Throttle to avoid substep spam (bumper has its own stamp so a bump no
    // longer silences a same-frame wall impact chime)
    if (now - this.lastBumperTime < 0.08) return;
    this.lastBumperTime = now;

    // Springy pitch rise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(392, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);

    // Soft low thump body
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, now);
    thump.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.linearRampToValueAtTime(0.16, now + 0.005);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    thump.connect(thumpGain);
    thumpGain.connect(this.sfxGain);
    thump.start(now);
    thump.stop(now + 0.16);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(14);
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Splintering crack: fragile wall losing one hit point
   */
  public playCrack() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Full structural collapse: fragile wall shattering
   */
  public playBreak() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Deep collapse rumble
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(160, now);
    rumble.frequency.exponentialRampToValueAtTime(38, now + 0.3);
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.2, now + 0.005);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumble.start(now);
    rumble.stop(now + 0.36);

    // Shattering shimmer cascade
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(880, now);
    shimmer.frequency.exponentialRampToValueAtTime(220, now + 0.22);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmer.start(now);
    shimmer.stop(now + 0.28);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 30, 40]);
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Soft mechanical click when a linked gate opens
   */
  public playPlate() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    if (now - this.lastPlateTime < 0.15) return;
    this.lastPlateTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.26, now + 0.06);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Triumphant level victory chord (Eb Major / Lydian celestial chord)
   */
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const chord = [311.13, 392.00, 466.16, 622.25, 783.99, 932.33]; // Eb Major 7th / 9th
    const now = this.ctx.currentTime;

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0, now + idx * 0.045);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.045 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.045);
      osc.stop(now + 1.7);
    });

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 60, 40, 80]);
      } catch {
        // Ignored
      }
    }
  }
}

export const sound = new SoundEngine();
