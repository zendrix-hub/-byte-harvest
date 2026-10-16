import type { CropKind, ErrorTag } from '../data/types';

/* ---------- palette & helpers ---------- */

type Family = 'round' | 'cluster' | 'root' | 'stalk' | 'flower' | 'hanging' | 'leafy' | 'gourd' | 'mushroom';

interface CropStyle {
  f: Family;
  c1: string; // produce light
  c2: string; // produce dark
  leaf: string;
}

export const CROP_STYLE: Record<CropKind, CropStyle> = {
  sunflower: { f: 'flower', c1: '#ffd23f', c2: '#f4a300', leaf: '#5aa83c' },
  corn: { f: 'stalk', c1: '#ffd95a', c2: '#e9b213', leaf: '#6cb944' },
  cabbage: { f: 'leafy', c1: '#b5e48c', c2: '#76c043', leaf: '#5aa83c' },
  pumpkin: { f: 'gourd', c1: '#ffa04d', c2: '#e86f12', leaf: '#4f9a37' },
  wheat: { f: 'stalk', c1: '#f3d27a', c2: '#d6a843', leaf: '#9cbf52' },
  tomato: { f: 'round', c1: '#ff6b5b', c2: '#d93a2b', leaf: '#4f9a37' },
  eggplant: { f: 'hanging', c1: '#a173dc', c2: '#6a3fa0', leaf: '#4f9a37' },
  potato: { f: 'root', c1: '#e0bd8c', c2: '#b48653', leaf: '#5aa83c' },
  grape: { f: 'cluster', c1: '#9a88f5', c2: '#5b49c9', leaf: '#5aa83c' },
  carrot: { f: 'root', c1: '#ffa04a', c2: '#e2701a', leaf: '#5fb43f' },
  strawberry: { f: 'round', c1: '#ff6680', c2: '#d8324f', leaf: '#4f9a37' },
  pepper: { f: 'hanging', c1: '#ff6a4a', c2: '#c9301a', leaf: '#4f9a37' },
  rose: { f: 'flower', c1: '#ff7a9c', c2: '#d63a63', leaf: '#3f8a3a' },
  turnip: { f: 'root', c1: '#f6eeff', c2: '#c58be0', leaf: '#5fb43f' },
  onion: { f: 'root', c1: '#f5cd8d', c2: '#c98d43', leaf: '#7cc35a' },
  pea: { f: 'hanging', c1: '#9ae36a', c2: '#5fae2e', leaf: '#4f9a37' },
  melon: { f: 'gourd', c1: '#c4ef94', c2: '#7cbf3f', leaf: '#4f9a37' },
  blueberry: { f: 'cluster', c1: '#7da6ff', c2: '#3c62d6', leaf: '#4f9a37' },
  mushroom: { f: 'mushroom', c1: '#ff8a66', c2: '#d9502e', leaf: '#f6efe2' },
  radish: { f: 'root', c1: '#ff7aab', c2: '#d63f78', leaf: '#5fb43f' },
  bean: { f: 'hanging', c1: '#7fcf68', c2: '#3f8f2e', leaf: '#4f9a37' },
};

export const CROP_KINDS = Object.keys(CROP_STYLE) as CropKind[];
export const cropHref = (kind: CropKind, stage: 1 | 2 | 3) => `#crop-${kind}-${stage}`;

/** amt > 0 mixes toward white, amt < 0 toward black. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const grad = (kind: CropKind) => `url(#g-${kind})`;

function Leaf({ x, y, r, len, w, fill }: { x: number; y: number; r: number; len: number; w: number; fill: string }) {
  return (
    <path
      d={`M0 0C${w} ${-len * 0.35} ${w * 0.6} ${-len * 0.85} 0 ${-len}C${-w * 0.6} ${-len * 0.85} ${-w} ${-len * 0.35} 0 0Z`}
      fill={fill}
      transform={`translate(${x} ${y}) rotate(${r})`}
    />
  );
}

function Fruit({ x, y, r, kind }: { x: number; y: number; r: number; kind: CropKind }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={grad(kind)} />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.32} ry={r * 0.22} fill="#fff" opacity="0.55" />
    </g>
  );
}

function Foliage({ s }: { s: CropStyle }) {
  return (
    <g>
      <ellipse cx="0" cy="-16" rx="20" ry="15" fill={shade(s.leaf, -0.18)} />
      <ellipse cx="-9" cy="-22" rx="12" ry="11" fill={s.leaf} />
      <ellipse cx="9" cy="-24" rx="12" ry="11" fill={shade(s.leaf, 0.1)} />
      <ellipse cx="0" cy="-30" rx="10" ry="8" fill={shade(s.leaf, 0.22)} />
    </g>
  );
}

/* ---------- growth stages ---------- */

function Sprout({ s }: { s: CropStyle }) {
  return (
    <g>
      <path d="M0 0Q1 -7 0 -12" stroke={shade(s.leaf, -0.25)} stroke-width="2.4" fill="none" stroke-linecap="round" />
      <Leaf x={0} y={-10} r={-55} len={12} w={6} fill={s.leaf} />
      <Leaf x={0} y={-10} r={55} len={12} w={6} fill={shade(s.leaf, 0.18)} />
    </g>
  );
}

function Young({ s }: { s: CropStyle }) {
  const dark = shade(s.leaf, -0.15);
  return (
    <g>
      <path d="M0 0Q2 -14 0 -26" stroke={shade(s.leaf, -0.3)} stroke-width="2.8" fill="none" stroke-linecap="round" />
      <Leaf x={0} y={-6} r={-70} len={16} w={8} fill={dark} />
      <Leaf x={0} y={-6} r={70} len={16} w={8} fill={dark} />
      <Leaf x={0} y={-18} r={-40} len={15} w={7} fill={s.leaf} />
      <Leaf x={0} y={-18} r={40} len={15} w={7} fill={shade(s.leaf, 0.15)} />
      <circle cx="0" cy="-27" r="3" fill={s.c1} />
    </g>
  );
}

const CLUSTER: [number, number][] = [[-4, -23], [4, -23], [-8, -17], [0, -17], [8, -17], [-4, -11], [4, -11]];

function Root({ kind, s }: { kind: CropKind; s: CropStyle }) {
  const body =
    kind === 'carrot' ? (
      <g>
        <path d="M-9 -9Q0 -14 9 -9L3 5Q0 8 -3 5Z" fill={grad(kind)} />
        <ellipse cx="-3" cy="-8" rx="2.4" ry="1.6" fill="#fff" opacity="0.45" />
      </g>
    ) : kind === 'potato' ? (
      <g>
        <ellipse cx="-9" cy="-3" rx="8" ry="5.5" fill={grad(kind)} />
        <ellipse cx="8" cy="-2" rx="7" ry="5" fill={grad(kind)} />
        <circle cx="-11" cy="-4" r="0.9" fill={s.c2} />
        <circle cx="7" cy="-3" r="0.9" fill={s.c2} />
      </g>
    ) : (
      <g>
        <ellipse cx="0" cy="-9" rx="10.5" ry="10" fill={grad(kind)} />
        <path d="M0 1q1 4 -1 7" stroke={s.c2} stroke-width="1.6" fill="none" stroke-linecap="round" />
        <ellipse cx="-4" cy="-13" rx="3" ry="2" fill="#fff" opacity="0.45" />
      </g>
    );
  return (
    <g>
      {[-30, -10, 10, 30].map((r, i) => (
        <Leaf key={r} x={0} y={-8} r={r} len={i === 0 || i === 3 ? 20 : 27} w={6} fill={i % 2 ? s.leaf : shade(s.leaf, -0.15)} />
      ))}
      {body}
    </g>
  );
}

function Corn({ s }: { s: CropStyle }) {
  return (
    <g>
      <path d="M0 0L0 -50" stroke={shade(s.leaf, -0.25)} stroke-width="3.5" stroke-linecap="round" />
      <Leaf x={0} y={-8} r={-62} len={26} w={6} fill={shade(s.leaf, -0.12)} />
      <Leaf x={0} y={-16} r={60} len={26} w={6} fill={s.leaf} />
      <Leaf x={0} y={-30} r={-48} len={20} w={5} fill={shade(s.leaf, 0.12)} />
      <g transform="translate(6 -34) rotate(18)">
        <ellipse cx="0" cy="0" rx="5.5" ry="12" fill={grad('corn')} />
        <path d="M-6 6Q-2 -6 0 -13M6 6Q2 -6 0 -13" stroke={shade(s.leaf, -0.1)} stroke-width="3" fill="none" />
      </g>
      <path d="M0 -50l-3 -6M0 -50l3 -6M0 -50l0 -7" stroke="#e3c46a" stroke-width="1.6" stroke-linecap="round" />
    </g>
  );
}

function Wheat({ s }: { s: CropStyle }) {
  return (
    <g>
      {[-10, 0, 10].map((x, i) => (
        <g key={x} transform={`translate(${x} 0) rotate(${(i - 1) * 8})`}>
          <path d="M0 0L0 -40" stroke={shade(s.c2, -0.1)} stroke-width="2" />
          {[0, 1, 2, 3].map((j) => (
            <g key={j}>
              <ellipse cx="-3" cy={-40 + j * 5} rx="2.6" ry="4" fill={s.c1} transform={`rotate(-25 -3 ${-40 + j * 5})`} />
              <ellipse cx="3" cy={-40 + j * 5} rx="2.6" ry="4" fill={s.c2} transform={`rotate(25 3 ${-40 + j * 5})`} />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function FlowerStem({ s }: { s: CropStyle }) {
  return (
    <g>
      <path d="M0 0Q2 -20 0 -38" stroke={shade(s.leaf, -0.25)} stroke-width="3" fill="none" stroke-linecap="round" />
      <Leaf x={0} y={-12} r={-60} len={16} w={8} fill={s.leaf} />
      <Leaf x={0} y={-20} r={60} len={16} w={8} fill={shade(s.leaf, 0.12)} />
    </g>
  );
}

function Sunflower({ s }: { s: CropStyle }) {
  return (
    <g>
      <FlowerStem s={s} />
      <g transform="translate(0 -42)">
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-10" rx="3.6" ry="7" fill={i % 2 ? s.c1 : s.c2} transform={`rotate(${i * 30})`} />
        ))}
        <circle r="7" fill="#7a4a23" />
        <circle r="4.5" fill="#5c3518" />
      </g>
    </g>
  );
}

function Rose({ s }: { s: CropStyle }) {
  return (
    <g>
      <FlowerStem s={s} />
      <path d="M-1 -16l-4 -2M1 -27l4 -2" stroke={shade(s.leaf, -0.35)} stroke-width="1.8" stroke-linecap="round" />
      <g transform="translate(0 -40)">
        <circle r="9" fill={s.c2} />
        <circle cx="-3" cy="-2" r="6" fill={s.c1} />
        <circle cx="3" cy="-1" r="5.5" fill={shade(s.c1, 0.15)} />
        <path d="M-3 0q3 -5 6 0" stroke={s.c2} stroke-width="1.5" fill="none" />
      </g>
    </g>
  );
}

function Hanging({ kind, s }: { kind: CropKind; s: CropStyle }) {
  const pods = kind === 'pea' || kind === 'bean';
  const spots: [number, number, number][] = [[-9, -22, -12], [8, -24, 14], [0, -14, 4]];
  return (
    <g>
      <Foliage s={s} />
      {spots.map(([x, y, r]) => (
        <g key={`${x}${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
          {pods ? (
            <g>
              <path d="M-3 0Q-4 12 0 18Q4 12 3 0Z" fill={grad(kind)} />
              {kind === 'pea' && [4, 9, 14].map((yy) => <circle key={yy} cx="0" cy={yy} r="1.6" fill={shade(s.c1, 0.3)} />)}
            </g>
          ) : (
            <g>
              <path d="M0 0C-7 3 -8 16 0 20C8 16 7 3 0 0Z" fill={grad(kind)} />
              <path d="M-3 0h6l-3 -4z" fill={shade(s.leaf, -0.2)} />
            </g>
          )}
        </g>
      ))}
    </g>
  );
}

function Cabbage({ s }: { s: CropStyle }) {
  return (
    <g>
      <ellipse cx="0" cy="-10" rx="21" ry="12" fill={shade(s.c2, -0.1)} />
      <circle cx="-8" cy="-14" r="10" fill={s.c2} />
      <circle cx="8" cy="-14" r="10" fill={s.c2} />
      <circle cx="0" cy="-17" r="11" fill={grad('cabbage')} />
      <path d="M0 -8Q-2 -16 0 -25M0 -14l-5 -4M0 -18l5 -4" stroke={shade(s.c2, -0.2)} stroke-width="1.3" fill="none" stroke-linecap="round" />
    </g>
  );
}

function Gourd({ kind, s }: { kind: CropKind; s: CropStyle }) {
  return (
    <g>
      <Leaf x={-6} y={-6} r={-70} len={20} w={10} fill={s.leaf} />
      <Leaf x={6} y={-8} r={65} len={18} w={10} fill={shade(s.leaf, 0.12)} />
      <path d="M14 -10q8 -6 6 -14q-2 6 -8 6" stroke={shade(s.leaf, -0.2)} stroke-width="1.8" fill="none" />
      <ellipse cx="0" cy="-10" rx="16" ry="12" fill={grad(kind)} />
      {kind === 'pumpkin' ? (
        <g stroke={shade(s.c2, -0.15)} stroke-width="1.4" fill="none">
          <path d="M-6 -21Q-11 -10 -6 1" />
          <path d="M6 -21Q11 -10 6 1" />
          <path d="M0 -22L0 2" />
        </g>
      ) : (
        <g stroke={shade(s.c2, -0.2)} stroke-width="2" fill="none" opacity="0.7">
          <path d="M-9 -19Q-13 -10 -9 -1" />
          <path d="M0 -22Q-2 -10 0 2" />
          <path d="M9 -19Q13 -10 9 -1" />
        </g>
      )}
      <path d="M0 -22q1 -5 4 -6" stroke="#6b4a2b" stroke-width="2.4" fill="none" stroke-linecap="round" />
      <ellipse cx="-6" cy="-15" rx="4" ry="2.4" fill="#fff" opacity="0.45" />
    </g>
  );
}

function Mushroom({ stage, s }: { stage: 1 | 2 | 3; s: CropStyle }) {
  const k = stage === 1 ? 0.5 : stage === 2 ? 0.75 : 1;
  return (
    <g transform={`scale(${k})`}>
      <path d="M-6 0Q-7 -12 -4 -16L4 -16Q7 -12 6 0Z" fill={s.leaf} />
      <path d="M-17 -14Q-16 -32 0 -33Q16 -32 17 -14Q0 -10 -17 -14Z" fill={grad('mushroom')} />
      <circle cx="-7" cy="-24" r="2.6" fill="#fff" opacity="0.9" />
      <circle cx="5" cy="-27" r="2" fill="#fff" opacity="0.9" />
      <circle cx="9" cy="-19" r="1.8" fill="#fff" opacity="0.9" />
    </g>
  );
}

function Mature({ kind, s }: { kind: CropKind; s: CropStyle }) {
  switch (s.f) {
    case 'round':
      return (
        <g>
          <Foliage s={s} />
          <Fruit x={-10} y={-16} r={6.5} kind={kind} />
          <Fruit x={9} y={-23} r={6.5} kind={kind} />
          <Fruit x={1} y={-9} r={6} kind={kind} />
        </g>
      );
    case 'cluster':
      return (
        <g>
          <Foliage s={s} />
          {CLUSTER.map(([x, y]) => (
            <Fruit key={`${x}${y}`} x={x} y={y} r={4.2} kind={kind} />
          ))}
        </g>
      );
    case 'root':
      return <Root kind={kind} s={s} />;
    case 'stalk':
      return kind === 'corn' ? <Corn s={s} /> : <Wheat s={s} />;
    case 'flower':
      return kind === 'sunflower' ? <Sunflower s={s} /> : <Rose s={s} />;
    case 'hanging':
      return <Hanging kind={kind} s={s} />;
    case 'leafy':
      return <Cabbage s={s} />;
    case 'gourd':
      return <Gourd kind={kind} s={s} />;
    default:
      return <Mushroom stage={3} s={s} />;
  }
}

export function CropShape({ kind, stage }: { kind: CropKind; stage: 1 | 2 | 3 }) {
  const s = CROP_STYLE[kind];
  const body =
    s.f === 'mushroom' ? <Mushroom stage={stage} s={s} /> : stage === 1 ? <Sprout s={s} /> : stage === 2 ? <Young s={s} /> : <Mature kind={kind} s={s} />;
  return (
    <g>
      <ellipse cx="0" cy="1" rx="15" ry="4" fill="#3b2412" opacity="0.18" />
      {body}
    </g>
  );
}

/* ---------- shared <defs> ---------- */

function Linear({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={top} />
      <stop offset="1" stop-color={bottom} />
    </linearGradient>
  );
}

export function ArtDefs() {
  return (
    <defs>
      {CROP_KINDS.map((k) => (
        <radialGradient key={k} id={`g-${k}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stop-color={shade(CROP_STYLE[k].c1, 0.25)} />
          <stop offset="0.55" stop-color={CROP_STYLE[k].c1} />
          <stop offset="1" stop-color={CROP_STYLE[k].c2} />
        </radialGradient>
      ))}
      <Linear id="g-grass" top="#9ad46c" bottom="#78b955" />
      <Linear id="g-soil" top="#a8714a" bottom="#8b5a39" />
      <Linear id="g-water" top="#7fd3f7" bottom="#3aa6e0" />
      <Linear id="g-roof" top="#ef7a5f" bottom="#cf4f3a" />
      <Linear id="g-wall" top="#fff6e3" bottom="#f1dfbd" />
      <Linear id="g-wood" top="#c98f5d" bottom="#a8703f" />
      <Linear id="g-rock" top="#b7aa9b" bottom="#8a7d70" />
      <g id="tuft">
        <path d="M-4 0Q-3 -6 -5 -9M0 0Q0 -7 1 -11M4 0Q3 -6 5 -8" stroke="#6aa94a" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
      {CROP_KINDS.flatMap((k) =>
        ([1, 2, 3] as const).map((st) => (
          <g key={`${k}-${st}`} id={`crop-${k}-${st}`}>
            <CropShape kind={k} stage={st} />
          </g>
        )),
      )}
    </defs>
  );
}

/* ---------- buildings & decor (each drawn from its own top-left origin) ---------- */

export function House({ night }: { night: boolean }) {
  const win = night ? '#ffd76a' : '#bfe6ff';
  return (
    <g>
      <ellipse cx="95" cy="186" rx="96" ry="10" fill="#3b2412" opacity="0.15" />
      <rect x="18" y="80" width="154" height="104" rx="10" fill="url(#g-wall)" />
      <rect x="18" y="160" width="154" height="24" rx="6" fill="#e3cfa8" />
      <rect x="132" y="30" width="20" height="40" rx="4" fill="#9a6a4b" />
      <rect x="128" y="26" width="28" height="9" rx="3" fill="#7d5238" />
      <g class="ambient">
        <circle class="smoke" cx="142" cy="18" r="7" fill="#fff" opacity="0.7" />
        <circle class="smoke smoke-late" cx="146" cy="14" r="5" fill="#fff" opacity="0.6" />
      </g>
      <path d="M4 92L95 18L186 92Q190 98 182 100L8 100Q0 98 4 92Z" fill="url(#g-roof)" />
      <path d="M30 84L95 32L160 84" stroke="#fff" stroke-opacity="0.22" stroke-width="5" fill="none" stroke-linecap="round" />
      <rect x="78" y="118" width="34" height="66" rx="8" fill="#8a5a3b" />
      <circle cx="104" cy="152" r="3" fill="#f4b63d" />
      <rect x="34" y="114" width="32" height="30" rx="6" fill={win} stroke="#fff" stroke-width="4" />
      <rect x="124" y="114" width="32" height="30" rx="6" fill={win} stroke="#fff" stroke-width="4" />
      <path d="M50 114v30M34 129h32M140 114v30M124 129h32" stroke="#fff" stroke-width="3" />
      <rect x="30" y="146" width="40" height="8" rx="4" fill="#e2583f" />
      <circle cx="38" cy="145" r="4" fill="#ffd23f" />
      <circle cx="50" cy="144" r="4" fill="#ff6f91" />
      <circle cx="62" cy="145" r="4" fill="#ffd23f" />
    </g>
  );
}

export function ShippingBin({ count }: { count: number }) {
  return (
    <g>
      <ellipse cx="30" cy="50" rx="32" ry="6" fill="#3b2412" opacity="0.15" />
      <rect x="2" y="14" width="56" height="36" rx="6" fill="url(#g-wood)" />
      <path d="M2 26h56M2 38h56" stroke="#8a5a3b" stroke-width="2" opacity="0.6" />
      <rect x="-1" y="6" width="62" height="12" rx="5" fill="#b07a4c" />
      {count > 0 && (
        <g transform="translate(54 4)">
          <circle r="11" fill="#e2583f" stroke="#fff" stroke-width="2.5" />
          <text y="4.5" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">
            {count}
          </text>
        </g>
      )}
    </g>
  );
}

export function MineEntrance() {
  return (
    <g>
      <path d="M0 210L10 90L50 40L110 10L170 40L200 100L200 210Z" fill="url(#g-rock)" />
      <path d="M40 60L80 30L120 40L90 70Z" fill="#cfc3b5" opacity="0.6" />
      <path d="M150 70L185 100L170 120Z" fill="#6f655a" opacity="0.5" />
      <path d="M55 210L55 130Q100 80 145 130L145 210Z" fill="#2e2620" />
      <path d="M50 210V128M150 210V128M44 126H156" stroke="#9a6a3f" stroke-width="10" stroke-linecap="round" />
      <path d="M70 210L86 160M130 210L114 160M80 190H120M84 175H116" stroke="#7a5a3c" stroke-width="3" />
      <circle cx="162" cy="160" r="5" fill="#8fd3ff" />
      <circle cx="34" cy="150" r="4" fill="#ffd23f" />
      <circle cx="176" cy="186" r="3.5" fill="#ff8fb1" />
    </g>
  );
}

export function Pond() {
  return (
    <g>
      <ellipse cx="130" cy="50" rx="130" ry="46" fill="#5fae55" />
      <ellipse cx="130" cy="49" rx="117" ry="38" fill="url(#g-water)" />
      <ellipse cx="108" cy="38" rx="56" ry="9" fill="#fff" opacity="0.25" />
      <g class="ambient">
        <ellipse class="ripple" cx="168" cy="56" rx="16" ry="5" fill="none" stroke="#fff" stroke-width="2" opacity="0.6" />
      </g>
      <ellipse cx="60" cy="62" rx="12" ry="7" fill="#4caf50" />
      <ellipse cx="200" cy="42" rx="10" ry="6" fill="#4caf50" />
      <circle cx="202" cy="39" r="3" fill="#ff8fb1" />
      <rect x="222" y="16" width="40" height="12" rx="3" fill="url(#g-wood)" transform="rotate(12 242 22)" />
    </g>
  );
}

export function Tree({ s = 1, autumn = false }: { s?: number; autumn?: boolean }) {
  const c = autumn ? ['#f2a541', '#e07a2e', '#f6c453'] : ['#5aa83c', '#4a9431', '#6cc04a'];
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="0" cy="4" rx="30" ry="8" fill="#3b2412" opacity="0.18" />
      <rect x="-6" y="-30" width="12" height="34" rx="5" fill="#8a5a3b" />
      <circle cx="0" cy="-48" r="30" fill={c[1]} />
      <circle cx="-14" cy="-56" r="18" fill={c[0]} />
      <circle cx="14" cy="-58" r="17" fill={c[2]} />
      <circle cx="2" cy="-70" r="15" fill={c[0]} />
    </g>
  );
}

export function Bush() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="20" ry="5" fill="#3b2412" opacity="0.15" />
      <circle cx="-9" cy="-8" r="11" fill="#4f9a37" />
      <circle cx="8" cy="-9" r="12" fill="#5fb143" />
      <circle cx="0" cy="-15" r="10" fill="#6cc04a" />
    </g>
  );
}

export function Flowers({ color = '#ff8fb1' }: { color?: string }) {
  const spots: [number, number][] = [[-10, 0], [0, -4], [10, 1]];
  return (
    <g>
      {spots.map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M0 0v8" stroke="#4f9a37" stroke-width="2" />
          <circle r="4" fill={color} />
          <circle r="1.6" fill="#ffe08a" />
        </g>
      ))}
    </g>
  );
}

export function Sign({ text, thirsty = 0, ready = 0 }: { text: string; thirsty?: number; ready?: number }) {
  const textW = Math.round(text.length * 8.4);
  const dropX = 18 + textW;
  const starX = dropX + (thirsty ? 40 : 0);
  const w = starX + (ready ? 40 : 0) + 4;
  return (
    <g>
      <rect x="0" y="0" width={w} height="26" rx="8" fill="url(#g-wood)" stroke="#8a5a3b" stroke-width="2" />
      <text x="11" y="18" font-size="14" font-weight="900" fill="#fffaf0">
        {text}
      </text>
      {thirsty > 0 && (
        <g transform={`translate(${dropX} 4)`}>
          <rect width="36" height="18" rx="9" fill="#fffaf0" />
          <path d="M10 3C8 6 6 8 6 10a4 4 0 0 0 8 0c0-2-2-4-4-7z" fill="#4fb3f0" />
          <text x="25" y="13.5" text-anchor="middle" font-size="12" font-weight="900" fill="#2a77bd">
            {thirsty}
          </text>
        </g>
      )}
      {ready > 0 && (
        <g transform={`translate(${starX} 4)`}>
          <rect width="36" height="18" rx="9" fill="#fffaf0" />
          <path d="M10 3l1.8 3.8 4.2.5-3.1 2.9.8 4.1-3.7-2-3.7 2 .8-4.1-3.1-2.9 4.2-.5z" fill="#f4b63d" />
          <text x="25" y="13.5" text-anchor="middle" font-size="12" font-weight="900" fill="#a46d00">
            {ready}
          </text>
        </g>
      )}
    </g>
  );
}

export function CalendarBoard({ day }: { day: number }) {
  return (
    <g>
      <rect x="16" y="34" width="6" height="30" fill="#8a5a3b" />
      <rect x="0" y="0" width="38" height="38" rx="6" fill="#fffaf0" stroke="#8a5a3b" stroke-width="3" />
      <rect x="0" y="0" width="38" height="11" rx="5" fill="#e2583f" />
      <text x="19" y="31" text-anchor="middle" font-size="17" font-weight="900" fill="#2b2620">
        {day}
      </text>
    </g>
  );
}

/** Drawn with its feet at (0, 0). The walk cycle animates `.leg` and `.farmer-body` via CSS. */
export function Farmer() {
  return (
    <g class="farmer-body">
      <ellipse cx="0" cy="2" rx="14" ry="4" fill="#3b2412" opacity="0.22" />
      <g class="leg leg-l">
        <rect x="-7" y="-14" width="6" height="14" rx="3" fill="#2f4858" />
      </g>
      <g class="leg leg-r">
        <rect x="1" y="-14" width="6" height="14" rx="3" fill="#2f4858" />
      </g>
      <rect x="-10" y="-30" width="20" height="19" rx="7" fill="#2a9d8f" />
      <rect x="-8" y="-24" width="16" height="13" rx="4" fill="#3d5a80" />
      <circle cx="0" cy="-38" r="10" fill="#f2c9a0" />
      <path d="M-10 -40Q-9 -50 0 -50Q9 -50 10 -40Q5 -44 0 -44Q-5 -44 -10 -40Z" fill="#5b3a29" />
      <ellipse cx="0" cy="-45" rx="17" ry="4.5" fill="#e9c46a" />
      <path d="M-9 -45Q-8 -56 0 -56Q8 -56 9 -45Z" fill="#f2d27c" />
      <rect x="-9" y="-48" width="18" height="3.5" fill="#d1495b" />
      <circle cx="-3.5" cy="-37" r="1.4" fill="#2b2620" />
      <circle cx="3.5" cy="-37" r="1.4" fill="#2b2620" />
      <path d="M-2.5 -33Q0 -31 2.5 -33" stroke="#a0522d" stroke-width="1.2" fill="none" stroke-linecap="round" />
      <circle cx="-6" cy="-34" r="2" fill="#ff9e9e" opacity="0.5" />
      <circle cx="6" cy="-34" r="2" fill="#ff9e9e" opacity="0.5" />
    </g>
  );
}

export function DropBadge() {
  return (
    <g>
      <circle r="11" fill="#fff" stroke="#4fb3f0" stroke-width="2.5" />
      <path d="M0 -6.5C-3 -2 -5 0.5 -5 2.5a5 5 0 0 0 10 0C5 0.5 3 -2 0 -6.5Z" fill="#4fb3f0" />
    </g>
  );
}

export function Star() {
  return <path d="M0 -9L2.6 -2.6L9 -2.2L4 2L5.6 8.6L0 5L-5.6 8.6L-4 2L-9 -2.2L-2.6 -2.6Z" fill="#ffd23f" stroke="#fff" stroke-width="1.5" />;
}

const PEST_COLOR: Record<ErrorTag, string> = { K: '#7b4fd6', C: '#e2583f', N: '#3a9a5b', M: '#8a5a3b', T: '#3d9be9' };

export function PestDot({ tag }: { tag: ErrorTag }) {
  return (
    <g>
      <circle r="7.5" fill={PEST_COLOR[tag]} stroke="#fff" stroke-width="2" />
      <text y="3.5" text-anchor="middle" font-size="9.5" font-weight="900" fill="#fff">
        {tag}
      </text>
    </g>
  );
}
