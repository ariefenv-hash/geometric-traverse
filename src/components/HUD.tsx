import React from 'react';
import {
  Grid,
  RotateCcw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  HelpCircle,
  FlaskConical,
  Star,
  Download
} from 'lucide-react';
import { LevelConfig, ThemeMode } from '../game/types';

interface HUDProps {
  currentLevel: LevelConfig;
  starsCollected: number;
  rotationsCount: number;
  elapsedTime: number;
  theme: ThemeMode;
  isMuted: boolean;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onResetLevel: () => void;
  onOpenLevelSelect: () => void;
  onOpenSandbox: () => void;
  onOpenGuide: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentLevel,
  starsCollected,
  rotationsCount,
  elapsedTime,
  theme,
  isMuted,
  onToggleTheme,
  onToggleMute,
  onResetLevel,
  onOpenLevelSelect,
  onOpenSandbox,
  onOpenGuide
}) => {
  const isDark = theme === 'dark';

  // Format time as MM:SS.S
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = (elapsedTime % 60).toFixed(1);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${seconds.padStart(4, '0')}`;

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
                }`}
              />
            );
          })}
        </div>

        <span aria-hidden="true" className="text-stone-600 dark:text-stone-700 light:text-stone-300 hidden sm:inline">·</span>

        {/* Rotations Count */}
        <div className="font-mono-tabular" title="当前旋转步数 / 标准参考步数">
          <span className="text-stone-100 dark:text-stone-100 light:text-stone-900 font-semibold">{rotationsCount}</span>
          <span className="text-stone-500 dark:text-stone-500 light:text-stone-400"> / {currentLevel.parRotations} 步</span>
        </div>

        <span aria-hidden="true" className="text-stone-600 dark:text-stone-700 light:text-stone-300 hidden sm:inline">·</span>

        {/* Elapsed Timer */}
        <div className="font-mono-tabular hidden sm:block text-stone-300 dark:text-stone-300 light:text-stone-700">
          {formattedTime}
        </div>
      </div>

      {/* Zone 3: Functional interactive action buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        
        {/* Sandbox Studio */}
        <button
          onClick={onOpenSandbox}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="几何物理沙盒实验室"
        >
          <FlaskConical className="w-4 h-4 text-purple-400" />
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

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title={isDark ? '切换至极简白垩模式' : '切换至深邃虚空模式'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Download Project ZIP */}
        <a
          href="/geometric-traverse.zip"
          download="geometric-traverse.zip"
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors"
          title="打包下载完整项目源码 (ZIP)"
        >
          <Download className="w-4 h-4 text-emerald-400" />
        </a>

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
