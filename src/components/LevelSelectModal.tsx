import React from 'react';
import { X, Star, Lock, CheckCircle2 } from 'lucide-react';
import { LevelConfig, LevelProgress, ThemeMode } from '../game/types';

interface LevelSelectModalProps {
  levels: LevelConfig[];
  currentLevelId: number;
  progress: Record<number, LevelProgress>;
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (id: number) => void;
  theme: ThemeMode;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  currentLevelId,
  progress,
  isOpen,
  onClose,
  onSelectLevel,
  theme
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const totalStars = Object.values(progress).reduce((acc, curr) => acc + (curr.starsEarned || 0), 0);
  const maxStars = levels.length * 3;
  const completedCount = Object.values(progress).filter(p => p.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 md:p-8 shadow-2xl transition-all ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-100'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-stone-800/60 dark:border-stone-800 light:border-stone-200">
          <div>
            <h2 className="font-display font-bold text-xl md:text-2xl tracking-tight">
              时空维度 · 关卡矩阵
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 dark:text-stone-400 light:text-stone-500 font-medium">
              <span>通关进度 {completedCount} / {levels.length}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>星核共鸣 {totalStars} / {maxStars}</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800/60 dark:hover:bg-stone-800 light:hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-6">
          {levels.map((lvl) => {
            const p = progress[lvl.id] || { unlocked: lvl.id === 1, completed: false, starsEarned: 0, bestRotations: 0, bestTime: 0 };
            const isCurrent = lvl.id === currentLevelId;
            const isUnlocked = p.unlocked;

            return (
              <button
                key={lvl.id}
                disabled={!isUnlocked}
                onClick={() => {
                  onSelectLevel(lvl.id);
                  onClose();
                }}
                className={`relative text-left p-4 rounded-xl border transition-all text-sm group ${
                  !isUnlocked
                    ? 'opacity-40 cursor-not-allowed bg-stone-950/20 border-stone-800/40'
                    : isCurrent
                    ? 'border-sky-500/80 bg-sky-500/10 shadow-lg'
                    : isDark
                    ? 'bg-stone-800/40 hover:bg-stone-800/80 border-stone-800 hover:border-stone-700'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Top Row: Code & Lock/Completed State */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-sky-400 font-semibold tracking-wider">
                    {lvl.code}
                  </span>
                  
                  {isUnlocked ? (
                    p.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[11px] text-stone-500">待挑战</span>
                    )
                  ) : (
                    <Lock className="w-4 h-4 text-stone-600" />
                  )}
                </div>

                {/* Level Title */}
                <div className="mt-2">
                  <div className="font-semibold text-base text-stone-100 dark:text-stone-100 light:text-stone-900 group-hover:text-sky-400 transition-colors">
                    {lvl.title}
                  </div>
                  <div className="text-xs text-stone-400 dark:text-stone-400 light:text-stone-500 font-normal">
                    {lvl.subtitle}
                  </div>
                </div>

                {/* Bottom Row: Stars & Best Stats */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-800/40 dark:border-stone-800/50 light:border-stone-200/60">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((sIdx) => (
                      <Star
                        key={sIdx}
                        className={`w-3.5 h-3.5 ${
                          sIdx < p.starsEarned
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]'
                            : 'text-stone-700 dark:text-stone-700 light:text-stone-300'
                        }`}
                      />
                    ))}
                  </div>

                  {p.completed && p.bestRotations > 0 && (
                    <div className="text-[11px] font-mono-tabular text-stone-400">
                      {p.bestRotations}步 · {p.bestTime.toFixed(1)}s
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
