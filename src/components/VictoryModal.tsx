import React, { useEffect } from 'react';
import { Star, ArrowRight, RotateCcw, Grid, Award, Trophy, Skull, Sparkles } from 'lucide-react';
import { LevelConfig, PrismRating, ThemeMode } from '../game/types';
import { UnlockStats } from '../game/skins';

/** Per-victory bookkeeping computed in App against the pre-save progress. */
export interface VictoryStats {
  deathsTaken: number;
  rating: PrismRating;
  isNewBestRotations: boolean;
  isNewBestTime: boolean;
  prevBestRotations: number;
  prevBestTime: number;
  unlockedSkin: { id: string; name: string; accent: string; unlockHint?: string } | null;
}

interface VictoryModalProps {
  level: LevelConfig;
  starsEarned: number;
  rotationsTaken: number;
  elapsedTime: number;
  stats: VictoryStats | null;
  isOpen: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  /** Dismiss without any action (Esc / backdrop click). */
  onDismiss: () => void;
  hasNextLevel: boolean;
  /** Aggregate campaign stats — powers the endgame ceremony on the final level. */
  campaignStats: UnlockStats;
  theme: ThemeMode;
}

const RATING_STYLE: Record<PrismRating, { ring: string; text: string; label: string }> = {
  S: { ring: 'border-amber-400/60 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.35)]', text: 'text-amber-300', label: '棱镜 S · 完美贯穿' },
  A: { ring: 'border-sky-400/50 bg-sky-400/10', text: 'text-sky-300', label: '棱镜 A · 精准穿梭' },
  B: { ring: 'border-stone-500/40 bg-stone-500/10', text: 'text-stone-300', label: '棱镜 B · 顺利通关' }
};

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  starsEarned,
  rotationsTaken,
  elapsedTime,
  stats,
  isOpen,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  onDismiss,
  hasNextLevel,
  campaignStats,
  theme
}) => {
  // Esc dismisses the victory overlay. Hooks must run before the early
  // return; the listener is only attached while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const isFinalLevel = !hasNextLevel && level.id === 17;
  const rating = stats?.rating ?? 'B';
  const ratingStyle = RATING_STYLE[rating];

  // Record-breaking: only a genuine break (a previous best existed) counts.
  const brokeMoves = !!stats && stats.isNewBestRotations && stats.prevBestRotations > 0;
  const brokeTime = !!stats && stats.isNewBestTime && stats.prevBestTime > 0;
  const isRecord = brokeMoves || brokeTime;

  const isEndgame = isFinalLevel && campaignStats.completedCount >= campaignStats.totalLevels;

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
        <div className="flex items-center justify-center gap-4 my-5">
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

        {/* Prism Rating chip */}
        <div className="flex justify-center mb-5">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${ratingStyle.ring}`}>
            <span className={`font-display font-extrabold text-lg ${ratingStyle.text}`}>{rating}</span>
            <span className={`text-[11px] font-medium ${ratingStyle.text}`}>{ratingStyle.label}</span>
          </div>
        </div>

        {/* Record-break celebration: gold banner, shine sweep, geometric confetti */}
        {isRecord && stats && (
          <div className="relative overflow-hidden rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-amber-500/15 px-4 py-3 mb-4 record-shine">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              {RECORD_CONFETTI.map((style, i) => (
                <span key={i} className="record-confetti-piece" style={style} />
              ))}
            </div>
            <div className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              <Trophy className="w-4 h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
              <span className="font-display font-extrabold text-sm tracking-[0.3em] text-amber-300 animate-star-pop">
                新纪录
              </span>
              <span className="text-[11px] font-medium text-amber-200/85">
                {brokeMoves && brokeTime
                  ? `少 ${stats.prevBestRotations - rotationsTaken} 步 · 快 ${(stats.prevBestTime - elapsedTime).toFixed(1)}s`
                  : brokeMoves
                  ? `比上次最佳少 ${stats.prevBestRotations - rotationsTaken} 步`
                  : `比上次最佳快 ${(stats.prevBestTime - elapsedTime).toFixed(1)}s`}
              </span>
            </div>
          </div>
        )}

        {/* Editorial Performance Metrics */}
        <div className="grid grid-cols-3 gap-2 p-4 rounded-xl border border-stone-800/60 dark:border-stone-800 light:border-stone-200 bg-stone-950/40 dark:bg-stone-950/40 light:bg-stone-50/80 mb-4">
          <div>
            <div className="text-[11px] text-stone-400 font-medium">旋转步数</div>
            <div className="text-lg font-mono-tabular font-bold mt-0.5 text-stone-100 dark:text-stone-100 light:text-stone-900">
              {rotationsTaken}
            </div>
            <div className="text-[10px] mt-0.5">
              {stats?.isNewBestRotations && stats.prevBestRotations > 0 ? (
                <span className="text-amber-300">新纪录</span>
              ) : stats && stats.prevBestRotations > 0 ? (
                <span className="text-stone-500">最佳 {stats.prevBestRotations}</span>
              ) : (
                <span className="text-stone-500">首个记录</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-stone-400 font-medium">通关耗时</div>
            <div className="text-lg font-mono-tabular font-bold text-stone-100 dark:text-stone-100 light:text-stone-900 mt-0.5">
              {elapsedTime.toFixed(1)}s
            </div>
            <div className="text-[10px] mt-0.5">
              {stats?.isNewBestTime && stats.prevBestTime > 0 ? (
                <span className="text-amber-300">新纪录</span>
              ) : stats && stats.prevBestTime > 0 ? (
                <span className="text-stone-500">最佳 {stats.prevBestTime.toFixed(1)}s</span>
              ) : (
                <span className="text-stone-500">首个记录</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-stone-400 font-medium">湮灭次数</div>
            <div className="text-lg font-mono-tabular font-bold mt-0.5 flex items-center justify-center gap-1">
              <Skull className={`w-3.5 h-3.5 ${(stats?.deathsTaken ?? 0) === 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className={(stats?.deathsTaken ?? 0) === 0 ? 'text-emerald-400' : 'text-stone-200 dark:text-stone-100 light:text-stone-900'}>
                {stats?.deathsTaken ?? 0}
              </span>
            </div>
            <div className="text-[10px] mt-0.5 text-stone-500">
              {(stats?.deathsTaken ?? 0) === 0 ? '无伤贯穿' : '再接再厉'}
            </div>
          </div>
        </div>

        {/* Historical best line (when a prior record exists and wasn't broken) */}
        {stats && !stats.isNewBestRotations && stats.prevBestRotations > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 mb-3">
            <Trophy className="w-3 h-3 text-amber-400/70" />
            <span>历史最佳 {stats.prevBestRotations} 步 · {stats.prevBestTime.toFixed(1)}s</span>
          </div>
        )}

        {/* Skin unlock celebration */}
        {stats?.unlockedSkin && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 mb-4 text-left">
            <span
              className="w-8 h-8 rounded-full shrink-0 border border-white/20"
              style={{ background: `radial-gradient(circle at 32% 28%, #ffffff55, ${stats.unlockedSkin.accent})` }}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                解锁新皮肤 · {stats.unlockedSkin.name}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                前往 HUD 的调色盘按钮即可装备
              </div>
            </div>
          </div>
        )}

        {/* Endgame ceremony: final dimension, campaign complete */}
        {isEndgame && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-400/5 p-4 mb-4">
            <div className="text-xs font-bold text-amber-300 tracking-wider mb-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              全维度贯穿达成
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-mono-tabular font-bold text-amber-300">{campaignStats.completedCount}/{campaignStats.totalLevels}</div>
                <div className="text-[10px] text-stone-400">维度通关</div>
              </div>
              <div>
                <div className="text-lg font-mono-tabular font-bold text-amber-300">{campaignStats.totalStars}/{campaignStats.maxTotalStars}</div>
                <div className="text-[10px] text-stone-400">星核共鸣</div>
              </div>
              <div>
                <div className="text-lg font-mono-tabular font-bold text-amber-300">{campaignStats.sRatings}</div>
                <div className="text-[10px] text-stone-400">棱镜 S 评级</div>
              </div>
            </div>
            <div className="text-[10px] text-stone-400 mt-2.5 leading-relaxed">
              几何的旅程不会终点：继续冲击全 S 评级，或前往沙盒实验室与几何工坊创造属于你的维度。
            </div>
          </div>
        )}

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

/* One-shot geometric confetti burst for the record banner — deterministic
   (seeded by index) so re-renders never re-shuffle the pattern. */
const CONFETTI_COLORS = ['#fbbf24', '#34d399', '#38bdf8', '#fef3c7'];
const RECORD_CONFETTI: React.CSSProperties[] = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 3) * 0.38;
  const dist = 44 + (i % 4) * 24;
  const tx = Math.cos(angle) * dist;
  const ty = Math.sin(angle) * dist * 0.7 - 12;
  const rot = 130 + i * 103;
  const s = 5 + (i % 3) * 2;
  const shape = i % 3; // 0 diamond, 1 bar, 2 triangle
  const base: React.CSSProperties = {
    '--tx': `${tx.toFixed(1)}px`,
    '--ty': `${ty.toFixed(1)}px`,
    '--rot': `${rot}deg`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDelay: `${(i % 5) * 35}ms`
  } as React.CSSProperties;
  if (shape === 0) return { ...base, width: s, height: s, borderRadius: 1 };
  if (shape === 1) return { ...base, width: 3, height: s + 5 };
  return { ...base, width: s + 3, height: s + 3, clipPath: 'polygon(50% 0, 0 100%, 100% 100%)' };
});
