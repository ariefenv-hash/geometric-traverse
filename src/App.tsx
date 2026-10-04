import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LEVELS, loadLevelProgress, saveLevelProgress } from './game/levels';
import {
  AnyObstacle,
  LevelConfig,
  LevelProgress,
  PhysicsWorldState,
  StarItem,
  ThemeMode
} from './game/types';
import { createInitialBall } from './game/physics';
import { sound } from './game/audio';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { CompassControl } from './components/CompassControl';
import { LevelSelectModal } from './components/LevelSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { GuideModal } from './components/GuideModal';
import { SandboxStudio } from './components/SandboxStudio';

export default function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [progress, setProgress] = useState<Record<number, LevelProgress>>(() => loadLevelProgress());
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [continuousRotation, setContinuousRotation] = useState<boolean>(false);
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);

  // Modals
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);

  const currentLevel: LevelConfig = LEVELS[currentLevelIndex] || LEVELS[0];

  // World physics mutable state
  const worldStateRef = useRef<PhysicsWorldState>({
    ball: createInitialBall(currentLevel.ballStart),
    obstacles: JSON.parse(JSON.stringify(currentLevel.obstacles)),
    stars: JSON.parse(JSON.stringify(currentLevel.stars)),
    exit: JSON.parse(JSON.stringify(currentLevel.exit)),
    gravityAngle: 0,
    targetAngle: 0,
    particles: [],
    ripples: [],
    lasers: [],
    portalCooldown: 0,
    movesCount: 0,
    elapsedTime: 0,
    isWon: false
  });

  // Track UI state for HUD display
  const [hudState, setHudState] = useState({
    starsCollected: 0,
    rotationsCount: 0,
    elapsedTime: 0,
    gravityAngle: 0
  });

  // Reset or load level
  const initLevel = useCallback((lvl: LevelConfig) => {
    worldStateRef.current = {
      ball: createInitialBall(lvl.ballStart),
      obstacles: JSON.parse(JSON.stringify(lvl.obstacles)),
      stars: JSON.parse(JSON.stringify(lvl.stars)),
      exit: JSON.parse(JSON.stringify(lvl.exit)),
      gravityAngle: 0,
      targetAngle: 0,
      particles: [],
      ripples: [],
      lasers: [],
      portalCooldown: 0,
      movesCount: 0,
      elapsedTime: 0,
      isWon: false
    };

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

      // Handle Respawn if dead
      if (ws.ball.dead) {
        setTimeout(() => {
          ws.ball = createInitialBall(currentLevel.ballStart);
        }, 500);
      }

      // Handle Victory
      if (ws.isWon && !isVictoryOpen) {
        setIsVictoryOpen(true);

        // Update progress
        setProgress(prev => {
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
          return updated;
        });
      }
    }, 80);

    return () => clearInterval(timer);
  }, [currentLevel, currentLevelIndex, isVictoryOpen]);

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
    if (currentLevelIndex < LEVELS.length - 1) {
      setCurrentLevelIndex(currentLevelIndex + 1);
    }
  };

  const handleReplay = () => {
    initLevel(currentLevel);
  };

  const handleApplySandbox = (customObs: AnyObstacle[], gravityScale: number, bounciness: number) => {
    const ws = worldStateRef.current;
    if (customObs.length > 0) {
      ws.obstacles = customObs;
    }
    // Update physics constants
    initLevel({
      ...currentLevel,
      obstacles: customObs.length > 0 ? customObs : currentLevel.obstacles
    });
  };

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
        onResetLevel={handleReplay}
        onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        onOpenSandbox={() => setIsSandboxOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
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
          continuous={continuousRotation}
        />

        {/* Level Artistic Epigraph & Instruction Banner */}
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
        hasNextLevel={currentLevelIndex < LEVELS.length - 1}
        theme={theme}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        theme={theme}
      />

      <SandboxStudio
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        onApplySandboxConfig={handleApplySandbox}
        onResetSandbox={handleReplay}
        theme={theme}
      />

    </div>
  );
}
