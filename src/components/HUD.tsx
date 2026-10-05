import React, { useEffect, useRef, useState } from 'react';
import {
  Grid,
  RotateCcw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  HelpCircle,
  FlaskConical,
  Wrench,
  Star,
  Download,
  Vibrate,
  VibrateOff,
  Eraser,
  Palette,
  Skull,
  LifeBuoy,
  Gauge,
  ShieldCheck
} from 'lucide-react';
import { LevelConfig, ThemeMode } from '../game/types';
import { AssistPrefs } from '../game/settings';

interface HUDProps {
  currentLevel: LevelConfig;
  starsCollected: number;
  rotationsCount: number;
  elapsedTime: number;
  deathsCount: number;
  theme: ThemeMode;
  isMuted: boolean;
  isShakeOn: boolean;
  assist: AssistPrefs;
  onToggleAssistGravity: () => void;
  onToggleAssistSafe: () => void;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onToggleShake: () => void;
  onResetLevel: () => void;
  onOpenLevelSelect: () => void;
  onOpenSandbox: () => void;
  onOpenEditor: () => void;
  onOpenGuide: () => void;
  onOpenCachePurge: () => void;
  onOpenSkinPicker: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentLevel,
  starsCollected,
  rotationsCount,
  elapsedTime,
  deathsCount,
  theme,
  isMuted,
  isShakeOn,
  assist,
  onToggleAssistGravity,
  onToggleAssistSafe,
  onToggleTheme,
  onToggleMute,
  onToggleShake,
  onResetLevel,
  onOpenLevelSelect,
  onOpenSandbox,
  onOpenEditor,
  onOpenGuide,
  onOpenCachePurge,
  onOpenSkinPicker
}) => {
  const isDark = theme === 'dark';

  // Format time as MM:SS.S
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = (elapsedTime % 60).toFixed(1);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${seconds.padStart(4, '0')}`;

  // Star-collect pop: when the collected count rises, pulse the newest star.
  const prevStarsRef = useRef(starsCollected);
  const [popIdx, setPopIdx] = useState(-1);
  useEffect(() => {
    if (starsCollected > prevStarsRef.current) {
      setPopIdx(starsCollected - 1);
      const t = setTimeout(() => setPopIdx(-1), 650);
      prevStarsRef.current = starsCollected;
      return () => clearTimeout(t);
    }
    prevStarsRef.current = starsCollected;
  }, [starsCollected]);

  // Assist popover
  const [assistOpen, setAssistOpen] = useState(false);
  const assistRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!assistOpen) return;
    const onDown = (e: MouseEvent) => {
      if (assistRef.current && !assistRef.current.contains(e.target as Node)) {
        setAssistOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssistOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [assistOpen]);
  const assistActive = assist.lowGravity || assist.safeHazards;
  const suggestAssist = deathsCount >= 3 && !assistActive;

  return (
    <header className="w-full flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-stone-800/60 dark:border-stone-800/80 light:border-stone-200 select-none z-20 bg-stone-950/80 dark:bg-stone-950/85 light:bg-white/85 backdrop-blur-md">
      
      {/* Zone 1: Single text element wordmark with editorial numbering */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenLevelSelect}
          className="text-left group cursor-pointer"
          title="点击打开关卡列表"
        >
          <div className="font-display font-bold text-base md:text-lg tracking-tight text-stone-100 dark:text-stone-100 light:text-stone-900 group-hover:text-sky-400 transition-colors">
            几何贯穿
          </div>
          <div className="text-xs text-stone-400 dark:text-stone-400 light:text-stone-500 font-medium">
            {currentLevel.code}. {currentLevel.title}
          </div>
        </button>
      </div>

      {/* Zone 2: Clean unboxed metadata with typographic separators */}
      <div className="flex items-center gap-3 sm:gap-5 text-xs text-stone-400 dark:text-stone-400 light:text-stone-600 font-medium">
        
        {/* Celestial Stars */}
        <div className="flex items-center gap-1" title={`已收集 ${starsCollected} / ${currentLevel.stars.length} 颗星核`}>
          {currentLevel.stars.map((_, idx) => {
            const isFilled = idx < starsCollected;
            return (
              <Star
                key={idx}
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                    : 'text-stone-600 dark:text-stone-700 light:text-stone-300'
                } ${idx === popIdx ? 'animate-star-pop' : ''}`}
              />
            );
          })}
        </div>

        <span aria-hidden="true" className="text-stone-600 dark:text-stone-700 light:text-stone-300 hidden sm:inline">·</span>

        {/* Rotations Count */}
        <div className="font-mono-tabular" title="本次旋转步数">
          <span className="text-stone-100 dark:text-stone-100 light:text-stone-900 font-semibold">{rotationsCount}</span>
          <span className="text-stone-500 dark:text-stone-500 light:text-stone-400"> 步</span>
        </div>

        <span aria-hidden="true" className="text-stone-600 dark:text-stone-700 light:text-stone-300 hidden sm:inline">·</span>

        {/* Elapsed Timer */}
        <div className="font-mono-tabular hidden sm:block text-stone-300 dark:text-stone-300 light:text-stone-700">
          {formattedTime}
        </div>

        {/* Death counter — surfaced only once it matters (zero visual noise on flawless runs) */}
        {deathsCount > 0 && (
          <>
            <span aria-hidden="true" className="text-stone-600 dark:text-stone-700 light:text-stone-300 hidden sm:inline">·</span>
            <div
              className="flex items-center gap-1 font-mono-tabular text-rose-400"
              title={`本次挑战湮灭 ${deathsCount} 次`}
            >
              <Skull className="w-3.5 h-3.5" />
              <span>{deathsCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Zone 3: Functional interactive action buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        
        {/* Assist mode (popover) */}
        <div className="relative" ref={assistRef}>
          <button
            onClick={() => setAssistOpen(o => !o)}
            className={`relative p-2 rounded-lg transition-colors ${
              assistActive
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100'
            }`}
            title="辅助模式 · 低重力 / 危险不致死"
          >
            <LifeBuoy className={`w-4 h-4 ${assistActive ? 'text-emerald-400' : 'text-stone-400'}`} />
            {suggestAssist && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
            {suggestAssist && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          {assistOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-stone-800 dark:border-stone-800 light:border-stone-200 bg-stone-900 dark:bg-stone-900 light:bg-white shadow-2xl shadow-black/40 p-3 z-50">
              <div className="text-xs font-semibold text-stone-200 dark:text-stone-200 light:text-stone-800 mb-1 flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-emerald-400" />
                辅助模式
              </div>
              <p className="text-[10px] leading-relaxed text-stone-500 dark:text-stone-500 light:text-stone-500 mb-2.5">
                开关即时生效并自动保存。开启任一辅助后，当局通关仍会正常记录进度，但无法获得 S 级棱镜评级。
              </p>
              <button
                onClick={onToggleAssistGravity}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg mb-1.5 transition-colors ${
                  assist.lowGravity
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-stone-300 dark:text-stone-300 light:text-stone-700 hover:bg-stone-800/60 dark:hover:bg-stone-800/60 light:hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Gauge className="w-3.5 h-3.5" />
                  低重力 · 飘浮感
                </span>
                <span className={`w-8 h-4 rounded-full relative transition-colors ${assist.lowGravity ? 'bg-emerald-400' : 'bg-stone-700 dark:bg-stone-700 light:bg-stone-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${assist.lowGravity ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>
              <button
                onClick={onToggleAssistSafe}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                  assist.safeHazards
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-stone-300 dark:text-stone-300 light:text-stone-700 hover:bg-stone-800/60 dark:hover:bg-stone-800/60 light:hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  激光不致死 · 击退
                </span>
                <span className={`w-8 h-4 rounded-full relative transition-colors ${assist.safeHazards ? 'bg-emerald-400' : 'bg-stone-700 dark:bg-stone-700 light:bg-stone-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${assist.safeHazards ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Sandbox Studio */}
        <button
          onClick={onOpenSandbox}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="几何物理沙盒实验室"
        >
          <FlaskConical className="w-4 h-4 text-purple-400" />
        </button>

        {/* Level Editor */}
        <button
          onClick={onOpenEditor}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="关卡编辑器 · 设计你自己的几何迷宫"
        >
          <Wrench className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Level Select */}
        <button
          onClick={onOpenLevelSelect}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="选择关卡"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Reset Level */}
        <button
          onClick={onResetLevel}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="重置当前关卡 (快捷键 R)"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
        </button>

        {/* Camera Shake Toggle */}
        <button
          onClick={onToggleShake}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title={isShakeOn ? '关闭打击震感（相机震动）' : '开启打击震感（相机震动）'}
        >
          {isShakeOn ? <Vibrate className="w-4 h-4 text-rose-400" /> : <VibrateOff className="w-4 h-4 text-stone-500" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title={isDark ? '切换至极简白垩模式' : '切换至深邃虚空模式'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Download Project ZIP — relative href so it works on sub-path
            deployments (GitHub Pages project sites). Run `npm run zip` once
            before deploying; the script now emits into public/ so vite
            copies the archive into the build output. */}
        <a
          href="geometric-traverse.zip"
          download="geometric-traverse.zip"
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="打包下载完整项目源码 (ZIP)"
        >
          <Download className="w-4 h-4 text-emerald-400" />
        </a>

        {/* Ball skin picker */}
        <button
          onClick={onOpenSkinPicker}
          aria-label="星核皮肤"
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="星核皮肤 · 十种几何拓扑构型"
        >
          <Palette className="w-4 h-4 text-sky-300" />
        </button>

        {/* Thorough cache purge */}
        <button
          onClick={onOpenCachePurge}
          aria-label="清除缓存"
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="彻底清除缓存（进度/关卡库/教学记录/浏览器缓存）"
        >
          <Eraser className="w-4 h-4 text-rose-300" />
        </button>

        {/* Guide / Instructions */}
        <button
          onClick={onOpenGuide}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="操作指南与机制说明"
        >
          <HelpCircle className="w-4 h-4 text-stone-400" />
        </button>

      </div>
    </header>
  );
};
