import React, { useRef, useEffect, useCallback } from 'react';
import { PhysicsWorldState, ThemeMode } from '../game/types';
import { renderGame } from '../game/renderer';
import { updatePhysics } from '../game/physics';

interface GameCanvasProps {
  worldState: PhysicsWorldState;
  arenaWidth: number;
  arenaHeight: number;
  theme: ThemeMode;
  onRotateStep: (delta: number) => void;
  onNudgeBall: () => void;
  continuous: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldState,
  arenaWidth,
  arenaHeight,
  theme,
  onRotateStep,
  onNudgeBall
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const visualRotationRef = useRef<number>(worldState.gravityAngle);

  // Swipe gesture tracking
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Render & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isMounted = true;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!isMounted) return;

      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Clamp delta time to avoid spiral of death on tab unfocus
      const dt = Math.min(rawDt, 0.05);

      // 1. Update Physics
      updatePhysics(worldState, dt, arenaWidth, arenaHeight);

      // 2. Smooth Visual Camera Rotation Interpolation
      // Handle angle wrapping correctly for shortest rotation path
      let diff = worldState.gravityAngle - visualRotationRef.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      visualRotationRef.current += diff * (1 - Math.exp(-dt * 14));

      // 3. Render Canvas
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.save();
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      renderGame(
        {
          ctx,
          width,
          height,
          theme,
          visualRotation: visualRotationRef.current
        },
        worldState,
        arenaWidth,
        arenaHeight
      );

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [worldState, arenaWidth, arenaHeight, theme]);

  // Handle Resize & DPI Scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    return () => observer.disconnect();
  }, []);

  // Touch Swipe Gesture for quick 90° gravity rotation on canvas
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current || e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
    const dy = e.changedTouches[0].clientY - touchStartPos.current.y;
    const dist = Math.hypot(dx, dy);

    // Swipe threshold 45px
    if (dist > 45) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 0) {
          onRotateStep(Math.PI / 2); // Swipe right -> Clockwise
        } else {
          onRotateStep(-Math.PI / 2); // Swipe left -> Counter-clockwise
        }
      } else {
        // Vertical swipe
        if (dy > 0) {
          onRotateStep(Math.PI);
        } else {
          onNudgeBall();
        }
      }
    } else {
      // Tap on canvas nudges ball
      onNudgeBall();
    }

    touchStartPos.current = null;
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => onNudgeBall()}
    >
      <canvas ref={canvasRef} className="block w-full h-full select-none touch-none" />
    </div>
  );
};
