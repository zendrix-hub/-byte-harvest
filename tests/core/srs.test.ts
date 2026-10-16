import { catchValue, harvestValue } from '../../src/core/economy';
import { applyAnswer, cropsInField, dueCrops, harvestCrop, readyCrops } from '../../src/core/srs';
import { makeCrop, makeSave } from '../helpers';

const q1 = { kind: 'paper' as const, ref: '2025S_A_Q01', topic: 'Number & logic' };

describe('crop growth (spaced watering)', () => {
  it('plants a seed on a miss, due tomorrow', () => {
    const s = makeSave();
    const r = applyAnswer(s, { ...q1, ok: false, conf: 'U', today: '2026-10-16' });
    expect(r.event).toBe('planted');
    expect(s.crops['paper:2025S_A_Q01']).toMatchObject({ stage: 1, due: '2026-10-17', sbw: false, plantedOn: '2026-10-16' });
  });

  it('makes sure-but-wrong crops golden and plants lucky guesses too', () => {
    const s = makeSave();
    applyAnswer(s, { ...q1, ok: false, conf: 'S', today: '2026-10-16' });
    expect(s.crops['paper:2025S_A_Q01'].sbw).toBe(true);
    const g = applyAnswer(s, { kind: 'paper', ref: '2025S_A_Q02', topic: 'Number & logic', ok: true, conf: 'G', today: '2026-10-16' });
    expect(g.event).toBe('planted');
  });

  it('does nothing for a solid first-time answer', () => {
    const s = makeSave();
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-16' })).toEqual({ event: 'none', crop: null });
    expect(s.crops).toEqual({});
  });

  it('grows only on a later day: +1 day, then +2 days, then ready', () => {
    const s = makeSave();
    applyAnswer(s, { ...q1, ok: false, conf: 'U', today: '2026-10-16' });
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-16' }).event).toBe('same-day');
    const grew = applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-17' });
    expect(grew.event).toBe('grew');
    expect(grew.crop).toMatchObject({ stage: 2, due: '2026-10-19' });
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'U', today: '2026-10-19' }).event).toBe('ready');
    expect(s.crops['paper:2025S_A_Q01'].stage).toBe(3);
  });

  it('wilts one stage on a later miss and keeps the golden mark', () => {
    const s = makeSave({
      crops: { 'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', stage: 2, sbw: true, due: '2026-10-19' }) },
    });
    const r = applyAnswer(s, { ...q1, ok: false, conf: 'U', today: '2026-10-19' });
    expect(r.event).toBe('wilted');
    expect(r.crop).toMatchObject({ stage: 1, due: '2026-10-20', sbw: true });
  });

  it('never schedules past the last review day', () => {
    const s = makeSave({
      crops: { 'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', stage: 1, last: '2026-10-22', due: '2026-10-23' }) },
    });
    expect(applyAnswer(s, { ...q1, ok: true, conf: 'S', today: '2026-10-23' }).crop?.due).toBe('2026-10-24');
  });
});

describe('harvest and lists', () => {
  it('harvests only ready crops, paying gold and logging the day', () => {
    const s = makeSave({
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', stage: 3, sbw: true }),
        'paper:2025S_A_Q02': makeCrop({ ref: '2025S_A_Q02', topic: 'Number & logic', stage: 2 }),
      },
    });
    expect(harvestCrop(s, 'paper:2025S_A_Q02', '2026-10-18')).toEqual({ ok: false, gold: 0 });
    expect(harvestCrop(s, 'paper:2025S_A_Q01', '2026-10-18')).toEqual({ ok: true, gold: 40 });
    expect(s.crops['paper:2025S_A_Q01']).toBeUndefined();
    expect(s.harvested['Number & logic']).toBe(1);
    expect(s.gold).toBe(40);
    expect(s.days['2026-10-18']).toMatchObject({ harvested: 1, goldEarned: 40 });
  });

  it('orders thirsty crops golden-first, then by oldest due date', () => {
    const s = makeSave({
      crops: {
        'paper:a': makeCrop({ ref: 'a', topic: 'Network', due: '2026-10-17' }),
        'paper:b': makeCrop({ ref: 'b', topic: 'Network', due: '2026-10-18', sbw: true }),
        'paper:c': makeCrop({ ref: 'c', topic: 'Network', due: '2026-10-20' }),
        'paper:d': makeCrop({ ref: 'd', topic: 'Network', stage: 3 }),
      },
    });
    expect(dueCrops(s, '2026-10-18').map((c) => c.ref)).toEqual(['b', 'a']);
    expect(readyCrops(s).map((c) => c.ref)).toEqual(['d']);
    expect(cropsInField(s, 'tech', '2026-10-18').map((c) => c.ref)).toEqual(['d', 'b', 'a', 'c']);
    expect(cropsInField(s, 'strategy', '2026-10-18')).toEqual([]);
  });

  it('prices catches and harvests', () => {
    expect([catchValue('S'), catchValue('U'), catchValue('G'), catchValue(null)]).toEqual([5, 3, 1, 2]);
    expect(harvestValue(makeCrop({ ref: 'x', topic: 'Network' }))).toBe(25);
  });
});
