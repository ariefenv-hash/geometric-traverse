import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LEVELS, loadLevelProgress, saveLevelProgress, encodeLevelShareCode, decodeLevelShareCode } from './game/levels';
import {
  AnyObstacle,
  LevelConfig,
  LevelProgress,
  PhysicsParams,
  PhysicsWorldState,
  StarItem,
  ThemeMode
} from './game/types';
import { createWorldState } from './game/physics';
import { isShakeEnabled, setShakeEnabled } from './game/perf';
import {
  getUnseenMechanics,
  isTutorialDone,
  markMechanicSeen,
  markTutorialDone
} from './game/tutorial';
import { sound } from './game/audio';
import {
  StoredUserLevel,
  loadUserLevels,
  deleteUserLevel
} from './game/userLevels';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { CompassControl } from './components/CompassControl';
import { LevelSelectModal } from './components/LevelSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { GuideModal } from './components/GuideModal';
import { SandboxStudio } from './components/SandboxStudio';
import { LevelEditor } from './components/LevelEditor';
import { OnboardingModal } from './components/OnboardingModal';
import { MechanismToast } from './components/MechanismToast';
import { HintCard } from './components/HintCard';
import { CachePurgeModal } from './components/CachePurgeModal';
import { SkinPickerModal } from './components/SkinPickerModal';
import type { ObstacleType } from './game/types';

export default function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [progress, setProgress] = useState<Record<number, LevelProgress>>(() => loadLevelProgress());
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShakeOn, setIsShakeOn] = useState<boolean>(() => isShakeEnabled());
  const [continuousRotation, setContinuousRotation] = useState<boolean>(false);
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);

  // Modals
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCachePurgeOpen, setIsCachePurgeOpen] = useState(false);
  const [isSkinPickerOpen, setIsSkinPickerOpen] = useState(false);

  // Playtest: when set, the game runs a user-made level draft from the editor.
  // Progress persistence is suspended while playtesting.
  const [playtestLevel, setPlaytestLevel] = useState<LevelConfig | null>(null);
  const [playtestOrigin, setPlaytestOrigin] = useState<'editor' | 'library'>('editor');
  const [playingUserKey, setPlayingUserKey] = useState<string | null>(null);

  // User level library (localStorage-backed), surfaced in the level select modal
  const [userLevels, setUserLevels] = useState<StoredUserLevel[]>(() => loadUserLevels());

  // Beginner onboarding: first-launch walkthrough + contextual first-seen tips
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !isTutorialDone());
  const [tipQueue, setTipQueue] = useState<ObstacleType[]>([]);

  const currentLevel: LevelConfig = playtestLevel ?? (LEVELS[currentLevelIndex] || LEVELS[0]);

  // World physics mutable state
  const worldStateRef = useRef<PhysicsWorldState>(createWorldState(currentLevel));

  // Mirror of the progress state for side-effect-free reads inside the victory
  // poll (the updater itself must stay pure).
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Guards against the victory modal re-opening after the player dismissed it
  // ("关卡矩阵" / exit-playtest): the world keeps isWon=true until initLevel,
  // so the 80ms poll would otherwise resurrect the modal on top of whatever
  // the player opened next.
  const victoryHandledRef = useRef(false);

  // Track UI state for HUD display
  const [hudState, setHudState] = useState({
    starsCollected: 0,
    rotationsCount: 0,
    elapsedTime: 0,
    gravityAngle: 0
  });

  // Reset or load level (paramOverrides let the sandbox tune physics on top)
  const initLevel = useCallback((lvl: LevelConfig, paramOverrides?: Partial<PhysicsParams>) => {
    worldStateRef.current = createWorldState(lvl, paramOverrides);
    victoryHandledRef.current = false;

    setHudState({
      starsCollected: 0,
      rotationsCount: 0,
      elapsedTime: 0,
      gravityAngle: 0
    });
    setIsVictoryOpen(false);
  }, []);

  // Sync level on level index change
  useEffect(() => {
    initLevel(currentLevel);
  }, [currentLevelIndex, currentLevel, initLevel]);

  // Contextual mechanism tips: scan the level for types the player has never
  // met before. Suppressed while editor-playtesting (creators know the rules),
  // still active for official levels, library plays and share-code imports.
  const isEditorPlaytest = !!playtestLevel && playtestOrigin === 'editor';
  useEffect(() => {
    if (isEditorPlaytest) {
      setTipQueue([]);
      return;
    }
    setTipQueue(getUnseenMechanics(currentLevel));
  }, [currentLevel, isEditorPlaytest]);

  const handleDismissTip = useCallback((type: ObstacleType) => {
    markMechanicSeen(type);
    setTipQueue(q => q.filter(t => t !== type));
  }, []);

  const handleFinishOnboarding = useCallback(() => {
    markTutorialDone();
    setShowOnboarding(false);
  }, []);

  // Audio unlock listener
  useEffect(() => {
    const unlockAudio = () => {
      sound.unlock();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Theme optical compensation
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Periodic HUD state sync & Victory check
  useEffect(() => {
    const timer = setInterval(() => {
      const ws = worldStateRef.current;
      const starsCount = ws.stars.filter((s: StarItem) => s.collected).length;

      setHudState({
        starsCollected: starsCount,
        rotationsCount: ws.movesCount,
        elapsedTime: ws.elapsedTime,
        gravityAngle: ws.gravityAngle
      });

      // Handle Victory
      if (ws.isWon && !isVictoryOpen && !victoryHandledRef.current) {
        victoryHandledRef.current = true;
        setIsVictoryOpen(true);

        // Playtesting user drafts never touches the official progress chain
        if (playtestLevel) return;

        // Update progress (computed outside the state updater so the
        // persistence side effect is not buried in a reducer that React may
        // re-invoke, and so it always sees the latest committed progress).
        const prev = progressRef.current;
        const lvlProgress = prev[currentLevel.id] || {
          unlocked: true,
          completed: false,
          starsEarned: 0,
          bestRotations: 0,
          bestTime: 0
        };

        const newStars = Math.max(lvlProgress.starsEarned, starsCount);
        const newRotations = lvlProgress.bestRotations === 0
          ? ws.movesCount
          : Math.min(lvlProgress.bestRotations, ws.movesCount);
        const newTime = lvlProgress.bestTime === 0
          ? ws.elapsedTime
          : Math.min(lvlProgress.bestTime, ws.elapsedTime);

        const updated: Record<number, LevelProgress> = {
          ...prev,
          [currentLevel.id]: {
            unlocked: true,
            completed: true,
            starsEarned: newStars,
            bestRotations: newRotations,
            bestTime: newTime
          }
        };

        // Unlock next level if exists
        const nextLvl = LEVELS[currentLevelIndex + 1];
        if (nextLvl && (!updated[nextLvl.id] || !updated[nextLvl.id].unlocked)) {
          updated[nextLvl.id] = {
            ...(updated[nextLvl.id] || {
              completed: false,
              starsEarned: 0,
              bestRotations: 0,
              bestTime: 0
            }),
            unlocked: true
          };
        }

        saveLevelProgress(updated);
        setProgress(updated);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [currentLevel, currentLevelIndex, isVictoryOpen, playtestLevel]);

  // Rotation Controls
  const handleRotateStep = useCallback((delta: number) => {
    sound.unlock();
    sound.playRotate();
    const ws = worldStateRef.current;
    ws.gravityAngle += delta;
    ws.movesCount += 1;

    setHudState(prev => ({
      ...prev,
      gravityAngle: ws.gravityAngle,
      rotationsCount: ws.movesCount
    }));
  }, []);

  const handleSetAngle = useCallback((angle: number) => {
    sound.unlock();
    const ws = worldStateRef.current;
    const oldQuad = Math.round(ws.gravityAngle / (Math.PI / 2));
    const newQuad = Math.round(angle / (Math.PI / 2));

    if (oldQuad !== newQuad) {
      sound.playRotate();
      ws.movesCount += 1;
    }

    ws.gravityAngle = angle;
    setHudState(prev => ({
      ...prev,
      gravityAngle: ws.gravityAngle,
      rotationsCount: ws.movesCount
    }));
  }, []);

  const handleNudgeBall = useCallback(() => {
    sound.unlock();
    const ws = worldStateRef.current;
    if (ws.ball.dead || ws.isWon) return;

    // Give a slight kinetic impulse along current gravity or random slight nudge
    const impulse = 180;
    const angle = ws.gravityAngle + (Math.random() - 0.5) * 0.4;
    ws.ball.vx += Math.sin(angle) * impulse;
    ws.ball.vy += Math.cos(angle) * impulse;

    sound.playImpact(80);
    ws.ripples.push({
      x: ws.ball.x,
      y: ws.ball.y,
      radius: ws.ball.radius,
      maxRadius: 36,
      alpha: 0.9,
      color: 'rgba(56, 189, 248, 0.7)',
      lineWidth: 2
    });
  }, []);

  // Gyroscope orientation handler
  const handleToggleGyro = async () => {
    sound.unlock();
    if (isGyroActive) {
      setIsGyroActive(false);
      return;
    }

    // Check for DeviceOrientationEvent permission (iOS 13+)
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (response === 'granted') {
          setIsGyroActive(true);
        }
      } catch {
        // Fallback
        setIsGyroActive(true);
      }
    } else {
      setIsGyroActive(true);
    }
  };

  useEffect(() => {
    if (!isGyroActive) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma: Left/Right tilt (-90 to 90)
      // beta: Front/Back tilt (-180 to 180)
      const gx = e.gamma / 45; // Normalized
      const gy = (e.beta - 40) / 45; // Calibrated for holding phone naturally at 40° angle

      let angle = Math.atan2(gx, gy);
      if (angle < 0) angle += Math.PI * 2;

      const ws = worldStateRef.current;
      ws.gravityAngle = angle;
      setHudState(prev => ({ ...prev, gravityAngle: angle }));
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isGyroActive]);

  // Next level handler
  const handleNextLevel = () => {
    if (playtestLevel) return; // defensive: playtest uses the editor bar instead
    if (currentLevelIndex < LEVELS.length - 1) {
      setCurrentLevelIndex(currentLevelIndex + 1);
    }
  };

  // Editor playtest roundtrip
  const handlePlaytestLevel = useCallback((cfg: LevelConfig) => {
    setPlaytestLevel(cfg);
    setPlaytestOrigin('editor');
    setPlayingUserKey(null);
    setIsEditorOpen(false);
    setIsVictoryOpen(false);
  }, []);

  // Library playtest: launch a saved user level straight from the level select
  const handlePlayUserLevel = useCallback((entry: StoredUserLevel) => {
    setPlaytestLevel(entry.config);
    setPlaytestOrigin('library');
    setPlayingUserKey(entry.id);
    setIsVictoryOpen(false);
  }, []);

  const handleExitPlaytest = useCallback(() => {
    setPlaytestLevel(null);
    setPlayingUserKey(null);
    setIsVictoryOpen(false);
    if (playtestOrigin === 'editor') {
      setIsEditorOpen(true);
    } else {
      setIsLevelSelectOpen(true);
    }
  }, [playtestOrigin]);

  const handleDeleteUserLevel = useCallback((entry: StoredUserLevel) => {
    if (!window.confirm(`确定删除「${entry.name}」？此操作不可撤销。`)) return;
    const { list, ok } = deleteUserLevel(entry.id);
    setUserLevels(list);
    if (!ok) window.alert('删除操作未能写入存储（存储空间不足或不可用），刷新后可能恢复。');
    if (playingUserKey === entry.id) {
      setPlaytestLevel(null);
      setPlayingUserKey(null);
    }
  }, [playingUserKey]);

  const handleCopyUserLevelCode = useCallback((entry: StoredUserLevel) => {
    const code = encodeLevelShareCode(entry.config);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => window.alert(`「${entry.name}」的分享码已复制到剪贴板。`),
        () => window.prompt('复制下方分享码：', code)
      );
    } else {
      window.prompt('复制下方分享码：', code);
    }
  }, []);

  const handleReplay = () => {
    initLevel(currentLevel);
  };

  // Global "R" resets the level — the HUD button already promises this shortcut.
  // Skipped while typing, or while any modal captures the stage.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // keep browser reload shortcuts intact
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)
      ) return;
      if (
        isLevelSelectOpen || isGuideOpen || isSandboxOpen ||
        isVictoryOpen || isEditorOpen || isCachePurgeOpen || isSkinPickerOpen || showOnboarding
      ) return;
      handleReplay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isLevelSelectOpen, isGuideOpen, isSandboxOpen,
    isVictoryOpen, isEditorOpen, isCachePurgeOpen, isSkinPickerOpen, showOnboarding, handleReplay
  ]);

  const handleApplySandbox = (customObs: AnyObstacle[], gravityScale: number, bounciness: number) => {
    // Sandbox physics sliders now drive real runtime params (resolved on top of level config)
    const overrides: Partial<PhysicsParams> = {
      gravityScale,
      restitution: bounciness
    };
    initLevel(
      {
        ...currentLevel,
        obstacles: customObs.length > 0 ? customObs : currentLevel.obstacles
      },
      overrides
    );
  };

  // Share code: export current level to clipboard (fallback to prompt copy)
  const handleExportLevelCode = useCallback(() => {
    const code = encodeLevelShareCode(currentLevel);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => window.alert('分享码已复制到剪贴板，可粘贴给其他玩家。'),
        () => window.prompt('复制下方分享码：', code)
      );
    } else {
      window.prompt('复制下方分享码：', code);
    }
  }, [currentLevel]);

  // Share code: import -> instantly play the decoded level (sandbox-style, non-persistent)
  const handleImportLevelCode = useCallback((code: string): boolean => {
    const level = decodeLevelShareCode(code);
    if (!level) return false;
    const idx = LEVELS.findIndex(l => l.id === level.id);
    if (idx !== -1) {
      // Known level id: swap its config in place so progress/UX stays consistent
      LEVELS[idx] = level;
      setCurrentLevelIndex(idx);
      initLevel(level);
    } else {
      initLevel(level);
    }
    return true;
  }, [initLevel]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden flex flex-col ${
      theme === 'dark' ? 'bg-[#07080c] text-stone-100' : 'bg-[#f8fafc] text-stone-900'
    }`}>
      
      {/* Top Bar HUD */}
      <HUD
        currentLevel={currentLevel}
        starsCollected={hudState.starsCollected}
        rotationsCount={hudState.rotationsCount}
        elapsedTime={hudState.elapsedTime}
        theme={theme}
        isMuted={isMuted}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          sound.setMuted(next);
        }}
        isShakeOn={isShakeOn}
        onToggleShake={() => {
          const next = !isShakeOn;
          setShakeEnabled(next);
          setIsShakeOn(next);
        }}
        onResetLevel={handleReplay}
        onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        onOpenSandbox={() => setIsSandboxOpen(true)}
        onOpenEditor={() => setIsEditorOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenCachePurge={() => setIsCachePurgeOpen(true)}
        onOpenSkinPicker={() => setIsSkinPickerOpen(true)}
      />

      {/* Main Interactive Game Arena */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
        <GameCanvas
          worldState={worldStateRef.current}
          arenaWidth={currentLevel.arenaWidth}
          arenaHeight={currentLevel.arenaHeight}
          theme={theme}
          onRotateStep={handleRotateStep}
          onNudgeBall={handleNudgeBall}
        />

        {/* Level Artistic Epigraph & Instruction Banner (hidden during playtest) */}
        {!playtestLevel && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10 flex flex-col items-center gap-1.5 max-w-[94vw] text-center">
            {currentLevel.poem && (
              <div className="text-[12px] md:text-[13px] font-serif-title tracking-wider text-sky-400 dark:text-sky-300 light:text-sky-800 font-medium drop-shadow-sm">
                「{currentLevel.poem}」
              </div>
            )}
            <div className="px-4 py-1 rounded-full bg-stone-900/60 dark:bg-stone-950/70 light:bg-white/80 backdrop-blur-md border border-stone-800/80 dark:border-stone-800 light:border-stone-200 text-xs text-stone-300 dark:text-stone-300 light:text-stone-700 shadow-md truncate">
              {currentLevel.instruction}
            </div>
          </div>
        )}

        {/* Beginner: contextual first-seen mechanism tip (right side) */}
        {!isEditorPlaytest && tipQueue.length > 0 && (
          <MechanismToast
            queue={tipQueue}
            onDismiss={handleDismissTip}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        )}

        {/* Beginner: collapsible per-level hints (left side) */}
        {!playtestLevel && currentLevel.hints && currentLevel.hints.length > 0 && (
          <HintCard key={currentLevel.id} hints={currentLevel.hints} levelCode={currentLevel.code} />
        )}

        {/* Playtest bar: editor roundtrip controls */}
        {playtestLevel && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 backdrop-blur-md shadow-lg">
            <span className="text-xs font-medium text-emerald-300">
              试玩模式 · {playtestLevel.code} {playtestLevel.title}
            </span>
            <button
              onClick={handleExitPlaytest}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
            >
              {playtestOrigin === 'library' ? '返回关卡库' : '返回编辑器'}
            </button>
          </div>
        )}

        {/* Bottom Floating Interactive Compass Dial */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <CompassControl
            gravityAngle={hudState.gravityAngle}
            onRotateStep={handleRotateStep}
            onSetAngle={handleSetAngle}
            onNudgeBall={handleNudgeBall}
            isGyroActive={isGyroActive}
            onToggleGyro={handleToggleGyro}
            theme={theme}
            continuous={continuousRotation}
            onToggleContinuous={() => setContinuousRotation(c => !c)}
            keyboardEnabled={
              !isLevelSelectOpen && !isGuideOpen && !isSandboxOpen &&
              !isVictoryOpen && !isEditorOpen && !isCachePurgeOpen &&
              !isSkinPickerOpen && !showOnboarding
            }
          />
        </div>
      </main>

      {/* Modals */}
      <LevelSelectModal
        levels={LEVELS}
        currentLevelId={currentLevel.id}
        progress={progress}
        isOpen={isLevelSelectOpen}
        onClose={() => setIsLevelSelectOpen(false)}
        onSelectLevel={(id) => {
          const idx = LEVELS.findIndex(l => l.id === id);
          if (idx !== -1) setCurrentLevelIndex(idx);
        }}
        theme={theme}
        userLevels={userLevels}
        playingUserKey={playingUserKey}
        onPlayUserLevel={handlePlayUserLevel}
        onDeleteUserLevel={handleDeleteUserLevel}
        onCopyUserLevelCode={handleCopyUserLevelCode}
        onOpenEditor={() => setIsEditorOpen(true)}
      />

      <VictoryModal
        level={currentLevel}
        starsEarned={hudState.starsCollected}
        rotationsTaken={hudState.rotationsCount}
        elapsedTime={hudState.elapsedTime}
        isOpen={isVictoryOpen}
        onNextLevel={handleNextLevel}
        onReplay={handleReplay}
        onOpenLevelSelect={() => {
          setIsVictoryOpen(false);
          setIsLevelSelectOpen(true);
        }}
        onDismiss={() => setIsVictoryOpen(false)}
        hasNextLevel={!playtestLevel && currentLevelIndex < LEVELS.length - 1}
        theme={theme}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        theme={theme}
        onReplayTutorial={() => {
          setIsGuideOpen(false);
          setShowOnboarding(true);
        }}
      />

      <SandboxStudio
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        onApplySandboxConfig={handleApplySandbox}
        onResetSandbox={handleReplay}
        onExportLevelCode={handleExportLevelCode}
        onImportLevelCode={handleImportLevelCode}
        theme={theme}
      />

      <LevelEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onPlaytest={handlePlaytestLevel}
        theme={theme}
      />

      {/* First-launch onboarding walkthrough (topmost layer) */}
      <OnboardingModal
        isOpen={showOnboarding}
        onFinish={handleFinishOnboarding}
        theme={theme}
      />

      {/* Thorough cache purge confirmation */}
      <CachePurgeModal
        isOpen={isCachePurgeOpen}
        onClose={() => setIsCachePurgeOpen(false)}
        theme={theme}
      />

      {/* Ball skin picker */}
      <SkinPickerModal
        isOpen={isSkinPickerOpen}
        onClose={() => setIsSkinPickerOpen(false)}
        theme={theme}
      />

    </div>
  );
}
