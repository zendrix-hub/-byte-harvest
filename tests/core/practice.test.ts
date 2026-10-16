import { buildPool, isHeld, pickSet, tierOf, topicMatches } from '../../src/core/practice';
import { recordPaperAnswer, setCue, tagMiss } from '../../src/core/record';
import { mulberry32, shuffle } from '../../src/core/rng';
import { byId } from '../../src/data/bank';
import { makeSave } from '../helpers';

describe('recording past-paper answers', () => {
  it('stores the attempt, pays gold and logs the day for a correct answer', () => {
    const s = makeSave();
    const r = recordPaperAnswer(s, { qid: '2025S_A_Q01', pick: 'a', conf: 'S', secs: 40, mode: 'practice', today: '2026-10-16', ts: 1 });
    expect(r).toMatchObject({ ok: true, event: 'none', gold: 5 });
    expect(s.att['2025S_A_Q01'][0]).toMatchObject({ d: '2026-10-16', p: 'a', ok: true, c: 'S', t: 40, m: 'practice', ts: 1 });
    expect(s.days['2026-10-16']).toMatchObject({ answered: 1, correct: 1, goldEarned: 5 });
  });

  it('plants a crop on a miss and records the pest and a cue', () => {
    const s = makeSave();
    const r = recordPaperAnswer(s, { qid: '2025S_A_Q01', pick: 'c', conf: 'S', secs: 80, mode: 'practice', today: '2026-10-16', ts: 2 });
    expect(r).toMatchObject({ ok: false, event: 'planted', gold: 0 });
    tagMiss(s, '2025S_A_Q01', 'K');
    setCue(s, '2025S_A_Q01', '  AND with 1s keeps bits ');
    expect(s.att['2025S_A_Q01'][0]).toMatchObject({ tag: 'K', cue: 'AND with 1s keeps bits' });
    expect(s.crops['paper:2025S_A_Q01'].pest).toBe('K');
    expect(s.days['2026-10-16'].planted).toBe(1);
  });
});

describe('practice pools', () => {
  it('holds back 2026S until its full mock is recorded, per subject', () => {
    const s = makeSave();
    expect(isHeld(s, byId['2026S_A_Q01'])).toBe(true);
    expect(buildPool(s, { subject: '*', paper: '*', topic: '*' })).toHaveLength(160);
    s.mocks.push({ d: '2026-10-17', name: '2026S Subject A', paper: '2026S', subj: 'A', full: true, score: 40, n: 60, pct: 67 });
    expect(isHeld(s, byId['2026S_A_Q01'])).toBe(false);
    expect(isHeld(s, byId['2026S_B_Q01'])).toBe(true);
    s.hold = false;
    expect(buildPool(s, { subject: '*', paper: '*', topic: '*' })).toHaveLength(240);
  });

  it('filters by field id or by exact topic', () => {
    expect(topicMatches(byId['2025S_A_Q03'], 'strategy')).toBe(true);
    expect(topicMatches(byId['2025S_A_Q03'], 'System strategy')).toBe(true);
    expect(topicMatches(byId['2025S_A_Q03'], 'tech')).toBe(false);
    const sec = buildPool(makeSave(), { subject: 'B', paper: '*', topic: 'security' });
    expect(sec.length).toBeGreaterThan(0);
    expect(sec.every((q) => q.topic === 'Security' && q.id.includes('_B_'))).toBe(true);
  });

  it('smart order puts sure-but-wrong first, then misses, then unseen, then solid', () => {
    const s = makeSave();
    s.att['2025S_A_Q05'] = [{ d: '2026-10-15', p: 'd', ok: true, c: 'S', t: 10, tag: null, cue: '', m: 'practice' }];
    s.att['2025S_A_Q04'] = [{ d: '2026-10-15', p: 'a', ok: false, c: 'U', t: 10, tag: null, cue: '', m: 'practice' }];
    s.att['2025S_A_Q03'] = [{ d: '2026-10-15', p: 'a', ok: false, c: 'S', t: 10, tag: null, cue: '', m: 'practice' }];
    const ids = pickSet(s, { subject: 'A', paper: '2025S', topic: '*' }, 60, 'smart', mulberry32(1));
    expect(ids[0]).toBe('2025S_A_Q03');
    expect(ids[1]).toBe('2025S_A_Q04');
    expect(ids[ids.length - 1]).toBe('2025S_A_Q05');
    expect(tierOf(s, byId['2025S_A_Q60'])).toBe(2);
  });

  it('paper order follows question numbers and respects the set size', () => {
    expect(pickSet(makeSave(), { subject: 'A', paper: '2025S', topic: '*' }, 3, 'paper', mulberry32(1))).toEqual([
      '2025S_A_Q01',
      '2025S_A_Q02',
      '2025S_A_Q03',
    ]);
  });

  it('shuffles deterministically with a seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(42))).toEqual(shuffle([1, 2, 3, 4, 5], mulberry32(42)));
  });
});
