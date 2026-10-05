import React, { useEffect, useState } from 'react';
import { Palette, Check, X, Sparkles } from 'lucide-react';
import { ThemeMode } from '../game/types';
import {
  BALL_SKINS, CLASSIC_SKIN_ID, getSelectedSkinId, setSelectedSkinId, getSkinSvg
} from '../game/skins';

interface SkinPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

/** Miniature stand-in for the original procedural star-core (picker preview). */
function ClassicPreview() {
  return (
    <svg viewBox="-110 -110 220 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <circle cx="0" cy="0" r="90" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="1" strokeDasharray="3 5" />
      <ellipse cx="0" cy="0" rx="88" ry="35" fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" transform="rotate(-18)" />
      <circle cx="0" cy="0" r="52" fill="#ffffff" stroke="#38bdf8" strokeWidth="5" />
      <circle cx="0" cy="0" r="10" fill="#38bdf8" />
      <circle cx="-52" cy="-21" r="5" fill="#38bdf8" transform="rotate(-18 0 0)" />
      <circle cx="52" cy="21" r="5" fill="#38bdf8" transform="rotate(-18 0 0)" />
    </svg>
  );
}

/**
 * Ball skin picker — 1 classic star-core + 10 showcase sphere designs.
 * Selection persists instantly (localStorage) and applies to the live
 * renderer on the next frame (renderer reads the selection each draw).
 */
export const SkinPickerModal: React.FC<SkinPickerModalProps> = ({ isOpen, onClose, theme }) => {
  const [selected, setSelected] = useState<string>(CLASSIC_SKIN_ID);

  // Fresh read each open so external changes (e.g. cache purge) are reflected.
  useEffect(() => {
    if (isOpen) setSelected(getSelectedSkinId());
  }, [isOpen]);

  // Esc closes — lightweight and consistent with the modal family.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const choose = (id: string) => {
    setSelectedSkinId(id);
    setSelected(id);
  };

  const currentName =
    selected === CLASSIC_SKIN_ID
      ? '经典星核'
      : BALL_SKINS.find(s => s.id === selected)?.name ?? '经典星核';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
        isDark ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-900'
      }`}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight">星核皮肤</h2>
              <p className="text-[11px] text-stone-500 mt-0.5">十种几何拓扑构型 · 选择即刻生效并自动保存</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid of skins */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Classic option */}
          <button
            onClick={() => choose(CLASSIC_SKIN_ID)}
            className={`group relative rounded-xl border p-3 flex flex-col items-center text-left transition-all ${
              selected === CLASSIC_SKIN_ID
                ? 'border-sky-400/70 bg-sky-500/10 shadow-[0_0_18px_rgba(56,189,248,0.15)]'
                : isDark
                  ? 'border-stone-800 bg-stone-950/40 hover:border-stone-600'
                  : 'border-stone-200 bg-stone-50 hover:border-stone-400'
            }`}
          >
            {selected === CLASSIC_SKIN_ID && (
              <span className="absolute top-2 right-2 p-0.5 rounded-full bg-sky-400 text-stone-950">
                <Check className="w-3 h-3" />
              </span>
            )}
            <div className="w-20 h-20 my-1"><ClassicPreview /></div>
            <div className="w-full border-t border-stone-800/60 light:border-stone-200 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-[0.15em] text-sky-400 font-mono">00 / CLASSIC</span>
              </div>
              <div className="text-xs font-semibold text-stone-100 dark:text-stone-100 light:text-stone-900 mt-0.5">经典星核</div>
              <div className="text-[10px] text-stone-500 leading-snug mt-0.5">最初的白色星核与环绕卫星光环。</div>
            </div>
          </button>

          {/* 10 showcase skins */}
          {BALL_SKINS.map((skin) => {
            const isSel = selected === skin.id;
            const svg = getSkinSvg(skin.id);
            return (
              <button
                key={skin.id}
                onClick={() => choose(skin.id)}
                title={skin.desc}
                className={`group relative rounded-xl border p-3 flex flex-col items-center text-left transition-all ${
                  isSel
                    ? 'bg-white/[0.04] shadow-[0_0_18px_rgba(56,189,248,0.12)]'
                    : isDark
                      ? 'border-stone-800 bg-stone-950/40 hover:border-stone-600'
                      : 'border-stone-200 bg-stone-50 hover:border-stone-400'
                }`}
                style={isSel ? { borderColor: skin.accent, boxShadow: `0 0 18px ${skin.accent}22` } : undefined}
              >
                {isSel && (
                  <span
                    className="absolute top-2 right-2 p-0.5 rounded-full text-stone-950"
                    style={{ backgroundColor: skin.accent }}
                  >
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div
                  className="w-20 h-20 my-1 [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: svg ?? '' }}
                />
                <div className="w-full border-t border-stone-800/60 light:border-stone-200 pt-2 mt-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold tracking-[0.12em] font-mono shrink-0" style={{ color: skin.accent }}>
                      {skin.num} / {skin.en}
                    </span>
                    <span className="text-[8px] text-stone-500 truncate uppercase tracking-wide">{skin.type}</span>
                  </div>
                  <div className="text-xs font-semibold text-stone-100 dark:text-stone-100 light:text-stone-900 mt-0.5">{skin.name}</div>
                  <div className="text-[10px] text-stone-500 leading-snug mt-0.5 line-clamp-2">{skin.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            当前使用：<span className="text-stone-300 dark:text-stone-300 light:text-stone-700 font-medium">{currentName}</span>
            <span className="hidden sm:inline">· 皮肤仅改变外观，不影响物理判定</span>
          </div>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl font-medium text-xs border border-stone-700/60 text-stone-300 dark:text-stone-300 light:text-stone-700 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors"
          >
            完成
          </button>
        </div>

      </div>
    </div>
  );
};
