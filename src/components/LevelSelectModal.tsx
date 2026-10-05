import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Lock,
  CheckCircle2,
  Play,
  Copy,
  Trash2,
  Library,
  Wrench,
  Search,
  ArrowUpDown,
  Trophy
} from 'lucide-react';
import { LevelConfig, LevelProgress, ThemeMode } from '../game/types';
import { StoredUserLevel } from '../game/userLevels';

interface LevelSelectModalProps {
  levels: LevelConfig[];
  currentLevelId: number;
  progress: Record<number, LevelProgress>;
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (id: number) => void;
  theme: ThemeMode;
  // --- "My levels" tab (UGC). All optional so the modal stays backward-compatible. ---
  userLevels?: StoredUserLevel[];
  playingUserKey?: string | null;
  onPlayUserLevel?: (entry: StoredUserLevel) => void;
  onDeleteUserLevel?: (entry: StoredUserLevel) => void;
  onCopyUserLevelCode?: (entry: StoredUserLevel) => void;
  onOpenEditor?: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  currentLevelId,
  progress,
  isOpen,
  onClose,
  onSelectLevel,
  theme,
  userLevels = [],
  playingUserKey = null,
  onPlayUserLevel,
  onDeleteUserLevel,
  onCopyUserLevelCode,
  onOpenEditor
}) => {
  // Hooks must run unconditionally — early return happens AFTER them,
  // otherwise the first open crashes with a hook-order mismatch.
  const [tab, setTab] = useState<'official' | 'mine'>('official');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'newest' | 'oldest' | 'name' | 'complexity'>('newest');
  useEffect(() => {
    if (isOpen) {
      setTab('official');
      setQuery('');
      setSortKey('newest');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const totalStars = Object.values(progress).reduce((acc, curr) => acc + (curr.starsEarned || 0), 0);
  const maxStars = levels.length * 3;
  const completedCount = Object.values(progress).filter(p => p.completed).length;

  // UGC library search + sort (derived, not state)
  const q = query.trim().toLowerCase();
  const visibleUserLevels = userLevels
    .filter(
      e =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.config.title.toLowerCase().includes(q) ||
        e.config.code.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return a.updatedAt - b.updatedAt;
        case 'name':
          return a.name.localeCompare(b.name, 'zh');
        case 'complexity':
          return b.config.obstacles.length - a.config.obstacles.length;
        case 'newest':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  const tabBtnCls = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
      active
        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/50'
        : 'text-stone-400 border border-transparent hover:text-stone-200'
    }`;

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

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mt-5">
          <button className={tabBtnCls(tab === 'official')} onClick={() => setTab('official')}>
            官方维度
          </button>
          <button className={tabBtnCls(tab === 'mine')} onClick={() => setTab('mine')}>
            <Library className="w-3.5 h-3.5" />
            我的关卡 {userLevels.length > 0 && <span className="text-[10px] opacity-70">({userLevels.length})</span>}
          </button>
        </div>

        {tab === 'official' && (
          /* Official Levels Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
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

                    {p.completed && p.bestRotations > 0 ? (
                      <div
                        className="flex items-center gap-1 text-[11px] font-mono-tabular text-stone-400"
                        title="历史最佳：旋转步数 · 用时"
                      >
                        <Trophy className="w-3 h-3 text-amber-400/80" />
                        <span>
                          {p.bestRotations}步 · {p.bestTime >= 60
                            ? `${Math.floor(p.bestTime / 60)}:${(p.bestTime % 60).toFixed(1).padStart(4, '0')}`
                            : `${p.bestTime.toFixed(1)}s`}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'mine' && (
          <div className="mt-5">
            {userLevels.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Library className="w-10 h-10 text-stone-600" />
                <p className="text-sm text-stone-400">
                  关卡库还是空的——打开几何工坊，创作属于你的维度吧。
                </p>
                {onOpenEditor && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEditor();
                    }}
                    className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    前往几何工坊
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Search + sort toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="搜索名称 / 标题 / 编号…"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 focus:border-emerald-500/70 focus:outline-none placeholder:text-stone-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                    <select
                      value={sortKey}
                      onChange={e => setSortKey(e.target.value as typeof sortKey)}
                      className="px-2 py-1.5 rounded-lg text-xs bg-stone-950/60 dark:bg-stone-950/60 light:bg-stone-100 border border-stone-800 dark:border-stone-800 light:border-stone-300 focus:border-emerald-500/70 focus:outline-none"
                    >
                      <option value="newest">最近更新</option>
                      <option value="oldest">最早创建</option>
                      <option value="name">名称 A-Z</option>
                      <option value="complexity">机关最多</option>
                    </select>
                    <span className="text-[10px] text-stone-500 tabular-nums whitespace-nowrap">
                      {visibleUserLevels.length} / {userLevels.length}
                    </span>
                  </div>
                </div>

                {visibleUserLevels.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Search className="w-8 h-8 text-stone-600" />
                    <p className="text-sm text-stone-400">没有匹配「{query}」的关卡</p>
                    <button
                      onClick={() => setQuery('')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 underline underline-offset-2"
                    >
                      清除搜索条件
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {visibleUserLevels.map((entry) => {
                  const isPlaying = playingUserKey === entry.id;
                  const starCount = entry.config.stars.length;
                  const obstacleCount = entry.config.obstacles.length;
                  return (
                    <div
                      key={entry.id}
                      className={`relative p-4 rounded-xl border transition-all text-sm ${
                        isPlaying
                          ? 'border-emerald-500/80 bg-emerald-500/10'
                          : isDark
                          ? 'bg-stone-800/40 border-stone-800 hover:border-stone-700'
                          : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wider">
                          {entry.config.code}
                        </span>
                        {isPlaying && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            试玩中
                          </span>
                        )}
                      </div>

                      <div className="mt-2 font-semibold text-base text-stone-100 dark:text-stone-100 light:text-stone-900 truncate">
                        {entry.name}
                      </div>
                      <div className="text-xs text-stone-400 dark:text-stone-400 light:text-stone-500">
                        {entry.config.title} · {obstacleCount} 机关 · {starCount} 星核
                      </div>

                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-stone-800/40 dark:border-stone-800/50 light:border-stone-200/60">
                        {onPlayUserLevel && (
                          <button
                            onClick={() => {
                              onPlayUserLevel(entry);
                              onClose();
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-400 text-stone-950 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            试玩
                          </button>
                        )}
                        {onCopyUserLevelCode && (
                          <button
                            title="复制分享码"
                            onClick={() => onCopyUserLevelCode(entry)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] border border-stone-700 text-stone-300 hover:border-sky-500/60 hover:text-sky-300 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteUserLevel && (
                          <button
                            title="删除关卡"
                            onClick={() => onDeleteUserLevel(entry)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] border border-stone-700 text-stone-400 hover:border-rose-500/60 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
