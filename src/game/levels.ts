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
    hints: [
      '屏幕“下方”不是永远的方向：底部罗盘的指针指向小球坠落的方向。点按左右箭头或按 A / D 键旋转 90°。',
      '目标：先吃满 3 颗星核，底部的归元门才会解锁；然后坠入光环即可通关。',
      '小球卡住不动？按空格键给它一个沿重力方向的微冲（移动端轻点画面任意处）。',
      '随时可按 S 键或点罗盘正下方按钮，让重力回正向下。慢慢来，观察清楚再旋转。'
    ],
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
    hints: [
      '折角地形的核心是“提前旋转”：在球滑到平台边缘之前，就让它朝着下一层坠落。',
      '坠落途中也可以旋转重力——空中变向常常能救回一次险情。',
      '时间不是敌人：先看清路线再动手，步数越接近标准步数评价越好。'
    ],
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
    hints: [
      '相界口诀：虚线 = 可穿透，实体 = 有碰撞。每次旋转后先看一眼再行动。',
      '本关中央两条横置相界：重力竖直时是实体，旋转到左右侧重力时变回虚线。',
      '两侧竖置相界恰好相反：只在水平重力时实体，竖直重力下可以穿墙而过。'
    ],
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
    hints: [
      '滑块始终顺着重力滑到导轨尽头：旋转重力，让它停在你需要的空档上。',
      '把滑块当作活动桥梁：先看清缺口位置，再决定让哪块石头滑过去。',
      '滑块也会砸到小球——别站在它的必经之路上。'
    ],
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
    hints: [
      '红色光束一触即灭，但它挡不住石头：引导滑块滑进光路，实体阴影会替你遮住激光。',
      '观察发射器的炮口朝向：光束从炮口直线射出，被实体挡住后才会截止。',
      '湮灭并不可怕：小球会在起点自动重生，已推动的滑块位置保持不变。'
    ],
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
      { id: 's1', x: 260, y: 365, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 660, y: 140, radius: 10, collected: false, pulsePhase: 1.5 },
      { id: 's3', x: 140, y: 660, radius: 10, collected: false, pulsePhase: 3.0 }
    ],
    obstacles: [
      // Dividing cross walls forming 4 quadrants. The horizontal wall is cut
      // around pb_rift so the breach actually opens (fix: the old unbroken
      // wall made the rift permanently solid, sealing the bottom-right
      // quadrant and soft-locking the level).
      { id: 'w_h_left', type: 'wall', x: 0, y: 390, width: 550, height: 20 },
      { id: 'w_h_right', type: 'wall', x: 690, y: 390, width: 110, height: 20 },
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
      // Concentric rings. The left/right walls are cut around the outer
      // phase breaches so they can actually open (fix: the breaches used to
      // overlap solid wall, sealing the ring forever).
      { id: 'w5', type: 'wall', x: 180, y: 180, width: 440, height: 20 },
      { id: 'w6', type: 'wall', x: 180, y: 600, width: 440, height: 20 },
      { id: 'w7a', type: 'wall', x: 180, y: 200, width: 20, height: 150 },
      { id: 'w7b', type: 'wall', x: 180, y: 450, width: 20, height: 150 },
      { id: 'w8a', type: 'wall', x: 600, y: 200, width: 20, height: 150 },
      { id: 'w8b', type: 'wall', x: 600, y: 450, width: 20, height: 150 },

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
      // Bottom wall of the spawn box is cut around pb_apex_box (fix: the box
      // used to be sealed on all four sides, imprisoning the ball at spawn —
      // the phase gate now opens a downward escape at vertical gravity).
      { id: 'w_apex_2a', type: 'wall', x: 260, y: 480, width: 120, height: 20 },
      { id: 'w_apex_2b', type: 'wall', x: 440, y: 480, width: 100, height: 20 },
      { id: 'w_apex_3', type: 'wall', x: 260, y: 340, width: 20, height: 140 },
      { id: 'w_apex_4', type: 'wall', x: 520, y: 340, width: 20, height: 140 },
      {
        id: 'pb_apex_box',
        type: 'phase_barrier',
        x: 380,
        y: 480,
        width: 60,
        height: 20,
        solidOrientations: [1, 3] // permeable at vertical gravity so the ball can leave the box
      }
    ],
    parRotations: 12,
    parTime: 45
  },

  // Level 11: Bounce Gallery
  {
    id: 11,
    code: 'LV-11',
    title: '弹射回廊',
    subtitle: 'Bounce Gallery',
    poem: '翠色的垫石铭记着方向，坠落亦可化作升腾的起点。',
    instruction: '翠色弹力垫会将小球沿箭头方向高速弹射，配合重力翻转搭建弹射路径。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 120, y: 680 },
    exit: { x: 680, y: 120, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 400, y: 680, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 400, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 400, y: 140, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Central launch pad (sits on the floor line so a rolling ball hits it)
      { id: 'bp1', type: 'bumper', x: 280, y: 756, width: 240, height: 24, direction: 'up', strength: 1050 },
      // Mid shelves framing the central shaft
      { id: 'w1', type: 'wall', x: 0, y: 380, width: 240, height: 20 },
      { id: 'w2', type: 'wall', x: 560, y: 380, width: 240, height: 20 },
      // Side bumpers for horizontal redirection
      { id: 'bp2', type: 'bumper', x: 60, y: 120, width: 24, height: 120, direction: 'right', strength: 850 },
      { id: 'bp3', type: 'bumper', x: 716, y: 560, width: 24, height: 120, direction: 'left', strength: 850 }
    ],
    physics: { restitution: 0.3 },
    parRotations: 6,
    parTime: 28
  },

  // Level 12: Wallbreaker
  {
    id: 12,
    code: 'LV-12',
    title: '破壁者',
    subtitle: 'Wallbreaker',
    poem: '顽石亦有裂痕，蓄满动量的一击是穿越壁垒的唯一语言。',
    instruction: '赭色裂纹墙会被高速冲击击碎。翻转重力为小球蓄力，撞破两道脆壁抵达彼岸。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 120, y: 400 },
    exit: { x: 680, y: 680, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 680, y: 120, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 400, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 120, y: 120, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Full-height fragile membranes: breaking through is mandatory
      { id: 'fw1', type: 'fragile_wall', x: 300, y: 0, width: 20, height: 800, hp: 2, maxHp: 2, impactThreshold: 220 },
      { id: 'fw2', type: 'fragile_wall', x: 480, y: 0, width: 20, height: 800, hp: 2, maxHp: 2, impactThreshold: 220 },
      // Smooth ledges to redirect the charge run
      { id: 'w1', type: 'wall', x: 60, y: 240, width: 180, height: 16 },
      { id: 'w2', type: 'wall', x: 560, y: 560, width: 180, height: 16 }
    ],
    parRotations: 5,
    parTime: 32
  },

  // Level 13: One-Way Current
  {
    id: 13,
    code: 'LV-13',
    title: '单向涡流',
    subtitle: 'One-Way Current',
    poem: '涡流只记得一个方向，归途永远藏在另一条走廊的尽头。',
    instruction: '单向闸门只允许小球沿箭头方向穿越。顺流而下易，逆流而上需另寻通路。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 120 },
    exit: { x: 400, y: 740, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 300, y: 360, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 600, y: 560, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 120, y: 120, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Shelf 1: band1 -> band2 only via og1 (down, right side)
      { id: 'w1a', type: 'wall', x: 0, y: 260, width: 560, height: 20 },
      { id: 'og1', type: 'one_way_gate', x: 560, y: 260, width: 80, height: 20, passDirection: 'down', tolerance: 30 },
      { id: 'w1b', type: 'wall', x: 640, y: 260, width: 160, height: 20 },
      // Shelf 2: band2 -> band3 only via og2 (down, left side); og4 lets band3 flow back up on the right
      { id: 'w2a', type: 'wall', x: 0, y: 460, width: 160, height: 20 },
      { id: 'og2', type: 'one_way_gate', x: 160, y: 460, width: 80, height: 20, passDirection: 'down', tolerance: 30 },
      { id: 'w2b', type: 'wall', x: 240, y: 460, width: 400, height: 20 },
      { id: 'og4', type: 'one_way_gate', x: 640, y: 460, width: 80, height: 20, passDirection: 'up', tolerance: 30 },
      { id: 'w2c', type: 'wall', x: 720, y: 460, width: 80, height: 20 },
      // Shelf 3: band3 -> bottom only via og3 (down, right side)
      { id: 'w3a', type: 'wall', x: 0, y: 660, width: 560, height: 20 },
      { id: 'og3', type: 'one_way_gate', x: 560, y: 660, width: 80, height: 20, passDirection: 'down', tolerance: 30 },
      { id: 'w3b', type: 'wall', x: 640, y: 660, width: 160, height: 20 }
    ],
    parRotations: 6,
    parTime: 30
  },

  // Level 14: Weighted Verdict
  {
    id: 14,
    code: 'LV-14',
    title: '权衡之门',
    subtitle: 'Weighted Verdict',
    poem: '重量是无声的钥匙，落于石板之上，沉睡的门扉便会苏醒。',
    instruction: '紫色压力板感应小球重量并联动同色闸门。带菱形纹的压力板一经触发将永久锁存。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 150, y: 560 },
    exit: { x: 680, y: 680, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 680, y: 140, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 440, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 110, y: 120, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Central spine wall with linked door lg1
      { id: 'w_spine_top', type: 'wall', x: 380, y: 0, width: 20, height: 340 },
      { id: 'lg1', type: 'linked_gate', x: 380, y: 340, width: 20, height: 200 },
      { id: 'w_spine_bot', type: 'wall', x: 380, y: 540, width: 20, height: 260 },
      // Latched plate on the left floor: falling through it opens lg1 forever
      { id: 'pp1', type: 'pressure_plate', x: 80, y: 640, width: 140, height: 24, linkId: 'lg1', latch: true },
      // Upper-left chamber (holds s3) sealed by lg2
      { id: 'w_ch_top', type: 'wall', x: 220, y: 0, width: 20, height: 60 },
      { id: 'lg2', type: 'linked_gate', x: 220, y: 60, width: 20, height: 180 },
      { id: 'w_ch_bot', type: 'wall', x: 220, y: 240, width: 20, height: 40 },
      // Mid ledge with latched plate pp2 -> lg2
      { id: 'w_ledge', type: 'wall', x: 0, y: 360, width: 360, height: 20 },
      { id: 'pp2', type: 'pressure_plate', x: 60, y: 320, width: 120, height: 24, linkId: 'lg2', latch: true }
    ],
    parRotations: 7,
    parTime: 34
  },

  // Level 15: Grand Unification
  {
    id: 15,
    code: 'LV-15',
    title: '万象贯穿',
    subtitle: 'Grand Unification',
    poem: '弹射、碎裂、单向与权衡，所有法则在此和弦中共鸣。',
    instruction: '集大成试炼：弹力垫升空、往复撞击破壁、压板开启终门，完成最终几何贯穿！',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 400, y: 700 },
    exit: { x: 400, y: 90, radius: 26, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 200, y: 240, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 600, y: 240, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 280, y: 776, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Launch pad on the floor
      { id: 'bp1', type: 'bumper', x: 300, y: 756, width: 200, height: 24, direction: 'up', strength: 1150 },
      // Mid-air fragile membrane gating the ascent (breaks after repeated slams)
      { id: 'fw1', type: 'fragile_wall', x: 100, y: 360, width: 600, height: 20, hp: 2, maxHp: 2, impactThreshold: 350 },
      // Top corridor floor with a central launch gap + side walls
      { id: 'w1a', type: 'wall', x: 0, y: 200, width: 300, height: 20 },
      { id: 'w1b', type: 'wall', x: 500, y: 200, width: 300, height: 20 },
      { id: 'w_tl', type: 'wall', x: 0, y: 0, width: 20, height: 200 },
      { id: 'w_tr', type: 'wall', x: 780, y: 0, width: 20, height: 200 },
      // Exit chamber: linked gate opened by latched plate on the corridor floor
      { id: 'lg_exit', type: 'linked_gate', x: 340, y: 140, width: 120, height: 20 },
      { id: 'pp_exit', type: 'pressure_plate', x: 660, y: 176, width: 100, height: 20, linkId: 'lg_exit', latch: true },
      // Hazard pits punish sloppy landings on the ground floor
      { id: 'hz1', type: 'hazard', x: 0, y: 770, width: 240, height: 30 },
      { id: 'hz2', type: 'hazard', x: 560, y: 770, width: 240, height: 30 }
    ],
    parRotations: 8,
    parTime: 40
  },

  // Level 16: Mirror Gallery (diagonal lasers + reflective mirrors)
  {
    id: 16,
    code: 'LV-16',
    title: '镜像回廊',
    subtitle: 'Mirror Gallery',
    poem: '光在银色的折痕间三度转身，唯有一列静默的竖井未被打扰。',
    instruction: '银色反射镜会按入射角折返激光，发射器亦可斜向发光。读懂折叠的光路，沿未被照耀的回廊抵达归元之门。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 140, y: 700 },
    exit: { x: 60, y: 100, radius: 24, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 680, y: 776, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 30, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 560, y: 30, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Diagonal emitter: beam folds down-left off the vertical mirror,
      // then off the floor mirror, climbing back toward the right edge.
      { id: 'lem1', type: 'laser_emitter', x: 736, y: 40, width: 24, height: 24, direction: 'left', angle: 135, active: true },
      { id: 'm1', type: 'mirror', x: 228, y: 480, width: 24, height: 160, angle: 90 },
      { id: 'm2', type: 'mirror', x: 340, y: 728, width: 160, height: 24, angle: 0 },
      // Launching shelf by the start position
      { id: 'w0', type: 'wall', x: 80, y: 740, width: 200, height: 16 }
    ],
    parRotations: 6,
    parTime: 35
  },

  // Level 17: One-Way Silver (half-silvered mirror teaches pass-through optics)
  // Verified beam topology (hand-computed):
  //   lem1 (748,52) →45°\  → m1 vertical face x=412 (back-silvered: reflects)
  //   → seg B (412,388)→(684,660) → m2 floor face y=660 (both: reflects)
  //   → seg C (684,660)→(800,544).
  //   lem2 (52,52) →45°/ from the glass side of m1 → passes through at
  //   (412,412) → seg E runs along y=x until m2 catches it at (660,660)
  //   → seg F (660,660)→(800,520). Safe lanes: left wall shaft (x<52 off the
  //   beam), floor lane y≈790 (parallel to seg E), ceiling lane y≈10.
  {
    id: 17,
    code: 'LV-17',
    title: '半透之镜',
    subtitle: 'One-Way Silver',
    poem: '银膜只朝一侧微笑，另一侧的光径直穿过，落成第二条暗河。',
    instruction: '这面反射镜只在一侧镀银：镀银侧照常折返激光，玻璃侧的光则径直穿过。认出箭头所指的银面，沿被放行的暗影走廊抵达归元之门。',
    arenaWidth: 800,
    arenaHeight: 800,
    ballStart: { x: 140, y: 700 },
    exit: { x: 30, y: 300, radius: 26, unlocked: false, requiredStars: 3 },
    stars: [
      { id: 's1', x: 680, y: 776, radius: 10, collected: false, pulsePhase: 0 },
      { id: 's2', x: 400, y: 24, radius: 10, collected: false, pulsePhase: 1 },
      { id: 's3', x: 560, y: 24, radius: 10, collected: false, pulsePhase: 2 }
    ],
    obstacles: [
      // Main emitter: folds off the back (silvered) side of m1, then off m2
      { id: 'lem1', type: 'laser_emitter', x: 736, y: 40, width: 24, height: 24, direction: 'left', angle: 135, active: true },
      // Half-silvered vertical mirror: silvered (back, +x) face folds lem1's
      // beam; the glass (front, -x) face lets lem2's beam sail through
      { id: 'm1', type: 'mirror', x: 400, y: 308, width: 24, height: 160, angle: 90, reflectSide: 'back' },
      // Floor mirror catches both the reflected fold and the pass-through beam
      { id: 'm2', type: 'mirror', x: 604, y: 648, width: 160, height: 24, angle: 0 },
      // Second emitter shoots from the glass side: its light sails straight
      // through m1 and gets caught by m2 far to the lower-right
      { id: 'lem2', type: 'laser_emitter', x: 40, y: 40, width: 24, height: 24, direction: 'right', angle: 45, active: true },
      // Launching shelf under the start position
      { id: 'w0', type: 'wall', x: 80, y: 740, width: 200, height: 16 }
    ],
    parRotations: 6,
    parTime: 40
  }
];

export const PROGRESS_STORAGE_KEY = 'geometrix_traverse_progress_v1';

// ---------------------------------------------------------------------------
// Level share codes (portable LevelConfig serialization)
// ---------------------------------------------------------------------------
const SHARE_CODE_MAGIC = 'GT1';

/** Encode a level config into a portable share code: GT1.<base64(url-safe json)> */
export function encodeLevelShareCode(level: LevelConfig): string {
  const json = JSON.stringify(level);
  // encodeURIComponent first so CJK text survives btoa (latin1 only)
  const b64 = btoa(encodeURIComponent(json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${SHARE_CODE_MAGIC}.${b64}`;
}

/** Decode a share code back into a LevelConfig. Returns null when invalid. */
export function decodeLevelShareCode(code: string): LevelConfig | null {
  try {
    const trimmed = code.trim();
    const dotIdx = trimmed.indexOf('.');
    if (dotIdx <= 0) return null;

    const magic = trimmed.slice(0, dotIdx);
    if (magic !== SHARE_CODE_MAGIC) return null;

    const b64 = trimmed.slice(dotIdx + 1).replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(b64));
    const obj = JSON.parse(json);

    // Minimal structural validation
    if (
      typeof obj !== 'object' || obj === null ||
      typeof obj.id !== 'number' ||
      typeof obj.arenaWidth !== 'number' ||
      !Array.isArray(obj.obstacles) ||
      !Array.isArray(obj.stars) ||
      typeof obj.ballStart !== 'object' ||
      typeof obj.exit !== 'object'
    ) {
      return null;
    }
    return obj as LevelConfig;
  } catch {
    return null;
  }
}

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
