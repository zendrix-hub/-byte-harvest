import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { REST_MS, markActivity, needsRest, newStamina, rested, tick, type StaminaState } from '../core/stamina';
import { ensureDay } from '../core/state';
import { save, today, update } from './store';

export const stamina = signal<StaminaState>(newStamina('', 0));
export const resting = signal<{ until: number } | null>(null);

const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export function stepStamina(nowMs: number): void {
  const t = today.value;
  const st = tick(stamina.value, nowMs, t);
  stamina.value = st;
  const minutes = Math.floor(st.focusMsToday / 60_000);
  if ((save.value.days[t]?.focusMin ?? 0) !== minutes) {
    update((s) => {
      ensureDay(s, t).focusMin = minutes;
    });
  }
  if (needsRest(st) && !resting.value) resting.value = { until: nowMs + REST_MS };
}

export function finishRest(): void {
  stamina.value = rested(stamina.value);
  resting.value = null;
}

export function startStamina(): () => void {
  const t = today.value;
  stamina.value = newStamina(t, Date.now(), (save.value.days[t]?.focusMin ?? 0) * 60_000);
  const onActivity = () => {
    stamina.value = markActivity(stamina.value, Date.now());
  };
  ACTIVITY.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
  const timer = setInterval(() => stepStamina(Date.now()), 15_000);
  return () => {
    ACTIVITY.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
    clearInterval(timer);
  };
}

export function useStamina(): void {
  useEffect(() => startStamina(), []);
}
