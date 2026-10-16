import { defaultSave } from '../src/core/save';
import type { Crop, SaveData } from '../src/core/state';

export function makeSave(patch: Partial<SaveData> = {}): SaveData {
  return { ...defaultSave(), ...patch };
}

export function makeCrop(p: Partial<Crop> & { ref: string; topic: string }): Crop {
  return {
    id: `paper:${p.ref}`,
    kind: 'paper',
    stage: 1,
    due: '2026-10-17',
    last: '2026-10-16',
    plantedOn: '2026-10-16',
    sbw: false,
    pest: null,
    ...p,
  };
}

export function memoryStorage(opts: { throwOnGet?: boolean; throwOnSet?: boolean } = {}): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => {
      if (opts.throwOnGet) throw new Error('storage blocked');
      return m.get(k) ?? null;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => {
      m.delete(k);
    },
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
  };
}
