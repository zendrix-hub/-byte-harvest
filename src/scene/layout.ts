import { mulberry32 } from '../core/rng';
import type { FieldId } from '../data/types';

export const WORLD = { w: 600, h: 1200 };
export const CELL = { w: 66, h: 64 };

export interface FieldLayout {
  x: number;
  y: number;
  cols: number;
  rows: number;
  signY: number;
}

/* House, bin, calendar and mine sit along the top (y 36–250); the pond is at the bottom (y 1100–1196). */
export const FIELD_LAYOUT: Record<FieldId, FieldLayout> = {
  strategy: { x: 36, y: 318, cols: 8, rows: 3, signY: 286 },
  tech: { x: 36, y: 554, cols: 8, rows: 3, signY: 522 },
  security: { x: 24, y: 790, cols: 4, rows: 2, signY: 758 },
  devdb: { x: 312, y: 790, cols: 4, rows: 2, signY: 758 },
  code: { x: 36, y: 962, cols: 8, rows: 2, signY: 930 },
};

export const capacity = (f: FieldLayout) => f.cols * f.rows;

/** Where a crop's soil point sits inside cell i (row-major). */
export function cellCenter(f: FieldLayout, i: number): { x: number; y: number } {
  const col = i % f.cols;
  const row = Math.floor(i / f.cols);
  return { x: f.x + col * CELL.w + CELL.w / 2, y: f.y + row * CELL.h + CELL.h - 12 };
}

export const LANDMARKS = {
  house: { x: 20, y: 46, stand: { x: 115, y: 262 } },
  bin: { x: 226, y: 196, stand: { x: 256, y: 268 } },
  calendar: { x: 300, y: 182 },
  mine: { x: 392, y: 36, stand: { x: 492, y: 262 } },
  /** Open grass east of the pond, below the code field: the only spot with >= 74 world units
   *  (>= 44 CSS px at the project's 0.6 px/unit scale) clear in both directions for the hit-rect
   *  (see TownGate in art.tsx and layout.test.ts). */
  town: { x: 440, y: 1130, stand: { x: 495, y: 1172 } },
  pond: { x: 20, y: 1100, stand: { x: 150, y: 1094 } },
};

export const FARMER_HOME = { x: 160, y: 266 };

/** 0 by day, up to 0.38 at night, easing over 17–19 h and 5–7 h. */
export function nightLevel(hour: number): number {
  const MAX = 0.38;
  if (hour >= 7 && hour < 17) return 0;
  if (hour >= 19 || hour < 5) return MAX;
  if (hour >= 17) return ((hour - 17) / 2) * MAX;
  return ((7 - hour) / 2) * MAX;
}

const rng = mulberry32(2026);
export const TUFTS = Array.from({ length: 70 }, () => ({ x: Math.round(rng() * WORLD.w), y: Math.round(rng() * WORLD.h) }));
