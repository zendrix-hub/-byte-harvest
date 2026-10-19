import { BANK, byId, numberOf, optionCount, paperOf, sourceLabel, subjectOf } from '../../src/data/bank';

describe('question bank', () => {
  it('holds 240 questions: 60 A + 20 B per paper', () => {
    expect(BANK).toHaveLength(240);
    for (const p of ['2025S', '2025A', '2026S']) {
      expect(BANK.filter((q) => q.id.startsWith(`${p}_A_`))).toHaveLength(60);
      expect(BANK.filter((q) => q.id.startsWith(`${p}_B_`))).toHaveLength(20);
    }
  });


  it('parses ids into paper, subject, number and a source label', () => {
    expect(paperOf('2025A_B_Q07')).toBe('2025A');
    expect(subjectOf('2025A_B_Q07')).toBe('B');
    expect(numberOf('2025A_B_Q07')).toBe(7);
    expect(sourceLabel('2025S_A_Q01')).toBe('(2025S, FE, Subject-A, Q1)');
  });

  it('always offers at least as many options as the key letter needs', () => {
    expect(optionCount(byId['2025A_B_Q10'])).toBe(10);
    for (const q of BANK) expect(optionCount(q)).toBeGreaterThanOrEqual('abcdefghij'.indexOf(q.key) + 1);
  });

});
