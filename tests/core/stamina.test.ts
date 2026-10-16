import { markActivity, needsRest, newStamina, rested, staminaPct, tick } from '../../src/core/stamina';

const MIN = 60_000;

describe('focus stamina', () => {
  it('drains while you are active and refills after a rest', () => {
    let st = newStamina('2026-10-16', 0);
    for (let t = MIN; t <= 25 * MIN; t += MIN) {
      st = markActivity(st, t - 1000);
      st = tick(st, t, '2026-10-16');
    }
    expect(needsRest(st)).toBe(true);
    expect(staminaPct(st)).toBe(0);
    expect(Math.round(st.focusMsToday / MIN)).toBe(25);
    st = rested(st);
    expect(staminaPct(st)).toBe(100);
  });

  it('does not drain while you are idle', () => {
    let st = newStamina('2026-10-16', 0);
    st = tick(st, MIN, '2026-10-16');
    st = tick(st, 2 * MIN, '2026-10-16');
    st = tick(st, 2.5 * MIN, '2026-10-16');
    st = tick(st, 4 * MIN, '2026-10-16'); // 4 min since the last activity → idle
    expect(st.sinceBreakMs).toBe(2.5 * MIN);
  });

  it('counts a long absence as a rest and resets focus on a new day', () => {
    let st = newStamina('2026-10-16', 0, 30 * MIN);
    st = tick(st, MIN, '2026-10-16');
    expect(st.sinceBreakMs).toBe(MIN);
    st = tick(st, 11 * MIN, '2026-10-17');
    expect(st.sinceBreakMs).toBe(0);
    expect(st.focusMsToday).toBe(0);
  });
});
