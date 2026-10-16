import { CELL, FIELD_LAYOUT, WORLD, capacity, cellCenter, nightLevel } from '../../src/scene/layout';

describe('farm layout', () => {
  it('keeps every field (sign + frame) inside the world without overlaps', () => {
    const rects = Object.values(FIELD_LAYOUT).map((f) => ({
      x1: f.x - 6,
      y1: f.signY,
      x2: f.x + f.cols * CELL.w + 6,
      y2: f.y + f.rows * CELL.h + 6,
    }));
    for (const r of rects) {
      expect(r.x1).toBeGreaterThanOrEqual(0);
      expect(r.x2).toBeLessThanOrEqual(WORLD.w);
      expect(r.y2).toBeLessThanOrEqual(WORLD.h);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        expect(a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2).toBe(false);
      }
    }
  });

  it('places every cell centre inside its field', () => {
    for (const f of Object.values(FIELD_LAYOUT)) {
      for (let i = 0; i < capacity(f); i++) {
        const p = cellCenter(f, i);
        expect(p.x).toBeGreaterThan(f.x);
        expect(p.x).toBeLessThan(f.x + f.cols * CELL.w);
        expect(p.y).toBeGreaterThan(f.y);
        expect(p.y).toBeLessThan(f.y + f.rows * CELL.h);
      }
    }
  });

  it('dims the farm at night but not at noon', () => {
    expect(nightLevel(12)).toBe(0);
    expect(nightLevel(22)).toBeCloseTo(0.38);
    expect(nightLevel(18)).toBeCloseTo(0.19);
    expect(nightLevel(6)).toBeCloseTo(0.19);
  });
});
