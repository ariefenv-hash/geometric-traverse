import React, { useEffect, useState } from 'react';
import { X, Flame, Trophy, CalendarDays, Copy, Check, Play, Info } from 'lucide-react';
import type { LevelConfig, PrismRating, ThemeMode } from '../game/types';

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  dateKey: string;
  levels: LevelConfig[];
  todayRatings: PrismRating[] | null;
  streak: number;
  bestStreak: number;
  totalCompletes: number;
  onStart: () => void;
}

const RATING_COLOR: Record<PrismRating, string> = {
  S: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  A: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
  B: 'text-sky-400 border-sky-400/40 bg-sky-400/10'
};

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  isOpen,
  onClose,
  theme,
  dateKey,
  levels,
  todayRatings,
  streak,
  bestStreak,
  totalCompletes,
  onStart
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';
  const done = !!todayRatings;

  const shareText = [
    `几何贯穿·每日挑战 ${dateKey}`,
    done ? todayRatings!.map(r => `${r}`).join(' ') + ' 全三星达成' : '',
    streak > 0 ? `连胜 ${streak} 天，今天也来贯穿引力吧` : '来挑战你的引力操作',
    'https://ariefenv-hash.github.io/geometric-traverse/'
  ].filter(Boolean).join('\n');

  const handleCopy = () => {
    const finish = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareText).then(finish, () => window.prompt('复制下方战报：', shareText));
    } else {
      window.prompt('复制下方战报：', shareText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-100'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isDark ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-800' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
          }`}
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-tight">每日挑战</h2>
            <p className={`text-[11px] ${isDark ? 'text-stone-500' : 'text-stone-500'}`}>{dateKey} · 连闯 3 关 · 全程一气呵成</p>
          </div>
        </div>

        {/* Streak stats */}
        <div className="grid grid-cols-3 gap-2 my-4">
          <div className={`rounded-xl border p-2.5 text-center ${isDark ? 'border-stone-800 bg-stone-950/60' : 'border-stone-200 bg-stone-50'}`}>
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-xl font-extrabold leading-none">{streak}</span>
            </div>
            <div className={`text-[10px] mt-1 ${isDark ? 'text-stone-500' : 'text-stone-500'}`}>当前连胜</div>
          </div>
          <div className={`rounded-xl border p-2.5 text-center ${isDark ? 'border-stone-800 bg-stone-950/60' : 'border-stone-200 bg-stone-50'}`}>
            <div className="flex items-center justify-center gap-1 text-emerald-400">
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-xl font-extrabold leading-none">{bestStreak}</span>
            </div>
            <div className={`text-[10px] mt-1 ${isDark ? 'text-stone-500' : 'text-stone-500'}`}>最长连胜</div>
          </div>
          <div className={`rounded-xl border p-2.5 text-center ${isDark ? 'border-stone-800 bg-stone-950/60' : 'border-stone-200 bg-stone-50'}`}>
            <div className="flex items-center justify-center gap-1 text-sky-400">
              <Check className="w-3.5 h-3.5" />
              <span className="text-xl font-extrabold leading-none">{totalCompletes}</span>
            </div>
            <div className={`text-[10px] mt-1 ${isDark ? 'text-stone-500' : 'text-stone-500'}`}>累计完成</div>
          </div>
        </div>

        {/* Today's levels */}
        <div className={`rounded-xl border overflow-hidden mb-4 ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
          {levels.map((lv, i) => {
            const r = todayRatings?.[i];
            return (
              <div
                key={lv.id}
                className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? (isDark ? 'border-t border-stone-800' : 'border-t border-stone-200') : ''}`}
              >
                <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isDark ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
                }`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{lv.title}</div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-stone-500' : 'text-stone-500'}`}>{lv.subtitle}</div>
                </div>
                {r ? (
                  <span className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-extrabold ${RATING_COLOR[r]}`}>{r}</span>
                ) : (
                  <span className={`shrink-0 text-xs ${isDark ? 'text-stone-600' : 'text-stone-400'}`}>待闯</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!done ? (
            <button
              onClick={onStart}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
            >
              <Play className="w-4 h-4" />
              开始挑战
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-emerald-400/40 bg-emerald-400/10 text-emerald-400">
              <Check className="w-4 h-4" />
              今日已完成
            </div>
          )}
          {done && (
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                isDark ? 'border-stone-700 hover:bg-stone-800' : 'border-stone-300 hover:bg-stone-100'
              }"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制战报'}
            </button>
          )}
        </div>

        <p className={`flex items-start gap-1.5 text-[10px] leading-relaxed mt-3 ${isDark ? 'text-stone-500' : 'text-stone-500'}`}>
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          每关独立计死亡评级（S=零死亡 · A=少量死亡 · B=通关），三关全部完成才计入连胜；当日重复挑战只保留更优战绩。每日 0 点刷新关卡。
        </p>
      </div>
    </div>
  );
};
