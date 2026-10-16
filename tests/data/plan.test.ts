import { addDays } from '../../src/core/dates';
import { PLAN, planFor } from '../../src/data/plan';

describe('study almanac', () => {
  it('covers Oct 16 to the Oct 25 exam, one entry per day', () => {
    expect(PLAN[0].date).toBe('2026-10-16');
    expect(PLAN[PLAN.length - 1].date).toBe('2026-10-25');
    PLAN.forEach((p, i) => {
      if (i > 0) expect(p.date).toBe(addDays(PLAN[i - 1].date, 1));
    });
  });

  it('finds the plan for a date and clamps outside the range', () => {
    expect(planFor('2026-10-16').title).toBe('Management blitz');
    expect(planFor('2026-10-17').mood).toBe('mock');
    expect(planFor('2026-10-01').date).toBe('2026-10-16');
    expect(planFor('2026-11-02').mood).toBe('exam');
  });

  it('marks the rest day and the exam day', () => {
    expect(planFor('2026-10-24').mood).toBe('rest');
    expect(planFor('2026-10-25').mood).toBe('exam');
  });
});
