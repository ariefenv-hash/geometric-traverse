import React, { useState } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Layers,
  Shield,
  Eye,
  Zap,
  ChevronsUp,
  DoorOpen,
  DoorClosed,
  BrickWall,
  Target,
  CircleDashed,
  Skull,
  Slash,
  Share2,
  Download,
  Upload
} from 'lucide-react';
import { AnyObstacle, ObstacleType, ThemeMode } from '../game/types';

interface SandboxStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySandboxConfig: (obstacles: AnyObstacle[], gravityScale: number, bounciness: number) => void;
  onResetSandbox: () => void;
  onExportLevelCode: () => void;
  onImportLevelCode: (code: string) => boolean;
  theme: ThemeMode;
}

export const SandboxStudio: React.FC<SandboxStudioProps> = ({
  isOpen,
  onClose,
  onApplySandboxConfig,
  onResetSandbox,
  onExportLevelCode,
  onImportLevelCode,
  theme
}) => {
  // Hooks must run unconditionally — early return below happens AFTER them,
  // otherwise the first open crashes with a hook-order mismatch.
  const [selectedTool, setSelectedTool] = useState<ObstacleType>('wall');
  const [gravityScale, setGravityScale] = useState(1.0);
  const [bounciness, setBounciness] = useState(0.45);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const tools: { type: ObstacleType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'wall', label: '实体黑曜石墙', icon: <Layers className="w-4 h-4" />, desc: '坚硬刚体，阻挡一切碰撞与光束' },
    { type: 'phase_barrier', label: '透光相界', icon: <Eye className="w-4 h-4" />, desc: '受重力方向控制的量子屏障，90°穿透' },
    { type: 'sliding_block', label: '动量滑块', icon: <Shield className="w-4 h-4" />, desc: '沿导轨滑动，可用作桥梁或挡光掩体' },
    { type: 'laser_emitter', label: '极光发射器', icon: <Zap className="w-4 h-4" />, desc: '持续发射致命红色聚焦激光' },
    { type: 'anti_gravity', label: '反重力涌泉', icon: <Sparkles className="w-4 h-4" />, desc: '向上托举球体的蓝色引力波束' },
    { type: 'bumper', label: '定向弹力垫', icon: <ChevronsUp className="w-4 h-4" />, desc: '将小球沿箭头方向高速弹射的翠色垫石' },
    { type: 'one_way_gate', label: '单向闸门', icon: <DoorOpen className="w-4 h-4" />, desc: '只允许沿箭头方向穿越的涡流阀' },
    { type: 'fragile_wall', label: '碎裂墙', icon: <BrickWall className="w-4 h-4" />, desc: '高速冲击可击碎的赭色脆壁，累计耐久' },
    { type: 'pressure_plate', label: '压力板', icon: <Target className="w-4 h-4" />, desc: '感应球体重量的紫色机关，联动闸门' },
    { type: 'linked_gate', label: '联动闸门', icon: <DoorClosed className="w-4 h-4" />, desc: '由压力板控制的紫色能量门扉' },
    { type: 'portal', label: '折跃门', icon: <CircleDashed className="w-4 h-4" />, desc: '成对相连的紫色空间折跃通道' },
    { type: 'hazard', label: '湮灭场', icon: <Skull className="w-4 h-4" />, desc: '触碰即碎裂的禁行区域' },
    { type: 'mirror', label: '反射镜', icon: <Slash className="w-4 h-4" />, desc: '镜面将激光按入射角折返；可设为单面镀银，只折返一侧来光，另一侧放行' }
  ];

  const handleApplyPreset = (presetName: string) => {
    let customObs: AnyObstacle[] = [];
    if (presetName === 'quad_pinball') {
      // Pinball layout
      customObs = [
        { id: 'sb_w1', type: 'wall', x: 200, y: 300, width: 400, height: 20 },
        { id: 'sb_w2', type: 'wall', x: 200, y: 500, width: 400, height: 20 },
        { id: 'sb_pb1', type: 'phase_barrier', x: 350, y: 300, width: 100, height: 20, solidOrientations: [0, 2] },
        { id: 'sb_ag1', type: 'anti_gravity', x: 300, y: 320, width: 200, height: 160, force: 2.5 }
      ];
    } else if (presetName === 'laser_corridor') {
      customObs = [
        { id: 'lem1', type: 'laser_emitter', x: 60, y: 400, width: 24, height: 24, direction: 'right', active: true },
        { id: 'sb1', type: 'sliding_block', x: 350, y: 360, width: 100, height: 90, vx: 0, vy: 0, minX: 200, maxX: 600, minY: 360, maxY: 360, mass: 3 }
      ];
    }
    onApplySandboxConfig(customObs, gravityScale, bounciness);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 md:p-8 shadow-2xl transition-all ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-100'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-stone-800/60 dark:border-stone-800 light:border-stone-200">
          <div>
            <h2 className="font-display font-bold text-xl md:text-2xl tracking-tight">
              自由沙盒几何实验室
            </h2>
            <div className="text-xs text-stone-400 mt-1">
              自定义物理参数与机关模组
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Physics Sliders */}
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>核心物理常量</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>引力场强系数 (Gravity Scale)</span>
                <span className="font-mono-tabular text-sky-400">{gravityScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={gravityScale}
                onChange={(e) => setGravityScale(parseFloat(e.target.value))}
                className="w-full accent-sky-400 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>弹性系数 (Restitution)</span>
                <span className="font-mono-tabular text-sky-400">{(bounciness * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.85"
                step="0.05"
                value={bounciness}
                onChange={(e) => setBounciness(parseFloat(e.target.value))}
                className="w-full accent-sky-400 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2.5">
              预设实验场
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleApplyPreset('quad_pinball')}
                className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                  isDark
                    ? 'border-stone-800 hover:border-sky-500/50 bg-stone-950/40 hover:bg-stone-800/50'
                    : 'border-stone-200 hover:border-sky-500/50 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <div className="font-medium text-stone-200 dark:text-stone-200 light:text-stone-900">
                  涌泉弹球场
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  反重力井与垂直相界共振
                </div>
              </button>

              <button
                onClick={() => handleApplyPreset('laser_corridor')}
                className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                  isDark
                    ? 'border-stone-800 hover:border-sky-500/50 bg-stone-950/40 hover:bg-stone-800/50'
                    : 'border-stone-200 hover:border-sky-500/50 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <div className="font-medium text-stone-200 dark:text-stone-200 light:text-stone-900">
                  极光阻截走廊
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  重力驱使滑块掩体护送
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Level Share Codes */}
        <div className="mt-6 pt-5 border-t border-stone-800/60 dark:border-stone-800 light:border-stone-200">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Share2 className="w-3.5 h-3.5" />
            <span>关卡分享码</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
            将当前关卡导出为 GT1 分享码，或粘贴他人分享码立即试玩。
          </p>
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button
              onClick={onExportLevelCode}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                isDark
                  ? 'border-stone-800 hover:border-violet-500/50 bg-stone-950/40 hover:bg-stone-800/50 text-stone-300'
                  : 'border-stone-200 hover:border-violet-500/50 bg-stone-50 hover:bg-stone-100 text-stone-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出分享码</span>
            </button>
            <button
              onClick={() => {
                const code = window.prompt('粘贴关卡分享码 (GT1....)：');
                if (!code) return;
                const ok = onImportLevelCode(code);
                if (ok) onClose();
                else window.alert('分享码无效，请检查后重试。');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                isDark
                  ? 'border-stone-800 hover:border-violet-500/50 bg-stone-950/40 hover:bg-stone-800/50 text-stone-300'
                  : 'border-stone-200 hover:border-violet-500/50 bg-stone-50 hover:bg-stone-100 text-stone-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>导入分享码</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-stone-800/60 dark:border-stone-800 light:border-stone-200 flex items-center justify-between">
          <button
            onClick={() => {
              onResetSandbox();
              onClose();
            }}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置为原有关卡</span>
          </button>

          <button
            onClick={() => {
              onApplySandboxConfig([], gravityScale, bounciness);
              onClose();
            }}
            className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl text-xs font-medium text-stone-950 bg-sky-400 hover:bg-sky-300 transition-colors shadow-lg shadow-sky-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>应用并测试物理</span>
          </button>
        </div>

      </div>
    </div>
  );
};
