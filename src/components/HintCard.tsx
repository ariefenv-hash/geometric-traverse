import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface HintCardProps {
  /** Beginner coaching hints for the current level (from LevelConfig.hints). */
  hints: string[];
  /** Level code for the header chip, e.g. "LV-01". */
  levelCode: string;
}

/**
 * Collapsible per-level beginner hints. Mount with a `key={level.id}` so the
 * card re-opens (expanded) whenever the level changes.
 */
export const HintCard: React.FC<HintCardProps> = ({ hints, levelCode }) => {
  const [open, setOpen] = useState(true);

  if (hints.length === 0) return null;

  return (
    <div className="absolute z-20 left-3 top-16 sm:left-6 sm:top-16 max-w-[280px] sm:max-w-[300px]">
      {open ? (
        <div className="rounded-2xl border border-amber-500/30 bg-stone-900/85 dark:bg-stone-900/85 light:bg-white/90 backdrop-blur-md shadow-xl overflow-hidden animate-fade-in">
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-stone-800/50 light:hover:bg-stone-100 transition-colors"
            title="收起提示"
          >
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="flex-1 text-xs font-bold text-amber-300 light:text-amber-600">
              新手提示 <span className="text-stone-500 font-normal">· {levelCode}</span>
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
          </button>
          <ul className="px-4 pb-3 pt-1 space-y-2">
            {hints.map((h, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-stone-300 dark:text-stone-300 light:text-stone-700">
                <span className="shrink-0 mt-px w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-[9px] font-bold">
                  {i + 1}
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-amber-500/30 bg-stone-900/85 dark:bg-stone-900/85 light:bg-white/90 backdrop-blur-md shadow-lg text-[11px] font-semibold text-amber-300 light:text-amber-600 hover:bg-stone-800/80 light:hover:bg-stone-100 transition-colors animate-fade-in"
          title="展开本关新手提示"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          新手提示
          <ChevronDown className="w-3 h-3 text-stone-500" />
        </button>
      )}
    </div>
  );
};
