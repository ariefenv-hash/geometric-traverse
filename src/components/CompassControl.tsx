import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCcw, RotateCw, Compass, Sparkles, Smartphone } from 'lucide-react';
import { ThemeMode } from '../game/types';

interface CompassControlProps {
  gravityAngle: number;
  onRotateStep: (delta: number) => void;
  onSetAngle: (angle: number) => void;
  onNudgeBall: () => void;
  isGyroActive: boolean;
  onToggleGyro: () => void;
  theme: ThemeMode;
  continuous: boolean;
  onToggleContinuous: () => void;
  /** False while a modal (onboarding, guide, editor, …) owns the keyboard —
   *  the window-level shortcuts must not rotate gravity behind those UIs. */
  keyboardEnabled?: boolean;
}

export const CompassControl: React.FC<CompassControlProps> = ({
  gravityAngle,
  onRotateStep,
  onSetAngle,
  onNudgeBall,
  isGyroActive,
  onToggleGyro,
  theme,
  continuous,
  onToggleContinuous,
  keyboardEnabled = true
}) => {
  const isDark = theme === 'dark';
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Normalize angle to 0..360 for display
  const deg = Math.round(((gravityAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI));

  // Determine current active quadrant (0: Down, 1: Right, 2: Up, 3: Left)
  const quadrant = Math.round((deg / 90)) % 4;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Angle relative to positive Y (Down = 0 rad)
    // dy > 0, dx = 0 => 0 rad (down)
    // dx > 0, dy = 0 => PI/2 rad (right)
    let angle = Math.atan2(dx, dy);
    if (angle < 0) angle += Math.PI * 2;

    if (!continuous) {
      // Snap to nearest 90 deg
      const q = Math.round(angle / (Math.PI / 2)) % 4;
      angle = q * (Math.PI / 2);
    }

    onSetAngle(angle);
  }, [continuous, onSetAngle]);

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // A modal owns the keyboard (onboarding walkthrough, editor, …)
      if (!keyboardEnabled) return;
      // Don't trigger if user is typing in input
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)
      ) return;
      // Discrete actions must not machine-gun while a key is held down
      if (e.repeat) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        onRotateStep(-Math.PI / 2);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        onRotateStep(Math.PI / 2);
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        onRotateStep(Math.PI);
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        onSetAngle(0);
      } else if (e.key === ' ') {
        e.preventDefault();
        onNudgeBall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardEnabled, onRotateStep, onSetAngle, onNudgeBall]);

  return (
    <div className="flex flex-col items-center gap-2 select-none pointer-events-auto">
      {/* Central Dial & Rotation Controls Container */}
      <div className="flex items-center gap-3 md:gap-5 bg-stone-900/60 dark:bg-stone-950/70 light:bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-stone-800/80 dark:border-stone-800 light:border-stone-200 shadow-xl">
        
        {/* Counter-Clockwise 90 button */}
        <button
          onClick={() => onRotateStep(-Math.PI / 2)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
            isDark
              ? 'bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700/60'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-800 hover:text-stone-950 border border-stone-200'
          }`}
          title="逆时针旋转 90° (快捷键 A / Q / ←)"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline font-mono-tabular">-90°</span>
        </button>

        {/* Interactive Gravity Dial */}
        <div
          ref={dialRef}
          onPointerDown={handlePointerDown}
          onPointerMove={isDragging ? handlePointerMove : undefined}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-all ${
            isDark
              ? 'bg-stone-900 border-2 border-stone-700 hover:border-sky-500/80'
              : 'bg-stone-50 border-2 border-stone-300 hover:border-sky-600'
          }`}
          title="拖拽或滑动可平滑旋转重力视界"
        >
          {/* Degree ticks */}
          <div className="absolute inset-1 rounded-full border border-dashed border-stone-700/40 pointer-events-none" />

          {/* Cardinal direction indicators (0° Down, 90° Right, 180° Up, 270° Left) */}
          <div className={`absolute bottom-1 text-[9px] font-mono ${quadrant === 0 ? 'text-sky-400 font-bold' : 'text-stone-500'}`}>↓</div>
          <div className={`absolute right-1 text-[9px] font-mono ${quadrant === 1 ? 'text-sky-400 font-bold' : 'text-stone-500'}`}>→</div>
          <div className={`absolute top-1 text-[9px] font-mono ${quadrant === 2 ? 'text-sky-400 font-bold' : 'text-stone-500'}`}>↑</div>
          <div className={`absolute left-1 text-[9px] font-mono ${quadrant === 3 ? 'text-sky-400 font-bold' : 'text-stone-500'}`}>←</div>

          {/* Rotating Gravity Needle */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-150 ease-out"
            style={{ transform: `rotate(${deg}deg)` }}
          >
            {/* The needle points in the direction gravity pulls (Down = 0 deg) */}
            <div className="w-1.5 h-6 md:h-7 bg-gradient-to-b from-transparent via-sky-400 to-sky-300 rounded-full shadow-lg transform translate-y-3" />
            <div className="w-3 h-3 rounded-full bg-sky-400 absolute" />
          </div>

          {/* Center Degree Value */}
          <div className="absolute text-[10px] font-mono-tabular font-semibold text-stone-400 pointer-events-none">
            {deg}°
          </div>
        </div>

        {/* Clockwise 90 button */}
        <button
          onClick={() => onRotateStep(Math.PI / 2)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
            isDark
              ? 'bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700/60'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-800 hover:text-stone-950 border border-stone-200'
          }`}
          title="顺时针旋转 90° (快捷键 D / E / →)"
        >
          <span className="hidden sm:inline font-mono-tabular">+90°</span>
          <RotateCw className="w-4 h-4 text-sky-400" />
        </button>

        {/* Nudge / Pulse Ball button */}
        <button
          onClick={onNudgeBall}
          className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
            isDark
              ? 'bg-stone-800/40 hover:bg-stone-800 text-amber-400 border border-stone-700/40'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
          }`}
          title="轻微脉冲激荡小球 (快捷键 空格)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">微冲</span>
        </button>

        {/* Gyroscope Sensor Toggle button */}
        <button
          onClick={onToggleGyro}
          className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
            isGyroActive
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
              : isDark
              ? 'bg-stone-800/40 hover:bg-stone-800 text-stone-400 border border-stone-700/40'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200'
          }`}
          title={isGyroActive ? '陀螺仪体感重力已开启 (倾斜手机控制)' : '开启移动端陀螺仪体感重力'}
        >
          <Smartphone className={`w-3.5 h-3.5 ${isGyroActive ? 'text-sky-400 animate-pulse' : ''}`} />
          <span className="hidden md:inline">{isGyroActive ? '体感开' : '体感'}</span>
        </button>

        {/* Continuous vs Snap Mode Toggle */}
        <button
          onClick={onToggleContinuous}
          className={`hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
            continuous
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
              : isDark
              ? 'bg-stone-800/40 text-stone-400 border border-stone-700/40'
              : 'bg-stone-100 text-stone-600 border border-stone-200'
          }`}
          title="切换 90° 直角翻转 / 360° 平滑自由旋转模式"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{continuous ? '360°平滑' : '90°正交'}</span>
        </button>

      </div>

      {/* Keyboard Quick Guidance */}
      <div className="hidden md:flex items-center gap-3 text-[11px] text-stone-400 dark:text-stone-500">
        <span>键盘快捷键：<kbd className="px-1.5 py-0.5 rounded bg-stone-800/70 border border-stone-700 font-mono">Q</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-stone-800/70 border border-stone-700 font-mono">E</kbd> 旋转视界</span>
        <span aria-hidden="true">·</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-stone-800/70 border border-stone-700 font-mono">空格</kbd> 微冲</span>
        <span aria-hidden="true">·</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-stone-800/70 border border-stone-700 font-mono">R</kbd> 重置关卡</span>
      </div>
    </div>
  );
};
