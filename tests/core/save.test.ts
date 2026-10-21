import {
  CORRUPT_KEY,
  SAVE_KEY,
  defaultSave,
  exportSave,
  importBackup,
  loadSave,
  normalizeSave,
  persistSave,
} from '../../src/core/save';
import { memoryStorage } from '../helpers';

const dojoBackup = {
  att: {
    '2025S_A_Q01': [{ d: '2026-10-14', p: 'c', ok: false, c: 'S', t: 70, tag: 'K', cue: '', m: 'practice' }],
    '2025S_A_Q03': [
      { d: '2026-10-13', p: 'a', ok: false, c: 'U', t: 50, tag: null, cue: '', m: 'practice' },
      { d: '2026-10-14', p: 'b', ok: true, c: 'S', t: 40, tag: null, cue: '', m: 'review' },
    ],
  },
  rev: {
    '2025S_A_Q01': { due: '2026-10-15', step: 0, clean: 0, last: '2026-10-14', sbw: true },
    '2025S_A_Q03': { due: '2026-10-30', step: 1, clean: 1, last: '2026-10-14', sbw: false },
  },
  log: [],
  mocks: [{ d: '2026-10-17', name: '2026S Subject A', paper: '2026S', subj: 'A', full: true, score: 40, n: 60, pct: 67 }],
  hold: true,
  active: null,
};

describe('loading saves', () => {
  it('starts fresh when nothing is stored', () => {
    expect(loadSave(memoryStorage())).toEqual(defaultSave());
  });

  it('survives corrupted JSON and keeps the raw text for rescue', () => {
    const st = memoryStorage();
    st.setItem(SAVE_KEY, '{"gold": 12, oops');
    expect(loadSave(st)).toEqual(defaultSave());
    expect(st.getItem(CORRUPT_KEY)).toBe('{"gold": 12, oops');
  });

  it('salvages the valid parts of an old or partial save', () => {
    const st = memoryStorage();
    st.setItem(
      SAVE_KEY,
      JSON.stringify({
        gold: 30,
        farmer: 'Zen',
        att: { '2025S_A_Q01': [{ d: '2026-10-15', p: 'a', ok: true }, { bad: 1 }] },
        crops: { x: { nope: true } },
        settings: { sound: false },
      }),
    );
    const s = loadSave(st);
    expect(s.gold).toBe(30);
    expect(s.farmer).toBe('Zen');
    expect(s.att['2025S_A_Q01']).toHaveLength(1);
    expect(s.crops).toEqual({});
    expect(s.settings).toEqual({ sound: false, haptics: true, batterySaver: false });
  });

  it('normalizes missing or bad lesson logs', () => {
    expect(loadSave(memoryStorage())).toMatchObject({ lessons: {} });

    const st = memoryStorage();
    st.setItem(
      SAVE_KEY,
      JSON.stringify({
        lessons: {
          x: 5, // not an object at all → dropped
          good: {
            first: '2026-10-16',
            mastered: true,
            runs: [
              { d: '2026-10-16', right: 1, n: 2, solid: false, sbw: true, mode: 'learn', ts: 10 },
              { d: 'not-a-date', right: 1, n: 1, solid: true, sbw: false, mode: 'water' }, // dropped
              { d: '2026-10-17', right: 'two', n: 2, solid: true, sbw: false, mode: 'water' }, // dropped
            ],
          },
        },
      }),
    );
    const s = loadSave(st);
    expect(s.lessons.x).toBeUndefined();
    expect(s.lessons.good).toEqual({
      first: '2026-10-16',
      mastered: true,
      runs: [{ d: '2026-10-16', right: 1, n: 2, solid: false, sbw: true, mode: 'learn', ts: 10 }],
    });

    const dayNoLessons = loadSave(
      (() => {
        const m = memoryStorage();
        m.setItem(SAVE_KEY, JSON.stringify({ days: { '2026-10-16': { answered: 1 } } }));
        return m;
      })(),
    );
    expect(dayNoLessons.days['2026-10-16'].lessons).toBe(0);
  });

  it('returns defaults when storage is blocked', () => {
    expect(loadSave(memoryStorage({ throwOnGet: true }))).toEqual(defaultSave());
  });

  it('reports a failed write instead of throwing', () => {
    expect(persistSave(memoryStorage({ throwOnSet: true }), defaultSave())).toBe(false);
    expect(persistSave(memoryStorage(), defaultSave())).toBe(true);
    expect(persistSave(null, defaultSave())).toBe(false);
  });
});

describe('backups', () => {
  it('round-trips a game backup', () => {
    const s = { ...defaultSave(), gold: 77, farmer: 'Zen' };
    const r = importBackup(defaultSave(), exportSave(s, new Date('2026-10-16T12:00:00Z')), '2026-10-16');
    expect(r.ok && r.kind).toBe('game');
    if (r.ok) expect(r.save).toEqual(normalizeSave(s));
  });

  it('rejects files that are not JSON or not a backup, leaving the farm untouched', () => {
    const cur = { ...defaultSave(), gold: 5 };
    expect(importBackup(cur, 'not json', '2026-10-16')).toEqual({ ok: false, error: "That file isn't valid JSON." });
    expect(importBackup(cur, '{"hello": 1}', '2026-10-16')).toEqual({
      ok: false,
      error: "That file isn't a Byte Harvest or Dojo backup.",
    });
    expect(cur.gold).toBe(5);
  });

  it('turns a Dojo backup into attempts, crops and mocks', () => {
    const r = importBackup(defaultSave(), JSON.stringify(dojoBackup), '2026-10-16');
    expect(r.ok && r.kind).toBe('dojo');
    if (!r.ok) return;
    expect(r.save.att['2025S_A_Q03']).toHaveLength(2);
    expect(r.save.crops['paper:2025S_A_Q01']).toMatchObject({ stage: 1, due: '2026-10-15', sbw: true, pest: 'K', topic: 'Number & logic' });
    expect(r.save.crops['paper:2025S_A_Q03']).toMatchObject({ stage: 2, due: '2026-10-24' });
    expect(r.save.mocks).toHaveLength(1);
    expect(r.summary).toBe('Dojo import: 3 answers, 2 crops planted, 1 mock.');
  });

  it('imports the same Dojo backup twice without duplicates', () => {
    const once = importBackup(defaultSave(), JSON.stringify(dojoBackup), '2026-10-16');
    if (!once.ok) throw new Error('first import failed');
    const twice = importBackup(once.save, JSON.stringify(dojoBackup), '2026-10-16');
    if (!twice.ok) throw new Error('second import failed');
    expect(twice.save).toEqual(once.save);
    expect(twice.summary).toBe('Dojo import: 0 answers, 0 crops planted, 0 mocks.');
  });
});
