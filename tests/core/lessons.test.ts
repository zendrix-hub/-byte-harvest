import { finishLesson, heartsFor, learnedCount } from '../../src/core/lessons';
import { makeSave } from '../helpers';

const p = { id: 'bs-logic-1', topic: 'Number & logic' };
const cropId = 'concept:bs-logic-1';

const ok = (conf: 'S' | 'U' | 'G' = 'S') => ({ ok: true, conf });
const bad = (conf: 'S' | 'U' | 'G' = 'U') => ({ ok: false, conf });

describe('finishLesson', () => {
  it('plants a concept crop on the first learn run, even when all correct', () => {
    const s = makeSave();
    const r = finishLesson(s, p, [ok(), ok()], 'learn', '2026-10-16', 100);
    expect(r.event).toBe('planted');
    expect(s.crops[cropId]).toMatchObject({ kind: 'concept', ref: 'bs-logic-1', topic: 'Number & logic', stage: 1, due: '2026-10-17', sbw: false });
    expect(s.lessons['bs-logic-1']).toMatchObject({ first: '2026-10-16', mastered: false });
    expect(s.lessons['bs-logic-1'].runs).toEqual([{ d: '2026-10-16', right: 2, n: 2, solid: true, sbw: false, mode: 'learn', ts: 100 }]);
    expect(s.days['2026-10-16'].lessons).toBe(1);
  });

  it('a solid water run on a later day grows the crop to stage 2 (due +2)', () => {
    const s = makeSave();
    finishLesson(s, p, [ok()], 'learn', '2026-10-16', 1);
    const r = finishLesson(s, p, [ok(), ok()], 'water', '2026-10-17', 2);
    expect(r.event).toBe('grew');
    expect(s.crops[cropId]).toMatchObject({ stage: 2, due: '2026-10-19' });
    // only the learn run's first-ever run bumps the day counter
    expect(s.days['2026-10-17']?.lessons ?? 0).toBe(0);
  });

  it('a same-day rerun neither grows nor duplicates the crop', () => {
    const s = makeSave();
    finishLesson(s, p, [bad()], 'learn', '2026-10-16', 1);
    const r = finishLesson(s, p, [ok(), ok()], 'water', '2026-10-16', 2);
    expect(r.event).toBe('same-day');
    expect(Object.keys(s.crops)).toEqual([cropId]);
    expect(s.crops[cropId].stage).toBe(1);
    expect(s.lessons['bs-logic-1'].runs).toHaveLength(2);
  });

  it('a shaky water run wilts the crop and sets due tomorrow', () => {
    const s = makeSave();
    finishLesson(s, p, [ok()], 'learn', '2026-10-16', 1);
    finishLesson(s, p, [ok(), ok()], 'water', '2026-10-17', 2); // grows to stage 2, due 10-19
    const r = finishLesson(s, p, [ok(), bad('G')], 'water', '2026-10-19', 3);
    expect(r.event).toBe('wilted');
    expect(s.crops[cropId]).toMatchObject({ stage: 1, due: '2026-10-20' });
  });

  it('sure-but-wrong makes the crop golden', () => {
    const s = makeSave();
    finishLesson(s, p, [ok()], 'learn', '2026-10-16', 1);
    finishLesson(s, p, [bad('S')], 'water', '2026-10-17', 2);
    expect(s.crops[cropId].sbw).toBe(true);
  });

  it('reaching stage 3 marks the packet mastered, and harvesting then learning again does not replant', () => {
    const s = makeSave();
    finishLesson(s, p, [ok()], 'learn', '2026-10-16', 1);
    finishLesson(s, p, [ok()], 'water', '2026-10-17', 2); // stage 2, due 10-19
    const ready = finishLesson(s, p, [ok()], 'water', '2026-10-19', 3); // stage 3
    expect(ready.event).toBe('ready');
    expect(s.lessons['bs-logic-1'].mastered).toBe(true);
    expect(s.crops[cropId].stage).toBe(3);

    delete s.crops[cropId]; // simulate the player harvesting it

    const after = finishLesson(s, p, [ok(), ok()], 'learn', '2026-10-20', 4);
    expect(after.event).toBe('none');
    expect(s.crops[cropId]).toBeUndefined();
    expect(s.lessons['bs-logic-1'].runs).toHaveLength(4);
  });
});

describe('heartsFor / learnedCount', () => {
  it('floors hearts to a 0-5 range', () => {
    const s = makeSave({
      lessons: {
        a: { first: '2026-10-16', runs: [], mastered: true },
        b: { first: '2026-10-16', runs: [], mastered: true },
        c: { first: '2026-10-16', runs: [], mastered: false },
      },
    });
    expect(heartsFor(s, ['a', 'b', 'c'])).toBe(3); // floor(5*2/3) = 3
    expect(heartsFor(s, [])).toBe(0);
    expect(heartsFor(s, ['x', 'y'])).toBe(0);
    expect(learnedCount(s, ['a', 'b', 'c', 'z'])).toBe(3);
  });
});
