import { addDays, capDue, daysBetween, daysToExam, fmtClock, formatDay, localDate } from '../../src/core/dates';

describe('dates', () => {
  it('uses the local calendar day and rolls over at local midnight', () => {
    expect(localDate(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
    expect(localDate(new Date(2026, 9, 17, 0, 1))).toBe('2026-10-17');
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-16', -1)).toBe('2026-10-15');
  });

  it('counts days to the exam', () => {
    expect(daysBetween('2026-10-16', '2026-10-25')).toBe(9);
    expect(daysToExam('2026-10-16')).toBe(9);
    expect(daysToExam('2026-10-25')).toBe(0);
  });

  it('caps due dates at the last review day but never re-schedules today', () => {
    expect(capDue('2026-10-16', 2)).toBe('2026-10-18');
    expect(capDue('2026-10-23', 2)).toBe('2026-10-24');
    expect(capDue('2026-10-24', 1)).toBe('2026-10-25');
  });

  it('formats days and clocks', () => {
    expect(formatDay('2026-10-16')).toBe('Fri Oct 16');
    expect(formatDay('2026-10-25')).toBe('Sun Oct 25');
    expect(fmtClock(95)).toBe('1:35');
  });
});
