import React, { useEffect, useState } from 'react';
import { Trash2, ShieldAlert, RefreshCw, X } from 'lucide-react';
import { ThemeMode } from '../game/types';
import { collectStorageFootprint, purgeAllCaches, StorageFootprint, PurgeReport } from '../game/purge';

interface CachePurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

/**
 * "Thorough cache purge" confirmation dialog. Shows exactly what will be
 * removed, requires an explicit confirm, then purges and reloads the page.
 */
export const CachePurgeModal: React.FC<CachePurgeModalProps> = ({ isOpen, onClose, theme }) => {
  const [footprint, setFootprint] = useState<StorageFootprint | null>(null);
  const [report, setReport] = useState<PurgeReport | null>(null);
  const [busy, setBusy] = useState(false);

  // Fresh snapshot each time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setReport(null);
      setBusy(false);
      setFootprint(collectStorageFootprint());
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const handlePurge = async () => {
    setBusy(true);
    const r = await purgeAllCaches();
    setReport(r);
    // Give the player a beat to see the result, then reload into a clean slate.
    setTimeout(() => window.location.reload(), 900);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
        isDark ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-900'
      }`}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight">彻底清除缓存</h2>
              <p className="text-[11px] text-stone-500 mt-0.5">把游戏在本机保存的一切抹掉，回到首次启动状态</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {report ? (
          /* --- Result state --- */
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <RefreshCw className="w-4 h-4" /> 已彻底清除，即将刷新页面…
            </div>
            <ul className="mt-2 space-y-1 text-xs text-stone-300 dark:text-stone-300 light:text-stone-700 font-mono-tabular">
              <li>localStorage：{report.localStorageCleared} 项</li>
              <li>sessionStorage：{report.sessionStorageCleared} 项</li>
              <li>浏览器缓存：{report.cachesDeleted.length} 个{report.cachesDeleted.length > 0 ? `（${report.cachesDeleted.join('、')}）` : ''}</li>
              <li>Service Worker：{report.serviceWorkersUnregistered} 个</li>
            </ul>
          </div>
        ) : (
          /* --- Confirm state --- */
          <>
            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-amber-400 text-xs leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>此操作<b>不可撤销</b>。刷新后将重新出现新手引导，所有关卡需要重新解锁。</span>
              </div>

              {/* What will be removed */}
              <div className={`rounded-xl border p-3 ${
                isDark ? 'border-stone-800 bg-stone-950/50' : 'border-stone-200 bg-stone-50'
              }`}>
                <div className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold mb-2">
                  将清除的内容
                </div>
                {footprint && footprint.present.length > 0 ? (
                  <ul className="space-y-1.5">
                    {footprint.present.map(({ key, label, bytes }) => (
                      <li key={key} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-stone-300 dark:text-stone-300 light:text-stone-700">{label}</span>
                        <span className="text-stone-500 font-mono-tabular shrink-0">{formatBytes(bytes)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-stone-500">localStorage 中暂无游戏数据</div>
                )}
                {footprint && (
                  <div className="mt-2.5 pt-2.5 border-t border-stone-800/60 light:border-stone-200 text-[11px] text-stone-500 font-mono-tabular space-y-0.5">
                    <div>localStorage 合计 {footprint.localStorageCount} 项 · sessionStorage {footprint.sessionStorageCount} 项</div>
                    <div>另将清空浏览器 Cache Storage 与已注册的 Service Worker</div>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-stone-500 leading-relaxed">
                我的自制关卡如需保留，请先在关卡库中复制分享码保存到别处——清除后无法找回。
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="py-2.5 px-4 rounded-xl font-medium text-xs border border-stone-700/60 text-stone-300 dark:text-stone-300 light:text-stone-700 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors disabled:opacity-30"
              >
                取消
              </button>
              <button
                onClick={handlePurge}
                disabled={busy}
                className="py-2.5 px-5 rounded-xl font-semibold text-xs text-stone-950 bg-rose-400 hover:bg-rose-300 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {busy ? '清除中…' : '彻底清除并刷新'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
