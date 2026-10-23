import { CELL, FIELD_LAYOUT, LANDMARKS, WORLD, capacity, cellCenter, nightLevel } from '../../src/scene/layout';

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

  it('town gate overlaps nothing', () => {
    const g = LANDMARKS.town;
    // The TownGate art (art.tsx) is drawn in a local box roughly 0–110 wide, 0–32 tall.
    const gate = { x1: g.x, y1: g.y, x2: g.x + 110, y2: g.y + 32 };
    expect(gate.x1).toBeGreaterThanOrEqual(0);
    expect(gate.x2).toBeLessThanOrEqual(WORLD.w);
    expect(gate.y1).toBeGreaterThanOrEqual(0);
    expect(gate.y2).toBeLessThanOrEqual(WORLD.h);

    const others = [
      { x1: LANDMARKS.house.x, y1: LANDMARKS.house.y, x2: LANDMARKS.house.x + 190, y2: LANDMARKS.house.y + 200 },
      { x1: LANDMARKS.bin.x - 2, y1: LANDMARKS.bin.y - 8, x2: LANDMARKS.bin.x + 65, y2: LANDMARKS.bin.y + 56 },
      { x1: LANDMARKS.calendar.x, y1: LANDMARKS.calendar.y, x2: LANDMARKS.calendar.x + 38, y2: LANDMARKS.calendar.y + 64 },
      { x1: LANDMARKS.mine.x, y1: LANDMARKS.mine.y, x2: LANDMARKS.mine.x + 200, y2: LANDMARKS.mine.y + 210 },
      ...Object.values(FIELD_LAYOUT).map((f) => ({
        x1: f.x - 6,
        y1: f.signY,
        x2: f.x + f.cols * CELL.w + 6,
        y2: f.y + f.rows * CELL.h + 6,
      })),
    ];
    for (const b of others) {
      expect(gate.x1 < b.x2 && b.x1 < gate.x2 && gate.y1 < b.y2 && b.y1 < gate.y2).toBe(false);
    }
  });

  it('dims the farm at night but not at noon', () => {
    expect(nightLevel(12)).toBe(0);
    expect(nightLevel(22)).toBeCloseTo(0.38);
    expect(nightLevel(18)).toBeCloseTo(0.19);
    expect(nightLevel(6)).toBeCloseTo(0.19);
  });
});
