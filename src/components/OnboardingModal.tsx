import React, { useEffect, useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Star,
  DoorOpen,
  RotateCw,
  Keyboard,
  Smartphone,
  GraduationCap,
  Eye
} from 'lucide-react';
import { ThemeMode } from '../game/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: () => void;
  theme: ThemeMode;
}

interface Step {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: <Star className="w-6 h-6" />,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    title: '欢迎来到「几何贯穿 · 视界重力」',
    body: (
      <>
        <p className="leading-relaxed">
          你将操控一颗小球，在纯几何构筑的竞技场中穿越重重机关。<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">目标很简单：</b>
        </p>
        <ol className="mt-2 space-y-1.5 list-none">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-[11px] font-bold">1</span>
            <span>收集关卡中的全部<span className="text-amber-400 font-medium">星核</span>（金色闪烁的小星）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center text-[11px] font-bold">2</span>
            <span>星核集齐后，<span className="text-sky-400 font-medium">归元门</span>光环解锁</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[11px] font-bold">3</span>
            <span>让小球坠入归元门，即可进入下一关</span>
          </li>
        </ol>
      </>
    )
  },
  {
    icon: <RotateCw className="w-6 h-6" />,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    title: '核心玩法：旋转的不是镜头，是重力',
    body: (
      <>
        <p className="leading-relaxed">
          这是本作最重要的一条规则：<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">画面可以旋转，但真正改变的是重力方向。</b>
          小球永远坠向底部罗盘指针所指的方向——「下方」只是你认为的下方。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-stone-700/60 light:border-stone-200 bg-stone-800/40 light:bg-stone-100 p-2.5">
            <div className="font-semibold text-sky-300 light:text-sky-700 mb-1">逆时针 90°</div>
            <div className="text-stone-400">点罗盘左箭头，或按 <kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">A</kbd> / <kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">←</kbd></div>
          </div>
          <div className="rounded-lg border border-stone-700/60 light:border-stone-200 bg-stone-800/40 light:bg-stone-100 p-2.5">
            <div className="font-semibold text-sky-300 light:text-sky-700 mb-1">顺时针 90°</div>
            <div className="text-stone-400">点罗盘右箭头，或按 <kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">D</kbd> / <kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">→</kbd></div>
          </div>
          <div className="rounded-lg border border-stone-700/60 light:border-stone-200 bg-stone-800/40 light:bg-stone-100 p-2.5">
            <div className="font-semibold text-sky-300 light:text-sky-700 mb-1">翻转 180° / 回正</div>
            <div className="text-stone-400"><kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">W</kbd> 翻转 · <kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">S</kbd> 回正向下</div>
          </div>
          <div className="rounded-lg border border-stone-700/60 light:border-stone-200 bg-stone-800/40 light:bg-stone-100 p-2.5">
            <div className="font-semibold text-sky-300 light:text-sky-700 mb-1">微冲 &amp; 重置</div>
            <div className="text-stone-400"><kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">空格</kbd> 沿重力微冲 · <kbd className="px-1 rounded bg-stone-700/80 light:bg-stone-200 border border-stone-600 light:border-stone-300">R</kbd> 重开本关</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500 leading-relaxed">
          小技巧：也可以用鼠标直接拖动底部罗盘，连续微调重力角度。
        </p>
      </>
    )
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    title: '移动端：手势与体感',
    body: (
      <>
        <ul className="space-y-2.5 leading-relaxed">
          <li className="flex gap-2.5">
            <span className="shrink-0 mt-0.5 text-emerald-400 font-bold text-xs">滑动</span>
            <span>在竞技场画面上<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">左右滑动</b>旋转 90°，<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">下滑</b>翻转 180°，<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">轻点</b>画面让小球微冲。</span>
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 mt-0.5 text-emerald-400 font-bold text-xs">罗盘</span>
            <span>点按底部罗盘的左右箭头，或按住圆盘拖动，精确控制重力指向。</span>
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 mt-0.5 text-emerald-400 font-bold text-xs">体感</span>
            <span>点击罗盘区的「体感」按钮开启陀螺仪——倾斜手机即可改变重力。开启瞬间按当前握持姿态自动校准，平放即锁定不动，非常直观。</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-stone-500 leading-relaxed">
          桌面端用户可跳过本页——所有操作都有键盘等价方案。
        </p>
      </>
    )
  },
  {
    icon: <Eye className="w-6 h-6" />,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    title: '第一个机关：透光相界',
    body: (
      <>
        <p className="leading-relaxed">
          从第 3 关开始，你会遇到<b className="text-purple-300 light:text-purple-700">虚线画成的墙</b>——透光相界。
          它遵循「视界对齐」原则：
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-stone-700/60 light:border-stone-200 bg-stone-800/40 light:bg-stone-100 p-2.5 text-sm">
            <span className="shrink-0 w-10 h-1.5 rounded-full border border-dashed border-purple-400" />
            <span>重力方向与它<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">错开 90°</b> 时 → 虚线光网，<b className="text-purple-300 light:text-purple-700">自由穿过</b></span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-stone-700/60 light:border-stone-200 bg-stone-800/40 light:bg-stone-100 p-2.5 text-sm">
            <span className="shrink-0 w-10 h-1.5 rounded-full bg-purple-500/80" />
            <span>重力方向与它<b className="text-stone-100 dark:text-stone-100 light:text-stone-900">对齐</b> 时 → 凝固成<b className="text-purple-300 light:text-purple-700">实体晶体</b>，无法逾越</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500 leading-relaxed">
          口诀：虚线可穿，实体可撞。卡住了？旋转 90° 再看一眼。
        </p>
      </>
    )
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    title: '学习系统：随时可以获得提示',
    body: (
      <>
        <ul className="space-y-2.5 leading-relaxed">
          <li className="flex gap-2.5">
            <span className="shrink-0 mt-0.5 text-cyan-400"><Star className="w-4 h-4" /></span>
            <span><b className="text-stone-100 dark:text-stone-100 light:text-stone-900">首见提示：</b>每种新机关第一次出现时，会弹出一张说明卡，讲清它的规则——只出现一次，不打扰。</span>
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 mt-0.5 text-cyan-400"><DoorOpen className="w-4 h-4" /></span>
            <span><b className="text-stone-100 dark:text-stone-100 light:text-stone-900">关卡提示：</b>前几关的画面角落有一张可折叠的「新手提示」卡，专门针对当前关卡给出具体建议。</span>
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 mt-0.5 text-cyan-400"><Keyboard className="w-4 h-4" /></span>
            <span><b className="text-stone-100 dark:text-stone-100 light:text-stone-900">完整图鉴：</b>顶部 <span className="text-stone-300 light:text-stone-600">?</span> 按钮可随时打开全部 8 节机制指南，所有机关的规则都在里面。</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-stone-500 leading-relaxed">
          死亡没有惩罚：小球会在起点自动重生，机关的当前状态保持不变。放心大胆地尝试。
        </p>
      </>
    )
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onFinish, theme }) => {
  const [step, setStep] = useState(0);

  // Reset to first step each time the modal is (re)opened.
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Keyboard navigation: Enter / → next, ← prev, Esc skip.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        setStep(s => (s < STEPS.length - 1 ? s + 1 : s));
      } else if (e.key === 'ArrowLeft') {
        setStep(s => Math.max(0, s - 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onFinish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onFinish]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl border p-6 md:p-8 shadow-2xl ${
        isDark
          ? 'bg-stone-900 border-stone-800 text-stone-100'
          : 'bg-white border-stone-200 text-stone-900'
      }`}>

        {/* Header: progress dots + skip */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800/60 dark:border-stone-800 light:border-stone-200">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                aria-label={`跳转到第 ${idx + 1} 步`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === step
                    ? 'w-6 bg-sky-400'
                    : 'w-1.5 bg-stone-700 dark:bg-stone-700 light:bg-stone-300 hover:bg-stone-500'
                }`}
              />
            ))}
            <span className="ml-2 text-[11px] text-stone-500 font-mono-tabular">{step + 1} / {STEPS.length}</span>
          </div>
          <button
            onClick={onFinish}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 dark:hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors"
            title="跳过引导"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step content */}
        <div className="mt-6 flex gap-4">
          <div className={`p-3 rounded-xl border shrink-0 h-fit ${current.iconBg} ${current.iconColor}`}>
            {current.icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg md:text-xl tracking-tight leading-snug">
              {current.title}
            </h2>
            <div className="mt-3 text-sm text-stone-300 dark:text-stone-300 light:text-stone-700">
              {current.body}
            </div>
          </div>
        </div>

        {/* Footer navigation */}
        <div className="mt-8 pt-5 border-t border-stone-800/60 dark:border-stone-800 light:border-stone-200 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-medium text-xs border transition-colors ${
              step === 0
                ? 'opacity-30 cursor-not-allowed border-stone-800/60 text-stone-500'
                : 'border-stone-700/60 text-stone-300 light:text-stone-700 hover:bg-stone-800 light:hover:bg-stone-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 上一步
          </button>

          <div className="text-[11px] text-stone-500 hidden sm:block">
            Enter 下一步 · Esc 跳过
          </div>

          <button
            onClick={() => (isLast ? onFinish() : setStep(s => s + 1))}
            className="flex items-center gap-1.5 py-2.5 px-6 rounded-xl font-medium text-xs text-stone-950 bg-sky-400 hover:bg-sky-300 transition-colors shadow-lg shadow-sky-500/20"
          >
            {isLast ? '开始探索' : '下一步'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
