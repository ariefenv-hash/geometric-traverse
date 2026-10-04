import { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
  // Level 1: Genesis Axis
  {
    id: 1,
    code: 'LV-01',
    title: '轴向初现',
    subtitle: 'Genesis Axis',
    poem: '万物皆由轴心而生，每一次坠落都是探索的序章。',
    instruction: '点击旋转按钮或使用 A/D 键翻转重力，搜集 3 颗星核以开启归元之门。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 120 },
    exit: { x: 400, y: 720, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 120, y: 400, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 680, y: 400, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 400, y: 400, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Central floating diamond divider
      { id: 'w1', type: 'wall', x: 260, y: 260, width: 280, height: 20 },
      { id: 'w2', type: 'wall', x: 260, y: 520, width: 280, height: 20 },
      // Side shelves
      { id: 'w3', type: 'wall', x: 80, y: 200, width: 20, height: 400 },
      { id: 'w4', type: 'wall', x: 700, y: 200, width: 20, height: 400 },
      // Funnel guides
      { id: 'w5', type: 'wall', x: 300, y: 640, width: 80, height: 16 },
      { id: 'w6', type: 'wall', x: 420, y: 640, width: 80, height: 16 }
    ],
    parRotations: 4,
    parTime: 18
  },

  // Level 2: Angular Corridor
  {
    id: 2,
    code: 'LV-02',
    title: '折角回廊',
    subtitle: 'Angular Corridor',
    poem: '在光与影的折角处，方向不过是一种视觉的执念。',
    instruction: '在球体滑落至边缘前旋转视角，改变重力轨迹贯穿折角迷宫。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 120, y: 120 },
    exit: { x: 680, y: 680, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 680, y: 120, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 120, y: 500, radius: 10, collected: false, pulsePhase: 1.5 },
      { id: 's3', x: 500, y: 680, radius: 10, collected: false, pulsePhase: 3.0 }
    ],
    obstacles: [
      // Zigzag shelves
      { id: 'w1', type: 'wall', x: 60, y: 220, width: 500, height: 20 },
      { id: 'w2', type: 'wall', x: 240, y: 380, width: 500, height: 20 },
      { id: 'w3', type: 'wall', x: 60, y: 560, width: 500, height: 20 },
      // Vertical baffles
      { id: 'w4', type: 'wall', x: 240, y: 220, width: 20, height: 80 },
      { id: 'w5', type: 'wall', x: 560, y: 460, width: 20, height: 100 }
    ],
    parRotations: 5,
    parTime: 22
  },

  // Level 3: Phase Horizon
  {
    id: 3,
    code: 'LV-03',
    title: '透光相界',
    subtitle: 'Phase Horizon',
    poem: '当视界旋转九十度，顽石亦能化作自由呼吸的虚空。',
    instruction: '虚线相界只在特定视角下凝聚为实体。旋转至横向重力时可自由穿透！',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 120 },
    exit: { x: 400, y: 700, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 220, y: 400, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 400, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 580, y: 400, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Solid outer barriers
      { id: 'w1', type: 'wall', x: 100, y: 260, width: 200, height: 20 },
      { id: 'w2', type: 'wall', x: 500, y: 260, width: 200, height: 20 },
      { id: 'w3', type: 'wall', x: 100, y: 540, width: 200, height: 20 },
      { id: 'w4', type: 'wall', x: 500, y: 540, width: 200, height: 20 },

      // Phase Barriers in center: Solid when vertical (0: down, 2: up), permeable when horizontal (1, 3)
      {
        id: 'pb1',
        type: 'phase_barrier',
        x: 300,
        y: 260,
        width: 200,
        height: 20,
        solidOrientations: [0, 2] // Solid in vertical gravity
      },
      {
        id: 'pb2',
        type: 'phase_barrier',
        x: 300,
        y: 540,
        width: 200,
        height: 20,
        solidOrientations: [0, 2] // Solid in vertical gravity
      },
      // Vertical side phase barriers: Solid in horizontal (1, 3)
      {
        id: 'pb3',
        type: 'phase_barrier',
        x: 100,
        y: 280,
        width: 20,
        height: 260,
        solidOrientations: [1, 3]
      },
      {
        id: 'pb4',
        type: 'phase_barrier',
        x: 680,
        y: 280,
        width: 20,
        height: 260,
        solidOrientations: [1, 3]
      }
    ],
    parRotations: 6,
    parTime: 25
  },

  // Level 4: Sliding Monolith
  {
    id: 4,
    code: 'LV-04',
    title: '天平滑块',
    subtitle: 'Gravity Rail',
    poem: '动量是沉默的信使，巨石亦能在虚空中架起虹桥。',
    instruction: '悬空的实体巨石受重力驱使滑动，将其化作跨越虚空的悬桥。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 140, y: 140 },
    exit: { x: 680, y: 680, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 400, y: 140, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 560, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 680, y: 360, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Top platform
      { id: 'w1', type: 'wall', x: 80, y: 220, width: 220, height: 20 },
      { id: 'w2', type: 'wall', x: 500, y: 220, width: 220, height: 20 },

      // Sliding Monolith bridging the gap between w1 and w2
      {
        id: 'sb1',
        type: 'sliding_block',
        x: 300,
        y: 215,
        width: 140,
        height: 30,
        vx: 0,
        vy: 0,
        minX: 200,
        maxX: 600,
        minY: 215,
        maxY: 215,
        mass: 3
      },

      // Middle divider
      { id: 'w3', type: 'wall', x: 80, y: 460, width: 640, height: 20 },

      // Vertical Sliding Monolith in bottom chamber
      {
        id: 'sb2',
        type: 'sliding_block',
        x: 520,
        y: 500,
        width: 30,
        height: 140,
        vx: 0,
        vy: 0,
        minX: 520,
        maxX: 520,
        minY: 480,
        maxY: 740,
        mass: 3
      },

      // Bottom support
      { id: 'w4', type: 'wall', x: 260, y: 620, width: 260, height: 20 }
    ],
    parRotations: 6,
    parTime: 28
  },

  // Level 5: Laser Refraction
  {
    id: 5,
    code: 'LV-05',
    title: '极光折射',
    subtitle: 'Laser Refraction',
    poem: '纯粹的光线穿透黑暗，唯有坚毅的实体方可作为屏障。',
    instruction: '致命光束将湮灭触碰的球体。翻转重力让巨石滑行以阻断激光。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 120, y: 700 },
    exit: { x: 120, y: 120, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 400, y: 700, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 400, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 680, y: 120, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Central laser emitter firing across the arena
      {
        id: 'lem1',
        type: 'laser_emitter',
        x: 60,
        y: 395,
        width: 24,
        height: 24,
        direction: 'right',
        active: true
      },

      // Shield sliding block that can block the laser
      {
        id: 'sb1',
        type: 'sliding_block',
        x: 350,
        y: 350,
        width: 90,
        height: 110,
        vx: 0,
        vy: 0,
        minX: 350,
        maxX: 350,
        minY: 260,
        maxY: 540,
        mass: 4
      },

      // Chamber walls
      { id: 'w1', type: 'wall', x: 220, y: 200, width: 20, height: 400 },
      { id: 'w2', type: 'wall', x: 560, y: 200, width: 20, height: 400 },
      { id: 'w3', type: 'wall', x: 220, y: 200, width: 240, height: 20 },
      { id: 'w4', type: 'wall', x: 340, y: 600, width: 240, height: 20 }
    ],
    parRotations: 7,
    parTime: 30
  },

  // Level 6: Levitation Well
  {
    id: 6,
    code: 'LV-06',
    title: '浮力涌泉',
    subtitle: 'Levitation Well',
    poem: '逆流而上，在深渊的井口感知反重力的温柔托举。',
    instruction: '蓝色引力涌泉将向上推升小球。巧妙借助反重力在深井中跃升。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 120, y: 700 },
    exit: { x: 680, y: 120, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 400, y: 680, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 380, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 400, y: 120, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Deep central vertical well
      { id: 'w1', type: 'wall', x: 280, y: 160, width: 20, height: 600 },
      { id: 'w2', type: 'wall', x: 500, y: 160, width: 20, height: 600 },

      // Anti-gravity field inside the central well
      {
        id: 'ag1',
        type: 'anti_gravity',
        x: 300,
        y: 200,
        width: 200,
        height: 520,
        force: 2.2
      },

      // Staggered horizontal ledges
      { id: 'w3', type: 'wall', x: 100, y: 460, width: 180, height: 20 },
      { id: 'w4', type: 'wall', x: 520, y: 340, width: 180, height: 20 }
    ],
    parRotations: 6,
    parTime: 25
  },

  // Level 7: Quantum Rift
  {
    id: 7,
    code: 'LV-07',
    title: '折跃双星',
    subtitle: 'Quantum Rift',
    poem: '空间不过是一张对折的纸，两端在相触时本为一体。',
    instruction: '紫光折跃门相连互通，携带速度瞬间穿越至隔绝的异维空间。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 140, y: 140 },
    exit: { x: 660, y: 660, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 260, y: 400, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 660, y: 140, radius: 10, collected: false, pulsePhase: 1.5 },
      { id: 's3', x: 140, y: 660, radius: 10, collected: false, pulsePhase: 3.0 }
    ],
    obstacles: [
      // Dividing cross walls forming 4 isolated quadrants
      { id: 'w_center_h', type: 'wall', x: 0, y: 390, width: 800, height: 20 },
      { id: 'w_center_v', type: 'wall', x: 390, y: 0, width: 20, height: 800 },

      // Portals
      // Portal A (Top-Left) links to Portal B (Bottom-Left)
      {
        id: 'p_a',
        type: 'portal',
        x: 130,
        y: 330,
        width: 40,
        height: 40,
        radius: 24,
        targetPortalId: 'p_b'
      },
      {
        id: 'p_b',
        type: 'portal',
        x: 130,
        y: 440,
        width: 40,
        height: 40,
        radius: 24,
        targetPortalId: 'p_a'
      },

      // Portal C (Bottom-Left) links to Portal D (Top-Right)
      {
        id: 'p_c',
        type: 'portal',
        x: 320,
        y: 650,
        width: 40,
        height: 40,
        radius: 24,
        targetPortalId: 'p_d'
      },
      {
        id: 'p_d',
        type: 'portal',
        x: 450,
        y: 130,
        width: 40,
        height: 40,
        radius: 24,
        targetPortalId: 'p_c'
      },

      // Phase Barrier between Top-Right and Bottom-Right quadrants
      {
        id: 'pb_rift',
        type: 'phase_barrier',
        x: 550,
        y: 390,
        width: 140,
        height: 20,
        solidOrientations: [0, 2] // Solid in vertical, permeable in horizontal
      }
    ],
    parRotations: 8,
    parTime: 32
  },

  // Level 8: Tetra-Labyrinth
  {
    id: 8,
    code: 'LV-08',
    title: '四相迷宫',
    subtitle: 'Tetra-Labyrinth',
    poem: '四相更迭流转，每一次凝视，都在重构整个宇宙的形态。',
    instruction: '每一次 90° 旋转都会改变四相门的固液形态，按顺序解开多重视界。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 400 },
    exit: { x: 700, y: 700, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 120, y: 120, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 680, y: 120, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 120, y: 680, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Central chamber box
      { id: 'w1', type: 'wall', x: 300, y: 300, width: 70, height: 20 },
      { id: 'w2', type: 'wall', x: 430, y: 300, width: 70, height: 20 },
      { id: 'w3', type: 'wall', x: 300, y: 480, width: 70, height: 20 },
      { id: 'w4', type: 'wall', x: 430, y: 480, width: 70, height: 20 },

      // Phase Gates guarding central chamber exits
      {
        id: 'pb_top',
        type: 'phase_barrier',
        x: 370,
        y: 300,
        width: 60,
        height: 20,
        solidOrientations: [0, 2]
      },
      {
        id: 'pb_bot',
        type: 'phase_barrier',
        x: 370,
        y: 480,
        width: 60,
        height: 20,
        solidOrientations: [1, 3]
      },
      // Concentric rings
      { id: 'w5', type: 'wall', x: 180, y: 180, width: 440, height: 20 },
      { id: 'w6', type: 'wall', x: 180, y: 600, width: 440, height: 20 },
      { id: 'w7', type: 'wall', x: 180, y: 200, width: 20, height: 400 },
      { id: 'w8', type: 'wall', x: 600, y: 200, width: 20, height: 400 },

      // Outer phase breaches
      {
        id: 'pb_outer1',
        type: 'phase_barrier',
        x: 180,
        y: 350,
        width: 20,
        height: 100,
        solidOrientations: [0, 2]
      },
      {
        id: 'pb_outer2',
        type: 'phase_barrier',
        x: 600,
        y: 350,
        width: 20,
        height: 100,
        solidOrientations: [1, 3]
      }
    ],
    parRotations: 9,
    parTime: 35
  },

  // Level 9: Gravitational Synchrony
  {
    id: 9,
    code: 'LV-09',
    title: '引力锁链',
    subtitle: 'Gravitational Synchrony',
    poem: '多重法则彼此纠缠，唯有心止如水方能探寻唯一的通路。',
    instruction: '协同激光、移动盾牌与引力涌泉，精准把握动量与转向时机。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 120, y: 680 },
    exit: { x: 680, y: 120, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 400, y: 680, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 350, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 160, y: 160, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Fatal lasers patrolling the upper zone
      {
        id: 'lem1',
        type: 'laser_emitter',
        x: 40,
        y: 280,
        width: 24,
        height: 24,
        direction: 'right',
        active: true
      },
      // Massive sliding shield on upper rail
      {
        id: 'sb_shield',
        type: 'sliding_block',
        x: 350,
        y: 240,
        width: 100,
        height: 90,
        vx: 0,
        vy: 0,
        minX: 200,
        maxX: 600,
        minY: 240,
        maxY: 240,
        mass: 3
      },

      // Anti-gravity elevator
      {
        id: 'ag_lift',
        type: 'anti_gravity',
        x: 340,
        y: 380,
        width: 120,
        height: 280,
        force: 2.4
      },

      // Phase barriers
      {
        id: 'pb_sync1',
        type: 'phase_barrier',
        x: 200,
        y: 480,
        width: 140,
        height: 20,
        solidOrientations: [0, 2]
      },
      {
        id: 'pb_sync2',
        type: 'phase_barrier',
        x: 460,
        y: 480,
        width: 140,
        height: 20,
        solidOrientations: [1, 3]
      },

      // Anchor walls
      { id: 'w1', type: 'wall', x: 80, y: 560, width: 640, height: 20 },
      { id: 'w2', type: 'wall', x: 200, y: 120, width: 20, height: 340 },
      { id: 'w3', type: 'wall', x: 600, y: 120, width: 20, height: 340 }
    ],
    parRotations: 10,
    parTime: 40
  },

  // Level 10: Apex Horizon (Master Puzzle)
  {
    id: 10,
    code: 'LV-10',
    title: '终末视界',
    subtitle: 'Apex Horizon',
    poem: '穿越所有维度的折叠与贯穿，在此与最初的几何灵韵重逢。',
    instruction: '集大全之作：在超空间折叠中调和多重物理定律，完成最终几何贯穿！',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 400 },
    exit: { x: 400, y: 720, radius: 26, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 140, y: 140, radius: 11, collected: false, pulsePhase: 0 },
      { id: 's2', x: 660, y: 140, radius: 11, collected: false, pulsePhase: 1.5 },
      { id: 's3', x: 400, y: 140, radius: 11, collected: false, pulsePhase: 3.0 }
    ],
    obstacles: [
      // Double intersecting lasers
      {
        id: 'lem_h',
        type: 'laser_emitter',
        x: 40,
        y: 220,
        width: 24,
        height: 24,
        direction: 'right',
        active: true
      },
      {
        id: 'lem_v',
        type: 'laser_emitter',
        x: 388,
        y: 40,
        width: 24,
        height: 24,
        direction: 'down',
        active: true
      },

      // Moving shield block that can block vertical laser
      {
        id: 'sb_v_shield',
        type: 'sliding_block',
        x: 350,
        y: 200,
        width: 100,
        height: 40,
        vx: 0,
        vy: 0,
        minX: 250,
        maxX: 550,
        minY: 200,
        maxY: 200,
        mass: 3
      },

      // Portals
      {
        id: 'p_apex_1',
        type: 'portal',
        x: 120,
        y: 640,
        width: 40,
        height: 40,
        radius: 24,
        targetPortalId: 'p_apex_2'
      },
      {
        id: 'p_apex_2',
        type: 'portal',
        x: 640,
        y: 640,
        width: 40,
        height: 40,
        radius: 24,
        targetPortalId: 'p_apex_1'
      },

      // Phase barriers guarding exit and star chambers
      {
        id: 'pb_apex_exit',
        type: 'phase_barrier',
        x: 300,
        y: 640,
        width: 200,
        height: 20,
        solidOrientations: [0, 2] // Permeable only when horizontal
      },
      {
        id: 'pb_apex_star_l',
        type: 'phase_barrier',
        x: 200,
        y: 100,
        width: 20,
        height: 140,
        solidOrientations: [1, 3]
      },
      {
        id: 'pb_apex_star_r',
        type: 'phase_barrier',
        x: 580,
        y: 100,
        width: 20,
        height: 140,
        solidOrientations: [1, 3]
      },

      // Architectural inner frames
      { id: 'w_apex_1', type: 'wall', x: 260, y: 320, width: 280, height: 20 },
      { id: 'w_apex_2', type: 'wall', x: 260, y: 480, width: 280, height: 20 },
      { id: 'w_apex_3', type: 'wall', x: 260, y: 340, width: 20, height: 140 },
      { id: 'w_apex_4', type: 'wall', x: 520, y: 340, width: 20, height: 140 }
    ],
    parRotations: 12,
    parTime: 45
  }
];

export const PROGRESS_STORAGE_KEY = 'geometrix_traverse_progress_v1';

export function loadLevelProgress(): Record<number, import('./types').LevelProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore fallback
  }

  // Initial defaults
  const initial: Record<number, import('./types').LevelProgress> = {};
  LEVELS.forEach((lvl, idx) => {
    initial[lvl.id] = {
      unlocked: idx === 0,
      completed: false,
      starsEarned: 0,
      bestRotations: 0,
      bestTime: 0
    };
  });
  return initial;
}

export function saveLevelProgress(progress: Record<number, import('./types').LevelProgress>) {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore
  }
}
