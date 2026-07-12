import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import './landing.css';

type StarSpec = [x: number, y: number, r: number, opacity: number];

const EMBER_STARS: StarSpec[] = [
  [390, 180, 1.0, 0.45],
  [760, 240, 1.0, 0.4],
  [1105, 120, 0.9, 0.45],
  [210, 300, 0.9, 0.4],
  [980, 380, 0.9, 0.35],
];

const BRIGHT_STARS: Array<[number, number]> = [
  [140, 110],
  [420, 60],
  [680, 46],
  [950, 90],
  [1160, 220],
  [90, 380],
  [1080, 420],
  [260, 210],
  [540, 140],
  [830, 250],
  [40, 200],
  [1120, 40],
  [340, 400],
];

type Cluster = [cx: number, cy: number, count: number, spread: number];

const CITY_CLUSTERS: Cluster[] = [
  [350, 680, 12, 40],
  [280, 740, 10, 34],
  [470, 672, 12, 38],
  [560, 700, 10, 34],
  [660, 706, 10, 32],
  [420, 760, 10, 40],
  [240, 786, 7, 26],
  [540, 780, 8, 30],
  [430, 650, 5, 22],
  [700, 676, 5, 20],
  [900, 706, 11, 38],
  [980, 720, 10, 34],
  [1060, 748, 8, 28],
  [860, 760, 8, 30],
  [795, 742, 4, 12],
  [520, 640, 6, 24],
  [340, 700, 8, 30],
  [760, 700, 6, 24],
  [1000, 690, 6, 26],
];

const SPHERE_CX = 600;
const SPHERE_CY = 1400;
const SPHERE_R = 800;

const sphereEdgeY = (x: number) =>
  SPHERE_CY - Math.sqrt(Math.max(0, SPHERE_R ** 2 - (x - SPHERE_CX) ** 2));

function scatter(seed: number, clusters: Cluster[]): StarSpec[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const dots: StarSpec[] = [];
  clusters.forEach(([cx, cy, count, spread]) => {
    for (let i = 0; i < count; i++) {
      const x = cx + (rand() + rand() - 1) * spread;
      const y = cy + (rand() + rand() - 1) * spread * 0.6;
      if (y >= sphereEdgeY(x) + 8) {
        dots.push([x, y, 0.6 + rand() * 1.0, 0.35 + rand() * 0.6]);
      }
    }
  });
  return dots;
}

const CITY_LIGHTS = scatter(42, CITY_CLUSTERS);

function starfield(
  seed: number,
  count: number,
  yMin: number,
  yMax: number,
  clipSphere = true,
): StarSpec[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const dots: StarSpec[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * 1200;
    const y = yMin + rand() * (yMax - yMin);
    if (!clipSphere || y < sphereEdgeY(x) - 12) {
      dots.push([x, y, 0.5 + rand() * 1.1, 0.2 + rand() * 0.6]);
    }
  }
  return dots;
}

const STARS = [...starfield(7, 130, 10, 560), ...starfield(19, 40, 560, 790)];

const PAGE_STARS = starfield(23, 130, 0, 800, false);

const PAGE_BRIGHT: Array<[number, number]> = [
  [120, 90],
  [380, 210],
  [650, 60],
  [920, 160],
  [1150, 320],
  [80, 480],
  [340, 640],
  [610, 430],
  [880, 560],
  [1120, 700],
  [220, 340],
  [760, 740],
  [480, 60],
];

const LAND_MAIN =
  'M 175 792 C 205 722 260 668 350 648 C 420 633 480 650 540 636 C 600 622 668 634 718 668 C 752 692 748 738 706 766 C 640 806 420 818 300 806 C 240 800 195 800 175 792 Z';

const LAND_EAST =
  'M 818 806 C 822 744 862 696 930 676 C 1000 656 1068 668 1108 700 C 1140 726 1150 768 1130 800 C 1080 830 900 830 818 806 Z';

const LAND_ISLE =
  'M 770 738 C 785 724 810 726 818 740 C 822 752 806 762 786 758 C 772 754 764 748 770 738 Z';

const BLOCK_I_PATH = 'M -42 -58 H 42 V -34 H 14 V 34 H 42 V 58 H -42 V 34 H -14 V -34 H -42 Z';

const BLOCK_I_DOTS: Array<[number, number]> = [
  [-42, -58],
  [42, -58],
  [42, -34],
  [14, -34],
  [14, 34],
  [42, 34],
  [42, 58],
  [-42, 58],
  [-42, 34],
  [-14, 34],
  [-14, -34],
  [-42, -34],
];

const INTEGRATIONS = ['Canvas', 'Outlook', 'Granola', 'Replit'];

const TWINKLE = ['lp-tw1', 'lp-tw2', 'lp-tw3'];

function Stars({ specs, fill }: { specs: StarSpec[]; fill: string }) {
  return (
    <>
      {specs.map(([x, y, r, opacity], i) => (
        <g key={`${x}-${y}`} className={TWINKLE[i % 3]}>
          <circle cx={x} cy={y} r={r} fill={fill} opacity={opacity} />
        </g>
      ))}
    </>
  );
}

function Sparkles({ points }: { points: Array<[number, number]> }) {
  return (
    <>
      {points.map(([x, y], i) => (
        <g key={`${x}-${y}`} className={TWINKLE[i % 3]}>
          <circle cx={x} cy={y} r={5} fill="#edf1f7" opacity="0.1" />
          <path
            d={`M ${x - 7} ${y} H ${x + 7} M ${x} ${y - 7} V ${y + 7}`}
            stroke="#edf1f7"
            strokeWidth="0.7"
            opacity="0.5"
          />
          <circle cx={x} cy={y} r={1.7} fill="#edf1f7" opacity="0.9" />
        </g>
      ))}
    </>
  );
}

function OrbitScene() {
  const localize = useLocalize();
  return (
    <svg
      className="lp-scene"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="lpSphere" cx="50%" cy="8%" r="95%">
          <stop offset="0%" stopColor="#1b3a69" />
          <stop offset="30%" stopColor="#142b4e" />
          <stop offset="55%" stopColor="#0d1d39" />
          <stop offset="100%" stopColor="#081426" />
        </radialGradient>
        <radialGradient id="lpGlow">
          <stop offset="0%" stopColor="#ff8a4d" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ff8a4d" stopOpacity="0" />
        </radialGradient>
        <filter id="lpBlur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="lpBlurWide">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="lpClouds" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.011" numOctaves="3" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.7 0 0 0 -0.25" />
        </filter>
        <linearGradient id="lpNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060b14" stopOpacity="0" />
          <stop offset="100%" stopColor="#060b14" stopOpacity="0.4" />
        </linearGradient>
        <clipPath id="lpSphereClip">
          <circle cx={SPHERE_CX} cy={SPHERE_CY} r={SPHERE_R} />
        </clipPath>
      </defs>
      <Stars specs={STARS} fill="#edf1f7" />
      <Stars specs={EMBER_STARS} fill="#ff5f05" />
      <Sparkles points={BRIGHT_STARS} />
      <g className="lp-rise">
        <ellipse cx="600" cy="620" rx="420" ry="48" fill="url(#lpGlow)" />
        <circle
          cx="600"
          cy="1400"
          r="800"
          fill="none"
          stroke="#5b82b8"
          strokeWidth="2.5"
          opacity="0.4"
          filter="url(#lpBlurWide)"
        />
        <circle cx="600" cy="1400" r="800" fill="url(#lpSphere)" />
        <g clipPath="url(#lpSphereClip)">
          <g filter="url(#lpBlur)" opacity="0.85">
            <path d={LAND_MAIN} fill="#0a1a31" />
            <path d={LAND_EAST} fill="#0a1a31" />
            <path d={LAND_ISLE} fill="#0a1a31" />
          </g>
          <rect x="60" y="580" width="1080" height="220" filter="url(#lpClouds)" opacity="0.3" />
          <rect x="0" y="560" width="1200" height="240" fill="url(#lpNight)" />
          {TWINKLE.map((tw, bucket) => (
            <g key={tw} className={tw}>
              {CITY_LIGHTS.filter((_, i) => i % 3 === bucket).map(([x, y, r, o], i) => (
                <circle
                  key={`${x}-${y}-${i}`}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={i % 2 === 0 ? '#ff8a4d' : '#ffb27a'}
                  opacity={o}
                />
              ))}
            </g>
          ))}
        </g>
        <circle
          cx="600"
          cy="1400"
          r="800"
          fill="none"
          stroke="#8fb1de"
          strokeWidth="0.75"
          opacity="0.35"
        />
        <g className="lp-const" transform="translate(600 695) rotate(-8)">
          <path d={BLOCK_I_PATH} fill="none" stroke="#ff5f05" strokeWidth="0.6" opacity="0.32" />
          {BLOCK_I_DOTS.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="6" fill="#ff8a4d" opacity="0.12" />
              <circle cx={x} cy={y} r="2.2" fill="#ff5f05" />
            </g>
          ))}
          <text
            x={3}
            y={84}
            textAnchor="middle"
            fill="#ff5f05"
            opacity="0.75"
            fontFamily="'Roboto Mono', ui-monospace, monospace"
            fontSize="15"
            letterSpacing="6"
          >
            {localize('com_ui_landing_gies_label')}
          </text>
        </g>
        <g fill="none">
          <path
            className="lp-arc"
            pathLength={1}
            d="M -40 730 C 300 500, 900 500, 1240 710"
            stroke="#ff8a4d"
            strokeWidth="3"
            opacity="0.2"
            filter="url(#lpBlur)"
          />
          <path
            className="lp-arc"
            pathLength={1}
            d="M -40 730 C 300 500, 900 500, 1240 710"
            stroke="#ff5f05"
            strokeWidth="1.1"
            opacity="0.9"
          />
          <path
            className="lp-arc lp-arc-late"
            pathLength={1}
            d="M -40 840 C 350 630, 850 630, 1240 810"
            stroke="#ff8a4d"
            strokeWidth="2.5"
            opacity="0.16"
            filter="url(#lpBlur)"
          />
          <path
            className="lp-arc lp-arc-late"
            pathLength={1}
            d="M -40 840 C 350 630, 850 630, 1240 810"
            stroke="#ff5f05"
            strokeWidth="0.9"
            opacity="0.7"
          />
        </g>
      </g>
    </svg>
  );
}

function TutorsVignette() {
  return (
    <svg viewBox="0 0 360 220" className="w-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="lpBookGlow">
          <stop offset="0%" stopColor="#ff8a4d" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff8a4d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="126" rx="120" ry="46" fill="url(#lpBookGlow)" />
      <path
        className="lp-vpath"
        pathLength={1}
        d="M 180 96 C 156 86, 118 86, 94 96 L 94 146 C 118 136, 156 136, 180 146 Z"
        fill="#13294b"
        stroke="#8fb1de"
        strokeOpacity="0.8"
        strokeWidth="1.2"
      />
      <path
        className="lp-vpath"
        pathLength={1}
        d="M 180 96 C 204 86, 242 86, 266 96 L 266 146 C 242 136, 204 136, 180 146 Z"
        fill="#13294b"
        stroke="#8fb1de"
        strokeOpacity="0.8"
        strokeWidth="1.2"
      />
      <g fill="none" stroke="#8b98ac" strokeOpacity="0.35" strokeWidth="1">
        <path d="M 104 108 C 128 100, 152 100, 170 106" />
        <path d="M 104 120 C 128 112, 152 112, 170 118" />
        <path d="M 104 132 C 128 124, 152 124, 170 130" />
        <path d="M 190 106 C 208 100, 232 100, 256 108" />
        <path d="M 190 118 C 208 112, 232 112, 256 120" />
        <path d="M 190 130 C 208 124, 232 124, 256 132" />
      </g>
      <g className="lp-vdot">
        <path d="M 180 96 L 180 146" stroke="#ff5f05" strokeWidth="1.6" />
        <path d="M 180 96 L 180 146" stroke="#ff8a4d" strokeWidth="4" opacity="0.25" />
        {[
          [150, 66, 2.2],
          [185, 50, 2.8],
          [217, 68, 2.0],
        ].map(([x, y, r]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={r * 3} fill="#ff8a4d" opacity="0.15" />
            <circle cx={x} cy={y} r={r} fill="#ff5f05" />
          </g>
        ))}
      </g>
    </svg>
  );
}

function RoomsVignette() {
  return (
    <svg viewBox="0 0 360 220" className="w-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="lpBulbGlow">
          <stop offset="0%" stopColor="#ff8a4d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff8a4d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        className="lp-vpath"
        pathLength={1}
        d="M 70 172 L 180 118 M 140 192 L 180 118 M 230 188 L 180 118 M 300 168 L 180 118"
        fill="none"
        stroke="#ff5f05"
        strokeOpacity="0.25"
        strokeWidth="0.8"
      />
      {[
        [70, 172],
        [140, 192],
        [230, 188],
        [300, 168],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#edf1f7" />
      ))}
      <g className="lp-vdot">
        <circle cx="180" cy="92" r="48" fill="url(#lpBulbGlow)" />
        <g stroke="#ff5f05" strokeWidth="1.4" opacity="0.6">
          <path d="M 180 44 V 32" />
          <path d="M 137 52 L 129 44" />
          <path d="M 223 52 L 231 44" />
          <path d="M 128 92 H 116" />
          <path d="M 232 92 H 244" />
        </g>
        <circle
          cx="180"
          cy="92"
          r="26"
          fill="#13294b"
          stroke="#8fb1de"
          strokeOpacity="0.8"
          strokeWidth="1.2"
        />
        <path
          d="M 174 102 L 174 94 Q 177 88 180 94 Q 183 88 186 94 L 186 102"
          fill="none"
          stroke="#ff5f05"
          strokeWidth="1.6"
        />
        <rect x="172" y="116" width="16" height="3" rx="1.5" fill="#8b98ac" opacity="0.7" />
        <rect x="172" y="121" width="16" height="3" rx="1.5" fill="#8b98ac" opacity="0.7" />
        <rect x="176" y="126" width="8" height="3" rx="1.5" fill="#8b98ac" opacity="0.5" />
      </g>
    </svg>
  );
}

function BuilderVignette() {
  return (
    <svg viewBox="0 0 360 220" className="w-full" aria-hidden="true" focusable="false">
      <path d="M 20 190 Q 180 150 340 190" fill="none" stroke="#5b82b8" strokeOpacity="0.4" />
      <path
        d="M 60 186 C 140 160, 210 120, 288 78"
        fill="none"
        stroke="#ff5f05"
        strokeWidth="1.2"
        strokeDasharray="4 6"
        opacity="0.7"
      />
      <g className="lp-vdot" transform="translate(298 72) rotate(-28)">
        <path d="M -19 -3 Q -34 0 -19 3 Z" fill="#ff5f05" opacity="0.85" />
        <path d="M -19 -1.5 Q -27 0 -19 1.5 Z" fill="#ffd9a0" />
        <path
          d="M -14 -6 L -22 -13 L -15 0 L -22 13 L -14 6 Z"
          fill="#13294b"
          stroke="#8fb1de"
          strokeOpacity="0.6"
          strokeWidth="1"
        />
        <path
          d="M -16 -6 L 8 -6 Q 20 0 8 6 L -16 6 Q -19 0 -16 -6 Z"
          fill="#13294b"
          stroke="#8fb1de"
          strokeOpacity="0.8"
          strokeWidth="1.2"
        />
        <circle cx="4" cy="0" r="3.2" fill="none" stroke="#ff5f05" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

type Pane = [x: number, y: number, opacity: number];

function bifPanes(): Pane[] {
  let s = 7;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const panes: Pane[] = [];
  for (let floor = 0; floor < 4; floor++) {
    const glow = 1 - floor * 0.16;
    for (let col = 0; col < 12; col++) {
      const opacity = rand() < 0.12 ? 0.1 : (0.55 + rand() * 0.45) * glow;
      const isDoorBay = floor === 3 && (col === 5 || col === 6);
      if (!isDoorBay) {
        panes.push([312 + col * 24, 108 + floor * 42, opacity]);
      }
    }
  }
  return panes;
}

const BIF_PANES = bifPanes();

const BIF_CARS: Array<[x: number, flip: boolean, lit: boolean]> = [
  [60, false, false],
  [150, false, true],
  [262, false, false],
  [320, false, true],
  [645, true, true],
  [715, true, false],
  [800, true, false],
  [860, true, true],
];

function BifVignette() {
  const localize = useLocalize();
  return (
    <svg
      viewBox="0 0 900 380"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="lpBifBlur">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect
        x="290"
        y="80"
        width="320"
        height="210"
        fill="#ff8a4d"
        opacity="0.14"
        filter="url(#lpBifBlur)"
      />
      <rect x="130" y="150" width="158" height="130" fill="#0c1830" />
      {[
        [160, 180],
        [204, 180],
        [248, 180],
        [160, 224],
        [248, 224],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="14" height="18" fill="#ffb27a" opacity="0.18" />
      ))}
      <g transform="translate(215 58) scale(0.78)" opacity="0.8">
        <rect x="668" y="92" width="64" height="78" fill="#0c141f" />
        <rect x="668" y="170" width="64" height="110" fill="#243049" />
        <rect x="612" y="100" width="56" height="180" fill="#3a211b" />
        <rect x="732" y="104" width="68" height="176" fill="#3a211b" />
        {[620, 636, 652].map((x) => (
          <rect key={x} x={x} y="112" width="8" height="160" fill="#0a0f18" />
        ))}
        {[742, 760, 778].map((x) => (
          <rect key={x} x={x} y="116" width="8" height="156" fill="#0a0f18" />
        ))}
        {[
          [620, 148],
          [636, 204],
          [652, 120],
          [742, 132],
          [760, 236],
          [778, 168],
          [742, 204],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="8" height="13" fill="#ffb27a" opacity="0.5" />
        ))}
        <rect x="676" y="112" width="48" height="10" fill="#0a0f18" />
        <rect x="676" y="134" width="48" height="10" fill="#0a0f18" />
        <rect x="690" y="134" width="12" height="10" fill="#ffb27a" opacity="0.35" />
        <rect x="676" y="196" width="48" height="12" fill="#0a0f18" />
        <rect x="704" y="196" width="14" height="12" fill="#ffb27a" opacity="0.3" />
        <rect x="682" y="232" width="36" height="48" fill="#ffd9a0" opacity="0.45" />
        <rect x="693" y="232" width="1.5" height="48" fill="#0c141f" />
        <rect x="705" y="232" width="1.5" height="48" fill="#0c141f" />
        <ellipse
          cx="700"
          cy="290"
          rx="55"
          ry="9"
          fill="#ff8a4d"
          opacity="0.12"
          filter="url(#lpBifBlur)"
        />
      </g>
      <rect x="300" y="92" width="300" height="188" fill="#1a0f04" />
      <g>
        {BIF_PANES.map(([x, y, opacity], i) => (
          <g key={`${x}-${y}`} className={TWINKLE[i % 3]}>
            <rect
              x={x}
              y={y}
              width="20"
              height="34"
              fill={i % 2 === 0 ? '#ffc07a' : '#ff9a45'}
              opacity={opacity}
            />
          </g>
        ))}
      </g>
      <rect
        x="420"
        y="226"
        width="60"
        height="56"
        fill="#ffedd0"
        opacity="0.5"
        filter="url(#lpBifBlur)"
      />
      <g>
        <rect x="424" y="228" width="52" height="52" fill="#ffe4b8" />
        <polygon points="424,228 476,228 462,242 438,242" fill="#ffedcb" />
        <polygon points="424,280 476,280 462,262 438,262" fill="#f0cf9c" />
        <polygon points="424,228 438,242 438,262 424,280" fill="#ffdfae" />
        <polygon points="476,228 462,242 462,262 476,280" fill="#ffdfae" />
        <g className="lp-room-far">
          <rect x="438" y="242" width="24" height="20" fill="#fff6e2" />
          <rect x="446" y="247" width="8" height="10" fill="#ffb668" opacity="0.55" />
          <rect
            x="438"
            y="242"
            width="24"
            height="20"
            fill="none"
            stroke="#e8c48e"
            strokeWidth="0.4"
          />
        </g>
        <line x1="438" y1="262" x2="424" y2="280" stroke="#dcb87f" strokeWidth="0.4" />
        <line x1="462" y1="262" x2="476" y2="280" stroke="#dcb87f" strokeWidth="0.4" />
      </g>
      <g className="lp-door lp-door-left">
        <rect
          x="426"
          y="230"
          width="24"
          height="50"
          fill="#ffd9a0"
          opacity="0.85"
          stroke="#3a2410"
          strokeWidth="1"
        />
        <rect x="446" y="240" width="1.5" height="26" fill="#3a2410" opacity="0.7" />
      </g>
      <g className="lp-door lp-door-right">
        <rect
          x="450"
          y="230"
          width="24"
          height="50"
          fill="#ffd9a0"
          opacity="0.85"
          stroke="#3a2410"
          strokeWidth="1"
        />
        <rect x="452.5" y="240" width="1.5" height="26" fill="#3a2410" opacity="0.7" />
      </g>
      <rect x="268" y="74" width="384" height="16" fill="#0e1d36" />
      <rect x="268" y="88" width="384" height="1.5" fill="#1d3a66" opacity="0.7" />
      <rect x="298" y="92" width="4" height="188" fill="#0b1830" />
      <rect x="598" y="92" width="4" height="188" fill="#0b1830" />
      <rect x="40" y="280" width="820" height="1.5" fill="#1d3a66" opacity="0.5" />
      <ellipse
        cx="450"
        cy="294"
        rx="230"
        ry="16"
        fill="#ff8a4d"
        opacity="0.1"
        filter="url(#lpBifBlur)"
      />
      <path
        d="M 210 372 L 385 282 M 690 372 L 530 282"
        fill="none"
        stroke="#1d3a66"
        strokeOpacity="0.6"
      />
      <g>
        <rect x="152" y="238" width="1.5" height="42" fill="#1d3a66" />
        <circle cx="152.75" cy="235" r="3" fill="#ffb27a" opacity="0.8" />
        <rect x="756" y="230" width="1.5" height="50" fill="#1d3a66" />
        <circle cx="756.75" cy="227" r="3" fill="#ffb27a" opacity="0.8" />
      </g>
      <ellipse cx="86" cy="244" rx="52" ry="40" fill="#081226" />
      <ellipse cx="836" cy="236" rx="56" ry="46" fill="#081226" />
      <g transform="translate(372 296)">
        <rect x="-0.75" y="-24" width="1.5" height="24" fill="#8b98ac" opacity="0.7" />
        <path
          d="M 3.7 -40.9 L 8.9 -35.7 L 8.9 -28.3 L 3.7 -23.1 L -3.7 -23.1 L -8.9 -28.3 L -8.9 -35.7 L -3.7 -40.9 Z"
          fill="#b3272d"
          stroke="#edf1f7"
          strokeWidth="1"
        />
        <text
          y="-29.8"
          textAnchor="middle"
          fill="#edf1f7"
          fontSize="4.6"
          fontFamily="'Roboto Mono', ui-monospace, monospace"
          fontWeight="700"
        >
          {localize('com_ui_landing_stop_sign')}
        </text>
      </g>
      <rect x="0" y="296" width="900" height="26" fill="#0a1220" />
      <rect x="0" y="296" width="900" height="1" fill="#1d3a66" opacity="0.5" />
      <rect x="0" y="321" width="900" height="1" fill="#1d3a66" opacity="0.4" />
      <line
        x1="20"
        y1="309"
        x2="880"
        y2="309"
        stroke="#8b98ac"
        strokeOpacity="0.35"
        strokeDasharray="14 12"
      />
      {BIF_CARS.map(([x, flip, lit]) => (
        <g key={x} transform={`translate(${x} 302) scale(${flip ? -1 : 1} 1)`}>
          <path
            d="M -22 0 L -22 -5 Q -22 -9 -17 -9.5 L -11 -10 Q -7 -15 0 -15.5 L 7 -15.5 Q 13 -15 15 -10 L 19 -9 Q 22 -8 22 -4 L 22 0 Z"
            fill="#0e1d36"
            stroke="#1d3a66"
            strokeWidth="0.8"
          />
          <rect
            x="-8"
            y="-13.5"
            width="12"
            height="5.5"
            rx="1.5"
            fill="#ffb27a"
            opacity={lit ? 0.4 : 0.12}
          />
          <circle cx="-13" cy="0" r="3.5" fill="#05080f" stroke="#2a4a7a" strokeWidth="0.8" />
          <circle cx="13" cy="0" r="3.5" fill="#05080f" stroke="#2a4a7a" strokeWidth="0.8" />
          <circle cx="21.5" cy="-6" r="1" fill="#ffd9a0" opacity="0.9" />
          <circle cx="-21.5" cy="-6" r="1" fill="#ff5f05" opacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

function useEntryProgress() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const approach = Math.min(1, p / 0.5);
      const through = Math.min(1, Math.max(0, (p - 0.65) / 0.35));
      el.style.setProperty('--p', String(p));
      el.style.setProperty('--pa', String(approach * approach));
      el.style.setProperty('--pd', String(Math.min(1, Math.max(0, (p - 0.5) / 0.2))));
      el.style.setProperty('--pt', String(through * through));
    };
    const onScroll = () => {
      if (!raf) {
        raf = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, []);
  return ref;
}

function PageStars() {
  return (
    <div className="lp-stars-fixed" aria-hidden="true">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false">
        <Stars specs={PAGE_STARS} fill="#edf1f7" />
        <Sparkles points={PAGE_BRIGHT} />
      </svg>
    </div>
  );
}

function Reveal({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className={`lp-section lp-reveal ${className}`}>
      {children}
    </section>
  );
}

function Feature({
  eyebrow,
  title,
  body,
  vignette,
  flip = false,
}: {
  eyebrow: TranslationKeys;
  title: TranslationKeys;
  body: TranslationKeys;
  vignette: ReactNode;
  flip?: boolean;
}) {
  const localize = useLocalize();
  return (
    <Reveal>
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className={flip ? 'md:order-2' : ''}>
          <p className="lp-eyebrow lp-mono">{localize(eyebrow)}</p>
          <h2 className="lp-h2">{localize(title)}</h2>
          <p className="lp-body">{localize(body)}</p>
        </div>
        <div className={flip ? 'md:order-1' : ''}>{vignette}</div>
      </div>
    </Reveal>
  );
}

function Step({
  num,
  title,
  body,
}: {
  num: string;
  title: TranslationKeys;
  body: TranslationKeys;
}) {
  const localize = useLocalize();
  return (
    <div className="lp-step">
      <p className="lp-step-num lp-mono">{num}</p>
      <h3>{localize(title)}</h3>
      <p className="lp-step-body">{localize(body)}</p>
    </div>
  );
}

function Faq({ q, a }: { q: TranslationKeys; a: TranslationKeys }) {
  const localize = useLocalize();
  return (
    <details>
      <summary>{localize(q)}</summary>
      <p>{localize(a)}</p>
    </details>
  );
}

export default function Welcome() {
  const localize = useLocalize();
  const entryRef = useEntryProgress();
  return (
    <div className="lp-root">
      <PageStars />
      <header className="lp-hero">
        <OrbitScene />
        <div className="lp-hero-copy">
          <div className="lp-lockup">
            <img src="assets/logo.svg" alt="" aria-hidden="true" />
            <span>{localize('com_ui_landing_wordmark')}</span>
          </div>
          <h1 className="lp-headline">{localize('com_ui_landing_headline')}</h1>
          <p className="lp-subline">{localize('com_ui_landing_subline')}</p>
          <Link to="/login" className="lp-cta">
            {localize('com_ui_landing_cta')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>
      <main className="lp-main">
        <section className="lp-entry" ref={entryRef}>
          <div className="lp-entry-stage">
            <p className="lp-eyebrow lp-mono lp-entry-label">
              {localize('com_ui_landing_bif_label')}
            </p>
            <BifVignette />
            <div className="lp-entry-wash" aria-hidden="true" />
          </div>
        </section>
        <Feature
          eyebrow="com_ui_landing_orbit_tutors"
          title="com_ui_landing_tutors_title"
          body="com_ui_landing_tutors_body"
          vignette={<TutorsVignette />}
        />
        <Feature
          eyebrow="com_ui_landing_orbit_rooms"
          title="com_ui_landing_rooms_title"
          body="com_ui_landing_rooms_body"
          vignette={<RoomsVignette />}
          flip={true}
        />
        <Feature
          eyebrow="com_ui_landing_orbit_builder"
          title="com_ui_landing_builder_title"
          body="com_ui_landing_builder_body"
          vignette={<BuilderVignette />}
        />
        <Reveal>
          <h2 className="lp-h2">{localize('com_ui_landing_how_title')}</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <Step num="01" title="com_ui_landing_step1_title" body="com_ui_landing_step1_body" />
            <Step num="02" title="com_ui_landing_step2_title" body="com_ui_landing_step2_body" />
            <Step num="03" title="com_ui_landing_step3_title" body="com_ui_landing_step3_body" />
          </div>
        </Reveal>
        <Reveal className="lp-integrations">
          <h2 className="lp-h2">{localize('com_ui_landing_integrations_title')}</h2>
          <p className="lp-body mx-auto">{localize('com_ui_landing_integrations_body')}</p>
          <ul className="lp-integration-row lp-mono">
            {INTEGRATIONS.map((name, i) => (
              <li key={name} className="flex items-center gap-[1.1rem]">
                {i > 0 && <span className="lp-integration-dot" aria-hidden="true" />}
                {name}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="lp-faq">
          <h2 className="lp-h2 mb-6">{localize('com_ui_landing_faq_title')}</h2>
          <Faq q="com_ui_landing_faq1_q" a="com_ui_landing_faq1_a" />
          <Faq q="com_ui_landing_faq2_q" a="com_ui_landing_faq2_a" />
          <Faq q="com_ui_landing_faq3_q" a="com_ui_landing_faq3_a" />
          <Faq q="com_ui_landing_faq4_q" a="com_ui_landing_faq4_a" />
          <Faq q="com_ui_landing_faq5_q" a="com_ui_landing_faq5_a" />
        </Reveal>
        <Reveal className="lp-outro">
          <h2 className="lp-h2">{localize('com_ui_landing_outro_title')}</h2>
          <Link to="/login" className="lp-cta">
            {localize('com_ui_landing_cta')}
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </main>
      <footer className="lp-footer lp-mono">{localize('com_ui_landing_footer')}</footer>
    </div>
  );
}
