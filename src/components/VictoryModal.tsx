import React from 'react';
import { Star, ArrowRight, RotateCcw, Grid, Award } from 'lucide-react';
import { LevelConfig, ThemeMode } from '../game/types';

interface VictoryModalProps {
  level: LevelConfig;
  starsEarned: number;
  rotationsTaken: number;
  elapsedTime: number;
  isOpen: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  hasNextLevel: boolean;
  theme: ThemeMode;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  starsEarned,
  rotationsTaken,
  elapsedTime,
  isOpen,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  hasNextLevel,
  theme
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const isParRotationsMet = rotationsTaken <= level.parRotations;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-md rounded-2xl border p-6 md:p-8 shadow-2xl text-center transition-all ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-100'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>
        
        {/* Subtle Decorative Geometry */}
        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Title & Level */}
        <div className="text-xs font-mono text-sky-400 font-semibold tracking-widest uppercase">
          {level.code} 视界贯穿完成
        </div>
        <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mt-1">
          {level.title}
        </h2>
        <div className="text-xs text-stone-400 mt-0.5">
          {level.subtitle}
        </div>
        {level.poem && (
          <div className="text-xs font-serif-title text-sky-400/90 dark:text-sky-300/90 light:text-sky-700 italic tracking-wider mt-2 px-2">
            「{level.poem}」
          </div>
        )}

        {/* Animated Stars */}
        <div className="flex items-center justify-center gap-4 my-6">
          {[0, 1, 2].map((idx) => {
            const hasStar = idx < starsEarned;
            return (
              <div
                key={idx}
                className={`relative flex items-center justify-center transition-transform duration-500 ${
                  hasStar ? 'scale-125' : 'scale-90 opacity-40'
                }`}
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <Star
                  className={`w-8 h-8 ${
                    hasStar
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                      : 'text-stone-700'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Editorial Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-stone-800/60 dark:border-stone-800 light:border-stone-200 bg-stone-950/40 dark:bg-stone-950/40 light:bg-stone-50/80 mb-6">
          <div>
            <div className="text-[11px] text-stone-400 font-medium">旋转步数</div>
            <div className="text-lg font-mono-tabular font-bold mt-0.5">
              <span className={isParRotationsMet ? 'text-emerald-400' : 'text-stone-200'}>
                {rotationsTaken}
              </span>
              <span className="text-xs text-stone-500 font-normal"> / {level.parRotations} 步</span>
            </div>
            {isParRotationsMet && (
              <div className="text-[10px] text-emerald-400 mt-0.5">达成极简标准</div>
            )}
          </div>

          <div>
            <div className="text-[11px] text-stone-400 font-medium">通关耗时</div>
            <div className="text-lg font-mono-tabular font-bold text-stone-100 dark:text-stone-100 light:text-stone-900 mt-0.5">
              {elapsedTime.toFixed(1)}s
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              参考 {level.parTime}s
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {hasNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-medium text-sm text-stone-950 bg-sky-400 hover:bg-sky-300 transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20"
            >
              <span>下一维度关卡</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onReplay}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-stone-800 hover:bg-stone-800 text-stone-300'
                  : 'border-stone-200 hover:bg-stone-100 text-stone-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>重新挑战</span>
            </button>

            <button
              onClick={onOpenLevelSelect}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-stone-800 hover:bg-stone-800 text-stone-300'
                  : 'border-stone-200 hover:bg-stone-100 text-stone-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>关卡矩阵</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
