import React from 'react';
import { X, RotateCw, Shield, Compass, Sparkles, Smartphone, Eye } from 'lucide-react';
import { ThemeMode } from '../game/types';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  theme
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-6 md:p-8 shadow-2xl transition-all ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-100'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-stone-800/60 dark:border-stone-800 light:border-stone-200">
          <div>
            <h2 className="font-display font-bold text-xl md:text-2xl tracking-tight">
              时空引力与几何机制指南
            </h2>
            <div className="text-xs text-stone-400 mt-1">
              掌握视角旋转以重塑物理碰撞逻辑
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-6 mt-6 text-sm text-stone-300 dark:text-stone-300 light:text-stone-700">
          
          {/* Section 1: Gravity Shift */}
          <div className="flex gap-4">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 h-fit">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 dark:text-stone-100 light:text-stone-900 text-base">
                01. 视界旋转与重力反转
              </h3>
              <p className="mt-1 leading-relaxed text-stone-400 text-xs md:text-sm">
                旋转并非单纯的镜头移动，而是将物理重力矢量真实扭转。下方不仅是“屏幕的下端”，而是小球下坠的终点。善用 90° 直角翻转在折角迷宫中弹跳行进。
              </p>
            </div>
          </div>

          {/* Section 2: Phase Barriers */}
          <div className="flex gap-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 h-fit">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 dark:text-stone-100 light:text-stone-900 text-base">
                02. 透光相界 (Phase Horizon)
              </h3>
              <p className="mt-1 leading-relaxed text-stone-400 text-xs md:text-sm">
                相界屏障遵循视界对齐原则：当重力方向与屏障垂直或平行时，屏障会凝固为无法逾越的实体晶体；一旦将重力旋转 90°，它将幻化为半透明虚线光网，小球可自由穿透！
              </p>
            </div>
          </div>

          {/* Section 3: Sliding Monoliths & Lasers */}
          <div className="flex gap-4">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 h-fit">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 dark:text-stone-100 light:text-stone-900 text-base">
                03. 动量滑块与光束遮蔽
              </h3>
              <p className="mt-1 leading-relaxed text-stone-400 text-xs md:text-sm">
                红光激光具有瞬杀破坏力。通过倾斜重力引导轨道上的重型石块滑移，将石块推入激光轨迹以阻断光束，为小球开辟安全通途。
              </p>
            </div>
          </div>

          {/* Section 4: Controls & Gyro */}
          <div className="flex gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 h-fit">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 dark:text-stone-100 light:text-stone-900 text-base">
                04. 多端手感与陀螺仪体感
              </h3>
              <div className="mt-2 space-y-1.5 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-200">桌面端：</span>
                  <span><kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700">A</kbd>/<kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700">D</kbd> 或 <kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700">Q</kbd>/<kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700">E</kbd> 旋转，<kbd className="px-1 py-0.5 rounded bg-stone-800 border border-stone-700">空格</kbd> 微冲，鼠标拖动罗盘。</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-200">移动端：</span>
                  <span>点击底部引力罗盘顺滑旋转，或点击“体感”开启手机陀螺仪，通过倾斜机身控制重力！</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer button */}
        <div className="mt-8 pt-5 border-t border-stone-800/60 dark:border-stone-800 light:border-stone-200 flex items-center justify-between">
          <a
            href="/geometric-traverse.zip"
            download="geometric-traverse.zip"
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-medium text-xs text-stone-300 dark:text-stone-300 light:text-stone-700 border border-stone-700/60 hover:bg-stone-800 transition-colors"
          >
            <span>下载源码工程 (ZIP)</span>
          </a>

          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl font-medium text-xs text-stone-950 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            开启探索
          </button>
        </div>

      </div>
    </div>
  );
};
