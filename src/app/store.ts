import { computed, signal } from '@preact/signals';
import { localDate } from '../core/dates';
import { loadSave, persistSave } from '../core/save';
import { cloneSave, type SaveData } from '../core/state';
import type { PanelState } from './panel-types';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const storage = getStorage();

export const save = signal<SaveData>(loadSave(storage));
export const now = signal<number>(Date.now());
export const today = computed(() => localDate(new Date(now.value)));
export const panel = signal<PanelState | null>(null);
export const toast = signal<{ id: number; text: string } | null>(null);
export const saveFailed = signal(false);

let pending: ReturnType<typeof setTimeout> | null = null;

/** Apply a change to a copy of the save, publish it, and persist shortly after. */
export function update<T>(fn: (draft: SaveData) => T): T {
  const draft = cloneSave(save.value);
  const result = fn(draft);
  save.value = draft;
  if (pending) clearTimeout(pending);
  pending = setTimeout(flush, 250);
  return result;
}

export function flush(): void {
  if (pending) clearTimeout(pending);
  pending = null;
  saveFailed.value = !persistSave(storage, save.value);
}

export function replaceSave(next: SaveData): void {
  save.value = next;
  flush();
}

export function openPanel(p: PanelState): void {
  panel.value = p;
}

export function closePanel(): void {
  panel.value = null;
}

let toastSeq = 0;
export function showToast(text: string): void {
  const id = ++toastSeq;
  toast.value = { id, text };
  setTimeout(() => {
    if (toast.value?.id === id) toast.value = null;
  }, 2600);
}

/** Keep `now` fresh so the day rolls over at midnight without a reload; save when hidden. */
export function startClock(): () => void {
  const tickNow = () => {
    now.value = Date.now();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') tickNow();
    else flush();
  };
  const timer = setInterval(tickNow, 30_000);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flush);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', flush);
  };
}
