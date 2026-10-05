/**
 * skinArt.ts — 10 showcase sphere designs as raw SVG strings.
 *
 * Faithfully transcribed from the user's "Mathematical Spheres" showcase page.
 * Each SVG is self-contained (no external refs), 220x220 viewBox with the
 * design circle at r≈88-90. They are consumed two ways:
 *   1. Canvas in-game sprite: loaded as Image via data-URI (skins.ts preloader)
 *   2. Skin picker preview cards (inline via dangerouslySetInnerHTML)
 *
 * Notes on transcription adjustments:
 *  - `xmlns` added on <svg> (required for SVG-as-image rendering).
 *  - Gradient/clip ids namespaced per skin (skN-*) so multiple instances can
 *    coexist in one DOM / one canvas batch without id collisions.
 *  - CSS hover classes (rotatable / rotatable-rev) stripped — in-game rotation
 *    is driven by renderer.ts instead.
 */

const S = 'xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="-110 -110 220 220"';

export const SKIN_ART: string[] = [
  // 01 测地线三角网格球 (Geodesic tessellation)
  `<svg ${S}>
    <defs>
      <radialGradient id="sk1-grad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#4ef2d2" stop-opacity="0.25"/>
        <stop offset="70%" stop-color="#0f2027" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.8"/>
      </radialGradient>
    </defs>
    <circle cx="0" cy="0" r="90" fill="url(#sk1-grad)" stroke="rgba(78, 242, 210, 0.25)" stroke-width="1"/>
    <g stroke="#4ef2d2" stroke-width="0.9" fill="none" opacity="0.85">
      <polygon points="0,-90 -45,-60 0,-30 45,-60" fill="rgba(78,242,210,0.06)"/>
      <polygon points="-45,-60 -75,-15 -35,10 0,-30" fill="rgba(78,242,210,0.03)"/>
      <polygon points="45,-60 0,-30 35,10 75,-15" fill="rgba(78,242,210,0.08)"/>
      <polygon points="-75,-15 -85,35 -40,55 -35,10"/>
      <polygon points="75,-15 35,10 40,55 85,35"/>
      <polygon points="0,-30 -35,10 0,40 35,10" fill="rgba(78,242,210,0.12)"/>
      <polygon points="-35,10 -40,55 0,75 0,40"/>
      <polygon points="35,10 0,40 0,75 40,55"/>
      <polygon points="0,40 -40,55 -30,85 0,90"/>
      <polygon points="0,40 0,90 30,85 40,55"/>
      <polygon points="-85,35 -40,55 -30,85 -60,75"/>
      <polygon points="85,35 60,75 30,85 40,55"/>
    </g>
    <g fill="#fff">
      <circle cx="0" cy="-90" r="2.2"/><circle cx="0" cy="-30" r="2.5"/><circle cx="0" cy="40" r="2.5"/><circle cx="0" cy="90" r="2.2"/>
      <circle cx="-45" cy="-60" r="2"/><circle cx="45" cy="-60" r="2"/>
      <circle cx="-75" cy="-15" r="2"/><circle cx="75" cy="-15" r="2"/>
      <circle cx="-35" cy="10" r="2.5"/><circle cx="35" cy="10" r="2.5"/>
      <circle cx="-40" cy="55" r="2"/><circle cx="40" cy="55" r="2"/>
    </g>
  </svg>`,

  // 02 浑天仪天体环绕球 (Armillary astrolabe)
  `<svg ${S}>
    <circle cx="0" cy="0" r="92" stroke="#f3c969" stroke-width="0.8" fill="none" stroke-dasharray="2 3" opacity="0.4"/>
    <circle cx="0" cy="0" r="85" stroke="#f3c969" stroke-width="1.8" fill="none" opacity="0.9"/>
    <line x1="-70" y1="-70" x2="70" y2="70" stroke="rgba(243,201,105,0.4)" stroke-width="1" stroke-dasharray="4 2"/>
    <g>
      <ellipse cx="0" cy="0" rx="85" ry="32" stroke="#f3c969" stroke-width="1.2" fill="none" transform="rotate(-25)"/>
      <ellipse cx="0" cy="0" rx="85" ry="32" stroke="#ffe082" stroke-width="1.2" fill="none" transform="rotate(35)"/>
      <ellipse cx="0" cy="0" rx="85" ry="60" stroke="#f3c969" stroke-width="0.8" fill="none" transform="rotate(80)" stroke-dasharray="8 4"/>
      <ellipse cx="0" cy="0" rx="85" ry="12" stroke="#fff" stroke-width="1.2" fill="none" transform="rotate(-5)"/>
    </g>
    <g fill="#f3c969">
      <circle cx="55" cy="-25" r="3.5" fill="#fff"/>
      <circle cx="-62" cy="18" r="2.8"/>
      <circle cx="0" cy="0" r="5" fill="#ffe082"/>
      <circle cx="0" cy="0" r="12" fill="none" stroke="#f3c969" stroke-width="0.8"/>
    </g>
  </svg>`,

  // 03 等轴测体素聚合球 (Isometric voxel cube)
  `<svg ${S}>
    <defs>
      <clipPath id="sk3-clip">
        <circle cx="0" cy="0" r="88"/>
      </clipPath>
    </defs>
    <circle cx="0" cy="0" r="88" fill="#0b101d" stroke="#64b5f6" stroke-width="1.5"/>
    <g clip-path="url(#sk3-clip)">
      <g stroke="#1a263f" stroke-width="0.7">
        <path d="M0,-80 L35,-60 L35,-20 L0,-40 Z" fill="#64b5f6" opacity="0.85"/>
        <path d="M0,-80 L-35,-60 L-35,-20 L0,-40 Z" fill="#205081" opacity="0.85"/>
        <path d="M0,-40 L35,-20 L0,0 L-35,-20 Z" fill="#90caf9" opacity="0.9"/>
        <path d="M35,-60 L70,-40 L70,0 L35,-20 Z" fill="#4285f4" opacity="0.6"/>
        <path d="M35,-20 L70,0 L35,20 L0,0 Z" fill="#64b5f6" opacity="0.75"/>
        <path d="M-35,-60 L0,-40 L-35,-20 L-70,-40 Z" fill="#90caf9" opacity="0.5"/>
        <path d="M-70,-40 L-35,-20 L-35,20 L-70,0 Z" fill="#17365d" opacity="0.8"/>
        <path d="M-35,-20 L0,0 L-35,20 L-70,0 Z" fill="#1e4974" opacity="0.7"/>
        <path d="M0,0 L35,20 L35,60 L0,40 Z" fill="#4285f4" opacity="0.85"/>
        <path d="M0,0 L-35,20 L-35,60 L0,40 Z" fill="#1a3b66" opacity="0.9"/>
        <path d="M0,-40 L35,-20 L0,0 L-35,-20 Z" fill="#bbdefb" opacity="0.95"/>
        <path d="M35,20 L70,40 L70,75 L35,60 Z" fill="#2a5885" opacity="0.7"/>
        <path d="M-35,20 L0,40 L-35,60 L-70,40 Z" fill="#132742" opacity="0.7"/>
        <path d="M0,40 L35,60 L0,80 L-35,60 Z" fill="#64b5f6" opacity="0.8"/>
      </g>
    </g>
    <ellipse cx="0" cy="0" rx="88" ry="88" fill="none" stroke="#64b5f6" stroke-width="1.2"/>
    <ellipse cx="0" cy="0" rx="40" ry="88" fill="none" stroke="#90caf9" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.5"/>
  </svg>`,

  // 04 斐波那契点阵晶体球 (Phyllotaxis / Fibonacci lattice)
  `<svg ${S}>
    <circle cx="0" cy="0" r="90" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>
    <g fill="#4ef2d2">
      <circle cx="0" cy="0" r="3" fill="#fff"/>
      <circle cx="5" cy="7" r="2.8"/><circle cx="-9" cy="4" r="2.6"/><circle cx="2" cy="-12" r="2.5"/><circle cx="14" cy="8" r="2.5"/>
      <circle cx="-12" cy="15" r="2.5"/><circle cx="-8" cy="-18" r="2.4"/><circle cx="21" cy="-7" r="2.4"/><circle cx="-6" cy="25" r="2.4"/>
      <circle cx="-23" cy="-13" r="2.3"/><circle cx="25" cy="17" r="2.3"/><circle cx="9" cy="-29" r="2.2"/><circle cx="-28" cy="18" r="2.2"/>
      <circle cx="32" cy="-15" r="2.2"/><circle cx="-14" cy="-35" r="2.1"/><circle cx="36" cy="19" r="2.1"/><circle cx="-38" cy="-12" r="2.0"/>
      <circle cx="20" cy="38" r="2.0"/><circle cx="16" cy="-42" r="1.9"/><circle cx="-42" cy="22" r="1.9"/><circle cx="45" cy="-18" r="1.9"/>
      <circle cx="-25" cy="-42" r="1.8"/><circle cx="46" cy="27" r="1.8"/><circle cx="-49" cy="-13" r="1.7"/><circle cx="27" cy="46" r="1.7"/>
      <circle cx="18" cy="-52" r="1.7"/><circle cx="-53" cy="25" r="1.6"/><circle cx="56" cy="-20" r="1.6"/><circle cx="-30" cy="-52" r="1.5"/>
      <circle cx="56" cy="32" r="1.5"/><circle cx="-60" cy="-14" r="1.4"/><circle cx="32" cy="56" r="1.4"/><circle cx="21" cy="-63" r="1.4"/>
      <circle cx="-65" cy="27" r="1.3"/><circle cx="68" cy="-22" r="1.3"/><circle cx="-35" cy="-64" r="1.2"/><circle cx="68" cy="37" r="1.2"/>
      <circle cx="-73" cy="-15" r="1.1"/><circle cx="37" cy="69" r="1.1"/><circle cx="24" cy="-75" r="1.0"/><circle cx="-78" cy="30" r="1.0"/>
      <circle cx="81" cy="-24" r="0.9"/><circle cx="-39" cy="-76" r="0.9"/><circle cx="79" cy="41" r="0.8"/><circle cx="-85" cy="-16" r="0.8"/>
    </g>
    <g stroke="rgba(78,242,210,0.15)" stroke-width="0.6">
      <circle cx="0" cy="0" r="30"/>
      <circle cx="0" cy="0" r="55"/>
      <circle cx="0" cy="0" r="75"/>
    </g>
  </svg>`,

  // 05 梅卡巴神圣几何球 (Sacred geometry / Merkaba)
  `<svg ${S}>
    <circle cx="0" cy="0" r="90" stroke="#b388ff" stroke-width="1.2" fill="none"/>
    <circle cx="0" cy="0" r="86" stroke="rgba(179,136,255,0.3)" stroke-width="0.8" stroke-dasharray="1 6"/>
    <g stroke="#b388ff" stroke-width="0.9" fill="none" opacity="0.85">
      <polygon points="0,-86 74.5,43 -74.5,43" stroke-width="1.2"/>
      <polygon points="0,86 74.5,-43 -74.5,-43" stroke-width="1.2"/>
      <polygon points="0,-86 0,86 74.5,-43 -74.5,43" opacity="0.4"/>
      <polygon points="0,-86 0,86 -74.5,-43 74.5,43" opacity="0.4"/>
      <polygon points="-74.5,-43 74.5,-43 74.5,43 -74.5,43" opacity="0.5"/>
      <circle cx="0" cy="0" r="43" stroke="#d1c4e9" stroke-width="0.8"/>
      <polygon points="0,-43 40.9,-13.3 25.3,34.8 -25.3,34.8 -40.9,-13.3" fill="rgba(179,136,255,0.08)"/>
      <circle cx="0" cy="0" r="14" fill="rgba(179,136,255,0.3)" stroke="#fff" stroke-width="1"/>
    </g>
  </svg>`,

  // 06 断层等高线层积球 (Contour slice stratum)
  `<svg ${S}>
    <defs>
      <linearGradient id="sk6-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4ef2d2"/>
        <stop offset="100%" stop-color="#2196f3"/>
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="88" stroke="rgba(255,255,255,0.12)" stroke-width="1" fill="none"/>
    <line x1="0" y1="-95" x2="0" y2="95" stroke="rgba(78,242,210,0.3)" stroke-width="0.8" stroke-dasharray="2 3"/>
    <g stroke="url(#sk6-grad)" fill="rgba(78,242,210,0.02)" stroke-width="1.2">
      <ellipse cx="0" cy="-78" rx="40" ry="8"/>
      <ellipse cx="0" cy="-65" rx="59" ry="12"/>
      <ellipse cx="0" cy="-50" rx="72" ry="15"/>
      <ellipse cx="0" cy="-32" rx="81" ry="17"/>
      <ellipse cx="0" cy="-12" rx="87" ry="18" fill="rgba(78,242,210,0.06)"/>
      <ellipse cx="0" cy="10" rx="87" ry="18" fill="rgba(78,242,210,0.06)"/>
      <ellipse cx="0" cy="32" rx="82" ry="17"/>
      <ellipse cx="0" cy="52" rx="71" ry="15"/>
      <ellipse cx="0" cy="68" rx="56" ry="12"/>
      <ellipse cx="0" cy="80" rx="36" ry="8"/>
    </g>
    <path d="M-87,-12 L-87,10 M87,-12 L87,10 M-81,-32 L-81,-12 M81,-32 L81,-12" stroke="#4ef2d2" stroke-width="1.2" opacity="0.7"/>
  </svg>`,

  // 07 利萨如三维流线球 (Lissajous knot curve)
  `<svg ${S}>
    <circle cx="0" cy="0" r="90" stroke="rgba(243, 201, 105, 0.15)" stroke-width="1" fill="none"/>
    <g stroke="#f3c969" stroke-width="1.4" fill="none" opacity="0.85">
      <path d="M-63,-63 C -20,-95 20,-95 63,-63 C 95,-20 95,20 63,63 C 20,95 -20,95 -63,63 C -95,20 -95,-20 -63,-63 Z" stroke-dasharray="180 3"/>
      <path d="M0,-88 C 70,-70 90,0 70,70 C 0,90 -70,70 -70,0 C -70,-70 0,-90 0,-88 Z" stroke="#ffe082" stroke-width="1"/>
      <path d="M-78,-45 C -10,-80 80,-10 45,78 C 10,80 -80,10 -78,-45 Z" stroke-opacity="0.6"/>
      <path d="M78,-45 C 10,-80 -80,-10 -45,78 C -10,80 80,10 78,-45 Z" stroke-opacity="0.6"/>
      <path d="M-85,0 C -30,-60 30,-60 85,0 C 30,60 -30,60 -85,0 Z" stroke="#fff" stroke-width="1.2"/>
    </g>
    <circle cx="0" cy="0" r="4" fill="#f3c969"/>
  </svg>`,

  // 08 赛博全息测控球 (Sci-fi HUD core)
  `<svg ${S}>
    <circle cx="0" cy="0" r="92" stroke="#4ef2d2" stroke-width="1" stroke-dasharray="5 15 25 15" fill="none" opacity="0.6"/>
    <circle cx="0" cy="0" r="80" stroke="#4ef2d2" stroke-width="1.8" stroke-dasharray="80 15 20 15" fill="none"/>
    <circle cx="0" cy="0" r="50" stroke="#64b5f6" stroke-width="0.8" stroke-dasharray="4 4" fill="none"/>
    <g stroke="#4ef2d2" stroke-width="0.8" opacity="0.7">
      <line x1="-95" y1="0" x2="-60" y2="0"/>
      <line x1="60" y1="0" x2="95" y2="0"/>
      <line x1="0" y1="-95" x2="0" y2="-60"/>
      <line x1="0" y1="60" x2="0" y2="95"/>
    </g>
    <g>
      <path d="M-60,-40 A 75 75 0 0 1 60,-40" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M60,40 A 75 75 0 0 1 -60,40" fill="none" stroke="#4ef2d2" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <circle cx="0" cy="0" r="26" fill="rgba(78,242,210,0.1)" stroke="#4ef2d2" stroke-width="1.2"/>
    <polygon points="0,-18 15,9 -15,9" fill="none" stroke="#fff" stroke-width="1"/>
    <circle cx="0" cy="0" r="3" fill="#4ef2d2"/>
  </svg>`,

  // 09 精密机械光圈叶球 (Mechanical aperture)
  `<svg ${S}>
    <circle cx="0" cy="0" r="90" stroke="#f3c969" stroke-width="1" stroke-dasharray="3 3" fill="none"/>
    <circle cx="0" cy="0" r="82" stroke="rgba(243,201,105,0.4)" stroke-width="1.5" fill="none"/>
    <g>
      <g stroke="#f3c969" stroke-width="1.2" fill="rgba(243,201,105,0.06)">
        <path d="M 0,-82 C 35,-60 65,-25 65,15 L 25,65 C -15,40 -40,15 -35,-40 Z"/>
        <path d="M 58,-58 C 75,-20 70,30 35,60 L -35,60 C -45,15 -30,-30 15,-65 Z" transform="rotate(45)"/>
        <path d="M 82,0 C 60,35 25,65 -15,65 L -65,25 C -40,-15 -15,-40 40,-35 Z" transform="rotate(90)"/>
        <path d="M 58,58 C 20,75 -30,70 -60,35 L -60,-35 C -15,-45 30,-30 65,15 Z" transform="rotate(135)"/>
        <path d="M 0,82 C -35,60 -65,25 -65,-15 L -25,-65 C 15,-40 40,-15 35,40 Z" transform="rotate(180)"/>
        <path d="M -58,58 C -75,20 -70,-30 -35,-60 L 35,-60 C 45,-15 30,30 -15,65 Z" transform="rotate(225)"/>
        <path d="M -82,0 C -60,-35 -25,-65 15,-65 L 65,-25 C 40,15 15,40 -40,35 Z" transform="rotate(270)"/>
        <path d="M -58,-58 C -20,-75 30,-70 60,-35 L 60,35 C 15,45 -30,30 -65,-15 Z" transform="rotate(315)"/>
      </g>
    </g>
    <polygon points="0,-22 20,-7 13,19 -13,19 -20,-7" stroke="#fff" stroke-width="1.5" fill="none"/>
    <circle cx="0" cy="0" r="6" fill="#f3c969"/>
  </svg>`,

  // 10 泰森多边形有机球 (Voronoi cellular)
  `<svg ${S}>
    <defs>
      <radialGradient id="sk10-grad" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#b388ff" stop-opacity="0.3"/>
        <stop offset="60%" stop-color="#7c4dff" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.7"/>
      </radialGradient>
    </defs>
    <circle cx="0" cy="0" r="88" fill="url(#sk10-grad)" stroke="#b388ff" stroke-width="1.2"/>
    <g stroke="#b388ff" stroke-width="1.2" fill="none" stroke-linejoin="round" opacity="0.85">
      <polygon points="-10,-20 18,-25 35,-5 20,22 -8,18 -25,-2" fill="rgba(179,136,255,0.12)"/>
      <polygon points="-10,-20 18,-25 15,-52 -18,-48 -32,-32"/>
      <polygon points="18,-25 35,-5 58,-15 50,-42 15,-52"/>
      <polygon points="-18,-48 15,-52 0,-78 -28,-68"/>
      <polygon points="35,-5 20,22 45,40 68,22 58,-15"/>
      <polygon points="58,-15 68,22 82,5 78,-25 50,-42"/>
      <polygon points="20,22 -8,18 -15,48 15,62 45,40"/>
      <polygon points="-8,18 -25,-2 -48,15 -38,45 -15,48"/>
      <polygon points="-15,48 15,62 0,82 -25,72"/>
      <polygon points="-25,-2 -10,-20 -32,-32 -60,-20 -48,15"/>
      <polygon points="-60,-20 -32,-32 -28,-68 -65,-48 -78,-10"/>
    </g>
    <g fill="#fff" opacity="0.75">
      <circle cx="4" cy="-3" r="1.8"/>
      <circle cx="-1" cy="-36" r="1.5"/>
      <circle cx="38" cy="-28" r="1.5"/>
      <circle cx="45" cy="14" r="1.5"/>
      <circle cx="12" cy="38" r="1.5"/>
      <circle cx="-28" cy="22" r="1.5"/>
      <circle cx="-42" cy="-12" r="1.5"/>
    </g>
  </svg>`
];
