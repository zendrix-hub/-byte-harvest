import { recordPaperAnswer, tagMiss } from '../../src/core/record';
import { diaryReport, masteryOf, topicMastery, weakTopics } from '../../src/core/report';
import { emptyDay, type SaveData } from '../../src/core/state';
import type { Confidence } from '../../src/data/types';
import { makeSave } from '../helpers';

const T = '2026-10-16';
const answer = (s: SaveData, qid: string, pick: string, conf: Confidence, ts: number) =>
  recordPaperAnswer(s, { qid, pick, conf, secs: 65, mode: 'practice', today: T, ts });

describe('diary report', () => {
  it('summarises the day in the reviewer-chat format', () => {
    const s = makeSave();
    answer(s, '2025S_A_Q01', 'c', 'S', 1); // sure but wrong (key a)
    tagMiss(s, '2025S_A_Q01', 'K');
    answer(s, '2025S_A_Q02', 'a', 'G', 2); // lucky guess (key a)
    answer(s, '2025S_B_Q02', 'a', 'U', 3); // miss (key d)
    answer(s, '2025S_A_Q03', 'b', 'S', 4); // correct (key b)
    const lines = diaryReport(s, T).split('\n');
    expect(lines[0]).toBe('Byte Harvest diary · 2026-10-16 · D-9');
    expect(lines[1]).toBe('Today: 2/4 (A 2/3, B 0/1) · first half 50% · second half 50%');
    expect(lines[2]).toBe('Sure but wrong: (2025S, FE, Subject-A, Q1) Number & logic/bit masking picked c key a sure 1:05 [K]');
    expect(lines[3]).toContain('(2025S, FE, Subject-B, Q2)');
    expect(lines[4]).toBe('Lucky guesses: (2025S, FE, Subject-A, Q2)');
    expect(lines[6]).toBe('Farm: 3 crops (0 thirsty, 0 concept, 0 ready) · harvested today 0 · gold 6 · focus 0 min');
    expect(lines[7]).toBe('Mocks: none');
    expect(lines).toHaveLength(8); // no Lessons line: nothing was learned today
  });

  it('shows a Lessons line only when the day logged new learn runs', () => {
    const s = makeSave({ days: { [T]: { ...emptyDay(), lessons: 2 } } });
    const lines = diaryReport(s, T).split('\n');
    expect(lines[lines.length - 1]).toBe('Lessons: 2 new');
  });

  it('counts concept crops among thirsty crops on the Farm line', () => {
    const s = makeSave({
      crops: {
        'concept:bs-1': {
          id: 'concept:bs-1', kind: 'concept', ref: 'bs-1', topic: 'Number & logic',
          stage: 1, due: T, last: '2026-10-15', plantedOn: '2026-10-15', sbw: false, pest: null,
        },
      },
    });
    const lines = diaryReport(s, T).split('\n');
    expect(lines[6]).toBe('Farm: 1 crops (1 thirsty, 1 concept, 0 ready) · harvested today 0 · gold 0 · focus 0 min');
  });
});

describe('mastery', () => {
  it('uses the Dojo thresholds', () => {
    expect([masteryOf(1, 2), masteryOf(1, 3), masteryOf(2, 3), masteryOf(4, 5)]).toEqual(['new', 'red', 'yel', 'grn']);
  });

  it('computes topic mastery and weak topics', () => {
    const s = makeSave();
    answer(s, '2025S_A_Q01', 'c', 'U', 1);
    answer(s, '2025S_A_Q02', 'b', 'U', 2);
    expect(topicMastery(s, 'Number & logic')).toEqual({ right: 0, n: 2, status: 'new' });
    expect(weakTopics(s)).toEqual(['A · Number & logic 0/2']);
  });
});
