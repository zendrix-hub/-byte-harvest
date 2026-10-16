export const FOCUS_BLOCK_MS = 25 * 60_000;
export const REST_MS = 3 * 60_000;
export const IDLE_CUTOFF_MS = 3 * 60_000;

export interface StaminaState {
  day: string;
  sinceBreakMs: number;
  focusMsToday: number;
  lastTick: number;
  lastActivity: number;
}

export function newStamina(day: string, nowMs: number, focusMsToday = 0): StaminaState {
  return { day, sinceBreakMs: 0, focusMsToday, lastTick: nowMs, lastActivity: nowMs };
}

export const markActivity = (st: StaminaState, nowMs: number): StaminaState => ({ ...st, lastActivity: nowMs });

/** Time only counts while you were active recently; a gap ≥ REST_MS counts as a break. */
export function tick(st: StaminaState, nowMs: number, day: string): StaminaState {
  const dt = Math.max(0, nowMs - st.lastTick);
  let { sinceBreakMs, focusMsToday } = st;
  if (day !== st.day) focusMsToday = 0;
  if (dt >= REST_MS) sinceBreakMs = 0;
  else if (nowMs - st.lastActivity <= IDLE_CUTOFF_MS) {
    sinceBreakMs += dt;
    focusMsToday += dt;
  }
  return { ...st, day, sinceBreakMs, focusMsToday, lastTick: nowMs };
}

export const staminaPct = (st: StaminaState) => Math.max(0, 100 - (100 * st.sinceBreakMs) / FOCUS_BLOCK_MS);
export const needsRest = (st: StaminaState) => st.sinceBreakMs >= FOCUS_BLOCK_MS;
export const rested = (st: StaminaState): StaminaState => ({ ...st, sinceBreakMs: 0 });
