import React from 'react';
import { Lightbulb, X, BookOpen } from 'lucide-react';
import { ObstacleType } from '../game/types';
import { MECHANISM_TIPS } from '../game/tutorial';

interface MechanismToastProps {
  /** Queue of unseen mechanism types (first item is shown). */
  queue: ObstacleType[];
  /** Dismiss the currently shown mechanism (marks it as seen). */
  onDismiss: (type: ObstacleType) => void;
  /** Open the full mechanism guide. */
  onOpenGuide: () => void;
}

/**
 * Contextual first-seen mechanism tip. Shows one tip at a time from the
 * queue; dismissing marks the mechanism as learned and reveals the next.
 */
export const MechanismToast: React.FC<MechanismToastProps> = ({ queue, onDismiss, onOpenGuide }) => {
  const current = queue.length > 0 ? queue[0] : null;
  if (!current) return null;
  const tip = MECHANISM_TIPS[current as Exclude<ObstacleType, 'wall'>];
  if (!tip) return null;

  return (
    <div className="absolute z-20 right-3 top-16 sm:right-6 sm:top-auto sm:bottom-6 max-w-[300px] sm:max-w-[320px] animate-fade-in">
      <div className="rounded-2xl border border-stone-700/70 dark:border-stone-700/70 light:border-stone-300 bg-stone-900/85 dark:bg-stone-900/85 light:bg-white/90 backdrop-blur-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <Lightbulb className={`w-4 h-4 ${tip.accent}`} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold leading-none">
              新机关 · 首次出现
            </div>
            <div className={`text-sm font-bold mt-0.5 ${tip.accent}`}>{tip.name}</div>
          </div>
          <button
            onClick={() => onDismiss(current)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-200 dark:hover:text-stone-200 light:hover:text-stone-800 hover:bg-stone-800/60 light:hover:bg-stone-200 transition-colors"
            title="知道了"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-3">
          <p className="text-xs leading-relaxed text-stone-300 dark:text-stone-300 light:text-stone-700">
            {tip.detail}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            onClick={() => onDismiss(current)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-stone-950 bg-sky-400/90 hover:bg-sky-300 transition-colors"
          >
            知道了
          </button>
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-medium text-stone-400 hover:text-stone-200 dark:hover:text-stone-200 light:hover:text-stone-800 border border-stone-700/60 light:border-stone-300 hover:bg-stone-800/60 light:hover:bg-stone-100 transition-colors"
            title="打开完整机制指南"
          >
            <BookOpen className="w-3 h-3" /> 图鉴
          </button>
          {queue.length > 1 && (
            <span className="text-[10px] text-stone-500 font-mono-tabular" title="还有更多新机关提示">
              +{queue.length - 1}
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
